// /auth/utils.js — tiny helpers to work with /auth/firebase.js
// Pure ES module (no <script> tags). Compatible with your fb-ready pattern.

import "/auth/firebase.js";

/* ---------------------------
   Bootstrap & Auth state
---------------------------- */

/**
 * Wait until /auth/firebase.js has set window.fb (or until timeout).
 * Uses the fb-ready DOM event + a polling fallback.
 */
export function waitForFb(ms = 4000) {
  return new Promise((resolve, reject) => {
    if (window.fb?.auth) return resolve(window.fb);

    let done = false;
    const onReady = () => {
      if (done) return;
      done = true;
      window.removeEventListener("fb-ready", onReady);
      resolve(window.fb);
    };

    window.addEventListener("fb-ready", onReady, { once: true });

    // Fallback polling (in case fb-ready was fired before we attached)
    const start = Date.now();
    (function tick() {
      if (window.fb?.auth) return onReady();
      if (Date.now() - start > ms) {
        window.removeEventListener("fb-ready", onReady);
        return reject(new Error("Firebase bootstrap not loaded (utils.waitForFb timeout)"));
      }
      setTimeout(tick, 20);
    })();
  });
}

/** One-shot wait for the next auth state change so currentUser is accurate */
export async function waitForAuthState(auth, ms = 3000) {
  return new Promise((resolve) => {
    let done = false;
    const unsub = window.fb.onAuthStateChanged(auth, () => {
      if (done) return;
      done = true; try { unsub(); } catch {}
      resolve();
    });
    setTimeout(() => { if (!done) { done = true; try { unsub(); } catch {} resolve(); } }, ms);
  });
}

/** Get custom-claims role with one forced refresh fallback */
export async function getRole(auth) {
  try {
    const t1 = await auth.currentUser.getIdTokenResult();
    if (t1?.claims?.role) return t1.claims.role;
    const t2 = await auth.currentUser.getIdTokenResult(true);
    return t2?.claims?.role || "parent";
  } catch {
    return "parent";
  }
}

/** Quick role gate helper for pages */
export async function requireRole(allowed = ["parent","teacher","admin"]) {
  const fb = await waitForFb();
  await waitForAuthState(fb.auth);
  if (!fb.auth.currentUser) return { ok:false, role:null, reason:"signed-out" };
  const role = await getRole(fb.auth);
  return { ok: allowed.includes(role), role };
}

/* ---------------------------
   Redirect memory helpers
---------------------------- */

export function getRedirectTarget(defaultPath = "/") {
  const qs = new URLSearchParams(location.search);
  return qs.get("redirect") || sessionStorage.getItem("postAuthRedirect") || defaultPath;
}

export function setPostAuthRedirect(target = location.pathname + location.search + location.hash) {
  sessionStorage.setItem("postAuthRedirect", target);
}

export function clearPostAuthFlags() {
  sessionStorage.removeItem("postAuthRedirect");
  sessionStorage.removeItem("ts_redirecting");
}

/* ---------------------------
   Sign-in / Sign-out helpers
---------------------------- */

/** Simple probe: is sessionStorage working (not partitioned/blocked)? */
function storageWorks(kind = "sessionStorage") {
  try {
    const k = "__ts_probe__";
    window[kind].setItem(k, "1");
    const ok = window[kind].getItem(k) === "1";
    window[kind].removeItem(k);
    return ok;
  } catch {
    return false;
  }
}

/** Start Google sign-in via redirect */
export async function signInWithGoogle(selectAccount = true) {
  const fb = await waitForFb();
  const provider = new fb.GoogleAuthProvider();
  provider.addScope("profile");
  if (selectAccount) provider.setCustomParameters({ prompt: "select_account" });

  sessionStorage.setItem("ts_redirecting", "1");
  await fb.signInWithRedirect(fb.auth, provider);
}

/** Smart sign-in: prefer redirect, fall back to popup if environment blocks it */
export async function signInWithGoogleSmart(selectAccount = true) {
  const fb = await waitForFb();
  const provider = new fb.GoogleAuthProvider();
  provider.addScope("profile");
  if (selectAccount) provider.setCustomParameters({ prompt: "select_account" });

  if (!storageWorks("sessionStorage")) {
    return fb.signInWithPopup(fb.auth, provider);
  }

  try {
    sessionStorage.setItem("ts_redirecting", "1");
    return await fb.signInWithRedirect(fb.auth, provider);
  } catch (e) {
    const msg = String(e?.code || e?.message || e || "");
    const redirectBlocked =
      msg.includes("missing initial state") ||
      msg.includes("operation-not-supported-in-this-environment") ||
      msg.includes("cookie") ||
      msg.includes("storage") ||
      msg.includes("popup-blocked");
    if (redirectBlocked) {
      return fb.signInWithPopup(fb.auth, provider);
    }
    throw e;
  }
}

/** Finish redirect if we initiated it. Returns true if it navigated. */
export async function completeRedirectIfNeeded(navigate = (url) => location.replace(url)) {
  const fb = await waitForFb();
  try {
    const result = await fb.getRedirectResult(fb.auth);
    if (result?.user) {
      const back = getRedirectTarget("/") || "/";
      clearPostAuthFlags();
      navigate(back);
      return true;
    }
    if (sessionStorage.getItem("ts_redirecting") === "1" && fb.auth.currentUser) {
      const back = getRedirectTarget("/") || "/";
      clearPostAuthFlags();
      navigate(back);
      return true;
    }
  } catch (e) {
    console.error("[auth/utils] completeRedirectIfNeeded error:", e);
    clearPostAuthFlags();
  }
  return false;
}

/** Sign out and (optionally) navigate somewhere (defaults to auth page) */
export async function signOutAndRedirect(next = "/auth/index.html") {
  const fb = await waitForFb();
  await fb.signOut(fb.auth);
  clearPostAuthFlags();
  if (next) location.replace(next);
}

/* ---------------------------
   Page helpers & shared utils
---------------------------- */

export function isAuthRoute() {
  return location.pathname.startsWith("/auth/");
}

export function setAuthWait(on = true) {
  document.documentElement.classList.toggle("auth-wait", !!on);
}

/** Convenience getters (avoid importing window.fb everywhere) */
export async function getDb()   { const fb = await waitForFb(); return fb.firestore; }
export async function getAuth() { const fb = await waitForFb(); return fb.auth; }
export async function getFns()  { const fb = await waitForFb(); return fb.functions || null; }

/** Call a callable Cloud Function and return its data */
export async function callFn(name, payload) {
  const fb = await waitForFb();
  if (!fb.functions) throw new Error("Functions not initialized");
  const callable = fb.functions.httpsCallable(name);
  const res = await callable(payload);
  return res?.data ?? null;
}

/** INR currency formatter used across pages */
export const inr = (n) => `₹${(Math.round(Number(n || 0))).toLocaleString("en-IN")}`;
