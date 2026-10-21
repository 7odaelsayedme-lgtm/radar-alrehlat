import { AIRPORTS, airline, airportName, findAirport, seasonsFor, SEASONS } from "./data.js";
import { parseRequest } from "./nlp.js";
import * as api from "./api.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = n => Math.round(n).toLocaleString("ar-SA");
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* التخزين مقفول: عادي */ } },
};
const pad = n => String(n).padStart(2, "0");
const isoLocal = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const TODAY = isoLocal(new Date());
const addDays = (s, n) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return isoLocal(d); };
const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);
const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const prettyDate = s => { const d = new Date(s + "T12:00:00"); return `${d.getDate()} ${MONTHS_AR[d.getMonth()]}`; };
const dur = m => m == null ? "" : `${Math.floor(m / 60)}س${m % 60 ? " " + (m % 60) + "د" : ""}`;
const stopsTxt = n => n === 0 ? "مباشرة" : n === 1 ? "توقف واحد" : `${n} توقفات`;

// ---------- الحالة ----------
const settings = Object.assign({ home: "RUH", bag: true, seat: false }, store.get("fr_settings", {}));
let q = store.get("fr_last", null);
if (!q || q.depart < TODAY) q = { origin: settings.home, destination: "CAI", depart: addDays(TODAY, 14), ret: addDays(TODAY, 21), adults: 1, budget: null, direct: false };
let calMonth = q.depart.slice(0, 7);
let lastOffers = [], lastSource = {}, lastNearby = false;
let runId = 0;

// ---------- تجهيز الواجهة ----------
$("airports").innerHTML = AIRPORTS.map(a => `<option value="${a[0]} — ${esc(a[1])}"></option>`).join("");
$("homeAirport").innerHTML = AIRPORTS.filter(a => ["السعودية", "مصر", "الإمارات", "قطر", "الكويت", "البحرين", "عُمان", "الأردن"].includes(a[2]))
  .map(a => `<option value="${a[0]}">${esc(a[1])} (${a[0]})</option>`).join("");
$("homeAirport").value = settings.home;
$("adults").innerHTML = Array.from({ length: 9 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("");
$("bag").checked = settings.bag; $("seat").checked = settings.seat;

const EXAMPLES = [
  "من جدة للقاهرة أول الشهر الجاي لمدة أسبوع",
  "دبي الويكند",
  "من الدمام لإسطنبول أنا ومراتي في ديسمبر بأقل من 4000 ريال",
  "شرم الشيخ الخميس الجاي 4 أيام مباشر",
];
$("examples").innerHTML = EXAMPLES.map(e => `<button type="button">${esc(e)}</button>`).join("");
$("examples").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; $("query").value = b.textContent; ask(); });

$("settingsBtn").onclick = () => { const s = $("settings"); s.hidden = !s.hidden; $("settingsBtn").setAttribute("aria-expanded", String(!s.hidden)); };
$("homeAirport").onchange = () => { settings.home = $("homeAirport").value; store.set("fr_settings", settings); };
$("bag").onchange = $("seat").onchange = () => { settings.bag = $("bag").checked; settings.seat = $("seat").checked; store.set("fr_settings", settings); renderOffers(); };
$("askBtn").onclick = ask;
$("query").addEventListener("keydown", e => { if (e.key === "Enter") ask(); });
$("swap").onclick = () => { const t = $("from").value; $("from").value = $("to").value; $("to").value = t; readForm(); run(); };
$("form").addEventListener("submit", e => { e.preventDefault(); readForm(); run(); });
$("calPrev").onclick = () => { calMonth = shiftMonth(calMonth, -1); loadCalendar(); };
$("calNext").onclick = () => { calMonth = shiftMonth(calMonth, 1); loadCalendar(); };

function fillForm() {
  $("from").value = q.origin ? `${q.origin} — ${airportName(q.origin)}` : "";
  $("to").value = q.destination ? `${q.destination} — ${airportName(q.destination)}` : "";
  $("depart").value = q.depart || ""; $("ret").value = q.ret || "";
  $("adults").value = String(q.adults || 1); $("budget").value = q.budget || ""; $("direct").checked = !!q.direct;
  $("depart").min = TODAY; $("ret").min = q.depart || TODAY;
  $("routeView").innerHTML = `${esc(q.origin || "???")} <span>${q.ret ? "⇄" : "→"}</span> ${esc(q.destination || "???")}`;
  $("dateView").textContent = (q.depart || "") + (q.ret ? "  ·  " + q.ret : "");
}
function readForm() {
  q = { origin: findAirport($("from").value), destination: findAirport($("to").value), depart: $("depart").value, ret: $("ret").value,
    adults: +$("adults").value || 1, budget: +$("budget").value || null, direct: $("direct").checked };
  if (q.ret && q.ret < q.depart) q.ret = "";
}

function ask() {
  const text = $("query").value.trim();
  if (!text) { $("query").focus(); return; }
  const p = parseRequest(text, { today: TODAY, home: settings.home });
  const u = $("understood");
  if (!p.destination) {
    u.innerHTML = `<span class="err">مش لاقي الوجهة في كلامك. اكتب اسم المدينة، مثلًا «القاهرة» أو «دبي».</span>`;
    return;
  }
  q = { origin: p.origin, destination: p.destination, depart: p.depart || addDays(TODAY, 14), ret: p.ret || "",
    adults: p.adults, budget: p.budget, direct: p.direct };
  const chips = [
    ["من", `${airportName(p.origin)}${p.notes.includes("homeOrigin") ? " (مطارك الأساسي)" : ""}`],
    ["إلى", airportName(p.destination)],
    ["الذهاب", prettyDate(q.depart) + (p.depart ? "" : " (افتراضي)")],
    ...(q.ret ? [["العودة", prettyDate(q.ret) + (p.notes.includes("defaultReturn") ? " (افتراضي)" : "")]] : [["", "ذهاب بس"]]),
    ...(p.adults > 1 ? [["", `${p.adults} مسافرين`]] : []),
    ...(p.budget ? [["الميزانية", `${fmt(p.budget)} ريال`]] : []),
    ...(p.direct ? [["", "مباشرة بس"]] : []),
  ];
  u.innerHTML = `<span class="lbl">فهمت كده:</span>` + chips.map(([k, v]) => `<span class="chip">${k ? esc(k) + ": " : ""}${esc(v)}</span>`).join("")
    + (p.flexibleMonth ? `<span class="lbl">· حددت شهر بس، فبصّ على التقويم تلاقي أرخص يوم فيه.</span>` : "")
    + (p.notes.includes("egp") ? `<span class="lbl">· الأسعار هنا بالريال.</span>` : "");
  calMonth = q.depart.slice(0, 7);
  run();
}

// ---------- البحث ----------
async function run() {
  fillForm();
  const err = !q.origin || !q.destination ? "اختار مطار المغادرة والوصول من القائمة."
    : q.origin === q.destination ? "المغادرة والوصول نفس المطار."
    : !q.depart ? "اختار تاريخ الذهاب." : q.depart < TODAY ? "تاريخ الذهاب عدّى." : "";
  $("err").textContent = err;
  if (err) return;
  store.set("fr_last", q);
  const id = ++runId;
  renderSeasons();
  $("offers").innerHTML = `<div class="skel"></div><div class="skel"></div><div class="skel"></div>`;
  $("altList").innerHTML = `<div class="skel" style="height:60px"></div>`;
  if (calMonth < TODAY.slice(0, 7)) calMonth = TODAY.slice(0, 7);
  const params = { origin: q.origin, destination: q.destination, depart: q.depart, ret: q.ret, direct: q.direct };
  loadCalendar();
  try {
    const r = await api.search(params);
    if (id !== runId) return;
    lastOffers = r.offers || []; lastNearby = !!r.nearby; lastSource.search = r.source; renderOffers(); demoBanner();
  } catch (e) { if (id === runId) $("offers").innerHTML = `<div class="empty">${esc(e.userMessage || "مقدرناش نجيب الأسعار دلوقتي. جرّب تاني بعد شوية.")}</div>`; }
  try {
    const r = await api.alternates(params);
    if (id !== runId) return;
    lastSource.alt = r.source; renderAlternates(r.options || []);
  } catch { if (id === runId) $("altList").innerHTML = `<div class="empty">مقدرناش نقارن المطارات البديلة دلوقتي.</div>`; }
}

function demoBanner() { $("demoBanner").hidden = !Object.values(lastSource).includes("demo"); }

// ---------- السعر الحقيقي ----------
function realCost(o) {
  const a = airline(o.airline), legs = o.return_at || q.ret ? 2 : 1, n = q.adults || 1;
  const bag = settings.bag ? a.bag * legs : 0, seat = settings.seat ? a.seat * legs : 0;
  return { a, bag, seat, per: o.price + bag + seat, total: (o.price + bag + seat) * n, n };
}

function gflights(origin, destination, depart, ret, adults, nonstop) {
  const text = `Flights from ${origin} to ${destination} on ${depart}` + (ret ? ` through ${ret}` : " one way") + (adults > 1 ? ` ${adults} adults` : "") + (nonstop ? " nonstop" : "");
  return "https://www.google.com/travel/flights?hl=ar&curr=SAR&q=" + encodeURIComponent(text);
}

function renderOffers() {
  if (!lastOffers.length) { $("offers").innerHTML = `<div class="empty">مفيش أسعار محفوظة للتاريخ ده. جرّب يوم تاني من التقويم، أو دوّر في <a href="${gflights(q.origin, q.destination, q.depart, q.ret, q.adults)}" target="_blank" rel="noopener">Google Flights</a>.</div>`; return; }
  const list = lastOffers.map(o => ({ o, c: realCost(o) })).sort((x, y) => x.c.total - y.c.total);
  const cheapestTicket = list.reduce((m, x) => x.o.price < m.o.price ? x : m, list[0]);
  const nearNote = lastNearby ? `<div class="banner demo">مفيش أسعار محفوظة ليوم ${prettyDate(q.depart)} بالظبط، فدي أقرب الأيام قبله وبعده (التاريخ مكتوب جنب كل رحلة).</div>` : "";
  $("offers").innerHTML = nearNote + list.slice(0, 12).map((x, i) => {
    const { o, c } = x, a = c.a;
    const badges = [];
    if (i === 0) badges.push(`<span class="badge">الأفضل بعد الإضافات</span>`);
    if (x === cheapestTicket && i !== 0) badges.push(`<span class="badge stop">أرخص تذكرة، بس الإضافات بتغليها</span>`);
    if (q.budget && c.total > q.budget) badges.push(`<span class="badge over">فوق ميزانيتك بـ ${fmt(c.total - q.budget)}</span>`);
    if (q.budget && c.total <= q.budget) badges.push(`<span class="badge">في حدود ميزانيتك</span>`);
    if (!a.known) badges.push(`<span class="badge stop">رسوم الإضافات مش معروفة</span>`);
    const parts = [`التذكرة ${fmt(o.price)}`];
    if (c.bag) parts.push(`شنطة ${fmt(c.bag)}`); else if (settings.bag && a.known) parts.push("الشنطة مشمولة");
    if (c.seat) parts.push(`مقعد ${fmt(c.seat)}`);
    const leg = (from, to, at, d, stops) => `<div class="leg"><span class="t">${esc(from)} ${at ? esc(at.slice(11, 16)) : ""}</span>${o.nearby && at ? `<span class="o-meta">${prettyDate(at.slice(0, 10))}</span>` : ""}<span class="dash"></span><span class="o-meta">${dur(d)}${d != null ? " · " : ""}${stopsTxt(stops ?? 0)}</span><span class="dash"></span><span class="t">${esc(to)}</span></div>`;
    return `<article class="offer${i === 0 ? " best" : ""}">
      <div class="o-top">
        <div class="o-air"><span class="o-code">${esc(o.flight || o.airline)}</span><div><div class="o-name">${esc(a.name)}</div>${badges.length ? `<div class="badges">${badges.join("")}</div>` : ""}</div></div>
        <div class="o-price"><div class="o-total">${fmt(c.total)} <small>ريال${c.n > 1 ? ` لـ ${c.n} مسافرين` : ""}</small></div><div class="o-break">${parts.join(" + ")}${c.n > 1 ? " · للفرد" : ""}</div></div>
      </div>
      <div class="o-legs">
        ${leg(o.origin, o.destination, o.depart_at, o.duration_to, o.transfers)}
        ${o.return_at ? leg(o.destination, o.origin, o.return_at, o.duration_back, o.return_transfers) : ""}
      </div>
      <div class="o-actions">
        <a class="primary" href="${esc(a.url)}" target="_blank" rel="noopener">احجز من موقع ${esc(a.name)} ↗</a>
        <a class="ghost" href="${gflights(o.origin, o.destination, (o.depart_at || q.depart).slice(0, 10), o.return_at ? o.return_at.slice(0, 10) : q.ret, q.adults, o.transfers === 0)}" target="_blank" rel="noopener">أكّد السعر في Google Flights</a>
        ${o.link ? `<a class="ghost" href="${esc(o.link)}" target="_blank" rel="noopener">العرض في Aviasales</a>` : ""}
      </div>
    </article>`;
  }).join("");
}

// ---------- المواسم ----------
function renderSeasons() {
  const hits = [...seasonsFor(q.depart, q.origin, q.destination), ...(q.ret ? seasonsFor(q.ret, q.origin, q.destination) : [])]
    .filter((s, i, arr) => arr.indexOf(s) === i);
  if (!hits.length) { $("seasonBox").innerHTML = ""; return; }
  const len = q.ret ? daysBetween(q.depart, q.ret) : 0;
  const from = hits.reduce((m, s) => s.from < m ? s.from : m, hits[0].from);
  const to = hits.reduce((m, s) => s.to > m ? s.to : m, hits[0].to);
  const opts = [];
  const before = addDays(from, -(len + 2));
  if (before >= TODAY) opts.push(before);
  opts.push(addDays(to, 2));
  $("seasonBox").innerHTML = `<div class="season">
    <div><b>تاريخك في موسم:</b> ${hits.map(s => `${esc(s.name)} (${prettyDate(s.from)} – ${prettyDate(s.to)}): ${esc(s.why)}`).join("، ")}.</div>
    <div class="row"><span class="hint">لو تقدر تتحرك، جرّب:</span>${opts.map(d => `<button type="button" class="ghost small" data-shift="${d}">الذهاب ${prettyDate(d)}${len ? ` والعودة ${prettyDate(addDays(d, len))}` : ""}</button>`).join("")}</div>
  </div>`;
  $("seasonBox").querySelectorAll("[data-shift]").forEach(b => b.onclick = () => {
    q.depart = b.dataset.shift; if (len) q.ret = addDays(q.depart, len); calMonth = q.depart.slice(0, 7); run();
  });
}

// ---------- التقويم ----------
function shiftMonth(m, n) { const [y, mo] = m.split("-").map(Number); const d = new Date(y, mo - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }
async function loadCalendar() {
  const id = runId, month = calMonth;
  $("calPrev").disabled = month <= TODAY.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  $("calMonth").textContent = `${MONTHS_AR[m - 1]} ${y}`;
  $("calGrid").innerHTML = `<div class="skel" style="grid-column:1/-1;height:200px"></div>`;
  try {
    const r = await api.calendar({ origin: q.origin, destination: q.destination, month });
    if (month !== calMonth || id !== runId) return;
    lastSource.cal = r.source; demoBanner();
    renderCalendar(month, r.days || {});
  } catch { $("calGrid").innerHTML = `<div class="empty" style="grid-column:1/-1">مقدرناش نجيب التقويم.</div>`; }
}
function renderCalendar(month, days) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1).getDay(), count = new Date(y, m, 0).getDate();
  const prices = Object.entries(days).filter(([d]) => d >= TODAY).map(([, v]) => v.price).sort((a, b) => a - b);
  const q5 = k => prices[Math.min(prices.length - 1, Math.floor(prices.length * k / 5))];
  const cuts = prices.length ? [q5(1), q5(2), q5(3), q5(4)] : [];
  const level = p => 1 + cuts.filter(c => p > c).length;
  const len = q.ret ? daysBetween(q.depart, q.ret) : 0;
  let html = ["ح", "ن", "ث", "ر", "خ", "ج", "س"].map(w => `<div class="wd">${w}</div>`).join("");
  html += "<div></div>".repeat(first);
  for (let d = 1; d <= count; d++) {
    const ds = `${month}-${pad(d)}`, v = days[ds], past = ds < TODAY;
    const season = SEASONS.some(s => ds >= s.from && ds <= s.to && (!s.routes || s.routes.includes(q.origin) || s.routes.includes(q.destination)));
    const cls = ["day", past ? "past" : v ? "l" + level(v.price) : "none", ds === q.depart ? "sel" : "", season ? "season" : ""].join(" ");
    const label = `${d} ${MONTHS_AR[m - 1]}${v ? `، ${fmt(v.price)} ريال` : "، مفيش سعر"}${season ? "، موسم" : ""}`;
    html += `<button type="button" class="${cls}" data-day="${ds}" ${past ? "disabled" : ""} aria-label="${label}"><span class="d">${d}</span><span class="p">${v && !past ? fmt(v.price) : ""}</span></button>`;
  }
  $("calGrid").innerHTML = html;
  $("calGrid").querySelectorAll("[data-day]:not([disabled])").forEach(b => b.onclick = () => {
    q.depart = b.dataset.day; if (len) q.ret = addDays(q.depart, len); run();
  });
}

// ---------- المطارات البديلة ----------
function renderAlternates(options) {
  const n = q.adults || 1, legs = q.ret ? 2 : 1;
  const rows = options.map(o => ({ ...o, total: o.best.price * n + o.groundCost * n * legs }));
  const main = rows.find(r => r.origin === q.origin && r.destination === q.destination);
  const others = rows.filter(r => r !== main).sort((a, b) => a.total - b.total);
  if (!others.length) { $("altList").innerHTML = `<div class="empty">مفيش مطارات بديلة قريبة معروفة للخط ده.</div>`; return; }
  const base = main ? main.total : null;
  $("altList").innerHTML = [main, ...others].filter(Boolean).map(r => {
    const diff = base != null ? base - r.total : null;
    const note = r === main ? `<span class="more">خطك الحالي</span>` : diff > 0 ? `<span class="save">توفّر ${fmt(diff)}</span>` : `<span class="more">أغلى بـ ${fmt(-diff)}</span>`;
    const ground = [r.groundFrom ? `من ${airportName(r.origin)}: ${r.groundFrom}` : "", r.groundTo ? `لـ ${airportName(r.destination)}: ${r.groundTo}` : ""].filter(Boolean).join(" · ");
    return `<div class="alt">
      <span class="r">${esc(r.origin)} → ${esc(r.destination)}</span><span class="v">${fmt(r.total)} ريال</span>
      <span class="g">${esc(airportName(r.origin))} ← ${esc(airportName(r.destination))} · ${note}${ground ? ` · ${esc(ground)} (المشوار محسوب تقريبًا ${fmt(r.groundCost * n * legs)})` : ""}</span>
      ${r !== main && diff > 0 ? `<button type="button" class="ghost small" data-alt="${r.origin}-${r.destination}">جرّب الخط ده</button>` : ""}
    </div>`;
  }).join("");
  $("altList").querySelectorAll("[data-alt]").forEach(b => b.onclick = () => {
    const [o, d] = b.dataset.alt.split("-"); q.origin = o; q.destination = d; run(); window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ---------- تثبيت كتطبيق ----------
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => { /* مش متاح هنا: عادي */ });
}

fillForm();
run();
