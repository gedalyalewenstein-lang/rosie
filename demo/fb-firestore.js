/* דמו מיזו: מסד נתונים בזיכרון של הדפדפן */
try { if (sessionStorage.getItem("mizo-demo-role") !== "group") sessionStorage.setItem("rosie-site", "rosie"); } catch (e) {}
/* דמו מיזו: Firestore בזיכרון של הדפדפן, נטען מהנתונים הבדויים. שום דבר לא יוצא מהטלפון */
const store=JSON.parse(JSON.stringify(window.__DEMO_SEED||{})); const subs=[];
window.__store=store;
export function getFirestore(){return {}}
export function doc(db,...p){return {path:p.join("/"),kind:"doc"}}
export function collection(db,...p){return {path:p.join("/"),kind:"col",wheres:[]}}
export function query(c,...w){return {path:c.path,kind:"col",wheres:w}}
export function orderBy(f,dir){return {ob:f,dir:dir||"asc"}}
export function limit(n){return {lim:n}}
export function where(f,op,v){return {f,op,v}}
export function documentId(){return "__id__"}
export function serverTimestamp(){return Date.now()}
function snapDoc(path){const d=store[path];return {exists:()=>!!d,data:()=>d?JSON.parse(JSON.stringify(d)):undefined,id:path.split("/").pop()}}
function emit(){subs.forEach(s=>s.fire())}
window.__emit=emit;
function test(w,id,d){const x=w.f==="__id__"?id:(d||{})[w.f];if(x===undefined)return false;return w.op==="=="?x===w.v:w.op===">="?x>=w.v:w.op==="<="?x<=w.v:true}
function colDocs0(ref){const L=ref.path.split("/").length+1;return Object.keys(store).filter(k=>k.startsWith(ref.path+"/")&&k.split("/").length===L).map(k=>({id:k.split("/").pop(),data:()=>JSON.parse(JSON.stringify(store[k]))})).filter(d=>ref.wheres.every(w=>test(w,d.id,store[ref.path+"/"+d.id])))}
export function onSnapshot(ref,a,b){const next=typeof a==="function"?a:b;const s={fire:()=>{ if(ref.kind==="doc")next(snapDoc(ref.path)); else next({docs:colDocs(ref)}) }};subs.push(s);setTimeout(s.fire,0);return ()=>{const i=subs.indexOf(s);if(i>=0)subs.splice(i,1)}}
function merge(a,b){for(const k in b){if(b[k]&&b[k].__op==="del"){delete a[k];continue}const sp=__apply(a[k],b[k]);if(sp!==undefined){a[k]=sp;continue}if(b[k]&&typeof b[k]==="object"&&!Array.isArray(b[k])&&!b[k].__op&&a[k]&&typeof a[k]==="object"&&!Array.isArray(a[k]))merge(a[k],b[k]);else if(b[k]&&typeof b[k]==="object"&&!Array.isArray(b[k])){a[k]=merge({},b[k])}else a[k]=JSON.parse(JSON.stringify(b[k]))}return a}
export async function setDoc(ref,data,opt){ __validate(data,false,ref.path); if(opt&&opt.merge)store[ref.path]=merge(store[ref.path]||{},data); else store[ref.path]=JSON.parse(JSON.stringify(data)); setTimeout(emit,0); fakeServer(ref.path)}
export async function getDoc(ref){ if(/^photoData\//.test(ref.path)&&!store[ref.path]&&window.__DEMO_IMG){const img=window.__DEMO_IMG(ref.path.split("/")[1]); if(img) store[ref.path]={img};} return snapDoc(ref.path)}
export async function getDocs(ref){return {docs:colDocs(ref)}}
export async function deleteDoc(ref){delete store[ref.path];setTimeout(emit,0)}
export async function updateDoc(ref,data){ __validate(data,false,ref.path);store[ref.path]=Object.assign(store[ref.path]||{},JSON.parse(JSON.stringify(data)));setTimeout(emit,0)}
export function initializeFirestore(){return {}}
export function persistentLocalCache(){return {}}
export function persistentMultipleTabManager(){return {}}
export async function runTransaction(db,fn){const w=[];const tx={get:async r=>snapDoc(r.path),set:(r,d,o)=>{__validate(d,false,r.path);w.push([r,d,o]);return tx}};const res=await fn(tx);for(const [r,d,o] of w) await setDoc(r,d,o);return res}
export function writeBatch(){const ops=[];return {delete:(r)=>ops.push(()=>{delete store[r.path]}),set:(r,d,o)=>ops.push(()=>setDoc(r,d,o)),update:(r,d)=>ops.push(()=>updateDoc(r,d)),commit:async()=>{for(const f of ops) await f();setTimeout(emit,0)}}}

/* ---- Firestore value rules (to catch bugs the real database would reject) ---- */
export function arrayUnion(...v) { return { __op: "au", v }; }
export function deleteField() { return { __op: "del" }; }
export function increment(n) { return { __op: "inc", n }; }
function __validate(x, inArr, path) {
  if (x === undefined) throw new Error("Firestore: undefined value at " + path);
  if (Array.isArray(x)) { if (inArr) throw new Error("Firestore: nested arrays are not supported at " + path); x.forEach((y, i) => __validate(y, true, path + "[" + i + "]")); return; }
  if (x && typeof x === "object") { if (x.__op === "au") return x.v.forEach((y, i) => __validate(y, true, path + "+[" + i + "]")); if (x.__op) return; Object.keys(x).forEach((k) => __validate(x[k], false, path + "." + k)); }
}
function __apply(cur, val) {
  if (val && val.__op === "au") { const a = Array.isArray(cur) ? cur.slice() : []; val.v.forEach((y) => { if (!a.some((z) => JSON.stringify(z) === JSON.stringify(y))) a.push(JSON.parse(JSON.stringify(y))); }); return a; }
  if (val && val.__op === "inc") return (typeof cur === "number" ? cur : 0) + val.n;
  return undefined;
}

function colDocs(ref){const f=ref.wheres.filter(w=>w&&w.f!==undefined),ob=ref.wheres.find(w=>w&&w.ob),lm=ref.wheres.find(w=>w&&w.lim);let r=colDocs0(Object.assign({},ref,{wheres:f}));if(ob){r.sort((a,b)=>{const x=(a.data()||{})[ob.ob],y=(b.data()||{})[ob.ob];return (x>y?1:x<y?-1:0)*(ob.dir==="desc"?-1:1)})}if(lm)r=r.slice(0,lm.lim);return r}

/* "השרת" של הדמו: Claude עונה, קורא קבלות ומכין דוחות — בתשובות מוכנות מראש */
const S_=()=>window.__DEMO_STATS||{}, ils=(v)=>"₪"+Math.round(v).toLocaleString("en-US");
function later(path, patch, ms){ setTimeout(()=>{ if(!store[path]) return; store[path]=merge(store[path],patch); emit(); }, ms||1800); }
function answer(q){ const s=S_(), t=String(q||"");
  if(/מחיר|התייקר|יקר|ספק/.test(t)) return `עגבניות שרי עלו מ-₪24 ל-₪29 אצל ירקות הגליל. עברתם לפרי השדה ב-₪23.\n- חיסכון: ${ils(s.save.tomato)} בחודש.\n- מלפפון עלה ב-8%, לעקוב.`;
  if(/(פחת|זבל).*(עלה|עלייה|גדל)|למה.*פחת/.test(t)) return `בשבוע שעבר נרשמו ${s.wk.waste === 0.5 ? "חצי קופסה" : s.wk.waste + " קופסאות"} פחת, ${s.wk.wastePct}% מ-${s.wk.boxes} קופסאות. זה לא עלייה, זה נמוך.${s.wk.top ? `\n- הכי הרבה: ${s.wk.top}.` : ""}\n- להמשיך להזמין לפי הצעת הכמויות.`;
  if(/מלאי|להזמין/.test(t)) return `המלאי המשוער והצעת ההזמנה ליומיים מחושבים מהקבלות ומהייצור.\n- נמצא בנתונים ← פער ומלאי, לפי ספק.\n- אף אחד לא סופר: מה שנקנה פחות מה שיצא.`;
  if(/עובד|שכר|משמרת|שעות/.test(t)) return `עלות העובדים 29% מהמכירות, נקודה מעל היעד.\n- 96 שעות נוספות, רובן בחמישי.\n- להקדים משמרת טבח שנייה בחמישי בשעה: ${ils(s.save.labor)} בחודש.`;
  if(/פחת|זבל|זורק/.test(t)) return `ייצור היתר ירד מ-${s.wE}% ל-${s.wL}% מאז שמטבח הייצור עובד לפי הצעת הכמויות.\n- הכי מבוזבז: עגבניות שרי חצויות וחסה שטופה.\n- חיסכון מהפחת: ${ils(s.save.waste)} בחודש.`;
  if(/מנה|מכפיל|תמחור|רווח/.test(t)) return `ריגטוני שמנת פטריות במכפיל 2.6, מתחת ליעד 3.\n- להעלות מחיר ב-₪11 (ל-₪83), או 65 גר׳ פחות רוטב.\n- שאר המנות מעל 3.`;
  if(/חיסכון|חסכ/.test(t)) return `החודש מיזו מצא ${ils(s.save.total)}:\n- פחת: ${ils(s.save.waste)}\n- מחיר עגבניות: ${ils(s.save.tomato)}\n- תמחור מנה: ${ils(s.save.dish)}\n- משמרות: ${ils(s.save.labor)}`;
  return `Food cost החודש ${s.fcM}%. בשבועיים האחרונים ${s.fcLate}%, לעומת ${s.fcEarly}% לפני מיזו. ${s.boxes} קופסאות יצאו מהייצור, ${s.receipts} קבלות נקראו.\n- בדמו Claude עונה מתשובות מוכנות. במערכת שלכם הוא עונה מהנתונים האמיתיים שלכם.`; }
function fakeServer(path){
  const d=store[path]; if(!d) return;
  if(/^group\/a/.test(path) && d.status==="pending") later(path,{status:"done",a:answer(d.q),doneAt:Date.now()},2200);
  if(/^group\/b/.test(path) && d.status==="pending") { const b=store["group/b1"]; if(b) later(path,{status:"done",short:b.short,long:b.long,doneAt:Date.now()},2500); }
  if(/^asks\//.test(path) && d.status==="pending") later(path,{status:"done",a:answer(d.q)},2200);
  if(/^reportReq\//.test(path) && d.status==="pending") { const rk=Object.keys(store).find(k=>k.startsWith("reports/monthly")); later(path,{status:"done",report:rk?rk.split("/")[1]:"",doneAt:Date.now()},2600); }
  if(/^photos\//.test(path) && d.ai==="pending"){
    if(d.kind==="z") later(path,{ai:"done",aiAt:Date.now(),aiData:{date:d.day,covers:96,total:15840,items:[]}},2600);
    else later(path,{ai:"done",aiAt:Date.now(),sup:d.sup||"פרי השדה",amt:d.amt||742,cat:d.cat||"ירקות",aiData:{supplier:"פרי השדה",date:d.day,total:742,category:"ירקות",items:[{name:"עגבניות שרי",qty:18,unit:"ק״ג",unitPrice:23,total:414},{name:"עשבי תיבול מעורב",qty:4,unit:"ק״ג",unitPrice:38,total:152},{name:"לימון",qty:22,unit:"ק״ג",unitPrice:8,total:176}]}},2800);
  }
  if(/^uploads\//.test(path) && d.ai==="pending") later(path,{ai:"done"},2600);
}
