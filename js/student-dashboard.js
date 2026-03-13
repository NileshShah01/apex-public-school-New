// Student Dashboard Logic - Premium Version
const GITHUB_BASE = 'https://nileshshah01.github.io/Apex-public-school-test-01';
let currentStudentID = null;
let currentStudentClass = null;

document.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('student_session');
    
    if (!session) {
        window.location.href = 'student-login.html';
        return;
    }

    const sessionData = JSON.parse(session);
    currentStudentID = sessionData.student_phone || sessionData.student_id;

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
        const sessionData = JSON.parse(localStorage.getItem('student_session'));
        let doc = null;

        // Ensure we retrieve the correct Document ID by querying the phone number if available
        if (sessionData.student_phone) {
            const snap = await db.collection('students').where('phone', '==', sessionData.student_phone).get();
            if (!snap.empty) {
                // Find matching name or just first match
                doc = snap.docs.find(d => d.data().name.trim().toLowerCase() === sessionData.name.trim().toLowerCase()) || snap.docs[0];
                currentStudentID = doc.id; // CRITICAL: Updates currentStudentID to true doc ID for reports!
            }
        }

        // Fallback to direct doc fetch if query failed or phone wasn't in session
        if (!doc && currentStudentID) {
            const fallbackDoc = await db.collection('students').doc(currentStudentID).get();
            if (fallbackDoc.exists) doc = fallbackDoc;
        }

        if (doc) {
            const data = doc.data();
            document.getElementById('disp_student_name').textContent = data.name;
            document.getElementById('disp_student_id').textContent = data.student_id || currentStudentID;
            currentStudentClass = data.class || '';
            if (document.getElementById('disp_class')) document.getElementById('disp_class').textContent = currentStudentClass || 'N/A';
            if (document.getElementById('disp_section')) document.getElementById('disp_section').textContent = data.section || 'N/A';
            
            // Try loading student photo
            if (data.photo_url) {
                checkPhotoExists(data.photo_url);
            } else if (data.student_id) {
                const photoUrl = `${GITHUB_BASE}/images/students/${data.student_id}.jpg`;
                checkPhotoExists(photoUrl);
            }

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
    const resultArea = document.getElementById('resultStatusArea');
    const admitArea = document.getElementById('admitCardStatusArea');
    const timetableArea = document.getElementById('timetableStatusArea');
    
    resultArea.innerHTML = '<span class="badge" style="background:#f1f5f9; color:#64748b;"><i class="fas fa-spinner fa-spin"></i> Checking...</span>';
    admitArea.innerHTML = '<span class="badge" style="background:#fef3c7; color:#92400e;"><i class="fas fa-spinner fa-spin"></i> Checking...</span>';
    if (timetableArea) timetableArea.innerHTML = '<span class="badge" style="background:#ccfbf1; color:#115e59;"><i class="fas fa-spinner fa-spin"></i> Checking...</span>';

    // Check Result Card
    db.collection('reports').doc(`${currentStudentID}_${year}`).get().then(docRef => {
        if (docRef.exists) {
            const pdfData = docRef.data().fileData;
            resultArea.innerHTML = `
                <a href="${pdfData}" download="ReportCard_${year}.pdf" class="btn-portal btn-primary" style="padding: 0.75rem 1.5rem; font-size: 0.95rem; width: 100%;">
                    <i class="fas fa-download"></i> Download Report Card
                </a>
            `;
        } else { throw new Error("Not Found"); }
    }).catch(e => {
        resultArea.innerHTML = `
            <div style="padding: 0.75rem; background: #fff1f2; border-radius: 0.5rem; color: #be123c; display: flex; align-items: center; gap: 0.5rem; justify-content: center; font-size: 0.9rem;">
                <i class="fas fa-exclamation-triangle"></i>
                <span style="font-weight: 600;">Not available yet.</span>
            </div>
        `;
    });

    // Check Admit Card
    db.collection('admitcards').doc(`${currentStudentID}_${year}`).get().then(docRef => {
        if (docRef.exists) {
            const pdfData = docRef.data().fileData;
            admitArea.innerHTML = `
                <a href="${pdfData}" download="AdmitCard_${year}.pdf" class="btn-portal" style="background: #d97706; color: white; padding: 0.75rem 1.5rem; font-size: 0.95rem; width: 100%; display: inline-block;">
                    <i class="fas fa-download"></i> Download Admit Card
                </a>
            `;
        } else { throw new Error("Not Found"); }
    }).catch(e => {
        admitArea.innerHTML = `
            <div style="padding: 0.75rem; background: #fef2f2; border-radius: 0.5rem; color: #991b1b; display: flex; align-items: center; gap: 0.5rem; justify-content: center; font-size: 0.9rem;">
                <i class="fas fa-exclamation-triangle"></i>
                <span style="font-weight: 600;">Not available yet.</span>
            </div>
        `;
    });

    // Check Class Timetable
    if (timetableArea && currentStudentClass) {
        const classId = currentStudentClass.toLowerCase().replace(/\s+/g, '-');
        db.collection('timetables').doc(classId).get().then(docRef => {
            if (docRef.exists) {
                const pdfData = docRef.data().fileData;
                timetableArea.innerHTML = `
                    <a href="${pdfData}" download="Timetable_${currentStudentClass.replace(/\s+/g, '')}.pdf" class="btn-portal" style="background: #0d9488; color: white; padding: 0.75rem 1.5rem; font-size: 0.95rem; width: 100%; display: inline-block;">
                        <i class="fas fa-download"></i> Download Timetable
                    </a>
                `;
            } else { throw new Error("Not Found"); }
        }).catch(e => {
            timetableArea.innerHTML = `
                <div style="padding: 0.75rem; background: #f0fdf4; border-radius: 0.5rem; color: #166534; display: flex; align-items: center; gap: 0.5rem; justify-content: center; font-size: 0.9rem;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span style="font-weight: 600;">Not available yet.</span>
                </div>
            `;
        });
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
