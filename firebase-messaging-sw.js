/* Service worker: מציג התראות כשהאפליקציה סגורה */
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");
firebase.initializeApp({
  apiKey: "AIzaSyBhNdlFbeHY_zFo18N4WvWSz_2xrWpevu0",
  authDomain: "rosie-orders-b7ea5.firebaseapp.com",
  projectId: "rosie-orders-b7ea5",
  storageBucket: "rosie-orders-b7ea5.firebasestorage.app",
  messagingSenderId: "486019026542",
  appId: "1:486019026542:web:838283fe5f2f4a8e19e07f"
});
const messaging = firebase.messaging();
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ("focus" in c) return c.focus(); }
    return self.clients.openWindow("./");
  }));
});
