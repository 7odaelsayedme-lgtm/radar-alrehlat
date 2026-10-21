// خادم الأسعار على Netlify: نفس كود Cloudflare Worker بالظبط، ملفوف كدالة Netlify.
// المفتاح بيتقري من متغيرات البيئة في Netlify (TP_TOKEN و TP_MARKER)، مش من الكود.
import worker from "../../worker/src/index.js";

export default async (req, context) => {
  const env = {
    TP_TOKEN: Netlify.env.get("TP_TOKEN"),
    TP_MARKER: Netlify.env.get("TP_MARKER"),
    ALLOWED_ORIGIN: Netlify.env.get("ALLOWED_ORIGIN") || "*",
  };
  return worker.fetch(req, env, { waitUntil: p => context.waitUntil ? context.waitUntil(p) : p });
};

export const config = { path: "/api/*" };
