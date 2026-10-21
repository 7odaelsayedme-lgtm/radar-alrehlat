// بيانات ثابتة: المطارات، شركات الطيران، المطارات البديلة، المواسم.
// عدّل هنا براحتك؛ كل الملفات التانية بتقرا من الملف ده.

// [رمز IATA, الاسم بالعربي, الدولة, أسماء بديلة يكتبها الناس]
export const AIRPORTS = [
  ["RUH", "الرياض", "السعودية", ["رياض", "riyadh"]],
  ["JED", "جدة", "السعودية", ["جده", "jeddah", "مكة", "مكه", "مكة المكرمة"]],
  ["DMM", "الدمام", "السعودية", ["دمام", "الخبر", "الشرقية", "dammam"]],
  ["HOF", "الأحساء", "السعودية", ["الاحساء", "الهفوف", "hofuf"]],
  ["MED", "المدينة المنورة", "السعودية", ["المدينة", "المدينه", "المدينه المنوره", "medina"]],
  ["AHB", "أبها", "السعودية", ["ابها", "abha"]],
  ["TIF", "الطائف", "السعودية", ["طائف", "الطايف", "taif"]],
  ["TUU", "تبوك", "السعودية", ["tabuk"]],
  ["ELQ", "القصيم", "السعودية", ["بريدة", "بريده", "qassim"]],
  ["GIZ", "جازان", "السعودية", ["جيزان", "jazan"]],
  ["HAS", "حائل", "السعودية", ["حايل", "hail"]],
  ["ULH", "العلا", "السعودية", ["alula"]],
  ["YNB", "ينبع", "السعودية", ["yanbu"]],
  ["NUM", "نيوم", "السعودية", ["neom"]],
  ["CAI", "القاهرة", "مصر", ["القاهره", "مصر", "cairo"]],
  ["SPX", "سفنكس (الجيزة)", "مصر", ["سفنكس", "الجيزة", "الجيزه", "sphinx"]],
  ["HBE", "الإسكندرية", "مصر", ["اسكندرية", "اسكندريه", "الاسكندريه", "برج العرب", "alexandria"]],
  ["SSH", "شرم الشيخ", "مصر", ["شرم", "sharm"]],
  ["HRG", "الغردقة", "مصر", ["الغردقه", "hurghada"]],
  ["LXR", "الأقصر", "مصر", ["الاقصر", "luxor"]],
  ["ASW", "أسوان", "مصر", ["اسوان", "aswan"]],
  ["SKV", "سانت كاترين", "مصر", []],
  ["HMB", "سوهاج", "مصر", ["sohag"]],
  ["ATZ", "أسيوط", "مصر", ["اسيوط", "assiut"]],
  ["DXB", "دبي", "الإمارات", ["دبى", "dubai"]],
  ["DWC", "دبي وورلد سنترال", "الإمارات", ["آل مكتوم", "ال مكتوم"]],
  ["SHJ", "الشارقة", "الإمارات", ["الشارقه", "sharjah"]],
  ["AUH", "أبوظبي", "الإمارات", ["ابوظبي", "ابو ظبي", "abu dhabi"]],
  ["DOH", "الدوحة", "قطر", ["الدوحه", "قطر", "doha"]],
  ["KWI", "الكويت", "الكويت", ["kuwait"]],
  ["BAH", "البحرين", "البحرين", ["المنامة", "المنامه", "bahrain"]],
  ["MCT", "مسقط", "عُمان", ["عمان مسقط", "muscat"]],
  ["AMM", "عمّان", "الأردن", ["عمان", "الاردن", "الأردن", "amman"]],
  ["BEY", "بيروت", "لبنان", ["لبنان", "beirut"]],
  ["IST", "إسطنبول", "تركيا", ["اسطنبول", "استنبول", "تركيا", "istanbul"]],
  ["SAW", "إسطنبول صبيحة", "تركيا", ["صبيحة", "صبيحه"]],
  ["TZX", "طرابزون", "تركيا", ["trabzon"]],
  ["AYT", "أنطاليا", "تركيا", ["انطاليا", "antalya"]],
  ["CMN", "الدار البيضاء", "المغرب", ["كازابلانكا", "المغرب", "casablanca"]],
  ["RAK", "مراكش", "المغرب", ["marrakech"]],
  ["TUN", "تونس", "تونس", ["tunis"]],
  ["ALG", "الجزائر", "الجزائر", ["algiers"]],
  ["KRT", "الخرطوم", "السودان", ["السودان"]],
  ["PZU", "بورتسودان", "السودان", ["بورت سودان"]],
  ["ADE", "عدن", "اليمن", ["aden"]],
  ["BGW", "بغداد", "العراق", ["baghdad"]],
  ["LHR", "لندن هيثرو", "بريطانيا", ["لندن", "london"]],
  ["LGW", "لندن جاتويك", "بريطانيا", ["جاتويك"]],
  ["CDG", "باريس", "فرنسا", ["paris"]],
  ["FRA", "فرانكفورت", "ألمانيا", ["frankfurt"]],
  ["MUC", "ميونخ", "ألمانيا", ["munich"]],
  ["FCO", "روما", "إيطاليا", ["rome"]],
  ["MXP", "ميلانو", "إيطاليا", ["milan"]],
  ["GVA", "جنيف", "سويسرا", ["geneva"]],
  ["VIE", "فيينا", "النمسا", ["vienna"]],
  ["SZG", "سالزبورغ", "النمسا", ["سالزبورج"]],
  ["MAD", "مدريد", "إسبانيا", ["madrid"]],
  ["SVO", "موسكو", "روسيا", ["moscow"]],
  ["TBS", "تبليسي", "جورجيا", ["جورجيا", "tbilisi"]],
  ["GYD", "باكو", "أذربيجان", ["اذربيجان", "أذربيجان", "baku"]],
  ["SJJ", "سراييفو", "البوسنة", ["البوسنة", "البوسنه"]],
  ["JFK", "نيويورك", "أمريكا", ["new york"]],
  ["KUL", "كوالالمبور", "ماليزيا", ["ماليزيا", "كوالا لمبور", "kuala lumpur"]],
  ["BKK", "بانكوك", "تايلاند", ["تايلاند", "bangkok"]],
  ["HKT", "بوكيت", "تايلاند", ["phuket"]],
  ["CGK", "جاكرتا", "إندونيسيا", ["اندونيسيا", "إندونيسيا"]],
  ["DPS", "بالي", "إندونيسيا", ["bali"]],
  ["MLE", "المالديف", "المالديف", ["مالديف", "maldives"]],
  ["CMB", "كولومبو", "سريلانكا", ["سريلانكا"]],
  ["DEL", "دلهي", "الهند", ["نيودلهي", "الهند", "delhi"]],
  ["BOM", "مومباي", "الهند", ["بومباي", "mumbai"]],
  ["COK", "كوتشي", "الهند", ["كيرلا", "kochi"]],
  ["KHI", "كراتشي", "باكستان", ["karachi"]],
  ["LHE", "لاهور", "باكستان", ["lahore"]],
  ["ISB", "إسلام آباد", "باكستان", ["اسلام اباد", "باكستان"]],
  ["DAC", "دكا", "بنغلاديش", ["بنجلاديش", "بنغلاديش"]],
  ["MNL", "مانيلا", "الفلبين", ["الفلبين"]],
  ["NBO", "نيروبي", "كينيا", ["كينيا"]],
  ["ADD", "أديس أبابا", "إثيوبيا", ["اديس ابابا", "اثيوبيا"]],
  ["ZNZ", "زنجبار", "تنزانيا", []],
];

// كود الشركة: [الاسم, الموقع الرسمي, شنطة شحن 23كجم (ريال/اتجاه/شخص), اختيار مقعد (ريال/اتجاه/شخص)]
// الرسوم تقديرية للدرجة السياحية الأساسية. 0 = مشمول غالبًا في التذكرة.
// الشركات بتغيّر رسومها حسب الخط والموسم، فراجعها كل فترة.
export const AIRLINES = {
  SV: ["السعودية", "https://www.saudia.com/", 0, 0],
  XY: ["طيران ناس", "https://www.flynas.com/", 170, 45],
  F3: ["طيران أديل", "https://www.flyadeal.com/", 160, 40],
  RX: ["طيران الرياض", "https://www.riyadhair.com/", 0, 0],
  MS: ["مصر للطيران", "https://www.egyptair.com/", 0, 0],
  SM: ["إير كايرو", "https://www.aircairo.com/", 0, 30],
  NP: ["النيل للطيران", "https://www.nileair.com/", 0, 30],
  NE: ["نسما", "https://www.nesmaairlines.com/", 0, 30],
  EK: ["طيران الإمارات", "https://www.emirates.com/", 0, 0],
  FZ: ["فلاي دبي", "https://www.flydubai.com/", 150, 40],
  EY: ["الاتحاد", "https://www.etihad.com/", 0, 0],
  G9: ["العربية للطيران", "https://www.airarabia.com/", 150, 35],
  E5: ["العربية مصر", "https://www.airarabia.com/", 150, 35],
  QR: ["القطرية", "https://www.qatarairways.com/", 0, 0],
  GF: ["طيران الخليج", "https://www.gulfair.com/", 0, 0],
  KU: ["الكويتية", "https://www.kuwaitairways.com/", 0, 0],
  J9: ["طيران الجزيرة", "https://www.jazeeraairways.com/", 140, 35],
  WY: ["الطيران العماني", "https://www.omanair.com/", 0, 0],
  OV: ["السلام", "https://www.salamair.com/", 140, 35],
  RJ: ["الملكية الأردنية", "https://www.rj.com/", 0, 0],
  ME: ["طيران الشرق الأوسط", "https://www.mea.com.lb/", 0, 0],
  TK: ["التركية", "https://www.turkishairlines.com/", 0, 0],
  PC: ["بيغاسوس", "https://www.flypgs.com/", 160, 45],
  XQ: ["صن إكسبريس", "https://www.sunexpress.com/", 150, 40],
  AT: ["الملكية المغربية", "https://www.royalairmaroc.com/", 0, 0],
  TU: ["الخطوط التونسية", "https://www.tunisair.com/", 0, 0],
  AH: ["الخطوط الجزائرية", "https://airalgerie.dz/", 0, 0],
  BA: ["البريطانية", "https://www.britishairways.com/", 0, 0],
  LH: ["لوفتهانزا", "https://www.lufthansa.com/", 0, 0],
  AF: ["إير فرانس", "https://www.airfrance.com/", 0, 0],
  MH: ["الماليزية", "https://www.malaysiaairlines.com/", 0, 0],
  SQ: ["السنغافورية", "https://www.singaporeair.com/", 0, 0],
  ET: ["الإثيوبية", "https://www.ethiopianairlines.com/", 0, 0],
  PK: ["الباكستانية", "https://www.piac.com.pk/", 0, 0],
  AI: ["إير إنديا", "https://www.airindia.com/", 0, 0],
  "6E": ["إنديجو", "https://www.goindigo.in/", 0, 40],
};

export function airline(code) {
  const a = AIRLINES[code];
  if (!a) return { code, name: code, url: `https://www.google.com/search?q=${encodeURIComponent(code + " airline official site")}`, bag: 0, seat: 0, known: false };
  return { code, name: a[0], url: a[1], bag: a[2], seat: a[3], known: true };
}

// مطارات قريبة من بعض. ground = وصف الانتقال البري التقريبي، groundCost = تكلفة تقديرية بالريال للشخص.
export const ALTERNATES = {
  CAI: [{ code: "SPX", ground: "داخل القاهرة الكبرى", groundCost: 0 }],
  SPX: [{ code: "CAI", ground: "داخل القاهرة الكبرى", groundCost: 0 }],
  HBE: [{ code: "CAI", ground: "حوالي 3 ساعات بالعربية", groundCost: 60 }],
  DMM: [{ code: "HOF", ground: "حوالي ساعتين بالعربية أو القطار", groundCost: 80 }],
  HOF: [{ code: "DMM", ground: "حوالي ساعتين بالعربية أو القطار", groundCost: 80 }],
  JED: [
    { code: "TIF", ground: "حوالي ساعتين ونص بالعربية", groundCost: 100 },
    { code: "MED", ground: "حوالي 4 ساعات، أو قطار الحرمين", groundCost: 150 },
  ],
  MED: [
    { code: "JED", ground: "حوالي 4 ساعات، أو قطار الحرمين", groundCost: 150 },
    { code: "YNB", ground: "حوالي ساعتين ونص بالعربية", groundCost: 100 },
  ],
  TIF: [{ code: "JED", ground: "حوالي ساعتين ونص بالعربية", groundCost: 100 }],
  RUH: [{ code: "ELQ", ground: "حوالي 3 ساعات ونص بالعربية", groundCost: 150 }],
  DXB: [
    { code: "SHJ", ground: "حوالي 30–60 دقيقة", groundCost: 40 },
    { code: "AUH", ground: "حوالي ساعة ونص", groundCost: 80 },
    { code: "DWC", ground: "حوالي 45 دقيقة", groundCost: 50 },
  ],
  SHJ: [{ code: "DXB", ground: "حوالي 30–60 دقيقة", groundCost: 40 }],
  AUH: [{ code: "DXB", ground: "حوالي ساعة ونص", groundCost: 80 }],
  IST: [{ code: "SAW", ground: "حوالي ساعة ونص", groundCost: 60 }],
  SAW: [{ code: "IST", ground: "حوالي ساعة ونص", groundCost: 60 }],
  LHR: [{ code: "LGW", ground: "حوالي ساعة بالقطار", groundCost: 80 }],
  LGW: [{ code: "LHR", ground: "حوالي ساعة بالقطار", groundCost: 80 }],
};

const countryOf = code => (AIRPORTS.find(a => a[0] === code) || [])[2] || "";
// المطارات البديلة لازم تكون في نفس دولة المطار الأصلي (الرياض ← القصيم آه، الدمام ← البحرين لأ)
export function alternatesFor(code) {
  const c = countryOf(code);
  return (ALTERNATES[code] || []).filter(a => c && countryOf(a.code) === c);
}

// المواسم. التواريخ الهجرية تقديرية وممكن تتحرك يوم حسب رؤية الهلال.
// routes: لو موجودة، التحذير يظهر بس لو الوجهة أو المغادرة من المطارات دي.
export const SEASONS = [
  { name: "إجازة الخريف (مدارس السعودية)", from: "2026-11-20", to: "2026-11-28", why: "إجازة مدارس، الطلب على السفر بيزيد" },
  { name: "الكريسماس ورأس السنة", from: "2026-12-18", to: "2027-01-03", why: "ذروة سفر عالمية، خصوصًا أوروبا ودبي" },
  { name: "إجازة منتصف العام (مدارس السعودية)", from: "2027-01-08", to: "2027-01-16", why: "إجازة مدارس، الطلب على السفر بيزيد" },
  { name: "رمضان (تقديري)", from: "2027-02-08", to: "2027-02-27", why: "طلب عالي على العمرة", routes: ["JED", "MED", "TIF", "YNB"] },
  { name: "يوم التأسيس", from: "2027-02-19", to: "2027-02-22", why: "إجازة رسمية قصيرة، الرحلات بتتملي" },
  { name: "العشر الأواخر وإجازة عيد الفطر (تقديري)", from: "2027-02-26", to: "2027-03-13", why: "أعلى طلب في السنة على العمرة والسفر العائلي" },
  { name: "الحج وإجازة عيد الأضحى (تقديري)", from: "2027-05-07", to: "2027-05-22", why: "موسم الحج وإجازة العيد، رحلات جدة والمدينة محدودة وغالية" },
  { name: "الإجازة الصيفية (تقريبي)", from: "2027-06-10", to: "2027-08-31", why: "أطول ذروة سفر للعائلات في الخليج" },
];

export function seasonsFor(dateStr, origin, destination) {
  if (!dateStr) return [];
  return SEASONS.filter(s => dateStr >= s.from && dateStr <= s.to &&
    (!s.routes || s.routes.includes(origin) || s.routes.includes(destination)));
}

// ---- أدوات بحث في المطارات ----
export function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")       // تشكيل وتطويل
    .replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/\s+/g, " ").trim();
}

const _index = [];
for (const [code, name, country, aliases] of AIRPORTS) {
  for (const n of [name, ...aliases]) _index.push([norm(n), code]);
  _index.push([code.toLowerCase(), code]);
}
_index.sort((a, b) => b[0].length - a[0].length); // الأطول الأول عشان "شرم الشيخ" تتطابق قبل "شرم"
export const AIRPORT_INDEX = _index;

export function airportName(code) {
  const a = AIRPORTS.find(x => x[0] === code);
  return a ? a[1] : code;
}
export function findAirport(text) {
  const t = norm(text);
  if (/^[a-z]{3}$/.test(t)) return t.toUpperCase();
  const hit = _index.find(([n]) => n === t) || _index.find(([n]) => t.includes(n) && n.length > 2);
  return hit ? hit[1] : "";
}
