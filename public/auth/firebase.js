// /auth/firebase.js — pure ES module (no <script> tags)
// Loads Firebase (v10.13.1), initializes once, sets persistence, and exposes window.fb

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup, // ⬅️ added
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

/** ---- Config (your project) ----
 * NOTE: If authDomain is a custom domain (e.g., tinystepslearning.com),
 * that domain must be on Firebase Hosting so /__/auth/handler exists,
 * and it must be listed under Auth → Settings → Authorized domains.
 */
const firebaseConfig = {
  apiKey: "AIzaSyDMQPK1PWvUspJ5HyiqzjKAocCqRhgQoJE",
  authDomain: "tinystepslearning.com",
  projectId: "tinystepslearning-93",
  // appId not required in this bootstrap
};

/** ---- Initialize exactly once ---- */
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);

/** ---- Persistence (with safe fallback) ---- */
try {
  await setPersistence(auth, browserLocalPersistence);
} catch (e) {
  // Some environments/extensions may block persistent storage.
  // Auth still works with in-memory persistence.
  console.warn("[auth] Could not set browserLocalPersistence. Using fallback.", e);
}

/** ---- Language for Google consent / account picker ---- */
auth.useDeviceLanguage?.();

/** ---- Expose API expected by pages ---- */
const fb = {
  auth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup, // ⬅️ exported for popup fallback
};

/** ---- Publish globally once ---- */
if (!window.fb) {
  window.fb = fb;
} else {
  console.info("[auth] window.fb already defined; keeping existing instance.");
}

/** ---- Notify listeners that Firebase is ready ---- */
try {
  window.dispatchEvent(new Event("fb-ready"));
} catch {
  // Older browsers without Event constructor—non-critical
}

export default window.fb; // Optional: allows `import fb from "/auth/firebase.js"`
