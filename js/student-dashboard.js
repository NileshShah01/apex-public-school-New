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
    loadDashboardConfig(); // Load exam heading & notice

    // Event Listeners
    document.getElementById('academicYear')?.addEventListener('change', updateResultLink);
});

// ===================== LOAD DASHBOARD CONFIG FROM CMS =====================
async function loadDashboardConfig() {
    try {
        const doc = await db.collection('settings').doc('dashboardConfig').get();
        if (!doc.exists) return;
        const d = doc.data();
        
        // 1. Exam Banner
        if (d.examHeading) {
            document.getElementById('examAnnouncementTitle').textContent = d.examHeading;
            document.getElementById('examAnnouncementNotice').textContent = d.examNotice || '';
            document.getElementById('examAnnouncementBanner').style.display = 'block';
        }

        // 2. Widget Toggles & Content
        if (d.showQuickActions) document.getElementById('quickActionsSection').style.display = 'block';
        
        if (d.showAttendance) {
            document.getElementById('attendanceWidget').style.display = 'block';
            fetchAttendance();
        }

        if (d.showTimings) {
            document.getElementById('timingsWidget').style.display = 'block';
            if (d.schoolTimings) document.getElementById('timingText').textContent = d.schoolTimings;
        }

        if (d.showPrincipalMessage) {
            document.getElementById('principalMessageWidget').style.display = 'block';
            if (d.principalMessage) document.getElementById('principalMessageText').textContent = `"${d.principalMessage}"`;
        }

    } catch(e) {
        console.warn('Dashboard config load failed:', e.message);
    }
}

async function fetchAttendance() {
    if (!currentStudentID) return;
    try {
        // Attendance documents are expected to be named as studentID_month (e.g., student123_2026-03)
        // For simplicity, we'll try to get the latest record from an 'attendance' collection
        const snap = await db.collection('attendance').where('studentId', '==', currentStudentID).orderBy('date', 'desc').limit(1).get();
        
        const percentEl = document.getElementById('attendancePercent');
        const statusEl = document.getElementById('attendanceStatusText');
        const circle = document.getElementById('attendanceCircle');

        if (!snap.empty) {
            const data = snap.docs[0].data();
            const percent = data.percentage || 0;
            percentEl.textContent = `${percent}%`;
            statusEl.textContent = `As of ${data.month || 'this month'}`;
            
            // Update SVG circle
            const dashArray = `${percent}, 100`;
            circle.setAttribute('stroke-dasharray', dashArray);
            
            // Set color based on percentage
            if (percent < 75) circle.setAttribute('stroke', 'var(--danger)');
            else if (percent < 85) circle.setAttribute('stroke', 'var(--warning)');
            else circle.setAttribute('stroke', 'var(--success)');

        } else {
            statusEl.textContent = "No recent records found.";
        }
    } catch(e) {
        console.warn('Attendance fetch failed:', e.message);
    }
}

function setLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
}

async function fetchStudentData() {
    setLoading(true);
    try {
        const sessionData = JSON.parse(localStorage.getItem('student_session'));
        
        // CACHE CHECK: Use cached profile if available and not expired (e.g., 30 mins)
        const CACHE_KEY = `student_profile_${sessionData.student_id || sessionData.student_phone}`;
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < 30 * 60 * 1000) { // 30 mins
                displayStudentProfile(data);
                setLoading(false);
                return;
            }
        }

        let doc = null;
        // Ensure we retrieve the correct Document ID by querying the phone number if available
        if (sessionData.student_phone) {
            const snap = await db.collection('students').where('phone', '==', sessionData.student_phone).get();
            if (!snap.empty) {
                // Find matching name or just first match
                doc = snap.docs.find(d => d.data().name.trim().toLowerCase() === sessionData.name.trim().toLowerCase()) || snap.docs[0];
                currentStudentID = doc.id; 
            }
        }

        // Fallback to direct doc fetch if query failed or phone wasn't in session
        if (!doc && currentStudentID) {
            const fallbackDoc = await db.collection('students').doc(currentStudentID).get();
            if (fallbackDoc.exists) doc = fallbackDoc;
        }

        if (doc) {
            const data = doc.data();
            // Cache the retrieved data
            localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
            displayStudentProfile(data);
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

function displayStudentProfile(data) {
    document.getElementById('disp_student_name').textContent = data.name;
    document.getElementById('disp_student_id').textContent = data.studentId || data.student_id || currentStudentID;
    currentStudentClass = data.class || '';
    if (document.getElementById('disp_class')) document.getElementById('disp_class').textContent = currentStudentClass || 'N/A';
    if (document.getElementById('disp_section')) document.getElementById('disp_section').textContent = data.section || 'N/A';
    if (document.getElementById('disp_father_name')) document.getElementById('disp_father_name').textContent = data.fatherName || data.father_name || 'N/A';
    
    // Try loading student photo
    if (data.photo_url) {
        checkPhotoExists(data.photo_url);
    } else if (data.studentId || data.student_id) {
        const photoUrl = `${GITHUB_BASE}/images/students/${data.studentId || data.student_id}.jpg`;
        checkPhotoExists(photoUrl);
    }

    // Initial Result Check
    updateResultLink();
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
    try {
        const docRef = await db.collection('reports').doc(`${currentStudentID}_${year}`).get();
        if (docRef.exists) {
            const pdfData = docRef.data().fileData;
            const className = currentStudentClass; // We need to check if results are published for this class
            
            // NEW: Publication Check
            // We assume 'exams' term for reports is fixed or we fetch the latest term from publications
            // For now, we check if ANY publication exists for this class in this year's exams
            const pubSnap = await db.collection('publications').where('className', '==', className).where('published', '==', true).get();
            
            if (!pubSnap.empty) {
                resultArea.innerHTML = `
                    <a href="${pdfData}" download="ReportCard_${year}.pdf" class="btn-portal btn-primary" style="padding: 0.75rem 1.5rem; font-size: 0.95rem; width: 100%;">
                        <i class="fas fa-download"></i> Download Report Card
                    </a>
                `;
            } else {
                resultArea.innerHTML = `
                    <div style="padding: 0.75rem; background: #fffbeb; border-radius: 0.5rem; color: #b45309; display: flex; align-items: center; gap: 0.5rem; justify-content: center; font-size: 0.9rem;">
                        <i class="fas fa-clock"></i>
                        <span style="font-weight: 600;">Result Processing...</span>
                    </div>
                `;
            }
        } else {
            throw new Error("Not Found");
        }
    } catch (e) {
        resultArea.innerHTML = `
            <div style="padding: 0.75rem; background: #fff1f2; border-radius: 0.5rem; color: #be123c; display: flex; align-items: center; gap: 0.5rem; justify-content: center; font-size: 0.9rem;">
                <i class="fas fa-exclamation-triangle"></i>
                <span style="font-weight: 600;">Not available yet.</span>
            </div>
        `;
    }

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
