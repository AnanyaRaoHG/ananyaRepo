// ---------- Utilities ----------
// --- BACKUP & RESTORE ---

// 1. Export: Save your data to your phone's file folder
async function exportData() {
    const data = await getData();
    if (!data || data.length === 0) return alert("No data to export!");

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    
    a.href = url;
    // We remove the date from the filename so it triggers the "Overwrite" prompt
    a.download = "SaveTrack_Vault.json"; 
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 2. Import: Bring your data back from a file
async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            await saveData(importedData);
            alert("Data restored successfully!");
            window.location.reload(); // Refresh to show the new data
        } catch (err) {
            alert("Invalid backup file.");
        }
    };
    reader.readAsText(file);
}

// --- SAVETRACK ROBUST STORAGE ---
const Store = {
    async set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
        return new Promise((resolve) => {
            const dbRequest = indexedDB.open("SaveTrackVault", 1);
            dbRequest.onupgradeneeded = (e) => e.target.result.createObjectStore("kv");
            dbRequest.onsuccess = (e) => {
                const db = e.target.result;
                const tx = db.transaction("kv", "readwrite");
                tx.objectStore("kv").put(value, key);
                tx.oncomplete = () => resolve();
            };
        });
    },

    async get(key) {
        return new Promise((resolve) => {
            const dbRequest = indexedDB.open("SaveTrackVault", 1);
            dbRequest.onupgradeneeded = (e) => e.target.result.createObjectStore("kv");
            dbRequest.onsuccess = (e) => {
                const db = e.target.result;
                const tx = db.transaction("kv", "readonly");
                const getReq = tx.objectStore("kv").get(key);
                getReq.onsuccess = () => {
                    if (getReq.result) return resolve(getReq.result);
                    const localData = localStorage.getItem(key);
                    resolve(localData ? JSON.parse(localData) : []);
                };
            };
        });
    }
};

async function saveData(data) {
    await Store.set('savetrack_entries', data);
    console.log("Data saved to Secure Vault");
}

async function getData() {
    return await Store.get('savetrack_entries');
}

function qs(id){ return document.getElementById(id); }

// --- Initialization Logic ---
async function init() {
    if (qs("monthFilter")) {
        await populateFilter();
        await renderCards();
    }
    if (qs("cardContainer")) {
        await renderCards();
    }

    // Attach listeners
    qs("monthFilter")?.addEventListener("change", async () => await renderCards(qs("monthFilter").value));
    qs("sortOrder")?.addEventListener("change", async () => await renderCards(qs("monthFilter").value));
}

// Run init
init();

let selectedId = null;

function formatMonth(monthStr){
  const [year, month] = monthStr.split("-");
  const date = new Date(year, month-1);
  return date.toLocaleString("default",{month:"long", year:"numeric"});
}

// populate filter dropdown - NOW ASYNC
async function populateFilter(){
  const data = await getData();
  const months = data.map(m=>m.month).sort();
  const filter = qs("monthFilter");
  if (!filter) return;
  
  months.forEach(m=>{
    if(!Array.from(filter.options).some(o=>o.value===m)){
      const option = document.createElement("option");
      option.value = m;
      option.text = formatMonth(m);
      filter.appendChild(option);
    }
  });
}

// render cards - NOW ASYNC
async function renderCards(filter="all"){
  const container = qs("cardContainer");
  if (!container) return;
  container.innerHTML="";

  let data = await getData();
  if(filter!=="all") data = data.filter(m=>m.month===filter);

  const sortOrder = qs("sortOrder").value;
  data.sort((a,b)=>sortOrder==="asc"?a.month.localeCompare(b.month):b.month.localeCompare(a.month));

  data.forEach(m => {
    const income = (m.income.salary || 0) + (m.income.bonus || 0);
    const expense = Object.values(m.expenses || {}).reduce((a, b) => a + b, 0);
    const savings = income - expense;

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
        <div class="card-header" style="display:flex; justify-content:space-between;">
            <h3>${formatMonth(m.month)}</h3>
            <button class="delete-btn" onclick="deleteMonth(event, '${m.id}')" style="background:none; color:red; font-size:1.2rem; border:none;">&times;</button>
        </div>
        <p><span>Income:</span> <span>₹${income}</span></p>
        <p><span>Expense:</span> <span>₹${expense}</span></p>
        <div class="savings-value">💰 ₹${savings}</div>
    `;
    card.onclick = () => openActions(m.id);
    container.appendChild(card);
  });
}

async function deleteMonth(event, id) {
    event.stopPropagation();
    if (!confirm("Are you sure you want to delete this month's record?")) return;

    let data = await getData();
    data = data.filter(m => m.id !== id);

    await saveData(data);
    await renderCards(qs("monthFilter").value);
    await populateFilter(); 
}

async function openActions(id) {
  selectedId = id;
  const data = await getData();
  const m = data.find(x => x.id === id);
  qs("modalMonth").innerText = m.month;
  qs("actionModal").classList.remove("hidden");

  qs("viewBtn").onclick = () => showDetails(m);
  qs("editBtn").onclick = () => {
    window.location.href = `add.html?edit=${id}`;
  };
}

// ... closeModal, showDetails, closeDetails remain the same ...

function closeModal() {
  qs("actionModal").classList.add("hidden");
}

function showDetails(m) {
  closeModal();
  const d = qs("detailsContent");

  d.innerHTML = `
    <h3>${m.month}</h3>
    <p><strong>Income</strong></p>
    <p>Salary: ₹${m.income.salary}</p>
    <p>Bonus: ₹${m.income.bonus}</p>

    <p><strong>Expenses</strong></p>
    ${Object.entries(m.expenses).map(
      ([k,v]) => `<p>${k}: ₹${v}</p>`
    ).join("")}
  `;

  qs("detailsModal").classList.remove("hidden");
}

function closeDetails() {
  qs("detailsModal").classList.add("hidden");
}

// ---------- ADD / EDIT PAGE ----------
if (qs("saveBtn")) {
  const params = new URLSearchParams(window.location.search);
  const editId = params.get("edit");

  if (editId) {
    qs("pageTitle").innerText = "Edit Month";
    qs("saveBtn").innerText = "Update Month";
    loadForEdit(editId);
  }

  qs("saveBtn").addEventListener("click", async function () {
    await saveMonth(editId);
  });
}

// Attach event listeners (Keep this!)
["grocery","petrol","investment","credit","ebill","fast","food","movie","custom","totalExpense"].forEach(id => {
  // We use the ?. (optional chaining) to prevent errors if an ID is missing on index.html
  qs(id)?.addEventListener("input", updateExtra);
});

// ... updateExtra logic remains same ...
function updateExtra() {
  const total = +qs("totalExpense").value || 0;
  const grocery = +qs("grocery").value || 0;
  const petrol = +qs("petrol").value || 0;
  const investment = +qs("investment").value || 0;
  const ebill = +qs("ebill").value || 0;
  const fast = +qs("fast").value || 0;
  const food = +qs("food").value || 0;
  const movie = +qs("movie").value || 0;
  const credit = +qs("credit").value || 0;
  const custom = +qs("custom").value || 0;

  let extra = total - (grocery + petrol + investment + credit + custom + fast + food + movie + ebill);
  if (extra < 0) extra = 0;

  qs("extraAmount").value = extra;
}

async function loadForEdit(id) {
  const data = await getData();
  const m = data.find(x => x.id === id);
  if(!m) return;
  qs("month").value = m.id;
  qs("salary").value = m.income.salary;
  qs("bonus").value = m.income.bonus;

  Object.entries(m.expenses).forEach(([k,v]) => {
    if (qs(k)) qs(k).value = v;
  });
}

async function saveMonth(editId) {
  const monthId = qs("month").value;
  const data = await getData(); // WAITING FOR DATA HERE

  if (!monthId) {
      alert("Please select a month first!");
      return;
  }
  if (!editId) {
    const exists = data.some(entry => entry.month === monthId);
    if (exists) {
      alert(`An entry for ${formatMonth(monthId)} already exists.`);
      return;
    }
  }
  
  const monthObj = {
    id: monthId,
    month: monthId,
    income: { salary: +qs("salary").value || 0, bonus: +qs("bonus").value || 0 },
    expenses: {
      credit: +qs("credit").value || 0,
      grocery: +qs("grocery").value || 0,
      petrol: +qs("petrol").value || 0,
      investment: +qs("investment").value || 0,
	  ebill: +qs("ebill").value || 0,
      food: +qs("food").value || 0,
	  movie: +qs("movie").value || 0,
      fast: +qs("fast").value || 0,
	  custom: +qs("custom").value || 0,
      extra: +qs("extraAmount").value || 0
    }
  };

  if (editId) {
    const i = data.findIndex(x => x.id === editId);
    data[i] = monthObj;
  } else {
    data.push(monthObj);
  }

  await saveData(data);
  window.location.href = "index.html";
}

function goBack() {
  window.location.href = "index.html";
}
