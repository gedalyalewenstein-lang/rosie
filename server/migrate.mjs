// מעבר מהפרויקט הישן (rosie-orders-b7ea5) לפרויקט החדש של מיזו (mizo-db6f7): כל הנתונים + חשבונות הכניסה עם אותן סיסמאות
// ברירת מחדל: רק תוכנית (סופר מה יועתק, כלום לא נכתב). כתיבה: --apply, וגם MIGRATE_CONFIRM=<project_id של היעד>
//   FIREBASE_SERVICE_ACCOUNT       ← המקור (הפרויקט הישן)
//   FIREBASE_SERVICE_ACCOUNT_MIZO  ← היעד (הפרויקט החדש)
//   OLD_HASH_KEY, OLD_SALT_SEPARATOR, OLD_ROUNDS, OLD_MEM_COST ← "Password hash parameters" של הפרויקט הישן (Authentication → Users → ⋮)
//   MIZO_VAPID (לא חובה) ← המפתח הציבורי של Web Push בפרויקט החדש
// היעד חייב להיות ריק (אחרת עוצר), כדי שלא נדרוס נתונים בטעות. אותם מזהי משתמשים (uid) — כך users/<uid> ממשיך להתאים לחשבון
import { exportAll, restoreInto, countsOf } from "./backup-lib.mjs";

// מה משתנה בדרך: מכשירי התראות של הפרויקט הישן לא עובדים בחדש (כל טלפון נרשם מחדש כשנכנס), ומפתח ה-Web Push מתחלף
export function transform(docs, { vapid } = {}) {
  const out = {};
  for (const [p, d] of Object.entries(docs)) {
    let x = d;
    if (/^users\/[^/]+$/.test(p) && x && "push" in x) { x = Object.assign({}, x); delete x.push; }
    if (p === "settings/app" && x) { x = Object.assign({}, x); if (vapid) x.vapid = vapid; else delete x.vapid; }
    out[p] = x;
  }
  return out;
}

// נתונים: מייצא הכול מהמקור, בודק שהיעד ריק, ומעתיק (אותם נתיבים, אותם תאריכי שרת)
export async function migrateData(src, dst, { apply = false, vapid, types = {} } = {}) {
  const dump = await exportAll(src);
  dump.docs = transform(dump.docs, { vapid });
  const existing = (await dst.listCollections()).length;
  const plan = { total: dump.n, counts: countsOf(dump.docs), targetEmpty: existing === 0, written: 0 };
  if (!apply) return plan;
  if (existing) throw new Error("היעד לא ריק — עצרתי בלי לכתוב. מעבר רק לפרויקט ריק");
  const r = await restoreInto(dst, dump, { apply: true, types });
  plan.written = r.written;
  // בדיקה: כל מסמך הגיע
  const back = await exportAll(dst);
  plan.verified = back.n === dump.n && Object.keys(dump.docs).every((p) => p in back.docs);
  return plan;
}

// חשבונות כניסה: אותו uid, אותו אימייל פנימי (@rosie.kitchen) ואותה סיסמה (העתקת ה-hash, לא הסיסמה עצמה)
export function hashConfig(env) {
  const need = ["OLD_HASH_KEY", "OLD_SALT_SEPARATOR", "OLD_ROUNDS", "OLD_MEM_COST"].filter((k) => !env[k] && env[k] !== "");
  if (need.length) throw new Error("חסרים פרמטרי hash של הפרויקט הישן: " + need.join(", "));
  return { algorithm: "SCRYPT", key: Buffer.from(env.OLD_HASH_KEY, "base64"), saltSeparator: Buffer.from(env.OLD_SALT_SEPARATOR, "base64"), rounds: +env.OLD_ROUNDS, memoryCost: +env.OLD_MEM_COST };
}
export async function listAll(auth) {
  const all = []; let tok;
  do { const r = await auth.listUsers(1000, tok); all.push(...r.users); tok = r.pageToken; } while (tok);
  return all;
}
export async function migrateAuth(srcAuth, dstAuth, { apply = false, hash } = {}) {
  const users = await listAll(srcAuth);
  const recs = users.map((u) => {
    const r = { uid: u.uid, email: u.email, emailVerified: !!u.emailVerified, disabled: !!u.disabled };
    if (u.displayName) r.displayName = u.displayName;
    if (u.passwordHash) { r.passwordHash = Buffer.from(u.passwordHash, "base64"); r.passwordSalt = Buffer.from(u.passwordSalt || "", "base64"); }
    if (u.metadata) r.metadata = { creationTime: u.metadata.creationTime, lastSignInTime: u.metadata.lastSignInTime };
    return r;
  });
  const plan = { accounts: recs.length, noPassword: recs.filter((r) => !r.passwordHash).length, imported: 0, errors: [] };
  if (!apply) return plan;
  if ((await dstAuth.listUsers(1)).users.length) throw new Error("ביעד כבר יש חשבונות — עצרתי בלי לכתוב");
  for (let i = 0; i < recs.length; i += 1000) {
    const r = await dstAuth.importUsers(recs.slice(i, i + 1000), { hash });
    plan.imported += r.successCount;
    (r.errors || []).forEach((e) => plan.errors.push({ index: i + e.index, uid: recs[i + e.index].uid, msg: String(e.error && e.error.message || e.error).slice(0, 120) }));
  }
  return plan;
}

// הרצה מהשורה (GitHub Actions: migrate.yml)
if (import.meta.url === `file://${process.argv[1]}`) {
  const apply = process.argv.includes("--apply");
  const parse = (n) => { try { return JSON.parse(process.env[n] || ""); } catch (e) { console.error("✗ חסר או לא תקין:", n); process.exit(2); } };
  const sa = parse("FIREBASE_SERVICE_ACCOUNT"), sb = parse("FIREBASE_SERVICE_ACCOUNT_MIZO");
  if (sa.project_id === sb.project_id) { console.error("✗ המקור והיעד הם אותו פרויקט"); process.exit(2); }
  if (apply && process.env.MIGRATE_CONFIRM !== sb.project_id) { console.error("✗ לכתיבה צריך MIGRATE_CONFIRM = " + "שם הפרויקט של היעד"); process.exit(2); }
  let hash = null;
  try { hash = hashConfig(process.env); } catch (e) { if (apply) { console.error("✗", e.message); process.exit(2); } console.log("!", e.message, "(בתוכנית בלבד זה בסדר)"); }
  const { default: admin } = await import("firebase-admin");
  const A = admin.initializeApp({ credential: admin.credential.cert(sa) }, "old"), B = admin.initializeApp({ credential: admin.credential.cert(sb) }, "new");
  const dst = B.firestore();
  const types = { Timestamp: admin.firestore.Timestamp, GeoPoint: admin.firestore.GeoPoint, ref: (p) => dst.doc(p) };
  console.log(`from ${sa.project_id} → ${sb.project_id} · ${apply ? "APPLY" : "DRY RUN"}`);
  // לפני כל כתיבה: גם המסד וגם החשבונות ביעד ריקים (אחרת עוצרים ולא כותבים כלום)
  if (apply && ((await dst.listCollections()).length || (await B.auth().listUsers(1)).users.length)) { console.error("✗ היעד לא ריק — לא נכתב כלום"); process.exit(2); }
  const au = await migrateAuth(A.auth(), B.auth(), { apply, hash });
  console.log("accounts", JSON.stringify(au));
  const da = await migrateData(A.firestore(), dst, { apply, vapid: process.env.MIZO_VAPID || "", types });
  console.log(JSON.stringify(da.counts));
  console.log(apply ? `MIGRATED ${da.written}/${da.total} docs · verified=${da.verified} · accounts ${au.imported}/${au.accounts}` : `DRY RUN ${da.total} docs, ${au.accounts} accounts (nothing written; add --apply)`);
  if (apply && (!da.verified || au.errors.length || au.imported !== au.accounts)) process.exit(1);
}
