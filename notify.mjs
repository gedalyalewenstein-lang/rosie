// שרת התראות קטן: רץ כל 5 דקות ב-GitHub Actions (חינם), בודק את Firebase ושולח התראות לטלפונים.
import admin from "firebase-admin";

const APP_URL = process.env.APP_URL || "https://gedalyalewenstein-lang.github.io/rosie/";
const TZ = "Asia/Jerusalem", CUTOFF = 16, REMIND = 15;
const DN = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore(), fcm = admin.messaging();

// זמן ישראל
const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map((x) => [x.type, x.value]));
const pad = (n) => String(n).padStart(2, "0");
const keyOf = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const today = new Date(Date.UTC(+p.year, +p.month - 1, +p.day)), hour = +p.hour;
const todayKey = keyOf(today), tomorrow = new Date(today.getTime() + 86400000), tomorrowKey = keyOf(tomorrow);
const label = (k) => { const [y, m, d] = k.split("-").map(Number); const dt = new Date(Date.UTC(y, m - 1, d)); return `${k === tomorrowKey ? "מחר" : k === todayKey ? "היום" : DN[dt.getUTCDay()]} ${pad(d)}/${pad(m)}`; };
const sum = (m) => Object.values(m || {}).reduce((a, v) => a + (+v > 0 ? +v : 0), 0);

// מי מקבל
const users = (await db.collection("users").get()).docs.map((d) => ({ uid: d.id, ...d.data() }));
async function send(roles, title, body) {
  const targets = [];
  users.filter((u) => roles.includes(u.role)).forEach((u) => Object.entries(u.push || {}).forEach(([h, v]) => v && v.t && targets.push({ uid: u.uid, h, t: v.t })));
  if (!targets.length) { console.log("no devices for", roles, title); return; }
  const res = await fcm.sendEachForMulticast({
    tokens: targets.map((x) => x.t),
    notification: { title, body },
    webpush: { notification: { icon: APP_URL + "icon-192.png", badge: APP_URL + "icon-192.png", dir: "rtl", lang: "he" }, fcmOptions: { link: APP_URL } },
  });
  console.log(`sent "${title}" → ${res.successCount}/${targets.length}`);
  await Promise.all(res.responses.map((r, i) => {
    const code = r.error && r.error.code;
    if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token" || code === "messaging/invalid-argument") {
      return db.collection("users").doc(targets[i].uid).update(new admin.firestore.FieldPath("push", targets[i].h), admin.firestore.FieldValue.delete());
    }
  }));
}

// 1. הזמנה חדשה / בקשת שינוי → מנהלים + מטבח ייצור
const pendings = await db.collection("orders").where("status", "==", "pending").get();
for (const d of pendings.docs) {
  const o = d.data(); if (d.id < todayKey) continue;
  if ((o.notifiedRev || 0) >= (o.rev || 1)) continue;
  await send(["admin", "prod"], o.isChange ? "בקשת שינוי בהזמנה" : "הזמנה חדשה ממתינה לאישור",
    `משלוח ${label(d.id)} · ${sum(o.sent)} קופסאות${o.sentBy ? " · " + o.sentBy : ""}${o.late ? " · אחרי 16:00" : ""}`);
  await d.ref.set({ notifiedRev: o.rev || 1 }, { merge: true });
}

// 2. הזמנה אושרה → רוזי
const approved = await db.collection("orders").where("approvedAt", ">=", Date.now() - 2 * 86400000).get();
for (const d of approved.docs) {
  const o = d.data();
  if ((o.notifiedApprovedRev || 0) >= (o.approvedRev || 1) || o.status !== "approved") continue;
  const adj = Array.isArray(o.adjusted) ? o.adjusted.length : 0;
  await send(["rosie"], "ההזמנה אושרה ✓", `משלוח ${label(d.id)} · ${sum(o.approved)} קופסאות${adj ? ` · המטבח שינה ${adj} כמויות` : ""}`);
  await d.ref.set({ notifiedApprovedRev: o.approvedRev || 1 }, { merge: true });
}

// 2ב. הזמנה או בקשת שינוי נדחו → רוזי
const rejected = await db.collection("orders").where("rejected.at", ">=", Date.now() - 2 * 86400000).get();
for (const d of rejected.docs) {
  const o = d.data(), r = o.rejected || {};
  if ((o.notifiedRejected || 0) >= (r.at || 0)) continue;
  await send(["rosie"], r.change ? "בקשת השינוי נדחתה" : "ההזמנה נדחתה", `${r.note ? r.note + " · " : ""}משלוח ${label(d.id)}${r.change ? "" : " · אפשר לתקן ולשלוח שוב"}`);
  await d.ref.set({ notifiedRejected: r.at || Date.now() }, { merge: true });
}

// 3. חוסר בקבלת משלוח → מנהלים + מטבח ייצור
const recv = await db.collection("orders").where("received.at", ">=", Date.now() - 86400000).get();
for (const d of recv.docs) {
  const o = d.data(), miss = (o.received && o.received.missing) || {};
  if (o.notifiedReceived || !Object.keys(miss).length) continue;
  const cat = (await db.collection("catalog").doc("items").get()).data()?.items || {};
  await send(["admin", "prod"], "חסר במשלוח לרוזי", Object.entries(miss).map(([k, v]) => `${(cat[k] && cat[k].n) || k} ${v}`).join(", "));
  await d.ref.set({ notifiedReceived: true }, { merge: true });
}

// 4. תזכורת 15:00 → מנהלים + רוזי (לא בשישי, כי אין משלוח בשבת)
if (hour >= REMIND && hour < CUTOFF && tomorrow.getUTCDay() !== 6) {
  const ref = db.collection("meta").doc("reminders"), m = (await ref.get()).data() || {};
  if (m.last !== todayKey) {
    const t = (await db.collection("orders").doc(tomorrowKey).get()).data() || {};
    await send(["admin", "rosie"], "נשארה שעה לסגירת ההזמנה",
      t.sentAt ? `ההזמנה ל${label(tomorrowKey)} נשלחה ✓ — אפשר לעדכן עד 16:00` : `עוד לא נשלחה הזמנה ל${label(tomorrowKey)}. ההזמנות נסגרות ב-16:00`);
    await ref.set({ last: todayKey, at: Date.now() });
  }
}
console.log("done", todayKey, hour);
process.exit(0);
