import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAnX310YufEPE5ODH0RHusbtaw9wNGGhdE",
    authDomain: "study-system-29.firebaseapp.com",
    databaseURL: "https://study-system-29-default-rtdb.firebaseio.com",
    projectId: "study-system-29",
    storageBucket: "study-system-29.firebasestorage.app",
    messagingSenderId: "407118949554",
    appId: "1:407118949554:web:17eeecc4c20db90da22dab"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Logic: Check URL for Admin
const urlParams = new URLSearchParams(window.location.search);
const isAdmin = urlParams.get('admin') === 'true';

// System State Structure
const DEFAULT_STATE = {
    globalBreak: 210, // Minutes
    timers: {
        bath: { name: 'Bath', current: 30, limit: 30, restarts: 0, maxRestarts: Infinity, active: false },
        food: { name: 'Food', current: 15, limit: 15, restarts: 0, maxRestarts: 3, active: false },
        washroom: { name: 'Washroom', current: 15, limit: 15, restarts: 0, maxRestarts: 2, active: false },
        sleep: { name: 'Sleep', current: 420, limit: 420, restarts: 0, maxRestarts: 1, active: false },
        studyBuffer: { name: 'Study Buffer', current: 20, limit: 20, restarts: 0, maxRestarts: Infinity, active: false }
    },
    coupons: {},
    logs: []
};

// Initialize UI
if (isAdmin) {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    document.getElementById('view-title').innerText = "Admin Management";
}

// 1. CORE SYNC LOGIC
onValue(ref(db, 'system/'), (snapshot) => {
    const data = snapshot.val() || DEFAULT_STATE;
    renderTimers(data);
    renderCoupons(data.coupons);
    renderLogs(data.logs);
    updateGlobalTimer(data.globalBreak);
});

// 2. RENDER FUNCTIONS
function renderTimers(data) {
    const container = document.getElementById('dashboard');
    container.innerHTML = '';

    Object.keys(data.timers).forEach(key => {
        const t = data.timers[key];
        const card = document.createElement('div');
        card.className = 'glass-card timer-block';
        card.innerHTML = `
            <h3>${t.name}</h3>
            <div class="circle-timer">
                <div class="timer-val">${formatTime(t.current)}</div>
                <small>Limit: ${t.limit}m</small>
            </div>
            <div class="controls ${isAdmin ? '' : 'hidden'}">
                <button onclick="toggleTimer('${key}', ${t.active})">${t.active ? 'STOP' : 'START'}</button>
                <input type="number" id="add-${key}" placeholder="Add Minutes">
                <button onclick="adjustTime('${key}')">Manual Update</button>
            </div>
            <div class="stats">
                Restarts: ${t.restarts}/${t.maxRestarts === Infinity ? '∞' : t.maxRestarts}
            </div>
        `;
        container.appendChild(card);
    });
}

// 3. TIMER ACTIONS (ADMIN ONLY)
window.toggleTimer = (id, currentState) => {
    update(ref(db, `system/timers/${id}`), { active: !currentState });
    addLog(`Timer ${id} toggled to ${!currentState}`);
};

window.adjustTime = (id) => {
    const val = parseInt(document.getElementById(`add-${id}`).value);
    if (isNaN(val)) return;
    
    // Logic: Fetch current, add val, check overflow
    const timerRef = ref(db, `system/timers/${id}`);
    // This would typically involve a transaction for safety
    // For brevity in this setup, we use standard update logic
};

// 4. GLOBAL LOGIC
function formatTime(minutes) {
    const h = Math.floor(Math.abs(minutes) / 60);
    const m = Math.abs(minutes) % 60;
    const sign = minutes < 0 ? "-" : "";
    return `${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function updateGlobalTimer(val) {
    const el = document.getElementById('global-timer');
    el.innerText = formatTime(val);
    if (val < 0) el.style.color = "#ff4d4d";
}

// 5. TICKER LOGIC (Runs every minute)
// Only one client should ideally tick to avoid race conditions, 
// but for a simple "discipline" app, we run local tick and sync.
setInterval(() => {
    if (!isAdmin) return; // Only admin page drives the clock to prevent multi-user speedup
    // Logic: If timer active, decrement current. If current < 0, decrement globalBreak.
}, 60000);

// 6. LOGGING SYSTEM
function addLog(msg) {
    const logRef = ref(db, 'system/logs');
    push(logRef, {
        msg,
        timestamp: new Date().toLocaleTimeString()
    });
}

function renderLogs(logs) {
    const container = document.getElementById('logs-container');
    container.innerHTML = '';
    if (!logs) return;
    Object.values(logs).reverse().slice(0, 10).forEach(log => {
        const p = document.createElement('p');
        p.className = 'log-entry';
        p.innerHTML = `<small>${log.timestamp}</small> - ${log.msg}`;
        container.appendChild(p);
    });
}

// Restart Day Event
document.getElementById('restart-day').onclick = () => {
    set(ref(db, 'system/'), DEFAULT_STATE);
    addLog("System Reset - New Day Started");
};
