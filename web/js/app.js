import { AIRPORTS, airline, airportName, findAirport, seasonsFor, SEASONS } from "./data.js";
import { parseRequest } from "./nlp.js";
import * as api from "./api.js";
import { verdict, encodeTrip } from "./verdict.js";
import { API_BASE } from "./config.js";

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
let lastOffers = [], lastSource = {}, lastNearby = false, lastCombo = false;
let runId = 0;
let lastCalDays = null, botUser = null;
fetch(`${API_BASE}/api/config`).then(r => r.json()).then(c => { botUser = c.bot || null; renderVerdict(); }).catch(() => {});

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
  updateBoard(null);
}

// ---------- لوحة المغادرة (حروف بتتقلب) ----------
const FLAP_CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-";
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const MON_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const dateCode = s => { if (!s) return "------"; const d = new Date(s + "T12:00:00"); return `${pad(d.getDate())} ${MON_EN[d.getMonth()]}`; };
function flapTo(el, text, width) {
  text = String(text).toUpperCase().padStart(width, " ").slice(-width);
  if (el.children.length !== width) el.innerHTML = Array.from({ length: width }, () => `<span class="flap"> </span>`).join("");
  el.setAttribute("aria-label", text.trim() || "فاضي");
  const gen = (el._gen = (el._gen || 0) + 1);
  [...el.children].forEach((cell, i) => {
    const target = text[i];
    if (REDUCED || cell.textContent === target) { cell.textContent = target; return; }
    let steps = 5 + i * 2 + Math.floor(Math.random() * 4);
    const tick = () => {
      if (el._gen !== gen) return;
      steps--;
      cell.textContent = steps <= 0 ? target : FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)];
      cell.classList.remove("tick"); void cell.offsetWidth; cell.classList.add("tick");
      if (steps > 0) setTimeout(tick, 55);
    };
    setTimeout(tick, i * 35);
  });
}
function updateBoard(price) {
  flapTo($("bFrom"), q.origin || "---", 3);
  flapTo($("bTo"), q.destination || "---", 3);
  flapTo($("bDep"), dateCode(q.depart), 6);
  flapTo($("bRet"), q.ret ? dateCode(q.ret) : "------", 6);
  $("bFromName").textContent = q.origin ? airportName(q.origin) : "";
  $("bToName").textContent = q.destination ? airportName(q.destination) : "";
  $("bDepAr").textContent = q.depart ? prettyDate(q.depart) : "";
  $("bRetAr").textContent = q.ret ? prettyDate(q.ret) : "ذهاب بس";
  if (price !== undefined) {
    flapTo($("bPrice"), price == null ? "-----" : String(Math.round(price)), 5);
    $("bPriceSub").textContent = price == null ? "ريال" : `ريال${(q.adults || 1) > 1 ? ` لـ ${q.adults} مسافرين` : ""}`;
  }
}
function boardStatus(text, busy) { const b = $("boardStatus"); b.textContent = text; b.classList.toggle("busy", !!busy); }

// ---------- الوضع الفاتح/الغامق ----------
$("themeBtn").onclick = () => {
  const root = document.documentElement;
  const cur = root.dataset.theme || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  root.dataset.theme = cur === "light" ? "dark" : "light";
  try { localStorage.setItem("fr_theme", root.dataset.theme); } catch { /* عادي */ }
};
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
  boardStatus("بيدوّر…", true);
  lastCalDays = null; lastOffers = []; $("verdict").innerHTML = "";
  $("altList").innerHTML = `<div class="skel" style="height:60px"></div>`;
  if (calMonth < TODAY.slice(0, 7)) calMonth = TODAY.slice(0, 7);
  const params = { origin: q.origin, destination: q.destination, depart: q.depart, ret: q.ret, direct: q.direct };
  loadCalendar();
  try {
    const r = await api.search(params);
    if (id !== runId) return;
    lastOffers = r.offers || []; lastNearby = !!r.nearby; lastCombo = !!r.combo; lastSource.search = r.source; renderOffers(); demoBanner();
  } catch (e) { if (id === runId) { boardStatus("فيه مشكلة", false); updateBoard(null); } if (id === runId) $("offers").innerHTML = `<div class="empty">${esc(e.userMessage || "مقدرناش نجيب الأسعار دلوقتي. جرّب تاني بعد شوية.")}</div>`; }
  try {
    const r = await api.alternates(params);
    if (id !== runId) return;
    lastSource.alt = r.source; renderAlternates(r.options || []);
  } catch { if (id === runId) $("altList").innerHTML = `<div class="empty">مقدرناش نقارن المطارات البديلة دلوقتي.</div>`; }
}

function demoBanner() { $("demoBanner").hidden = !Object.values(lastSource).includes("demo"); }

// ---------- السعر الحقيقي ----------
function realCost(o) {
  const a = airline(o.airline), n = q.adults || 1;
  const hasBack = !!(o.return_at || q.ret);
  const b = o.combo && o.backAirline ? airline(o.backAirline) : a; // شركة العودة لو تذكرتين منفصلتين
  const bag = settings.bag ? a.bag + (hasBack ? b.bag : 0) : 0;
  const seat = settings.seat ? a.seat + (hasBack ? b.seat : 0) : 0;
  return { a, b, bag, seat, per: o.price + bag + seat, total: (o.price + bag + seat) * n, n };
}

function gflights(origin, destination, depart, ret, adults, nonstop) {
  const text = `Flights from ${origin} to ${destination} on ${depart}` + (ret ? ` through ${ret}` : " one way") + (adults > 1 ? ` ${adults} adults` : "") + (nonstop ? " nonstop" : "");
  return "https://www.google.com/travel/flights?hl=ar&curr=SAR&q=" + encodeURIComponent(text);
}

const PLANE = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5Z" transform="rotate(-90 12 12)"/></svg>`;

function renderOffers() {
  if (!lastOffers.length) {
    updateBoard(null); boardStatus("مفيش نتايج", false);
    $("offers").innerHTML = `<div class="empty">مفيش أسعار محفوظة للتاريخ ده. جرّب يوم تاني من التقويم، أو دوّر في <a href="${gflights(q.origin, q.destination, q.depart, q.ret, q.adults)}" target="_blank" rel="noopener">Google Flights</a>.</div>`;
    return;
  }
  const list = lastOffers.map(o => ({ o, c: realCost(o) })).sort((x, y) => x.c.total - y.c.total);
  updateBoard(list[0].c.total);
  renderVerdict();
  boardStatus(`${list.length} ${list.length === 1 ? "رحلة" : list.length < 11 ? "رحلات" : "رحلة"}`, false);
  const cheapestTicket = list.reduce((m, x) => x.o.price < m.o.price ? x : m, list[0]);
  const notes = [];
  if (lastCombo) notes.push("مفيش تذكرة ذهاب وعودة محفوظة للخط ده، فركّبنا أرخص ذهاب مع أرخص عودة. دول تذكرتين منفصلتين بتحجز كل واحدة لوحدها.");
  if (lastNearby) notes.push("مفيش أسعار محفوظة لتواريخك بالظبط، فدي أقرب الأيام قبلها وبعدها (التاريخ مكتوب تحت كل رحلة).");
  const nearNote = notes.length ? `<div class="banner warn">${notes.join(" ")}</div>` : "";
  $("offers").innerHTML = nearNote + list.slice(0, 12).map((x, i) => {
    const { o, c } = x, a = c.a;
    const badges = [];
    if (x === cheapestTicket && i !== 0) badges.push(`<span class="badge mute">أرخص تذكرة، بس الإضافات بتغليها</span>`);
    if (q.budget && c.total > q.budget) badges.push(`<span class="badge over">فوق ميزانيتك بـ ${fmt(c.total - q.budget)}</span>`);
    if (q.budget && c.total <= q.budget) badges.push(`<span class="badge">في حدود ميزانيتك</span>`);
    if (o.combo) badges.push(`<span class="badge mute">تذكرتين منفصلتين</span>`);
    if (!a.known || !c.b.known) badges.push(`<span class="badge mute">رسوم الإضافات مش معروفة</span>`);
    const rows = o.combo ? [["الذهاب", o.outPrice], ["العودة", o.backPrice]] : [["التذكرة", o.price]];
    if (settings.bag) rows.push(["شنطة شحن", c.bag || "مشمولة"]);
    if (settings.seat) rows.push(["اختيار مقعد", c.seat || "مجاني"]);
    if (c.n > 1) rows.push(["للفرد", c.per], ["المسافرين", `× ${c.n}`]);
    const showDate = o.nearby || o.combo;
    const leg = (from, to, at, d, stops, back) => `<div class="leg${back ? " back" : ""}">
        <div class="pt"><b>${esc(from)}</b><span>${at ? esc(at.slice(11, 16)) : ""}${showDate && at ? " · " + prettyDate(at.slice(0, 10)) : ""}</span></div>
        <div class="track"><span class="meta">${PLANE}${dur(d)}${d != null ? " · " : ""}${stopsTxt(stops ?? 0)}</span></div>
        <div class="pt"><b>${esc(to)}</b><span>${esc(airportName(to))}</span></div>
      </div>`;
    const names = esc(a.name) + (o.combo && c.b.code !== a.code ? " + " + esc(c.b.name) : "");
    return `<article class="bp${i === 0 ? " best" : ""}" style="--i:${i}">
      <div class="bp-main">
        <div class="bp-head">
          <span class="mark">${esc(o.airline)}</span>
          <div><div class="bp-name">${names}</div><span class="bp-flight">${esc(o.flight || "")}${o.combo && o.backFlight ? " · " + esc(o.backFlight) : ""}</span></div>
          ${badges.length ? `<div class="badges">${badges.join("")}</div>` : ""}
        </div>
        <div class="legs">
          ${leg(o.origin, o.destination, o.depart_at, o.duration_to, o.transfers, false)}
          ${o.return_at ? leg(o.destination, o.origin, o.return_at, o.duration_back, o.return_transfers, true) : ""}
        </div>
        <div class="bp-actions">
          <a class="primary" href="${esc(a.url)}" target="_blank" rel="noopener">احجز ${o.combo ? "الذهاب " : ""}من ${esc(a.name)} ↗</a>
          ${o.combo ? `<a class="primary" href="${esc(c.b.url)}" target="_blank" rel="noopener">احجز العودة من ${esc(c.b.name)} ↗</a>` : ""}
          <a class="ghost" href="${gflights(o.origin, o.destination, (o.depart_at || q.depart).slice(0, 10), o.return_at ? o.return_at.slice(0, 10) : q.ret, q.adults, o.transfers === 0)}" target="_blank" rel="noopener">أكّد في Google Flights</a>
          ${o.link ? `<a class="ghost" href="${esc(o.link)}" target="_blank" rel="noopener">${o.combo ? "الذهاب" : "العرض"} في Aviasales</a>` : ""}
          ${o.backLink ? `<a class="ghost" href="${esc(o.backLink)}" target="_blank" rel="noopener">العودة في Aviasales</a>` : ""}
        </div>
      </div>
      <aside class="bp-stub">
        <span class="stub-label">السعر الحقيقي${c.n > 1 ? ` لـ ${c.n} مسافرين` : ""}</span>
        <div class="total">${fmt(c.total)}<small>ريال</small></div>
        <ul class="receipt">${rows.map(([k, v]) => `<li><span>${k}</span><b>${typeof v === "number" ? fmt(v) : esc(v)}</b></li>`).join("")}</ul>
      </aside>
    </article>`;
  }).join("");
}

// ---------- رأي الرادار ----------
function renderVerdict() {
  const box = $("verdict");
  if (!box || (!lastOffers.length && !lastCalDays)) return;
  const v = verdict({ depart: q.depart, today: TODAY, days: lastCalDays || {} });
  const alertLink = botUser ? `https://t.me/${encodeURIComponent(botUser)}?start=${encodeTrip(q)}` : null;
  box.innerHTML = `<section class="verdict v-${v.level}">
    <div class="v-head">
      <span class="v-dot" aria-hidden="true"></span>
      <div><p class="eyebrow">رأي الرادار</p><h3>${esc(v.title)}</h3></div>
      ${v.daysLeft >= 0 ? `<span class="v-days"><b>${fmt(v.daysLeft)}</b> يوم على السفر</span>` : ""}
    </div>
    <ul class="v-reasons">${v.reasons.map(r => `<li>${esc(r)}</li>`).join("")}</ul>
    ${v.rank != null ? `<div class="gauge" role="img" aria-label="مكان سعر يومك وسط أيام الشهر">
      <div class="g-bar"><span style="inset-inline-start:${Math.round(v.rank * 100)}%"></span></div>
      <div class="g-lbl"><span>أرخص يوم في الشهر</span><span>أغلى يوم</span></div></div>` : ""}
    <div class="v-actions">
      ${v.cheaperNear ? `<button type="button" class="ghost small" id="vMove">جرّب يوم ${prettyDate(v.cheaperNear)}</button>` : ""}
      ${alertLink ? `<a class="primary" href="${alertLink}" target="_blank" rel="noopener">🔔 نبّهني على تيليجرام لو السعر نزل</a>` : ""}
    </div>
    <p class="hint">تقدير من أسعار الشهر وقرب ميعاد السفر، مش توقّع مضمون.</p>
  </section>`;
  const mv = $("vMove");
  if (mv) mv.onclick = () => { const len = q.ret ? daysBetween(q.depart, q.ret) : 0; q.depart = v.cheaperNear; if (len) q.ret = addDays(q.depart, len); run(); };
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
    if (month === q.depart.slice(0, 7)) { lastCalDays = r.days || {}; renderVerdict(); }
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
    const note = r === main ? `<span class="tag more">خطك الحالي</span>` : diff > 0 ? `<span class="tag save">توفّر ${fmt(diff)} ريال</span>` : `<span class="tag more">أغلى بـ ${fmt(-diff)}</span>`;
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
