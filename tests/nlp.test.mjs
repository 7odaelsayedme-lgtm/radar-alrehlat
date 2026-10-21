// شغّل: node tests/nlp.test.mjs
import { parseRequest } from "../web/js/nlp.js";

const today = "2026-10-21"; // أربعاء
const cases = [
  ["عايز القاهرة أول الشهر الجاي بأقل من 1000 ريال", { origin: "RUH", destination: "CAI", depart: "2026-11-01", budget: 1000, oneWay: true }],
  ["من جدة لدبي يوم 15 نوفمبر لمدة أسبوع", { origin: "JED", destination: "DXB", depart: "2026-11-15", ret: "2026-11-22" }],
  ["ابغى اسافر من الدمام الى اسطنبول انا ومراتي في ديسمبر", { origin: "DMM", destination: "IST", depart: "2026-12-01", adults: 2, flexibleMonth: true }],
  ["رحلة للقاهرة بكرة ذهاب بس", { destination: "CAI", depart: "2026-10-22", oneWay: true }],
  ["الرياض شرم الشيخ الخميس الجاي 4 ايام مباشر", { origin: "RUH", destination: "SSH", depart: "2026-10-22", ret: "2026-10-26", direct: true }],
  ["أبغى أروح المدينة الويكند", { destination: "MED", depart: "2026-10-22", ret: "2026-10-24" }],
  ["من القاهرة للرياض 5/1 وارجع 20/1 ميزانية 2 الف", { origin: "CAI", destination: "RUH", depart: "2027-01-05", ret: "2027-01-20", budget: 2000 }],
  ["عيلتي 4 من جده الى كوالالمبور نص ديسمبر اسبوعين", { origin: "JED", destination: "KUL", depart: "2026-12-15", ret: "2026-12-29", adults: 4 }],
  ["لندن بعد اسبوعين", { destination: "LHR", depart: "2026-11-04" }],
  ["دبي ٣ أشخاص بعد ٣ أيام رايح جاي", { destination: "DXB", depart: "2026-10-24", adults: 3, oneWay: false }],
  ["من ابها لجدة اخر الشهر تحت 500 ريال", { origin: "AHB", destination: "JED", depart: "2026-10-25", budget: 500 }],
];

let pass = 0;
for (const [text, exp] of cases) {
  const got = parseRequest(text, { today, home: "RUH" });
  const bad = Object.entries(exp).filter(([k, v]) => got[k] !== v);
  if (bad.length) console.log("✗", text, "\n   ", bad.map(([k, v]) => `${k}: expected ${v} got ${got[k]}`).join(" | "));
  else pass++;
}
console.log(`${pass}/${cases.length} passed`);
process.exit(pass === cases.length ? 0 : 1);
