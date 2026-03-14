/**
 * ERP EXAMS MODULE
 * Handles Exam Terms, Grading Rules, Schedules, and Marks Entry
 */

let examState = {
    gradingRules: [],
    exams: [],
    activeSessionId: null
};

async function initERPExams() {
    console.log("ERP Exams Initializing...");
    try {
        const sessionSnap = await db.collection('sessions').orderBy('name', 'desc').get();
        const sessions = sessionSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const active = sessions.find(s => s.active);
        if (active) examState.activeSessionId = active.id;

        // Populate session dropdowns in Exam, Marks, Manage Results, and Publish sections
        const sessionDropdowns = ['examSessionSelect', 'marksSessionSelect', 'manageResultsSession', 'publishSessionSelect'];
        sessionDropdowns.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = '<option value="">Select Session</option>' + 
                    sessions.map(s => `<option value="${s.id}" ${s.id === examState.activeSessionId ? 'selected' : ''}>${s.name}</option>`).join('');
            }
        });

        if (examState.activeSessionId) {
            await Promise.all([
                loadGradingRules(),
                loadExams(),
                loadViewScheduleGrid()
            ]);
            // For Schedule
            updateScheduleClasses();
            refreshPublishStatus();
            loadManageResultsClasses();
        }
    } catch (e) {
        console.error("Exam init error:", e);
    }
}

async function updateScheduleClasses() {
    if (!examState.activeSessionId) return;
    const el = document.getElementById('scheduleClassSelect');
    if (!el) return;
    try {
        const snap = await db.collection('classes').where('sessionId', '==', examState.activeSessionId).orderBy('sortOrder', 'asc').get();
        const classes = snap.docs.map(doc => doc.data().name);
        el.innerHTML = '<option value="">Select Class</option>' + 
            classes.map(c => `<option value="${c}">${c}</option>`).join('');
    } catch (e) { console.error(e); }
}

/**
 * GRADING RULES
 */
async function loadGradingRules() {
    const body = document.getElementById('gradingTableBody');
    if (!body) return;

    try {
        const snapshot = await db.collection('gradingRules').orderBy('min', 'desc').get();
        examState.gradingRules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderGradingRules();
    } catch (e) {
        console.error("Error loading grades:", e);
    }
}

function renderGradingRules() {
    const body = document.getElementById('gradingTableBody');
    if (!body) return;

    body.innerHTML = examState.gradingRules.map(rule => `
        <tr>
            <td><strong>${rule.name}</strong></td>
            <td>${rule.min}% - ${rule.max}%</td>
            <td>${rule.remarks || '-'}</td>
            <td>
                <button onclick="deleteGradingRule('${rule.id}')" class="btn-portal btn-ghost" style="color:var(--danger); border-color:var(--danger); padding:0.25rem 0.5rem; font-size:0.7rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function handleGradingSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('gradeNameInput').value.trim();
    const min = parseFloat(document.getElementById('gradeMinInput').value);
    const max = parseFloat(document.getElementById('gradeMaxInput').value);
    const remarks = document.getElementById('gradeRemarksInput').value.trim();

    try {
        showLoading(true);
        await db.collection('gradingRules').add({
            name, min, max, remarks,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast("Grading rule saved", "success");
        document.getElementById('addGradingForm').reset();
        await loadGradingRules();
    } catch (e) {
        showToast("Error saving rule", "error");
    } finally {
        showLoading(false);
    }
}

async function deleteGradingRule(id) {
    if (!confirm("Delete this grading rule?")) return;
    try {
        showLoading(true);
        await db.collection('gradingRules').doc(id).delete();
        await loadGradingRules();
    } catch (e) {
        showToast("Error deleting rule", "error");
    } finally {
        showLoading(false);
    }
}

/**
 * EXAM TERMS
 */
async function loadExams() {
    if (!examState.activeSessionId) return;
    const body = document.getElementById('examsTableBody');
    if (!body) return;

    try {
        const snapshot = await db.collection('exams')
            .where('sessionId', '==', examState.activeSessionId)
            .get();
        examState.exams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderExams();
        updateExamSelects();
    } catch (e) {
        console.error("Error loading exams:", e);
    }
}

function renderExams() {
    const body = document.getElementById('examsTableBody');
    if (!body) return;

    body.innerHTML = examState.exams.map(ex => `
        <tr>
            <td><strong>${ex.name}</strong></td>
            <td>${ex.weightage}%</td>
            <td>
                <button onclick="deleteExam('${ex.id}')" class="btn-portal btn-ghost" style="color:var(--danger); border-color:var(--danger); padding:0.25rem 0.5rem; font-size:0.7rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function handleExamSubmit(event) {
    event.preventDefault();
    const sessionId = document.getElementById('examSessionSelect').value;
    const name = document.getElementById('examNameInput').value.trim();
    const weightage = parseFloat(document.getElementById('examWeightageInput').value);

    if (!sessionId) {
        showToast("Please select a session", "error");
        return;
    }

    try {
        showLoading(true);
        await db.collection('exams').add({
            name, sessionId, weightage,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast("Exam term created", "success");
        document.getElementById('addExamForm').reset();
        await loadExams();
    } catch (e) {
        showToast("Error creating exam", "error");
    } finally {
        showLoading(false);
    }
}

async function deleteExam(id) {
    if (!confirm("Delete this exam term?")) return;
    try {
        showLoading(true);
        await db.collection('exams').doc(id).delete();
        await loadExams();
    } catch (e) {
        showToast("Error deleting exam", "error");
    } finally {
        showLoading(false);
    }
}

function updateExamSelects() {
    const selects = ['scheduleExamSelect', 'marksExamSelect', 'manageResultsExam', 'publishExamSelect'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = '<option value="">Select Exam</option>' + 
                examState.exams.map(ex => `<option value="${ex.id}">${ex.name}</option>`).join('');
        }
    });
}

/**
 * EXAM SCHEDULE
 */
async function loadViewScheduleGrid() {
    const body = document.getElementById('viewScheduleTableBody');
    if (!body) return;

    try {
        const snap = await db.collection('schedules').orderBy('date', 'asc').get();
        if (snap.empty) {
            body.innerHTML = '<tr><td colspan="7" style="text-align:center;">No schedules found.</td></tr>';
            return;
        }

        const subjectsSnap = await db.collection('subjects').get();
        const subjects = {};
        subjectsSnap.forEach(doc => subjects[doc.id] = doc.data().name);

        body.innerHTML = snap.docs.map(doc => {
            const d = doc.data();
            const exam = examState.exams.find(e => e.id === d.examId)?.name || 'Unknown';
            return `
                <tr>
                    <td>${exam}</td>
                    <td>${d.className}</td>
                    <td>${subjects[d.subjectId] || d.subjectId}</td>
                    <td>${d.date}</td>
                    <td>${d.time}</td>
                    <td>${d.duration} Min</td>
                    <td>${d.maxMarks}</td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error(e);
    }
}

async function saveExamSchedule() {
    const examId = document.getElementById('scheduleExamSelect').value;
    const className = document.getElementById('scheduleClassSelect').value;
    if (!examId || !className) return;

    const rows = document.querySelectorAll('#scheduleTableBody tr');
    const batch = db.batch();

    try {
        setLoading(true);
        for (const row of rows) {
            const subjectId = row.dataset.subjectId;
            const date = row.querySelector('.sched-date').value;
            const time = row.querySelector('.sched-time').value;
            const duration = row.querySelector('.sched-duration').value;
            const maxMarks = row.querySelector('.sched-max').value;

            if (date) {
                const docId = `${examId}_${className}_${subjectId}`;
                const ref = db.collection('schedules').doc(docId);
                batch.set(ref, {
                    examId, className, subjectId, date, time, duration, maxMarks,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        await batch.commit();
        showToast("Schedule saved successfully", "success");
        await loadViewScheduleGrid();
    } catch (e) {
        showToast("Error saving schedule", "error");
    } finally {
        setLoading(false);
    }
}

/**
 * BULK MARKS ENTRY
 */
async function loadMarksClasses() {
    const sessionId = document.getElementById('marksSessionSelect').value;
    const el = document.getElementById('marksClassSelect');
    if (!el || !sessionId) return;

    try {
        const snap = await db.collection('classes').where('sessionId', '==', sessionId).orderBy('sortOrder', 'asc').get();
        const classes = snap.docs.map(doc => doc.data().name);
        el.innerHTML = '<option value="">Select Class</option>' + 
            classes.map(c => `<option value="${c}">${c}</option>`).join('');
    } catch (e) { console.error(e); }
}

async function loadMarksSections() {
    const className = document.getElementById('marksClassSelect').value;
    const sessionId = document.getElementById('marksSessionSelect').value;
    const el = document.getElementById('marksSectionSelect');
    if (!el || !className || !sessionId) return;

    try {
        const classSnap = await db.collection('classes')
            .where('sessionId', '==', sessionId)
            .where('name', '==', className)
            .limit(1).get();
        
        if (!classSnap.empty) {
            const sections = classSnap.docs[0].data().sections || [];
            el.innerHTML = '<option value="">Select Section</option>' + 
                sections.map(s => `<option value="${s}">${s}</option>`).join('');
        }
    } catch (e) { console.error(e); }
}

async function loadMarksSubjects() {
    const sessionId = document.getElementById('marksSessionSelect').value;
    const el = document.getElementById('marksSubjectSelect');
    if (!el || !sessionId) return;

    try {
        const snap = await db.collection('subjects').where('sessionId', '==', sessionId).get();
        const subjects = snap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        el.innerHTML = '<option value="">Select Subject</option>' + 
            subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    } catch (e) { console.error(e); }
}

async function refreshMarksGrid() {
    const sessionId = document.getElementById('marksSessionSelect').value;
    const sessionName = document.getElementById('marksSessionSelect').options[document.getElementById('marksSessionSelect').selectedIndex]?.text;
    const className = document.getElementById('marksClassSelect').value;
    const sectionName = document.getElementById('marksSectionSelect').value;
    const examId = document.getElementById('marksExamSelect').value;
    const subjectId = document.getElementById('marksSubjectSelect').value;
    const body = document.getElementById('marksGridTableBody');

    if (!body || !className || !sectionName || !examId || !subjectId) {
        if (body) body.innerHTML = '';
        return;
    }

    body.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading students...</td></tr>';

    try {
        const studentsSnap = await db.collection('students')
            .where('class', '==', className)
            .where('section', '==', sectionName)
            .where('session', '==', sessionName)
            .get();
        
        const students = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Load existing marks
        const marksSnap = await db.collection('marks')
            .where('examId', '==', examId)
            .where('subjectId', '==', subjectId)
            .where('className', '==', className)
            .where('sectionName', '==', sectionName)
            .get();
        
        const existingMarks = {};
        marksSnap.forEach(doc => {
            existingMarks[doc.data().studentId] = doc.data();
        });

        if (students.length === 0) {
            body.innerHTML = '<tr><td colspan="4" style="text-align:center;">No students found.</td></tr>';
            return;
        }

        body.innerHTML = students.map(s => `
            <tr data-student-id="${s.id}">
                <td>${s.roll_no || '-'}</td>
                <td><strong>${s.name}</strong></td>
                <td><input type="number" class="marks-input" value="${existingMarks[s.id]?.obtained || ''}" placeholder="0"></td>
                <td>
                    <select class="status-select">
                        <option value="P" ${existingMarks[s.id]?.status === 'P' ? 'selected' : ''}>Present</option>
                        <option value="A" ${existingMarks[s.id]?.status === 'A' ? 'selected' : ''}>Absent</option>
                    </select>
                </td>
            </tr>
        `).join('');

    } catch (e) {
        console.error(e);
        body.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--danger);">Error loading marks grid.</td></tr>';
    }
}

async function saveMarksGrid() {
    const examId = document.getElementById('marksExamSelect').value;
    const subjectId = document.getElementById('marksSubjectSelect').value;
    const className = document.getElementById('marksClassSelect').value;
    const sectionName = document.getElementById('marksSectionSelect').value;
    const sessionId = document.getElementById('marksSessionSelect').value;

    if (!examId || !subjectId || !className || !sectionName) return;

    const rows = document.querySelectorAll('#marksGridTableBody tr');
    const batch = db.batch();

    try {
        showLoading(true);
        for (const row of rows) {
            const studentId = row.dataset.studentId;
            const obtained = row.querySelector('.marks-input').value;
            const status = row.querySelector('.status-select').value;

            if (studentId) {
                const docId = `${examId}_${subjectId}_${studentId}`;
                const ref = db.collection('marks').doc(docId);
                batch.set(ref, {
                    examId, subjectId, studentId, className, sectionName, sessionId,
                    obtained: obtained ? parseFloat(obtained) : 0,
                    status,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        await batch.commit();
        showToast("Marks saved successfully", "success");
    } catch (e) {
        showToast("Error saving marks", "error");
    } finally {
        showLoading(false);
    }
}

function handleMarksExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        // Map Excel data to grid
        const rows = document.querySelectorAll('#marksGridTableBody tr');
        rows.forEach(row => {
            const studentName = row.cells[1].innerText.trim();
            const excelRow = jsonData.find(j => 
                (j.Name && j.Name.toString().trim() === studentName) || 
                (j['Student Name'] && j['Student Name'].toString().trim() === studentName)
            );
            if (excelRow) {
                const marksVal = excelRow.Marks || excelRow.Obtained || excelRow['Marks Obtained'];
                if (marksVal !== undefined) {
                    row.querySelector('.marks-input').value = marksVal;
                }
            }
        });
        showToast("Excel data mapped to grid. Click 'Save' to commit.", "info");
    };
    reader.readAsArrayBuffer(file);
}

/**
 * DOCUMENT GENERATION (Hall Tickets & Attendance Cards)
 */
async function generateHallTickets() {
    const examId = document.getElementById('marksExamSelect').value;
    const className = document.getElementById('marksClassSelect').value;
    const sessionName = document.getElementById('marksSessionSelect').options[document.getElementById('marksSessionSelect').selectedIndex]?.text;

    if (!examId || !className) {
        showToast("Select Exam and Class first", "error");
        return;
    }

    try {
        showLoading(true);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Load students
        const studentsSnap = await db.collection('students')
            .where('class', '==', className)
            .where('session', '==', sessionName)
            .get();
        const students = studentsSnap.docs.map(d => d.data());

        // Load schedule
        const schedSnap = await db.collection('schedules')
            .where('examId', '==', examId)
            .where('className', '==', className)
            .get();
        const schedule = schedSnap.docs.map(d => d.data());

        if (students.length === 0) {
            showToast("No students found in this class", "error");
            return;
        }

        students.forEach((student, index) => {
            if (index > 0) doc.addPage();

            // Header
            doc.setFontSize(18);
            doc.setTextColor(40);
            doc.text("APEX PUBLIC SCHOOL", 105, 20, { align: "center" });
            doc.setFontSize(14);
            doc.text(`EXAM ADMIT CARD - ${sessionName}`, 105, 30, { align: "center" });

            doc.setDrawColor(0);
            doc.line(20, 35, 190, 35);

            // Student Info
            doc.setFontSize(12);
            doc.text(`Name: ${student.name}`, 20, 50);
            doc.text(`Roll No: ${student.roll_no || '-'}`, 120, 50);
            doc.text(`Class: ${student.class}`, 20, 60);
            doc.text(`Section: ${student.section || '-'}`, 120, 60);
            doc.text(`Exam: ${examState.exams.find(e => e.id === examId)?.name}`, 20, 70);

            // Schedule Table
            const body = schedule.map(s => [
                examState.gradingRules.find(g => false) || '-', // Placeholder for subject name lookup if needed, but we have subjectId
                s.date,
                s.time,
                s.duration + ' min'
            ]);
            
            // Note: In a real app we'd fetch subject names here too.
            // For now, let's just use doc.autoTable if available
            if (doc.autoTable) {
                doc.autoTable({
                    startY: 80,
                    head: [['Subject', 'Date', 'Time', 'Duration']],
                    body: schedule.map(s => ['Subject ID: ' + s.subjectId, s.date, s.time, s.duration]),
                });
            }

            // Footer
            const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 150;
            doc.text("Principal's Signature", 140, finalY);
        });

        doc.save(`Admit_Cards_${className}.pdf`);
        showToast("Admit cards generated", "success");
    } catch (e) {
        console.error(e);
        showToast("Error generating PDF", "error");
    } finally {
        showLoading(false);
    }
}

// Exports to window
/**
 * MANAGE RESULTS (BIRDS EYE VIEW)
 */
async function loadManageResultsClasses() {
    const sessionId = document.getElementById('manageResultsSession').value;
    const el = document.getElementById('manageResultsClass');
    if (!el || !sessionId) return;
    try {
        const snap = await db.collection('classes').where('sessionId', '==', sessionId).orderBy('sortOrder', 'asc').get();
        el.innerHTML = '<option value="">Select Class</option>' + 
            snap.docs.map(doc => `<option value="${doc.data().name}">${doc.data().name}</option>`).join('');
    } catch (e) { console.error(e); }
}

async function loadManageResultsSections() {
    const className = document.getElementById('manageResultsClass').value;
    const sessionId = document.getElementById('manageResultsSession').value;
    const el = document.getElementById('manageResultsSectionSelect');
    if (!el || !className || !sessionId) return;
    try {
        const snap = await db.collection('classes').where('sessionId', '==', sessionId).where('name', '==', className).limit(1).get();
        if (!snap.empty) {
            const sections = snap.docs[0].data().sections || [];
            el.innerHTML = '<option value="">Select Section</option>' + sections.map(s => `<option value="${s}">${s}</option>`).join('');
        }
    } catch (e) { console.error(e); }
}

async function loadManageResultsSubjects() {
    const sessionId = document.getElementById('manageResultsSession').value;
    const el = document.getElementById('manageResultsSubject');
    if (!el || !sessionId) return;
    try {
        const snap = await db.collection('subjects').where('sessionId', '==', sessionId).get();
        el.innerHTML = '<option value="">Select Subject</option>' + 
            snap.docs.map(doc => `<option value="${doc.id}">${doc.data().name}</option>`).join('');
    } catch (e) { console.error(e); }
}

async function refreshManageResultsTable() {
    const body = document.getElementById('manageResultsTableBody');
    const sess = document.getElementById('manageResultsSession').value;
    const cls = document.getElementById('manageResultsClass').value;
    const sec = document.getElementById('manageResultsSectionSelect').value;
    const ex = document.getElementById('manageResultsExam').value;
    const sub = document.getElementById('manageResultsSubject').value;

    if (!body || !cls || !sec || !ex || !sub) return;
    body.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';

    try {
        const marksSnap = await db.collection('marks')
            .where('examId', '==', ex)
            .where('subjectId', '==', sub)
            .where('className', '==', cls)
            .where('sectionName', '==', sec)
            .get();

        if (marksSnap.empty) {
            body.innerHTML = '<tr><td colspan="5" style="text-align:center;">No records found.</td></tr>';
            return;
        }

        const studentIds = marksSnap.docs.map(doc => doc.data().studentId);
        const students = {};
        // Chunk student fetches to avoid limits if needed, but for small classes this is fine
        const studentsSnap = await db.collection('students').where('__name__', 'in', studentIds).get();
        studentsSnap.forEach(doc => students[doc.id] = doc.data());

        body.innerHTML = marksSnap.docs.map(doc => {
            const data = doc.data();
            const student = students[data.studentId] || { name: 'Unknown', roll_no: '-' };
            return `
                <tr>
                    <td>${student.roll_no}</td>
                    <td>${student.name}</td>
                    <td>${data.obtained}</td>
                    <td>${data.status === 'P' ? '<span class="badge" style="background:#dcfce7; color:#166534;">Present</span>' : '<span class="badge" style="background:#fee2e2; color:#b91c1c;">Absent</span>'}</td>
                    <td>
                        <button onclick="deleteMarkRecord('${doc.id}')" class="btn-portal btn-ghost" style="color:var(--danger);">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error(e);
        body.innerHTML = `<tr><td colspan="5">Error: ${e.message}</td></tr>`;
    }
}

async function deleteMarkRecord(id) {
    if (!confirm("Delete this mark record?")) return;
    try {
        await db.collection('marks').doc(id).delete();
        showToast("Record deleted", "success");
        refreshManageResultsTable();
    } catch (e) {
        showToast("Error deleting", "error");
    }
}

/**
 * PUBLISH RESULTS
 */
async function refreshPublishStatus() {
    const body = document.getElementById('publishStatusTableBody');
    const sessionId = document.getElementById('publishSessionSelect').value;
    const examId = document.getElementById('publishExamSelect').value;

    if (!body) return;
    if (!sessionId || !examId) {
        body.innerHTML = '<tr><td colspan="3" style="text-align:center;">Select Session and Exam to view status.</td></tr>';
        return;
    }

    try {
        const classesSnap = await db.collection('classes').where('sessionId', '==', sessionId).orderBy('sortOrder', 'asc').get();
        const pubsSnap = await db.collection('publications').where('examId', '==', examId).get();
        const pubs = {};
        pubsSnap.forEach(doc => pubs[doc.data().className] = doc.data().published);

        body.innerHTML = classesSnap.docs.map(doc => {
            const cls = doc.data().name;
            const isPublished = pubs[cls] || false;
            return `
                <tr>
                    <td><strong>${cls}</strong></td>
                    <td>${isPublished ? '<span class="badge" style="background:#dcfce7; color:#166534;">Published</span>' : '<span class="badge" style="background:#f1f5f9; color:#64748b;">Draft</span>'}</td>
                    <td>
                        <button onclick="togglePublish('${examId}', '${cls}', ${isPublished})" class="btn-portal ${isPublished ? 'btn-ghost' : 'btn-primary'}" style="padding:0.4rem 1rem; font-size:0.8rem;">
                            ${isPublished ? 'Unpublish' : 'Publish'}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error(e);
    }
}

async function togglePublish(examId, className, currentStatus) {
    try {
        setLoading(true);
        const docId = `${examId}_${className.replace(/\s+/g, '_')}`;
        await db.collection('publications').doc(docId).set({
            examId,
            className,
            published: !currentStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        showToast(`Results ${!currentStatus ? 'published' : 'unpublished'} for ${className}`, "success");
        refreshPublishStatus();
    } catch (e) {
        showToast("Error: " + e.message, "error");
    } finally {
        setLoading(false);
    }
}

// Exports
window.handleGradingSubmit = handleGradingSubmit;
window.deleteGradingRule = deleteGradingRule;
window.handleExamSubmit = handleExamSubmit;
window.deleteExam = deleteExam;
window.loadGradingRules = loadGradingRules;
window.loadExams = loadExams;
window.loadScheduleGrid = loadScheduleGrid;
window.saveExamSchedule = saveExamSchedule;

window.loadMarksClasses = loadMarksClasses;
window.loadMarksSections = loadMarksSections;
window.loadMarksSubjects = loadMarksSubjects;
window.refreshMarksGrid = refreshMarksGrid;
window.saveMarksGrid = saveMarksGrid;
window.handleMarksExcelUpload = handleMarksExcelUpload;
window.updateScheduleClasses = updateScheduleClasses;
window.initERPExams = initERPExams;
window.generateHallTickets = generateHallTickets;

window.loadManageResultsClasses = loadManageResultsClasses;
window.loadManageResultsSections = loadManageResultsSections;
window.loadManageResultsSubjects = loadManageResultsSubjects;
window.refreshManageResultsTable = refreshManageResultsTable;
window.deleteMarkRecord = deleteMarkRecord;
window.refreshPublishStatus = refreshPublishStatus;
window.togglePublish = togglePublish;
window.loadViewScheduleGrid = loadViewScheduleGrid;
