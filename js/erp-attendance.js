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
        const sessionOptions =
            '<option value="">Select Session</option>' +
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
    const monthSelect = document.getElementById('repAtt_monthSelect');
    if (monthSelect) {
        const today = new Date();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        monthSelect.value = mm;
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

        classSelect.innerHTML =
            '<option value="">Select Class</option>' +
            snapshot.docs
                .map((doc) => `<option value="${doc.data().name}" data-id="${doc.id}">${doc.data().name}</option>`)
                .join('');

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

    const cls = erpState.classes.find((c) => c.id === classId);
    if (!cls || !cls.sections || cls.sections.length === 0) {
        secSelect.innerHTML = '<option value="">All Sections</option>';
        return;
    }

    secSelect.innerHTML =
        '<option value="">All Sections</option>' +
        cls.sections.map((sec) => `<option value="${sec}">${sec}</option>`).join('');
}

let currentAttendanceReportData = [];

/**
 * Toggle attendance date fields based on report type
 */
function toggleAttendanceDateFields() {
    const reportType = document.getElementById('repAtt_reportType')?.value || 'monthly';
    const monthContainer = document.getElementById('monthSelectContainer');
    const dayContainer = document.getElementById('daySelectContainer');
    const startDateContainer = document.getElementById('dateRangeStartContainer');
    const endDateContainer = document.getElementById('dateRangeEndContainer');

    // Hide all first
    monthContainer.classList.add('hidden');
    dayContainer.classList.add('hidden');
    startDateContainer.classList.add('hidden');
    endDateContainer.classList.add('hidden');

    if (reportType === 'monthly') {
        monthContainer.classList.remove('hidden');
    } else if (reportType === 'daily') {
        monthContainer.classList.remove('hidden');
        dayContainer.classList.remove('hidden');
        populateDays();
    } else if (reportType === 'dateRange') {
        startDateContainer.classList.remove('hidden');
        endDateContainer.classList.remove('hidden');
    }
}

function populateDays() {
    const monthSelect = document.getElementById('repAtt_monthSelect');
    const daySelect = document.getElementById('repAtt_daySelect');

    if (!monthSelect.value) {
        daySelect.innerHTML = '<option value="">Select Month First</option>';
        return;
    }

    const year = new Date().getFullYear();
    const month = parseInt(monthSelect.value);
    const daysInMonth = new Date(year, month, 0).getDate();

    let options = '<option value="">Select Day</option>';
    for (let i = 1; i <= daysInMonth; i++) {
        options += `<option value="${i.toString().padStart(2, '0')}">${i}</option>`;
    }
    daySelect.innerHTML = options;
}

/**
 * Generate attendance report (monthly, daily, or date range)
 */
async function generateAttendanceReport() {
    const sessionSelect = document.getElementById('repAtt_sessionSelect');
    const classSelect = document.getElementById('repAtt_classSelect');
    const secSelect = document.getElementById('repAtt_sectionSelect');
    const reportType = document.getElementById('repAtt_reportType')?.value || 'monthly';
    const monthSelect = document.getElementById('repAtt_monthSelect');
    const daySelect = document.getElementById('repAtt_daySelect');
    const startDateInput = document.getElementById('repAtt_startDate');
    const endDateInput = document.getElementById('repAtt_endDate');
    const body = document.getElementById('attendanceReportTableBody');
    const summary = document.getElementById('attReportSummary');

    if (!classSelect.value) {
        showToast('Please select Class', 'error');
        return;
    }

    // Determine date range based on report type
    let startDate, endDate, reportTitle;

    if (reportType === 'monthly') {
        if (!monthSelect.value) {
            showToast('Please select a month', 'error');
            return;
        }
        const year = new Date().getFullYear();
        startDate = `${year}-${monthSelect.value}-01`;
        const daysInMonth = new Date(year, parseInt(monthSelect.value), 0).getDate();
        endDate = `${year}-${monthSelect.value}-${daysInMonth.toString().padStart(2, '0')}`;
        const monthNames = [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
        ];
        reportTitle = `${monthNames[parseInt(monthSelect.value) - 1]} ${year}`;
    } else if (reportType === 'daily') {
        if (!monthSelect.value || !daySelect.value) {
            showToast('Please select month and day', 'error');
            return;
        }
        const year = new Date().getFullYear();
        startDate = `${year}-${monthSelect.value}-${daySelect.value}`;
        endDate = startDate;
        reportTitle = `${daySelect.value}/${monthSelect.value}/${year}`;
    } else if (reportType === 'dateRange') {
        if (!startDateInput.value || !endDateInput.value) {
            showToast('Please select start and end dates', 'error');
            return;
        }
        startDate = startDateInput.value;
        endDate = endDateInput.value;
        reportTitle = `${startDate} to ${endDate}`;
    }

    const selectedSession = sessionSelect.options[sessionSelect.selectedIndex]?.text || '';
    const selectedClass = classSelect.value;
    const selectedSection = secSelect.value;

    body.innerHTML =
        '<tr><td colspan="7" class="text-center"><i class="fas fa-spinner fa-spin"></i> Generating report...</td></tr>';
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
        studentSnap.forEach((doc) => {
            const data = { id: doc.id, ...doc.data() };
            students.push(data);
            studentMap[doc.id] = {
                ...data,
                present: 0,
                absent: 0,
                late: 0,
                leave: 0,
                totalRecorded: 0,
            };
        });

        // Sort students by roll number
        students.sort((a, b) => (a.roll_no || 0) - (b.roll_no || 0));

        // 2. Fetch Attendance Records for the date range
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

        attSnap.forEach((doc) => {
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
        const isSingleDay = startDate === endDate;

        body.innerHTML = students
            .map((s) => {
                const stats = studentMap[s.id];
                const attendedDays = stats.present + stats.late;
                const percent = totalWorkingDays > 0 ? Math.round((attendedDays / totalWorkingDays) * 100) : 0;

                totalAttendancePercent += percent;
                if (percent < 75 && totalWorkingDays > 0) defaultersCount++;

                currentAttendanceReportData.push({
                    'Roll No': s.roll_no || '-',
                    'Student Name': s.name,
                    'Working Days': totalWorkingDays,
                    Present: stats.present,
                    Absent: stats.absent,
                    'Late/Leave': `${stats.late} / ${stats.leave}`,
                    'Attendance %': `${percent}%`,
                });

                const badgeClass = percent >= 75 ? 'bg-success' : percent >= 60 ? 'bg-amber' : 'bg-danger';

                // For single day view, show status instead of percentage
                if (isSingleDay) {
                    const status =
                        stats.totalRecorded > 0
                            ? stats.present > 0
                                ? 'Present'
                                : stats.late > 0
                                  ? 'Late'
                                  : stats.leave > 0
                                    ? 'Leave'
                                    : 'Absent'
                            : 'Not Marked';
                    const statusClass =
                        status === 'Present'
                            ? 'text-success'
                            : status === 'Late' || status === 'Leave'
                              ? 'text-amber'
                              : status === 'Absent'
                                ? 'text-danger'
                                : 'text-muted';

                    return `
                    <tr>
                        <td>${s.roll_no || '-'}</td>
                        <td><strong>${s.name}</strong></td>
                        <td class="text-center">${totalWorkingDays}</td>
                        <td class="text-center text-success"><b>${stats.present}</b></td>
                        <td class="text-center text-danger"><b>${stats.absent}</b></td>
                        <td class="text-center text-muted">${stats.late} / ${stats.leave}</td>
                        <td class="text-center">
                            <span class="${statusClass} font-600">${status}</span>
                        </td>
                    </tr>
                `;
                }

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
            })
            .join('');

        // 4. Update Summary Cards
        const avgAtt = students.length > 0 ? Math.round(totalAttendancePercent / students.length) : 0;
        document.getElementById('ar_totalStudents').textContent = students.length;
        document.getElementById('ar_workingDays').textContent = totalWorkingDays;
        document.getElementById('ar_avgAttendance').textContent = isSingleDay ? '-' : `${avgAtt}%`;
        document.getElementById('ar_defaulters').textContent = isSingleDay ? '-' : defaultersCount;

        summary.classList.remove('hidden');
    } catch (e) {
        console.error('Error generating attendance report:', e);
        body.innerHTML =
            '<tr><td colspan="7" class="text-center text-danger">Error generating report. Check console.</td></tr>';
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
        const reportType = document.getElementById('repAtt_reportType')?.value || 'monthly';
        let dateStr = '';

        if (reportType === 'monthly') {
            const monthSelect = document.getElementById('repAtt_monthSelect');
            dateStr = monthSelect.value || 'month';
        } else if (reportType === 'daily') {
            const daySelect = document.getElementById('repAtt_daySelect');
            dateStr = daySelect.value || 'day';
        } else {
            const startDate = document.getElementById('repAtt_startDate').value;
            const endDate = document.getElementById('repAtt_endDate').value;
            dateStr = `${startDate}_${endDate}`;
        }

        const filename = `Attendance_Report_${classSelect}_${dateStr}.xlsx`;

        const ws = XLSX.utils.json_to_sheet(currentAttendanceReportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');

        XLSX.writeFile(wb, filename);
        showToast('Excel report downloaded successfully!', 'success');
    } catch (e) {
        console.error('Export error:', e);
        showToast('Error exporting data', 'error');
    }
}

// Export functions to window
window.toggleAttendanceDateFields = toggleAttendanceDateFields;
window.populateDays = populateDays;
window.generateAttendanceReport = generateAttendanceReport;
window.exportAttendanceReport = exportAttendanceReport;

/**
 * Download an Excel template for attendance marking with student names
 */
async function downloadAttendanceTemplate() {
    const classVal = document.getElementById('att_classSelect').value;
    const sectionVal = document.getElementById('att_sectionSelect').value;
    const sessionVal = document.getElementById('att_sessionSelect').value;

    if (!classVal || !sectionVal || !sessionVal) {
        showToast('Please select Session, Class and Section first', 'warning');
        return;
    }

    try {
        showToast('Preparing template...', 'info');

        // Fetch students for the selected class/section
        const snapshot = await schoolData('students')
            .where('currentClass', '==', classVal)
            .where('currentSection', '==', sectionVal)
            .where('status', '==', 'active')
            .get();

        if (snapshot.empty) {
            showToast('No active students found for this class/section', 'warning');
            return;
        }

        const students = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                'Roll No': data.rollNo || '',
                'Student Name': data.name || '',
                'Attendance (P/A/L)': 'P', // Default to Present
                'Student ID': doc.id, // Hidden column or just for context
            };
        });

        // Sort by Roll No if available, else Name
        students.sort((a, b) => {
            if (a['Roll No'] && b['Roll No']) return a['Roll No'] - b['Roll No'];
            return a['Student Name'].localeCompare(b['Student Name']);
        });

        const ws = XLSX.utils.json_to_sheet(students);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Attendance Sheet');

        const filename = `Attendance_Template_${classVal}_${sectionVal}.xlsx`;
        XLSX.writeFile(wb, filename);
        showToast('Template downloaded! Fill it and upload back.', 'success');
    } catch (e) {
        console.error('Error downloading template:', e);
        showToast('Error generating template', 'error');
    }
}

/**
 * Handle Excel upload and update attendance state
 */
async function handleAttendanceExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);

            if (!jsonData || jsonData.length === 0) {
                showToast('The Excel file is empty', 'warning');
                return;
            }

            showToast('Processing attendance data...', 'info');

            // Find matching students in the current view or DB
            // We'll update the attendanceRecords map
            let matchedCount = 0;
            const statusMap = { P: 'present', A: 'absent', L: 'late' };

            for (const row of jsonData) {
                const studentId = row['Student ID'];
                let status = row['Attendance (P/A/L)'] || 'P';
                status = status.toUpperCase().trim();

                if (studentId && statusMap[status]) {
                    attendanceState.attendanceRecords[studentId] = statusMap[status];
                    matchedCount++;
                }
            }

            // Update UI
            renderAttendanceTable();
            showToast(`Successfully matched ${matchedCount} records. Click "Save Attendance" to commit.`, 'success');

            // Reset input
            event.target.value = '';
        } catch (err) {
            console.error('Excel processing error:', err);
            showToast('Error processing file. Please ensure it follows the template.', 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

window.loadRepAttClasses = loadRepAttClasses;
window.updateRepAttSections = updateRepAttSections;
window.generateAttendanceReport = generateAttendanceReport;
window.exportAttendanceReport = exportAttendanceReport;
window.downloadAttendanceTemplate = downloadAttendanceTemplate;
window.handleAttendanceExcelUpload = handleAttendanceExcelUpload;
