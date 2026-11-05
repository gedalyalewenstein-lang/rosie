// גיבוי ושחזור של כל המסד: ייצוא, הצפנה, פענוח ושחזור. בלי תלות ב-Firebase (מקבל את המסד מבחוץ), כדי שאפשר לבדוק בלי רשת
import zlib from "node:zlib";
import crypto from "node:crypto";

// אוספים כלליים (לא של מסעדה אחת). רוזי = כל השאר בשורש, מסעדה אחרת = sites/<מפתח>/...
export const GLOBAL = ["users", "deletions", "group", "broadcasts", "feedback", "errors", "waitlist", "siteRegistry", "pwReset"];

// סוגי Firestore שלא עוברים JSON כמו שהם: תאריך שרת, נקודה, הפניה, בייטים
export function enc(v) {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(enc);
  if (typeof v.toMillis === "function" && typeof v.seconds === "number") return { __mz: "ts", s: v.seconds, n: v.nanoseconds || 0 };
  if (typeof v.latitude === "number" && typeof v.longitude === "number" && Object.keys(v).length <= 2) return { __mz: "geo", lat: v.latitude, lng: v.longitude };
  if (v.firestore && typeof v.path === "string" && typeof v.collection === "function") return { __mz: "ref", p: v.path };
  if (v instanceof Uint8Array) return { __mz: "bytes", b: Buffer.from(v).toString("base64") };
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)]));
}
export function dec(v, T = {}) {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map((x) => dec(x, T));
  if (T.keep && v.__mz) return v;
  if (v.__mz === "ts") return T.Timestamp ? new T.Timestamp(v.s, v.n) : v;
  if (v.__mz === "geo") return T.GeoPoint ? new T.GeoPoint(v.lat, v.lng) : v;
  if (v.__mz === "ref") return T.ref ? T.ref(v.p) : v;
  if (v.__mz === "bytes") return Buffer.from(v.b, "base64");
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, dec(x, T)]));
}

// ייצוא: כל האוספים, כולל תת-אוספים ומסמכים "ריקים" שיש להם תת-אוספים (כמו sites/jaco)
export async function exportAll(db) {
  const docs = {};
  async function walk(col) {
    const snap = await col.get(), seen = new Set();
    for (const d of snap.docs) { docs[d.ref.path] = enc(d.data()); seen.add(d.ref.path); }
    const refs = typeof col.listDocuments === "function" ? await col.listDocuments() : snap.docs.map((d) => d.ref);
    for (const r of refs) for (const sub of await r.listCollections()) await walk(sub);
  }
  for (const col of await db.listCollections()) await walk(col);
  return { v: 1, at: new Date().toISOString(), n: Object.keys(docs).length, docs };
}

// סיכום לפי אוסף (למסך ולבדיקה) — רק מספרים, בלי תוכן
export function countsOf(docs) {
  const c = {};
  for (const p of Object.keys(docs)) { const s = p.split("/"); const k = s[0] === "sites" && s.length > 3 ? `sites/${s[1]}/${s[2]}` : s[0]; c[k] = (c[k] || 0) + 1; }
  return c;
}

// הצפנה: gzip ואז AES-256-GCM. המפתח נגזר מ-BACKUP_KEY (scrypt חזק N=2^17 עם salt אקראי לכל קובץ)
// BACKUP_KEY = מפתח אקראי: לפחות 32 תווים ולפחות 12 תווים שונים (למשל openssl rand -base64 32, או מחולל סיסמאות)
const MAGIC = Buffer.from("MZB2"), MAGIC1 = Buffer.from("MZB1");
const KDF = { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
export function needKey(k) {
  const v = String(k || "");
  if (v.length < 32 || new Set(v).size < 12) throw new Error("BACKUP_KEY חסר, קצר מ-32 תווים או לא אקראי — הגיבוי לא נוצר. ליצור מפתח אקראי (docs/migration.md) ולשמור כסוד BACKUP_KEY ב-GitHub");
  return v;
}
export function pack(obj, pass) {
  needKey(pass);
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12), key = crypto.scryptSync(pass, salt, 32, KDF);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(zlib.gzipSync(Buffer.from(JSON.stringify(obj)))), c.final()]);
  return Buffer.concat([MAGIC, salt, iv, c.getAuthTag(), ct]);
}
export function unpack(buf, pass) {
  needKey(pass);
  const v2 = Buffer.isBuffer(buf) && buf.subarray(0, 4).equals(MAGIC), v1 = Buffer.isBuffer(buf) && buf.subarray(0, 4).equals(MAGIC1);
  if (!Buffer.isBuffer(buf) || buf.length < 48 || !(v1 || v2)) throw new Error("זה לא קובץ גיבוי של מיזו");
  const salt = buf.subarray(4, 20), iv = buf.subarray(20, 32), tag = buf.subarray(32, 48), key = v2 ? crypto.scryptSync(pass, salt, 32, KDF) : crypto.scryptSync(pass, salt, 32);
  const d = crypto.createDecipheriv("aes-256-gcm", key, iv); d.setAuthTag(tag);
  let raw; try { raw = Buffer.concat([d.update(buf.subarray(48)), d.final()]); } catch (e) { throw new Error("מפתח שגוי או קובץ פגום"); }
  return JSON.parse(zlib.gunzipSync(raw).toString("utf8"));
}

// עובד שייך למסעדה: רוזי = role פעיל, אחרת = sites.<מפתח>
const ACTIVE = ["rosie", "prod", "admin", "fmgr", "pending"];
export const userOf = (d, site) => !!d && (site === "rosie" ? ACTIVE.includes(d.role) : !!(d.sites && d.sites[site]));
// אילו מסמכים נכנסים לשחזור: הכול (כולל users, siteRegistry ו-settings/app של השורש), או מסעדה אחת.
// מסעדה אחת = הנתונים שלה + העובדים שלה (users) + השורה שלה ב-siteRegistry. as = לתוך מסעדה אחרת (תרגיל) — אז בלי עובדים ובלי רשימה, כדי לא לדרוס חשבונות אמיתיים
export function pick(docs, site, as) {
  const out = {};
  for (const [p, d] of Object.entries(docs)) {
    const s = p.split("/");
    let rel = null;
    if (site && !as && s.length === 2 && ((s[0] === "users" && userOf(d, site)) || (s[0] === "siteRegistry" && s[1] === site))) { out[p] = d; continue; }
    if (!site) rel = p;
    else if (site === "rosie") { if (s[0] !== "sites" && !GLOBAL.includes(s[0])) rel = p; }
    else if (s[0] === "sites" && s[1] === site && s.length > 2) rel = s.slice(2).join("/");
    if (rel == null) continue;
    const target = !site ? p : as ? (as === "rosie" ? rel : `sites/${as}/${rel}`) : site === "rosie" ? rel : `sites/${site}/${rel}`;
    out[target] = d;
  }
  return out;
}

// שחזור: ברירת מחדל = רק תוכנית (כמה מסמכים לכל אוסף). apply = כותב (דורס את המסמכים שבגיבוי, לא מוחק אחרים)
// כתיבה בחבילות של עד 200 מסמכים ועד 8MB (תמונות קבלות נמצאות בתוך המסמכים). אפשר להריץ שוב אחרי תקלה: מסמך שכבר זהה ביעד מדולג
export const MAX_DOCS = 200, MAX_BYTES = 8 * 1024 * 1024;
export function chunks(paths, docs, maxDocs = MAX_DOCS, maxBytes = MAX_BYTES) {
  const out = []; let cur = [], size = 0;
  for (const p of paths) {
    const z = Buffer.byteLength(JSON.stringify(docs[p])) + p.length + 64;
    if (cur.length && (cur.length >= maxDocs || size + z > maxBytes)) { out.push(cur); cur = []; size = 0; }
    cur.push(p); size += z;
  }
  if (cur.length) out.push(cur);
  return out;
}
export async function restoreInto(db, dump, { site, as, apply = false, types = {}, maxDocs, maxBytes } = {}) {
  if (!dump || dump.v !== 1 || !dump.docs) throw new Error("קובץ גיבוי לא תקין");
  if (site && !/^[a-z][a-z0-9-]{1,19}$/.test(site)) throw new Error("מסעדה לא תקינה");
  if (as && !/^[a-z][a-z0-9-]{1,19}$/.test(as)) throw new Error("יעד לא תקין");
  const docs = pick(dump.docs, site, as), paths = Object.keys(docs);
  const plan = { total: paths.length, counts: countsOf(docs), written: 0, skipped: 0, batches: 0, apply: !!apply };
  if (!apply) return plan;
  const same = (x, p) => JSON.stringify(enc(x)) === JSON.stringify(JSON.parse(JSON.stringify(docs[p])));
  for (const part of chunks(paths, docs, maxDocs, maxBytes)) {
    const cur = await Promise.all(part.map(async (p) => { const g = await db.doc(p).get(); return g.exists ? g.data() : undefined; }));
    const todo = part.filter((p, i) => cur[i] === undefined || !same(cur[i], p));
    plan.skipped += part.length - todo.length;
    if (!todo.length) continue;
    const b = db.batch();
    for (const p of todo) b.set(db.doc(p), dec(docs[p], types));
    await b.commit(); plan.written += todo.length; plan.batches++;
  }
  return plan;
}

// מסד בזיכרון: לבדיקות ולתרגיל השחזור הלילי (משחזרים לתוכו, מייצאים שוב ומשווים)
export class MemDB {
  constructor(init = {}) { this.m = new Map(Object.entries(init)); }
  _docRef(path) {
    const self = this;
    return { path, id: path.split("/").pop(), firestore: self, collection: (n) => self._colRef(path + "/" + n),
      async get() { return { exists: self.m.has(path), data: () => self.m.get(path) }; },
      async set(d) { self.m.set(path, JSON.parse(JSON.stringify(d))); },
      async listCollections() { return self._subs(path + "/").map((n) => self._colRef(path + "/" + n)); } };
  }
  _subs(prefix) { const s = new Set(); for (const p of this.m.keys()) if (p.startsWith(prefix)) { const r = p.slice(prefix.length).split("/"); if (r.length >= 2) s.add(r[0]); } return [...s]; }
  _colRef(path) {
    const self = this, depth = path.split("/").length + 1;
    const ids = () => { const s = new Set(); for (const p of self.m.keys()) if (p.startsWith(path + "/")) s.add(p.slice(path.length + 1).split("/")[0]); return [...s]; };
    return { path, id: path.split("/").pop(), doc: (id) => self._docRef(path + "/" + id),
      async get() { return { docs: ids().filter((id) => self.m.has(path + "/" + id)).map((id) => ({ id, ref: self._docRef(path + "/" + id), data: () => self.m.get(path + "/" + id) })) }; },
      async listDocuments() { return ids().map((id) => self._docRef(path + "/" + id)); }, depth };
  }
  collection(n) { return this._colRef(n); }
  doc(p) { return this._docRef(p); }
  async listCollections() { const s = new Set(); for (const p of this.m.keys()) s.add(p.split("/")[0]); return [...s].map((n) => this._colRef(n)); }
  batch() { const ops = []; return { set: (ref, d) => ops.push([ref.path, d]), commit: async () => { for (const [p, d] of ops) this.m.set(p, JSON.parse(JSON.stringify(d))); } }; }
}

// תרגיל שחזור: משחזרים את הגיבוי למסד בזיכרון, מייצאים שוב ובודקים שכל מסמך זהה
export async function drill(dump) {
  const mem = new MemDB();
  const r = await restoreInto(mem, dump, { apply: true, types: { keep: true } });
  const back = await exportAll(mem);
  const same = back.n === dump.n && Object.keys(dump.docs).every((p) => JSON.stringify(back.docs[p]) === JSON.stringify(JSON.parse(JSON.stringify(dump.docs[p]))));
  return { ok: same && r.written === dump.n, n: dump.n, written: r.written };
}
