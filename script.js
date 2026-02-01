import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update, push, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const DEFAULT_STATE = {
    globalBreak: 210,
    timers: {
        bath: { name: 'Bath', current: 0, limit: 30, restarts: 0, maxRestarts: 1, active: false },
        food: { name: 'Food', current: 15, limit: 15, restarts: 0, maxRestarts: 3, active: false },
        washroom: { name: 'Washroom', current: 15, limit: 15, restarts: 0, maxRestarts: 2, active: false },
        sleep: { name: 'Sleep', current: 420, limit: 420, restarts: 0, maxRestarts: 1, active: false },
        studyBuffer: { name: 'Study Buffer', current: 20, limit: 20, restarts: 0, maxRestarts: 999, active: false }
    }
};

// --- INITIALIZATION ---
// This checks if DB is empty and populates it so you don't get "undefined"
get(ref(db, 'system/')).then((snapshot) => {
    if (!snapshot.exists()) {
        set(ref(db, 'system/'), DEFAULT_STATE);
    }
});

if (isAdmin) {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    document.getElementById('view-title').innerText = "Admin Management";
}

// --- CORE SYNC ---
onValue(ref(db, 'system/'), (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    renderTimers(data.timers);
    renderCoupons(data.coupons || {});
    renderLogs(data.logs || {});
    updateGlobalTimer(data.globalBreak);
});

// --- RENDER FUNCTIONS ---
function renderTimers(timers) {
    const container = document.getElementById('dashboard');
    if (!container) return;
    container.innerHTML = '';

    Object.keys(timers).forEach(key => {
        const t = timers[key];
        const card = document.createElement('div');
        card.className = 'glass-card timer-block';
        card.innerHTML = `
            <h3>${t.name}</h3>
            <div class="circle-timer">
                <div class="timer-val">${formatTime(t.current)}</div>
                <small>Limit: ${t.limit}m</small>
            </div>
            <div class="controls ${isAdmin ? '' : 'hidden'}">
                <button id="btn-${key}">${t.active ? 'STOP' : 'START'}</button>
                <input type="number" id="input-${key}" placeholder="Min to add">
                <button id="update-${key}" class="secondary">Manual Update</button>
            </div>
            <div class="stats">
                Restarts: ${t.restarts} / ${t.maxRestarts > 100 ? '∞' : t.maxRestarts}
            </div>
        `;
        container.appendChild(card);

        // Attach events manually to ensure 'this' context and scoping works
        if (isAdmin) {
            document.getElementById(`btn-${key}`).onclick = () => toggleTimer(key, t.active);
            document.getElementById(`update-${key}`).onclick = () => adjustTime(key, t.current);
        }
    });
}

// --- ACTIONS ---
window.toggleTimer = (id, currentState) => {
    update(ref(db, `system/timers/${id}`), { active: !currentState });
};

window.adjustTime = (id, currentVal) => {
    const input = document.getElementById(`input-${id}`);
    const addedMins = parseInt(input.value);
    if (isNaN(addedMins)) return;

    update(ref(db, `system/timers/${id}`), { 
        current: currentVal + addedMins 
    });
    input.value = '';
};

// --- TICKER LOGIC (1 Minute) ---
// Only runs if you are on the admin page to prevent multiple clients double-ticking
if (isAdmin) {
    setInterval(async () => {
        const snapshot = await get(ref(db, 'system/'));
        const data = snapshot.val();
        if (!data) return;

        let globalDeduction = 0;
        const updates = {};

        Object.keys(data.timers).forEach(key => {
            const t = data.timers[key];
            if (t.active) {
                let newTime = t.current - 1;
                // Overflow logic: If timer hits 0, start eating from Global Break Pool
                if (newTime < 0) {
                    globalDeduction += 1;
                }
                updates[`system/timers/${key}/current`] = newTime;
            }
        });

        if (globalDeduction > 0) {
            updates[`system/globalBreak`] = data.globalBreak - globalDeduction;
        }

        if (Object.keys(updates).length > 0) {
            update(ref(db), updates);
        }
    }, 60000); 
}

// --- UTILS ---
function formatTime(minutes) {
    if (minutes === undefined || isNaN(minutes)) return "00:00";
    const absMin = Math.abs(minutes);
    const h = Math.floor(absMin / 60);
    const m = absMin % 60;
    const sign = minutes < 0 ? "-" : "";
    return `${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function updateGlobalTimer(val) {
    const el = document.getElementById('global-timer');
    if (el) el.innerText = formatTime(val);
}

// Global UI placeholders for coupons/logs
function renderCoupons(c) { /* simplified for now */ }
function renderLogs(l) { /* simplified for now */ }

document.getElementById('restart-day').onclick = () => {
    if(confirm("Reset everything for a new day?")) {
        set(ref(db, 'system/'), DEFAULT_STATE);
    }
};
