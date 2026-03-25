// Student Authentication Logic

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for slug resolution to complete FIRST
    if (window.schoolBootstrapReady) {
        await window.schoolBootstrapReady;
    }

    // Apply dynamic branding based on tenant
    applyAuthBranding();

    const loginForm = document.getElementById('studentLoginForm');
    const loginError = document.getElementById('loginError');
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // UI States
            const originalBtnHtml = loginSubmitBtn.innerHTML;
            loginSubmitBtn.disabled = true;
            loginSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Authenticating...</span>';
            loginError.style.display = 'none';

            const studentPhone = document.getElementById('student_phone').value.trim();
            const studentName = document.getElementById('student_name').value.trim();

            try {
                // Guard: check db is available
                if (!db) {
                    throw new Error('System initialization pending. Please wait a moment and try again.');
                }

                // Check Firestore for matching phone in the current school
                const snapshot = await schoolData('students').where('phone', '==', studentPhone).get();

                if (snapshot.empty) {
                    throw new Error('Mobile Number not found. Please contact your school administrator.');
                }

                let matchedDoc = null;
                for (let i = 0; i < snapshot.docs.length; i++) {
                    const doc = snapshot.docs[i];
                    // Case-insensitive name match
                    if (doc.data().name.trim().toLowerCase() === studentName.trim().toLowerCase()) {
                        matchedDoc = doc;
                        break;
                    }
                }

                if (!matchedDoc) {
                    throw new Error('Student name does not match our records for this mobile number.');
                }

                const data = matchedDoc.data();

                // SECURITY: Explicit Tenant Validation
                // Even if the query was scoped, double-check that the student belongs to the current portal context
                if (data.schoolId && window.CURRENT_SCHOOL_ID && data.schoolId !== window.CURRENT_SCHOOL_ID) {
                    throw new Error('This account is registered with a different school portal. Please login at your school\'s official website.');
                }

                // Success - store session and redirect
                localStorage.setItem(
                    'student_session',
                    JSON.stringify({
                        student_phone: studentPhone,
                        student_id: data.student_id || matchedDoc.id,
                        name: data.name,
                        schoolId: window.CURRENT_SCHOOL_ID
                    })
                );
                
                // Success feedback before redirect
                loginSubmitBtn.innerHTML = '<i class="fas fa-check"></i> <span>Identifying...</span>';
                
                setTimeout(() => {
                    window.location.href = 'student-dashboard.html';
                }, 800);

            } catch (error) {
                console.error('Login Error:', error);
                loginError.textContent = error.message;
                loginError.style.display = 'block';
                loginSubmitBtn.disabled = false;
                loginSubmitBtn.innerHTML = originalBtnHtml;
            }
        });
    }

    // Protection for student dashboard
    if (window.location.pathname.includes('student-dashboard.html')) {
        const session = localStorage.getItem('student_session');
        if (!session) {
            window.location.href = 'student-login.html';
        }
    }
});

function logoutStudent() {
    localStorage.removeItem('student_session');
    window.location.href = 'student-login.html';
}

function loginAsGuest() {
    localStorage.setItem(
        'student_session',
        JSON.stringify({
            role: 'visitor',
            name: 'Guest Visitor',
            schoolId: window.CURRENT_SCHOOL_ID
        })
    );
    window.location.href = 'student-dashboard.html';
}

/**
 * Apply dynamic branding based on school record with absolute path resolution
 */
async function applyAuthBranding() {
    try {
        const schoolDocSnap = await schoolRef().get();
        if (!schoolDocSnap.exists) {
            console.warn('[StudentAuth] School record not found for:', window.CURRENT_SCHOOL_ID);
            return;
        }

        const data = schoolDocSnap.data();
        const name = data.schoolName || 'Apex Public School';
        let logo = data.logo || '/images/ApexPublicSchoolLogo.png';

        // Robust Absolute Path Resolution
        if (logo.startsWith('../')) {
            logo = logo.substring(2);
        }
        if (!logo.startsWith('/') && !logo.startsWith('http')) {
            logo = '/' + logo;
        }

        // Update Global Head Title
        document.title = `${name} | Student Portal`;

        // Update UI Elements
        const brandName = document.getElementById('portalBrandName');
        const brandDesc = document.getElementById('portalDesc');
        const logoContainer = document.getElementById('schoolLogoContainer');

        if (brandName) brandName.innerText = name;
        if (brandDesc) brandDesc.innerText = `Student Learning Portal Access`;
        if (logoContainer) {
            logoContainer.innerHTML = `<img src="${logo}" alt="${name}" style="height: 64px; margin-bottom: 20px; object-fit: contain;">`;
        }

    } catch (e) {
        console.error('[StudentAuth] Branding failed:', e);
    }
}
