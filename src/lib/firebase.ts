
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
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
const auth = getAuth(app);
const db = getFirestore(app);

// Enable offline persistence asynchronously.
// This is a "fire and forget" operation at the module level.
// We wrap it in an IIFE to handle the promise and any potential errors.
(async () => {
    try {
        await enableIndexedDbPersistence(db);
        console.log("Firestore offline persistence enabled.");
    } catch (err: any) {
        if (err.code === 'failed-precondition') {
            console.warn("Firestore offline persistence could not be enabled: failed-precondition. This is likely due to multiple tabs open.");
        } else if (err.code === 'unimplemented') {
            console.warn("Firestore offline persistence could not be enabled: unimplemented. The current browser does not support it.");
        }
    }
})();

export { app, db, auth };
