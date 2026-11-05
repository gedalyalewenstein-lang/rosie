// גיבוי לילי: כל המסד (רוזי, כל המסעדות, משתמשים והגדרות) לקובץ אחד מוצפן. רץ ב-GitHub Actions (backup.yml)
// המאגר החי ציבורי — לכן הקובץ תמיד מוצפן ב-BACKUP_KEY, ובלי המפתח אי אפשר לקרוא אותו
import fs from "node:fs";
import { exportAll, pack, needKey, countsOf, unpack, drill } from "./backup-lib.mjs";

const KEY = (() => { try { return needKey(process.env.BACKUP_KEY); } catch (e) { console.error("✗", e.message); process.exit(2); } })();
const OUT = process.argv[2] || "mizo-backup.enc";
const { default: admin } = await import("firebase-admin");
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const dump = await exportAll(admin.firestore());
// חשבונות התחברות: רק מזהה, שם משתמש ומצב (בלי סיסמאות). הסיסמאות נשארות ב-Firebase
dump.auth = [];
let tok;
do { const r = await admin.auth().listUsers(1000, tok); r.users.forEach((u) => dump.auth.push({ uid: u.uid, email: u.email || null, disabled: !!u.disabled, created: u.metadata && u.metadata.creationTime || null })); tok = r.pageToken; } while (tok);
const buf = pack(dump, KEY);
fs.writeFileSync(OUT, buf);
// בדיקה מיידית: הקובץ נפתח עם המפתח, ותרגיל שחזור בזיכרון מחזיר בדיוק את אותם מסמכים
const back = unpack(fs.readFileSync(OUT), KEY), d = await drill(back);
console.log("backup", dump.n, "docs,", dump.auth.length, "accounts,", Math.round(buf.length / 1024), "KB");
console.log(JSON.stringify(countsOf(dump.docs)));
if (!d.ok) { console.error("✗ תרגיל שחזור נכשל", JSON.stringify(d)); process.exit(1); }
console.log("DRILL OK", d.n);
