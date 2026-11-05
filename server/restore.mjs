// שחזור מגיבוי מוצפן. ברירת מחדל: רק מראה מה ישוחזר (כלום לא נכתב)
//   node restore.mjs mizo-backup.enc                       ← תוכנית לכל המסד
//   node restore.mjs mizo-backup.enc --site jaco           ← רק מסעדה אחת
//   node restore.mjs mizo-backup.enc --site jaco --as test ← לתוך מסעדה אחרת (תרגיל, בלי לגעת בנתונים האמיתיים)
//   node restore.mjs mizo-backup.enc --drill               ← תרגיל שחזור מלא בזיכרון
//   כתיבה באמת: --apply, וגם RESTORE_CONFIRM=<project_id של היעד>. היעד: FIREBASE_SERVICE_ACCOUNT_TARGET (או FIREBASE_SERVICE_ACCOUNT)
// השחזור דורס מסמכים שבגיבוי ולא מוחק מסמכים אחרים. מסעדה אחת = הנתונים + העובדים שלה (users) + siteRegistry שלה.
// חשבונות התחברות (Firebase Auth, עם הסיסמאות) לא בגיבוי — הם נשארים ב-Firebase. מעבר לפרויקט אחר: migrate.mjs (מעתיק גם חשבונות)
// ריצה חוזרת אחרי תקלה בטוחה: מסמך שכבר זהה ביעד מדולג
import fs from "node:fs";
import { unpack, restoreInto, drill } from "./backup-lib.mjs";

const a = process.argv.slice(2), opt = (n) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : undefined; };
const file = a[0], site = opt("--site"), as = opt("--as"), apply = a.includes("--apply");
if (!file || !fs.existsSync(file)) { console.error("✗ חסר קובץ גיבוי"); process.exit(2); }
let dump;
try { dump = unpack(fs.readFileSync(file), process.env.BACKUP_KEY); } catch (e) { console.error("✗", e.message); process.exit(2); }
console.log("backup from", dump.at, "·", dump.n, "docs");
if (a.includes("--drill")) { const d = await drill(dump); console.log(d.ok ? "DRILL OK" : "DRILL FAIL", d.n); process.exit(d.ok ? 0 : 1); }
let db = null, types = {};
if (apply) {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_TARGET || process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
  if (!sa.project_id || process.env.RESTORE_CONFIRM !== sa.project_id) { console.error("✗ לכתיבה צריך RESTORE_CONFIRM = שם הפרויקט של היעד"); process.exit(2); }
  const { default: admin } = await import("firebase-admin");
  admin.initializeApp({ credential: admin.credential.cert(sa) });
  db = admin.firestore();
  types = { Timestamp: admin.firestore.Timestamp, GeoPoint: admin.firestore.GeoPoint, ref: (p) => db.doc(p) };
}
const r = await restoreInto(db, dump, { site, as, apply, types });
console.log(JSON.stringify(r.counts));
console.log(apply ? `RESTORED ${r.written + r.skipped}/${r.total} → ${as || site || "all"} (written ${r.written}, already same ${r.skipped}, batches ${r.batches})` : `DRY RUN ${r.total} docs (nothing written; add --apply)`);
