// محلل طلبات السفر المكتوبة بالعربي (فصحى ومصري وخليجي) — من غير أي ذكاء اصطناعي مدفوع.
// parseRequest("عايز القاهرة أول الشهر الجاي بأقل من 1000 ريال", {home:"RUH"})
import { norm, AIRPORT_INDEX } from "./data.js";

const DAY = 86400000;
const iso = d => d.toISOString().slice(0, 10);
const utc = (y, m, d) => new Date(Date.UTC(y, m, d));
const lastDay = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

const MONTHS = [
  [["يناير", "كانون الثاني", "جانفي"], 0], [["فبراير", "شباط", "فيفري"], 1], [["مارس", "اذار"], 2],
  [["ابريل", "نيسان", "افريل"], 3], [["مايو", "ايار"], 4], [["يونيو", "حزيران", "جوان"], 5],
  [["يوليو", "تموز", "جويليه"], 6], [["اغسطس", "اوت"], 7], [["سبتمبر", "ايلول"], 8],
  [["اكتوبر", "تشرين الاول"], 9], [["نوفمبر", "تشرين الثاني"], 10], [["ديسمبر", "كانون الاول"], 11],
];
const MONTH_WORDS = MONTHS.flatMap(([ws, i]) => ws.map(w => [w, i])).sort((a, b) => b[0].length - a[0].length);
const WEEKDAYS = [
  [["الاحد", "الحد"], 0], [["الاثنين", "الاتنين", "التنين"], 1], [["الثلاثاء", "الثلاثا", "التلات", "التلاتاء"], 2],
  [["الاربعاء", "الاربع", "الاربعا"], 3], [["الخميس"], 4], [["الجمعه"], 5], [["السبت"], 6],
];
const NUMWORDS = { "واحد": 1, "يومين": 2, "اتنين": 2, "اثنين": 2, "شخصين": 2, "تلاته": 3, "ثلاثه": 3, "تلات": 3, "ثلاث": 3,
  "اربعه": 4, "اربع": 4, "خمسه": 5, "خمس": 5, "سته": 6, "ست": 6, "سبعه": 7, "سبع": 7, "عشره": 10, "عشر": 10 };

const NEXT = "(?:الجاي|الجايه|القادم|القادمه|اللي جاي|الي جاي|اللي بعده|الياي|الجي)";
const POS = { "اول": "start", "بدايه": "start", "مطلع": "start", "اوائل": "start", "نص": "mid", "منتصف": "mid", "وسط": "mid", "اخر": "end", "نهايه": "end", "اواخر": "end" };
const POS_RE = "(اول|بدايه|مطلع|اوائل|نص|منتصف|وسط|اخر|نهايه|اواخر)";
const posDay = (p, y, m) => p === "mid" ? 15 : p === "end" ? Math.min(25, lastDay(y, m)) : 1;

function num(s) {
  if (s == null) return NaN;
  s = String(s).replace(/[,،]/g, "");
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  return NUMWORDS[s] ?? NaN;
}

function durationDays(n, unit) {
  if (/^(يوم|ايام|ليله|ليالي|ليال)$/.test(unit)) return n;
  if (/^(اسبوع|اسابيع|اسبوعين|جمعه)$/.test(unit)) return n * 7;
  if (/^(شهر|شهور|اشهر)$/.test(unit)) return n * 30;
  return NaN;
}
// "يومين" "اسبوعين" "3 ايام" "اسبوع" "شهر"
const DUR_RE = /(?:(\d+|[؀-ۿ]+)\s+)?(يومين|اسبوعين|شهرين|يوم|ايام|ليله|ليالي|ليال|اسبوع|اسابيع|شهر|شهور|اشهر)(?![؀-ۿ])/;
function readDuration(m) {
  let unit = m[2], n = m[1] ? num(m[1]) : 1;
  if (isNaN(n)) n = 1;
  if (unit === "يومين") { n = 2; unit = "يوم"; }
  if (unit === "اسبوعين") { n = 2; unit = "اسبوع"; }
  if (unit === "شهرين") { n = 2; unit = "شهر"; }
  return durationDays(n, unit);
}

function bumpFuture(date, today, unit) {
  // لو التاريخ عدّى، خده من السنة/الشهر الجاي
  while (date < today) {
    if (unit === "year") date = utc(date.getUTCFullYear() + 1, date.getUTCMonth(), date.getUTCDate());
    else date = utc(date.getUTCFullYear(), date.getUTCMonth() + 1, Math.min(date.getUTCDate(), lastDay(date.getUTCFullYear(), date.getUTCMonth() + 1)));
  }
  return date;
}

// يقرأ تاريخ من جزء من النص. بيرجع {date: Date, label, flexibleMonth} أو null
export function parseDate(t, today) {
  let m;
  // 2026-11-05
  if ((m = t.match(/(20\d\d)-(\d{1,2})-(\d{1,2})/))) return { date: utc(+m[1], m[2] - 1, +m[3]), label: m[0] };
  // 5/11 أو 5/11/2026
  if ((m = t.match(/(?<!\d)(\d{1,2})\s*[\/\.]\s*(\d{1,2})(?:\s*[\/\.]\s*(20\d\d|\d\d))?(?!\d)/))) {
    const d = +m[1], mo = +m[2] - 1;
    if (mo >= 0 && mo < 12 && d >= 1 && d <= 31) {
      let y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : today.getUTCFullYear();
      let date = utc(y, mo, d);
      if (!m[3]) date = bumpFuture(date, today, "year");
      return { date, label: `${d}/${mo + 1}` };
    }
  }
  // اسم شهر (مع يوم أو "اول/نص/اخر") — "15 نوفمبر" "نوفمبر 15" "اول ديسمبر" "شهر 12"
  for (const [w, mo] of MONTH_WORDS) {
    const re = new RegExp(`(?:${POS_RE}\\s+(?:شهر\\s+)?)?(?:(?:يوم\\s+)?(\\d{1,2})\\s+)?(?:شهر\\s+)?(?<![\\u0600-\\u06FF])${w}(?![\\u0600-\\u06FF])(?:\\s+(\\d{1,2})(?!\\d))?(?:\\s+(20\\d\\d))?`);
    if ((m = t.match(re))) {
      const y0 = m[4] ? +m[4] : today.getUTCFullYear();
      const pos = m[1] ? POS[m[1]] : null;
      const dayN = m[2] ? +m[2] : m[3] ? +m[3] : null;
      let date = utc(y0, mo, dayN || posDay(pos, y0, mo));
      if (!m[4]) date = bumpFuture(date, today, "year");
      return { date, label: m[0].trim(), flexibleMonth: !dayN && !pos };
    }
  }
  if ((m = t.match(new RegExp(`(?:${POS_RE}\\s+)?شهر\\s+(\\d{1,2})(?!\\d)`)))) {
    const mo = +m[2] - 1;
    if (mo >= 0 && mo < 12) {
      const pos = m[1] ? POS[m[1]] : null;
      let date = bumpFuture(utc(today.getUTCFullYear(), mo, posDay(pos, today.getUTCFullYear(), mo)), today, "year");
      return { date, label: m[0], flexibleMonth: !pos };
    }
  }
  // الشهر الجاي / الشهر ده
  if ((m = t.match(new RegExp(`(?:${POS_RE}\\s+)?(?:ال)?شهر\\s+${NEXT}`)))) {
    const y = today.getUTCFullYear(), mo = today.getUTCMonth() + 1;
    const pos = m[1] ? POS[m[1]] : null;
    const dm = t.match(/يوم\s+(\d{1,2})(?!\d)/);
    const d = new Date(Date.UTC(y, mo, 1));
    const date = utc(d.getUTCFullYear(), d.getUTCMonth(), dm ? +dm[1] : posDay(pos, d.getUTCFullYear(), d.getUTCMonth()));
    return { date, label: m[0], flexibleMonth: !pos && !dm };
  }
  if ((m = t.match(new RegExp(`${POS_RE}\\s+(?:ال)?شهر(?:\\s+(?:ده|دا|هذا|هاد|الحالي))?(?![\\u0600-\\u06FF])`)))) {
    const y = today.getUTCFullYear(), mo = today.getUTCMonth();
    let date = utc(y, mo, posDay(POS[m[1]], y, mo));
    if (date < today) date = new Date(today);
    return { date, label: m[0] };
  }
  // بعد بكره / بكره / النهارده
  if (/بعد\s+بكر[هه]|بعد\s+بكره/.test(t)) return { date: new Date(+today + 2 * DAY), label: "بعد بكره" };
  if (/(?<![؀-ۿ])(بكر[هه]|بكره|غدا|غدوه|باچر|باكر)(?![؀-ۿ])/.test(t)) return { date: new Date(+today + DAY), label: "بكره" };
  if (/(النهارده|النهارد[هه]|اليوم|الليله)(?![؀-ۿ])/.test(t) && !/اليوم\s+\d/.test(t)) return { date: new Date(today), label: "النهارده" };
  // الأسبوع الجاي
  if ((m = t.match(new RegExp(`(?:ال)?(?:اسبوع|جمعه)\\s+${NEXT}`)))) return { date: new Date(+today + 7 * DAY), label: m[0] };
  // بعد 3 ايام / بعد اسبوعين / بعد شهر
  if ((m = t.match(new RegExp("بعد\\s+" + DUR_RE.source)))) {
    const n = readDuration(m);
    if (!isNaN(n)) return { date: new Date(+today + n * DAY), label: m[0] };
  }
  // الويكند / نهاية الأسبوع → الخميس الجاي
  if (/ويك\s?اند|الويكند|نهايه\s+الاسبوع|اخر\s+الاسبوع|الاجازه\s+الاسبوعيه/.test(t)) {
    const add = ((4 - today.getUTCDay() + 7) % 7) || 7;
    return { date: new Date(+today + add * DAY), label: "الويكند", weekend: true };
  }
  // يوم الخميس / الخميس الجاي
  for (const [ws, wd] of WEEKDAYS) {
    for (const w of ws) {
      if ((m = t.match(new RegExp(`(?:يوم\\s+)?(?<![\\u0600-\\u06FF])${w}(?![\\u0600-\\u06FF])(\\s+${NEXT})?`)))) {
        let add = (wd - today.getUTCDay() + 7) % 7;
        if (add === 0) add = 7;
        return { date: new Date(+today + add * DAY), label: m[0].trim() };
      }
    }
  }
  // "يوم 20" لوحده → في الشهر ده أو الجاي
  if ((m = t.match(/يوم\s+(\d{1,2})(?!\d)/))) {
    const d = +m[1];
    if (d >= 1 && d <= 31) {
      let date = utc(today.getUTCFullYear(), today.getUTCMonth(), d);
      if (date < today) date = utc(today.getUTCFullYear(), today.getUTCMonth() + 1, d);
      return { date, label: m[0] };
    }
  }
  return null;
}

// يقسّم النص كلمات ويرجّع المدن ومكانها ودورها (مغادرة/وصول)
function findCities(t) {
  const toks = t.split(/[\s،,\.؟?!]+/).filter(Boolean);
  const found = [];
  const variants = tok => {
    const v = [tok];
    if (tok.startsWith("لل") && tok.length > 4) v.push("ال" + tok.slice(2), tok.slice(2));
    if (/^[وفبل]/.test(tok) && tok.length > 3) v.push(tok.slice(1));
    if (/^(ول|وب|فل)ل?/.test(tok) && tok.length > 4) v.push(tok.slice(2), "ال" + tok.slice(3));
    return v;
  };
  for (let i = 0; i < toks.length; i++) {
    let hit = null;
    for (let k = 3; k >= 1 && !hit; k--) {
      if (i + k > toks.length) continue;
      const rest = toks.slice(i + 1, i + k).join(" ");
      for (const v of variants(toks[i])) {
        const phrase = (v + (rest ? " " + rest : "")).trim();
        const e = AIRPORT_INDEX.find(([n]) => n === phrase);
        if (e) { hit = { code: e[1], i, k, prefixed: v !== toks[i], first: toks[i] }; break; }
      }
    }
    if (hit) {
      const prev = toks[i - 1] || "", prev2 = toks[i - 2] || "";
      let role = null;
      if (/^(من|م)$/.test(prev) || (prev === "مطار" && /^(من|م)$/.test(prev2))) role = "from";
      else if (/^(الي|لـ|ل|علي|عالـ|لحد|رايح|رايحين|رايحه|نروح|اروح|اسافر|نسافر|نطير|اطير|وجهتي|زياره|لمطار)$/.test(prev)
        || (prev === "مطار" && /^(الي|ل)$/.test(prev2))
        || /^(لل|ل)/.test(hit.first) && hit.prefixed) role = "to";
      found.push({ code: hit.code, role, i });
      i += hit.k - 1;
    }
  }
  return found;
}

export function parseRequest(text, opts = {}) {
  const today = opts.today ? new Date(opts.today + "T00:00:00Z") : (() => { const n = new Date(); return utc(n.getFullYear(), n.getMonth(), n.getDate()); })();
  const home = opts.home || "RUH";
  const t = norm(text);
  const out = { origin: "", destination: "", depart: "", ret: "", oneWay: true, adults: 1, budget: null, direct: false, cabin: "economy", flexibleMonth: false, notes: [], understood: [] };

  // المدن
  const cities = findCities(t);
  let from = cities.find(c => c.role === "from"), to = cities.find(c => c.role === "to");
  const rest = cities.filter(c => c !== from && c !== to && (!from || c.code !== from.code) && (!to || c.code !== to.code));
  if (!from && !to && rest.length >= 2) { from = rest[0]; to = rest[1]; }
  else if (!to && rest.length) to = rest.find(c => !from || c.code !== from.code);
  else if (!from && rest.length) from = rest[0];
  out.origin = from ? from.code : home;
  out.destination = to ? to.code : "";
  if (!from) out.notes.push("homeOrigin");

  // نقسم النص لجزء الذهاب وجزء العودة
  const retSplit = t.split(/(?:^|\s)(?:و\s*)?(?:ارجع|نرجع|راجع|راجعين|الرجوع|العوده|الرجعه|عودتي|رجوعي|واعود|اعود)(?=\s|$)/);
  const goPart = retSplit[0], backPart = retSplit.slice(1).join(" ");

  // مدة الرحلة (لمدة أسبوع / 5 أيام في دبي) — مش اللي بعد "بعد"
  let tripDays = null;
  const DUR_SCAN = /(?<![؀-ۿ])(?:(لمده|مده|نقعد|اقعد|هقعد|حوالي)\s+)?(?:(\d+|[؀-ۿ]+)\s+)?(يومين|اسبوعين|شهرين|ايام|ليالي|ليال|ليله|اسابيع|اسبوع|شهور|اشهر|شهر|يوم)(?![؀-ۿ])/g;
  for (const m of goPart.matchAll(DUR_SCAN)) {
    const lead = m[1], unitWord = m[3];
    let n = m[2] != null ? num(m[2]) : NaN;
    const numeric = !isNaN(n);
    const start = m.index + (numeric || lead ? 0 : (m[0].length - unitWord.length));
    if (/بعد\s*$/.test(goPart.slice(0, start)) || m[2] === "بعد") continue;
    const after = goPart.slice(m.index + m[0].length);
    if (new RegExp("^\\s*(\\d|" + NEXT + "|" + MONTH_WORDS.map(x => x[0]).join("|") + ")").test(after)) continue;
    if (/^(يوم|شهر|ليله)$/.test(unitWord) && !numeric && !lead) continue;
    if (!numeric) n = /ين$/.test(unitWord) ? 2 : 1;
    const unit = unitWord === "يومين" ? "يوم" : unitWord === "اسبوعين" ? "اسبوع" : unitWord === "شهرين" ? "شهر" : unitWord;
    const days = durationDays(n, unit);
    if (!isNaN(days) && days > 0 && days <= 90) { tripDays = days; break; }
  }

  const dep = parseDate(goPart, today);
  if (dep) {
    out.depart = iso(dep.date);
    out.flexibleMonth = !!dep.flexibleMonth;
    out.understood.push(["date", dep.label]);
    if (dep.weekend && !tripDays && !backPart) tripDays = 2;
  }
  const back = backPart ? parseDate(backPart, dep ? dep.date : today) : null;
  if (back && dep && back.date >= dep.date) { out.ret = iso(back.date); out.oneWay = false; }
  else if (tripDays) {
    const base = dep ? dep.date : new Date(+today + 14 * DAY);
    if (!dep) out.depart = iso(base);
    out.ret = iso(new Date(+base + tripDays * DAY));
    out.oneWay = false;
    out.understood.push(["dur", tripDays + " يوم"]);
  }

  // نوع الرحلة
  if (/ذهاب\s*(فقط|بس)|رايح\s*بس|اتجاه\s*واحد|one\s?way|بدون\s+(عوده|رجوع)/.test(t)) { out.oneWay = true; out.ret = ""; }
  else if (/رايح\s*جاي|ذهاب\s*و\s*(عوده|اياب|رجوع)|ذهاب\s*واياب|رحله\s+عوده/.test(t) && !out.ret) {
    const base = out.depart ? new Date(out.depart + "T00:00:00Z") : new Date(+today + 14 * DAY);
    if (!out.depart) out.depart = iso(base);
    out.ret = iso(new Date(+base + 7 * DAY)); out.oneWay = false; out.notes.push("defaultReturn");
  }

  // الميزانية
  let m = t.match(/(?:بأقل من|باقل من|اقل من|اقل م|تحت|ميزانيه|ميزانيتي|في حدود|حدود|لحد|ما يزيد عن|مايزيدش عن|ما تزيد عن|مش اكتر من|مو اكثر من|ماكس|max)\s*(\d[\d,\.]*)\s*(الف|ك|k)?\s*(ريال|رس|sar|دولار|\$|usd|جنيه)?/);
  if (!m) m = t.match(/(\d[\d,\.]*)\s*(الف|ك|k)?\s*(ريال|رس|sar|دولار|\$|usd|جنيه)/);
  if (m) {
    let v = parseFloat(m[1].replace(/,/g, ""));
    if (m[2]) v *= 1000;
    if (m[3] && /دولار|\$|usd/.test(m[3])) { v = Math.round(v * 3.75); out.notes.push("usd"); }
    if (m[3] === "جنيه") out.notes.push("egp");
    if (v > 50) { out.budget = Math.round(v); out.understood.push(["budget", out.budget + " ريال"]); }
  }

  // عدد المسافرين
  if ((m = t.match(/(\d+|[؀-ۿ]+)\s+(اشخاص|شخص|افراد|فرد|مسافرين|مسافر|نفر|انفار|ركاب|كبار)/))) {
    const n = num(m[1]); if (n >= 1 && n <= 9) out.adults = n;
  } else if (/شخصين|اتنين\s+احنا|احنا\s+اتنين/.test(t)) out.adults = 2;
  else if ((m = t.match(/(?:عيلتي|العيله|عائلتي|العائله|عيله)\s+(?:من\s+)?(\d+)/))) out.adults = Math.min(9, +m[1]);
  else if ((m = t.match(/(?:^|\s)انا((?:\s*و\s*[؀-ۿ]+)+)/))) {
    const extra = (m[1].match(/و\s*[؀-ۿ]+/g) || []).filter(w => !/^و\s*(اسافر|ارجع|عايز|ابغي|ابي|اروح|نروح)/.test(w)).length;
    if (extra) out.adults = Math.min(9, 1 + extra);
  }
  if ((m = t.match(/(\d+|[؀-ۿ]+)\s+(اطفال|عيال|ولاد|بزوره|بزران|اولاد)/))) {
    const n = num(m[1]); if (n >= 1 && n <= 8) out.adults = Math.min(9, out.adults + n);
  }
  if (out.adults > 1) out.understood.push(["pax", out.adults + " مسافرين"]);

  if (/مباشر|مباشره|بدون\s+(توقف|ترانزيت|ترانسيت)|دايركت|direct/.test(t)) { out.direct = true; out.understood.push(["direct", "مباشرة بس"]); }
  if (/رجال\s+الاعمال|بزنس|business|درجه\s+الاعمال/.test(t)) out.cabin = "business";
  else if (/الدرجه\s+الاولي|فيرست|first\s+class/.test(t)) out.cabin = "first";

  return out;
}
