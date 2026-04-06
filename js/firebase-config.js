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
    get: function () {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            return firebase.firestore();
        }
        console.warn('Firebase Firestore not yet available');
        return null;
    },
    configurable: true,
});

Object.defineProperty(window, 'storage', {
    get: function () {
        if (typeof firebase !== 'undefined' && firebase.storage) {
            return firebase.storage();
        }
        return null;
    },
    configurable: true,
});

Object.defineProperty(window, 'auth', {
    get: function () {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            return firebase.auth();
        }
        return null;
    },
    configurable: true,
});

// ===================== SNR WORLD: MULTI-TENANT CONTEXT =====================
/**
 * Extracts the URL slug from the current path.
 * Returns the first path segment if it's not a reserved system path.
 */
function getURLSlug() {
    const path = window.location.pathname;
    const pathParts = path.split('/').filter((p) => p !== '');
    if (pathParts.length > 0) {
        const potentialSlug = pathParts[0];
        const reserved = [
            'portal',
            'images',
            'js',
            'css',
            'assets',
            'pdf',
            'scripts',
            '_backups',
            'admin-login.html',
            'student-login.html',
            'platform.html',
            'super-admin.html',
            'super-admin-pro.html',
        ];
        // Allow apexps as a valid tenant slug
        if (!reserved.includes(potentialSlug.toLowerCase()) && !potentialSlug.includes('.')) {
            return potentialSlug;
        }
        // Special case for /apexps/ path
        if (potentialSlug.toLowerCase() === 'apexps') return 'apexps';
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
    console.log('[SchoolID] URL slug detected:', slug);
    if (slug) {
        const lower = slug.toLowerCase();
        if (lower.match(/^sch\d+$/)) return lower.toUpperCase();
        // Hardcoded slug mappings for specific schools
        if (lower === 'apexps') {
            console.log('[SchoolID] Mapping apexps to school ID 01');
            return '01';
        }
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
    if (host.includes('snredu-erp')) return '01';

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

    const host = window.location.hostname;
    const slug = getURLSlug();

    console.log(`[Tenant] Initializing resolution for Host: ${host}, Slug: ${slug}`);

    // DYNAMIC RESOLUTION: Root Path or Custom Domain check via Hostname
    try {
        const firestore = firebase.firestore();

        // 1. Check if hostname matches any school's custom domain or recorded subdomain
        // We look for documents where 'domain' or 'subdomain' matches the current host/slug
        let schoolMatch = null;

        // Try hostname first (for production domains like nexorasoft.in)
        const hostSnap = await firestore.collection('schools').where('domain', '==', host).limit(1).get();

        if (!hostSnap.empty) {
            schoolMatch = hostSnap.docs[0].data().schoolId;
        }

        // 2. Try subdomain/slug match (for paths like /apexps)
        if (!schoolMatch && slug) {
            const slugSnap = await firestore
                .collection('schools')
                .where('subdomain', '==', slug.toLowerCase())
                .limit(1)
                .get();

            if (!slugSnap.empty) {
                schoolMatch = slugSnap.docs[0].data().schoolId;
            }
        }

        // 3. Try direct School ID match (in URL or as slug)
        if (!schoolMatch && slug && slug.toLowerCase().match(/^sch\d+$/)) {
            schoolMatch = slug.toUpperCase();
        }

        // Custom Domain & Subdomain mappings are now exclusively handled via Firestore
        // to ensure zero-maintenance scaling.

        if (schoolMatch) {
            sessionStorage.setItem('CURRENT_SCHOOL_ID', schoolMatch);
            console.log(`[Tenant] ✅ Resolved context to: ${schoolMatch}`);
            return schoolMatch;
        }

        console.warn(`[Tenant] ⚠️ Could not resolve domain/slug. Falling back to SCH001.`);
        sessionStorage.setItem('CURRENT_SCHOOL_ID', 'SCH001');
        return 'SCH001';
    } catch (e) {
        console.error('[Tenant] Detailed resolution error:', e);
        sessionStorage.setItem('CURRENT_SCHOOL_ID', 'SCH001');
        return 'SCH001';
    }
}

// ===================== BOOTSTRAP PROMISE =====================
// All modules should await this before accessing CURRENT_SCHOOL_ID
window.schoolBootstrapReady = resolveSchoolSlug();

// Define CURRENT_SCHOOL_ID as a dynamic property
Object.defineProperty(window, 'CURRENT_SCHOOL_ID', {
    get: function () {
        return getSchoolIdFromURL();
    },
    configurable: true,
});

// Helper to wrap Firestore collections with schoolId filtering
function schoolData(collectionName) {
    const firestore =
        window.db || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
    if (!firestore) {
        console.error('CRITICAL: Firestore NOT initialized for schoolData:', collectionName);
        return null;
    }
    // Use school-specific subcollection for multi-tenancy
    return firestore.collection('schools').doc(CURRENT_SCHOOL_ID).collection(collectionName);
}

// Helper for single document access within a school context
function schoolDoc(collectionName, docId) {
    const firestore =
        window.db || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
    if (!firestore) {
        console.error('CRITICAL: Firestore NOT initialized for schoolDoc:', collectionName);
        return null;
    }
    // Use school-specific subcollection path
    return firestore.collection('schools').doc(CURRENT_SCHOOL_ID).collection(collectionName).doc(docId);
}

// Helper to get the root school document reference
function schoolRef() {
    const firestore =
        window.db || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
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
