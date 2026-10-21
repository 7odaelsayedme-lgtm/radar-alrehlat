// بيشيّك على كل التنبيهات مرتين في اليوم: 8 الصبح و 6 المغرب بتوقيت السعودية (5 و 15 UTC).
import { checkAll } from "../../server/bot.js";

export default async () => {
  const env = {
    TP_TOKEN: Netlify.env.get("TP_TOKEN"), TP_MARKER: Netlify.env.get("TP_MARKER"),
    TG_TOKEN: Netlify.env.get("TG_TOKEN"),
  };
  if (!env.TG_TOKEN) return;
  const r = await checkAll(env);
  console.log("watch-check", JSON.stringify(r));
};

export const config = { schedule: "0 5,15 * * *" };
