// مخزن التنبيهات: Netlify Blobs على السيرفر، ومخزن في الذاكرة للاختبار المحلي.
export async function watchStore() {
  if (globalThis.__memStore) return globalThis.__memStore;
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: "watches", consistency: "strong" });
}

export function memStore() {
  const m = new Map();
  return {
    async get(k, o) { const v = m.get(k); return v == null ? null : o && o.type === "json" ? JSON.parse(v) : v; },
    async setJSON(k, v) { m.set(k, JSON.stringify(v)); return { modified: true }; },
    async delete(k) { m.delete(k); },
    async list({ prefix = "" } = {}) { return { blobs: [...m.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }; },
  };
}
