// «احجز دلوقتي ولا استنى؟» — تقدير بسيط وصريح، مش توقّع مضمون.
// بيعتمد على: مكان سعر يومك وسط أسعار نفس الشهر، وفاضل كام يوم على السفر، وتاريخ السعر لو الرحلة متراقبة.
const DAY = 86400000;
const toDay = s => Date.parse(String(s).slice(0, 10) + "T00:00:00Z") / DAY;

export function verdict({ depart, today, days = {}, history = [] }) {
  const t = toDay(today), d = toDay(depart);
  const daysLeft = Math.round(d - t);
  const month = Object.entries(days).filter(([k]) => toDay(k) >= t).map(([k, v]) => ({ day: k, price: v.price }));
  const prices = month.map(x => x.price).sort((a, b) => a - b);
  const mine = days[depart] ? days[depart].price : null;
  const reasons = [];
  let rank = null;
  if (mine != null && prices.length >= 5) {
    rank = prices.filter(p => p < mine).length / (prices.length - 1 || 1); // 0 = أرخص يوم، 1 = أغلى يوم
  }
  // أرخص يوم قريب (± 3 أيام)
  const near = month.filter(x => Math.abs(toDay(x.day) - d) <= 3 && x.day !== depart && x.day >= today)
    .sort((a, b) => a.price - b.price)[0];
  const cheaperNear = mine != null && near && near.price <= mine * 0.88 ? near : null;

  // اتجاه السعر لو الرحلة متراقبة
  let trend = null;
  if (history.length >= 3) {
    const last = history[history.length - 1].p, first = history[0].p, min = Math.min(...history.map(h => h.p));
    trend = { last, first, min, change: (last - first) / first };
  }

  let level = "neutral", title = "سعر عادي";
  if (daysLeft <= 14) {
    level = "buy"; title = "احجز دلوقتي";
    reasons.push(`فاضل ${daysLeft} يوم بس على السفر، والأسعار عادةً بتطلع في آخر أسبوعين.`);
  } else if (cheaperNear) {
    level = "move"; title = "غيّر اليوم ووفّر";
    reasons.push(`يوم ${near.day.slice(8)}/${near.day.slice(5, 7)} أرخص بحوالي ${Math.round(mine - near.price)} ريال للذهاب.`);
  } else if (rank != null && rank <= 0.25) {
    level = "buy"; title = "احجز دلوقتي";
    reasons.push("سعر يومك من أرخص ربع أيام الشهر.");
  } else if (rank != null && rank >= 0.7 && daysLeft > 30) {
    level = "wait"; title = "ممكن تستنى";
    reasons.push("سعر يومك من أغلى أيام الشهر، ولسه فاضل وقت.");
  } else if (rank != null) {
    reasons.push(`سعر يومك في النص وسط أيام الشهر (أرخص من ${Math.round((1 - rank) * 100)}٪ منها).`);
  }
  if (trend) {
    if (trend.change <= -0.05) reasons.push(`السعر نازل من ساعة ما بدأنا نراقبه (${Math.round(trend.first)} ← ${Math.round(trend.last)}).`);
    else if (trend.change >= 0.05) {
      reasons.push(`السعر طالع من ساعة ما بدأنا نراقبه (${Math.round(trend.first)} ← ${Math.round(trend.last)}).`);
      if (level === "wait" || level === "neutral") { level = "buy"; title = "احجز قبل ما يغلى أكتر"; }
    }
  }
  if (daysLeft > 60 && level === "neutral") reasons.push("لسه بدري، فعّل التنبيه وهنقولك لو نزل.");
  if (!reasons.length) reasons.push("مفيش بيانات كفاية نقارن بيها، فعّل التنبيه وهنتابعه لك.");
  return { level, title, reasons, daysLeft, rank, cheaperNear: cheaperNear ? cheaperNear.day : null };
}

// تشفير الرحلة في رابط تيليجرام (حروف وأرقام بس، أقل من 64 حرف)
export function encodeTrip({ origin, destination, depart, ret, adults }) {
  const ymd = s => s ? s.slice(2).replace(/-/g, "") : "000000";
  return `${origin}${destination}${ymd(depart)}${ymd(ret)}${Math.min(9, adults || 1)}`;
}
export function decodeTrip(s) {
  const m = /^([A-Z]{3})([A-Z]{3})(\d{6})(\d{6})([1-9])$/.exec(String(s || ""));
  if (!m) return null;
  const d = x => x === "000000" ? "" : `20${x.slice(0, 2)}-${x.slice(2, 4)}-${x.slice(4, 6)}`;
  return { origin: m[1], destination: m[2], depart: d(m[3]), ret: d(m[4]), adults: +m[5] };
}
