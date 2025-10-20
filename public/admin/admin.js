import { waitForFb } from "/auth/utils.js";
let db, fb, users=[], students=[];

async function load() {
  fb = await waitForFb();
  db = fb.firestore();

  // Users by role
  const snap = await db.collection("users").get();
  users = snap.docs.map(d => d.data());
  document.getElementById("totalParents").textContent = users.filter(u=>u.role==="parent").length;
  document.getElementById("totalTeachers").textContent = users.filter(u=>u.role==="teacher").length;
  document.getElementById("totalRms").textContent = users.filter(u=>u.role==="rm").length;

  // Students
  const sSnap = await db.collection("students").get();
  students = sSnap.docs.map(d => d.data());
  document.getElementById("totalStudents").textContent = students.length;

  // Growth over time chart (just for demo: by createdAt month if you track it)
  // Simulate data if you don't have createdAt yet
  let monthCounts = {};
  students.forEach(s=>{
    const dt = (s.createdAt? new Date(s.createdAt): new Date());
    const label = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
    monthCounts[label] = (monthCounts[label]||0) + 1;
  });
  // Cumulative count per month
  let labels = Object.keys(monthCounts).sort();
  let data = [];
  let total = 0;
  for(let l of labels) { total+=monthCounts[l]; data.push(total);}
  new Chart(document.getElementById("studentGrowthChart"), {
    type: "line",
    data: { labels, datasets: [{ label:"Total Students", data, borderColor:"#ff6a88", fill:false}] },
    options: { plugins: { legend: {display:false} }, responsive:true }
  });
}

document.addEventListener("DOMContentLoaded", load);
