/**
 * erp-attendance.js - Attendance Management Logic
 * Part of the Antigravity ERP Suite
 */

let attendanceState = {
    selectedClass: '',
    selectedSection: '',
    selectedSession: '',
    selectedDate: new Date().toISOString().split('T')[0],
    students: [],
    attendanceRecords: {}, // Map of studentId -> status
};

/**
 * Initialize Attendance Module
 */
async function initERPAttendance() {
    console.log('ERP Attendance Initializing...');

    // Populate session dropdown
    const sessionSelect = document.getElementById('att_sessionSelect');
    if (sessionSelect && erpState.sessions) {
        sessionSelect.innerHTML =
            '<option value="">Select Session</option>' +
            erpState.sessions
                .map(
                    (s) =>
                        `<option value="${s.id}" data-name="${s.name}" ${s.active ? 'selected' : ''}>${s.name}</option>`
                )
                .join('');

        if (erpState.activeSessionId) {
            await loadAttendanceClasses();
        }
    }

    // Set today's date as default
    const dateInput = document.getElementById('att_dateInput');
    if (dateInput) {
        dateInput.value = attendanceState.selectedDate;
    }
}

/**
 * Load classes for the selected session in attendance view
 */
async function loadAttendanceClasses() {
    const sessionSelect = document.getElementById('att_sessionSelect');
    const classSelect = document.getElementById('att_classSelect');
    if (!sessionSelect || !classSelect) return;

    const sessionId = sessionSelect.value;
    if (!sessionId) {
        classSelect.innerHTML = '<option value="">Select Session First</option>';
        return;
    }

    try {
        const snapshot = await schoolData('classes')
            .where('sessionId', '==', sessionId)
            .orderBy('sortOrder', 'asc')
            .get();
        const classes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        classSelect.innerHTML =
            '<option value="">Select Class</option>' +
            classes.map((cls) => `<option value="${cls.name}" data-id="${cls.id}">${cls.name}</option>`).join('');

        // Reset section select
        const secSelect = document.getElementById('att_sectionSelect');
        if (secSelect) secSelect.innerHTML = '<option value="">Select Class First</option>';
    } catch (e) {
        console.error('Error loading attendance classes:', e);
    }
}

/**
 * Update sections based on selected class
 */
function updateAttendanceSections() {
    const classSelect = document.getElementById('att_classSelect');
    const secSelect = document.getElementById('att_sectionSelect');
    if (!classSelect || !secSelect) return;

    const selectedOption = classSelect.options[classSelect.selectedIndex];
    const classId = selectedOption?.getAttribute('data-id');

    if (!classId) {
        secSelect.innerHTML = '<option value="">Select Class First</option>';
        return;
    }

    // Find class in erpState (it should be loaded already by loadAttendanceClasses or initial erp load)
    const cls = erpState.classes.find((c) => c.id === classId);
    if (!cls || !cls.sections || cls.sections.length === 0) {
        secSelect.innerHTML = '<option value="">No Sections</option>';
        return;
    }

    secSelect.innerHTML =
        '<option value="">Select Section</option>' +
        cls.sections.map((sec) => `<option value="${sec}">${sec}</option>`).join('');
}

/**
 * Load students for marking attendance
 */
async function loadStudentsForAttendance() {
    const sessionSelect = document.getElementById('att_sessionSelect');
    const classSelect = document.getElementById('att_classSelect');
    const secSelect = document.getElementById('att_sectionSelect');
    const dateInput = document.getElementById('att_dateInput');
    const body = document.getElementById('attendanceTableBody');

    if (!classSelect.value || !secSelect.value || !dateInput.value) {
        showToast('Please select Session, Class, Section and Date', 'info');
        return;
    }

    attendanceState.selectedSession = sessionSelect.options[sessionSelect.selectedIndex].text;
    attendanceState.selectedClass = classSelect.value;
    attendanceState.selectedSection = secSelect.value;
    attendanceState.selectedDate = dateInput.value;

    body.innerHTML =
        '<tr><td colspan="4" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Fetching students...</td></tr>';

    try {
        showLoading(true);

        // 1. Fetch students
        const studentSnap = await schoolData('students')
            .where('session', '==', attendanceState.selectedSession)
            .where('class', '==', attendanceState.selectedClass)
            .where('section', '==', attendanceState.selectedSection)
            .get();

        attendanceState.students = studentSnap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => (a.roll_no || 0) - (b.roll_no || 0));

        if (attendanceState.students.length === 0) {
            body.innerHTML =
                '<tr><td colspan="4" style="text-align:center;">No students found for this selection.</td></tr>';
            return;
        }

        // 2. Fetch existing attendance for this date
        const attendanceSnap = await schoolData('attendance')
            .where('date', '==', attendanceState.selectedDate)
            .where('class', '==', attendanceState.selectedClass)
            .where('section', '==', attendanceState.selectedSection)
            .get();

        const existingRecords = {};
        attendanceSnap.forEach((doc) => {
            const data = doc.data();
            existingRecords[data.studentId] = data.status;
        });

        attendanceState.attendanceRecords = existingRecords;

        // 3. Render
        renderAttendanceTable();
    } catch (e) {
        console.error('Error loading attendance data:', e);
        showToast('Error loading students', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Render attendance marking table
 */
function renderAttendanceTable() {
    const body = document.getElementById('attendanceTableBody');
    if (!body) return;

    body.innerHTML = attendanceState.students
        .map((s) => {
            const status = attendanceState.attendanceRecords[s.id] || 'present';
            return `
            <tr>
                <td>${s.roll_no || '-'}</td>
                <td><strong>${s.name}</strong></td>
                <td>
                    <div class="attendance-options">
                        <label class="att-opt p">
                            <input type="radio" name="att_${s.id}" value="present" ${status === 'present' ? 'checked' : ''} onchange="updateRecordLocal('${s.id}', 'present')">
                            <span>P</span>
                        </label>
                        <label class="att-opt a">
                            <input type="radio" name="att_${s.id}" value="absent" ${status === 'absent' ? 'checked' : ''} onchange="updateRecordLocal('${s.id}', 'absent')">
                            <span>A</span>
                        </label>
                        <label class="att-opt l">
                            <input type="radio" name="att_${s.id}" value="late" ${status === 'late' ? 'checked' : ''} onchange="updateRecordLocal('${s.id}', 'late')">
                            <span>L</span>
                        </label>
                        <label class="att-opt lv">
                            <input type="radio" name="att_${s.id}" value="leave" ${status === 'leave' ? 'checked' : ''} onchange="updateRecordLocal('${s.id}', 'leave')">
                            <span>LE</span>
                        </label>
                    </div>
                </td>
                <td id="sync_${s.id}">
                    ${attendanceState.attendanceRecords[s.id] ? '<i class="fas fa-check-circle" style="color:#10b981;"></i>' : '<i class="fas fa-clock" style="color:#94a3b8; opacity:0.5;"></i>'}
                </td>
            </tr>
        `;
        })
        .join('');
}

function updateRecordLocal(studentId, status) {
    attendanceState.attendanceRecords[studentId] = status;
    const syncIcon = document.getElementById(`sync_${studentId}`);
    if (syncIcon) syncIcon.innerHTML = '<i class="fas fa-circle-notch fa-spin" style="color:var(--primary);"></i>';
}

/**
 * Save all attendance records
 */
async function saveAttendance() {
    if (attendanceState.students.length === 0) return;

    try {
        showLoading(true);
        const batch = db.batch();
        const date = attendanceState.selectedDate;
        const className = attendanceState.selectedClass;
        const section = attendanceState.selectedSection;

        // We need to delete existing records for this class/section/date first to avoid duplicates
        // However, a simpler way is to use a deterministic docId: studentId_date

        for (const student of attendanceState.students) {
            const status = attendanceState.attendanceRecords[student.id] || 'present';
            const docId = `${student.id}_${date}`;
            const ref = schoolDoc('attendance', docId);

            batch.set(
                ref,
                withSchool({
                    studentId: student.id,
                    studentName: student.name,
                    rollNo: student.roll_no || '',
                    class: className,
                    section: section,
                    date: date,
                    status: status,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                })
            );
        }

        await batch.commit();
        showToast('Attendance saved successfully!', 'success');
        renderAttendanceTable(); // Re-render to show updated sync icons
    } catch (e) {
        console.error('Error saving attendance:', e);
        showToast('Error saving attendance', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Mark all students as present
 */
function markAllPresent() {
    attendanceState.students.forEach((s) => {
        attendanceState.attendanceRecords[s.id] = 'present';
        const radio = document.querySelector(`input[name="att_${s.id}"][value="present"]`);
        if (radio) radio.checked = true;
        const syncIcon = document.getElementById(`sync_${s.id}`);
        if (syncIcon) syncIcon.innerHTML = '<i class="fas fa-circle-notch fa-spin" style="color:var(--primary);"></i>';
    });
}

// Hook into window for HTML events
window.initERPAttendance = initERPAttendance;
window.loadAttendanceClasses = loadAttendanceClasses;
window.updateAttendanceSections = updateAttendanceSections;
window.loadStudentsForAttendance = loadStudentsForAttendance;
window.saveAttendance = saveAttendance;
window.markAllPresent = markAllPresent;
window.updateRecordLocal = updateRecordLocal;
