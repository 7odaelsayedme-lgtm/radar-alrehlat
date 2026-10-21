// بيكلّم الخادم، ولو مش متاح يرجع للبيانات التجريبية من غير ما الموقع يقف.
import { API_BASE } from "./config.js";
import { mockSearch, mockCalendar } from "./mock.js";
import { alternatesFor } from "./data.js";

async function get(path, params) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null && v !== false).map(([k, v]) => [k, v === true ? "1" : String(v)]));
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(`${API_BASE}${path}?${qs}`, { signal: ctl.signal });
    const body = await r.json();
    if (!r.ok) throw Object.assign(new Error(body.error || "خطأ"), { userMessage: body.error });
    return body;
  } finally { clearTimeout(timer); }
}

export async function search(q) {
  try { return await get("/api/search", q); }
  catch (e) { if (e.userMessage) throw e; return { source: "demo", offers: mockSearch(q) }; }
}

export async function calendar(q) {
  try { return await get("/api/calendar", q); }
  catch (e) { if (e.userMessage) throw e; return { source: "demo", days: mockCalendar(q) }; }
}

export async function alternates(q) {
  try { return await get("/api/alternates", q); }
  catch (e) {
    if (e.userMessage) throw e;
    const froms = [{ code: q.origin, ground: null, groundCost: 0 }, ...alternatesFor(q.origin)];
    const tos = [{ code: q.destination, ground: null, groundCost: 0 }, ...alternatesFor(q.destination)];
    const options = [];
    for (const f of froms) for (const t of tos) {
      if (f.code === t.code) continue;
      const best = mockSearch({ ...q, origin: f.code, destination: t.code })[0];
      if (best) options.push({ origin: f.code, destination: t.code, groundFrom: f.ground, groundTo: t.ground, groundCost: f.groundCost + t.groundCost, best });
    }
    return { source: "demo", options: options.slice(0, 8) };
  }
}
