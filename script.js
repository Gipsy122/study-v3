// INITIALIZATION & STATE
let state = {
    globalBank: 210 * 60, // 210 minutes in seconds
    timers: {
        bath: { elapsed: 0, limit: 30 * 60, running: false },
        food: { elapsed: 0, limit: 15 * 60, running: false, restarts: 3 },
        // Add others here...
    },
    coupons: []
};

// Check for Admin URL Parameter
const isAdmin = new URLSearchParams(window.location.search).get('admin') === 'true';

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initUI();
    setInterval(updateTick, 1000); // Main logic loop
});

// CORE LOGIC LOOP
function updateTick() {
    Object.keys(state.timers).forEach(key => {
        const timer = state.timers[key];
        if (timer.running) {
            timer.elapsed++;
            
            // Overflow Logic: If elapsed > limit, deduct from Global Bank
            if (timer.elapsed > timer.limit) {
                state.globalBank--;
            }
        }
    });
    saveState();
    render();
}

// TIME FORWARDING FUNCTION
function jumpTime(key) {
    if (!isAdmin) return;
    const input = document.querySelector(`#block-${key} .jump-input`);
    const mins = parseInt(input.value) || 0;
    const secondsToAdd = mins * 60;

    const timer = state.timers[key];
    const newElapsed = timer.elapsed + secondsToAdd;

    // Logic: If jump goes over limit, calculate the overflow immediately
    if (newElapsed > timer.limit) {
        const overflow = newElapsed - Math.max(timer.limit, timer.elapsed);
        state.globalBank -= overflow;
    }
    
    timer.elapsed = newElapsed;
    input.value = '';
    render();
}

// UI RENDERING
function render() {
    // Render Global Bank
    const bankMin = Math.floor(state.globalBank / 60);
    const bankSec = state.globalBank % 60;
    document.getElementById('bank-timer').innerText = `${bankMin}:${bankSec.toString().padStart(2, '0')}`;

    // Render Individual Blocks
    Object.keys(state.timers).forEach(key => {
        const timer = state.timers[key];
        const block = document.getElementById(`block-${key}`);
        if (!block) return;

        const display = block.querySelector('.timer-display');
        const min = Math.floor(timer.elapsed / 60);
        const sec = timer.elapsed % 60;
        display.innerText = `${min}:${sec.toString().padStart(2, '0')}`;

        // Update Ring (219.9 is the circumference for r=35)
        const ring = document.getElementById(`ring-${key}`);
        const progress = Math.min(timer.elapsed / timer.limit, 1);
        ring.style.strokeDashoffset = 219.9 - (progress * 219.9);
        
        // Color shift if overflow
        if (timer.elapsed > timer.limit) ring.style.stroke = "#ff4b2b";
    });
}

function initUI() {
    if (isAdmin) {
        document.getElementById('admin-controls').classList.remove('hidden');
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    }
}

// PERSISTENCE
function saveState() {
    localStorage.setItem('liquid_glass_state', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('liquid_glass_state');
    if (saved) state = JSON.parse(saved);
}
