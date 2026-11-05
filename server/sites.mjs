// רשימת המסעדות לשרת ההתראות (notify.yml): רוזי וג'קו תמיד, ועוד כל מסעדה מ-siteRegistry.
// כותב list=[...] ל-GITHUB_OUTPUT. בכל תקלה — חוזר לרשימה הקבועה, כדי שההתראות של רוזי וג'קו לא ייעצרו
import fs from "node:fs";
const BASE = ["rosie", "jaco"];
let list = BASE.slice();
try {
  const { default: admin } = await import("firebase-admin");
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  const docs = (await admin.firestore().collection("siteRegistry").get()).docs;
  for (const d of docs) if (/^[a-z][a-z0-9-]{1,19}$/.test(d.id) && !list.includes(d.id) && (d.data() || {}).active !== false) list.push(d.id);
} catch (e) { console.error("registry read failed, using", BASE.join(",")); }
const out = "list=" + JSON.stringify(list.slice(0, 50));
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, out + "\n");
console.log(out);
process.exit(0);
