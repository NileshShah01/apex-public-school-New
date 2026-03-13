// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCe44RwdP6C3MuxgzoZ320IUjRzZy37ShY",
  authDomain: "apex-public-school-portal.firebaseapp.com",
  projectId: "apex-public-school-portal",
  storageBucket: "apex-public-school-portal.firebasestorage.app",
  messagingSenderId: "808587286874",
  appId: "1:808587286874:web:0a59a9d2c23d24be55fb63"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

var db = typeof firebase.firestore === 'function' ? firebase.firestore() : null;
var storage = typeof firebase.storage === 'function' ? firebase.storage() : null;
var auth = typeof firebase.auth === 'function' ? firebase.auth() : null;

// ===================== GLOBAL THEME CONTROL =====================
async function applyGlobalTheme() {
    if (!db) return;
    try {
        const doc = await db.collection('settings').doc('theme').get();
        if (doc.exists) {
            const theme = doc.data();
            const root = document.documentElement;
            
            if (theme.primaryColor) {
                root.style.setProperty('--primary', theme.primaryColor);
                // Also update related variables for main site
                root.style.setProperty('--primary-light', theme.primaryColor + 'cc'); // 80% opacity for light variant
            }
            if (theme.sidebarColor) {
                root.style.setProperty('--secondary', theme.sidebarColor);
            }
        }
    } catch(e) {
        console.warn('Theme apply failed:', e.message);
    }
}

// Auto-apply on load
if (db) applyGlobalTheme();
