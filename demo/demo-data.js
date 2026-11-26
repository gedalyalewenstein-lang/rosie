window.__DEMO_FC8={"rosie": {"t": "30.2% ⁦(30–34.9)⁩ · ביטחון בינוני", "n": "30.2% ⁦(30–34.9)⁩", "why": ["פרי השדה: 12 קבלות, בדרך כלל 25", "יום אחד בלי מכירות — הוערך לפי ימים דומים"], "rec8": 173}, "jaco": {"t": "36.9% ⁦(36.7–40)⁩ · ביטחון בינוני", "n": "36.9% ⁦(36.7–40)⁩", "why": ["יום אחד בלי מכירות — הוערך לפי ימים דומים"], "rec8": 184}};
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
  let store = {};
  let ROLE = null; try { ROLE = sessionStorage.getItem("mizo-demo-role"); } catch (e) {}
  let DNAME = "בית לבנה"; try { const _n = (sessionStorage.getItem("mizo-demo-name") || "").replace(/[<>]/g, "").trim(); if (_n) DNAME = _n.slice(0, 24); } catch (e) {} window.__DNAME = DNAME;
  /* כל מסעדה נבנית מאותו מחולל, עם זרע אחר. בעלים של קבוצה רואה שתי מסעדות */
  function gen(NAME, BR) {

  /* ---------- אנשים ---------- */
  const U = {
    chef: { username: "chef", name: "שף איתן", role: "admin", chiefOf: ["rosie", "jaco"] },
    cook: { username: "noa", name: "נועה", role: "rosie" },
    prod: { username: "yossi", name: "יוסי", role: "prod" },
    cook2: { username: "roni", name: "רוני", role: "rosie" },
    prod2: { username: "avi", name: "אבי", role: "prod" },
  };
  Object.entries(U).forEach(([k, u]) => (store["users/u_" + k] = Object.assign({ createdAt: at(addD(TODAY, -45), 10), lang: "he", site: "rosie" }, u)));
  store["settings/app"] = { offDays: OFFD, ai: true, aiStat: { ok: true, at: NOW.getTime() - 20 * 60000 } };

  /* ---------- חומרי גלם וספקים ---------- */
  const SUP = { veg: "ירקות הגליל בע״מ", veg2: "פרי השדה", dairy: "מחלבות הצפון", dry: "מזווה סיטונאות", meat: "דגי הים" };
  // name, supplier, ₪/kg, category
  const RAW = {
    tom: ["עגבניות שרי", "veg", 24, "ירקות"], cuc: ["מלפפון", "veg", 6.5, "ירקות"], mush: ["פטריות שמפיניון", "veg2", 28, "ירקות"],
    pep: ["פלפל אדום", "veg2", 9, "ירקות"], onion: ["בצל יבש", "veg", 4.2, "ירקות"], shal: ["שאלוט", "veg2", 19, "ירקות"],
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
  /* עלות לק״ג = מחיר חומר הגלם × ק״ג גלם לקופסה ÷ ק״ג מוכן בקופסה (תואם לקבלות) */
  P.forEach(([k, n, c, d, raw, kpb, kg], i) => { items[k] = { n, c, d, pos: i, active: true, kg, ppk: RAW[raw] ? Math.round((RAW[raw][2] * kpb / kg) * 10) / 10 : PPK[k] }; });
  store["catalog/items"] = { items };

  /* ---------- ימי פעילות: 30 יום אחורה ---------- */
  const s30 = addD(TODAY, -30), start = addD(TODAY, -100), days = []; /* 100 יום נתונים: 8 שבועות לכרטיס + היסטוריה לכיסוי ספקים */
  let NEXT = addD(TODAY, 1); while (OFFD.includes(NEXT.getDay())) NEXT = addD(NEXT, 1); // המשלוח הבא
  for (let d = start; d <= NEXT; d = addD(d, 1)) if (!OFFD.includes(d.getDay())) days.push(d);
  const W = (d) => ({ 0: 0.95, 1: 0.85, 2: 0.9, 3: 1.05, 4: 1.35 })[d.getDay()] || 1; // חמישי עמוס
  const cooks = [U.cook.name, U.cook2.name], prods = [U.prod.name, U.prod2.name];
  const used = {}; // kg raw per raw key, per day (for receipts)
  const mizoD = addD(s30, 12); // מהיום ה-12 בחודש האחרון מיזו מציעה כמויות → פחות ייצור יתר
  let boxesTot = 0, wasteKgEarly = 0, wasteKgLate = 0, buyKgEarly = 0, buyKgLate = 0;
  days.forEach((d, di) => {
    const k = dk(d), past = d < TODAY, isToday = k === dk(TODAY), tomorrow = k === dk(NEXT);
    const over = d < mizoD ? 1.15 : 1.08; // הזמנת יתר לפני שהתחילו לעבוד עם ההצעה (שיפור צנוע ואמין)
    const q = {};
    P.forEach(([key, , , , , , , avg]) => { const v = Math.round(avg * (BR ? 0.8 : 1) * W(d) * over * (0.8 + rnd() * 0.45)); if (v > 0) q[key] = v; });
    if (tomorrow) { // ההזמנה הבאה: נשלחה ומחכה לאישור של מטבח הייצור
      const sAt = NOW.getTime() - 40 * 60000, who = U.cook2.name;
      store["orders/" + k] = { date: k, items: q, sent: q, status: "pending", rev: 1, isChange: false, changeCount: 0, sentAt: sAt, firstSentAt: sAt, sentBy: who, late: false, updatedAt: sAt, updatedBy: who, log: [{ t: "sent", by: who, at: sAt, n: Object.values(q).reduce((a, b) => a + b, 0) }] };
      return;
    }
    const sentAt = at(addD(d, -1), 13 + Math.floor(rnd() * 3), Math.floor(rnd() * 59)), late = rnd() < (d < mizoD ? 0.22 : 0.06);
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
      const covers = Math.round((BR ? 71 : 92) * W(d) * (0.88 + rnd() * 0.24)), check = (BR ? 144 : 158) + rnd() * 18;
      store["days/" + k] = { date: k, covers, salesTotal: Math.round(covers * check), weather: { max: Math.round(19 + rnd() * 7), rain: rnd() < 0.15 ? 3 : 0 } };
    }
    // פחת: מסעדה שעובדת נכון רושמת כל ערב מה נזרק (לפני מיזו יותר, כי הזמינו יותר)
    if (past) { const nW = d < mizoD ? (rnd() < 0.7 ? 1 : 0) : (rnd() < 0.35 ? 1 : 0);
      for (let j = 0; j < nW; j++) { const key = pick(["v1", "v2", "v7", "v8", "v9", "v3", "k5", "s3"].filter((x) => q[x])) || pick(Object.keys(q)); if (!key) continue;
        store[`waste/w${di}_${j}`] = { k: key, n: items[key].n, qty: d < mizoD && rnd() < 0.5 ? 1 : 0.5, reason: pick(["פג תוקף", "פג תוקף", "איכות", "נשאר מהסרוויס"]), day: k, at: at(d, 22, 10 + j * 3), by: who }; } }
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
    if (rk === "tom") { const n = (d - s30) / 86400000; if (n >= 8 && n < 13) p = 29; else if (n >= 13) p = 23; } // עלייה ← התראה ← ספק חלופי
    if (rk === "cuc" && (d - s30) / 86400000 >= 18) p = 7.3; /* +12% מ-6.5: מעל סף ההתראה (10%) */
    return p;
  };
  const supOf = (rk, d) => (rk === "tom" && (d - s30) / 86400000 >= 13 ? "veg2" : RAW[rk][1]);
  const buyDays = days.filter((d) => d < TODAY && [0, 2, 4].includes(d.getDay())); // ספקים מגיעים א׳, ג׳, ה׳
  const totalUse = {}; Object.keys(used).forEach((rk) => (totalUse[rk] = used[rk]));
  const receipts = [];
  buyDays.forEach((d, bi) => {
    const early = d < mizoD, waste = early ? 0.18 : 0.09;
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
     לפני מיזו ~33%, אחרי ~31.5% (ברוטו) (פחות קנייה "ליתר ביטחון" ומחיר טוב יותר) */
  const salesOf = (a, b) => Object.entries(store).filter(([k, v]) => k.startsWith("days/") && k.slice(5) >= a && k.slice(5) < b).reduce((x, [, v]) => x + v.salesTotal, 0);
  const foodOf = (a, b) => receipts.filter((r) => r.day >= a && r.day < b).reduce((x, r) => x + r.total, 0);
  const cut = dk(mizoD), endK = dk(TODAY), startK = dk(start);
  /* רכש לליין: מה שלא עובר דרך מטבח הייצור (סלמון לצריבה, חלב וגבינות לליין, לחם, שמן) */
  const LINE = [["פילה סלמון טרי", 94, "ק״ג", "meat"], ["חלב 3%", 6.4, "ליטר", "dairy"], ["גבינת עיזים", 68, "ק״ג", "dairy"], ["ביצים L", 38, "תבנית", "dairy"], ["לחם מחמצת", 18, "ק״ג", "dry"], ["שמן זית כתית", 36, "ליטר", "dry"], ["קפה פולים", 92, "ק״ג", "dry"]];
  const SH = [0.3, 0.12, 0.2, 0.09, 0.14, 0.1, 0.05];
  (BR ? [[startK, cut, 0.355], [cut, endK, 0.345]] : [[startK, cut, 0.314], [cut, endK, 0.303]]).forEach(([a, b, fc], pi) => {
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
    store[`photos/z${i}`] = { kind: "z", day: k, ai: "done", at: at(d, 23, 40), by: U.chef.name, note: "", thumb: photoOf(`z${i}`, "z", NAME, zl, true), aiData: { date: k, covers: D.covers, total: D.salesTotal, items: [] } }; });

  /* ---------- חודש: טאביט, עובדים, ניתוחים ---------- */
  const M = ym(TODAY), salesM = Object.entries(store).filter(([k]) => k.startsWith("days/" + M)).reduce((a, [, v]) => a + v.salesTotal, 0);
  const coversM = Object.entries(store).filter(([k]) => k.startsWith("days/" + M)).reduce((a, [, v]) => a + v.covers, 0);
  const laborM = Math.round(salesM * 0.245); // ~29% מהמכירות בלי מע״מ
  store["months/" + M] = { labor: null, tabit: { sales: salesM, covers: coversM, at: NOW.getTime() - 3 * 3600000 },
    laborTabit: { cost: laborM, hours: Math.round(laborM / 58), ot: 96, staff: 14, tips: Math.round(salesM * 0.1), hol: 0, byRole: { "טבחים": Math.round(laborM * 0.46), "מלצרים": Math.round(laborM * 0.34), "שטיפה": Math.round(laborM * 0.1), "ניהול": Math.round(laborM * 0.1) }, at: NOW.getTime() - 3 * 3600000 },
    laborAI: { state: "done", at: NOW.getTime() - 3 * 3600000, headline: "עלות העובדים 29% מהמכירות, נקודה אחת מעל היעד",
      points: [`שעה ממוצעת ₪58`, "96 שעות נוספות, רובן בחמישי", "חמישי הוא היום הכי יקר בעובדים, וגם הכי רווחי"],
      actions: [{ title: "להקדים משמרת טבח שנייה בחמישי בשעה", saving: "" }] } };
  store["uploads/tb1"] = { kind: "tabit", ym: M, ai: "done", at: NOW.getTime() - 3 * 3600000, name: `tabit-${M}.xlsx` };
  store["uploads/tb2"] = { kind: "labor", ym: M, ai: "done", at: NOW.getTime() - 3 * 3600000, name: `tabit-hours-${M}.xlsx` };

  /* ---------- כרטיס העלויות (8 שבועות): מלאי, עובדים לכל חודש, ספק אחד עם קבלות חסרות, יום אחד בלי דוח קופה ---------- */
  const w0 = dk(addD(TODAY, -55)); // תחילת חלון 8 השבועות
  // עלות עובדים לכל חודש שהחלון נוגע בו (חודש מלא: ~24.5% מהמכירות ברוטו). החודש הנוכחי כבר יש בו קובץ שעות
  for (let t = new Date(start.getFullYear(), start.getMonth(), 1); t <= TODAY; t = new Date(t.getFullYear(), t.getMonth() + 1, 1)) {
    const mk = ym(t); if (mk === M) continue;
    const sM = Object.entries(store).filter(([k]) => k.startsWith("days/" + mk)).reduce((a, [, v]) => a + v.salesTotal, 0);
    store["months/" + mk] = Object.assign(store["months/" + mk] || {}, { labor: Math.round(sM * 0.245) });
  }
  // שווי מלאי משוער, פעם בחודש: פתיחה בתחילת החלון וסגירה היום (לפי הקלדה של מנהל)
  const stockV = BR ? [21400, 20900] : [27600, 26800];
  store["months/" + ym(addD(TODAY, -55))] = Object.assign(store["months/" + ym(addD(TODAY, -55))] || {}, { stock: { v: stockV[0], day: w0, by: U.chef.name, at: at(addD(TODAY, -55), 9) } });
  store["months/" + M].stock = { v: stockV[1], day: dk(TODAY), by: U.chef.name, at: at(TODAY, 9) };
  // יום אחד בלי דוח קופה (יום פתוח באמצע החלון): נשאר בלי מכירות, והכרטיס מעריך אותו לפי אותו יום בשבועות הקודמים
  { let dd = addD(TODAY, -(BR ? 22 : 17)); while (OFFD.includes(dd.getDay())) dd = addD(dd, -1);
    const k = dk(dd); delete store["days/" + k]; Object.keys(store).forEach((id) => { if (id.startsWith("photos/z") && store[id].day === k) delete store[id]; }); }
  // ספק אחד עם קבלות חסרות בחלון (לא צולמו): מוחקים חלק מקבלותיו, ומה שנשאר מוצג "N קבלות, בדרך כלל M"
  if (!BR) { const ids = receipts.filter((r) => r.sup === SUP.veg2 && r.day >= w0).map((r) => r.id); ids.forEach((id, i) => { if (i % 2 === 1) { /* חצי מהקבלות: ביטחון בינוני גם עם 8% "לא צולמו" (סבב 4) */ delete store["photos/" + id]; const j = receipts.findIndex((r) => r.id === id); if (j >= 0) receipts.splice(j, 1); } }); }

  /* ---------- מאזן חומרי גלם (מה שClaude מתאים בלילה) ---------- */
  const map = {}; P.forEach(([k, , , d, rk, kpb]) => { if (!map[k]) map[k] = Object.assign({ raw: [RAW[rk][0]], kpb, life: rk === "nuts" ? 30 : rk === "parm" ? 20 : Math.max(3, d + 1) }, rk === "oil" ? { line: true } : {}); });
  store["insights/balance"] = { day: dk(TODAY), at: NOW.getTime() - 14 * 3600000, map, units: { "מלפפון": 10 } };

  /* ---------- מנות ---------- */
  const DISH = [ /* מכפילים 2.9–4.9, פוקאצ׳ה (בצק) גבוה יותר. מנה אחת מתחת ל-3 בכוונה: ככה נראית "דורש תשומת לב" */
    ["סלט עגבניות שרי ובולגרית", 58, [["עגבניות שרי חצויות", 220], ["בולגרית מפוררת", 90], ["עשבים קצוצים", 12], ["ויניגרט לימון", 40], ["בצל קצוץ", 20], ["אגוזי מלך קלויים", 25]]],
    ["ריגטוני שמנת פטריות", 72, [["ריגטוני מבושל", 330], ["רוטב שמנת פטריות", 290], ["פטריות פרוסות", 190], ["פרמז׳ן מגורד", 55], ["שאלוט פרוס דק", 45], ["חמאת עשבים", 40]]],
    ["סלמון צרוב, תרד וחמאת עשבים", 118, [["סלמון מנוקה בפורציות", 240], ["תרד בייבי שטוף", 80], ["חמאת עשבים", 35], ["קונפי שום", 20], ["חצילים קלויים", 120], ["ויניגרט לימון", 20]]],
    ["פוקאצ׳ה ואיולי שום", 34, [["בצק פוקאצ׳ה", 250], ["איולי שום", 70], ["קונפי שום", 40], ["עשבים קצוצים", 8], ["פרמז׳ן מגורד", 15]]],
    ["חציל קלוי, טחינה ואגוזים", 52, [["חצילים קלויים", 300], ["טחינה מוכנה", 90], ["אגוזי מלך קלויים", 35], ["עשבים קצוצים", 12], ["בצק פוקאצ׳ה", 100], ["בולגרית מפוררת", 70]]],
    ["סלט ירוק", 44, [["חסה שטופה", 160], ["מלפפון בקוביות", 90], ["ויניגרט לימון", 35], ["עשבים קצוצים", 15], ["אגוזי מלך קלויים", 30], ["בולגרית מפוררת", 65]]],
    ["פסטה פסטו ופרמז׳ן", 64, [["ריגטוני מבושל", 320], ["פסטו עשבים", 100], ["פרמז׳ן מגורד", 55], ["עגבניות שרי חצויות", 80], ["אגוזי מלך קלויים", 15]]],
    ["פלפלים קלויים ובולגרית", 54, [["פלפל קלוי ומקולף", 200], ["בולגרית מפוררת", 100], ["פסטו עשבים", 60], ["בצל מקורמל", 50], ["בצק פוקאצ׳ה", 80], ["איולי שום", 25]]],
  ];

  const byN = {}; Object.entries(items).forEach(([k, it]) => (byN[it.n] = k));
  DISH.forEach(([n, price, comps], i) => {
    const ws = []; for (let j = 0; j < 6; j++) ws.push({ g: Math.round(comps.reduce((a, c) => a + c[1], 0) * (0.94 + rnd() * 0.14)), at: at(addD(TODAY, -20 + j * 3), 20, 15), by: pick(cooks) });
    store["dishes/m" + i] = { n, price, comps: comps.map(([cn, g]) => ({ n: cn, q: g, u: "גרם", k: byN[cn] })), notes: "", weighings: ws, createdAt: at(addD(TODAY, -26), 12), updatedAt: at(addD(TODAY, -3), 12), updatedBy: U.chef.name };
  });

  /* ---------- מתכונים ---------- */
  store["recipes/r1"] = { n: "רוטב שמנת פטריות", cat: "רטבים", yq: 2, yu: "ק״ג", min: 35, ings: [{ n: "פטריות שמפיניון", q: 1, u: "ק״ג" }, { n: "שמנת מתוקה 38%", q: 1.2, u: "ליטר" }, { n: "שאלוט", q: 150, u: "גרם" }, { n: "חמאה", q: 100, u: "גרם" }, { n: "מלח", q: 20, u: "גרם" }, { n: "פלפל שחור גרוס", q: 4, u: "גרם" }], steps: "להמיס חמאה ולהזהיב שאלוט\nלהוסיף פטריות ולצמצם נוזלים\nלהוסיף שמנת ולבשל 12 דקות על אש נמוכה\nלתבל ולצנן מהר", notes: "תוקף 4 ימים בקירור", updatedAt: at(addD(TODAY, -10), 11), updatedBy: U.chef.name };
  store["recipes/r2"] = { n: "פסטו עשבים", cat: "רטבים", yq: 2, yu: "ק״ג", min: 15, ings: [{ n: "עשבי תיבול מעורב", q: 0.6, u: "ק״ג" }, { n: "שמן זית", q: 0.9, u: "ליטר" }, { n: "אגוזי מלך", q: 200, u: "גרם" }, { n: "פרמז׳ן", q: 250, u: "גרם" }, { n: "שום קלוף", q: 40, u: "גרם" }, { n: "מלח", q: 10, u: "גרם" }], steps: "לטחון עשבים עם שום ואגוזים\nלהוסיף שמן קר בהדרגה ולא לחמם במעבד\nלקפל פנימה פרמז׳ן\nלתבל במלח ולכסות בשכבת שמן דקה", notes: "מעט מלח כי הפרמז׳ן מלוח. תוקף 5 ימים בקירור", updatedAt: at(addD(TODAY, -6), 11), updatedBy: U.prod.name };
  store["recipes/r3"] = { n: "בצק פוקאצ׳ה", cat: "בצקים", yq: 5, yu: "ק״ג", min: 25, ings: [{ n: "קמח 00", q: 2.8, u: "ק״ג" }, { n: "מים", q: 2, u: "ליטר" }, { n: "שמרים טריים", q: 20, u: "גרם" }, { n: "מלח", q: 60, u: "גרם" }, { n: "שמן זית", q: 120, u: "מ״ל" }], steps: "לערבב קמח מים ושמרים\nלהוסיף מלח ושמן וללוש 8 דקות עד בצק חלק\nלהתפיח בקירור 24 שעות\nלחלק לתבניות משומנות ולהתפיח שעה בטמפרטורת חדר", notes: "הידרציה 71% ומלח כ-2% ממשקל הקמח", updatedAt: at(addD(TODAY, -15), 11), updatedBy: U.chef.name };
  store["recipes/r4"] = { n: "איולי שום", cat: "רטבים", yq: 2, yu: "ק״ג", min: 20, ings: [{ n: "מיונז", q: 1.6, u: "ק״ג" }, { n: "שום קונפי", q: 200, u: "גרם" }, { n: "מיץ לימון", q: 60, u: "מ״ל" }, { n: "שמן זית", q: 120, u: "מ״ל" }, { n: "מלח", q: 10, u: "גרם" }], steps: "לרסק שום קונפי למחית חלקה\nלקפל לתוך המיונז עם מיץ הלימון\nלהזרים שמן זית בהדרגה תוך ערבוב עד מרקם אחיד ומבריק\nלתבל לטעום לאיזון חומצה ולצנן", notes: "שום קונפי במקום נא לטעם עגול ולא חריף. המיונז כבר מלוח אז מוסיפים מעט מלח. תוקף 5 ימים בקירור", updatedAt: at(addD(TODAY, -9), 11), updatedBy: U.chef.name };
  store["recipes/r5"] = { n: "טחינה מוכנה", cat: "רטבים", yq: 2, yu: "ק״ג", min: 12, ings: [{ n: "טחינה גולמית", q: 1, u: "ק״ג" }, { n: "מים קרים", q: 0.9, u: "ליטר" }, { n: "מיץ לימון", q: 80, u: "מ״ל" }, { n: "שום כתוש", q: 20, u: "גרם" }, { n: "כמון", q: 4, u: "גרם" }, { n: "מלח", q: 20, u: "גרם" }], steps: "לערבב טחינה גולמית עם מיץ לימון שום וכמון\nלהוסיף מים קרים מעט מעט. התערובת תתפוס ותתקשה ואז תשתחרר\nלהמשיך עד מרקם חלק ונוזלי אחיד\nלתבל במלח ולצנן", notes: "המרקם מתייצב בקירור, לדלל שוב במעט מים לפני שירות. תוקף 4 ימים", updatedAt: at(addD(TODAY, -7), 11), updatedBy: U.prod.name };
  store["recipes/r6"] = { n: "ויניגרט לימון", cat: "רטבים", yq: 2, yu: "ק״ג", min: 10, ings: [{ n: "שמן זית", q: 1.4, u: "ליטר" }, { n: "מיץ לימון", q: 0.5, u: "ליטר" }, { n: "חרדל דיז׳ון", q: 80, u: "גרם" }, { n: "דבש", q: 60, u: "גרם" }, { n: "שאלוט קצוץ", q: 40, u: "גרם" }, { n: "מלח", q: 20, u: "גרם" }], steps: "לערבב מיץ לימון חרדל דבש ושאלוט\nלהזרים שמן זית באיטיות תוך טריפה נמרצת לאמולסיה יציבה\nלתבל ולטעום לאיזון\nלשמור בבקבוק, לנער לפני כל שימוש", notes: "יחס שמן לחומצה בערך 3 ל-1. תוקף 14 יום בקירור", updatedAt: at(addD(TODAY, -12), 11), updatedBy: U.chef.name };
  store["recipes/r7"] = { n: "בצל מקורמל", cat: "בישולים", yq: 2, yu: "ק״ג", min: 75, ings: [{ n: "בצל יבש", q: 6, u: "ק״ג" }, { n: "חמאה", q: 160, u: "גרם" }, { n: "שמן זית", q: 100, u: "מ״ל" }, { n: "חומץ בלסמי", q: 60, u: "מ״ל" }, { n: "מלח", q: 20, u: "גרם" }], steps: "לפרוס בצל דק ואחיד\nלהתחיל על אש בינונית עם חמאה ושמן ולהמליח מוקדם להוצאת נוזלים\nלהנמיך ולבשל כ-60 דקות תוך ערבוב עד זהוב-ענבר עמוק\nלכבות עם בלסמי, לגרד את תחתית הסיר ולצנן", notes: "6 ק״ג בצל יורדים לכ-2 ק״ג מוכן. הצבע מגיע מזמן ולא מאש גבוהה. תוקף 6 ימים", updatedAt: at(addD(TODAY, -8), 11), updatedBy: U.prod.name };
  store["recipes/r8"] = { n: "חצילים קלויים", cat: "בישולים", yq: 2, yu: "ק״ג", min: 45, ings: [{ n: "חציל", q: 3.4, u: "ק״ג" }, { n: "שמן זית", q: 170, u: "מ״ל" }, { n: "שום כתוש", q: 20, u: "גרם" }, { n: "מלח", q: 20, u: "גרם" }], steps: "לחתוך חצילים לפרוסות 2 ס״מ להמליח ולתת לנזול 20 דקות\nלספוג למרוח בשמן ושום ולתבל\nלקלות בתנור 220 מעלות כ-30 דקות עד ריכוך וזהב\nלצנן על רשת לשמירת מרקם", notes: "המלחה מראש מוציאה מרירות ומים. תוקף 4 ימים", updatedAt: at(addD(TODAY, -5), 11), updatedBy: U.cook2.name };
  store["recipes/r9"] = { n: "קונפי שום", cat: "בישולים", yq: 2, yu: "ק״ג", min: 55, ings: [{ n: "שום קלוף", q: 1.2, u: "ק״ג" }, { n: "שמן זית", q: 0.9, u: "ליטר" }, { n: "עלי דפנה", q: 2, u: "יחידה" }, { n: "גרגירי פלפל", q: 4, u: "גרם" }, { n: "מלח", q: 10, u: "גרם" }], steps: "לכסות שום לגמרי בשמן עם דפנה ופלפל\nלבשל על אש נמוכה מאוד סביב 90 מעלות כ-45 דקות עד שהשום רך וצהוב בהיר\nלא להרתיח. בועות עדינות בלבד\nלצנן ולשמור שקוע בשמן", notes: "השמן המסונן מצוין לרטבים ולצלייה. תוקף 7 ימים", updatedAt: at(addD(TODAY, -11), 11), updatedBy: U.chef.name };
  store["recipes/r10"] = { n: "חמאת עשבים", cat: "בישולים", yq: 2, yu: "ק״ג", min: 20, ings: [{ n: "חמאה לא מלוחה", q: 1.8, u: "ק״ג" }, { n: "עשבי תיבול מעורב", q: 140, u: "גרם" }, { n: "שום כתוש", q: 40, u: "גרם" }, { n: "גרידת לימון", q: 2, u: "יחידה" }, { n: "מלח", q: 20, u: "גרם" }], steps: "לרכך חמאה לטמפרטורת חדר\nלקצוץ עשבים ושום דק ולייבש מעודף לחות\nלקפל פנימה עם גרידת לימון ומלח עד פיזור אחיד\nלגלגל בנייר אפייה לגליל ולצנן עד התקשות", notes: "לחתוך דיסקיות קפואות ישר על המנה החמה. תוקף 10 ימים", updatedAt: at(addD(TODAY, -4), 11), updatedBy: U.chef.name };

  /* ---------- מספרי החודש: רק מה שהמוצר באמת מחשב מהנתונים (בלי חיסכון ובלי "לפני מיזו") ---------- */
  const foodM = receipts.filter((r) => r.day.startsWith(M)).reduce((a, r) => a + r.total, 0);
  const from30 = dk(addD(TODAY, -29)), apr = Object.entries(store).filter(([k, v]) => k.startsWith("orders/") && k.slice(7) >= from30 && k.slice(7) <= dk(TODAY) && v.status === "approved");
  const nOrders = apr.length, nBoxes = apr.reduce((a, [, v]) => a + Object.values(v.approved).reduce((x, y) => x + y, 0), 0);
  const recM = receipts.filter((r) => r.day.startsWith(M)).length;
  /* Food cost כמו שהאפליקציה מחשבת (בלי מע״מ, בלי "אחר", ירקות פטורים), כדי שהמספר בדמו ובדף יהיה אותו מספר */
  const foodNet = Object.entries(store).filter(([k, v]) => k.startsWith("photos/") && v.kind === "r" && v.day.startsWith(M) && v.cat !== "אחר").reduce((a, [, v]) => a + (v.cat === "ירקות" ? v.amt : v.amt / 1.18), 0);
  const fcM = Math.round((foodNet / (salesM / 1.18)) * 1000) / 10;
  /* Food cost של כרטיס העלויות (8 שבועות): build.py מריץ את moneyRange של האפליקציה על הנתונים האלה ומזריק את התוצאה, כדי שכל הטקסטים כאן יצטטו את אותו מספר */
  const F8 = (window.__DEMO_FC8 || {})[BR ? "jaco" : "rosie"] || null, fc8 = F8 ? F8.t : `${fcM}%`, fc8L = `Food cost ל-8 שבועות: ${fc8} · יעד 30%`;
  const nShort = Object.entries(store).filter(([k]) => k.startsWith("production/") && k.slice(11) >= from30 && k.slice(11) <= dk(TODAY)).reduce((a, [, v]) => a + Object.values(v.items || {}).filter((x) => x.short > 0).length, 0);
  const costOf = (comps) => comps.reduce((a, [cn, g]) => a + (g / 1000) * items[byN[cn]].ppk, 0);
  const rig = DISH[1], rigCost = costOf(rig[2]), rigMult = Math.round((rig[1] / 1.18 / rigCost) * 10) / 10, rigP3 = Math.ceil((rigCost * 3.2 * 1.18) / 1);
  window.__DEMO_STATS = { fc8: fc8L, fcM, nOrders, nBoxes, name: NAME, boxes: nBoxes, covers: coversM, sales: salesM, receipts: recM, short: nShort, dishes: DISH.length, preps: P.length };
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
  const wkRec = receipts.filter((r) => r.day >= wkFrom && r.day <= wkTo), wkRecTot = wkRec.reduce((a, r) => a + r.total, 0);
  const wTop = {}; Object.values(store).forEach((v) => { if (v && v.reason && v.n) wTop[v.n] = (wTop[v.n] || 0) + v.qty; });
  const wTopN = Object.entries(wTop).sort((a, b) => b[1] - a[1]).slice(0, 2).map((x) => x[0]);
  store["reports/monthly-" + M] = { v: 2, kind: "monthly", title: `דוח חודשי · ${M.slice(5)}/${M.slice(0, 4)}`, headline: fc8L, from: dk(s30), to: dk(addD(TODAY, -1)), at: NOW.getTime() - 2 * 3600000,
    kpis: [{ label: "Food cost · 8 שבועות", v: F8 ? F8.n : fcM + "%", d: null, unit: "", good: null }, { label: "קבלות", v: String(recM), d: null, unit: "", good: null }, { label: "חוסרים", v: String(nShort), d: null, unit: "", good: null }, { label: "מוכן בזמן", v: "100%", d: null, unit: "", good: true }],
    ai: { headline: fc8L,
      summary: [`${nBoxes} קופסאות ב-${nOrders} ימי משלוח. ${coversM.toLocaleString("en-US")} סועדים, מכירות ${ils(salesM)}.`, `${fc8L}.`, `${recM} קבלות נקראו החודש, ו-${nShort} חוסרים סומנו בייצור.`],
      alerts: [{ title: "עגבניות שרי התייקרו ב-21%", detail: `מ-₪24 ל-₪29 לק״ג אצל ${SUP.veg}.`, level: "high", impact: "" },
        { title: `ריגטוני שמנת פטריות במכפיל ${rigMult}`, detail: `מתחת ליעד 3. מחיר של ₪${rigP3} מחזיר למכפיל 3.2, עם מרווח מעל היעד.`, level: "medium", impact: "" },
        { title: "מלפפון עלה ל-₪7.3 לק״ג", detail: "עלייה של 12% מאמצע החודש. לעקוב.", level: "low", impact: "" }],
      actions: [{ title: "לתמחר מחדש ריגטוני שמנת פטריות", detail: `מ-₪72 ל-₪${rigP3}, או פחות רוטב במנה.`, saving: "", who: "שף" },
        { title: "להמשיך לצלם כל קבלה", detail: "ככה עליות מחיר מסומנות כשצולמה הקבלה.", saving: "", who: "הליין" }],
      forecast: "", check: (F8 && F8.why.length ? `מה חסר בחישוב: ${F8.why.join(" · ")}. ` : "") + (wTopN.length ? `הכי הרבה פחת שנרשם: ${wTopN.join(" ו")}.` : "") } };
  store["reports/weekly-last"] = { v: 2, kind: "weekly", title: `דוח שבועי · ${wkFrom.slice(8)}/${wkFrom.slice(5, 7)}–${wkTo.slice(8)}/${wkTo.slice(5, 7)}`, headline: "שבוע יציב: כל המשלוחים בזמן", from: wkFrom, to: wkTo, at: NOW.getTime() - 26 * 3600000,
    kpis: [{ label: "קופסאות", v: String(wkBoxes), d: null, unit: "", good: null }, { label: "קבלות", v: String(wkRec.length), d: null, unit: "", good: null }, { label: "מוכן בזמן", v: "100%", d: null, unit: "", good: true }, { label: "רכש", v: ils(wkRecTot), d: null, unit: "", good: null }],
    ai: { headline: "שבוע יציב: כל המשלוחים בזמן", summary: [`${busyName} היה העמוס: ${wkBusy[1]} קופסאות.`, `${wkRec.length} קבלות נקראו, רכש ${ils(wkRecTot)}.`],
      alerts: [], actions: [{ title: "להמשיך להזמין לפי ההצעה", detail: "ההזמנות השבוע היו קרובות לצריכה בפועל.", saving: "", who: "הליין" }], forecast: "", check: "" } };

  /* ---------- מבט על (סיכום) ---------- */
  store["group/b1"] = { kind: "brief", status: "done", at: NOW.getTime() - 50 * 60000, by: U.chef.name,
    short: { good: fc8L, watch: `ריגטוני פטריות במכפיל ${rigMult}`, todo: "לתמחר מחדש לפני סוף השבוע" },
    long: `## ${NAME}\n- ${fc8L}.\n- ${recM} קבלות נקראו החודש.\n- לא טוב: ריגטוני שמנת פטריות במכפיל ${rigMult}.\n- לעשות: להעלות מחיר ל-₪${rigP3} או להקטין את הרוטב.` };
  store["asks/a1"] = { q: "איזו הכנה הכי מבוזבזת החודש?", a: wTopN.length ? `לפי הפחת שנרשם החודש: ${wTopN.join(" ו")}.\n- כדאי לבדוק את הכמויות שמזמינים להכנות האלה.` : "לא נרשם פחת החודש.", status: "done", at: NOW.getTime() - 5 * 3600000 };

  /* ---------- יומן פעולות ---------- */
  const A = [["prod", "הוכן: עגבניות שרי חצויות · 4 קופסאות", U.prod.name, "prod", 25], ["photo", `צילם קבלה · ${receipts[receipts.length - 1].sup} ₪${receipts[receipts.length - 1].total.toLocaleString("en-US")}`, U.cook.name, "rosie", 90], ["order", `שלח הזמנה · ${todayBoxes} קופסאות`, U.cook.name, "rosie", 1290], ["prod", "אישר הזמנה", U.prod.name, "prod", 1250], ["weigh", "שקל מנה · סלט שרי 241 גר׳", U.cook2.name, "rosie", 1500]];
  A.forEach(([t, text, by, role, m], i) => { const a = NOW.getTime() - m * 60000; store["activity/a" + i] = { t, text, by, role, uid: "u" + i, at: a, day: dk(new Date(a)) }; });
  store["credits/c1"] = { sup: SUP.veg, what: "ארגז חסה פגום", amt: 64, reason: "פגום", day: dk(addD(TODAY, -4)), status: "open", at: at(addD(TODAY, -4), 10), by: U.cook.name };

  return { store, STATS: window.__DEMO_STATS, RAW, SUP };
  }
  const A1 = gen(DNAME, 0), stats1 = A1.STATS; store = A1.store;
  if (ROLE === "group") {
    const keep = store; seed = 20261177; store = {}; const A2 = gen("בית לבנה נמל", 1);
    Object.entries(A2.store).forEach(([k, v]) => { if (/^(users|group|asks)\//.test(k)) return; keep["sites/jaco/" + k] = v; });
    store = keep; window.__DEMO_STATS = stats1;
    store["users/u_group"] = { username: "michal", name: "מיכל", role: "admin", chiefOf: ["rosie", "jaco"], createdAt: Date.now() - 45 * 864e5, lang: "he" };
    const b = store["group/b1"]; if (b) { const f2 = A2.STATS.fc8; b.short = { good: `${DNAME}: ${stats1.fc8}`, watch: `הנמל: ${f2}`, todo: "להשוות רכש וכמויות בין המסעדות" }; b.long = (b.long || "") + (A2.store["group/b1"] ? "\n\n" + A2.store["group/b1"].long : ""); }
  }
  window.__DEMO_SEED = store;
  window.__DEMO_RAW = { RAW: A1.RAW, SUP: A1.SUP };
})();
