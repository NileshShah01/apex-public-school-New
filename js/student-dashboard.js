// Student Dashboard Logic - Premium Version
const GITHUB_BASE = 'https://nileshshah01.github.io/Apex-public-school-test-01';
let currentStudentID = null;

document.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('student_session');
    
    if (!session) {
        window.location.href = 'student-login.html';
        return;
    }

    const sessionData = JSON.parse(session);
    currentStudentID = sessionData.student_id;

    if (!currentStudentID) {
        window.location.href = 'student-login.html';
        return;
    }

    // Initialize UI
    fetchStudentData();
    fetchNotices();

    // Event Listeners
    document.getElementById('academicYear')?.addEventListener('change', updateResultLink);
});

function setLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
}

async function fetchStudentData() {
    setLoading(true);
    try {
        const doc = await db.collection('students').doc(currentStudentID).get();
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('disp_student_name').textContent = data.name;
            document.getElementById('disp_student_id').textContent = data.student_id;
            document.getElementById('disp_class').textContent = data.class;
            document.getElementById('disp_section').textContent = data.section;
            
            // Try loading student photo
            const photoUrl = `${GITHUB_BASE}/images/students/${data.student_id}.jpg`;
            checkPhotoExists(photoUrl);

            // Initial Result Check
            updateResultLink();
        } else {
            alert("Student record not found. Please contact admin.");
            logoutStudent();
        }
    } catch (error) {
        console.error("Error:", error);
    } finally {
        setLoading(false);
    }
}

function checkPhotoExists(url) {
    const photoDiv = document.getElementById('studentPhoto');
    const img = new Image();
    img.onload = () => {
        photoDiv.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover;">`;
    };
    img.onerror = () => {
        // Keep the placeholder icon
    };
    img.src = url;
}

async function updateResultLink() {
    const year = document.getElementById('academicYear').value;
    const statusArea = document.getElementById('resultStatusArea');
    
    // Yearly structure support: pdf/results/2026/1001.pdf
    const resultUrl = `${GITHUB_BASE}/pdf/results/${year}/${currentStudentID}.pdf`;
    
    statusArea.innerHTML = '<span class="badge" style="background:#f1f5f9; color:#64748b;"><i class="fas fa-spinner fa-spin"></i> Checking availability...</span>';

    try {
        const response = await fetch(resultUrl, { method: 'HEAD' });
        if (response.ok) {
            statusArea.innerHTML = `
                <a href="${resultUrl}" target="_blank" class="btn-portal btn-primary" style="padding: 1rem 2.5rem; font-size: 1rem;">
                    <i class="fas fa-download"></i> Download Report Card (${year})
                </a>
            `;
        } else {
            statusArea.innerHTML = `
                <div style="padding: 1rem; background: #fff1f2; border-radius: 0.5rem; color: #be123c; display: flex; align-items: center; gap: 0.75rem; justify-content: center;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span style="font-weight: 600;">Result for ${year} is not available yet.</span>
                </div>
            `;
        }
    } catch (e) {
        statusArea.innerHTML = '<span class="badge badge-danger">Connection Error</span>';
    }
}

async function fetchNotices() {
    const container = document.getElementById('noticesContainer');
    try {
        const snap = await db.collection('notices').orderBy('date', 'desc').limit(5).get();
        if (snap.empty) {
            container.innerHTML = '<p style="text-align:center; color:#94a3b8; margin-top:2rem;">No new notices at this time.</p>';
            return;
        }

        container.innerHTML = '';
        snap.forEach(doc => {
            const data = doc.data();
            const date = data.date ? new Date(data.date.seconds * 1000).toLocaleDateString() : 'New';
            
            const noticeHtml = `
                <div style="padding: 1.25rem 0; border-bottom: 1px solid #f1f5f9;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                        <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--secondary);">${data.title}</h4>
                        <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">${date}</span>
                    </div>
                    <p style="font-size: 0.875rem; color: var(--text-main); line-height: 1.5;">${data.message}</p>
                </div>
            `;
            container.innerHTML += noticeHtml;
        });
    } catch (error) {
        console.error("Notices error:", error);
    }
}

function logoutStudent() {
    localStorage.removeItem('student_session');
    window.location.href = 'student-login.html';
}
