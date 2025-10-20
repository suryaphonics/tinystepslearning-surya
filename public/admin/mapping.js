import { waitForFb } from "/auth/utils.js";
let db, fb;
let users = [], students = [];

async function loadUsers() {
  const snap = await db.collection("users").get();
  users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  fillSelectors();
}
async function loadStudents() {
  const snap = await db.collection("students").get();
  students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
function fillSelectors() {
  function fill(id, role) {
    const sel = document.getElementById(id);
    const opts = users.filter(u=>u.role===role).map(u=>
      `<option value="${u.id}">${u.name || u.email}</option>`).join("");
    sel.innerHTML = opts;
  }
  fill("teacherSelector", "teacher");
  fill("parentSelector", "parent");
  fill("rmSelector", "rm");
}
function renderTable(userType, userId) {
  let assigned = students.filter(stu => ((stu[userType+"Uids"]||[]).includes(userId)));
  let unassigned = students.filter(stu => !((stu[userType+"Uids"]||[]).includes(userId)));

  document.getElementById("mappingTable").innerHTML = `
    <h3>Students assigned to this ${userType.toUpperCase()}</h3>
    ${assigned.length ? "" : "<em>No students mapped.</em>"}
    <ul>${assigned.map(stu=>`
      <li>${stu.name||stu.id}
        <button class="btn tiny danger" data-user="${userType}" data-stu="${stu.id}" data-act="remove">Remove</button>
      </li>`).join("")}</ul>
    <h3>Assign new students</h3>
    ${unassigned.length ? "" : "<em>All students mapped.</em>"}
    <ul>${unassigned.map(stu=>`
      <li>${stu.name||stu.id}
        <button class="btn tiny" data-user="${userType}" data-stu="${stu.id}" data-act="assign">Assign</button>
      </li>`).join("")}</ul>
  `;
}
document.getElementById("showTeacherStudents").onclick = () =>
  renderTable("teacher", document.getElementById("teacherSelector").value);
document.getElementById("showParentStudents").onclick = () =>
  renderTable("parent", document.getElementById("parentSelector").value);
document.getElementById("showRmStudents").onclick = () =>
  renderTable("rm", document.getElementById("rmSelector").value);

document.getElementById("mappingTable").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const userType = btn.getAttribute("data-user");
  const stuId = btn.getAttribute("data-stu");
  const act = btn.getAttribute("data-act");
  const userId = document.getElementById(userType+"Selector").value;
  const stuDoc = db.collection("students").doc(stuId);
  const snap = await stuDoc.get();
  const stu = snap.data();
  let arr = Array.from(new Set([...(stu[userType+"Uids"]||[])]));
  if (act==="assign") arr.push(userId);
  if (act==="remove") arr = arr.filter(x=>x!==userId);
  await stuDoc.set({ [userType+"Uids"]: arr }, { merge:true });
  await loadStudents();
  renderTable(userType, userId);
});

document.addEventListener("DOMContentLoaded", async () => {
  fb = await waitForFb();
  db = fb.firestore();
  await loadUsers();
  await loadStudents();
  // show teachers by default
  if(users.some(u=>u.role==="teacher")) renderTable("teacher", users.find(u=>u.role==="teacher").id);
});
