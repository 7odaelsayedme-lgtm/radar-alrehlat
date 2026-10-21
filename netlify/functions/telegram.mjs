// بوت تيليجرام: /tg/webhook بيستقبل الرسايل، و /tg/setup بيربط البوت بالموقع مرة واحدة.
import { handleUpdate, tg, SITE } from "../../server/bot.js";

const env = () => ({
  TP_TOKEN: Netlify.env.get("TP_TOKEN"), TP_MARKER: Netlify.env.get("TP_MARKER"),
  TG_TOKEN: Netlify.env.get("TG_TOKEN"), TG_SECRET: Netlify.env.get("TG_SECRET"),
});

export default async (req) => {
  const e = env(), url = new URL(req.url);
  if (!e.TG_TOKEN || !e.TG_SECRET) return new Response("bot not configured", { status: 503 });
  if (url.pathname === "/tg/setup") {
    if (url.searchParams.get("key") !== e.TG_SECRET) return new Response("forbidden", { status: 403 });
    const hook = await tg(e, "setWebhook", { url: `${SITE}/tg/webhook`, secret_token: e.TG_SECRET, allowed_updates: ["message", "callback_query"], drop_pending_updates: true });
    const cmds = await tg(e, "setMyCommands", { commands: [
      { command: "alerts", description: "تنبيهاتك الشغالة" },
      { command: "help", description: "إزاي تستخدم البوت" },
    ] });
    const desc = await tg(e, "setMyDescription", { description: "اكتب رحلتك بالكلام، وأنا أجيبلك أرخص الرحلات وأقولك تحجز دلوقتي ولا تستنى، وأنبّهك لو السعر نزل." });
    const me = await tg(e, "getMe", {});
    return Response.json({ hook, cmds, desc, me: me.result && me.result.username });
  }
  if (req.method !== "POST") return new Response("ok");
  if (req.headers.get("x-telegram-bot-api-secret-token") !== e.TG_SECRET) return new Response("forbidden", { status: 403 });
  try { await handleUpdate(e, await req.json()); }
  catch (err) { console.error("bot error", err); }
  return new Response("ok");
};

export const config = { path: ["/tg/webhook", "/tg/setup"] };
