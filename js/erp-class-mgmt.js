/**
 * erp-class-mgmt.js - Core logic for Academic Sessions and Class Management
 * Handles Firestore persistency for the ERP suite.
 */

// Global State for ERP
let erpState = {
    activeSessionId: null,
    sessions: [],
    classes: [],
    subjects: [],
    nonSubjects: [],
    regClasses: [],
};

/**
 * Initialize ERP Class Management
 */
async function initERPClassMgmt() {
    console.log('ERP Class Management Initializing...');
    try {
        await loadSessions();
        if (erpState.activeSessionId) {
            await Promise.all([
                loadClasses(),
                loadSubjects(),
                loadNonSubjects(),
                // Initialize elective dropdowns
                loadElectiveDropdowns(),
            ]);
        }
    } catch (e) {
        console.error('Initialization failed:', e);
    }
}

/**
 * SESSIONS LOGIC
 */
async function loadSessions() {
    const sessionsTableBody = document.getElementById('sessionsTableBody');
    if (!sessionsTableBody) return;

    sessionsTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading sessions...</td></tr>';

    try {
        console.log('Fetching sessions from Firestore...');
        const snapshot = await schoolData('sessions').get();
        erpState.sessions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // Find active session
        const active = erpState.sessions.find((s) => s.active);
        if (active) erpState.activeSessionId = active.id;

        renderSessions();
        updateSessionDropdowns();
    } catch (error) {
        console.error('CRITICAL: Error loading sessions:', error);
        if (error.code === 'permission-denied') {
            showToast('Database Permission Denied for Sessions. Please check Firestore Rules.', 'error');
        } else {
            showToast('Error loading sessions: ' + error.message, 'error');
        }
        sessionsTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--danger);">
            <i class="fas fa-exclamation-triangle"></i> Permission Denied. Contact Admin to update Firestore Rules for 'sessions' collection.
        </td></tr>`;
    }
}

function renderSessions() {
    const sessionsTableBody = document.getElementById('sessionsTableBody');
    if (!sessionsTableBody) return;

    if (erpState.sessions.length === 0) {
        sessionsTableBody.innerHTML =
            '<tr><td colspan="4" style="text-align:center;">No sessions found. Create one to begin.</td></tr>';
        return;
    }

    sessionsTableBody.innerHTML = erpState.sessions
        .map(
            (session) => `
        <tr>
            <td><strong>${session.name}</strong></td>
            <td>${session.startDate} to ${session.endDate}</td>
            <td>
                <span class="badge" style="background:${session.active ? '#10b981' : '#64748b'}; color:white;">
                    ${session.active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <button onclick="toggleSessionActive('${session.id}', ${!session.active})" class="btn-portal btn-ghost" style="padding:0.25rem 0.5rem; font-size:0.7rem;">
                    ${session.active ? 'Deactivate' : 'Set Active'}
                </button>
            </td>
        </tr>
    `
        )
        .join('');
}

async function handleSessionSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('sessionNameInput').value.trim();
    const start = document.getElementById('sessionStartDate').value;
    const end = document.getElementById('sessionEndDate').value;
    const active = document.getElementById('sessionIsActive').checked;

    if (!name || !start || !end) return;

    try {
        showLoading(true);

        // If this session is marked active, deactivate all others first
        if (active) {
            const batch = (window.db || firebase.firestore()).batch();
            erpState.sessions.forEach((s) => {
                if (s.active) batch.update(schoolDoc('sessions', s.id), { active: false });
            });
            await batch.commit();
        }

        await schoolData('sessions').add(
            withSchool({
                name,
                startDate: start,
                endDate: end,
                active,
            })
        );

        showToast('Session created successfully!', 'success');
        document.getElementById('addSessionForm').reset();
        await loadSessions();
    } catch (error) {
        console.error('Error adding session:', error);
        showToast('Error saving session', 'error');
    } finally {
        showLoading(false);
    }
}

async function toggleSessionActive(sessionId, shouldBeActive) {
    try {
        showLoading(true);
        const batch = (window.db || firebase.firestore()).batch();

        // Deactivate all
        erpState.sessions.forEach((s) => {
            batch.update(schoolDoc('sessions', s.id), { active: false });
        });

        // Activate target if requested
        if (shouldBeActive) {
            batch.update(schoolDoc('sessions', sessionId), { active: true });
        }

        await batch.commit();
        showToast('Session status updated', 'success');
        await loadSessions();
    } catch (error) {
        console.error('Error toggling session:', error);
        showToast('Error updating session status', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * CLASSES LOGIC
 */
async function loadClasses() {
    if (!erpState.activeSessionId) {
        showToast('Please select/create an active session first', 'info');
        return;
    }

    const classesTableBody = document.getElementById('classesTableBody');
    if (!classesTableBody) return;

    classesTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading classes...</td></tr>';

    try {
        const snapshot = await schoolData('classes')
            .where('sessionId', '==', erpState.activeSessionId)
            .orderBy('sortOrder', 'asc')
            .get();

        erpState.classes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        renderClasses();
        updateClassDropdowns();
    } catch (error) {
        console.error('Error loading classes:', error);
        // If index doesn't exist, it might fail. fallback without order
        const fallback = await schoolData('classes').where('sessionId', '==', erpState.activeSessionId).get();
        erpState.classes = fallback.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        renderClasses();
    }
}

function renderClasses() {
    const classesTableBody = document.getElementById('classesTableBody');
    if (!classesTableBody) return;

    if (erpState.classes.length === 0) {
        classesTableBody.innerHTML =
            '<tr><td colspan="4" style="text-align:center;">No classes found for this session.</td></tr>';
        return;
    }

    classesTableBody.innerHTML = erpState.classes
        .map(
            (cls) => `
        <tr>
            <td>${cls.sortOrder}</td>
            <td><strong>${cls.name}</strong></td>
            <td>${cls.sections ? cls.sections.length : 0} Sections</td>
            <td>
                <button onclick="deleteClass('${cls.id}')" class="btn-portal btn-ghost" style="color:var(--danger); border-color:var(--danger); padding:0.25rem 0.5rem; font-size:0.7rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `
        )
        .join('');
}

async function handleClassSubmit(event) {
    event.preventDefault();
    if (!erpState.activeSessionId) {
        showToast('No active session found', 'error');
        return;
    }

    const name = document.getElementById('classNameInput').value.trim();
    const order = parseInt(document.getElementById('classSortOrder').value);

    try {
        showLoading(true);
        await schoolData('classes').add(
            withSchool({
                name,
                sortOrder: order,
                sessionId: erpState.activeSessionId,
                sections: [], // Default empty
            })
        );

        showToast('Class added successfully', 'success');
        document.getElementById('addClassForm').reset();
        await loadClasses();
    } catch (error) {
        console.error('Error adding class:', error);
        showToast('Error adding class', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * CLASS DETAILS (SECTIONS) LOGIC
 */
async function updateClassDropdowns() {
    const dropdowns = ['detailsClassSelect'];
    dropdowns.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML =
            '<option value="">Select Class</option>' +
            erpState.classes.map((cls) => `<option value="${cls.id}">${cls.name}</option>`).join('');
    });
}

async function updateSessionDropdowns() {
    const regSession = document.getElementById('student_session');
    if (regSession) {
        regSession.innerHTML =
            '<option value="">Select Session</option>' +
            erpState.sessions
                .map(
                    (s) =>
                        `<option value="${s.name}" data-id="${s.id}" ${s.active ? 'selected' : ''}>${s.name}</option>`
                )
                .join('');

        // If an active session exists, load its classes immediately
        if (erpState.activeSessionId) {
            await loadClassesForRegistration();
        }
    }
}

/**
 * REGISTRATION FORM DROPDOWNS
 */
async function loadClassesForRegistration() {
    const regSession = document.getElementById('student_session');
    if (!regSession) return;
    const selectedOption = regSession.options[regSession.selectedIndex];
    const sessionId = selectedOption?.getAttribute('data-id');
    const classSelect = document.getElementById('student_class');
    if (!classSelect) return;

    if (!sessionId) {
        classSelect.innerHTML = '<option value="">Select Session First</option>';
        return;
    }

    try {
        const snapshot = await schoolData('classes')
            .where('sessionId', '==', sessionId)
            .orderBy('sortOrder', 'asc') // Added orderBy for consistency
            .get();

        const classes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        classSelect.innerHTML =
            '<option value="">Select Class</option>' +
            classes.map((cls) => `<option value="${cls.name}" data-id="${cls.id}">${cls.name}</option>`).join('');

        // Reset section select
        const secSelect = document.getElementById('student_section');
        if (secSelect) secSelect.innerHTML = '<option value="">Select Class First</option>';

        // Store registration classes temporarily if needed
        erpState.regClasses = classes;
    } catch (error) {
        console.error('Error loading registration classes:', error);
    }
}

async function updateRegistrationSections() {
    const classSelect = document.getElementById('student_class');
    if (!classSelect) return;
    const selectedOption = classSelect.options[classSelect.selectedIndex];
    const classId = selectedOption?.getAttribute('data-id');
    const secSelect = document.getElementById('student_section');
    if (!secSelect) return;

    if (!classId) {
        secSelect.innerHTML = '<option value="">Select Class First</option>';
        return;
    }

    const cls = erpState.regClasses.find((c) => c.id === classId);
    if (!cls || !cls.sections || cls.sections.length === 0) {
        secSelect.innerHTML = '<option value="">No Sections Found</option>';
        return;
    }

    secSelect.innerHTML =
        '<option value="">Select Section</option>' +
        cls.sections.map((sec) => `<option value="${sec}">${sec}</option>`).join('');
}

/**
 * AUTO-INCREMENT STUDENT ID
 */
async function getNextStudentId() {
    const counterRef = schoolDoc('counters', 'students');

    try {
        return await (window.db || firebase.firestore()).runTransaction(async (transaction) => {
            const doc = await transaction.get(counterRef);
            if (!doc.exists) {
                transaction.set(counterRef, withSchool({ lastId: 1000 }));
                return 1000;
            }
            const newId = doc.data().lastId + 1;
            transaction.update(counterRef, {
                lastId: newId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            return newId;
        });
    } catch (error) {
        console.error('Error getting next Student ID:', error);
        // Fallback: check max ID in students collection
        const snapshot = await schoolData('students').orderBy('student_id', 'desc').limit(1).get();
        if (snapshot.empty) return 1000;
        const maxId = parseInt(snapshot.docs[0].data().student_id);
        return isNaN(maxId) ? 1000 : maxId + 1;
    }
}

async function loadClassDetails() {
    const classId = document.getElementById('detailsClassSelect').value;
    const list = document.getElementById('activeSectionsList');
    if (!list) return;

    if (!classId) {
        list.innerHTML = '<p style="color:var(--text-muted);">Please select a class above</p>';
        return;
    }

    const cls = erpState.classes.find((c) => c.id === classId);
    if (!cls || !cls.sections || cls.sections.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted);">No sections defined yet.</p>';
        return;
    }

    list.innerHTML = cls.sections
        .map(
            (sec) => `
        <div style="background:var(--primary); color:white; padding:0.4rem 1rem; border-radius:1rem; display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; font-weight:600; box-shadow:var(--shadow);">
            ${sec}
            <i class="fas fa-times" onclick="removeSection('${classId}', '${sec}')" style="cursor:pointer; opacity:0.7; font-size:0.7rem;"></i>
        </div>
    `
        )
        .join('');
}

async function handleAddSection() {
    const classId = document.getElementById('detailsClassSelect').value;
    const sectionName = document.getElementById('newSectionInput').value.trim().toUpperCase();

    if (!classId || !sectionName) return;

    try {
        showLoading(true);
        const ref = schoolDoc('classes', classId);
        await ref.update({
            sections: firebase.firestore.FieldValue.arrayUnion(sectionName),
        });

        showToast(`Section ${sectionName} added`, 'success');
        document.getElementById('newSectionInput').value = '';

        // Update local state and re-render
        const cls = erpState.classes.find((c) => c.id === classId);
        if (cls) {
            if (!cls.sections) cls.sections = [];
            if (!cls.sections.includes(sectionName)) cls.sections.push(sectionName);
        }
        loadClassDetails();
    } catch (error) {
        console.error('Error adding section:', error);
        showToast('Error adding section', 'error');
    } finally {
        showLoading(false);
    }
}

async function removeSection(classId, sectionName) {
    if (!confirm(`Are you sure you want to remove Section ${sectionName}?`)) return;

    try {
        showLoading(true);
        const ref = schoolDoc('classes', classId);
        await ref.update({
            sections: firebase.firestore.FieldValue.arrayRemove(sectionName),
        });

        const cls = erpState.classes.find((c) => c.id === classId);
        if (cls) cls.sections = cls.sections.filter((s) => s !== sectionName);

        loadClassDetails();
    } catch (error) {
        console.error('Error removing section:', error);
    } finally {
        showLoading(false);
    }
}

// Hook into the main window for simple use in HTML onclicks
/**
 * SUBJECTS LOGIC
 */
async function loadSubjects() {
    if (!erpState.activeSessionId) return;
    const body = document.getElementById('subjectsTableBody');
    if (!body) return;

    try {
        const snapshot = await schoolData('subjects').where('sessionId', '==', erpState.activeSessionId).get();

        erpState.subjects = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        renderSubjects();
    } catch (error) {
        console.error('Error loading subjects:', error);
    }
}

function renderSubjects() {
    const body = document.getElementById('subjectsTableBody');
    if (!body) return;

    body.innerHTML = erpState.subjects
        .map(
            (sub) => `
        <tr>
            <td><strong>${sub.name}</strong></td>
            <td>${sub.code || '-'}</td>
            <td><span class="badge" style="background:${sub.type === 'Elective' ? '#f59e0b' : '#3b82f6'}; color:white;">${sub.type}</span></td>
            <td>
                <button onclick="deleteSubject('${sub.id}')" class="btn-portal btn-ghost" style="color:var(--danger); border-color:var(--danger); padding:0.25rem 0.5rem; font-size:0.7rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `
        )
        .join('');
}

async function handleSubjectSubmit(event) {
    event.preventDefault();
    if (!erpState.activeSessionId) {
        showToast('No active session', 'error');
        return;
    }

    const name = document.getElementById('subjectNameInput').value.trim();
    const code = document.getElementById('subjectCodeInput').value.trim();
    const type = document.getElementById('subjectTypeSelect').value;

    try {
        showLoading(true);
        await schoolData('subjects').add(
            withSchool({
                name,
                code,
                type,
                sessionId: erpState.activeSessionId,
            })
        );
        showToast('Subject added', 'success');
        document.getElementById('addSubjectForm').reset();
        await loadSubjects();
    } catch (e) {
        showToast('Error adding subject', 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteSubject(id) {
    if (!confirm('Delete this subject?')) return;
    try {
        showLoading(true);
        await schoolDoc('subjects', id).delete();
        await loadSubjects();
    } catch (e) {
        showToast('Error deleting subject', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * NON-SCHOLASTIC LOGIC
 */
async function loadNonSubjects() {
    if (!erpState.activeSessionId) return;
    const body = document.getElementById('nonSubjectsTableBody');
    if (!body) return;

    try {
        const snapshot = await schoolData('nonSubjects').where('sessionId', '==', erpState.activeSessionId).get();

        erpState.nonSubjects = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        renderNonSubjects();
    } catch (error) {
        console.error('Error loading non-subjects:', error);
    }
}

function renderNonSubjects() {
    const body = document.getElementById('nonSubjectsTableBody');
    if (!body) return;

    body.innerHTML = erpState.nonSubjects
        .map(
            (ns) => `
        <tr>
            <td><strong>${ns.name}</strong></td>
            <td>${ns.description || '-'}</td>
            <td>
                <button onclick="deleteNonSubject('${ns.id}')" class="btn-portal btn-ghost" style="color:var(--danger); border-color:var(--danger); padding:0.25rem 0.5rem; font-size:0.7rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `
        )
        .join('');
}

async function handleNonSubjectSubmit(event) {
    event.preventDefault();
    if (!erpState.activeSessionId) return;

    const name = document.getElementById('nonSubjectNameInput').value.trim();
    const description = document.getElementById('nonSubjectDescInput').value.trim();

    try {
        showLoading(true);
        await schoolData('nonSubjects').add(
            withSchool({
                name,
                description,
                sessionId: erpState.activeSessionId,
            })
        );
        showToast('Area added', 'success');
        document.getElementById('addNonSubjectForm').reset();
        await loadNonSubjects();
    } catch (e) {
        showToast('Error saving area', 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteNonSubject(id) {
    if (!confirm('Delete this co-scholastic area?')) return;
    try {
        showLoading(true);
        await schoolDoc('nonSubjects', id).delete();
        await loadNonSubjects();
    } catch (e) {
        showToast('Error deleting area', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * ELECTIVE MAPPING LOGIC
 */
async function loadElectiveDropdowns() {
    const sessionSelect = document.getElementById('electiveSessionSelect');
    if (!sessionSelect) return;

    sessionSelect.innerHTML =
        '<option value="">Select Session</option>' +
        erpState.sessions
            .map((s) => `<option value="${s.id}" ${s.active ? 'selected' : ''}>${s.name}</option>`)
            .join('');

    // Trigger initial class load for active session
    if (erpState.activeSessionId) {
        loadClassesForElectives();
    }
}

async function loadClassesForElectives() {
    const sessionId = document.getElementById('electiveSessionSelect').value;
    const classSelect = document.getElementById('electiveClassSelect');
    if (!classSelect || !sessionId) return;

    try {
        const snapshot = await schoolData('classes')
            .where('sessionId', '==', sessionId)
            .orderBy('sortOrder', 'asc')
            .get();
        const classes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        classSelect.innerHTML =
            '<option value="">Select Class</option>' +
            classes.map((cls) => `<option value="${cls.name}">${cls.name}</option>`).join('');

        // Also load elective subjects for this session
        const subSnapshot = await schoolData('subjects')
            .where('sessionId', '==', sessionId)
            .where('type', '==', 'Elective')
            .get();

        const subjects = subSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const subSelect = document.getElementById('electiveSubjectSelect');
        if (subSelect) {
            subSelect.innerHTML =
                '<option value="">Select Elective Subject</option>' +
                subjects.map((s) => `<option value="${s.name}">${s.name}</option>`).join('');
        }
    } catch (e) {
        console.error('Error loading elective context:', e);
    }
}

async function loadStudentsForElectives() {
    const className = document.getElementById('electiveClassSelect').value;
    const sessionName =
        document.getElementById('electiveSessionSelect').options[
            document.getElementById('electiveSessionSelect').selectedIndex
        ].text;
    const body = document.getElementById('electiveStudentsTableBody');
    if (!body || !className) return;

    body.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading students...</td></tr>';

    try {
        const snapshot = await schoolData('students')
            .where('class', '==', className)
            .where('session', '==', sessionName)
            .get();

        const students = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        if (students.length === 0) {
            body.innerHTML =
                '<tr><td colspan="4" style="text-align:center;">No students found in this class.</td></tr>';
            return;
        }

        body.innerHTML = students
            .map(
                (s) => `
            <tr>
                <td><input type="checkbox" class="elective-student-cb" value="${s.id}"></td>
                <td>${s.roll_no || '-'}</td>
                <td><strong>${s.name}</strong></td>
                <td>${s.electives ? s.electives.join(', ') : '-'}</td>
            </tr>
        `
            )
            .join('');
    } catch (e) {
        console.error('Error loading students for electives:', e);
        body.innerHTML =
            '<tr><td colspan="4" style="text-align:center; color:var(--danger);">Error loading students.</td></tr>';
    }
}

function toggleAllElectiveStudents(master) {
    const cbs = document.querySelectorAll('.elective-student-cb');
    cbs.forEach((cb) => (cb.checked = master.checked));
}

async function handleBulkElectiveMapping() {
    const subject = document.getElementById('electiveSubjectSelect').value;
    const checkedStudents = Array.from(document.querySelectorAll('.elective-student-cb:checked')).map((cb) => cb.value);

    if (!subject) {
        showToast('Please select a subject first', 'error');
        return;
    }
    if (checkedStudents.length === 0) {
        showToast('No students selected', 'error');
        return;
    }

    try {
        showLoading(true);
        const batch = (window.db || firebase.firestore()).batch();
        checkedStudents.forEach((id) => {
            batch.update(schoolDoc('students', id), {
                electives: firebase.firestore.FieldValue.arrayUnion(subject),
            });
        });
        await batch.commit();
        showToast(`Subject ${subject} mapped to ${checkedStudents.length} students`, 'success');
        await loadStudentsForElectives();
    } catch (e) {
        showToast('Error mapping subjects', 'error');
    } finally {
        showLoading(false);
    }
}

window.loadClassesForElectives = loadClassesForElectives;
window.loadStudentsForElectives = loadStudentsForElectives;
window.toggleAllElectiveStudents = toggleAllElectiveStudents;
window.handleBulkElectiveMapping = handleBulkElectiveMapping;
window.handleSubjectSubmit = handleSubjectSubmit;
window.deleteSubject = deleteSubject;
window.handleNonSubjectSubmit = handleNonSubjectSubmit;
window.deleteNonSubject = deleteNonSubject;
window.handleSessionSubmit = handleSessionSubmit;
window.handleClassSubmit = handleClassSubmit;
window.toggleSessionActive = toggleSessionActive;
window.loadClassDetails = loadClassDetails;
window.handleAddSection = handleAddSection;
window.removeSection = removeSection;
window.updateRegistrationSections = updateRegistrationSections;
window.loadClassesForRegistration = loadClassesForRegistration;
window.getNextStudentId = getNextStudentId;
