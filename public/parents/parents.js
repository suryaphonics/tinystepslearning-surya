/**
 * Tiny Steps — Parent Dashboard (Read-only, Multi-Child)
 * - Shows ONLY children mapped to the parent (parentUids).
 * - Dropdown to switch between children.
 * - All dashboard functions reflect the selected child.
 */

import { waitForFb } from "/auth/utils.js";

const $  = (s,el=document)=>el.querySelector(s);
const $$ = (s,el=document)=>Array.from(el.querySelectorAll(s));

const LS_KEY = "ts_teachers_v1";
const monthKey = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const todayISO = () => new Date().toISOString().slice(0,10);
const inr = n => `₹${(Math.round(Number(n||0))).toLocaleString("en-IN")}`;

const state = {
  studentId: null,
  student: null,
  students: [],
  month: new Date(),
  charts: { curr:null, games:null },
  courses: [],
  billing: null
};

// Get current user's UID and role
async function getCurrentUserAndRole() {
  const fb = await waitForFb();
  const user = fb.auth.currentUser;
  if (!user) return null;
  const idToken = await user.getIdTokenResult(true);
  return {
    uid: user.uid,
    role: idToken.claims.role || "parent"
  };
}

// Load all students mapped to this parent
async function loadMyStudents() {
  const { uid } = await getCurrentUserAndRole();
  const fb = await waitForFb();
  const db = fb.firestore();
  const snap = await db.collection("students").where("parentUids", "array-contains", uid).get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Loader for /billing/{studentId}
async function getBilling(studentId){
  try{
    const fb = await waitForFb(1000);
    if(fb?.firestore){
      const snap = await fb.firestore().collection("billing").doc(studentId).get();
      if (snap.exists) return snap.data();
    }
  }catch(e){}
  return {
    rate: Number(state.student?.rate || 350),
    subscriptions: state.student?.subscriptions || []
  };
}

// Main entry point
document.addEventListener("DOMContentLoaded", init);

async function init() {
  // 1. Load all mapped children for this parent
  state.students = await loadMyStudents();
  if (!state.students.length) {
    announce("No children found for your account.", "warn");
    return;
  }

  // 2. Determine selected child
  const hashId = new URL(location.href).hash.match(/student=([^&]+)/)?.[1] || null;
  let child = state.students[0];
  if (hashId) {
    const match = state.students.find(s => s.id === hashId);
    if (match) child = match;
  }
  state.student = child;
  state.studentId = child.id;

  // 3. Render child switcher dropdown (if >1 child)
  renderChildSwitcher();

  // 4. Load billing for selected child
  try {
    state.billing = state.student?.id ? await getBilling(state.student.id) : null;
  } catch { state.billing = null; }
  if (!state.billing) {
    state.billing = { rate: Number(state.student?.rate || 350), subscriptions: state.student?.subscriptions || [] };
  }

  // 5. Render all dashboard panels
  hydrateIdentity();
  renderOverview();
  wireTabs();
  bootAttendance();
  renderCurriculum();
  renderGames();
  renderBilling();
  renderMaterials();
  renderTips();

  $("#downloadBtn")?.addEventListener("click", printStatement);
  $("#printBtn")?.addEventListener("click", printStatement);
}

// ======= Child Switcher (Dropdown) =======
function renderChildSwitcher() {
  let sw = $("#childSwitcher");
  if (!sw && state.students.length > 1) {
    // Insert dropdown if not present
    const header = $(".header-actions") || $(".ts-header");
    sw = document.createElement("select");
    sw.id = "childSwitcher";
    sw.style.marginLeft = "12px";
    header?.appendChild(sw);
  }
  if (!sw) return;

  // Hide if only one child
  if (state.students.length <= 1) { sw.style.display = "none"; return; }

  sw.innerHTML = state.students
    .map(o=>`<option value="${o.id}" ${state.student?.id===o.id?'selected':''}>${o.name || "Child"} — ${o.grade||''}</option>`)
    .join("");

  sw.addEventListener("change", (e)=>{
    const id = e.target.value;
    location.href = `/parents/#student=${id}`;
    location.reload();
  });
}

// ======= Dashboard Panels =======
function announce(msg){
  const el = $("#globalAlert");
  el.textContent = msg;
  el.classList.remove("hide");
  setTimeout(()=>el.classList.add("hide"),1800);
}

// ---- Identity ----
function hydrateIdentity(){
  const s = state.student;
  $("#childName").textContent = s.name || "—";
  $("#childInitial").textContent = (s.name||"?").slice(0,1);
  $("#childNameChip").textContent = s.name || "Student";
  $("#childGrade").textContent = s.grade || "—";
  $("#childStatus").textContent = s.status || "active";
  const courses = s.enrolledCourses || state.courses || ["Phonics A–Z", "CVC Blending"];
  $("#enrolledCourses").innerHTML = courses.map(c=>`<span class="pill">${c}</span>`).join("");
}

// ---- Overview Panel ----
async function renderOverview(){
  const d = new Date();
  $("#ovMonthLabel").textContent = new Intl.DateTimeFormat('en-GB',{month:"long",year:"numeric"}).format(d);

  const mKey = monthKey(d);
  const presents = Object.entries(state.student?.attendance||{}).filter(([iso,p])=>p && iso.startsWith(mKey)).length;
  $("#ovPresent").textContent = presents;

  const currAvg = avgCurriculum(state.student);
  const gameAcc = avgGames(state.student);
  doughnut("#currChart", "Mastery", currAvg, "Remaining");
  doughnut("#gamesChart", "Accuracy", gameAcc, "Other");

  const bill = state.billing || await getBilling(state.student?.id);
  const rate = Number(bill?.rate || 350);
  const subTotal = (bill?.subscriptions || []).reduce((a,b)=>a + Number(b.price||0), 0);
  const total = (presents * rate) + subTotal;

  $("#dueAmount").textContent = inr(total);
  $("#dueNote").textContent = `Classes: ${presents} × ${inr(rate)}${subTotal>0 ? ` + Subs ${inr(subTotal)}` : ""}`;
}

// Helpers
function avgCurriculum(stu){
  const vals = Object.values(stu?.curriculum||{});
  return vals.length? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : 0;
}
function avgGames(stu){
  const vals = Object.values(stu?.games||{}).map(g=>Number(g.accuracy||0));
  return vals.length? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : 0;
}
function doughnut(sel, aLabel, aVal, bLabel){
  const el = $(sel);
  if(!el) return;
  if(el._chart) el._chart.destroy();
  el._chart = new Chart(el, {
    type:"doughnut",
    data:{ labels:[aLabel,bLabel], datasets:[{ data:[aVal, 100-aVal], borderWidth:0 }] },
    options:{ plugins:{ legend:{display:false}}, cutout:"70%" }
  });
}

// ---- Tabs ----
function wireTabs(){
  $$(".tab").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      $$(".tab").forEach(b=>{ b.classList.remove("active"); b.setAttribute("aria-selected","false"); });
      btn.classList.add("active"); btn.setAttribute("aria-selected","true");
      const tab = btn.dataset.tab;
      $$(".tabpanel").forEach(p=>p.classList.remove("active"));
      $(`#tab-${tab}`).classList.add("active");
      if(tab==="billing") renderBilling();
    });
  });
}

// ---- Attendance ----
function bootAttendance(){
  $("#monthLabel").textContent = new Intl.DateTimeFormat('en-GB',{month:"long",year:"numeric"}).format(state.month);
  $("#prevMonth").addEventListener("click", ()=>{ state.month.setMonth(state.month.getMonth()-1); rerenderAttendance(); });
  $("#nextMonth").addEventListener("click", ()=>{ state.month.setMonth(state.month.getMonth()+1); rerenderAttendance(); });
  rerenderAttendance();
}
function rerenderAttendance(){
  $("#monthLabel").textContent = new Intl.DateTimeFormat('en-GB',{month:"long",year:"numeric"}).format(state.month);
  const grid = $("#attnCal"); grid.innerHTML="";
  const days = getMonthDays(state.month.getFullYear(), state.month.getMonth());
  const attn = state.student?.attendance||{};
  days.forEach(d=>{
    const iso = d.toISOString().slice(0,10);
    const present = attn[iso]===true;
    const cell = document.createElement("div");
    cell.className = `day ${present?"present":""} ${iso===todayISO()?"today":""}`;
    cell.innerHTML = `<span class="date">${d.getDate()}</span>${present?"✓":""}`;
    cell.title = `${iso} — ${present?"Attended":"No class/Absent"}`;
    grid.appendChild(cell);
  });
}
function getMonthDays(y,m){
  const first = new Date(y,m,1), arr=[];
  for(let d=new Date(first); d.getMonth()===m; d.setDate(d.getDate()+1)) arr.push(new Date(d));
  return arr;
}

// ---- Curriculum ----
function renderCurriculum(){
  const s = state.student, tbody = $("#currTable");
  tbody.innerHTML = "";
  const curr = s?.curriculum||{};
  const focus = s?.focus || "";
  const keys = Object.keys(curr);
  if(!keys.length){
    tbody.innerHTML = `<div class="row" style="grid-column:1/-1; color:#7a7f91">No topics available yet.</div>`;
    return;
  }
  keys.forEach(topic=>{
    const p = Math.max(0,Math.min(100,Number(curr[topic]||0)));
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div>${topic}</div>
      <div><div class="progress"><span style="width:${p}%"></span></div></div>
      <div><strong>${p}%</strong></div>
      <div>${focus || "—"}</div>
    `;
    tbody.appendChild(row);
  });
}

// ---- Games ----
function renderGames(){
  const s = state.student;
  const tbody = $("#gamesTable");
  tbody.innerHTML = "";

  const games = s?.games || {};
  const names = Object.keys(games);
  if(!names.length){
    tbody.innerHTML = `<div class="row" style="grid-column:1/-1; color:#7a7f91">No games data yet.</div>`;
  } else {
    names.forEach(g=>{
      const d = games[g];
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `
        <div>${g}</div>
        <div>${d.level || 1}</div>
        <div>${Number(d.accuracy || 0)}%</div>
        <div>${Number(d.stars || 0)}</div>
        <div>${d.lastPlayed || "—"}</div>
      `;
      tbody.appendChild(row);
    });
  }

  const subs = (state.billing?.subscriptions) || [];
  $("#subsRow").innerHTML = subs.length
    ? subs.map(x => `<span class="pill">${x.name} — ${inr(x.price || 0)}/mo</span>`).join("")
    : `<span class="pill">No active subscriptions</span>`;
}

// ---- Billing ----
async function renderBilling(){
  const d = state.month;
  $("#bMonth").textContent = new Intl.DateTimeFormat('en-GB',{month:"long",year:"numeric"}).format(d);

  const bill = state.billing || await getBilling(state.student?.id);
  const rate = Number(bill?.rate || 350);
  const subs = bill?.subscriptions || [];

  const mk = monthKey(d);
  const classes = Object.entries(state.student?.attendance || {})
     .filter(([iso,p])=>p && iso.startsWith(mk))
     .map(([iso])=>iso);

  const subTotal = subs.reduce((a,b)=>a + Number(b.price||0), 0);
  const total = classes.length * rate + subTotal;

  $("#bRate").textContent    = inr(rate);
  $("#bClasses").textContent = classes.length;
  $("#bSubs").textContent    = inr(subTotal);
  $("#bAmount").textContent  = inr(total);

  $("#classLog").innerHTML = classes.map(iso=>`
    <div class="log-item">
      <div class="left"><span class="dot"></span> <strong>${iso}</strong></div>
      <div>${inr(rate)}</div>
    </div>
  `).join("") || `<p class="hint">No completed classes this month.</p>`;
}

// ---- Materials ----
function renderMaterials(){
  const stu = state.student;
  const stories = (stu?.resources?.stories)||[];
  const works = (stu?.resources?.worksheets)||[];
  $("#storyList").innerHTML = stories.length ? stories.map(resItem).join("") : `<li class="hint" style="padding:6px 10px">No story books yet.</li>`;
  $("#wsList").innerHTML = works.length ? works.map(resItem).join("") : `<li class="hint" style="padding:6px 10px">No worksheets yet.</li>`;
}
function resItem(item){
  const host = (()=>{ try{ return new URL(item.url).host; }catch{return ""; }})();
  return `
    <li class="res-item">
      <div class="res-meta">
        <strong>${item.title}</strong>
        <small>${host}</small>
      </div>
      <div><a class="btn tiny" target="_blank" rel="noopener" href="${item.url}">Open</a></div>
    </li>
  `;
}

// ---- Tips ----
function renderTips(){}

// ---- Download/Print ----
function printStatement(){
  window.print();
}
