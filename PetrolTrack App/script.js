// --- CONSTANTS ---
const ENTRIES_KEY = 'petrol_entries'; 
const USER_KEY = 'petrol_user_creds';
let currentViewDate = new Date();

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname.split("/").pop() || 'index.html';
    const isRemembered = localStorage.getItem('remember_me') === 'true';

// Always load the dashboard data if we are on the home page
    if (path === 'home.html' || path === 'home') {
        updateMonthDisplay();
        loadDashboard(); // This recalculates the totals
        initRealTimeChart();
    }

    if (path === 'profile.html' || path === 'profile') {
        loadProfileData();
    }

    // Auto-login logic
    if (( path === '' || path === 'index.html') && isRemembered) {
        if (localStorage.getItem(USER_KEY)) window.location.href = 'home.html';
    }     
});

/** 1. MONTH NAVIGATION LOGIC **/
function changeMonth(direction) {
    const newDate = new Date(currentViewDate);
    newDate.setMonth(currentViewDate.getMonth() + direction);

    // Restriction: Do not allow navigating past the current actual month
    const today = new Date();
    if (newDate > today) {
        alert("Cannot view future months!");
        return;
    }

    currentViewDate = newDate;
    updateMonthDisplay();
    loadDashboard(); // Refresh data for the new month
}

function updateMonthDisplay() {
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    
    const monthYearString = `${monthNames[currentViewDate.getMonth()]} ${currentViewDate.getFullYear()}`;
    const displayElement = document.querySelector('.month-selector span.fw-bold');
    
    if (displayElement) {
        displayElement.innerText = monthYearString;
    }
}

/** 2. FILTERED DASHBOARD LOGIC **/
function loadDashboard() {
    const entries = JSON.parse(localStorage.getItem(ENTRIES_KEY)) || [];
    
    const totalDisp = document.getElementById('total-amount'); // Red Circle
    const monthlyDisp = document.getElementById('monthly-total'); // Stats Box
    const lowDisp = document.getElementById('lowest-amount');
    const highDisp = document.getElementById('highest-amount');

    // Filter entries for the selected month and year
    const filteredEntries = entries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getMonth() === currentViewDate.getMonth() && 
               entryDate.getFullYear() === currentViewDate.getFullYear();
    });

    if (filteredEntries.length === 0) {
        // Reset to 0 if no entries for this specific month
        if(monthlyDisp) monthlyDisp.innerText = "0";
        if(lowDisp) lowDisp.innerText = "0";
        if(highDisp) highDisp.innerText = "0";
    } else {
        const prices = filteredEntries.map(e => parseFloat(e.petrolPrice) || 0);
        const monthlySum = prices.reduce((acc, curr) => acc + curr, 0);
        
        if(monthlyDisp) monthlyDisp.innerText = formatNumber(Math.round(monthlySum));
        if(lowDisp) lowDisp.innerText = formatNumber(Math.round(Math.min(...prices)));
        if(highDisp) highDisp.innerText = formatNumber(Math.round(Math.max(...prices)));
    }

    // Always show the TOTAL accumulation (all time) in the Red Circle
    const allTimeTotal = entries.reduce((acc, curr) => acc + (parseFloat(curr.petrolPrice) || 0), 0);
    if(totalDisp) totalDisp.innerText = formatNumber(Math.round(allTimeTotal));
}

/** Renders the Bangalore Petrol Trend Chart */
function initRealTimeChart() {
    const chartCanvas = document.getElementById('petrolTrendChart');
    if (!chartCanvas) return;

    const ctx = chartCanvas.getContext('2d');
    const bglPrices = [102.86, 102.86, 102.95, 103.10, 102.86, 102.90, 103.00];

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                data: bglPrices,
                borderColor: '#28a745',
                borderWidth: 3,
                pointRadius: 4,
                fill: true,
                backgroundColor: 'rgba(40, 167, 69, 0.2)', // Increased opacity for visibility
                tension: 0.3
            }]
        },
        options: {
            responsive: true,           // Ensures it fits the container
            maintainAspectRatio: false, // Allows custom height
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#000', font: { family: 'Poppins', weight: '600' } } },
                y: { ticks: { color: '#000', font: { family: 'Poppins' } } }
            }
        }
    });
}

/** 1. AUTOMATIC LITRE CALCULATION **/
function calculateLitres() {
    const totalPrice = parseFloat(document.getElementById('petrolPrice').value);
    const pricePerLitre = parseFloat(document.getElementById('pricePerLitre').value);
    const litreField = document.getElementById('litre');

    if (totalPrice && pricePerLitre && pricePerLitre > 0) {
        // formula: Total Price / Price Per Litre = Litres
        const result = totalPrice / pricePerLitre;
        litreField.value = result.toFixed(2); 
    } else {
        litreField.value = "";
    }
}

/** 2. SAVE ENTRY LOGIC **/
function handleNewEntry(event) {
    event.preventDefault();

    const priceValue = document.getElementById('petrolPrice').value;
    
    const newEntry = {
        id: Date.now(),
        date: document.getElementById('entryDate').value,
        petrolPrice: parseFloat(priceValue), // Convert to number here!
        place: document.getElementById('place').value,
        pricePerLitre: document.getElementById('pricePerLitre').value,
        litre: document.getElementById('litre').value,
        vehicle: document.getElementById('vehicle').value, // Now a text input
        notes: document.getElementById('notes').value
    };

    // Pull existing data using the exact same key
    const entries = JSON.parse(localStorage.getItem(ENTRIES_KEY)) || [];
    entries.push(newEntry);
    
    // Save back to storage
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));

    alert("Entry Saved! Current Price: " + priceValue);
    window.location.href = 'home.html';
}

/** DISPLAY ALL ENTRIES IN TABLE **/
function displayTableEntries() {
    const entries = JSON.parse(localStorage.getItem(ENTRIES_KEY)) || [];
    const tableBody = document.getElementById('entriesBody');
    
    if (!tableBody) return;
    tableBody.innerHTML = "";

    entries.forEach(entry => {
        const row = document.createElement('tr');
        row.className = "clickable-row";
        row.onclick = () => window.location.href = `edit-entry.html?id=${entry.id}`;
        
        // Use logical OR (|| "") to handle empty/blank fields
        row.innerHTML = `
            <td>${entry.date || ""}</td>
            <td>${entry.petrolPrice ? formatNumber(entry.petrolPrice) : ""}</td>
            <td>${entry.place || ""}</td>
            <td>${entry.pricePerLitre || ""}</td>
            <td>${entry.litre || ""}</td>
            <td>${entry.vehicle || ""}</td>
            <td class="text-truncate" style="max-width: 150px;">${entry.notes || ""}</td>
        `;
        tableBody.appendChild(row);
    });
}

/** Load specific entry data into the edit form */
function loadEntryToEdit(id) {
    const entries = JSON.parse(localStorage.getItem(ENTRIES_KEY)) || [];
    const entry = entries.find(e => e.id == id);

    if (entry) {
        document.getElementById('entryDate').value = entry.date;
        document.getElementById('petrolPrice').value = entry.petrolPrice;
        document.getElementById('place').value = entry.place;
        document.getElementById('pricePerLitre').value = entry.pricePerLitre;
        document.getElementById('litre').value = entry.litre;
        document.getElementById('vehicle').value = entry.vehicle;
        document.getElementById('notes').value = entry.notes;
        
        // Save the ID in a global variable or hidden input to know which one to update
        window.currentEditingId = id;
    }
}

/** Update the existing entry in localStorage */
function updateEntry(event) {
    event.preventDefault();
    const entries = JSON.parse(localStorage.getItem(ENTRIES_KEY)) || [];
    
    const index = entries.findIndex(e => e.id == window.currentEditingId);
    
    if (index !== -1) {
        entries[index] = {
            id: window.currentEditingId,
            date: document.getElementById('entryDate').value,
            petrolPrice: parseFloat(document.getElementById('petrolPrice').value),
            place: document.getElementById('place').value,
            pricePerLitre: document.getElementById('pricePerLitre').value,
            litre: document.getElementById('litre').value,
            vehicle: document.getElementById('vehicle').value,
            notes: document.getElementById('notes').value
        };

        localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
        alert("Entry updated successfully!");
        window.location.href = 'home.html';
    }
}

/** Delete the entry from localStorage */
function deleteEntry() {
    if (confirm("Are you sure you want to delete this entry?")) {
        let entries = JSON.parse(localStorage.getItem(ENTRIES_KEY)) || [];
        entries = entries.filter(e => e.id != window.currentEditingId);
        
        localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
        alert("Entry deleted.");
        window.location.href = 'home.html';
    }
}

/** 2. SEARCH FILTER LOGIC (FIXED) **/
function filterTable() {
    // Get the search input value and convert to lowercase
    const input = document.getElementById('tableSearch');
    if (!input) return;
    
    const filter = input.value.toLowerCase();
    const tableBody = document.getElementById('entriesBody');
    const rows = tableBody.getElementsByTagName('tr');

    // Loop through all table rows
    for (let i = 0; i < rows.length; i++) {
        let rowVisible = false;
        const cells = rows[i].getElementsByTagName('td');
        
        // Loop through all cells in the current row
        for (let j = 0; j < cells.length; j++) {
            const cellText = cells[j].textContent || cells[j].innerText;
            if (cellText.toLowerCase().indexOf(filter) > -1) {
                rowVisible = true;
                break; // If found in one cell, no need to check others
            }
        }

        // Show or hide the row based on the search result
        rows[i].style.display = rowVisible ? "" : "none";
    }
}

/** 1. EXPORT TO EXCEL **/
function exportToExcel() {
    const entries = JSON.parse(localStorage.getItem(ENTRIES_KEY)) || [];
    if (entries.length === 0) return alert("No data to export!");

    // Create a new workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(entries);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Petrol Entries");

    // Download the file
    XLSX.writeFile(workbook, "PetrolTrack_Expenses.xlsx");
}

/** 2. EXPORT TO PDF **/
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const entries = JSON.parse(localStorage.getItem(ENTRIES_KEY)) || [];

    if (entries.length === 0) return alert("No data to export!");

    // Prepare table headers and data
    const headers = [["Date", "Price", "Place", "Rate/Ltr", "Litres", "Vehicle"]];
    const data = entries.map(e => [
        e.date, 
        e.petrolPrice, 
        e.place, 
        e.pricePerLitre, 
        e.litre, 
        e.vehicle
    ]);

    // Generate table
    doc.text("PetrolTrack Expense Report", 14, 15);
    doc.autoTable({
        head: headers,
        body: data,
        startY: 20,
        theme: 'grid',
        headStyles: { fillColor: [76, 175, 80] } // Match your green theme
    });

    doc.save("PetrolTrack_Report.pdf");
}

/** 1. DOWNLOAD BACKUP (JSON file) **/
function downloadBackup() {
    const data = {
        entries: JSON.parse(localStorage.getItem(ENTRIES_KEY)) || [],
        user: JSON.parse(localStorage.getItem(USER_KEY)) || {}
    };
    
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PetrolTrack_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}
/** 2. RESTORE BACKUP **/
function restoreBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Check if keys exist in the JSON
            if (importedData.entries && importedData.user) {
                // Set the exact keys your app uses
                localStorage.setItem(ENTRIES_KEY, JSON.stringify(importedData.entries));
                localStorage.setItem(USER_KEY, JSON.stringify(importedData.user));
                
                alert("Data Restored Successfully!");
                
                // Force redirect to home to refresh all global variables
                window.location.href = 'home.html'; 
            }
        } catch (err) {
            alert("Error: Invalid backup file format.");
        }
    };
    reader.readAsText(file);
}

function handleSignUp(event) {
    event.preventDefault();
    const email = document.getElementById('regEmail').value;
    const mobile = document.getElementById('regMobile').value;
    const user = document.getElementById('regUser').value;
    const password = document.getElementById('regPass').value;
    if (password !== document.getElementById('regConfirm').value) return alert("Passwords match error!");

    localStorage.setItem(USER_KEY, JSON.stringify({ user, email, mobile, password, country: "India" }));
    alert("Account created! Please login.");
    window.location.href = 'index.html';
}

function handleLogin(event) {
    event.preventDefault();
    
    const userInp = document.getElementById('loginUser').value;
    const passInp = document.getElementById('loginPass').value;
    const rememberMe = document.getElementById('rememberMeCheckbox').checked;
    const savedUser = JSON.parse(localStorage.getItem(USER_KEY));

    if (savedUser && userInp === savedUser.user && passInp === savedUser.password) {
        // This is the variable you want for current session navigation
        localStorage.setItem('redirect', 'true'); 
        
        // This is only for the auto-login on next app open
        localStorage.setItem('remember_me', rememberMe); 
        
        window.location.href = 'home.html';
    } else {
        alert("Invalid Username or Password.");
    }
}

function loadProfileData() {
    const saved = JSON.parse(localStorage.getItem(USER_KEY));
    if (saved) {
        document.getElementById('prof-name').value = saved.user || "";
        document.getElementById('prof-email').value = saved.email || "";
        document.getElementById('prof-mobile').value = saved.mobile || "";
        document.getElementById('prof-country').value = saved.country || "";
    }
}

function saveProfileChanges(event) {
    event.preventDefault();
    const current = JSON.parse(localStorage.getItem(USER_KEY));
    const updated = {
        user: document.getElementById('prof-name').value,
        email: document.getElementById('prof-email').value,
        mobile: document.getElementById('prof-mobile').value,
        country: document.getElementById('prof-country').value,
        password: current.password
    };
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    alert("Profile Updated!");
}

function handleLogout() {
    localStorage.setItem('remember_me', 'false');
	localStorage.setItem('redirect', 'false');
    window.location.href = 'index.html';
}

function smartNavigate(event) {
    event.preventDefault();
    
    // Check for the redirect flag we set during handleLogin
    const isLoggedIn = localStorage.getItem('redirect') === 'true';
    
    // Determine the target destination
    const destination = isLoggedIn ? 'home.html' : 'index.html';
    console.log(destination);
    // Perform the redirect
    window.location.href = destination;
}

function formatNumber(num) {
    return Number(num).toLocaleString('en-IN'); // 'en-IN' uses the Indian numbering system (e.g., 1,00,000)
}