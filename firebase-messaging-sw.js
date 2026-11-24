/* Service worker: מציג התראות כשהאפליקציה סגורה */
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");
firebase.initializeApp({
  apiKey: "AIzaSyDM8wZL_V4WHfnAPjjxTLm1doLYH1vM3oQ",
  authDomain: "mizo-db6f7.firebaseapp.com",
  projectId: "mizo-db6f7",
  storageBucket: "mizo-db6f7.firebasestorage.app",
  messagingSenderId: "270805730938",
  appId: "1:270805730938:web:d8fe69e8e3472091c01dc3"
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
