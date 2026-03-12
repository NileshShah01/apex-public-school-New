// Student Authentication Logic

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('studentLoginForm');
    const loginError = document.getElementById('loginError');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const studentId = document.getElementById('student_id').value.trim();
            const studentName = document.getElementById('student_name').value.trim();

            loginError.style.display = 'none';

            // Guard: check db is available
            if (!db) {
                loginError.textContent = 'Database not connected. Please refresh and try again.';
                loginError.style.display = 'block';
                return;
            }

            try {
                // Check Firestore for matching student_id and name
                const docRef = db.collection('students').doc(studentId);
                const doc = await docRef.get();

                if (!doc.exists) {
                    throw new Error('Student ID not found. Please check your ID.');
                }

                const data = doc.data();
                if (data.name.toLowerCase() !== studentName.toLowerCase()) {
                    throw new Error('Name does not match. Please enter the exact name as registered.');
                }

                // Success - store session and redirect
                localStorage.setItem('student_session', JSON.stringify({
                    student_id: studentId,
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
