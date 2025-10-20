const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// 1) Default new users to "parent"
exports.onUserCreateDefaultParent = functions.auth.user().onCreate(async (user) => {
  await admin.auth().setCustomUserClaims(user.uid, { role: "parent" });
  await admin.firestore().collection("users").doc(user.uid).set({
    role: "parent",
    name: user.displayName || "",
    email: user.email || "",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
});

// Admin sets user role (parent, teacher, admin, rm)
exports.adminSetUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth?.token?.role || context.auth.token.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Admin only");
  }
  const { uid, role } = data;
  if (!["teacher","parent","admin","rm"].includes(role)) {
    throw new functions.https.HttpsError("invalid-argument","Bad role");
  }
  await admin.auth().setCustomUserClaims(uid, { role });
  await admin.firestore().collection("users").doc(uid).set({ role }, { merge: true });
  return { ok:true };
});
