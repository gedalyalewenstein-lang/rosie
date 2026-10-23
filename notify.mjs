// שרת התראות קטן: רץ כל 5 דקות ב-GitHub Actions (חינם), בודק את Firebase ושולח התראות לטלפונים.
import admin from "firebase-admin";

const APP_URL = process.env.APP_URL || "https://gedalyalewenstein-lang.github.io/rosie/";
const TZ = "Asia/Jerusalem", CUTOFF = 16, REMIND = 15;
const DN = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore(), fcm = admin.messaging();
// 0. מחיקת משתמש לגמרי (רק הבעלים מבקש מתוך האפליקציה): חשבון ההתחברות + הפרופיל
for (const d of (await db.collection("deletions").get()).docs) {
  try { await admin.auth().deleteUser(d.id); }
  catch (e) { if (!/not-found|no user record/i.test(`${e.code} ${e.message}`)) { console.log("user delete failed", d.id, e.message); continue; } }
  await db.collection("users").doc(d.id).delete().catch(() => {});
  await d.ref.delete(); console.log("user deleted", d.id);
}

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
const OWNER = process.env.OWNER_USERNAME || "gadi";
// Claude: קריאה אחת, עם מקום לחשיבה ומגבלת זמן
const T0 = Date.now(), timeLeft = () => 6.5 * 60000 - (Date.now() - T0); // ריצה אחת מוגבלת ל-9 דקות ב-GitHub
const AI_KEY = process.env.ANTHROPIC_API_KEY, AI_MODEL = process.env.AI_MODEL || "claude-sonnet-5-5";
const AI_WS = process.env.ANTHROPIC_WORKSPACE_ID ? { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID } : {};
async function claude(content, { max = 16000, effort = "medium", timeout = 150000, system } = {}) {
  const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", signal: AbortSignal.timeout(timeout), headers: { "content-type": "application/json", authorization: `Bearer ${AI_KEY}`, ...AI_WS, "anthropic-version": "2023-06-01" }, body: JSON.stringify(Object.assign({ model: AI_MODEL, max_tokens: max, output_config: { effort }, messages: [{ role: "user", content }] }, system ? { system } : {})) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((j.error && j.error.message) || "api " + res.status);
  return (j.content || []).map((c) => c.text || "").join("").trim();
}
const jsonOf = (t) => JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
const numOf = (v) => (typeof v === "number" && isFinite(v) ? v : typeof v === "string" && v.trim() && isFinite(+v.replace(/[,₪\s%]/g, "")) ? +v.replace(/[,₪\s%]/g, "") : null);
const strOf = (v, n = 60) => (typeof v === "string" ? v.trim().slice(0, n) : "");
async function send(roles, title, body) {
  const targets = [];
  users.filter((u) => roles.includes(u.role) || (roles.includes("owner") && u.role === "admin" && u.username === OWNER)).forEach((u) => Object.entries(u.push || {}).forEach(([h, v]) => v && v.t && targets.push({ uid: u.uid, h, t: v.t })));
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

// 2ה. 13:00 ביום המשלוח: נשארו הכנות פתוחות → טבחי ייצור + מנהלים (סיום ייצור: 16:30)
if (hour >= 13 && minsTo(16, 30) >= 15) {
  const mref = db.collection("meta").doc("reminders"), mm = (await mref.get()).data() || {};
  if (mm.prodLast !== todayKey) {
    const o0 = (await db.collection("orders").doc(todayKey).get()).data() || {}, o = o0.status === "cancelled" ? {} : o0;
    const P = (await db.collection("production").doc(todayKey).get()).data() || {};
    const ap = o.approved || {}, its = P.items || {};
    const open = Object.keys(ap).filter((k) => +ap[k] > 0 && !(its[k] && its[k].done && (its[k].forQty || 0) >= +ap[k]));
    const ready = Object.keys(ap).filter((k) => +ap[k] > 0).length - open.length;
    if (open.length) await send(["prod", "admin"], open.length === 1 ? "נשארה הכנה אחת למשלוח היום" : `נשארו ${open.length} הכנות למשלוח היום`, `עוד ${dur(minsTo(16, 30))} עד 16:30${ready ? ` · ${pl(ready, "אחת כבר מוכנה", "כבר מוכנות")}` : ""}`);
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

// 4. תזכורת לפני סגירת ההזמנה (16:00) → מנהלים + רוזי. הטקסט לפי הזמן שבאמת נשאר. לא ערב יום שהמטבח סגור (ברירת מחדל: שישי ושבת)
const left = minsTo(CUTOFF);
const OFF = ((await db.collection("settings").doc("app").get()).data() || {}).offDays || [5, 6];
if (left <= 70 && left >= 10 && !OFF.includes(tomorrow.getUTCDay())) {
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
    if (a.days && !process.env.ANTHROPIC_API_KEY) await send(["admin"], "סיכום שבועי · רוזי",
      `${a.boxes} קופסאות ב-${a.days} ימים · פחת ${a.wp}%${b.days ? ` (קודם ${b.wp}%)` : ""} · ${pl(a.short, "חוסר אחד", "חוסרים")} · ${pl(a.late, "הזמנה אחת", "הזמנות")} אחרי 16:00`);
    const oc = (await db.collection("credits").where("status", "==", "open").get()).docs.map((x) => x.data()).filter((c) => Date.now() - (c.at || 0) > 3 * 86400000);
    if (oc.length) await send(["admin"], `זיכויים פתוחים מספקים · ${oc.length}`, `סה״כ ₪${Math.round(oc.reduce((a, c) => a + (+c.amt || 0), 0))} · ${[...new Set(oc.map((c) => c.sup))].slice(0, 3).join(", ")}. לבקש בחשבונית הבאה`);
    await ref.set({ weekly: todayKey }, { merge: true });
  }
}
// 6. מזג אוויר אוטומטי לכל יום (אחרי 21:00, פעם ביום) — אתמול בנתונים סופיים + היום
if (hour >= 21) {
  const ref = db.collection("meta").doc("reminders"), m = (await ref.get()).data() || {};
  if (m.weather !== todayKey) {
    try {
      const LAT = process.env.ROSIE_LAT || "31.778", LON = process.env.ROSIE_LON || "35.219";
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=Asia%2FJerusalem&past_days=1&forecast_days=1`);
      const j = await r.json(), D = j.daily || {};
      for (let i = 0; i < (D.time || []).length; i++) {
        const w = { tmax: D.temperature_2m_max[i], tmin: D.temperature_2m_min[i], rain: D.precipitation_sum[i], wind: D.wind_speed_10m_max[i], src: "open-meteo" };
        if (Object.values(w).some((v) => v == null)) continue;
        await db.collection("days").doc(D.time[i]).set({ date: D.time[i], weather: w }, { merge: true });
      }
      await ref.set({ weather: todayKey }, { merge: true });
    } catch (e) { console.log("weather failed", e.message); }
  }
}

// 8. חגים מלוח השנה העברי (פעם ביום) — לשבועיים קדימה
{
  const ref = db.collection("meta").doc("reminders"), m = (await ref.get()).data() || {};
  if (m.hol !== todayKey) {
    try {
      const end = keyOf(new Date(today.getTime() + 14 * 86400000));
      const r = await fetch(`https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=on&mod=on&nx=off&ss=off&mf=off&c=off&s=off&i=on&lg=he&start=${todayKey}&end=${end}`);
      const j = await r.json(), by = {};
      (j.items || []).filter((x) => x.category === "holiday" && x.date).forEach((x) => { const d = x.date.slice(0, 10); (by[d] = by[d] || []).push(x.hebrew || x.title); });
      for (const [d, t] of Object.entries(by)) await db.collection("days").doc(d).set({ date: d, holiday: [...new Set(t)].join(" · ").slice(0, 80) }, { merge: true });
      await ref.set({ hol: todayKey }, { merge: true });
    } catch (e) { console.log("holidays failed", e.message); }
  }
}

// 9. תזכורת שקילה (19:45) — 2 מנות שהכי חסרות להן שקילות, רק ביום עבודה
if (nowMin >= 19 * 60 + 45 && nowMin < 21 * 60) {
  const ref = db.collection("meta").doc("reminders"), m = (await ref.get()).data() || {};
  if (m.weighRem !== todayKey) {
    const o = (await db.collection("orders").doc(todayKey).get()).data() || {};
    if (o.status === "approved") {
      const need = (await db.collection("dishes").get()).docs.map((d) => d.data()).filter((d) => d.n && (d.weighings || []).length < 5)
        .sort((a, b) => (a.weighings || []).length - (b.weighings || []).length).slice(0, 2);
      if (need.length) await send(["admin"], "שקילה בסרוויס ⚖️", `${need.map((d) => d.n).join(" + ")}. מנה אחת מכל אחת, לפני שיוצאת`);
    }
    await ref.set({ weighRem: todayKey }, { merge: true });
  }
}

// 10. קריאת קבלות ודוחות קופה עם AI (Claude) — רק אם הוגדר מפתח
{
  const KEY = process.env.ANTHROPIC_API_KEY, MODEL = process.env.AI_MODEL || "claude-sonnet-5-5";
  const sref = db.collection("settings").doc("app"), st = (await sref.get()).data() || {};
  const WS = process.env.ANTHROPIC_WORKSPACE_ID ? { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID } : {};
  if (!!KEY !== !!st.ai) await sref.set({ ai: !!KEY }, { merge: true });
  if (!KEY && st.aiStat) await sref.update({ aiStat: admin.firestore.FieldValue.delete() });
  // בדיקת חיבור ל-Claude: מיד אחרי שהמפתח נוסף, ואחר כך פעם ב-12 שעות
  if (KEY && (!st.aiStat || Date.now() - (st.aiStat.at || 0) > 12 * 3600000 || (!st.aiStat.ok && Date.now() - (st.aiStat.at || 0) > 30 * 60000))) {
    let stat;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", signal: AbortSignal.timeout(60000), headers: { "content-type": "application/json", authorization: `Bearer ${KEY}`, ...WS, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: MODEL, max_tokens: 300, output_config: { effort: "low" }, messages: [{ role: "user", content: "ok" }] }) });
      const j = await res.json().catch(() => ({}));
      stat = res.ok ? { ok: true, at: Date.now() } : { ok: false, at: Date.now(), err: `${res.status} ${(j.error && j.error.message) || ""}`.slice(0, 160) };
    } catch (e) { stat = { ok: false, at: Date.now(), err: String(e.message || e).slice(0, 160) }; }
    await sref.set({ aiStat: stat }, { merge: true }); console.log("ai check", JSON.stringify(stat));
  }
  if (KEY) {
    const RC = ["ירקות", "בשר ודגים", "חלבי", "יבש", "אחר"];
    const P = {
      r: `זו תמונה של קבלה/חשבונית מספק של מסעדה בישראל. החזר JSON בלבד, בלי טקסט נוסף, במבנה:
{"supplier":"שם הספק","date":"YYYY-MM-DD","total":0,"category":"אחת מ: ${RC.join(", ")}","items":[{"name":"שם המוצר","qty":0,"unit":"ק״ג/יח׳/ליטר/ארגז","unitPrice":0,"total":0}]}
סכומים בשקלים כמספרים. total = הסכום הסופי לתשלום כולל מע״מ. שדה שלא ניתן לקרוא = null. אל תמציא.`,
      z: `זו תמונה של דו״ח קופה יומי (דו״ח Z / סיכום יום) של מסעדה בישראל. החזר JSON בלבד, בלי טקסט נוסף, במבנה:
{"date":"YYYY-MM-DD","covers":0,"total":0,"items":[{"name":"שם המנה/פריט","qty":0,"total":0}]}
covers = מספר סועדים/אורחים אם מופיע. total = סה״כ מכירות. items = מכירות לפי פריט אם מופיעות. שדה שלא ניתן לקרוא = null. אל תמציא.`,
    };
    const pend = (await db.collection("photos").where("ai", "==", "pending").limit(2).get()).docs;
    const pref = db.collection("meta").doc("prices"), prices = ((await pref.get()).data() || {}).p || {}, alerts = [];
    const nrm = (x) => String(x || "").replace(/["'׳״.,/()\-]/g, " ").replace(/\s+/g, " ").trim();
    for (const d of pend) {
      if (timeLeft() < 120000) break;
      const ph = d.data();
      try {
        if (!P[ph.kind]) { await d.ref.set({ ai: "skip" }, { merge: true }); continue; }
        const img = ((await db.collection("photoData").doc(d.id).get()).data() || {}).img || "";
        const mm = img.match(/^data:(image\/[a-z]+);base64,(.+)$/);
        if (!mm) throw new Error("no image");
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${KEY}`, ...WS, "anthropic-version": "2023-06-01" },
          signal: AbortSignal.timeout(100000),
          body: JSON.stringify({ model: MODEL, max_tokens: 16000, output_config: { effort: "medium" }, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mm[1], data: mm[2] } }, { type: "text", text: P[ph.kind] }] }] }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error((j.error && j.error.message) || "api " + res.status);
        const txt = (j.content || []).map((c) => c.text || "").join(""), js = txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1);
        const A = JSON.parse(js), N = (v) => (typeof v === "number" && isFinite(v) ? v : typeof v === "string" && v.trim() && isFinite(+v.replace(/[,₪\s]/g, "")) ? +v.replace(/[,₪\s]/g, "") : null), S = (v, n = 60) => (typeof v === "string" ? v.trim().slice(0, n) : null);
        const items = (Array.isArray(A.items) ? A.items : []).slice(0, 80).map((x) => ({ name: S(x && x.name) || "", qty: N(x && x.qty), unit: S(x && x.unit, 12), unitPrice: N(x && x.unitPrice), total: N(x && x.total) })).filter((x) => x.name);
        const clean = { items, total: N(A.total), date: /^\d{4}-\d{2}-\d{2}$/.test(A.date || "") ? A.date : null };
        const patch = { ai: "done", aiAt: Date.now() };
        if (ph.kind === "r") {
          clean.supplier = S(A.supplier); clean.category = RC.includes(A.category) ? A.category : null;
          patch.aiData = clean;
          if (!ph.sup && clean.supplier) patch.sup = clean.supplier;
          if (ph.amt == null && clean.total != null) patch.amt = clean.total;
          if (!ph.cat && clean.category) patch.cat = clean.category;
          // התראת מחיר: אותו מוצר מאותו ספק עלה ב-10% ומעלה
          const sup = (patch.sup || ph.sup || "").replace(/[./]/g, " ");
          items.forEach((x) => { if (!(x.unitPrice > 0) || !sup) return; const k = `${sup}|${x.name}`.replace(/[./]/g, " ").slice(0, 100), prev = prices[k]; if (prev && prev.v > 0 && x.unitPrice >= prev.v * 1.1) alerts.push(`${x.name} (${sup}) עלה ${Math.round((x.unitPrice / prev.v - 1) * 100)}%`); prices[k] = { v: x.unitPrice, at: Date.now() }; });
        } else {
          clean.covers = N(A.covers); patch.aiData = clean;
          const day = ph.day || clean.date, dref = db.collection("days").doc(day), D = (await dref.get()).data() || {}, dp = { date: day, sales: items.map((x) => ({ name: x.name, qty: x.qty, total: x.total })) };
          if (D.covers == null && clean.covers != null) dp.covers = clean.covers;
          if (D.salesTotal == null && clean.total != null) dp.salesTotal = clean.total;
          await dref.set(dp, { merge: true });
        }
        await d.ref.set(patch, { merge: true });
        console.log("ai read", d.id, ph.kind, items.length);
      } catch (e) { console.log("ai failed", d.id, e.message); const tries = (ph.aiTries || 0) + 1; await d.ref.set({ ai: tries >= 3 ? "error" : "pending", aiTries: tries, aiErr: String(e.message).slice(0, 200) }, { merge: true }); }
    }
    if (pend.length) await pref.set({ p: prices }, { merge: true });
    if (alerts.length) await send(["admin"], "עליית מחיר אצל ספק 📈", alerts.slice(0, 4).join(" · "));

    // 10ב. קובץ טאביט חודשי → Claude ממלא את כרטיס העלויות ואת ימי השירות
    for (const d of (await db.collection("uploads").where("ai", "==", "pending").limit(1).get()).docs) {
      if (timeLeft() < 200000) break;
      const u = d.data();
      try {
        if (u.kind !== "tabit" || !/^\d{4}-\d{2}$/.test(u.ym || "")) { await d.ref.set({ ai: "skip" }, { merge: true }); continue; }
        const content = [];
        if (u.text) content.push({ type: "text", text: `הקובץ (${u.name || "טאביט"}), בפורמט CSV:\n${String(u.text).slice(0, 400000)}` });
        else if (u.mime === "application/pdf") content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: u.data } });
        else content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: u.data } });
        content.push({ type: "text", text: `זה דו״ח ממערכת הקופה טאביט (Tabit) של מסעדת רוזי בישראל, לחודש ${u.ym}. חלץ את הנתונים והחזר JSON בלבד, בלי טקסט נוסף, במבנה:
{"month":"YYYY-MM","sales":0,"salesNet":0,"covers":0,"checks":0,"days":[{"date":"YYYY-MM-DD","sales":0,"covers":0}],"categories":[{"name":"","total":0}],"items":[{"name":"","qty":0,"total":0}],"labor":null,"discounts":null,"notes":""}
sales = סה״כ מכירות לכל החודש כולל מע״מ. salesNet = לפני מע״מ אם מופיע. covers = מספר סועדים. checks = מספר חשבונות/שולחנות. days = פירוט יומי אם מופיע. categories = מכירות לפי קטגוריה. items = עד 60 הפריטים עם הכי הרבה מכירות. labor = עלות עובדים לחודש אם מופיעה. discounts = הנחות/ביטולים בשקלים אם מופיעים. notes = משפט אחד על משהו חריג בקובץ, אם יש.
מספר שלא מופיע = null. אל תמציא ואל תעריך.` });
        const A = jsonOf(await claude(content, { max: 16000, effort: "medium", timeout: 180000 }));
        const T = { sales: numOf(A.sales), salesNet: numOf(A.salesNet), covers: numOf(A.covers), checks: numOf(A.checks), labor: numOf(A.labor), discounts: numOf(A.discounts), notes: strOf(A.notes, 200),
          categories: (Array.isArray(A.categories) ? A.categories : []).slice(0, 24).map((x) => ({ name: strOf(x && x.name), total: numOf(x && x.total) })).filter((x) => x.name && x.total != null),
          items: (Array.isArray(A.items) ? A.items : []).slice(0, 60).map((x) => ({ name: strOf(x && x.name), qty: numOf(x && x.qty), total: numOf(x && x.total) })).filter((x) => x.name),
          at: Date.now(), file: strOf(u.name, 80), upload: d.id };
        await db.collection("months").doc(u.ym).set({ tabit: T }, { merge: true });
        let nd = 0;
        for (const r of (Array.isArray(A.days) ? A.days : []).slice(0, 31)) {
          const day = strOf(r && r.date, 10); if (!day.startsWith(u.ym)) continue;
          const dref = db.collection("days").doc(day), D = (await dref.get()).data() || {}, dp = { date: day, tabit: true }, sl = numOf(r.sales), cv = numOf(r.covers);
          if (D.salesTotal == null && sl > 0) dp.salesTotal = sl;
          if (D.covers == null && cv > 0) dp.covers = Math.round(cv);
          await dref.set(dp, { merge: true }); nd++;
        }
        await d.ref.set({ ai: "done", aiAt: Date.now(), days: nd }, { merge: true });
        await send(["owner"], `קובץ טאביט נקרא · ${u.ym.slice(5)}/${u.ym.slice(0, 4)}`, [T.sales ? `מכירות ₪${Math.round(T.sales).toLocaleString("he-IL")}` : "", T.covers ? `${T.covers} סועדים` : "", nd ? `${nd} ימים` : ""].filter(Boolean).join(" · ") || "הנתונים עודכנו");
        console.log("tabit read", d.id, T.sales, nd);
      } catch (e) { console.log("tabit failed", d.id, e.message); const tries = (u.aiTries || 0) + 1; await d.ref.set({ ai: tries >= 3 ? "error" : "pending", aiTries: tries, aiErr: String(e.message).slice(0, 200) }, { merge: true }); }
    }
  }
}

// 7. תזכורת ״סגירת ערב״ לרוזי ב-22:30 — רק ביום שהיה בו משלוח, ורק אם עוד לא נסגר
if (nowMin >= 22 * 60 + 30) {
  const ref = db.collection("meta").doc("reminders"), m = (await ref.get()).data() || {};
  if (m.closeRem !== todayKey) {
    const o = (await db.collection("orders").doc(todayKey).get()).data() || {}, dd = (await db.collection("days").doc(todayKey).get()).data() || {};
    const perm = (((await db.collection("settings").doc("app").get()).data() || {}).perm || {}).close || [];
    if (perm.includes("rosie") && o.status === "approved" && !dd.closedAt && dd.covers == null) await send(["rosie"], "סגירת ערב", "צלמו את דו״ח הקופה של היום");
    await ref.set({ closeRem: todayKey }, { merge: true });
  }
}
// 11. Claude למנהל: דוחות (יומי / שבועי / חודשי / לפי בקשה) ושאלות חופשיות — רק לבעלים
const shiftKey = (k, n) => keyOf(new Date(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8)) + n * 86400000));
const spanDays = (a, b) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8))) / 86400000) + 1;
const fmtN = (n) => Math.round(n).toLocaleString("he-IL");
function kpisOf(c, p) {
  const hasP = p.deliveryDays > 0, pct = (a, b) => (b ? Math.round(((a - b) / b) * 100) : null), pts = (a, b) => (hasP && a != null && b != null ? Math.round((a - b) * 10) / 10 : null);
  const onT = (x) => (x.production.days ? Math.round((x.production.completedByDeadline / x.production.days) * 100) : null);
  const K = [];
  K.push({ k: "boxes", label: "קופסאות", v: fmtN(c.boxes), d: pct(c.boxes, p.boxes), unit: "%", good: null });
  K.push({ k: "waste", label: "פחת", v: c.waste.pctOfOrdered + "%", d: pts(c.waste.pctOfOrdered, p.waste.pctOfOrdered), unit: "נק׳", good: pts(c.waste.pctOfOrdered, p.waste.pctOfOrdered) == null ? null : c.waste.pctOfOrdered <= p.waste.pctOfOrdered });
  if (c.production.days) K.push({ k: "ontime", label: "מוכן עד 16:30", v: onT(c) + "%", d: pts(onT(c), onT(p)), unit: "נק׳", good: pts(onT(c), onT(p)) == null ? null : onT(c) >= onT(p) });
  if (c.sales.total) K.push({ k: "sales", label: "מכירות", v: "₪" + fmtN(c.sales.total), d: pct(c.sales.total, p.sales.total), unit: "%", good: p.sales.total ? c.sales.total >= p.sales.total : null });
  if (c.receipts.total) K.push({ k: "buy", label: "רכש", v: "₪" + fmtN(c.receipts.total), d: pct(c.receipts.total, p.receipts.total), unit: "%", good: p.receipts.total ? c.receipts.total <= p.receipts.total : null });
  if (c.foodCostPct != null) K.push({ k: "fc", label: "Food cost", v: c.foodCostPct + "%", d: pts(c.foodCostPct, p.foodCostPct), unit: "נק׳", good: p.foodCostPct != null ? c.foodCostPct <= p.foodCostPct : null });
  return K;
}
function priceMoves(c, p) {
  const out = [];
  Object.entries(c.itemPrices || {}).forEach(([k, v]) => { const b = (p.itemPrices || {})[k]; if (b && b.avg > 0 && v.avg > 0) { const ch = Math.round(((v.avg - b.avg) / b.avg) * 1000) / 10; if (Math.abs(ch) >= 5) out.push({ item: k, from: b.avg, to: v.avg, changePct: ch, spend: v.spend }); } });
  return out.sort((a, b) => Math.abs(b.changePct) * b.spend - Math.abs(a.changePct) * a.spend).slice(0, 10);
}
const ROLE_TXT = `אתה סמנכ״ל תפעול וכספים בכיר שמלווה את מסעדת רוזי בישראל ואת מטבח הייצור המרכזי שלה (מכין הכנות בקופסאות של 4 ליטר ושולח לרוזי). אתה כותב לבעלים, גדי, שף ומנהל מקצועי. עבוד רק מהנתונים שמצורפים, אל תמציא מספרים, וכשחסר נתון אמור את זה במפורש. היה חד, מספרי וממוקד בכסף: פחת, ייצור יתר, חוסרים, עליות מחיר, Food cost.`;
async function writeReport({ id, kind, from, to, title }) {
  const n = spanDays(from, to), pf = shiftKey(from, -n), pt = shiftKey(from, -1), monthly = kind === "monthly" || kind === "prevMonth";
  const [cur, prev] = await Promise.all([periodStats(from, to, monthly), periodStats(pf, pt, monthly)]);
  if (!cur.deliveryDays && !cur.receipts.count && !cur.sales.days) return null;
  const kpis = kpisOf(cur, prev), moves = priceMoves(cur, prev);
  const KIND = { daily: "יומי", weekly: "שבועי", monthly: "חודשי", yesterday: "יומי", "7d": "שבועי", mtd: "חודשי (עד היום)", prevMonth: "חודשי" }[kind] || "";
  const prompt = `${ROLE_TXT}
כתוב דוח ניהול ${KIND} לתקופה ${from} עד ${to} (${n} ימים), בהשוואה לתקופה הקודמת באותו אורך (${pf} עד ${pt}).
החזר JSON בלבד, בלי שום טקסט נוסף, במבנה:
{"headline":"משפט אחד שמסכם את התקופה עם המספר הכי חשוב","summary":["2–4 משפטים קצרים של תמונת מצב עם מספרים והשוואה לתקופה הקודמת"],"alerts":[{"title":"כותרת קצרה","detail":"משפט אחד עם המספרים","level":"high|medium|low","impact":"הערכת עלות בשקלים או null"}],"actions":[{"title":"פעולה קונקרטית","detail":"איך בדיוק, עם מספרים (למשל להוריד הזמנת X מ-3 ל-2 קופסאות בימי ראשון)","saving":"חיסכון משוער בשקלים לחודש או null","who":"מטבח ייצור|רוזי|גדי"}],"forecast":"משפט או שניים: מה לצפות בתקופה הבאה (כמויות, ימים עמוסים) על סמך הדפוסים","check":"דבר אחד שכדאי לבדוק בעיניים השבוע"}
כללים: עד 4 התראות ועד 3 פעולות, מהחשוב לפחות חשוב. הערכות חיסכון רק כשיש בסיס בנתונים (מחיר לק״ג, קופסאות בפחת, הפרשי מחיר). עברית תקינה, ענייני, בלי אימוג'י.
תקופה נוכחית: ${JSON.stringify(cur)}
תקופה קודמת: ${JSON.stringify(prev)}
מדדים מחושבים: ${JSON.stringify(kpis)}
שינויי מחיר אצל ספקים (מחיר ממוצע ליחידה): ${JSON.stringify(moves)}`;
  const raw = await claude(prompt, { max: 16000, effort: "high", timeout: 200000 });
  let ai = null; try { ai = jsonOf(raw); } catch (e) {}
  const S = (v, n = 300) => (typeof v === "string" ? v.trim().slice(0, n) : "");
  const clean = ai ? {
    headline: S(ai.headline, 220), summary: (Array.isArray(ai.summary) ? ai.summary : []).map((x) => S(x)).filter(Boolean).slice(0, 5),
    alerts: (Array.isArray(ai.alerts) ? ai.alerts : []).slice(0, 5).map((x) => ({ title: S(x && x.title, 80), detail: S(x && x.detail), level: ["high", "medium", "low"].includes(x && x.level) ? x.level : "medium", impact: S(x && x.impact, 40) })).filter((x) => x.title),
    actions: (Array.isArray(ai.actions) ? ai.actions : []).slice(0, 4).map((x) => ({ title: S(x && x.title, 90), detail: S(x && x.detail), saving: S(x && x.saving, 40), who: S(x && x.who, 20) })).filter((x) => x.title),
    forecast: S(ai.forecast, 400), check: S(ai.check, 200),
  } : null;
  const headline = clean ? clean.headline : (raw.split("\n").find((l) => l.trim() && !l.startsWith("#")) || "").slice(0, 200);
  const doc = { v: 2, kind, title, headline, kpis, from, to, prevFrom: pf, prevTo: pt, stats: cur, at: Date.now() };
  if (clean) doc.ai = clean; else doc.text = raw.slice(0, 12000);
  await db.collection("reports").doc(id).set(doc);
  return doc;
}
if (AI_KEY) {
  const ref = db.collection("meta").doc("reminders"), m = (await ref.get()).data() || {};
  const dk = (n) => keyOf(new Date(today.getTime() - n * 86400000));
  const KT = { daily: "דוח יומי", weekly: "דוח שבועי", monthly: "דוח חודשי", yesterday: "דוח יומי", "7d": "דוח 7 ימים", mtd: "דוח החודש עד היום", prevMonth: "דוח חודשי" };
  const rng = (a, b) => (a === b ? `${a.slice(8)}/${a.slice(5, 7)}` : `${a.slice(8)}/${a.slice(5, 7)}–${b.slice(8)}/${b.slice(5, 7)}`);
  const jobs = [];
  if (hour >= 7 && hour < 11 && m.repDaily !== todayKey) jobs.push({ kind: "daily", flag: "repDaily", from: dk(1), to: dk(1) });
  if (today.getUTCDay() === 0 && hour >= 8 && hour < 12 && m.repWeekly !== todayKey) jobs.push({ kind: "weekly", flag: "repWeekly", from: dk(7), to: dk(1) });
  if (+p.day === 1 && hour >= 8 && hour < 12 && m.repMonthly !== todayKey) { const pm = new Date(Date.UTC(+p.year, +p.month - 2, 1)), last = new Date(Date.UTC(+p.year, +p.month - 1, 0)); jobs.push({ kind: "monthly", flag: "repMonthly", from: keyOf(pm), to: keyOf(last) }); }
  // דוחות שגדי ביקש עכשיו מתוך חדר הבקרה
  for (const d of (await db.collection("reportReq").where("status", "==", "pending").limit(1).get()).docs) {
    const r = d.data(), k = r.kind;
    const first = keyOf(new Date(Date.UTC(+p.year, +p.month - 1, 1))), pm = keyOf(new Date(Date.UTC(+p.year, +p.month - 2, 1))), pml = keyOf(new Date(Date.UTC(+p.year, +p.month - 1, 0)));
    const span = k === "yesterday" ? [dk(1), dk(1)] : k === "7d" ? [dk(7), dk(1)] : k === "mtd" ? (first <= dk(1) ? [first, dk(1)] : [pm, pml]) : k === "prevMonth" ? [pm, pml] : null;
    if (!span) { await d.ref.set({ status: "error" }, { merge: true }); continue; }
    jobs.push({ kind: k, req: d, from: span[0], to: span[1] });
  }
  for (const j of jobs) {
    if (timeLeft() < 220000) { console.log("report deferred", j.kind); break; }
    const title = `${KT[j.kind]} · ${rng(j.from, j.to)}`, id = j.req ? `req-${j.req.id}` : `${j.kind}-${j.from}`;
    try {
      const out = await writeReport({ id, kind: j.kind, from: j.from, to: j.to, title });
      if (j.req) await j.req.ref.set(out ? { status: "done", report: id, doneAt: Date.now() } : { status: "empty", doneAt: Date.now() }, { merge: true });
      if (out) await send(["owner"], out.headline ? title : "הדוח מוכן", (out.headline || title).slice(0, 170));
      else if (j.req) await send(["owner"], "אין מספיק נתונים לדוח", rng(j.from, j.to));
      if (j.flag) await ref.set({ [j.flag]: todayKey }, { merge: true });
      console.log("report", id, !!out);
    } catch (e) {
      console.log("report failed", j.kind, e.message);
      if (j.req) { const t = (j.req.data().tries || 0) + 1; await j.req.ref.set(t >= 3 ? { status: "error", err: String(e.message).slice(0, 160) } : { tries: t }, { merge: true }); }
      else { const tries = (m[j.flag + "Tries"] && m[j.flag + "Tries"].d === todayKey ? m[j.flag + "Tries"].n : 0) + 1; await ref.set(tries >= 3 ? { [j.flag]: todayKey } : { [j.flag + "Tries"]: { d: todayKey, n: tries } }, { merge: true }); }
    }
  }
  // שאל את Claude: שאלה חופשית של גדי על הנתונים
  for (const d of (await db.collection("asks").where("status", "==", "pending").limit(2).get()).docs) {
    if (timeLeft() < 160000) break;
    const a = d.data();
    try {
      const to = dk(1), from = dk(30), [cur, prev] = await Promise.all([periodStats(from, to, true), periodStats(dk(60), dk(31), true)]);
      const ym = keyOf(today).slice(0, 7), M = (await db.collection("months").doc(ym).get()).data() || {}, PM = (await db.collection("months").doc(keyOf(new Date(Date.UTC(+p.year, +p.month - 2, 1))).slice(0, 7)).get()).data() || {};
      const cat = Object.values((await db.collection("catalog").doc("items").get()).data()?.items || {}).filter((x) => !x.hidden).map((x) => ({ n: x.n, cat: x.c, shelfDays: x.d, kgPerBox: x.kg || null, pricePerKg: x.ppk || null })).slice(0, 120);
      const prompt = `${ROLE_TXT}
גדי שואל: "${String(a.q || "").slice(0, 500)}"
ענה בעברית, ישר לעניין, עד 120 מילים. תן מספרים מדויקים מהנתונים ופעולה מומלצת אם רלוונטי. אם הנתונים לא מספיקים כדי לענות, אמור בדיוק מה חסר. בלי כותרות ובלי אימוג'י. מותר נקודות קצרות שמתחילות ב-"- ".
30 הימים האחרונים (${from} עד ${to}): ${JSON.stringify(cur)}
30 הימים שלפני: ${JSON.stringify(prev)}
החודש הנוכחי (עלויות וטאביט): ${JSON.stringify({ labor: M.labor || null, tabit: M.tabit ? { sales: M.tabit.sales, covers: M.tabit.covers, categories: M.tabit.categories, items: (M.tabit.items || []).slice(0, 30) } : null })}
החודש הקודם: ${JSON.stringify({ labor: PM.labor || null, tabit: PM.tabit ? { sales: PM.tabit.sales, covers: PM.tabit.covers, categories: PM.tabit.categories, items: (PM.tabit.items || []).slice(0, 30) } : null })}
ההכנות במטבח הייצור: ${JSON.stringify(cat)}
שינויי מחיר אצל ספקים: ${JSON.stringify(priceMoves(cur, prev))}`;
      const ans = (await claude(prompt, { max: 12000, effort: "high", timeout: 150000 })).slice(0, 3000);
      await d.ref.set({ status: "done", a: ans, answeredAt: Date.now() }, { merge: true });
      await send(["owner"], "Claude ענה", (ans.split("\n").find((l) => l.trim()) || "").replace(/^-\s*/, "").slice(0, 160));
      console.log("ask answered", d.id);
    } catch (e) { console.log("ask failed", d.id, e.message); const t = (a.tries || 0) + 1; await d.ref.set(t >= 3 ? { status: "error", err: String(e.message).slice(0, 160) } : { tries: t }, { merge: true }); }
  }
}
function isr(ts) { const q = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(ts)).map((x) => [x.type, x.value])); return { day: `${q.year}-${q.month}-${q.day}`, min: +q.hour * 60 + +q.minute }; }
async function periodStats(from, to, withLabor) {
  const between = (col) => db.collection(col).where(admin.firestore.FieldPath.documentId(), ">=", from).where(admin.firestore.FieldPath.documentId(), "<=", to).get();
  const cat = (await db.collection("catalog").doc("items").get()).data()?.items || {}, nm = (k) => (cat[k] && cat[k].n) || k;
  const [qo, qp, qd] = await Promise.all([between("orders"), between("production"), between("days")]);
  const qty = (o) => (o.approved && sum(o.approved) > 0 ? o.approved : o.sent || {});
  let boxes = 0, deliveryDays = 0, late = 0, changes = 0, missing = 0, rejected = 0; const perItem = {};
  qo.docs.forEach((d) => { const o = d.data(); if (o.status === "cancelled") return; const q = qty(o), b = sum(q); if (!b) return; deliveryDays++; boxes += b; if (o.late) late++; changes += o.changeCount || 0; if (o.status === "rejected") rejected++; missing += Object.keys((o.received && o.received.missing) || {}).length; Object.entries(q).forEach(([k, v]) => { if (+v > 0) perItem[k] = (perItem[k] || 0) + +v; }); });
  let shorts = 0, onTime = 0, prodDays = 0;
  qp.docs.forEach((d) => { const its = Object.values(d.data().items || {}); if (!its.length) return; prodDays++; shorts += its.filter((x) => x && x.short > 0).length; const last = Math.max(...its.map((x) => (x && x.at) || 0)); if (its.every((x) => x && x.done) && last && isr(last).day === d.id && isr(last).min <= 16 * 60 + 30) onTime++; });
  const wst = (await db.collection("waste").where("day", ">=", from).get()).docs.map((d) => d.data()).filter((w) => w.day <= to);
  const wItem = {}; wst.forEach((w) => (wItem[w.k] = (wItem[w.k] || 0) + (+w.qty || 0)));
  const wasteBoxes = wst.reduce((a, w) => a + (+w.qty || 0), 0);
  const ph = (await db.collection("photos").where("day", ">=", from).get()).docs.map((d) => d.data()).filter((x) => x.day <= to && x.kind === "r");
  const ip = {}; ph.forEach((r) => ((r.aiData && r.aiData.items) || []).forEach((x) => { if (!(x && x.unitPrice > 0 && x.name)) return; const k = `${String(x.name).slice(0, 40)} · ${r.sup || "ספק"}`; const e = ip[k] || (ip[k] = { n: 0, sum: 0, spend: 0 }); e.n++; e.sum += +x.unitPrice; e.spend += +x.total || +x.unitPrice * (+x.qty || 1); }));
  const itemPrices = Object.fromEntries(Object.entries(ip).sort((a, b) => b[1].spend - a[1].spend).slice(0, 40).map(([k, e]) => [k, { avg: Math.round((e.sum / e.n) * 100) / 100, spend: Math.round(e.spend) }]));
  const byCat = {}, bySup = {}; ph.forEach((r) => { const a = +r.amt || 0; byCat[r.cat || "ללא סוג"] = (byCat[r.cat || "ללא סוג"] || 0) + a; bySup[r.sup || "לא ידוע"] = (bySup[r.sup || "לא ידוע"] || 0) + a; });
  let covers = 0, salesSum = 0, salesDays = 0; qd.docs.forEach((d) => { const x = d.data(); if (+x.covers > 0) covers += +x.covers; if (+x.salesTotal > 0) { salesSum += +x.salesTotal; salesDays++; } });
  const cr = (await db.collection("credits").where("status", "==", "open").get()).docs.map((d) => d.data());
  const fromMs = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8)), toMs = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8)) + 86400000;
  const dishes = (await db.collection("dishes").get()).docs.map((d) => d.data()).map((x) => { const w = (x.weighings || []).filter((v) => v.at >= fromMs && v.at < toMs).map((v) => +v.g); const rg = (x.comps || []).reduce((a, c) => a + (c.u === "ק״ג" ? (+c.q || 0) * 1000 : +c.q || 0), 0); return w.length ? { dish: x.n, weighings: w.length, avgGrams: Math.round(w.reduce((a, b) => a + b, 0) / w.length), recipeGrams: rg || null } : null; }).filter(Boolean);
  const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
  const WD = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"], byWd = {};
  qo.docs.forEach((d) => { const o = d.data(); if (o.status === "cancelled") return; const b = sum(qty(o)); if (!b) return; const w = WD[new Date(Date.UTC(+d.id.slice(0, 4), +d.id.slice(5, 7) - 1, +d.id.slice(8))).getUTCDay()]; (byWd[w] = byWd[w] || []).push(b); });
  const out = {
    deliveryDays, boxes, avgBoxesPerDay: deliveryDays ? Math.round((boxes / deliveryDays) * 10) / 10 : 0, lateOrders: late, changeRequests: changes, rejected, deliveriesWithMissing: missing,
    production: { days: prodDays, shortItems: shorts, completedByDeadline: onTime, deadline: "16:30" },
    waste: { boxes: wasteBoxes, pctOfOrdered: boxes ? Math.round((wasteBoxes / boxes) * 1000) / 10 : 0, topItems: top(wItem, 5).map(([k, v]) => ({ item: nm(k), boxes: v, ordered: perItem[k] || 0 })) },
    topOrdered: top(perItem, 6).map(([k, v]) => ({ item: nm(k), boxes: v })),
    receipts: { count: ph.length, total: Math.round(ph.reduce((a, r) => a + (+r.amt || 0), 0)), byCategory: byCat, topSuppliers: top(bySup, 5) },
    sales: { days: salesDays, total: Math.round(salesSum), covers },
    openCredits: { count: cr.length, total: Math.round(cr.reduce((a, c) => a + (+c.amt || 0), 0)) },
    dishWeighings: dishes,
    boxesByWeekday: Object.fromEntries(Object.entries(byWd).map(([w, a]) => [w, Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10])),
    wasteByItem: top(wItem, 10).map(([k, v]) => ({ item: nm(k), wasted: v, ordered: perItem[k] || 0, pct: perItem[k] ? Math.round((v / perItem[k]) * 1000) / 10 : null })),
    itemPrices,
  };
  { const food = Object.entries(byCat).filter(([c]) => c !== "אחר").reduce((a, [, v]) => a + v, 0); if (salesSum) out.foodCostPct = Math.round((food / salesSum) * 1000) / 10; }
  if (withLabor) {
    const ym = from.slice(0, 7), M = (await db.collection("months").doc(ym).get()).data() || {}, T = M.tabit || null, whole = from.endsWith("-01") && spanDays(from, to) >= 28;
    const lab = +M.labor || +(T && T.labor) || 0; out.laborCost = lab || null;
    const food = Object.entries(byCat).filter(([c]) => c !== "אחר").reduce((a, [, v]) => a + v, 0), sales = whole && T && T.sales > 0 ? T.sales : salesSum;
    if (T) out.tabit = { sales: T.sales, covers: T.covers, checks: T.checks, discounts: T.discounts, categories: T.categories, topItems: (T.items || []).slice(0, 25), notes: T.notes };
    if (sales) { out.foodCostPct = Math.round((food / sales) * 1000) / 10; if (lab && whole) out.primeCostPct = Math.round(((food + lab) / sales) * 1000) / 10; }
  }
  return out;
}
console.log("done", todayKey, hour);
process.exit(0);
