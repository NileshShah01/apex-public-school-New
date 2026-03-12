// Student Authentication Logic

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('studentLoginForm');
    const loginError = document.getElementById('loginError');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const studentId = document.getElementById('student_id').value;
            const studentName = document.getElementById('student_name').value;

            loginError.style.display = 'none';

            try {
                // Check Firestore for matching student_id and name
                const docRef = db.collection('students').doc(studentId);
                const doc = await docRef.get();

                if (doc.exists && doc.data().name.toLowerCase() === studentName.toLowerCase()) {
                    // Success, store session and redirect
                    localStorage.setItem('student_session', JSON.stringify({
                        student_id: studentId,
                        name: doc.data().name
                    }));
                    window.location.href = 'student-dashboard.html';
                } else {
                    throw new Error('Invalid Student ID or Name');
                }
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
