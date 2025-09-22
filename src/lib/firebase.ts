
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, memoryLocalCache, Firestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  "projectId": "studio-1968664538-7b455",
  "appId": "1:813896547402:web:a73c117f751a734c747ab3",
  "storageBucket": "studio-1968664538-7b455.firebasestorage.app",
  "apiKey": "AIzaSyB8XChQPO2LLOGoZu4UpF7AQ6_BjSto1Zo",
  "authDomain": "studio-1968664538-7b455.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "813896547402",
  vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Lazy-loaded Firestore instance
let db: Firestore;

try {
  db = initializeFirestore(app, {
    databaseId: "a003",
    localCache: memoryLocalCache(),
  });
} catch (e) {
  if (
    typeof e === 'object' &&
    e &&
    'code' in e &&
    e.code === 'failed-precondition'
  ) {
    // This can happen in a dev environment with hot-reloading.
    // In this case, we just get the existing instance.
    db = getFirestore(app, "a003");
  } else {
    throw e;
  }
}


const auth = getAuth(app);


export { app, db, auth };
