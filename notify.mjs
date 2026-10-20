// שרת התראות קטן: רץ כל 5 דקות ב-GitHub Actions (חינם), בודק את Firebase ושולח התראות לטלפונים.
import admin from "firebase-admin";

const APP_URL = process.env.APP_URL || "https://gedalyalewenstein-lang.github.io/rosie/";
const TZ = "Asia/Jerusalem", CUTOFF = 16, REMIND = 15;
const DN = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore(), fcm = admin.messaging();

// זמן ישראל
const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map((x) => [x.type, x.value]));
const pad = (n) => String(n).padStart(2, "0");
const keyOf = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const today = new Date(Date.UTC(+p.year, +p.month - 1, +p.day)), hour = +p.hour, nowMin = hour * 60 + +p.minute;
/* הזמן האמיתי שנשאר, בטקסט: ״45 דקות״, ״שעה״, ״שעה ו-10 דקות״ — כי השרת לפעמים רץ באיחור */
const minsTo = (h, m = 0) => h * 60 + m - nowMin;
const pl = (n, one, many) => (n === 1 ? one : `${n} ${many}`);
const dur = (x) => { const h = Math.floor(x / 60), m = x % 60; if (!h) return `${m} דקות`; const hh = h === 1 ? "שעה" : h === 2 ? "שעתיים" : `${h} שעות`; return m ? `${hh} ו-${m} דקות` : hh; };
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
  // עדכונים אוטומטיים צפופים: התראה אחת לכל 10 דקות לכל היותר, כדי לא להציף
  const quiet = o.notifiedRev && Date.now() - (o.notifiedAt || 0) < 10 * 60000;
  if (!quiet) await send(["admin", "prod"], o.isChange ? "בקשת שינוי בהזמנה" : o.notifiedRev ? "ההזמנה עודכנה" : "הזמנה חדשה ממתינה לאישור",
    `משלוח ${label(d.id)} · ${sum(o.sent)} קופסאות${o.sentBy ? " · " + o.sentBy : ""}${o.late ? " · אחרי 16:00" : ""}`);
  await d.ref.set(quiet ? { notifiedRev: o.rev || 1 } : { notifiedRev: o.rev || 1, notifiedAt: Date.now() }, { merge: true });
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

// 2ג. חוסר צפוי מהייצור → רוזי + מנהלים
for (const k of [todayKey, tomorrowKey]) {
  const ref = db.collection("production").doc(k), P = (await ref.get()).data();
  if (!P || !P.items) continue;
  const shorts = Object.entries(P.items).filter(([, x]) => x && x.done && x.short > 0);
  const key = JSON.stringify(shorts.map(([i, x]) => [i, x.short]));
  if (!shorts.length || P.notifiedShort === key) continue;
  const cat = (await db.collection("catalog").doc("items").get()).data()?.items || {};
  await send(["rosie", "admin"], `חוסר צפוי במשלוח ${label(k)}`, shorts.map(([i, x]) => `${(cat[i] && cat[i].n) || i} ${x.short}${x.shortNote ? " (" + x.shortNote + ")" : ""}`).join(", "));
  await ref.set({ notifiedShort: key }, { merge: true });
}

// 2ד. הזמנה שממתינה לאישור יותר מ-30 דקות → תזכורת למאשרים, רק בשעות העבודה (06:00–16:00), לכל היותר פעם בשעה
if (hour >= 6 && hour < 16) {
  for (const d of pendings.docs) {
    const o = d.data(); if (d.id < todayKey) continue;
    const waited = Date.now() - (o.sentAt || Date.now());
    if (waited < 30 * 60000 || Date.now() - (o.remindedAt || 0) < 60 * 60000) continue;
    await send(["admin", "prod"], "הזמנה עדיין ממתינה לאישור", `משלוח ${label(d.id)} · ${sum(o.sent)} קופסאות · ממתינה ${Math.round(waited / 60000) >= 120 ? Math.round(waited / 3600000) + " שעות" : Math.round(waited / 60000) + " דקות"}`);
    await d.ref.set({ remindedAt: Date.now() }, { merge: true });
  }
}

// 2ה. 13:00 ביום המשלוח: נשארו הכנות פתוחות → טבחי ייצור + מנהלים
if (hour >= 13 && minsTo(15, 30) >= 15) {
  const mref = db.collection("meta").doc("reminders"), mm = (await mref.get()).data() || {};
  if (mm.prodLast !== todayKey) {
    const o0 = (await db.collection("orders").doc(todayKey).get()).data() || {}, o = o0.status === "cancelled" ? {} : o0;
    const P = (await db.collection("production").doc(todayKey).get()).data() || {};
    const ap = o.approved || {}, its = P.items || {};
    const open = Object.keys(ap).filter((k) => +ap[k] > 0 && !(its[k] && its[k].done && (its[k].forQty || 0) >= +ap[k]));
    const ready = Object.keys(ap).filter((k) => +ap[k] > 0).length - open.length;
    if (open.length) await send(["prod", "admin"], open.length === 1 ? "נשארה הכנה אחת למשלוח היום" : `נשארו ${open.length} הכנות למשלוח היום`, `עוד ${dur(minsTo(15, 30))} עד 15:30${ready ? ` · ${pl(ready, "אחת כבר מוכנה", "כבר מוכנות")}` : ""}`);
    await mref.set({ prodLast: todayKey }, { merge: true });
  }
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

// 4. תזכורת לפני סגירת ההזמנה (16:00) → מנהלים + רוזי. הטקסט לפי הזמן שבאמת נשאר. לא בשישי (אין משלוח בשבת)
const left = minsTo(CUTOFF);
if (left <= 70 && left >= 10 && tomorrow.getUTCDay() !== 6) {
  const ref = db.collection("meta").doc("reminders"), m = (await ref.get()).data() || {};
  if (m.last !== todayKey) {
    const t = (await db.collection("orders").doc(tomorrowKey).get()).data() || {};
    await send(["admin", "rosie"], `נשארו ${dur(left)} לסגירת ההזמנה`,
      t.sentAt ? `ההזמנה ל${label(tomorrowKey)} נשלחה ✓ — אפשר לעדכן עד 16:00` : `עוד לא נשלחה הזמנה ל${label(tomorrowKey)}. ההזמנות נסגרות ב-16:00`);
    await ref.set({ last: todayKey, at: Date.now() }, { merge: true });
  }
}

// 5. סיכום שבועי למנהל — יום ראשון בבוקר (08:00–12:00), על ראשון–שבת שעברו, מול השבוע שלפניו
if (today.getUTCDay() === 0 && hour >= 8 && hour < 12) {
  const ref = db.collection("meta").doc("reminders"), m = (await ref.get()).data() || {};
  if (m.weekly !== todayKey) {
    const dk = (n) => keyOf(new Date(today.getTime() - n * 86400000));
    const q = (o) => (o && o.status !== "cancelled" && o.approved && sum(o.approved) > 0 ? o.approved : o && o.status !== "rejected" && o.status !== "cancelled" ? o.sent || {} : {});
    const ords = (await db.collection("orders").where(admin.firestore.FieldPath.documentId(), ">=", dk(14)).where(admin.firestore.FieldPath.documentId(), "<=", dk(1)).get()).docs;
    const prods = (await db.collection("production").where(admin.firestore.FieldPath.documentId(), ">=", dk(14)).where(admin.firestore.FieldPath.documentId(), "<=", dk(1)).get()).docs;
    const wst = (await db.collection("waste").where("day", ">=", dk(14)).get()).docs.map((d) => d.data());
    const wk = (from, to) => {
      let boxes = 0, days = 0, late = 0, short = 0, waste = 0;
      ords.forEach((d) => { if (d.id < from || d.id > to) return; const o = d.data(), b = sum(q(o)); if (!b) return; boxes += b; days++; if (o.late) late++; short += Object.keys((o.received && o.received.missing) || {}).length; });
      prods.forEach((d) => { if (d.id < from || d.id > to) return; short += Object.values(d.data().items || {}).filter((x) => x && x.done && x.short > 0).length; });
      wst.forEach((w) => { if (w.day >= from && w.day <= to) waste += +w.qty || 0; });
      return { boxes, days, late, short, waste, wp: boxes ? Math.round((waste / boxes) * 1000) / 10 : 0 };
    };
    const a = wk(dk(7), dk(1)), b = wk(dk(14), dk(8));
    if (a.days) await send(["admin"], "סיכום שבועי · רוזי",
      `${a.boxes} קופסאות ב-${a.days} ימים · פחת ${a.wp}%${b.days ? ` (קודם ${b.wp}%)` : ""} · ${pl(a.short, "חוסר אחד", "חוסרים")} · ${pl(a.late, "הזמנה אחת", "הזמנות")} אחרי 16:00`);
    await ref.set({ weekly: todayKey }, { merge: true });
  }
}
console.log("done", todayKey, hour);
process.exit(0);
