/**
 * ERP EXAMS MODULE
 * Handles Exam Terms, Grading Rules, Schedules, and Marks Entry
 */

let examState = {
    gradingRules: [],
    exams: [],
    activeSessionId: null,
};

// Internal loading helper
window.setLoading = function(show) {
    let loader = document.getElementById('globalLoader');
    if (!loader && show) {
        loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;';
        loader.innerHTML = '<div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;"><span class="visually-hidden">Loading...</span></div>';
        document.body.appendChild(loader);
    }
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
};
async function initERPExams() {
    console.log('ERP Exams Initializing...');
    try {
        const sessionSnap = await schoolData('sessions').get();
        const sessions = sessionSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const active = sessions.find((s) => s.active);
        if (active) examState.activeSessionId = active.id;

        // Populate session dropdowns for all ERP sections
        const sessionDropdowns = [
            'examSessionSelect',
            'marksSessionSelect',
            'manageResultsSession',
            'publishSessionSelect',
            'admitSessionSelect',
            'attnSessionSelect',
            'allResultsSessionSelect',
            'scheduleSessionSelect',
            'publishSchedSessionSelect',
        ];
        sessionDropdowns.forEach((id) => {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML =
                    '<option value="">Select Session</option>' +
                    sessions
                        .map(
                            (s) =>
                                `<option value="${s.id}" ${s.id === examState.activeSessionId ? 'selected' : ''}>${s.name}</option>`
                        )
                        .join('');

                // Add change listener to refresh exam data for the selected session
                if (!el.getAttribute('data-listener')) {
                    el.addEventListener('change', async (e) => {
                        examState.activeSessionId = e.target.value;
                        if (examState.activeSessionId) {
                            await Promise.all([loadExams(), loadViewScheduleGrid(), loadGradingRules()]);
                            updateScheduleClasses();
                            refreshPublishStatus();
                            if (typeof loadManageResultsClasses === 'function') loadManageResultsClasses();
                        }
                    });
                    el.setAttribute('data-listener', 'true');
                }
            }
        });

        if (examState.activeSessionId) {
            await Promise.all([loadGradingRules(), loadExams(), loadViewScheduleGrid(), populateRcPreviewExams()]);
            // For Schedule
            updateScheduleClasses();
            refreshPublishStatus();
            if (typeof loadManageResultsClasses === 'function') loadManageResultsClasses();
            
            // Setup Searchable Student Select for Report Card Preview
            if (typeof initSearchableSelect === 'function' && document.getElementById('rcPreviewSearchContainer')) {
                initSearchableSelect('rcPreviewSearchContainer', window.allStudents || [], (s) => {
                    document.getElementById('rcPreviewSid').value = s.student_id;
                });
            }
        }
    } catch (e) {
        console.error('Exam init error:', e);
    }
}

async function updateScheduleClasses() {
    if (!examState.activeSessionId) return;
    const selects = [
        'scheduleClassSelect',
        'attnMarkClassSelect',
        'remarkClassSelect',
        'allResultsClassSelect',
        'nonSubClassSelect',
    ];
    try {
        const snap = await schoolData('classes').where('sessionId', '==', examState.activeSessionId).get();
        const classes = snap.docs.map((doc) => doc.data().name);
        const options =
            '<option value="">Select Class</option>' +
            classes.map((c) => `<option value="${c}">${c}</option>`).join('');

        selects.forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = options;
        });
    } catch (e) {
        console.error(e);
    }
}

/**
 * GRADING RULES
 */
async function loadGradingRules() {
    const body = document.getElementById('gradingTableBody');
    if (!body) return;

    try {
        const snapshot = await schoolData('gradingRules').orderBy('min', 'desc').get();
        examState.gradingRules = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        renderGradingRules();
    } catch (e) {
        console.error('Error loading grades:', e);
        body.innerHTML =
            '<tr><td colspan="4" style="text-align:center; color:var(--danger);">Error loading grading rules. Please check permissions.</td></tr>';
    }
}

function renderGradingRules() {
    const body = document.getElementById('gradingTableBody');
    if (!body) return;

    body.innerHTML = examState.gradingRules
        .map(
            (rule) => `
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
    `
        )
        .join('');
}

async function handleGradingSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('gradeNameInput').value.trim();
    const min = parseFloat(document.getElementById('gradeMinInput').value);
    const max = parseFloat(document.getElementById('gradeMaxInput').value);
    const remarks = document.getElementById('gradeRemarksInput').value.trim();

    try {
        setLoading(true);
        await schoolData('gradingRules').add(
            withSchool({
                name,
                min,
                max,
                remarks,
            })
        );
        showToast('Grading rule saved', 'success');
        document.getElementById('addGradingForm').reset();
        await loadGradingRules();
    } catch (e) {
        showToast('Error saving rule', 'error');
    } finally {
        setLoading(false);
    }
}

async function deleteGradingRule(id) {
    if (!confirm('Delete this grading rule?')) return;
    try {
        setLoading(true);
        await schoolDoc('gradingRules', id).delete();
        await loadGradingRules();
    } catch (e) {
        showToast('Error deleting rule', 'error');
    } finally {
        setLoading(false);
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
        const snapshot = await schoolData('exams').where('sessionId', '==', examState.activeSessionId).get();
        examState.exams = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        renderExams();
        updateExamSelects();
    } catch (e) {
        console.error('Error loading exams:', e);
    }
}

function renderExams() {
    const body = document.getElementById('examsTableBody');
    if (!body) return;

    body.innerHTML = examState.exams
        .map(
            (ex) => `
        <tr>
            <td><strong>${ex.name}</strong></td>
            <td>${ex.weightage}%</td>
            <td>
                <button onclick="deleteExam('${ex.id}')" class="btn-portal btn-ghost" style="color:var(--danger); border-color:var(--danger); padding:0.25rem 0.5rem; font-size:0.7rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `
        )
        .join('');
}

async function handleExamSubmit(event) {
    event.preventDefault();
    const sessionId = document.getElementById('examSessionSelect').value;
    const name = document.getElementById('examNameInput').value.trim();
    const weightage = parseFloat(document.getElementById('examWeightageInput').value);

    if (!sessionId) {
        showToast('Please select a session', 'error');
        return;
    }

    try {
        setLoading(true);
        await schoolData('exams').add(
            withSchool({
                name,
                sessionId,
                weightage,
            })
        );
        showToast('Exam term created', 'success');
        document.getElementById('addExamForm').reset();
        await loadExams();
    } catch (e) {
        showToast('Error creating exam', 'error');
    } finally {
        setLoading(false);
    }
}

async function deleteExam(id) {
    if (!confirm('Delete this exam term?')) return;
    try {
        setLoading(true);
        await schoolDoc('exams', id).delete();
        await loadExams();
    } catch (e) {
        showToast('Error deleting exam', 'error');
    } finally {
        setLoading(false);
    }
}

function updateExamSelects() {
    const selects = [
        'scheduleExamSelect',
        'marksExamSelect',
        'manageResultsExam',
        'publishExamSelect',
        'admitExamSelect',
        'attnExamSelect',
        'attnMarkExamSelect',
        'remarkExamSelect',
        'nonSubExamSelect',
        'publishSchedExamSelect',
        'allResultsExamSelect',
    ];
    selects.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML =
                '<option value="">Select Exam</option>' +
                examState.exams.map((ex) => `<option value="${ex.id}">${ex.name}</option>`).join('');
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
        const snap = await schoolData('schedules').orderBy('date', 'asc').get();
        if (snap.empty) {
            body.innerHTML = '<tr><td colspan="7" style="text-align:center;">No schedules found.</td></tr>';
            return;
        }

        const subjectsSnap = await schoolData('subjects').get();
        const subjects = {};
        subjectsSnap.forEach((doc) => (subjects[doc.id] = doc.data().name));

        body.innerHTML = snap.docs
            .map((doc) => {
                const d = doc.data();
                const exam = examState.exams.find((e) => e.id === d.examId)?.name || 'Unknown';
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
            })
            .join('');
    } catch (e) {
        console.error(e);
    }
}

// ─── SCHEDULE: Cascading Selectors ───────────────────────────────────────────

// Called when session changes in Manage Exam Schedule
window.scheduleLoadClasses = async function() {
    const sessionId = document.getElementById('scheduleSessionSelect')?.value;
    const classSelect = document.getElementById('scheduleClassSelect');
    const examSelect = document.getElementById('scheduleExamSelect');
    if (!classSelect) return;
    classSelect.innerHTML = '<option value="">Loading...</option>';
    if (examSelect) examSelect.innerHTML = '<option value="">Select Class First</option>';
    document.getElementById('schedulePapersContainer').innerHTML = `
        <div class="text-center p-3 text-muted card">
            <i class="fas fa-calendar-times text-4xl opacity-20 block mb-1"></i>
            <p>Select Session, Class and Exam to view or add papers</p>
        </div>`;
    const addBtn = document.getElementById('scheduleAddPaperBtn');
    if (addBtn) addBtn.classList.add('hidden');
    if (!sessionId) { classSelect.innerHTML = '<option value="">Select Session First</option>'; return; }
    examState.activeSessionId = sessionId;
    try {
        const snap = await schoolData('classes').where('sessionId', '==', sessionId).get();
        let classes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        classes.sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0));
        classSelect.innerHTML = '<option value="">Select Class</option>' + classes.map(c=>`<option value="${c.name}">${c.name}</option>`).join('');
        // Also populate exam select from the session
        await scheduleLoadExams(sessionId, examSelect);
    } catch(e) { classSelect.innerHTML = '<option value="">Error</option>'; }
};

// Load exam terms for the selected session
window.scheduleLoadExams = async function(sessionIdOverride, examSelectOverride) {
    const sessionId = sessionIdOverride || document.getElementById('scheduleSessionSelect')?.value;
    const examSelect = examSelectOverride || document.getElementById('scheduleExamSelect');
    if (!examSelect || !sessionId) return;
    examSelect.innerHTML = '<option value="">Loading exams...</option>';
    try {
        const snap = await schoolData('exams').where('sessionId','==',sessionId).get();
        const exams = snap.docs.map(d=>({id:d.id,...d.data()}));
        examSelect.innerHTML = '<option value="">Select Exam</option>' + exams.map(e=>`<option value="${e.id}">${e.name}</option>`).join('');
    } catch(e) { examSelect.innerHTML = '<option value="">Error</option>'; }
};

// ─── SCHEDULE: Load Papers (EducationDesk-style cards) ───────────────────────

async function loadScheduleGrid() {
    const examId = document.getElementById('scheduleExamSelect')?.value;
    const className = document.getElementById('scheduleClassSelect')?.value;
    const container = document.getElementById('schedulePapersContainer');
    const addBtn = document.getElementById('scheduleAddPaperBtn');
    if (!container) return;
    if (!examId || !className) {
        container.innerHTML = `<div class="text-center p-3 text-muted card">
            <i class="fas fa-calendar-times text-4xl opacity-20 block mb-1"></i>
            <p>Select Session, Class and Exam to view or add papers</p></div>`;
        if (addBtn) addBtn.classList.add('hidden');
        return;
    }

    container.innerHTML = '<div class="text-center p-2 text-muted"><i class="fas fa-spinner fa-spin mr-0-5"></i> Loading papers...</div>';

    try {
        // Fetch subjects for this class (stored with sessionId or as global)
        const sessionId = document.getElementById('scheduleSessionSelect')?.value || examState.activeSessionId;
        const subSnap = await schoolData('subjects').get();
        const allSubjects = subSnap.docs.map(d=>({id:d.id,...d.data()}));

        // Fetch existing papers from Firestore
        const schedSnap = await schoolData('schedules').where('examId','==',examId).where('className','==',className).get();
        let papers = schedSnap.docs.map(d=>({docId:d.id,...d.data()}));
        papers.sort((a,b)=>(a.day||0)-(b.day||0)||(a.date||'').localeCompare(b.date||''));

        if (addBtn) addBtn.classList.remove('hidden');

        if (papers.length === 0) {
            container.innerHTML = '<div class="text-center p-3 text-muted card"><i class="fas fa-inbox text-4xl opacity-20 block mb-1"></i><p>No papers yet. Click <strong>Add Paper</strong> below to add the first paper.</p></div>';
        } else {
            container.innerHTML = papers.map((p,i) => renderPaperCard(p, i+1, allSubjects)).join('');
        }

        // Store subjects for use in dynamically added cards
        window._scheduleSubjects = allSubjects;
    } catch(e) {
        console.error(e);
        container.innerHTML = `<div class="card text-danger p-2">Error loading schedule: ${e.message}</div>`;
    }
}

function renderPaperCard(paper, num, subjects) {
    const subOpts = (subjects || window._scheduleSubjects || []).map(s =>
        `<option value="${s.id}" ${paper.subjectId === s.id ? 'selected' : ''}>${s.name}</option>`).join('');
    const scheduleTypes = ['Theory', 'Practical', 'Oral', 'Main', 'Assignment', 'Project'].map(t =>
        `<option value="${t}" ${paper.scheduleType === t ? 'selected' : ''}>${t}</option>`).join('');
    const docId = paper.docId || '';

    return `
    <div class="card mb-1" data-paper-doc="${docId}" style="border-left: 4px solid var(--primary);">
        <div class="flex flex-between align-center mb-1">
            <h4 class="font-700"><i class="fas fa-file-alt mr-0-5 primary"></i> Paper ${num}</h4>
            <button onclick="schedulePaperDelete(this, '${docId}')" class="btn-portal btn-ghost"
                style="color:var(--danger);border-color:var(--danger);padding:0.25rem 0.6rem;" title="Remove this paper">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="grid-4 gap-1 mb-1">
            <div class="form-group">
                <label>Exam Subject <span class="text-danger">*</span></label>
                <select class="sched-subject form-control" title="Exam Subject">
                    <option value="">Select Subject</option>${subOpts}
                </select>
            </div>
            <div class="form-group">
                <label>Schedule Name (Theory/Main etc)</label>
                <select class="sched-type form-control" title="Schedule Type">
                    ${scheduleTypes}
                </select>
            </div>
            <div class="form-group">
                <label>Exam Date <span class="text-danger">*</span></label>
                <input type="date" class="sched-date form-control" value="${paper.date||''}" />
            </div>
            <div class="form-group">
                <label>Start Time <span class="text-danger">*</span></label>
                <input type="time" class="sched-start form-control" value="${paper.startTime||paper.time||''}" />
            </div>
        </div>
        <div class="grid-4 gap-1 mb-1">
            <div class="form-group">
                <label>End Time <span class="text-danger">*</span></label>
                <input type="time" class="sched-end form-control" value="${paper.endTime||''}" />
            </div>
            <div class="form-group">
                <label>This Exam Marks <span class="text-danger">*</span></label>
                <input type="number" class="sched-max form-control" value="${paper.maxMarks||80}" placeholder="80" min="1" />
            </div>
            <div class="form-group">
                <label>Cut Off Marks</label>
                <input type="number" class="sched-cutoff form-control" value="${paper.cutOff||0}" placeholder="0" min="0" />
            </div>
            <div class="form-group">
                <label>Exam Invigilator</label>
                <input type="text" class="sched-invig form-control" value="${paper.invigilator||''}" placeholder="Invigilator name" />
            </div>
        </div>
        <div class="grid-3 gap-1 align-center">
            <div class="form-group">
                <label>Exam Code (If Any)</label>
                <input type="text" class="sched-code form-control" value="${paper.examCode||''}" placeholder="Enter Exam Code" />
            </div>
            <div class="form-group">
                <label>Room/Exam Hall No</label>
                <input type="text" class="sched-room form-control" value="${paper.room||''}" placeholder="Enter Exam Room/Hall No" />
            </div>
            <div class="form-group flex align-center" style="margin-top:1.5rem;">
                <label class="flex align-center gap-0-5" style="cursor:pointer;">
                    <input type="checkbox" class="sched-subsub" ${paper.subSubjectEnabled ? 'checked' : ''} style="width:18px;height:18px;" />
                    <span class="text-sm font-600">Sub Subject Enabled</span>
                </label>
            </div>
        </div>
    </div>`;
}

// Add a blank paper card
window.scheduleAddPaper = function() {
    const container = document.getElementById('schedulePapersContainer');
    if (!container) return;
    // Remove the "no papers" placeholder if present
    if (container.querySelector('.fa-inbox') || container.querySelector('.fa-calendar-times')) {
        container.innerHTML = '';
    }
    const num = container.querySelectorAll('[data-paper-doc]').length + 1;
    const el = document.createElement('div');
    el.innerHTML = renderPaperCard({}, num, window._scheduleSubjects || []);
    container.appendChild(el.firstElementChild);
    container.lastElementChild.scrollIntoView({ behavior: 'smooth' });
};

// Delete a paper card (front-end and Firestore)
window.schedulePaperDelete = async function(btn, docId) {
    if (!confirm('Remove this paper?')) return;
    const card = btn.closest('[data-paper-doc]');
    if (card) card.remove();
    if (docId && docId !== '') {
        try { await schoolDoc('schedules', docId).delete(); } catch(e) { console.error(e); }
    }
    // Renumber remaining
    document.querySelectorAll('#schedulePapersContainer [data-paper-doc]').forEach((c,i)=>{
        const h4 = c.querySelector('h4');
        if (h4) h4.innerHTML = `<i class="fas fa-file-alt mr-0-5 primary"></i> Paper ${i+1}`;
    });
    const container = document.getElementById('schedulePapersContainer');
    if (container && container.querySelectorAll('[data-paper-doc]').length === 0) {
        container.innerHTML = '<div class="text-center p-3 text-muted card"><i class="fas fa-inbox text-4xl opacity-20 block mb-1"></i><p>No papers. Click <strong>Add Paper</strong> below.</p></div>';
    }
};

async function saveExamSchedule() {
    const examId = document.getElementById('scheduleExamSelect')?.value;
    const className = document.getElementById('scheduleClassSelect')?.value;
    if (!examId || !className) { showToast('Select Session, Class and Exam first', 'error'); return; }

    const cards = document.querySelectorAll('#schedulePapersContainer [data-paper-doc]');
    if (cards.length === 0) { showToast('No papers to save', 'info'); return; }

    try {
        setLoading(true);
        const batch = (window.db || firebase.firestore()).batch();
        let saved = 0;
        cards.forEach((card, i) => {
            const subjectId = card.querySelector('.sched-subject')?.value;
            const scheduleType = card.querySelector('.sched-type')?.value;
            const date = card.querySelector('.sched-date')?.value;
            const startTime = card.querySelector('.sched-start')?.value;
            const endTime = card.querySelector('.sched-end')?.value;
            const maxMarks = card.querySelector('.sched-max')?.value;
            const cutOff = card.querySelector('.sched-cutoff')?.value;
            const invigilator = card.querySelector('.sched-invig')?.value;
            const examCode = card.querySelector('.sched-code')?.value;
            const room = card.querySelector('.sched-room')?.value;
            const subSubjectEnabled = card.querySelector('.sched-subsub')?.checked || false;
            const existingDocId = card.dataset.paperDoc;

            if (!subjectId || !date || !startTime) return; // Skip incomplete papers

            const docId = existingDocId || `${examId}_${className}_${subjectId}_${i}`;
            const ref = schoolDoc('schedules', docId);
            batch.set(ref, withSchool({
                examId, className, subjectId, scheduleType,
                date, startTime, endTime, time: startTime,
                maxMarks: parseFloat(maxMarks) || 0,
                cutOff: parseFloat(cutOff) || 0,
                invigilator, examCode, room, subSubjectEnabled,
                day: i + 1,
            }));
            // Update data attribute in case it was new
            card.dataset.paperDoc = docId;
            saved++;
        });
        await batch.commit();
        showToast(`${saved} paper(s) saved successfully`, 'success');
        await loadViewScheduleGrid();
    } catch(e) {
        showToast('Error saving: ' + e.message, 'error');
    } finally {
        setLoading(false);
    }
}

// Download schedule as PDF
window.scheduleDownloadPdf = async function() {
    const examId = document.getElementById('scheduleExamSelect')?.value;
    const className = document.getElementById('scheduleClassSelect')?.value;
    if (!examId || !className) { showToast('Select Exam and Class first', 'error'); return; }
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const examName = examState.exams.find(e=>e.id===examId)?.name || 'Exam';
        const sessionId = document.getElementById('scheduleSessionSelect')?.value || examState.activeSessionId;
        const sessionName = document.getElementById('scheduleSessionSelect')?.options[document.getElementById('scheduleSessionSelect')?.selectedIndex]?.text || '';
        const subSnap = await schoolData('subjects').get();
        const subjects = {};
        subSnap.docs.forEach(d=>{ subjects[d.id] = d.data().name; });

        const schedSnap = await schoolData('schedules').where('examId','==',examId).where('className','==',className).get();
        const papers = schedSnap.docs.map(d=>d.data()).sort((a,b)=>(a.day||0)-(b.day||0));

        doc.setFontSize(16);
        doc.text(window.SCHOOL_NAME || 'SCHOOL NAME', 105, 15, {align:'center'});
        doc.setFontSize(12);
        doc.text(`Exam Schedule — ${examName}`, 105, 22, {align:'center'});
        doc.text(`Class: ${className} | Session: ${sessionName}`, 105, 29, {align:'center'});
        doc.line(15, 33, 195, 33);
        const body = papers.map((p,i)=>[
            i+1, (new Date(p.date)).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}),
            `${p.startTime||''} – ${p.endTime||''}`,
            subjects[p.subjectId]||p.subjectId||'-',
            p.maxMarks||'', p.room||'-', p.invigilator||'-'
        ]);
        if (doc.autoTable) {
            doc.autoTable({ startY:37, head:[['#','Date','Time','Subject','Max Marks','Hall/Room','Invigilator']], body, theme:'grid', headStyles:{fillColor:[120,0,0]}, styles:{fontSize:9} });
        }
        doc.save(`Schedule_${className}_${examName}.pdf`);
    } catch(e) { showToast('PDF generation failed: '+e.message, 'error'); }
};



/**
 * BULK MARKS ENTRY
 */
async function loadMarksClasses() {
    const sessionId = document.getElementById('marksSessionSelect').value;
    const el = document.getElementById('marksClassSelect');
    if (!el || !sessionId) return;

    try {
        const snap = await schoolData('classes').where('sessionId', '==', sessionId).orderBy('sortOrder', 'asc').get();
        const classes = snap.docs.map((doc) => doc.data().name);
        el.innerHTML =
            '<option value="">Select Class</option>' +
            classes.map((c) => `<option value="${c}">${c}</option>`).join('');
    } catch (e) {
        console.error(e);
    }
}

async function loadMarksSections() {
    const className = document.getElementById('marksClassSelect').value;
    const sessionId = document.getElementById('marksSessionSelect').value;
    const el = document.getElementById('marksSectionSelect');
    if (!el || !className || !sessionId) return;

    try {
        const classSnap = await schoolData('classes')
            .where('sessionId', '==', sessionId)
            .where('name', '==', className)
            .limit(1)
            .get();

        if (!classSnap.empty) {
            const sections = classSnap.docs[0].data().sections || [];
            el.innerHTML =
                '<option value="">Select Section</option>' +
                sections.map((s) => `<option value="${s}">${s}</option>`).join('');
        }
    } catch (e) {
        console.error(e);
    }
}

async function loadMarksSubjects() {
    const sessionId = document.getElementById('marksSessionSelect').value;
    const el = document.getElementById('marksSubjectSelect');
    if (!el || !sessionId) return;

    try {
        const snap = await schoolData('subjects').where('sessionId', '==', sessionId).get();
        const subjects = snap.docs.map((doc) => ({ id: doc.id, name: doc.data().name }));
        el.innerHTML =
            '<option value="">Select Subject</option>' +
            '<option value="ALL">All Subjects</option>' +
            subjects.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
    } catch (e) {
        console.error(e);
    }
}

async function refreshMarksGrid() {
    const sessionId = document.getElementById('marksSessionSelect').value;
    const sessionName = document.getElementById('marksSessionSelect').options[document.getElementById('marksSessionSelect').selectedIndex]?.text;
    const className = document.getElementById('marksClassSelect').value;
    const sectionName = document.getElementById('marksSectionSelect').value;
    const examId = document.getElementById('marksExamSelect').value;
    const subjectId = document.getElementById('marksSubjectSelect').value;
    const body = document.getElementById('marksGridTableBody');
    const headerRow = document.getElementById('marksGridHeaderRow');

    if (!body || !className || !sectionName || !examId || !subjectId) {
        if (body) body.innerHTML = '';
        return;
    }

    body.innerHTML = '<tr><td colspan="10" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading students...</td></tr>';

    try {
        const studentsSnap = await schoolData('students')
            .where('class', '==', className)
            .where('section', '==', sectionName)
            .where('session', '==', sessionName)
            .get();

        const students = studentsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        if (students.length === 0) {
            body.innerHTML = '<tr><td colspan="10" style="text-align:center;">No students found.</td></tr>';
            return;
        }

        let subjects = [];
        let marksQuery = schoolData('marks')
            .where('examId', '==', examId)
            .where('className', '==', className)
            .where('sectionName', '==', sectionName);

        if (subjectId === 'ALL') {
            const subSnap = await schoolData('subjects').where('sessionId', '==', sessionId).get();
            subjects = subSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
            
            headerRow.innerHTML = `
                <tr>
                    <th class="w-100">Roll No</th>
                    <th>Student Name</th>
                    ${subjects.map(s => `<th class="text-center">${s.name}</th>`).join('')}
                    <th class="w-100">Status</th>
                </tr>
            `;
        } else {
            const selSubName = document.getElementById('marksSubjectSelect').options[document.getElementById('marksSubjectSelect').selectedIndex].text;
            subjects = [{ id: subjectId, name: selSubName }];
            marksQuery = marksQuery.where('subjectId', '==', subjectId);
            
            headerRow.innerHTML = `
                <tr>
                    <th class="w-100">Roll No</th>
                    <th>Student Name</th>
                    <th id="singleSubjectHeader" class="min-w-150">Score Obtained</th>
                    <th id="statusHeader" class="w-150">Status</th>
                </tr>
            `;
        }

        const marksSnap = await marksQuery.get();
        const existingMarks = {}; // studentId -> { subjectId -> data }
        marksSnap.forEach((doc) => {
            const d = doc.data();
            if (!existingMarks[d.studentId]) existingMarks[d.studentId] = {};
            existingMarks[d.studentId][d.subjectId] = d;
        });

        const countStudentsEl = document.getElementById('marksCountStudents');
        const countEnteredEl = document.getElementById('marksCountEntered');
        if (countStudentsEl) countStudentsEl.innerText = students.length;
        if (countEnteredEl) countEnteredEl.innerText = Object.keys(existingMarks).length;

        body.innerHTML = students
            .map(
                (s) => `
            <tr data-student-id="${s.id}">
                <td>${s.roll_no || '-'}</td>
                <td><strong>${s.name}</strong></td>
                ${subjects.map(sub => `
                    <td>
                        <input type="number" 
                            class="marks-input form-control text-center" 
                            data-subject-id="${sub.id}"
                            value="${existingMarks[s.id]?.[sub.id]?.obtained ?? ''}" 
                            placeholder="0" 
                            style="width:80px; margin: 0 auto;">
                    </td>
                `).join('')}
                <td>
                    <select class="status-select form-control" style="width:100px;">
                        <option value="P" ${existingMarks[s.id]?.[subjects[0].id]?.status === 'P' ? 'selected' : ''}>Present</option>
                        <option value="A" ${existingMarks[s.id]?.[subjects[0].id]?.status === 'A' ? 'selected' : ''}>Absent</option>
                    </select>
                </td>
            </tr>
        `
            )
            .join('');
    } catch (e) {
        console.error(e);
        body.innerHTML =
            '<tr><td colspan="10" style="text-align:center; color:var(--danger);">Error loading marks grid.</td></tr>';
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
    const batch = (window.db || firebase.firestore()).batch();

    try {
        if (typeof window.setLoading === 'function') window.setLoading(true);
        for (const row of rows) {
            const studentId = row.dataset.studentId;
            const status = row.querySelector('.status-select').value;
            const inputs = row.querySelectorAll('.marks-input');

            for (const input of inputs) {
                const subId = input.dataset.subjectId || subjectId;
                const obtained = input.value;
                
                if (studentId) {
                    const docId = `${examId}_${subId}_${studentId}`;
                    const ref = schoolDoc('marks', docId);
                    batch.set(ref, withSchool({
                        examId,
                        subjectId: subId,
                        studentId,
                        className,
                        sectionName,
                        sessionId,
                        obtained: obtained !== '' ? parseFloat(obtained) : 0,
                        status: status
                    }), { merge: true });
                }
            }
        }
        await batch.commit();
        showToast('Marks saved successfully', 'success');
    } catch (e) {
        console.error(e);
        showToast('Error saving marks: ' + e.message, 'error');
    } finally {
        if (typeof window.setLoading === 'function') window.setLoading(false);
    }
}

async function downloadMarksExcelTemplate() {
    const sessionId = document.getElementById('marksSessionSelect').value;
    const sessionName = document.getElementById('marksSessionSelect').options[document.getElementById('marksSessionSelect').selectedIndex]?.text;
    const className = document.getElementById('marksClassSelect').value;
    const sectionName = document.getElementById('marksSectionSelect').value;
    const subjectId = document.getElementById('marksSubjectSelect').value;

    if (!sessionId || !className || !sectionName) {
        showToast('Please select Session, Class and Section first', 'error');
        return;
    }

    try {
        if (typeof window.setLoading === 'function') window.setLoading(true);

        const studentsSnap = await schoolData('students')
            .where('class', '==', className)
            .where('section', '==', sectionName)
            .where('session', '==', sessionName)
            .get();
        const students = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => (parseInt(a.roll_no)||0) - (parseInt(b.roll_no)||0));

        let headers = ['Roll No', 'Student ID', 'Reg No', 'Name', 'Father Name'];
        let subjects = [];

        if (subjectId === 'ALL') {
            const subSnap = await schoolData('subjects').where('sessionId', '==', sessionId).get();
            subjects = subSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
            headers = [...headers, ...subjects.map(s => s.name), 'Status'];
        } else {
            const selSubName = document.getElementById('marksSubjectSelect').options[document.getElementById('marksSubjectSelect').selectedIndex].text;
            headers = [...headers, selSubName, 'Status'];
        }

        const data = students.map(s => {
            const row = [s.roll_no || '', s.id || '', s.reg_no || '', s.name || '', s.father_name || ''];
            if (subjectId === 'ALL') {
                subjects.forEach(() => row.push('')); 
            } else {
                row.push('');
            }
            row.push('P'); 
            return row;
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
        XLSX.utils.book_append_sheet(wb, ws, 'Marks');
        XLSX.writeFile(wb, `Marks_Template_${className}_${sectionName}.xlsx`);
        showToast('Template downloaded');
    } catch (e) {
        console.error(e);
        showToast('Error generating template', 'error');
    } finally {
        if (typeof window.setLoading === 'function') window.setLoading(false);
    }
}

function handleMarksExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet);

            if (json.length === 0) {
                showToast('Excel file is empty', 'error');
                return;
            }

            const subjectId = document.getElementById('marksSubjectSelect').value;
            const rows = document.querySelectorAll('#marksGridTableBody tr');
            
            json.forEach(rowData => {
                const sid = String(rowData['Student ID'] || rowData['student_id'] || '');
                const roll = String(rowData['Roll No'] || '');
                const targetRow = Array.from(rows).find(r => r.dataset.studentId === sid || (roll && r.cells[0].innerText.trim() === roll));
                
                if (targetRow) {
                    if (subjectId === 'ALL') {
                        const inputs = targetRow.querySelectorAll('.marks-input');
                        inputs.forEach(input => {
                            const subId = input.dataset.subjectId;
                            const subNameInHeader = Array.from(document.getElementById('marksSubjectSelect').options).find(opt => opt.value === subId)?.text;
                            if (subNameInHeader && rowData[subNameInHeader] !== undefined) {
                                input.value = rowData[subNameInHeader];
                            }
                        });
                    } else {
                        const selSubName = document.getElementById('marksSubjectSelect').options[document.getElementById('marksSubjectSelect').selectedIndex].text;
                        const score = rowData[selSubName] || rowData['Marks Obtained'] || rowData['Score'] || rowData['Marks'];
                        const input = targetRow.querySelector('.marks-input');
                        if (input) input.value = score !== undefined ? score : '';
                    }
                    
                    const status = rowData['Status'] || 'P';
                    const statusSelect = targetRow.querySelector('.status-select');
                    if (statusSelect) statusSelect.value = status;
                }
            });

            showToast("Excel data mapped to grid. Click 'Finalize Marks' to commit.", 'info');
        } catch (err) {
            console.error(err);
            showToast('Error processing Excel file', 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

/**
 * DOCUMENT GENERATION (Hall Tickets & Attendance Cards)
 */
async function generateHallTicketsForTool() {
    const examId = document.getElementById('admitExamSelect').value;
    const className = document.getElementById('admitClassSelect').value;
    const sessionName =
        document.getElementById('admitSessionSelect').options[
            document.getElementById('admitSessionSelect').selectedIndex
        ]?.text;

    if (!examId || !className || !sessionName) {
        showToast('Select All Details First', 'error');
        return;
    }

    // Reuse existing logic but with specified IDs
    // We update the temp inputs to match generateHallTickets expectations or just call it after setting globals
    // Better: Refactor generateHallTickets to take params
    await generateHallTickets(examId, className, sessionName);
}

async function generateAttendanceCards() {
    const examId = document.getElementById('attnExamSelect').value;
    const className = document.getElementById('attnClassSelect').value;
    const sessionName =
        document.getElementById('attnSessionSelect').options[document.getElementById('attnSessionSelect').selectedIndex]
            ?.text;

    if (!examId || !className) {
        showToast('Select Exam and Class', 'error');
        return;
    }

    try {
        setLoading(true);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const studentsSnap = await schoolData('students')
            .where('class', '==', className)
            .where('session', '==', sessionName)
            .get();
        const students = studentsSnap.docs.map((d) => d.data());
        const examName = examState.exams.find((e) => e.id === examId)?.name || 'Exam';

        if (students.length === 0) {
            showToast('No students found', 'error');
            return;
        }

        // Generate signature sheet
        doc.setFontSize(16);
        doc.text(window.SCHOOL_NAME || 'SCHOOL NAME', 105, 15, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`EXAMINATION ATTENDANCE SHEET - ${examName}`, 105, 22, { align: 'center' });
        doc.text(`Class: ${className} | Session: ${sessionName}`, 105, 28, { align: 'center' });

        const body = students.map((s) => [s.roll_no || '-', s.name, '', '']);
        doc.autoTable({
            startY: 35,
            head: [['Roll No', 'Student Name', 'Student Signature', 'Invigilator Sig']],
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [40, 40, 40] },
            styles: { minCellHeight: 12, verticalLine: true },
        });

        doc.save(`Attendance_${className}_${examName}.pdf`);
        showToast('Attendance sheets generated', 'success');
    } catch (e) {
        console.error(e);
        showToast('Generation failed', 'error');
    } finally {
        setLoading(false);
    }
}

// Updated generateHallTickets to accept params
async function generateHallTickets(examIdParam, classNameParam, sessionNameParam) {
    const examId = examIdParam || document.getElementById('marksExamSelect').value;
    const className = classNameParam || document.getElementById('marksClassSelect').value;
    const sessionName =
        sessionNameParam ||
        document.getElementById('marksSessionSelect').options[
            document.getElementById('marksSessionSelect').selectedIndex
        ]?.text;

    if (!examId || !className) {
        showToast('Select Exam and Class first', 'error');
        return;
    }

    try {
        showLoading(true);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Load students
        const studentsSnap = await schoolData('students')
            .where('class', '==', className)
            .where('session', '==', sessionName)
            .get();
        const students = studentsSnap.docs.map((d) => d.data());

        // Load schedule
        const schedSnap = await schoolData('schedules')
            .where('examId', '==', examId)
            .where('className', '==', className)
            .get();
        const schedule = schedSnap.docs.map((d) => d.data());

        if (students.length === 0) {
            showToast('No students found in this class', 'error');
            return;
        }

        students.forEach((student, index) => {
            if (index > 0) doc.addPage();

            // Header
            doc.setFontSize(18);
            doc.setTextColor(40);
            doc.text(window.SCHOOL_NAME || 'SCHOOL NAME', 105, 20, { align: 'center' });
            doc.setFontSize(14);
            doc.text(`EXAM ADMIT CARD - ${sessionName}`, 105, 30, { align: 'center' });

            doc.setDrawColor(0);
            doc.line(20, 35, 190, 35);

            // Student Info
            doc.setFontSize(12);
            doc.text(`Name: ${student.name}`, 20, 50);
            doc.text(`Roll No: ${student.roll_no || '-'}`, 120, 50);
            doc.text(`Class: ${student.class}`, 20, 60);
            doc.text(`Section: ${student.section || '-'}`, 120, 60);
            doc.text(`Exam: ${examState.exams.find((e) => e.id === examId)?.name}`, 20, 70);

            // Schedule Table
            const body = schedule.map((s) => [
                examState.gradingRules.find((g) => false) || '-', // Placeholder for subject name lookup if needed, but we have subjectId
                s.date,
                s.time,
                s.duration + ' min',
            ]);

            // Note: In a real app we'd fetch subject names here too.
            // For now, let's just use doc.autoTable if available
            if (doc.autoTable) {
                doc.autoTable({
                    startY: 80,
                    head: [['Subject', 'Date', 'Time', 'Duration']],
                    body: schedule.map((s) => ['Subject ID: ' + s.subjectId, s.date, s.time, s.duration]),
                });
            }

            // Footer
            const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 150;
            doc.text("Principal's Signature", 140, finalY);
        });

        doc.save(`Admit_Cards_${className}.pdf`);
        showToast('Admit cards generated', 'success');
    } catch (e) {
        console.error(e);
        showToast('Error generating PDF', 'error');
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
        const snap = await schoolData('classes').where('sessionId', '==', sessionId).orderBy('sortOrder', 'asc').get();
        el.innerHTML =
            '<option value="">Select Class</option>' +
            snap.docs.map((doc) => `<option value="${doc.data().name}">${doc.data().name}</option>`).join('');
    } catch (e) {
        console.error(e);
    }
}

async function loadManageResultsSections() {
    const className = document.getElementById('manageResultsClass').value;
    const sessionId = document.getElementById('manageResultsSession').value;
    const el = document.getElementById('manageResultsSectionSelect');
    if (!el || !className || !sessionId) return;
    try {
        const snap = await schoolData('classes')
            .where('sessionId', '==', sessionId)
            .where('name', '==', className)
            .limit(1)
            .get();
        if (!snap.empty) {
            const sections = snap.docs[0].data().sections || [];
            el.innerHTML =
                '<option value="">Select Section</option>' +
                sections.map((s) => `<option value="${s}">${s}</option>`).join('');
        }
    } catch (e) {
        console.error(e);
    }
}

async function loadManageResultsSubjects() {
    const sessionId = document.getElementById('manageResultsSession').value;
    const el = document.getElementById('manageResultsSubject');
    if (!el || !sessionId) return;
    try {
        const snap = await schoolData('subjects').where('sessionId', '==', sessionId).get();
        el.innerHTML =
            '<option value="">Select Subject</option>' +
            snap.docs.map((doc) => `<option value="${doc.id}">${doc.data().name}</option>`).join('');
    } catch (e) {
        console.error(e);
    }
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
        const marksSnap = await schoolData('marks')
            .where('examId', '==', ex)
            .where('subjectId', '==', sub)
            .where('className', '==', cls)
            .where('sectionName', '==', sec)
            .get();

        if (marksSnap.empty) {
            body.innerHTML = '<tr><td colspan="5" style="text-align:center;">No records found.</td></tr>';
            return;
        }

        const studentIds = marksSnap.docs.map((doc) => doc.data().studentId);
        const students = {};
        if (studentIds.length > 0) {
            // Firestore 'in' query supports up to 10 IDs, but we can have more.
            // For now, let's fetch all students of the class and filter locally for simplicity and robustness.
            const studentsSnap = await schoolData('students')
                .where('class', '==', cls)
                .where('section', '==', sec)
                .get();
            studentsSnap.forEach((doc) => (students[doc.id] = doc.data()));
        }

        body.innerHTML = marksSnap.docs
            .map((doc) => {
                const data = doc.data();
                const student = students[data.studentId] || { name: 'Unknown', roll_no: '-' };

                // Calculate Grade
                const score = parseFloat(data.obtained) || 0;
                const max = examState.exams.find((e) => e.id === ex)?.maxMarks || 100; // Default or from schedule if available
                const percent = (score / max) * 100;
                const gradeRule = examState.gradingRules.find((g) => percent >= g.min && percent <= g.max) || {
                    name: '--',
                };

                return `
                <tr>
                    <td>${student.roll_no || '-'}</td>
                    <td><strong>${student.name}</strong></td>
                    <td><span class="badge" style="background:var(--primary-light); color:var(--primary);">${data.obtained}</span></td>
                    <td><span class="badge" style="background:#f1f5f9; color:#64748b; font-weight:600;">${gradeRule.name}</span></td>
                    <td style="text-align:right;">
                        <button onclick="deleteMarkRecord('${doc.id}')" class="btn-portal btn-ghost" style="color:var(--danger); padding:0.25rem 0.5rem;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            })
            .join('');
    } catch (e) {
        console.error(e);
        body.innerHTML = `<tr><td colspan="5">Error: ${e.message}</td></tr>`;
    }
}

async function deleteMarkRecord(id) {
    if (!confirm('Delete this mark record?')) return;
    try {
        await schoolDoc('marks', id).delete();
        showToast('Record deleted', 'success');
        refreshManageResultsTable();
    } catch (e) {
        showToast('Error deleting', 'error');
    }
}

/**
 * PUBLISH RESULTS
 */
async function refreshPublishStatus() {
    const body = document.getElementById('publishStatusTableBody');
    const sessionId = document.getElementById('publishSessionSelect').value;
    const examId = document.getElementById('publishExamSelect').value;
    const filterClass = document.getElementById('publishClassSelect')?.value || '';
    const filterSection = document.getElementById('publishSectionSelect')?.value || '';

    if (!body) return;
    if (!sessionId || !examId) {
        body.innerHTML = '<tr><td colspan="3" style="text-align:center;">Select Session and Exam to view status.</td></tr>';
        return;
    }

    try {
        const classesSnap = await schoolData('classes').where('sessionId', '==', sessionId).orderBy('sortOrder', 'asc').get();
        const pubsSnap = await schoolData('publications').where('examId', '==', examId).get();
        const pubs = {};
        pubsSnap.forEach((doc) => (pubs[doc.data().className] = doc.data().published));

        body.innerHTML = classesSnap.docs
            .filter(doc => !filterClass || doc.data().name === filterClass)
            .map((doc) => {
                const cls = doc.data().name;
                const docSections = doc.data().sections || ['A'];
                
                return docSections
                    .filter(sec => !filterSection || sec === filterSection)
                    .map(sec => {
                        const isPublished = pubs[`${cls}_${sec}`] || pubs[cls] || false;
                        return `
                        <tr>
                            <td><strong>${cls}</strong> - Section ${sec}</td>
                            <td>${isPublished ? '<span class="badge" style="background:#dcfce7; color:#166534;">Published</span>' : '<span class="badge" style="background:#f1f5f9; color:#64748b;">Draft</span>'}</td>
                            <td>
                                <button onclick="togglePublish('${examId}', '${cls}', ${isPublished}, '${sec}')" class="btn-portal ${isPublished ? 'btn-ghost' : 'btn-primary'}" style="padding:0.4rem 1rem; font-size:0.8rem;">
                                    ${isPublished ? 'Unpublish' : 'Publish'}
                                </button>
                            </td>
                        </tr>
                    `;
                    }).join('');
            })
            .join('');
        
        if (body.innerHTML === '') {
            body.innerHTML = '<tr><td colspan="3" style="text-align:center;">No records match your filters.</td></tr>';
        }
    } catch (e) {
        console.error(e);
        showToast('Error loading status', 'error');
    }
}

async function togglePublish(examId, className, currentStatus, sectionName = 'A') {
    try {
        setLoading(true);
        const docId = `${examId}_${className.replace(/\s+/g, '_')}_${sectionName}`;
        await schoolDoc('publications', docId).set(
            withSchool({
                examId,
                className,
                sectionName,
                published: !currentStatus,
                type: 'result',
                updatedAt: new Date(),
            }),
            { merge: true }
        );

        showToast(`Results ${!currentStatus ? 'published' : 'unpublished'} for ${className} ${sectionName}`, 'success');
        refreshPublishStatus();
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    } finally {
        setLoading(false);
    }
}

/**
 * PUBLISH SCHEDULES
 */
async function loadPublishScheduleStatus() {
    const body = document.getElementById('publishSchedTableBody');
    const sessionId = document.getElementById('publishSchedSessionSelect').value;
    const examId = document.getElementById('publishSchedExamSelect').value;

    if (!body) return;
    if (!sessionId || !examId) {
        body.innerHTML = '<tr><td colspan="3" style="text-align:center;">Select Session and Exam.</td></tr>';
        return;
    }

    try {
        const classesSnap = await schoolData('classes')
            .where('sessionId', '==', sessionId)
            .orderBy('sortOrder', 'asc')
            .get();
        const pubsSnap = await schoolData('publications')
            .where('examId', '==', examId)
            .where('type', '==', 'schedule')
            .get();
        const pubs = {};
        pubsSnap.forEach((doc) => (pubs[doc.data().className] = doc.data().published));

        body.innerHTML = classesSnap.docs
            .map((doc) => {
                const cls = doc.data().name;
                const isPublished = pubs[cls] || false;
                return `
                <tr>
                    <td><strong>${cls}</strong></td>
                    <td><span class="badge" style="background:rgba(var(--primary-rgb), 0.1); color:var(--primary);">Configured</span></td>
                    <td style="text-align:right;">
                        <button onclick="toggleSchedulePublish('${examId}', '${cls}', ${isPublished})" class="btn-portal ${isPublished ? 'btn-ghost' : 'btn-primary'}" style="padding:0.4rem 1rem; font-size:0.8rem;">
                            ${isPublished ? 'Hide from Portal' : 'Show on Portal'}
                        </button>
                    </td>
                </tr>
            `;
            })
            .join('');
    } catch (e) {
        console.error(e);
    }
}

async function toggleSchedulePublish(examId, className, currentStatus) {
    try {
        setLoading(true);
        const docId = `sched_${examId}_${className.replace(/\s+/g, '_')}`;
        await schoolDoc('publications', docId).set(
            withSchool({
                examId,
                className,
                type: 'schedule',
                published: !currentStatus,
            }),
            { merge: true }
        );

        showToast(`Schedule visibility updated for ${className}`, 'success');
        loadPublishScheduleStatus();
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
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
/**
 * REPORT CARD REMARKS & CO-SCHOLASTIC
 */
async function loadRemarksGrid() {
    const body = document.getElementById('remarksGridBody');
    const sessionId = document.getElementById('remarkSessionSelect').value;
    const className = document.getElementById('remarkClassSelect').value;
    const sectionName = document.getElementById('remarkSectionSelect').value;
    const examId = document.getElementById('remarkExamSelect').value;

    if (!body) return;
    if (!sessionId || !className || !examId) {
        body.innerHTML = '<tr><td colspan="5" style="text-align:center;">Select Session, Class and Exam to load remarks.</td></tr>';
        return;
    }

    body.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';
    try {
        const sessText = document.getElementById('remarkSessionSelect').options[document.getElementById('remarkSessionSelect').selectedIndex].text;
        
        let q = schoolData('students').where('session', '==', sessText).where('class', '==', className);
        if (sectionName) q = q.where('section', '==', sectionName);
        
        const studentsSnap = await q.get();
        const students = studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const remarksSnap = await schoolData('remarks').where('examId', '==', examId).where('className', '==', className).get();
        const existing = {};
        remarksSnap.forEach((doc) => (existing[doc.data().studentId] = doc.data()));

        body.innerHTML = students
            .map(
                (s) => `
            <tr data-student-id="${s.id}" data-section="${s.section || 'A'}">
                <td><strong>${s.name}</strong><br><small>${s.section || 'A'}</small></td>
                <td><textarea class="remark-text" style="width:100%; height:40px; border-radius:4px; border:1px solid #ddd;">${existing[s.id]?.text || ''}</textarea></td>
                <td><input type="text" class="remark-art" placeholder="A" style="width:40px; text-align:center;" value="${existing[s.id]?.art || ''}"></td>
                <td><input type="text" class="remark-disc" placeholder="A" style="width:40px; text-align:center;" value="${existing[s.id]?.disc || ''}"></td>
                <td><button onclick="saveRemarkRow(this)" class="btn-portal" style="padding:0.3rem 0.6rem; font-size:0.75rem;">Save</button></td>
            </tr>
        `
            )
            .join('');
    } catch (e) {
        console.error(e);
    }
}

async function saveRemarkRow(btn) {
    const row = btn.closest('tr');
    const studentId = row.dataset.studentId;
    const sectionName = row.dataset.section || 'A';
    const examId = document.getElementById('remarkExamSelect').value;
    const className = document.getElementById('remarkClassSelect').value;
    const text = row.querySelector('.remark-text').value;
    const art = row.querySelector('.remark-art').value;
    const disc = row.querySelector('.remark-disc').value;

    try {
        await schoolDoc('remarks', `${examId}_${studentId}`).set(
            withSchool({
                examId,
                studentId,
                className,
                sectionName,
                text,
                art,
                disc,
                updatedAt: new Date()
            }),
            { merge: true }
        );
        showToast('Remark Saved', 'success');
    } catch (e) {
        showToast('Error Saving: ' + e.message, 'error');
    }
}

async function loadAttnMarkGrid() {
    const cls = document.getElementById('attnMarkClassSelect').value;
    const body = document.getElementById('attnMarkGridBody');
    if (!body || !cls) return;

    body.innerHTML = '<tr><td colspan="3" style="text-align:center;">Loading Students...</td></tr>';
    try {
        const snap = await schoolData('students').where('class', '==', cls).get();
        const students = snap.docs.map((d) => d.data());

        body.innerHTML = students
            .map(
                (s) => `
            <tr>
                <td>${s.roll_no || '-'}</td>
                <td><strong>${s.name}</strong></td>
                <td>
                    <select class="attn-status" data-id="${s.student_id}" style="padding:4px; border-radius:4px;">
                        <option value="P">Present</option>
                        <option value="A">Absent</option>
                    </select>
                </td>
            </tr>
        `
            )
            .join('');
    } catch (e) {
        console.error(e);
    }
}

async function saveAttnMarkGrid() {
    const cls = document.getElementById('attnMarkClassSelect').value;
    const examId = document.getElementById('attnMarkExamSelect').value;
    const rows = document.querySelectorAll('#attnMarkGridBody tr');

    if (!cls || !examId) {
        showToast('Select Class and Exam', 'error');
        return;
    }

    try {
        setLoading(true);
        const batch = (window.db || firebase.firestore()).batch();
        rows.forEach((row) => {
            const studentId = row.querySelector('.attn-status').dataset.id;
            const status = row.querySelector('.attn-status').value;
            // Better to use a dedicated attendance collection for the exam
            const attRef = schoolDoc('exam_attendance', `${examId}_${studentId}`);
            batch.set(
                attRef,
                withSchool({
                    examId,
                    studentId,
                    className: cls,
                    status,
                })
            );
        });
        await batch.commit();
        showToast('Attendance Saved Successfully', 'success');
    } catch (e) {
        console.error(e);
        showToast('Save Failed', 'error');
    } finally {
        setLoading(false);
    }
}

// Global Exports for everything added in Phase 8
window.generateHallTickets = generateHallTickets;
window.generateHallTicketsForTool = generateHallTicketsForTool;
window.generateAttendanceCards = generateAttendanceCards;
window.loadRemarksGrid = loadRemarksGrid;
window.saveRemarkRow = saveRemarkRow;
window.loadAttnMarkGrid = loadAttnMarkGrid;
window.saveAttnMarkGrid = saveAttnMarkGrid;
async function loadNonSubGrid() {
    const cls = document.getElementById('nonSubClassSelect').value;
    const ex = document.getElementById('nonSubExamSelect').value;
    const body = document.getElementById('nonSubGridBody');
    if (!body || !cls || !ex) return;

    body.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';
    try {
        const studentsSnap = await schoolData('students').where('class', '==', cls).get();
        const students = studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const nonSubSnap = await schoolData('non_subject_marks')
            .where('examId', '==', ex)
            .where('className', '==', cls)
            .get();
        const existing = {};
        nonSubSnap.forEach((doc) => (existing[doc.data().studentId] = doc.data()));

        body.innerHTML = students
            .map(
                (s) => `
            <tr data-student-id="${s.id}">
                <td><strong>${s.name}</strong></td>
                <td><input type="text" class="non-health" placeholder="A" style="width:50px; text-align:center;" value="${existing[s.id]?.health || ''}"></td>
                <td><input type="text" class="non-music" placeholder="A" style="width:50px; text-align:center;" value="${existing[s.id]?.music || ''}"></td>
                <td><input type="text" class="non-work" placeholder="A" style="width:50px; text-align:center;" value="${existing[s.id]?.work || ''}"></td>
                <td><button onclick="saveNonSubRow(this)" class="btn-portal" style="padding:0.3rem 0.6rem; font-size:0.75rem;">Save</button></td>
            </tr>
        `
            )
            .join('');
    } catch (e) {
        console.error(e);
    }
}

async function saveNonSubRow(btn) {
    const row = btn.closest('tr');
    const studentId = row.dataset.studentId;
    const examId = document.getElementById('nonSubExamSelect').value;
    const className = document.getElementById('nonSubClassSelect').value;
    const health = row.querySelector('.non-health').value;
    const music = row.querySelector('.non-music').value;
    const work = row.querySelector('.non-work').value;

    try {
        await schoolDoc('non_subject_marks', `${examId}_${studentId}`).set(
            withSchool({
                examId,
                studentId,
                className,
                health,
                music,
                work,
            }),
            { merge: true }
        );
        showToast('Grades Saved', 'success');
    } catch (e) {
        showToast('Error Saving', 'error');
    }
}

// Global Exports
window.loadNonSubGrid = loadNonSubGrid;
window.saveNonSubRow = saveNonSubRow;
async function loadConsolidatedResults() {
    const sessId = document.getElementById('allResultsSessionSelect').value;
    const clsName = document.getElementById('allResultsClassSelect').value;
    const exId = document.getElementById('allResultsExamSelect').value;
    const area = document.getElementById('consolidatedResultsArea');

    if (!sessId || !clsName || !exId || !area) return;

    area.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; padding:3rem; color:var(--text-muted);">
            <i class="fas fa-spinner fa-spin fa-2x" style="margin-bottom:1rem;"></i>
            <p>Aggregating school records and generating matrix...</p>
        </div>
    `;

    try {
        // 1. Fetch Students
        const studentsSnap = await schoolData('students').where('class', '==', clsName).get();
        const students = studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // 2 Fetch Subjects
        const subjectsSnap = await schoolData('subjects').where('sessionId', '==', sessId).get();
        const subjects = subjectsSnap.docs.map((d) => ({ id: d.id, name: d.data().name }));

        // 3 Fetch Marks for this specific exam and class
        const marksSnap = await schoolData('marks').where('className', '==', clsName).where('examId', '==', exId).get();
        const allMarks = marksSnap.docs.map((d) => d.data());

        if (students.length === 0) {
            area.innerHTML = '<p style="text-align:center; padding:2rem;">No students found in this class.</p>';
            return;
        }

        // Build Table
        let html = `
            <div class="table-responsive">
                <table class="portal-table" style="font-size:0.85rem;">
                    <thead>
                        <tr>
                            <th style="min-width:150px;">Student</th>
                            ${subjects.map((s) => `<th style="text-align:center;">${s.name}</th>`).join('')}
                            <th style="text-align:center; background:var(--bg-light);">Total</th>
                            <th style="text-align:center; background:var(--bg-light);">%</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        students.forEach((s) => {
            let rowTotal = 0;
            let subCount = 0;
            html += `
                <tr>
                    <td><strong>${s.name}</strong><br><small style="color:var(--text-muted);">${s.roll_no || '-'}</small></td>
            `;
            subjects.forEach((sub) => {
                const m = allMarks.find((mark) => mark.studentId === s.id && mark.subjectId === sub.id);
                const score = m ? parseFloat(m.obtained) : 0;
                rowTotal += score;
                if (score > 0) subCount++;
                html += `<td style="text-align:center;">${m ? score : '-'}</td>`;
            });

            const percentage = subCount > 0 ? (rowTotal / (subCount * 100)) * 100 : 0; // Assuming 100 as base for simplicity
            html += `
                    <td style="text-align:center; font-weight:700; background:var(--bg-light);">${rowTotal}</td>
                    <td style="text-align:center; font-weight:700; background:var(--bg-light); color:var(--primary);">${percentage.toFixed(1)}%</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
        area.innerHTML = html;
    } catch (e) {
        console.error(e);
        area.innerHTML = `<p style="color:var(--danger); text-align:center;">Failed to load consolidated results: ${e.message}</p>`;
    }
}

window.loadConsolidatedResults = loadConsolidatedResults;

window.loadManageResultsClasses = loadManageResultsClasses;
window.loadManageResultsSections = loadManageResultsSections;
window.loadManageResultsSubjects = loadManageResultsSubjects;
window.refreshManageResultsTable = refreshManageResultsTable;
window.deleteMarkRecord = deleteMarkRecord;

window.refreshPublishStatus = refreshPublishStatus;
window.togglePublish = togglePublish;

window.initERPExams = initERPExams;
window.loadViewScheduleGrid = loadViewScheduleGrid;

/**
 * REPORT CARD PREVIEW (SINGLE STUDENT)
 */
async function populateRcPreviewExams() {
    const select = document.getElementById('rcPreviewExam');
    if (!select) return;
    try {
        const snap = await schoolData('exams').get();
        select.innerHTML = '<option value="">-- Select Exam --</option>';
        snap.docs.forEach((doc) => {
            select.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`;
        });
    } catch (e) {
        console.error(e);
    }
}

async function previewSingleReportCard(isDownload = false) {
    const studentId = document.getElementById('rcPreviewStudentSelect').value;
    const examId = document.getElementById('rcPreviewExam').value;
    const format = document.getElementById('rcPreviewFormat').value;
    const sessionId = document.getElementById('rcPreviewSession').value;

    if (!examId) {
        showToast('Please select an exam term', 'error');
        return;
    }

    if (studentId === 'All') {
        if (!isDownload) {
            showToast('Preview is only available for individual students. Use Download for bulk.', 'warning');
            return;
        }
        const sess = document.getElementById('rcPreviewSession').options[document.getElementById('rcPreviewSession').selectedIndex].text;
        const cls = document.getElementById('rcPreviewClass').value;
        const sec = document.getElementById('rcPreviewSection').value;

        if (!cls || !sec) {
            showToast('Please select Class and Section for block generation', 'warning');
            return;
        }

        if (!confirm(`Generate report cards for all students in ${cls} - ${sec}?`)) return;

        try {
            setLoading(true);
            const q = schoolData('students').where('session', '==', sess).where('class', '==', cls).where('section', '==', sec);
            const snap = await q.get();
            
            if (snap.empty) {
                showToast('No students found in this group', 'info');
                return;
            }

            showToast(`Processing ${snap.docs.length} report cards...`, 'info');
            for (const doc of snap.docs) {
                await processIndividualReportCard(doc.id, examId, sessionId, format, false);
            }
            showToast('Bulk generation complete!', 'success');
        } catch (e) {
            showToast('Bulk Error: ' + e.message, 'error');
        } finally {
            setLoading(false);
        }
    } else if (studentId) {
        await processIndividualReportCard(studentId, examId, sessionId, format, !isDownload);
    } else {
        showToast('Please select a student or "All Students"', 'error');
    }
}

// Logic extracted for reuse
async function processIndividualReportCard(studentId, examId, sessionId, format, isPreview = false) {
    try {
        if (!isPreview) setLoading(true);
        const sSnap = await schoolDoc('students', studentId).get();
        if (!sSnap.exists) throw new Error('Student not found');
        const student = sSnap.data();

        const examSnap = await schoolDoc('exams', examId).get();
        if (!examSnap.exists) throw new Error('Exam details not found');
        const examDetails = examSnap.data();

        // Get Marks
        const marksSnap = await schoolData('marks')
            .where('studentId', '==', studentId)
            .where('examId', '==', examId)
            .get();
        
        // Convert to array of marks for the factory
        const marks = marksSnap.docs.map(doc => ({
            subject: doc.data().subjectName || doc.data().subjectId,
            marks: doc.data().marks || 0,
            total: doc.data().total || doc.data().marks || 0,
            grade: doc.data().grade || ''
        }));

        // Get School Details
        let schoolDetails = { name: 'SCHOOL NAME', address: 'Address...', phone: '...' };
        try {
            const schoolRef = window.schoolRef;
            if (schoolRef) {
                const schoolSnap = await schoolRef.get();
                if (schoolSnap.exists) schoolDetails = schoolSnap.data();
            }
        } catch (err) { console.error('Error fetching school branding:', err); }

        if (!window.ReportCardFactory) throw new Error('Report Card Factory not loaded');

        const doc = await window.ReportCardFactory.getReportCardDoc(format, student, marks, examDetails, schoolDetails);

        if (isPreview) {
            const container = document.getElementById('rcPreviewContainer');
            if (container) {
                const blobUrl = doc.output('bloburl');
                container.innerHTML = `<iframe src="${blobUrl}" style="width:100%; height:100%; border:none;"></iframe>`;
            }
        } else {
            doc.save(`Report_Card_${student.name.replace(/\s+/g, '_')}_${format}.pdf`);
        }
    } catch (e) {
        showToast(`Error for ${studentId}: ` + e.message, 'error');
    } finally {
        if (!isPreview) setLoading(false);
    }
}

/**
 * EXAM ATTENDANCE MODULE
 */
async function loadExamAttSessions() {
    const select = document.getElementById('examAttSession');
    if (!select) return;
    try {
        const snap = await schoolData('sessions').get();
        select.innerHTML = '<option value="">-- Select --</option>';
        snap.docs.forEach((doc) => {
            select.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`;
        });
    } catch (e) {
        console.error(e);
    }
}

async function loadExamAttClasses() {
    const sid = document.getElementById('examAttSession').value;
    const select = document.getElementById('examAttClass');
    if (!select || !sid) return;
    try {
        const snap = await schoolData('classes').where('sessionId', '==', sid).get();
        select.innerHTML = '<option value="">-- Select --</option>';
        snap.docs.forEach((doc) => {
            select.innerHTML += `<option value="${doc.data().name}">${doc.data().name}</option>`;
        });
    } catch (e) {
        console.error(e);
    }
}

async function loadExamAttSections() {
    /* Simplified */
}
async function loadExamAttSubjects() {
    const select = document.getElementById('examAttSubject');
    if (!select) return;
    try {
        const snap = await schoolData('subjects').get();
        select.innerHTML = '<option value="">-- Select --</option>';
        snap.docs.forEach((doc) => {
            select.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`;
        });

        // Also populate Exams
        const examSelect = document.getElementById('examAttExam');
        const examSnap = await schoolData('exams').get();
        examSelect.innerHTML = '<option value="">-- Select --</option>';
        examSnap.docs.forEach((doc) => {
            examSelect.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`;
        });
    } catch (e) {
        console.error(e);
    }
}

async function refreshExamAttGrid() {
    const cls = document.getElementById('examAttClass').value;
    const body = document.getElementById('examAttGridBody');
    if (!body || !cls) return;

    try {
        const snap = await schoolData('students').where('class', '==', cls).get();
        body.innerHTML = snap.docs
            .map((doc) => {
                const s = doc.data();
                return `
                <tr data-student-id="${doc.id}">
                    <td>${s.roll_no || '-'}</td>
                    <td><strong>${s.name}</strong></td>
                    <td>
                        <select class="att-status" style="width:100px;">
                            <option value="Present">Present</option>
                            <option value="Absent">Absent</option>
                        </select>
                    </td>
                    <td><input type="text" class="att-remarks" placeholder="Optional" style="width:100%;"></td>
                </tr>
            `;
            })
            .join('');
    } catch (e) {
        console.error(e);
    }
}

async function saveExamAttendance() {
    const examId = document.getElementById('examAttExam').value;
    const subjectId = document.getElementById('examAttSubject').value;
    if (!examId || !subjectId) {
        showToast('Select Exam and Subject', 'error');
        return;
    }

    try {
        setLoading(true);
        const rows = document.querySelectorAll('#examAttGridBody tr');
        const batch = (window.db || firebase.firestore()).batch();

        rows.forEach((row) => {
            const studentId = row.dataset.studentId;
            const status = row.querySelector('.att-status').value;
            const remarks = row.querySelector('.att-remarks').value;

            const docRef = schoolDoc('exam_attendance', `${examId}_${subjectId}_${studentId}`);
            batch.set(
                docRef,
                withSchool({
                    studentId,
                    examId,
                    subjectId,
                    status,
                    remarks,
                })
            );
        });

        await batch.commit();
        showToast('Attendance Saved Successfully', 'success');
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    } finally {
        setLoading(false);
    }
}

// Global exposure
window.populateRcPreviewExams = populateRcPreviewExams;
window.previewSingleReportCard = previewSingleReportCard;
window.processIndividualReportCard = processIndividualReportCard;
window.loadExamAttSessions = loadExamAttSessions;
window.loadExamAttClasses = loadExamAttClasses;
window.loadExamAttSections = loadExamAttSections;
window.loadExamAttSubjects = loadExamAttSubjects;
window.refreshExamAttGrid = refreshExamAttGrid;
window.saveExamAttendance = saveExamAttendance;
