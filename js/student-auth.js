// Student Authentication Logic

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('studentLoginForm');
    const loginError = document.getElementById('loginError');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const studentPhone = document.getElementById('student_phone').value.trim();
            const studentName = document.getElementById('student_name').value.trim();

            loginError.style.display = 'none';

            // Guard: check db is available
            if (!db) {
                loginError.textContent = 'Database not connected. Please refresh and try again.';
                loginError.style.display = 'block';
                return;
            }

            try {
                // Check Firestore for matching phone and name
                const docRef = db.collection('students').doc(studentPhone);
                const doc = await docRef.get();

                if (!doc.exists) {
                    throw new Error('Mobile Number not found. Please check your number.');
                }

                const data = doc.data();
                if (data.name.trim().toLowerCase() !== studentName.trim().toLowerCase()) {
                    throw new Error('Name does not match. Please enter the exact name as registered.');
                }

                // Success - store session and redirect
                localStorage.setItem('student_session', JSON.stringify({
                    student_phone: studentPhone,
                    name: data.name
                }));
                window.location.href = 'student-dashboard.html';

            } catch (error) {
                loginError.textContent = error.message;
                loginError.style.display = 'block';
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
