import { waitForFb } from "/auth/utils.js";
const $ = (s,el=document)=>el.querySelector(s);
const rid = ()=>"stu_"+Math.random().toString(36).slice(2,10);

$("#saveBtn").addEventListener("click", onSave);

async function onSave(){
  $("#msg").textContent = "";
  const name  = $("#cName").value.trim();
  const age   = Number($("#cAge").value||0);
  const grade = $("#cGrade").value;

  if(!name){ $("#msg").textContent = "Please enter a name."; return; }

  const { auth, firestore } = await waitForFb();
  const user = auth.currentUser;
  if(!user){ location.replace("/auth/"); return; }

  const db = firestore;
  const id = rid();
  const parentRef = db.collection("users").doc(user.uid);
  const stuRef    = db.collection("students").doc(id);
  const billRef   = db.collection("billing").doc(id);

  await parentRef.set({
    role: "parent",
    email: user.email || "",
    name: user.displayName || "",
    children: firestore.FieldValue.arrayUnion(id)
  }, { merge:true });

  await stuRef.set({
    id, name, age, grade,
    status: "active",
    parentId: user.uid,
    parentName: user.displayName || "",
    parentEmail: user.email || "",
    attendance: {}, curriculum:{}, games:{},
    resources:{ stories:[], worksheets:[] }
  });

  await billRef.set({ rate: 350, subscriptions: [] });

  location.href = `/parents/#student=${id}`;
}
