import { initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { registerFcmToken } from "./api/notifications";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyDPmq0CiN-fnZn9mOrGbUntWChwaCSrzOQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "medeasy-2ab9a.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "medeasy-2ab9a",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "medeasy-2ab9a.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "17469589805",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:17469589805:web:503613b1b7a7d0014ceba4",
};

const app = initializeApp(firebaseConfig);

let messagingPromise = null;
let initPromise = null;
let initUserId = null;
let onMessageHandler = null;

function getMessagingInstance() {
  if (!messagingPromise) {
    messagingPromise = isSupported().then((supported) => (supported ? getMessaging(app) : null));
  }

  return messagingPromise;
}

async function waitForServiceWorker() {
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
    scope: "/",
  });

  await navigator.serviceWorker.ready;

  if (!registration.active) {
    await new Promise((resolve) => {
      const worker = registration.installing ?? registration.waiting;
      if (!worker) {
        resolve();
        return;
      }
      worker.addEventListener("statechange", () => {
        if (worker.state === "activated") {
          resolve();
        }
      });
    });
  }

  return registration;
}

export async function initFirebaseMessaging(onNotification, userId) {
  if (typeof onNotification === "function") {
    onMessageHandler = onNotification;
  }

  if (initPromise && initUserId === userId) {
    return initPromise;
  }

  resetFirebaseMessagingInit();
  initUserId = userId;

  initPromise = (async () => {
    const messaging = await getMessagingInstance();
    if (!messaging) {
      throw new Error("Firebase Cloud Messaging is not supported in this browser.");
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim();
    if (!vapidKey) {
      throw new Error("VITE_FIREBASE_VAPID_KEY is missing in frontend/.env");
    }

    if (!("serviceWorker" in navigator)) {
      throw new Error("Service workers are not supported in this browser.");
    }

    const authToken = localStorage.getItem("apna_medi_token");
    if (!authToken) {
      throw new Error("Login is required before registering for notifications.");
    }

    const registration = await waitForServiceWorker();

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      throw new Error("Notification permission was blocked. Allow notifications in browser settings.");
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      throw new Error("Firebase did not return a device token.");
    }

    await registerFcmToken(token);
    console.info("[FCM] Device token registered successfully.");

    onMessage(messaging, (payload) => {
      if (typeof onMessageHandler === "function") {
        onMessageHandler(payload);
      }
    });

    return token;
  })().catch((error) => {
    initPromise = null;
    initUserId = null;
    throw error;
  });

  return initPromise;
}

export function resetFirebaseMessagingInit() {
  initPromise = null;
  initUserId = null;
}

export { app };
