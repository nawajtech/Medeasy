importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyDPmq0CiN-fnZn9mOrGbUntWChwaCSrzOQ",
  authDomain: "medeasy-2ab9a.firebaseapp.com",
  projectId: "medeasy-2ab9a",
  storageBucket: "medeasy-2ab9a.firebasestorage.app",
  messagingSenderId: "17469589805",
  appId: "1:17469589805:web:503613b1b7a7d0014ceba4",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "ApnaMedi";
  const body = payload.notification?.body ?? "";

  self.registration.showNotification(title, {
    body,
    data: payload.data ?? {},
  });
});
