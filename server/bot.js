// بوت تيليجرام + تنبيهات نزول السعر.
// نفس محلل الكلام ونفس خادم الأسعار اللي الموقع بيستخدمهم.
import { parseRequest } from "../web/js/nlp.js";
import { airline, airportName } from "../web/js/data.js";
import { verdict, encodeTrip, decodeTrip } from "../web/js/verdict.js";
import { search, calendar } from "../worker/src/index.js";
import { watchStore } from "./store.js";

export const SITE = "https://radar-alrehlat.netlify.app";
const MAX_WATCHES = 10;
const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const esc = s => String(s ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const fmt = n => Math.round(n).toLocaleString("ar-SA");
const prettyDate = s => { const d = new Date(s.slice(0, 10) + "T12:00:00Z"); return `${d.getUTCDate()} ${MONTHS_AR[d.getUTCMonth()]}`; };
const stopsTxt = n => n === 0 ? "مباشرة" : n === 1 ? "توقف واحد" : `${n} توقفات`;
export const todayRiyadh = () => new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);

function gflights(q) {
  const t = `Flights from ${q.origin} to ${q.destination} on ${q.depart}` + (q.ret ? ` through ${q.ret}` : " one way") + (q.adults > 1 ? ` ${q.adults} adults` : "");
  return "https://www.google.com/travel/flights?hl=ar&curr=SAR&q=" + encodeURIComponent(t);
}

export async function tg(env, method, body) {
  if (env.__tgLog) { env.__tgLog.push({ method, body }); return { ok: true }; }
  const r = await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/${method}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  return r.json();
}
const send = (env, chat_id, text, keyboard) => tg(env, "sendMessage", {
  chat_id, text, parse_mode: "HTML", disable_web_page_preview: true,
  ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
});

function tripLine(q) {
  return `<b>${q.origin} → ${q.destination}</b>  ${esc(airportName(q.origin))} ← ${esc(airportName(q.destination))}\n`
    + `${prettyDate(q.depart)}${q.ret ? ` ← ${prettyDate(q.ret)}` : " · ذهاب بس"}${q.adults > 1 ? ` · ${q.adults} مسافرين` : ""}`;
}

// يجيب الأسعار ورأي الرادار لرحلة
export async function lookup(env, q, history = []) {
  const [r, cal] = await Promise.all([
    search(env, { origin: q.origin, destination: q.destination, depart: q.depart, ret: q.ret || "", direct: !!q.direct }),
    calendar(env, { origin: q.origin, destination: q.destination, month: q.depart.slice(0, 7) }).catch(() => ({ days: {} })),
  ]);
  const offers = [...(r.offers || [])].sort((a, b) => a.price - b.price);
  const v = verdict({ depart: q.depart, today: todayRiyadh(), days: cal.days || {}, history });
  return { offers, best: offers[0] || null, v, combo: !!r.combo, nearby: !!r.nearby, source: r.source };
}

function verdictText(v) {
  return `🧭 <b>رأي الرادار: ${esc(v.title)}</b>\n` + v.reasons.map(x => `• ${esc(x)}`).join("\n");
}

function offerLines(offers, q) {
  return offers.slice(0, 3).map((o, i) => {
    const a = airline(o.airline);
    const back = o.combo && o.backAirline && o.backAirline !== o.airline ? ` + ${esc(airline(o.backAirline).name)}` : "";
    return `${i + 1}. ${esc(a.name)}${back} — <b>${fmt(o.price)} ريال</b>${q.adults > 1 ? " للفرد" : ""}`
      + ` · ${stopsTxt(o.transfers ?? 0)}${o.combo ? " · تذكرتين منفصلتين" : ""}${o.nearby ? ` · ${prettyDate(o.depart_at)}` : ""}`;
  }).join("\n");
}

function keyboardFor(q, best, watching) {
  const rows = [];
  if (best) {
    const a = airline(best.airline);
    rows.push([{ text: `احجز من ${a.name}`, url: a.url }]);
  }
  rows.push([{ text: "أكّد السعر في Google Flights", url: gflights(q) }]);
  rows.push([watching
    ? { text: "🔕 وقّف التنبيه", callback_data: "s:" + encodeTrip(q) }
    : { text: "🔔 نبّهني لو السعر نزل", callback_data: "w:" + encodeTrip(q) }]);
  rows.push([{ text: "افتح في الموقع", url: SITE }]);
  return rows;
}

export async function replySearch(env, chatId, q, intro = "") {
  const { offers, best, v, nearby, combo } = await lookup(env, q);
  const watching = !!(await (await watchStore()).get(`w/${chatId}/${encodeTrip(q)}`));
  let text = (intro ? intro + "\n\n" : "") + "✈️ " + tripLine(q) + "\n\n";
  if (!offers.length) {
    text += "مفيش أسعار محفوظة للتاريخ ده. جرّب يوم قبله أو بعده، أو أكّد في Google Flights.\nولو فعّلت التنبيه، هبلغك أول ما يظهر سعر.";
  } else {
    if (combo) text += "<i>مفيش تذكرة ذهاب وعودة محفوظة، فدي أرخص ذهاب مع أرخص عودة.</i>\n";
    if (nearby) text += "<i>مفيش أسعار ليومك بالظبط، فدي أقرب الأيام.</i>\n";
    text += offerLines(offers, q) + "\n\n" + verdictText(v) + "\n\n<i>السعر للتذكرة من غير الإضافات، وأكّد السعر النهائي قبل الدفع.</i>";
  }
  return send(env, chatId, text, keyboardFor(q, best, watching));
}

// ---------- التنبيهات ----------
export async function addWatch(env, chatId, q) {
  const store = await watchStore();
  if (!q.depart || q.depart < todayRiyadh()) return { ok: false, msg: "تاريخ الرحلة عدّى، ابعتلي تاريخ جاي." };
  const key = `w/${chatId}/${encodeTrip(q)}`;
  if (await store.get(key)) return { ok: true, existed: true };
  const { blobs } = await store.list({ prefix: `w/${chatId}/` });
  if (blobs.length >= MAX_WATCHES) return { ok: false, msg: `عندك ${MAX_WATCHES} تنبيهات، وده الحد. وقّف واحد من /alerts الأول.` };
  let price = null;
  try { const r = await lookup(env, q); price = r.best ? r.best.price : null; } catch { /* هنجرب في الفحص الجاي */ }
  const today = todayRiyadh();
  await store.setJSON(key, { chatId, q, created: today, history: price != null ? [{ t: today, p: price }] : [], ref: price, lastPrice: price });
  return { ok: true, price };
}

export async function removeWatch(chatId, payload) {
  const store = await watchStore();
  await store.delete(`w/${chatId}/${payload}`);
}

async function listText(chatId) {
  const store = await watchStore();
  const { blobs } = await store.list({ prefix: `w/${chatId}/` });
  if (!blobs.length) return "مفيش تنبيهات شغالة. ابعتلي أي رحلة، ودوس «نبّهني لو السعر نزل».";
  const lines = [];
  for (const b of blobs) {
    const w = await store.get(b.key, { type: "json" });
    if (!w) continue;
    lines.push(`• ${tripLine(w.q).replace("\n", " · ")}\n   آخر سعر: ${w.lastPrice != null ? fmt(w.lastPrice) + " ريال" : "لسه"} · لإيقافه: /stop_${b.key.split("/")[2]}`);
  }
  return "🔔 <b>تنبيهاتك</b>\n\n" + lines.join("\n\n");
}

const WELCOME = `أهلًا بيك في <b>رادار الرحلات</b> ✈️

اكتبلي رحلتك بالكلام، زي:
• من جدة للقاهرة أول الشهر الجاي لمدة أسبوع
• دبي الويكند
• من الدمام لإسطنبول أنا ومراتي في ديسمبر

وهرد عليك بأرخص الرحلات، ورأيي: تحجز دلوقتي ولا تستنى.
ولو عايز أراقب السعر، دوس «نبّهني لو السعر نزل» وهبعتلك أول ما ينزل.

/alerts تنبيهاتك
/help المساعدة`;

export async function handleUpdate(env, u) {
  if (u.callback_query) {
    const cb = u.callback_query, chatId = cb.message && cb.message.chat.id, [kind, payload] = String(cb.data || "").split(":");
    const q = decodeTrip(payload);
    if (!chatId || !q) return tg(env, "answerCallbackQuery", { callback_query_id: cb.id });
    if (kind === "w") {
      const r = await addWatch(env, chatId, q);
      await tg(env, "answerCallbackQuery", { callback_query_id: cb.id, text: r.ok ? "تمام، هنبهك لو السعر نزل" : r.msg, show_alert: !r.ok });
      if (r.ok && !r.existed) await send(env, chatId, `🔔 فعّلت التنبيه على\n${tripLine(q)}\n\n${r.price != null ? `السعر دلوقتي ${fmt(r.price)} ريال. ` : ""}هشيّك مرتين في اليوم، وهبعتلك لو نزل.`, [[{ text: "🔕 وقّف التنبيه", callback_data: "s:" + payload }]]);
    } else if (kind === "s") {
      await removeWatch(chatId, payload);
      await tg(env, "answerCallbackQuery", { callback_query_id: cb.id, text: "وقّفت التنبيه" });
    }
    return;
  }
  const m = u.message;
  if (!m || !m.text) return;
  const chatId = m.chat.id, text = m.text.trim();
  if (text.startsWith("/start")) {
    const q = decodeTrip(text.split(/\s+/)[1]);
    if (!q) return send(env, chatId, WELCOME);
    const r = await addWatch(env, chatId, q);
    if (!r.ok) return send(env, chatId, r.msg);
    return replySearch(env, chatId, q, "🔔 فعّلت التنبيه على الرحلة دي، وهبعتلك لو السعر نزل.");
  }
  if (text === "/help") return send(env, chatId, WELCOME);
  if (text === "/alerts") return send(env, chatId, await listText(chatId));
  if (text.startsWith("/stop_")) {
    await removeWatch(chatId, text.slice(6));
    return send(env, chatId, "🔕 وقّفت التنبيه.");
  }
  const p = parseRequest(text, { today: todayRiyadh(), home: "RUH" });
  if (!p.destination) return send(env, chatId, "مش لاقي الوجهة في كلامك. اكتب اسم المدينة، مثلًا: «القاهرة الشهر الجاي» أو «من جدة لدبي يوم 20».");
  const depart = p.depart || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const q = { origin: p.origin, destination: p.destination, depart, ret: p.ret || "", adults: p.adults, direct: p.direct };
  const intro = p.notes.includes("homeOrigin") ? `<i>اعتبرتك مسافر من ${esc(airportName(p.origin))}. لو من مكان تاني اكتب «من ...».</i>` : "";
  return replySearch(env, chatId, q, intro);
}

// ---------- الفحص المجدول ----------
export async function checkAll(env) {
  const store = await watchStore();
  const { blobs } = await store.list({ prefix: "w/" });
  const today = todayRiyadh();
  let checked = 0, alerts = 0;
  for (const b of blobs) {
    const w = await store.get(b.key, { type: "json" });
    if (!w) continue;
    if (w.q.depart < today) { await store.delete(b.key); continue; }
    let r;
    try { r = await lookup(env, w.q, w.history); } catch { continue; }
    checked++;
    if (!r.best) continue;
    const price = r.best.price;
    w.history = [...(w.history || []), { t: today, p: price }].slice(-60);
    w.lastPrice = price;
    const ref = w.ref ?? price;
    // نبلّغ لو نزل 5٪ أو 50 ريال على الأقل عن آخر سعر بلّغنا بيه
    if (price <= ref * 0.95 || price <= ref - 50) {
      const v = verdict({ depart: w.q.depart, today, days: {}, history: w.history });
      const a = airline(r.best.airline);
      await send(env, w.chatId,
        `🔻 <b>السعر نزل!</b>\n${tripLine(w.q)}\n\nكان ${fmt(ref)} ريال، دلوقتي <b>${fmt(price)} ريال</b> مع ${esc(a.name)} (أوفر بـ ${fmt(ref - price)}).\n\n${verdictText(r.v.reasons.length ? r.v : v)}`,
        keyboardFor(w.q, r.best, true));
      w.ref = price; alerts++;
    } else if (price > ref) {
      // السعر طلع: نخلّي المرجع زي ما هو، عشان نبلّغ لو رجع نزل تحت آخر سعر بلّغنا بيه
    }
    await store.setJSON(b.key, w);
  }
  return { watches: blobs.length, checked, alerts };
}
