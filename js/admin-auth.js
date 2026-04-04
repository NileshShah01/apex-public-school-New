// Admin Authentication Logic - Tenant-Isolated

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for slug resolution to complete FIRST
    if (window.schoolBootstrapReady) {
        await window.schoolBootstrapReady;
    }

    // Store the URL-resolved school context (before login overrides it)
    const urlSchoolId = window.CURRENT_SCHOOL_ID;
    console.log(`[Auth] Page loaded. URL Tenant Context: ${urlSchoolId}`);

    // Apply dynamic branding based on resolved tenant
    applyAuthBranding();

    const loginForm = document.getElementById('adminLoginForm');
    const loginError = document.getElementById('loginError');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('loginBtn');
            const btnText = document.getElementById('btnText');
            const btnSpinner = document.getElementById('btnSpinner');
            
            submitBtn.disabled = true;
            btnText.innerText = 'Authenticating...';
            if (btnSpinner) btnSpinner.style.display = 'block';
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            loginError.style.display = 'none';

            try {
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user;

                // Fetch user metadata for school mapping
                let userDoc = await db.collection('users').doc(user.uid).get();

                // AUTO-PROVISION: If record is missing, recreate it for the primary admin (Safety Net)
                if (!userDoc.exists && user.email === 'nileshshah84870@gmail.com') {
                    console.warn('Admin record missing. Auto-provisioning SCH001 mapping...');
                    await db.collection('users').doc(user.uid).set({
                        email: user.email,
                        schoolId: 'SCH001',
                        role: 'admin',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    userDoc = await db.collection('users').doc(user.uid).get();
                }

                if (userDoc.exists) {
                    const userData = userDoc.data();

                    // ═══════ CRITICAL TENANT VALIDATION ═══════
                    // The user's assigned schoolId MUST match the school context
                    // determined by the URL slug. This prevents cross-tenant login.
                    if (urlSchoolId && userData.schoolId && userData.schoolId !== urlSchoolId) {
                        // Sign out immediately — this user doesn't belong to this portal
                        await auth.signOut();
                        throw new Error(
                            `Access denied. Your admin account belongs to a different school portal. ` +
                            `Please login through your own school's website.`
                        );
                    }
                    // ═══════════════════════════════════════════

                    // Sync school ID to session storage (authoritative source)
                    sessionStorage.setItem('CURRENT_SCHOOL_ID', userData.schoolId);

                    // Redirect logic
                    const slug = typeof getURLSlug === 'function' ? getURLSlug() : null;
                    let redirectUrl = slug ? `/${slug}/Admin-Dashboard` : '/portal/admin-dashboard.html';

                    console.log(`[Auth] Login success for ${userData.schoolId}. Redirecting to: ${redirectUrl}`);
                    window.location.href = redirectUrl;
                } else {
                    // No user record — sign out and block
                    await auth.signOut();
                    throw new Error('Account error: Your school mapping was not found in our database. Contact your administrator.');
                }
            } catch (error) {
                console.error('Authentication Error:', error);
                loginError.textContent = error.message;
                loginError.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
                btnText.innerText = 'Sign In to Dashboard';
                if (btnSpinner) btnSpinner.style.display = 'none';
            }
        });
    }

    // ═══════ DASHBOARD AUTH GUARD — TENANT ISOLATION ═══════
    // Active on admin-dashboard pages: verifies the logged-in user
    // actually belongs to the school whose slug is in the URL.
    const isDashboard = window.location.pathname.toLowerCase().includes('admin-dashboard');
    if (isDashboard) {
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                // Not logged in — redirect to login
                const slug = typeof getURLSlug === 'function' ? getURLSlug() : null;
                window.location.href = slug ? `/${slug}/Admin-Login` : '/portal/admin-login.html';
                return;
            }

            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (!userDoc.exists) {
                    console.error('[Auth Guard] No user record found — logging out.');
                    await auth.signOut();
                    sessionStorage.removeItem('CURRENT_SCHOOL_ID');
                    const slug = typeof getURLSlug === 'function' ? getURLSlug() : null;
                    window.location.href = slug ? `/${slug}/Admin-Login` : '/portal/admin-login.html';
                    return;
                }

                const userData = userDoc.data();

                // TENANT CHECK: user's schoolId must match the URL school context
                if (urlSchoolId && userData.schoolId && userData.schoolId !== urlSchoolId) {
                    console.error(`[Auth Guard] TENANT MISMATCH! User belongs to ${userData.schoolId} but URL is ${urlSchoolId}. Blocking access.`);
                    await auth.signOut();
                    sessionStorage.removeItem('CURRENT_SCHOOL_ID');
                    alert('Access denied: You are not authorized to access this school\'s dashboard. Redirecting to your school\'s login page.');
                    const slug = typeof getURLSlug === 'function' ? getURLSlug() : null;
                    window.location.href = slug ? `/${slug}/Admin-Login` : '/portal/admin-login.html';
                    return;
                }

                // Sync session if all checks pass
                if (userData.schoolId) {
                    sessionStorage.setItem('CURRENT_SCHOOL_ID', userData.schoolId);
                }
                console.log(`[Auth Guard] ✅ Tenant verified: ${userData.schoolId}`);
            } catch (e) {
                console.error('[Auth Guard] Session sync failed:', e);
            }
        });
    }
    // ═══════════════════════════════════════════════════════
});

function logoutAdmin() {
    sessionStorage.removeItem('CURRENT_SCHOOL_ID');
    auth.signOut().then(() => {
        const slug = typeof getURLSlug === 'function' ? getURLSlug() : null;
        window.location.href = slug ? `/${slug}/Admin-Login` : '/portal/admin-login.html';
    });
}

/**
 * Apply dynamic branding based on school record
 */
async function applyAuthBranding() {
    try {
        const schoolDocSnap = await schoolRef().get();
        if (!schoolDocSnap.exists) return;

        const data = schoolDocSnap.data();
        const name = data.schoolName || 'Antigravity ERP';
        let logo = data.logo || '/images/ApexPublicSchoolLogo.png';
        
        // Path safety
        if (logo.startsWith('../')) logo = logo.substring(2);
        if (!logo.startsWith('/') && !logo.startsWith('http')) logo = '/' + logo;

        // Update Title & Brand
        document.title = `Admin Login | ${name}`;
        
        const brandNameEl = document.getElementById('portalBrandName');
        const logoImgEl = document.getElementById('schoolLogo');

        if (brandNameEl) brandNameEl.innerText = name;
        if (logoImgEl) {
            logoImgEl.src = logo;
            logoImgEl.alt = `${name} Logo`;
        }
    } catch (e) {
        console.error('Branding failed:', e);
    }
}
