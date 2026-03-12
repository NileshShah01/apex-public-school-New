// Admin Authentication Logic

document.addEventListener('DOMContentLoaded', () => {
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
                .then((userCredential) => {
                    // Success, redirect to admin dashboard
                    window.location.href = 'admin-dashboard.html';
                })
                .catch((error) => {
                    loginError.textContent = error.message;
                    loginError.style.display = 'block';
                });
        });
    }

    // Protection for admin dashboard
    if (window.location.pathname.includes('admin-dashboard.html')) {
        auth.onAuthStateChanged((user) => {
            if (!user) {
                // Not logged in, redirect to login page
                window.location.href = 'admin-login.html';
            }
        });
    }
});

function logoutAdmin() {
    auth.signOut().then(() => {
        window.location.href = 'admin-login.html';
    });
}
