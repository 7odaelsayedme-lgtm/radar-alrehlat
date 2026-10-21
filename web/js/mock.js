// بيانات تجريبية ثابتة (نفس المدخلات = نفس النتيجة). بتشتغل لما مفيش مفتاح Travelpayouts
// أو لما الموقع مش قادر يوصل للخادم. الواجهة بتكتب "بيانات تجريبية" بوضوح وقتها.
import { AIRPORTS } from "./data.js";

function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rand(seed) { let x = seed || 1; return () => ((x = Math.imul(x ^ (x >>> 15), 2246822507) ^ Math.imul(x ^ (x >>> 13), 3266489909)) >>> 0) / 4294967296; }
const country = c => (AIRPORTS.find(a => a[0] === c) || [])[2] || "";

const HOME_CARRIERS = { "السعودية": ["SV", "XY", "F3"], "مصر": ["MS", "SM", "NP"], "الإمارات": ["EK", "FZ", "G9"], "قطر": ["QR"], "الكويت": ["KU", "J9"], "البحرين": ["GF"], "عُمان": ["WY", "OV"], "الأردن": ["RJ"], "تركيا": ["TK", "PC"], "المغرب": ["AT"] };
const HUBS = [["TK", "IST"], ["QR", "DOH"], ["EK", "DXB"], ["GF", "BAH"]];

function baseFare(o, d) {
  const same = country(o) === country(d);
  const r = rand(hash(o < d ? o + d : d + o))();
  return same ? 220 + r * 380 : 650 + r * 1900;
}

function dayFactor(dateStr) {
  const wd = new Date(dateStr + "T00:00:00Z").getUTCDay();
  return wd === 4 || wd === 5 ? 1.22 : wd === 2 || wd === 3 ? 0.9 : 1;
}

export function mockSearch({ origin, destination, depart, ret, direct }) {
  const r = rand(hash(origin + destination + depart + (ret || "")));
  const carriers = [...new Set([...(HOME_CARRIERS[country(origin)] || []), ...(HOME_CARRIERS[country(destination)] || [])])];
  if (!carriers.length) carriers.push("TK", "QR");
  const base = baseFare(origin, destination) * dayFactor(depart);
  const durDirect = Math.round(90 + rand(hash(origin + destination))() * 300);
  const offers = [];
  carriers.forEach((c, i) => {
    const lowCost = ["XY", "F3", "FZ", "G9", "PC", "J9", "OV", "SM", "NP"].includes(c);
    const p = base * (lowCost ? 0.72 + r() * 0.15 : 0.95 + r() * 0.35);
    offers.push(make(c, 0, p, durDirect, 6 + i * 3 + Math.floor(r() * 3)));
  });
  if (!direct) HUBS.filter(([, h]) => h !== origin && h !== destination).slice(0, 2).forEach(([c], i) => {
    offers.push(make(c, 1, base * (0.78 + r() * 0.2), durDirect + 180 + Math.floor(r() * 240), 2 + i * 9));
  });
  function make(airline, transfers, price, duration, hour) {
    const dep = `${depart}T${String(hour % 24).padStart(2, "0")}:${r() < 0.5 ? "15" : "40"}:00+03:00`;
    const mult = ret ? 1.85 : 1;
    return {
      airline, flight: airline + (100 + Math.floor(r() * 800)), origin, destination,
      depart_at: dep, return_at: ret ? `${ret}T${String((hour + 7) % 24).padStart(2, "0")}:05:00+03:00` : null,
      transfers, return_transfers: ret ? transfers : null, duration_to: duration, duration_back: ret ? duration : null,
      price: Math.round(price * mult / 5) * 5, link: null,
    };
  }
  return offers.sort((a, b) => a.price - b.price);
}

export function mockCalendar({ origin, destination, month }) {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const base = baseFare(origin, destination) * 0.8;
  const out = {};
  for (let d = 1; d <= days; d++) {
    const ds = `${month}-${String(d).padStart(2, "0")}`;
    const r = rand(hash(origin + destination + ds))();
    if (r < 0.06) continue; // أيام من غير بيانات، زي الواقع
    out[ds] = { price: Math.round(base * dayFactor(ds) * (0.8 + r * 0.55) / 5) * 5, airline: (HOME_CARRIERS[country(origin)] || ["TK"])[Math.floor(r * 3) % ((HOME_CARRIERS[country(origin)] || ["TK"]).length)], transfers: r > 0.7 ? 1 : 0 };
  }
  return out;
}
