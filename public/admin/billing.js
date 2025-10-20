import { waitForFb } from "/auth/utils.js";

document.addEventListener("DOMContentLoaded", async () => {
  const fb = await waitForFb();
  const db = fb.firestore();

  const $ = (s, el = document) => el.querySelector(s);

  let allStudents = [];
  let allBillings = [];

  async function loadData(month = null) {
    // Load all students
    const studentsSnap = await db.collection("students").get();
    allStudents = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Load all billing records
    const billingSnap = await db.collection("billing").get();
    allBillings = billingSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filter by month if set
    if (month) {
      allBillings = allBillings.map(bill => {
        // Assume attendance is stored as { 'YYYY-MM-DD': true/false }
        bill.attendanceCount = Object.keys(bill.attendance || {}).filter(dateStr => dateStr.startsWith(month)).length;
        return bill;
      });
    }
  }

  function renderTable() {
    const wrap = $("#billingTableWrap");
    if (!allBillings.length) {
      wrap.innerHTML = "<p>No billing data available.</p>";
      return;
    }
    let html = `
      <table border="1" cellpadding="6" cellspacing="0" style="width:100%; border-radius:10px; margin-top:18px;">
        <thead>
          <tr>
            <th>Student</th>
            <th>Parent</th>
            <th>Grade</th>
            <th>Classes (Month)</th>
            <th>Rate/Class</th>
            <th>Subscriptions</th>
            <th>Total Due</th>
          </tr>
        </thead>
        <tbody>
    `;
    for (let bill of allBillings) {
      // Map student details by billing ID (studentId = bill.id)
      const student = allStudents.find(s => s.id === bill.id) || {};
      const subTotal = (bill.subscriptions || []).reduce((a, b) => a + Number(b.price || 0), 0);
      const total = (bill.attendanceCount || 0) * (bill.rate || 350) + subTotal;
      html += `
        <tr>
          <td>${student.name || "—"}</td>
          <td>${student.parentName || "—"}</td>
          <td>${student.grade || "—"}</td>
          <td style="text-align:center;">${bill.attendanceCount || 0}</td>
          <td>₹${bill.rate || 350}</td>
          <td>
            ${(bill.subscriptions || []).map(sub => `${sub.name} <span style="color:#888;">(₹${sub.price})</span>`).join("<br>") || "-"}
          </td>
          <td><b>₹${total}</b></td>
        </tr>
      `;
    }
    html += `</tbody></table>`;
    wrap.innerHTML = html;
  }

  // Filter and refresh logic
  async function refreshTable() {
    const monthInput = $("#filterMonth");
    let month = monthInput && monthInput.value ? monthInput.value : null; // "YYYY-MM"
    await loadData(month);
    renderTable();
  }

  $("#refreshBtn").addEventListener("click", refreshTable);
  $("#filterMonth").addEventListener("change", refreshTable);

  // Initial load
  refreshTable();
});
