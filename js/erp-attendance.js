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

    // Populate session dropdowns for both Marking and Reports
    const sessionSelect = document.getElementById('att_sessionSelect');
    const repSessionSelect = document.getElementById('repAtt_sessionSelect');
    
    if (erpState.sessions) {
        const sessionOptions = '<option value="">Select Session</option>' +
            erpState.sessions
                .map(
                    (s) =>
                        `<option value="${s.id}" data-name="${s.name}" ${s.active ? 'selected' : ''}>${s.name}</option>`
                )
                .join('');
                
        if (sessionSelect) sessionSelect.innerHTML = sessionOptions;
        if (repSessionSelect) repSessionSelect.innerHTML = sessionOptions;

        if (erpState.activeSessionId) {
            await loadAttendanceClasses();
            await loadRepAttClasses(); // Load report classes too
        }
    }

    // Set today's date as default for marking
    const dateInput = document.getElementById('att_dateInput');
    if (dateInput) {
        dateInput.value = attendanceState.selectedDate;
    }
    
    // Set current month as default for reports
    const monthInput = document.getElementById('repAtt_monthInput');
    if (monthInput) {
        const today = new Date();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        monthInput.value = `${yyyy}-${mm}`;
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

// ===================== MONTHLY ATTENDANCE REPORTS =====================

/**
 * Load classes for the selected session in reports view
 */
async function loadRepAttClasses() {
    const sessionSelect = document.getElementById('repAtt_sessionSelect');
    const classSelect = document.getElementById('repAtt_classSelect');
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
        
        classSelect.innerHTML = '<option value="">Select Class</option>' +
            snapshot.docs.map(doc => `<option value="${doc.data().name}" data-id="${doc.id}">${doc.data().name}</option>`).join('');

        const secSelect = document.getElementById('repAtt_sectionSelect');
        if (secSelect) secSelect.innerHTML = '<option value="">All Sections</option>';
    } catch (e) {
        console.error('Error loading report classes:', e);
    }
}

/**
 * Update sections based on selected class in reports view
 */
function updateRepAttSections() {
    const classSelect = document.getElementById('repAtt_classSelect');
    const secSelect = document.getElementById('repAtt_sectionSelect');
    if (!classSelect || !secSelect) return;

    const selectedOption = classSelect.options[classSelect.selectedIndex];
    const classId = selectedOption?.getAttribute('data-id');

    if (!classId) {
        secSelect.innerHTML = '<option value="">All Sections</option>';
        return;
    }

    const cls = erpState.classes.find(c => c.id === classId);
    if (!cls || !cls.sections || cls.sections.length === 0) {
        secSelect.innerHTML = '<option value="">All Sections</option>';
        return;
    }

    secSelect.innerHTML = '<option value="">All Sections</option>' +
        cls.sections.map(sec => `<option value="${sec}">${sec}</option>`).join('');
}

let currentAttendanceReportData = [];

/**
 * Generate monthly attendance report
 */
async function generateAttendanceReport() {
    const sessionSelect = document.getElementById('repAtt_sessionSelect');
    const classSelect = document.getElementById('repAtt_classSelect');
    const secSelect = document.getElementById('repAtt_sectionSelect');
    const monthInput = document.getElementById('repAtt_monthInput');
    const body = document.getElementById('attendanceReportTableBody');
    const summary = document.getElementById('attReportSummary');

    if (!classSelect.value || !monthInput.value) {
        showToast('Please select Session, Class, and Month', 'error');
        return;
    }

    const selectedSession = sessionSelect.options[sessionSelect.selectedIndex].text;
    const selectedClass = classSelect.value;
    const selectedSection = secSelect.value; // Can be empty for "All Sections"
    const selectedMonth = monthInput.value; // Format: "YYYY-MM"

    body.innerHTML = '<tr><td colspan="7" class="text-center"><i class="fas fa-spinner fa-spin"></i> Generating report...</td></tr>';
    summary.classList.add('hidden');

    try {
        setLoading(true);

        // 1. Fetch Students
        let studentQuery = schoolData('students')
            .where('session', '==', selectedSession)
            .where('class', '==', selectedClass);
        
        if (selectedSection) {
            studentQuery = studentQuery.where('section', '==', selectedSection);
        }

        const studentSnap = await studentQuery.get();
        if (studentSnap.empty) {
            body.innerHTML = '<tr><td colspan="7" class="text-center">No students found.</td></tr>';
            return;
        }

        const students = [];
        const studentMap = {};
        studentSnap.forEach(doc => {
            const data = { id: doc.id, ...doc.data() };
            students.push(data);
            studentMap[doc.id] = {
                ...data,
                present: 0,
                absent: 0,
                late: 0,
                leave: 0,
                totalRecorded: 0
            };
        });

        // Sort students by roll number
        students.sort((a, b) => (a.roll_no || 0) - (b.roll_no || 0));

        // 2. Fetch Attendance Records for the given month
        // We find all attendance documents where date starts with "YYYY-MM"
        // Firestore doesn't support 'startsWith' directly in queries across all dates easily if we only have 'date' field
        // Since dates are 'YYYY-MM-DD', we can do: date >= 'YYYY-MM-01' and date <= 'YYYY-MM-31'
        const startDate = `${selectedMonth}-01`;
        const endDate = `${selectedMonth}-31`;

        let attQuery = schoolData('attendance')
            .where('class', '==', selectedClass)
            .where('date', '>=', startDate)
            .where('date', '<=', endDate);

        if (selectedSection) {
            attQuery = attQuery.where('section', '==', selectedSection);
        }

        const attSnap = await attQuery.get();
        
        // Track unique working days
        const workingDaysSet = new Set();

        attSnap.forEach(doc => {
            const record = doc.data();
            workingDaysSet.add(record.date);
            
            if (studentMap[record.studentId]) {
                const s = studentMap[record.studentId];
                s.totalRecorded++;
                if (record.status === 'present') s.present++;
                else if (record.status === 'absent') s.absent++;
                else if (record.status === 'late') s.late++;
                else if (record.status === 'leave') s.leave++;
            }
        });

        const totalWorkingDays = workingDaysSet.size;

        // 3. Prepare data and calculate aggregates
        let totalAttendancePercent = 0;
        let defaultersCount = 0;
        currentAttendanceReportData = [];

        body.innerHTML = students.map(s => {
            const stats = studentMap[s.id];
            // If totalWorkingDays > 0, calculate percentage based on presents + late
            // (Late often counts as half-present or present, we'll count it as present for % here but separate it in UI)
            const attendedDays = stats.present + stats.late;
            const percent = totalWorkingDays > 0 ? Math.round((attendedDays / totalWorkingDays) * 100) : 0;
            
            totalAttendancePercent += percent;
            if (percent < 75 && totalWorkingDays > 0) defaultersCount++;

            currentAttendanceReportData.push({
                'Roll No': s.roll_no || '-',
                'Student Name': s.name,
                'Working Days': totalWorkingDays,
                'Present': stats.present,
                'Absent': stats.absent,
                'Late/Leave': `${stats.late} / ${stats.leave}`,
                'Attendance %': `${percent}%`
            });

            const badgeClass = percent >= 75 ? 'bg-success' : percent >= 60 ? 'bg-amber' : 'bg-danger';

            return `
                <tr>
                    <td>${s.roll_no || '-'}</td>
                    <td><strong>${s.name}</strong></td>
                    <td class="text-center">${totalWorkingDays}</td>
                    <td class="text-center text-success"><b>${stats.present}</b></td>
                    <td class="text-center text-danger"><b>${stats.absent}</b></td>
                    <td class="text-center text-muted">${stats.late} / ${stats.leave}</td>
                    <td class="text-center">
                        <span class="badge ${badgeClass} text-white">${percent}%</span>
                    </td>
                </tr>
            `;
        }).join('');

        // 4. Update Summary Cards
        const avgAtt = students.length > 0 ? Math.round(totalAttendancePercent / students.length) : 0;
        document.getElementById('ar_totalStudents').textContent = students.length;
        document.getElementById('ar_workingDays').textContent = totalWorkingDays;
        document.getElementById('ar_avgAttendance').textContent = `${avgAtt}%`;
        document.getElementById('ar_defaulters').textContent = defaultersCount;
        
        summary.classList.remove('hidden');

    } catch (e) {
        console.error('Error generating attendance report:', e);
        body.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error generating report. Check console.</td></tr>';
        showToast('Failed to generate report', 'error');
    } finally {
        setLoading(false);
    }
}

/**
 * Export current attendance report to Excel
 */
function exportAttendanceReport() {
    if (!currentAttendanceReportData || currentAttendanceReportData.length === 0) {
        showToast('No data to export. Generate a report first.', 'warning');
        return;
    }

    try {
        const classSelect = document.getElementById('repAtt_classSelect').value;
        const monthInput = document.getElementById('repAtt_monthInput').value;
        const filename = `Attendance_Report_${classSelect}_${monthInput}.xlsx`;

        const ws = XLSX.utils.json_to_sheet(currentAttendanceReportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Monthly Attendance");
        
        XLSX.writeFile(wb, filename);
        showToast('Excel report downloaded successfully!', 'success');
    } catch (e) {
        console.error('Export error:', e);
        showToast('Error exporting data', 'error');
    }
}

window.loadRepAttClasses = loadRepAttClasses;
window.updateRepAttSections = updateRepAttSections;
window.generateAttendanceReport = generateAttendanceReport;
window.exportAttendanceReport = exportAttendanceReport;

