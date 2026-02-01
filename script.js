// Main Application Script for Study Discipline System
// This file contains all Firebase integration, timer logic, and UI management

// ============================================================================
// GLOBAL VARIABLES AND INITIALIZATION
// ============================================================================

// Firebase app and database reference
let app;
let database;
let isAdmin = false;

// Timer configuration - defines all timer properties and rules
const timerConfig = {
    global: {
        name: "Global Break Timer",
        icon: "fa-clock",
        totalLimit: 210, // 3.5 hours in minutes
        currentTime: 210,
        color: "#6bc5ff"
    },
    bath: {
        name: "Bath",
        icon: "fa-bath",
        defaultLimit: 30,
        currentTime: 0,
        maxTime: 30,
        restartLimit: "Unlimited",
        restartsToday: 0,
        color: "#4dabf7",
        usedToday: 0
    },
    food: {
        name: "Food",
        icon: "fa-utensils",
        defaultLimit: 15,
        currentTime: 0,
        maxTime: 15,
        restartLimit: 3,
        restartsToday: 0,
        color: "#ff922b",
        usedToday: 0
    },
    washroom: {
        name: "Washroom",
        icon: "fa-toilet",
        defaultLimit: 15,
        currentTime: 0,
        maxTime: 15,
        restartLimit: 2,
        restartsToday: 0,
        color: "#40c057",
        usedToday: 0
    },
    sleep: {
        name: "Sleep",
        icon: "fa-bed",
        defaultLimit: 420, // 7 hours in minutes
        currentTime: 0,
        maxTime: 420,
        restartLimit: 1,
        restartsToday: 0,
        color: "#748ffc",
        usedToday: 0
    },
    studyBuffer: {
        name: "Study Buffer",
        icon: "fa-book",
        defaultLimit: 20,
        currentTime: 0,
        maxTime: 20,
        restartLimit: "Unlimited",
        restartsToday: 0,
        color: "#da77f2",
        usedToday: 0
    },
    weeklyFun: {
        name: "Weekly Fun",
        icon: "fa-gamepad",
        defaultLimit: 0, // Admin defined
        currentTime: 0,
        maxTime: 0,
        restartLimit: 1,
        restartsToday: 0,
        color: "#ff6b6b",
        usedToday: 0,
        weeklyLimit: 0
    }
};

// Active timers tracking
let activeTimers = {};
let coupons = [];
let systemLogs = [];
let currentEditTimer = null;

// DOM Elements cache for performance
const domElements = {};

// ============================================================================
// FIREBASE INITIALIZATION AND DATA SYNC
// ============================================================================

/**
 * Initializes Firebase app and sets up realtime database listeners
 * This function must be called first to establish connection with Firebase
 */
function initializeFirebase() {
    try {
        // Initialize Firebase with provided configuration
        app = firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        
        console.log("Firebase initialized successfully");
        
        // Check for admin mode from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        isAdmin = urlParams.get('admin') === 'true';
        
        // Update UI mode indicator
        updateModeIndicator();
        
        // Set up realtime listeners for all data
        setupRealtimeListeners();
        
    } catch (error) {
        console.error("Firebase initialization error:", error);
        showError("Failed to connect to database. Please refresh the page.");
    }
}

/**
 * Sets up Firebase realtime database listeners for syncing data
 * Listens for changes in timers, coupons, and logs
 */
function setupRealtimeListeners() {
    // Listen for timer data changes
    database.ref('timers').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            updateTimersFromFirebase(data);
            updateAllTimerDisplays();
        }
    });
    
    // Listen for coupon data changes
    database.ref('coupons').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            coupons = Object.values(data);
            renderCoupons();
        } else {
            coupons = [];
            renderCoupons();
        }
    });
    
    // Listen for log data changes
    database.ref('logs').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            systemLogs = Object.values(data);
        } else {
            systemLogs = [];
        }
    });
    
    // Check if this is first run and initialize data if needed
    checkAndInitializeData();
}

/**
 * Updates local timer state from Firebase data
 * @param {Object} firebaseData - Timer data from Firebase
 */
function updateTimersFromFirebase(firebaseData) {
    for (const timerId in timerConfig) {
        if (firebaseData[timerId]) {
            const fbTimer = firebaseData[timerId];
            timerConfig[timerId].currentTime = fbTimer.currentTime || 0;
            timerConfig[timerId].restartsToday = fbTimer.restartsToday || 0;
            timerConfig[timerId].usedToday = fbTimer.usedToday || 0;
            
            // Update weekly fun limit if provided
            if (timerId === 'weeklyFun' && fbTimer.weeklyLimit !== undefined) {
                timerConfig[timerId].weeklyLimit = fbTimer.weeklyLimit;
                timerConfig[timerId].maxTime = fbTimer.weeklyLimit;
            }
        }
    }
    
    // Update global timer from Firebase
    if (firebaseData.global) {
        timerConfig.global.currentTime = firebaseData.global.currentTime || 210;
    }
}

/**
 * Checks if Firebase has data and initializes if empty
 * Prevents overwriting existing data
 */
function checkAndInitializeData()
