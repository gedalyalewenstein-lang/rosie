/* דמו מיזו: כניסה בלי סיסמה. בוחרים תפקיד במסך הפתיחה */
const ROLES={chef:"u_chef",cook:"u_cook",prod:"u_prod"};
let cb=null, cur=null;
try{ const r=sessionStorage.getItem("mizo-demo-role"); if(r&&ROLES[r]) cur={uid:ROLES[r],email:r+"@demo.mizo"}; }catch(e){}
export function getAuth(){return {get currentUser(){return cur}}}
export function onAuthStateChanged(a,f){cb=f;setTimeout(()=>f(cur),0);return ()=>{}}
export function demoLogin(r){ cur={uid:ROLES[r]||ROLES.chef,email:r+"@demo.mizo"}; try{sessionStorage.setItem("mizo-demo-role",r)}catch(e){} cb&&cb(cur); }
window.__demoLogin=demoLogin;
export async function signInWithEmailAndPassword(){ demoLogin("chef"); return {user:cur} }
export async function createUserWithEmailAndPassword(){ demoLogin("chef"); return {user:cur} }
export async function signOut(){ try{sessionStorage.removeItem("mizo-demo-role")}catch(e){} location.reload(); }
export const EmailAuthProvider={credential:()=>({})};
export async function reauthenticateWithCredential(){return {}}
export async function updatePassword(){}
