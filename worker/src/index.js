// خادم رادار الرحلات على Cloudflare Workers (مجاني حتى 100 ألف طلب في اليوم).
// شغلته: يخبّي مفتاح Travelpayouts، ويوحّد شكل البيانات، ويخزّن النتائج نص ساعة عشان نوفّر الطلبات.
// لو مفيش مفتاح (TP_TOKEN) بيرجّع بيانات تجريبية ومكتوب عليها source:"demo".
import { mockSearch, mockCalendar } from "../../web/js/mock.js";
import { alternatesFor } from "../../web/js/data.js";

const TP = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates";
const IATA = /^[A-Z]{3}$/, DATE = /^\d{4}-\d{2}-\d{2}$/, MONTH = /^\d{4}-\d{2}$/;
const CACHE_SECONDS = 1800;

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    const json = (body, status = 200, cache = true) => new Response(JSON.stringify(body), {
      status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", ...(cache ? { "Cache-Control": `public, max-age=${CACHE_SECONDS}`, "Netlify-CDN-Cache-Control": `public, durable, s-maxage=${CACHE_SECONDS}` } : {}) },
    });

    try {
      const p = Object.fromEntries(url.searchParams);
      const origin = (p.origin || "").toUpperCase(), destination = (p.destination || "").toUpperCase();
      if (url.pathname === "/api/health") return json({ ok: true, live: !!env.TP_TOKEN }, 200, false);
      if (url.pathname === "/api/config") return json({ bot: env.TG_BOT_USERNAME || null }, 200, false);
      if (!IATA.test(origin) || !IATA.test(destination)) return json({ error: "اكتب رمز مطار من 3 حروف للمغادرة والوصول" }, 400, false);

      // نخزّن النتيجة في كاش Cloudflare (ببلاش)
      const cache = globalThis.caches?.default, key = new Request(url.toString(), { method: "GET" });
      const hit = cache ? await cache.match(key) : null;
      if (hit) return hit;

      let res;
      if (url.pathname === "/api/search") {
        if (!DATE.test(p.depart || "") || (p.ret && !DATE.test(p.ret))) return json({ error: "التاريخ لازم يكون بالشكل YYYY-MM-DD" }, 400, false);
        res = json(await search(env, { origin, destination, depart: p.depart, ret: p.ret || "", direct: p.direct === "1" }));
      } else if (url.pathname === "/api/calendar") {
        if (!MONTH.test(p.month || "")) return json({ error: "الشهر لازم يكون بالشكل YYYY-MM" }, 400, false);
        res = json(await calendar(env, { origin, destination, month: p.month }));
      } else if (url.pathname === "/api/alternates") {
        if (!DATE.test(p.depart || "")) return json({ error: "التاريخ لازم يكون بالشكل YYYY-MM-DD" }, 400, false);
        res = json(await alternates(env, { origin, destination, depart: p.depart, ret: p.ret || "", direct: p.direct === "1" }));
      } else return json({ error: "المسار ده مش موجود" }, 404, false);

      if (cache) ctx.waitUntil(cache.put(key, res.clone()));
      return res;
    } catch (e) {
      return json({ error: "حصلت مشكلة في جلب الأسعار، جرّب تاني بعد شوية", detail: String(e && e.message || e) }, 502, false);
    }
  },
};

async function tp(env, params) {
  const qs = new URLSearchParams({ currency: "sar", sorting: "price", limit: "30", page: "1", ...params, token: env.TP_TOKEN });
  const r = await fetch(`${TP}?${qs}`, { headers: { "Accept-Encoding": "gzip" } });
  if (!r.ok) throw new Error(`Travelpayouts ${r.status}`);
  const body = await r.json();
  if (body.success === false) throw new Error(body.error || "Travelpayouts error");
  return body.data || [];
}

function normalize(env, x) {
  let link = null;
  if (x.link) {
    link = "https://www.aviasales.com" + x.link;
    if (env.TP_MARKER) link += (link.includes("?") ? "&" : "?") + "marker=" + encodeURIComponent(env.TP_MARKER);
  }
  return {
    airline: x.airline, flight: x.airline + (x.flight_number || ""), origin: x.origin_airport || x.origin, destination: x.destination_airport || x.destination,
    depart_at: x.departure_at, return_at: x.return_at || null, transfers: x.transfers ?? 0, return_transfers: x.return_transfers ?? null,
    duration_to: x.duration_to ?? x.duration ?? null, duration_back: x.duration_back ?? null, price: x.price, link,
  };
}

const day = s => Date.parse(String(s).slice(0, 10) + "T00:00:00Z") / 86400000;

// رحلات اتجاه واحد في يوم معيّن، ولو مفيش: أقرب أيام (± 3) في نفس الشهر
async function oneWay(env, from, to, date, direct) {
  const base = { origin: from, destination: to, one_way: "true", direct: direct ? "true" : "false" };
  const exact = await tp(env, { ...base, departure_at: date });
  if (exact.length) return { list: exact.map(x => normalize(env, x)), nearby: false };
  const want = day(date);
  const around = (await tp(env, { ...base, departure_at: date.slice(0, 7), limit: "200" }))
    .filter(x => Math.abs(day(x.departure_at) - want) <= 3)
    .sort((a, b) => a.price - b.price);
  return { list: around.map(x => ({ ...normalize(env, x), nearby: true })), nearby: around.length > 0 };
}

export async function search(env, q) {
  if (!env.TP_TOKEN) return { source: "demo", offers: mockSearch(q) };
  if (!q.ret) {
    const r = await oneWay(env, q.origin, q.destination, q.depart, q.direct);
    return { source: "live", nearby: r.nearby, offers: r.list };
  }
  // ذهاب وعودة بتذكرة واحدة
  const params = { origin: q.origin, destination: q.destination, departure_at: q.depart, return_at: q.ret, one_way: "false", direct: q.direct ? "true" : "false" };
  const data = await tp(env, params);
  if (data.length) return { source: "live", offers: data.map(x => normalize(env, x)) };

  // مفيش: نركّب أرخص ذهاب + أرخص عودة (تذكرتين منفصلتين)
  const [out, back] = await Promise.all([
    oneWay(env, q.origin, q.destination, q.depart, q.direct),
    oneWay(env, q.destination, q.origin, q.ret, q.direct),
  ]);
  if (!out.list.length || !back.list.length) return { source: "live", offers: [] };
  const backs = [...back.list].sort((a, b) => a.price - b.price).slice(0, 3);
  const offers = [];
  for (const o of out.list.slice(0, 8)) {
    // نختار أرخص عودة، ولو فيه عودة بنفس الشركة بفرق بسيط نفضّلها
    const same = backs.find(b => b.airline === o.airline);
    const b = same && same.price - backs[0].price <= 50 ? same : backs[0];
    if (day(b.depart_at) <= day(o.depart_at)) continue;
    offers.push({
      ...o, combo: true, nearby: o.nearby || b.nearby,
      return_at: b.depart_at, return_transfers: b.transfers, duration_back: b.duration_to,
      price: o.price + b.price, outPrice: o.price, backPrice: b.price,
      backAirline: b.airline, backFlight: b.flight, backLink: b.link,
    });
  }
  return { source: "live", nearby: out.nearby || back.nearby, combo: true, offers };
}

export async function calendar(env, q) {
  if (!env.TP_TOKEN) return { source: "demo", days: mockCalendar(q) };
  const data = await tp(env, { origin: q.origin, destination: q.destination, departure_at: q.month, one_way: "true", limit: "1000" });
  const days = {};
  for (const x of data) {
    const d = (x.departure_at || "").slice(0, 10);
    if (!d || (days[d] && days[d].price <= x.price)) continue;
    days[d] = { price: x.price, airline: x.airline, transfers: x.transfers ?? 0 };
  }
  return { source: "live", days };
}

async function alternates(env, q) {
  const froms = [{ code: q.origin, ground: null, groundCost: 0 }, ...alternatesFor(q.origin)];
  const tos = [{ code: q.destination, ground: null, groundCost: 0 }, ...alternatesFor(q.destination)];
  const combos = [];
  for (const f of froms) for (const t of tos) if (f.code !== t.code) combos.push({ f, t });
  const results = await Promise.all(combos.slice(0, 8).map(async ({ f, t }) => {
    try {
      const r = await search(env, { ...q, origin: f.code, destination: t.code });
      const best = r.offers[0];
      return best ? { origin: f.code, destination: t.code, groundFrom: f.ground, groundTo: t.ground, groundCost: f.groundCost + t.groundCost, best, source: r.source } : null;
    } catch { return null; }
  }));
  return { source: env.TP_TOKEN ? "live" : "demo", options: results.filter(Boolean) };
}
