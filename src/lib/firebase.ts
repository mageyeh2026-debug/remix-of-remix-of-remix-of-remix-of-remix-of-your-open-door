import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Configured in code on purpose (no env vars).
export const firebaseConfig = {
  apiKey: "AIzaSyAMjtXZfF3TFORbHDDeEbVGHizBxgjJlMo",
  authDomain: "mageye-hassan-8a3ee.firebaseapp.com",
  databaseURL: "https://mageye-hassan-8a3ee-default-rtdb.firebaseio.com",
  projectId: "mageye-hassan-8a3ee",
  storageBucket: "mageye-hassan-8a3ee.firebasestorage.app",
  messagingSenderId: "701672349189",
  appId: "1:701672349189:web:201294a248abddc868866c",
  measurementId: "G-WHYFSGK50L",
};

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function firebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function firebaseDb(): Database {
  return getDatabase(getFirebaseApp());
}

export function firebaseStorage(): FirebaseStorage {
  return getStorage(getFirebaseApp());
}

export const SITE_PATH = "site";
