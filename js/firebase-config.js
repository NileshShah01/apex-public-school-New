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
 * Extracts the URL slug from the current path.
 * Returns the first path segment if it's not a reserved system path.
 */
function getURLSlug() {
    const path = window.location.pathname;
    const pathParts = path.split('/').filter(p => p !== '');
    if (pathParts.length > 0) {
        const potentialSlug = pathParts[0];
        const reserved = ['portal', 'images', 'js', 'css', 'assets', 'pdf', 'scripts',
            'admin-login.html', 'student-login.html', 'platform.html',
            'school.html', 'about.html', 'academics.html', 'admissions.html',
            'contact.html', 'facilities.html', 'gallery.html', 'inquiry.html',
            'provision.html', 'super-admin.html', 'super-admin-pro.html'];
        if (!reserved.includes(potentialSlug.toLowerCase()) && !potentialSlug.includes('.')) {
            return potentialSlug;
        }
    }
    return null;
}

/**
 * Synchronous School ID getter. Checks (in order):
 * 1. Query parameter ?schoolId=
 * 2. Session storage (set by resolveSchoolSlug or login)
 * 3. URL path analysis with hardcode fallbacks
 * 4. Default SCH001 for Apex
 */
function getSchoolIdFromURL() {
    // 1. Query parameter override
    const params = new URLSearchParams(window.location.search);
    if (params.has('schoolId')) return params.get('schoolId');

    // 2. Session Storage (set by resolveSchoolSlug bootstrap or login)
    const storedId = sessionStorage.getItem('CURRENT_SCHOOL_ID');
    if (storedId) return storedId;

    // 3. URL slug - hardcoded legacy mappings
    const slug = getURLSlug();
    if (slug) {
        const lower = slug.toLowerCase();
        if (lower === 'apexps') return 'SCH001';
        if (lower === 'snrworld') return 'SCH003';
        if (lower.match(/^sch\d+$/)) return lower.toUpperCase();
        // If slug exists but isn't resolved yet, return slug as-is
        // (resolveSchoolSlug will fix this asynchronously)
        return slug;
    }

    // 4. Subdomain mapping
    const host = window.location.hostname;
    const parts = host.split('.');
    if (parts.length >= 3) {
        const tenantSlug = parts[0].toLowerCase();
        if (tenantSlug === 'apex') return 'SCH001';
        if (tenantSlug.startsWith('sch')) return tenantSlug.toUpperCase();
    }

    // 5. Default host fallback
    if (host.includes('apex-public-school')) return 'SCH001';

    return 'SCH001';
}

/**
 * ASYNC SLUG RESOLUTION ENGINE
 * Queries Firestore to resolve a URL slug (e.g. "greenvalley") to a School ID (e.g. "SCH002").
 * Caches the result in sessionStorage so getSchoolIdFromURL() returns the correct value.
 * This must run BEFORE any module accesses CURRENT_SCHOOL_ID.
 */
async function resolveSchoolSlug() {
    // Skip if already resolved in this session
    const cached = sessionStorage.getItem('CURRENT_SCHOOL_ID');
    if (cached) {
        console.log(`[Tenant] Using cached School ID: ${cached}`);
        return cached;
    }

    const slug = getURLSlug();
    if (!slug) {
        // No slug in URL (root path) — default to SCH001
        const defaultId = 'SCH001';
        sessionStorage.setItem('CURRENT_SCHOOL_ID', defaultId);
        console.log(`[Tenant] No URL slug found, defaulting to: ${defaultId}`);
        return defaultId;
    }

    // Check hardcoded mappings first (no Firestore query needed)
    const lower = slug.toLowerCase();
    const hardcoded = {
        'apexps': 'SCH001',
        'nexorasoftagency': 'SCH003',
    };
    if (hardcoded[lower]) {
        sessionStorage.setItem('CURRENT_SCHOOL_ID', hardcoded[lower]);
        console.log(`[Tenant] Hardcoded slug "${slug}" → ${hardcoded[lower]}`);
        return hardcoded[lower];
    }

    // If slug looks like a School ID already (SCH001, SCH002 etc.)
    if (lower.match(/^sch\d+$/)) {
        const id = lower.toUpperCase();
        sessionStorage.setItem('CURRENT_SCHOOL_ID', id);
        console.log(`[Tenant] Direct School ID in URL: ${id}`);
        return id;
    }

    // DYNAMIC RESOLUTION: Query Firestore for the school with this subdomain/slug
    try {
        const firestore = firebase.firestore();
        console.log(`[Tenant] Resolving slug "${slug}" via Firestore...`);

        // Query by subdomain field (case-insensitive check)
        const snap = await firestore.collection('schools')
            .where('subdomain', '==', slug)
            .limit(1)
            .get();

        if (!snap.empty) {
            const schoolId = snap.docs[0].data().schoolId;
            sessionStorage.setItem('CURRENT_SCHOOL_ID', schoolId);
            console.log(`[Tenant] ✅ Resolved slug "${slug}" → ${schoolId}`);
            return schoolId;
        }

        // Try lowercase match
        const snapLower = await firestore.collection('schools')
            .where('subdomain', '==', lower)
            .limit(1)
            .get();

        if (!snapLower.empty) {
            const schoolId = snapLower.docs[0].data().schoolId;
            sessionStorage.setItem('CURRENT_SCHOOL_ID', schoolId);
            console.log(`[Tenant] ✅ Resolved slug "${lower}" → ${schoolId}`);
            return schoolId;
        }

        // Slug not found — might be the schoolId itself used as slug
        // Check if a school doc exists with this as the doc ID
        const directDoc = await firestore.collection('schools').doc(slug).get();
        if (directDoc.exists) {
            sessionStorage.setItem('CURRENT_SCHOOL_ID', slug);
            console.log(`[Tenant] ✅ Direct doc match: ${slug}`);
            return slug;
        }

        console.warn(`[Tenant] ⚠️ Could not resolve slug "${slug}". Falling back to SCH001.`);
        sessionStorage.setItem('CURRENT_SCHOOL_ID', 'SCH001');
        return 'SCH001';
    } catch (e) {
        console.error('[Tenant] Slug resolution error:', e);
        sessionStorage.setItem('CURRENT_SCHOOL_ID', 'SCH001');
        return 'SCH001';
    }
}

// ===================== BOOTSTRAP PROMISE =====================
// All modules should await this before accessing CURRENT_SCHOOL_ID
window.schoolBootstrapReady = resolveSchoolSlug();

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
    // Wait for slug resolution if it's in progress
    if (window.schoolBootstrapReady) {
        await window.schoolBootstrapReady;
    }
    
    if (!db) return;
    try {
        console.log(`[Theme] Applying dynamic theme for school: ${CURRENT_SCHOOL_ID}`);
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
