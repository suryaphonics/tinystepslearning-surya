/**
 * Teachers Dashboard — Tiny Steps
 * - Auto-uses Firebase if window.fb exists (auth + firestore)
 * - Otherwise falls back to localStorage demo mode
 * - World-class UI behaviors + accessibility
 */

import { waitForFb } from "/auth/utils.js"; // safe if present; ignored if not

// ====== Utilities ======
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

const todayISO = () => new Date().toISOString().slice(0,10);
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;

// Currency
const inr = n => `₹${(Math.round(Number(n||0))).toLocaleString("en-IN")}`;
// Random ID
const uid = (p="id") => `${p}_${Math.random().toString(36).slice(2,9)}`;

// Month helpers
function getMonthDays(year, month){ // month: 0-11
  const first = new Date(year, month, 1);
  const res = [];
  for(let d=new Date(first); d.getMonth()===month; d.setDate(d.getDate()+1)){
    res.push(new Date(d));
  }
  return res;
}

// ====== Data Layer (Firebase or Local) ======
const Data = (() => {
  let useFirebase = false;
  let db = null;
  let user = null;

  // Local storage shape
  const LS_KEY = "ts_teachers_v1";
  const defaultState = {
    teacher: { name: "Teacher", id: "t_001" },
    students: [
      {
        id: uid("stu"),
        name: "Aarav Sharma",
        grade: "UKG",
        parentName: "Mrs. Sharma",
        parentPhone: "+91 9xxxx xxxxx",
        status: "active",
        rate: 350,
        attendance: { /* 'YYYY-MM-DD': true */ },
        attnNotes: {},
        curriculum: {
          "SATPIN": 70,
          "CVC (2–3 letters)": 55,
          "Blends (st, pl, tr)": 30
        },
        focus: "Blend endings: -nd, -nt, -st",
        games: {
          "Balloon Pop": { level: 3, accuracy: 82, stars: 12, lastPlayed: todayISO() },
          "Treasure Hunt": { level: 2, accuracy: 75, stars: 8, lastPlayed: todayISO() }
        },
        resources: {
          stories: [
            { id: uid("res"), title: "S: Sun & Snake — Picture Story", url: "https://tinystepslearning.com/resources/s-story" }
          ],
          worksheets: [
            { id: uid("res"), title: "SATPIN — Tracing Pack", url: "https://tinystepslearning.com/resources/satpin-tracing" }
          ]
        }
      }
    ]
  };

  // ---- Local helpers
  function readLS(){
    const raw = localStorage.getItem(LS_KEY);
    if(!raw){ localStorage.setItem(LS_KEY, JSON.stringify(defaultState)); return structuredClone(defaultState); }
    try{ return JSON.parse(raw); }catch{ return structuredClone(defaultState); }
  }
  function writeLS(state){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }

  // ---- Firebase helpers
  async function initFirebase(){
    try{
      const fb = await waitForFb(3000); // has window.fb
      if(!fb?.auth) return false;

      // Require login (Teacher)
      user = fb.auth.currentUser;
      if(!user){
        // If not logged in, let them in as read-only local demo (or redirect to sign-in page if you prefer)
        return false;
      }

      if(!fb.firestore){
        console.warn("Firestore not found on window.fb — falling back to local.");
        return false;
      }

      db = fb.firestore();
      useFirebase = true;
      return true;
    }catch(err){
      console.warn("Firebase not available, using localStorage.", err);
      return false;
    }
  }

  // Public API (both backends share shapes)
  return {
    async init(){
      const ok = await initFirebase();
      if(ok) return { backend: "firebase" };
      return { backend: "local" };
    },
    async currentTeacher(){
      if(useFirebase){
        // Read from Firestore 'teachers' collection by auth uid
        const doc = await db.collection("teachers").doc(user.uid).get();
        if(doc.exists) return doc.data();
        // fallback if missing
        return { name: user.displayName || "Teacher", id: user.uid };
      } else {
        return readLS().teacher;
      }
    },
    async listStudents(){
  if(useFirebase){
    // Only students where teacherUids contains current user
    const teacher = user; // Already set in initFirebase
    if(!teacher) return [];
    const snap = await db.collection("students")
      .where("teacherUids", "array-contains", teacher.uid)
      .where("status", "in", ["active", "paused"])
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } else {
    return readLS().students;
  }
}

    async createStudent(stu){
      if(useFirebase){
        const ref = await db.collection("students").add(stu);
        return { ...stu, id: ref.id };
      } else {
        const s = readLS();
        s.students.push(stu);
        writeLS(s);
        return stu;
      }
    },
    async updateStudent(id, patch){
      if(useFirebase){
        await db.collection("students").doc(id).set(patch, { merge:true });
      } else {
        const s = readLS();
        const idx = s.students.findIndex(x => x.id===id);
        if(idx>-1){ s.students[idx] = { ...s.students[idx], ...patch }; writeLS(s); }
      }
    },
    async setAttendance(id, dateISO, present){
      if(useFirebase){
        await db.collection("students").doc(id).set({ attendance: { [dateISO]: present } }, { merge:true });
      } else {
        const s = readLS();
        const stu = s.students.find(x => x.id===id);
        if(stu){
          stu.attendance ||= {};
          if(present===null){ delete stu.attendance[dateISO]; }
          else { stu.attendance[dateISO] = !!present; }
          writeLS(s);
        }
      }
    },
    async clearMonthAttendance(id, year, month){ // month: 0-11
      if(useFirebase){
        const days = getMonthDays(year, month);
        const patch = {}; days.forEach(d => patch[d.toISOString().slice(0,10)] = firebase.firestore.FieldValue.delete?.() || null);
        // Fallback: overwrite for now (safer)
        await this.updateStudent(id, { attendance: {} });
      } else {
        const s = readLS();
        const stu = s.students.find(x => x.id===id);
        if(stu?.attendance){
          Object.keys(stu.attendance).forEach(key => {
            const d = new Date(key);
            if(d.getFullYear()===year && d.getMonth()===month) delete stu.attendance[key];
          });
          writeLS(s);
        }
      }
    },
    async saveAttnNotes(id, monthKey, text){
      if(useFirebase){
        await db.collection("students").doc(id).set({ attnNotes: { [monthKey]: text } }, { merge:true });
      } else {
        const s = readLS();
        const stu = s.students.find(x => x.id===id);
        if(stu){
          stu.attnNotes ||= {};
          stu.attnNotes[monthKey] = text;
          writeLS(s);
        }
      }
    },
    async setCurriculum(id, topic, progress, focus){
      if(useFirebase){
        await db.collection("students").doc(id).set({ curriculum: { [topic]: progress }, focus }, { merge:true });
      } else {
        const s = readLS();
        const stu = s.students.find(x => x.id===id);
        if(stu){
          stu.curriculum ||= {};
          stu.curriculum[topic] = progress;
          if(focus!==undefined) stu.focus = focus;
          writeLS(s);
        }
      }
    },
    async deleteCurriculumTopic(id, topic){
      if(useFirebase){
        await db.collection("students").doc(id).set({ curriculum: { [topic]: null } }, { merge:true });
      } else {
        const s = readLS();
        const stu = s.students.find(x => x.id===id);
        if(stu?.curriculum){ delete stu.curriculum[topic]; writeLS(s); }
      }
    },
    async setGameProgress(id, game, payload){
      if(useFirebase){
        await db.collection("students").doc(id).set({ games: { [game]: payload } }, { merge:true });
      } else {
        const s = readLS();
        const stu = s.students.find(x => x.id===id);
        if(stu){
          stu.games ||= {};
          stu.games[game] = payload;
          writeLS(s);
        }
      }
    },
    async deleteGame(id, game){
      if(useFirebase){
        await db.collection("students").doc(id).set({ games: { [game]: null } }, { merge:true });
      } else {
        const s = readLS();
        const stu = s.students.find(x => x.id===id);
        if(stu?.games){ delete stu.games[game]; writeLS(s); }
      }
    },
    async addResource(kind, res, studentId=null){
      if(useFirebase){
        // Global resources collection; if studentId present, also tag it
        const ref = await db.collection("resources").add({ ...res, kind, studentId: studentId||null });
        return { ...res, id: ref.id };
      } else {
        const s = readLS();
        if(studentId){
          const stu = s.students.find(x => x.id===studentId);
          if(stu){
            stu.resources ||= { stories:[], worksheets:[] };
            const key = kind==="story" ? "stories" : "worksheets";
            stu.resources[key].push(res);
          }
        } else {
          // Attach to all students (default simple behavior)
          s.students.forEach(stu => {
            stu.resources ||= { stories:[], worksheets:[] };
            const key = kind==="story" ? "stories" : "worksheets";
            stu.resources[key].push(structuredClone(res));
          });
        }
        writeLS(s);
        return res;
      }
    },
    async setRate(id, rate){
      if(useFirebase){
        await db.collection("students").doc(id).set({ rate }, { merge:true });
      } else {
        const s = readLS();
        const stu = s.students.find(x => x.id===id);
        if(stu){ stu.rate = rate; writeLS(s); }
      }
    }
  };
})();

// ====== State ======
const state = {
  backend: "local",
  teacher: null,
  students: [],
  filtered: [],
  activeTab: "students",
  selected: {
    studentId: null,
    month: new Date()
  },
  charts: {
    mastery: null
  }
};

// ====== UI Boot ======
document.addEventListener("DOMContentLoaded", async () => {
  // Init Data
  const initRes = await Data.init();
  state.backend = initRes.backend;

  state.teacher = await Data.currentTeacher().catch(()=>({name:"Teacher"}));
  $("#teacherName").textContent = state.teacher?.name || "Teacher";

  state.students = await Data.listStudents();
  state.filtered = [...state.students];

  hydrateCohort();
  renderOverview();
  wireTabs();
  renderStudents();
  fillAllSelectors();
  bootAttendance();
  bootCurriculum();
  bootGames();
  bootMaterials();
  bootBilling();
  announce(`Loaded (${state.backend === "firebase" ? "Firebase" : "Local"})`);

  $("#signOutBtn").addEventListener("click", () => {
    if(window.fb?.auth){ window.fb.auth.signOut?.(); }
    window.location.href = "/index.html";
  });

  $("#addStudentBtn").addEventListener("click", openStudentDialog);
  $("#studentSearch").addEventListener("input", onSearch);
  $("#filterGrade").addEventListener("change", applyFilters);
  $("#filterStatus").addEventListener("change", applyFilters);


});

// ====== Announce helper ======
function announce(msg, type="info"){
  const el = $("#globalAlert");
  el.textContent = msg;
  el.classList.remove("hide");
  setTimeout(()=>el.classList.add("hide"), 1800);
}

// ====== Tabs ======
function wireTabs(){
  $$(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.activeTab = btn.dataset.tab;

      $$(".tabpanel").forEach(p => p.classList.remove("active"));
      $(`#tab-${state.activeTab}`).classList.add("active");

      if(state.activeTab==="billing") renderBilling();
      if(state.activeTab==="attendance") renderAttendanceCalendar();
      if(state.activeTab==="curriculum") renderCurriculum();
      if(state.activeTab==="games") renderGames();
      if(state.activeTab==="materials") renderMaterials();
    });
  });
}

// ====== Cohort / Overview ======
function hydrateCohort(){
  $("#totalStudents").textContent = state.students.filter(s=>s.status!=="left").length;
  $("#cohortInfo").textContent = `${state.students.filter(s=>s.status==="active").length} active · ${state.students.filter(s=>s.status==="paused").length} paused`;
}
function renderOverview(){
  // Classes this month (sum of presents across students)
  const d = new Date();
  const mKey = monthKey(d);
  const total = state.students.reduce((acc, stu)=>{
    const presents = Object.entries(stu.attendance||{})
      .filter(([date, p]) => p && date.startsWith(mKey))
      .length;
    return acc + presents;
  }, 0);
  $("#classesThisMonth").textContent = total;
  $("#classesMonthLabel").textContent = new Intl.DateTimeFormat('en-GB', { month:"long", year:"numeric" }).format(d);

  // Mastery snapshot (avg of curriculum)
  const scores = [];
  state.students.forEach(stu => {
    const curr = stu.curriculum || {};
    const values = Object.values(curr);
    if(values.length){
      scores.push(values.reduce((a,b)=>a+b,0)/values.length);
    }
  });
  const avg = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
  renderMasteryChart(avg);
}


function renderMasteryChart(avg){
  const ctx = $("#masteryChart");
  const data = [avg, 100-avg];
  if(state.charts.mastery){ state.charts.mastery.destroy(); }
  state.charts.mastery = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Mastery", "Remaining"],
      datasets: [{ data, borderWidth:0 }]
    },
    options: {
      plugins: {
        legend: { display:false },
        tooltip: { enabled:true }
      },
      cutout: "70%"
    }
  });
}

// ====== Students ======
function onSearch(){
  applyFilters();
}
function applyFilters(){
  const q = $("#studentSearch").value.trim().toLowerCase();
  const g = $("#filterGrade").value;
  const st = $("#filterStatus").value;

  state.filtered = state.students.filter(s => {
    const text = `${s.name} ${s.parentName||""}`.toLowerCase();
    const passQ = q ? text.includes(q) : true;
    const passG = g ? s.grade===g : true;
    const passS = st ? s.status===st : true;
    return passQ && passG && passS;
  });
  renderStudents();
}
function renderStudents(){
  const grid = $("#studentsGrid");
  grid.innerHTML = "";
  state.filtered.forEach(stu => {
    const card = document.createElement("article");
    card.className = "card student-card";
    card.innerHTML = `
      <header>
        <div class="student-head">
          <div class="avatar">${(stu.name||"?").slice(0,1)}</div>
          <div>
            <div class="name">${stu.name}</div>
            <div class="meta">${stu.grade} · ${stu.parentName||"—"} · ${stu.parentPhone||""}</div>
          </div>
        </div>
        <div class="tags">
          <span class="tag">${stu.status}</span>
        </div>
      </header>
      <div class="bars">
        ${progressBar("Curriculum", avgCurriculum(stu))}
        ${progressBar("Games", avgGames(stu))}
      </div>
      <div class="actions">
        <button class="btn tiny" data-act="open-attn" data-id="${stu.id}">Attendance</button>
        <button class="btn tiny" data-act="open-curr" data-id="${stu.id}">Curriculum</button>
        <button class="btn tiny" data-act="open-games" data-id="${stu.id}">Games</button>
        <button class="btn tiny" data-act="open-bill" data-id="${stu.id}">Classes</button>
        <button class="btn tiny ghost" data-act="edit" data-id="${stu.id}">Edit</button>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.addEventListener("click", e=>{
    const btn = e.target.closest("button[data-act]");
    if(!btn) return;
    const id = btn.dataset.id;
    const act = btn.dataset.act;
    state.selected.studentId = id;

    const tabMap = {
      "open-attn": "attendance",
      "open-curr": "curriculum",
      "open-games": "games",
      "open-bill": "billing"
    };
    if(tabMap[act]) switchTo(tabMap[act]);

    if(act==="edit") openStudentDialog(id);
  });
}

function progressBar(label, value){
  const v = Math.round(value||0);
  return `
    <div class="row" style="align-items:center; gap:10px; margin:6px 0">
      <small style="flex:0 0 110px; color:#5b647e">${label}</small>
      <div class="progress"><span style="width:${v}%"></span></div>
      <small style="width:36px; text-align:right; color:#2d3450; font-weight:700">${v}%</small>
    </div>
  `;
}
function avgCurriculum(stu){
  const vals = Object.values(stu.curriculum||{});
  if(!vals.length) return 0;
  return vals.reduce((a,b)=>a+b,0)/vals.length;
}
function avgGames(stu){
  const vals = Object.values(stu.games||{}).map(g => Number(g.accuracy||0));
  if(!vals.length) return 0;
  return vals.reduce((a,b)=>a+b,0)/vals.length;
}

function switchTo(tabName){
  $$(".tab").forEach(b => {
    b.classList.toggle("active", b.dataset.tab===tabName);
    b.setAttribute("aria-selected", b.dataset.tab===tabName ? "true":"false");
  });
  $$(".tabpanel").forEach(p => p.classList.toggle("active", p.id===`tab-${tabName}`));
  state.activeTab = tabName;

  if(tabName==="attendance"){ renderAttendanceCalendar(); }
  if(tabName==="curriculum"){ renderCurriculum(); }
  if(tabName==="games"){ renderGames(); }
  if(tabName==="materials"){ renderMaterials(); }
  if(tabName==="billing"){ renderBilling(); }
}

// Add/Edit Student dialog
function openStudentDialog(id=null){
  const dlg = $("#studentDialog");
  const title = $("#studentDialogTitle");
  const name = $("#dlgStudentName");
  const grade = $("#dlgStudentGrade");
  const pName = $("#dlgParentName");
  const pPhone = $("#dlgParentPhone");
  const status = $("#dlgStatus");

  if(id){
    title.textContent = "Edit Student";
    const stu = state.students.find(s=>s.id===id);
    name.value = stu?.name||"";
    grade.value = stu?.grade||"UKG";
    pName.value = stu?.parentName||"";
    pPhone.value = stu?.parentPhone||"";
    status.value = stu?.status||"active";
  } else {
    title.textContent = "Add Student";
    name.value = ""; grade.value = "UKG"; pName.value=""; pPhone.value=""; rate.value=350; status.value="active";
  }

  dlg.showModal();
  $("#dlgSaveStudentBtn").onclick = async (e) => {
    e.preventDefault();
    const payload = {
      name: name.value.trim(),
      grade: grade.value,
      parentName: pName.value.trim(),
      parentPhone: pPhone.value.trim(),
      status: status.value
    };
    if(id){
      await Data.updateStudent(id, payload);
      Object.assign(state.students.find(s=>s.id===id), payload);
    } else {
      const model = {
        id: uid("stu"),
        attendance:{}, attnNotes:{}, curriculum:{}, games:{},
        resources:{ stories:[], worksheets:[] },
        ...payload
      };
      const saved = await Data.createStudent(model);
      state.students.push(saved);
    }
    announce("Saved student");
    dlg.close();
    applyFilters();
    hydrateCohort();
    renderOverview();
    fillAllSelectors();
  };
}

// ====== Selectors ======
function fillAllSelectors(){
  const opts = state.students.map(s=>`<option value="${s.id}">${s.name}</option>`).join("");
  ["attnStudentSelector","currStudentSelector","gameStudentSelector","billStudentSelector","resStudentSelect"].forEach(id=>{
    const el = $("#"+id);
    if(!el) return;
    el.innerHTML = `<option value="">Select Student</option>` + opts;
    if(state.selected.studentId) el.value = state.selected.studentId;
  });
}

// ====== Attendance ======
function bootAttendance(){
  // Month label & buttons
  renderMonthLabel();
  $("#prevMonthBtn").addEventListener("click", ()=>{ state.selected.month.setMonth(state.selected.month.getMonth()-1); renderMonthLabel(); renderAttendanceCalendar(); renderBillingIfOpen(); });
  $("#nextMonthBtn").addEventListener("click", ()=>{ state.selected.month.setMonth(state.selected.month.getMonth()+1); renderMonthLabel(); renderAttendanceCalendar(); renderBillingIfOpen(); });
  $("#attnStudentSelector").addEventListener("change", (e)=>{ state.selected.studentId = e.target.value||null; renderAttendanceCalendar(); renderBillingIfOpen(); });

  $("#markTodayBtn").addEventListener("click", async ()=>{
    const id = state.selected.studentId; if(!id) return;
    const iso = todayISO();
    await Data.setAttendance(id, iso, true);
    const stu = state.students.find(s=>s.id===id); stu.attendance ||= {}; stu.attendance[iso]=true;
    renderAttendanceCalendar(); renderOverview(); renderBillingIfOpen();
  });
  $("#clearMonthBtn").addEventListener("click", async ()=>{
    const id = state.selected.studentId; if(!id) return;
    if(!confirm("Clear this month's attendance for selected student?")) return;
    await Data.clearMonthAttendance(id, state.selected.month.getFullYear(), state.selected.month.getMonth());
    const stu = state.students.find(s=>s.id===id);
    if(stu?.attendance){
      Object.keys(stu.attendance).forEach(k=>{
        const d = new Date(k);
        if(d.getFullYear()===state.selected.month.getFullYear() && d.getMonth()===state.selected.month.getMonth()){
          delete stu.attendance[k];
        }
      });
    }
    renderAttendanceCalendar(); renderOverview(); renderBillingIfOpen();
  });

  $("#saveAttnNotesBtn").addEventListener("click", async ()=>{
    const id = state.selected.studentId; if(!id) return;
    const mKey = monthKey(state.selected.month);
    const txt = $("#attnNotes").value;
    await Data.saveAttnNotes(id, mKey, txt);
    const stu = state.students.find(s=>s.id===id);
    stu.attnNotes ||= {}; stu.attnNotes[mKey]=txt;
    announce("Saved month notes");
  });
}
function renderMonthLabel(){
  $("#monthLabel").textContent = new Intl.DateTimeFormat('en-GB', { month:"long", year:"numeric" }).format(state.selected.month);
}
function renderAttendanceCalendar(){
  const wrap = $("#attnCalendar");
  wrap.innerHTML = "";

  const id = state.selected.studentId || state.students[0]?.id;
  if(!state.selected.studentId && id){ state.selected.studentId = id; fillAllSelectors(); }
  if(!id){ wrap.innerHTML = `<p style="grid-column:1/-1; color:#7a7f91">Add a student to mark attendance.</p>`; return; }

  $("#attnStudentSelector").value = state.selected.studentId;

  const stu = state.students.find(s=>s.id===id);
  const y = state.selected.month.getFullYear();
  const m = state.selected.month.getMonth();
  const days = getMonthDays(y, m);

  const mKey = monthKey(state.selected.month);
  $("#attnNotes").value = (stu.attnNotes||{})[mKey] || "";

  let presentCount = 0;

  days.forEach(d=>{
    const iso = d.toISOString().slice(0,10);
    const isToday = iso === todayISO();
    const present = (stu.attendance||{})[iso] === true;
    if(present) presentCount++;

    const cell = document.createElement("button");
    cell.className = `day ${present ? "present" : ""} ${isToday ? "today" : ""}`;
    cell.setAttribute("title", `${iso} — ${present ? "Present" : "Absent"}`);
    cell.innerHTML = `<span class="date">${d.getDate()}</span> ${present ? "✓" : ""}`;

    cell.addEventListener("click", async ()=>{
      const nowPresent = !(stu.attendance||{})[iso];
      await Data.setAttendance(id, iso, nowPresent);
      stu.attendance ||= {}; 
      if(nowPresent) stu.attendance[iso]=true; else delete stu.attendance[iso];
      renderAttendanceCalendar(); renderOverview(); renderBillingIfOpen();
    });

    wrap.appendChild(cell);
  });

  $("#attnSummary").textContent = `${presentCount} completed class(es) in ${new Intl.DateTimeFormat('en-GB',{month:"long",year:"numeric"}).format(state.selected.month)}`;
}
function renderBillingIfOpen(){
  if(state.activeTab==="billing") renderBilling();
}

// ====== Curriculum ======
function bootCurriculum(){
  $("#currStudentSelector").addEventListener("change", e => { state.selected.studentId = e.target.value||null; renderCurriculum(); });
  $("#addCurrRowBtn").addEventListener("click", ()=> addCurriculumRow());
}
function renderCurriculum(){
  const id = state.selected.studentId || state.students[0]?.id;
  if(!id){ $("#currTable").innerHTML = `<div class="row"><div>Add a student</div></div>`; return; }
  $("#currStudentSelector").value = id;

  const stu = state.students.find(s=>s.id===id);
  const tbody = $("#currTable");
  tbody.innerHTML = "";

  const curr = stu.curriculum || {};
  const topics = Object.keys(curr);
  if(!topics.length){
    tbody.innerHTML = `<div class="row"><div colspan="5" style="grid-column:1/-1; color:#7a7f91">No topics yet — add one.</div></div>`;
  } else {
    topics.forEach(topic => {
      tbody.appendChild(currRowEl(id, topic, curr[topic], stu.focus||""));
    });
  }
}
function currRowEl(stuId, topic, progress, focus){
  const row = document.createElement("div");
  row.className = "row";
  row.innerHTML = `
    <div><input type="text" value="${topic}" data-k="topic"/></div>
    <div>
      <div class="progress"><span style="width:${progress}%"></span></div>
    </div>
    <div>
      <input type="number" min="0" max="100" step="5" value="${progress}" data-k="progress"/>
    </div>
    <div><input type="text" placeholder="Focus e.g., final blends" value="${focus||""}" data-k="focus"/></div>
    <div class="row">
      <button class="btn tiny" data-act="save">Save</button>
      <button class="btn tiny ghost" data-act="del">Delete</button>
    </div>
  `;
  row.addEventListener("click", async (e)=>{
    const act = e.target?.dataset?.act;
    if(!act) return;
    const topicEl = row.querySelector('input[data-k="topic"]');
    const progEl = row.querySelector('input[data-k="progress"]');
    const focEl = row.querySelector('input[data-k="focus"]');
    const t = topicEl.value.trim();
    const p = Math.max(0, Math.min(100, Number(progEl.value||0)));
    const f = focEl.value.trim();

    if(act==="save"){
      await Data.setCurriculum(stuId, t, p, f);
      const stu = state.students.find(s=>s.id===stuId); 
      stu.curriculum ||= {}; stu.curriculum[t]=p; stu.focus = f;
      announce("Saved topic");
      renderStudents(); renderOverview();
      row.querySelector(".progress > span").style.width = `${p}%`;
    }
    if(act==="del"){
      if(!confirm("Delete this topic?")) return;
      await Data.deleteCurriculumTopic(stuId, t);
      const stu = state.students.find(s=>s.id===stuId);
      if(stu?.curriculum) delete stu.curriculum[t];
      row.remove(); renderStudents(); renderOverview();
    }
  });
  return row;
}
function addCurriculumRow(){
  const id = $("#currStudentSelector").value || state.students[0]?.id;
  if(!id) return;
  const tbody = $("#currTable");
  const row = currRowEl(id, "New Topic", 0, "");
  tbody.prepend(row);
}

// ====== Games ======
function bootGames(){
  $("#gameStudentSelector").addEventListener("change", e => { state.selected.studentId = e.target.value||null; renderGames(); });
  $("#addGameRowBtn").addEventListener("click", ()=> addGameRow());
}
function renderGames(){
  const id = state.selected.studentId || state.students[0]?.id;
  if(!id){ $("#gamesTable").innerHTML = `<div class="row">Add a student</div>`; return; }
  $("#gameStudentSelector").value = id;

  const stu = state.students.find(s=>s.id===id);
  const tbody = $("#gamesTable");
  tbody.innerHTML = "";

  const games = stu.games || {};
  const names = Object.keys(games);
  if(!names.length){
    tbody.innerHTML = `<div class="row"><div colspan="6" style="grid-column:1/-1; color:#7a7f91">No games yet — add one.</div></div>`;
  } else {
    names.forEach(g => {
      tbody.appendChild(gameRowEl(id, g, games[g]));
    });
  }
}
function gameRowEl(stuId, game, data){
  const row = document.createElement("div");
  row.className = "row";
  const lvl = Number(data?.level||1);
  const acc = Number(data?.accuracy||0);
  const stars = Number(data?.stars||0);
  const last = data?.lastPlayed || todayISO();

  row.innerHTML = `
    <div><input type="text" value="${game}" data-k="game"/></div>
    <div><input type="number" min="1" step="1" value="${lvl}" data-k="level"/></div>
    <div><input type="number" min="0" max="100" step="1" value="${acc}" data-k="accuracy"/></div>
    <div><input type="number" min="0" step="1" value="${stars}" data-k="stars"/></div>
    <div><input type="date" value="${last}" data-k="last"/></div>
    <div class="row">
      <button class="btn tiny" data-act="save">Save</button>
      <button class="btn tiny ghost" data-act="del">Delete</button>
    </div>
  `;
  row.addEventListener("click", async (e)=>{
    const act = e.target?.dataset?.act;
    if(!act) return;
    const g = row.querySelector('input[data-k="game"]').value.trim();
    const payload = {
      level: Number(row.querySelector('input[data-k="level"]').value||1),
      accuracy: Math.max(0, Math.min(100, Number(row.querySelector('input[data-k="accuracy"]').value||0))),
      stars: Math.max(0, Number(row.querySelector('input[data-k="stars"]').value||0)),
      lastPlayed: row.querySelector('input[data-k="last"]').value || todayISO()
    };
    if(act==="save"){
      await Data.setGameProgress(stuId, g, payload);
      const stu = state.students.find(s=>s.id===stuId);
      stu.games ||= {}; stu.games[g] = payload;
      announce("Saved game progress");
      renderStudents(); renderOverview();
    }
    if(act==="del"){
      if(!confirm("Delete this game row?")) return;
      await Data.deleteGame(stuId, g);
      const stu = state.students.find(s=>s.id===stuId);
      if(stu?.games) delete stu.games[g];
      row.remove(); renderStudents(); renderOverview();
    }
  });
  return row;
}
function addGameRow(){
  const id = $("#gameStudentSelector").value || state.students[0]?.id;
  if(!id) return;
  const tbody = $("#gamesTable");
  const row = gameRowEl(id, "Balloon Pop", { level:1, accuracy:0, stars:0, lastPlayed: todayISO() });
  tbody.prepend(row);
}

// ====== Materials ======
function bootMaterials(){
  $("#addStoryBtn").addEventListener("click", ()=> openResDialog("story"));
  $("#addWorksheetBtn").addEventListener("click", ()=> openResDialog("worksheet"));
  $("#copyShareBtn").addEventListener("click", ()=>{
    const link = $("#parentShareLink");
    link.select();
    document.execCommand("copy");
    announce("Copied share link");
  });
}
function openResDialog(kind){
  const dlg = $("#resourceDialog");
  $("#resourceDialogTitle").textContent = kind==="story" ? "Add Story Book" : "Add Worksheet";
  $("#resTitle").value = "";
  $("#resUrl").value = "";
  $("#resType").value = kind;
  $("#resStudentSelect").value = state.selected.studentId || "";

  dlg.showModal();
  $("#resSaveBtn").onclick = async (e)=>{
    e.preventDefault();
    const title = $("#resTitle").value.trim();
    const url = $("#resUrl").value.trim();
    const stuId = $("#resStudentSelect").value || null;
    const type = $("#resType").value;
    if(!title || !url) return;
    const res = { id: uid("res"), title, url };

    await Data.addResource(type, res, stuId || null);
    if(stuId){
      const stu = state.students.find(s=>s.id===stuId);
      stu.resources ||= { stories:[], worksheets:[] };
      const key = type==="story" ? "stories" : "worksheets";
      stu.resources[key].push(res);
    } else {
      state.students.forEach(stu=>{
        stu.resources ||= { stories:[], worksheets:[] };
        const key = type==="story" ? "stories" : "worksheets";
        stu.resources[key].push(structuredClone(res));
      });
    }
    announce("Resource added");
    dlg.close();
    renderMaterials();
  };
}
function renderMaterials(){
  const id = state.selected.studentId || state.students[0]?.id;
  if(!id){
    $("#storiesList").innerHTML=""; $("#worksheetsList").innerHTML="";
    return;
  }
  const stu = state.students.find(s=>s.id===id);
  $("#parentShareLink").value = `https://tinystepslearning.com/parents.html#student=${encodeURIComponent(id)}`;

  const stories = (stu.resources?.stories)||[];
  const works = (stu.resources?.worksheets)||[];

  $("#storiesList").innerHTML = stories.map(item => resItemTpl(item)).join("");
  $("#worksheetsList").innerHTML = works.map(item => resItemTpl(item)).join("");

  $("#storiesList, #worksheetsList").addEventListener("click", e=>{
    const a = e.target.closest("a[data-open]");
    if(a){ a.target = "_blank"; }
  }, { once:true });
}
function resItemTpl(item){
  const host = (()=>{ try{ return new URL(item.url).host; }catch{return ""; }})();
  return `
    <li class="res-item">
      <div class="res-meta">
        <strong>${item.title}</strong>
        <small>${host}</small>
      </div>
      <div class="res-actions">
        <a class="btn tiny" data-open href="${item.url}">Open</a>
      </div>
    </li>
  `;
}

// ====== Billing ======
function bootBilling(){
  $("#billStudentSelector").addEventListener("change", e => {
    state.selected.studentId = e.target.value||null;
    renderBilling();
  });
  const btn = document.getElementById("downloadClassesBtn");
  if(btn) btn.addEventListener("click", ()=> {
    const e = document.createElement("style");
    e.textContent = `
      @media print {
        body{ background:#fff }
        .ts-header, .tabs .tablist, .toolbar, .alert{ display:none !important }
        #tab-billing{ display:block !important }
        .billing-grid{ grid-template-columns: 1fr !important }
        .card{ box-shadow:none !important; border:1px solid #ddd !important }
      }
    `;
    document.head.appendChild(e);
    window.print();
    setTimeout(()=>e.remove(), 500);
  });
}

function renderBilling(){
  const id = state.selected.studentId || state.students[0]?.id;
  if(!id) return;
  $("#billStudentSelector").value = id;

  const d = state.selected.month;
  $("#billMonth").textContent = new Intl.DateTimeFormat('en-GB', { month:"long", year:"numeric" }).format(d);

  const stu = state.students.find(s=>s.id===id);
  const mk = monthKey(d);
  const classes = Object.entries(stu.attendance||{})
    .filter(([iso,p])=>p && iso.startsWith(mk))
    .map(([iso])=>iso).sort();

  $("#billClasses").textContent = classes.length;
  $("#classLog").innerHTML = classes.map(iso => `
    <div class="log-item">
      <div class="left"><span class="dot"></span> <strong>${iso}</strong></div>
      <div>Present</div>
    </div>
  `).join("") || `<p class="hint">No completed classes this month.</p>`;
}


function downloadInvoice(){
  // Simple browser print-to-PDF flow
  const e = document.createElement("style");
  e.textContent = `
    @media print {
      body{ background:#fff }
      .ts-header, .tabs .tablist, .toolbar, .alert{ display:none !important }
      #tab-billing{ display:block !important }
      .billing-grid{ grid-template-columns: 1fr !important }
      .card{ box-shadow:none !important; border:1px solid #ddd !important }
    }
  `;
  document.head.appendChild(e);
  window.print();
  setTimeout(()=>e.remove(), 1000);
}

// ====== Attendance calendar + selectors initial fill ======
function bootSelectorsFallback(){
  if(!state.selected.studentId && state.students[0]){
    state.selected.studentId = state.students[0].id;
    fillAllSelectors();
  }
}
function bootAfterDataChange(){
  hydrateCohort();
  renderOverview();
  applyFilters();
  fillAllSelectors();
}

// ====== Materials, Billing triggers on month change already wired ======
bootSelectorsFallback();
