// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  "projectId": "studio-1968664538-7b455",
  "appId": "1:813896547402:web:a73c117f751a734c747ab3",
  "storageBucket": "studio-1968664538-7b455.firebasestorage.app",
  "apiKey": "AIzaSyB8XChQPO2LLOGoZu4UpF7AQ6_BjSto1Zo",
  "authDomain": "studio-1968664538-7b455.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "813896547402"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
