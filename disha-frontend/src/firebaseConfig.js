// src/firebaseConfig.js

// Import core Firebase SDK modules (modular syntax)
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
// If you plan to use Firestore or Analytics later:
// import { getFirestore } from "firebase/firestore";
// import { getAnalytics, isSupported } from "firebase/analytics";

/**
 * Firebase configuration using Vite environment variables.
 * All keys are stored securely in `.env` file (never in repo).
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "my-genai-project-1-c8115.appspot.com", // ✅ fixed suffix
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// ✅ Avoid re-initialization (important during HMR in Vite)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase App Check with reCAPTCHA v3
// This helps protect your backend resources from abuse.
// IMPORTANT: You must configure this in your Firebase project settings.
const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
  isTokenAutoRefreshEnabled: true, // Automatically refresh the token as needed
});


// Initialize Firebase Authentication
export const auth = getAuth(app);

// (Optional) Setup Firestore and Analytics later
// export const db = getFirestore(app);
// export const analytics = (await isSupported()) ? getAnalytics(app) : null;

export default app;
