import { waitForFb } from "/auth/utils.js";

let allUsers = [];
const table = document.getElementById("userTable");
const search = document.getElementById("userSearch");
const dialog = document.getElementById("userDialog");
const form = document.getElementById("userForm");
const addBtn = document.getElementById("addUserBtn");

let db, fb;

// ========== Firestore Operations ==========
async function loadUsers() {
  const snap = await db.collection("users").get();
  allUsers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderTable();
}

async function saveUser(user) {
  if (user.id) {
    await db.collection("users").doc(user.id).set({
      name: user.name,
      email: user.email,
      role: user.role,
    }, { merge: true });
  } else {
    await db.collection("users").add({
      name: user.name,
      email: user.email,
      role: user.role,
    });
  }
  await loadUsers();
}

async function deleteUser(uid) {
  if (!confirm("Are you sure you want to delete this user?")) return;
  await db.collection("users").doc(uid).delete();
  await loadUsers();
}

// ========== UI Rendering & Events ==========
function renderTable() {
  let filtered = allUsers;
  const q = search.value.trim().toLowerCase();
  if(q) {
    filtered = allUsers.filter(u =>
      (u.name||"").toLowerCase().includes(q) ||
      (u.email||"").toLowerCase().includes(q) ||
      (u.role||"").toLowerCase().includes(q)
    );
  }
  table.innerHTML = `
    <div class="table-head" style="display:grid;grid-template-columns:1.5fr 2fr 1fr 1fr;gap:8px;font-weight:700;">
      <div>Name</div><div>Email</div><div>Role</div><div>Actions</div>
    </div>
    ${filtered.map(u=>`
      <div class="table-row" style="display:grid;grid-template-columns:1.5fr 2fr 1fr 1fr;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid #f4e3c3;">
        <div>${u.name||"—"}</div>
        <div>${u.email||"—"}</div>
        <div><span class="pill role-pill ${u.role}">${u.role||"parent"}</span></div>
        <div>
          <button class="btn tiny ghost" data-uid="${u.id}" data-act="edit">Edit</button>
          <button class="btn tiny danger" data-uid="${u.id}" data-act="delete">Delete</button>
        </div>
      </div>
    `).join("")}
  `;
}

function openUserDialog(user=null) {
  dialog.querySelector("#userDialogTitle").textContent = user ? "Edit User" : "Add User";
  form.userUid.value = user?.id || "";
  form.userName.value = user?.name || "";
  form.userEmail.value = user?.email || "";
  form.userRole.value = user?.role || "parent";
  dialog.showModal();
}

addBtn.addEventListener("click", () => openUserDialog());

table.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const uid = btn.getAttribute("data-uid");
  const user = allUsers.find(u => u.id === uid);
  if (btn.getAttribute("data-act") === "edit") {
    openUserDialog(user);
  }
  if (btn.getAttribute("data-act") === "delete") {
    deleteUser(uid);
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = {
    id: form.userUid.value,
    name: form.userName.value.trim(),
    email: form.userEmail.value.trim(),
    role: form.userRole.value,
  };
  await saveUser(user);
  dialog.close();
});

search.addEventListener("input", renderTable);

// ========== Init ==========
document.addEventListener("DOMContentLoaded", async () => {
  fb = await waitForFb();
  db = fb.firestore();
  await loadUsers();
});
