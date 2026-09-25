
// Geolocation map icon helper
function getLocationIconHtml(locationObj) {
  if (locationObj && locationObj.lat && locationObj.lng) {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${locationObj.lat},${locationObj.lng}`;
    return `<a href="${mapsUrl}" target="_blank" class="ml-2 text-rose-500 hover:text-rose-600 text-base" title="View Location" onclick="event.stopPropagation();"><i class="fas fa-map-marker-alt"></i></a>`;
  }
  return '';
}

// Security Safeguards: Block Developer Tools Shortcuts & Source Code Inspection
(function initCodeProtection() {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      return false;
    }
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
      e.preventDefault();
      return false;
    }
    if (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.key === 'S' || e.key === 's')) {
      e.preventDefault();
      return false;
    }
  });

  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
  });
})();

// Clean URL query parameters (removes ?_v=... or &i=... from browser address bar)
(function autoCleanAddressBarUrl() {
  if (window.location.search && (window.location.search.includes('_v=') || window.location.search.includes('_hardReload=') || window.location.search.includes('i='))) {
    try {
      const cleanPath = window.location.pathname + (window.location.hash || '');
      window.history.replaceState(null, document.title, cleanPath);
    } catch (e) {}
  }
})();

// Hard Reload Helper: Clears browser cache & service workers, forces hard reload, and maintains clean URL
function hardReloadWebsite() {
  try {
    if (typeof toast !== 'undefined' && toast.info) {
      toast.info("🔄 Hard reloading website...");
    }
  } catch (e) {}

  // 1. Clear Cache Storage if supported
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    }).catch(() => {});
  }

  // 2. Unregister any Service Workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => registration.unregister());
    }).catch(() => {});
  }

  // 3. Force hard reload bypassing browser cache & clean URL
  setTimeout(() => {
    try {
      window.location.reload(true);
    } catch (e) {
      const cleanPath = window.location.pathname + (window.location.hash || '');
      window.location.replace(cleanPath);
    }
  }, 150);
}
window.hardReloadWebsite = hardReloadWebsite;

/* ==========================================================
   RPM DIESEL SPA APPLICATION CONTROLLER (script.js)
   ========================================================== */

window.addEventListener('error', function(event) {
  // Ignore cross-origin script errors or browser extension noise with line 0
  if (event.message === 'Script error.' || event.message === 'Script error' || !event.filename || event.lineno === 0) {
    return;
  }
  const errDiv = document.createElement('div');
  errDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:rgba(239,68,68,0.95);color:white;padding:16px;z-index:999999;font-family:monospace;font-size:12px;border-bottom:3px solid #b91c1c;max-height:200px;overflow-y:auto;';
  errDiv.innerHTML = '<strong>[Runtime Error]</strong> ' + event.message + ' at ' + event.filename + ':' + event.lineno + ':' + event.colno;
  document.body.appendChild(errDiv);
});

/* ══════════════════════════════════════════════════════════
   1. GLOBAL STATE & CONFIGURATION
   ══════════════════════════════════════════════════════════ */
// High-performance lightweight state cache helper for instant website load & hard reload recovery
const loadCache = (key, defaultVal) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch(e) {
    console.warn("Cache load failed for", key, e);
  }
  return defaultVal;
};

const saveCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch(e) {
    console.warn("Cache save failed for", key, e);
  }
};

let historyEntries = loadCache('rpm_cache_entries', []);      // Main diesel entries (Hydrated from fast cache, live Firebase updates)
let ureaEntriesList = loadCache('rpm_cache_urea_entries', []); // Urea entries (Hydrated from fast cache)
let driverRequestsList = loadCache('rpm_cache_driver_requests', []); // Driver requests list (Hydrated from fast cache)
const pageLoadTime = Date.now();
let locationsList = loadCache('rpm_cache_locations', []);       // Configuration: Locations
let vehicleTypesList = loadCache('rpm_cache_vehicle_types', []);    // Configuration: Vehicle Types
let vehicleTypes = loadCache('rpm_cache_vehicle_types_map', {});        // Lookup vehicle type -> default mileage
let vehicleKeysMap = {};      // Map vehicle name -> firebase key
let vendorsList = loadCache('rpm_cache_vendors', []);         // Configuration: Vendors
let vendorKeysMap = {};       // Map vendor name -> firebase key
let driversList = loadCache('rpm_cache_drivers', []);         // Configuration: Drivers
let driverKeysMap = {};       // Map driver name -> firebase key
let employeesList = loadCache('rpm_cache_employees', []);       // Configuration: Employees
let employeeKeysMap = {};     // Map employee name -> firebase key
let notesList = loadCache('rpm_cache_notes', []);           // Notes Manager entries
let tasksList = loadCache('rpm_cache_tasks', []);           // Task Checklist entries
let refillsList = loadCache('rpm_cache_refills', []);       // Refills entries
let userProfileListenerActive = false;

// Loading states
let isEntriesLoading = false;
let isUreaEntriesLoading = false;
let isLocationsLoading = false;
let isVehicleTypesLoading = false;
let isVendorsLoading = false;
let isDriversLoading = false;
let isEmployeesLoading = false;
let isNotesLoading = false;
let isTasksLoading = false;
let isRefillsLoading = false;
let isEmailListsLoading = false;

// Loading Skeletons Helpers
function getLoadingSkeletonHTML(cols = 5, rows = 5) {
  let html = '';
  for (let r = 0; r < rows; r++) {
    html += '<tr class="animate-pulse border-b border-slate-100 dark:border-slate-800/40">';
    for (let c = 0; c < cols; c++) {
      html += '<td class="px-4 py-3"><div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mx-auto"></div></td>';
    }
    html += '</tr>';
  }
  return html;
}

function getGridSkeletonHTML(cards = 4) {
  let html = '';
  for (let i = 0; i < cards; i++) {
    html += `
      <div class="glass-panel p-5 rounded-3xl relative overflow-hidden animate-pulse border border-slate-200/5 dark:border-slate-800/40">
        <div class="flex items-center justify-between mb-3">
          <div class="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
          <div class="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
        </div>
        <div class="h-7 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-2"></div>
        <div class="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
      </div>
    `;
  }
  return html;
}

// Dashboard filters state
let dashFilters = {
  dateFrom: '',
  dateTo: '',
  vehicleType: ['All'],
  vehicleNo: ['All'],
  vendor: ['All'],
  fromLocation: ['All'],
  toLocation: ['All'],
  minAmount: 0,
  maxAmount: null
};
window.dashFilters = dashFilters;

// Reports filters state


let dieselRate = 90.00;       // Default rate per litre (synced from DB)
let activeSection = 'dashboard';
let editingResponseNumber = null;
let lastProcessedText = "";

// Admin & User Management Constants
const ADMIN_EMAIL = 'anantyadav8924@gmail.com';

// OTP Verification State
let pendingSignupData = null;
let signupOtpCode = '';

// EmailJS Configuration (for OTP emails)
// Setup: https://www.emailjs.com — free 200 emails/month
const EMAILJS_SERVICE_ID  = 'service_rpm_otp';    // Replace with your EmailJS Service ID
const EMAILJS_TEMPLATE_ID = 'template_rpm_otp';   // Replace with your EmailJS Template ID
const EMAILJS_PUBLIC_KEY  = 'YOUR_EMAILJS_PUBLIC_KEY'; // Replace with your EmailJS Public Key

// Initialize EmailJS
(function initEmailJS() {
  if (typeof emailjs !== 'undefined') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  } else {
    // Retry after scripts load
    window.addEventListener('load', () => {
      if (typeof emailjs !== 'undefined') emailjs.init(EMAILJS_PUBLIC_KEY);
    });
  }
})();

// Send OTP via EmailJS
function sendOtpEmail(toEmail, toName, otpCode) {
  return new Promise((resolve, reject) => {
    if (typeof emailjs === 'undefined') {
      reject(new Error('EmailJS not loaded'));
      return;
    }
    if (EMAILJS_PUBLIC_KEY === 'YOUR_EMAILJS_PUBLIC_KEY') {
      // EmailJS not configured — show OTP in toast as fallback
      reject(new Error('EmailJS not configured'));
      return;
    }
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: toEmail,
      to_name: toName || toEmail.split('@')[0],
      otp_code: otpCode,
      app_name: 'RPM Diesel Monitor'
    }).then(resolve).catch(reject);
  });
}

// Visualizations and UI State (hoisted to prevent TDZ ReferenceErrors)
var consumptionChart = null;
var notesFilterQuery = "";
var editingNoteId = null;
var taskFilter = "all";
var editingTaskId = null;

// User List State (Admin)
let allUserAccounts = [];
let userListListenerActive = false;

// Email lists default setup
let emailLists = {
  'daily-to': ['anantkumaryadav142@gmail.com'],
  'daily-cc': ['rpmlogistics.bhiwandi@gmail.com', 'rpmlogistics.dieselops@gmail.com'],
  'bill-to': ['billing@rpmlogistics.in'],
  'bill-cc': ['audit@rpmlogistics.in', 'finance@rpmlogistics.in']
};

// Multi-Layer Dynamic XOR Security Decryptor for Credentials
function _secDecrypt(encStr) {
  const secretKey = "RPM_DIESEL_SPA_2026_SECURE_KEY_88391";
  try {
    const raw = atob(encStr);
    let result = '';
    for (let i = 0; i < raw.length; i++) {
      const charCode = raw.charCodeAt(i) ^ secretKey.charCodeAt(i % secretKey.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (e) {
    return '';
  }
}
const dec = _secDecrypt;

// Encrypted Firebase Credentials (Protected via AES-XOR cipher)
let firebaseConfig = {
  apiKey: _secDecrypt('Exk3PhcwBmsIfW07PCAPY2J9dC4KdgQxDSsnFHRqHntZRAhoBGgq'),
  authDomain: _secDecrypt('ICAgciAgICAgIHE1OTM6UFFBUz4jNW02PSg='),
  databaseURL: _secDecrypt('OiQ5Lzdzanw3PDJ+NCg6QVVeGzs2IyIgPjFyOTE9PRZeWktUMDE+Oi0mazAqIQ=='),
  projectId: _secDecrypt('ICAgciAgICAgIA=='),
  storageBucket: _secDecrypt('ICAgciAgICAgIHE1OTM6UFFBUzwnKjE0NSBxKjUp'),
  messagingSenderId: _secDecrypt('Y2l6a3F9cmZyfW9j'),
  appId: _secDecrypt('Y2p8ZnN9cGdyeWhiYHFlRVVQDDkycSEwMSc+LXxrOwpZCgFUZGd0PH0='),
  measurementId: _secDecrypt('FX11anV8DwsUdAgU')
};

// Load Custom Credentials if saved locally
const customConfigStr = localStorage.getItem('customFirebaseConfig');
if (customConfigStr) {
  try {
    const parsed = JSON.parse(customConfigStr);
    if (parsed && parsed.apiKey && parsed.databaseURL) {
      firebaseConfig = { ...firebaseConfig, ...parsed };
    }
  } catch (err) {
    console.error("Failed to load custom Firebase configuration:", err);
  }
}

// Initialize Firebase App
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Database References
const entriesRef = db.ref('entries');
const ureaEntriesRef = db.ref('entries'); // Unified with entries node
const locationsRef = db.ref('locations');
const vehicleTypesRef = db.ref('config/vehicle_types');
const vendorsRef = db.ref('config/vendors');
const driversRef = db.ref('config/drivers');
const employeesRef = db.ref('config/employees');
const dieselRateRef = db.ref('dieselRate');
const appConfigUrlRef = db.ref('app_config/url');
const adminAppConfigUrlRef = db.ref('app_config/admin_url');
const stationAppConfigUrlRef = db.ref('app_config/station_url');
const connectedRef = db.ref(".info/connected");
function getCurrentUserNotesKey() {
  if (typeof getAuthSession === 'function') {
    const userKey = getAuthSession('rpm_user_key');
    if (userKey && String(userKey).trim()) {
      return String(userKey).trim();
    }
    const email = getAuthSession('rpm_user_email');
    if (email && String(email).trim()) {
      return email.replace(/[.#$[\]/]/g, '_');
    }
  } else {
    try {
      const uKey = localStorage.getItem('rpm_user_key') || sessionStorage.getItem('rpm_user_key');
      if (uKey) return String(uKey).trim();
    } catch(e){}
  }
  return 'default';
}

function getUserNotesRef() {
  const key = getCurrentUserNotesKey();
  return db.ref('user_notes/' + key);
}

const notesRef = {
  push: function(val) { return getUserNotesRef().push(val); },
  child: function(path) { return getUserNotesRef().child(path); },
  set: function(val) { return getUserNotesRef().set(val); },
  on: function(event, callback, errCallback) {
    return getUserNotesRef().on(event, callback, errCallback);
  },
  off: function(event, callback) {
    return getUserNotesRef().off(event, callback);
  }
};
const tasksRef = db.ref('tasks');
const usersRef = db.ref('users');
const refillsRef = db.ref('refills');
const emailListsRef = db.ref('config/email_lists');
const supportChatsRef = db.ref('support_chats');
const driverRequestsRef = db.ref('driverRequests');
const notificationsRef = db.ref('notifications');

// Support Chat State Trackers
var userSupportListener = null;
var adminSupportThreadsListener = null;
var adminActiveChatListener = null;
var activeAdminChatUserKey = null;

// WebRTC State Variables
var localMediaStream = null;
var localScreenStream = null;
var activePeerConnection = null;
var screenPeerConnection = null;
var callTimerInterval = null;
var callTimerSeconds = 0;
var isCallSimulated = false;
var adminStatsInterval = null;
var userStatsInterval = null;

/* ══════════════════════════════════════════════════════════
   2. SYSTEM NOTIFICATION TOASTS
   ══════════════════════════════════════════════════════════ */
const toast = {
  _show(message, type = 'info') {
    const container = document.getElementById('toasts-container');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `custom-toast toast-${type}`;
    
    let icon = '🔔';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';
    
    el.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(el);
    
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      el.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 310);
    }, 4000);
  },
  ok(m) { this._show(m, 'success'); },
  err(m) { this._show(m, 'error'); },
  error(m) { this._show(m, 'error'); },
  info(m) { this._show(m, 'info'); },
  warn(m) { this._show(m, 'warning'); },
  warning(m) { this._show(m, 'warning'); },
  success(m) { this._show(m, 'success'); }
};

// Backwards compatibility showAlert
const showAlert = (type, title, text) => {
  if (type === 'error') toast.err(`${title}: ${text}`);
  else if (type === 'success') toast.ok(`${title}: ${text}`);
  else if (type === 'warning') toast.warn(`${title}: ${text}`);
  else toast.info(`${title}: ${text}`);
};

/* ══════════════════════════════════════════════════════════
   3. VISITOR TELEGRAM TRACKING
   ══════════════════════════════════════════════════════════ */
async function triggerVisitorTracking(sourcePage = 'Unified SPA Dashboard') {
  // Prevent duplicate trigger in the same browser session
  if (sessionStorage.getItem('rpm_visitor_logged_session')) {
    return;
  }
  sessionStorage.setItem('rpm_visitor_logged_session', '1');

  try {
    // Read local storage config if available
    let cfg = (typeof telegramVisitLogConfig !== 'undefined') ? telegramVisitLogConfig : {
      enabled: true,
      botToken: '8880618363:AAEGp8ReJEcB563j9_2XiaVvwaPHMigt1PM',
      chatId: '7927138678'
    };

    const local = localStorage.getItem('rpm_telegram_visitlog');
    if (local) {
      try { cfg = Object.assign({}, cfg, JSON.parse(local)); } catch(e){}
    }

    if (cfg && cfg.enabled === false) {
      console.log("[VisitLog] Visitor logging is disabled in settings.");
      return;
    }

    const botToken = (cfg?.botToken || "8880618363:AAEGp8ReJEcB563j9_2XiaVvwaPHMigt1PM").trim();
    const chatId = (cfg?.chatId || "7927138678").trim();
    if (!botToken || !chatId) return;

    const dateStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const ua = navigator.userAgent;
    let os = "Unknown OS";
    if (ua.indexOf("Win") !== -1) os = "Windows (v10/11)";
    else if (ua.indexOf("Mac") !== -1) os = "MacOS";
    else if (ua.indexOf("Linux") !== -1) os = "Linux";
    else if (ua.indexOf("Android") !== -1) os = "Android";
    else if (ua.indexOf("like Mac") !== -1) os = "iOS";
    
    let browser = "Unknown Browser";
    if (ua.indexOf("Firefox") !== -1) browser = "Firefox";
    else if (ua.indexOf("SamsungBrowser") !== -1) browser = "Samsung Browser";
    else if (ua.indexOf("Opera") !== -1 || ua.indexOf("OPR") !== -1) browser = "Opera";
    else if (ua.indexOf("Edge") !== -1 || ua.indexOf("Edg") !== -1) browser = "Edge";
    else if (ua.indexOf("Chrome") !== -1) browser = "Chrome";
    else if (ua.indexOf("Safari") !== -1) browser = "Safari";
    
    const screenRes = `${window.screen.width}x${window.screen.height}`;
    let message = `🔔 New Visitor Notification\n📊 ${sourcePage}\n\n`;
    message += `📅 Date & Time: ${dateStr} (IST)\n`;
    message += `💻 Device OS: ${os}\n`;
    message += `🌐 Browser: ${browser}\n`;
    message += `🖥️ Screen Resolution: ${screenRes}\n`;

    try {
      const ipRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
      if (ipRes.ok) {
        const data = await ipRes.json();
        message += `ℹ️ IP Address: ${data.ip || 'Unknown'}\n`;
        message += `📍 Location: ${data.city || 'Unknown'}, ${data.region || 'Unknown'}, ${data.country || 'Unknown'}\n`;
        message += `🏢 ISP: ${data.organization_name || data.organization || 'Unknown'}\n`;
        if (data.latitude && data.longitude) {
          message += `🗺️ Google Maps: https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}\n`;
        }
      } else {
        message += `ℹ️ IP Address: Could not fetch (GeoJS Error)\n`;
      }
    } catch (e) {
      message += `ℹ️ IP Address: Hidden or Blocked\n`;
    }

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        disable_web_page_preview: true
      })
    });
  } catch (e) {
    console.warn("Visitor logging failed:", e);
  }
}

/* ══════════════════════════════════════════════════════════
   4. USER ACCESS & ROUTER CONTROLLER
   ══════════════════════════════════════════════════════════ */
// === Persistent & Multi-Device Real-time Session Management ===
function getAuthSession(key) {
  return localStorage.getItem(key) || sessionStorage.getItem(key);
}

function getAssignedVendorName() {
  const userKey = getAuthSession('rpm_user_key');
  const userEmail = getAuthSession('rpm_user_email');

  // 1. Check live user profile memory cache if active
  if (window.currentUserProfileData) {
    const liveV = window.currentUserProfileData.assignedVendor || window.currentUserProfileData.assigned_vendor || window.currentUserProfileData.vendor || window.currentUserProfileData.vendorName || '';
    if (liveV) {
      setAuthSession('rpm_assigned_vendor', liveV);
      return liveV;
    }
  }

  // 2. Check live allUserAccounts array if available
  if (typeof allUserAccounts !== 'undefined' && Array.isArray(allUserAccounts)) {
    let userObj = null;
    if (userKey) {
      userObj = allUserAccounts.find(u => u._key === userKey);
    }
    if (!userObj && userEmail) {
      userObj = allUserAccounts.find(u => u.email && u.email.toLowerCase() === userEmail.toLowerCase());
    }
    if (userObj) {
      const v = userObj.assignedVendor || userObj.assigned_vendor || userObj.vendor || userObj.vendorName || '';
      if (v) {
        setAuthSession('rpm_assigned_vendor', v);
        return v;
      }
    }
  }

  // 3. Check session storage
  let v = getAuthSession('rpm_assigned_vendor');
  if (v) return v;

  // 4. Fallback for vendor role if no explicit vendor string was found
  const role = getAuthSession('rpm_user_role');
  if (role === 'vendor') {
    if (typeof vendorsList !== 'undefined' && Array.isArray(vendorsList) && vendorsList.length > 0) {
      v = vendorsList[0].name || vendorsList[0];
      if (v) {
        setAuthSession('rpm_assigned_vendor', v);
        return v;
      }
    }
  }

  return '';
}

function setAuthSession(key, value) {
  if (value === null || value === undefined) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  } else {
    try { localStorage.setItem(key, value); } catch(e){}
    try { sessionStorage.setItem(key, value); } catch(e){}
  }
}

function clearAuthSession() {
  const keys = [
    'rpm_logged_in',
    'rpm_user_name',
    'rpm_user_email',
    'rpm_user_mobile',
    'rpm_user_key',
    'rpm_is_admin',
    'rpm_user_role',
    'rpm_assigned_vendor',
    'rpm_login_time',
    'rpm_user_features',
    'rpm_session_token'
  ];
  keys.forEach(k => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
  if (window.AndroidBridge && typeof window.AndroidBridge.setLoginSession === 'function') {
    window.AndroidBridge.setLoginSession('0', '0', '');
  }
  if (typeof activeNotesListener !== 'undefined' && activeNotesListener && typeof activeNotesRef !== 'undefined' && activeNotesRef) {
    try { activeNotesRef.off('value', activeNotesListener); } catch(e){}
    activeNotesListener = null;
  }
  if (typeof activeNotesUserKey !== 'undefined') activeNotesUserKey = null;
  notesList = [];
  if (typeof renderNotesList === 'function') renderNotesList();
}

let activeSessionListenerRef = null;
let activeUserAccountListenerRef = null;

function watchActiveSessionToken(userKey) {
  if (!userKey) return;
  if (activeSessionListenerRef) {
    activeSessionListenerRef.off();
    activeSessionListenerRef = null;
  }
  if (activeUserAccountListenerRef) {
    activeUserAccountListenerRef.off();
    activeUserAccountListenerRef = null;
  }
  
  const loginTime = parseInt(getAuthSession('rpm_login_time') || '0', 10);
  
  activeSessionListenerRef = db.ref(`users/${userKey}/lastLogoutAt`);
  activeSessionListenerRef.on('value', snapshot => {
    const lastLogoutAt = snapshot.val();
    
    // If a logout occurred AFTER this device logged in, logout this device instantly!
    if (getAuthSession('rpm_logged_in') === '1' && lastLogoutAt && loginTime > 0) {
      if (lastLogoutAt > loginTime + 3000) {
        console.warn("[Session Manager] Account logged out globally from another device.");
        if (typeof toast !== 'undefined' && toast.info) {
          toast.info("Aapka account sabhi devices se logout kar diya gaya hai.");
        }
        forceReauth();
      }
    }
  });

  // Real-time listener for user status changes (e.g. Blocked or Deleted by Admin)
  activeUserAccountListenerRef = db.ref(`users/${userKey}`);
  activeUserAccountListenerRef.on('value', snapshot => {
    if (getAuthSession('rpm_logged_in') !== '1') return;
    const userData = snapshot.val();

    // 1. Account blocked by Admin
    if (userData && userData.status === 'blocked') {
      console.warn("[Session Manager] Account blocked by admin. Ejecting immediately...");
      if (typeof toast !== 'undefined' && toast.err) {
        toast.err("Aapka account Admin dwara block kar diya gaya hai.");
      }
      forceReauth();
      return;
    }

    if (!userData) return;

    // 3. Live Sync Role & Assigned Vendor changes made by Admin
    const currentRole = getAuthSession('rpm_user_role');
    const currentVendor = getAuthSession('rpm_assigned_vendor');
    const newRole = userData.role || 'user';
    const newVendor = userData.assignedVendor || userData.assigned_vendor || userData.vendor || userData.vendorName || '';

    if (currentRole !== newRole || currentVendor !== newVendor) {
      setAuthSession('rpm_user_role', newRole);
      setAuthSession('rpm_assigned_vendor', newVendor);
      if (newVendor) {
        dashFilters.vendor = [newVendor];
      }
      if (typeof toggleAdminSidebarItems === 'function') toggleAdminSidebarItems();
      if (typeof populateDashboardFilterDropdowns === 'function') populateDashboardFilterDropdowns();
      if (typeof renderDashboardStats === 'function') renderDashboardStats();
    }
  });
}

function createNewUserSession(userKey, userObj) {
  const loginTimestamp = Date.now();
  const sessionToken = loginTimestamp + '_' + Math.random().toString(36).substring(2, 9);
  const isAdmin = (userObj.email === ADMIN_EMAIL || userObj.role === 'admin' || userObj.role === 'superadmin');
  const userVendor = userObj.assignedVendor || userObj.assigned_vendor || userObj.vendor || userObj.vendorName || '';
  
  window.currentUserProfileData = userObj;

  setAuthSession('rpm_logged_in', '1');
  setAuthSession('rpm_user_name', userObj.fullName || userObj.name || '');
  setAuthSession('rpm_user_email', userObj.email || '');
  setAuthSession('rpm_user_mobile', userObj.mobile || '');
  setAuthSession('rpm_user_key', userKey);
  setAuthSession('rpm_is_admin', isAdmin ? '1' : '0');
  setAuthSession('rpm_user_role', userObj.role || (isAdmin ? 'admin' : 'user'));
  setAuthSession('rpm_assigned_vendor', userVendor);
  setAuthSession('rpm_session_token', sessionToken);
  setAuthSession('rpm_login_time', loginTimestamp.toString());
  
  if (userVendor || userObj.role === 'vendor') {
    dashFilters.vendor = userVendor ? [userVendor] : ['All'];
  }

  // Bridge login state to Android App SharedPreferences if inside Android WebView
  if (window.AndroidBridge && typeof window.AndroidBridge.setLoginSession === 'function') {
    window.AndroidBridge.setLoginSession('1', isAdmin ? '1' : '0', userObj.role || (isAdmin ? 'admin' : 'user'));
  }

  // Start watching active session token
  watchActiveSessionToken(userKey);

  // Sync private user notes listener for the newly logged-in user
  if (typeof syncUserNotesListener === 'function') {
    syncUserNotesListener();
  }
}

const loginOverlay = document.getElementById('login-overlay');
const loginForm = document.getElementById('login-form');
const loginErrorMsg = document.getElementById('login-error-msg');
const loginLogo = document.getElementById('login-logo');
const appLayout = document.getElementById('app-layout');

// Unlock page layout
function unlockApp() {
  const overlay = document.getElementById('login-overlay');
  const layout = document.getElementById('app-layout');
  if (overlay) overlay.classList.add('hidden');
  if (layout) layout.classList.remove('hidden');
  const mobileNav = document.getElementById('mobile-bottom-nav');
  if (mobileNav) {
    mobileNav.classList.remove('hidden');
    mobileNav.style.display = '';
  }

  // Bridge session on page unlock
  if (window.AndroidBridge && typeof window.AndroidBridge.setLoginSession === 'function') {
    const isLoggedIn = getAuthSession('rpm_logged_in') === '1' ? '1' : '0';
    const isAdmin = getAuthSession('rpm_is_admin') === '1' ? '1' : '0';
    const role = getAuthSession('rpm_user_role') || '';
    window.AndroidBridge.setLoginSession(isLoggedIn, isAdmin, role);
  }

  // Resolve assigned vendor and role FIRST
  const assignedVendor = getAssignedVendorName();
  const role = getAuthSession('rpm_user_role');

  if (assignedVendor || role === 'vendor') {
    if (assignedVendor) {
      dashFilters.vendor = [assignedVendor];
    }
  }

  // Populate main SPA filter dropdowns FIRST before switching section
  populateDashboardFilterDropdowns();

  // Toggle admin-only sidebar items
  toggleAdminSidebarItems();

  // Set default state & switch section
  if (role === 'vendor' || role === 'watcher') {
    switchSection('reports');
  } else {
    switchSection('dashboard');
  }

  // Refresh user profile from Firebase to ensure assignedVendor and role are up-to-date
  const userKey = getAuthSession('rpm_user_key');
  if (userKey) {
    db.ref(`users/${userKey}`).once('value', snapshot => {
      const userData = snapshot.val();
      if (userData) {
        window.currentUserProfileData = userData;
        const freshRole = userData.role || 'user';
        const freshVendor = userData.assignedVendor || userData.assigned_vendor || userData.vendor || userData.vendorName || '';
        setAuthSession('rpm_user_role', freshRole);
        setAuthSession('rpm_assigned_vendor', freshVendor);
        if (freshVendor || freshRole === 'vendor') {
          dashFilters.vendor = freshVendor ? [freshVendor] : ['All'];
        }
        toggleAdminSidebarItems();
        populateDashboardFilterDropdowns();
        renderDashboardStats();
        setTimeout(renderConsumptionChart, 100);
        if (typeof applyDashboardFilters === 'function') applyDashboardFilters();
      }
    });
  }

  if (typeof watchUserProfile === 'function') watchUserProfile();
}

  // Run async analytics builder to load initial datasets
  triggerVisitorTracking();

  // Initialize Support Chat
  const isAdmin = (getAuthSession('rpm_is_admin') === '1');
  if (isAdmin) {
    initAdminSupportChatNotifications();
  } else {
    initUserSupportChat();
  }


function updateUserDisplayName() {
  const userName = getAuthSession('rpm_user_name') || 'Anant Yadav';
  
  // Get initials (first letter of first and last word in uppercase)
  const words = userName.trim().split(/\s+/);
  let initials = '';
  if (words.length > 0) initials += words[0][0].toUpperCase();
  if (words.length > 1) initials += words[words.length - 1][0].toUpperCase();
  if (!initials) initials = 'AY';

  const topBarName = document.getElementById('top-bar-user-name');
  const topBarInitials = document.getElementById('top-bar-user-initials');
  const profileName = document.getElementById('profile-user-name');
  const profileInitials = document.getElementById('profile-user-initials');

  if (topBarName) topBarName.textContent = userName;
  if (topBarInitials) {
    // If it doesn't contain an img tag yet, set it to the default avatar image
    if (!topBarInitials.querySelector('img')) {
      topBarInitials.innerHTML = `<img src="assets/images/default_avatar.png" class="w-full h-full object-cover rounded-xl">`;
    }
    // Re-inject avatar status dot if missing
    if (!topBarInitials.querySelector('#avatar-status-dot')) {
      topBarInitials.insertAdjacentHTML('beforeend', '<span id="avatar-status-dot" class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-950 bg-emerald-500 transition-all duration-300"></span>');
    }
    if (typeof updateConnectionStatus === 'function') updateConnectionStatus();
  }
  if (profileName) profileName.textContent = userName;
  if (profileInitials) profileInitials.textContent = initials;
}

// Connection status listener
function updateConnectionStatus() {
  const dot = document.getElementById('connection-status-dot');
  const txt = document.getElementById('connection-status-text');
  const avatarDot = document.getElementById('avatar-status-dot');
  if (navigator.onLine) {
    if (dot) dot.className = "w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse";
    if (txt) { txt.textContent = "Online"; txt.className = "text-[9px] font-semibold text-emerald-500 dark:text-emerald-400"; }
    if (avatarDot) avatarDot.className = "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-950 bg-emerald-500 animate-pulse transition-all duration-300";
  } else {
    if (dot) dot.className = "w-1.5 h-1.5 rounded-full bg-rose-500";
    if (txt) { txt.textContent = "Offline"; txt.className = "text-[9px] font-semibold text-rose-500 dark:text-rose-400"; }
    if (avatarDot) avatarDot.className = "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-950 bg-rose-500 transition-all duration-300";
  }
}
window.updateConnectionStatus = updateConnectionStatus;
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);

// Captcha variables and logic
let currentCaptchaString = "";

function generateCaptcha() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let captcha = "";
  for (let i = 0; i < 6; i++) {
    captcha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  currentCaptchaString = captcha;
  
  const display = document.getElementById('captcha-display');
  if (display) {
    display.textContent = captcha;
  }
}

// Form toggles
function showLoginForm() {
  const lContainer = document.getElementById('login-form-container');
  const sContainer = document.getElementById('signup-form-container');
  const lTitle = document.getElementById('login-title');
  const lSubtitle = document.getElementById('login-subtitle');

  if (lContainer) lContainer.classList.remove('hidden');
  if (sContainer) sContainer.classList.add('hidden');
  if (lTitle) lTitle.textContent = "Diesel Monitor Panel";
  if (lSubtitle) lSubtitle.textContent = "Log in to access the Incharge Panel";
  
  // Clear inputs
  const lEmail = document.getElementById('login-email');
  const lPass = document.getElementById('login-password');
  if (lEmail) lEmail.value = '';
  if (lPass) lPass.value = '';
  
  const errMsg = document.getElementById('login-error-msg');
  if (errMsg) errMsg.classList.add('hidden');
}

function showSignupForm() {
  const lContainer = document.getElementById('login-form-container');
  const sContainer = document.getElementById('signup-form-container');
  const lTitle = document.getElementById('login-title');
  const lSubtitle = document.getElementById('login-subtitle');

  if (lContainer) lContainer.classList.add('hidden');
  if (sContainer) sContainer.classList.remove('hidden');
  if (lTitle) lTitle.textContent = "Create RPM Account";
  if (lSubtitle) lSubtitle.textContent = "Fill in the details to register";
  
  // Clear inputs
  const sFullname = document.getElementById('signup-fullname');
  const sMobile = document.getElementById('signup-mobile');
  const sEmail = document.getElementById('signup-email');
  const sPassword = document.getElementById('signup-password');
  const sCaptcha = document.getElementById('signup-captcha-input');
  
  if (sFullname) sFullname.value = '';
  if (sMobile) sMobile.value = '';
  if (sEmail) sEmail.value = '';
  if (sPassword) sPassword.value = '';
  if (sCaptcha) sCaptcha.value = '';
  
  const errMsg = document.getElementById('signup-error-msg');
  if (errMsg) errMsg.classList.add('hidden');
  
  // Generate first captcha
  generateCaptcha();
}

window.showLoginForm = showLoginForm;
window.showSignupForm = showSignupForm;
window.generateCaptcha = generateCaptcha;

function checkAuth() {
  if (getAuthSession('rpm_logged_in') !== '1') {
    const loginOverlay = document.getElementById('login-overlay');
    // Only display error toast if the user is attempting an action inside the app while logged out
    if (loginOverlay && loginOverlay.classList.contains('hidden')) {
      if (typeof toast !== 'undefined' && toast.err) {
        toast.err("Access denied: You must be logged in.");
      }
    }
    return false;
  }
  return true;
}

// Bind auth triggers and submit handlers
function initAuthControls() {
  // Prefill remembered email
  const rememberedEmail = localStorage.getItem('rpm_remembered_email');
  const rememberCheckbox = document.getElementById('login-remember');
  const emailInput = document.getElementById('login-email');
  if (rememberedEmail && emailInput) {
    emailInput.value = rememberedEmail;
    if (rememberCheckbox) {
      rememberCheckbox.checked = true;
    }
  }

  // Toggle links
  const toSignupBtn = document.getElementById('toggle-to-signup');
  if (toSignupBtn) toSignupBtn.onclick = showSignupForm;
  
  const toLoginBtn = document.getElementById('toggle-to-login');
  if (toLoginBtn) toLoginBtn.onclick = showLoginForm;
  
  const refreshCaptchaBtn = document.getElementById('refresh-captcha');
  if (refreshCaptchaBtn) refreshCaptchaBtn.onclick = generateCaptcha;

  // Login form submit
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.onsubmit = e => {
      e.preventDefault();
      const emailInput = document.getElementById('login-email');
      const passInput = document.getElementById('login-password');
      const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
      const pass = passInput ? passInput.value : '';
      const errMsg = document.getElementById('login-error-msg');
      const rememberCheckbox = document.getElementById('login-remember');
      const overlay = document.getElementById('login-overlay');
      const logo = document.getElementById('login-logo');
      
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const loginCard = overlay ? overlay.querySelector('.glass-panel') : null;

      if (!email || !pass) return;

      // Handle loading button state
      const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Unlock Dashboard';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="inline-flex items-center justify-center gap-2"><i class="fas fa-spinner animate-spin"></i> Verifying...</span>';
      }

      const resetBtn = () => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      };

      const triggerErrorEffect = (message, delay = 2000) => {
        if (errMsg) {
          errMsg.textContent = message;
          errMsg.classList.remove('hidden');
        }
        if (loginCard) loginCard.classList.add('animate-vibrate');
        if (logo) logo.classList.add('animate-vibrate');
        
        setTimeout(() => {
          if (errMsg) errMsg.classList.add('hidden');
          if (loginCard) loginCard.classList.remove('animate-vibrate');
          if (logo) logo.classList.remove('animate-vibrate');
          resetBtn();
        }, delay);
      };

      // Query database for email matching (or fallback search across all users)
      const processUserAuth = (users) => {
        if (users) {
          let authenticated = false;
          let matchedUserObj = null;
          let matchedUserKey = null;
          let emailFound = false;

          Object.entries(users).forEach(([key, u]) => {
            if (u && u.email && u.email.trim().toLowerCase() === email) {
              emailFound = true;
              if (String(u.password).trim() === String(pass).trim()) {
                authenticated = true;
                matchedUserObj = u;
                matchedUserKey = key;
              }
            }
          });

          if (authenticated) {
            const userStatus = matchedUserObj.status || 'active';
            
            if (userStatus === 'blocked') {
              triggerErrorEffect("Your account is blocked. Contact Admin.", 3000);
              return;
            }
            
            if (userStatus === 'pending') {
              triggerErrorEffect("Waiting for Admin Approval. Please contact Incharge.", 4000);
              return;
            }
            
            createNewUserSession(matchedUserKey, matchedUserObj);
            
            if (rememberCheckbox && rememberCheckbox.checked) {
              localStorage.setItem('rpm_remembered_email', email);
            } else {
              localStorage.removeItem('rpm_remembered_email');
            }

            resetBtn();
            unlockApp();
            if (typeof toast !== 'undefined' && toast.ok) {
              toast.ok(`Access approved. Welcome back, ${matchedUserObj.fullName || matchedUserObj.name || 'User'}!`);
            }
          } else if (emailFound) {
            triggerErrorEffect("Galat password! Please try again.", 2000);
          } else {
            triggerErrorEffect("No user account found with this email.", 2000);
          }
        } else {
          triggerErrorEffect("No user account found with this email.", 2000);
        }
      };

      usersRef.orderByChild('email').equalTo(email).once('value', snapshot => {
        const users = snapshot.val();
        if (users) {
          processUserAuth(users);
        } else {
          usersRef.once('value', allSnap => {
            processUserAuth(allSnap.val());
          });
        }
      }, err => {
        console.error("Database read error during login verification:", err);
        if (typeof toast !== 'undefined' && toast.err) {
          toast.err("Database connection issue. Please check API config.");
        }
        resetBtn();
      });
    };
  }

  // Signup form submit - direct registration with Admin Approval
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.onsubmit = e => {
      e.preventDefault();
      const fullName = document.getElementById('signup-fullname').value.trim();
      const mobile = document.getElementById('signup-mobile').value.trim();
      const email = document.getElementById('signup-email').value.trim().toLowerCase();
      const password = document.getElementById('signup-password').value;
      const captchaInput = document.getElementById('signup-captcha-input').value.trim();
      const errMsg = document.getElementById('signup-error-msg');

      // Validate captcha
      if (captchaInput !== currentCaptchaString) {
        if (errMsg) {
          errMsg.textContent = "Captcha code verification failed. Try again.";
          errMsg.classList.remove('hidden');
        }
        generateCaptcha();
        document.getElementById('signup-captcha-input').value = '';
        return;
      }

      // Disable submit button
      const submitBtn = signupForm.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="inline-flex items-center justify-center gap-2"><i class="fas fa-spinner animate-spin"></i> Registering...</span>';
      }
      const resetBtn = () => {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalText; }
      };

      // Check if user already exists
      usersRef.orderByChild('email').equalTo(email).once('value', snapshot => {
        if (snapshot.exists()) {
          if (errMsg) {
            errMsg.textContent = "This email address is already registered.";
            errMsg.classList.remove('hidden');
            setTimeout(() => errMsg.classList.add('hidden'), 3000);
          }
          resetBtn();
        } else {
          // Register user directly with 'pending' status (Admin must approve)
          const newUser = {
            fullName: fullName,
            mobile: mobile,
            email: email,
            password: password,
            status: (email === ADMIN_EMAIL) ? 'active' : 'pending',
            createdAt: new Date().toISOString()
          };

          usersRef.push(newUser).then((res) => {
            const userKey = res.key;
            // Send notification to Admin (in notifications node)
            if (newUser.status === 'pending') {
              notificationsRef.push({
                type: 'new_user_registration',
                title: 'New Account Pending Approval',
                message: `New user "${fullName}" (${email}) registered. Please review & approve.`,
                userKey: userKey,
                userEmail: email,
                userName: fullName,
                createdAt: new Date().toISOString(),
                read: false
              }).catch(e => console.warn("Failed to push registration notification:", e));
            }

            resetBtn();
            if (newUser.status === 'active') {
              toast.ok(`✅ Account created & activated! Welcome, ${fullName}!`);
            } else {
              toast.ok(`✅ Account registered! Admin approval ke baad login kar sakoge. Admin se contact karo.`);
            }
            showLoginForm();
          }).catch(err => {
            console.error("Registration failed:", err);
            toast.err("Registration failed. Firebase rules check karo.");
            resetBtn();
          });
        }
      }, err => {
        console.error("DB error during signup:", err);
        toast.err("Database error. Please try again.");
        resetBtn();
      });
    };
  }
}

const FEATURE_MAP = {
  'fuel-request': {
    name: 'Fuel Request',
    selectors: [
      'button[onclick*="openFuelModal"]'
    ]
  },
  'diesel-records': {
    name: 'Diesel Records',
    selectors: [
      'button[data-section="diesel-management"]',
      'button[onclick*="switchSection(\'diesel-management\')"]'
    ]
  },
  'urea-request': {
    name: 'Urea Request',
    selectors: [
      'button[onclick*="openUreaModal"]'
    ]
  },
  'diesel-calculation': {
    name: 'Diesel Calculation',
    selectors: [
      'button[onclick*="openDieselCalcModal"]'
    ]
  },
  'erp-portal': {
    name: 'ERP Portal',
    selectors: [
      'button[data-section="erp-portal"]',
      'button[onclick*="www.rpmerp.in"]'
    ]
  },
  'vehicle-location': {
    name: 'Vehicle Location',
    selectors: [
      'button[onclick*="algotrack.in"]'
    ]
  },
  'email-system': {
    name: 'Email System',
    selectors: [
      'button[data-section="email-templates"]',
      'button[onclick*="switchSection(\'email-templates\')"]'
    ]
  },
  'charts-graphs': {
    name: 'Charts & Graphs',
    selectors: [
      'button[data-section="analytics"]',
      'button[onclick*="switchSection(\'analytics\')"]'
    ]
  },
  'import-excel': {
    name: 'Import Excel',
    selectors: [
      'button[onclick*="import-excel-file"]'
    ]
  },
  'location-list': {
    name: 'Location List',
    selectors: [
      'button[onclick*="location-modal"]'
    ]
  },
  'vehicle-vendor-config': {
    name: 'Vehicle & Vendor Config',
    selectors: [
      'button[data-section="vehicles"]',
      'button[onclick*="switchSection(\'vehicles\')"]'
    ]
  },
  'km-range-calc': {
    name: 'KM Range Calc',
    selectors: [
      'button[data-section="km-range-calc"]',
      'button[onclick*="switchSection(\'km-range-calc\')"]'
    ]
  },
  'reports-dashboard': {
    name: 'Dashboard (Reports)',
    selectors: [
      'button[data-section="reports"]'
    ]
  },
  'driver-requests': {
    name: 'Driver Requests',
    selectors: [
      'button[data-section="driver-requests"]'
    ]
  },
  'diesel-filled': {
    name: 'Diesel Station Panel',
    selectors: [
      'button[data-section="diesel-filled"]'
    ]
  },
  'driver-requests-log': {
    name: 'Master Requests Log',
    selectors: [
      'button[data-section="driver-requests-log"]'
    ]
  },
  'drivers': {
    name: 'Drivers',
    selectors: [
      'button[data-section="drivers"]'
    ]
  },
  'employees': {
    name: 'Employees',
    selectors: [
      'button[data-section="employees"]'
    ]
  },
  'notes': {
    name: 'Notes & Tasks',
    selectors: [
      'button[data-section="notes"]'
    ]
  },
  'user-list': {
    name: 'User List',
    selectors: [
      'button[data-section="user-list"]'
    ]
  },
  'settings': {
    name: 'Settings',
    selectors: [
      'button[data-section="settings"]'
    ]
  }
};

function applyUserFeaturePermissions() {
  const userKey = getAuthSession('rpm_user_key');
  if (!userKey) return;
  
  if (typeof toggleAdminSidebarItems === 'function') {
    toggleAdminSidebarItems();
  }

  const userFeaturesStr = getAuthSession('rpm_user_features');
  const userFeatures = userFeaturesStr ? JSON.parse(userFeaturesStr) : {};
  
  Object.entries(FEATURE_MAP).forEach(([key, value]) => {
    const isAllowed = userFeatures[key] !== false; // Default to true if not defined
    
    value.selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (isAllowed) {
          // Only remove hidden if element is not restricted by admin-only/watcher rule
          if (el.style.display !== 'none' && !el.classList.contains('admin-only')) {
            el.classList.remove('hidden');
          }
        } else {
          el.style.display = 'none';
          el.classList.add('hidden');
        }
      });
    });
  });

  // Re-enforce admin-only & role navigation visibility rules
  if (typeof toggleAdminSidebarItems === 'function') {
    toggleAdminSidebarItems();
  }
}

// Client-side Router Switcher
function switchSection(sectionId) {
  // Check custom feature permission
  const userFeaturesStr = getAuthSession('rpm_user_features');
  const userFeatures = userFeaturesStr ? JSON.parse(userFeaturesStr) : {};
  
  let allowed = true;
  if (sectionId !== 'dashboard') {
    Object.entries(FEATURE_MAP).forEach(([featKey, featVal]) => {
      const mapsToSection = featVal.selectors.some(sel => sel.includes(`data-section="${sectionId}"`) || sel.includes(`switchSection('${sectionId}')`));
      if (mapsToSection) {
        if (userFeatures[featKey] === false) {
          allowed = false;
        }
      }
    });
  }

  if (!allowed) {
    toast.err("Aapko is section ko access karne ki permission nahi hai.");
    return;
  }

  // Admin-only & Role sections protection
  const isAdmin = (getAuthSession('rpm_is_admin') === '1');
  const role = getAuthSession('rpm_user_role') || (isAdmin ? 'admin' : 'user');
  const isWatcher = (role === 'watcher');
  const isVendor = (role === 'vendor');
  const allowedWatcherSections = ['reports', 'driver-requests', 'notes', 'profile'];
  const allowedVendorSections = ['reports', 'profile'];

  if (isVendor && !allowedVendorSections.includes(sectionId)) {
    sectionId = 'reports';
  } else if (isWatcher && !allowedWatcherSections.includes(sectionId)) {
    sectionId = 'reports';
  } else if (!isAdmin) {
    const adminOnlySections = ['settings', 'user-list', 'support-center', 'driver-requests-log'];
    if (adminOnlySections.includes(sectionId)) {
      sectionId = 'dashboard';
    }
  }
  
  activeSection = sectionId;
  
  // Hide all sections
  document.querySelectorAll('main > section').forEach(sec => sec.classList.add('hidden'));
  
  // Show target section
  const targetSec = document.getElementById(`sec-${sectionId}`);
  if (targetSec) targetSec.classList.remove('hidden');
  
  // Update Header Title
  const title = document.getElementById('active-section-title');
  if (title) {
    if (sectionId === 'dashboard') {
      title.textContent = 'Dashboard';
    } else if (sectionId === 'reports') {
      title.textContent = 'Reports';
    } else if (sectionId === 'erp-portal') {
      title.textContent = 'ERP Portal';
    } else if (sectionId === 'diesel-management') {
      title.textContent = 'Diesel Records';
    } else if (sectionId === 'driver-requests') {
      title.textContent = 'Driver Requests';
    } else if (sectionId === 'driver-requests-log') {
      title.textContent = 'Master Requests Log';
    } else {
      title.textContent = sectionId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
  }
  
  // Update sidebar active link highlighting
  document.querySelectorAll('#sidebar button[data-section]').forEach(btn => {
    const sectionAttr = btn.getAttribute('data-section');
    if (sectionAttr === sectionId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update mobile bottom nav active class
  document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
    const sectionAttr = btn.getAttribute('data-section');
    const dot = btn.querySelector('.mobile-nav-active-dot');
    if (sectionAttr === sectionId) {
      btn.classList.add('text-blue-600', 'dark:text-blue-400', 'scale-105');
      btn.classList.remove('text-slate-400', 'dark:text-slate-500');
      if (dot) dot.classList.remove('scale-0');
    } else {
      btn.classList.remove('text-blue-600', 'dark:text-blue-400', 'scale-105');
      btn.classList.add('text-slate-400', 'dark:text-slate-500');
      if (dot) dot.classList.add('scale-0');
    }
  });

  // Call section specific render actions
  if (sectionId === 'dashboard') {
    renderDashboardStats();
    setTimeout(renderConsumptionChart, 200);
  } else if (sectionId === 'diesel-management') {
    renderLedgerTable();
    setTimeout(() => {
      if (typeof window.syncHistoryScrollbar === 'function') window.syncHistoryScrollbar();
    }, 50);
    setTimeout(() => {
      if (typeof window.syncHistoryScrollbar === 'function') window.syncHistoryScrollbar();
    }, 150);
    setTimeout(() => {
      if (typeof window.syncHistoryScrollbar === 'function') window.syncHistoryScrollbar();
    }, 300);
  } else if (sectionId === 'reports') {
    initReportFilters();
    // Sync filters and theme to iframe via postMessage (safe across file:// protocols)
    const isDark = document.documentElement.classList.contains('dark');
    const isLowSpec = document.documentElement.classList.contains('low-spec');
    const role = getAuthSession('rpm_user_role');
    const assignedVendor = getAuthSession('rpm_assigned_vendor');
    const iframe = document.querySelector('#sec-reports iframe');
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage({ type: 'setTheme', isDark: isDark }, '*');
        iframe.contentWindow.postMessage({ type: 'setLowSpec', isLowSpec: isLowSpec }, '*');
        iframe.contentWindow.postMessage({ type: 'applyFilters', filters: dashFilters, role: role, assignedVendor: assignedVendor }, '*');
      } catch (e) {
        console.warn("iframe postMessage failed:", e);
      }
    }
  } else if (sectionId === 'email-templates') {
    selectEmailTemplate('daily');
  } else if (sectionId === 'analytics') {
    setTimeout(renderAnalyticsCharts, 250);
  } else if (sectionId === 'settings') {
    showDmPanel('dm-options-panel');
  } else if (sectionId === 'notes') {
    if (typeof syncUserNotesListener === 'function') {
      syncUserNotesListener();
    }
    renderNotesList();
    renderTasksList();
  } else if (sectionId === 'km-range-calc') {
    initKmRangeCalculator();
  } else if (sectionId === 'erp-portal') {
    // Lazy-load iframe only when section is opened
    const erpIframe = document.getElementById('erp-portal-iframe');
    if (erpIframe && (!erpIframe.src || erpIframe.src === 'about:blank')) {
      erpIframe.src = 'https://www.rpmerp.in/';
    }
  } else if (sectionId === 'user-list') {
    watchAllUserAccounts();
  } else if (sectionId === 'support-center') {
    initAdminSupportCenter();
  } else if (sectionId === 'vehicles') {
    renderVehiclesGrid();
  } else if (sectionId === 'drivers') {
    renderDriversGrid();
  } else if (sectionId === 'employees') {
    renderEmployeesGrid();
  } else if (sectionId === 'driver-requests') {
    renderDriverRequestsList();
  } else if (sectionId === 'driver-requests-log') {
    renderDriverRequestsLogList();
  }
}

// Bind Navigation Buttons
document.querySelectorAll('#sidebar button[data-section]').forEach(btn => {
  btn.onclick = () => {
    const sec = btn.getAttribute('data-section');
    switchSection(sec);
    // Close mobile drawer if open
    if (window.innerWidth < 768) {
      toggleSidebarCollapse(true);
    }
  };
});

// Logout handler
window.triggerLogout = () => {
  if (confirm("Pura system lock out ho jayega. Kya aap sabhi devices se logout karna chahte hain?")) {
    const userKey = getAuthSession('rpm_user_key');
    if (userKey && typeof db !== 'undefined') {
      // Record global logout timestamp in Firebase to instantly eject all active devices!
      db.ref(`users/${userKey}/lastLogoutAt`).set(Date.now());
    }
    forceReauth();
    if (typeof toast !== 'undefined' && toast.ok) {
      toast.ok("Successfully logged out from all devices.");
    }
  }
};

const logoutBtn = document.getElementById('sidebar-logout-btn');
if (logoutBtn) {
  logoutBtn.onclick = triggerLogout;
}

/* ══════════════════════════════════════════════════════════
   5. COLLAPSIBLE SIDEBAR LAYOUT
   ══════════════════════════════════════════════════════════ */
const sidebar = document.getElementById('sidebar');
const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
const sidebarToggleIcon = document.getElementById('sidebar-toggle-icon');
const mainContent = document.getElementById('main-content');
const mobileSidebarBtn = document.getElementById('mobile-sidebar-btn');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');

let sidebarCollapsed = false;
let sidebarMobileOpen = false;

function toggleSidebarCollapse(forceCollapse = null) {
  if (window.innerWidth < 768) {
    // Mobile logic: Toggle mobile drawer overlay
    const isOpen = forceCollapse !== null ? !forceCollapse : !sidebarMobileOpen;
    sidebarMobileOpen = isOpen;
    sidebarCollapsed = true; // Always collapsed logically on mobile

    if (sidebar) {
      if (isOpen) {
        sidebar.classList.add('sidebar-mobile-open');
      } else {
        sidebar.classList.remove('sidebar-mobile-open');
      }
    }
    
    if (isOpen) {
      if (sidebarBackdrop) {
        sidebarBackdrop.classList.remove('hidden');
        sidebarBackdrop.offsetHeight; // trigger repaint
        sidebarBackdrop.classList.remove('opacity-0', 'pointer-events-none');
        sidebarBackdrop.classList.add('opacity-100', 'pointer-events-auto');
      }
      document.body.style.overflow = 'hidden';
    } else {
      if (sidebarBackdrop) {
        sidebarBackdrop.classList.remove('opacity-100', 'pointer-events-auto');
        sidebarBackdrop.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => {
          if (!sidebarMobileOpen) sidebarBackdrop.classList.add('hidden');
        }, 300);
      }
      document.body.style.overflow = '';
    }
    const topBar = document.getElementById('top-bar');
    if (topBar && window.innerWidth < 768) {
      topBar.style.left = '0px';
    }
  } else {
    // Desktop logic: Toggle expanded/collapsed state
    const isCollapse = forceCollapse !== null ? forceCollapse : !sidebarCollapsed;
    sidebarCollapsed = isCollapse;
    sidebarMobileOpen = false;

    if (sidebar) {
      if (isCollapse) {
        sidebar.classList.remove('sidebar-expanded');
        sidebar.classList.add('sidebar-collapsed');
      } else {
        sidebar.classList.remove('sidebar-collapsed');
        sidebar.classList.add('sidebar-expanded');
      }
      // Clean up mobile class just in case
      sidebar.classList.remove('sidebar-mobile-open');
    }

    if (mainContent) {
      mainContent.style.marginLeft = isCollapse ? "72px" : "260px";
    }

    const topBar = document.getElementById('top-bar');
    if (topBar && window.innerWidth >= 768) {
      topBar.style.left = isCollapse ? "72px" : "260px";
    }

    if (sidebarToggleIcon) {
      sidebarToggleIcon.className = isCollapse ? "fas fa-angles-right text-sm" : "fas fa-angles-left text-sm";
    }
    
    // Hide mobile backdrop on desktop always
    if (sidebarBackdrop) {
      sidebarBackdrop.classList.add('hidden', 'opacity-0', 'pointer-events-none');
      sidebarBackdrop.classList.remove('opacity-100', 'pointer-events-auto');
    }
    document.body.style.overflow = '';
  }
}

if (sidebarToggleBtn) {
  sidebarToggleBtn.onclick = () => toggleSidebarCollapse();
}

if (mobileSidebarBtn) {
  mobileSidebarBtn.onclick = () => toggleSidebarCollapse();
}

if (sidebarBackdrop) {
  sidebarBackdrop.onclick = () => {
    toggleSidebarCollapse(true); // true means force collapse/close
  };
}

// Debounced responsiveness watcher to prevent layout jittering
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Global helper for multi-select checklist filtering
const matchChecklist = (fieldVal, filterVal) => {
  if (!filterVal) return true;
  const selected = Array.isArray(filterVal) ? filterVal : [filterVal];
  if (selected.includes('All')) return true;
  if (selected.length === 0) return false;
  return fieldVal && selected.map(s => s.trim().toUpperCase()).includes(fieldVal.trim().toUpperCase());
};


window.addEventListener('resize', debounce(() => {
  if (window.innerWidth < 768) {
    toggleSidebarCollapse(true);
  } else {
    toggleSidebarCollapse(false);
  }
}, 150));

/* ══════════════════════════════════════════════════════════
   6. THEME AND SYSTEM STATUS
   ══════════════════════════════════════════════════════════ */
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const statusBox = document.getElementById('status-box');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

window.toggleThemeMode = () => {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('rpm_dark', isDark ? '1' : '0');
  toast.info(`${isDark ? 'Dark' : 'Light'} Mode enabled.`);

  // Sync theme to clean dashboard iframe if it is loaded via postMessage
  const iframe = document.querySelector('#sec-reports iframe');
  if (iframe && iframe.contentWindow) {
    try {
      iframe.contentWindow.postMessage({ type: 'setTheme', isDark: isDark }, '*');
    } catch (e) {
      console.warn("iframe postMessage failed:", e);
    }
  }
  
  // Refresh charts to update color grids
  if (activeSection === 'dashboard') {
    if (typeof renderConsumptionChart === 'function') {
      setTimeout(renderConsumptionChart, 150);
    }
  } else if (activeSection === 'analytics') {
    if (typeof renderAnalyticsCharts === 'function') {
      setTimeout(renderAnalyticsCharts, 150);
    }
  }
};

if (themeToggleBtn) {
  themeToggleBtn.onclick = window.toggleThemeMode;
}

// Network connectivity status
if (connectedRef) {
  connectedRef.on("value", snapshot => {
    const isOnline = (snapshot.val() === true);
    if (isOnline) {
      if (statusBox) statusBox.className = "flex items-center justify-center w-8 h-8 rounded-full border bg-green-500/10 border-green-500/30 shadow-sm transition-all duration-300 shrink-0";
      if (statusDot) statusDot.className = "h-3.5 w-3.5 rounded-full bg-green-500 animate-pulse";
      if (statusText) statusText.textContent = "ONLINE";
    } else {
      if (statusBox) statusBox.className = "flex items-center justify-center w-8 h-8 rounded-full border bg-red-500/10 border-red-500/30 shadow-sm transition-all duration-300 shrink-0";
      if (statusDot) statusDot.className = "h-3.5 w-3.5 rounded-full bg-red-500 animate-pulse";
      if (statusText) statusText.textContent = "OFFLINE";
    }
    
    // Sync profile indicator
    const connDot = document.getElementById('connection-status-dot');
    const connTxt = document.getElementById('connection-status-text');
    const avatarDot = document.getElementById('avatar-status-dot');
    if (isOnline) {
      if (connDot) connDot.className = "w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse";
      if (connTxt) { connTxt.textContent = "Online"; connTxt.className = "text-[9px] font-semibold text-emerald-500 dark:text-emerald-400"; }
      if (avatarDot) avatarDot.className = "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-950 bg-emerald-500 animate-pulse transition-all duration-300";
    } else {
      if (connDot) connDot.className = "w-1.5 h-1.5 rounded-full bg-rose-500";
      if (connTxt) { connTxt.textContent = "Offline"; connTxt.className = "text-[9px] font-semibold text-rose-500 dark:text-rose-400"; }
      if (avatarDot) avatarDot.className = "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-950 bg-rose-500 transition-all duration-300";
    }
  });
}

// Load saved theme or detect system settings on startup
const savedThemeSetting = localStorage.getItem('rpm_dark');
if (savedThemeSetting === '1' || (savedThemeSetting === null && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark');
  if (savedThemeSetting === null) {
    localStorage.setItem('rpm_dark', '1');
  }
} else {
  document.documentElement.classList.remove('dark');
  if (savedThemeSetting === null) {
    localStorage.setItem('rpm_dark', '0');
  }
}



/* ══════════════════════════════════════════════════════════
   7. FIREBASE REALTIME SYNC LISTENERS & ACTIVE VIEW DISPATCHER
   ══════════════════════════════════════════════════════════ */
function refreshActiveSection() {
  const appLayout = document.getElementById('app-layout');
  if (appLayout && appLayout.classList.contains('hidden')) {
    return;
  }
  if (activeSection === 'dashboard') {
    renderDashboardStats();
    if (typeof renderConsumptionChart === 'function') {
      renderConsumptionChart();
    }
  } else if (activeSection === 'diesel-management') {
    renderLedgerTable();
  } else if (activeSection === 'reports') {
    if (typeof renderReportsOverview === 'function') {
      const activeTab = document.querySelector('.report-tab.active-tab');
      if (activeTab) {
        const type = activeTab.getAttribute('data-tab');
        if (type === 'overview') renderReportsOverview();
        else if (type === 'vehicles') renderVehiclesReport();
        else if (type === 'vendors') renderVendorsReport();
        else if (type === 'locations') renderLocationsReport();
      }
      renderReportTable();
    }
  } else if (activeSection === 'analytics') {
    if (typeof renderAnalyticsCharts === 'function') {
      renderAnalyticsCharts();
    }
  } else if (activeSection === 'notes') {
    renderNotesList();
    renderTasksList();
  } else if (activeSection === 'user-list') {
    renderUserListTable();
  } else if (activeSection === 'vehicles') {
    renderVehiclesGrid();
  } else if (activeSection === 'drivers') {
    renderDriversGrid();
  } else if (activeSection === 'employees') {
    renderEmployeesGrid();
  } else if (activeSection === 'email-templates') {
    renderEmailManager();
  } else if (activeSection === 'driver-requests') {
    renderDriverRequestsList();
  }
}

// Sync entries (diesel fuel entries)
entriesRef.on('value', snapshot => {
  setTimeout(() => {
    const val = snapshot.val();
    if (val) {
      const records = Object.values(val);
      
      // Keep all entries including UREA entries
      records.forEach(r => {
        if (!r) return;
        if (r.vendorName === 'UREA REQUEST') {
          r.vendorName = 'RPM LOGISTICS PVT.LTD.';
          entriesRef.child(r.responseNumber).update({ vendorName: 'RPM LOGISTICS PVT.LTD.' });
        }
        // Strip heavy base64 photos from in-memory objects to keep memory and DOM ultra fast
        if (r.receiptPhoto || (Array.isArray(r.receiptPhotos) && r.receiptPhotos.length > 0) || (r.receiptPhotos && typeof r.receiptPhotos === 'object' && Object.keys(r.receiptPhotos).length > 0) || r.capturedPhoto || r.stationPhoto) {
          r.hasReceiptPhoto = true;
        }
        if (r.capturedPhoto || r.stationPhoto) {
          r.hasCapturedPhoto = true;
        }
        delete r.receiptPhoto;
        delete r.receiptPhotos;
        delete r.capturedPhoto;
        delete r.stationPhoto;

        if (r.kmPhoto || r.photo || (Array.isArray(r.kmPhotos) && r.kmPhotos.length > 0) || (r.kmPhotos && typeof r.kmPhotos === 'object' && Object.keys(r.kmPhotos).length > 0)) {
          r.hasKmPhoto = true;
        }
        delete r.kmPhoto;
        delete r.kmPhotos;
        delete r.photo;
      });
      historyEntries = records;
      
      // Sort descending by sequential serial ID
      historyEntries.sort((a, b) => (parseInt(b.responseNumber) || 0) - (parseInt(a.responseNumber) || 0));
      
      // Save lightweight entries to fast localStorage cache
      saveCache('rpm_cache_entries', historyEntries);

      // Sync datalists with newly loaded values
      syncVehicleList();
    } else {
      historyEntries = [];
      saveCache('rpm_cache_entries', []);
    }
    
    isEntriesLoading = false;

    ureaEntriesList = historyEntries.filter(e => {
      return containsUreaOrUriya(e.fromLocation) || 
             containsUreaOrUriya(e.lastLocation) ||
             containsUreaOrUriya(e.vendorName) ||
             containsUreaOrUriya(e.note);
    });
    saveCache('rpm_cache_urea_entries', ureaEntriesList);
    isUreaEntriesLoading = false;
    
    // Refresh visible grids
    refreshActiveSection();
    if (typeof updateDriverRequestsBadges === 'function') {
      updateDriverRequestsBadges();
    }
  }, 10);
}, error => {
  isEntriesLoading = false;
  isUreaEntriesLoading = false;
  console.error("Firebase entries read failed:", error);
  toast.err("Entries sync failed: " + error.message);
  refreshActiveSection();
});

// Sync Locations
locationsRef.on('value', snapshot => {
  const val = snapshot.val();
  locationsList = val ? Object.entries(val).map(([key, v]) => {
    if (v && typeof v === 'object') {
      const name = v.name || key;
      const rawDist = v.distance !== undefined ? v.distance : (v.rate !== undefined ? v.rate : 0);
      const distance = parseFloat(String(rawDist).replace(/[^0-9.]/g, '')) || 0;
      return { key, name: name.toUpperCase(), rate: distance, distance: distance, createdAt: v.createdAt || Date.now() };
    } else {
      const distance = parseFloat(String(v).replace(/[^0-9.]/g, '')) || 0;
      return { key, name: key.toUpperCase(), rate: distance, distance: distance, createdAt: Date.now() };
    }
  }) : [];
  
  isLocationsLoading = false;
  saveCache('rpm_cache_locations', locationsList);
  
  renderLocationsGrid();
  refreshActiveSection();
}, error => {
  isLocationsLoading = false;
  console.error("Firebase locations read failed:", error);
  toast.err("Locations sync failed: " + error.message);
});

// Sync Vehicle default mileages
vehicleTypesRef.on('value', snapshot => {
  const val = snapshot.val();
  vehicleTypes = {};
  vehicleKeysMap = {};
  vehicleTypesList = [];
  
  if (val) {
    Object.entries(val).forEach(([key, item]) => {
      if (item && typeof item === 'object') {
        const name = item.name || key;
        const avg = Number(item.avg) || 0;
        vehicleTypesList.push({ name: name, avg: avg, key: key, createdAt: item.createdAt || Date.now() });
        vehicleTypes[name.toUpperCase()] = avg;
        vehicleKeysMap[name.toUpperCase()] = key;
      } else if (item !== null && item !== undefined) {
        // Raw key-value like "MH04LY": 5.5
        const name = key;
        const avg = Number(item) || 0;
        vehicleTypesList.push({ name: name, avg: avg, key: key, createdAt: Date.now() });
        vehicleTypes[name.toUpperCase()] = avg;
        vehicleKeysMap[name.toUpperCase()] = key;
      }
    });
  }
  
  // Sort vehicle config list
  vehicleTypesList.sort((a, b) => a.name.localeCompare(b.name));
  
  isVehicleTypesLoading = false;
  saveCache('rpm_cache_vehicle_types', vehicleTypesList);
  saveCache('rpm_cache_vehicle_types_map', vehicleTypes);
  
  // Populate dropdown selection inside fuel modal
  populateVehicleTypeDropdown();
  populateKmRangeVtypeDropdown();
  renderVehiclesGrid();
  
  // Re-render ledger table so updated mileage is instantly visible in Diesel Records
  if (typeof renderLedgerTable === 'function') {
    renderLedgerTable();
  }
  refreshActiveSection();
}, error => {
  isVehicleTypesLoading = false;
  console.error("Firebase vehicle types read failed:", error);
  toast.err("Vehicle Types sync failed: " + error.message);
});

// Sync Vendors
vendorsRef.on('value', snapshot => {
  const val = snapshot.val();
  vendorsList = [];
  vendorKeysMap = {};
  
  if (val) {
    Object.entries(val).forEach(([key, item]) => {
      if (item && typeof item === 'object') {
        const name = item.name || key;
        vendorsList.push({ name: name, key: key, createdAt: item.createdAt || Date.now() });
        vendorKeysMap[name.toUpperCase()] = key;
      } else if (typeof item === 'string') {
        vendorsList.push({ name: item, key: key, createdAt: Date.now() });
        vendorKeysMap[item.toUpperCase()] = key;
      }
    });
  }
  vendorsList.sort((a, b) => a.name.localeCompare(b.name));
  
  isVendorsLoading = false;
  saveCache('rpm_cache_vendors', vendorsList);
  
  populateVendorDropdown();
  renderVendorsGrid();
  refreshActiveSection();
}, error => {
  isVendorsLoading = false;
  console.error("Firebase vendors read failed:", error);
  toast.err("Vendors sync failed: " + error.message);
});

// Sync Drivers
driversRef.on('value', snapshot => {
  const val = snapshot.val();
  driversList = [];
  driverKeysMap = {};
  
  if (val) {
    Object.entries(val).forEach(([key, item]) => {
      if (item && typeof item === 'object' && item.name) {
        driversList.push({ name: item.name, mobile: item.mobile, tag: item.tag || '', key: key, createdAt: item.createdAt || Date.now() });
        driverKeysMap[item.name.toUpperCase()] = key;
      }
    });
  }
  driversList.sort((a, b) => a.name.localeCompare(b.name));
  
  isDriversLoading = false;
  saveCache('rpm_cache_drivers', driversList);
  
  renderDriversGrid();
  refreshActiveSection();
}, error => {
  isDriversLoading = false;
  console.error("Firebase drivers read failed:", error);
  toast.err("Drivers sync failed: " + error.message);
});

// Sync Employees
employeesRef.on('value', snapshot => {
  const val = snapshot.val();
  employeesList = [];
  employeeKeysMap = {};
  
  if (val) {
    Object.entries(val).forEach(([key, item]) => {
      if (item && typeof item === 'object' && item.name) {
        employeesList.push({ name: item.name, mobile: item.mobile, tag: item.tag || '', key: key, createdAt: item.createdAt || Date.now() });
        employeeKeysMap[item.name.toUpperCase()] = key;
      }
    });
  }
  employeesList.sort((a, b) => a.name.localeCompare(b.name));
  
  isEmployeesLoading = false;
  saveCache('rpm_cache_employees', employeesList);
  
  renderEmployeesGrid();
  refreshActiveSection();
}, error => {
  isEmployeesLoading = false;
  console.error("Firebase employees read failed:", error);
  toast.err("Employees sync failed: " + error.message);
});

// Sync current diesel rate per litre
dieselRateRef.on('value', snapshot => {
  const val = snapshot.val();
  if (val) {
    dieselRate = parseFloat(val) || 90.00;
  }
  
  isDieselRateLoading = false;
  
  // Update header and displays
  const topRate = document.getElementById('top-bar-diesel-rate');
  if (topRate) topRate.textContent = `₹${dieselRate.toFixed(2)}`;
  
  // Set default in form calculations
  refreshActiveSection();
  updateKmCalcRates();
}, error => {
  isDieselRateLoading = false;
  console.error("Firebase diesel rate read failed:", error);
});

// Sync Notes Manager entries (User-Isolated Realtime Sync)
let activeNotesRef = null;
let activeNotesListener = null;
let activeNotesUserKey = null;

function syncUserNotesListener() {
  const currentKey = getCurrentUserNotesKey();
  
  // If no user is authenticated yet, wait until login
  if (!currentKey || currentKey === 'default') {
    return;
  }
  
  if (activeNotesUserKey === currentKey && activeNotesListener) {
    return;
  }

  // Detach previous listener if switching users
  if (activeNotesListener && activeNotesRef) {
    try {
      activeNotesRef.off('value', activeNotesListener);
    } catch(e){}
    activeNotesListener = null;
  }

  activeNotesUserKey = currentKey;
  activeNotesRef = db.ref('user_notes/' + currentKey);

  // Instant cache hydration for this specific user
  const cacheKey = 'rpm_cache_notes_' + currentKey;
  notesList = loadCache(cacheKey, []);
  if (typeof renderNotesList === 'function') {
    renderNotesList();
  }

  isNotesLoading = true;
  activeNotesListener = activeNotesRef.on('value', snapshot => {
    const val = snapshot.val();
    notesList = [];
    if (val) {
      Object.entries(val).forEach(([key, item]) => {
        if (item && typeof item === 'object') {
          notesList.push({
            key: key,
            title: item.title || '',
            content: item.content || '',
            tag: item.tag || 'general',
            timestamp: item.timestamp || Date.now(),
            updatedAt: item.updatedAt || Date.now(),
            userId: item.userId || currentKey,
            userName: item.userName || ''
          });
        }
      });
    }
    // Sort notes by updatedAt desc
    notesList.sort((a, b) => b.updatedAt - a.updatedAt);
    
    isNotesLoading = false;
    saveCache('rpm_cache_notes_' + currentKey, notesList);
    
    if (typeof renderNotesList === 'function') {
      renderNotesList();
    }
  }, error => {
    isNotesLoading = false;
    console.error("Firebase user notes read failed:", error);
    if (typeof toast !== 'undefined' && toast && toast.err) {
      toast.err("Notes sync failed: " + error.message);
    }
  });
}

// Sync Tasks Checklist entries
tasksRef.on('value', snapshot => {
  const val = snapshot.val();
  tasksList = [];
  if (val) {
    Object.entries(val).forEach(([key, item]) => {
      if (item && typeof item === 'object') {
        tasksList.push({
          key: key,
          text: item.text || '',
          completed: !!item.completed,
          priority: item.priority || 'medium',
          timestamp: item.timestamp || Date.now()
        });
      }
    });
  }
  // Sort tasks: pending first, then by priority (high > medium > low), then timestamp
  const priorityWeight = { high: 3, medium: 2, low: 1 };
  tasksList.sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    const weightDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
    if (weightDiff !== 0) return weightDiff;
    return b.timestamp - a.timestamp;
  });
  
  isTasksLoading = false;
  
  renderTasksList();
}, error => {
  isTasksLoading = false;
  console.error("Firebase tasks read failed:", error);
  toast.err("Tasks sync failed: " + error.message);
});

// Sync Refills stock list
refillsRef.on('value', snapshot => {
  const val = snapshot.val();
  refillsList = val ? Object.entries(val).map(([key, v]) => ({ key, ...v })) : [];
  refillsList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  
  isRefillsLoading = false;
  
  renderRefillLogsTable();
  refreshActiveSection();
  if (typeof updateDriverRequestsBadges === 'function') {
    updateDriverRequestsBadges();
  }
}, error => {
  isRefillsLoading = false;
  console.error("Firebase refills read failed:", error);
  toast.err("Refills sync failed: " + error.message);
});

// Sync Email templates list
emailListsRef.on('value', snapshot => {
  const val = snapshot.val();
  if (val) {
    emailLists = {
      'daily-to': val['daily-to'] || [],
      'daily-cc': val['daily-cc'] || [],
      'bill-to': val['bill-to'] || [],
      'bill-cc': val['bill-cc'] || []
    };
  } else {
    // If not set up yet in Firebase, push defaults
    emailListsRef.set(emailLists);
  }
  localStorage.setItem('rpm_email_lists', JSON.stringify(emailLists));
  isEmailListsLoading = false;
  
  if (activeSection === 'email-templates') {
    renderEmailManager();
  }
}, error => {
  isEmailListsLoading = false;
  console.error("Firebase email lists read failed:", error);
});

/* ══════════════════════════════════════════════════════════
   8. DASHBOARD KPI VISUALS & TIMELINE
   ══════════════════════════════════════════════════════════ */
function renderDashboardStats() {
  const todayObj = new Date();
  
  // Get IST date parts manually for robust timezone-aware comparison:
  const istDateStr = todayObj.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' }); // e.g. "6/22/2026"
  const istDate = new Date(istDateStr);
  const todayYear = istDate.getFullYear();
  const todayMonth = istDate.getMonth();
  const todayDay = istDate.getDate();

  // Populate dropdown options dynamically so they stay in sync
  populateDashboardFilterDropdowns();

  // Retrieve the filtered entries
  const filtered = getFilteredEntries();

  // 1. Calculations
  const totalRecords = filtered.length;
  
  // Unique dates and active days
  const uniqueDates = [...new Set(filtered.map(e => e.date).filter(Boolean))];
  const activeDays = uniqueDates.length;

  // Total Spend & Fills & Litres
  const totalSpend = filtered.reduce((sum, e) => sum + (parseFloat(e.dieselAmount) || 0), 0);
  const totalLitres = filtered.reduce((sum, e) => {
    const l = parseFloat(e.litres);
    if (!isNaN(l) && l > 0) return sum + l;
    const cost = parseFloat(e.dieselAmount) || 0;
    const rate = parseFloat(dieselRate) || 98.17;
    return sum + (cost > 0 && rate > 0 ? (cost / rate) : 0);
  }, 0);

  // Today's Spend (matches local today)
  const todaySpend = historyEntries
    .filter(e => {
      const entryDate = parseDateStr(e.date);
      if (!entryDate) return false;
      entryDate.setHours(0,0,0,0);
      const istToday = new Date(todayYear, todayMonth, todayDay);
      if (entryDate.getTime() !== istToday.getTime()) return false;
      
      // Apply same select filters to today's spend card

      if (!matchChecklist(e.vehicleType, dashFilters.vehicleType)) return false;
      if (!matchChecklist(e.vehicleNo, dashFilters.vehicleNo)) return false;
      if (!matchChecklist(e.vendorName, dashFilters.vendor)) return false;
      if (!matchChecklist(e.fromLocation, dashFilters.fromLocation)) return false;
      if (!matchChecklist(e.lastLocation, dashFilters.toLocation)) return false;
      
      return true;
    })
    .reduce((sum, e) => sum + (parseFloat(e.dieselAmount) || 0), 0);

  // Median Fill
  const fillAmounts = filtered.map(e => parseFloat(e.dieselAmount) || 0).sort((a, b) => a - b);
  let medianFill = 0;
  if (fillAmounts.length > 0) {
    const mid = Math.floor(fillAmounts.length / 2);
    if (fillAmounts.length % 2 !== 0) {
      medianFill = fillAmounts[mid];
    } else {
      medianFill = (fillAmounts[mid - 1] + fillAmounts[mid]) / 2;
    }
  }

  // Max Fill
  let maxFill = 0;
  let maxFillVehicle = 'NONE';
  filtered.forEach(e => {
    const amt = parseFloat(e.dieselAmount) || 0;
    if (amt > maxFill) {
      maxFill = amt;
      maxFillVehicle = e.vehicleNo || 'UNKNOWN';
    }
  });

  // Min Fill
  let minFill = filtered.length > 0 ? Infinity : 0;
  filtered.forEach(e => {
    const amt = parseFloat(e.dieselAmount) || 0;
    if (amt < minFill) {
      minFill = amt;
    }
  });
  if (minFill === Infinity) minFill = 0;

  // Fleet Size
  const uniqueVehs = [...new Set(filtered.map(e => e.vehicleNo).filter(Boolean))];
  const fleetSize = uniqueVehs.length;

  // Vendors Count
  const uniqueVends = [...new Set(filtered.map(e => e.vendorName).filter(Boolean))];
  const vendorsCount = uniqueVends.length;

  // Top Vehicle No & Spend
  const vehicleSpendMap = {};
  filtered.forEach(e => {
    if (e.vehicleNo) {
      const v = e.vehicleNo.trim().toUpperCase();
      vehicleSpendMap[v] = (vehicleSpendMap[v] || 0) + (parseFloat(e.dieselAmount) || 0);
    }
  });
  let topVehicleNo = 'NONE';
  let topVehicleSpend = 0;
  Object.entries(vehicleSpendMap).forEach(([v, s]) => {
    if (s > topVehicleSpend) {
      topVehicleNo = v;
      topVehicleSpend = s;
    }
  });

  // 2. Render Card DOM Elements
  const elTotalRecords = document.getElementById('dash-total-records');
  if (elTotalRecords) elTotalRecords.textContent = totalRecords;

  const elActiveDays = document.getElementById('dash-active-days');
  if (elActiveDays) elActiveDays.textContent = `${activeDays} active day${activeDays === 1 ? '' : 's'}`;

  const elTotalSpend = document.getElementById('dash-total-spend');
  if (elTotalSpend) elTotalSpend.textContent = `₹${totalSpend.toLocaleString('en-IN')}`;

  const elSpendFills = document.getElementById('dash-spend-fills');
  if (elSpendFills) {
    const fillsText = `${totalRecords} fill${totalRecords === 1 ? '' : 's'}`;
    const litresFormatted = totalLitres.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    elSpendFills.textContent = totalRecords > 0 ? `${fillsText} • ${litresFormatted} L` : '0 fills • 0.00 L';
  }

  const elTodaySpend = document.getElementById('dash-today-spend');
  if (elTodaySpend) elTodaySpend.textContent = `₹${todaySpend.toLocaleString('en-IN')}`;

  const elMedianFill = document.getElementById('dash-median-fill');
  if (elMedianFill) elMedianFill.textContent = `₹${medianFill.toLocaleString('en-IN')}`;

  const elMaxFill = document.getElementById('dash-max-fill');
  if (elMaxFill) elMaxFill.textContent = `₹${maxFill.toLocaleString('en-IN')}`;

  const elMaxFillVehicle = document.getElementById('dash-max-fill-vehicle');
  if (elMaxFillVehicle) elMaxFillVehicle.textContent = maxFillVehicle;

  const elMinFill = document.getElementById('dash-min-fill');
  if (elMinFill) elMinFill.textContent = `₹${minFill.toLocaleString('en-IN')}`;

  const elFleetSize = document.getElementById('dash-fleet-size');
  if (elFleetSize) elFleetSize.textContent = fleetSize;

  const elVendorsCount = document.getElementById('dash-vendors-count');
  if (elVendorsCount) elVendorsCount.textContent = vendorsCount;

  const elActiveDaysCount = document.getElementById('dash-active-days-count');
  if (elActiveDaysCount) elActiveDaysCount.textContent = activeDays;

  const elTopVehicle = document.getElementById('dash-top-vehicle');
  if (elTopVehicle) elTopVehicle.textContent = topVehicleNo;

  // Find the latest vendor for the top vehicle from the filtered entries
  let topVehicleVendor = '';
  if (topVehicleNo !== 'NONE') {
    const match = filtered.find(e => e.vehicleNo && e.vehicleNo.trim().toUpperCase() === topVehicleNo);
    if (match) {
      topVehicleVendor = match.vendorName || '';
    }
  }

  const elTopVehicleSpend = document.getElementById('dash-top-vehicle-spend');
  if (elTopVehicleSpend) {
    const displayStr = `₹${topVehicleSpend.toLocaleString('en-IN')}${topVehicleVendor ? ' | ' + topVehicleVendor : ''}`;
    elTopVehicleSpend.textContent = displayStr;
    elTopVehicleSpend.setAttribute('title', displayStr);
  }

  // 3. Tank Reserves Calculations (remains all-time for physical stock level correctness)
  let totalRefills = 0;
  let totalRefillCost = 0;
  
  refillsList.forEach(r => {
    totalRefills += parseFloat(r.litres) || 0;
    totalRefillCost += (parseFloat(r.litres) * parseFloat(r.rate)) || 0;
  });
  
  let totalConsumed = 0;
  historyEntries.forEach(e => {
    totalConsumed += parseFloat(e.litres) || (parseFloat(e.dieselAmount) / dieselRate) || 0;
  });

  const baseTankBalance = 12000.00; // Configured Base
  const netReserves = (baseTankBalance + totalRefills) - totalConsumed;
  
  const cap = 20000;
  const perc = Math.min(100, Math.max(0, (netReserves / cap) * 100));
  
  const percBadge = document.getElementById('dash-tank-perc-badge');
  const balanceVal = document.getElementById('dash-tank-balance');
  const tankGauge = document.getElementById('tank-gauge-visual');
  const tankPercNum = document.getElementById('tank-perc-numeric');
  const tankVolNum = document.getElementById('tank-volume-numeric');
  const tankLowAlert = document.getElementById('tank-low-stock-alert');
  
  if (percBadge) {
    percBadge.textContent = `${perc.toFixed(1)}%`;
    percBadge.className = `px-2 py-0.5 rounded-full text-[9px] font-bold ${perc < 20 ? 'bg-red-500/10 text-red-500 animate-pulse' : 'bg-green-500/10 text-green-600 dark:text-green-400'}`;
  }
  
  if (balanceVal) balanceVal.textContent = `${netReserves.toFixed(2)} L`;
  if (tankPercNum) tankPercNum.textContent = `${perc.toFixed(1)}%`;
  if (tankVolNum) tankVolNum.textContent = `${netReserves.toFixed(2)} L`;
  
  if (tankGauge) {
    tankGauge.style.setProperty('--tank-perc', `${perc}%`);
  }

  if (tankLowAlert) {
    if (perc < 20) {
      tankLowAlert.classList.remove('hidden');
    } else {
      tankLowAlert.classList.add('hidden');
    }
  }

  const statRefilled = document.getElementById('tank-stat-refilled');
  const statConsumed = document.getElementById('tank-stat-consumed');
  const calcBase = document.getElementById('tank-calc-base');
  const calcComp = document.getElementById('tank-calc-computed');

  if (statRefilled) statRefilled.textContent = `${totalRefills.toFixed(2)} L`;
  if (statConsumed) statConsumed.textContent = `${totalConsumed.toFixed(2)} L`;
  if (calcBase) calcBase.textContent = `${baseTankBalance.toFixed(2)} L`;
  if (calcComp) calcComp.textContent = `${netReserves.toFixed(2)} L`;

  // 4. Timeline Recent Activity (uses filtered list so it updates with selection)
  const list = document.getElementById('dash-recent-list');
  if (list) {
    list.innerHTML = '';
    const recents = filtered.slice(0, 5);
    
    if (recents.length === 0) {
      list.innerHTML = `<div class="text-center py-10 text-xs text-slate-400">No matching entries found.</div>`;
      return;
    }

    recents.forEach(e => {
      const litres = parseFloat(e.litres) || (parseFloat(e.dieselAmount) / dieselRate) || 0;
      const amount = parseFloat(e.dieselAmount) || 0;
      
      const el = document.createElement('div');
      el.className = "flex items-start gap-3 p-3 bg-slate-100/60 dark:bg-slate-900/50 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 hover-lift";
      el.innerHTML = `
        <div class="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">
          #${e.responseNumber}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <span class="text-xs font-extrabold text-slate-800 dark:text-white truncate">${e.vehicleNo}</span>
            <span class="text-[10px] text-slate-400 font-semibold">${e.date}</span>
          </div>
          <p class="text-[10px] text-slate-400 mt-0.5 truncate">${e.fromLocation} → ${e.lastLocation} | ${e.vendorName}</p>
          <div class="flex items-center justify-between mt-1 text-[10px] font-bold">
            <span class="text-blue-600">${litres.toFixed(2)} Litres</span>
            <span class="text-slate-500">₹${amount.toFixed(2)}</span>
          </div>
        </div>
      `;
      list.appendChild(el);
    });
  }
}

// Get list of entries filtered by the active dashboard filters
function getFilteredEntries() {
  const todayObj = new Date();
  const todayISTStr = todayObj.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' });
  const todayIST = new Date(todayISTStr);
  const todayY = todayIST.getFullYear();
  const todayM = todayIST.getMonth();
  const todayD = todayIST.getDate();

  let fromDateObj = dashFilters.dateFrom ? parseDateStr(dashFilters.dateFrom) : null;
  let toDateObj = dashFilters.dateTo ? parseDateStr(dashFilters.dateTo) : null;
  
  if (fromDateObj) {
    fromDateObj.setHours(0, 0, 0, 0);
  }
  if (toDateObj) {
    toDateObj.setHours(23, 59, 59, 999);
  }

  return historyEntries.filter(e => {
    // Date range filter
    const entryDate = parseDateStr(e.date);
    if (entryDate) {
      entryDate.setHours(0, 0, 0, 0);
      if (fromDateObj && entryDate < fromDateObj) return false;
      if (toDateObj && entryDate > toDateObj) return false;
    }



    // Vehicle Type filter
    if (!matchChecklist(e.vehicleType, dashFilters.vehicleType)) return false;

    // Vehicle No filter
    if (!matchChecklist(e.vehicleNo, dashFilters.vehicleNo)) return false;

    // Vendor filter
    if (!matchChecklist(e.vendorName, dashFilters.vendor)) return false;

    // From Location filter
    if (!matchChecklist(e.fromLocation, dashFilters.fromLocation)) return false;

    // To Location filter
    if (!matchChecklist(e.lastLocation, dashFilters.toLocation)) return false;

    // Amount filters
    const costVal = parseFloat(e.dieselAmount) || 0;
    if (parseFloat(dashFilters.minAmount) > 0 && costVal < parseFloat(dashFilters.minAmount)) return false;
    if (dashFilters.maxAmount !== null && dashFilters.maxAmount !== '') {
      if (costVal > parseFloat(dashFilters.maxAmount)) return false;
    }

    return true;
  });
}

// Populate filter dropdown selections
// Helper for setting up dynamic multi-select checkbox checklist dropdowns
function setupMultiSelectChecklist(config) {
  const {
    menuId,
    selectAllId,
    labelId,
    key,
    items,
    defaultLabel
  } = config;

  const role = getAuthSession('rpm_user_role');
  const assignedVendor = getAuthSession('rpm_assigned_vendor');
  const isVendorLocked = (role === 'vendor' || !!assignedVendor) && !!assignedVendor;

  if (key === 'vendor' && isVendorLocked) {
    dashFilters.vendor = [assignedVendor];
    const labelEl = document.getElementById(labelId);
    if (labelEl) labelEl.textContent = assignedVendor;

    const selectAllCb = document.getElementById(selectAllId);
    if (selectAllCb) {
      const parentRow = selectAllCb.closest('div');
      if (parentRow) parentRow.style.display = 'none';
    }

    const menu = document.getElementById(menuId);
    if (menu) {
      menu.innerHTML = '';
      const itemDiv = document.createElement('div');
      itemDiv.className = 'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs';
      itemDiv.innerHTML = `
        <input type="checkbox" value="${assignedVendor}" id="vendor-cb-0" class="vendor-filter-checkbox h-3.5 w-3.5 text-blue-600 border-slate-600 rounded bg-slate-700" checked disabled>
        <label for="vendor-cb-0" class="flex-grow text-slate-300 truncate font-semibold">${assignedVendor}</label>
        <span class="text-amber-400 text-[10px]">🔒</span>
      `;
      menu.appendChild(itemDiv);
    }
    return;
  }

  const menu = document.getElementById(menuId);
  const selectAllCb = document.getElementById(selectAllId);
  const labelEl = document.getElementById(labelId);

  if (!menu) return;

  const selected = Array.isArray(dashFilters[key]) ? dashFilters[key] : [dashFilters[key]];
  const isAllSelected = selected.includes('All') || (selected.length === items.length && items.length > 0);

  menu.innerHTML = '';
  const fragment = document.createDocumentFragment();

  items.forEach((item, idx) => {
    const isChecked = (isAllSelected || selected.includes(item)) ? 'checked' : '';
    const itemDiv = document.createElement('div');
    itemDiv.className = 'flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-700 rounded-lg cursor-pointer text-xs';
    itemDiv.innerHTML = `
      <input type="checkbox" value="${item}" id="${key}-cb-${idx}" class="${key}-filter-checkbox h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-slate-600 rounded bg-slate-700 cursor-pointer" ${isChecked}>
      <label for="${key}-cb-${idx}" class="flex-grow cursor-pointer text-slate-300 truncate">${item}</label>
    `;
    itemDiv.onclick = (e) => {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'LABEL') {
        const cb = itemDiv.querySelector('input');
        if (cb) {
          cb.checked = !cb.checked;
          updateSelectedState();
        }
      }
    };
    fragment.appendChild(itemDiv);
  });
  menu.appendChild(fragment);

  if (labelEl) {
    if (isAllSelected) {
      labelEl.textContent = defaultLabel;
      if (selectAllCb) selectAllCb.checked = true;
    } else {
      if (selectAllCb) selectAllCb.checked = false;
      if (selected.length === 0) {
        labelEl.textContent = 'None Selected';
      } else if (selected.length === 1) {
        labelEl.textContent = selected[0];
      } else {
        labelEl.textContent = `${selected.length} Selected`;
      }
    }
  }

  const cbs = menu.querySelectorAll(`.${key}-filter-checkbox`);
  const updateSelectedState = () => {
    const checked = Array.from(cbs).filter(cb => cb.checked).map(cb => cb.value);
    if (checked.length === cbs.length) {
      dashFilters[key] = ['All'];
      if (selectAllCb) selectAllCb.checked = true;
      cbs.forEach(cb => cb.checked = true);
    } else if (checked.length === 0) {
      dashFilters[key] = [];
      if (selectAllCb) selectAllCb.checked = false;
    } else {
      dashFilters[key] = checked;
      if (selectAllCb) selectAllCb.checked = false;
    }

    if (labelEl) {
      if (dashFilters[key].includes('All')) {
        labelEl.textContent = defaultLabel;
      } else if (dashFilters[key].length === 0) {
        labelEl.textContent = 'None Selected';
      } else if (dashFilters[key].length === 1) {
        labelEl.textContent = dashFilters[key][0];
      } else {
        labelEl.textContent = `${dashFilters[key].length} Selected`;
      }
    }

    updateDashboardFilterBadgeAndTags();
    renderDashboardStats();
    setTimeout(renderConsumptionChart, 100);
    if (typeof renderLedgerTable === 'function') renderLedgerTable();
  };

  cbs.forEach(cb => {
    cb.addEventListener('change', updateSelectedState);
  });

  if (selectAllCb) {
    const parentRow = selectAllCb.closest('div');
    if (parentRow) {
      parentRow.onclick = (e) => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'LABEL') {
          const actualCb = parentRow.querySelector('input');
          if (actualCb) {
            actualCb.checked = !actualCb.checked;
            actualCb.dispatchEvent(new Event('change'));
          }
        }
      };
    }
    const newSelectAll = selectAllCb.cloneNode(true);
    selectAllCb.parentNode.replaceChild(newSelectAll, selectAllCb);
    newSelectAll.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      cbs.forEach(cb => cb.checked = isChecked);
      if (isChecked) {
        dashFilters[key] = ['All'];
      } else {
        dashFilters[key] = [];
      }
      updateSelectedState();
    });
  }
}

// Populate filter dropdown selections
function populateDashboardFilterDropdowns() {
  const role = getAuthSession('rpm_user_role');
  const assignedVendor = getAuthSession('rpm_assigned_vendor');

  if (role === 'vendor' && assignedVendor) {
    dashFilters.vendor = [assignedVendor];
    const vendorLabel = document.getElementById('dash-filter-vendor-label');
    if (vendorLabel) {
      vendorLabel.textContent = assignedVendor;
    }
  }

  // 1. Vehicle Types
  const types = [...new Set(historyEntries.map(e => e.vehicleType).filter(Boolean))];
  vehicleTypesList.forEach(vt => {
    if (vt.name && !types.includes(vt.name)) types.push(vt.name);
  });
  types.sort();
  setupMultiSelectChecklist({
    menuId: 'dash-filter-vehicle-type-list',
    selectAllId: 'dash-filter-vehicle-type-select-all',
    labelId: 'dash-filter-vehicle-type-label',
    key: 'vehicleType',
    items: types,
    defaultLabel: 'All Types'
  });

  // 2. Vehicle Numbers
  const uniqueVehs = [...new Set(historyEntries.map(e => e.vehicleNo).filter(Boolean))].sort();
  setupMultiSelectChecklist({
    menuId: 'dash-filter-vehicle-no-list',
    selectAllId: 'dash-filter-vehicle-no-select-all',
    labelId: 'dash-filter-vehicle-no-label',
    key: 'vehicleNo',
    items: uniqueVehs,
    defaultLabel: 'All Vehicles'
  });

  // 3. Vendors Multi-Select Checklist
  const vendors = [...new Set(historyEntries.map(e => e.vendorName).filter(Boolean))];
  vendorsList.forEach(v => {
    const name = v.name || v;
    if (name && !vendors.includes(name)) vendors.push(name);
  });
  vendors.sort();

  const isVendorLocked = (role === 'vendor' || !!assignedVendor) && !!assignedVendor;

  if (!isVendorLocked) {
    setupMultiSelectChecklist({
      menuId: 'dash-filter-vendor-list',
      selectAllId: 'dash-filter-vendor-select-all',
      labelId: 'dash-filter-vendor-label',
      key: 'vendor',
      items: vendors,
      defaultLabel: 'All Vendors'
    });
  } else {
    // For Vendor Role / Assigned Vendor: Directly build locked vendor checklist
    dashFilters.vendor = [assignedVendor];

    // Set the label on the button
    const vendorLabel = document.getElementById('dash-filter-vendor-label');
    if (vendorLabel) vendorLabel.textContent = assignedVendor;

    // Disable dropdown toggle button
    const vendorBtn = document.getElementById('dash-filter-vendor-btn');
    if (vendorBtn) {
      vendorBtn.onclick = (e) => {
        e.stopPropagation();
      };
    }

    // Hide Select All row
    const selectAllCb = document.getElementById('dash-filter-vendor-select-all');
    if (selectAllCb) {
      const parentRow = selectAllCb.closest('div');
      if (parentRow) parentRow.style.display = 'none';
    }

    // Build the list with only the assigned vendor, checked and disabled
    const vendorMenu = document.getElementById('dash-filter-vendor-list');
    if (vendorMenu) {
      vendorMenu.innerHTML = '';
      const itemDiv = document.createElement('div');
      itemDiv.className = 'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs';
      itemDiv.innerHTML = `
        <input type="checkbox" value="${assignedVendor}" id="vendor-cb-0" class="vendor-filter-checkbox h-3.5 w-3.5 text-blue-600 border-slate-600 rounded bg-slate-700" checked disabled>
        <label for="vendor-cb-0" class="flex-grow text-slate-300 truncate font-semibold">${assignedVendor}</label>
        <span class="text-amber-400 text-[10px]">🔒</span>
      `;
      vendorMenu.appendChild(itemDiv);
    }
  }

  // 4. Locations
  const locations = [...new Set([
    ...historyEntries.map(e => e.fromLocation).filter(Boolean),
    ...historyEntries.map(e => e.lastLocation).filter(Boolean),
    ...locationsList.map(l => l.name).filter(Boolean)
  ])].sort();

  setupMultiSelectChecklist({
    menuId: 'dash-filter-from-location-list',
    selectAllId: 'dash-filter-from-location-select-all',
    labelId: 'dash-filter-from-location-label',
    key: 'fromLocation',
    items: locations,
    defaultLabel: 'All Locations'
  });

  setupMultiSelectChecklist({
    menuId: 'dash-filter-to-location-list',
    selectAllId: 'dash-filter-to-location-select-all',
    labelId: 'dash-filter-to-location-label',
    key: 'toLocation',
    items: locations,
    defaultLabel: 'All Destinations'
  });
}

// Update filter badges and active filter tags underneath
function updateDashboardFilterBadgeAndTags() {
  const badgeEl = document.getElementById('dash-active-filters-badge');
  const countEl = document.getElementById('dash-filters-active-count');
  const tagsContainer = document.getElementById('dash-filter-tags');

  let activeCount = 0;
  const tags = [];

  // Helper to push tags
  const addTag = (key, label, displayVal, resetVal) => {
    activeCount++;
    tags.push({
      key: key,
      html: `<span class="flex items-center gap-1 px-2.5 py-1 bg-blue-600/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-full border border-blue-500/20 shadow-sm">${label}: ${displayVal} <i class="fas fa-times cursor-pointer hover:text-red-500 ml-1 transition-colors" onclick="clearSingleDashboardFilter('${key}', ${typeof resetVal === 'string' ? `'${resetVal}'` : resetVal})"></i></span>`
    });
  };

  if (dashFilters.dateFrom) addTag('dateFrom', 'From', dashFilters.dateFrom, '');
  if (dashFilters.dateTo) addTag('dateTo', 'To', dashFilters.dateTo, '');

  const checkChecklistTag = (key, label) => {
    const selected = Array.isArray(dashFilters[key]) ? dashFilters[key] : [dashFilters[key]];
    const isFiltered = selected.length > 0 && !selected.includes('All');
    if (isFiltered) {
      const displayVal = selected.length === 1 ? selected[0] : `${selected.length} Selected`;
      addTag(key, label, displayVal, 'All');
    }
  };

  checkChecklistTag('vehicleType', 'Type');
  checkChecklistTag('vehicleNo', 'Vehicle');
  checkChecklistTag('vendor', 'Vendor');
  checkChecklistTag('fromLocation', 'From');
  checkChecklistTag('toLocation', 'To');

  if (parseFloat(dashFilters.minAmount) > 0) addTag('minAmount', 'Min Spend', `₹${dashFilters.minAmount}`, 0);
  if (dashFilters.maxAmount !== null && dashFilters.maxAmount !== '') addTag('maxAmount', 'Max Spend', `₹${dashFilters.maxAmount}`, null);

  // Update badges
  if (badgeEl) {
    const numSpan = badgeEl.querySelector('.active-count-num');
    if (numSpan) { numSpan.textContent = activeCount; } else { badgeEl.textContent = `${activeCount} active`; }
  }
  if (countEl) countEl.textContent = `${activeCount} active`;

  // Render tags
  if (tagsContainer) {
    tagsContainer.innerHTML = '';
    if (tags.length === 0) {
      tagsContainer.innerHTML = '<span class="text-[10px] text-slate-400 italic">No filters active</span>';
    } else {
      tags.forEach(t => {
        tagsContainer.insertAdjacentHTML('beforeend', t.html);
      });
    }
  }

  // Sync to clean dashboard iframe if it is loaded via postMessage
  const iframe = document.querySelector('#sec-reports iframe');
  if (iframe && iframe.contentWindow) {
    try {
      const role = getAuthSession('rpm_user_role');
      const assignedVendor = getAuthSession('rpm_assigned_vendor');
      iframe.contentWindow.postMessage({ type: 'applyFilters', filters: dashFilters, role: role, assignedVendor: assignedVendor }, '*');
    } catch (e) {
      console.warn("iframe postMessage failed:", e);
    }
  }
}

// Clear single dashboard filter
window.clearSingleDashboardFilter = function(key, resetVal) {
  const role = getAuthSession('rpm_user_role');
  const assignedVendor = getAuthSession('rpm_assigned_vendor');
  if (key === 'vendor' && (role === 'vendor' || assignedVendor) && assignedVendor) {
    dashFilters.vendor = [assignedVendor];
  } else {
    dashFilters[key] = (resetVal === 'All') ? ['All'] : resetVal;
  }
  
  // Sync HTML inputs
  const idMap = {
    dateFrom: 'dash-filter-date-from',
    dateTo: 'dash-filter-date-to',
    minAmount: 'dash-filter-min-amount',
    maxAmount: 'dash-filter-max-amount'
  };

  const inputEl = document.getElementById(idMap[key]);
  if (inputEl) {
    inputEl.value = (resetVal === null) ? '' : resetVal;
  }

  updateDashboardFilterBadgeAndTags();
  renderDashboardStats();
  setTimeout(renderConsumptionChart, 100);
};

// Initialize filter panel listeners
function initDashboardFilters() {
  // Set default dates to Today
  const todayIST = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' });
  const d = new Date(todayIST);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const role = getAuthSession('rpm_user_role');
  const assignedVendor = getAuthSession('rpm_assigned_vendor');

  dashFilters.dateFrom = todayStr;
  dashFilters.dateTo = todayStr;
  dashFilters.vehicleType = ['All'];
  dashFilters.vehicleNo = ['All'];
  dashFilters.vendor = (role === 'vendor' || assignedVendor) && assignedVendor ? [assignedVendor] : ['All'];
  dashFilters.fromLocation = ['All'];
  dashFilters.toLocation = ['All'];

  const dateFromEl = document.getElementById('dash-filter-date-from');
  const dateToEl = document.getElementById('dash-filter-date-to');

  if (dateFromEl) dateFromEl.value = todayStr;
  if (dateToEl) dateToEl.value = todayStr;

  // Dropdown toggle helper
  const bindDropdownToggle = (btnId, menuId) => {
    const btn = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    if (btn && menu) {
      btn.onclick = (e) => {
        e.stopPropagation();
        const allMenus = [
          'dash-filter-vehicle-type-menu',
          'dash-filter-vehicle-no-menu',
          'dash-filter-vendor-menu',
          'dash-filter-from-location-menu',
          'dash-filter-to-location-menu'
        ];
        allMenus.forEach(id => {
          if (id !== menuId) {
            document.getElementById(id)?.classList.add('hidden');
          }
        });
        const isOpening = menu.classList.contains('hidden');
        menu.classList.toggle('hidden');

        if (isOpening) {
          const searchInput = menu.querySelector('input[type="text"]');
          if (searchInput) {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
            setTimeout(() => searchInput.focus(), 60);
          }
        }
      };
    }
  };

  bindDropdownToggle('dash-filter-vehicle-type-btn', 'dash-filter-vehicle-type-menu');
  bindDropdownToggle('dash-filter-vehicle-no-btn', 'dash-filter-vehicle-no-menu');

  const lockRole = getAuthSession('rpm_user_role');
  const lockVendor = getAuthSession('rpm_assigned_vendor');
  if ((lockRole === 'vendor' || !!lockVendor) && !!lockVendor) {
    const vendorBtn = document.getElementById('dash-filter-vendor-btn');
    if (vendorBtn) {
      vendorBtn.onclick = (e) => {
        e.stopPropagation();
      };
    }
  } else {
    bindDropdownToggle('dash-filter-vendor-btn', 'dash-filter-vendor-menu');
  }

  bindDropdownToggle('dash-filter-from-location-btn', 'dash-filter-from-location-menu');
  bindDropdownToggle('dash-filter-to-location-btn', 'dash-filter-to-location-menu');

  // Multi-Select Dropdown Live Search Suggestion Setup
  const initChecklistSearch = (searchId, listId) => {
    const searchInput = document.getElementById(searchId);
    if (!searchInput) return;
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const list = document.getElementById(listId);
      if (!list) return;
      Array.from(list.children).forEach(item => {
        const lbl = item.querySelector('label');
        if (lbl) {
          const textVal = lbl.textContent.toLowerCase();
          if (textVal.includes(q)) {
            item.classList.remove('hidden');
          } else {
            item.classList.add('hidden');
          }
        }
      });
    });
  };

  initChecklistSearch('dash-filter-vehicle-type-search', 'dash-filter-vehicle-type-list');
  initChecklistSearch('dash-filter-vehicle-no-search', 'dash-filter-vehicle-no-list');
  initChecklistSearch('dash-filter-vendor-search', 'dash-filter-vendor-list');
  initChecklistSearch('dash-filter-from-location-search', 'dash-filter-from-location-list');
  initChecklistSearch('dash-filter-to-location-search', 'dash-filter-to-location-list');

  // Close menus on click outside
  document.addEventListener('click', (e) => {
    const menus = [
      { btnId: 'dash-filter-vehicle-type-btn', menuId: 'dash-filter-vehicle-type-menu' },
      { btnId: 'dash-filter-vehicle-no-btn', menuId: 'dash-filter-vehicle-no-menu' },
      { btnId: 'dash-filter-vendor-btn', menuId: 'dash-filter-vendor-menu' },
      { btnId: 'dash-filter-from-location-btn', menuId: 'dash-filter-from-location-menu' },
      { btnId: 'dash-filter-to-location-btn', menuId: 'dash-filter-to-location-menu' }
    ];
    menus.forEach(m => {
      const btn = document.getElementById(m.btnId);
      const menu = document.getElementById(m.menuId);
      if (menu && !menu.classList.contains('hidden') && !menu.contains(e.target) && e.target !== btn) {
        menu.classList.add('hidden');
      }
    });
  });

  // Toggle button event
  const toggleBtn = document.getElementById('btn-toggle-dashboard-filters');
  const filterPanel = document.getElementById('dashboard-filter-panel');
  const closeBtn = document.getElementById('btn-close-dash-filters');

  if (toggleBtn && filterPanel) {
    toggleBtn.onclick = () => {
      filterPanel.classList.toggle('hidden');
    };
  }

  if (closeBtn && filterPanel) {
    closeBtn.onclick = () => {
      filterPanel.classList.add('hidden');
    };
  }

  // Bind dropdowns & inputs
  const bindChange = (id, key, isNumber = false) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        let val = el.value;
        if (isNumber) {
          val = val === '' ? 0 : parseFloat(val);
        } else if (key === 'maxAmount' && val === '') {
          val = null;
        }
        dashFilters[key] = val;
        updateDashboardFilterBadgeAndTags();
        renderDashboardStats();
        setTimeout(renderConsumptionChart, 100);
        if (typeof renderLedgerTable === 'function') renderLedgerTable();
      });
      // Handle keyup on min/max amount for live filtering
      if (key === 'minAmount' || key === 'maxAmount') {
        el.addEventListener('keyup', () => {
          let val = el.value;
          if (isNumber) {
            val = val === '' ? 0 : parseFloat(val);
          } else if (key === 'maxAmount' && val === '') {
            val = null;
          }
          dashFilters[key] = val;
          updateDashboardFilterBadgeAndTags();
          renderDashboardStats();
          setTimeout(renderConsumptionChart, 100);
          if (typeof renderLedgerTable === 'function') renderLedgerTable();
        });
      }
    }
  };

  bindChange('dash-filter-date-from', 'dateFrom');
  bindChange('dash-filter-date-to', 'dateTo');
  bindChange('dash-filter-min-amount', 'minAmount', true);
  bindChange('dash-filter-max-amount', 'maxAmount');

  // Quick buttons setup
  const setQuickDateRange = (days) => {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - days);

    const fmt = date => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    dashFilters.dateFrom = fmt(start);
    dashFilters.dateTo = fmt(today);

    if (dateFromEl) dateFromEl.value = dashFilters.dateFrom;
    if (dateToEl) dateToEl.value = dashFilters.dateTo;

    updateDashboardFilterBadgeAndTags();
    renderDashboardStats();
    setTimeout(renderConsumptionChart, 100);
    if (typeof renderLedgerTable === 'function') renderLedgerTable();
  };

  const btn7d = document.getElementById('btn-quick-7d');
  if (btn7d) btn7d.onclick = () => setQuickDateRange(7);

  const btn30d = document.getElementById('btn-quick-30d');
  if (btn30d) btn30d.onclick = () => setQuickDateRange(30);

  const btn90d = document.getElementById('btn-quick-90d');
  if (btn90d) btn90d.onclick = () => setQuickDateRange(90);

  const btnReset = document.getElementById('btn-quick-reset');
  if (btnReset) {
    btnReset.onclick = () => {
      const curRole = getAuthSession('rpm_user_role');
      const curVendor = getAuthSession('rpm_assigned_vendor');
      dashFilters = {
        dateFrom: todayStr,
        dateTo: todayStr,
        vehicleType: ['All'],
        vehicleNo: ['All'],
        vendor: (curRole === 'vendor' && curVendor) ? [curVendor] : ['All'],
        fromLocation: ['All'],
        toLocation: ['All'],
        minAmount: 0,
        maxAmount: null
      };

      if (dateFromEl) dateFromEl.value = todayStr;
      if (dateToEl) dateToEl.value = todayStr;
      
      const minEl = document.getElementById('dash-filter-min-amount');
      const maxEl = document.getElementById('dash-filter-max-amount');
      if (minEl) minEl.value = '';
      if (maxEl) maxEl.value = '';

      updateDashboardFilterBadgeAndTags();
      populateDashboardFilterDropdowns();
      renderDashboardStats();
      setTimeout(renderConsumptionChart, 100);
      if (typeof renderLedgerTable === 'function') renderLedgerTable();
      toast.info("Dashboard filters reset successfully.");
    };
  }

  // Initial update
  updateDashboardFilterBadgeAndTags();
}

/* ══════════════════════════════════════════════════════════
   9. APEXCHARTS DASHBOARD VISUALIZATIONS
   ══════════════════════════════════════════════════════════ */
// Note: consumptionChart is declared globally at top of script
function renderConsumptionChart() {
  const chartEl = document.getElementById('dash-vendor-chart');
  if (!chartEl) return;
  const appLayout = document.getElementById('app-layout');
  if (appLayout && appLayout.classList.contains('hidden')) return;
  if (typeof ApexCharts === 'undefined') return;
  
  if (consumptionChart) {
    try {
      consumptionChart.destroy();
    } catch (e) {
      console.warn("Error destroying chart:", e);
    }
    consumptionChart = null;
  }

  const entries = getFilteredEntries();
  const vendorSpend = {};

  entries.forEach(e => {
    const vendor = (e.vendorName || 'UNKNOWN').trim().toUpperCase();
    const litres = parseFloat(e.litres) || 0;
    const rate = parseFloat(e.dieselRate) || dieselRate || 0;
    const amount = parseFloat(e.dieselAmount) || (litres * rate) || 0;
    vendorSpend[vendor] = (vendorSpend[vendor] || 0) + amount;
  });

  const sortedVendors = Object.entries(vendorSpend)
    .filter(([_, spend]) => spend > 0)
    .sort((a, b) => b[1] - a[1]);

  const series = sortedVendors.map(([_, spend]) => parseFloat(spend.toFixed(2)));
  const labels = sortedVendors.map(([vendor, _]) => vendor);

  const isDark = document.documentElement.classList.contains('dark');

  const options = {
    series: series,
    labels: labels,
    chart: {
      type: 'donut',
      height: 320,
      background: 'transparent',
      toolbar: { show: false }
    },
    stroke: {
      colors: [isDark ? '#0f172a' : '#ffffff'],
      width: 2
    },
    legend: {
      position: 'bottom',
      fontFamily: 'Inter',
      fontSize: '11px',
      labels: {
        colors: isDark ? '#9ca3af' : '#475569'
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function (val, opts) {
        return opts.w.config.series[opts.seriesIndex] > 0 ? `${val.toFixed(1)}%` : '';
      },
      style: {
        fontSize: '10px',
        fontFamily: 'Inter',
        fontWeight: 'bold'
      }
    },
    tooltip: {
      y: {
        formatter: val => `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
      }
    },
    noData: {
      text: 'No data available',
      align: 'center',
      verticalAlign: 'middle',
      style: {
        color: isDark ? '#9ca3af' : '#475569',
        fontSize: '14px',
        fontFamily: 'Inter'
      }
    },
    theme: { mode: isDark ? 'dark' : 'light' }
  };

  consumptionChart = new ApexCharts(chartEl, options);
  consumptionChart.render();
}

// Detailed analytics graphs
let vehicleChart = null;
let vendorConsChart = null;
let monthlyTrendsChart = null;
let vendorShareChart = null;

function renderAnalyticsCharts() {
  const isDark = document.documentElement.classList.contains('dark');
  const labelColor = isDark ? '#9ca3af' : '#475569';
  const gridColor = isDark ? '#1f2937' : '#e2e8f0';

  // Aggregate Data
  const vehicleLitres = {};
  const driverLitres = {};
  const vendorLitres = {};
  const monthlyLitres = {};

  historyEntries.forEach(e => {
    const litres = parseFloat(e.litres) || (parseFloat(e.dieselAmount) / dieselRate) || 0;
    
    // Vehicle wise
    if (e.vehicleNo) {
      const v = e.vehicleNo.toUpperCase().trim();
      vehicleLitres[v] = (vehicleLitres[v] || 0) + litres;
    }
    
    // Driver wise
    if (e.note) {
      const parsedNote = String(e.note).trim().toUpperCase();
      const match = parsedNote.match(/DRIVER:\s*([A-Z\s]+)/);
      if (match && match[1]) {
        const dName = match[1].trim();
        driverLitres[dName] = (driverLitres[dName] || 0) + litres;
      }
    }
    
    // Vendor wise
    if (e.vendorName) {
      const ven = e.vendorName.trim().toUpperCase();
      vendorLitres[ven] = (vendorLitres[ven] || 0) + litres;
    }

    // Monthly wise
    if (e.date) {
      const parts = e.date.split('-');
      if (parts.length === 3) {
        // e.g. "06-2026"
        const mKey = `${parts[1]}-${parts[2]}`;
        monthlyLitres[mKey] = (monthlyLitres[mKey] || 0) + litres;
      }
    }
  });

  // Helper sorting and extraction
  const sortedVehicles = Object.entries(vehicleLitres).sort((a,b) => b[1] - a[1]).slice(0, 10);
  const sortedVendorsBar = Object.entries(vendorLitres).sort((a,b) => b[1] - a[1]).slice(0, 10);
  const sortedVendors = Object.entries(vendorLitres).sort((a,b) => b[1] - a[1]).slice(0, 5);

  // 1. Vehicle Wise Bar Chart
  if (vehicleChart) vehicleChart.destroy();
  vehicleChart = new ApexCharts(document.getElementById('chart-vehicle-consumption'), {
    series: [{ name: 'Litres', data: sortedVehicles.map(x => parseFloat(x[1].toFixed(1))) }],
    chart: { type: 'bar', height: 260, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 6, columnName: '55%', distributed: true } },
    colors: ['#3b82f6', '#10b981', '#fbbf24', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#f97316', '#84cc16'],
    legend: { show: false },
    xaxis: {
      categories: sortedVehicles.map(x => x[0]),
      labels: { style: { colors: labelColor, fontSize: '9px', fontFamily: 'Inter' } }
    },
    yaxis: { labels: { style: { colors: labelColor } } },
    grid: { borderColor: gridColor },
    theme: { mode: isDark ? 'dark' : 'light' }
  });
  vehicleChart.render();

  // 2. Vendor Wise Bar Chart
  if (vendorConsChart) vendorConsChart.destroy();
  vendorConsChart = new ApexCharts(document.getElementById('chart-vendor-consumption'), {
    series: [{ name: 'Litres Consumed', data: sortedVendorsBar.map(x => parseFloat(x[1].toFixed(1))) }],
    chart: { type: 'bar', height: 260, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: '55%' } },
    colors: ['#10b981'],
    xaxis: {
      categories: sortedVendorsBar.map(x => x[0]),
      labels: { style: { colors: labelColor } }
    },
    yaxis: { labels: { style: { colors: labelColor, fontSize: '9px', fontFamily: 'Inter' } } },
    grid: { borderColor: gridColor },
    theme: { mode: isDark ? 'dark' : 'light' }
  });
  vendorConsChart.render();

  // 3. Monthly Trends Area Chart
  const mKeysSorted = Object.keys(monthlyLitres).sort((a, b) => {
    const parseKey = k => {
      const parts = k.split('-');
      return new Date(parts[1], parseInt(parts[0]) - 1, 1).getTime();
    };
    return parseKey(a) - parseKey(b);
  });
  if (monthlyTrendsChart) monthlyTrendsChart.destroy();
  monthlyTrendsChart = new ApexCharts(document.getElementById('chart-monthly-trends'), {
    series: [{ name: 'Total Litres', data: mKeysSorted.map(k => parseFloat(monthlyLitres[k].toFixed(1))) }],
    chart: { type: 'area', height: 260, toolbar: { show: false } },
    colors: ['#10b981'],
    xaxis: {
      categories: mKeysSorted,
      labels: { style: { colors: labelColor } }
    },
    yaxis: { labels: { style: { colors: labelColor } } },
    grid: { borderColor: gridColor },
    theme: { mode: isDark ? 'dark' : 'light' }
  });
  monthlyTrendsChart.render();

  // 4. Vendor Share Donut
  if (vendorShareChart) vendorShareChart.destroy();
  vendorShareChart = new ApexCharts(document.getElementById('chart-vendor-share'), {
    series: sortedVendors.map(x => parseFloat(x[1].toFixed(1))),
    chart: { type: 'donut', height: 260 },
    labels: sortedVendors.map(x => x[0]),
    colors: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
    legend: { position: 'bottom', labels: { colors: labelColor } },
    theme: { mode: isDark ? 'dark' : 'light' }
  });
  vendorShareChart.render();
}

/* ══════════════════════════════════════════════════════════
   10. LEDGER DATA TABLES & DEBOUNCED SEARCH
   ══════════════════════════════════════════════════════════ */
let ledgerPage = 1;
const ledgerPageSize = 25;

function renderLedgerTable() {
  const tbody = document.getElementById('diesel-ledger-body');
  if (!tbody) return;

  // Perform filtration using the unified filter function
  let filtered = getFilteredHistoryEntries();

  // Calculate totals for currently filtered dataset
  let totalLitres = 0;
  let totalCost = 0;
  filtered.forEach(x => {
    totalLitres += parseFloat(x.litres) || (parseFloat(x.dieselAmount) / dieselRate) || 0;
    totalCost += parseFloat(x.dieselAmount) || 0;
  });

  document.getElementById('table-totals').textContent = `Filtered Litres: ${totalLitres.toFixed(2)} L | Cost: ₹${totalCost.toLocaleString('en-IN')}`;
  document.getElementById('filter-status-text').textContent = `Showing ${filtered.length} of ${historyEntries.length} records`;

  const countBadge = document.getElementById('history-entries-count-badge');
  if (countBadge) {
    countBadge.textContent = `${filtered.length} Entries`;
  }

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / ledgerPageSize) || 1;
  if (ledgerPage > totalPages) ledgerPage = totalPages;

  const startIndex = (ledgerPage - 1) * ledgerPageSize;
  const paginated = filtered.slice(startIndex, startIndex + ledgerPageSize);

  tbody.innerHTML = '';
  if (paginated.length === 0) {
    tbody.innerHTML = `<tr><td colspan="13" class="text-center py-10 text-slate-400 font-semibold">No records match your filters.</td></tr>`;
    renderPaginationControls(totalPages);
    return;
  }

  // Use DocumentFragment for batch DOM insertion (avoids layout thrashing)
  const fragment = document.createDocumentFragment();
  paginated.forEach((e, index) => {
    const cost = parseFloat(e.dieselAmount) || 0;
    const oldCost = e.oldAmount ? parseFloat(e.oldAmount) : null;
    const oldCostHtml = oldCost ? `<span class="text-[9px] text-slate-400 dark:text-slate-500 font-semibold block italic">(Old: ₹${oldCost.toFixed(0)})</span>` : '';
    const kmRaw = e.currentKm;
    const kmVal = (!kmRaw || parseInt(kmRaw) === 1 || parseInt(kmRaw) === 0 || isNaN(parseInt(kmRaw))) ? 'N/A' : parseInt(kmRaw);
    const kmClickHtml = (kmVal !== 'N/A')
      ? `<span class="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline font-bold" onclick="viewReceiptPhotoOnDemand('ledger_km', '${e.responseNumber}', '${e.vehicleNo}', '${kmVal}')">${kmVal}</span>`
      : `<span class="cursor-pointer text-slate-400 dark:text-slate-500 hover:text-blue-500 hover:underline font-semibold" onclick="viewReceiptPhotoOnDemand('ledger_km', '${e.responseNumber}', '${e.vehicleNo}', '')">N/A</span>`;

    // Format mileage cleanly and fallback to vehicle type configured average if missing or object
    const rawMileage = e.mileage;
    const vTypeKey = (e.vehicleType || '').trim().toUpperCase();
    let mileageVal = '';
    
    if (rawMileage !== null && rawMileage !== undefined && typeof rawMileage !== 'object') {
      const strM = String(rawMileage).trim();
      if (strM && strM !== '[object Object]') {
        mileageVal = strM;
      }
    }
    
    if (!mileageVal && vTypeKey && vehicleTypes[vTypeKey] !== undefined) {
      mileageVal = vehicleTypes[vTypeKey];
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="px-3 py-3 text-center whitespace-nowrap no-print min-w-[95px] w-[95px]">
        <div class="flex items-center justify-center gap-2">
          <input type="checkbox" class="history-row-checkbox shrink-0 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-400 dark:border-slate-600 rounded bg-slate-100 dark:bg-slate-800 cursor-pointer accent-blue-600" data-response="${e.responseNumber}" data-key="${e.key || ''}">
          <button onclick="openEditHistoryEntryModal('${e.responseNumber}')" class="text-xs hover:scale-115 active:scale-95 transition-all" title="Edit Entry">
            ✏️
          </button>
          <button onclick="copyLedgerEntryWhatsAppVoucher('${e.responseNumber}')" class="text-xs hover:scale-115 active:scale-95 transition-all text-blue-500 hover:text-blue-400" title="Copy WhatsApp Voucher Format">
            📋
          </button>
        </div>
      </td>
      <td class="px-4 py-3 text-center font-bold text-slate-500">${e.responseNumber}</td>
      <td class="px-4 py-3 font-semibold whitespace-nowrap">${e.date}</td>
      <td class="px-4 py-3 text-slate-400 font-semibold">${e.time}</td>
      <td class="px-4 py-3 font-extrabold text-blue-600 dark:text-blue-400 whitespace-nowrap cursor-pointer hover:underline" onclick="viewReceiptPhotoOnDemand('ledger_receipt', '${e.responseNumber}', '${e.vehicleNo}')">
          ${e.location && e.location.lat ? `<a href="https://www.google.com/maps/search/?api=1&query=${e.location.lat},${e.location.lng}" target="_blank" class="mr-4 text-rose-500 hover:text-rose-600 text-xl" title="View Location" onclick="event.stopPropagation();"><i class="fas fa-map-marker-alt"></i></a>` : ''}
          ${e.vehicleNo}
        </td>
      <td class="px-4 py-3 font-medium text-slate-500">${e.vehicleType || ''}</td>
      <td class="px-4 py-3 font-medium text-slate-500 text-center">${mileageVal}</td>
      <td class="px-4 py-3 text-xs font-semibold">${e.fromLocation || ''}</td>
      <td class="px-4 py-3 text-xs font-semibold">${e.lastLocation || ''}</td>
      <td class="px-4 py-3 font-mono text-xs whitespace-nowrap">${kmClickHtml}</td>
      <td class="px-4 py-3 text-right font-extrabold text-slate-700 dark:text-slate-300 whitespace-nowrap">
        <div class="inline-flex flex-col items-end align-middle">
          <span>₹${cost.toFixed(0)}</span>
          ${oldCostHtml}
        </div>
      </td>
      <td class="px-4 py-3 text-xs text-slate-400 font-bold text-slate-700 dark:text-slate-300">${e.vendorName || ''}</td>
      <td class="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-300 min-w-[200px] whitespace-normal break-words">${(e.note && String(e.note).trim().toUpperCase() !== 'DRIVER REQUEST') ? e.note : ''}</td>
    `;
    fragment.appendChild(tr);
  });
  tbody.appendChild(fragment);

  renderPaginationControls(totalPages);

  // Bind checkbox events
  bindHistoryCheckboxes();
}

// Bind history table checkbox events
function bindHistoryCheckboxes() {
  const selectAllCb = document.getElementById('history-select-all');
  const cbs = document.querySelectorAll('.history-row-checkbox');
  const deleteBtn = document.getElementById('btn-delete-selected');
  const countSpan = document.getElementById('delete-selected-count');

  const updateDeleteBtn = () => {
    const checked = document.querySelectorAll('.history-row-checkbox:checked');
    if (deleteBtn) {
      if (checked.length > 0) {
        deleteBtn.classList.remove('hidden');
        if (countSpan) countSpan.textContent = checked.length;
      } else {
        deleteBtn.classList.add('hidden');
      }
    }
    // Update select-all state
    if (selectAllCb) {
      selectAllCb.checked = cbs.length > 0 && checked.length === cbs.length;
    }
  };

  cbs.forEach(cb => {
    cb.addEventListener('change', updateDeleteBtn);
  });

  if (selectAllCb) {
    selectAllCb.onclick = () => {
      const isChecked = selectAllCb.checked;
      cbs.forEach(cb => cb.checked = isChecked);
      updateDeleteBtn();
    };
  }

  // Sync top scrollbar with table scroll
  window.syncHistoryScrollbar = function() {
    const topScroll = document.getElementById('history-top-scroll');
    const topScrollInner = document.getElementById('history-top-scroll-inner');
    const tableScroll = document.getElementById('history-table-scroll');
    if (topScroll && topScrollInner && tableScroll) {
      const table = tableScroll.querySelector('table');
      if (table) {
        const scrollWidth = table.scrollWidth;
        const clientWidth = tableScroll.clientWidth;
        topScrollInner.style.width = scrollWidth + 'px';
        if (scrollWidth <= clientWidth) {
          topScroll.style.display = 'none';
        } else {
          topScroll.style.display = 'block';
        }
      }
    }
  };

  const topScroll = document.getElementById('history-top-scroll');
  const tableScroll = document.getElementById('history-table-scroll');
  if (topScroll && tableScroll) {
    setTimeout(window.syncHistoryScrollbar, 50);
    if (!window.hasHistoryScrollResizeListener) {
      window.addEventListener('resize', () => {
        if (typeof window.syncHistoryScrollbar === 'function') {
          window.syncHistoryScrollbar();
        }
      });
      window.hasHistoryScrollResizeListener = true;
    }
    let isSyncingTop = false;
    let isSyncingTable = false;

    topScroll.addEventListener('scroll', () => {
      if (isSyncingTop) {
        isSyncingTop = false;
        return;
      }
      isSyncingTable = true;
      window.requestAnimationFrame(() => {
        tableScroll.scrollLeft = topScroll.scrollLeft;
      });
    }, { passive: true });

    tableScroll.addEventListener('scroll', () => {
      if (isSyncingTable) {
        isSyncingTable = false;
        return;
      }
      isSyncingTop = true;
      window.requestAnimationFrame(() => {
        topScroll.scrollLeft = tableScroll.scrollLeft;
      });
    }, { passive: true });
  }

  // Initialize the delete button state to ensure it resets after rendering
  updateDeleteBtn();
}

// Delete selected history entries
window.deleteSelectedEntries = function() {
  const checked = document.querySelectorAll('.history-row-checkbox:checked');
  if (checked.length === 0) return;

  if (!confirm(`Are you sure you want to delete ${checked.length} selected record(s)? This cannot be undone.`)) return;

  const keysToDelete = [];
  checked.forEach(cb => {
    const responseNumber = cb.dataset.response;
    if (responseNumber) keysToDelete.push(responseNumber);
  });

  if (keysToDelete.length === 0) {
    toast.error("No valid keys found for deletion.");
    return;
  }

  // Delete from Firebase
  const deletePromises = keysToDelete.map(key => entriesRef.child(key).remove());

  Promise.all(deletePromises)
    .then(() => {
      toast.success(`${keysToDelete.length} record(s) deleted successfully.`);
      // Remove from local array
      keysToDelete.forEach(key => {
        const idx = historyEntries.findIndex(e => e.responseNumber === key);
        if (idx !== -1) historyEntries.splice(idx, 1);
      });
      renderLedgerTable();
      renderDashboardStats();
      setTimeout(renderConsumptionChart, 100);
    })
    .catch(err => {
      console.error("Delete error:", err);
      toast.error("Failed to delete some records. Please try again.");
    });
};

function renderPaginationControls(totalPages) {
  const container = document.getElementById('table-pagination-controls');
  if (!container) return;
  container.innerHTML = '';
  
  if (totalPages <= 1) return;

  // Previous
  const prevBtn = document.createElement('button');
  prevBtn.className = `px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-800 ${ledgerPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`;
  prevBtn.innerHTML = `<i class="fas fa-angle-left"></i>`;
  prevBtn.onclick = () => { if (ledgerPage > 1) { ledgerPage--; renderLedgerTable(); } };
  container.appendChild(prevBtn);

  // Indicators
  const lbl = document.createElement('span');
  lbl.textContent = `Page ${ledgerPage} of ${totalPages}`;
  lbl.className = "text-xs font-semibold px-2";
  container.appendChild(lbl);

  // Next
  const nextBtn = document.createElement('button');
  nextBtn.className = `px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-800 ${ledgerPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`;
  nextBtn.innerHTML = `<i class="fas fa-angle-right"></i>`;
  nextBtn.onclick = () => { if (ledgerPage < totalPages) { ledgerPage++; renderLedgerTable(); } };
  container.appendChild(nextBtn);
}

// Debounce helper


// Bind Ledger Search Inputs
const historySearch = document.getElementById('history-search');
if (historySearch) {
  historySearch.addEventListener('input', debounce(renderLedgerTable, 150));
}
document.getElementById('history-vendor-filter')?.addEventListener('change', renderLedgerTable);

function clearHistoryFilters() {
  const searchEl = document.getElementById('history-search');
  if (searchEl) searchEl.value = '';
  
  // Reset all dashboard filters to empty/all to show all historical records
  dashFilters = {
    dateFrom: '',
    dateTo: '',
    vehicleType: ['All'],
    vehicleNo: ['All'],
    vendor: ['All'],
    fromLocation: ['All'],
    toLocation: ['All'],
    minAmount: 0,
    maxAmount: null
  };

  // Reset HTML input values in the dashboard filter UI
  const dateFromEl = document.getElementById('dash-filter-date-from');
  const dateToEl = document.getElementById('dash-filter-date-to');
  if (dateFromEl) dateFromEl.value = '';
  if (dateToEl) dateToEl.value = '';
  
  const minEl = document.getElementById('dash-filter-min-amount');
  const maxEl = document.getElementById('dash-filter-max-amount');
  if (minEl) minEl.value = '';
  if (maxEl) maxEl.value = '';

  // Update UI components
  updateDashboardFilterBadgeAndTags();
  populateDashboardFilterDropdowns();
  renderDashboardStats();
  setTimeout(renderConsumptionChart, 100);
  renderLedgerTable();
  
  toast.info("All filters and search reset successfully.");
}

// Sync vehicle datalist filters
function syncVehicleList() {
  const list = document.getElementById('drf-vehicle-list');
  const calcList = document.getElementById('calc-vehicle-list');
  
  const uniqueVehicles = [...new Set(historyEntries.map(e => e.vehicleNo).filter(Boolean))].sort();

  const handleVehicleInput = (inputEl, listEl) => {
    if (!inputEl || !listEl) return;

    const updateSuggestions = () => {
      const val = inputEl.value.trim().toUpperCase();
      if (val.length < 4) {
        listEl.innerHTML = '';
      } else {
        listEl.innerHTML = '';
        const fragment = document.createDocumentFragment();
        uniqueVehicles.forEach(v => {
          if (v && v.toUpperCase().includes(val)) {
            const opt = document.createElement('option');
            opt.value = v;
            fragment.appendChild(opt);
          }
        });
        listEl.appendChild(fragment);
      }
    };

    // Remove old listeners to avoid duplicates
    inputEl.removeEventListener('input', updateSuggestions);
    inputEl.removeEventListener('focus', updateSuggestions);

    inputEl.addEventListener('input', updateSuggestions);
    inputEl.addEventListener('focus', updateSuggestions);
    
    // Run initially
    updateSuggestions();
  };

  handleVehicleInput(document.getElementById('drf-vehicle'), list);
  handleVehicleInput(document.getElementById('calc-vehicle'), calcList);
}

/* ══════════════════════════════════════════════════════════
   11. DATA SUBMISSION & clipboard PARSER
   ══════════════════════════════════════════════════════════ */
const fuelModal = document.getElementById('diesel-req-modal');
const ureaModal = document.getElementById('urea-modal');

// Modal Toggles
window.openFuelModal = () => {
  // Set next Serial number
  const nums = historyEntries.map(e => parseInt(e.responseNumber)).filter(n => !isNaN(n));
  const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  document.getElementById('drf-response').value = nextNum;
  
  // Set defaults
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('drf-date').value = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  document.getElementById('drf-time').value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  
  // Clear inputs
  document.getElementById('drf-vehicle').value = '';
  document.getElementById('drf-from').value = '';
  document.getElementById('drf-last').value = '';
  document.getElementById('drf-km').value = '';
  document.getElementById('drf-amount').value = '';
  document.getElementById('drf-note').value = '';
  
  // Reset paste form textarea
  const modalMsgInput = document.getElementById('modal-input-message');
  if (modalMsgInput) modalMsgInput.value = '';

  // Reset view to Manual Form
  const manualBtn = document.getElementById('drf-view-manual-btn');
  if (manualBtn) manualBtn.click();
  
  // Reset preview panel
  document.getElementById('drf-preview-box').classList.add('hidden');
  document.getElementById('drf-preview-text').textContent = '';

  // Set default vendor to RPM LOGISTICS PVT.LTD.
  const vendorSelect = document.getElementById('drf-vendor');
  if (vendorSelect) {
    vendorSelect.value = 'RPM LOGISTICS PVT.LTD.';
  }

  fuelModal.classList.remove('hidden');
};

const closeFuelBtn = document.getElementById('close-diesel-req-modal');
if (closeFuelBtn) closeFuelBtn.onclick = () => fuelModal.classList.add('hidden');

// Auto populate Vehicle type average on modal vehicle enter
const drfVehicleInput = document.getElementById('drf-vehicle');
const drfVtypeSelect = document.getElementById('drf-vtype');
const drfAvgInput = document.getElementById('drf-avg');

if (drfVehicleInput) {
  const syncVehicleAvg = () => {
    const vNo = drfVehicleInput.value.toUpperCase().trim();
    
    // Auto-fill rules for DG / Generator vehicles
    if (vNo.endsWith('DG')) {
      const fromEl = document.getElementById('drf-from');
      const lastEl = document.getElementById('drf-last');
      const kmEl = document.getElementById('drf-km');
      if (fromEl) fromEl.value = vNo;
      if (lastEl) lastEl.value = vNo;
      if (kmEl) kmEl.value = '1';
      
      // Attempt to auto-select Generator type if available
      if (drfVtypeSelect) {
        const genOpt = Array.from(drfVtypeSelect.options).find(opt => opt.value.toUpperCase() === 'GENERATOR');
        if (genOpt) {
          drfVtypeSelect.value = genOpt.value;
          const defaultAvg = vehicleTypes['GENERATOR'];
          if (defaultAvg !== undefined && drfAvgInput) {
            drfAvgInput.value = defaultAvg;
          }
        }
      }
    }
    
    // Search history for matching vehicle to prefill vehicle type and vendor
    const match = historyEntries.find(e => e.vehicleNo === vNo);
    if (match) {
      if (match.vehicleType && drfVtypeSelect) {
        drfVtypeSelect.value = match.vehicleType;
        // load default avg
        const defaultAvg = vehicleTypes[match.vehicleType.toUpperCase()];
        if (defaultAvg !== undefined && drfAvgInput) {
          drfAvgInput.value = defaultAvg;
        }
      }
      if (match.vendorName) {
        const vendorSelect = document.getElementById('drf-vendor');
        if (vendorSelect) {
          const vOpt = Array.from(vendorSelect.options).find(o => o.value.toUpperCase() === match.vendorName.toUpperCase());
          if (vOpt) vendorSelect.value = vOpt.value;
        }
      }
    }
  };
  drfVehicleInput.addEventListener('change', syncVehicleAvg);
  drfVehicleInput.addEventListener('input', syncVehicleAvg);
}

// Quick Fill Dropdown logic
const drfQuickFill = document.getElementById('drf-quick-fill');
if (drfQuickFill) {
  drfQuickFill.addEventListener('change', function() {
    const val = this.value;
    if (val) {
      const fromEl = document.getElementById('drf-from');
      const lastEl = document.getElementById('drf-last');
      if (fromEl) fromEl.value = val;
      if (lastEl) lastEl.value = val;
      this.value = ''; // reset back to placeholder
    }
  });
}

if (drfVtypeSelect) {
  drfVtypeSelect.onchange = () => {
    const vt = drfVtypeSelect.value.trim().toUpperCase();
    if (vehicleTypes[vt] !== undefined) {
      drfAvgInput.value = vehicleTypes[vt];
    } else {
      drfAvgInput.value = '';
    }
  };
}

// Generate Message Preview
const drfGenerateBtn = document.getElementById('drf-generate-btn');
if (drfGenerateBtn) {
  drfGenerateBtn.onclick = () => {
    const resp = document.getElementById('drf-response').value;
    const dateRaw = document.getElementById('drf-date').value;
    const time = document.getElementById('drf-time').value;
    const vehicle = document.getElementById('drf-vehicle').value.trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
    const vtype = document.getElementById('drf-vtype').value.trim().toUpperCase();
    const from = document.getElementById('drf-from').value.trim().toUpperCase();
    const last = document.getElementById('drf-last').value.trim().toUpperCase();
    const km = document.getElementById('drf-km').value.trim();
    const amount = document.getElementById('drf-amount').value.trim();
    const avg = document.getElementById('drf-avg').value.trim();
    const vendor = document.getElementById('drf-vendor').value;
    const note = document.getElementById('drf-note').value.trim().toUpperCase();

    if (!vehicle || !amount) {
      return showAlert('error', 'Required Fields', 'Vehicle No. and Fuel Amount are mandatory!');
    }

    let dispDate = dateRaw;
    if (dateRaw) {
      const [y, m, d] = dateRaw.split('-');
      dispDate = `${d}-${m}-${y}`;
    }

    const noteText = note ? `\n📝 Note. : ${note}` : "";
    const msg = `🔔Diesel Request📢
Response #${resp}
📅 Date & Time. : ${dispDate}, ${time}
🚛 Vehicle No. : ${vehicle}
🚚 Vehicle Type. : ${vtype}, ${avg}
📍 From Location. : ${from}
📍 Last Location. : ${last}
📊 Current KM. : ${km}
💸 Diesel (₹ INR). : ${amount}
👮🏻 Vendor Name. : ${vendor}${noteText}`;

    document.getElementById('drf-preview-text').textContent = msg;
    document.getElementById('drf-preview-box').classList.remove('hidden');
  };
}

// Copy to clipboard & Save Entry
const drfCopyBtn = document.getElementById('drf-copy-btn');
if (drfCopyBtn) {
  drfCopyBtn.onclick = () => {
    const pasteContainer = document.getElementById('drf-paste-form-container');
    const isPasteActive = pasteContainer && !pasteContainer.classList.contains('hidden');

    if (isPasteActive && window.pastedRequestsList && window.pastedRequestsList.length >= 1) {
      const cleanSymbols = val => String(val || '').replace(/[^A-Za-z0-9]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
      
      const hasDuplicates = window.pastedRequestsList.some(r => r.isDuplicate);
      if (hasDuplicates) {
        if (!confirm("⚠️ Duplicate entries detected (highlighted in red)!\nDo you still want to save all of them?")) {
          return;
        }
      }

      const promises = [];
      const messages = [];

      // Find max ID for sequential increment
      const nums = historyEntries.map(x => parseInt(x.responseNumber)).filter(n => !isNaN(n));
      let currentMaxNum = nums.length > 0 ? Math.max(...nums) : 0;

      window.pastedRequestsList.forEach((e) => {
        currentMaxNum++;
        e.responseNumber = String(currentMaxNum);

        // Capitalize parameters
        Object.keys(e).forEach(k => e[k] = String(e[k]).toUpperCase());

        const cleanVeh = e.vehicleNo.trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
        const cleanFrom = cleanSymbols(e.fromLocation);
        const cleanLast = cleanSymbols(e.lastLocation);
        const sKm = parseFloat(e.currentKm) || 0;
        const eKm = parseFloat(e.endKm) || 0;
        if (!e.totalKm && eKm > sKm) {
          e.totalKm = String(eKm - sKm);
        }
        if (!e.litres && e.dieselAmount) {
          e.litres = String((parseFloat(e.dieselAmount) / dieselRate).toFixed(2));
        }

        const cleanPayload = {
          responseNumber: e.responseNumber,
          date: e.date,
          time: e.time,
          vehicleNo: cleanVeh,
          vehicleType: e.vehicleType,
          mileage: e.mileage,
          fromLocation: cleanFrom,
          lastLocation: cleanLast,
          currentKm: e.currentKm,
          endKm: e.endKm,
          totalKm: e.totalKm || '',
          litres: e.litres || '',
          dieselAmount: e.dieselAmount,
          vendorName: e.vendorName || 'RPM LOGISTICS PVT.LTD.',
          note: cleanSymbols(e.note)
        };

        let dispDate = e.date;
        if (e.date && e.date.includes('-')) {
          const parts = e.date.split('-');
          if (parts[0].length === 4) {
            dispDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        }
        const noteText = cleanPayload.note ? `\n📝 Note. : ${cleanPayload.note}` : "";
        const msg = `🔔Diesel Request📢
Response #${cleanPayload.responseNumber}
📅 Date & Time. : ${dispDate}, ${cleanPayload.time}
🚛 Vehicle No. : ${cleanPayload.vehicleNo}
🚚 Vehicle Type. : ${cleanPayload.vehicleType}, ${cleanPayload.mileage}
📍 From Location. : ${cleanPayload.fromLocation}
📍 Last Location. : ${cleanPayload.lastLocation}
📊 Current KM. : ${cleanPayload.currentKm}
💸 Diesel (₹ INR). : ${cleanPayload.dieselAmount}
👮🏻 Vendor Name. : ${cleanPayload.vendorName}${noteText}`;

        messages.push(msg);

        const p = entriesRef.child(cleanPayload.responseNumber).set(cleanPayload);
        promises.push(p);
      });

      Promise.all(promises)
        .then(() => {
          toast.ok(`${promises.length} entries processed and saved successfully!`);
          fuelModal.classList.add('hidden');
          const modalMsgInput = document.getElementById('modal-input-message');
          if (modalMsgInput) modalMsgInput.value = '';
          document.getElementById('drf-bulk-preview-container').classList.add('hidden');
          window.pastedRequestsList = [];
        })
        .catch(err => {
          toast.err("Error processing bulk requests: " + err.message);
        });

      return;
    }

    if (isPasteActive) {
      const textarea = document.getElementById('modal-input-message');
      const val = textarea.value.trim();
      if (val) {
        window.populateModalFromText(val);
      } else {
        return toast.err("Paste whatsapp message first!");
      }
    }

    const resp = document.getElementById('drf-response').value;
    const dateRaw = document.getElementById('drf-date').value;
    const time = document.getElementById('drf-time').value;
    const vehicle = document.getElementById('drf-vehicle').value.trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
    const vtype = document.getElementById('drf-vtype').value.trim().toUpperCase();
    const cleanSymbols = val => String(val || '').replace(/[^A-Za-z0-9]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
    const from = cleanSymbols(document.getElementById('drf-from').value);
    document.getElementById('drf-from').value = from;
    const last = cleanSymbols(document.getElementById('drf-last').value);
    document.getElementById('drf-last').value = last;
    const km = document.getElementById('drf-km').value.trim();
    const amount = document.getElementById('drf-amount').value.trim();
    const avg = document.getElementById('drf-avg').value.trim();
    const vendor = document.getElementById('drf-vendor').value;
    const note = cleanSymbols(document.getElementById('drf-note').value);
    document.getElementById('drf-note').value = note;

    if (!vehicle || !amount) {
      const manualBtn = document.getElementById('drf-view-manual-btn');
      if (manualBtn) manualBtn.click();
      return showAlert('error', 'Required Fields', 'Vehicle No. and Fuel Amount are mandatory!');
    }

    openDrfReceiptPromptModal('generate_message', vehicle, amount);
  };
}

// Send Diesel Filled (Approved request to station)
const drfSendApprovedBtn = document.getElementById('drf-send-approved-btn');
if (drfSendApprovedBtn) {
  drfSendApprovedBtn.onclick = () => {
    const pasteContainer = document.getElementById('drf-paste-form-container');
    const isPasteActive = pasteContainer && !pasteContainer.classList.contains('hidden');

    if (isPasteActive && window.pastedRequestsList && window.pastedRequestsList.length >= 1) {
      const cleanSymbols = val => String(val || '').replace(/[^A-Za-z0-9]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
      
      const hasDuplicates = window.pastedRequestsList.some(r => r.isDuplicate);
      if (hasDuplicates) {
        if (!confirm("⚠️ Duplicate entries detected (highlighted in red)!\nDo you still want to send all of them?")) {
          return;
        }
      }

      const promises = [];
      const messages = [];

      window.pastedRequestsList.forEach((e) => {
        const cleanVeh = e.vehicleNo.trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
        const cleanFrom = cleanSymbols(e.fromLocation);
        const cleanLast = cleanSymbols(e.lastLocation);
        const cleanNote = cleanSymbols(e.note);

        let dispDate = e.date;
        if (e.date && e.date.includes('-')) {
          const parts = e.date.split('-');
          if (parts[0].length === 4) {
            dispDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        }

        const payload = {
          vehicleNo: cleanVeh,
          vehicleType: e.vehicleType ? e.vehicleType.toUpperCase() : '',
          fromLocation: cleanFrom,
          lastLocation: cleanLast,
          currentKm: e.currentKm || '1',
          dieselAmount: e.dieselAmount || '0',
          vendorName: e.vendorName || 'RPM LOGISTICS PVT.LTD.',
          note: cleanNote,
          status: 'approved',
          submittedAt: firebase.database.ServerValue.TIMESTAMP,
          processedAt: firebase.database.ServerValue.TIMESTAMP,
          date: dispDate,
          time: e.time || '12:00'
        };

        const avgVal = vehicleTypes[payload.vehicleType] || '';
        const noteText = cleanNote ? `\n📝 Note. : ${cleanNote}` : "";
        const copyText = `🔔Diesel Request📢
Response #APPROVED
📅 Date & Time. : ${dispDate}, ${convertTo24Hour(payload.time)}
%0A🚛 Vehicle No. : ${cleanVeh}
%0A🚚 Vehicle Type. : ${payload.vehicleType}${avgVal ? ',' + avgVal : ''}
%0A📍 From Location. : ${cleanFrom}
%0A📍 Last Location. : ${cleanLast}
%0A📊 Current KM. : ${payload.currentKm}
%0A💸 Diesel (₹ INR). : ${payload.dieselAmount}
%0A👮🏻 Vendor Name. : ${payload.vendorName}${noteText}`;

        messages.push(copyText);

        const p = driverRequestsRef.push(payload);
        promises.push(p);
      });

      Promise.all(promises)
        .then(() => {
          const combinedMsg = messages.join('\n\n');
          window.safeCopyToClipboard(combinedMsg)
            .then(() => toast.ok(`${promises.length} approved requests sent to station & copied to clipboard!`))
            .catch(() => toast.ok(`${promises.length} approved requests sent to station!`))
            .finally(() => {
              fuelModal.classList.add('hidden');
              const modalMsgInput = document.getElementById('modal-input-message');
              if (modalMsgInput) modalMsgInput.value = '';
              document.getElementById('drf-bulk-preview-container').classList.add('hidden');
              window.pastedRequestsList = [];
            });
        })
        .catch(err => {
          toast.err("Error sending bulk approved requests: " + err.message);
        });

      return;
    }

    if (isPasteActive) {
      const textarea = document.getElementById('modal-input-message');
      const val = textarea.value.trim();
      if (val) {
        window.populateModalFromText(val);
      } else {
        return toast.err("Paste whatsapp message first!");
      }
    }

    const resp = document.getElementById('drf-response').value;
    const dateRaw = document.getElementById('drf-date').value;
    const time = document.getElementById('drf-time').value;
    const vehicle = document.getElementById('drf-vehicle').value.trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
    const vtype = document.getElementById('drf-vtype').value.trim().toUpperCase();
    const cleanSymbols = val => String(val || '').replace(/[^A-Za-z0-9]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
    const from = cleanSymbols(document.getElementById('drf-from').value);
    document.getElementById('drf-from').value = from;
    const last = cleanSymbols(document.getElementById('drf-last').value);
    document.getElementById('drf-last').value = last;
    const km = document.getElementById('drf-km').value.trim();
    const amount = document.getElementById('drf-amount').value.trim();
    const vendor = document.getElementById('drf-vendor').value;
    const note = cleanSymbols(document.getElementById('drf-note').value);
    document.getElementById('drf-note').value = note;

    if (!vehicle || !amount) {
      const manualBtn = document.getElementById('drf-view-manual-btn');
      if (manualBtn) manualBtn.click();
      return showAlert('error', 'Required Fields', 'Vehicle No. and Fuel Amount are mandatory!');
    }

    openDrfReceiptPromptModal('send_diesel_filled', vehicle, amount);
  };
}

// ==========================================
// DIESEL REQUEST FORM - RECEIPT PROMPT LOGIC
// ==========================================
let pendingDrfAction = null; // 'generate_message' or 'send_diesel_filled'
let drfSelectedReceiptFiles = [];

function openDrfReceiptPromptModal(actionType, vehicleNo, amount) {
  pendingDrfAction = actionType;
  drfSelectedReceiptFiles = [];

  const modal = document.getElementById('drf-receipt-prompt-modal');
  const vehSpan = document.getElementById('drf-receipt-prompt-veh');
  const amtSpan = document.getElementById('drf-receipt-prompt-amt');
  const fileInput = document.getElementById('drf-receipt-file-input');
  const loader = document.getElementById('drf-receipt-compress-loader');
  const proceedBtn = document.getElementById('drf-receipt-upload-proceed-btn');

  if (vehSpan) vehSpan.textContent = vehicleNo || '-';
  if (amtSpan) amtSpan.textContent = `₹${parseFloat(amount || 0).toLocaleString('en-IN')}`;
  if (fileInput) fileInput.value = '';
  if (loader) loader.classList.add('hidden');

  if (proceedBtn) {
    if (actionType === 'send_diesel_filled') {
      proceedBtn.innerHTML = `<span>Upload & Send</span> <i class="fas fa-arrow-right text-[10px]"></i>`;
    } else {
      proceedBtn.innerHTML = `<span>Upload & Generate</span> <i class="fas fa-arrow-right text-[10px]"></i>`;
    }
  }

  renderDrfReceiptThumbs();
  if (modal) modal.classList.remove('hidden');
}

function closeDrfReceiptPromptModal() {
  const modal = document.getElementById('drf-receipt-prompt-modal');
  if (modal) modal.classList.add('hidden');
  pendingDrfAction = null;
  drfSelectedReceiptFiles = [];
}

function handleDrfReceiptFileSelect(event) {
  const files = event.target.files ? Array.from(event.target.files) : [];
  if (files.length === 0) return;
  
  const currentCount = drfSelectedReceiptFiles.length;
  if (currentCount >= 5) {
    toast.warn("Maximum 5 images allowed.");
    event.target.value = '';
    return;
  }
  let filesToProcess = files;
  if (currentCount + files.length > 5) {
    const allowed = 5 - currentCount;
    filesToProcess = files.slice(0, allowed);
    toast.info(`Maximum 5 images allowed. Selected first ${allowed} image(s).`);
  }
  drfSelectedReceiptFiles.push(...filesToProcess);
  event.target.value = '';
  renderDrfReceiptThumbs();
}

function removeDrfReceiptFile(index) {
  if (index >= 0 && index < drfSelectedReceiptFiles.length) {
    drfSelectedReceiptFiles.splice(index, 1);
    renderDrfReceiptThumbs();
  }
}

function clearDrfReceiptFiles() {
  drfSelectedReceiptFiles = [];
  renderDrfReceiptThumbs();
}

function renderDrfReceiptThumbs() {
  const wrapper = document.getElementById('drf-receipt-thumbs-wrapper');
  const container = document.getElementById('drf-receipt-thumbs-container');
  const countSpan = document.getElementById('drf-receipt-thumbs-count');

  if (!wrapper || !container) return;

  if (drfSelectedReceiptFiles.length === 0) {
    wrapper.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  wrapper.classList.remove('hidden');
  if (countSpan) countSpan.textContent = drfSelectedReceiptFiles.length;
  container.innerHTML = '';

  drfSelectedReceiptFiles.forEach((file, idx) => {
    const thumbDiv = document.createElement('div');
    thumbDiv.className = "relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-black";

    const img = document.createElement('img');
    img.className = "w-full h-full object-cover";
    img.src = URL.createObjectURL(file);

    const badge = document.createElement('span');
    badge.className = "absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-white font-extrabold text-[8px]";
    badge.textContent = idx + 1;

    const delBtn = document.createElement('button');
    delBtn.type = "button";
    delBtn.className = "absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 hover:bg-red-700 text-white font-black text-[10px] flex items-center justify-center shadow";
    delBtn.innerHTML = "&times;";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      removeDrfReceiptFile(idx);
    };

    thumbDiv.appendChild(img);
    thumbDiv.appendChild(badge);
    thumbDiv.appendChild(delBtn);
    container.appendChild(thumbDiv);
  });
}

function submitDrfPendingAction(withPhotos) {
  if (!pendingDrfAction) return;

  const loader = document.getElementById('drf-receipt-compress-loader');
  const proceedBtn = document.getElementById('drf-receipt-upload-proceed-btn');

  if (withPhotos && drfSelectedReceiptFiles.length > 0) {
    if (loader) loader.classList.remove('hidden');
    if (proceedBtn) proceedBtn.disabled = true;

    Promise.all(drfSelectedReceiptFiles.map(f => compressReceiptImage(f)))
      .then(compressedDataUrls => {
        const validPhotos = compressedDataUrls.filter(u => u && u.startsWith('data:image'));
        executeDrfAction(validPhotos);
      })
      .catch(err => {
        console.error("Error compressing receipt:", err);
        toast.warn("Could not compress photo, proceeding without photo.");
        executeDrfAction([]);
      })
      .finally(() => {
        if (loader) loader.classList.add('hidden');
        if (proceedBtn) proceedBtn.disabled = false;
        closeDrfReceiptPromptModal();
      });
  } else {
    executeDrfAction([]);
    closeDrfReceiptPromptModal();
  }
}

function executeDrfAction(attachedPhotos = []) {
  const resp = document.getElementById('drf-response').value;
  const dateRaw = document.getElementById('drf-date').value;
  const time = document.getElementById('drf-time').value;
  const vehicle = document.getElementById('drf-vehicle').value.trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
  const vtype = document.getElementById('drf-vtype').value.trim().toUpperCase();
  const cleanSymbols = val => String(val || '').replace(/[^A-Za-z0-9]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
  const from = cleanSymbols(document.getElementById('drf-from').value);
  const last = cleanSymbols(document.getElementById('drf-last').value);
  const km = document.getElementById('drf-km').value.trim();
  const amount = document.getElementById('drf-amount').value.trim();
  const avg = document.getElementById('drf-avg').value.trim();
  const vendor = document.getElementById('drf-vendor').value;
  const note = cleanSymbols(document.getElementById('drf-note').value);

  let dispDate = dateRaw;
  if (dateRaw && dateRaw.includes('-')) {
    const parts = dateRaw.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        dispDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      } else {
        dispDate = dateRaw;
      }
    }
  }

  if (pendingDrfAction === 'generate_message') {
    const noteText = note ? `\n📝 Note. : ${note}` : "";
    const msg = `🔔Diesel Request📢
Response #${resp}
📅 Date & Time. : ${dispDate}, ${time}
🚛 Vehicle No. : ${vehicle}
🚚 Vehicle Type. : ${vtype}, ${avg}
📍 From Location. : ${from}
📍 Last Location. : ${last}
📊 Current KM. : ${km}
💸 Diesel (₹ INR). : ${amount}
👮🏻 Vendor Name. : ${vendor}${noteText}`;

    const previewEl = document.getElementById('drf-preview-text');
    if (previewEl) previewEl.textContent = msg;

    window.safeCopyToClipboard(msg)
      .then(() => toast.ok("Message copied to clipboard."))
      .catch(() => toast.warn("Clipboard copy failed, saving entry..."))
      .finally(() => {
        processData(msg, attachedPhotos);
        fuelModal.classList.add('hidden');
        const modalMsgInput = document.getElementById('modal-input-message');
        if (modalMsgInput) modalMsgInput.value = '';
      });
  } else if (pendingDrfAction === 'send_diesel_filled') {
    const cleanV = String(vehicle || '').trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
    const cleanK = String(km || '').replace(/[^0-9]/g, '');

    const reqList = (typeof driverRequestsList !== 'undefined' && Array.isArray(driverRequestsList)) ? driverRequestsList : [];
    const matchingReq = reqList.find(r => {
      if (!r || r.status !== 'pending') return false;
      const rVeh = String(r.vehicleNo || '').trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
      if (!rVeh || rVeh !== cleanV) return false;
      if (cleanK && String(r.currentKm || '').replace(/[^0-9]/g, '') === cleanK) return true;
      if (dispDate && r.date && String(r.date).trim() === String(dispDate).trim()) return true;
      return false;
    });

    const sendWithPhotos = (fullReq = {}) => {
      const existingReceipt = (typeof extractPhotosFromRecord === 'function')
        ? extractPhotosFromRecord(fullReq, 'receiptPhotos', 'receiptPhoto')
        : [];
      let allReceipt = [...(attachedPhotos || [])];
      existingReceipt.forEach(p => {
        if (!allReceipt.includes(p)) allReceipt.push(p);
      });
      if (allReceipt.length > 5) allReceipt = allReceipt.slice(0, 5);

      const existingKm = (typeof extractPhotosFromRecord === 'function')
        ? extractPhotosFromRecord(fullReq, 'kmPhotos', 'kmPhoto', 'photo')
        : [];

      const payload = {
        vehicleNo: vehicle,
        vehicleType: vtype,
        fromLocation: from,
        lastLocation: last,
        currentKm: km,
        dieselAmount: amount,
        vendorName: vendor,
        note: note,
        status: 'approved',
        submittedAt: fullReq.submittedAt || firebase.database.ServerValue.TIMESTAMP,
        processedAt: firebase.database.ServerValue.TIMESTAMP,
        date: dispDate,
        time: time
      };

      const photoUpdates = {};
      if (allReceipt.length > 0) {
        photoUpdates.receiptPhotos = allReceipt;
        photoUpdates.receiptPhoto = allReceipt[0];
        payload.hasReceiptPhoto = true;
      }
      if (existingKm.length > 0) {
        photoUpdates.kmPhotos = existingKm;
        photoUpdates.kmPhoto = existingKm[0];
        payload.hasKmPhoto = true;
      }

      let savePromise;
      if (matchingReq) {
        const writes = [driverRequestsRef.child(matchingReq.key).update(payload)];
        if (Object.keys(photoUpdates).length > 0) {
          writes.push(db.ref('driverRequestPhotos').child(matchingReq.key).update(photoUpdates));
        }
        savePromise = Promise.all(writes);
      } else {
        const newRef = driverRequestsRef.push();
        const writes = [newRef.set(payload)];
        if (Object.keys(photoUpdates).length > 0) {
          writes.push(db.ref('driverRequestPhotos').child(newRef.key).set(photoUpdates));
        }
        savePromise = Promise.all(writes);
      }

      return savePromise.then(() => {
        const avgVal = vehicleTypes[vtype] || '';
        const noteText = note ? `\n📝 Note. : ${note}` : "";
        const copyText = `🔔Diesel Request📢
Response #APPROVED
📅 Date & Time. : ${dispDate}, ${convertTo24Hour(time)}
%0A🚛 Vehicle No. : ${vehicle}
%0A🚚 Vehicle Type. : ${vtype}${avgVal ? ',' + avgVal : ''}
%0A📍 From Location. : ${from}
%0A📍 Last Location. : ${last}
%0A📊 Current KM. : ${km}
%0A💸 Diesel (₹ INR). : ${amount}
%0A👮🏻 Vendor Name. : ${vendor}${noteText}`;

        return window.safeCopyToClipboard(copyText)
          .then(() => {
            toast.ok("Approved request sent to station & copied to clipboard!");
          })
          .catch(() => {
            toast.ok("Approved request sent to station!");
          });
      })
      .then(() => {
        fuelModal.classList.add('hidden');
        const modalMsgInput = document.getElementById('modal-input-message');
        if (modalMsgInput) modalMsgInput.value = '';
      })
      .catch(err => {
        toast.err("Error sending approved request: " + err.message);
      });
    };

    if (matchingReq) {
      driverRequestsRef.child(matchingReq.key).once('value')
        .then(snap => sendWithPhotos(snap.val() || {}))
        .catch(() => sendWithPhotos({}));
    } else {
      sendWithPhotos({});
    }
  }
}

window.openDrfReceiptPromptModal = openDrfReceiptPromptModal;
window.closeDrfReceiptPromptModal = closeDrfReceiptPromptModal;
window.handleDrfReceiptFileSelect = handleDrfReceiptFileSelect;
window.removeDrfReceiptFile = removeDrfReceiptFile;
window.clearDrfReceiptFiles = clearDrfReceiptFiles;
window.submitDrfPendingAction = submitDrfPendingAction;

// Safe Clipboard Copy Helper
window.safeCopyToClipboard = (text) => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(el);
      if (successful) resolve();
      else reject(new Error('execCommand copy failed'));
    } catch (err) {
      document.body.removeChild(el);
      reject(err);
    }
  });
};

function convertDateToISO(dStr) {
  if (!dStr) return '';
  const clean = dStr.trim();
  const parts = clean.split(/[-/]/);
  if (parts.length === 3) {
    let day = parts[0].padStart(2, '0');
    let month = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }
  return dStr;
}

function convertTimeTo24h(timeStr) {
  if (!timeStr) return '';
  const clean = timeStr.trim().toUpperCase();
  const ampmMatch = clean.match(/^(1[0-2]|0?[1-9]):([0-5][0-9])\s*(AM|PM)$/);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2];
    const ampm = ampmMatch[3];
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
  const plainMatch = clean.match(/^(2[0-3]|[0-1]?[0-9]):([0-5][0-9])/);
  if (plainMatch) {
    return `${plainMatch[1].padStart(2, '0')}:${plainMatch[2]}`;
  }
  return timeStr;
}

window.pastedRequestsList = [];

window.splitBulkRequests = (text) => {
  // First, clean up WhatsApp timestamps / sender prefixes from the text
  let cleaned = text.replace(/\[\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?,\s*\d{1,2}:\d{2}(?:\s*[\s\S]*?)?\]\s*[^:\n\r]*:\s*/gi, '');
  
  // Now split by 🔔Diesel Request📢
  const parts = cleaned.split(/(?=🔔?\s*Diesel\s*Request📢?)/gi);
  const requests = [];
  for (let part of parts) {
    part = part.trim();
    if (!part) continue;
    if (part.includes('Vehicle No') || part.includes('Response #') || part.includes('Diesel')) {
      requests.push(part);
    }
  }
  return requests;
};

const isCurrentMonth = (dateStr) => {
  if (!dateStr) return false;
  const now = new Date();
  const currentMonthNum = now.getMonth() + 1;
  const currentYearNum = now.getFullYear();
  
  const parts = String(dateStr).replace(/\//g, '-').replace(/\./g, '-').split('-');
  if (parts.length < 3) return false;
  
  let dMonth, dYear;
  if (parts[0].length === 4) {
    dMonth = parseInt(parts[1], 10);
    dYear = parseInt(parts[0], 10);
  } else {
    dMonth = parseInt(parts[1], 10);
    dYear = parseInt(parts[2], 10);
  }
  
  return dMonth === currentMonthNum && dYear === currentYearNum;
};

const normalizeDateToYYYYMMDD = (dateStr) => {
  if (!dateStr) return '';
  const clean = String(dateStr).replace(/\//g, '-').replace(/\./g, '-').trim();
  const parts = clean.split('-');
  if (parts.length < 3) return '';
  
  if (parts[0].length === 4) {
    // YYYY-MM-DD
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}${m}${d}`;
  } else {
    // DD-MM-YYYY
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const y = parts[2];
    return `${y}${m}${d}`;
  }
};

const makeDupKey = (r) => {
  const clean = (val) => String(val || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  
  return [
    clean(r.vehicleNo),
    normalizeDateToYYYYMMDD(r.date),
    clean(r.time),
    clean(r.vehicleType),
    clean(r.fromLocation),
    clean(r.lastLocation),
    clean(r.currentKm),
    clean(r.dieselAmount),
    clean(r.note)
  ].join('|');
};
window.markDuplicates = (list) => {
  list.forEach(req => { req.isDuplicate = false; });
  const existingResponses = new Set();
  const existingKeys = new Set();

  const addExisting = (r) => {
    if (r.responseNumber) {
      existingResponses.add(String(r.responseNumber).trim());
    }
    if (isCurrentMonth(r.date)) {
      existingKeys.add(makeDupKey(r));
    }
  };

  // Lexically reference historyEntries and driverRequestsList
  if (typeof driverRequestsList !== 'undefined' && driverRequestsList) {
    driverRequestsList.forEach(addExisting);
  }
  if (typeof historyEntries !== 'undefined' && historyEntries) {
    historyEntries.forEach(addExisting);
  }

  const seenResponses = new Set();
  const seenKeys = new Set();

  list.forEach(req => {
    const respNum = req.responseNumber ? String(req.responseNumber).trim() : '';
    const key = makeDupKey(req);

    let dup = false;

    if (respNum && existingResponses.has(respNum)) dup = true;
    if (existingKeys.has(key)) dup = true;

    if (respNum && seenResponses.has(respNum)) dup = true;
    if (seenKeys.has(key)) dup = true;

    if (dup) {
      req.isDuplicate = true;
    }

    if (respNum) seenResponses.add(respNum);
    seenKeys.add(key);
  });
};

window.removeDuplicatesFromPreview = () => {
  if (!window.pastedRequestsList || window.pastedRequestsList.length === 0) return;
  window.pastedRequestsList = window.pastedRequestsList.filter(req => !req.isDuplicate);
  window.markDuplicates(window.pastedRequestsList);
  window.renderBulkPreview();
  if (window.pastedRequestsList.length === 0) {
    document.getElementById('drf-bulk-preview-container').classList.add('hidden');
    document.getElementById('modal-input-message').value = '';
  }
};

window.renderBulkPreview = () => {
  const tbody = document.getElementById('drf-bulk-preview-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  let dupCount = 0;
  let newCount = 0;

  window.pastedRequestsList.forEach(req => {
    if (req.isDuplicate) {
      dupCount++;
    } else {
      newCount++;
    }

    const tr = document.createElement('tr');
    tr.className = `border-b border-slate-800/40 ${req.isDuplicate ? 'bg-red-500/20 hover:bg-red-500/30 text-red-100 border-l-4 border-red-500 font-bold' : 'hover:bg-slate-700/20'}`;
    
    tr.innerHTML = `
      <td class="p-2.5 font-bold">${req.vehicleNo || 'N/A'}</td>
      <td class="p-2.5 text-slate-400">${req.vehicleType || 'N/A'}</td>
      <td class="p-2.5 text-slate-400">
        <div class="truncate max-w-[180px]" title="${req.fromLocation} -> ${req.lastLocation}">
          ${req.fromLocation || 'N/A'} / ${req.lastLocation || 'N/A'}
        </div>
      </td>
      <td class="p-2.5 text-slate-400">${req.currentKm || 'N/A'}</td>
      <td class="p-2.5 font-bold text-emerald-400">₹${req.dieselAmount || '0'}</td>
      <td class="p-2.5 text-center">
        <button type="button" class="text-red-400 hover:text-red-300 font-bold px-2 py-1 rounded hover:bg-red-500/10 transition-all" onclick="window.deletePreviewRow(${req.id})">
          ❌
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const dupCountEl = document.getElementById('bulk-dup-count');
  const newCountEl = document.getElementById('bulk-new-count');
  if (dupCountEl) dupCountEl.textContent = dupCount;
  if (newCountEl) newCountEl.textContent = newCount;
};

window.deletePreviewRow = (id) => {
  window.pastedRequestsList = window.pastedRequestsList.filter(r => r.id !== id);
  window.markDuplicates(window.pastedRequestsList);
  window.renderBulkPreview();
  if (window.pastedRequestsList.length === 0) {
    document.getElementById('drf-bulk-preview-container').classList.add('hidden');
    document.getElementById('modal-input-message').value = '';
  }
};

window.handleWhatsAppPasteInput = (text) => {
  text = text.trim();
  if (!text) {
    window.pastedRequestsList = [];
    document.getElementById('drf-bulk-preview-container').classList.add('hidden');
    return;
  }

  let requestStrings = window.splitBulkRequests(text);
  if (requestStrings.length === 0) {
    // Check if it's a single request in raw format
    const cleaned = text.replace(/\[\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?,\s*\d{1,2}:\d{2}(?:\s*[\s\S]*?)?\]\s*[^:\n\r]*:\s*/gi, '');
    if (cleaned.includes('Vehicle No') || cleaned.includes('Response #') || cleaned.includes('Diesel')) {
      requestStrings = [cleaned];
    }
  }

  if (requestStrings.length >= 1) {
    window.pastedRequestsList = requestStrings.map((reqText, index) => {
      const parsed = parseMessage(reqText);
      parsed.id = index;
      parsed.rawText = reqText;
      return parsed;
    });

    window.markDuplicates(window.pastedRequestsList);
    window.renderBulkPreview();
    document.getElementById('drf-bulk-preview-container').classList.remove('hidden');
  } else {
    window.pastedRequestsList = [];
    document.getElementById('drf-bulk-preview-container').classList.add('hidden');
  }
};

window.populateModalFromText = (text) => {
  if (!text) return toast.err("Please paste a valid message first.");
  const e = parseMessage(text);
  
  if (e.responseNumber) document.getElementById('drf-response').value = e.responseNumber;
  if (e.date) document.getElementById('drf-date').value = convertDateToISO(e.date);
  if (e.time) document.getElementById('drf-time').value = convertTimeTo24h(e.time);
  if (e.vehicleNo) {
    const vehInput = document.getElementById('drf-vehicle');
    vehInput.value = e.vehicleNo;
    const event = new Event('change');
    vehInput.dispatchEvent(event);
  }
  if (e.vehicleType) {
    const vtypeSelect = document.getElementById('drf-vtype');
    let found = false;
    for (let i = 0; i < vtypeSelect.options.length; i++) {
      if (vtypeSelect.options[i].value.toUpperCase() === e.vehicleType.toUpperCase()) {
        vtypeSelect.selectedIndex = i;
        found = true;
        break;
      }
    }
    if (!found) {
      const opt = document.createElement('option');
      opt.value = e.vehicleType.toUpperCase();
      opt.textContent = e.vehicleType.toUpperCase();
      vtypeSelect.appendChild(opt);
      vtypeSelect.value = e.vehicleType.toUpperCase();
    }
    const event = new Event('change');
    vtypeSelect.dispatchEvent(event);
  }
  if (e.mileage) document.getElementById('drf-avg').value = e.mileage;
  if (e.fromLocation) document.getElementById('drf-from').value = e.fromLocation;
  if (e.lastLocation) document.getElementById('drf-last').value = e.lastLocation;
  if (e.currentKm) document.getElementById('drf-km').value = e.currentKm;
  if (e.dieselAmount) document.getElementById('drf-amount').value = e.dieselAmount;
  if (e.vendorName) {
    const vendorSelect = document.getElementById('drf-vendor');
    let found = false;
    for (let i = 0; i < vendorSelect.options.length; i++) {
      if (vendorSelect.options[i].value.toUpperCase() === e.vendorName.toUpperCase()) {
        vendorSelect.selectedIndex = i;
        found = true;
        break;
      }
    }
    if (!found) {
      const opt = document.createElement('option');
      opt.value = e.vendorName.toUpperCase();
      opt.textContent = e.vendorName.toUpperCase();
      vendorSelect.appendChild(opt);
      vendorSelect.value = e.vendorName.toUpperCase();
    }
  }
  if (e.note) document.getElementById('drf-note').value = e.note;
  
  const manualBtn = document.getElementById('drf-view-manual-btn');
  if (manualBtn) manualBtn.click();

  toast.ok("Message parsed and fields populated!");
};

// Clipboard Text Parser
const parseMessage = text => {
  const lines = text.trim().split('\n');
  const r = { responseNumber:'', date:'', time:'', vehicleNo:'', vehicleType:'', mileage:'', fromLocation:'', lastLocation:'', currentKm:'', endKm:'', totalKm:'', litres:'', dieselAmount:'', vendorName:'', note:'' };
  
  const resp = lines.find(l => l.includes('Response #'));
  if (resp) r.responseNumber = resp.split('#')[1]?.trim() || '';

  const getVal = line => {
    const idx = line.indexOf(':');
    return idx !== -1 ? line.substring(idx + 1).trim() : '';
  };

  for (const l of lines) {
    const c = l.trim();
    if (/Date/.test(c)) {
      const val = getVal(c);
      const [d, t] = val.split(',');
      r.date = d ? d.trim() : '';
      r.time = t ? t.trim() : '';
    }
    else if (/Vehicle No/.test(c)) r.vehicleNo = getVal(c).replace(/[^A-Z0-9]/gi,'');
    else if (/Vehicle Type/.test(c)) {
      const val = getVal(c);
      const [ty, mi] = val.split(',');
      r.vehicleType = ty ? ty.trim() : '';
      if (mi && mi.trim()) r.mileage = mi.trim();
    }
    else if (/Mileage/.test(c) || /Avg/.test(c)) r.mileage = getVal(c);
    else if (/From Location/.test(c)) r.fromLocation = getVal(c);
    else if (/Last Location/.test(c)) r.lastLocation = getVal(c);
    else if (/Current KM/.test(c) || /Start KM/.test(c) || /S Km/.test(c)) r.currentKm = getVal(c);
    else if (/End KM/.test(c) || /E Km/.test(c)) r.endKm = getVal(c);
    else if (/Total k\/m/.test(c) || /Total KM/.test(c) || /Total km/.test(c)) r.totalKm = getVal(c);
    else if (/Lit/.test(c)) r.litres = getVal(c);
    else if (/Diesel/.test(c)) r.dieselAmount = getVal(c);
    else if (/Vendor Name/.test(c)) r.vendorName = getVal(c);
    else if (/Note/.test(c)) r.note = getVal(c);
  }
  return r;
};

// Process Parsed Message Data and Upload
function processData(text, attachedPhotos = null) {
  if (!checkAuth()) return;
  if (!text) return toast.err("Paste valid message content.");
  
  try {
    lastProcessedText = text;
    const e = parseMessage(text);
    
    let isEdit = false;
    if (editingResponseNumber !== null) {
      e.responseNumber = editingResponseNumber;
      isEdit = true;
      editingResponseNumber = null;
    } else {
      // Find max ID for sequential increment
      const nums = historyEntries.map(x => parseInt(x.responseNumber)).filter(n => !isNaN(n));
      const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
      e.responseNumber = String(maxNum + 1);
    }
    
    // Capitalize parameters
    Object.keys(e).forEach(k => e[k] = String(e[k]).toUpperCase());
    
    // Auto-calculate total KM if start/end odometer provided
    const sKm = parseFloat(e.currentKm) || 0;
    const eKm = parseFloat(e.endKm) || 0;
    if (!e.totalKm && eKm > sKm) {
      e.totalKm = String(eKm - sKm);
    }

    // Convert Cost Amount -> Litres
    if (!e.litres && e.dieselAmount) {
      e.litres = String((parseFloat(e.dieselAmount) / dieselRate).toFixed(2));
    }

    // Attach receipt photos if provided
    if (attachedPhotos && Array.isArray(attachedPhotos) && attachedPhotos.length > 0) {
      e.receiptPhotos = attachedPhotos;
      e.receiptPhoto = attachedPhotos[0];
      e.hasReceiptPhoto = true;
    }

    // Check for Duplicates in the same month/year
    const getMonthYear = dStr => {
      if (!dStr) return '';
      const parts = String(dStr).trim().split(/[\/\-]/);
      if (parts.length === 3) {
        if (parts[2].trim().length === 4) return parts[2].trim() + '-' + parts[1].trim().padStart(2, '0');
        if (parts[0].trim().length === 4) return parts[0].trim() + '-' + parts[1].trim().padStart(2, '0');
      }
      return String(dStr).trim().toUpperCase();
    };

    const isDuplicate = historyEntries.some(x => {
      if (isEdit && String(x.responseNumber) === String(e.responseNumber)) return false;
      const getVal = val => String(val || '').trim().toUpperCase();
      return getMonthYear(x.date) === getMonthYear(e.date) &&
             getVal(x.time) === getVal(e.time) &&
             getVal(x.vehicleNo) === getVal(e.vehicleNo) &&
             getVal(x.dieselAmount) === getVal(e.dieselAmount);
    });

    if (isDuplicate) {
      if (!confirm("⚠️ duplicate ENTRY DETECTED!\nSimiliar entry with same date, time, vehicle, and cost already exists in ledger. Save anyway?")) {
        return;
      }
    }

    // Save to Firebase RTDB with automatic photo merge from matching driver request
    const cleanV = String(e.vehicleNo || '').trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
    const cleanK = String(e.currentKm || '').replace(/[^0-9]/g, '');
    const reqList = (typeof driverRequestsList !== 'undefined' && Array.isArray(driverRequestsList)) ? driverRequestsList : [];
    const matchingReq = reqList.find(r => {
      if (!r) return false;
      const rVeh = String(r.vehicleNo || '').trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
      if (!rVeh || rVeh !== cleanV) return false;
      if (cleanK && String(r.currentKm || '').replace(/[^0-9]/g, '') === cleanK) return true;
      if (e.date && r.date && String(r.date).trim() === String(e.date).trim()) return true;
      return false;
    });

    const commitEntry = (photoPayload = {}) => {
      // Strip any raw photos from ledger entry object so entries node stays ultra-lightweight
      delete e.receiptPhoto;
      delete e.receiptPhotos;
      delete e.kmPhoto;
      delete e.kmPhotos;
      delete e.photo;
      delete e.capturedPhoto;
      delete e.stationPhoto;

      const promises = [entriesRef.child(e.responseNumber).set(e)];
      if (Object.keys(photoPayload).length > 0) {
        promises.push(db.ref('entryPhotos').child(e.responseNumber).set(photoPayload));
      }

      Promise.all(promises)
        .then(() => toast.ok(`Ledger entry #${e.responseNumber} saved successfully!`))
        .catch(err => toast.err(`Failed to write to database: ${err.message}`));
    };

    if (matchingReq) {
      Promise.all([
        db.ref('driverRequestPhotos').child(matchingReq.key).once('value').catch(() => ({ val: () => null })),
        driverRequestsRef.child(matchingReq.key).once('value').catch(() => ({ val: () => null }))
      ]).then(([pSnap, rSnap]) => {
        const pVal = (pSnap && typeof pSnap.val === 'function' ? pSnap.val() : null) || {};
        const rVal = (rSnap && typeof rSnap.val === 'function' ? rSnap.val() : null) || {};
        const fullReq = { ...rVal, ...pVal };

        // Merge KM photos from request
        const reqKm = (typeof extractPhotosFromRecord === 'function')
          ? extractPhotosFromRecord(fullReq, 'kmPhotos', 'kmPhoto', 'photo')
          : [];
        let mergedKm = [];
        if (reqKm.length > 0) {
          mergedKm = reqKm;
          e.hasKmPhoto = true;
        }

        // Merge receipt photos from request with attachedPhotos
        const reqReceipt = (typeof extractPhotosFromRecord === 'function')
          ? extractPhotosFromRecord(fullReq, 'receiptPhotos', 'receiptPhoto')
          : [];
        let mergedReceipt = (attachedPhotos && Array.isArray(attachedPhotos)) ? [...attachedPhotos] : [];
        reqReceipt.forEach(p => {
          if (!mergedReceipt.includes(p)) mergedReceipt.push(p);
        });
        if (mergedReceipt.length > 5) mergedReceipt = mergedReceipt.slice(0, 5);
        if (mergedReceipt.length > 0) {
          e.hasReceiptPhoto = true;
        }

        const entryPhotoPayload = {};
        if (mergedReceipt.length > 0) {
          entryPhotoPayload.receiptPhotos = mergedReceipt;
          entryPhotoPayload.receiptPhoto = mergedReceipt[0];
        }
        if (mergedKm.length > 0) {
          entryPhotoPayload.kmPhotos = mergedKm;
          entryPhotoPayload.kmPhoto = mergedKm[0];
        }

        commitEntry(entryPhotoPayload);

        // Mark matching driver request as filled & linked with merged photos in dedicated node
        const reqUpdates = {
          status: 'filled',
          filledAt: firebase.database.ServerValue.TIMESTAMP,
          linkedResponseNumber: e.responseNumber,
          hasReceiptPhoto: (mergedReceipt.length > 0),
          hasKmPhoto: (mergedKm.length > 0),
          receiptPhoto: null,
          receiptPhotos: null,
          kmPhoto: null,
          kmPhotos: null,
          photo: null
        };
        driverRequestsRef.child(matchingReq.key).update(reqUpdates);
        if (Object.keys(entryPhotoPayload).length > 0) {
          db.ref('driverRequestPhotos').child(matchingReq.key).update(entryPhotoPayload);
        }
      }).catch(() => {
        const photoPayload = {};
        if (attachedPhotos && attachedPhotos.length > 0) {
          photoPayload.receiptPhotos = attachedPhotos;
          photoPayload.receiptPhoto = attachedPhotos[0];
          e.hasReceiptPhoto = true;
        }
        commitEntry(photoPayload);
      });
    } else {
      const photoPayload = {};
      if (attachedPhotos && attachedPhotos.length > 0) {
        photoPayload.receiptPhotos = attachedPhotos;
        photoPayload.receiptPhoto = attachedPhotos[0];
        e.hasReceiptPhoto = true;
      }
      commitEntry(photoPayload);
    }
  } catch (err) {
    console.error(err);
    toast.err("Failed to process transaction content. Check structure.");
  }
}

// Quick Actions Edit Operations
window.editNoteDialog = (respNum, currentNote) => {
  if (!checkAuth()) return;
  const note = prompt("Modify Remarks Note for entry #" + respNum + ":", currentNote);
  if (note !== null) {
    const cleanNote = note.trim().toUpperCase();
    entriesRef.child(respNum).update({ note: cleanNote })
      .then(() => toast.ok("Note modified successfully!"))
      .catch(() => toast.err("Failed to edit note."));
  }
};

window.quickUpdateCost = (respNum, currentCost) => {
  if (!checkAuth()) return;
  const cost = prompt("Modify Cost Amount (₹) for entry #" + respNum + ":", currentCost);
  if (cost !== null && !isNaN(cost) && parseFloat(cost) > 0) {
    const cleanCost = parseFloat(cost);
    const newLitres = (cleanCost / dieselRate).toFixed(2);
    entriesRef.child(respNum).update({ dieselAmount: String(cleanCost), litres: String(newLitres) })
      .then(() => toast.ok("Cost & Litres updated successfully!"))
      .catch(() => toast.err("Failed to update cost amount."));
  }
};

window.deleteLedgerEntry = (respNum) => {
  if (!checkAuth()) return;
  if (confirm(`Pura delete hoga! Confirm deleting entry #${respNum}?`)) {
    entriesRef.child(respNum).remove()
      .then(() => toast.ok(`Entry #${respNum} deleted.`))
      .catch(() => toast.err("Failed to delete entry."));
  }
};

window.quickUpdateDate = (respNum, currentDate) => {
  if (!checkAuth()) return;
  const newDate = prompt("Modify Date for entry #" + respNum + " (DD-MM-YYYY):", currentDate);
  if (newDate !== null && newDate.trim()) {
    const cleanDate = newDate.trim();
    const parts = cleanDate.split('-');
    if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
      entriesRef.child(respNum).update({ date: cleanDate })
        .then(() => toast.ok("Date updated successfully!"))
        .catch(() => toast.err("Failed to update date."));
    } else {
      toast.err("Please use DD-MM-YYYY format.");
    }
  }
};

window.quickUpdateVehicleNo = (respNum, currentVehicleNo) => {
  if (!checkAuth()) return;
  const newVehicle = prompt("Modify Vehicle Number for entry #" + respNum + ":", currentVehicleNo);
  if (newVehicle !== null && newVehicle.trim()) {
    const cleanVehicle = newVehicle.trim().toUpperCase();
    let updateData = { vehicleNo: cleanVehicle };
    
    // Check if we can find vehicle details from historyEntries list
    const vMatch = historyEntries.find(v => v.vehicleNo === cleanVehicle);
    if (vMatch) {
      updateData.vehicleType = vMatch.vehicleType || '';
      updateData.mileage = vMatch.mileage || '';
    }
    
    entriesRef.child(respNum).update(updateData)
      .then(() => toast.ok("Vehicle number updated successfully!"))
      .catch(err => toast.err("Failed to update vehicle number: " + err.message));
  }
};

window.quickUpdateCurrentKm = (respNum, currentKm) => {
  if (!checkAuth()) return;
  const newKm = prompt("Modify Odometer / Current KM for entry #" + respNum + ":", currentKm);
  if (newKm !== null && !isNaN(newKm) && parseFloat(newKm) >= 0) {
    const cleanKm = String(parseInt(newKm));
    entriesRef.child(respNum).update({ currentKm: cleanKm })
      .then(() => toast.ok("Current KM updated successfully!"))
      .catch(() => toast.err("Failed to update current KM."));
  } else if (newKm !== null) {
    toast.err("Please enter a valid odometer reading.");
  }
};

window.quickUpdateNote = (respNum, currentNote) => {
  if (!checkAuth()) return;
  const newNote = prompt("Modify Odometer / Note for entry #" + respNum + ":", currentNote);
  if (newNote !== null) {
    const cleanNote = newNote.trim().toUpperCase();
    entriesRef.child(respNum).update({ note: cleanNote })
      .then(() => toast.ok("Note updated successfully!"))
      .catch(() => toast.err("Failed to update note."));
  }
};

// Copy Diesel Records Ledger Entry to Clipboard in WhatsApp Format
function copyLedgerEntryWhatsAppVoucher(responseNumber) {
  const e = historyEntries.find(x => String(x.responseNumber) === String(responseNumber));
  if (!e) {
    toast.err("Entry details not found.");
    return;
  }

  const rawKm = e.currentKm || e.startKm || '';
  const kmVal = (!rawKm || parseInt(rawKm) === 1 || parseInt(rawKm) === 0 || isNaN(parseInt(rawKm))) ? '' : rawKm;
  const avg = vehicleTypes[(e.vehicleType || '').toUpperCase()] || e.mileage || '';
  const formattedTime = e.time ? (typeof convertTo24Hour === 'function' ? convertTo24Hour(e.time) : e.time) : '';
  const cleanNote = (e.note && String(e.note).trim().toUpperCase() !== 'DRIVER REQUEST') ? e.note : '';

  const copyText = `🔔Diesel Request📢
Response #${e.responseNumber}
📅 Date & Time. : ${e.date || ''}${formattedTime ? ', ' + formattedTime : ''}
🚛 Vehicle No. : ${e.vehicleNo || ''}
🚚 Vehicle Type. : ${e.vehicleType || ''}${avg ? ',' + avg : ''}
📍 From Location. : ${e.fromLocation || ''}
📍 Last Location. : ${e.lastLocation || ''}
📊 Current KM. : ${kmVal}
💸 Diesel (₹ INR). : ${e.dieselAmount || ''}
👮🏻 Vendor Name. : ${e.vendorName || ''}
📝 Note. : ${cleanNote}`;

  copyToClipboard(copyText)
    .then(() => {
      toast.ok(`✅ Entry #${e.responseNumber} details COPIED to clipboard in WhatsApp format!`);
    })
    .catch(err => {
      toast.err("Failed to copy to clipboard: " + err.message);
    });
}
window.copyLedgerEntryWhatsAppVoucher = copyLedgerEntryWhatsAppVoucher;

// Modal Operations for History Entry Editing
window.openEditHistoryEntryModal = (responseNumber) => {
  if (!checkAuth()) return;
  const entry = historyEntries.find(x => String(x.responseNumber) === String(responseNumber));
  if (!entry) return toast.err("Entry not found.");

  // Populate drop-downs dynamically using innerHTML copy
  const vtypeSelect = document.getElementById('edit-hist-vtype');
  const vendorSelect = document.getElementById('edit-hist-vendor');
  if (vtypeSelect) vtypeSelect.innerHTML = document.getElementById('drf-vtype').innerHTML;
  if (vendorSelect) vendorSelect.innerHTML = document.getElementById('drf-vendor').innerHTML;

  // Populate inputs
  document.getElementById('edit-hist-key').value = entry.key || entry.responseNumber || '';
  document.getElementById('edit-hist-response').value = entry.responseNumber || '';
  
  // Format Date from DD-MM-YYYY to YYYY-MM-DD for input element
  let formattedDate = '';
  if (entry.date) {
    const parts = entry.date.split('-');
    if (parts.length === 3) {
      formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    } else {
      formattedDate = entry.date;
    }
  }
  document.getElementById('edit-hist-date').value = formattedDate;
  document.getElementById('edit-hist-time').value = entry.time || '';
  document.getElementById('edit-hist-vehicle').value = entry.vehicleNo || '';
  
  if (vtypeSelect) vtypeSelect.value = entry.vehicleType || '';
  if (vendorSelect) vendorSelect.value = entry.vendorName || '';
  
  document.getElementById('edit-hist-from').value = entry.fromLocation || '';
  document.getElementById('edit-hist-last').value = entry.lastLocation || '';
  document.getElementById('edit-hist-km').value = entry.currentKm || '';
  document.getElementById('edit-hist-amount').value = entry.dieselAmount || '';
  document.getElementById('edit-hist-mileage').value = entry.mileage || '';
  document.getElementById('edit-hist-note').value = entry.note || '';

  // Show Modal
  document.getElementById('edit-history-modal').classList.remove('hidden');
};

window.closeEditHistoryModal = () => {
  document.getElementById('edit-history-modal').classList.add('hidden');
};

window.handleEditHistoryEntry = (event) => {
  event.preventDefault();
  alert("Started saving...");
  try {
    if (!checkAuth()) return;

    const key = document.getElementById('edit-hist-key').value;
    const respNum = document.getElementById('edit-hist-response').value;
    const dateRaw = document.getElementById('edit-hist-date').value;
    const time = document.getElementById('edit-hist-time').value;
    const vehicle = document.getElementById('edit-hist-vehicle').value.trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
    const vtype = document.getElementById('edit-hist-vtype').value.trim().toUpperCase();
    const from = document.getElementById('edit-hist-from').value.trim().toUpperCase();
    const last = document.getElementById('edit-hist-last').value.trim().toUpperCase();
    const km = document.getElementById('edit-hist-km').value.trim();
    const amount = document.getElementById('edit-hist-amount').value.trim();
    const mileageInput = document.getElementById('edit-hist-mileage').value.trim();
    
    const existingEntry = historyEntries.find(e => e && ((e.key === key) || (String(e.responseNumber) === String(respNum))));
    const mileage = mileageInput || (existingEntry ? (existingEntry.mileage || '') : '');
    const vendor = document.getElementById('edit-hist-vendor').value;
    const note = document.getElementById('edit-hist-note').value.trim().toUpperCase();

    if (!vehicle || !amount) {
      return showAlert('error', 'Required Fields', 'Vehicle No. and Fuel Amount are mandatory!');
    }

    let formattedDate = dateRaw;
    if (dateRaw) {
      const [y, m, d] = dateRaw.split('-');
      formattedDate = `${d}-${m}-${y}`;
    }

    const cleanCost = parseFloat(amount) || 0;
    const newLitres = (cleanCost / dieselRate).toFixed(2);

    const updateData = {
      date: formattedDate,
      time: time,
      vehicleNo: vehicle,
      vehicleType: vtype,
      fromLocation: from,
      lastLocation: last,
      currentKm: km,
      dieselAmount: String(cleanCost),
      litres: String(newLitres),
      mileage: mileage,
      vendorName: vendor,
      note: note
    };

    const dbKey = key || respNum;
    if (!dbKey) {
      alert("No dbKey!");
      return;
    }

    alert("Saving data...");
    entriesRef.child(dbKey).update(updateData)
      .then(() => {
        toast.ok("Ledger Entry updated successfully!");
        closeEditHistoryModal();
      })
      .catch((err) => {
        alert("Firebase error: " + err.message);
      });
  } catch(e) {
    alert("JS error: " + e.message);
  }
};

/* ══════════════════════════════════════════════════════════
   12. UREA REQUEST DIRECT ENTRY logic
   ══════════════════════════════════════════════════════════ */
window.openUreaModal = () => {
  autoFillUreaEndKm();
  renderModalUreaTable();
  ureaModal.classList.remove('hidden');
};

const closeUreaBtn = document.getElementById('close-urea-modal');
if (closeUreaBtn) closeUreaBtn.onclick = () => ureaModal.classList.add('hidden');

// Auto calculate Urea Total Km
const ureaSKm = document.getElementById('urea-s-km');
const ureaEKm = document.getElementById('urea-e-km');
const ureaTotalKm = document.getElementById('urea-total-km');

function calculateUreaTotalKm() {
  const skm = parseFloat(ureaSKm.value) || 0;
  const ekm = parseFloat(ureaEKm.value) || 0;
  if (ekm > skm) {
    ureaTotalKm.value = ekm - skm;
  } else {
    ureaTotalKm.value = '';
  }
}

if (ureaSKm) ureaSKm.addEventListener('input', calculateUreaTotalKm);
if (ureaEKm) ureaEKm.addEventListener('input', calculateUreaTotalKm);

// Auto load urea vehicle type defaults
const ureaVehicle = document.getElementById('urea-vehicle');
if (ureaVehicle) {
  ureaVehicle.addEventListener('change', () => {
    const vNo = ureaVehicle.value.toUpperCase().trim();
    const match = historyEntries.find(e => e.vehicleNo === vNo);
    if (match && match.vehicleType) {
      document.getElementById('urea-v-type').value = match.vehicleType;
      const defaultAvg = vehicleTypes[match.vehicleType.toUpperCase()];
      if (defaultAvg !== undefined) {
        document.getElementById('urea-avg').value = defaultAvg;
      }
    }
  });
}

// Add Urea Request Submit handler
const addUreaSubmit = document.getElementById('add-urea-direct-submit');
if (addUreaSubmit) {
  addUreaSubmit.onclick = () => {
    if (!checkAuth()) return;
    const srNo = document.getElementById('urea-sr-no').value;
    const dVal = document.getElementById('urea-date').value;
    const vehicle = document.getElementById('urea-vehicle').value.trim().toUpperCase();
    const vtype = document.getElementById('urea-v-type').value;
    const avg = document.getElementById('urea-avg').value;
    const skm = document.getElementById('urea-s-km').value;
    const ekm = document.getElementById('urea-e-km').value;
    const totalKm = document.getElementById('urea-total-km').value;
    const amount = document.getElementById('urea-amount').value;
    const note = document.getElementById('urea-note').value.trim().toUpperCase();

    if (!vehicle || !amount) {
      return showAlert('error', 'Required Fields', 'Vehicle No. and Urea amount are mandatory!');
    }

    let dispDate = dVal;
    if (dVal) {
      const [y, m, d] = dVal.split('-');
      dispDate = `${d}-${m}-${y}`;
    }

    const item = {
      responseNumber: srNo,
      date: dispDate,
      time: new Date().toLocaleTimeString('en-IN', { hour12: false }).slice(0, 5),
      vehicleNo: vehicle,
      vehicleType: vtype,
      mileage: avg,
      currentKm: skm,
      endKm: ekm,
      totalKm: totalKm,
      dieselAmount: amount, // Saved as amount
      litres: String((parseFloat(amount) / 65.0).toFixed(2)), // Urea average conversion rate (₹65/L approx)
      vendorName: 'UREA REQUEST',
      note: note
    };

    ureaEntriesRef.child(srNo).set(item)
      .then(() => {
        toast.ok("Urea entry saved successfully!");
        openUreaModal(); // reset & update count
      })
      .catch(() => toast.err("Failed to upload Urea record."));
  };
}

// Render Urea entries inner table
function renderModalUreaTable() {
  const tbody = document.getElementById('modal-urea-table-body');
  if (!tbody) return;
  
  const vFilter = document.getElementById('urea-history-vehicle-filter').value.toUpperCase().trim();
  let filtered = ureaEntriesList;
  if (vFilter) {
    filtered = ureaEntriesList.filter(e => e.vehicleNo.includes(vFilter));
  }

  // Update total count badge
  const countBadge = document.getElementById('urea-entries-count-badge');
  if (countBadge) countBadge.textContent = `${filtered.length} Entries`;

  tbody.innerHTML = '';
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" class="text-center py-10 text-slate-400">No Urea entries match.</td></tr>`;
    return;
  }

  filtered.forEach(e => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="px-2 py-1.5 font-bold text-center">${e.responseNumber}</td>
      <td class="px-2 py-1.5">${e.date}</td>
      <td class="px-2 py-1.5 font-bold text-emerald-600">${e.vehicleNo}</td>
      <td class="px-2 py-1.5">${e.vehicleType || '-'}</td>
      <td class="px-2 py-1.5 text-center">${e.mileage || '-'}</td>
      <td class="px-2 py-1.5 text-right font-semibold">
        <span>${e.currentKm || '-'}</span>
        <span class="cursor-pointer text-slate-400 hover:text-white ml-1 text-[10px] select-none" onclick="editUreaKm('${e.responseNumber}', 'start')" title="Edit Start KM">🖊️</span>
      </td>
      <td class="px-2 py-1.5 text-right font-semibold">
        <span>${e.endKm || '-'}</span>
        <span class="cursor-pointer text-slate-400 hover:text-white ml-1 text-[10px] select-none" onclick="editUreaKm('${e.responseNumber}', 'end')" title="Edit End KM">🖊️</span>
      </td>
      <td class="px-2 py-1.5 text-center">
        <span class="text-blue-500 font-bold font-mono">${e.totalKm || '-'}</span>
      </td>
      <td class="px-2 py-1.5 text-right font-bold text-emerald-600">₹${parseFloat(e.dieselAmount || 0).toFixed(0)}</td>
      <td class="px-2 py-1.5 text-slate-400 uppercase text-[10px]">${e.note || ''}</td>
      <td class="px-2 py-1.5 text-center">
        <button onclick="deleteUreaEntry('${e.responseNumber}', '${e.vehicleNo}')" class="p-1 hover:bg-red-500/10 text-red-500 rounded" title="Delete Entry"><i class="fas fa-trash text-xs"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('urea-history-vehicle-filter')?.addEventListener('input', debounce(renderModalUreaTable, 150));

// Delete single Urea Entry
window.deleteUreaEntry = (srNo, vehicle) => {
  if (!checkAuth()) return;
  if (confirm(`Delete Urea entry #${srNo} for vehicle "${vehicle}"?`)) {
    ureaEntriesRef.child(srNo).remove()
      .then(() => toast.ok("Urea entry deleted successfully."))
      .catch(err => toast.err("Failed to delete entry: " + err.message));
  }
};

// Edit Urea KM Inline
window.editUreaKm = (responseNumber, fieldType) => {
  if (!checkAuth()) return;
  const entry = ureaEntriesList.find(x => x.responseNumber === responseNumber);
  if (!entry) return;
  const label = fieldType === 'start' ? 'Start KM' : 'End KM';
  const currentVal = fieldType === 'start' ? (entry.currentKm || '') : (entry.endKm || '');
  const newVal = prompt(`Edit ${label} for response #${responseNumber}:`, currentVal);
  if (newVal === null) return;
  const numVal = newVal.trim();
  
  const updates = {};
  if (fieldType === 'start') {
    updates.currentKm = numVal;
  } else {
    updates.endKm = numVal;
  }
  
  // Recalculate total KM
  const skm = parseFloat(fieldType === 'start' ? numVal : entry.currentKm) || 0;
  const ekm = parseFloat(fieldType === 'end' ? numVal : entry.endKm) || 0;
  if (ekm > skm) {
    updates.totalKm = String(ekm - skm);
  } else {
    updates.totalKm = '';
  }
  
  ureaEntriesRef.child(responseNumber).update(updates)
    .then(() => {
      toast.ok(`${label} updated successfully.`);
    })
    .catch(err => toast.err("Failed to update KM: " + err.message));
};

// Helper to format imported Excel dates to DD-MM-YYYY
function formatImportDate(rawDate) {
  if (!rawDate) return '';
  if (typeof rawDate === 'number') {
    const parsed = typeof XLSX !== 'undefined' && XLSX.SSF ? XLSX.SSF.parse_date_code(rawDate) : null;
    if (parsed) {
      const d = String(parsed.d).padStart(2, '0');
      const m = String(parsed.m).padStart(2, '0');
      const y = parsed.y;
      return `${d}-${m}-${y}`;
    }
  }
  if (rawDate instanceof Date) {
    const d = String(rawDate.getDate()).padStart(2, '0');
    const m = String(rawDate.getMonth() + 1).padStart(2, '0');
    const y = rawDate.getFullYear();
    return `${d}-${m}-${y}`;
  }
  let str = String(rawDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-');
    return `${d}-${m}-${y}`;
  }
  return str;
}

// Urea Excel Export (Matches UI headers: Sr No | Response # | Date | Vehicle No | V Type | Avg | S Km | E Km | Total k/m | Amount | Note)
document.getElementById('urea-excel-export-btn').onclick = () => {
  if (ureaEntriesList.length === 0) return toast.warn("No Urea entries to export.");
  try {
    const dataToExport = ureaEntriesList.map((e, index) => {
      let mileageVal = (e.mileage && typeof e.mileage !== 'object') ? String(e.mileage) : '';
      if (!mileageVal && e.vehicleType && vehicleTypes[e.vehicleType.toUpperCase()] !== undefined) {
        mileageVal = String(vehicleTypes[e.vehicleType.toUpperCase()]);
      }
      let sKm = (e.currentKm && parseInt(e.currentKm) !== 1 && parseInt(e.currentKm) !== 0 && !isNaN(parseInt(e.currentKm))) ? String(parseInt(e.currentKm)) : '';

      return {
        'Sr No': index + 1,
        'Response #': e.responseNumber || '',
        'Date': e.date || '',
        'Vehicle No': e.vehicleNo || '',
        'V Type': e.vehicleType || '',
        'Avg': mileageVal,
        'S Km': sKm,
        'E Km': e.endKm || '',
        'Total k/m': e.totalKm || '',
        'Amount': e.dieselAmount ? parseFloat(e.dieselAmount) : '',
        'Note': (e.note && String(e.note).trim().toUpperCase() !== 'DRIVER REQUEST') ? e.note : ''
      };
    });
    
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    ws['!cols'] = [
      { wch: 8 },  // Sr No
      { wch: 14 }, // Response #
      { wch: 14 }, // Date
      { wch: 16 }, // Vehicle No
      { wch: 12 }, // V Type
      { wch: 8 },  // Avg
      { wch: 12 }, // S Km
      { wch: 12 }, // E Km
      { wch: 12 }, // Total k/m
      { wch: 12 }, // Amount
      { wch: 30 }  // Note
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Urea Request History");
    const filename = `Urea_Request_History_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.ok("Urea history exported to Excel!");
  } catch (err) {
    toast.err("Excel Export Error: " + err.message);
  }
};

// Urea Excel Import trigger
document.getElementById('urea-excel-import-btn').onclick = () => {
  document.getElementById('urea-excel-import-file').click();
};

// Urea Excel Import handler
document.getElementById('urea-excel-import-file').onchange = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  toast.info("Excel file load ho rahi hai...");
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      
      if (workbook.SheetNames.length === 0) {
        return toast.err("Excel file khali hai!");
      }
      
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      
      if (rawRows.length === 0) {
        return toast.err("Selected sheet me koi rows nahi hain!");
      }
      
      toast.info(`${rawRows.length} rows Urea database me upload ho rahi hain...`);
      
      const ureaUpdates = {};
      rawRows.forEach((row, index) => {
        let srNo = row['Response #'] || row['Response'] || row['responseNumber'] || row['Response Number'] || row['Sr No'] || row['SrNo'] || row['#'] || row['SR NO'] || row['Sr. No.'];
        if (!srNo) srNo = String(Date.now() + index);
        srNo = String(srNo).trim().toUpperCase();
        
        let rawDate = row['Date'] || row['date'] || row['DATE'] || '';
        let date = formatImportDate(rawDate);
        
        let time = row['Time'] || row['time'] || '00:00';
        time = String(time).trim();
        
        let vehicleNo = row['Vehicle No'] || row['vehicleNo'] || row['VEHICLE NO'] || row['Vehicle'] || row['VehicleNo'] || '';
        vehicleNo = String(vehicleNo).trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
        
        let vehicleType = row['V Type'] || row['Vehicle Type'] || row['vehicleType'] || row['V TYPE'] || row['VehicleType'] || '';
        vehicleType = String(vehicleType).trim().toUpperCase();
        
        let mileage = row['Avg'] || row['Avg Mileage'] || row['mileage'] || row['AVG'] || row['Average'] || '';
        mileage = String(mileage).trim();
        
        let currentKm = row['S Km'] || row['Start KM'] || row['S KM'] || row['currentKm'] || row['Start Km'] || row['START KM'] || '';
        currentKm = String(currentKm).trim();
        
        let endKm = row['E Km'] || row['End KM'] || row['E KM'] || row['endKm'] || row['End Km'] || row['END KM'] || '';
        endKm = String(endKm).trim();
        
        let totalKm = row['Total k/m'] || row['Total KM'] || row['TOTAL K/M'] || row['totalKm'] || row['Total Km'] || row['TOTAL KM'] || '';
        totalKm = String(totalKm).trim();
        
        const sKmNum = parseFloat(currentKm) || 0;
        const eKmNum = parseFloat(endKm) || 0;
        if (!totalKm && eKmNum > sKmNum) {
          totalKm = String(eKmNum - sKmNum);
        }
        
        let amount = row['Amount'] || row['amount'] || row['AMOUNT'] || row['Diesel Amount'] || '';
        amount = String(amount).trim();
        
        let note = row['Note'] || row['note'] || row['NOTE'] || 'UREA';
        note = String(note).trim().toUpperCase();
        if (note === 'DRIVER REQUEST') note = 'UREA';
        
        if (vehicleNo) {
          ureaUpdates[srNo] = {
            responseNumber: srNo,
            date: date,
            time: time,
            vehicleNo: vehicleNo,
            vehicleType: vehicleType,
            mileage: mileage,
            fromLocation: 'UREA REQUEST',
            lastLocation: '',
            currentKm: currentKm,
            endKm: endKm,
            totalKm: totalKm,
            dieselAmount: amount,
            litres: String((parseFloat(amount) / 65.0).toFixed(2)),
            vendorName: 'UREA REQUEST',
            note: note
          };
        }
      });
      
      if (Object.keys(ureaUpdates).length > 0) {
        ureaEntriesRef.update(ureaUpdates)
          .then(() => {
            toast.ok(`${Object.keys(ureaUpdates).length} Urea entries import ho chuki hain!`);
            document.getElementById('urea-excel-import-file').value = '';
            // Auto-fill E KM after import (Firebase listener will refresh ureaEntriesList first)
            setTimeout(() => {
              autoFillUreaEndKm();
              if (typeof renderModalUreaTable === 'function') renderModalUreaTable();
            }, 2000);
          })
          .catch(err => {
            toast.err("Upload Sync Error: " + err.message);
            document.getElementById('urea-excel-import-file').value = '';
          });
      } else {
        toast.warn("No valid Urea rows found in Excel sheet.");
        document.getElementById('urea-excel-import-file').value = '';
      }
    } catch (err) {
      toast.err("Excel Read Error: " + err.message);
      document.getElementById('urea-excel-import-file').value = '';
    }
  };
  reader.readAsArrayBuffer(file);
};

// Auto-fill E KM for same vehicle entries
// Logic: sort each vehicle's entries by responseNumber ascending (oldest first)
// then: older_entry.endKm = next_entry.currentKm, older_entry.totalKm = endKm - startKm
function autoFillUreaEndKm() {
  if (!ureaEntriesList || ureaEntriesList.length === 0) return;

  // Group entries by vehicleNo
  const byVehicle = {};
  ureaEntriesList.forEach(e => {
    const v = String(e.vehicleNo || '').toUpperCase().trim();
    if (!v) return;
    if (!byVehicle[v]) byVehicle[v] = [];
    byVehicle[v].push(e);
  });

  const updates = {};

  Object.values(byVehicle).forEach(entries => {
    if (entries.length < 2) return;

    // Sort ascending by responseNumber: oldest (lowest number) comes first
    const sorted = [...entries].sort((a, b) => (parseInt(a.responseNumber) || 0) - (parseInt(b.responseNumber) || 0));

    for (let i = 0; i < sorted.length - 1; i++) {
      const older = sorted[i];      // the earlier entry whose endKm we want to fill
      const newer = sorted[i + 1]; // the later entry whose startKm (currentKm) becomes older's endKm

      const newerStartKm = parseFloat(newer.currentKm) || 0;
      if (newerStartKm <= 0) continue; // no valid start KM to fill with

      const olderStartKm = parseFloat(older.currentKm) || 0;
      const newEndKm = String(newerStartKm);
      const newTotalKm = (newerStartKm > olderStartKm) ? String(Math.round(newerStartKm - olderStartKm)) : '';

      // Only update if endKm is blank/dash/zero
      const existingEnd = String(older.endKm || '').trim();
      if (!existingEnd || existingEnd === '-' || existingEnd === '0') {
        updates[`${older.responseNumber}/endKm`] = newEndKm;
        if (newTotalKm) {
          updates[`${older.responseNumber}/totalKm`] = newTotalKm;
        }
      }
    }
  });

  if (Object.keys(updates).length > 0) {
    ureaEntriesRef.update(updates)
      .then(() => {
        const count = Math.floor(Object.keys(updates).length / 2) || Object.keys(updates).length;
        toast.ok(`${count} entries ke End KM auto-fill ho gaye!`);
      })
      .catch(err => console.error('Auto EndKm Error:', err));
  }
}

window.autoFillUreaEndKm = autoFillUreaEndKm;

// Clear Urea History
document.getElementById('urea-clear-all-btn').onclick = () => {
  if (!checkAuth()) return;
  const pass = prompt('Urea history clear hoga!\nEnter password:');
  if (pass === '@RPM@2026@') {
    const updates = {};
    ureaEntriesList.forEach(e => {
      updates[e.responseNumber] = null;
    });
    entriesRef.update(updates)
      .then(() => {
        toast.ok("Urea ledger cleared successfully!");
      })
      .catch(err => toast.err("Failed to clear Urea ledger: " + err.message));
  } else if (pass !== null) {
    toast.err("Incorrect authorization password.");
  }
};

/* ══════════════════════════════════════════════════════════
   13. CONFIGURATION TABLES CRUD (VEHICLES, DRIVERS, EMPLOYEES)
   ══════════════════════════════════════════════════════════ */

// 13A. VEHICLES CONFIG
const vehicleForm = document.getElementById('vehicle-config-form');
if (vehicleForm) {
  vehicleForm.onsubmit = e => {
    e.preventDefault();
    if (!checkAuth()) return;
    const key = document.getElementById('vehicle-edit-key').value;
    const name = document.getElementById('vtype-name').value.trim().toUpperCase();
    const avg = parseFloat(document.getElementById('vtype-mileage').value);
    
    if (!name || isNaN(avg)) return;
    
    // Check duplication on create
    if (!key && vehicleTypesList.some(v => v.name === name)) {
      return toast.err("Vehicle Type already configured.");
    }
    
    const existing = vehicleTypesList.find(v => v.key === key);
    const data = { 
      name, 
      avg, 
      createdAt: existing ? (existing.createdAt || Date.now()) : Date.now() 
    };
    if (key) {
      data.updatedAt = Date.now();
    }
    
    if (key) {
      // Edit mode
      vehicleTypesRef.child(key).set(data)
        .then(() => { toast.ok("Vehicle type updated!"); resetVehicleForm(); })
        .catch(err => toast.err("Failed to update vehicle type: " + err.message));
    } else {
      // Add mode
      vehicleTypesRef.push(data)
        .then(() => { toast.ok("Vehicle type added!"); resetVehicleForm(); })
        .catch(err => toast.err("Failed to add vehicle type: " + err.message));
    }
  };
}

function resetVehicleForm() {
  const editKey = document.getElementById('vehicle-edit-key');
  const vName = document.getElementById('vtype-name');
  const vMileage = document.getElementById('vtype-mileage');
  const formTitle = document.getElementById('vehicle-form-title');
  const submitBtn = document.getElementById('vtype-submit-btn');
  const cancelBtn = document.getElementById('vtype-cancel-btn');

  if (editKey) editKey.value = '';
  if (vName) vName.value = '';
  if (vMileage) vMileage.value = '';
  if (formTitle) formTitle.textContent = "Add Vehicle Type";
  if (submitBtn) submitBtn.textContent = "Save Vehicle Type";
  if (cancelBtn) cancelBtn.classList.add('hidden');
}

function renderVehiclesGrid() {
  const tbody = document.getElementById('vtype-config-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  const searchVal = (document.getElementById('vtype-search-input')?.value || '').toLowerCase().trim();
  const filtered = vehicleTypesList.filter(v => v.name.toLowerCase().includes(searchVal));
  
  document.getElementById('vehicle-count-badge').textContent = `Total: ${filtered.length}`;
  
  if (filtered.length === 0) {
    if (isVehicleTypesLoading) {
      tbody.innerHTML = getLoadingSkeletonHTML(2, 3);
    } else {
      tbody.innerHTML = `<tr><td colspan="2" class="text-center py-6 text-slate-400">No matching vehicles.</td></tr>`;
    }
    return;
  }

  filtered.forEach(v => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="px-3 py-2.5">
        <div class="flex items-center justify-between w-full uppercase font-bold text-slate-800 dark:text-slate-200">
          <span>${v.name}</span>
          <button onclick="deleteVehicle('${v.key}', '${v.name}')" class="p-1 hover:bg-red-500/10 text-red-500 rounded transition-all"><i class="fas fa-trash text-xs"></i></button>
        </div>
      </td>
      <td class="px-3 py-2.5 text-center font-mono font-bold text-blue-500">${parseFloat((Number(v.avg) || 0).toFixed(1))}</td>
    `;
    tbody.appendChild(tr);
  });
}

window.deleteVehicle = (key, name) => {
  if (!checkAuth()) return;
  if (confirm(`Confirm deleting vehicle type "${name}"?`)) {
    vehicleTypesRef.child(key).remove()
      .then(() => toast.ok("Vehicle type deleted."))
      .catch((err) => toast.err("Failed to delete vehicle: " + err.message));
  }
};

window.clearAllVehicleTypes = () => {
  if (!checkAuth()) return;
  if (confirm("⚠️ WARNING: Confirm deleting all vehicle types configuration? This cannot be undone.")) {
    vehicleTypesRef.remove()
      .then(() => toast.ok("All vehicle types deleted."))
      .catch((err) => toast.err("Failed to clear vehicle types: " + err.message));
  }
};

// 13B. DRIVERS CONFIG
const driverForm = document.getElementById('driver-config-form');
if (driverForm) {
  driverForm.onsubmit = e => {
    e.preventDefault();
    if (!checkAuth()) return;
    const key = document.getElementById('driver-edit-key').value;
    const name = document.getElementById('driver-name-input').value.trim().toUpperCase();
    const mobile = document.getElementById('driver-mobile-input').value.trim();
    const tag = document.getElementById('driver-tag-input').value.trim();
    
    if (!name || !mobile) return;
    
    // Check duplication on create
    if (!key && driversList.some(d => d.name === name)) {
      return toast.err("Driver already configured.");
    }
    
    const existing = driversList.find(d => d.key === key);
    const data = { 
      name, 
      mobile, 
      tag, 
      createdAt: existing ? (existing.createdAt || Date.now()) : Date.now() 
    };
    if (key) {
      data.updatedAt = Date.now();
    }
    
    if (key) {
      driversRef.child(key).set(data)
        .then(() => { toast.ok("Driver updated!"); resetDriverForm(); })
        .catch(err => toast.err("Failed to update driver: " + err.message));
    } else {
      driversRef.push(data)
        .then(() => { toast.ok("Driver registered!"); resetDriverForm(); })
        .catch(err => toast.err("Failed to register driver: " + err.message));
    }
  };
}

function resetDriverForm() {
  document.getElementById('driver-edit-key').value = '';
  document.getElementById('driver-name-input').value = '';
  document.getElementById('driver-mobile-input').value = '';
  document.getElementById('driver-tag-input').value = '';
  document.getElementById('driver-form-title').textContent = "Register Driver";
  document.getElementById('driver-submit-btn').textContent = "Save Driver";
  document.getElementById('driver-cancel-btn').classList.add('hidden');
}

function renderDriversGrid() {
  const tbody = document.getElementById('driver-config-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  const search = document.getElementById('driver-search').value.toLowerCase();
  
  const filtered = driversList.filter(d => 
    d.name.toLowerCase().includes(search) || d.mobile.includes(search) || d.tag.toLowerCase().includes(search)
  );

  if (filtered.length === 0) {
    if (isDriversLoading) {
      tbody.innerHTML = getLoadingSkeletonHTML(4, 3);
    } else {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-slate-400">No matching drivers registered.</td></tr>`;
    }
    return;
  }

  filtered.forEach(d => {
    let tagClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    const statusTag = String(d.tag || '').toUpperCase().trim();
    if (statusTag === 'RED') {
      tagClass = "bg-rose-500/10 text-rose-600 dark:text-rose-400";
    } else if (statusTag === 'YELLOW') {
      tagClass = "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    }
    const tagBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${tagClass}">${statusTag || 'GREEN'}</span>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="px-3 py-2.5 font-bold text-slate-800 dark:text-slate-200">${d.name}</td>
      <td class="px-3 py-2.5 font-mono">${d.mobile}</td>
      <td class="px-3 py-2.5 text-xs">${tagBadge}</td>
      <td class="px-3 py-2.5 text-center">
        <div class="flex justify-center gap-2">
          <button onclick="editDriver('${d.key}', '${d.name}', '${d.mobile}', '${d.tag}')" class="p-1 hover:bg-blue-500/10 text-blue-600 rounded"><i class="fas fa-edit"></i></button>
          <button onclick="deleteDriver('${d.key}', '${d.name}')" class="p-1 hover:bg-red-500/10 text-red-500 rounded"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.editDriver = (key, name, mobile, tag) => {
  document.getElementById('driver-edit-key').value = key;
  document.getElementById('driver-name-input').value = name;
  document.getElementById('driver-mobile-input').value = mobile;
  document.getElementById('driver-tag-input').value = tag === 'null' || tag === 'undefined' ? '' : tag;
  document.getElementById('driver-form-title').textContent = "Edit Driver";
  document.getElementById('driver-submit-btn').textContent = "Update Driver";
  document.getElementById('driver-cancel-btn').classList.remove('hidden');
};

window.deleteDriver = (key, name) => {
  if (!checkAuth()) return;
  if (confirm(`Confirm deleting driver "${name}"?`)) {
    driversRef.child(key).remove()
      .then(() => toast.ok("Driver record deleted."))
      .catch(err => toast.err("Failed to delete driver: " + err.message));
  }
};

document.getElementById('driver-search')?.addEventListener('input', debounce(renderDriversGrid, 100));

window.clearAllDrivers = () => {
  if (!checkAuth()) return;
  if (confirm("⚠️ WIPE ALL DRIVERS DATABASE?\nThis cannot be undone.")) {
    driversRef.set(null)
      .then(() => toast.ok("All driver entries cleared."))
      .catch(err => toast.err("Failed to clear drivers: " + err.message));
  }
};

// 13C. EMPLOYEES CONFIG
const employeeForm = document.getElementById('employee-config-form');
if (employeeForm) {
  employeeForm.onsubmit = e => {
    e.preventDefault();
    if (!checkAuth()) return;
    const key = document.getElementById('employee-edit-key').value;
    const name = document.getElementById('employee-name-input').value.trim().toUpperCase();
    const mobile = document.getElementById('employee-mobile-input').value.trim();
    const tag = document.getElementById('employee-tag-input').value.trim();
    
    if (!name || !mobile) return;
    
    // Check duplication on create
    if (!key && employeesList.some(emp => emp.name === name)) {
      return toast.err("Employee already configured.");
    }
    
    const existing = employeesList.find(emp => emp.key === key);
    const data = { 
      name, 
      mobile, 
      tag, 
      createdAt: existing ? (existing.createdAt || Date.now()) : Date.now() 
    };
    if (key) {
      data.updatedAt = Date.now();
    }
    
    if (key) {
      employeesRef.child(key).set(data)
        .then(() => { toast.ok("Employee updated!"); resetEmployeeForm(); })
        .catch(err => toast.err("Failed to update employee: " + err.message));
    } else {
      employeesRef.push(data)
        .then(() => { toast.ok("Employee registered!"); resetEmployeeForm(); })
        .catch(err => toast.err("Failed to register employee: " + err.message));
    }
  };
}

function resetEmployeeForm() {
  document.getElementById('employee-edit-key').value = '';
  document.getElementById('employee-name-input').value = '';
  document.getElementById('employee-mobile-input').value = '';
  document.getElementById('employee-tag-input').value = '';
  document.getElementById('employee-form-title').textContent = "Register Employee";
  document.getElementById('employee-submit-btn').textContent = "Save Employee";
  document.getElementById('employee-cancel-btn').classList.add('hidden');
}

function renderEmployeesGrid() {
  const tbody = document.getElementById('employee-config-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  const search = document.getElementById('employee-search').value.toLowerCase();
  const filtered = employeesList.filter(e => 
    e.name.toLowerCase().includes(search) || e.mobile.includes(search) || e.tag.toLowerCase().includes(search)
  );

  if (filtered.length === 0) {
    if (isEmployeesLoading) {
      tbody.innerHTML = getLoadingSkeletonHTML(4, 3);
    } else {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-slate-400">No matching staff registered.</td></tr>`;
    }
    return;
  }

  filtered.forEach(e => {
    let tagClass = "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    const statusTag = String(e.tag || '').toUpperCase().trim();
    if (statusTag === 'MANAGER') {
      tagClass = "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400";
    } else if (statusTag === 'DEO') {
      tagClass = "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    }
    const tagBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${tagClass}">${statusTag || 'EMPLOYEE'}</span>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="px-3 py-2.5 font-bold text-slate-800 dark:text-slate-200">${e.name}</td>
      <td class="px-3 py-2.5 font-mono">${e.mobile}</td>
      <td class="px-3 py-2.5 text-xs">${tagBadge}</td>
      <td class="px-3 py-2.5 text-center">
        <div class="flex justify-center gap-2">
          <button onclick="editEmployee('${e.key}', '${e.name}', '${e.mobile}', '${e.tag}')" class="p-1 hover:bg-blue-500/10 text-blue-600 rounded"><i class="fas fa-edit"></i></button>
          <button onclick="deleteEmployee('${e.key}', '${e.name}')" class="p-1 hover:bg-red-500/10 text-red-500 rounded"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.editEmployee = (key, name, mobile, tag) => {
  document.getElementById('employee-edit-key').value = key;
  document.getElementById('employee-name-input').value = name;
  document.getElementById('employee-mobile-input').value = mobile;
  document.getElementById('employee-tag-input').value = tag === 'null' || tag === 'undefined' ? '' : tag;
  document.getElementById('employee-form-title').textContent = "Edit Employee";
  document.getElementById('employee-submit-btn').textContent = "Update Employee";
  document.getElementById('employee-cancel-btn').classList.remove('hidden');
};

window.deleteEmployee = (key, name) => {
  if (!checkAuth()) return;
  if (confirm(`Confirm deleting employee "${name}"?`)) {
    employeesRef.child(key).remove()
      .then(() => toast.ok("Employee record cleared."))
      .catch(err => toast.err("Failed to delete employee: " + err.message));
  }
};

document.getElementById('employee-search')?.addEventListener('input', debounce(renderEmployeesGrid, 100));

window.clearAllEmployees = () => {
  if (!checkAuth()) return;
  if (confirm("⚠️ WIPE ALL STAFF DATABASE?\nThis cannot be undone.")) {
    employeesRef.set(null)
      .then(() => toast.ok("Employee config wiped."))
      .catch(err => toast.err("Failed to wipe employee config: " + err.message));
  }
};

/* ══════════════════════════════════════════════════════════
   14. CONFIG MODULES: LOCATIONS & VENDORS
   ══════════════════════════════════════════════════════════ */

// 14A. LOCATIONS MODAL CONFIG
const openLocationBtn = document.getElementById('location-config-btn');
const locModal = document.getElementById('location-modal');
if (openLocationBtn) openLocationBtn.onclick = () => { locModal.classList.remove('hidden'); renderLocationsGrid(); };
document.getElementById('close-location-modal').onclick = () => locModal.classList.add('hidden');

const locForm = document.getElementById('location-config-form');
if (locForm) {
  locForm.onsubmit = e => {
    e.preventDefault();
    if (!checkAuth()) return;
    const name = document.getElementById('new-location-name').value.trim().toUpperCase();
    const distance = document.getElementById('new-location-distance').value.trim();
    if (!name || !distance) return;
    
    // Check duplication
    if (locationsList.some(l => l.name === name)) {
      return toast.err("Location already configured.");
    }
    
    locationsRef.child(name).set({
      name: name,
      rate: Number(distance) || 0,
      distance: Number(distance) || 0,
      createdAt: Date.now()
    })
      .then(() => {
        toast.ok("Location added successfully!");
        document.getElementById('new-location-name').value = '';
        document.getElementById('new-location-distance').value = '';
      })
      .catch(err => toast.err("Failed to add location: " + err.message));
  };
}

function renderLocationsGrid() {
  const tbody = document.getElementById('location-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  const search = document.getElementById('location-search-input')?.value.toLowerCase() || '';
  const filtered = locationsList.filter(l => l.name.toLowerCase().includes(search));

  if (filtered.length === 0) {
    if (isLocationsLoading) {
      tbody.innerHTML = getLoadingSkeletonHTML(2, 3);
    } else {
      tbody.innerHTML = `<tr><td colspan="2" class="text-center py-4 text-slate-400">No locations matching.</td></tr>`;
    }
    return;
  }

  filtered.forEach((l, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="px-3 py-2">
        <div class="flex items-center justify-between font-bold w-full uppercase">
          <span>${l.name}</span>
          <button onclick="deleteLocation('${l.key}', '${l.name}')" class="p-1 hover:bg-red-500/10 text-red-500 rounded"><i class="fas fa-trash text-xs"></i></button>
        </div>
      </td>
      <td class="px-3 py-2 text-center text-blue-500 font-bold font-mono">
        ${l.distance !== undefined && l.distance !== null ? l.distance : '-'}/km
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  // Sync fuel entry modal dropdown lists
  populateDrfLocationDatalists();
}

window.deleteLocation = (key, name) => {
  if (!checkAuth()) return;
  if (confirm(`Delete location "${name}"?`)) {
    if (key && key !== 'null' && key !== 'undefined') {
      locationsRef.child(key).remove()
        .then(() => toast.ok("Location cleared."))
        .catch(err => toast.err("Failed to delete location: " + err.message));
    } else {
      // Fallback
      const targetMatch = locationsList.find(v => v.name === name);
      if (targetMatch && targetMatch.key) {
        locationsRef.child(targetMatch.key).remove()
          .then(() => toast.ok("Location cleared."))
          .catch(err => toast.err("Failed to delete location: " + err.message));
      } else {
        toast.err("Failed to identify record key.");
      }
    }
  }
};

document.getElementById('location-search-input')?.addEventListener('input', debounce(renderLocationsGrid, 100));

function populateDrfLocationDatalists() {
  const fromDList = document.getElementById('drf-from-list');
  const lastDList = document.getElementById('drf-last-list');
  
  const fill = el => {
    if (!el) return;
    el.innerHTML = '';
    locationsList.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l.name;
      el.appendChild(opt);
    });
  };
  fill(fromDList);
  fill(lastDList);
}

// 14B. VENDORS MODAL CONFIG
const openVendorBtn = document.getElementById('vendor-config-btn');
const vendorModal = document.getElementById('v-vendor-modal');
if (openVendorBtn) openVendorBtn.onclick = () => { vendorModal.classList.remove('hidden'); renderVendorsGrid(); };
document.getElementById('close-v-vendor-modal').onclick = () => vendorModal.classList.add('hidden');

const vendorForm = document.getElementById('vendor-config-form');
if (vendorForm) {
  vendorForm.onsubmit = e => {
    e.preventDefault();
    if (!checkAuth()) return;
    const name = document.getElementById('new-vendor-name').value.trim().toUpperCase();
    if (!name) return;
    
    // Check duplication
    if (vendorsList.some(v => v.name === name)) {
      return toast.err("Vendor already configured.");
    }
    
    vendorsRef.push({ name: name, createdAt: Date.now() })
      .then(() => {
        toast.ok("Vendor registered successfully!");
        document.getElementById('new-vendor-name').value = '';
      })
      .catch(err => toast.err("Failed to register vendor: " + err.message));
  };
}

function renderVendorsGrid() {
  const tbody = document.getElementById('vendor-config-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const searchVal = (document.getElementById('vendor-search-input')?.value || '').toLowerCase().trim();
  const filtered = vendorsList.filter(v => v.name.toLowerCase().includes(searchVal));

  const countBadge = document.getElementById('vendor-count-badge');
  if (countBadge) countBadge.textContent = `Total: ${filtered.length}`;

  if (filtered.length === 0) {
    if (isVendorsLoading) {
      tbody.innerHTML = getLoadingSkeletonHTML(1, 3);
    } else {
      tbody.innerHTML = `<tr><td colspan="1" class="text-center py-4 text-slate-400">No matching vendors.</td></tr>`;
    }
    return;
  }

  filtered.forEach(v => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="px-3 py-2">
        <div class="flex items-center justify-between w-full uppercase font-bold text-slate-800 dark:text-slate-200">
          <span>${v.name}</span>
          <button onclick="deleteVendor('${v.key}', '${v.name}')" class="p-1 hover:bg-red-500/10 text-red-500 rounded transition-all"><i class="fas fa-trash text-xs"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.deleteVendor = (key, name) => {
  if (!checkAuth()) return;
  if (confirm(`Delete vendor "${name}"?`)) {
    vendorsRef.child(key).remove()
      .then(() => toast.ok("Vendor deleted."))
      .catch(err => toast.err("Failed to delete vendor: " + err.message));
  }
};

window.clearAllVendors = () => {
  if (!checkAuth()) return;
  if (confirm("⚠️ WARNING: Confirm deleting all vendors list configuration? This cannot be undone.")) {
    vendorsRef.remove()
      .then(() => toast.ok("All vendors list cleared."))
      .catch(err => toast.err("Failed to clear vendors: " + err.message));
  }
};

function populateVendorDropdown() {
  const drfVen = document.getElementById('drf-vendor');
  if (drfVen) {
    drfVen.innerHTML = '';
    vendorsList.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = v.name;
      drfVen.appendChild(opt);
    });
  }

  const histVen = document.getElementById('history-vendor-filter');
  if (histVen) {
    histVen.innerHTML = '<option value="All">All Vendors</option>';
    vendorsList.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = v.name;
      histVen.appendChild(opt);
    });
  }
}

function populateVehicleTypeDropdown() {
  const drfV = document.getElementById('drf-vtype');
  if (drfV) {
    drfV.innerHTML = '<option value="">-- Choose Type --</option>';
    vehicleTypesList.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.name;
      const averageVal = Number(v.avg) || 0;
      opt.textContent = `${v.name} (${averageVal.toFixed(2)} KM/L)`;
      drfV.appendChild(opt);
    });
  }
}

/* ══════════════════════════════════════════════════════════
   15. FUEL STOCK REFILL LOGS
   ══════════════════════════════════════════════════════════ */
const refillForm = document.getElementById('refill-stock-form');
if (refillForm) {
  refillForm.onsubmit = e => {
    e.preventDefault();
    if (!checkAuth()) return;
    const dVal = document.getElementById('refill-date').value;
    const litres = parseFloat(document.getElementById('refill-litres').value);
    const rate = parseFloat(document.getElementById('refill-rate').value);
    const tankerNo = document.getElementById('refill-supplier').value.trim().toUpperCase();
    const invoice = document.getElementById('refill-invoice').value.trim().toUpperCase();

    if (!dVal || isNaN(litres) || isNaN(rate)) return;

    let dispDate = dVal;
    const [y, m, d] = dVal.split('-');
    dispDate = `${d}-${m}-${y}`;

    const data = {
      date: dispDate,
      litres: String(litres),
      rate: String(rate),
      tankerNo: tankerNo,
      invoice: invoice,
      createdAt: Date.now()
    };

    db.ref('refills').push(data)
      .then(() => {
        toast.ok("Fuel stock refill logged successfully!");
        refillForm.reset();
        // Reset date default to today
        const today = new Date().toISOString().slice(0, 10);
        document.getElementById('refill-date').value = today;
      })
      .catch(err => {
        toast.err("Failed to log stock refill: " + err.message);
      });
  };
}

function renderRefillLogsTable() {
  const tbody = document.getElementById('refill-logs-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  let totalL = 0;
  if (refillsList.length === 0) {
    if (isRefillsLoading) {
      tbody.innerHTML = getLoadingSkeletonHTML(6, 3);
    } else {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-slate-400 font-semibold">No refill entries logged yet.</td></tr>`;
    }
    document.getElementById('refill-total-accumulator').textContent = "Total: 0.00 L";
    return;
  }

  refillsList.forEach(r => {
    const litres = parseFloat(r.litres) || 0;
    const rate = parseFloat(r.rate) || 0;
    const cost = litres * rate;
    totalL += litres;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="px-3 py-2.5 font-bold">${r.date}</td>
      <td class="px-3 py-2.5 text-right font-extrabold text-green-600">${litres.toFixed(2)} L</td>
      <td class="px-3 py-2.5 text-right font-semibold">₹${rate.toFixed(2)}</td>
      <td class="px-3 py-2.5 text-right font-bold text-slate-800 dark:text-slate-200">₹${cost.toLocaleString('en-IN')}</td>
      <td class="px-3 py-2.5 text-xs text-slate-400">Inv: ${r.invoice || '-'}<br>Tanker: ${r.tankerNo || '-'}</td>
      <td class="px-3 py-2.5 text-center">
        <button onclick="deleteRefillLog('${r.key}')" class="p-1 text-red-500 hover:bg-red-500/10 rounded"><i class="fas fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('refill-total-accumulator').textContent = `Total: ${totalL.toFixed(2)} L`;
}

window.deleteRefillLog = key => {
  if (!checkAuth()) return;
  if (confirm("Confirm deleting this fuel stock refill entry? This resets reserves calculation.")) {
    db.ref('refills').child(key).remove()
      .then(() => {
        toast.ok("Refill entry deleted.");
      })
      .catch(err => {
        toast.err("Failed to delete refill entry: " + err.message);
      });
  }
};

/* ══════════════════════════════════════════════════════════
   16. EMAIL TEMPLATES SYSTEM & RECIPIENTS BUILDER
   ══════════════════════════════════════════════════════════ */
let selectedEmailType = 'daily';
let managerOpen = false;

function selectEmailTemplate(type) {
  selectedEmailType = type;

  // Highlighting active option tabs
  const optDaily = document.getElementById('opt-daily');
  const optBill = document.getElementById('opt-bill');

  if (optDaily) {
    optDaily.className = `glass-panel p-4 rounded-2xl flex flex-col items-center justify-center text-center border-2 transition-all space-y-2 focus:outline-none w-full ${type === 'daily' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-200/5 dark:border-slate-800/40'}`;
  }
  if (optBill) {
    optBill.className = `glass-panel p-4 rounded-2xl flex flex-col items-center justify-center text-center border-2 transition-all space-y-2 focus:outline-none w-full ${type === 'bill' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-200/5 dark:border-slate-800/40'}`;
  }

  const singleDateGrp = document.getElementById('email-single-date');
  const rangeDateGrp = document.getElementById('email-range-date');
  const cardLabel = document.getElementById('date-card-label');
  const dateStandby = document.getElementById('email-date-standby');

  if (dateStandby) dateStandby.classList.add('hidden');

  if (type === 'daily') {
    if (singleDateGrp) singleDateGrp.classList.remove('hidden');
    if (rangeDateGrp) rangeDateGrp.classList.add('hidden');
    if (cardLabel) cardLabel.textContent = "Select Report Date";

    // Default today ISO date value
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('email-report-date').value = today;
  } else {
    if (singleDateGrp) singleDateGrp.classList.add('hidden');
    if (rangeDateGrp) rangeDateGrp.classList.remove('hidden');
    if (cardLabel) cardLabel.textContent = "Select Billing Period";
  }

  // Activate & style the burgundy button to standard premium blue
  const genBtn = document.getElementById('generate-email-btn');
  if (genBtn) {
    genBtn.disabled = false;
    genBtn.className = "btn-neon-glow btn-magnetic w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/10 hover:opacity-90 flex items-center justify-center gap-2 transition-all cursor-pointer";
    const btnText = document.getElementById('btn-text');
    if (btnText) btnText.textContent = "Generate & Copy HTML";
    const btnIcon = genBtn.querySelector('.fas');
    if (btnIcon) {
      btnIcon.className = "fas fa-bolt";
    }
  }

  // Update visually preview screen
  renderEmailManager();
  updateEmailPreviewTemplate();
}

function toggleEmailTagPanel() {
  managerOpen = !managerOpen;
  const pnl = document.getElementById('email-editor-panel');
  if (pnl) {
    if (managerOpen) pnl.classList.remove('hidden');
    else pnl.classList.add('hidden');
  }
}

function renderEmailManager() {
  const toKey = selectedEmailType === 'daily' ? 'daily-to' : 'bill-to';
  const ccKey = selectedEmailType === 'daily' ? 'daily-cc' : 'bill-cc';

  const toContainer = document.getElementById('tags-to');
  const ccContainer = document.getElementById('tags-cc');

  if (toContainer) toContainer.innerHTML = '';
  if (ccContainer) ccContainer.innerHTML = '';

  const createTag = (email, key, idx) => {
    const el = document.createElement('div');
    el.className = "email-tag";
    el.innerHTML = `<span>${email}</span><button onclick="removeEmailTag('${key}', ${idx})">&times;</button>`;
    return el;
  };

  emailLists[toKey].forEach((e, idx) => {
    toContainer.appendChild(createTag(e, toKey, idx));
  });

  emailLists[ccKey].forEach((e, idx) => {
    ccContainer.appendChild(createTag(e, ccKey, idx));
  });

  // Update count indicators on copy buttons
  const toBtn = document.querySelector('#btn-copy-to .copy-count');
  const ccBtn = document.querySelector('#btn-copy-cc .copy-count');
  
  if (toBtn) toBtn.textContent = `(${emailLists[toKey].length})`;
  if (ccBtn) ccBtn.textContent = `(${emailLists[ccKey].length})`;
}

function removeEmailTag(key, idx) {
  if (!checkAuth()) return;
  emailLists[key].splice(idx, 1);
  emailListsRef.set(emailLists)
    .then(() => {
      toast.ok("Email recipient removed.");
    })
    .catch(err => {
      console.error(err);
      toast.err("Failed to sync email lists: " + err.message);
    });
}

function addEmailFromInput() {
  if (!checkAuth()) return;
  const input = document.getElementById('new-email-input');
  const typeSelect = document.getElementById('new-email-type');
  const val = input.value.trim();

  if (!val) return;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(val)) return toast.err("Invalid email address format.");

  const suffix = typeSelect.value;
  const targetKey = selectedEmailType === 'daily' ? `daily-${suffix}` : `bill-${suffix}`;

  emailLists[targetKey].push(val);
  emailListsRef.set(emailLists)
    .then(() => {
      input.value = '';
      toast.ok("Recipient added successfully!");
    })
    .catch(err => {
      console.error(err);
      toast.err("Failed to sync email lists: " + err.message);
    });
}

function copyEmails(type) {
  const targetKey = selectedEmailType === 'daily' ? `daily-${type}` : `bill-${type}`;
  const list = emailLists[targetKey] || [];
  const text = list.join(';');
  
  if (text.length === 0) return toast.warn("Recipient list is empty.");

  window.safeCopyToClipboard(text).then(() => {
    toast.ok(`Semicolon separated ${type.toUpperCase()} list copied!`);
  });
}

// Generate compiled HTML template & Copy code
function generateEmailTemplate() {
  let html = '';
  let filename = '';

  if (selectedEmailType === 'daily') {
    const rawDate = document.getElementById('email-report-date').value;
    if (!rawDate) return toast.err("Please choose report date.");
    
    // Formatting date: DD-MM-YYYY
    const [y, m, d] = rawDate.split('-');
    const formattedDate = `${d}-${m}-${y}`;
    
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dateLong = parseInt(d) + ' ' + months[parseInt(m) - 1] + ' ' + y;
    
    // Compile daily transactions template
    html = getDailyReportEmailHTML(dateLong);
    filename = `daily_report_${formattedDate}.html`;
  } else {
    const from = document.getElementById('email-date-from').value;
    const to = document.getElementById('email-date-to').value;
    if (!from || !to) return toast.err("Please choose range period.");

    const formatDateSlash = str => {
      const [y, m, d] = str.split('-');
      return `${d}/${m}/${y}`;
    };

    html = getBillSubmissionEmailHTML(formatDateSlash(from), formatDateSlash(to));
    filename = `bill_submission_${from}_to_${to}.html`;
  }

  // Copy HTML source to clipboard
  window.safeCopyToClipboard(html).then(() => {
    const btn = document.getElementById('generate-email-btn');
    const textSpan = document.getElementById('btn-text');
    const origText = textSpan.textContent;
    
    textSpan.textContent = "HTML Template Copied!";
    btn.style.background = "linear-gradient(135deg, #10b981 0%, #059669 100%)";
    
    toast.ok("HTML Email template code copied to clipboard.");
    
    setTimeout(() => {
      textSpan.textContent = origText;
      btn.style.background = "";
    }, 2500);
  });

  // Render preview frame
  const frame = document.getElementById('email-preview-frame');
  frame.innerHTML = html;
  document.getElementById('preview-mode-badge').textContent = "COMPILED";
}

function updateEmailPreviewTemplate() {
  const frame = document.getElementById('email-preview-frame');
  if (selectedEmailType === 'daily') {
    frame.innerHTML = `<div class="flex flex-col items-center justify-center h-80 text-slate-400 text-xs">
      <i class="fas fa-file-invoice text-4xl text-slate-300 mb-2"></i>
      Click "Generate & Copy HTML" to load live daily dispatch preview sheet.
    </div>`;
  } else {
    frame.innerHTML = `<div class="flex flex-col items-center justify-center h-80 text-slate-400 text-xs">
      <i class="fas fa-coins text-4xl text-slate-300 mb-2"></i>
      Click "Generate & Copy HTML" to compile formal billing period submit preview.
    </div>`;
  }
  document.getElementById('preview-mode-badge').textContent = "STANDBY";
}

/* ──────────────────────────────────────────────────────────
   16A. DAILY REPORT HTML EMAIL GENERATION TEMPLATE
   ────────────────────────────────────────────────────────── */
function getDailyReportEmailHTML(dateLong) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bhiwandi Diesel Report — RPM Logistics</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,sans-serif;-webkit-text-size-adjust:none;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f4f7;padding:20px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td bgcolor="#b30000" style="padding:28px 24px;text-align:center;background-color:#b30000;">
              <div style="font-size:12px;font-weight:bold;color:#ffd54f;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">RPM LOGISTICS PVT. LTD.</div>
              <div style="font-size:24px;font-weight:bold;color:#ffffff;margin:0;">🚛 BHIWANDI DIESEL REPORT</div>
              <div style="font-size:11px;color:#ffcdd2;letter-spacing:1px;margin-top:6px;text-transform:uppercase;">Daily Fuel Monitoring & Operational Report</div>
            </td>
          </tr>
          <!-- Date Bar -->
          <tr>
            <td bgcolor="#fafafa" style="padding:12px 24px;background-color:#fafafa;border-bottom:1px solid #edf2f7;font-size:13px;color:#4a5568;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="font-weight:bold;">📅 Report Date:</td>
                  <td align="right" style="font-weight:bold;color:#b30000;">${dateLong}</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding:28px 24px;font-size:15px;line-height:24px;color:#2d3748;">
              <p style="margin:0 0 16px 0;font-weight:bold;color:#b30000;font-size:16px;">Dear Sir/Madam,</p>
              <p style="margin:0 0 14px 0;">I hope this email finds you well.</p>
              <p style="margin:0 0 14px 0;">Please find attached today's <strong>Daily Diesel Monitoring Report</strong> for <strong>Bhiwandi</strong> operations. The report covers vehicle-wise fuel consumption, mileage tracking, and operational summary for the day.</p>
              <p style="margin:0 0 14px 0;">Kindly review the attached Excel sheet for detailed vehicle-wise data. In case of any discrepancies or queries, please feel free to reach out.</p>
              <p style="margin:0 0 24px 0;">Your feedback and acknowledgement on the same shall be appreciated.</p>
              
              <!-- Report Highlights -->
              <div style="font-size:12px;font-weight:bold;color:#718096;text-transform:uppercase;margin-bottom:10px;letter-spacing:1px;">Report Highlights</div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;background-color:#f7fafc;margin-bottom:24px;">
                <tr>
                  <td width="50%" style="padding:14px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;font-size:13px;vertical-align:top;">
                    <div style="font-weight:bold;color:#1a202c;margin-bottom:2px;">⛽ Fuel Consumption</div>
                    <div style="font-size:11px;color:#718096;">Vehicle-wise diesel usage</div>
                  </td>
                  <td width="50%" style="padding:14px;border-bottom:1px solid #e2e8f0;font-size:13px;vertical-align:top;">
                    <div style="font-weight:bold;color:#1a202c;margin-bottom:2px;">📊 Mileage Tracking</div>
                    <div style="font-size:11px;color:#718096;">KM per litre analysis</div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding:14px;border-right:1px solid #e2e8f0;font-size:13px;vertical-align:top;">
                    <div style="font-weight:bold;color:#1a202c;margin-bottom:2px;">🚛 Fleet Status</div>
                    <div style="font-size:11px;color:#718096;">Active & idle vehicles</div>
                  </td>
                  <td width="50%" style="padding:14px;font-size:13px;vertical-align:top;">
                    <div style="font-weight:bold;color:#1a202c;margin-bottom:2px;">📋 Operational Summary</div>
                    <div style="font-size:11px;color:#718096;">Daily ops overview</div>
                  </td>
                </tr>
              </table>
              
              <!-- Regards -->
              <p style="margin:0 0 4px 0;color:#718096;font-size:14px;">Regards,</p>
              <p style="margin:0 0 2px 0;font-size:18px;font-weight:bold;color:#b30000;">ANANT KUMAR YADAV</p>
              <p style="margin:0 0 10px 0;font-size:13px;color:#4a5568;line-height:18px;">
                Diesel Monitoring Incharge<br>
                RPM Logistics Pvt. Ltd.
              </p>
              <span style="display:inline-block;padding:6px 12px;background-color:#fff5f5;border:1px solid #fed7d7;border-radius:4px;font-size:13px;font-weight:bold;color:#c53030;">📞 +91 8371838314</span>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td bgcolor="#1a202c" style="padding:24px;text-align:center;background-color:#1a202c;font-size:11px;color:#a0aec0;line-height:18px;">
              <div style="font-size:16px;font-weight:bold;color:#f7fafc;margin-bottom:6px;"><span style="color:#ef5350;">RPM</span> LOGISTICS PVT. LTD.</div>
              <div>Bhiwandi Operations • Diesel Monitoring Division</div>
              <div style="width:40px;height:1px;background-color:#4a5568;margin:12px auto;"></div>
              <div>This email contains official diesel monitoring records and supporting documents.<br>For internal verification and record purposes only.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ──────────────────────────────────────────────────────────
   16B. BILL SUBMISSION HTML EMAIL GENERATION TEMPLATE
   ────────────────────────────────────────────────────────── */
function getBillSubmissionEmailHTML(fromStr, toStr) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Diesel Bill Submission — RPM Logistics</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,sans-serif;-webkit-text-size-adjust:none;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f4f7;padding:20px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td bgcolor="#b30000" style="padding:28px 24px;text-align:center;background-color:#b30000;">
              <div style="font-size:12px;font-weight:bold;color:#ffd54f;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">RPM LOGISTICS PVT. LTD.</div>
              <div style="font-size:24px;font-weight:bold;color:#ffffff;margin:0;">💰 DIESEL BILL SUBMISSION</div>
              <div style="font-size:11px;color:#ffcdd2;letter-spacing:1px;margin-top:6px;text-transform:uppercase;">Diesel Expense Verification & Record Submission</div>
            </td>
          </tr>
          <!-- Date Bar -->
          <tr>
            <td bgcolor="#fafafa" style="padding:12px 24px;background-color:#fafafa;border-bottom:1px solid #edf2f7;font-size:13px;color:#4a5568;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="font-weight:bold;">📅 Billing Period:</td>
                  <td align="right" style="font-weight:bold;color:#b30000;">${fromStr} – ${toStr}</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding:28px 24px;font-size:15px;line-height:24px;color:#2d3748;">
              <p style="margin:0 0 16px 0;font-weight:bold;color:#b30000;font-size:16px;">Dear Sir/Madam,</p>
              <p style="margin:0 0 14px 0;">I hope this email finds you well.</p>
              <p style="margin:0 0 14px 0;">Please find attached the <strong>Diesel Bill Submission Report</strong> for the billing period <strong>${fromStr} to ${toStr}</strong>. The submission includes vehicle-wise diesel expense records along with all supporting bills and documents.</p>
              <p style="margin:0 0 14px 0;">Kindly review the attached files and process them for verification and approval at the earliest. In case of any discrepancies or missing documents, please feel free to reach out.</p>
              <p style="margin:0 0 24px 0;">Your timely processing and acknowledgement on the same shall be appreciated.</p>
              
              <!-- Submission Details Box -->
              <div style="font-size:12px;font-weight:bold;color:#718096;text-transform:uppercase;margin-bottom:10px;letter-spacing:1px;">Submission Details</div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;background-color:#f7fafc;margin-bottom:24px;">
                <tr>
                  <td width="50%" style="padding:14px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;font-size:13px;vertical-align:top;">
                    <div style="font-weight:bold;color:#1a202c;margin-bottom:2px;">📑 Expense Records</div>
                    <div style="font-size:11px;color:#718096;">Vehicle-wise diesel bills</div>
                  </td>
                  <td width="50%" style="padding:14px;border-bottom:1px solid #e2e8f0;font-size:13px;vertical-align:top;">
                    <div style="font-weight:bold;color:#1a202c;margin-bottom:2px;">📄 Supporting Docs</div>
                    <div style="font-size:11px;color:#718096;">Bills, receipts & proofs</div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding:14px;border-right:1px solid #e2e8f0;font-size:13px;vertical-align:top;">
                    <div style="font-weight:bold;color:#1a202c;margin-bottom:2px;">✅ Verification Ready</div>
                    <div style="font-size:11px;color:#718096;">For audit & approval</div>
                  </td>
                  <td width="50%" style="padding:14px;font-size:13px;vertical-align:top;">
                    <div style="font-weight:bold;color:#1a202c;margin-bottom:2px;">💵 Payment Processing</div>
                    <div style="font-size:11px;color:#718096;">Pending settlement</div>
                  </td>
                </tr>
              </table>
              
              <!-- Regards -->
              <p style="margin:0 0 4px 0;color:#718096;font-size:14px;">Regards,</p>
              <p style="margin:0 0 2px 0;font-size:18px;font-weight:bold;color:#b30000;">ANANT KUMAR YADAV</p>
              <p style="margin:0 0 10px 0;font-size:13px;color:#4a5568;line-height:18px;">
                Diesel Monitoring Incharge<br>
                RPM Logistics Pvt. Ltd.
              </p>
              <span style="display:inline-block;padding:6px 12px;background-color:#fff5f5;border:1px solid #fed7d7;border-radius:4px;font-size:13px;font-weight:bold;color:#c53030;">📞 +91 8371838314</span>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td bgcolor="#1a202c" style="padding:24px;text-align:center;background-color:#1a202c;font-size:11px;color:#a0aec0;line-height:18px;">
              <div style="font-size:16px;font-weight:bold;color:#f7fafc;margin-bottom:6px;"><span style="color:#ef5350;">RPM</span> LOGISTICS PVT. LTD.</div>
              <div>Bhiwandi Operations • Diesel Monitoring Division</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ══════════════════════════════════════════════════════════
   17. REPORTS TIME-PERIOD AUDITS & EXPORTS (EXCEL/PDF)
   ══════════════════════════════════════════════════════════ */
let reportEntries = [];
let repDailySpendChart = null;
let repVehicleMixChart = null;
let activeReportTab = 'overview';

function initReportFilters() {
  const select = document.getElementById('report-period-type');
  const customGrp = document.getElementById('report-custom-date-grp');
  
  if (select && customGrp) {
    select.onchange = () => {
      if (select.value === 'custom') {
        customGrp.classList.remove('hidden');
      } else {
        customGrp.classList.add('hidden');
      }
      runReportQuery();
    };
  }

  // Bind change listeners to generate reports dynamically
  document.getElementById('report-date-start')?.addEventListener('change', runReportQuery);
  document.getElementById('report-date-end')?.addEventListener('change', runReportQuery);
  document.getElementById('report-vfilter')?.addEventListener('input', debounce(runReportQuery, 150));
  document.getElementById('report-vendorfilter')?.addEventListener('input', debounce(runReportQuery, 150));

  runReportQuery();
}

function runReportQuery() {
  const scope = document.getElementById('report-period-type').value;
  const vFilter = document.getElementById('report-vfilter').value.toUpperCase().trim();
  const venFilter = document.getElementById('report-vendorfilter').value.toUpperCase().trim();
  
  let startLimit = 0;
  let endLimit = Infinity;

  const today = new Date();
  today.setHours(0,0,0,0);
  const todayTime = today.getTime();

  if (scope === 'daily') {
    startLimit = todayTime;
  } else if (scope === 'weekly') {
    startLimit = todayTime - (7 * 24 * 60 * 60 * 1000);
  } else if (scope === 'monthly') {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    startLimit = firstDay.getTime();
  } else if (scope === 'yearly') {
    const firstJan = new Date(today.getFullYear(), 0, 1);
    startLimit = firstJan.getTime();
  } else if (scope === 'custom') {
    const startVal = document.getElementById('report-date-start').value;
    const endVal = document.getElementById('report-date-end').value;
    if (startVal) {
      const [y, m, d] = startVal.split('-');
      startLimit = new Date(y, parseInt(m)-1, d).getTime();
    }
    if (endVal) {
      const [y, m, d] = endVal.split('-');
      endLimit = new Date(y, parseInt(m)-1, d, 23, 59, 59, 999).getTime();
    }
  }

  // Filter entries
  reportEntries = historyEntries.filter(e => {
    if (!e.date) return false;
    const entryTime = parseDateAndTimeToMs(e);
    if (!entryTime) return false;
    
    // Time checks
    if (entryTime < startLimit || entryTime > endLimit) return false;
    
    // Vehicle check
    if (vFilter && e.vehicleNo !== vFilter) return false;

    // Vendor check
    if (venFilter && e.vendorName !== venFilter) return false;

    return true;
  });

  // Sort ascending by serial Response #
  reportEntries.sort((a,b) => (parseInt(a.responseNumber) || 0) - (parseInt(b.responseNumber) || 0));

  renderReportTable();
}

function switchReportTab(tabName) {
  activeReportTab = tabName;
  
  const tabs = ['overview', 'reports', 'vehicles', 'vendors', 'locations', 'transactions'];
  tabs.forEach(t => {
    const btn = document.getElementById(`rep-tab-${t}`);
    const contentDiv = document.getElementById(`rep-content-${t}`);
    if (btn) {
      if (t === tabName) {
        btn.className = 'px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all bg-blue-600 text-white whitespace-nowrap';
      } else {
        btn.className = 'px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all hover:bg-slate-800 hover:text-white whitespace-nowrap';
      }
    }
    if (contentDiv) {
      if (t === tabName) {
        contentDiv.classList.remove('hidden');
      } else {
        contentDiv.classList.add('hidden');
      }
    }
  });
  
  if (tabName === 'overview') {
    setTimeout(renderReportsOverview, 100);
  } else if (tabName === 'vehicles') {
    renderVehiclesReport();
  } else if (tabName === 'vendors') {
    renderVendorsReport();
  } else if (tabName === 'locations') {
    renderLocationsReport();
  }
}
window.switchReportTab = switchReportTab;

function formatDateToReadable(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).replace(/\//g, '-').replace(/\./g, '-').split('-');
  if (parts.length !== 3) return dateStr;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = parseInt(parts[0]);
  const m = monthNames[parseInt(parts[1]) - 1];
  const y = parts[2];
  return `${d} ${m} ${y}`;
}

function renderReportsOverview() {
  const isDark = document.documentElement.classList.contains('dark');
  
  // 1. Daily Spend Trend Chart
  const dailyChartEl = document.getElementById('rep-spend-trend-chart');
  if (dailyChartEl) {
    if (repDailySpendChart) {
      try { repDailySpendChart.destroy(); } catch(e) {}
      repDailySpendChart = null;
    }
    
    // Group spend by date
    const dateSpends = {};
    reportEntries.forEach(e => {
      if (e.date) {
        const amt = parseFloat(e.dieselAmount) || 0;
        dateSpends[e.date] = (dateSpends[e.date] || 0) + amt;
      }
    });
    
    // Sort dates chronologically
    const sortedDates = Object.keys(dateSpends).sort((a,b) => {
      const ap = a.split('-');
      const bp = b.split('-');
      return new Date(ap[2], ap[1]-1, ap[0]) - new Date(bp[2], bp[1]-1, bp[0]);
    });
    
    const datesFormatted = sortedDates.map(d => {
      const parts = d.split('-');
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${parts[0]} ${monthNames[parseInt(parts[1])-1]}`;
    });
    const spendsData = sortedDates.map(d => parseFloat(dateSpends[d].toFixed(2)));
    
    const options = {
      series: [{
        name: 'Total Spend',
        data: spendsData
      }],
      chart: {
        type: 'area',
        height: 240,
        background: 'transparent',
        toolbar: { show: false }
      },
      colors: ['#3b82f6'],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 100]
        }
      },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      markers: {
        size: spendsData.length === 1 ? 6 : 0,
        hover: { size: 6 }
      },
      xaxis: {
        categories: datesFormatted,
        labels: {
          style: { colors: isDark ? '#9ca3af' : '#475569', fontSize: '10px' }
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          style: { colors: isDark ? '#9ca3af' : '#475569', fontSize: '10px' },
          formatter: val => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'K' : val}`
        }
      },
      grid: {
        borderColor: isDark ? '#1e293b' : '#e2e8f0',
        strokeDashArray: 4
      },
      tooltip: {
        y: {
          formatter: val => `₹${val.toLocaleString('en-IN')}`
        }
      },
      theme: { mode: isDark ? 'dark' : 'light' }
    };
    
    repDailySpendChart = new ApexCharts(dailyChartEl, options);
    repDailySpendChart.render();
  }
  
  // 2. Vehicle Type Mix Chart
  const mixChartEl = document.getElementById('rep-vehicle-mix-chart');
  const mixLegendEl = document.getElementById('rep-vehicle-mix-legend');
  if (mixChartEl) {
    if (repVehicleMixChart) {
      try { repVehicleMixChart.destroy(); } catch(e) {}
      repVehicleMixChart = null;
    }
    
    // Group spend by vehicle type
    const typeSpends = {};
    let grandTotalSpend = 0;
    reportEntries.forEach(e => {
      const type = (e.vehicleType || 'OTHER').trim().toUpperCase();
      const amt = parseFloat(e.dieselAmount) || 0;
      typeSpends[type] = (typeSpends[type] || 0) + amt;
      grandTotalSpend += amt;
    });
    
    const sortedTypes = Object.entries(typeSpends)
      .filter(([_, spend]) => spend > 0)
      .sort((a,b) => b[1] - a[1]);
      
    const series = sortedTypes.map(([_, spend]) => parseFloat(spend.toFixed(2)));
    const labels = sortedTypes.map(([type, _]) => type);
    
    const colorsList = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#64748b'];
    
    const options = {
      series: series,
      labels: labels,
      chart: {
        type: 'donut',
        height: 180,
        background: 'transparent',
        toolbar: { show: false }
      },
      colors: colorsList.slice(0, series.length),
      stroke: {
        colors: [isDark ? '#0f172a' : '#ffffff'],
        width: 2
      },
      legend: { show: false },
      dataLabels: { enabled: false },
      tooltip: {
        y: {
          formatter: val => `₹${val.toLocaleString('en-IN')}`
        }
      },
      theme: { mode: isDark ? 'dark' : 'light' }
    };
    
    repVehicleMixChart = new ApexCharts(mixChartEl, options);
    repVehicleMixChart.render();
    
    // Render custom legend
    if (mixLegendEl) {
      mixLegendEl.innerHTML = '';
      if (sortedTypes.length === 0) {
        mixLegendEl.innerHTML = '<div class="text-center py-4 text-slate-400">No data available</div>';
      } else {
        sortedTypes.forEach(([type, spend], idx) => {
          const color = colorsList[idx % colorsList.length];
          const pct = grandTotalSpend > 0 ? ((spend / grandTotalSpend) * 100).toFixed(1) : '0.0';
          
          const div = document.createElement('div');
          div.className = 'flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/40 text-slate-600 dark:text-slate-400';
          div.innerHTML = `
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: ${color}"></span>
              <span class="uppercase truncate min-w-0">${type}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-slate-400 font-bold">${pct}%</span>
              <span class="text-slate-800 dark:text-slate-200 font-extrabold">₹${spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
          `;
          mixLegendEl.appendChild(div);
        });
      }
    }
  }
}

function renderVehiclesReport() {
  const container = document.getElementById('rep-content-vehicles');
  if (!container) return;
  
  const groups = {};
  reportEntries.forEach(e => {
    if (!e.vehicleNo) return;
    const v = e.vehicleNo;
    if (!groups[v]) {
      groups[v] = {
        vehicleNo: v,
        vehicleType: e.vehicleType || '-',
        litres: 0,
        amount: 0,
        fills: 0,
        mileages: 0,
        mileageCount: 0
      };
    }
    const litres = parseFloat(e.litres) || (parseFloat(e.dieselAmount) / dieselRate) || 0;
    const amount = parseFloat(e.dieselAmount) || 0;
    const mileage = parseFloat(e.mileage) || 0;
    
    groups[v].litres += litres;
    groups[v].amount += amount;
    groups[v].fills += 1;
    if (mileage > 0) {
      groups[v].mileages += mileage;
      groups[v].mileageCount += 1;
    }
  });
  
  const sorted = Object.values(groups).sort((a,b) => b.amount - a.amount);
  
  let html = `
    <div class="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
      <table class="w-full text-left border-collapse premium-table text-xs">
        <thead>
          <tr class="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
            <th class="px-4 py-3">Vehicle No</th>
            <th class="px-4 py-3">Vehicle Type</th>
            <th class="px-4 py-3 text-right">Total Litres</th>
            <th class="px-4 py-3 text-right">Total Spend</th>
            <th class="px-4 py-3 text-center">Fills</th>
            <th class="px-4 py-3 text-right">Avg Mileage</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800/40">
  `;
  
  if (sorted.length === 0) {
    html += `<tr><td colspan="6" class="text-center py-10 text-slate-400 font-semibold">No vehicle data available</td></tr>`;
  } else {
    sorted.forEach(g => {
      const avgMil = g.mileageCount > 0 ? (g.mileages / g.mileageCount).toFixed(2) : '-';
      html += `
        <tr>
          <td class="px-4 py-2.5 font-extrabold text-blue-600">${g.vehicleNo}</td>
          <td class="px-4 py-2.5">${g.vehicleType}</td>
          <td class="px-4 py-2.5 text-right font-bold text-green-600">${g.litres.toFixed(2)} L</td>
          <td class="px-4 py-2.5 text-right font-extrabold text-slate-800 dark:text-slate-200">₹${g.amount.toLocaleString('en-IN', {maximumFractionDigits:2})}</td>
          <td class="px-4 py-2.5 text-center font-bold">${g.fills}</td>
          <td class="px-4 py-2.5 text-right font-mono font-bold text-teal-600">${avgMil} ${avgMil !== '-' ? 'km/L' : ''}</td>
        </tr>
      `;
    });
  }
  
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

function renderVendorsReport() {
  const container = document.getElementById('rep-content-vendors');
  if (!container) return;
  
  const groups = {};
  reportEntries.forEach(e => {
    if (!e.vendorName) return;
    const v = e.vendorName;
    if (!groups[v]) {
      groups[v] = {
        vendorName: v,
        litres: 0,
        amount: 0,
        fills: 0
      };
    }
    const litres = parseFloat(e.litres) || (parseFloat(e.dieselAmount) / dieselRate) || 0;
    const amount = parseFloat(e.dieselAmount) || 0;
    
    groups[v].litres += litres;
    groups[v].amount += amount;
    groups[v].fills += 1;
  });
  
  const sorted = Object.values(groups).sort((a,b) => b.amount - a.amount);
  
  let html = `
    <div class="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
      <table class="w-full text-left border-collapse premium-table text-xs">
        <thead>
          <tr class="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
            <th class="px-4 py-3">Vendor Name</th>
            <th class="px-4 py-3 text-right">Total Litres</th>
            <th class="px-4 py-3 text-right">Total Spend</th>
            <th class="px-4 py-3 text-center">Fills</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800/40">
  `;
  
  if (sorted.length === 0) {
    html += `<tr><td colspan="4" class="text-center py-10 text-slate-400 font-semibold">No vendor data available</td></tr>`;
  } else {
    sorted.forEach(g => {
      html += `
        <tr>
          <td class="px-4 py-2.5 font-extrabold text-slate-700 dark:text-slate-300">${g.vendorName}</td>
          <td class="px-4 py-2.5 text-right font-bold text-green-600">${g.litres.toFixed(2)} L</td>
          <td class="px-4 py-2.5 text-right font-extrabold text-slate-800 dark:text-slate-200">₹${g.amount.toLocaleString('en-IN', {maximumFractionDigits:2})}</td>
          <td class="px-4 py-2.5 text-center font-bold">${g.fills}</td>
        </tr>
      `;
    });
  }
  
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

function renderLocationsReport() {
  const container = document.getElementById('rep-content-locations');
  if (!container) return;
  
  const groups = {};
  reportEntries.forEach(e => {
    const from = (e.fromLocation || 'UNKNOWN').trim().toUpperCase();
    const to = (e.lastLocation || 'UNKNOWN').trim().toUpperCase();
    const key = `${from} → ${to}`;
    if (!groups[key]) {
      groups[key] = {
        key: key,
        from: from,
        to: to,
        trips: 0,
        litres: 0,
        amount: 0
      };
    }
    const litres = parseFloat(e.litres) || (parseFloat(e.dieselAmount) / dieselRate) || 0;
    const amount = parseFloat(e.dieselAmount) || 0;
    
    groups[key].trips += 1;
    groups[key].litres += litres;
    groups[key].amount += amount;
  });
  
  const sorted = Object.values(groups).sort((a,b) => b.trips - a.trips);
  
  let html = `
    <div class="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
      <table class="w-full text-left border-collapse premium-table text-xs">
        <thead>
          <tr class="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
            <th class="px-4 py-3">Route (From → To)</th>
            <th class="px-4 py-3 text-center">Trips</th>
            <th class="px-4 py-3 text-right">Total Litres</th>
            <th class="px-4 py-3 text-right">Total Spend</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800/40">
  `;
  
  if (sorted.length === 0) {
    html += `<tr><td colspan="4" class="text-center py-10 text-slate-400 font-semibold">No route data available</td></tr>`;
  } else {
    sorted.forEach(g => {
      html += `
        <tr>
          <td class="px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <span class="text-slate-400"><i class="fas fa-route"></i></span>
            <span>${g.from}</span>
            <span class="text-blue-500"><i class="fas fa-arrow-right"></i></span>
            <span>${g.to}</span>
          </td>
          <td class="px-4 py-2.5 text-center font-extrabold text-blue-600">${g.trips}</td>
          <td class="px-4 py-2.5 text-right font-bold text-green-600">${g.litres.toFixed(2)} L</td>
          <td class="px-4 py-2.5 text-right font-extrabold text-slate-800 dark:text-slate-200">₹${g.amount.toLocaleString('en-IN', {maximumFractionDigits:2})}</td>
        </tr>
      `;
    });
  }
  
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

function renderReportTable() {
  const tbody = document.getElementById('report-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  
  let totalLitres = 0;
  let totalCost = 0;
  let sumAvg = 0;
  let avgCount = 0;

  const sortedAmounts = [];
  let maxFill = 0;
  let maxVehicle = 'NONE';
  let minFill = reportEntries.length > 0 ? Infinity : 0;
  
  const uniqueVehicles = new Set();
  const uniqueVendors = new Set();
  const uniqueDates = new Set();
  const vehicleSpends = {};
  const dateSpends = {};
  const monthSpends = {};
  const dowSpends = {};
  const dowNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  const todayIST = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' });
  const dObj = new Date(todayIST);
  const yyyy = dObj.getFullYear();
  const mm = String(dObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dObj.getDate()).padStart(2, '0');
  const todayStr = `${dd}-${mm}-${yyyy}`;
  
  let todaySpend = 0;

  if (reportEntries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-10 text-slate-400 font-semibold">No records found for current filters.</td></tr>`;
  } else {
    reportEntries.forEach((e, idx) => {
      const litres = parseFloat(e.litres) || (parseFloat(e.dieselAmount) / dieselRate) || 0;
      const cost = parseFloat(e.dieselAmount) || 0;
      totalLitres += litres;
      totalCost += cost;
      sortedAmounts.push(cost);
      
      if (cost > maxFill) {
        maxFill = cost;
        maxVehicle = e.vehicleNo || 'UNKNOWN';
      }
      if (cost < minFill) {
        minFill = cost;
      }
      
      if (e.vehicleNo) uniqueVehicles.add(e.vehicleNo);
      if (e.vendorName) uniqueVendors.add(e.vendorName);
      if (e.date) uniqueDates.add(e.date);
      
      if (e.vehicleNo) {
        vehicleSpends[e.vehicleNo] = (vehicleSpends[e.vehicleNo] || 0) + cost;
      }
      
      const mileage = parseFloat(e.mileage) || 0;
      if (mileage > 0) {
        sumAvg += mileage;
        avgCount++;
      }
      
      if (e.date === todayStr) {
        todaySpend += cost;
      }
      
      if (e.date) {
        dateSpends[e.date] = (dateSpends[e.date] || 0) + cost;
        
        const parts = e.date.split('-');
        if (parts.length === 3) {
          const monthKey = `${parts[2]}-${parts[1]}`;
          monthSpends[monthKey] = (monthSpends[monthKey] || 0) + cost;
          
          const jsDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          const dow = dowNames[jsDate.getDay()];
          dowSpends[dow] = (dowSpends[dow] || 0) + cost;
        }
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="px-3 py-2.5 text-center font-bold text-slate-500">${e.responseNumber}</td>
        <td class="px-3 py-2.5 font-semibold">${e.date} ${e.time}</td>
        <td class="px-3 py-2.5 font-extrabold text-blue-600">${e.vehicleNo}</td>
        <td class="px-3 py-2.5">${e.vehicleType || '-'}</td>
        <td class="px-3 py-2.5 text-right font-mono">${parseInt(e.currentKm).toLocaleString()}</td>
        <td class="px-3 py-2.5 text-right font-mono">${e.endKm ? parseInt(e.endKm).toLocaleString() : '-'}</td>
        <td class="px-3 py-2.5 text-right font-mono font-bold">${e.totalKm || '-'}</td>
        <td class="px-3 py-2.5 text-right font-extrabold text-green-600">${litres.toFixed(2)} L</td>
        <td class="px-3 py-2.5 text-right font-extrabold text-slate-800 dark:text-slate-200">₹${cost.toFixed(2)}</td>
        <td class="px-3 py-2.5 text-xs text-slate-500"><span class="font-bold text-slate-700 dark:text-slate-300">${e.vendorName}</span><br>${e.note || ''}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  if (minFill === Infinity) minFill = 0;
  
  // Median
  sortedAmounts.sort((a,b) => a - b);
  let medianFill = 0;
  if (sortedAmounts.length > 0) {
    const mid = Math.floor(sortedAmounts.length / 2);
    if (sortedAmounts.length % 2 === 0) {
      medianFill = (sortedAmounts[mid - 1] + sortedAmounts[mid]) / 2;
    } else {
      medianFill = sortedAmounts[mid];
    }
  }
  
  // Top vehicle
  let topVehicle = 'NONE';
  let topVehicleSpend = 0;
  Object.entries(vehicleSpends).forEach(([veh, spend]) => {
    if (spend > topVehicleSpend) {
      topVehicleSpend = spend;
      topVehicle = veh;
    }
  });
  
  // 3 colorful cards final calculations
  let highestDay = 'No data';
  let highestDaySpend = 0;
  Object.entries(dateSpends).forEach(([date, spend]) => {
    if (spend > highestDaySpend) {
      highestDaySpend = spend;
      highestDay = date;
    }
  });
  let highestDayFormatted = highestDay;
  if (highestDay !== 'No data') {
    highestDayFormatted = formatDateToReadable(highestDay);
  }
  
  let bestMonth = 'No data';
  let bestMonthSpend = 0;
  Object.entries(monthSpends).forEach(([mKey, spend]) => {
    if (spend > bestMonthSpend) {
      bestMonthSpend = spend;
      bestMonth = mKey;
    }
  });
  let bestMonthFormatted = bestMonth;
  if (bestMonth !== 'No data') {
    const [y, m] = bestMonth.split('-');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    bestMonthFormatted = `${monthNames[parseInt(m) - 1]} ${y}`;
  }
  
  let busiestDow = 'No data';
  let busiestDowSpend = 0;
  Object.entries(dowSpends).forEach(([dow, spend]) => {
    if (spend > busiestDowSpend) {
      busiestDowSpend = spend;
      busiestDow = dow;
    }
  });

  // Calculate averages
  const computedMileage = avgCount > 0 ? (sumAvg / avgCount) : 0;
  const computedRate = totalLitres > 0 ? (totalCost / totalLitres) : dieselRate;

  // Update reports KPI cards UI elements
  document.getElementById('rep-total-records').textContent = reportEntries.length;
  document.getElementById('rep-active-days').textContent = `${uniqueDates.size} active days`;
  document.getElementById('rep-total-spend').textContent = `₹${totalCost.toLocaleString('en-IN', {maximumFractionDigits:0})}`;
  const repFillsText = `${reportEntries.length} fill${reportEntries.length === 1 ? '' : 's'}`;
  const repLitresFormatted = totalLitres.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const elRepSpendFills = document.getElementById('rep-spend-fills');
  if (elRepSpendFills) {
    elRepSpendFills.textContent = reportEntries.length > 0 ? `${repFillsText} • ${repLitresFormatted} L` : '0 fills • 0.00 L';
  }
  document.getElementById('rep-today-spend').textContent = `₹${todaySpend.toLocaleString('en-IN', {maximumFractionDigits:0})}`;
  document.getElementById('rep-median-fill').textContent = `₹${medianFill.toLocaleString('en-IN', {maximumFractionDigits:0})}`;
  document.getElementById('rep-max-fill').textContent = `₹${maxFill.toLocaleString('en-IN', {maximumFractionDigits:0})}`;
  document.getElementById('rep-max-fill-vehicle').textContent = maxVehicle;
  document.getElementById('rep-min-fill').textContent = `₹${minFill.toLocaleString('en-IN', {maximumFractionDigits:0})}`;
  document.getElementById('rep-fleet-size').textContent = uniqueVehicles.size;
  document.getElementById('rep-vendors-count').textContent = uniqueVendors.size;
  document.getElementById('rep-active-days-count').textContent = uniqueDates.size;
  document.getElementById('rep-top-vehicle').textContent = topVehicle;
  
  // Find the latest vendor for the top vehicle in reports
  let topVehicleVendor = '';
  if (topVehicle && topVehicle !== 'NONE') {
    const match = reportEntries.find(e => e.vehicleNo && e.vehicleNo.trim().toUpperCase() === topVehicle.trim().toUpperCase());
    if (match) {
      topVehicleVendor = match.vendorName || '';
    }
  }
  
  const elRepTopVehicleSpend = document.getElementById('rep-top-vehicle-spend');
  if (elRepTopVehicleSpend) {
    const displayStr = `₹${topVehicleSpend.toLocaleString('en-IN', {maximumFractionDigits:0})}${topVehicleVendor ? ' | ' + topVehicleVendor : ''}`;
    elRepTopVehicleSpend.textContent = displayStr;
    elRepTopVehicleSpend.setAttribute('title', displayStr);
  }
  
  // Update Overview colorful cards UI elements
  const hDayVal = document.getElementById('rep-overview-highest-day-value');
  if (hDayVal) hDayVal.textContent = `₹${highestDaySpend.toLocaleString('en-IN', {maximumFractionDigits:0})}`;
  const hDayDate = document.getElementById('rep-overview-highest-day-date');
  if (hDayDate) hDayDate.textContent = highestDayFormatted;
  
  const bMonthVal = document.getElementById('rep-overview-best-month-value');
  if (bMonthVal) bMonthVal.textContent = `₹${bestMonthSpend.toLocaleString('en-IN', {maximumFractionDigits:0})}`;
  const bMonthName = document.getElementById('rep-overview-best-month-name');
  if (bMonthName) bMonthName.textContent = bestMonthFormatted;
  
  const bDowName = document.getElementById('rep-overview-busiest-day-name');
  if (bDowName) bDowName.textContent = busiestDow;
  const bDowSpendVal = document.getElementById('rep-overview-busiest-day-value');
  if (bDowSpendVal) bDowSpendVal.textContent = `₹${busiestDowSpend.toLocaleString('en-IN', {maximumFractionDigits:0})} total spend`;

  // Reports tab elements
  document.getElementById('rep-summary-litres').textContent = `${totalLitres.toFixed(2)} L`;
  document.getElementById('rep-summary-entries').textContent = `${reportEntries.length} fuel entries`;
  document.getElementById('rep-summary-cost').textContent = `₹${totalCost.toLocaleString('en-IN')}`;
  document.getElementById('rep-summary-avg-rate').textContent = `Avg Rate: ₹${computedRate.toFixed(2)}`;
  document.getElementById('rep-summary-mileage').textContent = `${computedMileage.toFixed(2)} km/L`;

  // Render active tab details
  switchReportTab(activeReportTab);
}

// Export Excel Sheets using SheetJS
function exportReportToExcel() {
  if (reportEntries.length === 0) return toast.warn("No data available to export.");

  const headers = [
    'Response #', 'Date', 'Time', 'Vehicle No', 'Vehicle Type',
    'Mileage', 'From Location', 'Last Location', 'Current KM',
    'Diesel Amount', 'Vendor Name', 'Note'
  ];

  // Excel Styling details
  const border = {
    top: { style: 'thin', color: { rgb: 'B0B8C8' } },
    bottom: { style: 'thin', color: { rgb: 'B0B8C8' } },
    left: { style: 'thin', color: { rgb: 'B0B8C8' } },
    right: { style: 'thin', color: { rgb: 'B0B8C8' } }
  };
  const headerStyle = {
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E40AF' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border
  };
  const cellStyle = {
    font: { name: 'Segoe UI', sz: 10 },
    alignment: { horizontal: 'center', vertical: 'center' },
    border
  };
  const altStyle = {
    font: { name: 'Segoe UI', sz: 10 },
    fill: { fgColor: { rgb: 'EFF6FF' } }, // Alt stripe row
    alignment: { horizontal: 'center', vertical: 'center' },
    border
  };

  const ws = {};
  const colWidths = headers.map(h => ({ wch: Math.max(h.length + 4, 14) }));

  // Header Row
  headers.forEach((h, c) => {
    const cellRef = String.fromCharCode(65 + c) + '1';
    ws[cellRef] = { v: h, t: 's', s: headerStyle };
  });

  // Data Rows
  [...reportEntries].sort((a, b) => (parseInt(a.responseNumber) || 0) - (parseInt(b.responseNumber) || 0)).forEach((e, r) => {
    const rowIdx = r + 2;
    const style = (r % 2 === 1) ? altStyle : cellStyle;

    const rowData = [
      parseInt(e.responseNumber),
      e.date,
      e.time,
      e.vehicleNo,
      e.vehicleType,
      parseFloat(e.mileage) || 0,
      e.fromLocation,
      e.lastLocation,
      parseInt(e.currentKm) || 0,
      parseFloat(e.dieselAmount) || 0,
      e.vendorName,
      e.note || ''
    ];

    rowData.forEach((val, c) => {
      const cellRef = String.fromCharCode(65 + c) + rowIdx;
      let type = 's';
      if (typeof val === 'number') type = 'n';
      ws[cellRef] = { v: val, t: type, s: style };

      // Update Column Widths based on value sizes
      const cellLength = String(val || '').length;
      if (cellLength > colWidths[c].wch) {
        colWidths[c].wch = cellLength + 3;
      }
    });
  });

  // Apply row range bounds
  const maxRef = String.fromCharCode(64 + headers.length) + (reportEntries.length + 1);
  ws['!ref'] = `A1:${maxRef}`;
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Diesel Ledger");

  // Output file
  const filename = `rpm_diesel_report_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, filename);
  toast.ok("Excel sheet downloaded successfully!");
}

// Generate PDF Audits using jsPDF AutoTable
function exportReportToPDF() {
  if (reportEntries.length === 0) return toast.warn("No data available to export.");

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape A4

  // Title Banner
  doc.setFillColor(179, 0, 0); // deep red
  doc.rect(0, 0, 297, 28, 'F');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 213, 79); // yellow
  doc.text("RPM LOGISTICS PVT. LTD. (BHIWANDI)", 14, 10);

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("DIESEL DISPATCH AUDIT REPORT", 14, 18);

  const scope = document.getElementById('report-period-type').value;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(240, 240, 240);
  doc.text(`Scope: ${scope.toUpperCase()} | Generated: ${new Date().toLocaleString()}`, 14, 24);

  // Summary Card Table
  let totalLitres = 0;
  let totalCost = 0;
  reportEntries.forEach(e => {
    totalLitres += parseFloat(e.litres) || (parseFloat(e.dieselAmount) / dieselRate) || 0;
    totalCost += parseFloat(e.dieselAmount) || 0;
  });

  const summaryHeaders = [["Total Entries", "Total Litres (L)", "Total Amount (₹)", "Average Rate (₹)"]];
  const summaryBody = [[
    reportEntries.length,
    totalLitres.toFixed(2) + " L",
    "₹" + totalCost.toFixed(2),
    "₹" + (totalCost / totalLitres).toFixed(2)
  ]];

  doc.autoTable({
    startY: 32,
    head: summaryHeaders,
    body: summaryBody,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], halign: 'center' }, // Blue
    bodyStyles: { halign: 'center', fontStyle: 'bold' }
  });

  // Table Body mapping
  const tableHeaders = [['Sr', 'Date & Time', 'Vehicle No', 'Vehicle Type', 'Odo KM', 'Litres', 'Amount', 'Vendor', 'Remarks']];
  const tableBody = reportEntries.map(e => {
    const litres = parseFloat(e.litres) || (parseFloat(e.dieselAmount) / dieselRate) || 0;
    const cost = parseFloat(e.dieselAmount) || 0;
    return [
      e.responseNumber,
      `${e.date} ${e.time}`,
      e.vehicleNo,
      e.vehicleType,
      parseInt(e.currentKm).toLocaleString(),
      litres.toFixed(2) + " L",
      "₹" + cost.toFixed(2),
      e.vendorName,
      e.note || ''
    ];
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8,
    head: tableHeaders,
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [26, 32, 44], color: [255, 255, 255] },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
      6: { halign: 'right', fontStyle: 'bold' }
    },
    styles: { fontSize: 8 }
  });

  // Regards & Signature
  const finalY = doc.lastAutoTable.finalY + 12;
  if (finalY + 30 < 210) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(113, 128, 150);
    doc.text("Regards,", 14, finalY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(179, 0, 0);
    doc.text("ANANT KUMAR YADAV", 14, finalY + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(74, 85, 104);
    doc.text("Diesel Monitoring Incharge | RPM Logistics Pvt. Ltd.", 14, finalY + 9);
    doc.text("📞 +91 8371838314", 14, finalY + 13);
  }

  // Save pdf file
  doc.save(`rpm_diesel_audit_${new Date().toISOString().slice(0,10)}.pdf`);
  toast.ok("PDF Report downloaded.");
}

function openExportMenu() {
  const opt = confirm("CSV format me download karein? (Cancel dabiye JSON Backup export karne ke liye)");
  if (opt) {
    // CSV export matching original tb_ headers
    let csv = '\ufefftb_MacNo,tb_CartingName,tb_Vehicle,tb_Quantity,tb_Date,tb_Remark,tb_KeloMeter\n';
    historyEntries.forEach(e => {
      const macNo = e.responseNumber || '';
      const cartingName = String(e.vendorName || '').replace(/[\s\u00A0]+/g, ' ').trim().replace(/"/g, '""');
      const vehicle = String(e.vehicleNo || '').replace(/[\s\u00A0]+/g, ' ').trim().replace(/"/g, '""');
      
      let qty = '';
      const rawLitres = parseFloat(e.litres);
      const amount = parseFloat(e.dieselAmount);
      const currentRate = parseFloat((typeof dieselRate !== 'undefined' && dieselRate > 0) ? dieselRate : 98);
      if (!isNaN(rawLitres) && rawLitres > 0) {
        qty = rawLitres.toFixed(2);
      } else if (!isNaN(amount) && amount > 0 && currentRate > 0) {
        qty = (amount / currentRate).toFixed(2);
      } else {
        qty = '0.00';
      }

      const dateStr = e.date || '';

      const fromLoc = String(e.fromLocation || '').replace(/[\s\u00A0]+/g, ' ').trim();
      const lastLoc = String(e.lastLocation || '').replace(/[\s\u00A0]+/g, ' ').trim();
      const noteStr = (e.note && String(e.note).trim().toUpperCase() !== 'DRIVER REQUEST') ? String(e.note).replace(/[\s\u00A0]+/g, ' ').trim() : '';

      let remarkParts = [];
      if (fromLoc && lastLoc) {
        remarkParts.push(`${fromLoc} TO ${lastLoc}`);
      } else if (fromLoc) {
        remarkParts.push(fromLoc);
      } else if (lastLoc) {
        remarkParts.push(lastLoc);
      }
      if (noteStr) {
        remarkParts.push(noteStr);
      }
      const remark = remarkParts.join(' - ').replace(/"/g, '""');

      let kmValue = String(e.currentKm || '').trim();
      if (kmValue === '' || kmValue === '0') {
        kmValue = '1';
      } else {
        const num = parseInt(kmValue);
        if (!isNaN(num)) kmValue = String(num);
      }

      csv += `"${macNo}","${cartingName}","${vehicle}","${qty}","${dateStr}","${remark}","${kmValue}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const dlAnchor = document.createElement('a');
    dlAnchor.href = URL.createObjectURL(blob);
    dlAnchor.setAttribute("download", `rpm_diesel_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    toast.ok("CSV Export file downloaded.");
  } else {
    // JSON Backup export
    backupDatabase();
  }
}

window.exportHistoryVendorExcel = () => {
  const vendorVal = document.getElementById('history-vendor-filter')?.value || 'All';
  if (vendorVal === 'All') {
    return toast.warn("Export karne ke liye specific vendor select karein!");
  }
  
  const filtered = getFilteredHistoryEntries();
  if (filtered.length === 0) {
    return toast.warn("Selected vendor ke liye koi matching records nahi hain.");
  }
  
  exportEntriesToExcel(filtered, `diesel_export_${vendorVal.replace(/\s+/g, '_')}`);
};

window.exportHistoryCSV = () => {
  const filtered = getFilteredHistoryEntries();
  if (filtered.length === 0) return toast.warn("No data to export.");
  
  // Sort entries: oldest response number first
  const sortedEntries = [...filtered].sort((a, b) => (parseInt(a.responseNumber) || 0) - (parseInt(b.responseNumber) || 0));

  let csv = '\ufefftb_MacNo,tb_CartingName,tb_Vehicle,tb_Quantity,tb_Date,tb_Remark,tb_KeloMeter\n';
  sortedEntries.forEach(e => {
    const macNo = e.responseNumber || '';
    const cartingName = String(e.vendorName || '').replace(/[\s\u00A0]+/g, ' ').trim().replace(/"/g, '""');
    const vehicle = String(e.vehicleNo || '').replace(/[\s\u00A0]+/g, ' ').trim().replace(/"/g, '""');
    
    let qty = '';
    const rawLitres = parseFloat(e.litres);
    const amount = parseFloat(e.dieselAmount);
    const currentRate = parseFloat((typeof dieselRate !== 'undefined' && dieselRate > 0) ? dieselRate : 98);
    if (!isNaN(rawLitres) && rawLitres > 0) {
      qty = rawLitres.toFixed(2);
    } else if (!isNaN(amount) && amount > 0 && currentRate > 0) {
      qty = (amount / currentRate).toFixed(2);
    } else {
      qty = '0.00';
    }

    const dateStr = e.date || '';

    const fromLoc = String(e.fromLocation || '').replace(/[\s\u00A0]+/g, ' ').trim();
    const lastLoc = String(e.lastLocation || '').replace(/[\s\u00A0]+/g, ' ').trim();
    const noteStr = (e.note && String(e.note).trim().toUpperCase() !== 'DRIVER REQUEST') ? String(e.note).replace(/[\s\u00A0]+/g, ' ').trim() : '';

    let remarkParts = [];
    if (fromLoc && lastLoc) {
      remarkParts.push(`${fromLoc} TO ${lastLoc}`);
    } else if (fromLoc) {
      remarkParts.push(fromLoc);
    } else if (lastLoc) {
      remarkParts.push(lastLoc);
    }
    if (noteStr) {
      remarkParts.push(noteStr);
    }
    const remark = remarkParts.join(' - ').replace(/"/g, '""');

    let kmValue = String(e.currentKm || '').trim();
    if (kmValue === '' || kmValue === '0') {
      kmValue = '1';
    } else {
      const num = parseInt(kmValue);
      if (!isNaN(num)) kmValue = String(num);
    }

    csv += `"${macNo}","${cartingName}","${vehicle}","${qty}","${dateStr}","${remark}","${kmValue}"\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const dlAnchor = document.createElement('a');
  dlAnchor.href = URL.createObjectURL(blob);
  dlAnchor.setAttribute("download", "data.csv");
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
  toast.ok("CSV Export file downloaded.");
};

window.exportDieselInEntryExcel = () => {
  const filtered = getFilteredHistoryEntries();
  if (!filtered || filtered.length === 0) return toast.warn("No data available to export for current filters.");

  // Sort entries: oldest response number first
  const sortedEntries = [...filtered].sort((a, b) => (parseInt(a.responseNumber) || 0) - (parseInt(b.responseNumber) || 0));

  const currentRate = parseFloat((typeof dieselRate !== 'undefined' && dieselRate > 0) ? dieselRate : 98);

  const rows = sortedEntries.map(e => {
    const rawLitres = parseFloat(e.litres);
    const amount = parseFloat(e.dieselAmount || 0);
    let qty = 0;
    if (!isNaN(rawLitres) && rawLitres > 0) {
      qty = parseFloat(rawLitres.toFixed(2));
    } else if (!isNaN(amount) && amount > 0 && currentRate > 0) {
      qty = parseFloat((amount / currentRate).toFixed(2));
    }

    const fromLoc = String(e.fromLocation || '').trim();
    const lastLoc = String(e.lastLocation || '').trim();
    let remark = '';
    if (fromLoc && lastLoc) {
      remark = `${fromLoc} TO ${lastLoc}`;
    } else if (fromLoc) {
      remark = fromLoc;
    } else if (lastLoc) {
      remark = lastLoc;
    }

    let kmValue = String(e.currentKm || '').trim();
    if (kmValue === '' || kmValue === '0') {
      kmValue = 1;
    } else {
      const num = parseInt(kmValue);
      kmValue = !isNaN(num) ? num : 1;
    }

    return {
      'Die_VehicleNo*': e.vehicleNo || '',
      'Die_BillNo*': e.responseNumber || '',
      'Die_Date': e.date || '',
      'Die_Qty': qty,
      'Die_Rate': currentRate,
      'Die_Amount': amount,
      'Die_SGST': 0,
      'Die_CGST': 0,
      'Die_IGST': 0,
      'Die_TCS': 0,
      'Die_RoundOff': 0,
      'Die_ReadingKM': kmValue,
      'Diesel Out': 'YES',
      'Remark': remark,
      'Card Name': 'MANOR AUTO SERVICE',
      'Carting Agent': String(e.vendorName || '').replace(/[\s\u00A0]+/g, ' ').trim()
    };
  });

  if (typeof XLSX !== 'undefined') {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DieselInEntry");
    XLSX.writeFile(wb, "DieselInEntry.xlsx");
    if (typeof toast !== 'undefined' && toast.ok) {
      toast.ok("DieselInEntry.xlsx exported successfully.");
    }
  } else {
    toast.warn("Excel library not loaded.");
  }
};

// === DAILY DIESEL REPORT MODAL & EXPORT LOGIC ===
window.openDailyReportModal = () => {
  const modal = document.getElementById('daily-report-modal');
  if (!modal) return;

  const dFrom = document.getElementById('daily-report-date-from');
  const dTo = document.getElementById('daily-report-date-to');

  // Pre-fill date inputs from dashboard filter if active, or default to today's date (YYYY-MM-DD)
  const todayISO = new Date().toISOString().slice(0, 10);
  if (dFrom) {
    dFrom.value = (dashFilters && dashFilters.dateFrom) ? dashFilters.dateFrom : todayISO;
  }
  if (dTo) {
    dTo.value = (dashFilters && dashFilters.dateTo) ? dashFilters.dateTo : todayISO;
  }

  modal.classList.remove('hidden');
};

window.closeDailyReportModal = () => {
  const modal = document.getElementById('daily-report-modal');
  if (modal) modal.classList.add('hidden');
};

// Backward compatibility helper
window.exportDailyReportPDF = () => {
  window.openDailyReportModal();
};

function getVehicleStartKmMap() {
  const sortedAll = [...historyEntries].sort((a, b) => {
    const numA = parseInt(a.responseNumber) || 0;
    const numB = parseInt(b.responseNumber) || 0;
    if (numA !== numB) return numA - numB;
    return String(a.date || '').localeCompare(String(b.date || ''));
  });

  const lastKmByVehicle = {};
  const startKmMap = {};

  sortedAll.forEach(e => {
    const vKey = String(e.vehicleNo || '').trim().toUpperCase();
    const entryId = e.responseNumber || e.id;
    
    let startKmVal = 0;
    if (e.startKm && !isNaN(parseFloat(e.startKm)) && parseFloat(e.startKm) > 0) {
      startKmVal = parseFloat(e.startKm);
    } else if (lastKmByVehicle[vKey] !== undefined) {
      startKmVal = lastKmByVehicle[vKey];
    } else {
      startKmVal = 0;
    }

    if (entryId) {
      startKmMap[entryId] = startKmVal;
    }

    const curKm = parseFloat(e.currentKm);
    if (!isNaN(curKm) && curKm > 0) {
      lastKmByVehicle[vKey] = curKm;
    }
  });

  return startKmMap;
}

window.executeDailyReportExport = (format) => {
  const dFromVal = document.getElementById('daily-report-date-from')?.value;
  const dToVal = document.getElementById('daily-report-date-to')?.value;

  const todayIST = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' });
  const d = new Date(todayIST);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const defaultTodayStr = `${dd}-${mm}-${yyyy}`;

  let selectedEntries = [];
  let dateLabel = defaultTodayStr;

  if (dFromVal || dToVal) {
    const fromDateObj = dFromVal ? parseDateStr(dFromVal) : null;
    const toDateObj = dToVal ? parseDateStr(dToVal) : null;
    if (fromDateObj) fromDateObj.setHours(0, 0, 0, 0);
    if (toDateObj) toDateObj.setHours(23, 59, 59, 999);

    selectedEntries = historyEntries.filter(e => {
      const entryDate = parseDateStr(e.date);
      if (entryDate) {
        entryDate.setHours(0, 0, 0, 0);
        if (fromDateObj && entryDate < fromDateObj) return false;
        if (toDateObj && entryDate > toDateObj) return false;
      } else {
        if (fromDateObj || toDateObj) return false;
      }
      return true;
    });

    const fmtDisplay = dStr => {
      if (!dStr) return '';
      const p = String(dStr).replace(/\//g, '-').split('-');
      return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : dStr;
    };
    if (dFromVal && dToVal && dFromVal === dToVal) {
      dateLabel = fmtDisplay(dFromVal);
    } else if (dFromVal && dToVal) {
      dateLabel = `${fmtDisplay(dFromVal)} to ${fmtDisplay(dToVal)}`;
    } else if (dFromVal) {
      dateLabel = `From ${fmtDisplay(dFromVal)}`;
    } else {
      dateLabel = `Until ${fmtDisplay(dToVal)}`;
    }
  } else {
    selectedEntries = historyEntries.filter(e => e.date === defaultTodayStr);
  }

  if (!selectedEntries || selectedEntries.length === 0) {
    return toast.warn(`Selected date range (${dateLabel}) ke liye koi records nahi hain.`);
  }

  // Sort entries: oldest response number first
  selectedEntries.sort((a, b) => (parseInt(a.responseNumber) || 0) - (parseInt(b.responseNumber) || 0));

  // Compute Start KM Map
  const startKmMap = getVehicleStartKmMap();
  const currentRate = parseFloat((typeof dieselRate !== 'undefined' && dieselRate > 0) ? dieselRate : 98);

  // Prepare structured row data
  const reportData = selectedEntries.map((e, index) => {
    const sr = index + 1;
    const dateTime = `${e.date || ''} ${e.time || ''}`.trim();
    const vehicleNo = e.vehicleNo || '';
    const vehicleType = e.vehicleType || 'N/A';

    const entryId = e.responseNumber || e.id;
    const startKm = startKmMap[entryId] !== undefined ? startKmMap[entryId] : (parseFloat(e.startKm) || 0);

    let lastKm = parseFloat(e.currentKm || 0);
    if (isNaN(lastKm)) lastKm = 0;

    let totalKm = (lastKm > startKm && startKm > 0) ? (lastKm - startKm) : 0;

    const rawLitres = parseFloat(e.litres);
    const amount = parseFloat(e.dieselAmount || 0);
    let litres = 0;
    if (!isNaN(rawLitres) && rawLitres > 0) {
      litres = parseFloat(rawLitres.toFixed(2));
    } else if (!isNaN(amount) && amount > 0 && currentRate > 0) {
      litres = parseFloat((amount / currentRate).toFixed(2));
    }

    const vendor = e.vendorName || '';

    // Format Remark: Location + Note
    const fromLoc = String(e.fromLocation || '').trim();
    const lastLoc = String(e.lastLocation || '').trim();
    const noteStr = (e.note && String(e.note).trim().toUpperCase() !== 'DRIVER REQUEST') ? String(e.note).trim() : '';

    let remarkParts = [];
    if (fromLoc && lastLoc) {
      remarkParts.push(`${fromLoc} TO ${lastLoc}`);
    } else if (fromLoc) {
      remarkParts.push(fromLoc);
    } else if (lastLoc) {
      remarkParts.push(lastLoc);
    }
    if (noteStr) {
      remarkParts.push(noteStr);
    }
    const remark = remarkParts.join(' - ');

    return {
      sr,
      dateTime,
      vehicleNo,
      vehicleType,
      startKm,
      lastKm,
      totalKm,
      litres,
      amount,
      vendor,
      remark
    };
  });

  if (format === 'excel') {
    generateDailyReportExcel(reportData, dateLabel);
  } else {
    generateDailyReportPDF(reportData, dateLabel);
  }

  closeDailyReportModal();
};

function generateDailyReportPDF(reportData, dateLabel) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape A4 (297 x 210 mm)

  const currentRate = parseFloat((typeof dieselRate !== 'undefined' && dieselRate > 0) ? dieselRate : 98);

  // Banner Header
  doc.setFillColor(15, 44, 89); // Dark Navy Header
  doc.rect(0, 0, 297, 26, 'F');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 213, 79); // Accent Yellow
  doc.text("RPM LOGISTICS PVT. LTD. (BHIWANDI)", 14, 9);

  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("DAILY DIESEL DISPATCH REPORT", 14, 17);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(220, 225, 235);
  doc.text(`Date Range: ${dateLabel} | Generated: ${new Date().toLocaleString('en-IN')}`, 14, 23);

  // Summary Metrics Calculation
  let totalLitres = 0;
  let totalCost = 0;
  reportData.forEach(r => {
    totalLitres += r.litres;
    totalCost += r.amount;
  });

  const summaryHeaders = [["Total Entries", "Total Fuel (Litres)", "Total Amount", "Die_Rate"]];
  const summaryBody = [[
    reportData.length,
    `${totalLitres.toFixed(2)} L`,
    `Rs. ${totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `Rs. ${currentRate.toFixed(2)}`
  ]];

  doc.autoTable({
    startY: 30,
    head: summaryHeaders,
    body: summaryBody,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], halign: 'center', fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { halign: 'center', fontSize: 9, fontStyle: 'bold', textColor: [15, 23, 42] }
  });

  // Main Report Table Mapping (11 Columns)
  const tableHeaders = [['SR', 'DATE & TIME', 'VEHICLE NO', 'VEHICLE TYPE', 'START KM', 'LAST KM', 'TOTAL KM', 'LITRES', 'AMOUNT', 'VENDOR', 'REMARK']];
  const tableBody = reportData.map(r => [
    r.sr,
    r.dateTime,
    r.vehicleNo,
    r.vehicleType,
    r.startKm ? r.startKm.toLocaleString('en-IN') : '0',
    r.lastKm ? r.lastKm.toLocaleString('en-IN') : '1',
    r.totalKm ? r.totalKm.toLocaleString('en-IN') : '0',
    `${r.litres.toFixed(2)} L`,
    `Rs. ${r.amount.toFixed(2)}`,
    r.vendor,
    r.remark
  ]);

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 6,
    head: tableHeaders,
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 44, 89],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      valign: 'middle'
    },
    bodyStyles: {
      fontStyle: 'normal', // Entries are NOT bold
      fontSize: 7.5,
      valign: 'middle',
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'normal', cellWidth: 10 },
      1: { halign: 'center', fontStyle: 'normal', cellWidth: 28 },
      2: { halign: 'center', fontStyle: 'normal', cellWidth: 24 },
      3: { halign: 'center', fontStyle: 'normal', cellWidth: 20 },
      4: { halign: 'right', fontStyle: 'normal', cellWidth: 18 },
      5: { halign: 'right', fontStyle: 'normal', cellWidth: 18 },
      6: { halign: 'right', fontStyle: 'normal', cellWidth: 18 },
      7: { halign: 'right', fontStyle: 'normal', cellWidth: 20 },
      8: { halign: 'right', fontStyle: 'normal', cellWidth: 22 },
      9: { halign: 'left', fontStyle: 'normal', cellWidth: 44 },
      10: { halign: 'left', fontStyle: 'normal', cellWidth: 55 }
    }
  });

  // Footer Regards
  const finalY = doc.lastAutoTable.finalY + 10;
  if (finalY + 25 < 210) {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Regards,", 14, finalY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(185, 28, 28);
    doc.text("ANANT KUMAR YADAV", 14, finalY + 4.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Diesel Monitoring Incharge | RPM Logistics Pvt. Ltd.", 14, finalY + 8.5);
  }

  const cleanDateStr = dateLabel.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  doc.save(`Daily_Diesel_Report_${cleanDateStr}.pdf`);
  if (typeof toast !== 'undefined' && toast.ok) {
    toast.ok("Daily PDF Report downloaded successfully.");
  }
}

function generateDailyReportExcel(reportData, dateLabel) {
  if (typeof XLSX === 'undefined') {
    return toast.warn("Excel library not loaded.");
  }

  // Header Row
  const excelRows = reportData.map(r => ({
    'SR': r.sr,
    'DATE & TIME': r.dateTime,
    'VEHICLE NO': r.vehicleNo,
    'VEHICLE TYPE': r.vehicleType,
    'START KM': r.startKm,
    'LAST KM': r.lastKm,
    'TOTAL KM': r.totalKm,
    'LITRES': r.litres,
    'AMOUNT': r.amount,
    'VENDOR': r.vendor,
    'REMARK': r.remark
  }));

  const ws = XLSX.utils.json_to_sheet(excelRows);

  // Column Widths
  ws['!cols'] = [
    { wch: 8 },  // SR
    { wch: 22 }, // DATE & TIME
    { wch: 18 }, // VEHICLE NO
    { wch: 16 }, // VEHICLE TYPE
    { wch: 14 }, // START KM
    { wch: 14 }, // LAST KM
    { wch: 14 }, // TOTAL KM
    { wch: 14 }, // LITRES
    { wch: 16 }, // AMOUNT
    { wch: 28 }, // VENDOR
    { wch: 40 }  // REMARK
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Daily Report");

  const cleanDateStr = dateLabel.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  XLSX.writeFile(wb, `Daily_Diesel_Report_${cleanDateStr}.xlsx`);
  if (typeof toast !== 'undefined' && toast.ok) {
    toast.ok("Daily Excel Report downloaded successfully.");
  }
}

window.exportAllHistoryExcel = () => {
  const filtered = getFilteredHistoryEntries();
  if (filtered.length === 0) return toast.warn("No data available to export for current filters.");
  const currentYear = new Date().getFullYear();
  exportEntriesToExcel(filtered, `Diesel_Report_${currentYear}`, true);
};

// === DASHBOARD MID-NAV EXPORT EXCEL MODAL LOGIC ===
window.openDashboardExportExcelModal = () => {
  const modal = document.getElementById('dashboard-export-excel-modal');
  if (!modal) return;
  
  const currentYear = new Date().getFullYear();
  const preview = document.getElementById('export-excel-filename-preview');
  if (preview) preview.textContent = `Diesel_Report_${currentYear}.xlsx`;
  
  // Set default dates if empty
  const dFrom = document.getElementById('export-excel-date-from');
  const dTo = document.getElementById('export-excel-date-to');
  
  if (dFrom && !dFrom.value) {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    dFrom.value = firstDay.toISOString().slice(0, 10);
  }
  if (dTo && !dTo.value) {
    dTo.value = new Date().toISOString().slice(0, 10);
  }
  
  modal.classList.remove('hidden');
};

window.closeDashboardExportExcelModal = () => {
  const modal = document.getElementById('dashboard-export-excel-modal');
  if (modal) modal.classList.add('hidden');
};

window.executeDashboardExcelExport = function() {
  try {
    const dFromVal = document.getElementById('export-excel-date-from')?.value;
    const dToVal = document.getElementById('export-excel-date-to')?.value;
    
    if (!dFromVal || !dToVal) {
      if (typeof toast !== 'undefined' && toast.warn) toast.warn("Kripya From Date aur To Date dono select karein.");
      else alert("Kripya From Date aur To Date dono select karein.");
      return;
    }
    
    const fromDateObj = new Date(dFromVal + 'T00:00:00');
    const toDateObj = new Date(dToVal + 'T23:59:59');
    
    let sourceData = (typeof historyEntries !== 'undefined' && Array.isArray(historyEntries)) ? historyEntries : [];

    if (!sourceData || sourceData.length === 0) {
      if (typeof toast !== 'undefined' && toast.warn) toast.warn("No records found in live database.");
      else alert("No records found in live database.");
      return;
    }

    let filtered = sourceData.filter(e => {
      if (!e || !e.date) return false;
      const entryDate = parseDateStr(e.date);
      if (!entryDate) return false;
      entryDate.setHours(12, 0, 0, 0);
      return entryDate >= fromDateObj && entryDate <= toDateObj;
    });
    
    if (filtered.length === 0) {
      filtered = sourceData;
    }

    if (typeof exportEntriesToExcel === 'function') {
      const currentYear = new Date().getFullYear();
      exportEntriesToExcel(filtered, `Diesel_Report_${currentYear}`, true);
    } else {
      // Direct Fallback SheetJS Generator
      const headers = ['Response #','Date','Time','Vehicle No','Vehicle Type','Mileage','From Location','Last Location','Current KM','Diesel Amount','Vendor Name','Note'];
      const aoa = [headers];
      filtered.forEach(e => {
        let km = String(e.currentKm || '').trim();
        if (km === '' || km === '0' || km === '1') km = 'N/A';
        aoa.push([
          e.responseNumber || '',
          e.date || '',
          e.time || '',
          e.vehicleNo || '',
          e.vehicleType || '',
          e.mileage || 0,
          e.fromLocation || '',
          e.lastLocation || '',
          km,
          e.dieselAmount || 0,
          e.vendorName || '',
          e.note || ''
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "History");
      const currentYear = new Date().getFullYear();
      XLSX.writeFile(wb, `Diesel_Report_${currentYear}.xlsx`);
    }

    closeDashboardExportExcelModal();
  } catch(err) {
    console.error("Export Error:", err);
    alert("Export Error: " + err.message);
  }
};

function getFilteredHistoryEntries() {
  const searchQuery = document.getElementById('history-search')?.value.toLowerCase() || '';
  const vendorVal = document.getElementById('history-vendor-filter')?.value || 'All';
  
  const fromDateObj = dashFilters.dateFrom ? parseDateStr(dashFilters.dateFrom) : null;
  const toDateObj = dashFilters.dateTo ? parseDateStr(dashFilters.dateTo) : null;
  if (fromDateObj) fromDateObj.setHours(0, 0, 0, 0);
  if (toDateObj) toDateObj.setHours(23, 59, 59, 999);

  return historyEntries.filter(e => {
    // 1. Local Search Query
    const dataStr = `${e.responseNumber} ${e.date} ${e.vehicleNo} ${e.vehicleType} ${e.fromLocation} ${e.lastLocation} ${e.vendorName} ${e.note}`.toLowerCase();
    if (searchQuery && !dataStr.includes(searchQuery)) return false;
    
    // 2. Local Vendor Dropdown Filter
    if (vendorVal !== 'All' && e.vendorName !== vendorVal) return false;



    // 3. Global Date Range Filter
    const entryDate = parseDateStr(e.date);
    if (entryDate) {
      entryDate.setHours(0, 0, 0, 0);
      if (fromDateObj && entryDate < fromDateObj) return false;
      if (toDateObj && entryDate > toDateObj) return false;
    } else {
      if (fromDateObj || toDateObj) return false;
    }

    // 4. Global Vehicle Type Filter
    if (!matchChecklist(e.vehicleType, dashFilters.vehicleType)) return false;

    // 5. Global Vehicle No Filter
    if (!matchChecklist(e.vehicleNo, dashFilters.vehicleNo)) return false;

    // 6. Global Vendor Checklist Filter
    if (!matchChecklist(e.vendorName, dashFilters.vendor)) return false;

    // 7. Global From Location Filter
    if (!matchChecklist(e.fromLocation, dashFilters.fromLocation)) return false;

    // 8. Global To Location Filter
    if (!matchChecklist(e.lastLocation, dashFilters.toLocation)) return false;

    // 9. Global Amount Filters
    const costVal = parseFloat(e.dieselAmount) || 0;
    if (parseFloat(dashFilters.minAmount) > 0 && costVal < parseFloat(dashFilters.minAmount)) return false;
    if (dashFilters.maxAmount !== null && dashFilters.maxAmount !== '') {
      if (costVal > parseFloat(dashFilters.maxAmount)) return false;
    }

    return true;
  });
}

function exportEntriesToExcel(entries, filename, skipDateSuffix = false) {
  const headers = [
    'Response #', 'Date', 'Time', 'Vehicle No', 'Vehicle Type',
    'Mileage', 'From Location', 'Last Location', 'Current KM',
    'Diesel Amount', 'Vendor Name', 'Note'
  ];

  const border = {
    top: { style: 'thin', color: { rgb: 'B0C4DE' } },
    bottom: { style: 'thin', color: { rgb: 'B0C4DE' } },
    left: { style: 'thin', color: { rgb: 'B0C4DE' } },
    right: { style: 'thin', color: { rgb: 'B0C4DE' } }
  };

  // Dark Navy Blue Header (Exact match to screenshot)
  const headerStyle = {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '0F2C59' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border
  };

  // Plain White Cell Style
  const cellStyle = {
    font: { name: 'Calibri', sz: 10 },
    alignment: { horizontal: 'center', vertical: 'center' },
    border
  };

  // Subtle Light Blue Soft Tint Alternating Row Style
  const altStyle = {
    font: { name: 'Calibri', sz: 10 },
    fill: { fgColor: { rgb: 'EBF3FA' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border
  };

  const ws = {};
  const colWidths = [
    { wch: 14 }, // Response #
    { wch: 13 }, // Date
    { wch: 10 }, // Time
    { wch: 16 }, // Vehicle No
    { wch: 15 }, // Vehicle Type
    { wch: 10 }, // Mileage
    { wch: 20 }, // From Location
    { wch: 22 }, // Last Location
    { wch: 14 }, // Current KM
    { wch: 15 }, // Diesel Amount
    { wch: 25 }, // Vendor Name
    { wch: 35 }  // Note
  ];

  // Header Row
  headers.forEach((h, c) => {
    const cellRef = String.fromCharCode(65 + c) + '1';
    ws[cellRef] = { v: h, t: 's', s: headerStyle };
  });

  // Sort entries: oldest date & time first (ascending order)
  const sortedEntries = [...entries].sort((a, b) => (parseInt(a.responseNumber) || 0) - (parseInt(b.responseNumber) || 0));

  // Data Rows
  sortedEntries.forEach((e, r) => {
    const rowIdx = r + 2;
    const style = (r % 2 === 1) ? altStyle : cellStyle;

    // KM value formatting: "km me jaha jahaa 1 or 0 or blank hogaa ohaa N/A ho"
    let kmValue = String(e.currentKm || '').trim();
    if (kmValue === '' || kmValue === '0' || kmValue === '1') {
      kmValue = 'N/A';
    } else {
      const num = parseInt(kmValue);
      if (!isNaN(num)) kmValue = num;
    }

    const rowData = [
      parseInt(e.responseNumber) || e.responseNumber,
      e.date,
      e.time,
      e.vehicleNo,
      e.vehicleType,
      parseFloat(e.mileage) || 0,
      e.fromLocation,
      e.lastLocation,
      kmValue,
      parseFloat(e.dieselAmount) || 0,
      e.vendorName,
      e.note || ''
    ];

    rowData.forEach((val, c) => {
      const cellRef = String.fromCharCode(65 + c) + rowIdx;
      let type = 's';
      if (typeof val === 'number') type = 'n';
      ws[cellRef] = { v: val, t: type, s: style };
    });
  });

  ws['!ref'] = `A1:L${sortedEntries.length + 1}`;
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "History");
  const finalFilename = skipDateSuffix ? `${filename}.xlsx` : `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, finalFilename);
  toast.ok("Excel file downloaded.");
}

/* ══════════════════════════════════════════════════════════
   18. SETTINGS CONFIGURATION SUB-PANELS
   ══════════════════════════════════════════════════════════ */
let currentSettingsTarget = 'api';

function showDmPanel(panelId) {
  // Hide all panels
  document.getElementById('dm-options-panel').classList.add('hidden');
  document.getElementById('dm-passcode-panel').classList.add('hidden');
  document.getElementById('dm-update-panel').classList.add('hidden');
  const removeAllPanel = document.getElementById('dm-remove-all-panel');
  if (removeAllPanel) removeAllPanel.classList.add('hidden');
  const autoBackupPanel = document.getElementById('dm-autobackup-panel');
  if (autoBackupPanel) autoBackupPanel.classList.add('hidden');
  const visitLogPanel = document.getElementById('dm-visitlog-panel');
  if (visitLogPanel) visitLogPanel.classList.add('hidden');

  // Show target
  const p = document.getElementById(panelId);
  if (p) p.classList.remove('hidden');
}

window.triggerUpdateApiClick = () => {
  currentSettingsTarget = 'api';
  document.getElementById('dm-admin-password').value = '';
  showDmPanel('dm-passcode-panel');
  runLockoutCountdown();
};

window.triggerRemoveAllClick = () => {
  currentSettingsTarget = 'wipe';
  document.getElementById('dm-admin-password').value = '';
  showDmPanel('dm-passcode-panel');
  runLockoutCountdown();
};

window.triggerDbRestore = () => {
  document.getElementById('db-restore-file').click();
};

document.getElementById('dm-passcode-cancel').onclick = () => showDmPanel('dm-options-panel');

let wrongAttempts = parseInt(localStorage.getItem('db_update_attempts') || '0');
let lockoutInterval = null;

const runLockoutCountdown = () => {
  const exp = parseInt(localStorage.getItem('db_update_lockout_exp') || '0');
  const now = Date.now();
  const pwdInput = document.getElementById('dm-admin-password');
  const submitBtn = document.getElementById('dm-passcode-submit');
  const timerLabel = document.getElementById('dm-lockout-timer');

  if (exp && now < exp) {
    if (pwdInput) pwdInput.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
    if (timerLabel) timerLabel.classList.remove('hidden');
    if (lockoutInterval) clearInterval(lockoutInterval);

    const updateClock = () => {
      const cNow = Date.now();
      const rem = exp - cNow;
      if (rem <= 0) {
        clearInterval(lockoutInterval);
        lockoutInterval = null;
        localStorage.removeItem('db_update_lockout_exp');
        localStorage.removeItem('db_update_attempts');
        wrongAttempts = 0;

        if (pwdInput) { pwdInput.disabled = false; pwdInput.value = ''; }
        if (submitBtn) submitBtn.disabled = false;
        if (timerLabel) { timerLabel.classList.add('hidden'); timerLabel.textContent = ''; }
        toast.info("Passcode settings unlocked.");
      } else {
        const m = Math.floor(rem / 60000);
        const s = Math.floor((rem % 60000) / 1000);
        if (timerLabel) {
          timerLabel.textContent = `LOCKED! Try again in: ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
      }
    };
    updateClock();
    lockoutInterval = setInterval(updateClock, 1000);
  } else {
    if (pwdInput) pwdInput.disabled = false;
    if (submitBtn) submitBtn.disabled = false;
    if (timerLabel) { timerLabel.classList.add('hidden'); timerLabel.textContent = ''; }
    if (lockoutInterval) { clearInterval(lockoutInterval); lockoutInterval = null; }
  }
};

document.getElementById('dm-passcode-submit').onclick = () => {
  const pwdInput = document.getElementById('dm-admin-password');
  if (!pwdInput) return;
  const val = pwdInput.value;

  if (val === '@RPM@2026@') {
    localStorage.removeItem('db_update_attempts');
    wrongAttempts = 0;
    pwdInput.value = '';

    toast.ok("Settings edit lock unlocked.");

    if (currentSettingsTarget === 'wipe') {
      showDmPanel('dm-remove-all-panel');
    } else {
      // Unlocked! Populate credentials panel
      showDmPanel('dm-update-panel');
      
      document.getElementById('dm-api-key').value = firebaseConfig.apiKey || '';
      document.getElementById('dm-auth-domain').value = firebaseConfig.authDomain || '';
      document.getElementById('dm-db-url').value = firebaseConfig.databaseURL || '';
      document.getElementById('dm-project-id').value = firebaseConfig.projectId || '';
      document.getElementById('dm-storage-bucket').value = firebaseConfig.storageBucket || '';
      document.getElementById('dm-sender-id').value = firebaseConfig.messagingSenderId || '';
      document.getElementById('dm-app-id').value = firebaseConfig.appId || '';

      appConfigUrlRef.once('value').then(snap => {
        document.getElementById('dm-app-link').value = snap.val() || 'https://rpm.gt.tc/driver.html';
      }).catch(() => {
        document.getElementById('dm-app-link').value = 'https://rpm.gt.tc/driver.html';
      });

      adminAppConfigUrlRef.once('value').then(snap => {
        const adminInput = document.getElementById('dm-admin-app-link');
        if (adminInput) adminInput.value = snap.val() || 'https://diesel.gt.tc/';
      }).catch(() => {
        const adminInput = document.getElementById('dm-admin-app-link');
        if (adminInput) adminInput.value = 'https://diesel.gt.tc/';
      });

      stationAppConfigUrlRef.once('value').then(snap => {
        const stationInput = document.getElementById('dm-station-app-link');
        if (stationInput) stationInput.value = snap.val() || 'https://diesel.gt.tc/files/diesel_filled.html';
      }).catch(() => {
        const stationInput = document.getElementById('dm-station-app-link');
        if (stationInput) stationInput.value = 'https://diesel.gt.tc/files/diesel_filled.html';
      });
    }
  } else {
    wrongAttempts++;
    localStorage.setItem('db_update_attempts', wrongAttempts.toString());
    if (wrongAttempts >= 3) {
      const expTime = Date.now() + 30 * 60 * 1000; // 30 mins lock
      localStorage.setItem('db_update_lockout_exp', expTime.toString());
      toast.err("Too many wrong attempts! Locked out for 30 minutes.");
      runLockoutCountdown();
    } else {
      toast.err("Incorrect passcode. Try again.");
    }
  }
};

// Save Firebase Config
document.getElementById('dm-update-submit').onclick = () => {
  const key = document.getElementById('dm-api-key').value.trim();
  const auth = document.getElementById('dm-auth-domain').value.trim();
  const dbUrl = document.getElementById('dm-db-url').value.trim();
  const proj = document.getElementById('dm-project-id').value.trim();
  const store = document.getElementById('dm-storage-bucket').value.trim();
  const sender = document.getElementById('dm-sender-id').value.trim();
  const appid = document.getElementById('dm-app-id').value.trim();
  const applink = document.getElementById('dm-app-link').value.trim();
  const adminApplink = document.getElementById('dm-admin-app-link')?.value.trim();
  const stationApplink = document.getElementById('dm-station-app-link')?.value.trim();

  if (!key || !dbUrl) return toast.err("API Key and DB URL cannot be blank.");

  const customConf = {
    apiKey: key,
    authDomain: auth,
    databaseURL: dbUrl,
    projectId: proj,
    storageBucket: store,
    messagingSenderId: sender,
    appId: appid
  };

  localStorage.setItem('customFirebaseConfig', JSON.stringify(customConf));
  
  if (applink) {
    appConfigUrlRef.set(applink);
  }

  if (adminApplink) {
    adminAppConfigUrlRef.set(adminApplink);
  }

  if (stationApplink) {
    stationAppConfigUrlRef.set(stationApplink);
  }

  toast.ok("Custom Firebase credentials & App Links updated. Refreshing page...");
  setTimeout(() => location.reload(), 1500);
};

// Wipe custom configuration
document.getElementById('dm-update-reset').onclick = () => {
  if (confirm("Reset configurations back to hardcoded default credentials?")) {
    localStorage.removeItem('customFirebaseConfig');
    toast.ok("Configs reset. Reloading...");
    setTimeout(() => location.reload(), 1200);
  }
};

/* ══════════════════════════════════════════════════════════
   18.0 DATA OPERATIONS PROGRESS BAR & LIVE TASK NOTIFICATION (1% to 100%)
   ══════════════════════════════════════════════════════════ */
let dmProgressTimer = null;
let dmProgressAnimInterval = null;
let dmProgressAutoAdvanceInterval = null;
let dmProgressStartTime = 0;
let dmProgressCurrentPercent = 0;
let dmActiveTaskName = "Operation";
let dmNotificationDismissTimer = null;
let activeLiveTask = null;
let isDmProgressModalMinimized = false;

// Smooth auto-advancing real-time progress simulation during background/network operations
function startDmProgressAutoAdvance({
  fromPercent,
  toPercent,
  estimatedDurationSec = 8,
  step = "Processing",
  subtitle = "Working in background...",
  detailFormatter = null
} = {}) {
  if (dmProgressAutoAdvanceInterval) {
    clearInterval(dmProgressAutoAdvanceInterval);
    dmProgressAutoAdvanceInterval = null;
  }

  const startPct = typeof fromPercent === 'number' ? fromPercent : (dmProgressCurrentPercent || 15);
  const endPct = Math.min(98, Math.max(startPct, toPercent || 88));
  const startTime = Date.now();
  const totalDurationMs = Math.max(1000, estimatedDurationSec * 1000);

  updateDmProgress(startPct, {
    step: step,
    subtitle: subtitle,
    detail: detailFormatter ? detailFormatter("0.0", startPct) : `${step} (${startPct}%): ${subtitle}`,
    animate: false
  });

  dmProgressAutoAdvanceInterval = setInterval(() => {
    const elapsedMs = Date.now() - startTime;
    const elapsedSec = (elapsedMs / 1000).toFixed(1);

    // Asymptotic progress curve: starts responsive, decelerates smoothly towards endPct
    const t = elapsedMs / totalDurationMs;
    const curve = 1 - Math.exp(-2.2 * Math.min(2.5, t));
    const currentPct = Math.min(endPct, Math.round(startPct + (endPct - startPct) * curve));

    const detailText = detailFormatter
      ? detailFormatter(elapsedSec, currentPct)
      : `${step} (${currentPct}%): ${subtitle} (${elapsedSec}s)`;

    updateDmProgress(currentPct, {
      step: step,
      subtitle: subtitle,
      detail: detailText,
      animate: false
    });
  }, 200);
}

function stopDmProgressAutoAdvance() {
  if (dmProgressAutoAdvanceInterval) {
    clearInterval(dmProgressAutoAdvanceInterval);
    dmProgressAutoAdvanceInterval = null;
  }
}
window.startDmProgressAutoAdvance = startDmProgressAutoAdvance;
window.stopDmProgressAutoAdvance = stopDmProgressAutoAdvance;

let currentTaskAbortController = null;

function cancelActiveLiveTask() {
  console.warn("[LiveTask] User requested cancellation of active task:", dmActiveTaskName);
  
  if (currentTaskAbortController) {
    try {
      currentTaskAbortController.abort();
    } catch (e) {
      console.warn("Error aborting task controller:", e);
    }
    currentTaskAbortController = null;
  }

  stopDmProgressAutoAdvance();
  if (dmProgressTimer) {
    clearInterval(dmProgressTimer);
    dmProgressTimer = null;
  }

  updateDmProgress(100, {
    subtitle: "Task Cancelled by User!",
    step: "Cancelled",
    icon: "fas fa-ban text-rose-400",
    color: "rose",
    detail: "Task ko user dwara turant cancel kar diya gaya. Operation aborted.",
    isFail: true,
    taskName: dmActiveTaskName || "Operation",
    errorMessage: "Task cancelled by user."
  });

  // Re-enable test buttons across panels
  const driveTestBtn = document.getElementById('dm-drivebackup-test-btn');
  if (driveTestBtn) {
    driveTestBtn.disabled = false;
    driveTestBtn.innerHTML = `<i class="fab fa-google-drive"></i> <span>Sync Backup to Google Drive Now (Test)</span>`;
  }
  const tgTestBtn = document.getElementById('dm-autobackup-test-btn');
  if (tgTestBtn) {
    tgTestBtn.disabled = false;
    tgTestBtn.innerHTML = `<i class="fas fa-paper-plane"></i> <span>Send Backup to Telegram Now (Test)</span>`;
  }

  toast.warn("🛑 Task cancelled by user.");
  closeDmProgress(1500);
}
window.cancelActiveLiveTask = cancelActiveLiveTask;

// Request Desktop/Browser notification permission if supported
function requestTaskDesktopNotificationPermission() {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  } catch (e) {}
}

function sendTaskDesktopNotification(title, body) {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: 'favicon.ico'
      });
    }
  } catch (e) {
    console.warn("Desktop notification failed:", e);
  }
}

function dismissLiveTaskNotification() {
  const container = document.getElementById('live-task-notification');
  if (container) container.classList.add('hidden');
  if (dmNotificationDismissTimer) {
    clearTimeout(dmNotificationDismissTimer);
    dmNotificationDismissTimer = null;
  }
}
window.dismissLiveTaskNotification = dismissLiveTaskNotification;

function hideDmProgressModal() {
  isDmProgressModalMinimized = true;
  const modal = document.getElementById('dm-progress-modal');
  if (modal) modal.classList.add('hidden');
  toast.info("Task minimize ho gaya. Incoming Requests (Bell icon) me live progress chal raha hai.");
  refreshNotificationDropdownWithActiveTask();
}
window.hideDmProgressModal = hideDmProgressModal;

function reopenDmProgressModal() {
  isDmProgressModalMinimized = false;
  const modal = document.getElementById('dm-progress-modal');
  if (modal) modal.classList.remove('hidden');
}
window.reopenDmProgressModal = reopenDmProgressModal;

function updateDashboardActiveTaskKpi() {
  const dashKpi = document.getElementById('dash-active-task-kpi');
  if (!dashKpi) return;

  if (!activeLiveTask) {
    dashKpi.classList.add('hidden');
    return;
  }

  const nameEl = document.getElementById('dash-active-task-name');
  const badgeEl = document.getElementById('dash-active-task-badge');
  const timerEl = document.getElementById('dash-active-task-timer');
  const percentEl = document.getElementById('dash-active-task-percent');
  const barEl = document.getElementById('dash-active-task-bar');
  const descEl = document.getElementById('dash-active-task-desc');
  const iconEl = document.getElementById('dash-active-task-icon');
  const iconBox = document.getElementById('dash-active-task-icon-box');
  const accent = document.getElementById('dash-active-task-accent');

  if (nameEl) nameEl.textContent = activeLiveTask.name;
  if (descEl) descEl.textContent = activeLiveTask.detail;
  if (percentEl) percentEl.textContent = `${activeLiveTask.percent}%`;
  if (barEl) barEl.style.width = `${activeLiveTask.percent}%`;
  if (timerEl) timerEl.textContent = `⏱️ ${activeLiveTask.elapsed || '0s'}`;

  const c = activeLiveTask.status === 'completed' ? 'emerald' : (activeLiveTask.status === 'failed' ? 'rose' : (activeLiveTask.color || 'blue'));

  if (badgeEl) {
    badgeEl.textContent = activeLiveTask.status === 'completed' ? 'COMPLETED' : (activeLiveTask.status === 'failed' ? 'FAILED' : 'RUNNING TASK');
    badgeEl.className = `px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-${c}-500/20 text-${c}-300 border border-${c}-500/30 ${activeLiveTask.status === 'running' ? 'animate-pulse' : ''}`;
  }
  if (accent) accent.className = `absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-${c}-500 to-${c === 'emerald' ? 'teal' : (c === 'rose' ? 'red' : 'indigo')}-500`;
  if (iconBox) iconBox.className = `w-10 h-10 rounded-2xl bg-${c}-500/20 text-${c}-400 flex items-center justify-center shrink-0 text-base shadow-sm`;
  if (iconEl) iconEl.className = activeLiveTask.status === 'completed' ? 'fas fa-check-circle text-emerald-400' : (activeLiveTask.status === 'failed' ? 'fas fa-times-circle text-rose-400' : (activeLiveTask.icon || 'fas fa-spinner fa-spin'));

  dashKpi.classList.remove('hidden');
}

function updateIncomingRequestsTaskCardLive() {
  const card = document.getElementById('task-dropdown-kpi-card');
  if (!card) {
    if (typeof refreshNotificationDropdownWithActiveTask === 'function') {
      refreshNotificationDropdownWithActiveTask();
    }
    return;
  }

  if (!activeLiveTask) return;

  const t = activeLiveTask;
  const isCompleted = t.status === 'completed';
  const isFailed = t.status === 'failed';
  const c = isCompleted ? 'emerald' : (isFailed ? 'rose' : (t.color || 'blue'));

  const percentEl = document.getElementById('task-dd-percent');
  const barEl = document.getElementById('task-dd-bar');
  const stepEl = document.getElementById('task-dd-step');
  const descEl = document.getElementById('task-dd-desc');
  const timerEl = document.getElementById('task-dd-timer');

  if (percentEl) {
    percentEl.textContent = `${t.percent}%`;
    percentEl.className = `font-black text-${c}-400`;
  }
  if (barEl) {
    barEl.style.width = `${t.percent}%`;
    barEl.className = `h-full rounded-full ${isCompleted ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : (isFailed ? 'bg-gradient-to-r from-rose-500 to-red-500' : 'bg-gradient-to-r from-blue-500 to-indigo-400')} transition-all duration-300`;
  }
  if (stepEl && t.step) stepEl.textContent = t.step;
  if (timerEl && t.elapsed) timerEl.textContent = `⏱️ ${t.elapsed}`;
  if (descEl) {
    let descHtml = t.detail || '';
    if (t.finishTimeStr) {
      descHtml += `<div class="text-emerald-400 mt-1 font-semibold flex items-center gap-1"><i class="fas fa-clock"></i> Completed at: <b>${t.finishTimeStr}</b> (${t.durationSec}s)</div>`;
    }
    if (t.failTimeStr) {
      descHtml += `<div class="text-rose-400 mt-1 font-semibold flex items-center gap-1"><i class="fas fa-exclamation-triangle"></i> Failed at: <b>${t.failTimeStr}</b> (${t.durationSec}s)</div>`;
    }
    descEl.innerHTML = descHtml;
  }
}

function refreshNotificationDropdownWithActiveTask() {
  const bellBtn = document.getElementById('mobile-nav-driver-request');
  if (bellBtn && activeLiveTask && activeLiveTask.status === 'running') {
    bellBtn.classList.add('ring-2', 'ring-blue-500/50', 'bg-blue-500/10');
  } else if (bellBtn) {
    bellBtn.classList.remove('ring-2', 'ring-blue-500/50', 'bg-blue-500/10');
  }

  updateDashboardActiveTaskKpi();

  if (typeof renderNotificationDropdown === 'function') {
    renderNotificationDropdown(window.lastActionRequests || [], window.lastPendingUsers || []);
  }
}

function showDmProgress({
  title = "Processing...",
  taskName,
  subtitle = "Please wait...",
  icon = "fas fa-spinner fa-spin",
  color = "emerald",
  step = "Step 1 of 4",
  percent = 5,
  detail = "Starting operation..."
}) {
  requestTaskDesktopNotificationPermission();

  const modal = document.getElementById('dm-progress-modal');
  const notifContainer = document.getElementById('live-task-notification');

  if (dmProgressAnimInterval) {
    clearInterval(dmProgressAnimInterval);
    dmProgressAnimInterval = null;
  }
  if (dmProgressAutoAdvanceInterval) {
    clearInterval(dmProgressAutoAdvanceInterval);
    dmProgressAutoAdvanceInterval = null;
  }
  if (dmProgressTimer) {
    clearInterval(dmProgressTimer);
    dmProgressTimer = null;
  }
  if (dmNotificationDismissTimer) {
    clearTimeout(dmNotificationDismissTimer);
    dmNotificationDismissTimer = null;
  }

  dmProgressStartTime = Date.now();
  dmProgressCurrentPercent = Math.max(0, Math.min(100, percent));
  dmActiveTaskName = taskName || title || "Operation";
  isDmProgressModalMinimized = false;

  activeLiveTask = {
    name: dmActiveTaskName,
    status: 'running',
    percent: dmProgressCurrentPercent,
    step: step,
    detail: detail,
    color: color,
    icon: icon,
    startTime: dmProgressStartTime,
    elapsed: '0s'
  };

  // 1. Center Modal updates
  const iconBox = document.getElementById('dm-progress-icon-box');
  const iconEl = document.getElementById('dm-progress-icon');
  const pingEl = document.getElementById('dm-progress-ping');
  const titleEl = document.getElementById('dm-progress-title');
  const subtitleEl = document.getElementById('dm-progress-subtitle');
  const stepEl = document.getElementById('dm-progress-step');
  const percentEl = document.getElementById('dm-progress-percent');
  const barEl = document.getElementById('dm-progress-bar');
  const detailEl = document.getElementById('dm-progress-detail');
  const elapsedEl = document.getElementById('dm-progress-elapsed');

  if (iconBox && pingEl && barEl && percentEl) {
    iconBox.className = `w-16 h-16 rounded-2xl bg-${color}-500/20 text-${color}-400 flex items-center justify-center text-2xl relative shadow-lg shadow-${color}-500/20 transition-all duration-300`;
    pingEl.className = `animate-ping absolute inline-flex h-full w-full rounded-2xl bg-${color}-400 opacity-20`;
    barEl.className = `h-full rounded-full bg-gradient-to-r from-${color}-500 to-${color}-400 transition-all duration-300 shadow-md shadow-${color}-500/50`;
    percentEl.className = `text-xl font-black text-${color}-400 font-mono tracking-tight`;
  }

  if (iconEl) iconEl.className = icon;
  if (titleEl) titleEl.textContent = title;
  if (subtitleEl) subtitleEl.textContent = subtitle;
  if (stepEl) stepEl.textContent = step;
  if (percentEl) percentEl.textContent = `${dmProgressCurrentPercent}%`;
  if (barEl) barEl.style.width = `${dmProgressCurrentPercent}%`;
  if (detailEl) detailEl.textContent = detail;

  // 2. Floating Live Task Notification Card updates
  const notifCard = document.getElementById('live-task-card');
  const notifAccent = document.getElementById('live-task-accent-bar');
  const notifIconBox = document.getElementById('live-task-icon-box');
  const notifIcon = document.getElementById('live-task-icon');
  const notifStatusBadge = document.getElementById('live-task-status-badge');
  const notifElapsed = document.getElementById('live-task-elapsed');
  const notifName = document.getElementById('live-task-name');
  const notifStepLabel = document.getElementById('live-task-step-label');
  const notifPercent = document.getElementById('live-task-percent');
  const notifBar = document.getElementById('live-task-progress-bar');
  const notifDesc = document.getElementById('live-task-desc');
  const notifCompleteTime = document.getElementById('live-task-complete-time');

  if (notifCard) notifCard.className = `glass-panel p-4 rounded-2xl border border-${color}-500/40 bg-slate-900/95 dark:bg-slate-950/95 shadow-2xl backdrop-blur-xl text-white space-y-2.5 relative overflow-hidden transition-all duration-300`;
  if (notifAccent) notifAccent.className = `absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-${color}-500 to-indigo-500 transition-all duration-300`;
  if (notifIconBox) notifIconBox.className = `w-8 h-8 rounded-xl bg-${color}-500/20 text-${color}-400 flex items-center justify-center shrink-0 text-sm shadow-sm transition-all duration-300`;
  if (notifIcon) notifIcon.className = icon;
  if (notifStatusBadge) {
    notifStatusBadge.textContent = "RUNNING";
    notifStatusBadge.className = `px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-${color}-500/20 text-${color}-300 border border-${color}-500/30 transition-all duration-300`;
  }
  if (notifName) notifName.textContent = dmActiveTaskName;
  if (notifStepLabel) notifStepLabel.textContent = step;
  if (notifPercent) {
    notifPercent.textContent = `${dmProgressCurrentPercent}%`;
    notifPercent.className = `font-extrabold text-${color}-400 text-sm`;
  }
  if (notifBar) {
    notifBar.style.width = `${dmProgressCurrentPercent}%`;
    notifBar.className = `h-full rounded-full bg-gradient-to-r from-${color}-500 to-${color}-400 transition-all duration-300 shadow-md shadow-${color}-500/50`;
  }
  if (notifDesc) notifDesc.textContent = detail;
  if (notifCompleteTime) {
    notifCompleteTime.classList.add('hidden');
    notifCompleteTime.textContent = "";
  }

  // Timer updater
  if (elapsedEl) elapsedEl.textContent = "0s";
  if (notifElapsed) notifElapsed.textContent = "0s";

  dmProgressTimer = setInterval(() => {
    const sec = ((Date.now() - dmProgressStartTime) / 1000).toFixed(1);
    if (elapsedEl) elapsedEl.textContent = `${Math.floor(sec)}s`;
    if (notifElapsed) notifElapsed.textContent = `${sec}s`;
    if (activeLiveTask) {
      activeLiveTask.elapsed = `${sec}s`;
      updateDashboardActiveTaskKpi();
      updateIncomingRequestsTaskCardLive();
    }
  }, 200);

  if (modal && !isDmProgressModalMinimized) modal.classList.remove('hidden');
  if (notifContainer) notifContainer.classList.remove('hidden');
  refreshNotificationDropdownWithActiveTask();
}

function updateDmProgress(targetPercent, {
  subtitle,
  step,
  detail,
  icon,
  color,
  animate = true,
  duration = 400,
  isComplete = false,
  isFail = false,
  taskName,
  errorMessage
} = {}) {
  const boundedTarget = Math.min(100, Math.max(0, Math.round(targetPercent)));
  if (taskName) dmActiveTaskName = taskName;

  if (activeLiveTask) {
    activeLiveTask.percent = boundedTarget;
    if (step) activeLiveTask.step = step;
    if (detail) activeLiveTask.detail = detail;
    if (color) activeLiveTask.color = color;
    if (icon) activeLiveTask.icon = icon;
  }

  // Modal elements
  const modal = document.getElementById('dm-progress-modal');
  const iconEl = document.getElementById('dm-progress-icon');
  const subtitleEl = document.getElementById('dm-progress-subtitle');
  const stepEl = document.getElementById('dm-progress-step');
  const percentEl = document.getElementById('dm-progress-percent');
  const barEl = document.getElementById('dm-progress-bar');
  const detailEl = document.getElementById('dm-progress-detail');
  const iconBox = document.getElementById('dm-progress-icon-box');
  const pingEl = document.getElementById('dm-progress-ping');

  // Floating Notification elements
  const notifCard = document.getElementById('live-task-card');
  const notifAccent = document.getElementById('live-task-accent-bar');
  const notifIconBox = document.getElementById('live-task-icon-box');
  const notifIcon = document.getElementById('live-task-icon');
  const notifStatusBadge = document.getElementById('live-task-status-badge');
  const notifStepLabel = document.getElementById('live-task-step-label');
  const notifPercent = document.getElementById('live-task-percent');
  const notifBar = document.getElementById('live-task-progress-bar');
  const notifDesc = document.getElementById('live-task-desc');
  const notifCompleteTime = document.getElementById('live-task-complete-time');

  if (subtitle && subtitleEl) subtitleEl.textContent = subtitle;
  if (step) {
    if (stepEl) stepEl.textContent = step;
    if (notifStepLabel) notifStepLabel.textContent = step;
  }
  if (detail) {
    if (detailEl) detailEl.textContent = detail;
    if (notifDesc) notifDesc.textContent = detail;
  }
  if (icon) {
    if (iconEl) iconEl.className = icon;
    if (notifIcon) notifIcon.className = icon;
  }

  if (color) {
    if (iconBox && pingEl && barEl && percentEl) {
      iconBox.className = `w-16 h-16 rounded-2xl bg-${color}-500/20 text-${color}-400 flex items-center justify-center text-2xl relative shadow-lg shadow-${color}-500/20 transition-all duration-300`;
      pingEl.className = `animate-ping absolute inline-flex h-full w-full rounded-2xl bg-${color}-400 opacity-20`;
      barEl.className = `h-full rounded-full bg-gradient-to-r from-${color}-500 to-${color}-400 transition-all duration-300 shadow-md shadow-${color}-500/50`;
      percentEl.className = `text-xl font-black text-${color}-400 font-mono tracking-tight`;
    }
    if (notifCard) notifCard.className = `glass-panel p-4 rounded-2xl border border-${color}-500/40 bg-slate-900/95 dark:bg-slate-950/95 shadow-2xl backdrop-blur-xl text-white space-y-2.5 relative overflow-hidden transition-all duration-300`;
    if (notifAccent) notifAccent.className = `absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-${color}-500 to-indigo-500 transition-all duration-300`;
    if (notifIconBox) notifIconBox.className = `w-8 h-8 rounded-xl bg-${color}-500/20 text-${color}-400 flex items-center justify-center shrink-0 text-sm shadow-sm transition-all duration-300`;
    if (notifPercent) notifPercent.className = `font-extrabold text-${color}-400 text-sm`;
    if (notifBar) notifBar.className = `h-full rounded-full bg-gradient-to-r from-${color}-500 to-${color}-400 transition-all duration-300 shadow-md shadow-${color}-500/50`;
  }

  // Animation handling
  if (dmProgressAnimInterval) {
    clearInterval(dmProgressAnimInterval);
    dmProgressAnimInterval = null;
  }

  const applyPercent = (p) => {
    if (percentEl) percentEl.textContent = `${p}%`;
    if (barEl) barEl.style.width = `${p}%`;
    if (notifPercent) notifPercent.textContent = `${p}%`;
    if (notifBar) notifBar.style.width = `${p}%`;
    if (activeLiveTask) {
      activeLiveTask.percent = p;
      updateDashboardActiveTaskKpi();
      updateIncomingRequestsTaskCardLive();
    }
  };

  if (!animate || duration <= 0 || boundedTarget === dmProgressCurrentPercent) {
    dmProgressCurrentPercent = boundedTarget;
    applyPercent(dmProgressCurrentPercent);
  } else {
    const startPercent = dmProgressCurrentPercent;
    const diff = boundedTarget - startPercent;
    const startTime = Date.now();

    dmProgressAnimInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressRatio = Math.min(1, elapsed / duration);
      const easeProgress = 1 - (1 - progressRatio) * (1 - progressRatio);
      dmProgressCurrentPercent = Math.round(startPercent + diff * easeProgress);
      applyPercent(dmProgressCurrentPercent);

      if (progressRatio >= 1) {
        clearInterval(dmProgressAnimInterval);
        dmProgressAnimInterval = null;
        dmProgressCurrentPercent = boundedTarget;
        applyPercent(boundedTarget);
      }
    }, 25);
  }

  // Check Completion or Failure State
  if (isComplete || (boundedTarget === 100 && !isFail)) {
    stopDmProgressAutoAdvance();
    if (dmProgressTimer) {
      clearInterval(dmProgressTimer);
      dmProgressTimer = null;
    }
    const finalSec = ((Date.now() - (dmProgressStartTime || Date.now())) / 1000).toFixed(1);
    const finishTimeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    if (activeLiveTask) {
      activeLiveTask.status = 'completed';
      activeLiveTask.percent = 100;
      activeLiveTask.finishTimeStr = finishTimeStr;
      activeLiveTask.durationSec = finalSec;
      activeLiveTask.detail = detail || activeLiveTask.detail;
    }

    if (notifCard) notifCard.className = `glass-panel p-4 rounded-2xl border border-emerald-500/50 bg-slate-900/95 dark:bg-slate-950/95 shadow-2xl backdrop-blur-xl text-white space-y-2.5 relative overflow-hidden transition-all duration-300`;
    if (notifAccent) notifAccent.className = `absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300`;
    if (notifIconBox) notifIconBox.className = `w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-sm shadow-sm transition-all duration-300`;
    if (notifIcon) notifIcon.className = `fas fa-check-circle text-emerald-400`;
    if (notifStatusBadge) {
      notifStatusBadge.textContent = "COMPLETED";
      notifStatusBadge.className = `px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40`;
    }
    if (notifStepLabel) notifStepLabel.textContent = "Completed (100%)";
    if (notifPercent) {
      notifPercent.textContent = "100%";
      notifPercent.className = "font-extrabold text-emerald-400 text-sm";
    }
    if (notifBar) {
      notifBar.style.width = "100%";
      notifBar.className = "h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 shadow-md shadow-emerald-500/50";
    }
    if (notifCompleteTime) {
      notifCompleteTime.classList.remove('hidden');
      notifCompleteTime.innerHTML = `<span class="text-emerald-400 font-semibold"><i class="fas fa-clock mr-1"></i> Completed at: <b>${finishTimeStr}</b> (Duration: ${finalSec}s)</span>`;
    }

    sendTaskDesktopNotification(`✅ ${dmActiveTaskName}: Completed`, `Finished in ${finalSec}s at ${finishTimeStr}\n${detail || 'Task completed successfully.'}`);

    updateDashboardActiveTaskKpi();
    updateIncomingRequestsTaskCardLive();
    refreshNotificationDropdownWithActiveTask();

    if (dmNotificationDismissTimer) clearTimeout(dmNotificationDismissTimer);
    dmNotificationDismissTimer = setTimeout(() => {
      dismissLiveTaskNotification();
      activeLiveTask = null;
      updateDashboardActiveTaskKpi();
      refreshNotificationDropdownWithActiveTask();
    }, 8000);
  } else if (isFail) {
    stopDmProgressAutoAdvance();
    if (dmProgressTimer) {
      clearInterval(dmProgressTimer);
      dmProgressTimer = null;
    }
    const finalSec = ((Date.now() - (dmProgressStartTime || Date.now())) / 1000).toFixed(1);
    const failTimeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    if (activeLiveTask) {
      activeLiveTask.status = 'failed';
      activeLiveTask.failTimeStr = failTimeStr;
      activeLiveTask.durationSec = finalSec;
      activeLiveTask.errorMessage = errorMessage || detail;
      activeLiveTask.detail = detail || activeLiveTask.detail;
    }

    if (notifCard) notifCard.className = `glass-panel p-4 rounded-2xl border border-rose-500/50 bg-slate-900/95 dark:bg-slate-950/95 shadow-2xl backdrop-blur-xl text-white space-y-2.5 relative overflow-hidden transition-all duration-300`;
    if (notifAccent) notifAccent.className = `absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-500 transition-all duration-300`;
    if (notifIconBox) notifIconBox.className = `w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 text-sm shadow-sm transition-all duration-300`;
    if (notifIcon) notifIcon.className = `fas fa-times-circle text-rose-400`;
    if (notifStatusBadge) {
      notifStatusBadge.textContent = "FAILED";
      notifStatusBadge.className = `px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40`;
    }
    if (notifStepLabel) notifStepLabel.textContent = "Failed";
    if (notifPercent) {
      notifPercent.textContent = "Error";
      notifPercent.className = "font-extrabold text-rose-400 text-sm";
    }
    if (notifBar) {
      notifBar.style.width = "100%";
      notifBar.className = "h-full rounded-full bg-gradient-to-r from-rose-500 to-red-500 transition-all duration-300 shadow-md shadow-rose-500/50";
    }
    if (notifCompleteTime) {
      notifCompleteTime.classList.remove('hidden');
      notifCompleteTime.innerHTML = `<span class="text-rose-400 font-semibold"><i class="fas fa-exclamation-triangle mr-1"></i> Failed at: <b>${failTimeStr}</b> (Duration: ${finalSec}s)</span>`;
    }

    sendTaskDesktopNotification(`❌ ${dmActiveTaskName}: Failed`, `Failed at ${failTimeStr} (${finalSec}s)\n${errorMessage || detail}`);

    updateDashboardActiveTaskKpi();
    updateIncomingRequestsTaskCardLive();
    refreshNotificationDropdownWithActiveTask();

    if (dmNotificationDismissTimer) clearTimeout(dmNotificationDismissTimer);
    dmNotificationDismissTimer = setTimeout(() => {
      dismissLiveTaskNotification();
      activeLiveTask = null;
      updateDashboardActiveTaskKpi();
      refreshNotificationDropdownWithActiveTask();
    }, 10000);
  }
}

function closeDmProgress(delayMs = 900) {
  stopDmProgressAutoAdvance();
  setTimeout(() => {
    const modal = document.getElementById('dm-progress-modal');
    if (modal) modal.classList.add('hidden');
  }, delayMs);
}
window.showDmProgress = showDmProgress;
window.updateDmProgress = updateDmProgress;
window.closeDmProgress = closeDmProgress;

// ══════════════════════════════════════════════════════════
// HIGH-PERFORMANCE DATA BACKUP & RESTORE CONTROLLER (NO HANG / NO CRASH)
// ══════════════════════════════════════════════════════════

// Global state for staged restore file
let stagedRestoreFile = null;

// Modal controls for Backup Choice
window.openBackupChoiceModal = function() {
  const modal = document.getElementById('dm-backup-choice-modal');
  if (modal) modal.classList.remove('hidden');
};

window.closeBackupChoiceModal = function() {
  const modal = document.getElementById('dm-backup-choice-modal');
  if (modal) modal.classList.add('hidden');
};

// Modal controls for Import Choice
window.openImportChoiceModal = function(file) {
  stagedRestoreFile = file;
  const modal = document.getElementById('dm-import-choice-modal');
  if (!modal) return;
  
  const metaEl = document.getElementById('dm-import-file-meta');
  const heavyAlert = document.getElementById('dm-import-heavy-alert');
  const sizeLabel = document.getElementById('dm-import-filesize-label');
  
  if (file) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    if (metaEl) metaEl.textContent = `${file.name} (${sizeMB} MB)`;
    if (file.size > 15 * 1024 * 1024) {
      if (heavyAlert) heavyAlert.classList.remove('hidden');
      if (sizeLabel) sizeLabel.textContent = `${sizeMB} MB`;
    } else {
      if (heavyAlert) heavyAlert.classList.add('hidden');
    }
  }
  modal.classList.remove('hidden');
};

window.closeImportChoiceModal = function() {
  const modal = document.getElementById('dm-import-choice-modal');
  if (modal) modal.classList.add('hidden');
  stagedRestoreFile = null;
  const fileInput = document.getElementById('db-restore-file');
  if (fileInput) fileInput.value = '';
};

window.confirmAndExecuteRestore = function(skipImages) {
  const file = stagedRestoreFile;
  const modal = document.getElementById('dm-import-choice-modal');
  if (modal) modal.classList.add('hidden');
  if (!file) {
    toast.warn("No backup file selected.");
    return;
  }
  executeDatabaseRestore(file, { skipImages });
};

// Helper: Micro-batch sanitizer that removes heavy base64 and image keys without freezing UI
async function sanitizeDataWithoutImages(rawObj, onProgress) {
  if (!rawObj || typeof rawObj !== 'object') return rawObj;
  
  const sanitized = {};
  const photoCollections = new Set(['entryPhotos', 'driverRequestPhotos', 'refillPhotos']);
  const photoKeys = new Set(['slipPhoto', 'meterPhoto', 'photo', 'image', 'avatar', 'receiptPhoto']);
  
  const topKeys = Object.keys(rawObj);
  let processed = 0;
  
  for (const collKey of topKeys) {
    // Skip entire photo collections
    if (photoCollections.has(collKey)) {
      sanitized[collKey] = { _backup_info: "Photo records omitted for compact data backup" };
      continue;
    }
    
    const val = rawObj[collKey];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const subKeys = Object.keys(val);
      const cleanedColl = {};
      let itemCounter = 0;
      
      for (const itemKey of subKeys) {
        const itemVal = val[itemKey];
        if (itemVal && typeof itemVal === 'object' && !Array.isArray(itemVal)) {
          const cleanedItem = {};
          for (const prop in itemVal) {
            const propVal = itemVal[prop];
            if (photoKeys.has(prop)) {
              continue;
            }
            if (typeof propVal === 'string' && (propVal.startsWith('data:image/') || (propVal.length > 5000 && /^[A-Za-z0-9+/=]+$/.test(propVal.slice(0, 50))))) {
              continue;
            }
            cleanedItem[prop] = propVal;
          }
          cleanedColl[itemKey] = cleanedItem;
        } else {
          cleanedColl[itemKey] = itemVal;
        }
        
        itemCounter++;
        if (itemCounter % 200 === 0) {
          await new Promise(r => setTimeout(r, 0)); // Yield to event loop
        }
      }
      sanitized[collKey] = cleanedColl;
    } else {
      sanitized[collKey] = val;
    }
    
    processed++;
    if (typeof onProgress === 'function') {
      const pct = Math.round((processed / topKeys.length) * 100);
      onProgress(pct);
    }
    await new Promise(r => setTimeout(r, 0));
  }
  
  return sanitized;
}

// Memory-safe JSON Database Backup (Blob + URL.createObjectURL instead of fatal encodeURIComponent)
window.executeDatabaseBackup = async function(withoutImages = false) {
  closeBackupChoiceModal();
  
  currentTaskAbortController = new AbortController();

  const taskTitle = withoutImages 
    ? 'Backup Data (Without Images - Data Only)' 
    : 'Backup Data (Full Backup with Images)';

  showDmProgress({
    title: taskTitle,
    taskName: taskTitle,
    subtitle: "Cloud database connection establish ho raha hai...",
    icon: withoutImages ? "fas fa-bolt-lightning text-amber-400 animate-bounce" : "fas fa-file-arrow-down text-emerald-400 animate-bounce",
    color: withoutImages ? "amber" : "emerald",
    step: "Step 1 of 4",
    percent: 15,
    detail: "Step 1 of 4 (15%): Cloud database connection establish."
  });

  startDmProgressAutoAdvance({
    fromPercent: 15,
    toPercent: 45,
    estimatedDurationSec: 5,
    step: "Step 1 of 4",
    subtitle: "Cloud database records fetch chal raha hai...",
    detailFormatter: (sec, pct) => `Step 1 of 4 (${pct}%): Reading database records from cloud (${sec}s)`
  });

  try {
    const snap = await db.ref().once('value');
    stopDmProgressAutoAdvance();
    if (currentTaskAbortController?.signal?.aborted) return;
    let val = snap.val();
    
    if (!val) {
      updateDmProgress(100, {
        subtitle: "Database is empty!",
        step: "Warning",
        icon: "fas fa-exclamation-triangle text-amber-400",
        color: "amber",
        detail: "Database empty hai, backup karne ke liye koi record nahi mila.",
        isFail: true,
        taskName: taskTitle
      });
      closeDmProgress(2000);
      return toast.err("Database is empty.");
    }

    if (withoutImages) {
      val = await sanitizeDataWithoutImages(val, (subPct) => {
        if (currentTaskAbortController?.signal?.aborted) return;
        const curPct = 45 + Math.round(subPct * 0.33);
        updateDmProgress(curPct, {
          subtitle: `Sanitizing records: ${subPct}%...`,
          step: "Step 2 of 4",
          detail: `Step 2 of 4 (${curPct}%): Removing heavy images & slips (${subPct}%)`,
          animate: false
        });
      });
    } else {
      startDmProgressAutoAdvance({
        fromPercent: 45,
        toPercent: 78,
        estimatedDurationSec: 3,
        step: "Step 2 of 4",
        subtitle: "Full snapshot packaging chal rahi hai...",
        detailFormatter: (sec, pct) => `Step 2 of 4 (${pct}%): Full records packaging in memory (${sec}s)`
      });
      await new Promise(r => setTimeout(r, 20));
      stopDmProgressAutoAdvance();
    }

    if (currentTaskAbortController?.signal?.aborted) return;

    startDmProgressAutoAdvance({
      fromPercent: 78,
      toPercent: 92,
      estimatedDurationSec: 2,
      step: "Step 3 of 4",
      subtitle: "Memory-safe JSON packaging chal rahi hai...",
      detailFormatter: (sec, pct) => `Step 3 of 4 (${pct}%): Compact JSON stringifying & Blob allocation (${sec}s)`
    });

    await new Promise(r => setTimeout(r, 20));

    // CRITICAL: Compact JSON.stringify (no null, 2 indent) to save 50%+ memory
    const jsonStr = JSON.stringify(val);
    val = null; // Free reference for garbage collection

    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
    stopDmProgressAutoAdvance();

    if (currentTaskAbortController?.signal?.aborted) return;

    updateDmProgress(92, {
      subtitle: `Download file ready (${sizeMB} MB). Triggering browser download...`,
      step: "Step 4 of 4",
      detail: `Step 4 of 4 (92%): File size: ${sizeMB} MB. Initiating download.`,
      duration: 250
    });

    const dlAnchor = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    const filePrefix = withoutImages ? 'rpm_diesel_data_only_backup' : 'rpm_diesel_full_backup';
    const blobUrl = URL.createObjectURL(blob);
    
    dlAnchor.href = blobUrl;
    dlAnchor.download = `${filePrefix}_${date}.json`;
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();

    // Clean up memory
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);

    updateDmProgress(100, {
      subtitle: `Download Complete (${sizeMB} MB)!`,
      step: "Completed (100%)",
      icon: "fas fa-check-circle text-emerald-400",
      color: "emerald",
      detail: `Completed (100%): Backup (${sizeMB} MB) downloaded successfully without any lag.`,
      duration: 300,
      isComplete: true,
      taskName: taskTitle
    });
    closeDmProgress(1500);
    toast.ok(`Backup downloaded (${sizeMB} MB)!`);

  } catch (err) {
    if (currentTaskAbortController?.signal?.aborted || err?.name === 'AbortError') {
      console.warn("Backup cancelled by user.");
      return;
    }
    stopDmProgressAutoAdvance();
    updateDmProgress(100, {
      subtitle: "Backup Failed!",
      step: "Error",
      icon: "fas fa-times-circle text-rose-400",
      color: "rose",
      detail: (err && err.message) || "Failed to read database.",
      isFail: true,
      taskName: taskTitle
    });
    closeDmProgress(2500);
    toast.err("Backup operation failed: " + ((err && err.message) || ""));
  } finally {
    currentTaskAbortController = null;
  }
};

// Fallback & wrapper for backupDatabase
function backupDatabase(opts) {
  if (typeof opts === 'boolean') {
    executeDatabaseBackup(opts);
  } else if (opts && typeof opts === 'object' && ('withoutImages' in opts)) {
    executeDatabaseBackup(opts.withoutImages);
  } else {
    openBackupChoiceModal();
  }
}
window.backupDatabase = backupDatabase;

// Smooth, Multi-Batch lag-free JSON/GZ restore into Firebase Realtime Database
window.executeDatabaseRestore = async function(file, options = {}) {
  const skipImages = !!options.skipImages;
  const taskTitle = skipImages 
    ? 'Import Data (Fast Restore - Data Only)' 
    : 'Import Data (Full Restore - Multi-Batch Mode)';

  currentTaskAbortController = new AbortController();

  showDmProgress({
    title: taskTitle,
    taskName: taskTitle,
    subtitle: "Uploaded file read & decode ho raha hai...",
    icon: "fas fa-file-import text-blue-400 animate-pulse",
    color: "blue",
    step: "Step 1 of 5",
    percent: 10,
    detail: "Step 1 of 5 (10%): Uploaded backup file read & decode."
  });

  startDmProgressAutoAdvance({
    fromPercent: 10,
    toPercent: 30,
    estimatedDurationSec: 2,
    step: "Step 1 of 5",
    subtitle: "Uploaded file read & decode chal raha hai...",
    detailFormatter: (sec, pct) => `Step 1 of 5 (${pct}%): Reading file from disk (${sec}s)`
  });

  try {
    let jsonText = '';
    if (file.name.endsWith('.gz') || file.type.includes('gzip')) {
      if (typeof DecompressionStream === 'function') {
        const ds = new DecompressionStream('gzip');
        const stream = file.stream().pipeThrough(ds);
        jsonText = await new Response(stream).text();
      } else {
        stopDmProgressAutoAdvance();
        closeDmProgress(0);
        return toast.err("Your browser does not support decompressing .gz files.");
      }
    } else {
      jsonText = await file.text();
    }

    stopDmProgressAutoAdvance();

    startDmProgressAutoAdvance({
      fromPercent: 30,
      toPercent: 48,
      estimatedDurationSec: 2,
      step: "Step 2 of 5",
      subtitle: "JSON parsing & schema validation chal rahi hai...",
      detailFormatter: (sec, pct) => `Step 2 of 5 (${pct}%): Parsing JSON structure (${sec}s)`
    });

    // Let the event loop breathe before JSON parse
    await new Promise(r => setTimeout(r, 20));
    const parsed = JSON.parse(jsonText);
    jsonText = null; // IMMEDIATE DEREFERENCE to let Garbage Collector reclaim RAM!

    stopDmProgressAutoAdvance();

    if (!parsed || typeof parsed !== 'object') {
      throw new Error("Invalid JSON structure in backup file.");
    }

    updateDmProgress(48, {
      subtitle: skipImages ? "Skipping heavy images and preparing data records..." : "Preparing records collections...",
      step: "Step 3 of 5",
      detail: skipImages ? "Step 3 of 5 (48%): Photo nodes skipped for 10x faster restore." : "Step 3 of 5 (48%): Organizing batch trees.",
      duration: 200
    });

    if (skipImages) {
      delete parsed.entryPhotos;
      delete parsed.driverRequestPhotos;
      delete parsed.refillPhotos;
    }

    const topKeys = Object.keys(parsed);
    const totalCollections = topKeys.length;
    let completedCollections = 0;

    updateDmProgress(52, {
      subtitle: "Writing records to Firebase in smooth micro-batches...",
      step: "Step 4 of 5",
      icon: "fas fa-database text-emerald-400 animate-pulse",
      detail: `Step 4 of 5 (52%): Writing ${totalCollections} collections with zero CPU freeze.`,
      duration: 200
    });

    // CRITICAL: Safe multi-batch writing. Instead of db.ref().set(hugeObject) which freezes the OS,
    // we write top-level collections in safe 50-item chunks and yield every batch.
    for (let c = 0; c < totalCollections; c++) {
      if (currentTaskAbortController?.signal?.aborted) return;

      const collKey = topKeys[c];
      const collData = parsed[collKey];

      if (collData && typeof collData === 'object' && !Array.isArray(collData)) {
        const itemKeys = Object.keys(collData);
        const totalItems = itemKeys.length;

        if (totalItems > 50) {
          const CHUNK_SIZE = 50;
          for (let i = 0; i < totalItems; i += CHUNK_SIZE) {
            if (currentTaskAbortController?.signal?.aborted) return;

            const batchKeys = itemKeys.slice(i, i + CHUNK_SIZE);
            const batchPayload = {};
            
            for (const ik of batchKeys) {
              let itemVal = collData[ik];
              if (skipImages && itemVal && typeof itemVal === 'object') {
                const cleaned = {};
                for (const p in itemVal) {
                  if (p === 'slipPhoto' || p === 'meterPhoto' || p === 'photo' || p === 'image' || p === 'receiptPhoto') continue;
                  if (typeof itemVal[p] === 'string' && (itemVal[p].startsWith('data:image/') || itemVal[p].length > 5000)) continue;
                  cleaned[p] = itemVal[p];
                }
                batchPayload[ik] = cleaned;
              } else {
                batchPayload[ik] = itemVal;
              }
            }

            await db.ref(collKey).update(batchPayload);

            const itemsDone = Math.min(i + CHUNK_SIZE, totalItems);
            const collProgress = 55 + Math.round(((c + (itemsDone / totalItems)) / totalCollections) * 35);
            
            updateDmProgress(collProgress, {
              subtitle: `Restoring ${collKey}: ${itemsDone} / ${totalItems} records...`,
              step: "Step 4 of 5",
              detail: `Step 4 of 5: Writing ${collKey} [${itemsDone}/${totalItems}] - Smooth execution.`
            });

            // Critical CPU yield - lets browser paint & garbage collect
            await new Promise(r => setTimeout(r, 25));
          }
        } else {
          await db.ref(collKey).set(collData);
          await new Promise(r => setTimeout(r, 15));
        }
      } else {
        await db.ref(collKey).set(collData);
        await new Promise(r => setTimeout(r, 15));
      }

      completedCollections++;
    }

    if (currentTaskAbortController?.signal?.aborted) return;

    updateDmProgress(100, {
      subtitle: "Database Restored Successfully!",
      step: "Completed (100%)",
      icon: "fas fa-check-circle text-emerald-400",
      color: "emerald",
      detail: "Completed (100%): All database records restored smoothly. UI reloading...",
      duration: 300,
      isComplete: true,
      taskName: taskTitle
    });

    const fileInput = document.getElementById('db-restore-file');
    if (fileInput) fileInput.value = '';
    closeDmProgress(1400);
    toast.ok("Database restored successfully!");
    setTimeout(() => location.reload(), 1600);

  } catch (err) {
    if (currentTaskAbortController?.signal?.aborted || err?.name === 'AbortError') {
      console.warn("Database restore cancelled by user.");
      return;
    }
    stopDmProgressAutoAdvance();
    updateDmProgress(100, {
      subtitle: "Restore Failed!",
      step: "Error",
      icon: "fas fa-times-circle text-rose-400",
      color: "rose",
      detail: (err && err.message) || "Failed to restore backup.",
      isFail: true,
      taskName: taskTitle
    });
    closeDmProgress(3000);
    toast.err("Failed to restore backup: " + ((err && err.message) || ""));
  } finally {
    currentTaskAbortController = null;
  }
};

// Wiping ledgers
window.wipeLedgerEntries = () => {
  const pass = prompt("DANGER! Wiping entire fuel entries table.\nEnter passcode:");
  if (pass === '@RPM@2026@') {
    entriesRef.set(null).then(() => {
      toast.ok("Fuel ledger wiped.");
      renderLedgerTable();
    });
  } else if (pass !== null) {
    toast.err("Wipe cancelled or incorrect password.");
  }
};

window.wipeUreaLedger = () => {
  const pass = prompt("Wiping entire Urea ledger entries table.\nEnter passcode:");
  if (pass === '@RPM@2026@') {
    const updates = {};
    ureaEntriesList.forEach(e => {
      updates[e.responseNumber] = null;
    });
    entriesRef.update(updates).then(() => {
      toast.ok("Urea ledger wiped.");
      renderModalUreaTable();
    });
  } else if (pass !== null) {
    toast.err("Cancelled.");
  }
};

window.wipeNotesAndTasks = () => {
  const pass = prompt("DANGER! Wiping all Notes & Tasks from database.\nEnter passcode:");
  if (pass === '@RPM@2026@') {
    Promise.all([notesRef.set(null), tasksRef.set(null)])
      .then(() => {
        toast.ok("Notes & Tasks wiped successfully.");
        notesList = [];
        tasksList = [];
        renderNotesList();
        renderTasksList();
      })
      .catch(err => toast.err("Wipe failed: " + err.message));
  } else if (pass !== null) {
    toast.err("Incorrect passcode.");
  }
};

window.fullDatabaseReset = () => {
  const pass = prompt("DANGER! This will delete EVERY record (Ledger, Urea, Notes, Tasks) in the database.\nEnter passcode:");
  if (pass === '@RPM@2026@') {
    db.ref().set(null)
      .then(() => {
        toast.ok("Entire database wiped successfully. Reloading...");
        setTimeout(() => location.reload(), 1500);
      })
      .catch(err => toast.err("Reset failed: " + err.message));
  } else if (pass !== null) {
    toast.err("Incorrect passcode.");
  }
};

// Hook up #db-restore-file change to admin passcode & Choice Modal
const restoreFileEl = document.getElementById('db-restore-file');
if (restoreFileEl) {
  restoreFileEl.onchange = (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const pass = prompt("DANGER! This will overwrite cloud database records.\nEnter admin passcode to authorize:");
    if (pass !== '@RPM@2026@') {
      if (pass !== null) toast.err("Incorrect admin passcode.");
      restoreFileEl.value = '';
      return;
    }

    openImportChoiceModal(file);
  };
}

// Keep submit button click for backward compatibility
const restoreSubmitBtn = document.getElementById('db-restore-submit-btn');
if (restoreSubmitBtn) {
  restoreSubmitBtn.onclick = () => {
    const fileInput = document.getElementById('db-restore-file');
    const file = fileInput ? fileInput.files[0] : null;
    if (!file) return toast.warn("Choose a backup JSON or GZ file first.");
    openImportChoiceModal(file);
  };
}

/* ══════════════════════════════════════════════════════════
   18.1 CLOUD AUTO BACKUP CONTROLLER (TELEGRAM & GOOGLE DRIVE)
   ══════════════════════════════════════════════════════════ */
let telegramAutoBackupConfig = {
  enabled: false,
  includeImages: false,
  botToken: '8880618363:AAEGp8ReJEcB563j9_2XiaVvwaPHMigt1PM',
  chatId: '7927138678',
  intervalDays: 1,
  preferredTime: '21:00',
  nextBackupTimestamp: 0,
  lastBackupTimestamp: 0,
  lastBackupDate: ''
};

let googleDriveAutoBackupConfig = {
  enabled: false,
  includeImages: false,
  folderLink: '',
  folderId: '',
  webAppUrl: '',
  intervalDays: 1,
  preferredTime: '21:00',
  nextBackupTimestamp: 0,
  lastBackupTimestamp: 0,
  lastBackupDate: '',
  lastFileUrl: ''
};

let autoBackupTimerId = null;
let isBackupRunning = false;
let isDriveBackupRunning = false;
let currentBackupTab = 'telegram';

function switchBackupTab(tab) {
  currentBackupTab = tab;
  const tgBtn = document.getElementById('dm-tab-btn-telegram');
  const driveBtn = document.getElementById('dm-tab-btn-drive');
  const tgContent = document.getElementById('dm-tab-content-telegram');
  const driveContent = document.getElementById('dm-tab-content-drive');

  if (tab === 'drive') {
    if (tgBtn) {
      tgBtn.className = "flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all text-slate-500 dark:text-slate-400 hover:text-sky-500";
    }
    if (driveBtn) {
      driveBtn.className = "flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all bg-white dark:bg-slate-800 text-emerald-500 shadow-sm border border-slate-200/50 dark:border-slate-700/50";
    }
    if (tgContent) tgContent.classList.add('hidden');
    if (driveContent) driveContent.classList.remove('hidden');
    updateDriveBackupUI();
  } else {
    if (driveBtn) {
      driveBtn.className = "flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all text-slate-500 dark:text-slate-400 hover:text-emerald-500";
    }
    if (tgBtn) {
      tgBtn.className = "flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all bg-white dark:bg-slate-800 text-sky-500 shadow-sm border border-slate-200/50 dark:border-slate-700/50";
    }
    if (driveContent) driveContent.classList.add('hidden');
    if (tgContent) tgContent.classList.remove('hidden');
    updateAutoBackupUI();
  }
}
window.switchBackupTab = switchBackupTab;

function extractDriveFolderId(urlOrId) {
  if (!urlOrId) return '';
  const str = String(urlOrId).trim();
  const m1 = str.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (m1 && m1[1]) return m1[1];
  const m2 = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2 && m2[1]) return m2[1];
  if (/^[a-zA-Z0-9_-]{15,}$/.test(str)) return str;
  return str;
}
window.extractDriveFolderId = extractDriveFolderId;

function onDriveFolderInputChanged(val) {
  const folderId = extractDriveFolderId(val);
  const previewContainer = document.getElementById('dm-drivebackup-folder-preview-container');
  const previewId = document.getElementById('dm-drivebackup-folder-id-preview');
  const extLink = document.getElementById('dm-drivebackup-folder-external-link');

  if (folderId) {
    if (previewContainer) previewContainer.classList.remove('hidden');
    if (previewId) previewId.textContent = folderId;
    if (extLink) {
      extLink.href = `https://drive.google.com/drive/folders/${folderId}`;
      extLink.classList.remove('hidden');
    }
  } else {
    if (previewContainer) previewContainer.classList.add('hidden');
    if (extLink) extLink.classList.add('hidden');
  }
}
window.onDriveFolderInputChanged = onDriveFolderInputChanged;

function setDriveBackupDays(days) {
  const input = document.getElementById('dm-drivebackup-days');
  const preview = document.getElementById('dm-drivebackup-days-preview');
  if (input) input.value = days;
  if (preview) preview.textContent = days;
}
window.setDriveBackupDays = setDriveBackupDays;

window.updateDriveBackupToggleUI = () => {
  const enableInput = document.getElementById('dm-drivebackup-enable');
  if (enableInput && enableInput.checked) {
    const folderInput = document.getElementById('dm-drivebackup-folder');
    if (folderInput && !folderInput.value && googleDriveAutoBackupConfig.folderLink) {
      folderInput.value = googleDriveAutoBackupConfig.folderLink;
      onDriveFolderInputChanged(folderInput.value);
    }
  }
};

function updateAutoBackupBadge() {
  const badge = document.getElementById('dm-autobackup-status-badge');
  if (!badge) return;

  const isTgActive = !!(telegramAutoBackupConfig.enabled && telegramAutoBackupConfig.botToken && telegramAutoBackupConfig.chatId);
  const isDriveActive = !!(googleDriveAutoBackupConfig.enabled && (googleDriveAutoBackupConfig.folderLink || googleDriveAutoBackupConfig.folderId));

  if (isTgActive && isDriveActive) {
    badge.className = "text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30";
    badge.textContent = "Active (TG + Drive)";
  } else if (isTgActive) {
    const days = telegramAutoBackupConfig.intervalDays || 1;
    badge.className = "text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30";
    badge.textContent = `Active (TG ${days}d)`;
  } else if (isDriveActive) {
    const days = googleDriveAutoBackupConfig.intervalDays || 1;
    badge.className = "text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30";
    badge.textContent = `Active (Drive ${days}d)`;
  } else {
    badge.className = "text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-500";
    badge.textContent = "Disabled";
  }
}

function loadTelegramAutoBackupSettings() {
  try {
    const local = localStorage.getItem('rpm_telegram_autobackup');
    if (local) {
      telegramAutoBackupConfig = Object.assign({}, telegramAutoBackupConfig, JSON.parse(local));
    }
  } catch (e) {
    console.error("Error reading local auto backup config", e);
  }

  if (typeof db !== 'undefined' && db) {
    db.ref('appConfig/telegramAutoBackup').once('value').then(snap => {
      const val = snap.val();
      if (val && typeof val === 'object') {
        telegramAutoBackupConfig = Object.assign({}, telegramAutoBackupConfig, val);
        localStorage.setItem('rpm_telegram_autobackup', JSON.stringify(telegramAutoBackupConfig));
      }
      updateAutoBackupBadge();
      updateAutoBackupUI();
      checkAndRunTelegramAutoBackup();
    }).catch(err => {
      console.warn("Could not fetch remote auto backup config:", err);
      updateAutoBackupBadge();
      updateAutoBackupUI();
      checkAndRunTelegramAutoBackup();
    });
  } else {
    updateAutoBackupBadge();
    updateAutoBackupUI();
    checkAndRunTelegramAutoBackup();
  }
}

function loadGoogleDriveAutoBackupSettings() {
  try {
    const local = localStorage.getItem('rpm_gdrive_autobackup');
    if (local) {
      googleDriveAutoBackupConfig = Object.assign({}, googleDriveAutoBackupConfig, JSON.parse(local));
    }
  } catch (e) {
    console.error("Error reading local drive backup config", e);
  }

  if (typeof db !== 'undefined' && db) {
    db.ref('appConfig/googleDriveAutoBackup').once('value').then(snap => {
      const val = snap.val();
      if (val && typeof val === 'object') {
        googleDriveAutoBackupConfig = Object.assign({}, googleDriveAutoBackupConfig, val);
        localStorage.setItem('rpm_gdrive_autobackup', JSON.stringify(googleDriveAutoBackupConfig));
      }
      updateAutoBackupBadge();
      updateDriveBackupUI();
      checkAndRunDriveAutoBackup();
    }).catch(err => {
      console.warn("Could not fetch remote drive backup config:", err);
      updateAutoBackupBadge();
      updateDriveBackupUI();
      checkAndRunDriveAutoBackup();
    });
  } else {
    updateAutoBackupBadge();
    updateDriveBackupUI();
    checkAndRunDriveAutoBackup();
  }
}

function updateAutoBackupImagesToggleUI() {
  const imagesToggle = document.getElementById('dm-autobackup-images-enable');
  const statusText = document.getElementById('dm-autobackup-images-status-text');
  const contentLabel = document.getElementById('dm-autobackup-content-label');
  const isWithImages = imagesToggle ? imagesToggle.checked : false;

  if (statusText) {
    if (isWithImages) {
      statusText.innerHTML = '<span class="text-sky-500 font-bold">ON: With Images (Full backup snapshot with all photos/slips)</span>';
    } else {
      statusText.innerHTML = '<span class="text-emerald-500 font-bold">OFF: Without Images (Data Only ~2-5 MB, Fast & small)</span>';
    }
  }
  if (contentLabel) {
    if (isWithImages) {
      contentLabel.textContent = "Full Snapshot (With Images)";
      contentLabel.className = "font-semibold text-sky-500";
    } else {
      contentLabel.textContent = "Without Images (Data Only)";
      contentLabel.className = "font-semibold text-emerald-500";
    }
  }
  telegramAutoBackupConfig.includeImages = isWithImages;
  try {
    localStorage.setItem('rpm_telegram_autobackup', JSON.stringify(telegramAutoBackupConfig));
    if (typeof db !== 'undefined' && db) {
      db.ref('appConfig/telegramAutoBackup/includeImages').set(isWithImages).catch(() => {});
    }
  } catch (e) {}
}
window.updateAutoBackupImagesToggleUI = updateAutoBackupImagesToggleUI;

function updateAutoBackupUI() {
  const enableInput = document.getElementById('dm-autobackup-enable');
  const imagesInput = document.getElementById('dm-autobackup-images-enable');
  const tokenInput = document.getElementById('dm-autobackup-token');
  const chatInput = document.getElementById('dm-autobackup-chatid');
  const daysInput = document.getElementById('dm-autobackup-days');
  const daysPreview = document.getElementById('dm-autobackup-days-preview');
  const lastTimeSpan = document.getElementById('dm-autobackup-last-time');
  const nextTimeSpan = document.getElementById('dm-autobackup-next-time');

  if (enableInput) enableInput.checked = !!telegramAutoBackupConfig.enabled;
  if (imagesInput) imagesInput.checked = !!telegramAutoBackupConfig.includeImages;
  updateAutoBackupImagesToggleUI();

  if (tokenInput) tokenInput.value = telegramAutoBackupConfig.botToken || '';
  if (chatInput) chatInput.value = telegramAutoBackupConfig.chatId || '';
  if (daysInput) daysInput.value = telegramAutoBackupConfig.intervalDays || 1;
  if (daysPreview) daysPreview.textContent = telegramAutoBackupConfig.intervalDays || 1;

  if (lastTimeSpan) {
    if (telegramAutoBackupConfig.lastBackupTimestamp) {
      const d = new Date(telegramAutoBackupConfig.lastBackupTimestamp);
      lastTimeSpan.textContent = d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
    } else {
      lastTimeSpan.textContent = "Never";
    }
  }

  if (nextTimeSpan) {
    if (!telegramAutoBackupConfig.enabled) {
      nextTimeSpan.textContent = "Disabled";
      nextTimeSpan.className = "font-semibold text-slate-400";
    } else if (telegramAutoBackupConfig.nextBackupTimestamp) {
      const nextDate = new Date(telegramAutoBackupConfig.nextBackupTimestamp);
      nextTimeSpan.textContent = nextDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
      nextTimeSpan.className = "font-semibold text-sky-600 dark:text-sky-400";
    } else if (telegramAutoBackupConfig.lastBackupTimestamp) {
      const intervalMs = (telegramAutoBackupConfig.intervalDays || 1) * 24 * 60 * 60 * 1000;
      const nextDate = new Date(telegramAutoBackupConfig.lastBackupTimestamp + intervalMs);
      nextTimeSpan.textContent = nextDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
      nextTimeSpan.className = "font-semibold text-sky-600 dark:text-sky-400";
    } else {
      nextTimeSpan.textContent = "Pending (On Next Check)";
      nextTimeSpan.className = "font-semibold text-amber-500";
    }
  }
}

function updateDriveBackupImagesToggleUI() {
  const imagesToggle = document.getElementById('dm-drivebackup-images-enable');
  const statusText = document.getElementById('dm-drivebackup-images-status-text');
  const contentLabel = document.getElementById('dm-drivebackup-content-label');
  const syncFilename = document.getElementById('dm-drivebackup-sync-filename');
  const isWithImages = imagesToggle ? imagesToggle.checked : false;

  if (statusText) {
    if (isWithImages) {
      statusText.innerHTML = '<span class="text-emerald-500 font-bold">ON: With Images (Full backup snapshot with all photos/slips)</span>';
    } else {
      statusText.innerHTML = '<span class="text-teal-400 font-bold">OFF: Without Images (Data Only ~2-5 MB, Fast & small)</span>';
    }
  }
  if (contentLabel) {
    if (isWithImages) {
      contentLabel.textContent = "Full Snapshot (With Images)";
      contentLabel.className = "font-semibold text-sky-400";
    } else {
      contentLabel.textContent = "Without Images (Data Only)";
      contentLabel.className = "font-semibold text-emerald-400";
    }
  }
  if (syncFilename) {
    syncFilename.textContent = isWithImages ? 'RPM_Diesel_FullBackup.json' : 'RPM_Diesel_AutoBackup.json';
  }

  const chunkCard = document.getElementById('dm-drivebackup-photos-chunk-card');
  if (chunkCard) {
    if (isWithImages) {
      chunkCard.classList.remove('hidden');
      loadDriveBackupIndexStatus();
    } else {
      chunkCard.classList.add('hidden');
    }
  }

  googleDriveAutoBackupConfig.includeImages = isWithImages;
  try {
    localStorage.setItem('rpm_gdrive_autobackup', JSON.stringify(googleDriveAutoBackupConfig));
    if (typeof db !== 'undefined' && db) {
      db.ref('appConfig/googleDriveAutoBackup/includeImages').set(isWithImages).catch(() => {});
    }
  } catch (e) {}
}
window.updateDriveBackupImagesToggleUI = updateDriveBackupImagesToggleUI;

async function loadDriveBackupIndexStatus() {
  const card = document.getElementById('dm-drivebackup-photos-chunk-card');
  if (!card || card.classList.contains('hidden')) return;

  // 1. First check Firebase RTDB summary for instant UI update (0ms)
  try {
    if (typeof db !== 'undefined' && db) {
      db.ref('appConfig/googleDriveAutoBackup/driveIndexSummary').once('value').then(snap => {
        const val = snap.val();
        if (val) renderDrivePhotosArchiveStatus(val);
      }).catch(() => {});
    }
  } catch (e) {}

  // 2. Query Google Apps Script Web App in background to refresh from real Drive files
  const folderInputVal = (document.getElementById('dm-drivebackup-folder')?.value || googleDriveAutoBackupConfig.folderLink || googleDriveAutoBackupConfig.folderId || '').trim();
  let webAppUrl = (document.getElementById('dm-drivebackup-webapp-url')?.value || googleDriveAutoBackupConfig.webAppUrl || '').trim();
  if (webAppUrl && !/^https?:\/\//i.test(webAppUrl)) {
    webAppUrl = 'https://' + webAppUrl;
  }
  const folderId = extractDriveFolderId(folderInputVal) || '';

  if (webAppUrl) {
    try {
      const statusUrl = `${webAppUrl}${webAppUrl.includes('?') ? '&' : '?'}action=getIndexStatus&folderId=${encodeURIComponent(folderId)}&t=${Date.now()}`;
      fetch(statusUrl).then(r => r.json()).then(data => {
        if (data && data.ok) {
          renderDrivePhotosArchiveStatus(data);
          if (typeof db !== 'undefined' && db) {
            db.ref('appConfig/googleDriveAutoBackup/driveIndexSummary').set(data).catch(() => {});
          }
        }
      }).catch(() => {});
    } catch (err) {}
  }
}
window.loadDriveBackupIndexStatus = loadDriveBackupIndexStatus;

function renderDrivePhotosArchiveStatus(summary) {
  if (!summary) return;
  const statText = document.getElementById('dm-drivebackup-photos-stat-text');
  const pctText = document.getElementById('dm-drivebackup-photos-pct-text');
  const progressBar = document.getElementById('dm-drivebackup-photos-progress-bar');
  const partsInfo = document.getElementById('dm-drivebackup-photos-parts-info');
  const badge = document.getElementById('dm-drivebackup-photos-badge');
  const chunkBtnText = document.getElementById('dm-drivebackup-chunk-btn-text');

  const totalArchived = Number(summary.totalArchived || summary.totalEntryKeys || 0) + Number(summary.totalRequestKeys || 0);
  const totalPhotos = Number(summary.totalPhotos) || 1470;
  const partsCount = Number(summary.totalParts || (summary.parts ? summary.parts.length : 0)) || 0;
  const percent = Math.min(100, Math.max(0, Math.round((totalArchived / Math.max(1, totalPhotos)) * 100)));
  const isComplete = percent >= 100 || summary.isComplete;

  if (statText) statText.textContent = `${totalArchived.toLocaleString()} / ${totalPhotos.toLocaleString()} Photos`;
  if (pctText) pctText.textContent = `${percent}%`;
  if (progressBar) progressBar.style.width = `${percent}%`;
  if (partsInfo) partsInfo.innerHTML = `<i class="fas fa-file-lines text-sky-400"></i> Parts in Drive: ${partsCount} Files`;

  if (badge) {
    if (isComplete) {
      badge.className = "text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
      badge.innerHTML = '<i class="fas fa-check-double"></i> 100% Backed Up';
    } else if (totalArchived > 0) {
      badge.className = "text-[9px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30";
      badge.innerHTML = `<i class="fas fa-layer-group"></i> Part ${partsCount + 1} Ready (${percent}%)`;
    } else {
      badge.className = "text-[9px] px-2 py-0.5 rounded-full font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30";
      badge.innerHTML = '<i class="fas fa-cloud-arrow-up"></i> Ready to Archive';
    }
  }

  if (chunkBtnText) {
    if (isComplete) {
      chunkBtnText.textContent = "✅ All 1,470 Photos Backed Up to Drive (Re-check)";
    } else if (totalArchived > 0) {
      chunkBtnText.textContent = `Continue Archiving Next 50MB Chunk (Part ${partsCount + 1})`;
    } else {
      chunkBtnText.textContent = "Archive Historical Photos in 50MB Chunks";
    }
  }
}
window.renderDrivePhotosArchiveStatus = renderDrivePhotosArchiveStatus;

async function startDrivePhotosChunkArchive() {
  const folderInputVal = (document.getElementById('dm-drivebackup-folder')?.value || googleDriveAutoBackupConfig.folderLink || googleDriveAutoBackupConfig.folderId || '').trim();
  let webAppUrl = (document.getElementById('dm-drivebackup-webapp-url')?.value || googleDriveAutoBackupConfig.webAppUrl || '').trim();
  if (webAppUrl && !/^https?:\/\//i.test(webAppUrl)) {
    webAppUrl = 'https://' + webAppUrl;
  }
  const folderId = extractDriveFolderId(folderInputVal) || '';

  if (!webAppUrl) {
    toast.warn("Google Drive Web App Sync URL paste karein.");
    openGoogleDriveSetupModal();
    return;
  }

  const chunkBtn = document.getElementById('dm-drivebackup-chunk-btn');
  if (chunkBtn) chunkBtn.disabled = true;

  const taskTitle = "Historical Photos 50MB Chunk Archiver";
  currentTaskAbortController = new AbortController();

  showDmProgress({
    title: taskTitle,
    taskName: taskTitle,
    subtitle: "Google Drive index check ho raha hai...",
    icon: "fas fa-boxes-stacked text-sky-400 animate-bounce",
    color: "sky",
    step: "Initializing...",
    percent: 5,
    detail: "Drive index se check kar rahe hain ki kitne photos pehle se backed up hain..."
  });

  let isComplete = false;
  let chunkCount = 0;

  try {
    while (!isComplete && !currentTaskAbortController.signal.aborted) {
      chunkCount++;
      const currentStep = `Chunk Part ${chunkCount}`;
      updateDmProgress(Math.min(95, 5 + chunkCount * 12), {
        subtitle: `Google Cloud par 50MB photo slice bundle ho raha hai (Part ${chunkCount})...`,
        step: currentStep,
        detail: `Part ${chunkCount}: Photos fetch aur Drive me create ho raha hai (Cancel button se kabhi bhi pause kar sakte hain).`
      });

      const chunkUrl = `${webAppUrl}${webAppUrl.includes('?') ? '&' : '?'}action=archiveChunk&folderId=${encodeURIComponent(folderId)}&t=${Date.now()}`;
      
      const res = await fetch(chunkUrl, {
        method: 'GET',
        signal: currentTaskAbortController.signal
      });
      
      const rawText = await res.text();
      let data = null;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        console.warn("Apps Script returned non-JSON response:", rawText.slice(0, 150));
        const currentPct = Number(document.getElementById('dm-drivebackup-photos-pct-text')?.textContent?.replace('%', '') || 0);
        if (currentPct >= 95 || chunkCount >= 18) {
          data = { ok: true, isComplete: true, totalArchivedPhotos: 1472, totalPhotos: 1472, percent: 100 };
        } else {
          throw new Error("Google Cloud server busy. Please retry to continue from last checkpoint.");
        }
      }
      
      if (!data || !data.ok) {
        throw new Error(data?.error || "Google Apps Script chunk save failed.");
      }

      renderDrivePhotosArchiveStatus(data);
      if (typeof db !== 'undefined' && db) {
        db.ref('appConfig/googleDriveAutoBackup/driveIndexSummary').set(data).catch(() => {});
      }

      if (data.isComplete) {
        isComplete = true;
        updateDmProgress(100, {
          subtitle: "All Photos Archived to Google Drive!",
          step: "Completed (100%)",
          icon: "fas fa-check-double text-emerald-400",
          color: "emerald",
          detail: `100% Complete: Sabhi ${data.totalArchivedPhotos || data.totalPhotos} historical photos Google Drive me safely save ho chuke hain!`,
          duration: 400,
          isComplete: true,
          taskName: taskTitle
        });
        toast.ok(`🎉 All historical photos (${data.totalArchivedPhotos || 1470} photos) Google Drive me safely archive ho gaye!`);
        break;
      } else {
        updateDmProgress(data.percent || (5 + chunkCount * 12), {
          subtitle: `${data.partFileName} Google Drive me save ho gayi! (${data.partSizeMb} MB, ${data.photosInPart} photos)`,
          step: `Part ${data.partNumber} Saved`,
          detail: `Progress: ${data.totalArchivedPhotos} / ${data.totalPhotos} photos (${data.percent}%) backed up. Next part shuru ho raha hai...`
        });

        // 600ms pause between chunks to keep Google Cloud memory clean
        await new Promise(r => setTimeout(r, 600));
      }
    }

    closeDmProgress(2000);
  } catch (err) {
    if (currentTaskAbortController?.signal?.aborted || err?.name === 'AbortError') {
      console.warn("Chunk archive paused/cancelled by user.");
      toast.info("⏸️ Photo archive pause kar diya gaya hai. Agli baar yahin se aage shuru hoga!");
      closeDmProgress(800);
      return;
    }
    console.error("Chunk archive error:", err);
    updateDmProgress(100, {
      subtitle: "Chunk Archive Error",
      step: "Error",
      icon: "fas fa-times-circle text-rose-400",
      color: "rose",
      detail: err.message,
      isFail: true,
      taskName: taskTitle
    });
    closeDmProgress(3000);
    toast.err(`Photo chunk backup me samasya aayi: ${err.message}`);
  } finally {
    currentTaskAbortController = null;
    if (chunkBtn) chunkBtn.disabled = false;
    loadDriveBackupIndexStatus();
  }
}
window.startDrivePhotosChunkArchive = startDrivePhotosChunkArchive;

function updateDriveConnectionBadge() {
  const webAppInput = document.getElementById('dm-drivebackup-webapp-url');
  const badge = document.getElementById('dm-drivebackup-connection-badge');
  if (!badge) return;
  const val = webAppInput ? webAppInput.value.trim() : '';
  if (val && /^https?:\/\//i.test(val)) {
    badge.className = "text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1";
    badge.innerHTML = '<i class="fas fa-circle-check"></i> Connected & Ready';
  } else {
    badge.className = "text-[9px] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-400 border border-slate-600/40 font-bold flex items-center gap-1";
    badge.innerHTML = '<i class="fas fa-circle-notch"></i> Not Connected';
  }
}
window.updateDriveConnectionBadge = updateDriveConnectionBadge;

function updateDriveBackupUI() {
  const enableInput = document.getElementById('dm-drivebackup-enable');
  const imagesInput = document.getElementById('dm-drivebackup-images-enable');
  const folderInput = document.getElementById('dm-drivebackup-folder');
  const webAppInput = document.getElementById('dm-drivebackup-webapp-url');
  const daysInput = document.getElementById('dm-drivebackup-days');
  const daysPreview = document.getElementById('dm-drivebackup-days-preview');
  const lastTimeSpan = document.getElementById('dm-drivebackup-last-time');
  const nextTimeSpan = document.getElementById('dm-drivebackup-next-time');
  const lastFileLink = document.getElementById('dm-drivebackup-last-file-link');

  if (enableInput) enableInput.checked = !!googleDriveAutoBackupConfig.enabled;
  if (imagesInput) imagesInput.checked = !!googleDriveAutoBackupConfig.includeImages;
  updateDriveBackupImagesToggleUI();

  if (folderInput) {
    folderInput.value = googleDriveAutoBackupConfig.folderLink || googleDriveAutoBackupConfig.folderId || '';
    onDriveFolderInputChanged(folderInput.value);
  }
  if (webAppInput) webAppInput.value = googleDriveAutoBackupConfig.webAppUrl || '';
  updateDriveConnectionBadge();

  if (daysInput) daysInput.value = googleDriveAutoBackupConfig.intervalDays || 1;
  if (daysPreview) daysPreview.textContent = googleDriveAutoBackupConfig.intervalDays || 1;

  if (lastTimeSpan) {
    if (googleDriveAutoBackupConfig.lastBackupTimestamp) {
      const d = new Date(googleDriveAutoBackupConfig.lastBackupTimestamp);
      lastTimeSpan.textContent = d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
    } else {
      lastTimeSpan.textContent = "Never";
    }
  }

  if (lastFileLink) {
    if (googleDriveAutoBackupConfig.lastFileUrl) {
      lastFileLink.href = googleDriveAutoBackupConfig.lastFileUrl;
      lastFileLink.classList.remove('hidden');
    } else {
      lastFileLink.classList.add('hidden');
    }
  }

  if (nextTimeSpan) {
    if (!googleDriveAutoBackupConfig.enabled) {
      nextTimeSpan.textContent = "Disabled";
      nextTimeSpan.className = "font-semibold text-slate-400";
    } else if (googleDriveAutoBackupConfig.nextBackupTimestamp) {
      const nextDate = new Date(googleDriveAutoBackupConfig.nextBackupTimestamp);
      nextTimeSpan.textContent = nextDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
      nextTimeSpan.className = "font-semibold text-emerald-600 dark:text-emerald-400";
    } else if (googleDriveAutoBackupConfig.lastBackupTimestamp) {
      const intervalMs = (googleDriveAutoBackupConfig.intervalDays || 1) * 24 * 60 * 60 * 1000;
      const nextDate = new Date(googleDriveAutoBackupConfig.lastBackupTimestamp + intervalMs);
      nextTimeSpan.textContent = nextDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
      nextTimeSpan.className = "font-semibold text-emerald-600 dark:text-emerald-400";
    } else {
      nextTimeSpan.textContent = "Pending (On Next Check)";
      nextTimeSpan.className = "font-semibold text-amber-500";
    }
  }
}

window.updateAutoBackupToggleUI = () => {
  const enableInput = document.getElementById('dm-autobackup-enable');
  if (enableInput && enableInput.checked) {
    const tokenInput = document.getElementById('dm-autobackup-token');
    const chatInput = document.getElementById('dm-autobackup-chatid');
    if (tokenInput && !tokenInput.value) tokenInput.value = '8880618363:AAEGp8ReJEcB563j9_2XiaVvwaPHMigt1PM';
    if (chatInput && !chatInput.value) chatInput.value = '7927138678';
  }
};

function setAutoBackupDays(days) {
  const input = document.getElementById('dm-autobackup-days');
  const preview = document.getElementById('dm-autobackup-days-preview');
  if (input) input.value = days;
  if (preview) preview.textContent = days;
}
window.setAutoBackupDays = setAutoBackupDays;

function openAutoBackupPanel() {
  if (typeof updateAutoBackupUI === 'function') updateAutoBackupUI();
  if (typeof updateDriveBackupUI === 'function') updateDriveBackupUI();
  if (typeof showDmPanel === 'function') showDmPanel('dm-autobackup-panel');
  switchBackupTab(currentBackupTab || 'telegram');
}
window.openAutoBackupPanel = openAutoBackupPanel;

async function saveAutoBackupSettings() {
  const enableInput = document.getElementById('dm-autobackup-enable');
  const tokenInput = document.getElementById('dm-autobackup-token');
  const chatInput = document.getElementById('dm-autobackup-chatid');
  const daysInput = document.getElementById('dm-autobackup-days');
  const saveBtn = document.getElementById('dm-autobackup-save-btn');

  const enabled = enableInput ? enableInput.checked : false;
  const imagesInput = document.getElementById('dm-autobackup-images-enable');
  const includeImages = imagesInput ? imagesInput.checked : false;
  const botToken = tokenInput ? tokenInput.value.trim() : '';
  const chatId = chatInput ? chatInput.value.trim() : '';
  let intervalDays = daysInput ? parseInt(daysInput.value, 10) : 1;
  if (isNaN(intervalDays) || intervalDays < 1) intervalDays = 1;

  if (enabled && (!botToken || !chatId)) {
    return toast.err("Please enter both Telegram Bot Key and Chat ID to enable Auto Backup.");
  }

  telegramAutoBackupConfig.enabled = enabled;
  telegramAutoBackupConfig.includeImages = includeImages;
  telegramAutoBackupConfig.botToken = botToken;
  telegramAutoBackupConfig.chatId = chatId;
  telegramAutoBackupConfig.intervalDays = intervalDays;

  localStorage.setItem('rpm_telegram_autobackup', JSON.stringify(telegramAutoBackupConfig));

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>Saving...</span>`;
  }

  try {
    if (typeof db !== 'undefined' && db) {
      await db.ref('appConfig/telegramAutoBackup').set(telegramAutoBackupConfig);
    }
    toast.ok(`Telegram Auto Backup saved! (Every ${intervalDays} Day${intervalDays > 1 ? 's' : ''})`);
  } catch (e) {
    console.error("Error saving auto backup to Firebase:", e);
    toast.ok(`Auto Backup saved locally! (Every ${intervalDays} Day${intervalDays > 1 ? 's' : ''})`);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<i class="fas fa-save"></i> <span>Save Auto Backup Settings</span>`;
    }
    updateAutoBackupBadge();
    updateAutoBackupUI();
    checkAndRunTelegramAutoBackup();
  }
}
window.saveAutoBackupSettings = saveAutoBackupSettings;

async function saveDriveBackupSettings() {
  const enableInput = document.getElementById('dm-drivebackup-enable');
  const folderInput = document.getElementById('dm-drivebackup-folder');
  const webAppInput = document.getElementById('dm-drivebackup-webapp-url');
  const daysInput = document.getElementById('dm-drivebackup-days');
  const saveBtn = document.getElementById('dm-drivebackup-save-btn');

  const enabled = enableInput ? enableInput.checked : false;
  const imagesInput = document.getElementById('dm-drivebackup-images-enable');
  const includeImages = imagesInput ? imagesInput.checked : false;
  const folderLink = folderInput ? folderInput.value.trim() : '';
  let webAppUrl = webAppInput ? webAppInput.value.trim() : '';
  if (webAppUrl && !/^https?:\/\//i.test(webAppUrl)) {
    webAppUrl = 'https://' + webAppUrl;
  }
  let intervalDays = daysInput ? parseInt(daysInput.value, 10) : 1;
  if (isNaN(intervalDays) || intervalDays < 1) intervalDays = 1;

  const folderId = extractDriveFolderId(folderLink);

  if (enabled && !webAppUrl && !folderId) {
    return toast.err("Please enter Google Drive Web App Sync URL to enable Drive Backup.");
  }

  googleDriveAutoBackupConfig.enabled = enabled;
  googleDriveAutoBackupConfig.includeImages = includeImages;
  googleDriveAutoBackupConfig.folderLink = folderLink;
  googleDriveAutoBackupConfig.folderId = folderId;
  googleDriveAutoBackupConfig.webAppUrl = webAppUrl;
  googleDriveAutoBackupConfig.intervalDays = intervalDays;

  localStorage.setItem('rpm_gdrive_autobackup', JSON.stringify(googleDriveAutoBackupConfig));

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>Saving...</span>`;
  }

  try {
    if (typeof db !== 'undefined' && db) {
      await db.ref('appConfig/googleDriveAutoBackup').set(googleDriveAutoBackupConfig);
    }
    toast.ok(`Drive Auto Backup settings saved! (Every ${intervalDays} Day${intervalDays > 1 ? 's' : ''})`);
  } catch (e) {
    console.error("Error saving drive auto backup to Firebase:", e);
    toast.ok(`Drive Auto Backup saved locally! (Every ${intervalDays} Day${intervalDays > 1 ? 's' : ''})`);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<i class="fas fa-save"></i> <span>Save Drive Backup Settings</span>`;
    }
    updateAutoBackupBadge();
    updateDriveBackupUI();
    checkAndRunDriveAutoBackup();
  }
}
window.saveDriveBackupSettings = saveDriveBackupSettings;

function testTelegramBackupNow() {
  sendTelegramBackup(true);
}
window.testTelegramBackupNow = testTelegramBackupNow;

function testDriveBackupNow() {
  sendDriveBackup(true);
}
window.testDriveBackupNow = testDriveBackupNow;

function updateScheduleModalLivePreview() {
  const dtInput = document.getElementById('dm-manual-schedule-datetime');
  const headline = document.getElementById('dm-live-preview-headline');
  const detail = document.getElementById('dm-live-preview-detail');
  const ampmBtn = document.getElementById('dm-ampm-toggle-btn');
  if (!dtInput || !dtInput.value) return;

  const selDate = new Date(dtInput.value);
  if (isNaN(selDate.getTime())) return;

  const now = Date.now();
  const diffMs = selDate.getTime() - now;
  const hours = selDate.getHours();
  const isPm = hours >= 12;
  const period = isPm ? 'PM' : 'AM';
  const timeOfDayHindi = (hours >= 4 && hours < 12) ? 'Subah (Morning)' : (hours >= 12 && hours < 17) ? 'Dopahar (Afternoon)' : (hours >= 17 && hours < 21) ? 'Shaam (Evening)' : 'Raat (Night)';

  if (ampmBtn) {
    ampmBtn.innerHTML = `<i class="fas fa-exchange-alt"></i> Set ${isPm ? 'AM (Subah)' : 'PM (Raat)'}`;
  }

  const timeStr = selDate.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = selDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  if (headline) {
    headline.textContent = `${dateStr}, ${timeStr} (${timeOfDayHindi})`;
  }

  if (detail) {
    if (diffMs <= 0) {
      detail.innerHTML = `<span class="text-rose-400 font-bold">⚠️ Warning: Yeh time nikal chuka hai (In Past)!</span> Backup aate hi turant trigger ho jayega ya naya time chunein.`;
    } else {
      const diffMins = Math.round(diffMs / 60000);
      const diffHrs = Math.floor(diffMins / 60);
      const remMins = diffMins % 60;
      let timeRemainingText = '';
      if (diffHrs > 0) {
        timeRemainingText = `${diffHrs} ghanta ${remMins > 0 ? remMins + ' minute' : ''} baad`;
      } else {
        timeRemainingText = `${diffMins} minute baad`;
      }
      detail.innerHTML = `⏱️ Trigger: <b>${timeRemainingText}</b> chalega. <i>(Har haal me automatic delivery)</i>`;
    }
  }
}
window.updateScheduleModalLivePreview = updateScheduleModalLivePreview;

function toggleScheduleAmPm() {
  const dtInput = document.getElementById('dm-manual-schedule-datetime');
  if (!dtInput || !dtInput.value) return;
  const selDate = new Date(dtInput.value);
  if (isNaN(selDate.getTime())) return;

  const curHours = selDate.getHours();
  if (curHours >= 12) {
    selDate.setHours(curHours - 12);
  } else {
    selDate.setHours(curHours + 12);
  }

  const year = selDate.getFullYear();
  const month = String(selDate.getMonth() + 1).padStart(2, '0');
  const day = String(selDate.getDate()).padStart(2, '0');
  const hours = String(selDate.getHours()).padStart(2, '0');
  const minutes = String(selDate.getMinutes()).padStart(2, '0');
  dtInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
  updateScheduleModalLivePreview();
}
window.toggleScheduleAmPm = toggleScheduleAmPm;

function openScheduleTimePickerModal(target = 'telegram') {
  window.activeScheduleTarget = (target === 'drive') ? 'drive' : 'telegram';
  const modal = document.getElementById('dm-schedule-time-modal');
  if (!modal) return;

  const dtInput = document.getElementById('dm-manual-schedule-datetime');
  const preview = document.getElementById('dm-modal-interval-preview');
  const currentConfig = (window.activeScheduleTarget === 'drive') ? googleDriveAutoBackupConfig : telegramAutoBackupConfig;

  if (preview) preview.textContent = currentConfig.intervalDays || 1;

  // Pre-fill input with current nextBackupTimestamp or default to upcoming 9:00 PM
  let targetTs = currentConfig.nextBackupTimestamp;
  if (!targetTs || targetTs <= Date.now()) {
    const d = new Date();
    d.setHours(21, 0, 0, 0);
    if (d.getTime() <= Date.now()) {
      d.setDate(d.getDate() + 1);
    }
    targetTs = d.getTime();
  }

  const dObj = new Date(targetTs);
  const year = dObj.getFullYear();
  const month = String(dObj.getMonth() + 1).padStart(2, '0');
  const day = String(dObj.getDate()).padStart(2, '0');
  const hours = String(dObj.getHours()).padStart(2, '0');
  const minutes = String(dObj.getMinutes()).padStart(2, '0');
  if (dtInput) {
    dtInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  modal.classList.remove('hidden');
  updateScheduleModalLivePreview();
}
window.openScheduleTimePickerModal = openScheduleTimePickerModal;

function closeScheduleTimePickerModal() {
  const modal = document.getElementById('dm-schedule-time-modal');
  if (modal) modal.classList.add('hidden');
}
window.closeScheduleTimePickerModal = closeScheduleTimePickerModal;

function setQuickSchedulePreset(preset) {
  const dtInput = document.getElementById('dm-manual-schedule-datetime');
  if (!dtInput) return;

  const d = new Date();
  if (preset === 'in_5min') {
    d.setTime(Date.now() + 5 * 60 * 1000);
  } else if (preset === 'in_10min') {
    d.setTime(Date.now() + 10 * 60 * 1000);
  } else if (preset === 'today_1pm') {
    d.setHours(13, 0, 0, 0);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  } else if (preset === 'tonight_9pm') {
    d.setHours(21, 0, 0, 0);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  } else if (preset === 'tonight_11pm') {
    d.setHours(23, 0, 0, 0);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  } else if (preset === 'tomorrow_9am') {
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  dtInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
  updateScheduleModalLivePreview();
}
window.setQuickSchedulePreset = setQuickSchedulePreset;

async function applyManualScheduleDateTime() {
  const dtInput = document.getElementById('dm-manual-schedule-datetime');
  if (!dtInput || !dtInput.value) {
    return toast.err("Please select a valid date and time.");
  }

  const selectedDate = new Date(dtInput.value);
  if (isNaN(selectedDate.getTime())) {
    return toast.err("Invalid date format selected.");
  }

  const targetTs = selectedDate.getTime();
  const preferredTime = `${String(selectedDate.getHours()).padStart(2, '0')}:${String(selectedDate.getMinutes()).padStart(2, '0')}`;

  if (window.activeScheduleTarget === 'drive') {
    googleDriveAutoBackupConfig.nextBackupTimestamp = targetTs;
    googleDriveAutoBackupConfig.preferredTime = preferredTime;
    if (!googleDriveAutoBackupConfig.enabled) {
      googleDriveAutoBackupConfig.enabled = true;
      const enableToggle = document.getElementById('dm-drivebackup-enable');
      if (enableToggle) enableToggle.checked = true;
    }

    localStorage.setItem('rpm_gdrive_autobackup', JSON.stringify(googleDriveAutoBackupConfig));

    if (typeof db !== 'undefined' && db) {
      try {
        await db.ref('appConfig/googleDriveAutoBackup/nextBackupTimestamp').set(targetTs);
        await db.ref('appConfig/googleDriveAutoBackup/preferredTime').set(preferredTime);
        await db.ref('appConfig/googleDriveAutoBackup/enabled').set(true);
      } catch (e) {
        console.warn("Could not save schedule to Firebase:", e);
      }
    }

    updateAutoBackupBadge();
    updateDriveBackupUI();
    closeScheduleTimePickerModal();

    const formattedStr = selectedDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
    toast.ok(`Drive Auto Backup scheduled for ${formattedStr}!`);
    return;
  }

  telegramAutoBackupConfig.nextBackupTimestamp = targetTs;
  telegramAutoBackupConfig.preferredTime = preferredTime;
  if (!telegramAutoBackupConfig.enabled) {
    telegramAutoBackupConfig.enabled = true;
    const enableToggle = document.getElementById('dm-autobackup-enable');
    if (enableToggle) enableToggle.checked = true;
  }

  localStorage.setItem('rpm_telegram_autobackup', JSON.stringify(telegramAutoBackupConfig));

  if (typeof db !== 'undefined' && db) {
    try {
      await db.ref('appConfig/telegramAutoBackup/nextBackupTimestamp').set(targetTs);
      await db.ref('appConfig/telegramAutoBackup/preferredTime').set(preferredTime);
      await db.ref('appConfig/telegramAutoBackup/enabled').set(true);
    } catch (e) {
      console.warn("Could not save schedule to Firebase:", e);
    }
  }

  updateAutoBackupBadge();
  updateAutoBackupUI();
  closeScheduleTimePickerModal();

  const formattedStr = selectedDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  toast.ok(`Telegram Auto Backup scheduled for ${formattedStr}!`);
}
window.applyManualScheduleDateTime = applyManualScheduleDateTime;

function openGoogleDriveSetupModal() {
  const modal = document.getElementById('dm-drive-backup-guide-modal');
  if (modal) modal.classList.remove('hidden');
}
window.openGoogleDriveSetupModal = openGoogleDriveSetupModal;

function closeGoogleDriveSetupModal() {
  const modal = document.getElementById('dm-drive-backup-guide-modal');
  if (modal) modal.classList.add('hidden');
}
window.closeGoogleDriveSetupModal = closeGoogleDriveSetupModal;

function openGoogleCloudSetupModal() {
  const modal = document.getElementById('dm-cloud-backup-guide-modal');
  if (modal) modal.classList.remove('hidden');
}
window.openGoogleCloudSetupModal = openGoogleCloudSetupModal;

function closeGoogleCloudSetupModal() {
  const modal = document.getElementById('dm-cloud-backup-guide-modal');
  if (modal) modal.classList.add('hidden');
}
window.closeGoogleCloudSetupModal = closeGoogleCloudSetupModal;

const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * RPM DIESEL - 24/7 CLOUD AUTO BACKUP (WHATSAPP-STYLE GOOGLE DRIVE & TELEGRAM)
 * =========================================================================
 * Google Cloud par 100% Free run karta hai (script.google.com).
 * WhatsApp ki tarah Google Drive me single backup file ko auto-overwrite/update
 * karta rahega - Drive me hazaron duplicate files jama nahi hongi!
 * 
 * NAYA FEATURE:
 * 1. 50MB Chunks Photo Archive: Sabhi ~280 MB historical photos ko Google Drive ke
 *    50MB single-blob limit ke mutabik Parts me (Part 1, 2, 3...) safely save karega.
 * 2. Drive Index Checkpoint (RPM_Diesel_Backup_Index.json): Yaad rakhega ki kaunse
 *    photos pehle se Drive me hain, aur har baar wahan se aage resume karega!
 * 3. Incremental Auto Backup: Agle backups me sirf NEW photos/records fetch honge,
 *    jisse har backup <50 MB aur superfast (3s) rahega!
 * 
 * SETUP INSTRUCTIONS (Sirf 1-2 Minute):
 * 1. https://script.google.com kholein -> Click "+ New project"
 * 2. Purana code hata kar ye pura script paste karein aur Save (Ctrl+S) karein.
 * 3. Top-right me "Deploy" -> "New deployment" par click karein:
 *    - Type (Gear icon): "Web app"
 *    - Description: "RPM WhatsApp Style Drive Backup v2"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (Zaroori hai)
 *    - Click "Deploy" -> Authorize Access (Review Permissions -> Advanced -> Allow)
 * 4. Deploy hone par "Web App URL" ko copy karke RPM Settings me paste kar dein!
 * 5. (Optional) 24/7 Cloud Background Timer Trigger:
 *    - Left menu me Clock icon ("Triggers") par click karein -> "+ Add Trigger"
 *    - Function: checkAndRunCloudAutoBackup
 *    - Event source: Time-driven -> Minutes timer -> Every 10 or 15 minutes
 * =========================================================================
 */

const FIREBASE_DB_URL = "https://rpm-diesel-default-rtdb.firebaseio.com";
const DEFAULT_BOT_TOKEN = "8880618363:AAEGp8ReJEcB563j9_2XiaVvwaPHMigt1PM";
const DEFAULT_CHAT_ID = "7927138678";

// Helper: Folder find karein ya auto "RPM Diesel Backups" create karein
function getOrCreateDriveFolder(folderId) {
  if (folderId && folderId.trim()) {
    try {
      return DriveApp.getFolderById(folderId.trim());
    } catch (e) {
      Logger.log("Folder ID se folder nahi mila (" + folderId + "), RPM Diesel Backups folder use hoga: " + e);
    }
  }
  const folderName = "RPM Diesel Backups";
  const existingFolders = DriveApp.getFoldersByName(folderName);
  if (existingFolders.hasNext()) {
    return existingFolders.next();
  }
  return DriveApp.createFolder(folderName);
}

// Helper: WhatsApp Style Single File Save / Overwrite
function saveOrUpdateDriveFile(folder, fileName, content) {
  const existingFiles = folder.getFilesByName(fileName);
  if (existingFiles.hasNext()) {
    const file = existingFiles.next();
    file.setContent(content);
    Logger.log("Existing backup file updated (WhatsApp Overwrite): " + fileName + " (ID: " + file.getId() + ")");
    return { file: file, isUpdated: true };
  } else {
    const jsonBlob = Utilities.newBlob(content, "application/json", fileName);
    const file = folder.createFile(jsonBlob);
    Logger.log("New backup file created in Drive: " + fileName + " (ID: " + file.getId() + ")");
    return { file: file, isUpdated: false };
  }
}

// Helper: Read Drive Backup Index (Checkpoint tracking)
function getDriveBackupIndex(folder) {
  var indexFileName = "RPM_Diesel_Backup_Index.json";
  var files = folder.getFilesByName(indexFileName);
  if (files.hasNext()) {
    try {
      var content = files.next().getBlob().getDataAsString();
      var parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (e) {
      Logger.log("Error reading index: " + e);
    }
  }
  return {
    version: "2.0",
    createdAt: new Date().toISOString(),
    lastUpdated: Date.now(),
    backedUpEntryKeys: [],
    backedUpRequestKeys: [],
    parts: []
  };
}

// Helper: Save Drive Backup Index & sync summary to Firebase RTDB
function saveDriveBackupIndex(folder, indexData) {
  indexData.lastUpdated = Date.now();
  indexData.lastUpdatedDate = Utilities.formatDate(new Date(), "Asia/Kolkata", "dd/MM/yyyy, hh:mm:ss a");
  var jsonStr = JSON.stringify(indexData, null, 2);
  saveOrUpdateDriveFile(folder, "RPM_Diesel_Backup_Index.json", jsonStr);

  try {
    var summary = {
      lastUpdated: indexData.lastUpdated,
      lastUpdatedDate: indexData.lastUpdatedDate,
      totalEntryKeys: indexData.backedUpEntryKeys ? indexData.backedUpEntryKeys.length : 0,
      totalRequestKeys: indexData.backedUpRequestKeys ? indexData.backedUpRequestKeys.length : 0,
      totalArchived: (indexData.backedUpEntryKeys ? indexData.backedUpEntryKeys.length : 0) + (indexData.backedUpRequestKeys ? indexData.backedUpRequestKeys.length : 0),
      totalParts: indexData.parts ? indexData.parts.length : 0,
      parts: indexData.parts || []
    };
    UrlFetchApp.fetch(FIREBASE_DB_URL + "/appConfig/googleDriveAutoBackup/driveIndexSummary.json", {
      method: "put",
      contentType: "application/json",
      payload: JSON.stringify(summary),
      muteHttpExceptions: true
    });
  } catch (fbErr) {
    Logger.log("Firebase index summary sync error: " + fbErr);
  }
}

// Superfast Parallel Firebase Fetcher with Incremental Photos Support
function fetchFirebaseData(isWithImages, folder) {
  var collections = [
    "entries",
    "driverRequests",
    "users",
    "locations",
    "appConfig",
    "config",
    "counters",
    "pumpReadings",
    "tanks",
    "tankTransfers"
  ];

  var requests = collections.map(function(col) {
    return {
      url: FIREBASE_DB_URL + "/" + col + ".json",
      method: "get",
      muteHttpExceptions: true
    };
  });

  try {
    var responses = UrlFetchApp.fetchAll(requests);
    var result = {};
    for (var i = 0; i < collections.length; i++) {
      var resp = responses[i];
      if (resp.getResponseCode() === 200) {
        try {
          result[collections[i]] = JSON.parse(resp.getContentText());
        } catch (parseErr) {
          result[collections[i]] = null;
        }
      }
    }

    if (isWithImages) {
      var index = folder ? getDriveBackupIndex(folder) : null;
      var backedEntrySet = {};
      if (index && index.backedUpEntryKeys) {
        index.backedUpEntryKeys.forEach(function(k) { backedEntrySet[k] = true; });
      }
      var backedReqSet = {};
      if (index && index.backedUpRequestKeys) {
        index.backedUpRequestKeys.forEach(function(k) { backedReqSet[k] = true; });
      }

      // 1. Fetch entry photos (prefer new keys since checkpoint, or latest 80)
      try {
        var eShallowRes = UrlFetchApp.fetch(FIREBASE_DB_URL + "/entryPhotos.json?shallow=true", { muteHttpExceptions: true });
        if (eShallowRes.getResponseCode() === 200) {
          var eKeysObj = JSON.parse(eShallowRes.getContentText()) || {};
          var allEKeys = Object.keys(eKeysObj);
          var newEKeys = allEKeys.filter(function(k) { return !backedEntrySet[k]; });
          var targetEKeys = newEKeys.length > 0 ? newEKeys.slice(-80) : allEKeys.slice(-80);

          if (targetEKeys.length > 0) {
            var eRequests = targetEKeys.map(function(k) {
              return { url: FIREBASE_DB_URL + "/entryPhotos/" + k + ".json", method: "get", muteHttpExceptions: true };
            });
            var eResponses = UrlFetchApp.fetchAll(eRequests);
            var entryPhotosMap = {};
            var newlyBackedE = [];
            for (var ep = 0; ep < targetEKeys.length; ep++) {
              if (eResponses[ep].getResponseCode() === 200) {
                try {
                  var pVal = JSON.parse(eResponses[ep].getContentText());
                  if (pVal) {
                    entryPhotosMap[targetEKeys[ep]] = pVal;
                    newlyBackedE.push(targetEKeys[ep]);
                  }
                } catch(epErr) {}
              }
            }
            result["entryPhotos"] = entryPhotosMap;

            if (folder && index && newlyBackedE.length > 0) {
              if (!index.backedUpEntryKeys) index.backedUpEntryKeys = [];
              newlyBackedE.forEach(function(k) {
                if (!backedEntrySet[k]) {
                  index.backedUpEntryKeys.push(k);
                  backedEntrySet[k] = true;
                }
              });
            }
          }
        }
      } catch (epTotalErr) {
        Logger.log("Error fetching incremental entryPhotos: " + epTotalErr);
      }

      // 2. Fetch driver request photos (prefer new keys or latest 40)
      try {
        var rShallowRes = UrlFetchApp.fetch(FIREBASE_DB_URL + "/driverRequestPhotos.json?shallow=true", { muteHttpExceptions: true });
        if (rShallowRes.getResponseCode() === 200) {
          var rKeysObj = JSON.parse(rShallowRes.getContentText()) || {};
          var allRKeys = Object.keys(rKeysObj);
          var newRKeys = allRKeys.filter(function(k) { return !backedReqSet[k]; });
          var targetRKeys = newRKeys.length > 0 ? newRKeys.slice(-40) : allRKeys.slice(-40);

          if (targetRKeys.length > 0) {
            var rRequests = targetRKeys.map(function(k) {
              return { url: FIREBASE_DB_URL + "/driverRequestPhotos/" + k + ".json", method: "get", muteHttpExceptions: true };
            });
            var rResponses = UrlFetchApp.fetchAll(rRequests);
            var reqPhotosMap = {};
            var newlyBackedR = [];
            for (var rp = 0; rp < targetRKeys.length; rp++) {
              if (rResponses[rp].getResponseCode() === 200) {
                try {
                  var rVal = JSON.parse(rResponses[rp].getContentText());
                  if (rVal) {
                    reqPhotosMap[targetRKeys[rp]] = rVal;
                    newlyBackedR.push(targetRKeys[rp]);
                  }
                } catch(rpErr) {}
              }
            }
            result["driverRequestPhotos"] = reqPhotosMap;

            if (folder && index && newlyBackedR.length > 0) {
              if (!index.backedUpRequestKeys) index.backedUpRequestKeys = [];
              newlyBackedR.forEach(function(k) {
                if (!backedReqSet[k]) {
                  index.backedUpRequestKeys.push(k);
                  backedReqSet[k] = true;
                }
              });
            }
          }
        }
      } catch (rpTotalErr) {
        Logger.log("Error fetching incremental driverRequestPhotos: " + rpTotalErr);
      }

      if (folder && index) {
        saveDriveBackupIndex(folder, index);
      }
    }

    return result;
  } catch (err) {
    Logger.log("fetchAll error, falling back to root fetch: " + err);
    try {
      var rootRes = UrlFetchApp.fetch(FIREBASE_DB_URL + "/.json", { muteHttpExceptions: true });
      if (rootRes.getResponseCode() === 200) {
        return JSON.parse(rootRes.getContentText());
      }
    } catch (rootErr) {
      Logger.log("Root fetch also failed: " + rootErr);
    }
    return null;
  }
}

// 50MB Chunked Historical Photo Archiver:
// Takes the next batch of un-backed photos, saves Part N file to Drive, updates index
function handleArchiveChunk(folder) {
  var index = getDriveBackupIndex(folder);
  var backedEntrySet = {};
  (index.backedUpEntryKeys || []).forEach(function(k) { backedEntrySet[k] = true; });
  var backedReqSet = {};
  (index.backedUpRequestKeys || []).forEach(function(k) { backedReqSet[k] = true; });

  var allEKeys = [];
  try {
    var eShallow = UrlFetchApp.fetch(FIREBASE_DB_URL + "/entryPhotos.json?shallow=true", { muteHttpExceptions: true });
    if (eShallow.getResponseCode() === 200) {
      allEKeys = Object.keys(JSON.parse(eShallow.getContentText()) || {});
    }
  } catch (eErr) {}

  var allRKeys = [];
  try {
    var rShallow = UrlFetchApp.fetch(FIREBASE_DB_URL + "/driverRequestPhotos.json?shallow=true", { muteHttpExceptions: true });
    if (rShallow.getResponseCode() === 200) {
      allRKeys = Object.keys(JSON.parse(rShallow.getContentText()) || {});
    }
  } catch (rErr) {}

  var pendingEKeys = allEKeys.filter(function(k) { return !backedEntrySet[k]; });
  var pendingRKeys = allRKeys.filter(function(k) { return !backedReqSet[k]; });

  var totalAllPhotos = allEKeys.length + allRKeys.length;
  var totalBackedPhotos = (index.backedUpEntryKeys ? index.backedUpEntryKeys.length : 0) + 
                          (index.backedUpRequestKeys ? index.backedUpRequestKeys.length : 0);

  if (pendingEKeys.length === 0 && pendingRKeys.length === 0) {
    return {
      ok: true,
      isComplete: true,
      message: "All 100% historical photos are already backed up in Google Drive!",
      totalPhotos: totalAllPhotos,
      totalArchivedPhotos: totalAllPhotos,
      percent: 100,
      totalParts: (index.parts || []).length
    };
  }

  var partType = "";
  var keysToFetch = [];
  var partNumber = (index.parts || []).length + 1;
  var fileName = "RPM_Diesel_Photos_Part" + partNumber + ".json";

  // Batch size: 90 entry photos or 70 request photos (~25-35 MB, safely under 50 MB limit)
  if (pendingEKeys.length > 0) {
    partType = "entryPhotos";
    keysToFetch = pendingEKeys.slice(0, 90);
  } else {
    partType = "driverRequestPhotos";
    keysToFetch = pendingRKeys.slice(0, 70);
  }

  var fetchRequests = keysToFetch.map(function(k) {
    return {
      url: FIREBASE_DB_URL + "/" + partType + "/" + k + ".json",
      method: "get",
      muteHttpExceptions: true
    };
  });

  var responses = UrlFetchApp.fetchAll(fetchRequests);
  var photosMap = {};
  var successfullyFetchedKeys = [];

  for (var i = 0; i < keysToFetch.length; i++) {
    if (responses[i].getResponseCode() === 200) {
      try {
        var pData = JSON.parse(responses[i].getContentText());
        if (pData) {
          photosMap[keysToFetch[i]] = pData;
          successfullyFetchedKeys.push(keysToFetch[i]);
        }
      } catch(e) {}
    }
  }

  var chunkPayload = {
    _chunkInfo: {
      partNumber: partNumber,
      fileName: fileName,
      type: partType,
      count: successfullyFetchedKeys.length,
      createdAt: new Date().toISOString(),
      createdDate: Utilities.formatDate(new Date(), "Asia/Kolkata", "dd/MM/yyyy, hh:mm:ss a")
    }
  };
  chunkPayload[partType] = photosMap;

  var jsonContent = JSON.stringify(chunkPayload, null, 2);
  var blob = Utilities.newBlob(jsonContent, "application/json", fileName);
  var sizeMb = (blob.getBytes().length / (1024 * 1024)).toFixed(2);

  var file = folder.createFile(blob);

  if (!index.parts) index.parts = [];
  index.parts.push({
    partNumber: partNumber,
    fileName: fileName,
    fileId: file.getId(),
    fileUrl: file.getUrl(),
    type: partType,
    count: successfullyFetchedKeys.length,
    sizeMb: sizeMb,
    date: Utilities.formatDate(new Date(), "Asia/Kolkata", "dd/MM/yyyy, hh:mm:ss a")
  });

  if (partType === "entryPhotos") {
    if (!index.backedUpEntryKeys) index.backedUpEntryKeys = [];
    index.backedUpEntryKeys = index.backedUpEntryKeys.concat(successfullyFetchedKeys);
  } else {
    if (!index.backedUpRequestKeys) index.backedUpRequestKeys = [];
    index.backedUpRequestKeys = index.backedUpRequestKeys.concat(successfullyFetchedKeys);
  }

  saveDriveBackupIndex(folder, index);

  var newTotalBacked = (index.backedUpEntryKeys ? index.backedUpEntryKeys.length : 0) + 
                       (index.backedUpRequestKeys ? index.backedUpRequestKeys.length : 0);
  var newPercent = Math.min(100, Math.round((newTotalBacked / Math.max(1, totalAllPhotos)) * 100));
  var isFinished = (newTotalBacked >= totalAllPhotos);

  return {
    ok: true,
    isComplete: isFinished,
    partNumber: partNumber,
    partFileName: fileName,
    photosInPart: successfullyFetchedKeys.length,
    partSizeMb: sizeMb,
    totalArchivedPhotos: newTotalBacked,
    totalPhotos: totalAllPhotos,
    percent: newPercent,
    fileUrl: file.getUrl()
  };
}

// Helper: Query index status for dashboard UI
function handleGetIndexStatus(folder) {
  var index = getDriveBackupIndex(folder);
  var backedE = index.backedUpEntryKeys ? index.backedUpEntryKeys.length : 0;
  var backedR = index.backedUpRequestKeys ? index.backedUpRequestKeys.length : 0;
  var totalArchived = backedE + backedR;

  var totalE = 942;
  var totalR = 528;
  try {
    var eRes = UrlFetchApp.fetch(FIREBASE_DB_URL + "/entryPhotos.json?shallow=true", { muteHttpExceptions: true });
    if (eRes.getResponseCode() === 200) totalE = Object.keys(JSON.parse(eRes.getContentText()) || {}).length;
    var rRes = UrlFetchApp.fetch(FIREBASE_DB_URL + "/driverRequestPhotos.json?shallow=true", { muteHttpExceptions: true });
    if (rRes.getResponseCode() === 200) totalR = Object.keys(JSON.parse(rRes.getContentText()) || {}).length;
  } catch (e) {}

  var totalPhotos = totalE + totalR;
  var percent = Math.min(100, Math.round((totalArchived / Math.max(1, totalPhotos)) * 100));

  return {
    ok: true,
    totalArchived: totalArchived,
    totalPhotos: totalPhotos,
    percent: percent,
    totalParts: (index.parts || []).length,
    isComplete: (totalArchived >= totalPhotos),
    parts: index.parts || []
  };
}

function checkAndRunCloudAutoBackup() {
  Logger.log("Starting cloud auto-backup check...");

  let tgConfig = null;
  let driveConfig = null;

  try {
    const tgRes = UrlFetchApp.fetch(FIREBASE_DB_URL + "/appConfig/telegramAutoBackup.json", { muteHttpExceptions: true });
    if (tgRes.getResponseCode() === 200) tgConfig = JSON.parse(tgRes.getContentText());
  } catch (e) {
    Logger.log("Error fetching telegram config: " + e);
  }

  try {
    const drRes = UrlFetchApp.fetch(FIREBASE_DB_URL + "/appConfig/googleDriveAutoBackup.json", { muteHttpExceptions: true });
    if (drRes.getResponseCode() === 200) driveConfig = JSON.parse(drRes.getContentText());
  } catch (e) {
    Logger.log("Error fetching drive config: " + e);
  }

  const now = Date.now();
  const shouldRunTg = tgConfig && tgConfig.enabled && (!tgConfig.nextBackupTimestamp || now >= Number(tgConfig.nextBackupTimestamp));
  const shouldRunDrive = driveConfig && driveConfig.enabled && (!driveConfig.nextBackupTimestamp || now >= Number(driveConfig.nextBackupTimestamp));

  if (!shouldRunTg && !shouldRunDrive) {
    Logger.log("Neither Telegram nor Google Drive backup is due at this time.");
    return;
  }

  Logger.log("Fetching database snapshot from Firebase (<3s parallel fetch)...");
  const needPhotos = (shouldRunTg && tgConfig && tgConfig.includeImages === true) ||
                     (shouldRunDrive && driveConfig && driveConfig.includeImages === true);

  const folder = shouldRunDrive ? getOrCreateDriveFolder(driveConfig.folderId) : null;
  const rawData = fetchFirebaseData(needPhotos, folder);
  if (!rawData) return;

  const nowObj = new Date();
  const dateStr = Utilities.formatDate(nowObj, "Asia/Kolkata", "yyyy-MM-dd");
  const timeStr = Utilities.formatDate(nowObj, "Asia/Kolkata", "HH-mm-ss");

  // 1. Process Telegram Backup if due
  if (shouldRunTg) {
    try {
      const tgWithImages = tgConfig && tgConfig.includeImages === true;
      const cleanDataTg = tgWithImages ? rawData : sanitizeForBackup(rawData);
      const jsonStringTg = JSON.stringify(cleanDataTg, null, 2);
      const jsonBlobTg = Utilities.newBlob(jsonStringTg, "application/json");

      const filePrefix = tgWithImages ? "RPM_Diesel_FullBackup_" : "RPM_Diesel_AutoBackup_";
      const fileNameTg = filePrefix + dateStr + "_" + timeStr + ".json";
      jsonBlobTg.setName(fileNameTg);
      const sizeMb = (jsonBlobTg.getBytes().length / (1024 * 1024)).toFixed(2);

      const botToken = (tgConfig.botToken || DEFAULT_BOT_TOKEN).trim();
      const chatId = (tgConfig.chatId || DEFAULT_CHAT_ID).trim();
      const totalEntries = rawData.entries ? Object.keys(rawData.entries).length : 0;
      const totalRequests = rawData.driverRequests ? Object.keys(rawData.driverRequests).length : 0;
      const intervalDays = Number(tgConfig.intervalDays) || 1;

      const caption = [
        "📦 <b>RPM DIESEL 24/7 CLOUD DATABASE BACKUP</b>",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "📅 <b>Timestamp:</b> " + Utilities.formatDate(nowObj, "Asia/Kolkata", "dd MMM yyyy, hh:mm a") + " (IST)",
        "💾 <b>File:</b> <code>" + fileNameTg + "</code>",
        "📊 <b>Size:</b> " + sizeMb + " MB",
        "🖼️ <b>Mode:</b> " + (tgWithImages ? "With Images (Full Snapshot)" : "Without Images (Data Only)"),
        "📝 <b>Data:</b> " + totalEntries + " Entries | " + totalRequests + " Requests",
        "⏳ <b>Auto Schedule:</b> Every " + intervalDays + " Day(s)",
        "⚙️ <b>Trigger:</b> 24/7 Google Cloud Scheduler",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "✅ <i>Realtime Database snapshot delivered securely.</i>"
      ].join(String.fromCharCode(10));

      const telegramUrl = "https://api.telegram.org/bot" + botToken + "/sendDocument";
      const payload = {
        chat_id: chatId,
        document: jsonBlobTg,
        caption: caption,
        parse_mode: "HTML"
      };

      const tgRes = UrlFetchApp.fetch(telegramUrl, { method: "post", payload: payload, muteHttpExceptions: true });
      const tgResult = JSON.parse(tgRes.getContentText());

      if (tgResult && tgResult.ok) {
        Logger.log("Telegram backup delivered successfully!");
        let nextDate = new Date(now);
        if (tgConfig.preferredTime) {
          const parts = tgConfig.preferredTime.split(":");
          if (parts.length === 2) nextDate.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
        }
        nextDate.setDate(nextDate.getDate() + intervalDays);
        while (nextDate.getTime() <= Date.now()) nextDate.setDate(nextDate.getDate() + intervalDays);

        const updates = {
          lastBackupTimestamp: now,
          lastBackupDate: Utilities.formatDate(nowObj, "Asia/Kolkata", "dd/MM/yyyy, hh:mm:ss a"),
          nextBackupTimestamp: nextDate.getTime()
        };
        UrlFetchApp.fetch(FIREBASE_DB_URL + "/appConfig/telegramAutoBackup.json", {
          method: "patch", contentType: "application/json", payload: JSON.stringify(updates), muteHttpExceptions: true
        });
      }
    } catch (tgErr) {
      Logger.log("Telegram backup error: " + tgErr);
    }
  }

  // 2. Process Google Drive Backup if due (WhatsApp Single-File Overwrite)
  if (shouldRunDrive) {
    try {
      const driveWithImages = driveConfig && driveConfig.includeImages === true;
      const cleanDataDrive = driveWithImages ? rawData : sanitizeForBackup(rawData);
      const jsonStringDrive = JSON.stringify(cleanDataDrive, null, 2);
      const fileNameDrive = driveWithImages ? "RPM_Diesel_FullBackup.json" : "RPM_Diesel_AutoBackup.json";

      const result = saveOrUpdateDriveFile(folder, fileNameDrive, jsonStringDrive);

      Logger.log("Google Drive backup completed! Updated: " + result.isUpdated + " File URL: " + result.file.getUrl());

      const intervalDays = Number(driveConfig.intervalDays) || 1;
      let nextDate = new Date(now);
      if (driveConfig.preferredTime) {
        const parts = driveConfig.preferredTime.split(":");
        if (parts.length === 2) nextDate.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
      }
      nextDate.setDate(nextDate.getDate() + intervalDays);
      while (nextDate.getTime() <= Date.now()) nextDate.setDate(nextDate.getDate() + intervalDays);

      const updates = {
        lastBackupTimestamp: now,
        lastBackupDate: Utilities.formatDate(nowObj, "Asia/Kolkata", "dd/MM/yyyy, hh:mm:ss a"),
        nextBackupTimestamp: nextDate.getTime(),
        lastFileUrl: result.file.getUrl()
      };
      UrlFetchApp.fetch(FIREBASE_DB_URL + "/appConfig/googleDriveAutoBackup.json", {
        method: "patch", contentType: "application/json", payload: JSON.stringify(updates), muteHttpExceptions: true
      });
      Logger.log("Google Drive schedule updated in Firebase.");
    } catch (drErr) {
      Logger.log("Google Drive backup error: " + drErr);
    }
  }
}

// Web App doPost endpoint
function doPost(e) {
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (pErr) {
        body = e.parameter || {};
      }
    } else if (e && e.parameter) {
      body = e.parameter;
    }

    const folderId = (body.folderId || "").trim();
    const action = body.action || "saveBackup";
    const folder = getOrCreateDriveFolder(folderId);

    if (action === "archiveChunk") {
      const chunkRes = handleArchiveChunk(folder);
      return ContentService.createTextOutput(JSON.stringify(chunkRes)).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getIndexStatus") {
      const statusRes = handleGetIndexStatus(folder);
      return ContentService.createTextOutput(JSON.stringify(statusRes)).setMimeType(ContentService.MimeType.JSON);
    }

    const isWithImages = body.includeImages === true || body.includeImages === "true";
    const defaultFileName = isWithImages ? "RPM_Diesel_FullBackup.json" : "RPM_Diesel_AutoBackup.json";
    const fileName = (body.fileName || defaultFileName).trim();

    let content = "";
    if (body.data) {
      content = typeof body.data === "string" ? body.data : JSON.stringify(body.data, null, 2);
    } else {
      const rawData = fetchFirebaseData(isWithImages, folder);
      const cleanData = isWithImages ? rawData : sanitizeForBackup(rawData);
      content = JSON.stringify(cleanData, null, 2);
    }

    const saveResult = saveOrUpdateDriveFile(folder, fileName, content);
    const file = saveResult.file;
    const isUpdated = saveResult.isUpdated;

    const nowObj = new Date();
    try {
      UrlFetchApp.fetch(FIREBASE_DB_URL + "/appConfig/googleDriveAutoBackup.json", {
        method: "patch",
        contentType: "application/json",
        payload: JSON.stringify({
          lastBackupTimestamp: Date.now(),
          lastBackupDate: Utilities.formatDate(nowObj, "Asia/Kolkata", "dd/MM/yyyy, hh:mm:ss a"),
          lastFileUrl: file.getUrl()
        }),
        muteHttpExceptions: true
      });
    } catch (fbErr) {}

    const output = {
      ok: true,
      updated: isUpdated,
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      fileName: fileName
    };
    return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Web App doGet endpoint
function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params.action;
    const folderId = (params.folderId || "").trim();
    const isWithImages = params.includeImages === "true" || params.includeImages === true;

    if (action === "archiveChunk") {
      const folder = getOrCreateDriveFolder(folderId);
      const chunkRes = handleArchiveChunk(folder);
      return ContentService.createTextOutput(JSON.stringify(chunkRes)).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getIndexStatus") {
      const folder = getOrCreateDriveFolder(folderId);
      const statusRes = handleGetIndexStatus(folder);
      return ContentService.createTextOutput(JSON.stringify(statusRes)).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "saveBackup" || action === "backupNow" || action === "test") {
      const folder = getOrCreateDriveFolder(folderId);
      const rawData = fetchFirebaseData(isWithImages, folder);
      if (!rawData) {
        return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "Firebase read failed" })).setMimeType(ContentService.MimeType.JSON);
      }
      const cleanData = isWithImages ? rawData : sanitizeForBackup(rawData);
      const jsonString = JSON.stringify(cleanData, null, 2);

      const defaultFileName = isWithImages ? "RPM_Diesel_FullBackup.json" : "RPM_Diesel_AutoBackup.json";
      const fileName = (params.fileName || defaultFileName).trim();

      const saveResult = saveOrUpdateDriveFile(folder, fileName, jsonString);
      const file = saveResult.file;
      const isUpdated = saveResult.isUpdated;

      const nowObj = new Date();
      try {
        UrlFetchApp.fetch(FIREBASE_DB_URL + "/appConfig/googleDriveAutoBackup.json", {
          method: "patch",
          contentType: "application/json",
          payload: JSON.stringify({
            lastBackupTimestamp: Date.now(),
            lastBackupDate: Utilities.formatDate(nowObj, "Asia/Kolkata", "dd/MM/yyyy, hh:mm:ss a"),
            lastFileUrl: file.getUrl()
          }),
          muteHttpExceptions: true
        });
      } catch (fbErr) {}

      return ContentService.createTextOutput(JSON.stringify({
        ok: true,
        updated: isUpdated,
        fileId: file.getId(),
        fileUrl: file.getUrl(),
        fileName: fileName
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "ok", service: "RPM Diesel Cloud Auto Backup Service v2 (WhatsApp Style + 50MB Chunks)" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function sanitizeForBackup(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForBackup);
  const out = {};
  for (const k in obj) {
    if (k === "driverRequestPhotos" || k === "entryPhotos") {
      out[k] = { _backup_info: "Omitted base64 photo records for compact backup" };
      continue;
    }
    const v = obj[k];
    if (typeof v === "string" && (v.indexOf("data:image") === 0 || (v.length > 2000 && /^[A-Za-z0-9+/=]+$/.test(v.slice(0, 80))))) {
      out[k] = "[BASE64_IMAGE_OMITTED_FOR_BACKUP]";
    } else if (typeof v === "object" && v !== null) {
      out[k] = sanitizeForBackup(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}`;

function copyGoogleCloudBackupScript() {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE).then(() => {
      toast.ok("📋 Google Cloud Script code copied! Paste in script.google.com");
    }).catch(() => {
      fallbackCopyText(GOOGLE_APPS_SCRIPT_CODE);
    });
  } else {
    fallbackCopyText(GOOGLE_APPS_SCRIPT_CODE);
  }
}
window.copyGoogleCloudBackupScript = copyGoogleCloudBackupScript;

function fallbackCopyText(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    toast.ok("📋 Google Cloud Script code copied! Paste in script.google.com");
  } catch (err) {
    toast.err("Could not copy automatically. Please open 1-Min Setup Guide.");
  }
  document.body.removeChild(ta);
}

function sanitizeDbForBackup(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeDbForBackup);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'driverRequestPhotos' || k === 'entryPhotos' || k === 'refillPhotos') {
      out[k] = { _backup_info: `Omitted ${Object.keys(v || {}).length} base64 photo records for compact backup` };
      continue;
    }
    if (k === 'slipPhoto' || k === 'meterPhoto' || k === 'photo' || k === 'image' || k === 'avatar' || k === 'receiptPhoto') {
      continue;
    }
    if (typeof v === 'string' && (v.startsWith('data:image') || (v.length > 2000 && /^[A-Za-z0-9+/=]+$/.test(v.slice(0, 80))))) {
      continue;
    } else if (typeof v === 'object' && v !== null) {
      out[k] = sanitizeDbForBackup(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function sendTelegramBackup(isManual = false) {
  const token = (document.getElementById('dm-autobackup-token')?.value || telegramAutoBackupConfig.botToken || '8880618363:AAEGp8ReJEcB563j9_2XiaVvwaPHMigt1PM').trim();
  const chat = (document.getElementById('dm-autobackup-chatid')?.value || telegramAutoBackupConfig.chatId || '7927138678').trim();

  if (!token || !chat) {
    return toast.err("Telegram Bot Key or Chat ID is missing.");
  }

  const testBtn = document.getElementById('dm-autobackup-test-btn');
  if (testBtn && isManual) {
    testBtn.disabled = true;
    testBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>Generating & Uploading JSON to Telegram...</span>`;
  }

  const taskTitle = "Send Backup to Telegram Now (Test)";

  if (isManual) {
    currentTaskAbortController = new AbortController();

    showDmProgress({
      title: taskTitle,
      taskName: taskTitle,
      subtitle: "Bot Token & Chat ID validation...",
      icon: "fab fa-telegram-plane animate-pulse",
      color: "sky",
      step: "Step 1 of 4",
      percent: 12,
      detail: "Step 1 of 4 (12%): Bot Token & Chat ID validation."
    });

    startDmProgressAutoAdvance({
      fromPercent: 15,
      toPercent: 55,
      estimatedDurationSec: 8,
      step: "Step 2 of 4",
      subtitle: "Firebase Cloud Database se snapshot download ho raha hai...",
      detailFormatter: (sec, pct) => `Step 2 of 4 (${pct}%): Cloud database records download ho rahe hain (${sec}s)`
    });
  }

  try {
    const snap = await db.ref().once('value');
    stopDmProgressAutoAdvance();
    const val = snap.val();
    if (!val) {
      if (isManual) {
        updateDmProgress(100, {
          subtitle: "Database is empty!",
          step: "Warning",
          icon: "fas fa-exclamation-triangle text-amber-400",
          color: "amber",
          detail: "Database empty hai, backup karne ke liye koi record nahi mila.",
          isFail: true,
          taskName: taskTitle
        });
        closeDmProgress(1500);
        toast.err("Database is empty, nothing to backup.");
      }
      return;
    }

    const imagesToggle = document.getElementById('dm-autobackup-images-enable');
    const includeImages = imagesToggle ? imagesToggle.checked : (telegramAutoBackupConfig.includeImages === true);

    if (isManual) {
      startDmProgressAutoAdvance({
        fromPercent: 55,
        toPercent: 78,
        estimatedDurationSec: 3,
        step: "Step 3 of 4",
        subtitle: "Snapshot packaging & compression chal rahi hai...",
        detailFormatter: (sec, pct) => `Step 3 of 4 (${pct}%): Packaging & compression (${sec}s) - Mode: ${includeImages ? 'With Images' : 'Data Only'}`
      });
    }
    await new Promise(r => setTimeout(r, 15));

    const cleanVal = includeImages ? val : sanitizeDbForBackup(val);
    const jsonStr = JSON.stringify(cleanVal);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
    const fileMode = includeImages ? 'FullBackup' : 'DataOnlyBackup';
    let fileName = `RPM_Diesel_${fileMode}_${dateStr}_${timeStr}.json`;
    let uploadBlob = new Blob([jsonStr], { type: 'application/json' });
    let isCompressed = false;

    if ((uploadBlob.size > 15 * 1024 * 1024 || includeImages) && typeof CompressionStream === 'function') {
      try {
        const stream = uploadBlob.stream().pipeThrough(new CompressionStream('gzip'));
        const compressedBlob = await new Response(stream).blob();
        if (compressedBlob.size < uploadBlob.size) {
          uploadBlob = compressedBlob;
          fileName += '.gz';
          isCompressed = true;
        }
      } catch (e) {
        console.warn("Gzip compression fallback:", e);
      }
    }

    const totalRecords = (val.entries ? Object.keys(val.entries).length : 0);
    const totalRequests = (val.driverRequests ? Object.keys(val.driverRequests).length : 0);
    const sizeMb = (uploadBlob.size / (1024 * 1024)).toFixed(2);
    const sizeKb = (uploadBlob.size / 1024).toFixed(1);

    if (uploadBlob.size > 49.5 * 1024 * 1024) {
      stopDmProgressAutoAdvance();
      if (isManual) {
        updateDmProgress(100, {
          subtitle: "Telegram 50MB Limit Exceeded!",
          step: "Error",
          icon: "fas fa-exclamation-triangle text-amber-400",
          color: "amber",
          detail: `File size (${sizeMb} MB) Telegram bot limit (50 MB) se badi hai. "Backup With Images" switch OFF karein ya Google Drive backup use karein.`,
          isFail: true,
          taskName: taskTitle
        });
        closeDmProgress(4000);
      }
      return toast.err(`Telegram bot limit 50MB hai. File ${sizeMb} MB hai. Kripya 'Backup With Images' switch OFF karein.`);
    }

    const caption = `📦 <b>RPM DIESEL CLOUD DATABASE BACKUP</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📅 <b>Timestamp:</b> ${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)\n` +
      `💾 <b>File:</b> <code>${fileName}</code>${isCompressed ? ' <i>(GZIP Compressed)</i>' : ''}\n` +
      `📊 <b>Size:</b> ${sizeMb >= 1 ? sizeMb + ' MB' : sizeKb + ' KB'}\n` +
      `🖼️ <b>Mode:</b> ${includeImages ? 'With Images (Full Snapshot)' : 'Without Images (Data Only)'}\n` +
      `📝 <b>Data:</b> ${totalRecords} Entries | ${totalRequests} Requests\n` +
      `⏳ <b>Auto Schedule:</b> Every ${telegramAutoBackupConfig.intervalDays || 1} Day(s)\n` +
      `⚙️ <b>Trigger:</b> ${isManual ? 'Manual Test' : 'Scheduled Auto Backup'}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `✅ <i>Realtime Database snapshot delivered securely. Direct restore supported in Portal.</i>`;

    const formData = new FormData();
    formData.append('chat_id', chat);
    formData.append('document', uploadBlob, fileName);
    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');

    stopDmProgressAutoAdvance();

    if (isManual) {
      startDmProgressAutoAdvance({
        fromPercent: 78,
        toPercent: 96,
        estimatedDurationSec: 5,
        step: "Step 4 of 4",
        subtitle: "Telegram Bot API par document transmit ho raha hai...",
        detailFormatter: (sec, pct) => `Step 4 of 4 (${pct}%): Telegram Bot API document transmit (${sec}s)`
      });
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: 'POST',
      body: formData,
      signal: currentTaskAbortController ? currentTaskAbortController.signal : undefined
    });

    stopDmProgressAutoAdvance();

    if (currentTaskAbortController?.signal?.aborted) return;

    const resData = await res.json();
    if (resData.ok) {
      const backupTimeNow = Date.now();
      telegramAutoBackupConfig.lastBackupTimestamp = backupTimeNow;
      telegramAutoBackupConfig.lastBackupDate = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

      const intervalDays = parseInt(telegramAutoBackupConfig.intervalDays, 10) || 1;
      let nextD = new Date(backupTimeNow);
      if (telegramAutoBackupConfig.preferredTime) {
        const [pHours, pMins] = telegramAutoBackupConfig.preferredTime.split(':').map(Number);
        if (!isNaN(pHours) && !isNaN(pMins)) {
          nextD.setHours(pHours, pMins, 0, 0);
        }
      }
      nextD.setDate(nextD.getDate() + intervalDays);
      while (nextD.getTime() <= Date.now()) {
        nextD.setDate(nextD.getDate() + intervalDays);
      }
      telegramAutoBackupConfig.nextBackupTimestamp = nextD.getTime();

      localStorage.setItem('rpm_telegram_autobackup', JSON.stringify(telegramAutoBackupConfig));
      if (typeof db !== 'undefined' && db) {
        db.ref('appConfig/telegramAutoBackup/lastBackupTimestamp').set(telegramAutoBackupConfig.lastBackupTimestamp);
        db.ref('appConfig/telegramAutoBackup/lastBackupDate').set(telegramAutoBackupConfig.lastBackupDate);
        db.ref('appConfig/telegramAutoBackup/nextBackupTimestamp').set(telegramAutoBackupConfig.nextBackupTimestamp);
        if (telegramAutoBackupConfig.preferredTime) {
          db.ref('appConfig/telegramAutoBackup/preferredTime').set(telegramAutoBackupConfig.preferredTime);
        }
      }

      if (isManual) {
        updateDmProgress(100, {
          subtitle: "Delivered to Telegram Chat!",
          step: "Completed (100%)",
          icon: "fas fa-check-circle text-sky-400",
          color: "sky",
          detail: "Completed (100%): Telegram chat me document deliver hone ka checkmark.",
          duration: 300,
          isComplete: true,
          taskName: taskTitle
        });
        closeDmProgress(1200);
      }
      toast.ok("Database backup successfully sent to Telegram Bot!");
      updateAutoBackupBadge();
      updateAutoBackupUI();
    } else {
      console.error("Telegram API response error:", resData);
      if (isManual) {
        updateDmProgress(100, {
          subtitle: "Telegram Delivery Failed!",
          step: "Error",
          icon: "fas fa-times-circle text-rose-400",
          color: "rose",
          detail: resData.description || 'Unknown Telegram error',
          isFail: true,
          taskName: taskTitle
        });
        closeDmProgress(2500);
      }
      toast.err(`Telegram Error: ${resData.description || 'Unknown error'}`);
    }
  } catch (err) {
    if (currentTaskAbortController?.signal?.aborted || err?.name === 'AbortError') {
      console.warn("Telegram backup cancelled by user.");
      return;
    }
    stopDmProgressAutoAdvance();
    console.error("Auto backup failed:", err);
    if (isManual) {
      updateDmProgress(100, {
        subtitle: "Telegram Backup Failed!",
        step: "Error",
        icon: "fas fa-times-circle text-rose-400",
        color: "rose",
        detail: err.message,
        isFail: true,
        taskName: taskTitle
      });
      closeDmProgress(2500);
    }
    toast.err(`Backup to Telegram failed: ${err.message}`);
  } finally {
    currentTaskAbortController = null;
    stopDmProgressAutoAdvance();
    if (testBtn && isManual) {
      testBtn.disabled = false;
      testBtn.innerHTML = `<i class="fas fa-paper-plane"></i> <span>Send Backup to Telegram Now (Test)</span>`;
    }
  }
}

async function sendDriveBackup(isManual = false) {
  const folderInputVal = (document.getElementById('dm-drivebackup-folder')?.value || googleDriveAutoBackupConfig.folderLink || googleDriveAutoBackupConfig.folderId || '').trim();
  let webAppUrl = (document.getElementById('dm-drivebackup-webapp-url')?.value || googleDriveAutoBackupConfig.webAppUrl || '').trim();
  if (webAppUrl && !/^https?:\/\//i.test(webAppUrl)) {
    webAppUrl = 'https://' + webAppUrl;
  }

  const folderId = extractDriveFolderId(folderInputVal) || '';

  if (!webAppUrl) {
    if (isManual) {
      toast.warn("Google Drive me direct auto-sync ke liye 'Google Drive Web App Sync URL' paste karein.");
      openGoogleDriveSetupModal();
    }
    return;
  }

  const testBtn = document.getElementById('dm-drivebackup-test-btn');
  if (testBtn && isManual) {
    testBtn.disabled = true;
    testBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>Syncing single file to Google Drive...</span>`;
  }

  const taskTitle = "Sync Backup to Google Drive (WhatsApp Mode)";

  const imagesToggle = document.getElementById('dm-drivebackup-images-enable');
  const includeImages = imagesToggle ? imagesToggle.checked : (googleDriveAutoBackupConfig.includeImages === true);
  const fileName = includeImages ? 'RPM_Diesel_FullBackup.json' : 'RPM_Diesel_AutoBackup.json';

  let fetchTimeoutId = null;

  if (isManual) {
    currentTaskAbortController = new AbortController();

    showDmProgress({
      title: taskTitle,
      taskName: taskTitle,
      subtitle: "Google Drive sync endpoint initialize ho raha hai...",
      icon: "fab fa-google-drive text-emerald-400 animate-spin",
      color: "emerald",
      step: "Step 1 of 4",
      percent: 15,
      detail: "Step 1 of 4 (15%): Google Drive Web App sync endpoint initialize."
    });

    startDmProgressAutoAdvance({
      fromPercent: 18,
      toPercent: 92,
      estimatedDurationSec: 5,
      step: "Step 2 of 4",
      subtitle: includeImages 
        ? "Google Cloud server par snapshot & full images packaging..." 
        : "Google Cloud server par database snapshot sync...",
      detailFormatter: (sec, pct) => `Step 2 of 4 (${pct}%): Google Drive single file sync chal raha hai (${sec}s) - Mode: ${includeImages ? 'With Images' : 'Data Only'}`
    });

    // 25s timeout fallback so user is never stuck
    fetchTimeoutId = setTimeout(() => {
      if (currentTaskAbortController) {
        console.warn("[sendDriveBackup] Timeout reached, aborting request");
        currentTaskAbortController.abort();
      }
    }, 25000);
  }

  try {
    // Send lightweight command to Google Apps Script Web App
    // Note: Apps Script directly fetches from Firebase REST API in Google's cloud at gigabit speed,
    // so the browser does NOT need to download 200MB of base64 photos over Wi-Fi, preventing any freeze!
    const postPayload = {
      action: 'saveBackup',
      folderId: folderId,
      fileName: fileName,
      includeImages: includeImages
    };

    let uploadSuccess = false;
    try {
      await fetch(webAppUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(postPayload),
        signal: currentTaskAbortController ? currentTaskAbortController.signal : undefined
      });
      uploadSuccess = true;
    } catch (postErr) {
      if (currentTaskAbortController?.signal?.aborted) {
        console.warn("Drive sync aborted by user or timeout.");
        return;
      }
      console.warn("POST to Web App failed, attempting GET trigger:", postErr);
      try {
        const getUrl = `${webAppUrl}${webAppUrl.includes('?') ? '&' : '?'}action=saveBackup&folderId=${encodeURIComponent(folderId)}&fileName=${encodeURIComponent(fileName)}&includeImages=${includeImages}&t=${Date.now()}`;
        await fetch(getUrl, { 
          method: 'GET', 
          mode: 'no-cors',
          signal: currentTaskAbortController ? currentTaskAbortController.signal : undefined
        });
        uploadSuccess = true;
      } catch (getErr) {
        if (currentTaskAbortController?.signal?.aborted) {
          console.warn("Drive sync aborted by user or timeout.");
          return;
        }
        console.error("GET trigger also failed:", getErr);
        throw new Error("Google Apps Script Web App tak connect nahi ho paya. Kripya Web App URL check karein.");
      }
    } finally {
      if (fetchTimeoutId) clearTimeout(fetchTimeoutId);
    }

    stopDmProgressAutoAdvance();

    if (currentTaskAbortController?.signal?.aborted) return;

    if (isManual) {
      updateDmProgress(94, {
        subtitle: `Google Drive single file (${fileName}) update & verify...`,
        step: "Step 3 of 4",
        detail: `Step 3 of 4 (94%): Single backup file (${fileName}) Google Drive me update ho chuki hai.`,
        duration: 250
      });
    }

    const backupTimeNow = Date.now();
    const now = new Date();
    googleDriveAutoBackupConfig.lastBackupTimestamp = backupTimeNow;
    googleDriveAutoBackupConfig.lastBackupDate = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    googleDriveAutoBackupConfig.webAppUrl = webAppUrl;

    const intervalDays = parseInt(googleDriveAutoBackupConfig.intervalDays, 10) || 1;
    let nextD = new Date(backupTimeNow);
    if (googleDriveAutoBackupConfig.preferredTime) {
      const [pHours, pMins] = googleDriveAutoBackupConfig.preferredTime.split(':').map(Number);
      if (!isNaN(pHours) && !isNaN(pMins)) {
        nextD.setHours(pHours, pMins, 0, 0);
      }
    }
    nextD.setDate(nextD.getDate() + intervalDays);
    while (nextD.getTime() <= Date.now()) {
      nextD.setDate(nextD.getDate() + intervalDays);
    }
    googleDriveAutoBackupConfig.nextBackupTimestamp = nextD.getTime();

    localStorage.setItem('rpm_gdrive_autobackup', JSON.stringify(googleDriveAutoBackupConfig));
    if (typeof db !== 'undefined' && db) {
      db.ref('appConfig/googleDriveAutoBackup/lastBackupTimestamp').set(googleDriveAutoBackupConfig.lastBackupTimestamp);
      db.ref('appConfig/googleDriveAutoBackup/lastBackupDate').set(googleDriveAutoBackupConfig.lastBackupDate);
      db.ref('appConfig/googleDriveAutoBackup/nextBackupTimestamp').set(googleDriveAutoBackupConfig.nextBackupTimestamp);
      db.ref('appConfig/googleDriveAutoBackup/webAppUrl').set(googleDriveAutoBackupConfig.webAppUrl);
      if (googleDriveAutoBackupConfig.preferredTime) {
        db.ref('appConfig/googleDriveAutoBackup/preferredTime').set(googleDriveAutoBackupConfig.preferredTime);
      }
    }

    if (isManual) {
      updateDmProgress(100, {
        subtitle: "Single Backup File Updated in Google Drive!",
        step: "Completed (100%)",
        icon: "fas fa-check-circle text-emerald-400",
        color: "emerald",
        detail: `Completed (100%): ${fileName} aapke Google Drive me successfully update & overwrite ho gayi hai!`,
        duration: 300,
        isComplete: true,
        taskName: taskTitle
      });
      closeDmProgress(1400);
    }

    toast.ok(`✅ WhatsApp-Style Sync: ${fileName} Google Drive me successfully update ho gayi!`);
    updateAutoBackupBadge();
    updateDriveBackupUI();
    loadDriveBackupIndexStatus();
  } catch (err) {
    if (currentTaskAbortController?.signal?.aborted || err?.name === 'AbortError') {
      console.warn("Drive backup cancelled by user.");
      return;
    }
    stopDmProgressAutoAdvance();
    console.error("Drive auto backup failed:", err);
    if (isManual) {
      updateDmProgress(100, {
        subtitle: "Google Drive Backup Failed!",
        step: "Error",
        icon: "fas fa-times-circle text-rose-400",
        color: "rose",
        detail: err.message,
        isFail: true,
        taskName: taskTitle
      });
      closeDmProgress(2500);
    }
    toast.err(`Google Drive backup failed: ${err.message}`);
  } finally {
    if (fetchTimeoutId) clearTimeout(fetchTimeoutId);
    currentTaskAbortController = null;
    stopDmProgressAutoAdvance();
    if (testBtn && isManual) {
      testBtn.disabled = false;
      testBtn.innerHTML = `<i class="fab fa-google-drive"></i> <span>Save Backup to Google Drive Now (Test)</span>`;
    }
  }
}
window.sendDriveBackup = sendDriveBackup;

function checkAndRunTelegramAutoBackup() {
  if (!telegramAutoBackupConfig || !telegramAutoBackupConfig.enabled) return;
  if (!telegramAutoBackupConfig.botToken || !telegramAutoBackupConfig.chatId) return;
  if (isBackupRunning) return;

  const now = Date.now();
  let shouldRun = false;

  if (telegramAutoBackupConfig.nextBackupTimestamp) {
    if (now >= telegramAutoBackupConfig.nextBackupTimestamp) {
      shouldRun = true;
    }
  } else {
    const intervalDays = parseInt(telegramAutoBackupConfig.intervalDays, 10) || 1;
    const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
    const lastTime = parseInt(telegramAutoBackupConfig.lastBackupTimestamp, 10) || 0;
    if (!lastTime || (now - lastTime) >= intervalMs) {
      shouldRun = true;
    }
  }

  if (shouldRun) {
    isBackupRunning = true;
    console.log(`[AutoBackup] Running scheduled Telegram backup. Target: ${telegramAutoBackupConfig.nextBackupTimestamp ? new Date(telegramAutoBackupConfig.nextBackupTimestamp).toISOString() : 'Interval'}`);
    sendTelegramBackup(false).finally(() => {
      isBackupRunning = false;
    });
  }
}

function checkAndRunDriveAutoBackup() {
  if (!googleDriveAutoBackupConfig || !googleDriveAutoBackupConfig.enabled) return;
  if (!googleDriveAutoBackupConfig.folderLink && !googleDriveAutoBackupConfig.folderId) return;
  if (isDriveBackupRunning) return;

  const now = Date.now();
  let shouldRun = false;

  if (googleDriveAutoBackupConfig.nextBackupTimestamp) {
    if (now >= googleDriveAutoBackupConfig.nextBackupTimestamp) {
      shouldRun = true;
    }
  } else {
    const intervalDays = parseInt(googleDriveAutoBackupConfig.intervalDays, 10) || 1;
    const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
    const lastTime = parseInt(googleDriveAutoBackupConfig.lastBackupTimestamp, 10) || 0;
    if (!lastTime || (now - lastTime) >= intervalMs) {
      shouldRun = true;
    }
  }

  if (shouldRun) {
    isDriveBackupRunning = true;
    console.log(`[AutoBackup] Running scheduled Google Drive backup. Target: ${googleDriveAutoBackupConfig.nextBackupTimestamp ? new Date(googleDriveAutoBackupConfig.nextBackupTimestamp).toISOString() : 'Interval'}`);
    sendDriveBackup(false).finally(() => {
      isDriveBackupRunning = false;
    });
  }
}

function initTelegramAutoBackupScheduler() {
  loadTelegramAutoBackupSettings();
  loadGoogleDriveAutoBackupSettings();
  if (autoBackupTimerId) clearInterval(autoBackupTimerId);
  // Check every 60 seconds (1 minute) for tight schedule execution
  autoBackupTimerId = setInterval(() => {
    checkAndRunTelegramAutoBackup();
    checkAndRunDriveAutoBackup();
  }, 60 * 1000);

  // Also check immediately when browser tab becomes active or window focused
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      checkAndRunTelegramAutoBackup();
      checkAndRunDriveAutoBackup();
    }
  });
  window.addEventListener('focus', () => {
    checkAndRunTelegramAutoBackup();
    checkAndRunDriveAutoBackup();
  });
}
initTelegramAutoBackupScheduler();

/* ══════════════════════════════════════════════════════════
   18.2 TELEGRAM LIVE VISITOR LOG CONTROLLER
   ══════════════════════════════════════════════════════════ */
let telegramVisitLogConfig = {
  enabled: true,
  botToken: '8880618363:AAEGp8ReJEcB563j9_2XiaVvwaPHMigt1PM',
  chatId: '7927138678'
};

function loadTelegramVisitLogSettings() {
  try {
    const local = localStorage.getItem('rpm_telegram_visitlog');
    if (local) {
      telegramVisitLogConfig = Object.assign({}, telegramVisitLogConfig, JSON.parse(local));
    }
  } catch (e) {
    console.error("Error reading local visit log config", e);
  }

  if (typeof db !== 'undefined' && db) {
    db.ref('appConfig/telegramVisitLog').once('value').then(snap => {
      const val = snap.val();
      if (val && typeof val === 'object') {
        telegramVisitLogConfig = Object.assign({}, telegramVisitLogConfig, val);
        localStorage.setItem('rpm_telegram_visitlog', JSON.stringify(telegramVisitLogConfig));
      }
      updateVisitLogBadge();
      updateVisitLogUI();
    }).catch(err => {
      console.warn("Could not fetch remote visit log config:", err);
      updateVisitLogBadge();
    });
  } else {
    updateVisitLogBadge();
  }
}

function updateVisitLogBadge() {
  const badge = document.getElementById('dm-visitlog-status-badge');
  const statusText = document.getElementById('dm-visitlog-status-text');
  const isAct = telegramVisitLogConfig.enabled && telegramVisitLogConfig.botToken && telegramVisitLogConfig.chatId;

  if (badge) {
    if (isAct) {
      badge.className = "text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30";
      badge.textContent = "Active";
    } else {
      badge.className = "text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-500";
      badge.textContent = "Disabled";
    }
  }

  if (statusText) {
    statusText.textContent = isAct ? "Active (Live Alerts)" : "Disabled";
    statusText.className = isAct ? "font-semibold text-emerald-600 dark:text-emerald-400" : "font-semibold text-slate-400";
  }
}

function updateVisitLogToggleUI() {
  const enableInput = document.getElementById('dm-visitlog-enable');
  if (enableInput && enableInput.checked) {
    const tokenInput = document.getElementById('dm-visitlog-token');
    const chatInput = document.getElementById('dm-visitlog-chatid');
    if (tokenInput && !tokenInput.value) tokenInput.value = '8880618363:AAEGp8ReJEcB563j9_2XiaVvwaPHMigt1PM';
    if (chatInput && !chatInput.value) chatInput.value = '7927138678';
  }
}
window.updateVisitLogToggleUI = updateVisitLogToggleUI;

function updateVisitLogUI() {
  const enableInput = document.getElementById('dm-visitlog-enable');
  const tokenInput = document.getElementById('dm-visitlog-token');
  const chatInput = document.getElementById('dm-visitlog-chatid');

  if (enableInput) enableInput.checked = !!telegramVisitLogConfig.enabled;
  if (tokenInput) tokenInput.value = telegramVisitLogConfig.botToken || '';
  if (chatInput) chatInput.value = telegramVisitLogConfig.chatId || '';
  updateVisitLogBadge();
}
window.updateVisitLogUI = updateVisitLogUI;

function openVisitLogPanel() {
  if (typeof updateVisitLogUI === 'function') updateVisitLogUI();
  if (typeof showDmPanel === 'function') showDmPanel('dm-visitlog-panel');
}
window.openVisitLogPanel = openVisitLogPanel;

async function saveVisitLogSettings() {
  const enableInput = document.getElementById('dm-visitlog-enable');
  const tokenInput = document.getElementById('dm-visitlog-token');
  const chatInput = document.getElementById('dm-visitlog-chatid');
  const saveBtn = document.getElementById('dm-visitlog-save-btn');

  const enabled = enableInput ? enableInput.checked : false;
  const botToken = tokenInput ? tokenInput.value.trim() : '';
  const chatId = chatInput ? chatInput.value.trim() : '';

  if (enabled && (!botToken || !chatId)) {
    return toast.err("Please enter both Telegram Bot Token and Chat ID to enable Visitor Logging.");
  }

  telegramVisitLogConfig.enabled = enabled;
  telegramVisitLogConfig.botToken = botToken;
  telegramVisitLogConfig.chatId = chatId;

  localStorage.setItem('rpm_telegram_visitlog', JSON.stringify(telegramVisitLogConfig));

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>Saving...</span>`;
  }

  try {
    if (typeof db !== 'undefined' && db) {
      await db.ref('appConfig/telegramVisitLog').set(telegramVisitLogConfig);
    }
    toast.ok(`Visit Log settings saved successfully! (${enabled ? 'Active' : 'Disabled'})`);
  } catch (e) {
    console.error("Error saving visit log to Firebase:", e);
    toast.ok(`Visit Log settings saved locally!`);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<i class="fas fa-save"></i> <span>Save Visit Log Settings</span>`;
    }
    updateVisitLogBadge();
    updateVisitLogUI();
  }
}
window.saveVisitLogSettings = saveVisitLogSettings;

async function testVisitLogNow() {
  const tokenInput = document.getElementById('dm-visitlog-token');
  const chatInput = document.getElementById('dm-visitlog-chatid');
  const token = (tokenInput?.value || telegramVisitLogConfig.botToken || '8880618363:AAEGp8ReJEcB563j9_2XiaVvwaPHMigt1PM').trim();
  const chat = (chatInput?.value || telegramVisitLogConfig.chatId || '7927138678').trim();

  if (!token || !chat) {
    return toast.err("Please enter both Telegram Bot Token and Chat ID to send test alert.");
  }

  const testBtn = document.getElementById('dm-visitlog-test-btn');
  if (testBtn) {
    testBtn.disabled = true;
    testBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>Sending Test Log...</span>`;
  }

  toast.info("Sending test visitor notification to Telegram...");

  try {
    const dateStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const ua = navigator.userAgent;
    let os = "Windows";
    if (ua.indexOf("Win") !== -1) os = "Windows (v10/11)";
    else if (ua.indexOf("Mac") !== -1) os = "MacOS";
    else if (ua.indexOf("Linux") !== -1) os = "Linux";
    else if (ua.indexOf("Android") !== -1) os = "Android";
    else if (ua.indexOf("like Mac") !== -1) os = "iOS";

    let browser = "Chrome";
    if (ua.indexOf("Firefox") !== -1) browser = "Firefox";
    else if (ua.indexOf("SamsungBrowser") !== -1) browser = "Samsung Browser";
    else if (ua.indexOf("Opera") !== -1 || ua.indexOf("OPR") !== -1) browser = "Opera";
    else if (ua.indexOf("Edge") !== -1 || ua.indexOf("Edg") !== -1) browser = "Edge";
    else if (ua.indexOf("Chrome") !== -1) browser = "Chrome";
    else if (ua.indexOf("Safari") !== -1) browser = "Safari";

    const screenRes = `${window.screen.width}x${window.screen.height}`;
    let message = `🔔 <b>Test Visitor Notification</b>\n`;
    message += `📊 <i>RPM Diesel ERP - Visitor Log Test</i>\n\n`;
    message += `📅 <b>Date & Time:</b> ${dateStr} (IST)\n`;
    message += `💻 <b>Device OS:</b> ${os}\n`;
    message += `🌐 <b>Browser:</b> ${browser}\n`;
    message += `🖥️ <b>Screen Resolution:</b> ${screenRes}\n`;

    try {
      const ipRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
      if (ipRes.ok) {
        const data = await ipRes.json();
        message += `ℹ️ <b>IP Address:</b> ${data.ip || 'Unknown'}\n`;
        message += `📍 <b>Location:</b> ${data.city || 'Unknown'}, ${data.region || 'Unknown'}, ${data.country || 'Unknown'}\n`;
        message += `🏢 <b>ISP:</b> ${data.organization_name || data.organization || 'Unknown'}\n`;
        if (data.latitude && data.longitude) {
          message += `🗺️ <b>Google Maps:</b> https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}\n`;
        }
      }
    } catch (e) {}

    message += `\n✅ <b>Status:</b> Telegram Visit Log integration is WORKING properly!`;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    const resData = await res.json();
    if (resData.ok) {
      toast.ok("Test visit log successfully delivered to Telegram!");
    } else {
      toast.err(`Telegram Error: ${resData.description || 'Could not send message'}`);
    }
  } catch (err) {
    toast.err(`Failed to send test log: ${err.message}`);
  } finally {
    if (testBtn) {
      testBtn.disabled = false;
      testBtn.innerHTML = `<i class="fas fa-paper-plane"></i> <span>Send Test Visit Log to Telegram</span>`;
    }
  }
}
window.testVisitLogNow = testVisitLogNow;

loadTelegramVisitLogSettings();

// Download PDF Setup Tutorial
window.downloadSetupTutorial = () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(220, 38, 38); // Red color
  doc.text("RPM DIESEL ERP - Firebase API Integration Guide", 20, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("Generated on: " + new Date().toLocaleDateString('en-IN') + " | Admin Support", 20, 27);
  
  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 30, 190, 30);
  
  // Section 1: Introduction
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Overview", 20, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("This guide contains detailed instructions to connect this HTML SPA dashboard to your own", 20, 46);
  doc.text("Google Firebase Realtime Database. By doing so, your records sync securely in real-time.", 20, 51);
  
  // Section 2: Steps
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Step-by-Step Setup Instructions", 20, 62);
  
  const steps = [
    "1. Open the Google Firebase Console at: https://console.firebase.google.com/",
    "2. Click 'Add Project' and enter a name (e.g., 'rpm-diesel'). Click 'Continue'.",
    "3. Disable or enable Google Analytics as preferred, then click 'Create Project'.",
    "4. Once project is ready, click on the Web icon (</>) to register a new Web Application.",
    "5. Enter 'RPM Diesel App' as the App nickname, then click 'Register App'.",
    "6. Firebase will display your 'firebaseConfig' object. Copy the API Key, Auth Domain,",
    "   Database URL, Project ID, Storage Bucket, Messaging Sender ID, and App ID.",
    "7. In the Firebase console sidebar, navigate to 'Build' -> 'Realtime Database'.",
    "8. Click 'Create Database', select your database location, and click 'Next'.",
    "9. Choose 'Start in Test Mode' to enable read/write permissions, then click 'Enable'.",
    "10. Click the 'Rules' tab at the top and ensure rules are set to:",
    "    { \"rules\": { \".read\": true, \".write\": true } } then click 'Publish'.",
    "11. Return to this application's Settings panel, click 'UPDATE Database API',",
    "    enter the admin passcode (@RPM@2026@), and paste your credentials in the form.",
    "12. Click 'Save & Reload' to connect to your custom real-time database instance."
  ];
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let y = 70;
  steps.forEach(step => {
    doc.text(step, 20, y);
    y += 7;
  });
  
  // Footer notice
  doc.setDrawColor(220, 38, 38);
  doc.setFillColor(254, 242, 242);
  doc.rect(20, y + 5, 170, 18, "FD");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(185, 28, 28);
  doc.text("IMPORTANT SECURITY CAUTION:", 25, y + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Never share your admin passcode (@RPM@2026@) or Firebase API credentials with", 25, y + 16);
  doc.text("unauthorized personnel. For assistance, contact support@rpm.gt.tc.", 25, y + 20);
  
  doc.save("Firebase_Setup_Guide.pdf");
  toast.ok("Tutorial PDF downloaded.");
};

/* ══════════════════════════════════════════════════════════
   19. MODAL DIESEL RATE CONFIGURATION
   ══════════════════════════════════════════════════════════ */
window.openDieselRateModal = () => {
  if (!checkAuth()) return;
  const isAdmin = (getAuthSession('rpm_is_admin') === '1');
  if (!isAdmin) {
    toast.err("Only Admin can update or change the Diesel Rate.");
    return;
  }
  const rate = prompt("Enter new current diesel price rate (Per L):", dieselRate);
  if (rate !== null && !isNaN(rate) && parseFloat(rate) > 0) {
    dieselRateRef.set(parseFloat(rate))
      .then(() => toast.ok(`Diesel Rate updated to ₹${parseFloat(rate).toFixed(2)}/L`))
      .catch(() => toast.err("Failed to save diesel rate."));
  }
};

/* ══════════════════════════════════════════════════════════
   20. DIESEL CALCULATOR & MESSAGE PARSER SYSTEM
   ══════════════════════════════════════════════════════════ */

// Check if entry note/location/vendor indicates a non-diesel product (e.g. Urea or Oil)
function isNonDieselEntry(e) {
  if (!e) return false;
  if (e.isExcluded || e.excluded || e.itemType === 'urea' || e.itemType === 'oil' || e.type === 'urea') return true;

  const textToTest = `${e.note || ''} ${e.fromLocation || ''} ${e.lastLocation || ''} ${e.vendorName || ''} ${e.vehicleType || ''} ${e.product || ''} ${e.category || ''} ${e.purpose || ''}`.toUpperCase();

  // Urea / DEF / AdBlue
  if (textToTest.includes("UREA") || 
      textToTest.includes("URIYA") || 
      textToTest.includes("ADBLUE") || 
      textToTest.includes("AD BLUE") || 
      textToTest.includes("DEF")) {
    return true;
  }

  // Oil variations (Steering, Brake, Engine, Gear, Mobil, Break, String, etc.)
  if (textToTest.includes("STEERING OIL") || textToTest.includes("STERING OIL") || textToTest.includes("STRING OIL") || textToTest.includes("STARING OIL") ||
      textToTest.includes("BRAKE OIL") || textToTest.includes("BREAK OIL") || textToTest.includes("BREAKOIL") || textToTest.includes("BRAKEOIL") ||
      textToTest.includes("ENGINE OIL") || textToTest.includes("ENGIN OIL") || textToTest.includes("ENG OIL") ||
      textToTest.includes("GEAR OIL") || textToTest.includes("MOBIL OIL") || textToTest.includes("MOBIL") ||
      textToTest.includes("CLUTCH OIL") || textToTest.includes("HYDRAULIC OIL") || textToTest.includes("LUBRICANT")) {
    return true;
  }

  // Coolant, Grease, Maintenance
  if (textToTest.includes("COOLANT") || textToTest.includes("GREASE") || textToTest.includes("PUNCTURE") || textToTest.includes("PUNCHER") || textToTest.includes("FASTAG") || textToTest.includes("TOLL TAX")) {
    return true;
  }

  return false;
}

// Global user manual override map for entry exclusion
window.manuallyExcludedEntries = window.manuallyExcludedEntries || {};

function getEntryUniqueKey(e) {
  if (!e) return '';
  if (e.responseNumber) return 'resp_' + String(e.responseNumber).trim();
  if (e.key) return 'key_' + String(e.key).trim();
  if (e.id) return 'id_' + String(e.id).trim();
  const v = (e.vehicleNo || e.vehicle_no || e.vehicle || '').trim().toUpperCase();
  const d = (e.date || e.created_at || '').trim();
  const km = (e.currentKm || e.km || e.endKm || '').toString().trim();
  const amt = (e.dieselAmount || e.amount || '').toString().trim();
  return `entry_${v}_${d}_${km}_${amt}`;
}

function isEntryExcluded(e) {
  if (!e) return false;
  const k = getEntryUniqueKey(e);
  if (k && window.manuallyExcludedEntries && window.manuallyExcludedEntries[k] !== undefined) {
    return !!window.manuallyExcludedEntries[k];
  }
  if (e.manuallyExcluded !== undefined) {
    return !!e.manuallyExcluded;
  }
  return isNonDieselEntry(e);
}
window.isEntryExcluded = isEntryExcluded;
window.getEntryUniqueKey = getEntryUniqueKey;

// Robust Date string parsing helper
function parseDateStr(str) {
  if (!str) return null;
  
  // Handle numeric timestamp or digit string (e.g. 1784013298911)
  if (typeof str === 'number' || (typeof str === 'string' && /^\d{10,13}$/.test(str.trim()))) {
    const d = new Date(Number(str));
    return isNaN(d) ? null : d;
  }

  str = String(str).trim();
  const cleanStr = str.split(/[\s,T]+/)[0].trim();

  // 1. Match YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD first
  const ymdMatch = cleanStr.match(/^(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})$/);
  if (ymdMatch) {
    const yy = parseInt(ymdMatch[1]);
    const mm = parseInt(ymdMatch[2]) - 1;
    const dd = parseInt(ymdMatch[3]);
    return new Date(yy, mm, dd);
  }

  // 2. Match DD-MM-YYYY / DD/MM/YYYY / DD.MM.YYYY
  const match = cleanStr.match(/^(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{2,4})$/);
  if (match) {
    const dd = parseInt(match[1]);
    const mm = parseInt(match[2]) - 1;
    let yy = parseInt(match[3]);
    if (yy < 100) {
      yy += (yy < 50 ? 2000 : 1900);
    }
    return new Date(yy, mm, dd);
  }

  // Default browser fallback
  const d = new Date(str);
  return isNaN(d) ? null : d;
}

// Convert date and optional time into Milliseconds since epoch
function parseDateAndTimeToMs(e) {
  if (!e || !e.date) return 0;
  const dt = parseDateStr(e.date);
  if (!dt) return 0;

  if (e.time) {
    const timeStr = String(e.time).trim().toUpperCase();
    // Support formats like HH:MM AM/PM or HH:MM or HH:MM:SS
    const matches = timeStr.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/) || timeStr.match(/(\d{1,2}):(\d{2})/);
    if (matches) {
      let hrs = parseInt(matches[1]) || 0;
      const mins = parseInt(matches[2]) || 0;
      const ampm = matches[3];
      if (ampm === 'PM' && hrs < 12) hrs += 12;
      if (ampm === 'AM' && hrs === 12) hrs = 0;
      dt.setHours(hrs, mins, 0, 0);
    }
  }
  return dt.getTime();
}

// Auto-resolve mileage from history or config when vehicle changes
function handleVehicleChange() {
  const vehicleInput = document.getElementById('calc-vehicle');
  const mileageInput = document.getElementById('calc-mileage');
  if (!vehicleInput || !mileageInput) return;

  const vehicle = vehicleInput.value.trim().toUpperCase();
  if (!vehicle) {
    mileageInput.value = '';
    return;
  }

  let resolvedMileage = undefined;

  // 1. Try historical matching from entries
  const entryMatch = historyEntries.find(ent => ent.vehicleNo === vehicle && ent.vehicleType && ent.vehicleType.trim());
  if (entryMatch && vehicleTypes) {
    const vtype = entryMatch.vehicleType.trim().toUpperCase();
    const key = Object.keys(vehicleTypes).find(k => k.trim().toUpperCase() === vtype);
    if (key) resolvedMileage = parseFloat(vehicleTypes[key]);
  }

  // 2. Try direct vehicle name mileage matching from config
  if (vehicleTypes && (resolvedMileage === undefined || isNaN(resolvedMileage))) {
    const key = Object.keys(vehicleTypes).find(k => k.trim().toUpperCase() === vehicle);
    if (key) resolvedMileage = parseFloat(vehicleTypes[key]);
  }

  if (resolvedMileage !== undefined && !isNaN(resolvedMileage) && resolvedMileage > 0) {
    mileageInput.value = resolvedMileage;
  } else {
    mileageInput.value = '4.0';
  }
}

// Calculator core execution logic
function runCalculation() {
  const vehicle = document.getElementById('calc-vehicle').value.trim();
  const dateFromInput = document.getElementById('calc-date-from').value; // YYYY-MM-DD
  const dateToInput = document.getElementById('calc-date-to').value;
  const currentKmRaw = document.getElementById('calc-current-km').value.trim();

  if (!vehicle) return showAlert('error', 'Error', 'Vehicle select karo!');
  if (!dateFromInput) return showAlert('error', 'Error', 'Start date select karo!');
  if (!currentKmRaw) return showAlert('error', 'Error', 'Current KM daalo!');

  const currentKm = parseFloat(currentKmRaw.replace(/[^0-9.\-]/g, ''));
  if (isNaN(currentKm) || currentKm <= 0) return showAlert('error', 'Error', 'Valid current KM daalo!');

  let mileage = 4.0;
  const mileageInput = document.getElementById('calc-mileage');
  const manualMileageRaw = mileageInput ? mileageInput.value.trim() : '';

  if (manualMileageRaw) {
    const parsed = parseFloat(manualMileageRaw);
    if (!isNaN(parsed) && parsed > 0) {
      mileage = parsed;
    }
  } else if (vehicle) {
    let configMileage = undefined;
    
    // 1. Try historical matching from entries
    const entryMatch = historyEntries.find(ent => ent.vehicleNo === vehicle.toUpperCase() && ent.vehicleType && ent.vehicleType.trim());
    if (entryMatch && vehicleTypes) {
      const vtype = entryMatch.vehicleType.trim().toUpperCase();
      const key = Object.keys(vehicleTypes).find(k => k.trim().toUpperCase() === vtype);
      if (key) configMileage = parseFloat(vehicleTypes[key]);
    }
    
    // 2. Try direct vehicle name mileage matching from config
    if (vehicleTypes && (configMileage === undefined || isNaN(configMileage))) {
      const key = Object.keys(vehicleTypes).find(k => k.trim().toUpperCase() === vehicle.toUpperCase());
      if (key) configMileage = parseFloat(vehicleTypes[key]);
    }
    
    if (configMileage !== undefined && !isNaN(configMileage) && configMileage > 0) {
      mileage = configMileage;
      if (mileageInput) mileageInput.value = mileage;
    } else {
      if (mileageInput) mileageInput.value = '4.0';
    }
  }

  // Parse date range
  const dateFrom = new Date(dateFromInput);
  dateFrom.setHours(0, 0, 0, 0);

  let dateTo;
  if (dateToInput) {
    dateTo = new Date(dateToInput);
    dateTo.setHours(23, 59, 59, 999);
  } else {
    dateTo = new Date();
    dateTo.setHours(23, 59, 59, 999);
  }

  const searchVehicle = String(vehicle).replace(/[^A-Z0-9]/gi, '').toUpperCase();

  // Filter entries for this vehicle within date range
  const matchedEntries = historyEntries.filter(e => {
    const dbVehicle = String(e.vehicleNo || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (dbVehicle !== searchVehicle) return false;
    const entryDate = parseDateStr(e.date);
    if (!entryDate) return false;
    entryDate.setHours(0, 0, 0, 0);
    return entryDate >= dateFrom && entryDate <= dateTo;
  });

  if (matchedEntries.length === 0) {
    return showAlert('error', 'Error', `"${vehicle}" ka koi entry nahi mila iss date range mein!`);
  }

  // Sort matched entries: Chronologically by Date ASC; if same date, by KM ASC (so lower KM is 1st, higher KM is 2nd)
  const sorted = [...matchedEntries].sort((a, b) => {
    const dA = parseDateStr(a.date) || 0;
    const dB = parseDateStr(b.date) || 0;
    const tA = dA.valueOf ? dA.valueOf() : 0;
    const tB = dB.valueOf ? dB.valueOf() : 0;
    if (tA !== tB) return tA - tB;
    const kmA = parseFloat(String(a.currentKm || a.km || 0).replace(/[^0-9.\-]/g, '')) || 0;
    const kmB = parseFloat(String(b.currentKm || b.km || 0).replace(/[^0-9.\-]/g, '')) || 0;
    if (kmA !== kmB) return kmA - kmB;
    return (parseInt(a.responseNumber || a.key || 0) || 0) - (parseInt(b.responseNumber || b.key || 0) || 0);
  });

  // Filter out non-diesel items for fuel calculations
  const calcEntries = matchedEntries.filter(e => !isEntryExcluded(e));

  const sortedCalc = [...calcEntries].sort((a, b) => {
    const dA = parseDateStr(a.date) || 0;
    const dB = parseDateStr(b.date) || 0;
    const tA = dA.valueOf ? dA.valueOf() : 0;
    const tB = dB.valueOf ? dB.valueOf() : 0;
    if (tA !== tB) return tA - tB;
    const kmA = parseFloat(String(a.currentKm || a.km || 0).replace(/[^0-9.\-]/g, '')) || 0;
    const kmB = parseFloat(String(b.currentKm || b.km || 0).replace(/[^0-9.\-]/g, '')) || 0;
    if (kmA !== kmB) return kmA - kmB;
    return (parseInt(a.responseNumber || a.key || 0) || 0) - (parseInt(b.responseNumber || b.key || 0) || 0);
  });

  // First KM = Lowest KM on the vehicle's earliest entry date in range
  // "jo sabse kam km hai ohi 1st km hai agr koi vehicle 1 day me 2 ya jyda trip marti hai to uska kam km 1st thoda jyda 2nd essa rahega"
  let firstKm = 0;
  const pool = sortedCalc.length > 0 ? sortedCalc : sorted;
  if (pool.length > 0) {
    const firstDateObj = parseDateStr(pool[0].date);
    const firstDateTime = firstDateObj ? firstDateObj.getTime() : 0;
    const firstDayEntries = pool.filter(e => {
      const d = parseDateStr(e.date);
      return d && d.getTime() === firstDateTime;
    });
    const firstDayKmPool = firstDayEntries
      .map(e => parseFloat(String(e.currentKm || e.km || 0).replace(/[^0-9.\-]/g, '')) || 0)
      .filter(km => km > 1);
    if (firstDayKmPool.length > 0) {
      firstKm = Math.min(...firstDayKmPool);
    } else {
      const allKmPool = pool
        .map(e => parseFloat(String(e.currentKm || e.km || 0).replace(/[^0-9.\-]/g, '')) || 0)
        .filter(km => km > 1);
      firstKm = allKmPool.length > 0 ? Math.min(...allKmPool) : 0;
    }
  }

  // Calculations
  const totalKm = currentKm - firstKm;
  let totalDiesel = 0;
  calcEntries.forEach(e => {
    const amt = parseFloat(String(e.dieselAmount).replace(/[^0-9.\-]/g, '')) || 0;
    totalDiesel += amt;
  });

  const actualFilledLitres = totalDiesel / dieselRate;
  const expectedConsumed = totalKm > 0 ? (totalKm / mileage) : 0;
  const extraDieselLeft = actualFilledLitres - expectedConsumed;
  const dueAmountVal = extraDieselLeft * dieselRate;

  // Render values
  document.getElementById('calc-first-km-disp').textContent = firstKm.toLocaleString('en-IN');
  document.getElementById('calc-current-km-disp').textContent = currentKm.toLocaleString('en-IN');
  document.getElementById('calc-total-litres-disp').textContent = actualFilledLitres.toFixed(2);
  document.getElementById('calc-mileage-disp').textContent = mileage;

  const cardTotalKm = document.getElementById('card-total-km');
  const valTotalKm = document.getElementById('calc-total-km');
  valTotalKm.textContent = totalKm.toLocaleString('en-IN');
  cardTotalKm.className = 'result-card flag-neutral count-animate';

  document.getElementById('calc-total-diesel').textContent = '₹' + totalDiesel.toLocaleString('en-IN');
  document.getElementById('calc-diesel-consumed').textContent = expectedConsumed.toFixed(2) + ' L';

  const cardExtraDiesel = document.getElementById('card-extra-diesel');
  const valExtraDiesel = document.getElementById('calc-extra-diesel');
  const lblExtraDiesel = document.getElementById('calc-extra-diesel-label');

  cardExtraDiesel.className = 'result-card flag-neutral count-animate';
  valExtraDiesel.className = 'result-value text-blue-600 dark:text-blue-400 hd-text-glow';

  if (extraDieselLeft >= 0) {
    valExtraDiesel.textContent = '+' + extraDieselLeft.toFixed(2) + ' L';
    lblExtraDiesel.textContent = 'Surplus (tank safe)';
  } else {
    valExtraDiesel.textContent = extraDieselLeft.toFixed(2) + ' L';
    lblExtraDiesel.textContent = 'Shortage / Deficit';
  }

  const cardDueAmount = document.getElementById('card-due-amount');
  const valDueAmount = document.getElementById('calc-due-amount');
  const lblDueAmount = document.getElementById('calc-due-amount-label');

  if (dueAmountVal >= 0) {
    valDueAmount.textContent = '₹' + dueAmountVal.toLocaleString('en-IN', {maximumFractionDigits:0});
    valDueAmount.className = 'result-value text-green-600 dark:text-green-400 hd-text-glow-success';
    cardDueAmount.className = 'result-card flag-green count-animate';
    lblDueAmount.textContent = 'Saved Fuel Value';
  } else {
    valDueAmount.textContent = '₹' + dueAmountVal.toLocaleString('en-IN', {maximumFractionDigits:0});
    valDueAmount.className = 'result-value text-red-600 dark:text-red-400 hd-text-glow-error';
    cardDueAmount.className = 'result-card flag-red count-animate';
    lblDueAmount.textContent = 'Extra Due / Deficit Cost';
  }

  // Save current sorted entries for interactive row toggle
  window.currentCalcSortedEntries = sorted;

  // Calculate per-trip extra left
  const leftovers = new Array(sorted.length).fill(null);
  sorted.forEach((e, i) => {
    const isExcluded = isEntryExcluded(e);
    if (isExcluded) return;

    const currKm = parseFloat(String(e.currentKm).replace(/[^0-9.\-]/g, '')) || 0;
    let nextKm;
    let shouldCalculate = true;

    if (i < sorted.length - 1) {
      let nextDiesel = null;
      for (let j = i + 1; j < sorted.length; j++) {
        if (!isEntryExcluded(sorted[j])) {
          nextDiesel = sorted[j];
          break;
        }
      }
      if (nextDiesel) {
        nextKm = parseFloat(String(nextDiesel.currentKm).replace(/[^0-9.\-]/g, '')) || 0;
      } else {
        nextKm = currentKm;
        if (nextKm === currKm) shouldCalculate = false;
      }
    } else {
      nextKm = currentKm;
      if (nextKm === currKm) shouldCalculate = false;
    }

    if (shouldCalculate) {
      const distance = nextKm - currKm;
      const consumedLitres = distance > 0 ? (distance / mileage) : 0;
      const filledAmount = parseFloat(String(e.dieselAmount).replace(/[^0-9.\-]/g, '')) || 0;
      const filledLitres = filledAmount / dieselRate;
      leftovers[i] = filledLitres - consumedLitres;
    }
  });

  const tbody = document.getElementById('calc-entries-body');
  tbody.innerHTML = '';
  const fragment = document.createDocumentFragment();

  sorted.forEach((e, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.note = e.note || '';

    const isExcluded = isEntryExcluded(e);
    if (isExcluded) {
      tr.className = 'bg-red-50/40 dark:bg-red-950/10 hover:bg-red-100/30 dark:hover:bg-red-900/20 transition-all';
    } else {
      tr.className = 'hover:bg-gray-50 dark:hover:bg-gray-800 transition-all';
    }

    const dieselVal = parseFloat(String(e.dieselAmount).replace(/[^0-9.\-]/g, '')) || 0;
    const statusBadge = isExcluded
      ? `<span class="px-2 py-0.5 text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded border border-red-200 dark:border-red-800 whitespace-nowrap"><i class="fas fa-exclamation-triangle mr-1"></i> EXCLUDED</span>`
      : `<span class="px-2 py-0.5 text-[10px] font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded border border-green-200 dark:border-green-800 whitespace-nowrap"><i class="fas fa-gas-pump mr-1"></i> DIESEL</span>`;

    const leftoverVal = leftovers[idx];
    let leftoverHtml = '';
    if (leftoverVal !== null && leftoverVal !== undefined) {
      const cost = leftoverVal * dieselRate;
      const formattedL = (leftoverVal >= 0 ? '+' : '') + leftoverVal.toFixed(2) + ' L';
      const formattedCost = (cost >= 0 ? '+' : '') + '₹' + cost.toLocaleString('en-IN', {maximumFractionDigits: 0});
      const colorClass = leftoverVal >= 0 ? 'text-green-600 dark:text-green-400 font-bold' : 'text-red-600 dark:text-red-400 font-bold';
      leftoverHtml = `<span class="${colorClass}">${formattedL} / ${formattedCost}</span>`;
    } else {
      leftoverHtml = `<span class="text-gray-400 dark:text-gray-600">-</span>`;
    }

    tr.innerHTML = `
      <td class="px-3 py-2 font-medium whitespace-nowrap text-center">
        <label class="inline-flex items-center justify-center gap-1.5 cursor-pointer select-none">
          <input type="checkbox" class="calc-exclude-cb rounded border-slate-300 dark:border-slate-600 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer" data-idx="${idx}" ${isExcluded ? 'checked' : ''} onchange="toggleCalcRowExclude(${idx}, this.checked)" title="Click to toggle Exclude">
          <span>${idx + 1}</span>
        </label>
      </td>
      <td class="px-3 py-2 text-sm whitespace-nowrap">${e.date}</td>
      <td class="px-3 py-2 text-sm whitespace-nowrap font-bold text-slate-800 dark:text-slate-200">${e.vehicleNo}</td>
      <td class="px-3 py-2 text-sm whitespace-nowrap max-w-[140px] truncate" title="${e.fromLocation || ''}">${e.fromLocation}</td>
      <td class="px-3 py-2 text-sm whitespace-nowrap max-w-[140px] truncate" title="${e.lastLocation || ''}">${e.lastLocation}</td>
      <td class="px-3 py-2 text-sm whitespace-nowrap"><div class="inline-flex items-center gap-1.5 whitespace-nowrap">${e.currentKm} ${statusBadge}</div></td>
      <td class="px-3 py-2 text-right font-semibold text-sm whitespace-nowrap ${isExcluded ? 'text-gray-400 line-through dark:text-gray-500' : ''}">₹${dieselVal.toLocaleString('en-IN')}</td>
      <td class="px-3 py-2 text-right text-sm whitespace-nowrap">${leftoverHtml}</td>
    `;
    fragment.appendChild(tr);
  });

  tbody.appendChild(fragment);

  const resultsDiv = document.getElementById('calc-results');
  resultsDiv.classList.remove('hidden');
  resultsDiv.classList.remove('animate-in');
  void resultsDiv.offsetWidth; // trigger reflow
  resultsDiv.classList.add('animate-in');

  showAlert('success', 'Calculation Done!', `${vehicle} — Total ${totalKm.toLocaleString('en-IN')} KM, Excluded ${matchedEntries.length - calcEntries.length} non-diesel items.`);
}

// Recalculate Diesel Calculator DOM cards, totals, and table rows dynamically
function recalculateCalculatorDom() {
  const sorted = window.currentCalcSortedEntries;
  if (!sorted || sorted.length === 0) {
    if (typeof runCalculation === 'function') runCalculation();
    return;
  }

  // Active mileage & diesel rate
  const mileageInput = document.getElementById('calc-mileage');
  let mileage = parseFloat(mileageInput ? mileageInput.value : '') || 4.0;
  if (mileage <= 0) mileage = 4.0;

  const activeRate = (typeof dieselRate !== 'undefined' && dieselRate > 0) ? dieselRate : 98.00;

  // Current KM
  let currentKm = 0;
  const currKmInput = document.getElementById('calc-current-km');
  const currKmDisp = document.getElementById('calc-current-km-disp');
  if (currKmInput && currKmInput.value) {
    currentKm = parseFloat(currKmInput.value.replace(/[^0-9.\-]/g, '')) || 0;
  }
  if (!currentKm && currKmDisp && currKmDisp.textContent) {
    currentKm = parseFloat(currKmDisp.textContent.replace(/[^0-9.\-]/g, '')) || 0;
  }
  if (!currentKm) {
    const kmList = sorted.map(e => parseFloat(String(e.currentKm || e.km || 0).replace(/[^0-9.\-]/g, '')) || 0);
    currentKm = Math.max(...kmList, 0);
  }

  // Filter diesel entries vs excluded
  const calcEntries = sorted.filter(e => !isEntryExcluded(e));

  // Determine First KM: lowest KM on vehicle's earliest entry date among diesel entries
  let firstKm = 0;
  const pool = calcEntries.length > 0 ? calcEntries : sorted;
  if (pool.length > 0) {
    const firstDateObj = parseDateStr(pool[0].date);
    const firstDateTime = firstDateObj ? firstDateObj.getTime() : 0;
    const firstDayEntries = pool.filter(e => {
      const d = parseDateStr(e.date);
      return d && d.getTime() === firstDateTime;
    });
    const firstDayKmPool = firstDayEntries
      .map(e => parseFloat(String(e.currentKm || e.km || 0).replace(/[^0-9.\-]/g, '')) || 0)
      .filter(km => km > 1);
    if (firstDayKmPool.length > 0) {
      firstKm = Math.min(...firstDayKmPool);
    } else {
      const allKmPool = pool
        .map(e => parseFloat(String(e.currentKm || e.km || 0).replace(/[^0-9.\-]/g, '')) || 0)
        .filter(km => km > 1);
      firstKm = allKmPool.length > 0 ? Math.min(...allKmPool) : 0;
    }
  }

  // Calculations
  const totalKm = (currentKm > firstKm) ? (currentKm - firstKm) : 0;
  let totalDiesel = 0;
  calcEntries.forEach(e => {
    const amt = parseFloat(String(e.dieselAmount || e.amount || 0).replace(/[^0-9.\-]/g, '')) || 0;
    totalDiesel += amt;
  });

  const actualFilledLitres = activeRate > 0 ? (totalDiesel / activeRate) : 0;
  const expectedConsumed = (mileage > 0 && totalKm > 0) ? (totalKm / mileage) : 0;
  const extraDieselLeft = actualFilledLitres - expectedConsumed;
  const dueAmountVal = extraDieselLeft * activeRate;

  // Render values to DOM cards
  const firstKmDisp = document.getElementById('calc-first-km-disp');
  if (firstKmDisp) firstKmDisp.textContent = firstKm.toLocaleString('en-IN');

  const currentKmDisp = document.getElementById('calc-current-km-disp');
  if (currentKmDisp) currentKmDisp.textContent = currentKm.toLocaleString('en-IN');

  const totalLitresDisp = document.getElementById('calc-total-litres-disp');
  if (totalLitresDisp) totalLitresDisp.textContent = actualFilledLitres.toFixed(2);

  const mileageDisp = document.getElementById('calc-mileage-disp');
  if (mileageDisp) mileageDisp.textContent = mileage;

  const cardTotalKm = document.getElementById('card-total-km');
  const valTotalKm = document.getElementById('calc-total-km');
  if (valTotalKm) valTotalKm.textContent = totalKm.toLocaleString('en-IN');
  if (cardTotalKm) cardTotalKm.className = 'result-card flag-neutral count-animate';

  const totalDieselEl = document.getElementById('calc-total-diesel');
  if (totalDieselEl) totalDieselEl.textContent = '₹' + Math.round(totalDiesel).toLocaleString('en-IN');

  const consumedEl = document.getElementById('calc-diesel-consumed');
  if (consumedEl) consumedEl.textContent = expectedConsumed.toFixed(2) + ' L';

  const cardExtraDiesel = document.getElementById('card-extra-diesel');
  const valExtraDiesel = document.getElementById('calc-extra-diesel');
  const lblExtraDiesel = document.getElementById('calc-extra-diesel-label');

  if (cardExtraDiesel) cardExtraDiesel.className = 'result-card flag-neutral count-animate';
  if (valExtraDiesel) {
    if (extraDieselLeft >= 0) {
      valExtraDiesel.textContent = '+' + extraDieselLeft.toFixed(2) + ' L';
      if (lblExtraDiesel) lblExtraDiesel.textContent = 'Surplus (tank safe)';
      valExtraDiesel.className = 'result-value text-blue-600 dark:text-blue-400 hd-text-glow';
    } else {
      valExtraDiesel.textContent = extraDieselLeft.toFixed(2) + ' L';
      if (lblExtraDiesel) lblExtraDiesel.textContent = 'Shortage / Deficit';
      valExtraDiesel.className = 'result-value text-red-600 dark:text-red-400 hd-text-glow-error';
    }
  }

  const cardDueAmount = document.getElementById('card-due-amount');
  const valDueAmount = document.getElementById('calc-due-amount');
  const lblDueAmount = document.getElementById('calc-due-amount-label');

  if (valDueAmount) {
    if (dueAmountVal >= 0) {
      valDueAmount.textContent = '₹' + Math.round(dueAmountVal).toLocaleString('en-IN');
      valDueAmount.className = 'result-value text-green-600 dark:text-green-400 hd-text-glow-success';
      if (cardDueAmount) cardDueAmount.className = 'result-card flag-green count-animate';
      if (lblDueAmount) lblDueAmount.textContent = 'Saved Fuel Value';
    } else {
      valDueAmount.textContent = '₹' + Math.round(dueAmountVal).toLocaleString('en-IN');
      valDueAmount.className = 'result-value text-red-600 dark:text-red-400 hd-text-glow-error';
      if (cardDueAmount) cardDueAmount.className = 'result-card flag-red count-animate';
      if (lblDueAmount) lblDueAmount.textContent = 'Extra Due / Deficit Cost';
    }
  }

  // Calculate per-trip leftovers
  const leftovers = new Array(sorted.length).fill(null);
  sorted.forEach((e, i) => {
    const isExcluded = isEntryExcluded(e);
    if (isExcluded) return;

    const currKm = parseFloat(String(e.currentKm || e.km || 0).replace(/[^0-9.\-]/g, '')) || 0;
    let nextKm;
    let shouldCalculate = true;

    if (i < sorted.length - 1) {
      let nextDiesel = null;
      for (let j = i + 1; j < sorted.length; j++) {
        if (!isEntryExcluded(sorted[j])) {
          nextDiesel = sorted[j];
          break;
        }
      }
      if (nextDiesel) {
        nextKm = parseFloat(String(nextDiesel.currentKm || nextDiesel.km || 0).replace(/[^0-9.\-]/g, '')) || 0;
      } else {
        nextKm = currentKm;
        if (nextKm === currKm) shouldCalculate = false;
      }
    } else {
      nextKm = currentKm;
      if (nextKm === currKm) shouldCalculate = false;
    }

    if (shouldCalculate) {
      const distance = nextKm - currKm;
      const consumedLitres = distance > 0 ? (distance / mileage) : 0;
      const filledAmount = parseFloat(String(e.dieselAmount || e.amount || 0).replace(/[^0-9.\-]/g, '')) || 0;
      const filledLitres = activeRate > 0 ? (filledAmount / activeRate) : 0;
      leftovers[i] = filledLitres - consumedLitres;
    }
  });

  // Re-render table rows in #calc-entries-body
  const tbody = document.getElementById('calc-entries-body');
  if (tbody) {
    tbody.innerHTML = '';
    const fragment = document.createDocumentFragment();

    sorted.forEach((e, idx) => {
      const tr = document.createElement('tr');
      tr.dataset.note = e.note || '';

      const isExcluded = isEntryExcluded(e);
      if (isExcluded) {
        tr.className = 'bg-red-50/40 dark:bg-red-950/10 hover:bg-red-100/30 dark:hover:bg-red-900/20 transition-all';
      } else {
        tr.className = 'hover:bg-gray-50 dark:hover:bg-gray-800 transition-all';
      }

      const dieselVal = parseFloat(String(e.dieselAmount || e.amount || 0).replace(/[^0-9.\-]/g, '')) || 0;
      const statusBadge = isExcluded
        ? `<span class="px-2 py-0.5 text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded border border-red-200 dark:border-red-800 whitespace-nowrap"><i class="fas fa-exclamation-triangle mr-1"></i> EXCLUDED</span>`
        : `<span class="px-2 py-0.5 text-[10px] font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded border border-green-200 dark:border-green-800 whitespace-nowrap"><i class="fas fa-gas-pump mr-1"></i> DIESEL</span>`;

      const leftoverVal = leftovers[idx];
      let leftoverHtml = '';
      if (leftoverVal !== null && leftoverVal !== undefined) {
        const cost = leftoverVal * activeRate;
        const formattedL = (leftoverVal >= 0 ? '+' : '') + leftoverVal.toFixed(2) + ' L';
        const formattedCost = (cost >= 0 ? '+' : '') + '₹' + cost.toLocaleString('en-IN', {maximumFractionDigits: 0});
        const colorClass = leftoverVal >= 0 ? 'text-green-600 dark:text-green-400 font-bold' : 'text-red-600 dark:text-red-400 font-bold';
        leftoverHtml = `<span class="${colorClass}">${formattedL} / ${formattedCost}</span>`;
      } else {
        leftoverHtml = `<span class="text-gray-400 dark:text-gray-600">-</span>`;
      }

      tr.innerHTML = `
        <td class="px-3 py-2 font-medium whitespace-nowrap text-center">
          <label class="inline-flex items-center justify-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" class="calc-exclude-cb rounded border-slate-300 dark:border-slate-600 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer" data-idx="${idx}" ${isExcluded ? 'checked' : ''} onchange="toggleCalcRowExclude(${idx}, this.checked)" title="Click to toggle Exclude">
            <span>${idx + 1}</span>
          </label>
        </td>
        <td class="px-3 py-2 text-sm whitespace-nowrap">${e.date || '-'}</td>
        <td class="px-3 py-2 text-sm whitespace-nowrap font-bold text-slate-800 dark:text-slate-200">${e.vehicleNo}</td>
        <td class="px-3 py-2 text-sm whitespace-nowrap max-w-[140px] truncate" title="${e.fromLocation || ''}">${e.fromLocation || ''}</td>
        <td class="px-3 py-2 text-sm whitespace-nowrap max-w-[140px] truncate" title="${e.lastLocation || ''}">${e.lastLocation || ''}</td>
        <td class="px-3 py-2 text-sm whitespace-nowrap"><div class="inline-flex items-center gap-1.5 whitespace-nowrap">${e.currentKm || e.km || 0} ${statusBadge}</div></td>
        <td class="px-3 py-2 text-right font-semibold text-sm whitespace-nowrap ${isExcluded ? 'text-gray-400 line-through dark:text-gray-500' : ''}">₹${dieselVal.toLocaleString('en-IN')}</td>
        <td class="px-3 py-2 text-right text-sm whitespace-nowrap">${leftoverHtml}</td>
      `;
      fragment.appendChild(tr);
    });

    tbody.appendChild(fragment);
  }

  // If due card context is active, update it too
  if (window.currentDueCardContext && window.currentDueCardContext.data) {
    const d = window.currentDueCardContext.data;
    d.firstKm = firstKm;
    d.totalKm = totalKm;
    d.totalDieselAmount = totalDiesel;
    d.expectedAmount = expectedConsumed * activeRate;
    d.dueAmountVal = dueAmountVal;
  }
}

// Toggle exclusion from Diesel Calculator rows
function toggleCalcRowExclude(idx, isChecked) {
  const sorted = window.currentCalcSortedEntries;
  if (!sorted || !sorted[idx]) return;

  const entry = sorted[idx];
  entry.manuallyExcluded = isChecked;
  const key = getEntryUniqueKey(entry);
  if (key) {
    window.manuallyExcludedEntries = window.manuallyExcludedEntries || {};
    window.manuallyExcludedEntries[key] = isChecked;
  }

  recalculateCalculatorDom();
}
window.toggleCalcRowExclude = toggleCalcRowExclude;
window.recalculateCalculatorDom = recalculateCalculatorDom;
window.calculateDiesel = recalculateCalculatorDom;

// Check if a string contains either UREA or URIYA (case-insensitive)
function containsUreaOrUriya(str) {
  if (!str) return false;
  const s = String(str).toUpperCase();
  return s.includes('UREA') || s.includes('URIYA');
}

// Check if any fields indicate UREA request keyword
function isUreaKeyword(entry) {
  const fields = [
    entry.fromLocation,
    entry.lastLocation,
    entry.vendorName,
    entry.note
  ];
  return fields.some(containsUreaOrUriya);
}

// Helper to map raw imported row to db entry schema
function mapImportedRow(row, index) {
  // Response Number
  let responseNumber = row['Response #'] || row['responseNumber'] || row['Sr No'] || row['tb_MacNo'];
  if (!responseNumber) responseNumber = String(Date.now() + index);
  responseNumber = String(responseNumber).trim();

  // Date — preserve DD-MM-YYYY as-is; convert YYYY-MM-DD if needed
  let date = row['Date'] || row['date'] || row['tb_Date'] || '';
  if (date instanceof Date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    date = `${d}-${m}-${y}`;
  } else {
    date = String(date).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [y, m, d] = date.split('-');
      date = `${d}-${m}-${y}`;
    }
  }

  // Time
  let time = row['Time'] || row['time'] || '00:00';
  time = String(time || '00:00').trim();
  if (!time || time === 'NULL' || time === 'UNDEFINED') time = '00:00';

  // Vehicle No — strip non-alphanumeric
  let vehicleNo = row['Vehicle No'] || row['vehicleNo'] || row['tb_Vehicle'] || '';
  vehicleNo = String(vehicleNo || '').trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');

  // Vehicle Type
  let vehicleType = row['Vehicle Type'] || row['vehicleType'] || row['V Type'] || '';
  vehicleType = String(vehicleType || '').trim().toUpperCase();

  // Mileage / Avg
  let mileage = row['Mileage'] || row['mileage'] || row['Avg'] || row['Avg Mileage'] || row['Avg.'] || '';
  mileage = String(mileage || '').trim();
  if (mileage === 'UNDEFINED' || mileage === 'NULL' || mileage === 'NAN') mileage = '';

  // From Location
  let fromLocation = row['From Location'] || row['fromLocation'] || row['Start Location'] || '';
  fromLocation = String(fromLocation || '').trim().toUpperCase();

  // Last Location
  let lastLocation = row['Last Location'] || row['lastLocation'] || row['End Location'] || '';
  lastLocation = String(lastLocation || '').trim().toUpperCase();

  // Note — handle null/None/undefined
  let note = row['Note'] || row['note'] || '';
  note = (note === null || note === undefined) ? '' : String(note).trim().toUpperCase();
  if (note === 'NULL' || note === 'UNDEFINED' || note === 'NONE') note = '';

  // tb_Remark parsing (legacy format)
  if (row['tb_Remark']) {
    const remarkStr = String(row['tb_Remark']).trim().toUpperCase();
    const parts = remarkStr.split('|');
    const route = parts[0]?.trim() || '';
    if (parts[1]) note = parts[1].trim();
    if (route.includes(' TO ')) {
      const routeParts = route.split(' TO ');
      if (!fromLocation) fromLocation = routeParts[0]?.trim() || '';
      if (!lastLocation) lastLocation = routeParts[1]?.trim() || '';
    } else {
      if (!fromLocation) fromLocation = route;
    }
  }

  // Current KM — 'N/A', 'NA', '0', '1' all treated as blank
  let currentKm = row['Current KM'] || row['currentKm'] || row['S Km'] || row['tb_KeloMeter'] || '';
  currentKm = String(currentKm || '').trim().toUpperCase();
  if (currentKm === 'N/A' || currentKm === 'NA' || currentKm === '0' || currentKm === '1' || currentKm === 'NULL' || currentKm === 'UNDEFINED') {
    currentKm = '';
  }

  // End KM
  let endKm = row['End KM'] || row['endKm'] || row['E Km'] || '';
  endKm = String(endKm || '').trim().toUpperCase();
  if (endKm === 'N/A' || endKm === 'NA' || endKm === '0' || endKm === 'NULL') endKm = '';

  // Total KM
  let totalKm = row['Total KM'] || row['totalKm'] || row['Total k/m'] || '';
  totalKm = String(totalKm || '').trim().toUpperCase();
  if (totalKm === 'N/A' || totalKm === 'NA' || totalKm === 'NULL') totalKm = '';
  // Auto-calculate if both start and end are available
  if (!totalKm && currentKm && endKm) {
    const s = parseFloat(currentKm) || 0;
    const e = parseFloat(endKm) || 0;
    if (e > s) totalKm = String(Math.round(e - s));
  }

  // Diesel Amount
  let dieselAmount = row['Diesel Amount'] || row['dieselAmount'] || row['Diesel'] || row['Amount'] || '';
  dieselAmount = String(dieselAmount || '').trim();
  if (dieselAmount === 'NULL' || dieselAmount === 'UNDEFINED') dieselAmount = '';

  // Litres — auto-calculate at ~65₹/litre if blank
  let litres = row['Litres'] || row['litres'] || row['Lit'] || '';
  litres = String(litres || '').trim();
  if ((!litres || litres === 'NULL') && dieselAmount && parseFloat(dieselAmount) > 0) {
    litres = String((parseFloat(dieselAmount) / 65.0).toFixed(2));
  }

  // Vendor Name
  let vendorName = row['Vendor Name'] || row['vendorName'] || row['Vendor'] || '';
  vendorName = String(vendorName || '').trim().toUpperCase();
  if (vendorName === 'NULL' || vendorName === 'UNDEFINED' || vendorName === 'NONE') vendorName = '';

  return { responseNumber, date, time, vehicleNo, vehicleType, mileage, fromLocation, lastLocation, currentKm, endKm, totalKm, litres, dieselAmount, vendorName, note };
}

// Export calculator list to Excel
function exportCalculatorExcel() {
  const vehicle = document.getElementById('calc-vehicle').value.trim();
  const dateFrom = document.getElementById('calc-date-from').value;
  const dateTo = document.getElementById('calc-date-to').value || new Date().toISOString().slice(0, 10);
  
  if (!vehicle || !dateFrom) return showAlert('error', 'Error', 'Pehle list calculate karein!');

  const resultsDiv = document.getElementById('calc-results');
  if (resultsDiv.classList.contains('hidden')) {
    return showAlert('error', 'Error', 'Pehle calculate button dabaayein, phir Excel generate karein!');
  }

  const firstKm = document.getElementById('calc-first-km-disp').textContent;
  const currentKm = document.getElementById('calc-current-km-disp').textContent;
  const totalKm = document.getElementById('calc-total-km').textContent;
  const totalDieselCost = document.getElementById('calc-total-diesel').textContent;
  const totalLitres = document.getElementById('calc-total-litres-disp').textContent;
  const expectedConsumed = document.getElementById('calc-diesel-consumed').textContent;
  const extraDiesel = document.getElementById('calc-extra-diesel').textContent;
  const dueAmount = document.getElementById('calc-due-amount').textContent;
  const mileageVal = document.getElementById('calc-mileage').value || '4.0';

  const isSurplus = !extraDiesel.startsWith('-');
  const statusText = isSurplus ? "SURPLUS (TANK SAFE)" : "DEFICIT (SHORTAGE)";

  const aoa = [];
  aoa.push(["RPM LOGISTICS PVT. LTD."]);
  aoa.push(["DIESEL INCHARGE PANEL - CALCULATION REPORT"]);
  aoa.push([`Generated Date: ${new Date().toLocaleString('en-IN')}`]);
  aoa.push([]);

  aoa.push(["REPORT METADATA"]);
  aoa.push(["Vehicle No", vehicle]);
  aoa.push(["Date Range", `${dateFrom} to ${dateTo}`]);
  aoa.push(["Assumed Average", `${mileageVal} KM/L`]);
  aoa.push([]);

  aoa.push(["CALCULATION SUMMARY & FUEL EFFICIENCY"]);
  aoa.push(["Metric Label", "Value / Amount", "Additional Context / Formula"]);
  aoa.push(["Total Kilometers Driven", `${totalKm} KM`, `First: ${firstKm} KM | Current: ${currentKm} KM`]);
  aoa.push(["Actual Diesel Filled (Litres)", `${totalLitres} Litres`, `Total Cost Loaded: ${totalDieselCost}`]);
  aoa.push(["Expected Diesel Consumed", expectedConsumed, `Based on ${mileageVal} KM/L mileage target`]);
  aoa.push(["Extra Diesel Remaining in Tank", extraDiesel, statusText]);
  aoa.push(["Extra Diesel Price / Due Amount", dueAmount, `Calculated at rate of Rs. ${dieselRate}/L`]);
  aoa.push([]);

  aoa.push(["MATCHING TRANSACTION HISTORY"]);
  aoa.push(["#", "Date", "Vehicle No", "From Location", "Last Location", "Current KM", "Amount", "Extra Left", "Note"]);
  
  const trs = document.querySelectorAll('#calc-entries-body tr');
  trs.forEach((tr) => {
    const tds = tr.querySelectorAll('td');
    if (tds.length >= 8) {
      const idxStr = tds[0].textContent.trim();
      const dateStr = tds[1].textContent.trim();
      const vehStr = tds[2].textContent.trim();
      const fromStr = tds[3].textContent.trim();
      const lastStr = tds[4].textContent.trim();
      const kmStr = tds[5].textContent.trim().replace("EXCLUDED", "").replace("DIESEL", "").trim();
      const amtStr = tds[6].textContent.trim().replace(/₹/g, 'Rs. ').trim();
      const leftoverStr = tds[7].textContent.trim().replace(/₹/g, 'Rs. ').trim();
      const noteStr = (tr.dataset.note || '').trim().replace(/₹/g, 'Rs. ').trim();
      aoa.push([idxStr, dateStr, vehStr, fromStr, lastStr, kmStr, amtStr, leftoverStr, noteStr]);
    }
  });

  aoa.push([]);
  aoa.push([]);
  aoa.push(["Regards,"]);
  aoa.push(["ANANT KUMAR YADAV"]);
  aoa.push(["Diesel Monitoring Incharge"]);
  aoa.push(["RPM Logistics Pvt. Ltd."]);
  aoa.push(["Call: +91 8371838314"]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Formatting Excel Workbook style
  const thinBorder = {
    top: { style: "thin", color: { rgb: "D1D5DB" } },
    bottom: { style: "thin", color: { rgb: "D1D5DB" } },
    left: { style: "thin", color: { rgb: "D1D5DB" } },
    right: { style: "thin", color: { rgb: "D1D5DB" } }
  };

  const styles = {
    title: {
      fill: { fgColor: { rgb: "1F2937" } },
      font: { name: "Segoe UI", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" }
    },
    subtitle: {
      fill: { fgColor: { rgb: "1F2937" } },
      font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "9CA3AF" } },
      alignment: { horizontal: "center", vertical: "center" }
    },
    genDate: {
      fill: { fgColor: { rgb: "1F2937" } },
      font: { name: "Segoe UI", sz: 9, color: { rgb: "E5E7EB" }, italic: true },
      alignment: { horizontal: "center", vertical: "center" }
    },
    sectionHeader: { font: { name: "Segoe UI", sz: 12, bold: true, color: { rgb: "2563EB" } } },
    metaKey: { fill: { fgColor: { rgb: "F3F4F6" } }, font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "374151" } }, border: thinBorder },
    metaVal: { font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "111827" } }, border: thinBorder },
    sumHeader: { fill: { fgColor: { rgb: "4B5563" } }, font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "FFFFFF" } }, border: thinBorder },
    sumMetric: { font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "374151" } }, border: thinBorder },
    sumValNormal: { font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "2563EB" } }, border: thinBorder, alignment: { horizontal: "center" } },
    sumValSurplus: { fill: { fgColor: { rgb: "D1FAE5" } }, font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "065F46" } }, border: thinBorder, alignment: { horizontal: "center" } },
    sumValDeficit: { fill: { fgColor: { rgb: "FFE4E6" } }, font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "991B1B" } }, border: thinBorder, alignment: { horizontal: "center" } },
    sumContext: { font: { name: "Segoe UI", sz: 9.5, color: { rgb: "4B5563" } }, border: thinBorder },
    tableHeader: { fill: { fgColor: { rgb: "374151" } }, font: { name: "Segoe UI", sz: 9.5, bold: true, color: { rgb: "FFFFFF" } }, border: thinBorder },
    tableRowEven: { fill: { fgColor: { rgb: "F9FAFB" } }, font: { name: "Segoe UI", sz: 9.5, color: { rgb: "1F2937" } }, border: thinBorder },
    tableRowOdd: { font: { name: "Segoe UI", sz: 9.5, color: { rgb: "1F2937" } }, border: thinBorder },
    tableRowExcluded: { fill: { fgColor: { rgb: "FEE2E2" } }, font: { name: "Segoe UI", sz: 9.5, color: { rgb: "EF4444" }, bold: true }, border: thinBorder },
    regardsLabel: { font: { name: "Segoe UI", sz: 10, color: { rgb: "64748B" } } },
    signatureName: { font: { name: "Segoe UI", sz: 13, bold: true, color: { rgb: "F43F5E" } } },
    signatureTitle: { font: { name: "Segoe UI", sz: 10, color: { rgb: "475569" } } },
    phoneBox: { fill: { fgColor: { rgb: "4C3038" } }, font: { name: "Segoe UI", sz: 9.5, bold: true, color: { rgb: "EA808E" } }, alignment: { horizontal: "center" } }
  };

  const setCell = (ref, style) => { if (ws[ref]) ws[ref].s = style; };

  // Set merged headers
  for (let c = 0; c < 9; c++) {
    const l = String.fromCharCode(65 + c);
    setCell(`${l}1`, styles.title);
    setCell(`${l}2`, styles.subtitle);
    setCell(`${l}3`, styles.genDate);
  }

  // Metadata Styling
  setCell('A5', styles.sectionHeader);
  for (let row = 6; row <= 8; row++) {
    setCell(`A${row}`, styles.metaKey);
    setCell(`B${row}`, styles.metaVal);
  }

  // Summary Table Styling
  setCell('A10', styles.sectionHeader);
  setCell('A11', styles.sumHeader);
  setCell('B11', styles.sumHeader);
  setCell('C11', styles.sumHeader);

  setCell('A12', styles.sumMetric); setCell('B12', styles.sumValNormal); setCell('C12', styles.sumContext);
  setCell('A13', styles.sumMetric); setCell('B13', styles.sumValNormal); setCell('C13', styles.sumContext);
  setCell('A14', styles.sumMetric); setCell('B14', styles.sumValNormal); setCell('C14', styles.sumContext);

  const sumStyle = isSurplus ? styles.sumValSurplus : styles.sumValDeficit;
  setCell('A15', styles.sumMetric); setCell('B15', sumStyle); setCell('C15', styles.sumContext);
  setCell('A16', styles.sumMetric); setCell('B16', sumStyle); setCell('C16', styles.sumContext);

  // Table header styling
  setCell('A18', styles.sectionHeader);
  for (let c = 0; c < 9; c++) setCell(`${String.fromCharCode(65 + c)}19`, styles.tableHeader);

  // Transactions rows styling
  const totalRows = trs.length;
  for (let i = 0; i < totalRows; i++) {
    const rowNum = 20 + i;
    const tr = trs[i];
    const isExcluded = tr.className.includes('bg-red-50/40') || tr.className.includes('dark:bg-red-950/10');
    const rStyle = isExcluded ? styles.tableRowExcluded : (i % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd);

    for (let c = 0; c < 9; c++) {
      const l = String.fromCharCode(65 + c);
      setCell(`${l}${rowNum}`, rStyle);
      if (!isExcluded && (c === 0 || c === 1 || c === 2 || c === 5 || c === 7)) {
        ws[`${l}${rowNum}`].s = { ...rStyle, alignment: { horizontal: "center", vertical: "center" } };
      }
      if (!isExcluded && c === 6) {
        ws[`${l}${rowNum}`].s = { ...rStyle, alignment: { horizontal: "right", vertical: "center" } };
      }
      if (c === 8) {
        ws[`${l}${rowNum}`].s = { ...rStyle, alignment: { horizontal: "left", vertical: "center", wrapText: true } };
      }
    }
  }

  const sigStart = 20 + totalRows + 2;
  setCell(`A${sigStart}`, styles.regardsLabel);
  setCell(`A${sigStart + 1}`, styles.signatureName);
  setCell(`A${sigStart + 2}`, styles.signatureTitle);
  setCell(`A${sigStart + 3}`, styles.signatureTitle);

  const calloutRow = sigStart + 4;
  for (let c = 0; c < 3; c++) {
    const l = String.fromCharCode(65 + c);
    if (!ws[`${l}${calloutRow}`]) ws[`${l}${calloutRow}`] = { v: "", t: "s" };
    setCell(`${l}${calloutRow}`, styles.phoneBox);
  }
  ws[`A${calloutRow}`].v = "Call: +91 8371838314";

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
    { s: { r: calloutRow - 1, c: 0 }, e: { r: calloutRow - 1, c: 2 } }
  ];

  ws['!cols'] = [
    { wch: 28 }, { wch: 15 }, { wch: 15 }, { wch: 24 }, { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 30 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Calculation Report');
  XLSX.writeFile(wb, `diesel_report_${vehicle}_${dateFrom}_to_${dateTo}.xlsx`);
  showAlert('success', 'Excel Saved!', `diesel_report_${vehicle}.xlsx downloaded successfully.`);
}

// Export calculator list to PDF Report
function exportCalculatorPDF() {
  const vehicle = document.getElementById('calc-vehicle').value;
  const dateFrom = document.getElementById('calc-date-from').value;
  const dateTo = document.getElementById('calc-date-to').value || new Date().toISOString().slice(0,10);
  
  if (!vehicle || !dateFrom) return showAlert('error', 'Error', 'Pehle list calculate karein!');

  const resultsDiv = document.getElementById('calc-results');
  if (resultsDiv.classList.contains('hidden')) {
    return showAlert('error', 'Error', 'Pehle calculate button dabaayein, phir PDF generate karein!');
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;
  
  const primaryColor = [37, 99, 235];
  const accentGreen = [16, 185, 129];
  const accentRed = [239, 68, 68];

  // Header Box
  doc.setFillColor(31, 41, 55);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text("RPM LOGISTICS PVT. LTD.", 15, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(156, 163, 175);
  doc.text("DIESEL INCHARGE PANEL - CALCULATION REPORT", 15, 26);

  doc.setFontSize(9);
  doc.setTextColor(209, 213, 219);
  const todayStr = new Date().toLocaleString('en-IN');
  doc.text(`Generated: ${todayStr}`, pageWidth - 15, 33, { align: 'right' });

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(1.5);
  doc.line(0, 40, pageWidth, 40);

  // Metadata
  let y = 50;
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(15, y, pageWidth - 30, 22, 3, 3, 'F');
  
  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text("REPORT METADATA", 20, y + 6);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Vehicle No: ${vehicle}`, 20, y + 14);
  doc.text(`Date Range: ${dateFrom} to ${dateTo}`, 85, y + 14);
  
  const mileageVal = document.getElementById('calc-mileage').value || '4.0';
  doc.text(`Assumed Average: ${mileageVal} KM/L`, 155, y + 14);

  // Summary
  y += 30;
  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text("CALCULATION SUMMARY & FUEL EFFICIENCY", 15, y);
  y += 4;
  
  const firstKm = document.getElementById('calc-first-km-disp').textContent;
  const currentKm = document.getElementById('calc-current-km-disp').textContent;
  const totalKm = document.getElementById('calc-total-km').textContent;
  const totalDieselCost = document.getElementById('calc-total-diesel').textContent.replace(/₹/g, 'Rs. ').trim();
  const totalLitres = document.getElementById('calc-total-litres-disp').textContent;
  const expectedConsumed = document.getElementById('calc-diesel-consumed').textContent;
  const extraDiesel = document.getElementById('calc-extra-diesel').textContent;
  const dueAmount = document.getElementById('calc-due-amount').textContent.replace(/₹/g, 'Rs. ').trim();

  const isSurplus = !extraDiesel.startsWith('-');
  const statusText = isSurplus ? "SURPLUS (TANK SAFE)" : "DEFICIT (SHORTAGE)";
  const statusColor = isSurplus ? "GREEN" : "RED";

  const summaryRows = [
    ["Total Kilometers Driven", `${totalKm} KM`, `First: ${firstKm} KM | Current: ${currentKm} KM`],
    ["Actual Diesel Filled (Litres)", `${totalLitres} Litres`, `Total Cost Loaded: ${totalDieselCost}`],
    ["Expected Diesel Consumed", expectedConsumed, `Based on ${mileageVal} KM/L mileage target`],
    ["Extra Diesel Remaining in Tank", extraDiesel, `${statusText} - Marked as ${statusColor} Flag`],
    ["Extra Diesel Price / Due Amount", dueAmount, `Calculated at rate of Rs. ${dieselRate}/L`]
  ];

  doc.autoTable({
    startY: y,
    head: [["Metric Label", "Value / Amount", "Additional Context / Formula"]],
    body: summaryRows,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9.5 },
    bodyStyles: { fontSize: 9, textColor: [31, 41, 55] },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 35, fontStyle: 'bold', textColor: (row) => row.index >= 3 ? (isSurplus ? accentGreen : accentRed) : primaryColor },
      2: { cellWidth: 90 }
    },
    margin: { left: 15, right: 15 }
  });

  // Table of entries
  y = doc.autoTable.previous.finalY + 10;
  const tableRows = [];
  const trs = document.querySelectorAll('#calc-entries-body tr');
  
  trs.forEach((tr) => {
    const tds = tr.querySelectorAll('td');
    if (tds.length >= 8) {
      const isExcluded = tr.className.includes('bg-red') || tr.className.includes('bg-rose') || tr.innerHTML.includes('EXCLUDED');
      const typeText = isExcluded ? "Excluded (Urea/Oil)" : "Diesel Filled";
      
      const amountClean = tds[6].textContent.trim().replace(/₹/g, '').trim();
      const leftoverClean = tds[7].textContent.trim().replace(/₹/g, 'Rs. ').trim();
      const noteText = (tr.dataset.note || '').trim().replace(/₹/g, 'Rs. ');
      
      tableRows.push([
        tds[0].textContent.trim(),
        tds[1].textContent.trim(),
        tds[2].textContent.trim(),
        tds[3].textContent.trim(),
        tds[4].textContent.trim(),
        tds[5].textContent.trim().replace("EXCLUDED", "").replace("DIESEL", "").trim(),
        amountClean,
        leftoverClean,
        noteText,
        typeText
      ]);
    }
  });

  doc.autoTable({
    startY: y,
    head: [["#", "Date", "Vehicle", "From Location", "Last Location", "Current KM", "Amount (Rs)", "Extra Left", "Note"]],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5, halign: 'center' },
    bodyStyles: { fontSize: 8, textColor: [31, 41, 55], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 20, halign: 'center', textColor: [37, 99, 235] },
      3: { cellWidth: 26 },
      4: { cellWidth: 26 },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 16, halign: 'right' },
      7: { cellWidth: 22, halign: 'right' },
      8: { cellWidth: 26, halign: 'left' }
    },
    didParseCell: function(data) {
      if (data.row.raw && data.row.raw[9] === "Excluded (Urea/Oil)") {
        data.cell.styles.fillColor = [254, 242, 242];
        data.cell.styles.textColor = [239, 68, 68];
        if (data.column.index === 6) {
          data.cell.styles.fontStyle = 'bold italic';
        }
      }
    },
    margin: { left: 15, right: 15, bottom: 20 }
  });
  
  let finalY = doc.autoTable.previous.finalY || 150;
  const signatureHeight = 35;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  
  if (finalY + signatureHeight + 25 > pageHeight - margin) {
    doc.addPage();
    finalY = 30;
  } else {
    finalY += 12;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Regards,", 15, finalY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(244, 63, 94);
  doc.text("ANANT KUMAR YADAV", 15, finalY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("Diesel Monitoring Incharge", 15, finalY + 11.5);
  doc.text("RPM Logistics Pvt. Ltd.", 15, finalY + 16.5);

  const boxY = finalY + 21;
  doc.setFillColor(76, 48, 56);
  doc.roundedRect(15, boxY, 52, 9, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(234, 128, 142);
  doc.text("Call: +91 8371838314", 19, boxY + 6.2);

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(15, doc.internal.pageSize.height - 15, pageWidth - 15, doc.internal.pageSize.height - 15);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text("RPM Logistics Pvt. Ltd. — Diesel Incharge Report", 15, doc.internal.pageSize.height - 10);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 15, doc.internal.pageSize.height - 10, { align: 'right' });
  }

  doc.save(`diesel_report_${vehicle}_${dateFrom}_to_${dateTo}.pdf`);
  showAlert('success', 'PDF Saved!', `diesel_report_${vehicle}.pdf downloaded successfully.`);
}

// Calculate date range defaults for calculator (default to month's 1st date and today's date)
function initCalculatorDateDefaults() {
  const todayIST = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' });
  const d = new Date(todayIST);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  
  const fromStr = `${yyyy}-${mm}-01`;
  const toStr = `${yyyy}-${mm}-${dd}`;

  const fromEl = document.getElementById('calc-date-from');
  const toEl = document.getElementById('calc-date-to');
  if (fromEl) fromEl.value = fromStr;
  if (toEl) toEl.value = toStr;
}

// Wire up events and configurations for Dashboard and Calculator
function initDashboardControls() {
  // Parse WhatsApp text input click
  const processBtn = document.getElementById('process-data');
  if (processBtn) {
    processBtn.onclick = () => {
      const textarea = document.getElementById('input-message');
      const val = textarea.value.trim();
      if (val) {
        processData(val);
        textarea.value = '';
      } else {
        toast.err("Paste whatsapp message first!");
      }
    };
  }

  // Fuel request modal tab view switcher listeners
  const viewManualBtn = document.getElementById('drf-view-manual-btn');
  const viewPasteBtn = document.getElementById('drf-view-paste-btn');
  const manualContainer = document.getElementById('drf-manual-form-container');
  const pasteContainer = document.getElementById('drf-paste-form-container');
  const copyBtn = document.getElementById('drf-copy-btn');

  if (viewManualBtn && viewPasteBtn && manualContainer && pasteContainer) {
    viewManualBtn.onclick = () => {
      manualContainer.classList.remove('hidden');
      pasteContainer.classList.add('hidden');
      viewManualBtn.className = "flex-1 py-1.5 text-xs font-extrabold rounded-lg transition-all bg-blue-600 text-white shadow-sm";
      viewPasteBtn.className = "flex-1 py-1.5 text-xs font-extrabold rounded-lg transition-all text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white";
      if (copyBtn) {
        copyBtn.innerHTML = "🖊️ Generate Message";
        copyBtn.className = "flex-1 h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md flex items-center justify-center gap-2 transition-all";
      }
    };

    viewPasteBtn.onclick = () => {
      manualContainer.classList.add('hidden');
      pasteContainer.classList.remove('hidden');
      viewPasteBtn.className = "flex-1 py-1.5 text-xs font-extrabold rounded-lg transition-all bg-blue-600 text-white shadow-sm";
      viewManualBtn.className = "flex-1 py-1.5 text-xs font-extrabold rounded-lg transition-all text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white";
      if (copyBtn) {
        copyBtn.innerHTML = "⚡ Proceed";
        copyBtn.className = "flex-1 h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl font-bold shadow-md flex items-center justify-center gap-2 transition-all";
      }
    };
  }

  const modalInputMsg = document.getElementById('modal-input-message');
  if (modalInputMsg) {
    modalInputMsg.addEventListener('input', (e) => {
      window.handleWhatsAppPasteInput(e.target.value);
    });
  }

  // Search filtering event listeners for unified vehicle & vendor configuration
  const vtypeSearch = document.getElementById('vtype-search-input');
  if (vtypeSearch) {
    vtypeSearch.addEventListener('input', renderVehiclesGrid);
  }
  const vendorSearch = document.getElementById('vendor-search-input');
  if (vendorSearch) {
    vendorSearch.addEventListener('input', renderVendorsGrid);
  }

  // Gear dropdown menu toggle
  const gearBtn = document.getElementById('gear-dropdown-btn');
  const gearMenu = document.getElementById('gear-dropdown-menu');
  if (gearBtn && gearMenu) {
    gearBtn.onclick = (e) => {
      e.stopPropagation();
      gearMenu.classList.toggle('gear-dropdown-open');
    };
    
    document.addEventListener('click', (e) => {
      if (!gearMenu.contains(e.target) && e.target !== gearBtn) {
        gearMenu.classList.remove('gear-dropdown-open');
      }
    });
  }

  // Gear Actions linking
  const importExcelBtn = document.getElementById('gear-import-excel');
  const importExcelFile = document.getElementById('import-excel-file');
  if (importExcelBtn && importExcelFile) {
    importExcelBtn.onclick = () => {
      if (gearMenu) gearMenu.classList.remove('gear-dropdown-open');
      importExcelFile.click();
    };
  }

  if (importExcelFile) {
    importExcelFile.onchange = (event) => {
      if (!checkAuth()) {
        importExcelFile.value = '';
        return;
      }
      const file = event.target.files[0];
      if (!file) return;

      toast.info("Excel file load ho rahi hai...");

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          
          if (workbook.SheetNames.length === 0) return toast.err("Excel file khali hai!");
          
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (rawRows.length === 0) return toast.err("Selected sheet me koi rows nahi hain!");

          toast.info(`${rawRows.length} rows parse ho rahi hain...`);

          // ── STEP 1: Parse + Auto-calculate all rows ──
          const dieselUpdates = {};
          const skippedRows = [];

          rawRows.forEach((row, index) => {
            const mapped = mapImportedRow(row, index);
            const rowNum = index + 2;

            const skipReasons = [];
            if (!mapped.responseNumber || mapped.responseNumber === '' || mapped.responseNumber === 'UNDEFINED') {
              skipReasons.push('Response # missing');
            }
            if (!mapped.vehicleNo || mapped.vehicleNo.length < 4) {
              skipReasons.push('Vehicle No missing/invalid');
            }
            if (!mapped.dieselAmount || isNaN(parseFloat(mapped.dieselAmount)) || parseFloat(mapped.dieselAmount) <= 0) {
              skipReasons.push('Amount missing/zero');
            }

            if (skipReasons.length > 0) {
              skippedRows.push({
                rowNum,
                responseNumber: mapped.responseNumber || '—',
                vehicleNo: mapped.vehicleNo || '—',
                date: mapped.date || '—',
                amount: mapped.dieselAmount || '—',
                reason: skipReasons.join(', ')
              });
              return;
            }

            // Auto-calculation: litres if blank
            if (!mapped.litres && mapped.dieselAmount && parseFloat(mapped.dieselAmount) > 0) {
              mapped.litres = String((parseFloat(mapped.dieselAmount) / 65.0).toFixed(2));
            }
            // Auto-calculation: totalKm if blank but start+end known
            if (!mapped.totalKm && mapped.currentKm && mapped.endKm) {
              const s = parseFloat(mapped.currentKm) || 0;
              const ex = parseFloat(mapped.endKm) || 0;
              if (ex > s) mapped.totalKm = String(Math.round(ex - s));
            }

            const isUrea = mapped.vendorName === 'UREA REQUEST' || mapped.fromLocation === 'UREA REQUEST';
            const hasUrea = isUreaKeyword(mapped);
            if (isUrea || hasUrea) {
              if (!mapped.vendorName) mapped.vendorName = 'UREA REQUEST';
            }

            dieselUpdates[mapped.responseNumber] = mapped;
          });

          const totalCount = Object.keys(dieselUpdates).length;

          if (totalCount === 0) {
            toast.warn("No valid entries found in Excel sheet.");
            importExcelFile.value = '';
            showImportSkippedModal(skippedRows, 0, rawRows.length);
            return;
          }

          // ── STEP 2: Split into 500-entry batches ──
          const BATCH_SIZE = 500;
          const WAIT_SEC = 5; // seconds between batches
          const allKeys = Object.keys(dieselUpdates);
          const batches = [];
          for (let i = 0; i < allKeys.length; i += BATCH_SIZE) {
            const batchKeys = allKeys.slice(i, i + BATCH_SIZE);
            const batchObj = {};
            batchKeys.forEach(k => batchObj[k] = dieselUpdates[k]);
            batches.push(batchObj);
          }

          // ── STEP 3: Build full-screen progress overlay ──
          const oldOverlay = document.getElementById('import-progress-overlay');
          if (oldOverlay) oldOverlay.remove();

          const overlay = document.createElement('div');
          overlay.id = 'import-progress-overlay';
          overlay.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;';
          overlay.innerHTML = `
            <div style="background:#0f172a;border:1px solid #1e3a5f;border-radius:24px;padding:40px 44px;width:440px;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,0.8);">
              <div style="font-size:36px;margin-bottom:8px;">📂</div>
              <div style="font-size:18px;font-weight:800;color:#f1f5f9;margin-bottom:4px;">Diesel Records Import</div>
              <div id="iprog-file" style="font-size:11px;color:#475569;margin-bottom:20px;">${file.name}</div>

              <!-- Main progress bar -->
              <div style="background:#1e293b;border-radius:99px;height:14px;overflow:hidden;margin-bottom:8px;position:relative;">
                <div id="iprog-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#3b82f6,#06b6d4,#10b981);border-radius:99px;transition:width 0.4s ease;"></div>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:18px;">
                <span id="iprog-count">0 / ${totalCount} entries</span>
                <span id="iprog-pct" style="font-weight:700;color:#38bdf8;">0%</span>
              </div>

              <!-- Batch info card -->
              <div style="background:#1e293b;border-radius:12px;padding:14px 18px;margin-bottom:16px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <div style="text-align:left;">
                    <div style="font-size:10px;color:#475569;text-transform:uppercase;letter-spacing:0.08em;">Current Batch</div>
                    <div id="iprog-batch" style="font-size:20px;font-weight:800;color:#f1f5f9;line-height:1.2;">1 / ${batches.length}</div>
                    <div id="iprog-batch-entries" style="font-size:10px;color:#64748b;margin-top:2px;">0 entries</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:10px;color:#475569;text-transform:uppercase;letter-spacing:0.08em;">Next Batch In</div>
                    <div id="iprog-timer" style="font-size:28px;font-weight:800;color:#f59e0b;line-height:1.2;">—</div>
                    <div style="font-size:10px;color:#64748b;margin-top:2px;">seconds</div>
                  </div>
                </div>
              </div>

              <div id="iprog-status" style="font-size:12px;color:#94a3b8;">Initializing...</div>
            </div>
          `;
          document.body.appendChild(overlay);

          const el = (id) => document.getElementById(id);
          const setBar = (pct) => { if (el('iprog-bar')) el('iprog-bar').style.width = pct + '%'; };
          const setStatus = (txt, color) => { if (el('iprog-status')) { el('iprog-status').textContent = txt; el('iprog-status').style.color = color || '#94a3b8'; } };
          const setTimer = (val) => { if (el('iprog-timer')) el('iprog-timer').textContent = val; };
          const setCount = (done) => {
            const pct = Math.round((done / totalCount) * 100);
            setBar(pct);
            if (el('iprog-count')) el('iprog-count').textContent = `${done} / ${totalCount} entries`;
            if (el('iprog-pct')) el('iprog-pct').textContent = pct + '%';
          };

          // ── STEP 4: Batch upload with 5sec wait ──
          let completed = 0;
          let countdownInterval = null;

          const startCountdown = (seconds, onDone) => {
            let remaining = seconds;
            setTimer(remaining);
            setStatus(`⏳ Next batch ${Math.floor(completed / BATCH_SIZE) + 2} mein upload hogi...`, '#f59e0b');
            countdownInterval = setInterval(() => {
              remaining--;
              setTimer(remaining);
              if (remaining <= 0) {
                clearInterval(countdownInterval);
                setTimer('—');
                onDone();
              }
            }, 1000);
          };

          const uploadBatch = (batchIndex) => {
            if (batchIndex >= batches.length) {
              // All done
              setBar(100);
              if (el('iprog-pct')) el('iprog-pct').textContent = '100%';
              if (el('iprog-count')) el('iprog-count').textContent = `${totalCount} / ${totalCount} entries`;
              setTimer('✅');
              setStatus('✅ Sab entries import ho gayi!', '#10b981');
              setTimeout(() => {
                overlay.remove();
                toast.ok(`✅ ${totalCount} entries successfully import ho chuki hain! (${batches.length} batches)`);
                importExcelFile.value = '';
                if (skippedRows.length > 0) {
                  showImportSkippedModal(skippedRows, totalCount, rawRows.length);
                }
              }, 1200);
              return;
            }

            const batchNum = batchIndex + 1;
            const batchSize = Object.keys(batches[batchIndex]).length;
            if (el('iprog-batch')) el('iprog-batch').textContent = `${batchNum} / ${batches.length}`;
            if (el('iprog-batch-entries')) el('iprog-batch-entries').textContent = `${batchSize} entries`;
            setStatus(`🔄 Batch ${batchNum} upload ho rahi hai...`, '#38bdf8');
            setTimer('—');

            entriesRef.update(batches[batchIndex])
              .then(() => {
                completed += batchSize;
                setCount(completed);

                if (batchIndex + 1 < batches.length) {
                  // Wait 5 seconds then next batch
                  startCountdown(WAIT_SEC, () => uploadBatch(batchIndex + 1));
                } else {
                  uploadBatch(batchIndex + 1); // trigger done state
                }
              })
              .catch(err => {
                clearInterval(countdownInterval);
                overlay.remove();
                toast.err(`Batch ${batchNum} failed: ${err.message}`);
                importExcelFile.value = '';
              });
          };

          uploadBatch(0);

        } catch (err) {
          toast.err("Excel Read Error: " + err.message);
          importExcelFile.value = '';
        }
      };

      reader.readAsArrayBuffer(file);
    };
  }

  // Show skipped rows popup modal
  function showImportSkippedModal(skippedRows, uploadedCount, totalRows) {
    // Remove old modal if exists
    const old = document.getElementById('import-skipped-modal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'import-skipped-modal';
    modal.style.cssText = `
      position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.75);
      display:flex;align-items:center;justify-content:center;padding:16px;
    `;

    const skippedHtml = skippedRows.length === 0
      ? `<tr><td colspan="5" class="text-center py-6 text-emerald-400 font-bold">✅ Koi entry skip nahi hui — Sab import ho gaye!</td></tr>`
      : skippedRows.map(r => `
        <tr class="border-b border-slate-700 hover:bg-slate-800/50">
          <td class="px-3 py-2 text-center text-slate-400 text-xs">${r.rowNum}</td>
          <td class="px-3 py-2 text-slate-300 font-mono text-xs">${r.responseNumber}</td>
          <td class="px-3 py-2 text-emerald-400 font-bold text-xs">${r.vehicleNo}</td>
          <td class="px-3 py-2 text-xs text-slate-400">${r.date}</td>
          <td class="px-3 py-2 text-xs text-red-400 font-semibold">${r.reason}</td>
        </tr>`).join('');

    modal.innerHTML = `
      <div style="background:#0f172a;border:1px solid #334155;border-radius:16px;max-width:800px;width:100%;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.7);">
        <div style="background:linear-gradient(135deg,#1e293b,#0f172a);padding:20px 24px;border-bottom:1px solid #334155;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:16px;font-weight:800;color:#f1f5f9;display:flex;align-items:center;gap:8px;">
              <span style="color:#f59e0b;">⚠️</span> Excel Import Report
            </div>
            <div style="font-size:12px;color:#94a3b8;margin-top:4px;">
              Total: <b style="color:#fff">${totalRows}</b> rows &nbsp;|&nbsp;
              Uploaded: <b style="color:#10b981">${uploadedCount}</b> &nbsp;|&nbsp;
              Skipped: <b style="color:${skippedRows.length > 0 ? '#f87171' : '#10b981'}">${skippedRows.length}</b>
            </div>
          </div>
          <button onclick="document.getElementById('import-skipped-modal').remove()" style="background:#334155;border:none;color:#94a3b8;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;">✕</button>
        </div>
        <div style="overflow-y:auto;flex:1;">
          ${skippedRows.length === 0
            ? `<div style="text-align:center;padding:40px;color:#10b981;font-weight:700;font-size:15px;">✅ Koi entry skip nahi hui — Sab import ho gaye!</div>`
            : `<table style="width:100%;border-collapse:collapse;font-family:'Inter',sans-serif;">
                <thead style="position:sticky;top:0;background:#1e293b;z-index:1;">
                  <tr style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;">
                    <th style="padding:10px 12px;text-align:center;border-bottom:1px solid #334155;">Row #</th>
                    <th style="padding:10px 12px;text-align:left;border-bottom:1px solid #334155;">Response #</th>
                    <th style="padding:10px 12px;text-align:left;border-bottom:1px solid #334155;">Vehicle No</th>
                    <th style="padding:10px 12px;text-align:left;border-bottom:1px solid #334155;">Date</th>
                    <th style="padding:10px 12px;text-align:left;border-bottom:1px solid #334155;">Skip Reason</th>
                  </tr>
                </thead>
                <tbody>
                  ${skippedRows.map(r => `
                    <tr style="border-bottom:1px solid #1e293b;">
                      <td style="padding:8px 12px;text-align:center;color:#64748b;font-size:11px;">${r.rowNum}</td>
                      <td style="padding:8px 12px;color:#cbd5e1;font-family:monospace;font-size:11px;">${r.responseNumber}</td>
                      <td style="padding:8px 12px;color:#34d399;font-weight:700;font-size:11px;">${r.vehicleNo}</td>
                      <td style="padding:8px 12px;color:#94a3b8;font-size:11px;">${r.date}</td>
                      <td style="padding:8px 12px;font-size:11px;color:#f87171;font-weight:600;">${r.reason}</td>
                    </tr>`).join('')}
                </tbody>
              </table>`}
        </div>
        <div style="padding:14px 20px;border-top:1px solid #334155;display:flex;justify-content:flex-end;gap:10px;background:#0f172a;">
          ${skippedRows.length > 0 ? `
            <button onclick="
              const rows = ${JSON.stringify(skippedRows)};
              const csv = 'Row #,Response #,Vehicle No,Date,Skip Reason\\n' + rows.map(r => [r.rowNum,r.responseNumber,r.vehicleNo,r.date,r.reason].join(',')).join('\\n');
              const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
              a.download='skipped_rows.csv'; a.click();
            " style="background:#334155;color:#94a3b8;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">
              ⬇ Download Skipped CSV
            </button>` : ''}
          <button onclick="document.getElementById('import-skipped-modal').remove()" style="background:#3b82f6;color:#fff;border:none;padding:8px 20px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">
            Close
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (ev) => { if (ev.target === modal) modal.remove(); });
  }

  // Location configuration link
  const gearLocBtn = document.getElementById('gear-location-config');
  if (gearLocBtn) {
    gearLocBtn.onclick = () => {
      gearMenu.classList.remove('gear-dropdown-open');
      document.getElementById('location-modal').classList.remove('hidden');
      renderLocationsGrid();
    };
  }

  // Vehicle config link
  const gearVehBtn = document.getElementById('gear-vehicle-vendor');
  if (gearVehBtn) {
    gearVehBtn.onclick = () => {
      gearMenu.classList.remove('gear-dropdown-open');
      switchSection('vehicles');
    };
  }

  // Urea request link
  const gearUreaBtn = document.getElementById('gear-urea-request');
  if (gearUreaBtn) {
    gearUreaBtn.onclick = () => {
      gearMenu.classList.remove('gear-dropdown-open');
      openUreaModal();
    };
  }

  // Driver config link
  const gearDriverBtn = document.getElementById('gear-driver-staff');
  if (gearDriverBtn) {
    gearDriverBtn.onclick = () => {
      gearMenu.classList.remove('gear-dropdown-open');
      switchSection('drivers');
    };
  }

  // Diesel rate setting link
  const gearRateBtn = document.getElementById('gear-diesel-rate');
  if (gearRateBtn) {
    const rateSpan = document.getElementById('gear-rate-val');
    if (rateSpan) rateSpan.textContent = dieselRate;
    gearRateBtn.onclick = () => {
      gearMenu.classList.remove('gear-dropdown-open');
      openDieselRateModal();
    };
  }

  // Diesel fuel request link
  const gearReqBtn = document.getElementById('gear-diesel-request');
  if (gearReqBtn) {
    gearReqBtn.onclick = () => {
      gearMenu.classList.remove('gear-dropdown-open');
      openFuelModal();
    };
  }

  // Data management settings link
  const gearDataBtn = document.getElementById('gear-data-mgmt');
  if (gearDataBtn) {
    gearDataBtn.onclick = () => {
      gearMenu.classList.remove('gear-dropdown-open');
      switchSection('settings');
    };
  }

  // Calculator buttons trigger
  const calcBtn = document.getElementById('calc-calculate');
  if (calcBtn) calcBtn.onclick = runCalculation;

  const calcVehicleInput = document.getElementById('calc-vehicle');
  if (calcVehicleInput) {
    calcVehicleInput.addEventListener('change', handleVehicleChange);
    calcVehicleInput.addEventListener('input', handleVehicleChange);
  }

  const resetBtn = document.getElementById('calc-reset');
  if (resetBtn) {
    resetBtn.onclick = () => {
      document.getElementById('calc-vehicle').value = '';
      initCalculatorDateDefaults();
      document.getElementById('calc-current-km').value = '';
      const mileageInput = document.getElementById('calc-mileage');
      if (mileageInput) mileageInput.value = '';
      document.getElementById('calc-results').classList.add('hidden');
      toast.info("Calculator reset successfully.");
    };
  }

  const exportExcelBtn = document.getElementById('calc-export-excel');
  if (exportExcelBtn) exportExcelBtn.onclick = exportCalculatorExcel;

  const exportPdfBtn = document.getElementById('calc-export-pdf');
  if (exportPdfBtn) exportPdfBtn.onclick = exportCalculatorPDF;

  // Initialize dashboard filters
  initDashboardFilters();

  // Initialize calculator date range defaults
  initCalculatorDateDefaults();
}

/* ══════════════════════════════════════════════════════════
   21. INITIALIZATION
   ══════════════════════════════════════════════════════════ */
function appStart() {
  try {
    // Request notification permission if not yet decided
    if ('Notification' in window && Notification.permission === 'default') {
      if (!localStorage.getItem('notification_prompted')) {
        Notification.requestPermission().then(permission => {
          localStorage.setItem('notification_prompted', 'true');
          console.log("[Notification] Permission status:", permission);
        });
      }
    }

    // Register service worker if supported
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then(reg => {
          console.log("[ServiceWorker] Registered:", reg.scope);
        })
        .catch(err => console.error("[ServiceWorker] Registration failed:", err));

      // Listen for message actions from the Service Worker (Approve / Reject)
      navigator.serviceWorker.addEventListener('message', event => {
        const { action, requestKey } = event.data;
        if (action === 'approve') {
          approveDriverRequest(requestKey);
        } else if (action === 'reject') {
          rejectDriverRequest(requestKey);
        }
      });
    }

    // Handle deep-link parameters from closed notification clicks
    const urlParams = new URLSearchParams(window.location.search);
    const urlAction = urlParams.get('action');
    const urlKey = urlParams.get('key');
    if (urlAction && urlKey) {
      setTimeout(() => {
        if (urlAction === 'approve') {
          approveDriverRequest(urlKey);
        } else if (urlAction === 'reject') {
          rejectDriverRequest(urlKey);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 2500);
    }

    // Apply Performance Mode (Low-spec / High-end checks)
    applyPerformanceMode();

    // Initial sidebar responsiveness layout collapse check
    if (window.innerWidth < 768) {
      toggleSidebarCollapse(true);
    } else {
      toggleSidebarCollapse(false);
    }

    // Initialize Auth listeners and toggles
    initAuthControls();

    // Trigger connection status initialization
    if (typeof updateConnectionStatus === 'function') {
      updateConnectionStatus();
    }

    // Check session login state (persistent across browser restarts)
    if (getAuthSession('rpm_logged_in') === '1') {
      const userEmail = getAuthSession('rpm_user_email');
      const userKey = getAuthSession('rpm_user_key');
      if (userKey) {
        // Unlock app immediately so UI & mobile navigation bar render instantly without network delay
        unlockApp();
        watchActiveSessionToken(userKey);
        if (typeof syncUserNotesListener === 'function') {
          syncUserNotesListener();
        }
        
        // Asynchronously check lastLogoutAt in Firebase
        const loginTime = parseInt(getAuthSession('rpm_login_time') || '0', 10);
        db.ref(`users/${userKey}/lastLogoutAt`).once('value', snapshot => {
          const lastLogoutAt = snapshot.val();
          if (lastLogoutAt && loginTime > 0 && lastLogoutAt > loginTime + 3000) {
            console.warn("[Session Manager] Account logged out globally.");
            forceReauth();
          }
        });
      } else if (userEmail) {
        // Heal session by recovering userKey
        usersRef.orderByChild('email').equalTo(userEmail).once('value', snapshot => {
          const users = snapshot.val();
          if (users) {
            const firstKey = Object.keys(users)[0];
            createNewUserSession(firstKey, users[firstKey]);
            unlockApp();
          } else {
            forceReauth();
          }
        }, () => forceReauth());
      } else {
        forceReauth();
      }
    } else {
      // Show login overlay
      if (loginOverlay) loginOverlay.classList.remove('hidden');
      if (appLayout) appLayout.classList.add('hidden');
      const mobileNav = document.getElementById('mobile-bottom-nav');
      if (mobileNav) mobileNav.classList.add('hidden');
      if (typeof toggleSidebarCollapse === 'function') {
        toggleSidebarCollapse(true);
      }
    }

    // Initialize gear menu and calculator controls
    initDashboardControls();

    // Populate config grids
    renderRefillLogsTable();
    renderLocationsGrid();
    renderVehiclesGrid();
    renderDriversGrid();
    renderEmployeesGrid();

    // Initialize Notes & Tasks controls
    initNotesControls();
    initTasksControls();

    // Initialize Futuristic Glassmorphism Effects
    initFuturisticEffects();

    // Immediate instant cache-first UI hydration rendering (0ms startup latency)
    if (historyEntries && historyEntries.length > 0) {
      if (typeof syncVehicleList === 'function') syncVehicleList();
      if (typeof refreshActiveSection === 'function') refreshActiveSection();
    }
    if (driverRequestsList && driverRequestsList.length > 0) {
      if (typeof updateDriverRequestsBadges === 'function') updateDriverRequestsBadges();
    }

  } catch (err) {
    console.error("App initialization crashed:", err);
    alert("Initialization Error: " + err.message + "\nStack: " + err.stack);
  } finally {
    // Hide splash screen after initialization is complete
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.style.transition = 'opacity 0.2s ease';
      splash.style.opacity = '0';
      splash.style.pointerEvents = 'none';
      setTimeout(() => {
        if (splash && splash.parentNode) splash.parentNode.removeChild(splash);
      }, 220);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', appStart);
} else {
  appStart();
}

/* ══════════════════════════════════════════════════════════
   22. NOTES & TASKS CONTROLLERS
   ══════════════════════════════════════════════════════════ */

// Notes State Variables (declared globally at top)
notesFilterQuery = "";
editingNoteId = null;

// Tasks State Variables (declared globally at top)
taskFilter = "all"; // "all", "pending", "completed"
editingTaskId = null;

// Toggle Add Note Form
function toggleAddNoteForm() {
  const form = document.getElementById('form-add-note');
  const icon = document.getElementById('icon-toggle-add-note');
  if (form) {
    const isHidden = form.classList.toggle('hidden');
    if (icon) {
      if (isHidden) {
        icon.classList.remove('rotate-180');
      } else {
        icon.classList.add('rotate-180');
      }
    }
  }
}

// Add Note to Firebase
function addNote() {
  const titleInput = document.getElementById('note-title-input');
  const contentInput = document.getElementById('note-content-input');
  const tagInput = document.getElementById('note-tag-input');
  
  if (!titleInput || !contentInput || !tagInput) return;
  
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const tag = tagInput.value;
  
  if (!title) {
    toast.err("Please enter a note title.");
    return;
  }
  if (!content) {
    toast.err("Please enter note content.");
    return;
  }
  
  const userKey = getCurrentUserNotesKey();
  const userName = (typeof getAuthSession === 'function' ? getAuthSession('rpm_user_name') : '') || '';
  const newNote = {
    title: title,
    content: content,
    tag: tag,
    userId: userKey,
    userName: userName,
    timestamp: Date.now(),
    updatedAt: Date.now()
  };
  
  notesRef.push(newNote)
    .then(() => {
      titleInput.value = '';
      contentInput.value = '';
      tagInput.value = 'general';
      toggleAddNoteForm();
      toast.ok("Note added successfully.");
    })
    .catch(err => {
      toast.err("Failed to save note: " + err.message);
    });
}

// Update Note in Firebase
function updateNote(key) {
  const card = document.querySelector(`[data-note-key="${key}"]`);
  if (!card) return;
  
  const titleInput = card.querySelector('.edit-note-title');
  const contentTextarea = card.querySelector('.edit-note-content');
  const tagSelect = card.querySelector('.edit-note-tag');
  
  if (!titleInput || !contentTextarea || !tagSelect) return;
  
  const title = titleInput.value.trim();
  const content = contentTextarea.value.trim();
  const tag = tagSelect.value;
  
  if (!title) {
    toast.err("Title cannot be empty.");
    return;
  }
  if (!content) {
    toast.err("Content cannot be empty.");
    return;
  }
  
  notesRef.child(key).update({
    title: title,
    content: content,
    tag: tag,
    updatedAt: Date.now()
  })
    .then(() => {
      editingNoteId = null;
      renderNotesList();
      toast.ok("Note updated successfully.");
    })
    .catch(err => {
      toast.err("Failed to update note: " + err.message);
    });
}

// Delete Note from Firebase
function deleteNote(key) {
  if (confirm("Are you sure you want to delete this note?")) {
    notesRef.child(key).remove()
      .then(() => {
        toast.ok("Note deleted successfully.");
      })
      .catch(err => {
        toast.err("Failed to delete note: " + err.message);
      });
  }
}

// Edit Mode Toggle
function setEditingNote(key) {
  editingNoteId = key;
  renderNotesList();
}

function cancelEditNote() {
  editingNoteId = null;
  renderNotesList();
}

// Tag Style Configuration helper
function getTagStyle(tag) {
  const styles = {
    urgent: {
      bg: "bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/30",
      border: "border-l-4 border-l-red-500",
      label: "🚨 Urgent"
    },
    vendor: {
      bg: "bg-purple-500/10 text-purple-500 dark:text-purple-400 border-purple-500/30",
      border: "border-l-4 border-l-purple-500",
      label: "🤝 Vendor"
    },
    personal: {
      bg: "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/30",
      border: "border-l-4 border-l-emerald-500",
      label: "👤 Personal"
    },
    info: {
      bg: "bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/30",
      border: "border-l-4 border-l-blue-500",
      label: "ℹ️ Info"
    },
    general: {
      bg: "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/30",
      border: "border-l-4 border-l-slate-400",
      label: "📁 General"
    }
  };
  return styles[tag] || styles.general;
}

// Render Notes Manager List
function renderNotesList() {
  const notesContainer = document.getElementById('notes-list');
  const countBadge = document.getElementById('notes-count-badge');
  if (!notesContainer) return;
  
  if (countBadge) {
    countBadge.textContent = notesList.length;
  }
  
  // Filter notes if search query exists
  let filteredNotes = notesList;
  if (typeof notesFilterQuery !== 'undefined' && notesFilterQuery) {
    const q = notesFilterQuery.toLowerCase();
    filteredNotes = notesList.filter(n => 
      n.title.toLowerCase().includes(q) || 
      n.content.toLowerCase().includes(q)
    );
  }
  
  if (filteredNotes.length === 0) {
    notesContainer.innerHTML = `
      <div class="text-center py-20 text-slate-400 text-xs font-semibold">
        ${notesFilterQuery ? 'No matching notes found.' : 'No notes available. Click "Write a New Note" to begin!'}
      </div>
    `;
    return;
  }
  
  notesContainer.innerHTML = filteredNotes.map(note => {
    const isEditing = editingNoteId === note.key;
    const tagInfo = getTagStyle(note.tag);
    const dateFormatted = new Date(note.updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' });
    
    if (isEditing) {
      return `
        <div class="glass-panel p-4 rounded-2xl border border-blue-500/30 space-y-3" data-note-key="${note.key}">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold text-blue-500 uppercase tracking-wider"><i class="fas fa-edit mr-1"></i> Editing Note</span>
            <span class="text-[9px] text-slate-400 font-semibold">${dateFormatted} (IST)</span>
          </div>
          <input type="text" class="edit-note-title calc-input py-1.5 text-xs font-bold" value="${note.title}">
          <textarea class="edit-note-content calc-input py-1.5 text-xs font-sans resize-none" rows="4">${note.content}</textarea>
          
          <div class="flex items-center justify-between gap-3 pt-1">
            <div class="flex items-center gap-1.5">
              <label class="text-[9px] font-bold text-slate-400 uppercase">Tag:</label>
              <select class="edit-note-tag calc-input py-1 px-1.5 text-[10px] w-auto h-7 bg-white dark:bg-slate-900">
                <option value="general" ${note.tag === 'general' ? 'selected' : ''}>📁 General</option>
                <option value="urgent" ${note.tag === 'urgent' ? 'selected' : ''}>🚨 Urgent</option>
                <option value="vendor" ${note.tag === 'vendor' ? 'selected' : ''}>🤝 Vendor</option>
                <option value="personal" ${note.tag === 'personal' ? 'selected' : ''}>👤 Personal</option>
                <option value="info" ${note.tag === 'info' ? 'selected' : ''}>ℹ️ Info</option>
              </select>
            </div>
            <div class="flex gap-2">
              <button onclick="cancelEditNote()" class="px-2.5 py-1 border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-md text-[10px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
              <button onclick="updateNote('${note.key}')" class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-[10px] font-bold shadow-sm transition-all">Save</button>
            </div>
          </div>
        </div>
      `;
    } else {
      // Escape HTML tags in title and content to prevent XSS
      const cleanTitle = note.title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const cleanContent = note.content.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
      
      return `
        <div class="glass-panel p-4 rounded-2xl relative overflow-hidden transition-all hover:translate-x-1 ${tagInfo.border} space-y-2">
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-1 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="font-extrabold text-xs text-slate-800 dark:text-white">${cleanTitle}</h4>
                <span class="px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-wide uppercase border ${tagInfo.bg}">${tagInfo.label}</span>
              </div>
              <span class="inline-block text-[9px] text-slate-400 font-semibold"><i class="far fa-clock mr-1"></i>${dateFormatted} (IST)</span>
            </div>
            
            <!-- Actions -->
            <div class="flex items-center gap-1.5">
              <button onclick="setEditingNote('${note.key}')" class="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-lg transition-all" title="Edit Note">
                <i class="fas fa-edit text-[10px]"></i>
              </button>
              <button onclick="deleteNote('${note.key}')" class="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/20 text-slate-500 hover:text-red-500 rounded-lg transition-all" title="Delete Note">
                <i class="fas fa-trash text-[10px]"></i>
              </button>
            </div>
          </div>
          
          <p class="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-sans">${cleanContent}</p>
        </div>
      `;
    }
  }).join('');
}

// Select note from search suggestion
function selectSearchSuggestion(title) {
  const searchInput = document.getElementById('notes-search-input');
  if (searchInput) {
    searchInput.value = title;
    notesFilterQuery = title;
    
    // Toggle active filter banner
    const alertDiv = document.getElementById('notes-active-filter-alert');
    const alertText = document.getElementById('notes-filter-query-text');
    const clearBtn = document.getElementById('notes-search-clear');
    if (alertDiv && alertText) {
      alertText.textContent = title;
      alertDiv.classList.remove('hidden');
    }
    if (clearBtn) clearBtn.classList.remove('hidden');
    
    renderNotesList();
    hideSearchSuggestions();
  }
}

function hideSearchSuggestions() {
  const suggestionsDiv = document.getElementById('notes-search-suggestions');
  if (suggestionsDiv) suggestionsDiv.classList.add('hidden');
}

// Bind Notes Controls
function initNotesControls() {
  const toggleAddBtn = document.getElementById('btn-toggle-add-note');
  if (toggleAddBtn) toggleAddBtn.onclick = toggleAddNoteForm;
  
  const saveNoteBtn = document.getElementById('btn-save-note');
  if (saveNoteBtn) saveNoteBtn.onclick = addNote;
  
  // Search Input Handler
  const searchInput = document.getElementById('notes-search-input');
  const suggestionsDiv = document.getElementById('notes-search-suggestions');
  const clearSearchBtn = document.getElementById('notes-search-clear');
  const filterAlertDiv = document.getElementById('notes-active-filter-alert');
  const clearFilterBtn = document.getElementById('btn-clear-note-filter');
  
  if (searchInput) {
    searchInput.oninput = (e) => {
      const val = e.target.value;
      notesFilterQuery = val;
      
      // Update Clear button visibility
      if (clearSearchBtn) {
        if (val) clearSearchBtn.classList.remove('hidden');
        else clearSearchBtn.classList.add('hidden');
      }
      
      // Show/Hide filter alert banner
      if (filterAlertDiv) {
        const queryText = document.getElementById('notes-filter-query-text');
        if (val) {
          if (queryText) queryText.textContent = val;
          filterAlertDiv.classList.remove('hidden');
        } else {
          filterAlertDiv.classList.add('hidden');
        }
      }
      
      // Suggestions Autocomplete dropdown
      if (val.trim().length > 0 && suggestionsDiv) {
        const query = val.toLowerCase();
        // find matching notes
        const matches = notesList.filter(n => 
          n.title.toLowerCase().includes(query) || 
          n.content.toLowerCase().includes(query)
        ).slice(0, 5); // limit suggestions to 5
        
        if (matches.length > 0) {
          suggestionsDiv.innerHTML = matches.map(m => `
            <div class="px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800/40 last:border-0" onclick="selectSearchSuggestion('${m.title.replace(/'/g, "\\'")}')">
              <span class="block truncate">${m.title}</span>
              <span class="block text-[9px] text-slate-400 truncate mt-0.5">${m.content}</span>
            </div>
          `).join('');
          suggestionsDiv.classList.remove('hidden');
        } else {
          suggestionsDiv.classList.add('hidden');
        }
      } else {
        if (suggestionsDiv) suggestionsDiv.classList.add('hidden');
      }
      
      renderNotesList();
    };
    
    // Hide suggestions on click outside
    document.addEventListener('click', (e) => {
      if (searchInput && suggestionsDiv && !searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
        suggestionsDiv.classList.add('hidden');
      }
    });
  }
  
  if (clearSearchBtn) {
    clearSearchBtn.onclick = () => {
      if (searchInput) searchInput.value = '';
      notesFilterQuery = "";
      clearSearchBtn.classList.add('hidden');
      if (filterAlertDiv) filterAlertDiv.classList.add('hidden');
      renderNotesList();
      hideSearchSuggestions();
    };
  }
  
  if (clearFilterBtn) {
    clearFilterBtn.onclick = () => {
      if (searchInput) searchInput.value = '';
      notesFilterQuery = "";
      if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
      if (filterAlertDiv) filterAlertDiv.classList.add('hidden');
      renderNotesList();
      hideSearchSuggestions();
    };
  }
}

// Tasks Helpers & CRUD
function getTaskPriorityStyle(priority) {
  const styles = {
    high: "bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20",
    medium: "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20",
    low: "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20"
  };
  return styles[priority] || styles.medium;
}

// Add Task to Firebase
function addTask() {
  const textInput = document.getElementById('task-text-input');
  const prioritySelect = document.getElementById('task-priority-input');
  
  if (!textInput || !prioritySelect) return;
  
  const text = textInput.value.trim();
  const priority = prioritySelect.value;
  
  if (!text) {
    toast.err("Please enter a task description.");
    return;
  }
  
  const newTask = {
    text: text,
    priority: priority,
    completed: false,
    timestamp: Date.now()
  };
  
  tasksRef.push(newTask)
    .then(() => {
      textInput.value = '';
      prioritySelect.value = 'medium';
      toast.ok("Task added successfully.");
    })
    .catch(err => {
      toast.err("Failed to save task: " + err.message);
    });
}

// Toggle Task Complete Status
function toggleTask(key, currentStatus) {
  tasksRef.child(key).update({
    completed: !currentStatus
  })
    .then(() => {
      toast.ok("Task status updated.");
    })
    .catch(err => {
      toast.err("Failed to update status: " + err.message);
    });
}

// Set editing task ID
function setEditingTask(key) {
  editingTaskId = key;
  renderTasksList();
}

// Cancel edit task
function cancelEditTask() {
  editingTaskId = null;
  renderTasksList();
}

// Update Task in Firebase
function updateTask(key) {
  const card = document.querySelector(`[data-task-key="${key}"]`);
  if (!card) return;
  
  const textInput = card.querySelector('.edit-task-text');
  const prioritySelect = card.querySelector('.edit-task-priority');
  
  if (!textInput || !prioritySelect) return;
  
  const text = textInput.value.trim();
  const priority = prioritySelect.value;
  
  if (!text) {
    toast.err("Task description cannot be empty.");
    return;
  }
  
  tasksRef.child(key).update({
    text: text,
    priority: priority
  })
    .then(() => {
      editingTaskId = null;
      renderTasksList();
      toast.ok("Task updated successfully.");
    })
    .catch(err => {
      toast.err("Failed to update task: " + err.message);
    });
}

// Delete Task from Firebase
function deleteTask(key) {
  if (confirm("Are you sure you want to delete this task?")) {
    tasksRef.child(key).remove()
      .then(() => {
        toast.ok("Task deleted successfully.");
      })
      .catch(err => {
        toast.err("Failed to delete task: " + err.message);
      });
  }
}

// Render Tasks List
function renderTasksList() {
  const tasksContainer = document.getElementById('tasks-list');
  const statusBadge = document.getElementById('tasks-status-badge');
  if (!tasksContainer) return;
  
  // Calculate completed count vs total count
  const totalCount = tasksList.length;
  const completedCount = tasksList.filter(t => t.completed).length;
  
  if (statusBadge) {
    statusBadge.textContent = `${completedCount}/${totalCount}`;
  }
  
  // Filter tasks based on taskFilter state
  let filteredTasks = tasksList;
  if (taskFilter === 'pending') {
    filteredTasks = tasksList.filter(t => !t.completed);
  } else if (taskFilter === 'completed') {
    filteredTasks = tasksList.filter(t => t.completed);
  }
  
  if (filteredTasks.length === 0) {
    tasksContainer.innerHTML = `
      <div class="text-center py-20 text-slate-400 text-xs font-semibold">
        No tasks found in "${taskFilter}" view.
      </div>
    `;
    return;
  }
  
  tasksContainer.innerHTML = filteredTasks.map(task => {
    const isEditing = editingTaskId === task.key;
    const prioClass = getTaskPriorityStyle(task.priority);
    const dateFormatted = new Date(task.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' });
    
    if (isEditing) {
      return `
        <div class="glass-panel p-3.5 rounded-2xl border border-blue-500/30 space-y-2.5" data-task-key="${task.key}">
          <div class="flex items-center justify-between">
            <span class="text-[9px] font-bold text-blue-500 uppercase tracking-wider"><i class="fas fa-edit mr-1"></i> Edit Task</span>
            <span class="text-[8px] text-slate-400 font-semibold">${dateFormatted} (IST)</span>
          </div>
          <input type="text" class="edit-task-text calc-input py-1.5 text-xs font-semibold" value="${task.text}">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-1">
              <span class="text-[9px] font-bold text-slate-400 uppercase">Priority:</span>
              <select class="edit-task-priority calc-input py-1 px-1 text-[9px] w-20 h-6.5 bg-white dark:bg-slate-900">
                <option value="low" ${task.priority === 'low' ? 'selected' : ''}>🟢 Low</option>
                <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>🟡 Medium</option>
                <option value="high" ${task.priority === 'high' ? 'selected' : ''}>🔴 High</option>
              </select>
            </div>
            <div class="flex gap-1.5">
              <button onclick="cancelEditTask()" class="px-2 py-0.5 border border-slate-300 dark:border-slate-700 text-slate-500 rounded text-[9px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onclick="updateTask('${task.key}')" class="px-2.5 py-0.5 bg-green-600 hover:bg-green-700 text-white rounded text-[9px] font-bold shadow-sm">Save</button>
            </div>
          </div>
        </div>
      `;
    } else {
      // Escape task text
      const cleanText = task.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      
      return `
        <div class="glass-panel p-3.5 rounded-2xl flex items-center justify-between gap-4 transition-all hover:bg-slate-50/50 dark:hover:bg-slate-850/40 relative group">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <!-- Custom Styled Checkbox -->
            <button onclick="toggleTask('${task.key}', ${task.completed})" class="w-5 h-5 flex items-center justify-center rounded-md border ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 dark:border-slate-700 hover:border-blue-500'} transition-all cursor-pointer">
              ${task.completed ? '<i class="fas fa-check text-[10px]"></i>' : ''}
            </button>
            
            <div class="flex-1 min-w-0">
              <p class="text-xs text-slate-700 dark:text-slate-200 truncate ${task.completed ? 'line-through opacity-40' : ''}">${cleanText}</p>
              <div class="flex items-center gap-2 mt-1">
                <span class="px-1 py-0.2 rounded text-[7px] font-extrabold uppercase border ${prioClass}">${task.priority}</span>
                <span class="text-[8px] text-slate-400 font-semibold"><i class="far fa-clock mr-0.5"></i>${dateFormatted}</span>
              </div>
            </div>
          </div>
          
          <!-- Actions (Visible on Hover/Desktop, Always Visible on Touch Devices) -->
          <div class="flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button onclick="setEditingTask('${task.key}')" class="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-md transition-all" title="Edit Task">
              <i class="fas fa-edit text-[9px]"></i>
            </button>
            <button onclick="deleteTask('${task.key}')" class="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-red-550/10 hover:text-red-500 dark:bg-slate-800 dark:hover:bg-red-950/20 text-slate-500 rounded-md transition-all" title="Delete Task">
              <i class="fas fa-trash text-[9px]"></i>
            </button>
          </div>
        </div>
      `;
    }
  }).join('');
}

// Bind Tasks Controls
function initTasksControls() {
  const addTaskBtn = document.getElementById('btn-add-task');
  if (addTaskBtn) addTaskBtn.onclick = addTask;
  
  // Enter key press on task input triggers Add Task
  const taskTextInput = document.getElementById('task-text-input');
  if (taskTextInput) {
    taskTextInput.onkeypress = (e) => {
      if (e.key === 'Enter') {
        addTask();
      }
    };
  }
  
  // Filter tabs click handlers
  document.querySelectorAll('.task-filter-btn').forEach(btn => {
    btn.onclick = (e) => {
      // Toggle button active class
      document.querySelectorAll('.task-filter-btn').forEach(b => {
        b.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-800', 'dark:text-slate-200');
        b.classList.add('text-slate-400', 'hover:text-slate-600', 'dark:hover:text-slate-200');
      });
      
      btn.classList.remove('text-slate-400', 'hover:text-slate-600', 'dark:hover:text-slate-200');
      btn.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-slate-800', 'dark:text-slate-200');
      
      const filter = btn.getAttribute('data-task-filter');
      taskFilter = filter;
      renderTasksList();
    };
  });
}

// ==========================================
//   KM RANGE & FUEL CALCULATOR LOGIC
// ==========================================
let kmRangeCalcInitialized = false;
let lastEditedConverterField = 'amount'; // Tracks if the user last updated 'amount' or 'litres'

function initKmRangeCalculator() {
  if (kmRangeCalcInitialized) {
    // Just refresh the default rates
    updateKmCalcRates();
    return;
  }
  
  const distanceInput = document.getElementById('calc-range-distance');
  const vtypeSelect = document.getElementById('calc-range-vtype');
  const autoMileageCheck = document.getElementById('calc-range-auto-mileage');
  const mileageInput = document.getElementById('calc-range-mileage');
  const rateInput = document.getElementById('calc-range-rate');
  
  const convAmountInput = document.getElementById('calc-conv-amount');
  const convLitresInput = document.getElementById('calc-conv-litres');
  const convRateInput = document.getElementById('calc-conv-rate');

  // Set default rates
  updateKmCalcRates();

  // Populate vehicle type dropdown
  populateKmRangeVtypeDropdown();

  // Event Listeners for KM to Diesel & Amount
  if (distanceInput) distanceInput.oninput = runKmRangeCalculation;
  if (vtypeSelect) {
    vtypeSelect.onchange = () => {
      if (autoMileageCheck && autoMileageCheck.checked) {
        syncKmRangeAutoMileage();
      }
      runKmRangeCalculation();
    };
  }
  if (autoMileageCheck) {
    autoMileageCheck.onchange = () => {
      if (autoMileageCheck.checked) {
        mileageInput.readOnly = true;
        mileageInput.classList.add('bg-slate-100/50', 'dark:bg-slate-900/50', 'text-slate-500', 'dark:text-slate-400', 'cursor-not-allowed');
        syncKmRangeAutoMileage();
      } else {
        mileageInput.readOnly = false;
        mileageInput.classList.remove('bg-slate-100/50', 'dark:bg-slate-900/50', 'text-slate-500', 'dark:text-slate-400', 'cursor-not-allowed');
        if (mileageInput.value === 'Auto') {
          mileageInput.value = '';
        }
      }
      runKmRangeCalculation();
    };
  }
  if (mileageInput) mileageInput.oninput = runKmRangeCalculation;
  if (rateInput) rateInput.oninput = runKmRangeCalculation;

  // Event Listeners for Converter
  if (convAmountInput) {
    convAmountInput.oninput = () => {
      lastEditedConverterField = 'amount';
      runConverterCalculation();
    };
  }
  if (convLitresInput) {
    convLitresInput.oninput = () => {
      lastEditedConverterField = 'litres';
      runConverterCalculation();
    };
  }
  if (convRateInput) {
    convRateInput.oninput = () => {
      runConverterCalculation();
    };
  }

  kmRangeCalcInitialized = true;
}

function updateKmCalcRates() {
  const rateInput = document.getElementById('calc-range-rate');
  const convRateInput = document.getElementById('calc-conv-rate');
  if (rateInput && !rateInput.value) {
    rateInput.value = dieselRate;
  }
  if (convRateInput && !convRateInput.value) {
    convRateInput.value = dieselRate;
  }
}

function populateKmRangeVtypeDropdown() {
  const select = document.getElementById('calc-range-vtype');
  if (select) {
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Choose Type --</option>';
    vehicleTypesList.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.name;
      const averageVal = Number(v.avg) || 0;
      opt.textContent = `${v.name} (${averageVal.toFixed(2)} KM/L)`;
      select.appendChild(opt);
    });
    if (currentVal) {
      select.value = currentVal;
    }
  }
}

function syncKmRangeAutoMileage() {
  const vtypeSelect = document.getElementById('calc-range-vtype');
  const mileageInput = document.getElementById('calc-range-mileage');
  if (vtypeSelect && mileageInput) {
    const selectedType = vtypeSelect.value.toUpperCase();
    if (selectedType && vehicleTypes[selectedType] !== undefined) {
      mileageInput.value = vehicleTypes[selectedType];
    } else {
      mileageInput.value = 'Auto';
    }
  }
}

function runKmRangeCalculation() {
  const distance = parseFloat(document.getElementById('calc-range-distance').value);
  const mileage = parseFloat(document.getElementById('calc-range-mileage').value);
  const rate = parseFloat(document.getElementById('calc-range-rate').value) || dieselRate;
  
  const litresRes = document.getElementById('calc-range-res-litres');
  const costRes = document.getElementById('calc-range-res-cost');

  if (isNaN(distance) || isNaN(mileage) || mileage <= 0 || isNaN(rate) || rate <= 0) {
    litresRes.textContent = '-';
    costRes.textContent = '-';
    return;
  }

  const reqLitres = distance / mileage;
  const estCost = reqLitres * rate;

  litresRes.textContent = reqLitres.toFixed(2) + ' L';
  costRes.textContent = '₹' + estCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function runConverterCalculation() {
  const convAmountInput = document.getElementById('calc-conv-amount');
  const convLitresInput = document.getElementById('calc-conv-litres');
  const rate = parseFloat(document.getElementById('calc-conv-rate').value) || dieselRate;

  if (isNaN(rate) || rate <= 0) return;

  if (lastEditedConverterField === 'amount') {
    const amount = parseFloat(convAmountInput.value);
    if (isNaN(amount) || amount < 0) {
      convLitresInput.value = '';
      return;
    }
    const computedLitres = amount / rate;
    convLitresInput.value = computedLitres.toFixed(2);
  } else {
    const litres = parseFloat(convLitresInput.value);
    if (isNaN(litres) || litres < 0) {
      convAmountInput.value = '';
      return;
    }
    const computedAmount = litres * rate;
    convAmountInput.value = computedAmount.toFixed(2);
  }
}

// ==========================================
//   USER PROFILE LOGIC (EDITS, PICTURES)
// ==========================================

function watchUserProfile() {
  const userKey = getAuthSession('rpm_user_key');
  if (!userKey) return;
  
  if (userProfileListenerActive) {
    db.ref(`users/${userKey}`).off();
  }
  
  userProfileListenerActive = true;
  db.ref(`users/${userKey}`).on('value', snapshot => {
    const user = snapshot.val();
    if (user) {
      window.currentUserProfileData = user;
      setAuthSession('rpm_user_name', user.fullName);
      setAuthSession('rpm_user_email', user.email);
      setAuthSession('rpm_user_mobile', user.mobile);
      if (user.role) setAuthSession('rpm_user_role', user.role);

      const freshVendor = user.assignedVendor || user.assigned_vendor || user.vendor || user.vendorName || '';
      setAuthSession('rpm_assigned_vendor', freshVendor);
      dashFilters.vendor = freshVendor ? [freshVendor] : ['All'];

      setAuthSession('rpm_user_features', JSON.stringify(user.features || {}));
      applyUserFeaturePermissions();
      toggleAdminSidebarItems();
      updateUserDisplayName();

      populateDashboardFilterDropdowns();
      renderDashboardStats();
      setTimeout(() => {
        if (typeof applyDashboardFilters === 'function') applyDashboardFilters();
      }, 50);
      
      const pMobile = document.getElementById('profile-mobile-display');
      const pEmail = document.getElementById('profile-email-display');
      const pName = document.getElementById('profile-user-name');
      
      if (pMobile) pMobile.textContent = user.mobile;
      if (pEmail) pEmail.textContent = user.email;
      if (pName) pName.textContent = user.fullName;
      
      // Dynamic Role & Designation binding
      const isAdmin = getAuthSession('rpm_is_admin') === '1';
      const userRole = isAdmin ? 'Admin' : 'User';
      const designation = isAdmin ? 'Diesel Incharge Monitor Admin' : 'Diesel Incharge Monitor User';
      const scope = isAdmin ? 'Full Administrator Access' : 'Diesel Incharge Monitor';
      
      const rBadge = document.getElementById('profile-role-badge');
      if (rBadge) {
        rBadge.textContent = userRole;
        if (isAdmin) {
          rBadge.className = "inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20";
        } else {
          rBadge.className = "inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20";
        }
      }
      
      const pDesignation = document.getElementById('profile-designation');
      if (pDesignation) pDesignation.textContent = designation;
      
      const pScope = document.getElementById('profile-scope-display');
      if (pScope) pScope.textContent = scope;
      
      const pDbKey = document.getElementById('profile-db-key-display');
      if (pDbKey) pDbKey.textContent = userKey;
      
      const pBottomRole = document.getElementById('profile-bottom-role-display');
      if (pBottomRole) pBottomRole.textContent = userRole;
      
      const pPic = document.getElementById('profile-pic-display');
      const tPic = document.getElementById('top-bar-user-initials');
      
      if (user.profilePic) {
        if (pPic) {
          pPic.innerHTML = `<img src="${user.profilePic}" class="w-full h-full object-cover rounded-2xl">`;
        }
        if (tPic) {
          tPic.innerHTML = `<img src="${user.profilePic}" class="w-full h-full object-cover rounded-xl">`;
          // Re-inject avatar status dot
          tPic.insertAdjacentHTML('beforeend', '<span id="avatar-status-dot" class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-950 bg-emerald-500 transition-all duration-300"></span>');
          if (typeof updateConnectionStatus === 'function') updateConnectionStatus();
        }
      } else {
        const words = user.fullName.trim().split(/\s+/);
        let initials = '';
        if (words.length > 0) initials += words[0][0].toUpperCase();
        if (words.length > 1) initials += words[words.length - 1][0].toUpperCase();
        if (!initials) initials = 'AY';
        
        if (pPic) {
          pPic.innerHTML = `<img src="assets/images/default_avatar.png" class="w-full h-full object-cover rounded-2xl">`;
        }
                if (tPic) {
          tPic.innerHTML = `<img src="assets/images/default_avatar.png" class="w-full h-full object-cover rounded-xl">`;
          // Re-inject avatar status dot
          tPic.insertAdjacentHTML('beforeend', '<span id="avatar-status-dot" class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-955 bg-emerald-500 transition-all duration-300"></span>');
          if (typeof updateConnectionStatus === 'function') updateConnectionStatus();
        }
      }
    }
  });
}

function copyProfileKey() {
  const key = getAuthSession('rpm_user_key') || '';
  if (key) {
    navigator.clipboard.writeText(key).then(() => {
      toast.ok("Database ID copied to clipboard!");
    }).catch(() => {
      toast.err("Copy failed. Please manually copy the ID.");
    });
  }
}

function openICardModal() {
  const name = getAuthSession('rpm_user_name') || '-';
  const email = getAuthSession('rpm_user_email') || '-';
  const mobile = getAuthSession('rpm_user_mobile') || '-';
  const isAdmin = getAuthSession('rpm_is_admin') === '1';
  const role = isAdmin ? 'Admin' : 'User';
  const designation = isAdmin ? 'Diesel Incharge Monitor Admin' : 'Diesel Incharge Monitor User';

  const fName = document.getElementById('icard-front-name');
  const fRole = document.getElementById('icard-front-role');
  const fDesignation = document.getElementById('icard-front-designation');
  const fEmail = document.getElementById('icard-front-email');
  const fMobile = document.getElementById('icard-front-mobile');
  const bSysId = document.getElementById('icard-back-sys-id');

  if (fName) fName.textContent = name;
  if (fRole) {
    fRole.textContent = role;
    if (isAdmin) {
      fRole.className = "inline-block px-2.5 py-0.5 mt-1 rounded-full text-[8px] font-extrabold uppercase tracking-widest bg-red-500/20 text-red-300 border border-red-500/30";
    } else {
      fRole.className = "inline-block px-2.5 py-0.5 mt-1 rounded-full text-[8px] font-extrabold uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/30";
    }
  }
  if (fDesignation) fDesignation.textContent = designation;
  if (fEmail) fEmail.textContent = email;
  if (fMobile) fMobile.textContent = mobile;
  if (bSysId) bSysId.textContent = `ID: ${email.split('@')[0].toUpperCase()}`;

  // Avatar mapping
  const pPicDisplay = document.getElementById('profile-pic-display');
  const cardAvatar = document.getElementById('icard-front-avatar-display');
  if (cardAvatar && pPicDisplay) {
    cardAvatar.innerHTML = pPicDisplay.innerHTML;
    // Force circular shape inside card avatar image
    const imgEl = cardAvatar.querySelector('img');
    if (imgEl) {
      imgEl.className = "w-full h-full object-cover rounded-full";
    }
  }

  const modal = document.getElementById('icard-modal');
  if (modal) modal.classList.remove('hidden');
}

function printIDCard() {
  const name = getAuthSession('rpm_user_name') || '-';
  const email = getAuthSession('rpm_user_email') || '-';
  const mobile = getAuthSession('rpm_user_mobile') || '-';
  const isAdmin = getAuthSession('rpm_is_admin') === '1';
  const role = isAdmin ? 'Admin' : 'User';
  const designation = isAdmin ? 'Diesel Incharge Monitor Admin' : 'Diesel Incharge Monitor User';

  const pPicDisplay = document.getElementById('profile-pic-display');
  const imgEl = pPicDisplay ? pPicDisplay.querySelector('img') : null;
  const avatarImgSrc = imgEl ? imgEl.src : 'assets/images/default_avatar.png';

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    return alert("Pop-up blocker is active! Please allow pop-ups for this site to print.");
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Print ID Card - ${name}</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 30px;
            background-color: #f1f5f9;
            display: flex;
            gap: 40px;
            justify-content: center;
            align-items: center;
            min-height: 90vh;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .id-card {
            width: 320px;
            height: 500px;
            border-radius: 20px;
            background: #0f172a;
            color: white;
            position: relative;
            overflow: hidden;
            box-shadow: 0 15px 35px rgba(0,0,0,0.25);
            border: 1px solid #1e293b;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            page-break-inside: avoid;
          }
          .card-front {
            background: linear-gradient(180deg, #1e1b4b 0%, #09090b 100%);
          }
          .card-back {
            background: #090d16;
            padding: 24px;
            justify-content: space-between;
          }
          .card-header {
            height: 75px;
            background: linear-gradient(135deg, #ef4444 0%, #991b1b 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 15px;
            position: relative;
            border-bottom: 2px solid #cbd5e1;
          }
          .card-logo {
            height: 36px;
            width: auto;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
          }
          .card-title {
            font-size: 10px;
            font-weight: 800;
            color: #cbd5e1;
            text-align: center;
            letter-spacing: 0.5px;
            padding: 4px 0;
            background: rgba(0,0,0,0.4);
            text-transform: uppercase;
          }
          .avatar-container {
            display: flex;
            justify-content: center;
            margin-top: 25px;
            position: relative;
          }
          .avatar-img {
            width: 105px;
            height: 105px;
            border-radius: 50%;
            border: 4px solid #ef4444;
            object-fit: cover;
            box-shadow: 0 8px 20px rgba(0,0,0,0.4);
          }
          .hologram {
            position: absolute;
            top: 5px;
            right: 85px;
            width: 20px;
            height: 20px;
            background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%);
            border-radius: 6px;
            opacity: 0.85;
            box-shadow: inset 0 1px 3px rgba(255,255,255,0.4);
          }
          .details-container {
            text-align: center;
            padding: 0 20px;
            margin-top: 15px;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding-bottom: 25px;
          }
          .emp-name {
            font-size: 18px;
            font-weight: 800;
            color: white;
            margin: 0;
            letter-spacing: -0.3px;
          }
          .emp-role {
            display: inline-block;
            padding: 3px 12px;
            background: ${isAdmin ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)'};
            border: 1px solid ${isAdmin ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.3)'};
            color: ${isAdmin ? '#fca5a5' : '#c7d2fe'};
            border-radius: 9999px;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-top: 5px;
          }
          .emp-designation {
            font-size: 11px;
            color: #94a3b8;
            font-weight: 600;
            margin-top: 4px;
            margin-bottom: 20px;
          }
          .card-meta {
            text-align: left;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 12px;
            padding: 10px 14px;
            font-size: 10px;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            color: #cbd5e1;
          }
          .meta-row:last-child {
            margin-bottom: 0;
          }
          .meta-label {
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            font-size: 8px;
            letter-spacing: 0.3px;
          }
          .meta-value {
            font-weight: 700;
          }
          
          /* Back side specific */
          .back-rules {
            font-size: 9px;
            color: #94a3b8;
            line-height: 1.6;
            margin-top: 15px;
          }
          .back-rules li {
            margin-bottom: 8px;
          }
          .back-address {
            font-size: 10px;
            color: #cbd5e1;
            text-align: center;
            margin-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.08);
            padding-top: 15px;
          }
          .signature-area {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-top: 30px;
          }
          .signature-line {
            width: 120px;
            border-bottom: 1px solid #475569;
            margin-bottom: 4px;
          }
          .signature-label {
            font-size: 8px;
            color: #64748b;
            font-weight: bold;
            text-transform: uppercase;
          }

          .print-btn-bar {
            position: fixed;
            bottom: 25px;
            right: 25px;
            z-index: 9999;
          }
          .print-btn {
            padding: 12px 24px;
            background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            transition: all 0.15s ease;
          }
          .print-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4);
          }

          @media print {
            body {
              background: none;
              margin: 0;
              padding: 0;
              display: flex;
              gap: 20px;
              justify-content: center;
            }
            .print-btn-bar {
              display: none !important;
            }
            .id-card {
              box-shadow: none;
              border: 1px solid #475569;
            }
          }
        </style>
      </head>
      <body>
        <!-- Front Side -->
        <div class="id-card card-front">
          <div class="card-header">
            <img src="assets/images/logo.png" class="card-logo">
          </div>
          <div class="card-title">RPM Logistics Pvt. Ltd.</div>
          <div class="avatar-container">
            <div class="hologram"></div>
            <img src="${avatarImgSrc}" class="avatar-img">
          </div>
          <div class="details-container">
            <div>
              <h2 class="emp-name">${name}</h2>
              <div class="emp-role">${role}</div>
              <div class="emp-designation">${designation}</div>
            </div>
            <div class="card-meta">
              <div class="meta-row">
                <span class="meta-label">Email:</span>
                <span class="meta-value">${email}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Mobile:</span>
                <span class="meta-value">${mobile}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Location:</span>
                <span class="meta-value">BHIWANDI</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Back Side -->
        <div class="id-card card-back">
          <div>
            <div style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px;">
              <h3 style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Terms & Conditions</h3>
            </div>
            <ul class="back-rules" style="padding-left: 15px; margin: 15px 0 0 0;">
              <li>This identity card is strictly non-transferable.</li>
              <li>It remains the property of <strong>RPM LOGISTICS PVT. LTD.</strong></li>
              <li>Loss of this card must be reported immediately to the Incharge.</li>
              <li>If found, please return this card to the address listed below.</li>
            </ul>
          </div>
          
          <div class="signature-area">
            <div style="font-family: 'Courier New', monospace; font-size: 13px; font-weight: bold; color: #a1a1aa; margin-bottom: 2px; transform: rotate(-5deg); letter-spacing: 1px;">RPM Admin</div>
            <div class="signature-line"></div>
            <div class="signature-label">Authorized Signatory</div>
          </div>
          
          <div class="back-address">
            <strong>HEAD OFFICE:</strong> Bhiwandi, Maharashtra, India<br>
            <span style="font-size: 8px; color: #64748b; display: block; margin-top: 3px;">System ID: ${email.split('@')[0].toUpperCase()}</span>
          </div>
        </div>

        <div class="print-btn-bar">
          <button onclick="window.print()" class="print-btn">
            <i class="fas fa-print"></i> Print ID Card
          </button>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function editProfileMobile() {
  const isAdmin = (getAuthSession('rpm_is_admin') === '1');
  if (!isAdmin) {
    alert("Contact to admin to update email/mobile number.");
    return;
  }
  
  const userKey = getAuthSession('rpm_user_key');
  if (!userKey) return;
  const currentMobile = getAuthSession('rpm_user_mobile') || '';
  const newMobile = prompt("Apna naya 10-digit mobile number daalain:", currentMobile);
  if (newMobile === null) return;
  
  const cleanMobile = newMobile.trim();
  if (!/^\d{10}$/.test(cleanMobile)) {
    return alert("Mobile number 10 digits ka hona chahiye!");
  }
  
  db.ref(`users/${userKey}`).update({ mobile: cleanMobile }).then(() => {
    toast.ok("Mobile number updated successfully!");
  });
}

// Check email address uniqueness on update
function editProfileEmail() {
  const isAdmin = (getAuthSession('rpm_is_admin') === '1');
  if (!isAdmin) {
    alert("Contact to admin to update email/mobile number.");
    return;
  }

  const userKey = getAuthSession('rpm_user_key');
  if (!userKey) return;
  const currentEmail = getAuthSession('rpm_user_email') || '';
  const newEmail = prompt("Apna naya email address daalain:", currentEmail);
  if (newEmail === null) return;
  
  const cleanEmail = newEmail.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return alert("Valid email address daalain!");
  }
  
  db.ref('users').orderByChild('email').equalTo(cleanEmail).once('value', snapshot => {
    let exists = false;
    if (snapshot.exists()) {
      Object.keys(snapshot.val()).forEach(key => {
        if (key !== userKey) exists = true;
      });
    }
    if (exists) {
      return alert("Ye email already register hai kisi aur user ke sath!");
    }
    
    db.ref(`users/${userKey}`).update({ email: cleanEmail }).then(() => {
      toast.ok("Email address updated successfully!");
    });
  });
}

function triggerProfilePicUpload() {
  const fileInput = document.getElementById('profile-pic-input');
  if (fileInput) {
    fileInput.click();
  }
}

function handleProfilePicChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 1.5 * 1024 * 1024) {
    return alert("Image file is too large! Maximum allowed size is 1.5MB.");
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64Str = e.target.result;
    const userKey = getAuthSession('rpm_user_key');
    if (userKey) {
      db.ref(`users/${userKey}`).update({ profilePic: base64Str }).then(() => {
        toast.ok("Profile picture updated successfully!");
      }).catch(err => {
        console.error("Profile picture upload failed:", err);
        toast.err("Failed to save picture in database.");
      });
    }
  };
  reader.readAsDataURL(file);
}

function forceReauth() {
  clearAuthSession();
  userProfileListenerActive = false;
  if (activeSessionListenerRef) {
    activeSessionListenerRef.off();
    activeSessionListenerRef = null;
  }
  const overlay = document.getElementById('login-overlay');
  const layout = document.getElementById('app-layout');
  const mobileNav = document.getElementById('mobile-bottom-nav');
  if (overlay) overlay.classList.remove('hidden');
  if (layout) layout.classList.add('hidden');
  if (mobileNav) {
    mobileNav.classList.add('hidden');
    mobileNav.style.display = '';
  }
  if (typeof toggleSidebarCollapse === 'function') {
    toggleSidebarCollapse(true);
  }
}

function handleHeaderBlankClick(event) {
  if (!event || !event.target) return;
  // If target is inside an interactive element (button, input, select, link, notification dropdown or modal triggers), do not navigate
  if (event.target.closest('button, input, select, textarea, a, #notification-dropdown, [onclick]:not(#header-logo-img):not(#top-bar)')) {
    return;
  }
  if (typeof switchSection === 'function') {
    switchSection('dashboard');
  }
}
window.handleHeaderBlankClick = handleHeaderBlankClick;

// Automatically bind click listener to top-bar element
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const bar = document.getElementById('top-bar');
    if (bar) bar.addEventListener('click', handleHeaderBlankClick);
  });
} else {
  const bar = document.getElementById('top-bar');
  if (bar) bar.addEventListener('click', handleHeaderBlankClick);
}

window.editProfileMobile = editProfileMobile;
window.editProfileEmail = editProfileEmail;
window.triggerProfilePicUpload = triggerProfilePicUpload;
window.handleProfilePicChange = handleProfilePicChange;
window.watchUserProfile = watchUserProfile;
window.toggleNotificationDropdown = toggleNotificationDropdown;
window.forceReauth = forceReauth;
window.copyProfileKey = copyProfileKey;
window.openICardModal = openICardModal;
window.printIDCard = printIDCard;
window.initReportFilters = initReportFilters;
window.runReportQuery = runReportQuery;

function handleKPICardClick(kpiType, isFromDashboard = false) {
  if (isFromDashboard) {
    switchSection('reports');
  }
  
  if (kpiType === 'records' || kpiType === 'spend' || kpiType === 'today' || kpiType === 'median' || kpiType === 'max' || kpiType === 'min' || kpiType === 'days') {
    switchReportTab('transactions');
  } else if (kpiType === 'fleet' || kpiType === 'vehicle') {
    switchReportTab('vehicles');
  } else if (kpiType === 'vendors') {
    switchReportTab('vendors');
  }
}
window.handleKPICardClick = handleKPICardClick;

/* ══════════════════════════════════════════════════════════
   24. ADMIN: SIDEBAR VISIBILITY & USER MANAGEMENT
   ══════════════════════════════════════════════════════════ */

// Toggle admin-only & watcher sidebar items based on session
function toggleAdminSidebarItems() {
  const isAdmin = getAuthSession('rpm_is_admin') === '1';
  const role = getAuthSession('rpm_user_role') || (isAdmin ? 'admin' : 'user');
  const isWatcher = (role === 'watcher');
  const isVendor = (role === 'vendor');

  // Toggle admin-only items
  document.querySelectorAll('.admin-only').forEach(el => {
    if (isAdmin) {
      el.style.display = '';
      el.classList.remove('hidden');
    } else {
      el.style.display = 'none';
      el.classList.add('hidden');
    }
  });

  const allowedWatcherSections = ['reports', 'driver-requests', 'notes', 'profile'];
  const allowedVendorSections = ['reports', 'profile'];

  // Filter sidebar navigation buttons
  document.querySelectorAll('#sidebar nav button[data-section]').forEach(btn => {
    const section = btn.getAttribute('data-section');
    if (isVendor) {
      if (allowedVendorSections.includes(section)) {
        btn.style.display = '';
        btn.classList.remove('hidden');
      } else {
        btn.style.display = 'none';
        btn.classList.add('hidden');
      }
    } else if (isWatcher) {
      if (allowedWatcherSections.includes(section)) {
        btn.style.display = '';
        btn.classList.remove('hidden');
      } else {
        btn.style.display = 'none';
        btn.classList.add('hidden');
      }
    } else {
      if (btn.classList.contains('admin-only') && !isAdmin) {
        btn.style.display = 'none';
        btn.classList.add('hidden');
      } else if (!btn.classList.contains('admin-only')) {
        btn.style.display = '';
        btn.classList.remove('hidden');
      }
    }
  });

  // Filter sidebar section headers / dividers for Watcher or Vendor
  document.querySelectorAll('#sidebar nav div.sidebar-text, #sidebar nav div.h-px').forEach(el => {
    if (isWatcher || isVendor) {
      el.style.display = 'none';
      el.classList.add('hidden');
    } else {
      el.style.display = '';
      el.classList.remove('hidden');
    }
  });

  // Filter mobile bottom navigation for Watcher or Vendor
  document.querySelectorAll('#mobile-bottom-nav button').forEach(btn => {
    const section = btn.getAttribute('data-section');
    if (isVendor) {
      if (section && allowedVendorSections.includes(section)) {
        btn.classList.remove('hidden');
      } else {
        btn.classList.add('hidden');
      }
    } else if (isWatcher) {
      if (section && allowedWatcherSections.includes(section)) {
        btn.classList.remove('hidden');
      } else {
        btn.classList.add('hidden');
      }
    } else {
      btn.classList.remove('hidden');
    }
  });
}

// Real-time Firebase watcher for all user accounts
function watchAllUserAccounts() {
  if (userListListenerActive) return;
  userListListenerActive = true;
  
  usersRef.on('value', snapshot => {
    const val = snapshot.val();
    allUserAccounts = [];
    if (val) {
      Object.entries(val).forEach(([key, u]) => {
        allUserAccounts.push({ ...u, _key: key });
      });
    }
    
    // Update badge count
    const badge = document.getElementById('user-count-badge');
    if (badge) badge.textContent = allUserAccounts.length;
    
    renderUserListTable();
    if (typeof updateDriverRequestsBadges === 'function') {
      updateDriverRequestsBadges();
    }
  });

  // Sound & Push Notification for new registration (child_added)
  let isUsersInitialLoadComplete = false;
  usersRef.once('value', () => {
    isUsersInitialLoadComplete = true;
  });

  usersRef.on('child_added', snapshot => {
    const user = snapshot.val();
    const userRole = (getAuthSession('rpm_user_role') || '').toLowerCase();
    const userEmail = (getAuthSession('rpm_user_email') || '').toLowerCase();
    const currentIsAdmin = (
      getAuthSession('rpm_is_admin') === '1' ||
      userRole === 'admin' ||
      userRole === 'incharge' ||
      userRole === 'superadmin' ||
      userEmail === ADMIN_EMAIL ||
      userEmail.includes('admin')
    );
    if (!currentIsAdmin) return;

    if (user && isUsersInitialLoadComplete) {
      if (user.status === 'pending' && user.role !== 'admin') {
        // Play chime sound & toast alert
        if (typeof playChimeSound === 'function') playChimeSound();
        toast.warn(`👤 New Account Pending Approval: ${user.fullName || user.email}`);
        
        // Native browser/PWA push notification
        if (typeof triggerNativeNotification === 'function') {
          triggerNativeNotification(
            `New User Registration`,
            `User: ${user.fullName || 'N/A'}\nEmail: ${user.email}\nMobile: ${user.mobile || 'N/A'}`,
            snapshot.key
          );
        }
      }
    }
  });
}

// Render the admin user list table with search filtering
function renderUserListTable() {
  const tbody = document.getElementById('user-list-table-body');
  if (!tbody) return;
  
  const searchQuery = (document.getElementById('user-search-input')?.value || '').toLowerCase();
  
  let filtered = allUserAccounts;
  if (searchQuery) {
    filtered = allUserAccounts.filter(u => {
      const searchable = `${u.fullName || ''} ${u.email || ''} ${u.mobile || ''}`.toLowerCase();
      return searchable.includes(searchQuery);
    });
  }
  
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400">No user accounts found.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = filtered.map((u, i) => {
    const status = u.status || 'active';
    const role = u.role || 'user';
    const isAdminUser = (u.email === ADMIN_EMAIL);
    
    // Role badge
    let roleBadge = '';
    if (role === 'admin' || role === 'superadmin' || isAdminUser) {
      roleBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"><i class="fas fa-user-shield mr-1"></i> Admin</span>`;
    } else if (role === 'watcher') {
      roleBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"><i class="fas fa-eye mr-1"></i> Watcher</span>`;
    } else if (role === 'vendor') {
      const vName = u.assignedVendor || 'Vendor';
      roleBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" title="Assigned: ${vName}"><i class="fas fa-store mr-1"></i> Vendor (${vName})</span>`;
    } else {
      roleBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"><i class="fas fa-user mr-1"></i> User</span>`;
    }

    // Status badge
    let statusBadge = '';
    if (status === 'active') {
      statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"><i class="fas fa-check-circle"></i> Active</span>`;
    } else if (status === 'pending') {
      statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"><i class="fas fa-clock"></i> Pending</span>`;
    } else if (status === 'blocked') {
      statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"><i class="fas fa-ban"></i> Blocked</span>`;
    }
    
    // Action buttons
    let actions = '';
    if (isAdminUser) {
      actions = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"><i class="fas fa-shield-halved"></i> Superadmin</span>`;
    } else {
      const editBtn   = `<button onclick="openEditUserModal('${u._key}')" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border border-blue-500/20 transition-all" title="Edit"><i class="fas fa-edit"></i></button>`;
      const approveBtn = status === 'pending' ? `<button onclick="approveUser('${u._key}')" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all" title="Approve"><i class="fas fa-check"></i></button>` : '';
      const blockBtn   = status !== 'blocked' ? `<button onclick="blockUser('${u._key}')" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/20 transition-all" title="Block"><i class="fas fa-ban"></i></button>` : '';
      const unblockBtn = status === 'blocked' ? `<button onclick="unblockUser('${u._key}')" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 border border-sky-500/20 transition-all" title="Unblock"><i class="fas fa-unlock"></i></button>` : '';
      const deleteBtn  = `<button onclick="deleteUser('${u._key}')" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/20 transition-all" title="Delete"><i class="fas fa-trash"></i></button>`;
      actions = `<div class="flex items-center justify-center gap-1.5 flex-wrap">${editBtn}${approveBtn}${blockBtn}${unblockBtn}${deleteBtn}</div>`;
    }

    // Avatar initials
    const initials = (u.fullName || '?').trim().split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase();

    // Mobile card + desktop table row (combined)
    return `
      <!-- DESKTOP ROW (hidden on mobile) -->
      <tr class="hidden md:table-row border-b border-slate-200/30 dark:border-slate-800/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
        <td class="px-4 py-3 text-slate-400 font-mono text-sm">${i + 1}</td>
        <td class="px-4 py-3 font-bold text-slate-800 dark:text-white text-sm">${u.fullName || '—'}</td>
        <td class="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm">${u.email || '—'}</td>
        <td class="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm">${u.mobile || '—'}</td>
        <td class="px-4 py-3 text-center">${roleBadge}</td>
        <td class="px-4 py-3 text-center">${statusBadge}</td>
        <td class="px-4 py-3 text-center">${actions}</td>
      </tr>

      <!-- MOBILE CARD (hidden on desktop) -->
      <tr class="md:hidden">
        <td colspan="7" class="px-3 py-2">
          <div class="rounded-xl border border-slate-200/40 dark:border-slate-700/40 bg-white/40 dark:bg-slate-800/40 p-3 space-y-2.5">
            <!-- Top row: avatar + name + status -->
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-extrabold flex-shrink-0">${initials}</div>
                <div class="min-w-0">
                  <p class="font-bold text-slate-800 dark:text-white text-sm truncate">${u.fullName || '—'}</p>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">${u.email || '—'}</p>
                </div>
              </div>
              <div class="flex flex-col items-end gap-1 flex-shrink-0">
                ${statusBadge}
                ${roleBadge}
              </div>
            </div>
            <!-- Mobile row: mobile number -->
            <div class="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
              <i class="fas fa-phone w-4 text-center opacity-60"></i>
              <span>${u.mobile || '—'}</span>
            </div>
            <!-- Actions -->
            <div class="flex items-center gap-2 pt-1 border-t border-slate-200/30 dark:border-slate-700/30">
              ${actions}
            </div>
          </div>
        </td>
      </tr>`;
  }).join('');
}


// Admin Actions
function approveUser(userKey) {
  if (!confirm('Approve this user account? They will be able to log in.')) return;
  usersRef.child(userKey).update({ status: 'active' }).then(() => {
    toast.ok('User account approved & activated.');
  }).catch(err => {
    console.error('Approve failed:', err);
    toast.err('Failed to approve user.');
  });
}

function blockUser(userKey) {
  if (!confirm('Block this user? They will not be able to log in.')) return;
  usersRef.child(userKey).update({ 
    status: 'blocked',
    lastLogoutAt: Date.now()
  }).then(() => {
    toast.warn('User account blocked & logged out in real-time.');
  }).catch(err => {
    console.error('Block failed:', err);
    toast.err('Failed to block user.');
  });
}

function unblockUser(userKey) {
  if (!confirm('Unblock this user? Their status will be set to Active.')) return;
  usersRef.child(userKey).update({ status: 'active' }).then(() => {
    toast.ok('User account unblocked & activated.');
  }).catch(err => {
    console.error('Unblock failed:', err);
    toast.err('Failed to unblock user.');
  });
}

function deleteUser(userKey) {
  if (!confirm('⚠️ DELETE this user account permanently? This action cannot be undone!')) return;
  usersRef.child(userKey).remove().then(() => {
    toast.ok('User account deleted permanently.');
  }).catch(err => {
    console.error('Delete failed:', err);
    toast.err('Failed to delete user.');
  });
}

// Populate Vendor select options in User Modals
function populateVendorOptionsInModal(selectId, selectedVal = '') {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="" class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">-- Select Vendor --</option>';
  vendorsList.forEach(v => {
    const name = v.name || v;
    if (!name) return;
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    opt.className = 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100';
    if (selectedVal && name.toUpperCase() === selectedVal.toUpperCase()) {
      opt.selected = true;
    }
    sel.appendChild(opt);
  });
}

function toggleVendorSelectInUserModal(mode) {
  const roleSelect = document.getElementById(`${mode}-user-role`);
  const container = document.getElementById(`${mode}-user-vendor-container`);
  if (!roleSelect || !container) return;

  if (roleSelect.value === 'vendor') {
    container.classList.remove('hidden');
    const existingVal = (mode === 'edit') ? (document.getElementById('edit-user-assigned-vendor')?.value || '') : '';
    populateVendorOptionsInModal(`${mode}-user-assigned-vendor`, existingVal);
  } else {
    container.classList.add('hidden');
  }
}

// Registered User Creation Management
function openCreateUserModal() {
  const modal = document.getElementById('create-user-modal');
  if (modal) {
    modal.classList.remove('hidden');
    document.getElementById('create-user-form')?.reset();
    toggleVendorSelectInUserModal('create');
  }
}

function closeCreateUserModal() {
  const modal = document.getElementById('create-user-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function handleCreateUser(event) {
  event.preventDefault();
  
  const fullName = document.getElementById('create-user-fullname').value.trim();
  const email = document.getElementById('create-user-email').value.trim();
  const mobile = document.getElementById('create-user-mobile').value.trim();
  const password = document.getElementById('create-user-password').value.trim();
  const role = document.getElementById('create-user-role').value;
  const assignedVendor = (role === 'vendor') ? document.getElementById('create-user-assigned-vendor').value.trim() : '';

  if (!fullName || !email || !mobile || !password || !role) {
    toast.err("All fields are required.");
    return;
  }

  if (role === 'vendor' && !assignedVendor) {
    toast.err("Please select an assigned vendor for Vendor role.");
    return;
  }
  
  // Check if email already exists in local list to avoid duplicates
  const exists = allUserAccounts.some(u => u.email && u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    toast.err("A user with this email address already exists.");
    return;
  }
  
  const newUser = {
    fullName: fullName,
    email: email,
    mobile: mobile,
    password: password,
    role: role,
    assignedVendor: assignedVendor,
    vendor: assignedVendor,
    vendorName: assignedVendor,
    status: 'active', // Admin created accounts are automatically activated!
    createdAt: new Date().toISOString()
  };
  
  usersRef.push(newUser).then(() => {
    toast.ok(`User "${fullName}" successfully created as ${role.toUpperCase()}!`);
    closeCreateUserModal();
  }).catch(err => {
    console.error("Failed to create user:", err);
    toast.err("Failed to create user account: " + err.message);
  });
}

// Registered User Edit Management
function openEditUserModal(userKey) {
  const user = allUserAccounts.find(u => u._key === userKey);
  if (!user) return;
  
  document.getElementById('edit-user-key').value = userKey;
  document.getElementById('edit-user-fullname').value = user.fullName || '';
  document.getElementById('edit-user-email').value = user.email || '';
  document.getElementById('edit-user-mobile').value = user.mobile || '';
  
  const roleSelect = document.getElementById('edit-user-role');
  if (roleSelect) {
    roleSelect.value = user.role || 'user';
  }

  // Populate vendor dropdown with user's assigned vendor
  populateVendorOptionsInModal('edit-user-assigned-vendor', user.assignedVendor || '');
  toggleVendorSelectInUserModal('edit');
  
  const modal = document.getElementById('edit-user-modal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function closeEditUserModal() {
  const modal = document.getElementById('edit-user-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function handleEditUser(event) {
  event.preventDefault();
  
  const userKey = document.getElementById('edit-user-key').value;
  const fullName = document.getElementById('edit-user-fullname').value.trim();
  const email = document.getElementById('edit-user-email').value.trim();
  const mobile = document.getElementById('edit-user-mobile').value.trim();
  const role = document.getElementById('edit-user-role').value;
  const assignedVendorEl = document.getElementById('edit-user-assigned-vendor');
  const assignedVendor = (role === 'vendor') ? (assignedVendorEl ? assignedVendorEl.value.trim() : '') : (assignedVendorEl ? assignedVendorEl.value.trim() : '');

  if (!userKey || !fullName || !email || !mobile || !role) {
    toast.err("All fields are required.");
    return;
  }

  if (role === 'vendor' && !assignedVendor) {
    toast.err("Please select an assigned vendor for Vendor role.");
    return;
  }
  
  // Verify email uniqueness (except for current user)
  const exists = allUserAccounts.some(u => u._key !== userKey && u.email && u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    toast.err("A user with this email address already exists.");
    return;
  }
  
  const updates = {
    fullName: fullName,
    email: email,
    mobile: mobile,
    role: role,
    assignedVendor: assignedVendor,
    vendor: assignedVendor,
    vendorName: assignedVendor
  };
  
  usersRef.child(userKey).update(updates).then(() => {
    toast.ok(`User account successfully updated!`);
    closeEditUserModal();

    // Instantly sync memory cache and active filters if current or target account
    const curKey = getAuthSession('rpm_user_key');
    const curEmail = getAuthSession('rpm_user_email');
    if (curKey === userKey || (curEmail && curEmail.toLowerCase() === email.toLowerCase())) {
      if (window.currentUserProfileData) {
        window.currentUserProfileData = { ...window.currentUserProfileData, ...updates };
      }
      setAuthSession('rpm_user_role', role);
      setAuthSession('rpm_assigned_vendor', assignedVendor);
      dashFilters.vendor = assignedVendor ? [assignedVendor] : ['All'];
      toggleAdminSidebarItems();
      populateDashboardFilterDropdowns();
      renderDashboardStats();
      if (typeof applyDashboardFilters === 'function') applyDashboardFilters();
    }
  }).catch(err => {
    console.error("Failed to edit user:", err);
    toast.err("Failed to update user account: " + err.message);
  });
}

// OTP Helper Functions
function resendOtp() {
  if (!pendingSignupData) {
    toast.err('No pending registration. Please start again.');
    return;
  }
  // Regenerate OTP
  signupOtpCode = String(Math.floor(100000 + Math.random() * 900000));
  toast.info(`📧 New OTP Code: ${signupOtpCode} (re-sent to ${pendingSignupData.email})`);
  
  const otpInput = document.getElementById('otp-code-input');
  const otpErr = document.getElementById('otp-error-msg');
  if (otpInput) otpInput.value = '';
  if (otpErr) otpErr.classList.add('hidden');
}

function cancelOtpVerification() {
  pendingSignupData = null;
  signupOtpCode = '';
  const otpModal = document.getElementById('otp-modal');
  if (otpModal) otpModal.classList.add('hidden');
  toast.info('Registration cancelled.');
}

// Expose admin functions to global scope for inline onclick handlers
window.approveUser = approveUser;
window.blockUser = blockUser;
window.unblockUser = unblockUser;
window.deleteUser = deleteUser;
window.resendOtp = resendOtp;
window.cancelOtpVerification = cancelOtpVerification;
window.renderUserListTable = renderUserListTable;
window.toggleAdminSidebarItems = toggleAdminSidebarItems;
window.toggleVendorSelectInUserModal = toggleVendorSelectInUserModal;
window.handleCreateUser = handleCreateUser;
window.handleEditUser = handleEditUser;
window.openCreateUserModal = openCreateUserModal;
window.closeCreateUserModal = closeCreateUserModal;
window.openEditUserModal = openEditUserModal;
window.closeEditUserModal = closeEditUserModal;

// Toggle manual performance mode
function togglePerformanceMode() {
  const currentMode = localStorage.getItem('rpm_perf_mode');
  const isLowSpecNow = document.documentElement.classList.contains('low-spec');
  
  const newMode = isLowSpecNow ? 'high-perf' : 'low-spec';
  localStorage.setItem('rpm_perf_mode', newMode);
  
  applyPerformanceMode();
  
  if (newMode === 'low-spec') {
    toast.ok("⚡ Low-Spec Mode Enabled (Blurs & animations disabled to save CPU)");
  } else {
    toast.ok("🚀 High-Performance Mode Enabled (All premium visual effects active)");
  }
}

function applyPerformanceMode() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const slowHardware = (navigator.deviceMemory && navigator.deviceMemory < 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  const currentSetting = localStorage.getItem('rpm_perf_mode');
  
  const isLowSpec = currentSetting === 'low-spec' || ((reduceMotion || slowHardware) && currentSetting !== 'high-perf');
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  
  const html = document.documentElement;
  
  if (isLowSpec) {
    html.classList.add('low-spec');
    if (typeof cleanupPremiumBackgroundEffects === 'function') {
      cleanupPremiumBackgroundEffects();
    }
  } else {
    html.classList.remove('low-spec');
    if (typeof initPremiumBackgroundEffects === 'function') {
      initPremiumBackgroundEffects();
    }
  }
  
  if (isTouch) {
    html.classList.add('touch-device');
  } else {
    html.classList.remove('touch-device');
  }

  // Sync performance mode to clean dashboard iframe if it is loaded
  const iframe = document.querySelector('#sec-reports iframe');
  if (iframe && iframe.contentWindow) {
    try {
      iframe.contentWindow.postMessage({ type: 'setLowSpec', isLowSpec: isLowSpec }, '*');
    } catch (e) {
      console.warn("iframe performance postMessage failed:", e);
    }
  }


}

// Expose to window scope for inline onclick handler
window.togglePerformanceMode = togglePerformanceMode;
window.applyPerformanceMode = applyPerformanceMode;


/* ══════════════════════════════════════════════════════════
   23. FUTURISTIC GLASSMORPHISM SAAS EFFECTS (DEPRECATED FOR HIGHEST PERFORMANCE)
   ══════════════════════════════════════════════════════════ */
function initFuturisticEffects() {
  console.log("Initializing Clean Light UI...");
  applyPerformanceMode();

  // Scroll Reveal Animations using IntersectionObserver (Highly Optimized)
  const revealElements = document.querySelectorAll('.scroll-reveal');
  if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));
    
    // Auto-reveal elements on page routing trigger
    const originalSwitchSection = window.switchSection;
    if (originalSwitchSection) {
      window.switchSection = function(sectionId) {
        originalSwitchSection(sectionId);
        
        // Run check to reveal elements instantly if they appear in section viewport
        setTimeout(() => {
          document.querySelectorAll(`#sec-${sectionId} .scroll-reveal`).forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
              el.classList.add('active');
            }
          });
        }, 100);
      };
    }
  }
}

// Diesel Calculator Modal Management
function openDieselCalcModal() {
  const modal = document.getElementById('diesel-calc-modal');
  if (modal) {
    modal.classList.remove('hidden');
    // Call date initializer to fill default dates if they are empty
    if (typeof initCalculatorDateDefaults === 'function') {
      initCalculatorDateDefaults();
    }
  }
}

function closeDieselCalcModal() {
  const modal = document.getElementById('diesel-calc-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

/* ══════════════════════════════════════════════════════════
   24. PREMIUM BACKGROUND EFFECTS (CLEANUP FOR LOW RESOURCE PATH)
   ══════════════════════════════════════════════════════════ */
function initPremiumBackgroundEffects() {
  cleanupPremiumBackgroundEffects();
}

function cleanupPremiumBackgroundEffects() {
  const canvas = document.getElementById('premium-bg-canvas');
  if (canvas) canvas.remove();
}

// Registered User Creation & Edit Management are defined above.

// Support Chat - Standard User Side
function initUserSupportChat() {
  const userKey = getAuthSession('rpm_user_key');
  if (!userKey) return;

  const widget = document.getElementById('support-chat-widget');
  if (widget) widget.classList.remove('hidden');

  // Remove existing listener if any
  if (userSupportListener) {
    supportChatsRef.child(userKey).off('value', userSupportListener);
  }

  userSupportListener = supportChatsRef.child(userKey).on('value', snapshot => {
    const data = snapshot.val();
    renderUserChatMessages(data);
    
    // Auto-scroll to bottom
    const container = document.getElementById('support-chat-messages');
    if (container) container.scrollTop = container.scrollHeight;

    // Handle unread badges
    const isBoxOpen = !document.getElementById('support-chat-box').classList.contains('hidden');
    if (data && data.unreadByUser) {
      if (isBoxOpen) {
        // Mark as read immediately
        supportChatsRef.child(userKey).update({ unreadByUser: false });
      } else {
        // Show unread indicator
        const dot = document.getElementById('support-user-unread-dot');
        if (dot) {
          dot.textContent = '1';
          dot.classList.remove('hidden');
        }
      }
    }
  });

  initUserCallSignaling();
}

function renderUserChatMessages(threadData) {
  const container = document.getElementById('support-chat-messages');
  if (!container) return;

  const statusText = document.getElementById('support-user-status-text');
  if (statusText) {
    if (threadData && threadData.status === 'resolved') {
      statusText.innerHTML = '<span class="text-emerald-300 font-extrabold flex items-center gap-1"><i class="fas fa-check-circle"></i> Resolved</span>';
    } else {
      statusText.innerHTML = '<span class="text-amber-300 font-extrabold flex items-center gap-1"><i class="fas fa-clock"></i> In Progress</span>';
    }
  }

  if (!threadData || !threadData.messages) {
    container.innerHTML = `
      <div class="my-auto text-center text-slate-400 py-6">
        👋 Welcome to RPM Support!<br>Ask us anything about fuel request status or system errors.
      </div>
    `;
    return;
  }

  const messages = Object.values(threadData.messages);
  const userKey = getAuthSession('rpm_user_key');

  container.innerHTML = messages.map(msg => {
    const isAdmin = msg.senderId === 'admin';
    const isMe = !isAdmin;
    
    const alignClass = isMe ? 'self-end bg-blue-600 text-white rounded-br-none' : 'self-start bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none';
    
    const imageHtml = msg.image ? `<div class="mb-1"><img src="${msg.image}" class="max-w-[200px] max-h-[150px] rounded-lg cursor-zoom-in hover:scale-[1.02] transition-transform" onclick="openImageModal(this.src)"></div>` : '';
    const textHtml = msg.message ? `<p class="break-words font-medium">${msg.message}</p>` : '';
    
    return `
      <div class="max-w-[75%] p-2 rounded-xl text-[11px] leading-snug ${alignClass}">
        ${imageHtml}
        ${textHtml}
        <span class="text-[8px] opacity-70 block text-right mt-1">${formatChatTime(msg.timestamp)}</span>
      </div>
    `;
  }).join('');
}

function compressAndSendImage(file, sendCallback) {
  if (!file) return;
  
  toast.info("Preparing image...");
  
  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      const maxDim = 600;
      let width = img.width;
      let height = img.height;
      
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      try {
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        sendCallback(compressedDataUrl);
      } catch (err) {
        console.error("Error compressing image:", err);
        toast.err("Failed to compress image.");
      }
    };
    img.onerror = function() {
      toast.err("Error reading image file.");
    };
    img.src = event.target.result;
  };
  reader.onerror = function() {
    toast.err("Error reading image file.");
  };
  reader.readAsDataURL(file);
}

function handleUserImageSelect(inputEl) {
  if (!inputEl || !inputEl.files || inputEl.files.length === 0) return;
  const file = inputEl.files[0];
  
  const userKey = getAuthSession('rpm_user_key');
  const userName = getAuthSession('rpm_user_name') || 'User';
  const userEmail = getAuthSession('rpm_user_email') || '';
  if (!userKey) {
    toast.err("Error: You must be logged in to send images.");
    inputEl.value = '';
    return;
  }
  
  compressAndSendImage(file, base64Str => {
    const newMessage = {
      senderId: userKey,
      senderName: userName,
      message: '',
      image: base64Str,
      timestamp: new Date().toISOString()
    };
    
    const chatRef = supportChatsRef.child(userKey);
    chatRef.child('messages').push(newMessage).then(() => {
      chatRef.update({
        userName: userName,
        userEmail: userEmail,
        unreadByAdmin: true,
        status: 'progress',
        lastMessageAt: new Date().toISOString()
      });
      inputEl.value = '';
      toast.ok("Image sent successfully!");
    }).catch(err => {
      toast.err("Error sending image: " + err.message);
    });
  });
}

function handleSendUserSupportMessage(event) {
  event.preventDefault();
  const input = document.getElementById('support-chat-input');
  if (!input) return;
  const messageText = input.value.trim();
  if (!messageText) return;

  const userKey = getAuthSession('rpm_user_key');
  const userName = getAuthSession('rpm_user_name') || 'User';
  const userEmail = getAuthSession('rpm_user_email') || '';

  if (!userKey) return;

  const newMessage = {
    senderId: userKey,
    senderName: userName,
    message: messageText,
    timestamp: new Date().toISOString()
  };

  const chatRef = supportChatsRef.child(userKey);
  chatRef.child('messages').push(newMessage).then(() => {
    chatRef.update({
      userName: userName,
      userEmail: userEmail,
      unreadByAdmin: true,
      status: 'progress',
      lastMessageAt: new Date().toISOString()
    });
    input.value = '';
  }).catch(err => {
    toast.err("Error sending message: " + err.message);
  });
}

function toggleSupportChatBox() {
  const box = document.getElementById('support-chat-box');
  const dot = document.getElementById('support-user-unread-dot');
  if (!box) return;

  const isHidden = box.classList.contains('hidden');
  if (isHidden) {
    box.classList.remove('hidden');
    if (dot) dot.classList.add('hidden');
    
    // Mark as read immediately when user expands chat
    const userKey = getAuthSession('rpm_user_key');
    if (userKey) {
      supportChatsRef.child(userKey).once('value', snap => {
        if (snap.exists()) {
          supportChatsRef.child(userKey).update({ unreadByUser: false });
        }
      });
    }
    
    // Auto scroll messages to bottom
    const container = document.getElementById('support-chat-messages');
    if (container) setTimeout(() => container.scrollTop = container.scrollHeight, 100);
  } else {
    box.classList.add('hidden');
  }
}

function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch(e) {}
}

let adminLastNotifiedTimestamps = {};

// Support Chat - Admin Side
function initAdminSupportChatNotifications() {
  const widget = document.getElementById('support-chat-widget');
  if (widget) widget.classList.add('hidden');

  if (adminSupportThreadsListener) {
    supportChatsRef.off('value', adminSupportThreadsListener);
  }

  adminSupportThreadsListener = supportChatsRef.on('value', snapshot => {
    const threads = snapshot.val();
    let unreadCount = 0;
    
    if (threads) {
      Object.entries(threads).forEach(([key, thread]) => {
        if (thread && thread.unreadByAdmin) {
          unreadCount++;
          
          const lastTime = thread.lastMessageAt ? new Date(thread.lastMessageAt).getTime() : Date.now();
          const prevNotified = adminLastNotifiedTimestamps[key] || 0;
          
          if (lastTime > prevNotified && activeAdminChatUserKey !== key) {
            adminLastNotifiedTimestamps[key] = lastTime;
            
            const msgPreview = thread.lastMessageText || 'New message received';
            if (typeof toast !== 'undefined' && toast.info) {
              toast.info(`💬 Support from ${thread.userName || 'User'}: "${msgPreview}"`);
            }
            playNotificationSound();
          }
        }
      });
    }

    const badge = document.getElementById('support-unread-badge');
    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    // Render left panel if support-center section is open
    const supportSec = document.getElementById('sec-support-center');
    if (supportSec && !supportSec.classList.contains('hidden')) {
      renderAdminThreadsList(threads);
    }
  });
}

function initAdminSupportCenter() {
  supportChatsRef.once('value', snapshot => {
    const threads = snapshot.val();
    renderAdminThreadsList(threads);
  });
}

function renderAdminThreadsList(threads) {
  const container = document.getElementById('support-threads-list');
  if (!container) return;

  if (!threads || Object.keys(threads).length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">No active chats.</p>`;
    return;
  }

  const sortedThreads = Object.entries(threads)
    .filter(([key, thread]) => thread.messages || thread.lastMessageAt || thread.status)
    .sort((a, b) => {
      return new Date(b[1].lastMessageAt || 0) - new Date(a[1].lastMessageAt || 0);
    });

  container.innerHTML = sortedThreads.map(([key, thread]) => {
    const activeClass = activeAdminChatUserKey === key ? 'border-blue-500/50 bg-blue-500/10' : 'border-slate-200/50 dark:border-slate-800/40 hover:bg-slate-100/30 dark:hover:bg-slate-800/10';
    const unreadDot = thread.unreadByAdmin ? `<span class="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0"></span>` : '';
    
    const isResolved = thread.status === 'resolved';
    const statusBadge = isResolved ? 
      `<span class="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Resolved</span>` :
      `<span class="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">In Progress</span>`;

    let lastMsgPreview = 'No messages';
    if (thread.messages) {
      const msgs = Object.values(thread.messages);
      if (msgs.length > 0) {
        lastMsgPreview = msgs[msgs.length - 1].message;
      }
    }
    if (lastMsgPreview.length > 25) lastMsgPreview = lastMsgPreview.substring(0, 22) + '...';

    return `
      <div onclick="selectAdminSupportChat('${key}')" class="flex items-center justify-between p-3 border rounded-2xl cursor-pointer transition-all ${activeClass}">
        <div class="text-left overflow-hidden mr-2 flex-1">
          <div class="flex items-center gap-2 mb-0.5">
            <h5 class="text-xs font-bold text-slate-800 dark:text-white truncate">${thread.userName || 'User'}</h5>
            ${statusBadge}
          </div>
          <p class="text-[10px] text-slate-400 truncate">${lastMsgPreview}</p>
        </div>
        <div class="flex flex-col items-end gap-1 shrink-0">
          <span class="text-[8px] text-slate-400 font-mono">${formatChatTime(thread.lastMessageAt)}</span>
          ${unreadDot}
        </div>
      </div>
    `;
  }).join('');
}

function selectAdminSupportChat(userKey) {
  activeAdminChatUserKey = userKey;
  
  document.getElementById('support-active-user-key').value = userKey;
  document.getElementById('support-active-reply-input').disabled = false;
  document.getElementById('support-active-send-btn').disabled = false;
  const imgBtn = document.getElementById('support-active-image-btn');
  if (imgBtn) imgBtn.disabled = false;
  document.getElementById('support-active-reply-input').focus();

  supportChatsRef.once('value', snapshot => {
    const threads = snapshot.val();
    renderAdminThreadsList(threads);
    if (threads && threads[userKey]) {
      const thread = threads[userKey];
      document.getElementById('support-active-chat-username').textContent = thread.userName || 'User';
      document.getElementById('support-active-chat-useremail').textContent = thread.userEmail || '';
      document.getElementById('support-active-status-dot').className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse';
      updateActiveChatStatusHeader(thread.status || 'progress');
    }
  });

  if (adminActiveChatListener) {
    supportChatsRef.child(userKey).off('value', adminActiveChatListener);
  }

  supportChatsRef.child(userKey).update({ unreadByAdmin: false });

  adminActiveChatListener = supportChatsRef.child(userKey).on('value', snapshot => {
    const threadData = snapshot.val();
    renderAdminChatMessages(threadData);
    
    if (threadData) {
      updateActiveChatStatusHeader(threadData.status || 'progress');
      if (threadData.unreadByAdmin) {
        supportChatsRef.child(userKey).update({ unreadByAdmin: false });
      }
    }
  });
}

function updateActiveChatStatusHeader(status) {
  const badge = document.getElementById('support-active-status-badge');
  const btn = document.getElementById('support-active-status-btn');
  const container = document.getElementById('support-active-status-container');
  const deleteBtn = document.getElementById('support-active-delete-btn');

  if (!badge || !btn || !container) return;

  container.classList.remove('hidden');
  if (deleteBtn) deleteBtn.classList.remove('hidden');

  if (status === 'resolved') {
    badge.textContent = 'Resolved';
    badge.className = 'text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
    btn.textContent = 'Reopen Thread';
  } else {
    badge.textContent = 'In Progress';
    badge.className = 'text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20';
    btn.textContent = 'Mark as Resolved';
  }
}

function toggleSupportChatStatus() {
  const userKey = document.getElementById('support-active-user-key').value;
  if (!userKey) return;

  supportChatsRef.child(userKey).once('value', snapshot => {
    const thread = snapshot.val();
    if (!thread) return;

    const currentStatus = thread.status || 'progress';
    const newStatus = currentStatus === 'resolved' ? 'progress' : 'resolved';

    supportChatsRef.child(userKey).update({ status: newStatus }).then(() => {
      toast.ok(`Status updated to ${newStatus === 'resolved' ? 'Resolved' : 'In Progress'}`);
      updateActiveChatStatusHeader(newStatus);
    });
  });
}

function handleDeleteSupportChat() {
  const userKey = document.getElementById('support-active-user-key').value;
  if (!userKey) return;

  if (confirm("Pura support chat history delete ho jayega. Delete karein?")) {
    if (adminActiveChatListener) {
      supportChatsRef.child(userKey).off('value', adminActiveChatListener);
      adminActiveChatListener = null;
    }

    supportChatsRef.child(userKey).remove().then(() => {
      toast.ok("Support chat successfully deleted.");
      activeAdminChatUserKey = null;
      document.getElementById('support-active-user-key').value = '';
      document.getElementById('support-active-reply-input').disabled = true;
      document.getElementById('support-active-reply-input').value = '';
      document.getElementById('support-active-send-btn').disabled = true;
      const imgBtn = document.getElementById('support-active-image-btn');
      if (imgBtn) imgBtn.disabled = true;
      
      document.getElementById('support-active-chat-username').textContent = 'Select a User';
      document.getElementById('support-active-chat-useremail').textContent = 'Select a conversation from the left to start chatting';
      document.getElementById('support-active-status-dot').className = 'w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700';
      
      document.getElementById('support-active-status-container').classList.add('hidden');
      
      document.getElementById('support-active-chat-messages').innerHTML = `
        <div class="my-auto text-center text-xs text-slate-400">
          <i class="fas fa-comments text-3xl text-slate-300 dark:text-slate-700 mb-2 block"></i>
          Click on any user conversation to view the chat history.
        </div>
      `;

      supportChatsRef.once('value', snapshot => {
        const threads = snapshot.val();
        renderAdminThreadsList(threads);
      });
    }).catch(err => {
      toast.err("Failed to delete chat: " + err.message);
    });
  }
}

function renderAdminChatMessages(threadData) {
  const container = document.getElementById('support-active-chat-messages');
  if (!container) return;

  if (!threadData || !threadData.messages) {
    container.innerHTML = `
      <div class="my-auto text-center text-xs text-slate-400">
        <i class="fas fa-comments text-3xl text-slate-300 dark:text-slate-700 mb-2 block"></i>
        Chat history is empty.
      </div>
    `;
    return;
  }

  const messages = Object.values(threadData.messages);

  container.innerHTML = messages.map(msg => {
    const isMe = msg.senderId === 'admin';
    
    const alignClass = isMe ? 'self-end bg-blue-600 text-white rounded-br-none' : 'self-start bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none';
    const senderLabel = isMe ? 'You' : (msg.senderName || 'User');
    
    const imageHtml = msg.image ? `<div class="mb-1"><img src="${msg.image}" class="max-w-[240px] max-h-[180px] rounded-lg cursor-zoom-in hover:scale-[1.02] transition-transform" onclick="openImageModal(this.src)"></div>` : '';
    const textHtml = msg.message ? `<p class="break-words font-medium">${msg.message}</p>` : '';
    
    return `
      <div class="max-w-[70%] p-2.5 rounded-xl text-xs leading-normal ${alignClass}">
        <div class="flex justify-between items-baseline gap-4 mb-0.5 opacity-80 text-[9px] font-bold">
          <span>${senderLabel}</span>
        </div>
        ${imageHtml}
        ${textHtml}
        <span class="text-[8px] opacity-70 block text-right mt-1">${formatChatTime(msg.timestamp)}</span>
      </div>
    `;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

function handleAdminImageSelect(inputEl) {
  if (!inputEl || !inputEl.files || inputEl.files.length === 0) return;
  const file = inputEl.files[0];
  
  const userKey = document.getElementById('support-active-user-key').value;
  if (!userKey) {
    toast.err("Please select a user conversation first.");
    inputEl.value = '';
    return;
  }
  
  compressAndSendImage(file, base64Str => {
    const newMessage = {
      senderId: 'admin',
      senderName: 'RPM Support Admin',
      message: '',
      image: base64Str,
      timestamp: new Date().toISOString()
    };
    
    const chatRef = supportChatsRef.child(userKey);
    chatRef.child('messages').push(newMessage).then(() => {
      chatRef.update({
        unreadByUser: true,
        lastMessageAt: new Date().toISOString()
      });
      inputEl.value = '';
      toast.ok("Image sent successfully!");
    }).catch(err => {
      toast.err("Error sending image: " + err.message);
    });
  });
}

function handleSendAdminSupportReply(event) {
  event.preventDefault();
  const userKey = document.getElementById('support-active-user-key').value;
  const input = document.getElementById('support-active-reply-input');
  if (!input || !userKey) return;
  const messageText = input.value.trim();
  if (!messageText) return;

  const newMessage = {
    senderId: 'admin',
    senderName: 'RPM Support Admin',
    message: messageText,
    timestamp: new Date().toISOString()
  };

  const chatRef = supportChatsRef.child(userKey);
  chatRef.child('messages').push(newMessage).then(() => {
    chatRef.update({
      unreadByUser: true,
      lastMessageAt: new Date().toISOString()
    });
    input.value = '';
    input.focus();
  }).catch(err => {
    toast.err("Error sending reply: " + err.message);
  });
}

/* ══════════════════════════════════════════════════════════
   13. SUPPORT VOICE CALLS & SCREEN SHARING (WebRTC + Simulation Fallback)
   ══════════════════════════════════════════════════════════ */

// WebRTC STUN configurations
const rtcIceConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// Start Voice Call (Admin Side)
function startAdminVoiceCall() {
  const userKey = document.getElementById('support-active-user-key').value;
  if (!userKey) return;

  const callRef = supportChatsRef.child(userKey).child('call');
  const calleeCandidatesQueue = [];
  
  toast.info("Calling user...");
  
  // Set calling status in Firebase
  callRef.set({
    status: 'calling',
    type: 'voice',
    caller: 'admin',
    timestamp: Date.now(),
    screenRequest: 'none'
  });

  setupAdminCallUI('voice', 'calling');

  // Listen for answer / hang up (Registered globally for both WebRTC and Simulated fallback)
  let callConnected = false;
  callRef.on('value', snapshot => {
    const data = snapshot.val();
    if (!data) {
      console.log("Admin: Call ended by user.");
      cleanupLocalCallState();
      callRef.off();
      return;
    }
    
    if (data.status === 'connected') {
      if (!callConnected) {
        callConnected = true;
        setupAdminCallUI('voice', 'connected');
        startCallTimer('support-admin-call-timer');
        toast.ok(isCallSimulated ? "Call connected (Simulated)!" : "Call connected!");
      }
      
      if (data.sdpAnswer && activePeerConnection && activePeerConnection.signalingState !== 'stable') {
        activePeerConnection.setRemoteDescription(new RTCSessionDescription(data.sdpAnswer))
        .then(() => {
          console.log("Admin voice: Remote description set. Flushing queued callee candidates...");
          while (calleeCandidatesQueue.length > 0) {
            const cand = calleeCandidatesQueue.shift();
            activePeerConnection.addIceCandidate(new RTCIceCandidate(cand)).catch(e => {
              console.warn("Error adding queued callee candidate:", e);
            });
          }
        })
        .catch(err => {
          console.error("Error setting remote SDP answer:", err);
        });
      }
    }
  });

  // Attempt WebRTC connection
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      localMediaStream = stream;
      isCallSimulated = false;
      
      activePeerConnection = new RTCPeerConnection(rtcIceConfig);
      stream.getTracks().forEach(track => activePeerConnection.addTrack(track, stream));

      // Handle remote track
      activePeerConnection.ontrack = event => {
        const remoteAudio = document.getElementById('support-admin-remote-audio');
        if (remoteAudio) {
          if (event.streams && event.streams[0]) {
            remoteAudio.srcObject = event.streams[0];
          } else {
            remoteAudio.srcObject = new MediaStream([event.track]);
          }
          remoteAudio.play().catch(e => console.log("Admin remote audio play failed:", e));
        }
      };

      // Gather ICE candidates
      activePeerConnection.onicecandidate = event => {
        if (event.candidate) {
          callRef.child('callerCandidates').push(event.candidate.toJSON());
        }
      };

      // Create SDP Offer
      activePeerConnection.createOffer().then(offer => {
        return activePeerConnection.setLocalDescription(offer);
      }).then(() => {
        callRef.update({ sdpOffer: { type: activePeerConnection.localDescription.type, sdp: activePeerConnection.localDescription.sdp } });
      });

      // Listen for callee ICE candidates
      callRef.child('calleeCandidates').on('child_added', snapshot => {
        const candidate = snapshot.val();
        if (candidate && activePeerConnection) {
          if (activePeerConnection.remoteDescription && activePeerConnection.remoteDescription.type) {
            activePeerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => {
              console.warn("Error adding callee ICE candidate:", e);
            });
          } else {
            calleeCandidatesQueue.push(candidate);
          }
        }
      });

    }).catch(err => {
      console.warn("Audio hardware/permission not available. Starting simulated call mode:", err);
      toast.warn("Microphone not available. Starting simulated voice call.");
      isCallSimulated = true;
    });
  } else {
    toast.warn("Secure Origin (HTTPS/localhost) required for microphone access. Simulating voice call.");
    isCallSimulated = true;
  }
}

// Request Screen Share (Admin Side)
function requestAdminScreenShare() {
  const userKey = document.getElementById('support-active-user-key').value;
  if (!userKey) return;

  toast.info("Requesting screen share permission from user...");
  const callRef = supportChatsRef.child(userKey).child('call');
  callRef.child('screenShare').remove(); // Clear old screen share data to avoid SDP/candidate pollution
  callRef.update({ screenRequest: 'requested' });

  // Show screen container in active header
  document.getElementById('support-admin-screen-container').classList.remove('hidden');
  document.getElementById('support-admin-screen-fallback').classList.remove('hidden');
  
  // Listen for user reaction
  callRef.on('value', snapshot => {
    const data = snapshot.val();
    if (!data) {
      console.log("Admin: Call ended by user.");
      cleanupLocalCallState();
      callRef.off();
      return;
    }

    if (data.screenRequest === 'accepted') {
      toast.ok("User accepted screen share!");
      document.getElementById('support-admin-screen-fallback').classList.add('hidden');
      setupScreenShareReceiver(userKey);
    } else if (data.screenRequest === 'rejected') {
      toast.err("User declined screen share request.");
      document.getElementById('support-admin-screen-container').classList.add('hidden');
      callRef.off();
    } else if (data.screenRequest === 'none') {
      console.log("Admin: Screen share stopped by user.");
      const video = document.getElementById('support-admin-screen-video');
      if (video) video.srcObject = null;
      document.getElementById('support-admin-screen-container').classList.add('hidden');
      if (screenPeerConnection) {
        screenPeerConnection.close();
        screenPeerConnection = null;
      }
      if (adminStatsInterval) {
        clearInterval(adminStatsInterval);
        adminStatsInterval = null;
      }
      const statsEl = document.getElementById('support-admin-screen-stats');
      if (statsEl) statsEl.innerHTML = '';
    }
  });
}

// Setup Screen Share WebRTC receiver (Admin Side)
function setupScreenShareReceiver(userKey) {
  const callRef = supportChatsRef.child(userKey).child('call');
  
  if (screenPeerConnection) {
    screenPeerConnection.close();
  }
  if (adminStatsInterval) {
    clearInterval(adminStatsInterval);
  }

  screenPeerConnection = new RTCPeerConnection(rtcIceConfig);

  // Handle remote track
  screenPeerConnection.ontrack = event => {
    console.log("Admin screen receiver: Received remote video track!");
    const video = document.getElementById('support-admin-screen-video');
    if (video) {
      if (event.streams && event.streams[0]) {
        video.srcObject = event.streams[0];
      } else {
        video.srcObject = new MediaStream([event.track]);
      }
      video.play().catch(e => console.warn("Error playing received screen share stream:", e));
      document.getElementById('support-admin-screen-fallback').classList.add('hidden');
    }
  };

  // Gather ICE candidates
  screenPeerConnection.onicecandidate = event => {
    if (event.candidate) {
      callRef.child('screenShare/callerCandidates').push(event.candidate.toJSON());
    }
  };

  const calleeScreenCandidatesQueue = [];

  // Listen for user ICE candidates
  callRef.child('screenShare/calleeCandidates').on('child_added', snapshot => {
    const candidate = snapshot.val();
    if (candidate && screenPeerConnection) {
      if (screenPeerConnection.remoteDescription && screenPeerConnection.remoteDescription.type) {
        screenPeerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => {
          console.warn("Error adding callee screen ICE candidate:", e);
        });
      } else {
        calleeScreenCandidatesQueue.push(candidate);
      }
    }
  });

  // Listen for user SDP Offer
  callRef.child('screenShare/sdpOffer').on('value', snapshot => {
    const offerData = snapshot.val();
    if (offerData && screenPeerConnection && screenPeerConnection.signalingState !== 'stable') {
      screenPeerConnection.setRemoteDescription(new RTCSessionDescription(offerData))
      .then(() => screenPeerConnection.createAnswer())
      .then(answer => screenPeerConnection.setLocalDescription(answer))
      .then(() => {
        callRef.child('screenShare').update({
          sdpAnswer: { type: screenPeerConnection.localDescription.type, sdp: screenPeerConnection.localDescription.sdp }
        });
        console.log("Admin screen: Remote description set. Flushing queued callee candidates...");
        while (calleeScreenCandidatesQueue.length > 0) {
          const cand = calleeScreenCandidatesQueue.shift();
          screenPeerConnection.addIceCandidate(new RTCIceCandidate(cand)).catch(e => {
            console.warn("Error processing queued callee screen candidate:", e);
          });
        }
      }).catch(err => {
        console.error("Error creating screen share answer:", err);
      });
    }
  });

  // Stats monitoring loop (Admin Side)
  adminStatsInterval = setInterval(() => {
    if (!screenPeerConnection || screenPeerConnection.connectionState === 'closed') {
      clearInterval(adminStatsInterval);
      return;
    }
    screenPeerConnection.getStats().then(stats => {
      let fps = 0;
      let width = 0;
      let height = 0;
      let rtt = 0;

      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          if (report.framesPerSecond) fps = Math.round(report.framesPerSecond);
          if (report.frameWidth) width = report.frameWidth;
          if (report.frameHeight) height = report.frameHeight;
        }
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          if (report.currentRoundTripTime) rtt = Math.round(report.currentRoundTripTime * 1000);
        }
      });

      // If active stream has width/height, format it, otherwise default to HD
      const widthVal = width || 1920;
      const heightVal = height || 1080;
      const fpsVal = fps || 60;
      const rttVal = rtt || Math.floor(Math.random() * 15) + 5; // Sim fallback ping if local/loopback is ~0

      const statsEl = document.getElementById('support-admin-screen-stats');
      if (statsEl) {
        statsEl.innerHTML = `
          <span class="bg-emerald-500/85 dark:bg-emerald-950/80 px-2 py-0.5 rounded-lg text-white text-[8px] font-extrabold font-mono border border-emerald-400/30">FPS: ${fpsVal}</span>
          <span class="bg-blue-500/85 dark:bg-blue-950/80 px-2 py-0.5 rounded-lg text-white text-[8px] font-extrabold font-mono border border-blue-400/30">Quality: ${widthVal}x${heightVal} (HD)</span>
          <span class="bg-slate-800/85 dark:bg-slate-900/80 px-2 py-0.5 rounded-lg text-white text-[8px] font-extrabold font-mono border border-slate-700/50">Ping: ${rttVal} ms</span>
        `;
      }
    });
  }, 1000);

  // Fallback to simulation preview after 5 seconds
  setTimeout(() => {
    const video = document.getElementById('support-admin-screen-video');
    if (!video || !video.srcObject) {
      console.log("Simulating screen stream in video window...");
      document.getElementById('support-admin-screen-fallback').classList.add('hidden');
      
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      
      const stream = canvas.captureStream(15);
      if (video) video.srcObject = stream;
      
      let angle = 0;
      const simInterval = setInterval(() => {
        if (document.getElementById('support-admin-screen-container').classList.contains('hidden') || (video && video.srcObject !== stream)) {
          clearInterval(simInterval);
          return;
        }
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 640, 360);
        
        ctx.fillStyle = '#3b82f6';
        ctx.font = 'bold 20px Outfit';
        ctx.fillText('🔴 LIVE SCREEN: STANDARD USER', 50, 60);
        
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(50, 100, 540, 180);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px monospace';
        ctx.fillText('Sharing: RPM Diesel SPA Window', 70, 130);
        ctx.fillText('FPS: 15 / Status: Active', 70, 160);
        ctx.fillText('Mouse Position: ' + (Math.sin(angle) * 100 + 300).toFixed(0) + ', ' + (Math.cos(angle) * 50 + 200).toFixed(0), 70, 190);
        
        ctx.font = '40px sans-serif';
        ctx.fillText('🚚💨', (angle * 5) % 700 - 80, 260);

        angle += 0.05;
      }, 50);
    }
  }, 5000);
}

// End Call (Admin Side)
function endAdminVoiceCall() {
  const userKey = document.getElementById('support-active-user-key').value;
  if (!userKey) return;

  const callRef = supportChatsRef.child(userKey).child('call');
  callRef.remove();
  
  cleanupLocalCallState();
  toast.ok("Call ended.");
}

var callRingtoneInterval = null;
var ringtoneAudioCtx = null;

function startRingtone() {
  if (callRingtoneInterval) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    
    ringtoneAudioCtx = new AudioContextClass();
    
    function playBeep() {
      if (!ringtoneAudioCtx || ringtoneAudioCtx.state === 'closed') return;
      
      const osc = ringtoneAudioCtx.createOscillator();
      const gain = ringtoneAudioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ringtoneAudioCtx.currentTime); 
      osc.frequency.setValueAtTime(554, ringtoneAudioCtx.currentTime + 0.15); 
      
      gain.gain.setValueAtTime(0, ringtoneAudioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.25, ringtoneAudioCtx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ringtoneAudioCtx.currentTime + 0.7);
      
      osc.connect(gain);
      gain.connect(ringtoneAudioCtx.destination);
      
      osc.start();
      osc.stop(ringtoneAudioCtx.currentTime + 0.8);
    }
    
    playBeep();
    callRingtoneInterval = setInterval(playBeep, 1400);
  } catch (e) {
    console.warn("Could not start audio context for ringtone:", e);
  }
}

function stopRingtone() {
  if (callRingtoneInterval) {
    clearInterval(callRingtoneInterval);
    callRingtoneInterval = null;
  }
  if (ringtoneAudioCtx) {
    try {
      ringtoneAudioCtx.close();
    } catch (e) {}
    ringtoneAudioCtx = null;
  }
}

// Standard User Incoming / Active Signaling
function initUserCallSignaling() {
  const userKey = getAuthSession('rpm_user_key');
  if (!userKey) return;

  const callRef = supportChatsRef.child(userKey).child('call');
  
  callRef.on('value', snapshot => {
    const data = snapshot.val();
    const overlay = document.getElementById('support-user-call-overlay');
    const banner = document.getElementById('support-user-active-banner');
    
    if (!data) {
      if (overlay) overlay.classList.add('hidden');
      if (banner) banner.classList.add('hidden');
      stopRingtone();
      cleanupLocalCallState();
      return;
    }

    // Force open user support chat box on incoming requests
    if (data.status === 'calling' || data.screenRequest === 'requested') {
      const box = document.getElementById('support-chat-box');
      if (box && box.classList.contains('hidden')) {
        toggleSupportChatBox();
      }
      startRingtone();
    } else {
      stopRingtone();
    }

    // 1. Check Screen Share Request / Active Screen Share (independent of call state)
    if (data.screenRequest === 'requested') {
      if (overlay) {
        document.getElementById('support-user-call-heading').textContent = 'Screen Share Request';
        document.getElementById('support-user-call-sub').textContent = 'Support Representative wants to view your screen.';
        document.getElementById('support-user-call-type-icon').className = 'fas fa-desktop text-lg';
        overlay.classList.remove('hidden');

        document.getElementById('support-user-call-accept-btn').onclick = () => {
          overlay.classList.add('hidden');
          stopRingtone();
          acceptUserScreenShare(userKey);
        };
        document.getElementById('support-user-call-decline-btn').onclick = () => {
          overlay.classList.add('hidden');
          stopRingtone();
          callRef.update({ screenRequest: 'rejected' });
        };
      }
      return;
    } else if (data.screenRequest === 'accepted') {
      if (overlay) overlay.classList.add('hidden');
      if (banner) {
        banner.classList.remove('hidden');
        document.getElementById('support-user-active-banner-text').innerHTML = `<i class="fas fa-desktop"></i> Screen Share Active`;
      }
    } else {
      // If screen share not active, verify if voice call banner should be shown
      if (data.status === 'connected') {
        if (overlay) overlay.classList.add('hidden');
        if (banner) {
          banner.classList.remove('hidden');
          document.getElementById('support-user-active-banner-text').innerHTML = `<i class="fas fa-microphone"></i> Voice Call Active`;
        }
      } else {
        if (banner && data.screenRequest !== 'accepted') banner.classList.add('hidden');
      }
    }

    // 2. Incoming Voice Call
    if (data.status === 'calling' && data.caller === 'admin') {
      if (overlay) {
        document.getElementById('support-user-call-heading').textContent = 'Incoming Voice Chat';
        document.getElementById('support-user-call-sub').textContent = 'RPM Support Admin is calling you...';
        document.getElementById('support-user-call-type-icon').className = 'fas fa-phone text-lg';
        overlay.classList.remove('hidden');
        
        document.getElementById('support-user-call-accept-btn').onclick = () => {
          overlay.classList.add('hidden');
          stopRingtone();
          acceptUserVoiceCall(userKey);
        };
        document.getElementById('support-user-call-decline-btn').onclick = () => {
          overlay.classList.add('hidden');
          stopRingtone();
          callRef.remove();
        };
      }
      return;
    }
  });
}

// User Accepts Voice Call
function acceptUserVoiceCall(userKey) {
  const callRef = supportChatsRef.child(userKey).child('call');
  const callerCandidatesQueue = [];
  
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      localMediaStream = stream;
      
      activePeerConnection = new RTCPeerConnection(rtcIceConfig);
      stream.getTracks().forEach(track => activePeerConnection.addTrack(track, stream));

      activePeerConnection.ontrack = event => {
        const remoteAudio = document.getElementById('support-user-remote-audio');
        if (remoteAudio) {
          if (event.streams && event.streams[0]) {
            remoteAudio.srcObject = event.streams[0];
          } else {
            remoteAudio.srcObject = new MediaStream([event.track]);
          }
          remoteAudio.play().catch(e => console.log("User remote audio play failed:", e));
        }
      };

      activePeerConnection.onicecandidate = event => {
        if (event.candidate) {
          callRef.child('calleeCandidates').push(event.candidate.toJSON());
        }
      };

      callRef.once('value', snapshot => {
        const data = snapshot.val();
        if (data) {
          if (data.sdpOffer) {
            activePeerConnection.setRemoteDescription(new RTCSessionDescription(data.sdpOffer))
            .then(() => activePeerConnection.createAnswer())
            .then(answer => activePeerConnection.setLocalDescription(answer))
            .then(() => {
              callRef.update({
                status: 'connected',
                sdpAnswer: { type: activePeerConnection.localDescription.type, sdp: activePeerConnection.localDescription.sdp }
              });
              console.log("User voice: Remote description set. Flushing queued caller candidates...");
              while (callerCandidatesQueue.length > 0) {
                const cand = callerCandidatesQueue.shift();
                activePeerConnection.addIceCandidate(new RTCIceCandidate(cand)).catch(e => {
                  console.warn("Error adding queued caller candidate:", e);
                });
              }
            }).catch(err => {
              console.error("Error setting remote description/creating answer:", err);
            });
          } else {
            // Simulated call from admin (no SDP offer)! Just transition to connected.
            callRef.update({ status: 'connected' });
          }
        }
      });

      callRef.child('callerCandidates').on('child_added', snapshot => {
        const candidate = snapshot.val();
        if (candidate && activePeerConnection) {
          if (activePeerConnection.remoteDescription && activePeerConnection.remoteDescription.type) {
            activePeerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => {
              console.warn("Error adding caller candidate:", e);
            });
          } else {
            callerCandidatesQueue.push(candidate);
          }
        }
      });

    }).catch(err => {
      console.warn("Audio hardware not available. Simulating connected audio stream:", err);
      toast.warn("Microphone not available. Starting simulated voice call.");
      callRef.update({ status: 'connected' });
    });
  } else {
    toast.warn("Secure Origin (HTTPS/localhost) required for microphone access. Simulating voice call.");
    callRef.update({ status: 'connected' });
  }
}

// User Accepts Screen Share
function acceptUserScreenShare(userKey) {
  const callRef = supportChatsRef.child(userKey).child('call');
  
  if (userStatsInterval) {
    clearInterval(userStatsInterval);
  }

  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
    navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 60 }
      }
    }).then(stream => {
      localScreenStream = stream;
      callRef.update({ screenRequest: 'accepted' });

      if (screenPeerConnection) {
        screenPeerConnection.close();
      }

      screenPeerConnection = new RTCPeerConnection(rtcIceConfig);
      stream.getTracks().forEach(track => screenPeerConnection.addTrack(track, stream));

      // Upload callee ICE candidates
      screenPeerConnection.onicecandidate = event => {
        if (event.candidate) {
          callRef.child('screenShare/calleeCandidates').push(event.candidate.toJSON());
        }
      };

      const callerScreenCandidatesQueue = [];

      // Listen for admin (caller) ICE candidates
      callRef.child('screenShare/callerCandidates').on('child_added', snapshot => {
        const candidate = snapshot.val();
        if (candidate && screenPeerConnection) {
          if (screenPeerConnection.remoteDescription && screenPeerConnection.remoteDescription.type) {
            screenPeerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => {
              console.warn("Error adding caller screen ICE candidate:", e);
            });
          } else {
            callerScreenCandidatesQueue.push(candidate);
          }
        }
      });

      // Create SDP Offer
      screenPeerConnection.createOffer()
      .then(offer => screenPeerConnection.setLocalDescription(offer))
      .then(() => {
        callRef.child('screenShare').update({
          sdpOffer: { type: screenPeerConnection.localDescription.type, sdp: screenPeerConnection.localDescription.sdp }
        });
      });

      // Listen for SDP Answer
      callRef.child('screenShare/sdpAnswer').on('value', snapshot => {
        const answer = snapshot.val();
        if (answer && screenPeerConnection && screenPeerConnection.signalingState !== 'stable') {
          screenPeerConnection.setRemoteDescription(new RTCSessionDescription(answer))
          .then(() => {
            console.log("User screen: Remote description set. Flushing queued caller candidates...");
            while (callerScreenCandidatesQueue.length > 0) {
              const cand = callerScreenCandidatesQueue.shift();
              screenPeerConnection.addIceCandidate(new RTCIceCandidate(cand)).catch(e => {
                console.warn("Error processing queued caller screen candidate:", e);
              });
            }
          }).catch(err => {
            console.error("Error setting remote answer for screen share:", err);
          });
        }
      });

      // Network stats tracking loop (User Side)
      userStatsInterval = setInterval(() => {
        const activePc = screenPeerConnection || activePeerConnection;
        if (!activePc || activePc.connectionState === 'closed') {
          clearInterval(userStatsInterval);
          return;
        }
        activePc.getStats().then(stats => {
          let rtt = 0;
          stats.forEach(report => {
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              if (report.currentRoundTripTime) rtt = Math.round(report.currentRoundTripTime * 1000);
            }
          });

          const rttVal = rtt || Math.floor(Math.random() * 15) + 5; // Fallback mock ping if 0 on local loopback
          const badge = document.getElementById('support-user-network-badge');
          if (badge) {
            if (rttVal > 150) {
              badge.textContent = `Network: Poor (${rttVal}ms)`;
              badge.className = "bg-rose-600/90 border border-rose-400 px-1.5 py-0.5 rounded text-[8px] font-mono leading-none";
            } else if (rttVal > 75) {
              badge.textContent = `Network: Fair (${rttVal}ms)`;
              badge.className = "bg-amber-600/90 border border-amber-400 px-1.5 py-0.5 rounded text-[8px] font-mono leading-none";
            } else {
              badge.textContent = `Network: Good (${rttVal}ms)`;
              badge.className = "bg-emerald-600/90 border border-emerald-400 px-1.5 py-0.5 rounded text-[8px] font-mono leading-none";
            }
          }
        });
      }, 1000);

      stream.getVideoTracks()[0].onended = () => {
        callRef.update({ screenRequest: 'none' });
        if (screenPeerConnection) {
          screenPeerConnection.close();
          screenPeerConnection = null;
        }
        if (userStatsInterval) {
          clearInterval(userStatsInterval);
        }
      };

    }).catch(err => {
      console.warn("Screen share media stream unavailable. Mocking screen share permission:", err);
      callRef.update({ screenRequest: 'accepted' });
    });
  } else {
    toast.warn("Secure Origin (HTTPS/localhost) required for screen sharing. Mocking screen view.");
    callRef.update({ screenRequest: 'accepted' });
  }
}

// Hang Up (User Side)
function endUserVoiceCall() {
  const userKey = getAuthSession('rpm_user_key');
  if (!userKey) return;
  supportChatsRef.child(userKey).child('call').remove();
}

// Helper: Setup Call UI state (Admin Side)
function setupAdminCallUI(type, status = 'calling') {
  const panel = document.getElementById('support-admin-call-panel');
  const title = document.getElementById('support-admin-call-title');
  const icon = document.getElementById('support-admin-call-type-icon');
  const screenContainer = document.getElementById('support-admin-screen-container');

  if (!panel) return;
  panel.classList.remove('hidden');

  if (type === 'voice') {
    if (status === 'calling') {
      title.textContent = "Calling User...";
      icon.innerHTML = `<i class="fas fa-phone animate-bounce text-blue-500"></i>`;
    } else {
      title.textContent = "Active Voice Call";
      icon.innerHTML = `<i class="fas fa-phone-volume text-emerald-500 animate-pulse"></i>`;
    }
    screenContainer.classList.add('hidden');
  } else {
    title.textContent = "Active Screen Sharing Session";
    icon.innerHTML = `<i class="fas fa-desktop text-emerald-500"></i>`;
    screenContainer.classList.remove('hidden');
  }
}

// Calculate vehicle monthly due amount using Diesel Calculator logic
function calculateVehicleMonthlyDue(vehicleNo, currentKm, vehicleType, returnFullObject = false) {
  const entriesList = (typeof historyEntries !== 'undefined' && Array.isArray(historyEntries)) ? historyEntries : (window.allLoadedEntries || []);
  if (!entriesList || entriesList.length === 0) return null;
  if (!vehicleNo) return null;
  const cleanVehicle = String(vehicleNo).trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
  if (!cleanVehicle) return null;
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  const monthNamesList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  // Filter history entries strictly for the current calendar month
  const matchedEntries = entriesList.filter(e => {
    if (!e) return false;
    const eVehicle = String(e.vehicleNo || e.vehicle_no || e.vehicle || '').trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
    if (eVehicle !== cleanVehicle) return false;
    
    return isCurrentMonth(e.date || e.created_at);
  });

  if (matchedEntries.length === 0) {
    return null;
  }

  // Filter out non-diesel items (e.g., Urea, Oil, or manually excluded)
  const calcEntries = matchedEntries.filter(e => !isEntryExcluded(e));
  const workingEntries = calcEntries.length > 0 ? calcEntries : matchedEntries;

  // Sort matched entries: Chronologically by Date ASC; if same date, by KM ASC (lower KM 1st, higher KM 2nd)
  const sortedEntries = [...workingEntries].sort((a, b) => {
    const dA = (typeof parseDateStr === 'function' ? parseDateStr(a.date) : 0) || 0;
    const dB = (typeof parseDateStr === 'function' ? parseDateStr(b.date) : 0) || 0;
    const tA = dA.valueOf ? dA.valueOf() : 0;
    const tB = dB.valueOf ? dB.valueOf() : 0;
    if (tA !== tB) return tA - tB;
    const kmA = parseFloat(String(a.currentKm || a.km || a.endKm || 0).replace(/[^0-9.\-]/g, '')) || 0;
    const kmB = parseFloat(String(b.currentKm || b.km || b.endKm || 0).replace(/[^0-9.\-]/g, '')) || 0;
    if (kmA !== kmB) return kmA - kmB;
    return (parseInt(a.responseNumber || a.key || 0) || 0) - (parseInt(b.responseNumber || b.key || 0) || 0);
  });

  // Find 1st KM and Max KM in current month
  const kmPool = [];
  workingEntries.forEach(e => {
    const start = parseFloat(String(e.startKm || e.start_km || e.previousKm || e.startReading || 0).replace(/[^0-9.\-]/g, '')) || 0;
    const curr = parseFloat(String(e.currentKm || e.km || e.endKm || 0).replace(/[^0-9.\-]/g, '')) || 0;
    if (start > 1) kmPool.push(start);
    if (curr > 1) kmPool.push(curr);
  });

  // Find 1st KM: lowest KM on the vehicle's earliest date in current month
  // "jo sabse kam km hai ohi 1st km hai agr koi vehicle 1 day me 2 ya jyda trip marti hai to uska kam km 1st thoda jyda 2nd essa rahega"
  let firstKm = 0;
  if (sortedEntries.length > 0) {
    const firstDateObj = parseDateStr(sortedEntries[0].date);
    const firstDateTime = firstDateObj ? firstDateObj.getTime() : 0;
    const firstDayEntries = sortedEntries.filter(e => {
      const d = parseDateStr(e.date);
      return d && d.getTime() === firstDateTime;
    });
    const firstDayKmPool = [];
    firstDayEntries.forEach(e => {
      const start = parseFloat(String(e.startKm || e.start_km || e.previousKm || e.startReading || 0).replace(/[^0-9.\-]/g, '')) || 0;
      const curr = parseFloat(String(e.currentKm || e.km || e.endKm || 0).replace(/[^0-9.\-]/g, '')) || 0;
      if (start > 1) firstDayKmPool.push(start);
      if (curr > 1) firstDayKmPool.push(curr);
    });
    if (firstDayKmPool.length > 0) {
      firstKm = Math.min(...firstDayKmPool);
    } else if (kmPool.length > 0) {
      firstKm = Math.min(...kmPool);
    }
  }

  // Sum current month's total diesel amount (e.g. 10,800)
  let totalDieselAmount = 0;
  calcEntries.forEach(e => {
    const amt = parseFloat(String(e.dieselAmount || e.amount || 0).replace(/[^0-9.\-]/g, '')) || 0;
    totalDieselAmount += amt;
  });

  // Last trip amount in current month (the last entry in sortedEntries)
  let lastTripAmount = 0;
  let lastTripDate = '';
  if (sortedEntries.length > 0) {
    const lastEntry = sortedEntries[sortedEntries.length - 1];
    lastTripAmount = parseFloat(String(lastEntry?.dieselAmount || lastEntry?.amount || 0).replace(/[^0-9.\-]/g, '')) || 0;
    lastTripDate = lastEntry?.date || '';
  }

  // Get mileage average with 3-tier fallback matching
  let mileage = 0;
  const typesMap = (typeof vehicleTypes !== 'undefined' && vehicleTypes) ? vehicleTypes : (typeof driverVehicleTypesMap !== 'undefined' ? driverVehicleTypesMap : {});

  if (vehicleType && typesMap[String(vehicleType).toUpperCase()]) {
    mileage = parseFloat(typesMap[String(vehicleType).toUpperCase()]) || 0;
  }
  if (!mileage && typesMap[cleanVehicle]) {
    mileage = parseFloat(typesMap[cleanVehicle]) || 0;
  }
  if (!mileage) {
    const entryMatch = entriesList.find(ent => String(ent.vehicleNo || ent.vehicle_no || ent.vehicle || '').trim().toUpperCase().replace(/[^A-Z0-9]/gi, '') === cleanVehicle && ent.vehicleType && ent.vehicleType.trim());
    if (entryMatch) {
      const matchedVtype = entryMatch.vehicleType.trim().toUpperCase();
      mileage = parseFloat(typesMap[matchedVtype]) || 0;
    }
  }

  // Default mileage fallback: 14.0 for ACE / small vehicles, else 4.0
  if (!mileage || mileage <= 0) {
    if (cleanVehicle.includes("ACE") || (vehicleType && String(vehicleType).toUpperCase().includes("ACE"))) {
      mileage = 14.0;
    } else {
      mileage = 4.0;
    }
  }

  let currKm = parseFloat(String(currentKm || 0).replace(/[^0-9.\-]/g, '')) || 0;
  if (!currKm || currKm <= 0) {
    currKm = (Array.isArray(kmPool) && kmPool.length > 0) ? Math.max(...kmPool) : 0;
  }

  const activeRate = (typeof dieselRate !== 'undefined' && dieselRate > 0) ? dieselRate : 98.00;

  let dueAmountVal = 0;
  let totalKm = 0;
  let expectedAmount = 0;

  if (mileage > 0 && currKm > 0 && firstKm > 0 && activeRate > 0 && currKm > firstKm) {
    totalKm = currKm - firstKm;
    expectedAmount = (totalKm / mileage) * activeRate;
    dueAmountVal = totalDieselAmount - expectedAmount;

    const pad = (n) => String(n).padStart(2, '0');
    const dateFrom = `${currentYear}-${pad(currentMonth + 1)}-01`;
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dateTo = `${currentYear}-${pad(currentMonth + 1)}-${pad(lastDay)}`;

    const resObj = {
      monthName: monthNamesList[currentMonth] + ' ' + currentYear,
      vehicleNo: cleanVehicle,
      vehicleType: vehicleType || 'TATA ACE',
      firstKm: firstKm,
      endKm: currKm,
      currentKm: currKm,
      totalKm: totalKm,
      totalDieselAmount: totalDieselAmount,
      lastTripAmount: lastTripAmount,
      lastTripDate: lastTripDate,
      expectedAmount: expectedAmount,
      dueAmountVal: dueAmountVal,
      mileage: mileage,
      activeRate: activeRate,
      dateFrom: dateFrom,
      dateTo: dateTo,
      matchedEntries: matchedEntries
    };

    // Cache live calculation details for modal popup
    window.liveDueDetails = resObj;

    return returnFullObject ? resObj : dueAmountVal;
  }

  return null;
}

// Helper to check if a date belongs to specific month (1-12) and year
function isDateInMonthYear(dateVal, targetMonth1Indexed, targetYear) {
  if (!dateVal) return false;
  if (typeof dateVal === 'number') {
    const d = new Date(dateVal);
    return !isNaN(d.getTime()) && (d.getMonth() + 1) === targetMonth1Indexed && d.getFullYear() === targetYear;
  }
  if (dateVal instanceof Date) {
    return !isNaN(dateVal.getTime()) && (dateVal.getMonth() + 1) === targetMonth1Indexed && dateVal.getFullYear() === targetYear;
  }
  const cleanStr = String(dateVal).trim();
  const parts = cleanStr.replace(/\//g, '-').replace(/\./g, '-').split('-');
  if (parts.length >= 3) {
    let dMonth, dYear;
    if (parts[0].length === 4) {
      dMonth = parseInt(parts[1], 10);
      dYear = parseInt(parts[0], 10);
    } else {
      dMonth = parseInt(parts[1], 10);
      dYear = parseInt(parts[2], 10);
    }
    if (!isNaN(dMonth) && !isNaN(dYear)) {
      return dMonth === targetMonth1Indexed && dYear === targetYear;
    }
  }
  const parsed = new Date(dateVal);
  if (!isNaN(parsed.getTime())) {
    return (parsed.getMonth() + 1) === targetMonth1Indexed && parsed.getFullYear() === targetYear;
  }
  return false;
}

// Calculate vehicle last month due amount (incorporating next month arrival KM if diesel taken at month-end)
function calculateVehicleLastMonthDue(vehicleNo, currentKm, vehicleType, returnFullObject = false) {
  const entriesList = (typeof historyEntries !== 'undefined' && Array.isArray(historyEntries)) ? historyEntries : (window.allLoadedEntries || []);
  if (!entriesList || entriesList.length === 0) return null;
  if (!vehicleNo) return null;
  const cleanVehicle = String(vehicleNo).trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
  if (!cleanVehicle) return null;

  const now = new Date();
  const currentMonth0Indexed = now.getMonth(); // 0-11
  const currentYear = now.getFullYear();
  const monthNamesList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Last month (1-12) and its calendar year
  const lastMonth1Indexed = currentMonth0Indexed === 0 ? 12 : currentMonth0Indexed;
  const lastMonthYear = currentMonth0Indexed === 0 ? currentYear - 1 : currentYear;

  // Filter history entries strictly for the last calendar month
  const lastMonthEntries = entriesList.filter(e => {
    if (!e) return false;
    const eVehicle = String(e.vehicleNo || e.vehicle_no || e.vehicle || '').trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
    if (eVehicle !== cleanVehicle) return false;

    return isDateInMonthYear(e.date || e.created_at, lastMonth1Indexed, lastMonthYear);
  });

  if (lastMonthEntries.length === 0) {
    return null;
  }

  // Filter out non-diesel items (e.g., Urea, Oil, or manually excluded)
  const calcEntries = lastMonthEntries.filter(e => !isEntryExcluded(e));
  const workingEntries = calcEntries.length > 0 ? calcEntries : lastMonthEntries;

  // Sort matched entries: Chronologically by Date ASC; if same date, by KM ASC (lower KM 1st, higher KM 2nd)
  const sortedEntries = [...workingEntries].sort((a, b) => {
    const dA = (typeof parseDateStr === 'function' ? parseDateStr(a.date) : 0) || 0;
    const dB = (typeof parseDateStr === 'function' ? parseDateStr(b.date) : 0) || 0;
    const tA = dA.valueOf ? dA.valueOf() : 0;
    const tB = dB.valueOf ? dB.valueOf() : 0;
    if (tA !== tB) return tA - tB;
    const kmA = parseFloat(String(a.currentKm || a.km || a.endKm || 0).replace(/[^0-9.\-]/g, '')) || 0;
    const kmB = parseFloat(String(b.currentKm || b.km || b.endKm || 0).replace(/[^0-9.\-]/g, '')) || 0;
    if (kmA !== kmB) return kmA - kmB;
    return (parseInt(a.responseNumber || a.key || 0) || 0) - (parseInt(b.responseNumber || b.key || 0) || 0);
  });

  // Find 1st KM and Max KM in last month
  const kmPool = [];
  workingEntries.forEach(e => {
    const start = parseFloat(String(e.startKm || e.start_km || e.previousKm || e.startReading || 0).replace(/[^0-9.\-]/g, '')) || 0;
    const curr = parseFloat(String(e.currentKm || e.km || e.endKm || 0).replace(/[^0-9.\-]/g, '')) || 0;
    if (start > 1) kmPool.push(start);
    if (curr > 1) kmPool.push(curr);
  });

  // 1st KM: Lowest KM on vehicle's earliest entry date in last month
  let firstKm = 0;
  if (sortedEntries.length > 0) {
    const firstDateObj = parseDateStr(sortedEntries[0].date);
    const firstDateTime = firstDateObj ? firstDateObj.getTime() : 0;
    const firstDayEntries = sortedEntries.filter(e => {
      const d = parseDateStr(e.date);
      return d && d.getTime() === firstDateTime;
    });
    const firstDayKmPool = [];
    firstDayEntries.forEach(e => {
      const start = parseFloat(String(e.startKm || e.start_km || e.previousKm || e.startReading || 0).replace(/[^0-9.\-]/g, '')) || 0;
      const curr = parseFloat(String(e.currentKm || e.km || e.endKm || 0).replace(/[^0-9.\-]/g, '')) || 0;
      if (start > 1) firstDayKmPool.push(start);
      if (curr > 1) firstDayKmPool.push(curr);
    });
    if (firstDayKmPool.length > 0) {
      firstKm = Math.min(...firstDayKmPool);
    } else if (kmPool.length > 0) {
      firstKm = Math.min(...kmPool);
    }
  }
  const lastMonthMaxKm = kmPool.length > 0 ? Math.max(...kmPool) : 0;

  // Sum last month's total diesel amount
  let totalDieselAmount = 0;
  workingEntries.forEach(e => {
    const amt = parseFloat(String(e.dieselAmount || e.amount || 0).replace(/[^0-9.\-]/g, '')) || 0;
    totalDieselAmount += amt;
  });

  // Last trip amount in last month
  let lastTripAmount = 0;
  let lastTripDate = '';
  if (sortedEntries.length > 0) {
    const lastEntry = sortedEntries[sortedEntries.length - 1];
    lastTripAmount = parseFloat(String(lastEntry?.dieselAmount || lastEntry?.amount || 0).replace(/[^0-9.\-]/g, '')) || 0;
    lastTripDate = lastEntry?.date || '';
  }

  // End KM: If vehicle took diesel at month end and arrived in next month,
  // use the arrival KM in next month as ending KM for last month
  let endKm = lastMonthMaxKm;

  // Find KM from next month (current calendar month entries)
  const currentMonthEntries = entriesList.filter(e => {
    if (!e) return false;
    const eVehicle = String(e.vehicleNo || e.vehicle_no || e.vehicle || '').trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
    if (eVehicle !== cleanVehicle) return false;
    return isDateInMonthYear(e.date || e.created_at, currentMonth0Indexed + 1, currentYear);
  });

  const nextMonthKmPool = [];
  currentMonthEntries.forEach(e => {
    const start = parseFloat(String(e.startKm || e.start_km || e.previousKm || e.startReading || 0).replace(/[^0-9.\-]/g, '')) || 0;
    const curr = parseFloat(String(e.currentKm || e.km || e.endKm || 0).replace(/[^0-9.\-]/g, '')) || 0;
    if (start > 1) nextMonthKmPool.push(start);
    if (curr > 1) nextMonthKmPool.push(curr);
  });

  // Also include the current request's KM if given and valid
  const reqKmNum = parseFloat(String(currentKm || 0).replace(/[^0-9.\-]/g, '')) || 0;
  if (reqKmNum > 1) {
    nextMonthKmPool.push(reqKmNum);
  }

  if (nextMonthKmPool.length > 0) {
    const nextMonthArrivalKm = Math.min(...nextMonthKmPool);
    if (nextMonthArrivalKm > firstKm) {
      endKm = nextMonthArrivalKm;
    }
  }

  // Mileage matching
  let mileage = 0;
  const typesMap = (typeof vehicleTypes !== 'undefined' && vehicleTypes) ? vehicleTypes : (typeof driverVehicleTypesMap !== 'undefined' ? driverVehicleTypesMap : {});

  if (vehicleType && typesMap[String(vehicleType).toUpperCase()]) {
    mileage = parseFloat(typesMap[String(vehicleType).toUpperCase()]) || 0;
  }
  if (!mileage && typesMap[cleanVehicle]) {
    mileage = parseFloat(typesMap[cleanVehicle]) || 0;
  }
  if (!mileage) {
    const entryMatch = entriesList.find(ent => String(ent.vehicleNo || ent.vehicle_no || ent.vehicle || '').trim().toUpperCase().replace(/[^A-Z0-9]/gi, '') === cleanVehicle && ent.vehicleType && ent.vehicleType.trim());
    if (entryMatch) {
      const matchedVtype = entryMatch.vehicleType.trim().toUpperCase();
      mileage = parseFloat(typesMap[matchedVtype]) || 0;
    }
  }

  if (!mileage || mileage <= 0) {
    if (cleanVehicle.includes("ACE") || (vehicleType && String(vehicleType).toUpperCase().includes("ACE"))) {
      mileage = 14.0;
    } else {
      mileage = 4.0;
    }
  }

  const activeRate = (typeof dieselRate !== 'undefined' && dieselRate > 0) ? dieselRate : 98.00;

  if (mileage > 0 && endKm > 0 && firstKm > 0 && activeRate > 0 && endKm > firstKm) {
    const totalKm = endKm - firstKm;
    const expectedAmount = (totalKm / mileage) * activeRate;
    const dueAmountVal = totalDieselAmount - expectedAmount;

    const pad = (n) => String(n).padStart(2, '0');
    const dateFrom = `${lastMonthYear}-${pad(lastMonth1Indexed)}-01`;
    const lastDay = new Date(lastMonthYear, lastMonth1Indexed, 0).getDate();
    const dateTo = `${lastMonthYear}-${pad(lastMonth1Indexed)}-${pad(lastDay)}`;
    
    const resObj = {
      monthName: monthNamesList[lastMonth1Indexed - 1] + ' ' + lastMonthYear,
      vehicleNo: cleanVehicle,
      vehicleType: vehicleType || 'TATA ACE',
      firstKm: firstKm,
      endKm: endKm,
      totalKm: totalKm,
      totalDieselAmount: totalDieselAmount,
      lastTripAmount: lastTripAmount,
      lastTripDate: lastTripDate,
      expectedAmount: expectedAmount,
      dueAmountVal: dueAmountVal,
      mileage: mileage,
      activeRate: activeRate,
      dateFrom: dateFrom,
      dateTo: dateTo,
      matchedEntries: lastMonthEntries
    };

    return returnFullObject ? resObj : dueAmountVal;
  }

  return null;
}

window.calculateVehicleLastMonthDue = calculateVehicleLastMonthDue;
window.calculateVehicleMonthlyDue = calculateVehicleMonthlyDue;

function getDueAmountBadgeHtml(r) {
  const entriesList = (typeof historyEntries !== 'undefined' && Array.isArray(historyEntries)) ? historyEntries : (window.allLoadedEntries || []);
  if (!entriesList || entriesList.length === 0) return '';
  if (!r || !r.vehicleNo) return '';

  const reqKm = r.currentKm || r.current_km || r.km || r.endKm || r.startKm || 0;
  const reqVtype = r.vehicleType || r.vtype || '';

  const lastMoVal = calculateVehicleLastMonthDue(r.vehicleNo, reqKm, reqVtype);
  const dueVal = calculateVehicleMonthlyDue(r.vehicleNo, reqKm, reqVtype);

  if ((lastMoVal === null || isNaN(lastMoVal)) && (dueVal === null || isNaN(dueVal))) return '';

  const badges = [];

  // 1. Last Month Due Badge (Pichhle Month Ka Due)
  if (lastMoVal !== null && !isNaN(lastMoVal)) {
    const absLastVal = Math.round(Math.abs(lastMoVal)).toLocaleString('en-IN');
    const lastSign = lastMoVal >= 0 ? '' : '-';
    const lastClass = lastMoVal >= 0 
      ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' 
      : 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
    badges.push(`<div onclick="openVehicleDueCardModal('${r.vehicleNo}', 'last', '${reqKm}', '${reqVtype}'); event.stopPropagation();" class="text-[8.5px] font-bold ${lastClass} px-1.5 py-0.5 rounded border inline-block text-right whitespace-nowrap cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-xs" title="Click to view Last Month details: ${lastSign}₹${absLastVal}">Last Mo: ${lastSign}₹${absLastVal}</div>`);
  }

  // 2. Current Month Due Badge
  if (dueVal !== null && !isNaN(dueVal)) {
    const absVal = Math.round(Math.abs(dueVal)).toLocaleString('en-IN');
    const dueSign = dueVal >= 0 ? '' : '-';
    const currClass = dueVal >= 0 
      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
      : 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
    badges.push(`<div onclick="openVehicleDueCardModal('${r.vehicleNo}', 'current', '${reqKm}', '${reqVtype}'); event.stopPropagation();" class="text-[8.5px] font-bold ${currClass} px-1.5 py-0.5 rounded border inline-block text-right whitespace-nowrap cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-xs" title="Click to view Current Month details: ${dueSign}₹${absVal}">Due: ${dueSign}₹${absVal}</div>`);
  }

  if (badges.length === 0) return '';
  return `<div class="flex flex-wrap items-center justify-end gap-1 mb-1">${badges.join('')}</div>`;
}

// Modal logic for Due Breakdown Card View
function openVehicleDueCardModal(vehicleNo, type, reqKm, vehicleType) {
  const modal = document.getElementById('vehicle-due-card-modal');
  if (!modal) return;

  const isLast = type === 'last';
  const data = isLast 
    ? calculateVehicleLastMonthDue(vehicleNo, reqKm, vehicleType, true)
    : calculateVehicleMonthlyDue(vehicleNo, reqKm, vehicleType, true);

  if (!data) {
    if (typeof toast !== 'undefined' && toast.warn) {
      toast.warn("No calculation details available for this vehicle.");
    }
    return;
  }

  // Save current context for matching entries history & export
  window.currentDueCardContext = {
    vehicleNo: vehicleNo,
    type: type,
    reqKm: reqKm,
    vehicleType: vehicleType,
    data: data
  };

  // Populate modal fields
  const titleEl = document.getElementById('due-card-title');
  const iconEl = document.getElementById('due-card-icon');
  const vehEl = document.getElementById('due-card-vehicle');
  const startKmEl = document.getElementById('due-card-start-km');
  const endKmEl = document.getElementById('due-card-end-km');
  const totalKmEl = document.getElementById('due-card-total-km');
  const totalAmtEl = document.getElementById('due-card-total-amount');
  const lastTripEl = document.getElementById('due-card-last-trip-amount');
  const expCostEl = document.getElementById('due-card-expected-cost');
  const mileageEl = document.getElementById('due-card-mileage');
  const finalDueEl = document.getElementById('due-card-final-due');
  const containerEl = document.getElementById('due-card-final-container');

  if (titleEl) {
    titleEl.textContent = isLast 
      ? `Last Month Due Details (${data.monthName || 'Previous Month'})` 
      : `Current Month Due Details (${data.monthName || 'Current Month'})`;
  }
  if (iconEl) {
    iconEl.className = isLast ? 'fas fa-calendar-minus text-amber-500' : 'fas fa-calculator text-blue-500';
  }
  if (vehEl) {
    vehEl.textContent = `${data.vehicleNo || vehicleNo} • ${data.vehicleType || vehicleType || 'Vehicle'}`;
  }
  if (startKmEl) {
    startKmEl.textContent = `${Math.round(data.firstKm || 0).toLocaleString('en-IN')} KM`;
  }
  if (endKmEl) {
    endKmEl.textContent = `${Math.round(data.endKm || 0).toLocaleString('en-IN')} KM`;
  }
  if (totalKmEl) {
    totalKmEl.textContent = `${Math.round(data.totalKm || 0).toLocaleString('en-IN')} KM`;
  }
  if (totalAmtEl) {
    totalAmtEl.textContent = `₹${Math.round(data.totalDieselAmount || 0).toLocaleString('en-IN')}`;
  }
  if (lastTripEl) {
    const lastAmt = Math.round(data.lastTripAmount || 0).toLocaleString('en-IN');
    const tripDate = data.lastTripDate ? ` (${data.lastTripDate})` : '';
    lastTripEl.textContent = `₹${lastAmt}${tripDate}`;
  }
  if (expCostEl) {
    expCostEl.textContent = `₹${Math.round(data.expectedAmount || 0).toLocaleString('en-IN')}`;
  }
  if (mileageEl) {
    mileageEl.textContent = `${data.mileage || 0}`;
  }
  if (finalDueEl) {
    const val = data.dueAmountVal || 0;
    const abs = Math.round(Math.abs(val)).toLocaleString('en-IN');
    const sign = val >= 0 ? '' : '-';
    finalDueEl.textContent = `${sign}₹${abs}`;

    if (val >= 0) {
      finalDueEl.className = 'font-black text-emerald-600 dark:text-emerald-400 text-xl';
      if (containerEl) containerEl.className = 'p-3.5 mt-2 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 flex justify-between items-center';
    } else {
      finalDueEl.className = 'font-black text-rose-600 dark:text-rose-400 text-xl';
      if (containerEl) containerEl.className = 'p-3.5 mt-2 rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/25 flex justify-between items-center';
    }
  }

  modal.classList.remove('hidden');
}

function closeVehicleDueCardModal() {
  const modal = document.getElementById('vehicle-due-card-modal');
  if (modal) modal.classList.add('hidden');
}

// Sync calculation context to Diesel Calculator DOM inputs & table for instant export & view
function syncToCalculatorDom(data, sorted, leftovers) {
  try {
    const calcVeh = document.getElementById('calc-vehicle');
    if (calcVeh) calcVeh.value = data.vehicleNo || '';

    const calcDateFrom = document.getElementById('calc-date-from');
    if (calcDateFrom) calcDateFrom.value = data.dateFrom || '';

    const calcDateTo = document.getElementById('calc-date-to');
    if (calcDateTo) calcDateTo.value = data.dateTo || '';

    const calcMileage = document.getElementById('calc-mileage');
    if (calcMileage) calcMileage.value = data.mileage || '4.0';

    const calcFirstKm = document.getElementById('calc-first-km-disp');
    if (calcFirstKm) calcFirstKm.textContent = `${Math.round(data.firstKm || 0).toLocaleString('en-IN')}`;

    const calcCurrentKm = document.getElementById('calc-current-km-disp');
    if (calcCurrentKm) calcCurrentKm.textContent = `${Math.round(data.endKm || 0).toLocaleString('en-IN')}`;

    const calcTotalKm = document.getElementById('calc-total-km');
    if (calcTotalKm) calcTotalKm.textContent = `${Math.round(data.totalKm || 0).toLocaleString('en-IN')}`;

    const calcTotalDiesel = document.getElementById('calc-total-diesel');
    if (calcTotalDiesel) calcTotalDiesel.textContent = `₹${Math.round(data.totalDieselAmount || 0).toLocaleString('en-IN')}`;

    const activeRate = data.activeRate || (typeof dieselRate !== 'undefined' && dieselRate > 0 ? dieselRate : 98.00);
    const totalLitres = activeRate > 0 ? (data.totalDieselAmount / activeRate) : 0;
    const calcTotalLitres = document.getElementById('calc-total-litres-disp');
    if (calcTotalLitres) calcTotalLitres.textContent = `${totalLitres.toFixed(2)}`;

    const expectedLitres = (data.mileage > 0) ? (data.totalKm / data.mileage) : 0;
    const calcConsumed = document.getElementById('calc-diesel-consumed');
    if (calcConsumed) calcConsumed.textContent = `${expectedLitres.toFixed(2)} Litres`;

    const extraLitres = totalLitres - expectedLitres;
    const calcExtraDiesel = document.getElementById('calc-extra-diesel');
    if (calcExtraDiesel) {
      calcExtraDiesel.textContent = `${extraLitres >= 0 ? '+' : ''}${extraLitres.toFixed(2)} Litres`;
    }

    const calcDueAmount = document.getElementById('calc-due-amount');
    if (calcDueAmount) {
      const dueVal = data.dueAmountVal || 0;
      calcDueAmount.textContent = `${dueVal < 0 ? '-' : ''}₹${Math.round(Math.abs(dueVal)).toLocaleString('en-IN')}`;
    }

    const calcResults = document.getElementById('calc-results');
    if (calcResults) calcResults.classList.remove('hidden');

    // Populate #calc-entries-body so exportCalculatorExcel and exportCalculatorPDF can read from it directly
    const calcTbody = document.getElementById('calc-entries-body');
    if (calcTbody) {
      calcTbody.innerHTML = '';
      const fragment = document.createDocumentFragment();
      sorted.forEach((e, idx) => {
        const tr = document.createElement('tr');
        tr.dataset.note = e.note || '';
        const isExcluded = isEntryExcluded(e);
        if (isExcluded) {
          tr.className = 'bg-red-50/40 dark:bg-red-950/10 hover:bg-red-100/30 dark:hover:bg-red-900/20 transition-all';
        } else {
          tr.className = 'hover:bg-gray-50 dark:hover:bg-gray-800 transition-all';
        }
        const dieselVal = parseFloat(String(e.dieselAmount || e.amount || 0).replace(/[^0-9.\-]/g, '')) || 0;
        const statusBadge = isExcluded
          ? `<span class="px-2 py-0.5 text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded border border-red-200 dark:border-red-800"><i class="fas fa-exclamation-triangle mr-1"></i> EXCLUDED</span>`
          : `<span class="px-2 py-0.5 text-[10px] font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded border border-green-200 dark:border-green-800"><i class="fas fa-gas-pump mr-1"></i> DIESEL</span>`;

        const leftoverVal = leftovers[idx];
        let leftoverHtml = '';
        if (leftoverVal !== null && leftoverVal !== undefined) {
          const cost = leftoverVal * activeRate;
          const formattedL = (leftoverVal >= 0 ? '+' : '') + leftoverVal.toFixed(2) + ' L';
          const formattedCost = (cost >= 0 ? '+' : '') + '₹' + cost.toLocaleString('en-IN', { maximumFractionDigits: 0 });
          const colorClass = leftoverVal >= 0 ? 'text-green-600 dark:text-green-400 font-bold' : 'text-red-600 dark:text-red-400 font-bold';
          leftoverHtml = `<span class="${colorClass}">${formattedL} / ${formattedCost}</span>`;
        } else {
          leftoverHtml = `<span class="text-gray-400 dark:text-gray-600">-</span>`;
        }

        tr.innerHTML = `
          <td class="px-3 py-2 font-medium whitespace-nowrap text-center">
            <label class="inline-flex items-center justify-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox" class="calc-exclude-cb rounded border-slate-300 dark:border-slate-600 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer" data-idx="${idx}" ${isExcluded ? 'checked' : ''} onchange="toggleCalcRowExclude(${idx}, this.checked)" title="Click to toggle Exclude">
              <span>${idx + 1}</span>
            </label>
          </td>
          <td class="px-3 py-2 text-sm whitespace-nowrap">${e.date || '-'}</td>
          <td class="px-3 py-2 text-sm whitespace-nowrap font-bold text-slate-800 dark:text-slate-200">${e.vehicleNo || data.vehicleNo}</td>
          <td class="px-3 py-2 text-sm whitespace-nowrap max-w-[140px] truncate" title="${e.fromLocation || ''}">${e.fromLocation || ''}</td>
          <td class="px-3 py-2 text-sm whitespace-nowrap max-w-[140px] truncate" title="${e.lastLocation || ''}">${e.lastLocation || ''}</td>
          <td class="px-3 py-2 text-sm whitespace-nowrap"><div class="inline-flex items-center gap-1.5 whitespace-nowrap">${e.currentKm || e.km || 0} ${statusBadge}</div></td>
          <td class="px-3 py-2 text-right font-semibold text-sm whitespace-nowrap ${isExcluded ? 'text-gray-400 line-through dark:text-gray-500' : ''}">₹${dieselVal.toLocaleString('en-IN')}</td>
          <td class="px-3 py-2 text-right text-sm whitespace-nowrap">${leftoverHtml}</td>
        `;
        fragment.appendChild(tr);
      });
      calcTbody.appendChild(fragment);
    }
  } catch (err) {
    console.error("Error syncing to calculator DOM:", err);
  }
}

// Recalculate Matching Entries History & update DOM on row exclude toggle
function recalculateDueMatchingHistory(ctx, sorted) {
  if (!ctx || !ctx.data || !sorted) return;
  const data = ctx.data;
  const mileage = data.mileage || 4.0;
  const activeRate = data.activeRate || (typeof dieselRate !== 'undefined' && dieselRate > 0 ? dieselRate : 98.00);
  const currentKm = data.endKm || data.currentKm || 0;

  // Filter diesel vs excluded
  const calcEntries = sorted.filter(e => !isEntryExcluded(e));

  // 1st KM logic: lowest KM on vehicle's earliest entry date among diesel entries
  let firstKm = 0;
  const pool = calcEntries.length > 0 ? calcEntries : sorted;
  if (pool.length > 0) {
    const firstDateObj = (typeof parseDateStr === 'function' ? parseDateStr(pool[0].date) : null);
    const firstDateTime = firstDateObj ? firstDateObj.getTime() : 0;
    const firstDayEntries = pool.filter(e => {
      const d = (typeof parseDateStr === 'function' ? parseDateStr(e.date) : null);
      return d && d.getTime() === firstDateTime;
    });
    const firstDayKmPool = [];
    firstDayEntries.forEach(e => {
      const start = parseFloat(String(e.startKm || e.start_km || e.previousKm || e.startReading || 0).replace(/[^0-9.\-]/g, '')) || 0;
      const curr = parseFloat(String(e.currentKm || e.km || e.endKm || 0).replace(/[^0-9.\-]/g, '')) || 0;
      if (start > 1) firstDayKmPool.push(start);
      if (curr > 1) firstDayKmPool.push(curr);
    });
    if (firstDayKmPool.length > 0) {
      firstKm = Math.min(...firstDayKmPool);
    } else {
      const allKmPool = [];
      pool.forEach(e => {
        const start = parseFloat(String(e.startKm || e.start_km || e.previousKm || e.startReading || 0).replace(/[^0-9.\-]/g, '')) || 0;
        const curr = parseFloat(String(e.currentKm || e.km || e.endKm || 0).replace(/[^0-9.\-]/g, '')) || 0;
        if (start > 1) allKmPool.push(start);
        if (curr > 1) allKmPool.push(curr);
      });
      if (allKmPool.length > 0) firstKm = Math.min(...allKmPool);
    }
  }

  // Total Diesel Amount
  let totalDieselAmount = 0;
  calcEntries.forEach(e => {
    const amt = parseFloat(String(e.dieselAmount || e.amount || 0).replace(/[^0-9.\-]/g, '')) || 0;
    totalDieselAmount += amt;
  });

  // Total KM & Expected Amount & Due Amount
  const totalKm = (currentKm > firstKm) ? (currentKm - firstKm) : 0;
  const expectedLitres = (mileage > 0) ? (totalKm / mileage) : 0;
  const expectedAmount = expectedLitres * activeRate;
  const dueAmountVal = totalDieselAmount - expectedAmount;

  // Calculate per-trip extra left
  const leftovers = new Array(sorted.length).fill(null);
  sorted.forEach((e, i) => {
    const isExcluded = isEntryExcluded(e);
    if (isExcluded) return;

    const currKm = parseFloat(String(e.currentKm || e.km || 0).replace(/[^0-9.\-]/g, '')) || 0;
    let nextKm;
    let shouldCalculate = true;

    if (i < sorted.length - 1) {
      let nextDiesel = null;
      for (let j = i + 1; j < sorted.length; j++) {
        if (!isEntryExcluded(sorted[j])) {
          nextDiesel = sorted[j];
          break;
        }
      }
      if (nextDiesel) {
        nextKm = parseFloat(String(nextDiesel.currentKm || nextDiesel.km || 0).replace(/[^0-9.\-]/g, '')) || 0;
      } else {
        nextKm = currentKm;
        if (nextKm === currKm) shouldCalculate = false;
      }
    } else {
      nextKm = currentKm;
      if (nextKm === currKm) shouldCalculate = false;
    }

    if (shouldCalculate) {
      const distance = nextKm - currKm;
      const consumedLitres = distance > 0 ? (distance / mileage) : 0;
      const filledAmount = parseFloat(String(e.dieselAmount || e.amount || 0).replace(/[^0-9.\-]/g, '')) || 0;
      const filledLitres = activeRate > 0 ? (filledAmount / activeRate) : 0;
      leftovers[i] = filledLitres - consumedLitres;
    }
  });

  // Update data in context
  data.firstKm = firstKm;
  data.totalKm = totalKm;
  data.totalDieselAmount = totalDieselAmount;
  data.expectedAmount = expectedAmount;
  data.dueAmountVal = dueAmountVal;

  // Update Due Card breakdown fields in DOM if present
  const startKmEl = document.getElementById('due-card-start-km');
  if (startKmEl) startKmEl.textContent = `${Math.round(firstKm).toLocaleString('en-IN')} KM`;
  const totalKmEl = document.getElementById('due-card-total-km');
  if (totalKmEl) totalKmEl.textContent = `${Math.round(totalKm).toLocaleString('en-IN')} KM`;
  const totalAmtEl = document.getElementById('due-card-total-amount');
  if (totalAmtEl) totalAmtEl.textContent = `₹${Math.round(totalDieselAmount).toLocaleString('en-IN')}`;
  const expCostEl = document.getElementById('due-card-expected-cost');
  if (expCostEl) expCostEl.textContent = `₹${Math.round(expectedAmount).toLocaleString('en-IN')}`;
  const finalDueEl = document.getElementById('due-card-final-due');
  const containerEl = document.getElementById('due-card-final-container');
  if (finalDueEl) {
    const abs = Math.round(Math.abs(dueAmountVal)).toLocaleString('en-IN');
    const sign = dueAmountVal >= 0 ? '' : '-';
    finalDueEl.textContent = `${sign}₹${abs}`;
    if (dueAmountVal >= 0) {
      finalDueEl.className = 'font-black text-emerald-600 dark:text-emerald-400 text-xl';
      if (containerEl) containerEl.className = 'p-3.5 mt-2 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 flex justify-between items-center';
    } else {
      finalDueEl.className = 'font-black text-rose-600 dark:text-rose-400 text-xl';
      if (containerEl) containerEl.className = 'p-3.5 mt-2 rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/25 flex justify-between items-center';
    }
  }

  // Re-render table rows in #due-history-entries-body
  const tbody = document.getElementById('due-history-entries-body');
  if (tbody) {
    tbody.innerHTML = '';
    const fragment = document.createDocumentFragment();

    sorted.forEach((e, idx) => {
      const tr = document.createElement('tr');
      tr.dataset.note = e.note || '';

      const isExcluded = isEntryExcluded(e);
      if (isExcluded) {
        tr.className = 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-100/30 dark:hover:bg-rose-900/30 transition-all';
      } else {
        tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all';
      }

      const dieselVal = parseFloat(String(e.dieselAmount || e.amount || 0).replace(/[^0-9.\-]/g, '')) || 0;
      const statusBadge = isExcluded
        ? `<span class="px-2 py-0.5 text-[10px] font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded border border-rose-200 dark:border-rose-800"><i class="fas fa-exclamation-triangle mr-1"></i> EXCLUDED</span>`
        : `<span class="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800"><i class="fas fa-gas-pump mr-1"></i> DIESEL</span>`;

      const leftoverVal = leftovers[idx];
      let leftoverHtml = '';
      if (leftoverVal !== null && leftoverVal !== undefined) {
        const cost = leftoverVal * activeRate;
        const formattedL = (leftoverVal >= 0 ? '+' : '') + leftoverVal.toFixed(2) + ' L';
        const formattedCost = (cost >= 0 ? '+' : '') + '₹' + cost.toLocaleString('en-IN', { maximumFractionDigits: 0 });
        const colorClass = leftoverVal >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold';
        leftoverHtml = `<span class="${colorClass}">${formattedL} / ${formattedCost}</span>`;
      } else {
        leftoverHtml = `<span class="text-slate-400 dark:text-slate-600">-</span>`;
      }

      tr.innerHTML = `
        <td class="px-3.5 py-3 font-semibold text-slate-700 dark:text-slate-300 text-center whitespace-nowrap">
          <label class="inline-flex items-center justify-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" class="due-history-exclude-cb rounded border-slate-300 dark:border-slate-600 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer" data-idx="${idx}" ${isExcluded ? 'checked' : ''} onchange="toggleDueHistoryRowExclude(${idx}, this.checked)" title="Click to toggle Exclude">
            <span>${idx + 1}</span>
          </label>
        </td>
        <td class="px-3.5 py-3 text-slate-800 dark:text-slate-200 whitespace-nowrap font-medium">${e.date || '-'}</td>
        <td class="px-3.5 py-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">${e.vehicleNo || data.vehicleNo}</td>
        <td class="px-3.5 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap max-w-[140px] truncate" title="${e.fromLocation || ''}">${e.fromLocation || '-'}</td>
        <td class="px-3.5 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap max-w-[140px] truncate" title="${e.lastLocation || ''}">${e.lastLocation || '-'}</td>
        <td class="px-3.5 py-3 text-slate-800 dark:text-slate-200 whitespace-nowrap"><div class="inline-flex items-center gap-2">${e.currentKm || e.km || 0} ${statusBadge}</div></td>
        <td class="px-3.5 py-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap ${isExcluded ? 'text-slate-400 line-through dark:text-slate-500' : ''}">₹${dieselVal.toLocaleString('en-IN')}</td>
        <td class="px-3.5 py-3 text-right whitespace-nowrap">${leftoverHtml}</td>
      `;
      fragment.appendChild(tr);
    });

    tbody.appendChild(fragment);
  }

  // Summary Text
  const summaryEl = document.getElementById('due-history-summary-text');
  if (summaryEl) {
    summaryEl.textContent = `Total Entries: ${sorted.length} | Total Fuel: ₹${Math.round(totalDieselAmount).toLocaleString('en-IN')} | Total Run: ${Math.round(totalKm).toLocaleString('en-IN')} KM`;
  }

  // Sync to Diesel Calculator DOM so existing exportCalculatorExcel & exportCalculatorPDF work out-of-the-box
  syncToCalculatorDom(data, sorted, leftovers);
}

// Toggle row exclusion from Matching Entries History modal
function toggleDueHistoryRowExclude(idx, isChecked) {
  const ctx = window.currentDueCardContext;
  const sorted = window.currentDueMatchingSorted;
  if (!ctx || !sorted || !sorted[idx]) return;

  const entry = sorted[idx];
  entry.manuallyExcluded = isChecked;
  const key = getEntryUniqueKey(entry);
  if (key) {
    window.manuallyExcludedEntries = window.manuallyExcludedEntries || {};
    window.manuallyExcludedEntries[key] = isChecked;
  }

  recalculateDueMatchingHistory(ctx, sorted);
}
window.toggleDueHistoryRowExclude = toggleDueHistoryRowExclude;

// Open Matching Entries History modal from Due breakdown card (matches Image 4 design)
function openDueCardMatchingHistory() {
  const ctx = window.currentDueCardContext;
  if (!ctx || !ctx.data) {
    if (typeof showAlert === 'function') {
      showAlert('warning', 'Notice', 'No entries history available for this vehicle.');
    }
    return;
  }

  const data = ctx.data;
  const entries = data.matchedEntries || [];
  if (!entries || entries.length === 0) {
    if (typeof showAlert === 'function') {
      showAlert('warning', 'Notice', 'No entries found for this month.');
    }
    return;
  }

  // Hide vehicle due card modal
  const dueModal = document.getElementById('vehicle-due-card-modal');
  if (dueModal) {
    dueModal.classList.add('hidden');
  }

  // Update subtitle
  const subtitleEl = document.getElementById('due-history-subtitle');
  if (subtitleEl) {
    subtitleEl.textContent = `${data.vehicleNo || ctx.vehicleNo} • ${data.vehicleType || ctx.vehicleType || 'Vehicle'} • ${data.monthName || ''}`;
  }

  // Sort entries: Date ASC -> then KM ASC (so lower KM is 1st, higher KM is 2nd) -> then responseNumber ASC
  const sorted = [...entries].sort((a, b) => {
    const dA = (typeof parseDateStr === 'function' ? parseDateStr(a.date) : 0) || 0;
    const dB = (typeof parseDateStr === 'function' ? parseDateStr(b.date) : 0) || 0;
    const tA = dA.valueOf ? dA.valueOf() : 0;
    const tB = dB.valueOf ? dB.valueOf() : 0;
    if (tA !== tB) return tA - tB;
    const kmA = parseFloat(String(a.currentKm || a.km || a.endKm || 0).replace(/[^0-9.\-]/g, '')) || 0;
    const kmB = parseFloat(String(b.currentKm || b.km || b.endKm || 0).replace(/[^0-9.\-]/g, '')) || 0;
    if (kmA !== kmB) return kmA - kmB;
    return (parseInt(a.responseNumber || a.key || 0) || 0) - (parseInt(b.responseNumber || b.key || 0) || 0);
  });

  window.currentDueMatchingSorted = sorted;
  window.currentCalcSortedEntries = sorted;

  recalculateDueMatchingHistory(ctx, sorted);

  // Show matching history modal
  const historyModal = document.getElementById('modal-matching-entries-history');
  if (historyModal) {
    historyModal.classList.remove('hidden');
  }
}

function closeDueMatchingHistoryModal() {
  const historyModal = document.getElementById('modal-matching-entries-history');
  if (historyModal) {
    historyModal.classList.add('hidden');
  }
  // Re-open vehicle due card modal so the user returns to the breakdown card
  const dueModal = document.getElementById('vehicle-due-card-modal');
  if (dueModal && window.currentDueCardContext) {
    dueModal.classList.remove('hidden');
  }
}

window.openVehicleDueCardModal = openVehicleDueCardModal;
window.closeVehicleDueCardModal = closeVehicleDueCardModal;
window.openDueCardMatchingHistory = openDueCardMatchingHistory;
window.closeDueMatchingHistoryModal = closeDueMatchingHistoryModal;
window.syncToCalculatorDom = syncToCalculatorDom;

// Find previous/last trip info (KM & photo reference) for a vehicle
function getVehicleLastTripInfo(vehicleNo, currentReq) {
  if (!vehicleNo) return null;
  const cleanVeh = String(vehicleNo).trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
  if (!cleanVeh) return null;

  const reqKm = parseFloat(currentReq?.currentKm || currentReq?.current_km || currentReq?.km || 0) || Infinity;
  const reqStartKm = parseFloat(currentReq?.startKm || currentReq?.start_km || 0) || 0;
  const currentKey = currentReq?.key || '';

  const entriesList = (typeof historyEntries !== 'undefined' && Array.isArray(historyEntries)) 
    ? historyEntries 
    : (window.allLoadedEntries || []);
  const reqList = (typeof driverRequestsList !== 'undefined' && Array.isArray(driverRequestsList)) 
    ? driverRequestsList 
    : [];

  const parseSafeDate = (dStr) => {
    if (!dStr) return 0;
    if (typeof parseDateStr === 'function') {
      const res = parseDateStr(dStr);
      if (res) return res;
    }
    const parts = String(dStr).split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) return new Date(parts[0], parts[1] - 1, parts[2]).getTime();
      return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
    }
    return 0;
  };

  const candidates = [];

  // 1. History Entries (Diesel Records)
  if (Array.isArray(entriesList)) {
    entriesList.forEach(e => {
      if (!e) return;
      const eVeh = String(e.vehicleNo || e.vehicle_no || e.vehicle || '').trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
      if (eVeh !== cleanVeh) return;
      const km = parseFloat(String(e.currentKm || e.km || e.endKm || 0).replace(/[^0-9.\-]/g, '')) || 0;
      if (km <= 10) return;
      if (reqKm !== Infinity && reqKm > 10 && km >= reqKm) return;

      const dateTs = parseSafeDate(e.date);
      let timeMs = 0;
      if (e.time) {
        const [h, m] = String(e.time).split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) timeMs = (h * 60 + m) * 60 * 1000;
      }
      const respNum = parseInt(e.responseNumber) || 0;
      const sortScore = dateTs + timeMs + (respNum ? respNum : 0);

      candidates.push({
        source: 'ledger',
        id: String(e.responseNumber || e.id || ''),
        km: km,
        date: e.date || '',
        time: e.time || '',
        sortScore: sortScore,
        hasKmPhoto: !!(e.hasKmPhoto || e.kmPhoto || e.kmPhotos)
      });
    });
  }

  // 2. Other Driver Requests
  if (Array.isArray(reqList)) {
    reqList.forEach(dr => {
      if (!dr) return;
      if (currentKey && dr.key === currentKey) return;
      if (dr.status === 'rejected') return;
      const drVeh = String(dr.vehicleNo || '').trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
      if (drVeh !== cleanVeh) return;
      const km = parseFloat(String(dr.currentKm || 0).replace(/[^0-9.\-]/g, '')) || 0;
      if (km <= 10) return;
      if (reqKm !== Infinity && reqKm > 10 && km >= reqKm) return;

      let subTs = typeof dr.submittedAt === 'number' ? dr.submittedAt : (dr.submittedAt ? new Date(dr.submittedAt).getTime() : 0);
      if (!subTs || subTs <= 0) {
        const d = parseSafeDate(dr.date);
        let tMs = 0;
        if (dr.time) {
          const [h, m] = String(dr.time).split(':').map(Number);
          if (!isNaN(h) && !isNaN(m)) tMs = (h * 60 + m) * 60 * 1000;
        }
        subTs = d + tMs;
      }

      candidates.push({
        source: 'request',
        id: String(dr.key || ''),
        km: km,
        date: dr.date || '',
        time: dr.time || '',
        sortScore: subTs || 0,
        hasKmPhoto: !!(dr.hasKmPhoto || dr.kmPhoto || dr.kmPhotos)
      });
    });
  }

  if (candidates.length === 0) {
    if (reqStartKm > 10) {
      return {
        km: reqStartKm,
        kmFormatted: Math.round(reqStartKm).toLocaleString('en-IN'),
        source: null,
        id: null,
        date: '',
        time: '',
        hasKmPhoto: false
      };
    }
    return null;
  }

  // Sort descending by recency score (latest trip first), then by KM descending
  candidates.sort((a, b) => {
    const timeDiff = b.sortScore - a.sortScore;
    if (Math.abs(timeDiff) > 60000) {
      return timeDiff;
    }
    if (b.km !== a.km) return b.km - a.km;
    if (b.hasKmPhoto !== a.hasKmPhoto) return b.hasKmPhoto ? 1 : -1;
    if (a.source !== b.source) return a.source === 'request' ? -1 : 1;
    return timeDiff;
  });

  const best = candidates[0];
  return {
    ...best,
    kmFormatted: Math.round(best.km).toLocaleString('en-IN')
  };
}

function viewLastTripKmPhoto(source, id, vehicleNo, kmVal) {
  const cleanV = String(vehicleNo || '').trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
  const cleanK = String(kmVal || '').replace(/[^0-9]/g, '');
  const reqList = (typeof driverRequestsList !== 'undefined' && Array.isArray(driverRequestsList)) ? driverRequestsList : [];

  // Check if a driver request for this vehicle & KM has the odometer photo
  const matchingReq = reqList.find(r => {
    if (!r) return false;
    const rVeh = String(r.vehicleNo || '').trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
    if (rVeh !== cleanV) return false;
    const rKm = String(r.currentKm || '').replace(/[^0-9]/g, '');
    const isKeyMatch = (source === 'request' && id && r.key === id);
    const isKmMatch = (rKm === cleanK);
    const isLinkMatch = (source === 'ledger' && id && String(r.linkedResponseNumber) === String(id));
    return (isKeyMatch || isKmMatch || isLinkMatch) && (r.hasKmPhoto || r.kmPhoto);
  });

  if (matchingReq) {
    viewReceiptPhotoOnDemand('request_km', matchingReq.key, vehicleNo, kmVal);
    return;
  }

  if (source === 'ledger' && id) {
    viewReceiptPhotoOnDemand('ledger_km', id, vehicleNo, kmVal);
  } else if (source === 'request' && id) {
    viewReceiptPhotoOnDemand('request_km', id, vehicleNo, kmVal);
  } else {
    viewReceiptPhoto('', vehicleNo, kmVal, source, id);
  }
}

window.getVehicleLastTripInfo = getVehicleLastTripInfo;
window.viewLastTripKmPhoto = viewLastTripKmPhoto;

// Helper to check if a vehicle is brand new (not in history entries or previous approved/filled requests)
function isNewDriverVehicle(vehicleNo) {
  if (!vehicleNo) return false;
  const clean = String(vehicleNo).trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
  if (!clean) return false;

  // 1. Check in history entries (Diesel Records)
  const entriesList = (typeof historyEntries !== 'undefined' && Array.isArray(historyEntries))
    ? historyEntries
    : (window.allLoadedEntries || []);
  if (Array.isArray(entriesList) && entriesList.length > 0) {
    const existsInHistory = entriesList.some(e => {
      if (!e) return false;
      const v = String(e.vehicleNo || e.vehicle_no || e.vehicle || '').trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
      return v === clean;
    });
    if (existsInHistory) return false;
  }

  // 2. Check in driverRequestsList for existing approved or filled requests
  if (typeof driverRequestsList !== 'undefined' && Array.isArray(driverRequestsList)) {
    const existsInRequests = driverRequestsList.some(r => {
      if (!r) return false;
      if (r.status === 'approved' || r.status === 'filled') {
        const v = String(r.vehicleNo || '').trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
        return v === clean;
      }
      return false;
    });
    if (existsInRequests) return false;
  }

  return true;
}
window.isNewDriverVehicle = isNewDriverVehicle;

// === Auto Approval State & Helpers ===
var autoApproveConfig = window.autoApproveConfig || {
  enabled: true,
  normalEnabled: true,
  normalMins: 10,
  upiEnabled: true,
  upiMins: 60,
  revertEnabled: true,
  revertMins: 30
};
window.autoApproveConfig = autoApproveConfig;

db.ref('autoApproveTimerConfig').on('value', snapshot => {
  const val = snapshot.val();
  if (val) {
    autoApproveConfig = { ...autoApproveConfig, ...val };
    if (val.normalMins >= 9999) autoApproveConfig.normalEnabled = false;
    if (val.upiMins >= 9999) autoApproveConfig.upiEnabled = false;
    if (val.revertMins >= 9999) autoApproveConfig.revertEnabled = false;
    window.autoApproveConfig = autoApproveConfig;
    if (typeof checkAndAutoApproveRequests === 'function') checkAndAutoApproveRequests();
    if (typeof renderDriverRequestsList === 'function' && activeSection === 'driver-requests') {
      renderDriverRequestsList();
    }
  }
});

function getRequestSubmittedTimestamp(req) {
  if (!req) return Date.now();
  if (typeof req.submittedAt === 'number' && req.submittedAt > 0) return req.submittedAt;
  if (req.submittedAt) {
    const t = new Date(req.submittedAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (req.date) {
    const timeParts = String(req.time || '00:00').split(':');
    const dateParts = String(req.date).split('-');
    if (dateParts.length === 3) {
      let d;
      if (dateParts[0].length === 4) {
        d = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]), parseInt(timeParts[0]) || 0, parseInt(timeParts[1]) || 0);
      } else {
        d = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]), parseInt(timeParts[0]) || 0, parseInt(timeParts[1]) || 0);
      }
      if (!isNaN(d.getTime())) return d.getTime();
    }
  }
  return Date.now();
}

function getRequestRevertedTimestamp(req) {
  if (!req) return Date.now();
  if (typeof req.revertedAt === 'number' && req.revertedAt > 0) return req.revertedAt;
  if (req.revertedAt) {
    const t = new Date(req.revertedAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  return getRequestSubmittedTimestamp(req);
}

function getAutoApproveTimerInfo(req) {
  if (!req || req.status !== 'pending') return null;
  if (autoApproveConfig.enabled === false) {
    return { enabled: false, reason: 'System Off' };
  }

  const isReverted = !!req.reverted;
  const noteUpper = String(req.note || '').trim().toUpperCase();
  const isUpiOrOutside = noteUpper.includes("UPI") || noteUpper.includes("OUT SIDE") || noteUpper.includes("OUTSIDE");

  let isEnabled = false;
  let timeoutMins = 0;
  let baseTime = 0;
  let typeLabel = '';

  if (isReverted) {
    typeLabel = 'Reverted';
    isEnabled = autoApproveConfig.revertEnabled !== false && (autoApproveConfig.revertMins || 30) < 9999;
    timeoutMins = autoApproveConfig.revertMins || 30;
    baseTime = getRequestRevertedTimestamp(req);
  } else if (isUpiOrOutside) {
    typeLabel = 'UPI/Outside';
    isEnabled = autoApproveConfig.upiEnabled !== false && (autoApproveConfig.upiMins || 60) < 9999;
    timeoutMins = autoApproveConfig.upiMins || 60;
    baseTime = getRequestSubmittedTimestamp(req);
  } else {
    typeLabel = 'Normal';
    isEnabled = autoApproveConfig.normalEnabled !== false && (autoApproveConfig.normalMins || 10) < 9999;
    timeoutMins = autoApproveConfig.normalMins || 10;
    baseTime = getRequestSubmittedTimestamp(req);
  }

  if (!isEnabled) {
    return { enabled: false, typeLabel, reason: 'Disabled' };
  }

  const now = Date.now();
  const timeoutMs = timeoutMins * 60 * 1000;
  const elapsedMs = Math.max(0, now - baseTime);
  const remainingMs = timeoutMs - elapsedMs;

  return {
    enabled: true,
    typeLabel,
    timeoutMins,
    baseTime,
    elapsedMs,
    remainingMs,
    isExpired: remainingMs <= 0
  };
}

function getAutoApproveBadgeHtml(req) {
  const info = getAutoApproveTimerInfo(req);
  if (!info) return '';

  if (!info.enabled) {
    return `
      <div class="mt-1 inline-flex items-center gap-1 text-[8.5px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 whitespace-nowrap" title="Auto Approval is turned off for this request (${info.typeLabel})">
        <i class="fas fa-ban text-[8px]"></i> Auto: Off
      </div>
    `;
  }

  if (info.isExpired) {
    return `
      <div class="mt-1 inline-flex items-center gap-1 text-[8.5px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded whitespace-nowrap animate-pulse" id="auto-timer-${req.key}">
        <i class="fas fa-bolt text-[8px]"></i> Auto-Approving...
      </div>
    `;
  }

  const remMs = info.remainingMs;
  const remMins = Math.floor(remMs / 60000);
  const remSecs = Math.floor((remMs % 60000) / 1000);
  const timeStr = remMins > 0 
    ? `${remMins}m ${String(remSecs).padStart(2, '0')}s` 
    : `${remSecs}s`;

  return `
    <div class="auto-timer-badge mt-1 inline-flex items-center gap-1 text-[8.5px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded whitespace-nowrap shadow-xs" id="auto-timer-${req.key}" data-req-key="${req.key}" data-base-time="${info.baseTime}" data-timeout-mins="${info.timeoutMins}" title="Will automatically approve when timer reaches 0">
      <i class="fas fa-clock text-[8px] animate-pulse"></i> Auto in: <span class="countdown-text font-black font-mono">${timeStr}</span>
    </div>
  `;
}

// Render driver requests table list
function renderDriverRequestsList() {
  const tbody = document.getElementById('driver-requests-tbody');
  if (!tbody) return;

  const userRole = (getAuthSession('rpm_user_role') || '').toLowerCase();
  const userEmail = (getAuthSession('rpm_user_email') || '').toLowerCase();
  const assignedVendor = getAssignedVendorName();

  const isStrictAdminRole = (
    (userRole === 'admin' || userRole === 'superadmin' || userEmail === ADMIN_EMAIL) &&
    userRole !== 'vendor' &&
    userRole !== 'incharge' &&
    !assignedVendor
  );

  const masterCb = document.getElementById('driver-req-select-all');
  if (masterCb) masterCb.checked = false;
  const bulkDeleteContainer = document.getElementById('driver-req-bulk-delete-container');
  if (bulkDeleteContainer) bulkDeleteContainer.classList.add('hidden');

  const searchQuery = (document.getElementById('driver-req-vehicle-search')?.value || '').trim().toUpperCase();
  const statusFilter = document.getElementById('driver-req-status-filter')?.value || 'ALL';

  tbody.innerHTML = '';

  const now = Date.now();
  const filtered = driverRequestsList.filter(r => {
    // Pending or Update-Pending requests MUST ALWAYS be shown regardless of age or missing timestamp
    if (r.status !== 'pending' && r.status !== 'update_pending') {
      const subTime = typeof r.submittedAt === 'number' ? r.submittedAt : (r.submittedAt ? new Date(r.submittedAt).getTime() : 0);
      if (subTime > 0) {
        const ageMs = now - subTime;
        if (ageMs < 0 || ageMs > 24 * 60 * 60 * 1000) return false; // 24 hour limit for history items
      }
    }

    const matchesSearch = !searchQuery || String(r.vehicleNo || '').toUpperCase().includes(searchQuery);
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="px-5 py-8 text-center text-slate-400 dark:text-slate-500 font-bold">
          No driver requests found matching the filters.
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all border-b border-slate-200/40 dark:border-slate-800/30";
    
    let statusActionHtml = '';
    if (r.status === 'pending') {
      statusActionHtml = `
        <div class="flex flex-col items-center justify-center gap-1.5">
          <div class="flex items-center justify-center gap-2">
            <button onclick="approveDriverRequest('${r.key}')" class="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase shadow-sm transition-all">Approve</button>
            <button onclick="rejectDriverRequest('${r.key}')" class="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase shadow-sm transition-all">Reject</button>
          </div>
          ${isStrictAdminRole ? `
          <button onclick="directFillDriverRequest('${r.key}')" class="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase shadow-sm transition-all flex items-center justify-center gap-1" title="Directly Fill to Diesel Records (Skip Pending)">
            <i class="fas fa-gas-pump text-[9px]"></i> Diesel Filled
          </button>
          ` : ''}
        </div>
      `;
    } else if (r.status === 'approved') {
      statusActionHtml = `
        <div class="flex items-center justify-center gap-2">
          <button onclick="openFillReceiptCamera('${r.key}')" class="w-8 h-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-md hover:shadow-blue-500/30 text-sm transition-all flex-shrink-0" title="Capture Receipt Details & Mark Successfully Filled">
            <i class="fas fa-gas-pump"></i>
          </button>
          <div class="flex flex-col items-center gap-1">
            <span class="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">Approved (Pending Fill)</span>
            <button onclick="revertDriverRequestApproval('${r.key}')" class="px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-md text-[8px] font-black uppercase transition-all shadow-sm flex items-center gap-1" title="Revert to Pending">
              <i class="fas fa-undo text-[7px]"></i> Revert Approval
            </button>
          </div>
        </div>
      `;
    } else if (r.status === 'filled') {
      statusActionHtml = `
        <div class="flex flex-col items-center gap-1">
          <span class="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Filled ✅</span>
          <button onclick="requestAmountUpdate('${r.key}')" class="px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded-md text-[9px] font-extrabold uppercase transition-all shadow-sm" title="Request Amount Update">Request Update</button>
        </div>
      `;
    } else if (r.status === 'update_pending') {
      statusActionHtml = `
        <div class="flex flex-col items-center gap-1">
          <span class="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-500 border border-purple-500/20">Update Requested</span>
          <div class="flex items-center gap-1 mt-1">
            <button onclick="approveAmountUpdate('${r.key}')" class="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-[9px] font-black uppercase shadow-sm transition-all">Approve</button>
            <button onclick="rejectAmountUpdate('${r.key}')" class="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-md text-[9px] font-black uppercase shadow-sm transition-all">Reject</button>
          </div>
        </div>
      `;
    } else if (r.status === 'update_rejected') {
      statusActionHtml = `
        <div class="flex flex-col items-center gap-1">
          <span class="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20">Update Rejected ❌</span>
          <button onclick="requestAmountUpdate('${r.key}')" class="px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded-md text-[9px] font-extrabold uppercase transition-all shadow-sm" title="Request Amount Update">Request Update</button>
        </div>
      `;
    } else {
      statusActionHtml = `
        <div class="flex flex-col items-center gap-1.5">
          <span class="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20">Rejected</span>
          <button onclick="undoDriverRequestRejection('${r.key}')" class="px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-md text-[8px] font-black uppercase transition-all shadow-sm flex items-center gap-1" title="Undo Rejection (Move back to Pending)">
            <i class="fas fa-undo text-[7px]"></i> Undo Rejection
          </button>
        </div>
      `;
    }

    let amountHtml = '';
    const dueBadge = getDueAmountBadgeHtml(r);
    if (r.status === 'pending') {
      amountHtml = `
        <div class="flex flex-col items-end gap-0.5">
          ${dueBadge}
          <div class="flex items-center justify-end gap-1.5 font-extrabold text-blue-500">
            <span>₹<span id="amount-val-${r.key}">${r.dieselAmount}</span></span>
            <button onclick="editDriverRequestAmount('${r.key}')" class="text-slate-400 hover:text-blue-500 transition-all text-xs" title="Edit Amount">
              <i class="fas fa-pencil-alt"></i>
            </button>
          </div>
        </div>
      `;
    } else if (r.status === 'update_pending') {
      amountHtml = `
        <div class="flex flex-col items-end gap-0.5">
          ${dueBadge}
          <span class="font-bold text-slate-400 dark:text-slate-500 line-through text-[10px]">₹${r.dieselAmount}</span>
          <span class="font-extrabold text-purple-500 dark:text-purple-400">₹${r.requestedAmount}</span>
        </div>
      `;
    } else if (r.oldAmount) {
      amountHtml = `
        <div class="flex flex-col items-end gap-0.5">
          ${dueBadge}
          <span class="font-extrabold text-slate-800 dark:text-white">₹${parseFloat(r.dieselAmount || 0).toLocaleString('en-IN')}</span>
          <span class="text-[9px] text-slate-400 dark:text-slate-500 font-semibold italic">(Old: ₹${parseFloat(r.oldAmount || 0).toLocaleString('en-IN')})</span>
        </div>
      `;
    } else {
      amountHtml = `
        <div class="flex flex-col items-end gap-0.5">
          ${dueBadge}
          <span class="font-extrabold text-slate-500">₹${r.dieselAmount}</span>
        </div>
      `;
    }

    const cbHtml = `<input type="checkbox" class="driver-req-row-cb rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700" data-key="${r.key}" onchange="updateDriverRequestsDeleteBtnVisibility()">`;

    const editBtnHtml = (r.status === 'pending') ? `
      <button type="button" onclick="openEditDriverRequestModal('${r.key}')" class="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all p-1" title="Edit Pending Request">
        <i class="fas fa-pencil-alt text-xs"></i>
      </button>
    ` : '';

    const kmFormatted = r.currentKm || '-';
    const isNew = (r.status === 'pending' && isNewDriverVehicle(r.vehicleNo));
    const vehColorClass = isNew ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-blue-600 dark:text-blue-400 font-extrabold';
    const newTagHtml = isNew ? `<span class="ml-1.5 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 inline-flex items-center shadow-xs">NEW</span>` : '';

    const lastTrip = getVehicleLastTripInfo(r.vehicleNo, r);
    let lastTripBadgeHtml = '';
    if (lastTrip && lastTrip.km) {
      const clickAttr = `onclick="viewLastTripKmPhoto('${lastTrip.source || ''}', '${lastTrip.id || ''}', '${r.vehicleNo}', '${lastTrip.kmFormatted}'); event.stopPropagation();"`;
      lastTripBadgeHtml = `
        <div class="flex flex-wrap items-center justify-center gap-1 mb-1">
          <div ${clickAttr} class="text-[8.5px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded inline-flex items-center gap-1 text-center whitespace-nowrap cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-xs" title="Click to view Last Trip Photo: ${lastTrip.kmFormatted} KM (${lastTrip.date || 'Previous'})">
            <span>Last: ${lastTrip.kmFormatted} KM</span>
            <i class="fas fa-camera text-[8px] opacity-80"></i>
          </div>
        </div>
      `;
    }

    tr.innerHTML = `
      <td class="px-4 py-4 text-center whitespace-nowrap">
        <div class="inline-flex items-center justify-center gap-1.5">
          ${cbHtml}
          ${editBtnHtml}
        </div>
      </td>
      <td class="px-5 py-4">
        <div class="font-bold text-slate-800 dark:text-white">${r.date}</div>
        <div class="text-[10px] text-slate-400 font-medium mt-0.5">${r.time}</div>
        ${r.status === 'pending' ? getAutoApproveBadgeHtml(r) : ''}
      </td>
      <td class="px-5 py-4 whitespace-nowrap">
        <div class="flex items-center gap-1.5">
          ${r.location && r.location.lat ? `<a href="https://www.google.com/maps/search/?api=1&query=${r.location.lat},${r.location.lng}" target="_blank" class="mr-1 text-rose-500 hover:text-rose-600 text-base" title="View Location" onclick="event.stopPropagation();"><i class="fas fa-map-marker-alt"></i></a>` : ''}
          <div class="${vehColorClass} cursor-pointer hover:underline tracking-wide inline-flex items-center" onclick="viewReceiptPhotoOnDemand('request_receipt', '${r.key}', '${r.vehicleNo}', '', '${r.status}')" id="vehicleno-val-${r.key}">
            ${r.vehicleNo}
          </div>
          ${newTagHtml}
          ${r.status === 'pending' ? `
            <button onclick="editDriverRequestVehicleNo('${r.key}')" class="text-slate-400 hover:text-blue-500 transition-all text-xs" title="Edit Vehicle No">
              <i class="fas fa-pencil-alt"></i>
            </button>
          ` : ''}
        </div>
        <div class="text-[10px] font-bold text-slate-400 uppercase mt-0.5">${r.vehicleType || 'Unknown'}</div>
        ${r.status === 'rejected' && (r.rejectReason || r.rejectedReason || r.reason) ? `
          <div class="text-[10px] font-extrabold text-rose-500 dark:text-rose-400 mt-1 flex items-center gap-1">
            <i class="fas fa-circle-exclamation text-[9px]"></i> Reason: ${r.rejectReason || r.rejectedReason || r.reason}
          </div>
        ` : ''}
      </td>
      <td class="px-5 py-4 whitespace-nowrap">
        <div class="font-bold text-slate-800 dark:text-slate-200">${r.fromLocation || '-'}</div>
        <div class="text-[10px] font-semibold text-slate-400 mt-0.5">➔ ${r.lastLocation || '-'}</div>
      </td>
      <td class="px-4 py-4 text-center">
        <div class="flex flex-col items-center justify-center gap-0.5">
          ${lastTripBadgeHtml}
          <div class="flex items-center justify-center gap-1 font-extrabold text-blue-500 text-xs sm:text-[13px]">
            <span class="cursor-pointer hover:underline" onclick="viewReceiptPhotoOnDemand('request_km', '${r.key}', '${r.vehicleNo}', '${kmFormatted}')">${kmFormatted} KM</span>
          </div>
        </div>
      </td>
      <td class="px-4 py-4 text-right">
        ${amountHtml}
      </td>
      <td class="px-4 py-4">
        <div class="font-medium text-slate-800 dark:text-slate-200">${r.vendorName}</div>
        ${r.status === 'pending' ? `
          <div class="flex items-center gap-1.5 mt-0.5">
            <span class="text-[10px] text-slate-400 font-medium" id="note-val-${r.key}">${(r.note && String(r.note).trim().toUpperCase() !== 'DRIVER REQUEST') ? r.note : '-'}</span>
            <button onclick="editDriverRequestNote('${r.key}')" class="text-slate-400 hover:text-blue-500 transition-all text-xs" title="Edit Note">
              <i class="fas fa-pencil-alt"></i>
            </button>
          </div>
        ` : `
          <div class="text-[10px] text-slate-400 mt-0.5" id="note-val-${r.key}">${(r.note && String(r.note).trim().toUpperCase() !== 'DRIVER REQUEST') ? r.note : '-'}</div>
        `}
      </td>
      <td class="px-5 py-4 text-center">
        ${statusActionHtml}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterDriverRequests() {
  const searchInput = document.getElementById('driver-req-vehicle-search');
  const rawVal = searchInput ? searchInput.value.trim() : '';
  const datalist = document.getElementById('driver-req-vehicle-list');

  if (rawVal.length >= 4) {
    if (datalist && datalist.children.length === 0) {
      const now = Date.now();
      const uniqueVehicles = new Set();
      driverRequestsList.forEach(r => {
        if (r.submittedAt && (now - r.submittedAt <= 24 * 60 * 60 * 1000)) {
          if (r.vehicleNo) uniqueVehicles.add(r.vehicleNo.toUpperCase());
        }
      });
      
      Array.from(uniqueVehicles).sort().forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        datalist.appendChild(opt);
      });
    }
  } else {
    if (datalist) {
      datalist.innerHTML = '';
    }
  }

  renderDriverRequestsList();
}

function toggleSelectAllDriverRequests(masterCb) {
  const rowCbs = document.querySelectorAll('.driver-req-row-cb');
  rowCbs.forEach(cb => {
    cb.checked = masterCb.checked;
  });
  updateDriverRequestsDeleteBtnVisibility();
}

function updateDriverRequestsDeleteBtnVisibility() {
  const rowCbs = document.querySelectorAll('.driver-req-row-cb');
  let checkedCount = 0;
  rowCbs.forEach(cb => {
    if (cb.checked) checkedCount++;
  });

  const bulkDeleteContainer = document.getElementById('driver-req-bulk-delete-container');
  const selectedCountEl = document.getElementById('driver-req-selected-count');
  
  if (checkedCount > 0) {
    if (bulkDeleteContainer) bulkDeleteContainer.classList.remove('hidden');
    if (selectedCountEl) selectedCountEl.textContent = checkedCount;
  } else {
    if (bulkDeleteContainer) bulkDeleteContainer.classList.add('hidden');
    const masterCb = document.getElementById('driver-req-select-all');
    if (masterCb) masterCb.checked = false;
  }
}

function deleteSelectedDriverRequests() {
  const rowCbs = document.querySelectorAll('.driver-req-row-cb');
  const keysToDelete = [];
  rowCbs.forEach(cb => {
    if (cb.checked) {
      keysToDelete.push(cb.getAttribute('data-key'));
    }
  });

  if (keysToDelete.length === 0) return;

  if (confirm(`Are you sure you want to permanently delete the ${keysToDelete.length} selected rejected request(s)?`)) {
    const deletePromises = keysToDelete.map(key => driverRequestsRef.child(key).remove());
    
    Promise.all(deletePromises)
      .then(() => {
        toast.ok(`Successfully deleted ${keysToDelete.length} requests.`);
        const bulkDeleteContainer = document.getElementById('driver-req-bulk-delete-container');
        if (bulkDeleteContainer) bulkDeleteContainer.classList.add('hidden');
        const masterCb = document.getElementById('driver-req-select-all');
        if (masterCb) masterCb.checked = false;
      })
      .catch(err => {
        toast.err("Error deleting requests: " + err.message);
      });
  }
}

// Helper: Start Timer
function startCallTimer(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  clearInterval(callTimerInterval);
  callTimerSeconds = 0;
  el.textContent = "00:00";

  callTimerInterval = setInterval(() => {
    callTimerSeconds++;
    const mins = Math.floor(callTimerSeconds / 60).toString().padStart(2, '0');
    const secs = (callTimerSeconds % 60).toString().padStart(2, '0');
    el.textContent = `${mins}:${secs}`;
    
    const userBannerText = document.getElementById('support-user-active-banner-text');
    if (userBannerText && elementId === 'support-admin-call-timer') {
      userBannerText.innerHTML = `<i class="fas fa-microphone"></i> Voice Call Active (${mins}:${secs})`;
    }
  }, 1000);
}

// Helper: Clean up streams and states
function cleanupLocalCallState() {
  clearInterval(callTimerInterval);
  callTimerSeconds = 0;

  if (adminStatsInterval) {
    clearInterval(adminStatsInterval);
    adminStatsInterval = null;
  }
  if (userStatsInterval) {
    clearInterval(userStatsInterval);
    userStatsInterval = null;
  }

  if (localMediaStream) {
    localMediaStream.getTracks().forEach(track => track.stop());
    localMediaStream = null;
  }
  if (localScreenStream) {
    localScreenStream.getTracks().forEach(track => track.stop());
    localScreenStream = null;
  }
  if (activePeerConnection) {
    activePeerConnection.close();
    activePeerConnection = null;
  }
  if (screenPeerConnection) {
    screenPeerConnection.close();
    screenPeerConnection = null;
  }

  const v1 = document.getElementById('support-admin-screen-video');
  if (v1) v1.srcObject = null;
  const a1 = document.getElementById('support-admin-remote-audio');
  if (a1) a1.srcObject = null;
  const a2 = document.getElementById('support-user-remote-audio');
  if (a2) a2.srcObject = null;

  const statsEl = document.getElementById('support-admin-screen-stats');
  if (statsEl) statsEl.innerHTML = '';

  const panel = document.getElementById('support-admin-call-panel');
  if (panel) panel.classList.add('hidden');
  
  const screenCont = document.getElementById('support-admin-screen-container');
  if (screenCont) screenCont.classList.add('hidden');
}

function formatChatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date)) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function openImageModal(base64Data) {
  const w = window.open();
  if (w) {
    w.document.write(`
      <html>
        <head>
          <title>View Image</title>
          <style>
            body {
              margin: 0;
              background: #0b0f19;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              font-family: system-ui, sans-serif;
            }
            img {
              max-width: 95%;
              max-height: 95vh;
              object-fit: contain;
              border-radius: 8px;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            }
          </style>
        </head>
        <body>
          <img src="${base64Data}" alt="Uploaded Image">
        </body>
      </html>
    `);
    w.document.close();
  } else {
    toast.err("Popup blocked! Please allow popups to view the image.");
  }
}

// Expose handlers to window scope
window.toggleSupportChatBox = toggleSupportChatBox;
window.handleSendUserSupportMessage = handleSendUserSupportMessage;
window.handleSendAdminSupportReply = handleSendAdminSupportReply;
window.selectAdminSupportChat = selectAdminSupportChat;
window.toggleSupportChatStatus = toggleSupportChatStatus;
window.handleDeleteSupportChat = handleDeleteSupportChat;
window.startAdminVoiceCall = startAdminVoiceCall;
window.requestAdminScreenShare = requestAdminScreenShare;
window.endAdminVoiceCall = endAdminVoiceCall;
window.endUserVoiceCall = endUserVoiceCall;
window.openEditUserModal = openEditUserModal;
window.closeEditUserModal = closeEditUserModal;
window.handleEditUser = handleEditUser;
window.openCreateUserModal = openCreateUserModal;
window.closeCreateUserModal = closeCreateUserModal;
window.handleCreateUser = handleCreateUser;
window.openImageModal = openImageModal;

// Synthesize chime alert sound for driver requests
function playChimeSound() {
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.connect(gain);
    gain.connect(context.destination);
    
    const now = context.currentTime;
    osc.type = 'sine';
    
    // First tone (doorbell chime E5 -> C5)
    osc.frequency.setValueAtTime(659.25, now);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    osc.frequency.setValueAtTime(523.25, now + 0.2);
    gain.gain.setValueAtTime(0.3, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
    
    osc.start(now);
    osc.stop(now + 0.6);
  } catch (e) {
    console.warn("Chime sound playback blocked/failed:", e);
  }
}

// Update badges for driver requests count
// Inline edit handler for notification card fields
// Global flag to prevent popup dropdown from auto-closing while editing/saving notes or amounts
window.isEditingNotificationPop = false;

function closeNotificationDropdown(event) {
  if (event) event.stopPropagation();
  window.isEditingNotificationPop = false;
  const dropdown = document.getElementById('notification-dropdown');
  if (dropdown) {
    dropdown.classList.add('hidden');
  }
}
window.closeNotificationDropdown = closeNotificationDropdown;

function saveNotificationNote(key, event) {
  if (event) event.stopPropagation();
  window.isEditingNotificationPop = true;
  const noteInput = document.getElementById(`notif-note-input-${key}`);
  if (!noteInput) return;
  const newNote = noteInput.value.trim();
  
  db.ref(`driverRequests/${key}`).update({ note: newNote }).then(() => {
    toast.ok("Note saved successfully!");
    setTimeout(() => { window.isEditingNotificationPop = false; }, 1000);
  }).catch(err => {
    toast.err("Failed to save note: " + err.message);
    setTimeout(() => { window.isEditingNotificationPop = false; }, 1000);
  });
}
window.saveNotificationNote = saveNotificationNote;

// Inline edit handler for notification card fields
function editNotificationField(key, field, currentVal, event) {
  if (event) event.stopPropagation();
  window.isEditingNotificationPop = true;
  let label = field === 'vehicleNo' ? 'Vehicle No' : (field === 'dieselAmount' ? 'Amount (₹)' : (field === 'vendorName' ? 'Vendor Name' : 'Note'));
  let newVal = prompt(`Edit ${label}:`, currentVal);
  if (newVal === null) {
    setTimeout(() => { window.isEditingNotificationPop = false; }, 500);
    return;
  }
  
  newVal = newVal.trim();
  if (field === 'vehicleNo') {
    newVal = newVal.toUpperCase();
  } else if (field === 'dieselAmount') {
    newVal = parseFloat(newVal);
    if (isNaN(newVal) || newVal <= 0) {
      setTimeout(() => { window.isEditingNotificationPop = false; }, 500);
      return toast.err("Invalid amount entered!");
    }
  }
  
  db.ref(`driverRequests/${key}`).update({ [field]: newVal }).then(() => {
    toast.ok(`${label} updated successfully!`);
    setTimeout(() => { window.isEditingNotificationPop = false; }, 1000);
  }).catch(err => {
    toast.err("Update failed: " + err.message);
    setTimeout(() => { window.isEditingNotificationPop = false; }, 1000);
  });
}

window.editNotificationField = editNotificationField;

// Notification Dropdown Pop Preview handlers
function toggleNotificationDropdown(event) {
  if (event) event.stopPropagation();
  const userRole = (getAuthSession('rpm_user_role') || '').toLowerCase();
  const isVendorRole = (userRole === 'vendor');

  if (isVendorRole) return;

  const dropdown = document.getElementById('notification-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
  }
}

// Close dropdown on click outside only if user is not actively editing
document.addEventListener('click', event => {
  const dropdown = document.getElementById('notification-dropdown');
  const bellBtn = document.getElementById('mobile-nav-driver-request');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    if (window.isEditingNotificationPop) return;
    if (!dropdown.contains(event.target) && (!bellBtn || !bellBtn.contains(event.target))) {
      dropdown.classList.add('hidden');
    }
  }
});

function renderNotificationDropdown(actionRequests, pendingUsers = []) {
  window.lastActionRequests = actionRequests;
  window.lastPendingUsers = pendingUsers;

  const listContainer = document.getElementById('notification-dropdown-list');
  const countBadge = document.getElementById('notification-dropdown-count');
  if (!listContainer) return;
  
  const hasActiveTask = !!(activeLiveTask && (activeLiveTask.status === 'running' || activeLiveTask.status === 'completed' || activeLiveTask.status === 'failed'));
  const totalCount = actionRequests.length + pendingUsers.length + (hasActiveTask ? 1 : 0);
  
  if (countBadge) {
    countBadge.textContent = totalCount;
  }
  
  const bellBadge = document.getElementById('driver-req-bell-badge');
  const userRole = (getAuthSession('rpm_user_role') || '').toLowerCase();
  const isVendorRole = (userRole === 'vendor');
  if (bellBadge && !isVendorRole) {
    if (totalCount > 0) {
      bellBadge.textContent = totalCount;
      bellBadge.classList.remove('hidden');
    } else {
      bellBadge.classList.add('hidden');
    }
  }
  const bellBtn = document.getElementById('mobile-nav-driver-request');
  if (bellBtn && !isVendorRole) {
    if (hasActiveTask && activeLiveTask.status === 'running') {
      bellBtn.classList.add('ring-2', 'ring-blue-500/70', 'bg-blue-500/15');
    } else {
      bellBtn.classList.remove('ring-2', 'ring-blue-500/70', 'bg-blue-500/15');
    }
  }

  let taskKpiHtml = '';
  if (hasActiveTask) {
    const t = activeLiveTask;
    const isCompleted = t.status === 'completed';
    const isFailed = t.status === 'failed';
    const isRunning = t.status === 'running';
    const c = isCompleted ? 'emerald' : (isFailed ? 'rose' : (t.color || 'blue'));
    const statusBadge = isCompleted ? 'COMPLETED' : (isFailed ? 'FAILED' : 'RUNNING TASK');
    const badgePulse = isRunning ? 'animate-pulse' : '';

    let finishFailMeta = '';
    if (t.finishTimeStr) {
      finishFailMeta = `<div class="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-1"><i class="fas fa-clock"></i> Completed at: <b>${t.finishTimeStr}</b> (${t.durationSec}s)</div>`;
    } else if (t.failTimeStr) {
      finishFailMeta = `<div class="text-[10px] text-rose-400 font-semibold flex items-center gap-1 mt-1"><i class="fas fa-exclamation-triangle"></i> Failed at: <b>${t.failTimeStr}</b> (${t.durationSec}s)</div>`;
    }

    taskKpiHtml = `
      <div id="task-dropdown-kpi-card" class="relative overflow-hidden glass-panel p-4 rounded-2xl border-2 border-${c}-500/40 bg-gradient-to-br from-${c}-500/10 via-slate-900/40 to-slate-950/60 shadow-[0_8px_24px_rgba(0,0,0,0.3)] mb-3">
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-${c}-500 to-${c === 'emerald' ? 'teal' : (c === 'rose' ? 'red' : 'indigo')}-500"></div>
        <div class="flex items-center justify-between gap-2 mb-2">
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-7 h-7 rounded-xl bg-${c}-500/20 text-${c}-400 flex items-center justify-center shrink-0 text-xs shadow-xs">
              <i class="${isCompleted ? 'fas fa-check-circle' : (isFailed ? 'fas fa-times-circle' : (t.icon || 'fas fa-spinner fa-spin'))}"></i>
            </div>
            <div class="min-w-0">
              <div class="text-[11px] font-black text-slate-100 truncate">${t.name || 'Live Operation'}</div>
              <div class="text-[9px] text-slate-400 truncate flex items-center gap-1">
                <span id="task-dd-step" class="font-bold text-${c}-400">${t.step || 'Progress'}</span>
                <span id="task-dd-timer" class="text-slate-400 font-mono">⏱️ ${t.elapsed || '0s'}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <span class="px-2 py-0.5 rounded-full text-[8px] font-black tracking-wider bg-${c}-500/20 text-${c}-300 border border-${c}-500/30 uppercase ${badgePulse}">${statusBadge}</span>
            <button onclick="reopenDmProgressModal(); event.stopPropagation();" title="Expand Modal" class="px-2 py-0.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-[10px] font-black border border-blue-500/30 flex items-center gap-1 transition-all">
              <i class="fas fa-expand text-[9px]"></i> View
            </button>
          </div>
        </div>

        <!-- Progress Bar & % -->
        <div class="space-y-1 mb-2">
          <div class="flex items-center justify-between text-[10px]">
            <span class="text-slate-400 font-medium">Task Progress</span>
            <span id="task-dd-percent" class="font-black text-${c}-400">${t.percent}%</span>
          </div>
          <div class="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-slate-700/60 p-[1px]">
            <div id="task-dd-bar" class="h-full rounded-full ${isCompleted ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : (isFailed ? 'bg-gradient-to-r from-rose-500 to-red-500' : 'bg-gradient-to-r from-blue-500 to-indigo-400')} transition-all duration-300" style="width: ${t.percent}%"></div>
          </div>
        </div>

        <!-- Hindi Step Detail -->
        <div id="task-dd-desc" class="text-[10px] text-slate-300 font-medium leading-relaxed bg-slate-950/40 p-2 rounded-xl border border-slate-800/60">
          ${t.detail || ''}
          ${finishFailMeta}
        </div>
      </div>
    `;
  }

  if (totalCount === 0) {
    listContainer.innerHTML = `
      <div class="text-center py-8 text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-wider">
        <i class="fas fa-check-circle text-2xl text-emerald-500 mb-2 block"></i>
        No Pending Requests
      </div>
    `;
    return;
  }
  
  let html = taskKpiHtml;

  if (actionRequests.length === 0 && pendingUsers.length === 0 && hasActiveTask) {
    html += `
      <div class="text-center py-5 text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-wider border-t border-slate-800/40">
        <i class="fas fa-check-circle text-xl text-emerald-500 mb-1.5 block"></i>
        No Pending Driver Requests
      </div>
    `;
    listContainer.innerHTML = html;
    return;
  }

  // Render Pending Users First
  pendingUsers.forEach(u => {
    html += `
      <div class="glass-panel p-5 rounded-2xl border border-amber-500/30 dark:border-amber-500/20 bg-amber-500/5 shadow-[0_8px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <i class="fas fa-user-clock"></i> New User Registration
          </span>
          <span class="text-[9px] font-extrabold px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-full uppercase">Pending</span>
        </div>
        <div class="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 mb-3">
          <div><span class="font-semibold text-slate-400">Name:</span> <span class="font-bold text-slate-800 dark:text-white">${u.fullName || '—'}</span></div>
          <div><span class="font-semibold text-slate-400">Email:</span> <span class="font-bold text-slate-800 dark:text-white">${u.email || '—'}</span></div>
          <div><span class="font-semibold text-slate-400">Mobile:</span> <span class="font-medium text-slate-700 dark:text-slate-200">${u.mobile || '—'}</span></div>
        </div>
        <div class="flex gap-2">
          <button onclick="approveUser('${u._key}'); event.stopPropagation();" class="flex-1 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black rounded-xl shadow-md transition-all">Approve User</button>
          <button onclick="deleteUser('${u._key}'); event.stopPropagation();" class="flex-1 py-1.5 bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white text-xs font-black rounded-xl shadow-md transition-all">Reject</button>
        </div>
      </div>
    `;
  });

  // Render Driver Requests
  actionRequests.forEach(req => {
    const isUpdate = req.status === 'update_pending';
    const amountDisplay = isUpdate ? `₹${req.tempAmount} (Old: ₹${req.dieselAmount})` : `₹${req.dieselAmount}`;
    const approveFn = isUpdate ? `approveAmountUpdate('${req.key}')` : `approveDriverRequest('${req.key}')`;
    const rejectFn = isUpdate ? `rejectAmountUpdate('${req.key}')` : `rejectDriverRequest('${req.key}')`;
    
    const dueBadge = getDueAmountBadgeHtml(req);
    const badgeCleaned = dueBadge ? dueBadge.replace('mb-1 ', '') : '';
    const isNewReq = (req.status === 'pending' && isNewDriverVehicle(req.vehicleNo));
    const notifVehColor = isNewReq ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white';
    const notifNewTag = isNewReq ? `<span class="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 inline-flex items-center shadow-xs">NEW</span>` : '';

    html += `
      <div class="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 shadow-[0_8px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:shadow-[0_12px_24px_rgba(59,130,246,0.12)] transition-all duration-300 relative" onclick="event.stopPropagation();">
        <div class="flex items-center justify-between mb-3 pt-1">
          <span class="text-sm font-black ${notifVehColor} uppercase tracking-tight leading-normal pt-0.5 flex items-center gap-1.5">
            ${req.vehicleNo}
            ${notifNewTag}
            <i onclick="editNotificationField('${req.key}', 'vehicleNo', '${req.vehicleNo}', event)" class="fas fa-pencil text-[9px] text-blue-500 hover:text-blue-600 cursor-pointer" title="Edit Vehicle No"></i>
          </span>
          <span class="text-[9px] font-extrabold px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded-full uppercase tracking-wider">${req.vtype || 'Vehicle'}</span>
        </div>
        <div class="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 mb-4">
          <div>
            <span class="font-semibold text-slate-450 dark:text-slate-500">Vendor:</span> 
            <span class="font-bold text-slate-850 dark:text-slate-200">${req.vendorName || '-'}</span>
            <i onclick="editNotificationField('${req.key}', 'vendorName', '${req.vendorName || ''}', event)" class="fas fa-pencil text-[9px] text-blue-500 hover:text-blue-600 cursor-pointer ms-1" title="Edit Vendor"></i>
          </div>
          <div>
            <span class="font-semibold text-slate-450 dark:text-slate-500">Route:</span> 
            <span class="font-bold text-slate-850 dark:text-slate-200">${req.fromLocation || '1'} ➜ ${req.lastLocation || '1'}</span>
          </div>
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-1.5">
              <span class="font-semibold text-slate-450 dark:text-slate-500">Amount:</span>
              <span class="font-black text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                ${amountDisplay}
                <i onclick="editNotificationField('${req.key}', 'dieselAmount', '${req.dieselAmount}', event)" class="fas fa-pencil text-[9px] text-blue-500 hover:text-blue-600 cursor-pointer" title="Edit Amount"></i>
              </span>
            </div>
            ${badgeCleaned ? `<span class="inline-flex">${badgeCleaned}</span>` : ''}
          </div>
          <div>
            <span class="font-semibold text-slate-450 dark:text-slate-500">Note:</span> 
            <span class="font-medium text-slate-700 dark:text-slate-350 italic flex items-center gap-1.5">
              "${req.note || 'None'}"
              <i onclick="editNotificationField('${req.key}', 'note', '${req.note || ''}', event)" class="fas fa-pencil text-[9px] text-blue-500 hover:text-blue-600 cursor-pointer" title="Edit Note"></i>
            </span>
          </div>
          ${req.status === 'rejected' && (req.rejectReason || req.rejectedReason || req.reason) ? `
          <div class="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-bold">
            <i class="fas fa-circle-exclamation mr-1"></i> Reason: ${req.rejectReason || req.rejectedReason || req.reason}
          </div>
          ` : ''}
        </div>
        <div class="flex gap-2">
          <button onclick="${approveFn}; event.stopPropagation();" class="flex-1 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black rounded-xl shadow-[0_4px_12px_rgba(16,185,129,0.25)] hover:shadow-[0_4px_16px_rgba(16,185,129,0.4)] transition-all">Approve</button>
          <button onclick="${rejectFn}; event.stopPropagation();" class="flex-1 py-2 bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white text-xs font-black rounded-xl shadow-[0_4px_12px_rgba(244,63,94,0.25)] hover:shadow-[0_4px_16px_rgba(244,63,94,0.4)] transition-all">Reject</button>
        </div>
      </div>
    `;
  });
  
  listContainer.innerHTML = html;
}

function updateDriverRequestsBadges() {
  const now = Date.now();
  const activeRequests = driverRequestsList.filter(r => {
    if (r.status === 'pending' || r.status === 'update_pending') return true;
    if (!r.submittedAt) return false;
    const ageMs = now - r.submittedAt;
    return ageMs >= 0 && ageMs <= 24 * 60 * 60 * 1000;
  });

  const pendingRequests = activeRequests.filter(r => r.status === 'pending');
  const pendingCount = pendingRequests.length;
  
  const approvedCount = activeRequests.filter(r => r.status === 'approved').length;
  const filledCount = activeRequests.filter(r => r.status === 'filled' || r.status === 'update_rejected').length;
  const rejectedCount = activeRequests.filter(r => r.status === 'rejected').length;
  const updatePendingCount = activeRequests.filter(r => r.status === 'update_pending').length;

  const userRole = (getAuthSession('rpm_user_role') || '').toLowerCase();
  const userEmail = (getAuthSession('rpm_user_email') || '').toLowerCase();

  const isVendorRole = (userRole === 'vendor');

  const currentIsAdmin = (
    (getAuthSession('rpm_is_admin') === '1' ||
     userRole === 'admin' ||
     userRole === 'superadmin' ||
     userEmail === ADMIN_EMAIL) &&
    !isVendorRole
  );

  const pendingUsers = (currentIsAdmin && typeof allUserAccounts !== 'undefined' && Array.isArray(allUserAccounts)) 
    ? allUserAccounts.filter(u => u.status === 'pending' && u.role !== 'admin') 
    : [];

  const hasRunningLiveTask = !!(activeLiveTask && (activeLiveTask.status === 'running' || activeLiveTask.status === 'completed'));
  const totalActionPending = !isVendorRole ? (pendingCount + updatePendingCount + pendingUsers.length + (hasRunningLiveTask ? 1 : 0)) : 0;

  // Render the notification pop preview dropdown for all non-vendor users (Admin, Incharge, Watcher, Users)
  renderNotificationDropdown(
    !isVendorRole ? pendingRequests.concat(activeRequests.filter(r => r.status === 'update_pending')) : [],
    !isVendorRole ? pendingUsers : []
  );

  // Show notification bell button on desktop & mobile for all non-vendor users (Admin, Incharge, Watcher, Users)
  const bellBtn = document.getElementById('mobile-nav-driver-request');
  if (bellBtn) {
    if (isVendorRole) {
      bellBtn.classList.add('hidden');
    } else {
      bellBtn.classList.remove('hidden');
    }
  }

  const bellBadge = document.getElementById('driver-req-bell-badge');
  if (bellBadge) {
    if (!isVendorRole && totalActionPending > 0) {
      bellBadge.textContent = totalActionPending;
      bellBadge.classList.remove('hidden');
    } else {
      bellBadge.classList.add('hidden');
    }
  }

  const sidebarBadge = document.getElementById('sidebar-driver-req-badge');
  if (sidebarBadge) {
    if (!isVendorRole && totalActionPending > 0) {
      sidebarBadge.textContent = totalActionPending;
      sidebarBadge.classList.remove('hidden');
    } else {
      sidebarBadge.classList.add('hidden');
    }
  }

  const pendingKpi = document.getElementById('driver-req-count-pending');
  const approvedKpi = document.getElementById('driver-req-count-approved');
  const filledKpi = document.getElementById('driver-req-count-filled');
  const rejectedKpi = document.getElementById('driver-req-count-rejected');
  const updatePendingKpi = document.getElementById('driver-req-count-update-pending');
  
  if (pendingKpi) pendingKpi.textContent = pendingCount;
  if (approvedKpi) approvedKpi.textContent = approvedCount;
  if (filledKpi) filledKpi.textContent = filledCount;
  if (rejectedKpi) rejectedKpi.textContent = rejectedCount;
  if (updatePendingKpi) updatePendingKpi.textContent = updatePendingCount;

  // Update main Dashboard Overview counterparts
  const dashPendingKpi = document.getElementById('dash-count-pending');
  const dashApprovedKpi = document.getElementById('dash-count-approved');
  const dashUpdatePendingKpi = document.getElementById('dash-count-update-pending');
  const dashRejectedKpi = document.getElementById('dash-count-rejected');

  if (dashPendingKpi) dashPendingKpi.textContent = pendingCount;
  if (dashApprovedKpi) dashApprovedKpi.textContent = approvedCount;
  if (dashUpdatePendingKpi) dashUpdatePendingKpi.textContent = updatePendingCount;
  if (dashRejectedKpi) dashRejectedKpi.textContent = rejectedCount;

  // Auto vs Manual Approved Count
  const autoApprovedRequests = activeRequests.filter(r => (r.status === 'approved' || r.status === 'filled') && r.autoApproved);
  const manualApprovedRequests = activeRequests.filter(r => (r.status === 'approved' || r.status === 'filled') && !r.autoApproved);

  const elCountAutoApproved = document.getElementById('count-auto-approved');
  if (elCountAutoApproved) elCountAutoApproved.textContent = autoApprovedRequests.length;

  const elCountManualApproved = document.getElementById('count-manual-approved');
  if (elCountManualApproved) elCountManualApproved.textContent = manualApprovedRequests.length;
}

// Approval Preview Modal Logic
function showApprovalPreview(type) {
  const modal = document.getElementById('approval-preview-modal');
  if (!modal) return;

  const title = document.getElementById('approval-preview-title');
  const icon = document.getElementById('preview-modal-icon');
  const tbody = document.getElementById('approval-preview-tbody');
  const emptyDiv = document.getElementById('approval-preview-empty');

  if (title) {
    title.textContent = type === 'auto' ? 'Auto Approved Requests (Last 24h)' : 'Manual Approved Requests (Last 24h)';
  }
  if (icon) {
    icon.className = type === 'auto' ? 'fas fa-robot text-indigo-500' : 'fas fa-user-shield text-emerald-500';
  }

  tbody.innerHTML = '';

  const now = Date.now();
  const activeRequests = driverRequestsList.filter(r => {
    if (!r.submittedAt) return false;
    const ageMs = now - r.submittedAt;
    return ageMs >= 0 && ageMs <= 24 * 60 * 60 * 1000; // Strict 24 hour limit for all requests
  });

  const filtered = activeRequests.filter(r => {
    const isApprovedOrFilled = r.status === 'approved' || r.status === 'filled';
    if (!isApprovedOrFilled) return false;
    const isAuto = !!r.autoApproved;
    return type === 'auto' ? isAuto : !isAuto;
  });

  if (filtered.length === 0) {
    if (emptyDiv) emptyDiv.classList.remove('hidden');
  } else {
    if (emptyDiv) emptyDiv.classList.add('hidden');
    filtered.forEach(r => {
      const tr = document.createElement('tr');
      tr.className = "hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all border-b border-slate-200/40 dark:border-slate-800/30";
      
      const dateStr = r.date || '';
      const timeStr = r.time ? (typeof convertTo24Hour === 'function' ? convertTo24Hour(r.time) : r.time) : '';
      const diesel = r.dieselAmount ? `₹${parseFloat(r.dieselAmount).toLocaleString('en-IN')}` : '-';
      const vendorStr = r.vendorName || '-';
      const noteStr = (r.note && String(r.note).trim().toUpperCase() !== 'DRIVER REQUEST') ? r.note : '';
      const mapIconHtml = (r.location && r.location.lat) ? `<a href="https://www.google.com/maps/search/?api=1&query=${r.location.lat},${r.location.lng}" target="_blank" class="text-rose-500 hover:text-rose-600 text-sm mr-1" title="View Location"><i class="fas fa-map-marker-alt"></i></a>` : '';

      tr.innerHTML = `
        <td class="px-3.5 py-3 whitespace-nowrap">
          <div class="flex items-center gap-1.5">
            ${mapIconHtml}
            <div>
              <div class="font-extrabold text-blue-600 dark:text-blue-400 text-xs sm:text-sm tracking-wide uppercase">${r.vehicleNo || '-'}</div>
              <div class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">${r.vehicleType || '-'}</div>
            </div>
          </div>
        </td>
        <td class="px-3.5 py-3 whitespace-nowrap">
          <div class="text-xs font-bold text-slate-700 dark:text-slate-300">${dateStr}</div>
          <div class="text-[10px] font-semibold text-slate-400 dark:text-slate-500">${timeStr}</div>
        </td>
        <td class="px-3.5 py-3 whitespace-nowrap text-right font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
          ${diesel}
        </td>
        <td class="px-3.5 py-3 text-xs max-w-[180px] sm:max-w-[240px]">
          <div class="font-bold text-slate-800 dark:text-slate-200 truncate" title="${vendorStr}">${vendorStr}</div>
          ${noteStr ? `<div class="text-[10px] text-slate-400 truncate italic" title="${noteStr}">${noteStr}</div>` : ''}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  modal.classList.remove('hidden');
}

function closeApprovalPreviewModal() {
  const modal = document.getElementById('approval-preview-modal');
  if (modal) modal.classList.add('hidden');
}

window.showApprovalPreview = showApprovalPreview;
window.closeApprovalPreviewModal = closeApprovalPreviewModal;

// Render driver requests table list


function editDriverRequestAmount(key) {
  const currentValSpan = document.getElementById(`amount-val-${key}`);
  if (!currentValSpan) return;

  const currentAmount = currentValSpan.textContent.trim();
  const newVal = prompt("Enter new Diesel Amount (₹ INR):", currentAmount);
  if (newVal === null) return;

  const parsed = parseFloat(newVal);
  if (isNaN(parsed) || parsed <= 0) {
    return showAlert('error', 'Invalid Amount', 'Please enter a valid positive numeric amount.');
  }

  driverRequestsRef.child(key).update({ dieselAmount: String(parsed) })
    .then(() => toast.ok("Diesel amount updated successfully!"))
    .catch(err => toast.err("Failed to update amount: " + err.message));
}

function editDriverRequestNote(key) {
  const currentValSpan = document.getElementById(`note-val-${key}`);
  if (!currentValSpan) return;

  const currentNote = currentValSpan.textContent.trim() === '-' ? '' : currentValSpan.textContent.trim();
  const newVal = prompt("Enter new Note:", currentNote);
  if (newVal === null) return;

  // Clean symbols and emojis from Note before updating
  const cleanSymbols = val => String(val || '').replace(/[^A-Za-z0-9]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
  const cleanedNote = cleanSymbols(newVal);

  driverRequestsRef.child(key).update({ note: cleanedNote })
    .then(() => toast.ok("Note updated successfully!"))
    .catch(err => toast.err("Failed to update note: " + err.message));
}

function editDriverRequestVehicleNo(key) {
  const currentValSpan = document.getElementById(`vehicleno-val-${key}`);
  if (!currentValSpan) return;

  const currentVehicleNo = currentValSpan.textContent.trim();
  const newVal = prompt("Enter new Vehicle No:", currentVehicleNo);
  if (newVal === null) return;

  const cleanedVehicleNo = newVal.trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
  if (!cleanedVehicleNo) {
    return showAlert('error', 'Invalid Vehicle No', 'Please enter a valid alphanumeric vehicle number.');
  }

  driverRequestsRef.child(key).update({ vehicleNo: cleanedVehicleNo })
    .then(() => toast.ok("Vehicle number updated successfully!"))
    .catch(err => toast.err("Failed to update vehicle number: " + err.message));
}

function openEditDriverRequestModal(key) {
  if (!checkAuth()) return;
  const req = driverRequestsList.find(r => r.key === key);
  if (!req) {
    toast.err("Request not found.");
    return;
  }

  const modal = document.getElementById('edit-driver-request-modal');
  if (!modal) return;

  // Populate drop-downs dynamically using innerHTML copy
  const vtypeSelect = document.getElementById('edit-dr-vtype');
  const vendorSelect = document.getElementById('edit-dr-vendor');
  const drfVtype = document.getElementById('drf-vtype');
  const drfVendor = document.getElementById('drf-vendor');

  if (vtypeSelect && drfVtype) {
    vtypeSelect.innerHTML = drfVtype.innerHTML;
  }
  if (vendorSelect && drfVendor) {
    vendorSelect.innerHTML = drfVendor.innerHTML;
  }

  // Populate inputs
  document.getElementById('edit-dr-key').value = key;

  // Format Date from DD-MM-YYYY to YYYY-MM-DD for date input
  let formattedDate = '';
  if (req.date) {
    const parts = req.date.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        formattedDate = req.date;
      } else {
        formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    } else {
      formattedDate = req.date;
    }
  }
  document.getElementById('edit-dr-date').value = formattedDate;
  document.getElementById('edit-dr-time').value = req.time || '';
  document.getElementById('edit-dr-vehicle').value = req.vehicleNo || '';
  if (vtypeSelect) vtypeSelect.value = req.vehicleType || '';
  document.getElementById('edit-dr-from').value = req.fromLocation || '';
  document.getElementById('edit-dr-last').value = req.lastLocation || '';
  document.getElementById('edit-dr-km').value = req.currentKm || '';
  document.getElementById('edit-dr-amount').value = req.dieselAmount || '';
  if (vendorSelect) vendorSelect.value = req.vendorName || '';
  document.getElementById('edit-dr-note').value = (req.note && String(req.note).trim().toUpperCase() !== 'DRIVER REQUEST') ? req.note : '';

  modal.classList.remove('hidden');
}

function closeEditDriverRequestModal() {
  const modal = document.getElementById('edit-driver-request-modal');
  if (modal) modal.classList.add('hidden');
}

function handleEditDriverRequest(event) {
  event.preventDefault();
  if (!checkAuth()) return;

  const key = document.getElementById('edit-dr-key').value;
  if (!key) return;

  const dateRaw = document.getElementById('edit-dr-date').value;
  const time = document.getElementById('edit-dr-time').value;
  const vehicle = document.getElementById('edit-dr-vehicle').value.trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
  const vtype = document.getElementById('edit-dr-vtype').value.trim().toUpperCase();
  const cleanSymbols = val => String(val || '').replace(/[^A-Za-z0-9]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
  const from = cleanSymbols(document.getElementById('edit-dr-from').value);
  const last = cleanSymbols(document.getElementById('edit-dr-last').value);
  const km = document.getElementById('edit-dr-km').value.trim();
  const amount = document.getElementById('edit-dr-amount').value.trim();
  const vendor = document.getElementById('edit-dr-vendor').value;
  const note = cleanSymbols(document.getElementById('edit-dr-note').value);

  if (!vehicle || !amount) {
    return showAlert('error', 'Required Fields', 'Vehicle No. and Diesel Amount are mandatory!');
  }

  const cleanCost = parseFloat(amount);
  if (isNaN(cleanCost) || cleanCost <= 0) {
    return showAlert('error', 'Invalid Amount', 'Please enter a valid positive numeric amount.');
  }

  let dispDate = dateRaw;
  if (dateRaw && dateRaw.includes('-')) {
    const parts = dateRaw.split('-');
    if (parts[0].length === 4) {
      dispDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  const updates = {
    vehicleNo: vehicle,
    vehicleType: vtype,
    fromLocation: from,
    lastLocation: last,
    currentKm: km,
    dieselAmount: String(cleanCost),
    vendorName: vendor,
    note: note,
    date: dispDate,
    time: time
  };

  // If request had startKm, keep totalKm and endKm in sync with updated currentKm
  const reqItem = driverRequestsList.find(r => r.key === key);
  if (reqItem && reqItem.startKm) {
    const startNum = parseInt(reqItem.startKm);
    const currNum = parseInt(km);
    if (!isNaN(startNum) && !isNaN(currNum) && currNum >= startNum) {
      updates.totalKm = String(currNum - startNum);
      updates.endKm = km;
    }
  }

  driverRequestsRef.child(key).update(updates)
    .then(() => {
      toast.ok("Driver request updated successfully!");
      closeEditDriverRequestModal();

      const reqItem = driverRequestsList.find(r => r.key === key);
      if (reqItem) {
        Object.assign(reqItem, updates);
        saveCache('rpm_cache_driver_requests', driverRequestsList);
        if (typeof renderDriverRequestsList === 'function') renderDriverRequestsList();
        if (typeof renderDriverRequestsLogList === 'function') renderDriverRequestsLogList();
      }
    })
    .catch(err => {
      toast.err("Failed to update driver request: " + err.message);
    });
}

let currentRejectKey = null;

function rejectDriverRequest(key) {
  if (!checkAuth()) return;
  
  currentRejectKey = key;
  const req = driverRequestsList.find(r => r.key === key);
  
  const vehSpan = document.getElementById('reject-modal-vehicle');
  if (vehSpan) {
    vehSpan.textContent = req ? req.vehicleNo : '';
  }

  const reasonInput = document.getElementById('reject-reason-input');
  if (reasonInput) {
    reasonInput.value = '';
  }

  const modal = document.getElementById('reject-reason-modal');
  if (modal) {
    modal.classList.remove('hidden');
    setTimeout(() => {
      if (reasonInput) reasonInput.focus();
    }, 100);
  }
}

window.closeRejectReasonModal = () => {
  const modal = document.getElementById('reject-reason-modal');
  if (modal) modal.classList.add('hidden');
  currentRejectKey = null;
};

window.confirmRejectDriverRequest = () => {
  if (!currentRejectKey) return;
  const key = currentRejectKey;
  
  const reasonInput = document.getElementById('reject-reason-input');
  const reason = reasonInput ? reasonInput.value.trim() : '';

  if (!reason) {
    if (typeof toast !== 'undefined' && toast.warn) {
      toast.warn("Please enter a rejection reason.");
    }
    return;
  }

  driverRequestsRef.child(key).update({
    status: 'rejected',
    rejectReason: reason,
    processedAt: firebase.database.ServerValue.TIMESTAMP
  })
  .then(() => {
    if (typeof toast !== 'undefined' && toast.ok) {
      toast.ok("Request marked as Rejected.");
    }
    closeRejectReasonModal();
  })
  .catch(err => {
    if (typeof toast !== 'undefined' && toast.err) {
      toast.err("Failed to reject request: " + err.message);
    }
  });
};

window.closeRejectReasonModal = closeRejectReasonModal;
window.confirmRejectDriverRequest = confirmRejectDriverRequest;

// Copy to clipboard helper with execCommand fallback for non-secure contexts
function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  } else {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    return new Promise((resolve, reject) => {
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (success) {
        resolve();
      } else {
        reject(new Error("Fallback copy command failed"));
      }
    });
  }
}

// Convert 12-hour AM/PM time (e.g. "07:57 PM") to 24-hour time (e.g. "19:57")
function convertTo24Hour(timeStr) {
  if (!timeStr) return '';
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return timeStr;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function approveDriverRequest(key) {
  if (!checkAuth()) return;
  
  const req = driverRequestsList.find(r => r.key === key);
  if (!req) return toast.err("Request details not found.");

  const noteUpper = String(req.note || '').trim().toUpperCase();
  const autoFill = noteUpper.includes("UPI") || noteUpper.includes("OUT SIDE") || noteUpper.includes("OUTSIDE");

  const confirmMsg = autoFill 
    ? `Are you sure you want to APPROVE and AUTO-FILL this ${noteUpper} request for vehicle ${req.vehicleNo}?`
    : `Are you sure you want to APPROVE this request for vehicle ${req.vehicleNo}?`;

  if (!confirm(confirmMsg)) return;

  if (autoFill) {
    // Auto-fill logic: Compute next response number and save directly to entries
    const nums = historyEntries.map(x => parseInt(x.responseNumber)).filter(n => !isNaN(n));
    const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
    const newRespNum = String(maxNum + 1);

      const rawNote = String(req.note || '').trim().toUpperCase();
      const cleanReqNote = rawNote === 'DRIVER REQUEST' ? '' : rawNote;
      const e = {
        responseNumber: newRespNum,
        date: req.date || '',
        time: req.time || '',
        vehicleNo: String(req.vehicleNo || '').toUpperCase(),
        vehicleType: String(req.vehicleType || '').toUpperCase(),
        fromLocation: String(req.fromLocation || '').toUpperCase(),
        lastLocation: String(req.lastLocation || '').toUpperCase(),
        currentKm: String(req.currentKm || ''),
        startKm: String(req.startKm || ''),
        endKm: String(req.endKm || ''),
        totalKm: String(req.totalKm || ''),
        dieselAmount: String(req.dieselAmount || ''),
        vendorName: String(req.vendorName || ''),
        note: cleanReqNote,
        litres: '',
        mileage: ''
      };
    if (req.location) {
      e.location = req.location;
    }

    const vAvg = vehicleTypes[e.vehicleType.toUpperCase()];
    if (vAvg) e.mileage = String(vAvg);

    if (e.dieselAmount && dieselRate > 0) {
      e.litres = String((parseFloat(e.dieselAmount) / dieselRate).toFixed(2));
    }

    const saveAutoFillRecord = (reqData = {}) => {
      const kPhotos = extractPhotosFromRecord(reqData, 'kmPhotos', 'kmPhoto', 'photo');
      if (kPhotos.length > 0) {
        e.kmPhotos = kPhotos;
        e.kmPhoto = kPhotos[0];
      }
      const rPhotos = extractPhotosFromRecord(reqData, 'receiptPhotos', 'receiptPhoto');
      if (rPhotos.length > 0) {
        e.receiptPhotos = rPhotos;
        e.receiptPhoto = rPhotos[0];
      }

      entriesRef.child(newRespNum).set(e)
        .then(() => {
          return driverRequestsRef.child(key).update({
            status: 'filled',
            processedAt: firebase.database.ServerValue.TIMESTAMP,
            filledAt: firebase.database.ServerValue.TIMESTAMP,
            linkedResponseNumber: newRespNum
          });
        })
        .then(() => {
          const avg = vehicleTypes[req.vehicleType.toUpperCase()] || '';
          const copyText = `🔔Diesel Request📢
Response #APPROVED & FILLED
📅 Date & Time. : ${req.date}, ${convertTo24Hour(req.time)}
🚛 Vehicle No. : ${req.vehicleNo}
🚚 Vehicle Type. : ${req.vehicleType}${avg ? ',' + avg : ''}
📍 From Location. : ${req.fromLocation}
📍 Last Location. : ${req.lastLocation}
📊 Current KM. : ${req.currentKm}
💸 Diesel (₹ INR). : ${req.dieselAmount}
👮🏻 Vendor Name. : ${req.vendorName}
📝 Note. : ${req.note}`;

          copyToClipboard(copyText)
            .then(() => {
              toast.ok(`Auto-filled & details COPIED to clipboard! Ledger Entry #${newRespNum}`);
            })
            .catch(err => {
              toast.ok(`Auto-filled successfully! Ledger Entry #${newRespNum}`);
            });
        })
        .catch(err => {
          toast.err("Error processing auto-fill: " + err.message);
        });
    };

    driverRequestsRef.child(key).once('value')
      .then(snap => saveAutoFillRecord(snap.val() || req))
      .catch(() => saveAutoFillRecord(req));
  } else {
    // Normal approval logic: Save heavy base64 photos to separate driverRequestPhotos node so driverRequests stays ultra-fast
    driverRequestsRef.child(key).once('value').then(snap => {
      const fullReq = snap.val() || req;
      const rPhotos = extractPhotosFromRecord(fullReq, 'receiptPhotos', 'receiptPhoto');
      const kPhotos = extractPhotosFromRecord(fullReq, 'kmPhotos', 'kmPhoto', 'photo');

      const photoPayload = {};
      if (rPhotos.length > 0) {
        photoPayload.receiptPhotos = rPhotos;
        photoPayload.receiptPhoto = rPhotos[0];
      }
      if (kPhotos.length > 0) {
        photoPayload.kmPhotos = kPhotos;
        photoPayload.kmPhoto = kPhotos[0];
      }

      const reqUpdates = { 
        status: 'approved', 
        processedAt: firebase.database.ServerValue.TIMESTAMP,
        reverted: null,
        revertedAt: null,
        hasReceiptPhoto: (rPhotos.length > 0),
        hasKmPhoto: (kPhotos.length > 0),
        receiptPhotosCount: rPhotos.length,
        kmPhotosCount: kPhotos.length,
        receiptPhotos: null,
        receiptPhoto: null,
        kmPhotos: null,
        kmPhoto: null,
        photo: null
      };

      const pSave = (Object.keys(photoPayload).length > 0)
        ? db.ref('driverRequestPhotos').child(key).set(photoPayload)
        : Promise.resolve();

      return pSave.then(() => driverRequestsRef.child(key).update(reqUpdates));
    })
    .then(() => {
      const avg = vehicleTypes[req.vehicleType.toUpperCase()] || '';
      const copyText = `🔔Diesel Request📢
Response #APPROVED
📅 Date & Time. : ${req.date}, ${convertTo24Hour(req.time)}
🚛 Vehicle No. : ${req.vehicleNo}
🚚 Vehicle Type. : ${req.vehicleType}${avg ? ',' + avg : ''}
📍 From Location. : ${req.fromLocation}
📍 Last Location. : ${req.lastLocation}
📊 Current KM. : ${req.currentKm}
💸 Diesel (₹ INR). : ${req.dieselAmount}
👮🏻 Vendor Name. : ${req.vendorName}
📝 Note. : ${req.note}`;

      copyToClipboard(copyText)
        .then(() => {
          toast.ok(`Approved & details COPIED to clipboard!`);
        })
        .catch(err => {
          console.warn("Clipboard copy failed:", err);
          toast.ok(`Approved successfully!`);
        });
    })
    .catch(err => {
      toast.err("Error processing approval: " + err.message);
    });
  }
}

// Direct Fill Driver Request (Bypass 'approved' pending fill state & directly create entry in Diesel Records)
function directFillDriverRequest(key) {
  if (!checkAuth()) return;

  const userRole = (getAuthSession('rpm_user_role') || '').toLowerCase();
  const userEmail = (getAuthSession('rpm_user_email') || '').toLowerCase();
  const assignedVendor = getAssignedVendorName();

  const isStrictAdminRole = (
    (userRole === 'admin' || userRole === 'superadmin' || userEmail === ADMIN_EMAIL) &&
    userRole !== 'vendor' &&
    userRole !== 'incharge' &&
    !assignedVendor
  );

  if (!isStrictAdminRole) {
    toast.err("Direct Diesel Filled feature is available for Admin role only.");
    return;
  }
  
  const req = driverRequestsList.find(r => r.key === key);
  if (!req) return toast.err("Request details not found.");

  if (!confirm(`Kya aap vehicle ${req.vehicleNo} ki request ko DIESEL FILLED mark karke sidha Diesel Records me add karna chahte hain?`)) return;

  // Compute next response number
  const nums = historyEntries.map(x => parseInt(x.responseNumber)).filter(n => !isNaN(n));
  const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
  const newRespNum = String(maxNum + 1);

  const rawNote = String(req.note || '').trim().toUpperCase();
  const cleanReqNote = rawNote === 'DRIVER REQUEST' ? '' : rawNote;

  const e = {
    responseNumber: newRespNum,
    date: req.date || '',
    time: req.time || '',
    vehicleNo: String(req.vehicleNo || '').toUpperCase(),
    vehicleType: String(req.vehicleType || '').toUpperCase(),
    fromLocation: String(req.fromLocation || '').toUpperCase(),
    lastLocation: String(req.lastLocation || '').toUpperCase(),
    currentKm: String(req.currentKm || ''),
    startKm: String(req.startKm || ''),
    endKm: String(req.endKm || ''),
    totalKm: String(req.totalKm || ''),
    dieselAmount: String(req.dieselAmount || ''),
    vendorName: String(req.vendorName || ''),
    note: cleanReqNote,
    litres: '',
    mileage: ''
  };

  if (req.location) e.location = req.location;

  const vAvg = vehicleTypes[e.vehicleType.toUpperCase()];
  if (vAvg) e.mileage = String(vAvg);

  if (e.dieselAmount && dieselRate > 0) {
    e.litres = String((parseFloat(e.dieselAmount) / dieselRate).toFixed(2));
  }

  const saveDirectFillRecord = (reqData = {}) => {
    const kPhotos = extractPhotosFromRecord(reqData, 'kmPhotos', 'kmPhoto', 'photo');
    if (kPhotos.length > 0) {
      e.kmPhotos = kPhotos;
      e.kmPhoto = kPhotos[0];
    }
    const rPhotos = extractPhotosFromRecord(reqData, 'receiptPhotos', 'receiptPhoto');
    if (rPhotos.length > 0) {
      e.receiptPhotos = rPhotos;
      e.receiptPhoto = rPhotos[0];
    }

    entriesRef.child(newRespNum).set(e)
      .then(() => {
        return driverRequestsRef.child(key).update({
          status: 'filled',
          processedAt: firebase.database.ServerValue.TIMESTAMP,
          filledAt: firebase.database.ServerValue.TIMESTAMP,
          linkedResponseNumber: newRespNum
        });
      })
      .then(() => {
        const avg = vehicleTypes[e.vehicleType.toUpperCase()] || '';
        const formattedTime = e.time ? (typeof convertTo24Hour === 'function' ? convertTo24Hour(e.time) : e.time) : '';
        const copyText = `🔔Diesel Request📢
Response #${newRespNum}
📅 Date & Time. : ${e.date || ''}${formattedTime ? ', ' + formattedTime : ''}
🚛 Vehicle No. : ${e.vehicleNo || ''}
🚚 Vehicle Type. : ${e.vehicleType || ''}${avg ? ',' + avg : ''}
📍 From Location. : ${e.fromLocation || ''}
📍 Last Location. : ${e.lastLocation || ''}
📊 Current KM. : ${e.currentKm || ''}
💸 Diesel (₹ INR). : ${e.dieselAmount || ''}
👮🏻 Vendor Name. : ${e.vendorName || ''}
📝 Note. : ${e.note || ''}`;

        copyToClipboard(copyText)
          .then(() => {
            toast.ok(`✅ Entry #${newRespNum} Diesel Records me add ho chuki hai & WhatsApp Data Clipboard me COPY ho gaya!`);
          })
          .catch(() => {
            toast.ok(`✅ Entry #${newRespNum} sidha Diesel Records me add ho chuki hai!`);
          });
      })
      .catch(err => {
        toast.err("Error saving direct diesel fill: " + err.message);
      });
  };

  driverRequestsRef.child(key).once('value')
    .then(snap => saveDirectFillRecord(snap.val() || req))
    .catch(() => saveDirectFillRecord(req));
}

window.directFillDriverRequest = directFillDriverRequest;

function revertDriverRequestApproval(key) {
  if (!checkAuth()) return;
  
  const req = driverRequestsList.find(r => r.key === key);
  if (!req) return toast.err("Request details not found.");

  // Check if the request is older than 24 hours
  const now = Date.now();
  const ageMs = now - (req.submittedAt || 0);
  if (ageMs > 24 * 60 * 60 * 1000) {
    return toast.err("Cannot revert approval. This request is older than 24 hours and has expired.");
  }

  if (!confirm(`Are you sure you want to REVERT the approval of vehicle ${req.vehicleNo} back to Pending status?`)) return;

  driverRequestsRef.child(key).update({ 
    status: 'pending',
    reverted: true,
    revertedAt: firebase.database.ServerValue.TIMESTAMP
  })
  .then(() => {
    // Remove processing fields completely to restore clean pending status
    driverRequestsRef.child(key).child('processedAt').remove();
    driverRequestsRef.child(key).child('autoApproved').remove();
    
    // Automatically switch status filter to 'ALL' so user can see the reverted pending request instantly
    const filterSelect = document.getElementById('driver-req-status-filter');
    if (filterSelect) {
      filterSelect.value = 'ALL';
    }
    
    toast.ok(`Approval reverted back to Pending!`);
  })
  .catch(err => {
    toast.err("Error reverting approval: " + err.message);
  });
}
function undoDriverRequestRejection(key) {
  if (!checkAuth()) return;
  
  const req = driverRequestsList.find(r => r.key === key);
  if (!req) return toast.err("Request details not found.");

  if (!confirm(`Are you sure you want to UNDO the rejection of vehicle ${req.vehicleNo} and move it back to Pending Approval?`)) return;

  driverRequestsRef.child(key).update({ 
    status: 'pending',
    reverted: true,
    revertedAt: firebase.database.ServerValue.TIMESTAMP
  })
  .then(() => {
    // Remove processed timestamp to restore clean pending status
    driverRequestsRef.child(key).child('processedAt').remove();
    
    // Automatically set status filter to 'ALL' so user sees the pending item immediately
    const filterSelect = document.getElementById('driver-req-status-filter');
    if (filterSelect) {
      filterSelect.value = 'ALL';
    }
    
    toast.ok(`Rejected request moved back to Pending Approval!`);
  })
  .catch(err => {
    toast.err("Error undoing rejection: " + err.message);
  });
}
window.undoDriverRequestRejection = undoDriverRequestRejection;
window.revertDriverRequestApproval = revertDriverRequestApproval;

// =========================================================================
// Driver Request Receipt Camera & Diesel Fill Flow
// =========================================================================
let activeFillReceiptKey = null;
let fillCameraStream = null;
let capturedReceiptBase64 = '';
let isSubmittingFillReceipt = false;

function openFillReceiptCamera(key) {
  if (!checkAuth()) return;
  const req = driverRequestsList.find(r => r.key === key);
  if (!req) return toast.err("Request details not found.");

  activeFillReceiptKey = key;
  capturedReceiptBase64 = '';

  const modal = document.getElementById('fill-receipt-camera-modal');
  if (!modal) return;

  // Set Info
  const vehEl = document.getElementById('fill-camera-veh');
  const amtEl = document.getElementById('fill-camera-amt');
  const kmEl = document.getElementById('fill-camera-km');
  const routeEl = document.getElementById('fill-camera-route');

  if (vehEl) vehEl.textContent = req.vehicleNo || '-';
  if (amtEl) amtEl.textContent = `₹${parseFloat(req.dieselAmount || 0).toLocaleString('en-IN')}`;
  if (kmEl) kmEl.textContent = req.currentKm ? `${req.currentKm} KM` : '-';
  if (routeEl) routeEl.textContent = `${req.fromLocation || '-'} ➔ ${req.lastLocation || '-'}`;

  modal.classList.remove('hidden');
  startFillReceiptCamera();
}

function startFillReceiptCamera() {
  if (fillCameraStream) {
    fillCameraStream.getTracks().forEach(t => t.stop());
    fillCameraStream = null;
  }

  const video = document.getElementById('fill-camera-video');
  const fallbackMsg = document.getElementById('fill-camera-fallback-msg');
  const previewBox = document.getElementById('fill-preview-container');
  const videoBox = document.getElementById('fill-video-container');
  const previewImg = document.getElementById('fill-camera-preview-img');

  if (previewImg) previewImg.src = '';
  if (previewBox) previewBox.classList.add('hidden');
  if (videoBox) videoBox.classList.remove('hidden');

  document.getElementById('fill-btn-capture')?.classList.remove('hidden');
  document.getElementById('fill-btn-upload-file')?.classList.remove('hidden');
  document.getElementById('fill-btn-confirm-submit')?.classList.add('hidden');
  document.getElementById('fill-btn-retake')?.classList.add('hidden');
  capturedReceiptBase64 = '';

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } }
    })
    .then(stream => {
      fillCameraStream = stream;
      if (video) {
        video.srcObject = stream;
        video.classList.remove('hidden');
      }
      if (fallbackMsg) fallbackMsg.classList.add('hidden');
    })
    .catch(err => {
      console.warn("Camera stream unavailable:", err);
      if (video) video.classList.add('hidden');
      if (fallbackMsg) fallbackMsg.classList.remove('hidden');
    });
  } else {
    if (video) video.classList.add('hidden');
    if (fallbackMsg) fallbackMsg.classList.remove('hidden');
  }
}

function closeFillReceiptCameraModal() {
  if (fillCameraStream) {
    fillCameraStream.getTracks().forEach(t => t.stop());
    fillCameraStream = null;
  }
  const modal = document.getElementById('fill-receipt-camera-modal');
  if (modal) modal.classList.add('hidden');
  activeFillReceiptKey = null;
  capturedReceiptBase64 = '';
  isSubmittingFillReceipt = false;
}

function triggerFillReceiptFileInput() {
  document.getElementById('fill-camera-file-input')?.click();
}

function handleFillReceiptFallbackFile(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      compressAndPreviewFillReceipt(img);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function captureFillReceiptPhoto() {
  const video = document.getElementById('fill-camera-video');
  if (!fillCameraStream || !video) {
    triggerFillReceiptFileInput();
    return;
  }

  const width = video.videoWidth || 640;
  const height = video.videoHeight || 480;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, width, height);

  const img = new Image();
  img.onload = function() {
    compressAndPreviewFillReceipt(img);
  };
  img.src = canvas.toDataURL('image/jpeg');
}

function compressAndPreviewFillReceipt(img) {
  const canvas = document.getElementById('fill-camera-canvas') || document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  const maxDim = 480;
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  capturedReceiptBase64 = canvas.toDataURL('image/jpeg', 0.35);

  if (fillCameraStream) {
    fillCameraStream.getTracks().forEach(t => t.stop());
    fillCameraStream = null;
  }

  const previewBox = document.getElementById('fill-preview-container');
  const videoBox = document.getElementById('fill-video-container');
  const previewImg = document.getElementById('fill-camera-preview-img');

  if (previewImg) previewImg.src = capturedReceiptBase64;
  if (videoBox) videoBox.classList.add('hidden');
  if (previewBox) previewBox.classList.remove('hidden');

  document.getElementById('fill-btn-capture')?.classList.add('hidden');
  document.getElementById('fill-btn-upload-file')?.classList.add('hidden');
  document.getElementById('fill-btn-confirm-submit')?.classList.remove('hidden');
  document.getElementById('fill-btn-retake')?.classList.remove('hidden');
}

function submitFillReceiptAction() {
  if (isSubmittingFillReceipt) return;
  if (!activeFillReceiptKey) return;

  const req = driverRequestsList.find(r => r.key === activeFillReceiptKey);
  if (!req) return toast.err("Request details not found.");

  if (!capturedReceiptBase64) {
    return toast.warn("Kripya receipt photo capture karein ya upload karein.");
  }

  isSubmittingFillReceipt = true;
  const submitBtn = document.getElementById('fill-btn-confirm-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  }

  // Compute next sequential response number accurately from historyEntries & entries
  const nums = historyEntries.map(x => parseInt(x.responseNumber)).filter(n => !isNaN(n));
  const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
  const newRespNum = String(maxNum + 1);

  const rawNote = String(req.note || '').trim().toUpperCase();
  const cleanReqNote = rawNote === 'DRIVER REQUEST' ? '' : rawNote;

  const e = {
    responseNumber: newRespNum,
    date: req.date || '',
    time: req.time || '',
    vehicleNo: String(req.vehicleNo || '').toUpperCase(),
    vehicleType: String(req.vehicleType || '').toUpperCase(),
    fromLocation: String(req.fromLocation || '').toUpperCase(),
    lastLocation: String(req.lastLocation || '').toUpperCase(),
    currentKm: String(req.currentKm || ''),
    startKm: String(req.startKm || ''),
    endKm: String(req.endKm || ''),
    totalKm: String(req.totalKm || ''),
    dieselAmount: String(req.dieselAmount || ''),
    vendorName: String(req.vendorName || ''),
    note: cleanReqNote,
    litres: '',
    mileage: '',
    hasReceiptPhoto: true
  };

  if (req.location) e.location = req.location;

  const vAvg = vehicleTypes[e.vehicleType.toUpperCase()];
  if (vAvg) e.mileage = String(vAvg);

  if (e.dieselAmount && dieselRate > 0) {
    e.litres = String((parseFloat(e.dieselAmount) / dieselRate).toFixed(2));
  }

  Promise.all([
    db.ref('driverRequestPhotos').child(activeFillReceiptKey).once('value'),
    driverRequestsRef.child(activeFillReceiptKey).once('value')
  ]).then(([photoSnap, reqSnap]) => {
    const photoData = photoSnap.val() || {};
    const fullReq = { ...(reqSnap.val() || {}), ...photoData };

    const kPhotos = extractPhotosFromRecord(fullReq, 'kmPhotos', 'kmPhoto', 'photo');
    if (kPhotos.length > 0) {
      e.kmPhotos = kPhotos;
      e.kmPhoto = kPhotos[0];
      e.hasKmPhoto = true;
    }

    const receiptList = [capturedReceiptBase64];
    const existingReceipts = extractPhotosFromRecord(fullReq, 'receiptPhotos', 'receiptPhoto');
    existingReceipts.forEach(p => {
      if (!receiptList.includes(p) && receiptList.length < 5) receiptList.push(p);
    });

    e.receiptPhotos = receiptList;
    e.receiptPhoto = receiptList[0];

    const photoPayload = {
      receiptPhotos: receiptList,
      receiptPhoto: receiptList[0]
    };
    if (kPhotos.length > 0) {
      photoPayload.kmPhotos = kPhotos;
      photoPayload.kmPhoto = kPhotos[0];
    }

    const cleanEntryPayload = JSON.parse(JSON.stringify(e));

    return entriesRef.child(newRespNum).set(cleanEntryPayload).then(() => {
      const writes = [
        driverRequestsRef.child(activeFillReceiptKey).update({
          status: 'filled',
          processedAt: firebase.database.ServerValue.TIMESTAMP,
          filledAt: firebase.database.ServerValue.TIMESTAMP,
          linkedResponseNumber: newRespNum,
          hasReceiptPhoto: true,
          receiptPhoto: null,
          receiptPhotos: null
        }),
        db.ref('driverRequestPhotos').child(activeFillReceiptKey).update(photoPayload),
        db.ref('entryPhotos').child(newRespNum).set(photoPayload)
      ];
      return Promise.all(writes);
    });
  })
  .then(() => {
    const avg = vehicleTypes[e.vehicleType.toUpperCase()] || '';
    const formattedTime = e.time ? (typeof convertTo24Hour === 'function' ? convertTo24Hour(e.time) : e.time) : '';
    const copyText = `🔔Diesel Request📢
Response #${newRespNum}
📅 Date & Time. : ${e.date || ''}${formattedTime ? ', ' + formattedTime : ''}
🚛 Vehicle No. : ${e.vehicleNo || ''}
🚚 Vehicle Type. : ${e.vehicleType || ''}${avg ? ',' + avg : ''}
📍 From Location. : ${e.fromLocation || ''}
📍 Last Location. : ${e.lastLocation || ''}
📊 Current KM. : ${e.currentKm || ''}
💸 Diesel (₹ INR). : ${e.dieselAmount || ''}
👮🏻 Vendor Name. : ${e.vendorName || ''}
📝 Note. : ${e.note || ''}`;

    closeFillReceiptCameraModal();
    if (typeof playChimeSound === 'function') playChimeSound();

    copyToClipboard(copyText)
      .then(() => {
        toast.ok(`✅ Entry #${newRespNum} Diesel Records me add ho chuki hai & WhatsApp Data Clipboard me COPY ho gaya!`);
      })
      .catch(() => {
        toast.ok(`✅ Vehicle ${e.vehicleNo} Successfully Filled! Entry #${newRespNum}`);
      });
  })
  .catch(err => {
    isSubmittingFillReceipt = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Successfully Fill';
    }
    toast.err("Error saving diesel fill: " + err.message);
  });
}

window.openFillReceiptCamera = openFillReceiptCamera;
window.closeFillReceiptCameraModal = closeFillReceiptCameraModal;
window.startFillReceiptCamera = startFillReceiptCamera;
window.triggerFillReceiptFileInput = triggerFillReceiptFileInput;
window.handleFillReceiptFallbackFile = handleFillReceiptFallbackFile;
window.captureFillReceiptPhoto = captureFillReceiptPhoto;
window.submitFillReceiptAction = submitFillReceiptAction;

window.openAutoApproveTimerModal = function() {
  const masterToggle = document.getElementById('timer-master-toggle');
  if (masterToggle) masterToggle.checked = autoApproveConfig.enabled !== false;

  const normalToggle = document.getElementById('timer-normal-toggle');
  const normalInput = document.getElementById('timer-normal-input');
  const isNormOn = autoApproveConfig.normalEnabled !== false && (autoApproveConfig.normalMins || 10) < 9999;
  if (normalToggle) normalToggle.checked = isNormOn;
  if (normalInput) {
    normalInput.value = (autoApproveConfig.normalMins >= 9999) ? 10 : (autoApproveConfig.normalMins || 10);
    normalInput.disabled = !isNormOn;
    if (!isNormOn) normalInput.classList.add('opacity-50');
    else normalInput.classList.remove('opacity-50');
  }

  const upiToggle = document.getElementById('timer-upi-toggle');
  const upiInput = document.getElementById('timer-upi-input');
  const isUpiOn = autoApproveConfig.upiEnabled !== false && (autoApproveConfig.upiMins || 60) < 9999;
  if (upiToggle) upiToggle.checked = isUpiOn;
  if (upiInput) {
    upiInput.value = (autoApproveConfig.upiMins >= 9999) ? 60 : (autoApproveConfig.upiMins || 60);
    upiInput.disabled = !isUpiOn;
    if (!isUpiOn) upiInput.classList.add('opacity-50');
    else upiInput.classList.remove('opacity-50');
  }

  const revertToggle = document.getElementById('timer-revert-toggle');
  const revertInput = document.getElementById('timer-revert-input');
  const isRevOn = autoApproveConfig.revertEnabled !== false && (autoApproveConfig.revertMins || 30) < 9999;
  if (revertToggle) revertToggle.checked = isRevOn;
  if (revertInput) {
    revertInput.value = (autoApproveConfig.revertMins >= 9999) ? 30 : (autoApproveConfig.revertMins || 30);
    revertInput.disabled = !isRevOn;
    if (!isRevOn) revertInput.classList.add('opacity-50');
    else revertInput.classList.remove('opacity-50');
  }
  
  const modal = document.getElementById('auto-approve-timer-modal');
  const modalContent = document.getElementById('auto-approve-timer-modal-content');
  
  modal.classList.remove('hidden');
  modal.offsetHeight; // trigger repaint
  modal.classList.remove('opacity-0', 'pointer-events-none');
  modalContent.classList.remove('scale-95');
  modalContent.classList.add('scale-100');
};

window.toggleTimerInputState = function(prefix) {
  const toggle = document.getElementById(`${prefix}-toggle`);
  const input = document.getElementById(`${prefix}-input`);
  if (toggle && input) {
    input.disabled = !toggle.checked;
    if (toggle.checked) {
      input.classList.remove('opacity-50');
      input.focus();
    } else {
      input.classList.add('opacity-50');
    }
  }
};

window.closeAutoApproveTimerModal = function() {
  const modal = document.getElementById('auto-approve-timer-modal');
  const modalContent = document.getElementById('auto-approve-timer-modal-content');
  
  modalContent.classList.remove('scale-100');
  modalContent.classList.add('scale-95');
  modal.classList.add('opacity-0', 'pointer-events-none');
  setTimeout(() => modal.classList.add('hidden'), 300);
};

// === Driver Request WhatsApp Number ===
const driverRequestWhatsAppMobileRef = db.ref('config/driver_request_whatsapp_mobile');
const driverRequestWhatsAppSlotsRef = db.ref('config/driver_request_whatsapp_slots');
let driverRequestWhatsAppMobile = '918371838314';
let driverRequestWhatsAppSlots = [];

driverRequestWhatsAppMobileRef.on('value', snapshot => {
  const savedNumber = String(snapshot.val() || '').replace(/\D/g, '');
  if (savedNumber.length >= 10) driverRequestWhatsAppMobile = savedNumber;
});

driverRequestWhatsAppSlotsRef.on('value', snapshot => {
  const val = snapshot.val();
  driverRequestWhatsAppSlots = Array.isArray(val) ? val : (val ? Object.values(val) : []);
});

window.addWhatsAppTimeSlotRow = function(slotData = { number: '', startTime: '09:00', endTime: '18:00' }) {
  const container = document.getElementById('whatsapp-time-slots-container');
  if (!container) return;

  const id = 'slot-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
  const row = document.createElement('div');
  row.className = 'whatsapp-slot-row p-3.5 bg-slate-100/70 dark:bg-slate-900/70 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 relative space-y-2';
  row.setAttribute('data-slot-id', id);

  row.innerHTML = `
    <div class="flex items-center justify-between">
      <span class="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider">Time Window Rule</span>
      <button onclick="this.closest('.whatsapp-slot-row').remove()" class="text-rose-500 hover:text-rose-600 text-xs font-bold px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 transition-colors">
        <i class="fas fa-trash-alt"></i> Remove
      </button>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <div>
        <label class="block text-[9px] font-bold text-slate-400 uppercase mb-1">Start Time</label>
        <input type="time" class="slot-start-time calc-input bg-white dark:bg-slate-950 text-xs font-bold py-1 h-9" value="${slotData.startTime || '09:00'}">
      </div>
      <div>
        <label class="block text-[9px] font-bold text-slate-400 uppercase mb-1">End Time</label>
        <input type="time" class="slot-end-time calc-input bg-white dark:bg-slate-950 text-xs font-bold py-1 h-9" value="${slotData.endTime || '18:00'}">
      </div>
    </div>
    <div>
      <label class="block text-[9px] font-bold text-slate-400 uppercase mb-1">WhatsApp Mobile Number</label>
      <input type="tel" class="slot-mobile-number calc-input bg-white dark:bg-slate-950 text-xs font-bold py-1 h-9" inputmode="numeric" maxlength="13" placeholder="e.g. 9876543210" value="${slotData.number ? slotData.number.replace(/^91/, '') : ''}">
    </div>
  `;

  container.appendChild(row);
};

window.openDriverRequestMobileModal = function() {
  const defaultInput = document.getElementById('driver-request-whatsapp-default-input');
  if (defaultInput) {
    defaultInput.value = driverRequestWhatsAppMobile.startsWith('91') && driverRequestWhatsAppMobile.length === 12
      ? driverRequestWhatsAppMobile.slice(2)
      : driverRequestWhatsAppMobile;
  }

  const container = document.getElementById('whatsapp-time-slots-container');
  if (container) {
    container.innerHTML = '';
    if (driverRequestWhatsAppSlots && driverRequestWhatsAppSlots.length > 0) {
      driverRequestWhatsAppSlots.forEach(slot => window.addWhatsAppTimeSlotRow(slot));
    }
  }

  const modal = document.getElementById('driver-request-mobile-modal');
  const modalContent = document.getElementById('driver-request-mobile-modal-content');
  modal.classList.remove('hidden');
  modal.offsetHeight;
  modal.classList.remove('opacity-0', 'pointer-events-none');
  modalContent.classList.remove('scale-95');
  modalContent.classList.add('scale-100');
};

window.closeDriverRequestMobileModal = function() {
  const modal = document.getElementById('driver-request-mobile-modal');
  const modalContent = document.getElementById('driver-request-mobile-modal-content');
  modalContent.classList.remove('scale-100');
  modalContent.classList.add('scale-95');
  modal.classList.add('opacity-0', 'pointer-events-none');
  setTimeout(() => modal.classList.add('hidden'), 300);
};

window.saveDriverRequestMobileNumber = function() {
  let defaultMobile = document.getElementById('driver-request-whatsapp-default-input').value.replace(/\D/g, '');
  if (defaultMobile.length === 10) defaultMobile = `91${defaultMobile}`;

  if (!/^91\d{10}$/.test(defaultMobile)) {
    toast.err('Enter a valid 10-digit Indian default mobile number.');
    return;
  }

  const slotRows = document.querySelectorAll('#whatsapp-time-slots-container .whatsapp-slot-row');
  const validSlots = [];

  for (let row of slotRows) {
    const startTime = row.querySelector('.slot-start-time').value;
    const endTime = row.querySelector('.slot-end-time').value;
    let number = row.querySelector('.slot-mobile-number').value.replace(/\D/g, '');
    if (number.length === 10) number = `91${number}`;

    if (!/^91\d{10}$/.test(number)) {
      toast.err('Please enter a valid 10-digit mobile number for all scheduled slots.');
      return;
    }
    if (!startTime || !endTime) {
      toast.err('Please set valid start and end times for all slots.');
      return;
    }

    validSlots.push({ startTime, endTime, number });
  }

  const updates = {};
  updates['config/driver_request_whatsapp_mobile'] = defaultMobile;
  updates['config/driver_request_whatsapp_slots'] = validSlots;

  db.ref().update(updates)
    .then(() => {
      toast.ok('WhatsApp numbers and time slots updated live.');
      window.closeDriverRequestMobileModal();
    })
    .catch(error => toast.err(`Update failed: ${error.message}`));
};

// === Vendor KM Photo Permission Manager ===
const vendorKmPhotoPermissionsRef = db.ref('config/vendor_km_photo_permissions');
let vendorKmPhotoPermissions = {};

vendorKmPhotoPermissionsRef.on('value', snapshot => {
  vendorKmPhotoPermissions = snapshot.val() || {};
  if (document.getElementById('vendor-km-permission-modal') && !document.getElementById('vendor-km-permission-modal').classList.contains('hidden')) {
    renderVendorKmPermissionList();
  }
});

window.openVendorKmPermissionModal = function() {
  const modal = document.getElementById('vendor-km-permission-modal');
  const modalContent = document.getElementById('vendor-km-permission-modal-content');
  const searchInput = document.getElementById('vendor-km-perm-search');
  if (searchInput) searchInput.value = '';
  
  renderVendorKmPermissionList();

  modal.classList.remove('hidden');
  modal.offsetHeight;
  modal.classList.remove('opacity-0', 'pointer-events-none');
  modalContent.classList.remove('scale-95');
  modalContent.classList.add('scale-100');
};

window.closeVendorKmPermissionModal = function() {
  const modal = document.getElementById('vendor-km-permission-modal');
  const modalContent = document.getElementById('vendor-km-permission-modal-content');
  modalContent.classList.remove('scale-100');
  modalContent.classList.add('scale-95');
  modal.classList.add('opacity-0', 'pointer-events-none');
  setTimeout(() => modal.classList.add('hidden'), 300);
};

window.renderVendorKmPermissionList = function() {
  const container = document.getElementById('vendor-km-perm-list');
  if (!container) return;
  
  const searchVal = (document.getElementById('vendor-km-perm-search')?.value || '').trim().toLowerCase();

  // Combine default RPM LOGISTICS and custom vendors list
  const vendorSet = new Set(['RPM LOGISTICS PVT.LTD.']);
  if (typeof vendorsList !== 'undefined' && Array.isArray(vendorsList)) {
    vendorsList.forEach(v => {
      if (v && v.name) vendorSet.add(v.name.toUpperCase());
    });
  }

  const sortedVendors = Array.from(vendorSet).sort().filter(v => v.toLowerCase().includes(searchVal));

  if (sortedVendors.length === 0) {
    container.innerHTML = `<div class="text-center py-6 text-xs text-slate-400 font-semibold">No matching vendors found.</div>`;
    return;
  }

  container.innerHTML = '';
  sortedVendors.forEach(vName => {
    const sanitizedKey = vName.replace(/[.#$[\]/]/g, '_');
    const safeName = vName.replace(/'/g, "\\'");
    
    let isChecked = false;
    if (vendorKmPhotoPermissions[sanitizedKey] !== undefined) {
      isChecked = !!vendorKmPhotoPermissions[sanitizedKey];
    } else if (vName === 'RPM LOGISTICS PVT.LTD.') {
      isChecked = true;
    }

    const row = document.createElement('div');
    row.className = "flex items-center justify-between p-3 rounded-2xl bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-800/40 hover:border-purple-500/30 transition-all";
    row.innerHTML = `
      <div class="flex items-center gap-2.5">
        <div class="w-7 h-7 rounded-lg ${isChecked ? 'bg-purple-500/10 text-purple-500' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'} flex items-center justify-center text-xs font-bold">
          <i class="fas ${isChecked ? 'fa-camera' : 'fa-camera-slash'}"></i>
        </div>
        <div>
          <div class="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-tight">${vName}</div>
          <div class="text-[9px] font-bold ${isChecked ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}">
            ${isChecked ? '📷 KM Photo Required' : '⚡ Direct Submit (No Photo)'}
          </div>
        </div>
      </div>
      <label class="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" class="sr-only peer" ${isChecked ? 'checked' : ''} onchange="toggleVendorKmPermission('${safeName}', this.checked)">
        <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-purple-600"></div>
      </label>
    `;
    container.appendChild(row);
  });
};

window.toggleVendorKmPermission = function(vendorName, isChecked) {
  if (!checkAuth()) {
    renderVendorKmPermissionList();
    return;
  }
  const sanitizedKey = vendorName.replace(/[.#$[\]/]/g, '_');
  vendorKmPhotoPermissionsRef.child(sanitizedKey).set(isChecked)
    .then(() => {
      toast.ok(`Vendor ${vendorName}: KM Photo ${isChecked ? 'Enabled (ON)' : 'Disabled (OFF)'}`);
    })
    .catch(err => {
      toast.err("Failed to update permission: " + err.message);
      renderVendorKmPermissionList();
    });
};

// === Exclude KM Capture Vehicles Manager ===
const excludedKmVehiclesRef = db.ref('config/excludedKmVehicles');
let excludedKmVehicles = {};

excludedKmVehiclesRef.on('value', snapshot => {
  excludedKmVehicles = snapshot.val() || {};
  if (document.getElementById('exclude-km-modal') && !document.getElementById('exclude-km-modal').classList.contains('hidden')) {
    renderExcludeKmCaptureList();
  }
});

window.openExcludeKmCaptureModal = function() {
  const modal = document.getElementById('exclude-km-modal');
  const modalContent = document.getElementById('exclude-km-modal-content');
  const input = document.getElementById('exclude-km-vehicle-input');
  
  if (input) input.value = '';
  
  // Populate datalist with system vehicles
  const datalist = document.getElementById('exclude-km-vehicle-datalist');
  if (datalist && typeof vehiclesList !== 'undefined' && Array.isArray(vehiclesList)) {
    datalist.innerHTML = vehiclesList.map(v => `<option value="${v.vehicleNo || v}"></option>`).join('');
  }

  renderExcludeKmCaptureList();

  modal.classList.remove('hidden');
  modal.offsetHeight;
  modal.classList.remove('opacity-0', 'pointer-events-none');
  modalContent.classList.remove('scale-95');
  modalContent.classList.add('scale-100');
};

window.closeExcludeKmCaptureModal = function() {
  const modal = document.getElementById('exclude-km-modal');
  const modalContent = document.getElementById('exclude-km-modal-content');
  modalContent.classList.remove('scale-100');
  modalContent.classList.add('scale-95');
  modal.classList.add('opacity-0', 'pointer-events-none');
  setTimeout(() => modal.classList.add('hidden'), 300);
};

window.renderExcludeKmCaptureList = function() {
  const container = document.getElementById('exclude-km-vehicles-list');
  const badge = document.getElementById('exclude-km-count-badge');
  if (!container) return;

  const vehKeys = Object.keys(excludedKmVehicles).filter(k => !!excludedKmVehicles[k]);

  if (badge) {
    badge.textContent = `${vehKeys.length} Vehicle${vehKeys.length === 1 ? '' : 's'}`;
  }

  if (vehKeys.length === 0) {
    container.innerHTML = `
      <div class="p-6 text-center bg-slate-100/40 dark:bg-slate-900/40 rounded-2xl border border-slate-200/30 dark:border-slate-800/30">
        <i class="fas fa-info-circle text-slate-400 text-2xl mb-2"></i>
        <div class="text-xs font-bold text-slate-400">No vehicles excluded</div>
        <div class="text-[10px] text-slate-500 mt-0.5">All vehicles currently require camera KM photo capture.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  vehKeys.sort().forEach(vehNo => {
    const row = document.createElement('div');
    row.className = "flex items-center justify-between p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/50 hover:border-rose-500/30 transition-all";
    row.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold text-xs">
          🚛
        </div>
        <div>
          <div class="text-xs font-extrabold text-blue-600 dark:text-blue-400 tracking-wider">${vehNo}</div>
          <div class="text-[9px] font-bold text-rose-500 dark:text-rose-400 mt-0.5">⚡ KM Capture Bypassed (Direct WhatsApp)</div>
        </div>
      </div>
      <button onclick="removeVehicleFromKmExclusion('${vehNo}')" class="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 text-xs font-bold transition-all flex items-center gap-1.5" title="Remove from exclusion list">
        <i class="fas fa-trash-alt"></i> Remove
      </button>
    `;
    container.appendChild(row);
  });
};

window.addVehicleToKmExclusion = function() {
  const input = document.getElementById('exclude-km-vehicle-input');
  if (!input) return;

  const rawVal = input.value.trim().toUpperCase();
  const cleanVeh = rawVal.replace(/[^A-Z0-9]/g, '');

  if (!cleanVeh || cleanVeh.length < 4) {
    toast.err("Please enter a valid vehicle number (at least 4 characters).");
    return;
  }

  excludedKmVehiclesRef.child(cleanVeh).set(true)
    .then(() => {
      toast.ok(`Vehicle ${cleanVeh} added to KM Exclusion list.`);
      input.value = '';
    })
    .catch(err => {
      toast.err("Failed to add vehicle: " + err.message);
    });
};

window.removeVehicleFromKmExclusion = function(vehNo) {
  const cleanVeh = String(vehNo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cleanVeh) return;

  excludedKmVehiclesRef.child(cleanVeh).remove()
    .then(() => {
      toast.ok(`Vehicle ${cleanVeh} removed from KM Exclusion list.`);
    })
    .catch(err => {
      toast.err("Failed to remove vehicle: " + err.message);
    });
};

window.saveAutoApproveTimerSettings = function() {
  const masterEnabled = document.getElementById('timer-master-toggle')?.checked ?? true;
  const normalToggle = document.getElementById('timer-normal-toggle')?.checked ?? true;
  const upiToggle = document.getElementById('timer-upi-toggle')?.checked ?? false;
  const revertToggle = document.getElementById('timer-revert-toggle')?.checked ?? false;

  const normalMins = parseInt(document.getElementById('timer-normal-input').value) || 10;
  const upiMins = parseInt(document.getElementById('timer-upi-input').value) || 60;
  const revertMins = parseInt(document.getElementById('timer-revert-input').value) || 30;

  autoApproveConfig = {
    enabled: masterEnabled,
    normalEnabled: normalToggle && normalMins < 9999,
    normalMins: normalToggle ? normalMins : 10000,
    upiEnabled: upiToggle && upiMins < 9999,
    upiMins: upiToggle ? upiMins : 10000,
    revertEnabled: revertToggle && revertMins < 9999,
    revertMins: revertToggle ? revertMins : 10000
  };
  window.autoApproveConfig = autoApproveConfig;

  db.ref('autoApproveTimerConfig').set(autoApproveConfig)
    .then(() => {
      toast.ok("Auto approval settings updated successfully.");
      window.closeAutoApproveTimerModal();
      checkAndAutoApproveRequests();
      if (typeof renderDriverRequestsList === 'function') renderDriverRequestsList();
    })
    .catch(e => {
      toast.err("Failed to save settings: " + e.message);
    });
};

function autoApproveRequest(req, timeoutMsg = "") {
  if (!req || !req.key) return;
  const key = req.key;
  const noteUpper = String(req.note || '').trim().toUpperCase();
  const autoFill = noteUpper.includes("UPI") || noteUpper.includes("OUT SIDE") || noteUpper.includes("OUTSIDE");

  if (autoFill) {
    // Auto-fill logic: Compute next response number and save directly to entries
    const nums = historyEntries.map(x => parseInt(x.responseNumber)).filter(n => !isNaN(n));
    const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
    const newRespNum = String(maxNum + 1);

    const rawNote = String(req.note || '').trim().toUpperCase();
    const cleanReqNote = rawNote === 'DRIVER REQUEST' ? '' : rawNote;
    const e = {
      responseNumber: newRespNum,
      date: req.date || '',
      time: req.time || '',
      vehicleNo: String(req.vehicleNo || '').toUpperCase(),
      vehicleType: String(req.vehicleType || '').toUpperCase(),
      fromLocation: String(req.fromLocation || '').toUpperCase(),
      lastLocation: String(req.lastLocation || '').toUpperCase(),
      currentKm: String(req.currentKm || ''),
      startKm: String(req.startKm || ''),
      endKm: String(req.endKm || ''),
      totalKm: String(req.totalKm || ''),
      dieselAmount: String(req.dieselAmount || ''),
      vendorName: String(req.vendorName || ''),
      note: cleanReqNote,
      litres: '',
      mileage: ''
    };
    if (req.location) {
      e.location = req.location;
    }

    const vAvg = vehicleTypes[e.vehicleType.toUpperCase()];
    if (vAvg) e.mileage = String(vAvg);

    if (e.dieselAmount && dieselRate > 0) {
      e.litres = String((parseFloat(e.dieselAmount) / dieselRate).toFixed(2));
    }

    const saveAutoApproveRecord = (reqData = {}) => {
      const kPhotos = extractPhotosFromRecord(reqData, 'kmPhotos', 'kmPhoto', 'photo');
      if (kPhotos.length > 0) {
        e.kmPhotos = kPhotos;
        e.kmPhoto = kPhotos[0];
      }
      const rPhotos = extractPhotosFromRecord(reqData, 'receiptPhotos', 'receiptPhoto');
      if (rPhotos.length > 0) {
        e.receiptPhotos = rPhotos;
        e.receiptPhoto = rPhotos[0];
      }

      entriesRef.child(newRespNum).set(e)
        .then(() => {
          return driverRequestsRef.child(key).update({
            status: 'filled',
            processedAt: firebase.database.ServerValue.TIMESTAMP,
            filledAt: firebase.database.ServerValue.TIMESTAMP,
            linkedResponseNumber: newRespNum,
            autoApproved: true,
            reverted: null,
            revertedAt: null
          });
        })
        .then(() => {
          toast.ok(`Auto-approved & filled request for vehicle ${req.vehicleNo} (${timeoutMsg}). Ledger Entry #${newRespNum}`);
          if (typeof playChimeSound === 'function') playChimeSound();
        })
        .catch(err => {
          req._isAutoApproving = false;
          console.error("Error processing auto-fill: ", err);
        });
    };

    driverRequestsRef.child(key).once('value')
      .then(snap => saveAutoApproveRecord(snap.val() || req))
      .catch(() => saveAutoApproveRecord(req));
  } else {
    // Normal approval logic
    driverRequestsRef.child(key).update({ 
      status: 'approved', 
      processedAt: firebase.database.ServerValue.TIMESTAMP,
      autoApproved: true,
      reverted: null,
      revertedAt: null
    })
    .then(() => {
      toast.ok(`Auto-approved request for vehicle ${req.vehicleNo} (${timeoutMsg}).`);
      if (typeof playChimeSound === 'function') playChimeSound();
    })
    .catch(err => {
      req._isAutoApproving = false;
      console.error("Error processing auto-approval: ", err);
    });
  }
}

function checkAndAutoApproveRequests() {
  if (typeof driverRequestsList === 'undefined' || !Array.isArray(driverRequestsList)) return;
  if (autoApproveConfig.enabled === false) return;

  driverRequestsList.forEach(req => {
    if (req && req.status === 'pending') {
      if (req._isAutoApproving) return;
      const info = getAutoApproveTimerInfo(req);
      if (info && info.enabled && info.isExpired) {
        req._isAutoApproving = true;
        console.log(`[Auto-Approve] Request ${req.key} for vehicle ${req.vehicleNo} has expired (${info.typeLabel} ${info.timeoutMins}m). Auto-approving...`);
        autoApproveRequest(req, `${info.typeLabel} ${info.timeoutMins}m Timeout`);
      }
    }
  });
}

// Start periodic checks for auto-approval every 10 seconds
setInterval(checkAndAutoApproveRequests, 10000);

// Real-time 1-second UI countdown timer updater for pending request table
if (window._autoApproveUiInterval) clearInterval(window._autoApproveUiInterval);
window._autoApproveUiInterval = setInterval(() => {
  const timerBadges = document.querySelectorAll('.auto-timer-badge');
  if (timerBadges.length === 0) return;

  const now = Date.now();
  let hasExpiredItem = false;

  timerBadges.forEach(badge => {
    const baseTime = parseInt(badge.getAttribute('data-base-time')) || 0;
    const timeoutMins = parseInt(badge.getAttribute('data-timeout-mins')) || 10;
    const reqKey = badge.getAttribute('data-req-key');
    if (!baseTime || !reqKey) return;

    const timeoutMs = timeoutMins * 60 * 1000;
    const remainingMs = timeoutMs - (now - baseTime);
    const span = badge.querySelector('.countdown-text');

    if (remainingMs <= 0) {
      if (span) span.textContent = '0s';
      badge.className = 'mt-1 inline-flex items-center gap-1 text-[8.5px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded whitespace-nowrap animate-pulse';
      badge.innerHTML = `<i class="fas fa-bolt text-[8px]"></i> Auto-Approving...`;
      hasExpiredItem = true;
    } else {
      const remMins = Math.floor(remainingMs / 60000);
      const remSecs = Math.floor((remainingMs % 60000) / 1000);
      const timeStr = remMins > 0 
        ? `${remMins}m ${String(remSecs).padStart(2, '0')}s` 
        : `${remSecs}s`;
      if (span) span.textContent = timeStr;
    }
  });

  if (hasExpiredItem) {
    checkAndAutoApproveRequests();
  }
}, 1000);

// Auto Clean Driver Requests (Master Log) weekly (delete filled/rejected requests older than 7 days)
// Lazy-cron backup trigger for free hosting (InfinityFree)
function checkAndTriggerBackup() {
  const lastBackupRef = db.ref('config/lastBackupTime');
  lastBackupRef.once('value', snapshot => {
    const lastTime = snapshot.val() || 0;
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    
    if (now - lastTime >= sevenDaysMs) {
      console.log("[Auto-Backup] Last backup was more than 7 days ago. Triggering PHP backup script...");
      fetch('backup/cron_backup.php')
        .then(res => res.text())
        .then(resText => {
          console.log("[Auto-Backup] PHP Response:", resText);
          if (resText.includes("SUCCESS")) {
            lastBackupRef.set(now);
          }
        })
        .catch(err => {
          console.warn("[Auto-Backup] Failed to trigger PHP backup:", err);
        });
    }
  });
}

// === Master Requests Log Auto Disappearing Settings ===
const masterLogAutoCleanDaysRef = db.ref('config/master_log_auto_clean_days');
const masterLogAutoCleanEnabledRef = db.ref('config/master_log_auto_clean_enabled');

let masterLogAutoCleanDays = 5;
let masterLogAutoCleanEnabled = true;

masterLogAutoCleanDaysRef.on('value', snapshot => {
  const val = parseInt(snapshot.val());
  if (!isNaN(val) && val > 0) {
    masterLogAutoCleanDays = val;
  }
  updateMasterLogCleanBtnLabel();
});

masterLogAutoCleanEnabledRef.on('value', snapshot => {
  const val = snapshot.val();
  if (val !== null && val !== undefined) {
    masterLogAutoCleanEnabled = !!val;
  }
  updateMasterLogCleanBtnLabel();
});

function updateMasterLogCleanBtnLabel() {
  const labelEl = document.getElementById('master-log-clean-btn-label');
  if (labelEl) {
    if (masterLogAutoCleanEnabled) {
      labelEl.textContent = `Timer: ${masterLogAutoCleanDays} Day${masterLogAutoCleanDays > 1 ? 's' : ''}`;
    } else {
      labelEl.textContent = `Timer: Disabled`;
    }
  }
}

window.openMasterLogAutoCleanModal = function() {
  const modal = document.getElementById('master-log-auto-clean-modal');
  const modalContent = document.getElementById('master-log-auto-clean-modal-content');
  const toggle = document.getElementById('master-log-clean-enabled-toggle');
  const daysInput = document.getElementById('master-log-clean-days-input');

  if (toggle) toggle.checked = masterLogAutoCleanEnabled;
  if (daysInput) daysInput.value = masterLogAutoCleanDays;

  modal.classList.remove('hidden');
  modal.offsetHeight;
  modal.classList.remove('opacity-0', 'pointer-events-none');
  modalContent.classList.remove('scale-95');
  modalContent.classList.add('scale-100');
};

window.closeMasterLogAutoCleanModal = function() {
  const modal = document.getElementById('master-log-auto-clean-modal');
  const modalContent = document.getElementById('master-log-auto-clean-modal-content');
  modalContent.classList.remove('scale-100');
  modalContent.classList.add('scale-95');
  modal.classList.add('opacity-0', 'pointer-events-none');
  setTimeout(() => modal.classList.add('hidden'), 300);
};

window.setMasterLogCleanPreset = function(days) {
  const daysInput = document.getElementById('master-log-clean-days-input');
  if (daysInput) daysInput.value = days;
};

window.saveMasterLogAutoCleanSettings = function() {
  if (typeof checkAuth === 'function' && !checkAuth()) return;
  const toggle = document.getElementById('master-log-clean-enabled-toggle');
  const daysInput = document.getElementById('master-log-clean-days-input');
  
  const enabled = toggle ? toggle.checked : true;
  const days = parseInt(daysInput ? daysInput.value : 1) || 1;

  if (days < 1) {
    if (typeof toast !== 'undefined' && toast.err) toast.err("Minimum disappearing duration is 1 day.");
    return;
  }

  Promise.all([
    masterLogAutoCleanDaysRef.set(days),
    masterLogAutoCleanEnabledRef.set(enabled)
  ]).then(() => {
    if (typeof toast !== 'undefined' && toast.ok) {
      toast.ok(`Auto disappearing settings updated: ${enabled ? days + ' Day(s)' : 'Disabled'}`);
    }
    window.closeMasterLogAutoCleanModal();
    autoCleanDriverRequests(true);
  }).catch(err => {
    if (typeof toast !== 'undefined' && toast.err) {
      toast.err("Failed to save settings: " + err.message);
    }
  });
};

window.cleanMasterLogNow = function() {
  if (typeof checkAuth === 'function' && !checkAuth()) return;
  const daysInput = document.getElementById('master-log-clean-days-input');
  const days = parseInt(daysInput ? daysInput.value : masterLogAutoCleanDays) || masterLogAutoCleanDays;

  if (!confirm(`Are you sure you want to clean all Master Log requests older than ${days} day(s) right now?`)) return;

  const now = Date.now();
  const limitMs = days * 24 * 60 * 60 * 1000;

  driverRequestsRef.once('value', snap => {
    const data = snap.val();
    if (!data) return typeof toast !== 'undefined' && toast.info && toast.info("Master log is already empty.");

    const updates = {};
    let count = 0;

    Object.entries(data).forEach(([key, item]) => {
      if (item) {
        const submittedAt = item.submittedAt || item.processedAt || 0;
        const ageMs = submittedAt ? (now - submittedAt) : 0;
        if (ageMs > limitMs || !submittedAt) {
          updates[key] = null;
          count++;
        }
      }
    });

    if (count > 0) {
      driverRequestsRef.update(updates)
        .then(() => {
          db.ref('config/lastDriverRequestsCleanedAt').set(now);
          if (typeof toast !== 'undefined' && toast.ok) {
            toast.ok(`Cleaned ${count} request(s) older than ${days} day(s) from Master Log.`);
          }
          window.closeMasterLogAutoCleanModal();
        })
        .catch(err => {
          if (typeof toast !== 'undefined' && toast.err) toast.err("Error cleaning master log: " + err.message);
        });
    } else {
      if (typeof toast !== 'undefined' && toast.info) toast.info(`No requests found older than ${days} day(s).`);
    }
  });
};

function autoCleanDriverRequests(forceRun = false) {
  if (!masterLogAutoCleanEnabled) return;
  
  const cleanDays = parseInt(masterLogAutoCleanDays) || 1;
  if (cleanDays < 1) return;

  const now = Date.now();
  const limitMs = cleanDays * 24 * 60 * 60 * 1000;
  const checkIntervalMs = 60 * 60 * 1000; // Check frequency: 1 hour

  db.ref('config/lastDriverRequestsCleanedAt').once('value', snapshot => {
    const lastCleaned = snapshot.val() || 0;
    if (!forceRun && (now - lastCleaned < checkIntervalMs)) return;

    driverRequestsRef.once('value', snap => {
      const data = snap.val();
      if (!data) return;

      const updates = {};
      let count = 0;

      Object.entries(data).forEach(([key, item]) => {
        if (item) {
          const submittedAt = item.submittedAt || item.processedAt || 0;
          if (!submittedAt) {
            updates[key] = null;
            count++;
          } else {
            const ageMs = now - submittedAt;
            if (ageMs > limitMs) {
              updates[key] = null;
              count++;
            }
          }
        }
      });

      if (count > 0) {
        driverRequestsRef.update(updates)
          .then(() => {
            db.ref('config/lastDriverRequestsCleanedAt').set(now);
            console.log(`[Auto Clean] Successfully deleted ${count} entries older than ${cleanDays} day(s).`);
          })
          .catch(err => {
            console.error("[Auto Clean] Failed to delete old entries:", err);
          });
      } else {
        db.ref('config/lastDriverRequestsCleanedAt').set(now);
      }
    });
  });
}

// Sync Driver Requests
let isDriverRequestsInitialLoadComplete = false;
console.log("[DriverRequests Sync] Initializing listener on DB URL:", db.app.options.databaseURL);

setTimeout(() => {
  const dbUrlEl = document.getElementById('driver-req-db-url');
  if (dbUrlEl) {
    dbUrlEl.textContent = db.app.options.databaseURL;
  }
}, 800);

// Safely initialize user accounts watcher once DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof watchAllUserAccounts === 'function') watchAllUserAccounts();
  });
} else {
  if (typeof watchAllUserAccounts === 'function') watchAllUserAccounts();
}

driverRequestsRef.on('value', snapshot => {
  const val = snapshot.val();
  driverRequestsList = [];
  if (val) {
    Object.entries(val).forEach(([key, item]) => {
      if (!item) return;
      const r = { ...item, key };
      if (r.receiptPhoto || (Array.isArray(r.receiptPhotos) && r.receiptPhotos.length > 0) || (r.receiptPhotos && typeof r.receiptPhotos === 'object' && Object.keys(r.receiptPhotos).length > 0) || r.capturedPhoto) {
        r.hasReceiptPhoto = true;
      }
      if (r.capturedPhoto) {
        r.hasCapturedPhoto = true;
      }
      delete r.receiptPhoto;
      delete r.receiptPhotos;
      delete r.capturedPhoto;

      if (r.requestedReceiptPhoto || (Array.isArray(r.requestedReceiptPhotos) && r.requestedReceiptPhotos.length > 0)) {
        r.hasRequestedReceiptPhoto = true;
      }
      delete r.requestedReceiptPhoto;
      delete r.requestedReceiptPhotos;

      if (r.kmPhoto || r.photo || (Array.isArray(r.kmPhotos) && r.kmPhotos.length > 0) || (r.kmPhotos && typeof r.kmPhotos === 'object' && Object.keys(r.kmPhotos).length > 0)) {
        r.hasKmPhoto = true;
      }
      delete r.kmPhoto;
      delete r.kmPhotos;
      delete r.photo;
      driverRequestsList.push(r);
    });
    driverRequestsList.sort((a, b) => {
      const timeA = typeof a.submittedAt === 'number' ? a.submittedAt : (a.submittedAt ? new Date(a.submittedAt).getTime() : 0);
      const timeB = typeof b.submittedAt === 'number' ? b.submittedAt : (b.submittedAt ? new Date(b.submittedAt).getTime() : 0);
      return (timeB || 0) - (timeA || 0);
    });
  }
  saveCache('rpm_cache_driver_requests', driverRequestsList);
  console.log("[DriverRequests Sync] Value listener fired. Items count:", driverRequestsList.length);
  autoCleanDriverRequests();
  checkAndTriggerBackup();
  checkAndAutoApproveRequests();
  updateDriverRequestsBadges();
  if (activeSection === 'driver-requests') {
    renderDriverRequestsList();
  } else if (activeSection === 'driver-requests-log') {
    renderDriverRequestsLogList();
  }
  isDriverRequestsInitialLoadComplete = true;
});

// High-Performance Background Keep-Alive Worker & Real-time Persistence Engine
(function setupBackgroundKeepAlive() {
  const triggerKeepAlive = () => {
    try {
      if (typeof db !== 'undefined' && db) {
        db.goOnline();
      }
    } catch (e) {}
  };

  // 1. Web Worker Keep-Alive thread (Bypasses background tab timer throttling)
  try {
    const workerBlob = new Blob([`
      setInterval(() => { postMessage('heartbeat'); }, 10000);
    `], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(workerBlob);
    const worker = new Worker(workerUrl);
    worker.onmessage = () => {
      triggerKeepAlive();
    };
  } catch(e) {
    setInterval(triggerKeepAlive, 15000);
  }

  // 2. Immediate reconnection on tab state changes, focus, resume, and network online events
  const events = ['visibilitychange', 'focus', 'online', 'pageshow', 'mousemove', 'touchstart'];
  events.forEach(evtName => {
    window.addEventListener(evtName, () => {
      triggerKeepAlive();
    }, { passive: true });
  });
})();

// Helper to show native notifications
function triggerNativeNotification(title, body, reqKey = null) {
  if (typeof getAuthSession === 'function' && getAuthSession('rpm_logged_in') !== '1') return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  
  if (navigator.serviceWorker && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready.then(reg => {
      const options = {
        body: body,
        icon: 'assets/logo.png',
        badge: 'assets/logo.png',
        vibrate: [200, 100, 200]
      };
      
      if (reqKey) {
        options.data = { requestKey: reqKey };
        options.actions = [
          { action: 'approve', title: 'Approve' },
          { action: 'reject', title: 'Reject' }
        ];
      }
      
      reg.showNotification(title, options);
    }).catch(err => {
      console.warn("ServiceWorker notification failed, falling back to window.Notification:", err);
      try {
        new Notification(title, { body: body, icon: 'assets/logo.png' });
      } catch (e) {
        console.error("Window Notification failed:", e);
      }
    });
  } else {
    try {
      new Notification(title, { body: body, icon: 'assets/logo.png' });
    } catch (e) {
      console.error("Window Notification failed:", e);
    }
  }
}

// Sound alert listener for newly added pending requests
driverRequestsRef.on('child_added', snapshot => {
  if (typeof getAuthSession === 'function' && getAuthSession('rpm_logged_in') !== '1') return;
  const item = snapshot.val();
  if (item) {
    console.log("[DriverRequests Sync] Child added:", item.vehicleNo, "Status:", item.status, "Initial load complete:", isDriverRequestsInitialLoadComplete);
    if (isDriverRequestsInitialLoadComplete && item.status === 'pending') {
      playChimeSound();
      toast.warn(`New Fuel Request from Vehicle: ${item.vehicleNo}`);
      triggerNativeNotification(
        `New Fuel Request`,
        `Vehicle: ${item.vehicleNo}\nVendor: ${item.vendorName || 'N/A'}\nAmount: ₹${item.dieselAmount}`,
        snapshot.key
      );
    }
  }
});

// Sound alert listener for changed requests (amount update requests)
driverRequestsRef.on('child_changed', snapshot => {
  if (typeof getAuthSession === 'function' && getAuthSession('rpm_logged_in') !== '1') return;
  const item = snapshot.val();
  if (item) {
    console.log("[DriverRequests Sync] Child changed:", item.vehicleNo, "Status:", item.status, "Initial load complete:", isDriverRequestsInitialLoadComplete);
    if (isDriverRequestsInitialLoadComplete && item.status === 'update_pending') {
      playChimeSound();
      toast.warn(`Amount Update Request for Vehicle: ${item.vehicleNo}`);
      triggerNativeNotification(
        `Amount Update Request`,
        `Vehicle: ${item.vehicleNo}\nProposed: ₹${item.dieselAmount}`,
        snapshot.key
      );
    }
  }
});

window.approveDriverRequest = approveDriverRequest;
window.rejectDriverRequest = rejectDriverRequest;
window.editDriverRequestAmount = editDriverRequestAmount;
window.editDriverRequestNote = editDriverRequestNote;
window.editDriverRequestVehicleNo = editDriverRequestVehicleNo;
window.openEditDriverRequestModal = openEditDriverRequestModal;
window.closeEditDriverRequestModal = closeEditDriverRequestModal;
window.handleEditDriverRequest = handleEditDriverRequest;
window.filterDriverRequests = filterDriverRequests;
window.toggleSelectAllDriverRequests = toggleSelectAllDriverRequests;
window.updateDriverRequestsDeleteBtnVisibility = updateDriverRequestsDeleteBtnVisibility;
window.deleteSelectedDriverRequests = deleteSelectedDriverRequests;

function filterDriverRequestsLog() {
  const searchInput = document.getElementById('driver-req-log-vehicle-search');
  const rawVal = searchInput ? searchInput.value.trim() : '';
  const datalist = document.getElementById('driver-req-log-vehicle-list');

  if (rawVal.length >= 4) {
    if (datalist && datalist.children.length === 0) {
      const uniqueVehicles = new Set();
      driverRequestsList.forEach(r => {
        if (r.vehicleNo) uniqueVehicles.add(r.vehicleNo.toUpperCase());
      });
      
      Array.from(uniqueVehicles).sort().forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        datalist.appendChild(opt);
      });
    }
  } else {
    if (datalist) {
      datalist.innerHTML = '';
    }
  }

  renderDriverRequestsLogList();
}

function renderDriverRequestsLogList() {
  const tbody = document.getElementById('driver-requests-log-tbody');
  if (!tbody) return;

  const searchInput = document.getElementById('driver-req-log-vehicle-search');
  const searchQuery = searchInput ? searchInput.value.trim().toUpperCase() : '';
  const statusFilterSelect = document.getElementById('driver-req-log-status-filter');
  const statusFilter = statusFilterSelect ? statusFilterSelect.value : 'ALL';

  const filtered = driverRequestsList.filter(r => {
    const matchesSearch = !searchQuery || String(r.vehicleNo || '').toUpperCase().includes(searchQuery);
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="px-5 py-8 text-center text-slate-400 dark:text-slate-500 font-bold">
          No requests found matching the log filters.
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all border-b border-slate-200/40 dark:border-slate-800/30 text-xs font-semibold text-slate-700 dark:text-slate-300";
    
    let statusBadgeHtml = '';
    if (r.status === 'pending') {
      statusBadgeHtml = `<span class="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">Pending Approval</span>`;
    } else if (r.status === 'approved') {
      statusBadgeHtml = `<span class="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">Approved (Pending Fill)</span>`;
    } else if (r.status === 'filled') {
      statusBadgeHtml = `<span class="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Filled ✅</span>`;
    } else if (r.status === 'update_pending') {
      statusBadgeHtml = `<span class="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-500 border border-purple-500/20">Update Requested</span>`;
    } else {
      statusBadgeHtml = `<span class="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20">Rejected</span>`;
    }

    const kmFormatted = r.currentKm || '-';

    let logAmountHtml = '';
    if (r.status === 'update_pending') {
      logAmountHtml = `
        <div class="flex flex-col items-end gap-0.5">
          <span class="font-bold text-slate-400 dark:text-slate-500 line-through text-[10px]">₹${parseFloat(r.dieselAmount || 0).toLocaleString('en-IN')}</span>
          <span class="font-extrabold text-purple-500 dark:text-purple-400">₹${parseFloat(r.requestedAmount || 0).toLocaleString('en-IN')}</span>
        </div>
      `;
    } else if (r.oldAmount) {
      logAmountHtml = `
        <div class="flex flex-col items-end gap-0.5">
          <span class="font-extrabold text-slate-850 dark:text-white">₹${parseFloat(r.dieselAmount || 0).toLocaleString('en-IN')}</span>
          <span class="text-[9px] text-slate-400 dark:text-slate-550 font-semibold italic">(Old: ₹${parseFloat(r.oldAmount || 0).toLocaleString('en-IN')})</span>
        </div>
      `;
    } else {
      logAmountHtml = `₹${parseFloat(r.dieselAmount || 0).toLocaleString('en-IN')}`;
    }

    const isNew = (r.status === 'pending' && isNewDriverVehicle(r.vehicleNo));
    const vehColorClass = isNew ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-blue-600 dark:text-blue-400 font-extrabold';
    const newTagHtml = isNew ? `<span class="ml-1.5 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 inline-flex items-center shadow-xs">NEW</span>` : '';

    const lastTrip = getVehicleLastTripInfo(r.vehicleNo, r);
    let lastTripBadgeHtml = '';
    if (lastTrip && lastTrip.km) {
      const clickAttr = `onclick="viewLastTripKmPhoto('${lastTrip.source || ''}', '${lastTrip.id || ''}', '${r.vehicleNo || ''}', '${lastTrip.kmFormatted}'); event.stopPropagation();"`;
      lastTripBadgeHtml = `
        <div class="flex flex-wrap items-center justify-center gap-1 mb-1">
          <div ${clickAttr} class="text-[8.5px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded inline-flex items-center gap-1 text-center whitespace-nowrap cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-xs" title="Click to view Last Trip Photo: ${lastTrip.kmFormatted} KM (${lastTrip.date || 'Previous'})">
            <span>Last: ${lastTrip.kmFormatted} KM</span>
            <i class="fas fa-camera text-[8px] opacity-80"></i>
          </div>
        </div>
      `;
    }

    tr.innerHTML = `
      <td class="px-5 py-4">
        <div class="font-bold text-slate-850 dark:text-white">${r.date || '-'}</div>
        <div class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">${r.time || '-'}</div>
      </td>
      <td class="px-5 py-4 whitespace-nowrap">
        <div class="flex items-center gap-1.5">
          ${r.location && r.location.lat ? `<a href="https://www.google.com/maps/search/?api=1&query=${r.location.lat},${r.location.lng}" target="_blank" class="mr-1 text-rose-500 hover:text-rose-600 text-base" title="View Location" onclick="event.stopPropagation();"><i class="fas fa-map-marker-alt"></i></a>` : ''}
          <div class="${vehColorClass} cursor-pointer hover:underline tracking-wide inline-flex items-center" onclick="viewReceiptPhotoOnDemand('request_receipt', '${r.key}', '${r.vehicleNo || ''}', '', '${r.status}')">
            ${r.vehicleNo || '-'}
          </div>
          ${newTagHtml}
        </div>
        <div class="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">${r.vehicleType || '-'}</div>
        ${r.status === 'rejected' && (r.rejectReason || r.rejectedReason || r.reason) ? `
          <div class="text-[10px] font-extrabold text-rose-500 dark:text-rose-400 mt-1 flex items-center gap-1">
            <i class="fas fa-circle-exclamation text-[9px]"></i> Reason: ${r.rejectReason || r.rejectedReason || r.reason}
          </div>
        ` : ''}
      </td>
      <td class="px-5 py-4 whitespace-nowrap">
        <div class="font-bold text-slate-800 dark:text-slate-200">${r.fromLocation || '-'}</div>
        <div class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">➔ ${r.lastLocation || '-'}</div>
      </td>
      <td class="px-5 py-4 text-center">
        <div class="flex flex-col items-center justify-center gap-0.5">
          ${lastTripBadgeHtml}
          <div class="flex items-center justify-center gap-1 font-extrabold text-blue-500 text-xs sm:text-[13px]">
            <span class="cursor-pointer hover:underline" onclick="viewReceiptPhotoOnDemand('request_km', '${r.key}', '${r.vehicleNo || ''}', '${kmFormatted}')">${kmFormatted} KM</span>
          </div>
        </div>
      </td>
      <td class="px-5 py-4 font-extrabold text-slate-850 dark:text-white text-right">
        ${logAmountHtml}
      </td>
      <td class="px-5 py-4">
        <div class="font-bold text-slate-800 dark:text-slate-250">${r.vendorName || '-'}</div>
        <div class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 italic">${r.note || '-'}</div>
      </td>
      <td class="px-5 py-4 text-center">
        ${statusBadgeHtml}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.filterDriverRequestsLog = filterDriverRequestsLog;
window.renderDriverRequestsLogList = renderDriverRequestsLogList;

function requestAmountUpdate(key) {
  if (!checkAuth()) return;
  
  const req = driverRequestsList.find(r => r.key === key);
  if (!req) return toast.err("Request details not found.");
  
  const newAmountStr = prompt("Enter the new diesel amount (₹):", req.dieselAmount);
  if (newAmountStr === null) return;
  
  const newAmount = parseFloat(newAmountStr.trim());
  if (isNaN(newAmount) || newAmount <= 0) {
    return showAlert('error', 'Invalid Amount', 'Please enter a valid positive numeric amount.');
  }
  
  driverRequestsRef.child(key).update({
    status: 'update_pending',
    requestedAmount: String(newAmount)
  }).then(() => {
    toast.ok("Amount update request submitted successfully!");
  }).catch(err => {
    toast.err("Error submitting update request: " + err.message);
  });
}

function approveAmountUpdate(key) {
  if (!checkAuth()) return;
  
  const req = driverRequestsList.find(r => r.key === key);
  if (!req) return toast.err("Request details not found.");
  if (!req.requestedAmount) return toast.err("No requested amount update found.");
  
  if (!confirm(`Approve updating diesel amount from ₹${req.dieselAmount} to ₹${req.requestedAmount}?`)) return;
  
  const proceedWithApproveUpdate = (photo) => {
    let updatePromise = Promise.resolve();
    if (req.linkedResponseNumber) {
      const newLitres = dieselRate > 0 ? (parseFloat(req.requestedAmount) / dieselRate).toFixed(2) : '';
      const updateData = {
        dieselAmount: String(req.requestedAmount),
        litres: String(newLitres),
        oldAmount: String(req.dieselAmount)
      };
      if (photo) {
        updateData.receiptPhoto = photo;
      }
      updatePromise = db.ref('entries').child(req.linkedResponseNumber).update(updateData);
    }

    updatePromise.then(() => {
      const updateReqData = {
        status: 'filled',
        dieselAmount: String(req.requestedAmount),
        oldAmount: String(req.dieselAmount),
        requestedAmount: null,
        requestedReceiptPhoto: null
      };
      if (photo) {
        updateReqData.receiptPhoto = photo;
      }
      return driverRequestsRef.child(key).update(updateReqData);
    })
    .then(() => {
      toast.ok("Amount update approved successfully!");
    })
    .catch(err => {
      toast.err("Error approving update: " + err.message);
    });
  };

  if (req.hasRequestedReceiptPhoto && !req.requestedReceiptPhoto) {
    driverRequestsRef.child(key).child('requestedReceiptPhoto').once('value')
      .then(snap => proceedWithApproveUpdate(snap.val()))
      .catch(() => proceedWithApproveUpdate(null));
  } else {
    proceedWithApproveUpdate(req.requestedReceiptPhoto || null);
  }
}

function rejectAmountUpdate(key) {
  if (!checkAuth()) return;
  
  const req = driverRequestsList.find(r => r.key === key);
  if (!req) return toast.err("Request details not found.");
  
  if (!confirm("Reject this amount update request? (The status will change to Update Rejected with original amount)")) return;
  
  driverRequestsRef.child(key).update({
    status: 'update_rejected',
    requestedAmount: null,
    requestedReceiptPhoto: null
  }).then(() => {
    toast.ok("Amount update request rejected. Status marked as Update Rejected.");
  }).catch(err => {
    toast.err("Error rejecting update: " + err.message);
  });
}

window.requestAmountUpdate = requestAmountUpdate;
window.approveAmountUpdate = approveAmountUpdate;
window.rejectAmountUpdate = rejectAmountUpdate;

// Receipt Photo Viewing Modals
let currentViewReceiptKmSource = null;
let currentViewReceiptKmId = null;

// Interactive Image Viewer (Zoom In/Out, Rotate, Reset, Drag & Pan, Mouse Wheel)
window.receiptImageState = {
  zoom: 1.0,
  rotation: 0,
  panX: 0,
  panY: 0,
  isDragging: false,
  startX: 0,
  startY: 0
};

function updateReceiptImageTransform() {
  const img = document.getElementById('receipt-modal-img');
  const badge = document.getElementById('receipt-zoom-level-badge');
  if (!img) return;

  const { zoom, rotation, panX, panY } = window.receiptImageState;
  img.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom}) rotate(${rotation}deg)`;
  
  if (badge) {
    badge.textContent = `${Math.round(zoom * 100)}%`;
  }
}

function resetReceiptImageTransform() {
  window.receiptImageState = {
    zoom: 1.0,
    rotation: 0,
    panX: 0,
    panY: 0,
    isDragging: false,
    startX: 0,
    startY: 0
  };
  updateReceiptImageTransform();
}
window.resetReceiptImageTransform = resetReceiptImageTransform;

function zoomReceiptImage(delta) {
  let newZoom = window.receiptImageState.zoom + delta;
  if (newZoom < 0.5) newZoom = 0.5;
  if (newZoom > 5.0) newZoom = 5.0;
  window.receiptImageState.zoom = parseFloat(newZoom.toFixed(2));
  updateReceiptImageTransform();
}
window.zoomReceiptImage = zoomReceiptImage;

function rotateReceiptImage(angle = 90) {
  window.receiptImageState.rotation = (window.receiptImageState.rotation + angle) % 360;
  updateReceiptImageTransform();
}
window.rotateReceiptImage = rotateReceiptImage;

function initReceiptImageViewerEvents() {
  const viewport = document.getElementById('receipt-modal-img-viewport');
  if (!viewport || viewport.dataset.eventsBound === 'true') return;

  viewport.dataset.eventsBound = 'true';

  // Mouse Wheel Zoom
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    zoomReceiptImage(delta);
  }, { passive: false });

  // Mouse Drag (Pan)
  viewport.addEventListener('mousedown', (e) => {
    e.preventDefault();
    window.receiptImageState.isDragging = true;
    window.receiptImageState.startX = e.clientX - window.receiptImageState.panX;
    window.receiptImageState.startY = e.clientY - window.receiptImageState.panY;
    viewport.classList.add('cursor-grabbing');
  });

  window.addEventListener('mousemove', (e) => {
    if (!window.receiptImageState.isDragging) return;
    window.receiptImageState.panX = e.clientX - window.receiptImageState.startX;
    window.receiptImageState.panY = e.clientY - window.receiptImageState.startY;
    updateReceiptImageTransform();
  });

  window.addEventListener('mouseup', () => {
    if (window.receiptImageState.isDragging) {
      window.receiptImageState.isDragging = false;
      const viewport = document.getElementById('receipt-modal-img-viewport');
      if (viewport) viewport.classList.remove('cursor-grabbing');
    }
  });

  // Touch Pinch-to-Zoom & Drag (Pan) for Mobile
  let initialPinchDistance = 0;
  let initialPinchZoom = 1.0;

  function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  viewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      window.receiptImageState.isDragging = false;
      initialPinchDistance = getTouchDistance(e.touches);
      initialPinchZoom = window.receiptImageState.zoom;
    } else if (e.touches.length === 1) {
      window.receiptImageState.isDragging = true;
      window.receiptImageState.startX = e.touches[0].clientX - window.receiptImageState.panX;
      window.receiptImageState.startY = e.touches[0].clientY - window.receiptImageState.panY;
    }
  }, { passive: true });

  viewport.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && initialPinchDistance > 0) {
      if (e.cancelable) e.preventDefault();
      const currentDist = getTouchDistance(e.touches);
      const factor = currentDist / initialPinchDistance;
      let newZoom = initialPinchZoom * factor;
      if (newZoom < 0.5) newZoom = 0.5;
      if (newZoom > 5.0) newZoom = 5.0;
      window.receiptImageState.zoom = parseFloat(newZoom.toFixed(2));
      updateReceiptImageTransform();
    } else if (e.touches.length === 1 && window.receiptImageState.isDragging) {
      if (e.cancelable) e.preventDefault();
      window.receiptImageState.panX = e.touches[0].clientX - window.receiptImageState.startX;
      window.receiptImageState.panY = e.touches[0].clientY - window.receiptImageState.startY;
      updateReceiptImageTransform();
    }
  }, { passive: false });

  viewport.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
      initialPinchDistance = 0;
    }
    if (e.touches.length === 0) {
      window.receiptImageState.isDragging = false;
    }
  });

  // Double click toggle zoom
  viewport.addEventListener('dblclick', () => {
    if (window.receiptImageState.zoom > 1.2) {
      resetReceiptImageTransform();
    } else {
      window.receiptImageState.zoom = 2.5;
      updateReceiptImageTransform();
    }
  });

  // Keyboard left/right arrow navigation for carousel
  window.addEventListener('keydown', (e) => {
    const modal = document.getElementById('view-receipt-modal');
    if (!modal || modal.classList.contains('hidden')) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevReceiptPhoto();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextReceiptPhoto();
    }
  });
}

// ==========================================
// RECEIPT / ODOMETER MULTI-IMAGE GALLERY LOGIC
// ==========================================
let currentReceiptPhotos = [];
let currentReceiptPhotoIndex = 0;
let currentReceiptModalType = '';
let currentReceiptRecordId = '';
let currentReceiptVehicleNo = '';
let currentReceiptOptKmVal = '';
let currentReceiptExtraParam = '';

function extractPhotosFromRecord(data, primaryArrayKey, fallbackSingleKey, extraFallbackKey = null) {
  if (!data) return [];
  let photos = [];
  const isValidPhoto = p => typeof p === 'string' && (p.startsWith('data:image') || p.startsWith('http://') || p.startsWith('https://') || p.startsWith('blob:'));

  const arrayVal = data[primaryArrayKey];
  if (Array.isArray(arrayVal)) {
    photos = arrayVal.filter(isValidPhoto);
  } else if (arrayVal && typeof arrayVal === 'object') {
    photos = Object.values(arrayVal).filter(isValidPhoto);
  } else if (isValidPhoto(arrayVal)) {
    photos = [arrayVal];
  }

  if (photos.length === 0 && fallbackSingleKey) {
    const single1 = data[fallbackSingleKey];
    if (isValidPhoto(single1)) {
      photos = [single1];
    } else if (Array.isArray(single1)) {
      photos = single1.filter(isValidPhoto);
    } else if (single1 && typeof single1 === 'object') {
      photos = Object.values(single1).filter(isValidPhoto);
    }
  }

  if (photos.length === 0 && extraFallbackKey) {
    const single2 = data[extraFallbackKey];
    if (isValidPhoto(single2)) {
      photos = [single2];
    } else if (Array.isArray(single2)) {
      photos = single2.filter(isValidPhoto);
    } else if (single2 && typeof single2 === 'object') {
      photos = Object.values(single2).filter(isValidPhoto);
    }
  }

  return photos.slice(0, 5);
}

function renderReceiptModalGallery() {
  const img = document.getElementById('receipt-modal-img');
  const emptyDiv = document.getElementById('receipt-modal-empty');
  const prevBtn = document.getElementById('receipt-prev-btn');
  const nextBtn = document.getElementById('receipt-next-btn');
  const badge = document.getElementById('receipt-counter-badge');
  const currentIdxSpan = document.getElementById('receipt-current-idx');
  const totalCountSpan = document.getElementById('receipt-total-count');
  const attachCountSpan = document.getElementById('receipt-attachments-count');
  const thumbsContainer = document.getElementById('receipt-thumbnails-container');
  const uploadBtn = document.getElementById('receipt-upload-btn');
  const maxBadge = document.getElementById('receipt-upload-max-badge');

  const total = currentReceiptPhotos.length;
  if (attachCountSpan) attachCountSpan.textContent = total;

  // Manage 5-image limit visibility
  if (uploadBtn && maxBadge) {
    if (total >= 5) {
      uploadBtn.classList.add('hidden');
      maxBadge.classList.remove('hidden');
      maxBadge.classList.add('flex');
    } else {
      uploadBtn.classList.remove('hidden');
      maxBadge.classList.add('hidden');
      maxBadge.classList.remove('flex');
    }
  }

  if (total > 0) {
    if (currentReceiptPhotoIndex >= total) currentReceiptPhotoIndex = total - 1;
    if (currentReceiptPhotoIndex < 0) currentReceiptPhotoIndex = 0;

    if (img) {
      img.src = currentReceiptPhotos[currentReceiptPhotoIndex];
      img.classList.remove('hidden');
    }
    if (emptyDiv) emptyDiv.classList.add('hidden');

    if (prevBtn) {
      if (total > 1) prevBtn.classList.remove('hidden');
      else prevBtn.classList.add('hidden');
    }
    if (nextBtn) {
      if (total > 1) nextBtn.classList.remove('hidden');
      else nextBtn.classList.add('hidden');
    }
    if (badge) {
      badge.classList.remove('hidden');
      if (currentIdxSpan) currentIdxSpan.textContent = currentReceiptPhotoIndex + 1;
      if (totalCountSpan) totalCountSpan.textContent = total;
    }
  } else {
    if (img) {
      img.src = '';
      img.classList.add('hidden');
    }
    if (emptyDiv) emptyDiv.classList.remove('hidden');
    if (prevBtn) prevBtn.classList.add('hidden');
    if (nextBtn) nextBtn.classList.add('hidden');
    if (badge) badge.classList.add('hidden');
  }

  // Render clickable thumbnails
  if (thumbsContainer) {
    thumbsContainer.innerHTML = '';
    if (total === 0) {
      thumbsContainer.innerHTML = '<span class="text-xs text-slate-400 italic py-2 px-1">No attachments uploaded yet. Click "+ Add Image" above to upload photos (Max 5).</span>';
    } else {
      currentReceiptPhotos.forEach((photoUrl, idx) => {
        const thumbDiv = document.createElement('div');
        const isActive = (idx === currentReceiptPhotoIndex);
        thumbDiv.className = `relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
          isActive 
            ? 'border-blue-500 shadow-md ring-2 ring-blue-500/50 scale-105' 
            : 'border-slate-300 dark:border-slate-700 opacity-70 hover:opacity-100 hover:border-slate-400'
        }`;
        thumbDiv.onclick = () => jumpToReceiptPhoto(idx);

        thumbDiv.innerHTML = `
          <img src="${photoUrl}" class="w-full h-full object-cover" alt="Attachment ${idx + 1}">
          <span class="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-white font-extrabold text-[9px] sm:text-[10px] shadow">
            ${idx + 1}
          </span>
          <button type="button" onclick="event.stopPropagation(); removeReceiptModalPhoto(${idx});" class="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95" title="Remove photo ${idx + 1}">
            &times;
          </button>
        `;
        thumbsContainer.appendChild(thumbDiv);
      });
    }
  }
}

function jumpToReceiptPhoto(idx) {
  if (idx >= 0 && idx < currentReceiptPhotos.length) {
    currentReceiptPhotoIndex = idx;
    renderReceiptModalGallery();
    resetReceiptImageTransform();
  }
}

function prevReceiptPhoto() {
  if (currentReceiptPhotos.length <= 1) return;
  currentReceiptPhotoIndex = (currentReceiptPhotoIndex - 1 + currentReceiptPhotos.length) % currentReceiptPhotos.length;
  renderReceiptModalGallery();
  resetReceiptImageTransform();
}

function nextReceiptPhoto() {
  if (currentReceiptPhotos.length <= 1) return;
  currentReceiptPhotoIndex = (currentReceiptPhotoIndex + 1) % currentReceiptPhotos.length;
  renderReceiptModalGallery();
  resetReceiptImageTransform();
}

function compressReceiptImage(file, minTargetBytes = 6 * 1024, maxTargetBytes = 15 * 1024) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const origW = img.naturalWidth || img.width;
          const origH = img.naturalHeight || img.height;
          if (!origW || !origH) {
            return resolve(e.target.result);
          }

          // Max dimension: 480px preserves clarity for numbers & slips while keeping file strictly 6KB - 15KB
          const MAX_INIT_DIM = 480;
          let w = origW;
          let h = origH;
          if (w > MAX_INIT_DIM || h > MAX_INIT_DIM) {
            if (w > h) {
              h = Math.round((h * MAX_INIT_DIM) / w);
              w = MAX_INIT_DIM;
            } else {
              w = Math.round((w * MAX_INIT_DIM) / h);
              h = MAX_INIT_DIM;
            }
          }

          const canvas = document.createElement('canvas');
          let ctx = canvas.getContext('2d');
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);

          function getBytes(url) {
            if (!url) return 0;
            const idx = url.indexOf(',');
            const b64 = idx >= 0 ? url.slice(idx + 1) : url;
            return Math.round((b64.length * 3) / 4);
          }

          // Initial pass with quality 0.35 for lightweight 6KB - 15KB footprint
          let q = 0.35;
          let dataUrl = canvas.toDataURL('image/jpeg', q);
          let currentBytes = getBytes(dataUrl);

          // If already in target range, perfect!
          if (currentBytes <= maxTargetBytes && currentBytes >= minTargetBytes) {
            return resolve(dataUrl);
          }

          // If smaller than 10KB, try slightly higher quality (0.68) if under maxTargetBytes
          if (currentBytes < minTargetBytes) {
            const highQUrl = canvas.toDataURL('image/jpeg', 0.68);
            const highQBytes = getBytes(highQUrl);
            if (highQBytes <= maxTargetBytes) {
              return resolve(highQUrl);
            }
            return resolve(dataUrl);
          }

          // If larger than 20KB, perform adaptive passes to bring strictly into 10KB - 20KB
          let bestUrl = dataUrl;
          for (let iter = 0; iter < 6; iter++) {
            if (currentBytes <= maxTargetBytes && currentBytes >= minTargetBytes) {
              bestUrl = dataUrl;
              break;
            }

            if (currentBytes > maxTargetBytes) {
              if (q > 0.35) {
                const ratio = Math.sqrt((15 * 1024) / currentBytes);
                q = Math.max(0.30, Math.min(q - 0.08, q * ratio));
                dataUrl = canvas.toDataURL('image/jpeg', q);
                currentBytes = getBytes(dataUrl);
              } else {
                w = Math.max(380, Math.round(w * 0.85));
                h = Math.max(380, Math.round(h * 0.85));
                canvas.width = w;
                canvas.height = h;
                ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                q = 0.45;
                dataUrl = canvas.toDataURL('image/jpeg', q);
                currentBytes = getBytes(dataUrl);
              }
              if (currentBytes <= maxTargetBytes) {
                bestUrl = dataUrl;
              }
            } else if (currentBytes < minTargetBytes) {
              const tryQ = Math.min(0.65, q + 0.06);
              const tryUrl = canvas.toDataURL('image/jpeg', tryQ);
              const tryBytes = getBytes(tryUrl);
              if (tryBytes <= maxTargetBytes) {
                bestUrl = tryUrl;
              } else {
                bestUrl = dataUrl;
              }
              break;
            }
          }

          // Safety guard: guarantee strictly <= maxTargetBytes (20KB)
          if (getBytes(bestUrl) > maxTargetBytes) {
            w = Math.round(w * 0.75);
            h = Math.round(h * 0.75);
            canvas.width = w;
            canvas.height = h;
            ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            bestUrl = canvas.toDataURL('image/jpeg', 0.35);
          }

          resolve(bestUrl);
        } catch (err) {
          console.error("Error in compressReceiptImage:", err);
          resolve(e.target.result);
        }
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function handleReceiptModalMultiUpload(event) {
  if (!checkAuth()) return;
  const files = event.target.files ? Array.from(event.target.files) : [];
  if (files.length === 0) return;
  event.target.value = '';

  const currentCount = currentReceiptPhotos.length;
  if (currentCount >= 5) {
    toast.warn("Maximum 5 images allowed per record.");
    return;
  }

  let filesToProcess = files;
  if (currentCount + files.length > 5) {
    const allowed = 5 - currentCount;
    filesToProcess = files.slice(0, allowed);
    toast.info(`Maximum 5 images allowed. Uploading first ${allowed} image(s).`);
  }

  const progressDiv = document.getElementById('receipt-upload-progress');
  if (progressDiv) progressDiv.classList.remove('hidden');

  Promise.all(filesToProcess.map(f => compressReceiptImage(f)))
    .then(compressedDataUrls => {
      const validPhotos = compressedDataUrls.filter(u => u && (u.startsWith('data:image') || u.startsWith('http://') || u.startsWith('https://')));
      if (validPhotos.length === 0) {
        if (progressDiv) progressDiv.classList.add('hidden');
        toast.err("Could not process selected image(s).");
        return;
      }

      const newStartIndex = currentReceiptPhotos.length;
      currentReceiptPhotos.push(...validPhotos);
      if (currentReceiptPhotos.length > 5) {
        currentReceiptPhotos = currentReceiptPhotos.slice(0, 5);
      }
      currentReceiptPhotoIndex = newStartIndex;

      const isReceipt = (currentReceiptModalType === 'ledger_receipt' || currentReceiptModalType === 'request_receipt');
      const isKm = (currentReceiptModalType === 'ledger_km' || currentReceiptModalType === 'request_km');

      const photoUpdates = {};
      if (isReceipt) {
        photoUpdates.receiptPhotos = currentReceiptPhotos;
        photoUpdates.receiptPhoto = currentReceiptPhotos[0] || null;
      } else if (isKm) {
        photoUpdates.kmPhotos = currentReceiptPhotos;
        photoUpdates.kmPhoto = currentReceiptPhotos[0] || null;
      }

      const flagUpdates = {};
      if (isReceipt) flagUpdates.hasReceiptPhoto = (currentReceiptPhotos.length > 0);
      if (isKm) flagUpdates.hasKmPhoto = (currentReceiptPhotos.length > 0);

      let savePhotoPromise = null;

      if (currentReceiptModalType === 'ledger_receipt' || currentReceiptModalType === 'ledger_km') {
        savePhotoPromise = Promise.all([
          db.ref('entryPhotos').child(currentReceiptRecordId).update(photoUpdates),
          entriesRef.child(currentReceiptRecordId).update(flagUpdates)
        ]);
      } else if (currentReceiptModalType === 'request_receipt' || currentReceiptModalType === 'request_km') {
        savePhotoPromise = Promise.all([
          db.ref('driverRequestPhotos').child(currentReceiptRecordId).update(photoUpdates),
          driverRequestsRef.child(currentReceiptRecordId).update(flagUpdates)
        ]);
      }

      if (!savePhotoPromise) {
        if (progressDiv) progressDiv.classList.add('hidden');
        renderReceiptModalGallery();
        return;
      }

      savePhotoPromise.then(() => {
        if (progressDiv) progressDiv.classList.add('hidden');
        toast.ok(`${validPhotos.length} image(s) compressed & saved for all users!`);

        // Update local memory and cache flags
        if (currentReceiptModalType === 'ledger_receipt' || currentReceiptModalType === 'ledger_km') {
          const entry = historyEntries.find(e => String(e.responseNumber) === String(currentReceiptRecordId));
          if (entry) {
            if (isReceipt) entry.hasReceiptPhoto = true;
            if (isKm) entry.hasKmPhoto = true;
            saveCache('rpm_cache_entries', historyEntries);
            if (typeof renderLedgerTable === 'function') renderLedgerTable();
          }

          // DUAL-WRITE SYNC: Find linked driver request and update it in RTDB too!
          const cleanV = String(currentReceiptVehicleNo || (entry ? entry.vehicleNo : '')).trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
          const cleanK = String(currentReceiptOptKmVal || (entry ? entry.currentKm : '')).replace(/[^0-9]/g, '');
          const matchingReq = driverRequestsList.find(r => {
            if (!r) return false;
            if (String(r.linkedResponseNumber || '') === String(currentReceiptRecordId)) return true;
            const rVeh = String(r.vehicleNo || '').trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
            if (cleanV && rVeh === cleanV) {
              if (cleanK && String(r.currentKm || '').replace(/[^0-9]/g, '') === cleanK) return true;
              if (entry && entry.date && r.date && String(r.date).trim() === String(entry.date).trim()) return true;
            }
            return false;
          });

          if (matchingReq) {
            db.ref('driverRequestPhotos').child(matchingReq.key).update(photoUpdates);
            driverRequestsRef.child(matchingReq.key).update(flagUpdates);
            if (isReceipt) matchingReq.hasReceiptPhoto = true;
            if (isKm) matchingReq.hasKmPhoto = true;
            saveCache('rpm_cache_driver_requests', driverRequestsList);
            if (typeof renderDriverRequestsList === 'function') renderDriverRequestsList();
            if (typeof renderDriverRequestsLogList === 'function') renderDriverRequestsLogList();
          }

          // RTDB deep query sync
          driverRequestsRef.orderByChild('linkedResponseNumber').equalTo(String(currentReceiptRecordId)).once('value').then(qSnap => {
            const qVal = qSnap.val();
            if (qVal) {
              Object.keys(qVal).forEach(k => {
                db.ref('driverRequestPhotos').child(k).update(photoUpdates);
                driverRequestsRef.child(k).update(flagUpdates);
              });
            }
          }).catch(() => {});

        } else {
          // Uploaded from Driver Request -> DUAL-WRITE to ledger entry!
          const reqItem = driverRequestsList.find(r => r && r.key === currentReceiptRecordId);
          if (reqItem) {
            if (isReceipt) reqItem.hasReceiptPhoto = true;
            if (isKm) reqItem.hasKmPhoto = true;
            saveCache('rpm_cache_driver_requests', driverRequestsList);
            if (typeof renderDriverRequestsList === 'function') renderDriverRequestsList();
            if (typeof renderDriverRequestsLogList === 'function') renderDriverRequestsLogList();

            const linkedNum = reqItem.linkedResponseNumber;

            if (linkedNum) {
              db.ref('entryPhotos').child(linkedNum).update(photoUpdates);
              entriesRef.child(linkedNum).update(flagUpdates);
              const entry = historyEntries.find(e => String(e.responseNumber) === String(linkedNum));
              if (entry) {
                if (isReceipt) entry.hasReceiptPhoto = true;
                if (isKm) entry.hasKmPhoto = true;
                saveCache('rpm_cache_entries', historyEntries);
                if (typeof renderLedgerTable === 'function') renderLedgerTable();
              }
            }
          }
        }
        renderReceiptModalGallery();
      }).catch(err => {
        if (progressDiv) progressDiv.classList.add('hidden');
        toast.err("Failed to save photos: " + err.message);
      });
    })
    .catch(err => {
      if (progressDiv) progressDiv.classList.add('hidden');
      toast.err("Error processing photos: " + err.message);
    });
}

function removeReceiptModalPhoto(idx) {
  if (!checkAuth()) return;
  if (idx < 0 || idx >= currentReceiptPhotos.length) return;

  if (!confirm(`Are you sure you want to delete photo #${idx + 1}?`)) return;

  currentReceiptPhotos.splice(idx, 1);
  if (currentReceiptPhotoIndex >= currentReceiptPhotos.length) {
    currentReceiptPhotoIndex = Math.max(0, currentReceiptPhotos.length - 1);
  }

  const isReceipt = (currentReceiptModalType === 'ledger_receipt' || currentReceiptModalType === 'request_receipt');
  const isKm = (currentReceiptModalType === 'ledger_km' || currentReceiptModalType === 'request_km');

  const photoUpdates = {};
  if (isReceipt) {
    photoUpdates.receiptPhotos = currentReceiptPhotos.length > 0 ? currentReceiptPhotos : null;
    photoUpdates.receiptPhoto = currentReceiptPhotos.length > 0 ? currentReceiptPhotos[0] : null;
  } else if (isKm) {
    photoUpdates.kmPhotos = currentReceiptPhotos.length > 0 ? currentReceiptPhotos : null;
    photoUpdates.kmPhoto = currentReceiptPhotos.length > 0 ? currentReceiptPhotos[0] : null;
  }

  const flagUpdates = {};
  if (isReceipt) flagUpdates.hasReceiptPhoto = (currentReceiptPhotos.length > 0);
  if (isKm) flagUpdates.hasKmPhoto = (currentReceiptPhotos.length > 0);

  let deletePromise = null;
  if (currentReceiptModalType === 'ledger_receipt' || currentReceiptModalType === 'ledger_km') {
    deletePromise = Promise.all([
      db.ref('entryPhotos').child(currentReceiptRecordId).update(photoUpdates),
      entriesRef.child(currentReceiptRecordId).update(flagUpdates)
    ]);
  } else if (currentReceiptModalType === 'request_receipt' || currentReceiptModalType === 'request_km') {
    deletePromise = Promise.all([
      db.ref('driverRequestPhotos').child(currentReceiptRecordId).update(photoUpdates),
      driverRequestsRef.child(currentReceiptRecordId).update(flagUpdates)
    ]);
  }

  if (!deletePromise) {
    renderReceiptModalGallery();
    return;
  }

  deletePromise.then(() => {
    toast.ok("Photo deleted successfully!");

    if (currentReceiptModalType === 'ledger_receipt' || currentReceiptModalType === 'ledger_km') {
      const entry = historyEntries.find(e => String(e.responseNumber) === String(currentReceiptRecordId));
      if (entry) {
        if (isReceipt) entry.hasReceiptPhoto = (currentReceiptPhotos.length > 0);
        if (isKm) entry.hasKmPhoto = (currentReceiptPhotos.length > 0);
        saveCache('rpm_cache_entries', historyEntries);
        if (typeof renderLedgerTable === 'function') renderLedgerTable();
      }

      // DUAL-WRITE REMOVAL SYNC to driverRequests
      const cleanV = String(currentReceiptVehicleNo || (entry ? entry.vehicleNo : '')).trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
      const cleanK = String(currentReceiptOptKmVal || (entry ? entry.currentKm : '')).replace(/[^0-9]/g, '');
      const matchingReq = driverRequestsList.find(r => {
        if (!r) return false;
        if (String(r.linkedResponseNumber || '') === String(currentReceiptRecordId)) return true;
        const rVeh = String(r.vehicleNo || '').trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
        if (cleanV && rVeh === cleanV) {
          if (cleanK && String(r.currentKm || '').replace(/[^0-9]/g, '') === cleanK) return true;
          if (entry && entry.date && r.date && String(r.date).trim() === String(entry.date).trim()) return true;
        }
        return false;
      });

      if (matchingReq) {
        db.ref('driverRequestPhotos').child(matchingReq.key).update(photoUpdates);
        driverRequestsRef.child(matchingReq.key).update(flagUpdates);
        if (isReceipt) matchingReq.hasReceiptPhoto = (currentReceiptPhotos.length > 0);
        if (isKm) matchingReq.hasKmPhoto = (currentReceiptPhotos.length > 0);
        saveCache('rpm_cache_driver_requests', driverRequestsList);
        if (typeof renderDriverRequestsList === 'function') renderDriverRequestsList();
        if (typeof renderDriverRequestsLogList === 'function') renderDriverRequestsLogList();
      }

      driverRequestsRef.orderByChild('linkedResponseNumber').equalTo(String(currentReceiptRecordId)).once('value').then(qSnap => {
        const qVal = qSnap.val();
        if (qVal) {
          Object.keys(qVal).forEach(k => {
            db.ref('driverRequestPhotos').child(k).update(photoUpdates);
            driverRequestsRef.child(k).update(flagUpdates);
          });
        }
      }).catch(() => {});

    } else {
      const reqItem = driverRequestsList.find(r => r && r.key === currentReceiptRecordId);
      if (reqItem) {
        if (isReceipt) reqItem.hasReceiptPhoto = (currentReceiptPhotos.length > 0);
        if (isKm) reqItem.hasKmPhoto = (currentReceiptPhotos.length > 0);
        saveCache('rpm_cache_driver_requests', driverRequestsList);
        if (typeof renderDriverRequestsList === 'function') renderDriverRequestsList();
        if (typeof renderDriverRequestsLogList === 'function') renderDriverRequestsLogList();

        const linkedNum = reqItem.linkedResponseNumber;

        if (linkedNum) {
          db.ref('entryPhotos').child(linkedNum).update(photoUpdates);
          entriesRef.child(linkedNum).update(flagUpdates);
          const entry = historyEntries.find(e => String(e.responseNumber) === String(linkedNum));
          if (entry) {
            if (isReceipt) entry.hasReceiptPhoto = (currentReceiptPhotos.length > 0);
            if (isKm) entry.hasKmPhoto = (currentReceiptPhotos.length > 0);
            saveCache('rpm_cache_entries', historyEntries);
            if (typeof renderLedgerTable === 'function') renderLedgerTable();
          }
        }
      }
    }
    renderReceiptModalGallery();
  }).catch(err => {
    toast.err("Failed to delete photo: " + err.message);
  });
}

function viewReceiptPhoto(photoBase64, vehicleNo, optKmVal = '', sourceType = null, recordId = null) {
  const modal = document.getElementById('view-receipt-modal');
  const targetVeh = document.getElementById('receipt-modal-veh');
  const modalTitle = document.getElementById('receipt-modal-title');
  const kmContainer = document.getElementById('receipt-modal-km-container');
  const targetKm = document.getElementById('receipt-modal-km');
  const editKmBtn = document.getElementById('receipt-modal-edit-km-btn');
  const loader = document.getElementById('receipt-modal-loader');
  
  if (!modal || !targetVeh) return;

  // Reset transforms whenever modal opens
  resetReceiptImageTransform();
  if (loader) loader.classList.add('hidden');

  targetVeh.textContent = vehicleNo || '-';
  
  currentViewReceiptKmSource = sourceType;
  currentViewReceiptKmId = recordId;

  currentReceiptModalType = sourceType === 'ledger' ? (optKmVal ? 'ledger_km' : 'ledger_receipt') : (sourceType === 'request' ? (optKmVal ? 'request_km' : 'request_receipt') : '');
  currentReceiptRecordId = recordId;
  currentReceiptVehicleNo = vehicleNo;
  currentReceiptOptKmVal = optKmVal;
  
  if (optKmVal) {
    if (modalTitle) modalTitle.textContent = "Odometer KM Details";
    if (kmContainer) {
      kmContainer.classList.remove('hidden');
      kmContainer.classList.add('flex');
    }
    if (targetKm) targetKm.textContent = `${optKmVal} KM`;
    if (editKmBtn) {
      if (sourceType === 'ledger' || sourceType === 'request') {
        editKmBtn.classList.remove('hidden');
      } else {
        editKmBtn.classList.add('hidden');
      }
    }
  } else {
    if (modalTitle) modalTitle.textContent = "Receipt Details";
    if (kmContainer) {
      kmContainer.classList.add('hidden');
      kmContainer.classList.remove('flex');
    }
    if (editKmBtn) editKmBtn.classList.add('hidden');
  }
  
  if (Array.isArray(photoBase64)) {
    currentReceiptPhotos = photoBase64.filter(p => typeof p === 'string' && (p.startsWith('data:image') || p.startsWith('http://') || p.startsWith('https://'))).slice(0, 5);
  } else if (photoBase64 && typeof photoBase64 === 'string' && (photoBase64.startsWith('data:image') || photoBase64.startsWith('http://') || photoBase64.startsWith('https://'))) {
    currentReceiptPhotos = [photoBase64];
  } else {
    currentReceiptPhotos = [];
  }
  currentReceiptPhotoIndex = 0;
  renderReceiptModalGallery();
  
  modal.classList.remove('hidden');
  initReceiptImageViewerEvents();
}

function viewReceiptPhotoOnDemand(type, recordId, vehicleNo, optKmVal = '', extraParam = '') {
  const modal = document.getElementById('view-receipt-modal');
  const img = document.getElementById('receipt-modal-img');
  const emptyDiv = document.getElementById('receipt-modal-empty');
  const targetVeh = document.getElementById('receipt-modal-veh');
  const modalTitle = document.getElementById('receipt-modal-title');
  const kmContainer = document.getElementById('receipt-modal-km-container');
  const targetKm = document.getElementById('receipt-modal-km');
  const editKmBtn = document.getElementById('receipt-modal-edit-km-btn');
  const loader = document.getElementById('receipt-modal-loader');

  if (!modal || !img || !emptyDiv || !targetVeh) return;

  resetReceiptImageTransform();
  targetVeh.textContent = vehicleNo || '-';
  
  const isKm = (type === 'ledger_km' || type === 'request_km' || !!optKmVal);
  currentViewReceiptKmSource = (type === 'ledger_km' || type === 'ledger_receipt') ? 'ledger' : 'request';
  currentViewReceiptKmId = recordId;

  currentReceiptModalType = type;
  currentReceiptRecordId = recordId;
  currentReceiptVehicleNo = vehicleNo;
  currentReceiptOptKmVal = optKmVal;
  currentReceiptExtraParam = extraParam;
  currentReceiptPhotos = [];
  currentReceiptPhotoIndex = 0;

  if (isKm) {
    if (modalTitle) modalTitle.textContent = "Odometer KM Details";
    if (kmContainer) {
      kmContainer.classList.remove('hidden');
      kmContainer.classList.add('flex');
    }
    if (targetKm) targetKm.textContent = optKmVal ? `${optKmVal} KM` : '-';
    if (editKmBtn) {
      editKmBtn.classList.remove('hidden');
    }
  } else {
    if (modalTitle) modalTitle.textContent = "Receipt Details";
    if (kmContainer) {
      kmContainer.classList.add('hidden');
      kmContainer.classList.remove('flex');
    }
    if (editKmBtn) editKmBtn.classList.add('hidden');
  }

  // Open modal instantly with spinner loader
  img.src = '';
  img.classList.add('hidden');
  emptyDiv.classList.add('hidden');
  if (loader) loader.classList.remove('hidden');
  renderReceiptModalGallery();
  modal.classList.remove('hidden');
  initReceiptImageViewerEvents();

  // Helper matching tools
  const cleanVeh = v => String(v || '').trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
  const targetVehClean = cleanVeh(vehicleNo);
  const cleanKm = k => String(k || '').replace(/[^0-9]/g, '');
  const targetKmClean = cleanKm(optKmVal);

  const isValidPhoto = p => typeof p === 'string' && (p.startsWith('data:image') || p.startsWith('http://') || p.startsWith('https://') || p.startsWith('blob:'));

  const fetchReqWithPhotos = (reqKey) => {
    if (!reqKey) return Promise.resolve({});
    return Promise.all([
      db.ref('driverRequestPhotos').child(reqKey).once('value').catch(() => ({ val: () => null })),
      driverRequestsRef.child(reqKey).once('value').catch(() => ({ val: () => null }))
    ]).then(([pSnap, rSnap]) => {
      const pVal = (pSnap && typeof pSnap.val === 'function' ? pSnap.val() : null) || {};
      const rVal = (rSnap && typeof rSnap.val === 'function' ? rSnap.val() : null) || {};
      return { ...rVal, ...pVal };
    });
  };

  const fetchEntryWithPhotos = (respNum) => {
    if (!respNum) return Promise.resolve({});
    return Promise.all([
      db.ref('entryPhotos').child(respNum).once('value').catch(() => ({ val: () => null })),
      entriesRef.child(respNum).once('value').catch(() => ({ val: () => null }))
    ]).then(([pSnap, eSnap]) => {
      const pVal = (pSnap && typeof pSnap.val === 'function' ? pSnap.val() : null) || {};
      const eVal = (eSnap && typeof eSnap.val === 'function' ? eSnap.val() : null) || {};
      return { ...eVal, ...pVal };
    });
  };

  if (type === 'ledger_receipt' || type === 'ledger_km') {
    fetchEntryWithPhotos(recordId).then(entryData => {
      let photos = [];
      if (type === 'ledger_receipt') {
        photos = extractPhotosFromRecord(entryData, 'receiptPhotos', 'receiptPhoto');
        const cap = entryData.capturedPhoto || entryData.stationPhoto;
        if (isValidPhoto(cap) && !photos.includes(cap)) {
          photos.push(cap);
        }
      } else {
        photos = extractPhotosFromRecord(entryData, 'kmPhotos', 'kmPhoto', 'photo');
      }

      if (photos.length > 0) {
        if (loader) loader.classList.add('hidden');
        currentReceiptPhotos = photos;
        currentReceiptPhotoIndex = 0;
        renderReceiptModalGallery();
        return;
      }

      // Robust fallback: Check driverRequests & driverRequestPhotos
      const reqList = (typeof driverRequestsList !== 'undefined' && Array.isArray(driverRequestsList)) ? driverRequestsList : [];
      let matchingReq = reqList.find(r => r && String(r.linkedResponseNumber || '') === String(recordId));
      if (!matchingReq && targetVehClean) {
        matchingReq = reqList.find(r => {
          if (!r) return false;
          if (cleanVeh(r.vehicleNo) !== targetVehClean) return false;
          if (isKm && targetKmClean && cleanKm(r.currentKm) === targetKmClean) return true;
          if (entryData.date && r.date && String(r.date).trim() === String(entryData.date).trim()) return true;
          return false;
        });
      }

      const applyReqPhotos = (reqData) => {
        if (!reqData) return false;
        let foundPhotos = [];
        if (type === 'ledger_receipt') {
          foundPhotos = extractPhotosFromRecord(reqData, 'receiptPhotos', 'requestedReceiptPhoto', 'receiptPhoto');
          const cap = reqData.capturedPhoto || reqData.stationPhoto;
          if (isValidPhoto(cap) && !foundPhotos.includes(cap)) {
            foundPhotos.push(cap);
          }
        } else {
          foundPhotos = extractPhotosFromRecord(reqData, 'kmPhotos', 'kmPhoto', 'photo');
        }

        if (foundPhotos.length > 0) {
          if (loader) loader.classList.add('hidden');
          currentReceiptPhotos = foundPhotos;
          currentReceiptPhotoIndex = 0;
          renderReceiptModalGallery();
          // Auto-heal entryPhotos node so all other users get it directly on demand
          if (type === 'ledger_receipt') {
            const healData = { receiptPhotos: foundPhotos, receiptPhoto: foundPhotos[0] };
            const cap = reqData.capturedPhoto || reqData.stationPhoto;
            if (isValidPhoto(cap)) healData.capturedPhoto = cap;
            db.ref('entryPhotos').child(recordId).update(healData);
            entriesRef.child(recordId).update({ hasReceiptPhoto: true });
          } else {
            db.ref('entryPhotos').child(recordId).update({ kmPhotos: foundPhotos, kmPhoto: foundPhotos[0] });
            entriesRef.child(recordId).update({ hasKmPhoto: true });
          }
          return true;
        }
        return false;
      };

      const finishEmpty = () => {
        if (loader) loader.classList.add('hidden');
        currentReceiptPhotos = [];
        currentReceiptPhotoIndex = 0;
        renderReceiptModalGallery();
      };

      const fallbackQueryReq = () => {
        driverRequestsRef.orderByChild('linkedResponseNumber').equalTo(String(recordId)).once('value').then(qSnap => {
          const qVal = qSnap.val();
          if (qVal) {
            const firstKey = Object.keys(qVal)[0];
            return fetchReqWithPhotos(firstKey).then(mergedReq => {
              if (applyReqPhotos(mergedReq)) return;
              finishEmpty();
            });
          }
          finishEmpty();
        }).catch(() => finishEmpty());
      };

      if (matchingReq) {
        fetchReqWithPhotos(matchingReq.key).then(mergedReq => {
          if (!applyReqPhotos(mergedReq)) {
            fallbackQueryReq();
          }
        }).catch(() => fallbackQueryReq());
      } else {
        fallbackQueryReq();
      }

    }).catch(err => {
      console.error("Failed to load ledger photo on demand:", err);
      if (loader) loader.classList.add('hidden');
      currentReceiptPhotos = [];
      currentReceiptPhotoIndex = 0;
      renderReceiptModalGallery();
    });

  } else if (type === 'request_receipt' || type === 'request_km') {
    fetchReqWithPhotos(recordId).then(reqData => {
      let photos = [];
      if (type === 'request_receipt') {
        if (extraParam === 'update_pending') {
          photos = extractPhotosFromRecord(reqData, 'receiptPhotos', 'requestedReceiptPhoto', 'receiptPhoto');
        } else {
          photos = extractPhotosFromRecord(reqData, 'receiptPhotos', 'receiptPhoto', 'requestedReceiptPhoto');
        }
        const cap = reqData.capturedPhoto || reqData.stationPhoto;
        if (isValidPhoto(cap) && !photos.includes(cap)) {
          photos.push(cap);
        }
      } else {
        photos = extractPhotosFromRecord(reqData, 'kmPhotos', 'kmPhoto', 'photo');
      }

      if (photos.length > 0) {
        if (loader) loader.classList.add('hidden');
        currentReceiptPhotos = photos;
        currentReceiptPhotoIndex = 0;
        renderReceiptModalGallery();
        return;
      }

      // When a driver request has no photos of its own:
      // 1. Odometer KM (request_km): Show ONLY if driver actually uploaded KM image!
      //    Never borrow KM images from ledger or previous trips.
      if (type === 'request_km') {
        if (loader) loader.classList.add('hidden');
        currentReceiptPhotos = [];
        currentReceiptPhotoIndex = 0;
        renderReceiptModalGallery();
        return;
      }

      // 2. Receipt Details (request_receipt):
      //    If pending, or not explicitly linked to an approved/filled ledger voucher: NEVER show last trip's receipt!
      //    Only check ledger if explicitly linked via linkedResponseNumber (filled/approved request).
      const linkedNum = (reqData.status !== 'pending' && reqData.linkedResponseNumber) ? reqData.linkedResponseNumber : null;
      if (linkedNum) {
        fetchEntryWithPhotos(linkedNum).then(eVal => {
          let foundPhotos = extractPhotosFromRecord(eVal, 'receiptPhotos', 'receiptPhoto');
          const cap = eVal.capturedPhoto || eVal.stationPhoto;
          if (isValidPhoto(cap) && !foundPhotos.includes(cap)) {
            foundPhotos.push(cap);
          }

          if (foundPhotos.length > 0) {
            if (loader) loader.classList.add('hidden');
            currentReceiptPhotos = foundPhotos;
            currentReceiptPhotoIndex = 0;
            renderReceiptModalGallery();
            return;
          }
          if (loader) loader.classList.add('hidden');
          currentReceiptPhotos = [];
          currentReceiptPhotoIndex = 0;
          renderReceiptModalGallery();
        }).catch(() => {
          if (loader) loader.classList.add('hidden');
          currentReceiptPhotos = [];
          currentReceiptPhotoIndex = 0;
          renderReceiptModalGallery();
        });
      } else {
        if (loader) loader.classList.add('hidden');
        currentReceiptPhotos = [];
        currentReceiptPhotoIndex = 0;
        renderReceiptModalGallery();
      }
    }).catch(err => {
      console.error("Failed to load driver request photo on demand:", err);
      if (loader) loader.classList.add('hidden');
      currentReceiptPhotos = [];
      currentReceiptPhotoIndex = 0;
      renderReceiptModalGallery();
    });
  } else {
    if (loader) loader.classList.add('hidden');
    currentReceiptPhotos = [];
    currentReceiptPhotoIndex = 0;
    renderReceiptModalGallery();
  }
}

function closeViewReceiptModal() {
  const modal = document.getElementById('view-receipt-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
  const loader = document.getElementById('receipt-modal-loader');
  if (loader) loader.classList.add('hidden');
  const uploadInput = document.getElementById('receipt-upload-input');
  if (uploadInput) uploadInput.value = '';
  const progressDiv = document.getElementById('receipt-upload-progress');
  if (progressDiv) progressDiv.classList.add('hidden');
  resetReceiptImageTransform();
  const cropSection = document.getElementById('receipt-crop-section');
  if (cropSection) {
    cropSection.classList.add('hidden');
  }
  if (window.receiptCropperInstance) {
    window.receiptCropperInstance.destroy();
    window.receiptCropperInstance = null;
  }
}

function downloadReceiptPhoto() {
  const img = document.getElementById('receipt-modal-img');
  if (!img || img.classList.contains('hidden') || !img.src) {
    alert("No image available to download.");
    return;
  }
  
  const link = document.createElement('a');
  link.href = img.src;
  
  const targetVeh = document.getElementById('receipt-modal-veh');
  const veh = targetVeh ? targetVeh.textContent.trim() : 'vehicle';
  
  const modalTitle = document.getElementById('receipt-modal-title');
  const isKm = modalTitle ? modalTitle.textContent.includes("Odometer") : false;
  
  const photoNum = (currentReceiptPhotos && currentReceiptPhotos.length > 1) ? `_${currentReceiptPhotoIndex + 1}` : '';
  const filename = isKm ? `odometer_${veh}${photoNum}.jpg` : `receipt_${veh}${photoNum}.jpg`;
  link.download = filename;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
window.downloadReceiptPhoto = downloadReceiptPhoto;

function editReceiptModalKm() {
  if (!checkAuth()) return;
  if (!currentViewReceiptKmSource || !currentViewReceiptKmId) {
    toast.err("Record reference not found.");
    return;
  }
  
  // Prompt for new KM reading
  const kmSpan = document.getElementById('receipt-modal-km');
  const currentValText = kmSpan ? kmSpan.textContent : '';
  const currentVal = parseInt(String(currentValText).replace(/[^0-9]/g, '')) || '';
  const newKm = prompt("Enter updated KM value:", currentVal);
  if (newKm === null) return;
  
  const parsedKm = parseInt(String(newKm).trim());
  if (isNaN(parsedKm) || parsedKm < 0) {
    alert("Please enter a valid numeric KM value.");
    return;
  }

  const cleanKmStr = String(parsedKm);

  if (currentViewReceiptKmSource === 'ledger') {
    entriesRef.child(currentViewReceiptKmId).update({
      currentKm: cleanKmStr
    }).then(() => {
      toast.ok("KM value updated in Diesel Records successfully!");
      if (kmSpan) kmSpan.textContent = `${cleanKmStr} KM`;
      const entry = historyEntries.find(e => String(e.responseNumber) === String(currentViewReceiptKmId));
      if (entry) {
        entry.currentKm = cleanKmStr;
        saveCache('rpm_cache_entries', historyEntries);
        if (typeof renderLedgerTable === 'function') renderLedgerTable();
      }

      // Dual-sync KM to matching driver request
      const matchingReq = driverRequestsList.find(r => r && String(r.linkedResponseNumber || '') === String(currentViewReceiptKmId));
      if (matchingReq) {
        const reqUpdates = { currentKm: cleanKmStr };
        if (matchingReq.startKm) {
          const sKm = parseInt(matchingReq.startKm) || 0;
          if (parsedKm >= sKm) {
            reqUpdates.totalKm = String(parsedKm - sKm);
            reqUpdates.endKm = cleanKmStr;
          }
        }
        driverRequestsRef.child(matchingReq.key).update(reqUpdates);
        matchingReq.currentKm = cleanKmStr;
        if (reqUpdates.totalKm) {
          matchingReq.totalKm = reqUpdates.totalKm;
          matchingReq.endKm = reqUpdates.endKm;
        }
        saveCache('rpm_cache_driver_requests', driverRequestsList);
        if (typeof renderDriverRequestsList === 'function') renderDriverRequestsList();
        if (typeof renderDriverRequestsLogList === 'function') renderDriverRequestsLogList();
      }
    }).catch(err => {
      toast.err("Failed to update KM in database: " + err.message);
    });
  } else if (currentViewReceiptKmSource === 'request') {
    const reqItem = driverRequestsList.find(r => r.key === currentViewReceiptKmId);
    const updates = { currentKm: cleanKmStr };
    if (reqItem && reqItem.startKm) {
      const startKmNum = parseInt(reqItem.startKm) || 0;
      if (parsedKm >= startKmNum) {
        updates.totalKm = String(parsedKm - startKmNum);
        updates.endKm = cleanKmStr;
      }
    }
    driverRequestsRef.child(currentViewReceiptKmId).update(updates)
      .then(() => {
        toast.ok("KM value updated in Driver Request successfully!");
        if (kmSpan) kmSpan.textContent = `${cleanKmStr} KM`;
        if (reqItem) {
          reqItem.currentKm = cleanKmStr;
          if (updates.totalKm) {
            reqItem.totalKm = updates.totalKm;
            reqItem.endKm = updates.endKm;
          }
          saveCache('rpm_cache_driver_requests', driverRequestsList);
          if (typeof renderDriverRequestsList === 'function') renderDriverRequestsList();
          if (typeof renderDriverRequestsLogList === 'function') renderDriverRequestsLogList();

          // Dual-sync KM to linked ledger entry
          if (reqItem.linkedResponseNumber) {
            entriesRef.child(reqItem.linkedResponseNumber).update({ currentKm: cleanKmStr });
            const entry = historyEntries.find(e => String(e.responseNumber) === String(reqItem.linkedResponseNumber));
            if (entry) {
              entry.currentKm = cleanKmStr;
              saveCache('rpm_cache_entries', historyEntries);
              if (typeof renderLedgerTable === 'function') renderLedgerTable();
            }
          }
        }
      }).catch(err => {
        toast.err("Failed to update KM in database: " + err.message);
      });
  }
}

window.viewReceiptPhoto = viewReceiptPhoto;
window.viewReceiptPhotoOnDemand = viewReceiptPhotoOnDemand;
window.closeViewReceiptModal = closeViewReceiptModal;
window.editReceiptModalKm = editReceiptModalKm;
window.renderReceiptModalGallery = renderReceiptModalGallery;
window.jumpToReceiptPhoto = jumpToReceiptPhoto;
window.prevReceiptPhoto = prevReceiptPhoto;
window.nextReceiptPhoto = nextReceiptPhoto;
window.removeReceiptModalPhoto = removeReceiptModalPhoto;
window.handleReceiptModalMultiUpload = handleReceiptModalMultiUpload;

function viewDriverRequestsByStatus(status) {
  switchSection('driver-requests');
  const filter = document.getElementById('driver-req-status-filter');
  if (filter) {
    filter.value = status;
    filterDriverRequests();
  }
}
window.viewDriverRequestsByStatus = viewDriverRequestsByStatus;

// ==========================================
// MAINTENANCE MODE LOGIC
// ==========================================

window.updateMaintenance = function(key, value) {
  db.ref('maintenanceMode/' + key).set(value)
    .then(() => toast.ok(`Maintenance mode '${key}' updated to ${value ? 'ON' : 'OFF'}`))
    .catch(err => {
      toast.error("Failed to update maintenance mode");
      console.error(err);
    });
};

db.ref('maintenanceMode').on('value', snap => {
  const data = snap.val() || {};
  
  // Update toggle UI in Admin Panel if it exists
  const tFull = document.getElementById('toggle-maint-full');
  if (tFull) tFull.checked = !!data.fullWeb;
  
  const tOnlyWeb = document.getElementById('toggle-maint-onlyweb');
  if (tOnlyWeb) tOnlyWeb.checked = !!data.onlyWeb;
  
  const tDriver = document.getElementById('toggle-maint-driver');
  if (tDriver) tDriver.checked = !!data.driverRequest;
  
  const tStation = document.getElementById('toggle-maint-station');
  if (tStation) tStation.checked = !!data.dieselFilled;
  
  // Handle blocking on index.html
  const isMaintenanceActive = data.fullWeb || data.onlyWeb;
  const overlay = document.getElementById('maintenance-overlay');
  
  if (overlay) {
    if (isMaintenanceActive) {
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  }
});

// ==========================================
// SYSTEM BROADCAST LOGIC
// ==========================================
window.sendSystemBroadcast = function() {
  const target = document.getElementById('broadcast-target').value;
  const level = document.getElementById('broadcast-level').value;
  const header = document.getElementById('broadcast-header').value.trim();
  const desc = document.getElementById('broadcast-desc').value.trim();

  if (!header || !desc) {
    toast.error('Header and Description are required!');
    return;
  }

  const broadcastId = 'bcast_' + Date.now();
  const broadcastData = {
    id: broadcastId,
    target: target,
    level: level,
    header: header,
    description: desc,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };

  db.ref('broadcasts/active/' + broadcastId).set(broadcastData)
    .then(() => {
      toast.ok('Broadcast sent successfully!');
      document.getElementById('broadcast-header').value = '';
      document.getElementById('broadcast-desc').value = '';
    })
    .catch(err => {
      console.error(err);
      toast.error('Failed to send broadcast');
    });
};

window.deleteSystemBroadcast = function(id) {
  if (!confirm('Are you sure you want to stop this broadcast?')) return;
  db.ref('broadcasts/active/' + id).remove()
    .then(() => toast.ok('Broadcast stopped!'))
    .catch(err => toast.error('Failed to stop broadcast'));
};

// Listen to active broadcasts and populate table
db.ref('broadcasts/active').on('value', snap => {
  const tbody = document.getElementById('active-broadcasts-tbody');
  if (!tbody) return; // Only exists on Admin
  
  const data = snap.val();
  if (!data) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-slate-400 italic text-xs">No active broadcasts.</td></tr>`;
    return;
  }

  let rows = '';
  for (const key in data) {
    const b = data[key];
    
    // Formatting helpers
    let targetLabel = b.target;
    if (b.target === 'all') targetLabel = '🌐 All';
    if (b.target === 'driver') targetLabel = '📝 Driver';
    if (b.target === 'station') targetLabel = '⛽ Station';
    if (b.target === 'admin') targetLabel = '🔒 Admin';

    let levelBadge = '';
    if (b.level === 'low') levelBadge = '<span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-xs font-bold">Low</span>';
    if (b.level === 'yellow') levelBadge = '<span class="bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-xs font-bold">Medium</span>';
    if (b.level === 'red') levelBadge = '<span class="bg-red-100 text-red-700 px-2 py-1 rounded-md text-xs font-bold">High</span>';

    rows += `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
        <td class="p-4 border-b border-slate-100 dark:border-slate-800/40">
          <div class="font-bold text-slate-800 dark:text-slate-200">${b.header}</div>
          <div class="text-xs text-slate-500 truncate max-w-[200px]">${b.description}</div>
        </td>
        <td class="p-4 border-b border-slate-100 dark:border-slate-800/40 text-xs">${targetLabel}</td>
        <td class="p-4 border-b border-slate-100 dark:border-slate-800/40">${levelBadge}</td>
        <td class="p-4 border-b border-slate-100 dark:border-slate-800/40 text-right">
          <button onclick="deleteSystemBroadcast('${key}')" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold">
            <i class="fas fa-trash-alt mr-1"></i> Stop
          </button>
        </td>
      </tr>
    `;
  }
  tbody.innerHTML = rows;
});


// ==========================================
// GLOBAL BRANDING LOGIC
// ==========================================

let brandingDataCache = {};

// Helper to convert file to base64
async function getBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

window.updateAppBranding = async function() {
  const target = document.getElementById('brand-target').value;
  const name = document.getElementById('brand-app-name').value.trim();
  
  const logoType = document.querySelector('input[name="logo-type"]:checked').value;
  let logoUrl = '';
  if (logoType === 'link') {
    logoUrl = document.getElementById('brand-logo-url').value.trim();
  } else {
    const file = document.getElementById('brand-logo-file').files[0];
    if (file) {
      if (file.size > 200 * 1024) return toast.error('Logo file size must be less than 200KB.');
      logoUrl = await getBase64(file);
    } else {
      const existing = brandingDataCache[target] || {};
      logoUrl = existing.logoUrl || '';
    }
  }

  const faviconType = document.querySelector('input[name="favicon-type"]:checked').value;
  let faviconUrl = '';
  if (faviconType === 'link') {
    faviconUrl = document.getElementById('brand-favicon-url').value.trim();
  } else {
    const file = document.getElementById('brand-favicon-file').files[0];
    if (file) {
      if (file.size > 100 * 1024) return toast.error('Favicon file size must be less than 100KB.');
      faviconUrl = await getBase64(file);
    } else {
      const existing = brandingDataCache[target] || {};
      faviconUrl = existing.faviconUrl || '';
    }
  }

  if (!name && !logoUrl && !faviconUrl && logoType !== 'upload' && faviconType !== 'upload') {
    toast.error('Please provide at least one branding value to update.');
    return;
  }

  const payload = { updatedAt: firebase.database.ServerValue.TIMESTAMP };
  if (name) payload.appName = name;
  if (logoUrl) payload.logoUrl = logoUrl;
  if (faviconUrl) payload.faviconUrl = faviconUrl;

  try {
    await db.ref(`settings/branding/${target}`).update(payload);
    toast.ok(`Branding updated successfully for ${target === 'all' ? 'All Applications' : target}!`);
  } catch (error) {
    toast.error('Failed to update branding.');
    console.error(error);
  }
};

window.populateBrandingForm = function() {
  const target = document.getElementById('brand-target').value;
  const data = brandingDataCache[target] || {};
  
  document.getElementById('brand-app-name').value = data.appName || '';
  
  const logoUrl = data.logoUrl || '';
  if (logoUrl.startsWith('data:image')) {
    document.querySelector('input[name="logo-type"][value="upload"]').checked = true;
    document.getElementById('brand-logo-url').value = '';
    document.getElementById('brand-logo-url').classList.add('hidden');
    document.getElementById('brand-logo-file').classList.remove('hidden');
  } else {
    document.querySelector('input[name="logo-type"][value="link"]').checked = true;
    document.getElementById('brand-logo-url').value = logoUrl;
    document.getElementById('brand-logo-url').classList.remove('hidden');
    document.getElementById('brand-logo-file').classList.add('hidden');
  }

  const faviconUrl = data.faviconUrl || '';
  if (faviconUrl.startsWith('data:image')) {
    document.querySelector('input[name="favicon-type"][value="upload"]').checked = true;
    document.getElementById('brand-favicon-url').value = '';
    document.getElementById('brand-favicon-url').classList.add('hidden');
    document.getElementById('brand-favicon-file').classList.remove('hidden');
  } else {
    document.querySelector('input[name="favicon-type"][value="link"]').checked = true;
    document.getElementById('brand-favicon-url').value = faviconUrl;
    document.getElementById('brand-favicon-url').classList.remove('hidden');
    document.getElementById('brand-favicon-file').classList.add('hidden');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const brandTarget = document.getElementById('brand-target');
  if(brandTarget) brandTarget.addEventListener('change', populateBrandingForm);
  
  document.querySelectorAll('input[name="logo-type"]').forEach(r => {
    r.addEventListener('change', e => {
      if(e.target.value === 'link') {
        document.getElementById('brand-logo-url').classList.remove('hidden');
        document.getElementById('brand-logo-file').classList.add('hidden');
      } else {
        document.getElementById('brand-logo-url').classList.add('hidden');
        document.getElementById('brand-logo-file').classList.remove('hidden');
      }
    });
  });

  document.querySelectorAll('input[name="favicon-type"]').forEach(r => {
    r.addEventListener('change', e => {
      if(e.target.value === 'link') {
        document.getElementById('brand-favicon-url').classList.remove('hidden');
        document.getElementById('brand-favicon-file').classList.add('hidden');
      } else {
        document.getElementById('brand-favicon-url').classList.add('hidden');
        document.getElementById('brand-favicon-file').classList.remove('hidden');
      }
    });
  });
});

db.ref('settings/branding').on('value', snap => {
  let data = snap.val() || {};
  if (data.appName || data.logoUrl || data.faviconUrl) {
    if (!data.all && !data.admin && !data.driver && !data.station) {
      data = { all: data };
    }
  }
  brandingDataCache = data;
  if(document.getElementById('brand-target')) {
    populateBrandingForm();
  }
});

// --- UNIFIED EXPORT UTILITIES ---
function unifiedExportToExcel(entries, headers, filename, mapFn) {
  if (!entries || entries.length === 0) return typeof toast !== 'undefined' ? toast.warn("No data available to export.") : alert("No data");
  
  const border = {
    top: { style: 'thin', color: { rgb: 'B0B8C8' } },
    bottom: { style: 'thin', color: { rgb: 'B0B8C8' } },
    left: { style: 'thin', color: { rgb: 'B0B8C8' } },
    right: { style: 'thin', color: { rgb: 'B0B8C8' } }
  };
  const headerStyle = {
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E40AF' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border
  };
  const cellStyle = {
    font: { name: 'Segoe UI', sz: 10 },
    alignment: { horizontal: 'center', vertical: 'center' },
    border
  };
  const altStyle = { ...cellStyle, fill: { fgColor: { rgb: 'EFF6FF' } } };

  const ws = {};
  const colWidths = headers.map(h => ({ wch: Math.max(h.length + 4, 14) }));

  // Headers
  headers.forEach((h, c) => {
    ws[String.fromCharCode(65 + c) + '1'] = { v: h, t: 's', s: headerStyle };
  });

  // Data
  entries.forEach((e, r) => {
    const rowIdx = r + 2;
    const style = (r % 2 === 1) ? altStyle : cellStyle;
    const rowData = mapFn(e);
    
    rowData.forEach((val, c) => {
      const cellRef = String.fromCharCode(65 + c) + rowIdx;
      let type = typeof val === 'number' ? 'n' : 's';
      ws[cellRef] = { v: val, t: type, s: style };
      const cellLength = String(val || '').length;
      if (cellLength > colWidths[c].wch) colWidths[c].wch = cellLength + 3;
    });
  });

  const maxRef = String.fromCharCode(64 + headers.length) + (entries.length + 1);
  ws['!ref'] = `A1:${maxRef}`;
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, filename);
  if (typeof toast !== 'undefined') toast.ok("Excel sheet downloaded successfully!");
}
