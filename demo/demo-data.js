/* דמו מיזו: מסעדה בדויה ("בית לבנה") שעבדה עם מיזו חודש שלם.
   הכול רץ בדפדפן של מי שפותח את הקישור. אין חיבור ל-Firebase ואין נתונים אמיתיים.
   השעון של הדמו עומד על היום האחרון של החודש הקודם, 14:10, כדי שיהיה חודש מלא של נתונים. */
(function () {
  "use strict";
  /* ---------- שעון ---------- */
  const RealDate = Date, realNow = RealDate.now();
  const r0 = new RealDate(realNow); let td = new RealDate(r0.getFullYear(), r0.getMonth(), 0, 14, 10, 0);
  while (td.getDay() === 5 || td.getDay() === 6) td = new RealDate(td.getFullYear(), td.getMonth(), td.getDate() - 1, 14, 10, 0); // יום עבודה
  const target = td.getTime();
  const OFF = target - realNow;
  class DemoDate extends RealDate { constructor(...a) { super(...(a.length ? a : [RealDate.now() + OFF])); } static now() { return RealDate.now() + OFF; } }
  window.Date = DemoDate;

  /* ---------- כלים ---------- */
  let seed = 20261101; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = (a) => a[Math.floor(rnd() * a.length)], round = (v, d = 1) => Math.round(v * d) / d;
  const pad = (n) => String(n).padStart(2, "0"), dk = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const NOW = new Date(), TODAY = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
  const addD = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const at = (d, h, m) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m || 0).getTime();
  const ym = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const OFFD = [5, 6]; // שישי ושבת סגור
  const store = {};

  /* ---------- אנשים ---------- */
  const U = {
    chef: { username: "chef", name: "שף נועם", role: "admin", chief: true },
    cook: { username: "maya", name: "מאיה", role: "rosie" },
    prod: { username: "eli", name: "אלי", role: "prod" },
    cook2: { username: "omer", name: "עומר", role: "rosie" },
    prod2: { username: "samir", name: "סמיר", role: "prod" },
  };
  Object.entries(U).forEach(([k, u]) => (store["users/u_" + k] = Object.assign({ createdAt: at(addD(TODAY, -45), 10), lang: "he" }, u)));
  store["settings/app"] = { offDays: OFFD, ai: true, aiStat: { ok: true, at: NOW.getTime() - 20 * 60000 } };

  /* ---------- חומרי גלם וספקים ---------- */
  const SUP = { veg: "ירקות הגליל בע״מ", veg2: "פרי השדה", dairy: "מחלבות הצפון", dry: "מזווה סיטונאות", meat: "דגי הים" };
  // name, supplier, ₪/kg, category
  const RAW = {
    tom: ["עגבניות שרי", "veg", 24, "ירקות"], cuc: ["מלפפון", "veg", 6.5, "ירקות"], mush: ["פטריות שמפיניון", "veg", 28, "ירקות"],
    pep: ["פלפל אדום", "veg", 9, "ירקות"], onion: ["בצל יבש", "veg", 4.2, "ירקות"], shal: ["שאלוט", "veg2", 19, "ירקות"],
    herbs: ["עשבי תיבול מעורב", "veg2", 38, "ירקות"], lettuce: ["חסה ערבית", "veg", 12, "ירקות"], garlic: ["שום קלוף", "veg2", 30, "ירקות"],
    eggp: ["חציל", "veg", 7, "ירקות"], lemon: ["לימון", "veg2", 8, "ירקות"], spin: ["תרד בייבי", "veg2", 34, "ירקות"],
    parm: ["פרמז׳ן", "dairy", 118, "חלבי"], feta: ["גבינה בולגרית", "dairy", 42, "חלבי"], cream: ["שמנת מתוקה 38%", "dairy", 19, "חלבי"], butter: ["חמאה", "dairy", 46, "חלבי"],
    mayo: ["מיונז", "dry", 14, "יבש"], oil: ["שמן זית", "dry", 36, "יבש"], tahini: ["טחינה גולמית", "dry", 22, "יבש"], flour: ["קמח 00", "dry", 6, "יבש"], nuts: ["אגוזי מלך", "dry", 58, "יבש"], pasta: ["פסטה ריגטוני", "dry", 13, "יבש"],
    salmon: ["פילה סלמון", "meat", 92, "בשר ודגים"],
  };
  /* ---------- הכנות ---------- k, name, cat, shelf days, raw, kg raw per box, kg net per box, avg boxes/day */
  const P = [
    ["v1", "עגבניות שרי חצויות", "ירקות וחיתוכים", 2, "tom", 3.2, 2.9, 4], ["v2", "מלפפון בקוביות", "ירקות וחיתוכים", 2, "cuc", 3.4, 3.0, 3],
    ["v3", "פטריות פרוסות", "ירקות וחיתוכים", 3, "mush", 2.1, 1.9, 2], ["v4", "פלפל קלוי ומקולף", "ירקות וחיתוכים", 4, "pep", 3.8, 2.4, 1.5],
    ["v5", "בצל קצוץ", "ירקות וחיתוכים", 3, "onion", 3.0, 2.6, 2], ["v6", "שאלוט פרוס דק", "ירקות וחיתוכים", 3, "shal", 1.6, 1.3, 1],
    ["v7", "חסה שטופה", "ירקות וחיתוכים", 2, "lettuce", 1.4, 1.1, 3], ["v8", "עשבים קצוצים", "ירקות וחיתוכים", 2, "herbs", 0.9, 0.7, 1.5],
    ["v9", "תרד בייבי שטוף", "ירקות וחיתוכים", 2, "spin", 1.0, 0.9, 1],
    ["c1", "פרמז׳ן מגורד", "גבינות", 7, "parm", 1.5, 1.5, 1], ["c2", "בולגרית מפוררת", "גבינות", 5, "feta", 2.2, 2.2, 1],
    ["s1", "איולי שום", "איולי ורטבים", 5, "mayo", 3.0, 3.2, 1.5], ["s2", "טחינה מוכנה", "איולי ורטבים", 4, "tahini", 1.6, 3.4, 2],
    ["s3", "רוטב שמנת פטריות", "איולי ורטבים", 4, "cream", 2.4, 3.0, 1], ["s4", "פסטו עשבים", "איולי ורטבים", 4, "oil", 1.2, 2.0, 1],
    ["s5", "ויניגרט לימון", "איולי ורטבים", 14, "lemon", 1.8, 2.8, 0.7],
    ["k1", "בצל מקורמל", "בישולים", 6, "onion", 6.5, 2.2, 1], ["k2", "חצילים קלויים", "בישולים", 4, "eggp", 4.5, 2.6, 1.2],
    ["k3", "קונפי שום", "בישולים", 7, "garlic", 1.8, 2.5, 0.5], ["k4", "ריגטוני מבושל", "בישולים", 3, "pasta", 1.4, 3.0, 2],
    ["k5", "סלמון מנוקה בפורציות", "בישולים", 2, "salmon", 2.6, 2.3, 1], ["k6", "חמאת עשבים", "בישולים", 10, "butter", 2.0, 2.1, 0.5],
    ["d1", "בצק פוקאצ׳ה", "יבשים ושימורים", 2, "flour", 2.4, 3.6, 1.5], ["d2", "אגוזי מלך קלויים", "יבשים ושימורים", 30, "nuts", 1.0, 0.95, 0.3],
  ];
  const items = {};
  /* עלות לק״ג של כל הכנה מוכנה (חומר גלם אחרי קילוף ופחת עיבוד), כמו שמנהל מילא בכרטיס ההכנה */
  const PPK = { v1: 46, v2: 17, v3: 55, v4: 44, v5: 12, v6: 41, v7: 38, v8: 102, v9: 64, c1: 177, c2: 67, s1: 32, s2: 26, s3: 49, s4: 90, s5: 29, k1: 44, k2: 29, k3: 65, k4: 13, k5: 130, k6: 81, d1: 10, d2: 93 };
  P.forEach(([k, n, c, d, raw, kpb, kg], i) => { items[k] = { n, c, d, pos: i, active: true, kg, ppk: PPK[k] }; });
  store["catalog/items"] = { items };

  /* ---------- ימי פעילות: 30 יום אחורה ---------- */
  const start = addD(TODAY, -30), days = [];
  let NEXT = addD(TODAY, 1); while (OFFD.includes(NEXT.getDay())) NEXT = addD(NEXT, 1); // המשלוח הבא
  for (let d = start; d <= NEXT; d = addD(d, 1)) if (!OFFD.includes(d.getDay())) days.push(d);
  const W = (d) => ({ 0: 0.95, 1: 0.85, 2: 0.9, 3: 1.05, 4: 1.35 })[d.getDay()] || 1; // חמישי עמוס
  const cooks = [U.cook.name, U.cook2.name], prods = [U.prod.name, U.prod2.name];
  const used = {}; // kg raw per raw key, per day (for receipts)
  const mizoStart = 12; // מהיום ה-12 מיזו מציע כמויות → פחות ייצור יתר
  let boxesTot = 0, wasteKgEarly = 0, wasteKgLate = 0, buyKgEarly = 0, buyKgLate = 0;
  days.forEach((d, di) => {
    const k = dk(d), past = d < TODAY, isToday = k === dk(TODAY), tomorrow = k === dk(NEXT);
    const over = di < mizoStart ? 1.22 : 1.04; // הזמנת יתר לפני שהתחילו לעבוד עם ההצעה
    const q = {};
    P.forEach(([key, , , , , , , avg]) => { const v = Math.round(avg * W(d) * over * (0.8 + rnd() * 0.45)); if (v > 0) q[key] = v; });
    if (tomorrow) { // ההזמנה הבאה: נשלחה ומחכה לאישור של מטבח הייצור
      const sAt = NOW.getTime() - 40 * 60000, who = U.cook2.name;
      store["orders/" + k] = { date: k, items: q, sent: q, status: "pending", rev: 1, isChange: false, changeCount: 0, sentAt: sAt, firstSentAt: sAt, sentBy: who, late: false, updatedAt: sAt, updatedBy: who, log: [{ t: "sent", by: who, at: sAt, n: Object.values(q).reduce((a, b) => a + b, 0) }] };
      return;
    }
    const sentAt = at(addD(d, -1), 13 + Math.floor(rnd() * 3), Math.floor(rnd() * 59)), late = rnd() < (di < mizoStart ? 0.22 : 0.06);
    const sentAtL = late ? at(addD(d, -1), 16, 10 + Math.floor(rnd() * 40)) : sentAt;
    const who = pick(cooks), pr = pick(prods), chg = rnd() < 0.2 ? 1 : 0;
    const o = { date: k, items: q, sent: q, status: "pending", rev: 1 + chg, isChange: false, changeCount: chg, sentAt: sentAtL, firstSentAt: sentAtL, sentBy: who, late, updatedAt: sentAtL, updatedBy: who,
      log: [{ t: "sent", by: who, at: sentAtL, n: Object.values(q).reduce((a, b) => a + b, 0) }] };
    if (isToday) { store["orders/" + k] = Object.assign(o, { status: "approved", approved: q, approvedAt: sentAtL + 35 * 60000, approvedBy: pr, approvedRev: o.rev, adjusted: [] }); }
    else {
      Object.assign(o, { status: "approved", approved: q, approvedAt: sentAtL + (20 + Math.floor(rnd() * 50)) * 60000, approvedBy: pr, approvedRev: o.rev, adjusted: [] });
      o.log.push({ t: "approved", by: pr, at: o.approvedAt, d: [], c: 0 });
      const shortK = rnd() < 0.25 ? pick(Object.keys(q)) : null;
      o.received = { at: at(d, 11, 20 + Math.floor(rnd() * 30)), by: who, missing: {}, v: 2 };
      store["orders/" + k] = o;
    }
    // ייצור
    const pit = {}; let doneAt = at(d, 9, 10);
    Object.entries(q).forEach(([key, v], j) => {
      if (!past && !isToday) return;
      const t = at(d, 8, 0) + (j + 1) * (11 + rnd() * 6) * 60000; doneAt = Math.max(doneAt, t);
      const finish = isToday ? (j < Object.keys(q).length * 0.6) : true; if (!finish) return;
      const short = past && rnd() < 0.008 ? 1 : 0;
      pit[key] = { done: true, forQty: v, made: v - short, at: t, by: pick(prods) }; if (short) Object.assign(pit[key], { short, shortNote: "לא הגיע מספיק מהספק" });
      boxesTot += v;
    });
    store["production/" + k] = { items: pit, date: k };
    // שימוש בחומר גלם
    Object.entries(q).forEach(([key, v]) => { const p = P.find((x) => x[0] === key); used[p[4]] = (used[p[4]] || 0) + v * p[5]; });
    // סועדים ומכירות (מטאביט / דוח Z)
    if (past) {
      const covers = Math.round(92 * W(d) * (0.88 + rnd() * 0.24)), check = 158 + rnd() * 18;
      store["days/" + k] = { date: k, covers, salesTotal: Math.round(covers * check), weather: { max: Math.round(19 + rnd() * 7), rain: rnd() < 0.15 ? 3 : 0 } };
    }
    // פחת: מסעדה שעובדת נכון רושמת כל ערב מה נזרק (לפני מיזו יותר, כי הזמינו יותר)
    if (past) { const nW = di < mizoStart ? (rnd() < 0.7 ? 1 : 0) : (rnd() < 0.35 ? 1 : 0);
      for (let j = 0; j < nW; j++) { const key = pick(["v1", "v2", "v7", "v8", "v9", "v3", "k5", "s3"].filter((x) => q[x])) || pick(Object.keys(q)); if (!key) continue;
        store[`waste/w${di}_${j}`] = { k: key, n: items[key].n, qty: di < mizoStart && rnd() < 0.5 ? 1 : 0.5, reason: pick(["פג תוקף", "פג תוקף", "איכות", "נשאר מהסרוויס"]), day: k, at: at(d, 22, 10 + j * 3), by: who }; } }
  });

  /* ---------- תמונות: קבלה ודוח קופה מצוירים בדפדפן (אין תמונות אמיתיות בדמו) ---------- */
  const IMG = {};
  function paper(title, lines, w, h, z) {
    try {
      const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"), sc = w / 600;
      x.fillStyle = "#6E6A62"; x.fillRect(0, 0, w, h);
      x.save(); x.translate(w / 2, h / 2); x.rotate(-0.025); x.fillStyle = "#FBFAF6"; x.fillRect(-w * 0.38, -h * 0.44, w * 0.76, h * 0.88); x.restore();
      x.fillStyle = "#1F1D1A"; x.direction = "rtl"; x.textAlign = "center"; x.font = `700 ${30 * sc}px Arial`; x.fillText(title, w / 2, 120 * sc);
      x.font = `${18 * sc}px Arial`; x.fillStyle = "#555"; x.fillText(z ? "דוח Z · סיכום יום" : "חשבונית מס / תעודת משלוח", w / 2, 155 * sc);
      x.textAlign = "right"; x.font = `${20 * sc}px Arial`; x.fillStyle = "#222";
      lines.slice(0, 9).forEach((l, i) => { const y = (205 + i * 40) * sc; x.fillText(l[0], w * 0.82, y); x.textAlign = "left"; x.fillText(l[1], w * 0.18, y); x.textAlign = "right"; x.fillStyle = "#DDD"; x.fillRect(w * 0.18, y + 12 * sc, w * 0.64, 1); x.fillStyle = "#222"; });
      x.font = `700 ${24 * sc}px Arial`; x.textAlign = "right"; x.fillText("סה״כ", w * 0.82, h * 0.86); x.textAlign = "left"; x.fillText(lines.total || "", w * 0.18, h * 0.86);
      return c.toDataURL("image/jpeg", 0.72);
    } catch (e) { return ""; }
  }
  /* לכל קבלה תמונה משלה. התמונה הגדולה נוצרת רק כשפותחים אותה */
  const PH = {}; window.__DEMO_IMG = (id) => { const x = PH[id]; return x ? paper(x[0], x[1], 600, 820, x[2]) : ""; };
  const photoOf = (id, key, title, lines, z) => { PH[id] = [title, lines, z]; return paper(title, lines, 220, 300, z); };

  /* ---------- קבלות: מה שנקנה = מה שנוצל + פחת (יותר פחת לפני מיזו) ---------- */
  const priceOf = (rk, d) => {
    let p = RAW[rk][2];
    if (rk === "tom") { const n = (d - start) / 86400000; if (n >= 8 && n < 13) p = 29; else if (n >= 13) p = 23; } // עלייה ← התראה ← ספק חלופי
    if (rk === "cuc" && (d - start) / 86400000 >= 18) p = 7;
    return p;
  };
  const supOf = (rk, d) => (rk === "tom" && (d - start) / 86400000 >= 13 ? "veg2" : RAW[rk][1]);
  const buyDays = days.filter((d) => d < TODAY && [0, 2, 4].includes(d.getDay())); // ספקים מגיעים א׳, ג׳, ה׳
  const totalUse = {}; Object.keys(used).forEach((rk) => (totalUse[rk] = used[rk]));
  const receipts = [];
  buyDays.forEach((d, bi) => {
    const early = (d - start) / 86400000 < mizoStart, waste = early ? 0.25 : 0.08;
    const bySup = {};
    Object.keys(RAW).forEach((rk) => {
      const kg = round(((totalUse[rk] || 0) / buyDays.length) * (1 + waste) * (rk === "salmon" ? 0.82 + rnd() * 0.36 : 0.9 + rnd() * 0.2), 10); if (!(kg > 0.3)) return;
      if (early) { wasteKgEarly += kg * waste / (1 + waste); buyKgEarly += kg; } else { wasteKgLate += kg * waste / (1 + waste); buyKgLate += kg; }
      const s = supOf(rk, d), unitPrice = priceOf(rk, d), [name] = RAW[rk];
      const line = rk === "cuc" ? { name, qty: Math.max(1, Math.round(kg / 10)), unit: "ארגז", unitPrice: unitPrice * 10, total: Math.round(Math.max(1, Math.round(kg / 10)) * unitPrice * 10) }
        : { name, qty: Math.round(kg * 10) / 10, unit: "ק״ג", unitPrice, total: Math.round(kg * unitPrice) };
      (bySup[s] = bySup[s] || []).push(line);
    });
    Object.entries(bySup).forEach(([s, lines], j) => {
      const total = lines.reduce((a, x) => a + x.total, 0), cat = RAW[Object.keys(RAW).find((rk) => RAW[rk][0] === lines[0].name)][3];
      const id = `r${bi}_${j}`, day = dk(d);
      const lns = lines.map((l) => [l.name, `${l.qty} ${l.unit}`]); lns.total = "₪" + total.toLocaleString("en-US");
      store["photos/" + id] = { kind: "r", day, sup: SUP[s], amt: total, cat, ai: "done", aiAt: at(d, 9, 40), at: at(d, 9, 30 + j), by: pick(cooks), note: "", thumb: photoOf(id, s, SUP[s], lns),
        aiData: { supplier: SUP[s], date: day, total, category: cat, items: lines } };
      receipts.push({ id, day, sup: SUP[s], total, lines });
    });
  });
  /* רכש לליין (בשר, דגים, חלבי, לחמים) שלא עובר דרך מטבח הייצור: משלים ל-Food cost מציאותי.
     לפני מיזו ~33.5%, אחרי ~29.8% (פחות קנייה "ליתר ביטחון" ומחיר טוב יותר) */
  const salesOf = (a, b) => Object.entries(store).filter(([k, v]) => k.startsWith("days/") && k.slice(5) >= a && k.slice(5) < b).reduce((x, [, v]) => x + v.salesTotal, 0);
  const foodOf = (a, b) => receipts.filter((r) => r.day >= a && r.day < b).reduce((x, r) => x + r.total, 0);
  const cut = dk(addD(start, mizoStart)), endK = dk(TODAY), startK = dk(start);
  /* רכש לליין: מה שלא עובר דרך מטבח הייצור (סלמון לצריבה, חלב וגבינות לליין, לחם, שמן) */
  const LINE = [["פילה סלמון טרי", 94, "ק״ג", "meat"], ["חלב 3%", 6.4, "ליטר", "dairy"], ["גבינת עיזים", 68, "ק״ג", "dairy"], ["ביצים L", 38, "תבנית", "dairy"], ["לחם מחמצת", 18, "ק״ג", "dry"], ["שמן זית כתית", 36, "ליטר", "dry"], ["קפה פולים", 92, "ק״ג", "dry"]];
  const SH = [0.3, 0.12, 0.2, 0.09, 0.14, 0.1, 0.05];
  [[startK, cut, 0.335], [cut, endK, 0.298]].forEach(([a, b, fc], pi) => {
    const need = salesOf(a, b) * fc - foodOf(a, b), bd = buyDays.filter((d) => dk(d) >= a && dk(d) < b);
    if (!(need > 0) || !bd.length) return;
    bd.forEach((d, i) => {
      const amt = need / bd.length, lines = []; let left = amt;
      const amtV = amt * (0.86 + rnd() * 0.28); // כל משלוח בסכום אחר
      LINE.forEach(([name, ppk, unit, sk], j) => { const share = amtV * SH[j] * (0.85 + rnd() * 0.3); const qty = unit === "תבנית" ? Math.max(1, Math.round(share / ppk)) : Math.max(0.5, Math.round((share / ppk) * 10) / 10); lines.push({ name, qty, unit, unitPrice: ppk, total: Math.round(qty * ppk), sk }); });
      const groups = { meat: lines.filter((l) => l.sk === "meat"), dairy: lines.filter((l) => l.sk === "dairy"), dry: lines.filter((l) => l.sk === "dry") };
      Object.entries(groups).forEach(([sk, ls0]) => { const ls = ls0.map(({ sk: _s, ...x }) => x), total = ls.reduce((x, l) => x + l.total, 0); if (!total) return; const id = `l${pi}_${i}_${sk}`, day = dk(d), cat = sk === "meat" ? "בשר ודגים" : sk === "dairy" ? "חלבי" : "יבש";
        const lns = ls.map((l) => [l.name, `${l.qty} ${l.unit}`]); lns.total = "₪" + total.toLocaleString("en-US");
        store["photos/" + id] = { kind: "r", day, sup: SUP[sk], amt: total, cat, ai: "done", aiAt: at(d, 10, 5), at: at(d, 10, 0), by: pick(cooks), note: "", thumb: photoOf(id, "l" + sk, SUP[sk], lns), aiData: { supplier: SUP[sk], date: day, total, category: cat, items: ls } };
        receipts.push({ id, day, sup: SUP[sk], total, lines: ls }); });
    });
  });
  const fcE = Math.round((foodOf(startK, cut) / Math.max(1, salesOf(startK, cut))) * 1000) / 10, fcL = Math.round((foodOf(cut, endK) / Math.max(1, salesOf(cut, endK))) * 1000) / 10;
  // כמה דוחות Z מצולמים
  days.filter((d) => d < TODAY).forEach((d, i) => { const k = dk(d), D = store["days/" + k]; if (!D) return;
    const zl = [["סועדים", String(D.covers)], ["מכירות ברוטו", "₪" + D.salesTotal.toLocaleString("en-US")], ["ממוצע לסועד", "₪" + Math.round(D.salesTotal / D.covers)]]; zl.total = "₪" + D.salesTotal.toLocaleString("en-US");
    store[`photos/z${i}`] = { kind: "z", day: k, ai: "done", at: at(d, 23, 40), by: U.chef.name, note: "", thumb: photoOf(`z${i}`, "z", "בית לבנה", zl, true), aiData: { date: k, covers: D.covers, total: D.salesTotal, items: [] } }; });

  /* ---------- חודש: טאביט, עובדים, ניתוחים ---------- */
  const M = ym(TODAY), salesM = Object.entries(store).filter(([k]) => k.startsWith("days/" + M)).reduce((a, [, v]) => a + v.salesTotal, 0);
  const coversM = Object.entries(store).filter(([k]) => k.startsWith("days/" + M)).reduce((a, [, v]) => a + v.covers, 0);
  const laborM = Math.round(salesM * 0.29);
  store["months/" + M] = { labor: null, tabit: { sales: salesM, covers: coversM, at: NOW.getTime() - 3 * 3600000 },
    laborTabit: { cost: laborM, hours: Math.round(laborM / 58), ot: 96, staff: 14, tips: Math.round(coversM * 7.5), hol: 0, byRole: { "טבחים": Math.round(laborM * 0.46), "מלצרים": Math.round(laborM * 0.34), "שטיפה": Math.round(laborM * 0.1), "ניהול": Math.round(laborM * 0.1) }, at: NOW.getTime() - 3 * 3600000 },
    laborAI: { state: "done", at: NOW.getTime() - 3 * 3600000, headline: "עלות העובדים 29% מהמכירות, נקודה אחת מעל היעד",
      points: [`שעה ממוצעת ₪58`, "96 שעות נוספות, רובן בחמישי", "חמישי הוא היום הכי יקר בעובדים, וגם הכי רווחי"],
      actions: [{ title: "להקדים משמרת טבח שנייה בחמישי בשעה", saving: "₪1,400 לחודש" }] } };
  store["uploads/tb1"] = { kind: "tabit", ym: M, ai: "done", at: NOW.getTime() - 3 * 3600000, name: `tabit-${M}.xlsx` };
  store["uploads/tb2"] = { kind: "labor", ym: M, ai: "done", at: NOW.getTime() - 3 * 3600000, name: `tabit-hours-${M}.xlsx` };

  /* ---------- מאזן חומרי גלם (מה שClaude מתאים בלילה) ---------- */
  const map = {}; P.forEach(([k, , , d, rk, kpb]) => { if (!map[k]) map[k] = Object.assign({ raw: [RAW[rk][0]], kpb, life: rk === "nuts" ? 30 : rk === "parm" ? 20 : Math.max(3, d + 1) }, rk === "oil" ? { line: true } : {}); });
  store["insights/balance"] = { day: dk(TODAY), at: NOW.getTime() - 14 * 3600000, map, units: { "מלפפון": 10 } };

  /* ---------- מנות ---------- */
  const DISH = [
    ["סלט עגבניות שרי ובולגרית", 58, [["עגבניות שרי חצויות", 160], ["בולגרית מפוררת", 60], ["עשבים קצוצים", 10], ["ויניגרט לימון", 35], ["בצל קצוץ", 20]]],
    ["ריגטוני שמנת פטריות", 72, [["ריגטוני מבושל", 300], ["רוטב שמנת פטריות", 200], ["פטריות פרוסות", 80], ["פרמז׳ן מגורד", 25], ["שאלוט פרוס דק", 20]]],
    ["סלמון צרוב, תרד וחמאת עשבים", 118, [["סלמון מנוקה בפורציות", 180], ["תרד בייבי שטוף", 60], ["חמאת עשבים", 30], ["קונפי שום", 15]]],
    ["פוקאצ׳ה ואיולי שום", 34, [["בצק פוקאצ׳ה", 200], ["איולי שום", 50], ["קונפי שום", 20]]],
    ["חציל קלוי, טחינה ואגוזים", 52, [["חצילים קלויים", 260], ["טחינה מוכנה", 80], ["אגוזי מלך קלויים", 20], ["עשבים קצוצים", 8]]],
    ["סלט ירוק", 44, [["חסה שטופה", 140], ["מלפפון בקוביות", 80], ["ויניגרט לימון", 30], ["עשבים קצוצים", 8], ["אגוזי מלך קלויים", 10]]],
    ["פסטה פסטו ופרמז׳ן", 64, [["ריגטוני מבושל", 280], ["פסטו עשבים", 80], ["פרמז׳ן מגורד", 25], ["עגבניות שרי חצויות", 50]]],
    ["פלפלים קלויים ובולגרית", 54, [["פלפל קלוי ומקולף", 180], ["בולגרית מפוררת", 45], ["פסטו עשבים", 25], ["בצל מקורמל", 30]]],
  ];
  const byN = {}; Object.entries(items).forEach(([k, it]) => (byN[it.n] = k));
  DISH.forEach(([n, price, comps], i) => {
    const ws = []; for (let j = 0; j < 6; j++) ws.push({ g: Math.round(comps.reduce((a, c) => a + c[1], 0) * (0.94 + rnd() * 0.14)), at: at(addD(TODAY, -20 + j * 3), 20, 15), by: pick(cooks) });
    store["dishes/m" + i] = { n, price, comps: comps.map(([cn, g]) => ({ n: cn, q: g, u: "גרם", k: byN[cn] })), notes: "", weighings: ws, createdAt: at(addD(TODAY, -26), 12), updatedAt: at(addD(TODAY, -3), 12), updatedBy: U.chef.name };
  });

  /* ---------- מתכונים ---------- */
  store["recipes/r1"] = { n: "רוטב שמנת פטריות", cat: "רטבים", yq: 3, yu: "ק״ג", min: 35, ings: [{ n: "פטריות שמפיניון", q: 1.2, u: "ק״ג" }, { n: "שמנת מתוקה 38%", q: 1.5, u: "ליטר" }, { n: "שאלוט", q: 200, u: "גרם" }, { n: "חמאה", q: 120, u: "גרם" }, { n: "מלח", q: 25, u: "גרם" }], steps: "להמיס חמאה ולהזהיב שאלוט\nלהוסיף פטריות ולצמצם נוזלים\nלהוסיף שמנת ולבשל 12 דקות על אש נמוכה\nלתבל ולצנן מהר", notes: "תוקף 4 ימים בקירור", updatedAt: at(addD(TODAY, -10), 11), updatedBy: U.chef.name };
  store["recipes/r2"] = { n: "פסטו עשבים", cat: "רטבים", yq: 2, yu: "ק״ג", min: 15, ings: [{ n: "עשבי תיבול מעורב", q: 600, u: "גרם" }, { n: "שמן זית", q: 900, u: "מ״ל" }, { n: "אגוזי מלך", q: 200, u: "גרם" }, { n: "פרמז׳ן", q: 250, u: "גרם" }, { n: "שום קלוף", q: 40, u: "גרם" }], steps: "לטחון עשבים עם שום ואגוזים\nלהוסיף שמן בהדרגה\nלקפל פנימה פרמז׳ן", notes: "", updatedAt: at(addD(TODAY, -6), 11), updatedBy: U.prod.name };
  store["recipes/r3"] = { n: "בצק פוקאצ׳ה", cat: "בצקים", yq: 6, yu: "ק״ג", min: 25, ings: [{ n: "קמח 00", q: 3.5, u: "ק״ג" }, { n: "מים", q: 2.6, u: "ליטר" }, { n: "שמרים", q: 25, u: "גרם" }, { n: "מלח", q: 70, u: "גרם" }, { n: "שמן זית", q: 150, u: "מ״ל" }], steps: "ללוש 8 דקות\nלהתפיח בקירור 24 שעות\nלחלק לתבניות", notes: "", updatedAt: at(addD(TODAY, -15), 11), updatedBy: U.chef.name };

  /* ---------- חיסכון: מה שמיזו מצא החודש ---------- */
  const tomKgLate = receipts.filter((r) => r.day >= dk(addD(start, 13))).reduce((a, r) => a + r.lines.filter((x) => x.name === "עגבניות שרי").reduce((b, x) => b + x.qty, 0), 0);
  const avgPpk = Object.values(RAW).reduce((a, r) => a + r[2], 0) / Object.keys(RAW).length;
  const daysEarly = mizoStart, daysLate = Math.max(1, days.length - mizoStart);
  const wasteMonthEarly = (wasteKgEarly / daysEarly) * 22 * 17, wasteMonthLate = (wasteKgLate / daysLate) * 22 * 17; // ₪17 לק״ג ממוצע משוקלל
  const wE = 22, wL = 4; // ייצור יתר: הזמנו 22% מעל הצריכה לפני מיזו, 4% אחרי
  const boxCost = P.reduce((a, p) => a + p[5] * RAW[p[4]][2], 0) / P.length, boxesDay = P.reduce((a, p) => a + p[7], 0);
  const overSave = boxesDay * ((wE - wL) / 100) * boxCost * 0.3 * 22; // כ-30% מייצור היתר נזרק
  const prepSpendLate = receipts.filter((r) => r.day >= cut && /^r/.test(r.id)).reduce((a, r) => a + r.total, 0);
  const SAVE = {
    waste: Math.round((prepSpendLate * ((0.25 - 0.08) / 1.25) * 0.3) / 10) * 10, // קנייה עודפת שנחסכה; כ-30% ממנה היה הולך לפח, השאר נכנס למלאי
    tomato: Math.round(((29 - 23) * tomKgLate) / 10) * 10, // מה שנקנה במחיר החדש, מול המחיר אחרי ההתייקרות
    dish: 1150, labor: 1400,
  };
  SAVE.total = SAVE.waste + SAVE.tomato + SAVE.dish + SAVE.labor;
  const foodM = receipts.filter((r) => r.day.startsWith(M)).reduce((a, r) => a + r.total, 0);
  const fcEarly = fcE, fcLate = fcL;
  const from30 = dk(addD(TODAY, -29)), apr = Object.entries(store).filter(([k, v]) => k.startsWith("orders/") && k.slice(7) >= from30 && k.slice(7) <= dk(TODAY) && v.status === "approved");
  const nOrders = apr.length, nBoxes = apr.reduce((a, [, v]) => a + Object.values(v.approved).reduce((x, y) => x + y, 0), 0);
  const recM = receipts.filter((r) => r.day.startsWith(M)).length, fcM = Math.round((foodM / Math.max(1, salesM)) * 1000) / 10;
  window.__DEMO_STATS = { wE, wL, fcM, nOrders, nBoxes, name: "בית לבנה", save: SAVE, boxes: nBoxes, covers: coversM, sales: salesM, receipts: recM, fcEarly, fcLate, dishes: DISH.length, preps: P.length };
  const ils = (v) => "₪" + Math.round(v).toLocaleString("en-US");

  /* ---------- מספרים לשבוע האחרון, מהנתונים עצמם ---------- */
  const wkEnd = addD(TODAY, -TODAY.getDay() - 1), wkFrom = dk(addD(wkEnd, -6)), wkTo = dk(wkEnd), wkO = Object.entries(store).filter(([k]) => k.startsWith("orders/") && k.slice(7) >= wkFrom && k.slice(7) <= wkTo).map(([k, v]) => [k.slice(7), Object.values(v.approved || {}).reduce((a, b) => a + b, 0)]);
  const wkBoxes = wkO.reduce((a, x) => a + x[1], 0), wkBusy = wkO.slice().sort((a, b) => b[1] - a[1])[0] || ["", 0];
  const wkWaste = Object.entries(store).filter(([k, v]) => k.startsWith("waste/") && v.day >= wkFrom && v.day <= wkTo).reduce((a, [, v]) => a + v.qty, 0), wkWp = wkBoxes ? Math.round((wkWaste / wkBoxes) * 1000) / 10 : 0;
  const DNH = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"], busyName = wkBusy[0] ? DNH[new Date(wkBusy[0] + "T12:00").getDay()] : "חמישי";
  const todayO = store["orders/" + dk(TODAY)], todayBoxes = todayO ? Object.values(todayO.approved || {}).reduce((a, b) => a + b, 0) : 0;
  const wkW = Object.values(store).filter((v) => v && v.reason && v.day >= wkFrom && v.day <= wkTo), topW = {}; wkW.forEach((w) => (topW[w.n] = (topW[w.n] || 0) + w.qty));
  const topWn = Object.entries(topW).sort((a, b) => b[1] - a[1])[0];
  window.__DEMO_STATS.wk = { boxes: wkBoxes, wastePct: wkWp, waste: wkWaste, top: topWn ? `${topWn[0]} (${topWn[1] === 0.5 ? "חצי קופסה" : topWn[1] === 1 ? "קופסה אחת" : topWn[1] + " קופסאות"})` : "" };
  /* ---------- דוחות של Claude ---------- */
  const wk = (a, b) => `${dk(addD(TODAY, a)).slice(8)}/${dk(addD(TODAY, a)).slice(5, 7)}–${dk(addD(TODAY, b)).slice(8)}/${dk(addD(TODAY, b)).slice(5, 7)}`;
  store["reports/monthly-" + M] = { v: 2, kind: "monthly", title: `דוח חודשי · ${M.slice(5)}/${M.slice(0, 4)}`, headline: `חודש ראשון עם מיזו: חיסכון של ${ils(SAVE.total)} בחודש`, from: dk(start), to: dk(addD(TODAY, -1)), at: NOW.getTime() - 2 * 3600000,
    kpis: [{ label: "Food cost", v: fcM + "%", d: Math.round((fcLate - fcEarly) * 10) / 10, unit: "נק׳", good: true }, { label: "ייצור יתר", v: wL + "%", d: Math.round((wL - wE) * 10) / 10, unit: "נק׳", good: true }, { label: "מוכן בזמן", v: "100%", d: 9, unit: "נק׳", good: true }, { label: "חיסכון", v: ils(SAVE.total), d: null, unit: "", good: true }],
    ai: { headline: `חודש ראשון עם מיזו: חיסכון של ${ils(SAVE.total)} בחודש`,
      summary: [`${nBoxes} קופסאות ב-${nOrders} ימי משלוח. ${coversM.toLocaleString("en-US")} סועדים, מכירות ${ils(salesM)}.`, `ייצור היתר ירד מ-${wE}% ל-${wL}% מאז שמטבח הייצור עובד לפי הכמויות שמיזו מציע.`, `Food cost לכל החודש ${fcM}%. בשבועיים האחרונים ${fcLate}%, לעומת ${fcEarly}% לפני מיזו.`],
      alerts: [{ title: "עגבניות שרי התייקרו ב-21%", detail: `מ-₪24 ל-₪29 לק״ג אצל ${SUP.veg}. עברתם ל${SUP.veg2} ב-₪23.`, level: "high", impact: `${ils(SAVE.tomato)} לחודש` },
        { title: "ריגטוני שמנת פטריות במכפיל 2.6", detail: "מתחת ליעד 3. העלאה של ₪11 במחיר (ל-₪83), או 65 גר׳ פחות רוטב, מחזירה ל-3.", level: "medium", impact: `${ils(SAVE.dish)} לחודש` },
        { title: "מלפפון עלה ל-₪7 לק״ג", detail: "עלייה של 8% מאמצע החודש. לעקוב.", level: "low", impact: "" }],
      actions: [{ title: "להמשיך לעבוד לפי הצעת הכמויות", detail: "ייצור היתר ירד מ-22% ל-4%. לא לחזור להזמנות \"ליתר ביטחון\".", saving: `${ils(SAVE.waste)} לחודש`, who: "מטבח ייצור" },
        { title: "לתמחר מחדש ריגטוני שמנת פטריות", detail: "מ-₪72 ל-₪83, או 135 גר׳ רוטב במקום 200.", saving: `${ils(SAVE.dish)} לחודש`, who: "שף" },
        { title: "להקדים משמרת טבח שנייה בחמישי", detail: "96 שעות נוספות החודש, רובן בחמישי.", saving: `${ils(SAVE.labor)} לחודש`, who: "שף" }],
      forecast: "שבוע הבא צפוי עומס בחמישי (כ-58 קופסאות) ושקט בשני.", check: "משקל מנת סלט שרי: 7% מעל המתכון בשבועיים האחרונים." } };
  store["reports/weekly-last"] = { v: 2, kind: "weekly", title: `דוח שבועי · ${wkFrom.slice(8)}/${wkFrom.slice(5, 7)}–${wkTo.slice(8)}/${wkTo.slice(5, 7)}`, headline: `שבוע יציב: כל המשלוחים בזמן, פחת שנרשם ${wkWp}%`, from: wkFrom, to: wkTo, at: NOW.getTime() - 26 * 3600000,
    kpis: [{ label: "קופסאות", v: String(wkBoxes), d: 3, unit: "%", good: null }, { label: "פחת שנרשם", v: wkWp + "%", d: -0.4, unit: "נק׳", good: true }, { label: "מוכן בזמן", v: "100%", d: 0, unit: "נק׳", good: true }, { label: "רכש", v: ils(foodM / 4.3), d: -6, unit: "%", good: true }],
    ai: { headline: `שבוע יציב: כל המשלוחים בזמן, פחת שנרשם ${wkWp}%`, summary: ["רכש ירד ב-6% מול השבוע הקודם, בעיקר עגבניות שרי במחיר החדש.", `${busyName} היה העמוס: ${wkBusy[1]} קופסאות, והכול יצא עד 15:50.`],
      alerts: topWn ? [{ title: topWn[0], detail: `הכי הרבה פחת השבוע: ${topWn[1] === 0.5 ? "חצי קופסה" : topWn[1] === 1 ? "קופסה אחת" : topWn[1] + " קופסאות"}`, level: "low", impact: "" }] : [], actions: [{ title: "להמשיך להזמין לפי ההצעה", detail: "ההזמנות השבוע היו קרובות לצריכה בפועל.", saving: "", who: "הליין" }], forecast: "", check: "" } };

  /* ---------- מבט על (סיכום Claude) ---------- */
  store["group/b1"] = { kind: "brief", status: "done", at: NOW.getTime() - 50 * 60000, by: U.chef.name,
    short: { good: `ייצור יתר ירד ל־${wL}%, חיסכון ${ils(SAVE.total)}`, watch: "ריגטוני פטריות במכפיל 2.6", todo: "לתמחר מחדש לפני סוף השבוע" },
    long: `## בית לבנה\n- טוב: ייצור היתר ירד מ-${wE}% ל-${wL}% מאז שעובדים לפי הצעת הכמויות.\n- טוב: Food cost בשבועיים האחרונים ${fcLate}%, לעומת ${fcEarly}% לפני מיזו. לכל החודש ${fcM}%.\n- לא טוב: ריגטוני שמנת פטריות במכפיל 2.6.\n- לעשות: להעלות מחיר ב-₪11 (ל-₪83) או להקטין את הרוטב.\n## לסיכום\n- חיסכון החודש: ${ils(SAVE.total)}.\n- להמשיך לצלם כל קבלה. ככה מזהים עליות מחיר ביום שהן קורות.` };
  store["asks/a1"] = { q: "איזו הכנה הכי מבוזבזת החודש?", a: `עגבניות שרי חצויות וחסה: לפני מיזו הוזמנו כ-${wE}% יותר ממה שנצרך, וחלק הלך לפח. בשבועיים האחרונים ${wL}%.\n- להמשיך להזמין לפי ההצעה, במיוחד בימי ראשון ושני.`, status: "done", at: NOW.getTime() - 5 * 3600000 };

  /* ---------- יומן פעולות ---------- */
  const A = [["prod", "הוכן: עגבניות שרי חצויות · 4 קופסאות", U.prod.name, "prod", 25], ["photo", `צילם קבלה · ${receipts[receipts.length - 1].sup} ₪${receipts[receipts.length - 1].total.toLocaleString("en-US")}`, U.cook.name, "rosie", 90], ["order", `שלח הזמנה · ${todayBoxes} קופסאות`, U.cook.name, "rosie", 1290], ["prod", "אישר הזמנה", U.prod.name, "prod", 1250], ["weigh", "שקל מנה · סלט שרי 241 גר׳", U.cook2.name, "rosie", 1500]];
  A.forEach(([t, text, by, role, m], i) => { const a = NOW.getTime() - m * 60000; store["activity/a" + i] = { t, text, by, role, uid: "u" + i, at: a, day: dk(new Date(a)) }; });
  store["credits/c1"] = { sup: SUP.veg, what: "ארגז חסה פגום", amt: 64, reason: "פגום", day: dk(addD(TODAY, -4)), status: "open", at: at(addD(TODAY, -4), 10), by: U.cook.name };

  window.__DEMO_SEED = store;
  window.__DEMO_RAW = { RAW, SUP };
})();
