import "/auth/firebase.js";

/** Wait until window.fb exists (with a timeout fallback) */
function waitForFb(ms = 3000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function tick() {
      if (window.fb?.auth) return resolve(window.fb);
      if (Date.now() - start > ms) return reject(new Error("Firebase bootstrap not loaded"));
      setTimeout(tick, 20);
    })();
  });
}

/** Resolve on first auth state tick (so currentUser is accurate), with timeout */
function waitForAuthState(auth, ms = 3000) {
  return new Promise((resolve) => {
    let done = false;
    const unsub = window.fb.onAuthStateChanged(auth, () => {
      if (done) return;
      done = true; unsub(); resolve();
    });
    setTimeout(() => { if (!done) { done = true; try { unsub(); } catch {} resolve(); } }, ms);
  });
}

/** Get role from custom claims, with one forced refresh if missing */
async function getRole(auth) {
  try {
    // First try: use existing token
    const t1 = await auth.currentUser.getIdTokenResult();
    if (t1?.claims?.role) return t1.claims.role;

    // Sometimes claim is just set; force refresh once
    const t2 = await auth.currentUser.getIdTokenResult(true);
    return t2?.claims?.role || "parent"; // default to parent
  } catch {
    return "parent";
  }
}

/** Simple helper to know if path is under a section */
function under(pathPrefix) {
  return location.pathname === pathPrefix || location.pathname.startsWith(pathPrefix + "/");
}

(async () => {
  // Never guard the auth routes themselves
  if (under("/auth")) {
    document.documentElement.classList.remove("auth-wait");
    return;
  }

  let auth;
  try {
    ({ auth } = await waitForFb());
  } catch (e) {
    console.error("[guard] Firebase not ready:", e);
    // Fail safe: show the page so user isn’t stuck hidden
    document.documentElement.classList.remove("auth-wait");
    return;
  }

  await waitForAuthState(auth);

  if (!auth.currentUser) {
    // Preserve full intended destination (path + query + hash)
    const target = location.pathname + location.search + location.hash;
    sessionStorage.setItem("postAuthRedirect", target);
    const authUrl = `/auth/index.html?redirect=${encodeURIComponent(target)}`;
    // Keep the page hidden and navigate away
    location.replace(authUrl);
    return;
  }

  // Get role from custom claims (admin/teacher/parent/rm)
  const role = await getRole(auth);
  console.log("[guard] Signed in as:", auth.currentUser.email || auth.currentUser.uid, "role:", role);

  // ===== Role gates =====

  // ---- TEACHERS ----
  // Only teacher, admin, or RM can access /teachers
  if (under("/teachers") && !(role === "teacher" || role === "admin" || role === "rm")) {
    location.replace("/parents/");
    return;
  }

  // ---- RM ----
  // Only RM or admin can access /rm
  if (under("/rm") && !(role === "rm" || role === "admin")) {
    location.replace("/parents/");
    return;
  }

  // ---- PARENTS ----
  // Only parent or admin can access /parents
  if (under("/parents") && !(role === "parent" || role === "admin")) {
    // Optionally, you can redirect RM to /rm/ if you want a dedicated RM dashboard
    location.replace(role === "teacher" ? "/teachers/" : role === "rm" ? "/rm/" : "/");
    return;
  }

  // ---- ADMIN ----
  // Only admin can access /admin
  if (under("/admin") && role !== "admin") {
    location.replace("/parents/");
    return;
  }

  // User is allowed → show the page
  document.documentElement.classList.remove("auth-wait");
})();
