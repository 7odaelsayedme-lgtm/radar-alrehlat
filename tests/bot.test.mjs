// شغّل: node tests/bot.test.mjs  (من غير نت: أسعار تجريبية ومخزن في الذاكرة وتيليجرام وهمي)
import { memStore } from "../server/store.js";
globalThis.__memStore = memStore();
const { handleUpdate, checkAll } = await import("../server/bot.js");
const { encodeTrip, decodeTrip, verdict } = await import("../web/js/verdict.js");

const log = []; const env = { __tgLog: log };
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("✗", m); } };

const q = { origin: "RUH", destination: "CAI", depart: "2027-01-10", ret: "2027-01-17", adults: 2 };
ok(JSON.stringify(decodeTrip(encodeTrip(q))) === JSON.stringify(q), "encode/decode");
ok(encodeTrip(q).length <= 64 && /^[A-Za-z0-9_-]+$/.test(encodeTrip(q)), "payload safe");

await handleUpdate(env, { message: { chat: { id: 7 }, text: "/start" } });
ok(log.at(-1).body.text.includes("رادار الرحلات"), "welcome");

await handleUpdate(env, { message: { chat: { id: 7 }, text: "من جدة للقاهرة يوم 20 ديسمبر لمدة أسبوع" } });
const msg = log.at(-1).body;
ok(msg.text.includes("JED → CAI") && msg.text.includes("رأي الرادار"), "search reply: " + msg.text.slice(0, 80));
const watchBtn = msg.reply_markup.inline_keyboard.flat().find(b => b.callback_data && b.callback_data.startsWith("w:"));
ok(!!watchBtn, "watch button");

await handleUpdate(env, { callback_query: { id: "c1", data: watchBtn.callback_data, message: { chat: { id: 7 } } } });
ok(log.some(l => l.method === "answerCallbackQuery"), "callback answered");
await handleUpdate(env, { message: { chat: { id: 7 }, text: "/alerts" } });
ok(log.at(-1).body.text.includes("JED → CAI"), "alerts list");

// نخلي السعر المرجعي أعلى عشان نختبر تنبيه النزول
const s = globalThis.__memStore, { blobs } = await s.list({ prefix: "w/7/" });
const w = await s.get(blobs[0].key, { type: "json" }); w.ref = w.lastPrice + 500; await s.setJSON(blobs[0].key, w);
const r = await checkAll(env);
ok(r.alerts === 1 && log.at(-1).body.text.includes("السعر نزل"), "drop alert " + JSON.stringify(r));

await handleUpdate(env, { message: { chat: { id: 7 }, text: "/stop_" + blobs[0].key.split("/")[2] } });
ok((await s.list({ prefix: "w/7/" })).blobs.length === 0, "stop");

await handleUpdate(env, { message: { chat: { id: 7 }, text: "ازيك" } });
ok(log.at(-1).body.text.includes("مش لاقي الوجهة"), "no destination");

const v1 = verdict({ depart: "2026-10-30", today: "2026-10-21", days: {} });
ok(v1.level === "buy", "close departure → buy");
const days = {}; for (let d = 1; d <= 30; d++) days[`2027-02-${String(d).padStart(2, "0")}`] = { price: 500 + d * 10 };
ok(verdict({ depart: "2027-02-02", today: "2026-10-21", days }).level === "buy", "cheap day → buy");
ok(verdict({ depart: "2027-02-28", today: "2026-10-21", days }).level === "wait", "expensive day far → wait");
days["2027-02-27"] = { price: 300 };
ok(verdict({ depart: "2027-02-28", today: "2026-10-21", days }).level === "move", "cheaper nearby → move");

console.log(fails ? `${fails} failed` : "bot: all passed");
process.exit(fails ? 1 : 0);
