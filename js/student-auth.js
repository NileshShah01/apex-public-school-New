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
                // Check Firestore for matching phone
                const snapshot = await db.collection('students').where('phone', '==', studentPhone).get();

                if (snapshot.empty) {
                    throw new Error('Mobile Number not found. Please check your number.');
                }

                let matchedDoc = null;
                for (let i = 0; i < snapshot.docs.length; i++) {
                    const doc = snapshot.docs[i];
                    if (doc.data().name.trim().toLowerCase() === studentName.trim().toLowerCase()) {
                        matchedDoc = doc;
                        break;
                    }
                }

                if (!matchedDoc) {
                    throw new Error('Name does not match. Please enter the exact name as registered.');
                }

                const data = matchedDoc.data();

                // Success - store session and redirect
                localStorage.setItem('student_session', JSON.stringify({
                    student_phone: studentPhone,
                    student_id: data.student_id || matchedDoc.id,
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
