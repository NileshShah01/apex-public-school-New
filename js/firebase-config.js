// Firebase configuration
const firebaseConfig = {
    apiKey: 'AIzaSyCe44RwdP6C3MuxgzoZ320IUjRzZy37ShY',
    authDomain: 'apex-public-school-portal.firebaseapp.com',
    projectId: 'apex-public-school-portal',
    storageBucket: 'apex-public-school-portal.firebasestorage.app',
    messagingSenderId: '808587286874',
    appId: '1:808587286874:web:0a59a9d2c23d24be55fb63',
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Initialize Firebase Services with Dynamic Getters to prevent race conditions
Object.defineProperty(window, 'db', {
    get: function() {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            return firebase.firestore();
        }
        console.warn('Firebase Firestore not yet available');
        return null;
    },
    configurable: true
});

Object.defineProperty(window, 'storage', {
    get: function() {
        if (typeof firebase !== 'undefined' && firebase.storage) {
            return firebase.storage();
        }
        return null;
    },
    configurable: true
});

Object.defineProperty(window, 'auth', {
    get: function() {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            return firebase.auth();
        }
        return null;
    },
    configurable: true
});

// ===================== SNR WORLD: MULTI-TENANT CONTEXT =====================
/**
 * Automatically extracts School ID from the URL (subdomain or path slug).
 * Priorities:
 * 1. Path slug (e.g. /Apexps/ -> SCH001)
 * 2. Subdomain mapping (e.g. apex.snredu.in -> SCH001)
 * 3. Default (SCH001 for Apex)
 */
function getSchoolIdFromURL() {
    // 1. Check Query Parameters (Highest priority for explicit testing)
    const params = new URLSearchParams(window.location.search);
    if (params.has('schoolId')) return params.get('schoolId');

    // 2. Check Session Storage (Set during login - very reliable for admin)
    const storedId = sessionStorage.getItem('CURRENT_SCHOOL_ID');
    if (storedId) return storedId;

    const host = window.location.hostname;
    const path = window.location.pathname;

    // 3. Path-based Slug Extraction (e.g. /Apexps/portal/...)
    const pathParts = path.split('/').filter(p => p !== '');
    if (pathParts.length > 0) {
        const potentialSlug = pathParts[0].toLowerCase();
        
        // Reserved System Path Segments (Not slugs)
        const reserved = ['portal', 'images', 'js', 'css', 'assets', 'admin-login.html', 'student-login.html', 'platform.html'];
        
        // Hard-coded known mappings (Legacy/Special cases)
        if (potentialSlug === 'apexps') return 'SCH001';
        if (potentialSlug === 'snrworld') return 'SCH003';
        
        // Pattern: If it starts with 'sch' and is followed by numbers (SCH001, SCH002)
        if (potentialSlug.match(/^sch\d+$/)) return potentialSlug.toUpperCase();

        // AUTOMATIC: If not reserved, treat as a Slug/SchoolID
        if (!reserved.includes(potentialSlug) && !potentialSlug.includes('.')) {
            // Check if it's a known slug that needs mapping, or just return as-is (Firestore handles the rest)
            // For now, if it's not reserved, we treat it as the literal School ID or Slug string
            return pathParts[0]; // Keep original case just in case
        }
    }

    // 4. Subdomain Mapping
    const parts = host.split('.');
    if (parts.length >= 3) {
        const tenantSlug = parts[0].toLowerCase();
        if (tenantSlug === 'apex') return 'SCH001';
        if (tenantSlug === 'greenvalley') return 'SCH002';
        if (tenantSlug.startsWith('sch')) return tenantSlug.toUpperCase();
    }

    // 5. Default Hosting Identity fallbacks
    if (host.includes('apex-public-school')) return 'SCH001';

    // Fallback to SCH001 (Apex) as the default tenant
    return 'SCH001';
}

// Define CURRENT_SCHOOL_ID as a dynamic property
Object.defineProperty(window, 'CURRENT_SCHOOL_ID', {
    get: function() {
        return getSchoolIdFromURL();
    },
    configurable: true
});

// Helper to wrap Firestore collections with schoolId filtering
function schoolData(collectionName) {
    const firestore = window.db || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
    if (!firestore) {
        console.error('CRITICAL: Firestore NOT initialized for schoolData:', collectionName);
        return null;
    }
    // Use school-specific subcollection for multi-tenancy
    return firestore.collection('schools').doc(CURRENT_SCHOOL_ID).collection(collectionName);
}

// Helper for single document access within a school context
function schoolDoc(collectionName, docId) {
    const firestore = window.db || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
    if (!firestore) {
        console.error('CRITICAL: Firestore NOT initialized for schoolDoc:', collectionName);
        return null;
    }
    // Use school-specific subcollection path
    return firestore.collection('schools').doc(CURRENT_SCHOOL_ID).collection(collectionName).doc(docId);
}

// Helper to get the root school document reference
function schoolRef() {
    const firestore = window.db || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
    if (!firestore) return null;
    return firestore.collection('schools').doc(CURRENT_SCHOOL_ID);
}

// Helper to add schoolId to new documents automatically (for backward compatibility if needed)
function withSchool(data) {
    return {
        ...data,
        schoolId: CURRENT_SCHOOL_ID,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
}

// ===================== GLOBAL THEME CONTROL =====================
async function applyGlobalTheme() {
    if (!db) return;
    try {
        console.log(`Applying dynamic theme for: ${CURRENT_SCHOOL_ID}`);
        let themeDoc = await schoolDoc('settings', 'theme').get();

        // Fallback to platform-wide global settings if school-level doesn't exist
        if (!themeDoc.exists) {
            themeDoc = await db.collection('settings').doc('theme').get();
        }

        if (themeDoc.exists) {
            const theme = themeDoc.data();
            const root = document.documentElement;

            if (theme.primaryColor) {
                console.log(`[Theme] Setting primary color: ${theme.primaryColor}`);
                root.style.setProperty('--primary', theme.primaryColor);
                root.style.setProperty('--primary-light', theme.primaryColor + 'cc');
            }
            if (theme.sidebarColor) {
                console.log(`[Theme] Setting sidebar color: ${theme.sidebarColor}`);
                root.style.setProperty('--secondary', theme.sidebarColor);
            }
        } else {
            console.log('[Theme] No custom theme found in Firestore');
        }
    } catch (e) {
        console.error('[Theme] Apply failed:', e.message);
    }
}

// Auto-apply on load
if (db) applyGlobalTheme();
