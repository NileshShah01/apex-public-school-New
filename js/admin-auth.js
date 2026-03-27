// Admin Authentication Logic

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for slug resolution to complete FIRST
    if (window.schoolBootstrapReady) {
        await window.schoolBootstrapReady;
    }

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

                    // Sync school ID to session storage (authoritative source)
                    sessionStorage.setItem('CURRENT_SCHOOL_ID', userData.schoolId);

                    // Redirect logic
                    const slug = typeof getURLSlug === 'function' ? getURLSlug() : null;
                    let redirectUrl = '/portal/admin-dashboard.html';

                    console.log(`[Auth] Login success. Redirecting to: ${redirectUrl}`);
                    window.location.href = redirectUrl;
                } else {
                    throw new Error('Account error: Your school mapping was not found in our database.');
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

    // Protection for admin dashboard
    /* 
    if (window.location.pathname.includes('admin-dashboard')) {
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                const slug = typeof getURLSlug === 'function' ? getURLSlug() : null;
                window.location.href = slug ? `/${slug}/Admin-Login` : '/portal/admin-login.html';
            } else {
                try {
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        if (userData.schoolId && userData.schoolId !== sessionStorage.getItem('CURRENT_SCHOOL_ID')) {
                            sessionStorage.setItem('CURRENT_SCHOOL_ID', userData.schoolId);
                        }
                    }
                } catch (e) {
                    console.error('[Auth] Session sync failed:', e);
                }
            }
        });
    }
    */
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
