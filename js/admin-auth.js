// Admin Authentication Logic

document.addEventListener('DOMContentLoaded', () => {
    // Apply dynamic branding based on tenant
    applyAuthBranding();

    const loginForm = document.getElementById('adminLoginForm');
    const loginError = document.getElementById('loginError');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            loginError.style.display = 'none';

            // Sign in with Firebase Auth
            auth.signInWithEmailAndPassword(email, password)
                .then(async (userCredential) => {
                    const user = userCredential.user;
                    
                    // Fetch user metadata for school mapping
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        
                        // SECURITY: Fetch the current context school ID (from URL or fallback)
                        const contextId = window.CURRENT_SCHOOL_ID; 

                        // SECURITY: Cross-Tenant Guard
                        // If the user's schoolId doesn't match the current portal context, redirect them.
                        if (userData.schoolId && contextId && userData.schoolId !== contextId) {
                            console.warn(`Tenant Mismatch: User belongs to ${userData.schoolId}, but is on ${contextId} portal.`);
                            alert(`Unauthorized Access: You belong to ${userData.schoolId}. Redirecting to your portal...`);
                            
                            // Construct correct URL
                            const correctPath = window.location.pathname.replace(new RegExp(`/${contextId}/`, 'i'), `/${userData.schoolId}/`);
                            window.location.href = correctPath.includes(userData.schoolId) ? correctPath : `/${userData.schoolId}/Admin-Dashboard`;
                            return;
                        }

                        // Sync school ID to session storage
                        sessionStorage.setItem('CURRENT_SCHOOL_ID', userData.schoolId);
                        
                        // Success, redirect to dashboard
                        window.location.href = 'admin-dashboard.html';
                    } else {
                        console.error('User record not found in database.');
                        loginError.textContent = 'Account error: School mapping not found.';
                        loginError.style.display = 'block';
                        auth.signOut();
                    }
                })
                .catch((error) => {
                    loginError.textContent = error.message;
                    loginError.style.display = 'block';
                });
        });
    }

    // Protection for admin dashboard
    if (window.location.pathname.includes('admin-dashboard.html')) {
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                // Not logged in, redirect to login page
                window.location.href = 'admin-login.html';
            } else {
                try {
                    // Sync session storage if missing or potentially wrong
                    // This ensures persistent context if someone opens the dashboard directly
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        if (userData.schoolId && userData.schoolId !== sessionStorage.getItem('CURRENT_SCHOOL_ID')) {
                            console.log('Syncing correct school ID to session:', userData.schoolId);
                            sessionStorage.setItem('CURRENT_SCHOOL_ID', userData.schoolId);
                            
                            // For safety, if it was actually different, a reload might be needed to re-init some modules
                            // but with our dynamic getters, it's mostly handled.
                        }
                    }
                } catch (e) {
                    console.error('Session sync failed:', e);
                }
            }
        });
    }
});

function logoutAdmin() {
    auth.signOut().then(() => {
        window.location.href = 'admin-login.html';
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
        const name = data.schoolName || 'Apex Public School';
        const logo = data.logo || '../images/ApexPublicSchoolLogo.png';

        // Update Title
        if (document.getElementById('portalTitle')) {
            document.getElementById('portalTitle').innerText = `Admin Login | ${name}`;
        }

        // Branding
        if (document.getElementById('portalBrandName')) {
            document.getElementById('portalBrandName').innerText = `Admin Portal`;
        }
        if (document.getElementById('portalDesc')) {
            document.getElementById('portalDesc').innerText = `Secure access for ${name} administrators`;
        }
        if (document.getElementById('schoolLogoContainer')) {
            document.getElementById('schoolLogoContainer').innerHTML = `<img src="${logo}" alt="${name} Logo" style="height: 64px; margin-bottom: 1rem; object-fit: contain;">`;
        }
    } catch (e) {
        console.error('Branding failed:', e);
    }
}
