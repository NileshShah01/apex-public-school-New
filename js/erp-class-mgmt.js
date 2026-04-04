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
            <td><small>${session.startDate} to ${session.endDate}</small></td>
            <td>
                <span class="badge" style="background:${session.active ? '#10b981' : '#64748b'}; color:white;">
                    ${session.active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <div style="display: flex; gap: 5px; align-items: center;">
                    <button onclick="toggleSessionActive('${session.id}', ${!session.active})" class="btn-portal btn-ghost" title="${session.active ? 'Deactivate' : 'Set Active'}" style="padding:0.25rem 0.5rem; font-size:0.75rem;">
                         <i class="fas ${session.active ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                    </button>
                    <button onclick="editSession('${session.id}')" class="btn-portal btn-ghost" title="Edit" style="padding:0.25rem 0.5rem; font-size:0.75rem;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteSession('${session.id}')" class="btn-portal btn-ghost" title="Delete" style="color:var(--danger); border-color:var(--danger); padding:0.25rem 0.5rem; font-size:0.75rem;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `
        )
        .join('');
}

/**
 * EDIT SESSION
 */
async function editSession(sessionId) {
    const session = erpState.sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const newName = prompt('Enter new Session Name:', session.name);
    if (newName === null) return; // Cancelled

    const newStart = prompt('Enter Start Date (YYYY-MM-DD):', session.startDate);
    const newEnd = prompt('Enter End Date (YYYY-MM-DD):', session.endDate);

    try {
        showLoading(true);
        await schoolDoc('sessions', sessionId).update({
            name: newName || session.name,
            startDate: newStart || session.startDate,
            endDate: newEnd || session.endDate,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        showToast('Session updated successfully', 'success');
        await loadSessions();
    } catch (error) {
        console.error('Error editing session:', error);
        showToast('Error updating session', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * DELETE SESSION
 */
async function deleteSession(sessionId) {
    if (
        !confirm(
            'Are you sure you want to PERMANENTLY delete this session? This will fail if classes are linked to it.'
        )
    )
        return;

    try {
        showLoading(true);

        // Safety Check: Check for classes in this session
        const classSnap = await schoolData('classes').where('sessionId', '==', sessionId).limit(1).get();

        if (!classSnap.empty) {
            showLoading(false);
            alert(`Cannot delete this session because it has classes linked to it. Delete the classes first.`);
            return;
        }

        await schoolDoc('sessions', sessionId).delete();
        showToast('Session deleted successfully', 'success');
        await loadSessions();
    } catch (error) {
        console.error('Error deleting session:', error);
        showToast('Error deleting session', 'error');
    } finally {
        showLoading(false);
    }
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
        showToast('Error saving session: ' + error.message, 'error');
        alert('DEBUG: Error saving session -> ' + error.message + '\nStack: ' + error.stack);
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
/**
 * CLASSES LOGIC
 * @param {string} sessionId - Optional ID of the session to load classes for.
 */
async function loadClasses(sessionId = null) {
    const targetSessionId = sessionId || erpState.activeSessionId;
    if (!targetSessionId) {
        showToast('Please select/create a session first', 'info');
        return;
    }

    const classesTableBody = document.getElementById('classesTableBody');
    if (!classesTableBody) return;

    classesTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading classes...</td></tr>';

    try {
        const snapshot = await schoolData('classes')
            .where('sessionId', '==', targetSessionId)
            .orderBy('sortOrder', 'asc')
            .get();

        erpState.classes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        renderClasses();
        updateClassDropdowns();
    } catch (error) {
        console.error('Error loading classes:', error);
        // Fallback without sort if index is missing
        const fallback = await schoolData('classes').where('sessionId', '==', targetSessionId).get();
        erpState.classes = fallback.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        renderClasses();
        updateClassDropdowns();
    }
}

function renderClasses() {
    const classesTableBody = document.getElementById('classesTableBody');
    if (!classesTableBody) return;

    if (erpState.classes.length === 0) {
        classesTableBody.innerHTML =
            '<tr><td colspan="5" style="text-align:center;">No classes found for this session.</td></tr>';
        return;
    }

    classesTableBody.innerHTML = erpState.classes
        .map((cls) => {
            const isDisabled = cls.disabled === true;
            return `
        <tr style="${isDisabled ? 'opacity: 0.6; background: #f9fafb;' : ''}">
            <td>${cls.sortOrder}</td>
            <td>
                <strong>${cls.name}</strong> 
                ${isDisabled ? '<span class="badge" style="background:#6b7280; font-size: 10px; padding: 2px 6px; margin-left: 5px;">DISABLED</span>' : ''}
            </td>
            <td>${cls.sections ? cls.sections.length : 0} Sections</td>
            <td>
                <div style="display: flex; gap: 5px; justify-content: flex-end;">
                    <button onclick="editClass('${cls.id}')" class="btn-portal btn-ghost" title="Edit" style="padding:0.25rem 0.5rem; font-size:0.7rem;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="toggleClassStatus('${cls.id}', ${isDisabled})" class="btn-portal btn-ghost" title="${isDisabled ? 'Enable' : 'Disable'}" style="padding:0.25rem 0.5rem; font-size:0.7rem;">
                        <i class="fas ${isDisabled ? 'fa-eye' : 'fa-eye-slash'}"></i>
                    </button>
                    <button onclick="deleteClass('${cls.id}')" class="btn-portal btn-ghost" title="Delete" style="color:var(--danger); border-color:var(--danger); padding:0.25rem 0.5rem; font-size:0.7rem;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
        })
        .join('');
}

/**
 * EDIT CLASS
 */
async function editClass(classId) {
    const cls = erpState.classes.find((c) => c.id === classId);
    if (!cls) return;

    const newName = prompt('Enter new Class Name:', cls.name);
    if (newName === null) return;

    const newSort = prompt('Enter Sort Order (number):', cls.sortOrder);
    if (newSort === null) return;

    try {
        showLoading(true);
        await schoolDoc('classes', classId).update({
            name: newName || cls.name,
            sortOrder: parseInt(newSort) || cls.sortOrder,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        showToast('Class updated successfully', 'success');

        // Refresh by reloading classes for the current session view
        const sessionSelect = document.getElementById('classSessionSelect');
        const selectedSessionId = sessionSelect ? sessionSelect.value : erpState.activeSessionId;
        await loadClasses(selectedSessionId);
    } catch (error) {
        console.error('Error editing class:', error);
        showToast('Error updating class', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * DELETE CLASS
 */
async function deleteClass(classId) {
    if (!confirm('Are you sure you want to PERMANENTLY delete this class? This cannot be undone.')) return;

    try {
        showLoading(true);
        const cls = erpState.classes.find((c) => c.id === classId);
        if (!cls) return;

        // Safety Check: Check for students in this class
        const studentSnap = await schoolData('students').where('class', '==', cls.name).limit(1).get();

        if (!studentSnap.empty) {
            showLoading(false);
            alert(
                `Cannot delete "${cls.name}" because students are still assigned to it. Please move students to another class or just "Disable" this class instead.`
            );
            return;
        }

        // If no students, delete
        await schoolDoc('classes', classId).delete();
        showToast('Class deleted successfully', 'success');
        await loadClasses(); // Refresh
    } catch (error) {
        console.error('Error deleting class:', error);
        showToast('Error deleting class', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * DISABLE/ENABLE CLASS
 */
async function toggleClassStatus(classId, currentlyDisabled) {
    const action = currentlyDisabled ? 'Enable' : 'Disable';
    if (!confirm(`Are you sure you want to ${action} this class?`)) return;

    try {
        showLoading(true);
        await schoolDoc('classes', classId).update({
            disabled: !currentlyDisabled,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        showToast(`Class ${action}d successfully`, 'success');
        await loadClasses(); // Refresh
    } catch (error) {
        console.error('Error toggling class status:', error);
        showToast('Error updating class status', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleClassSubmit(event) {
    event.preventDefault();
    const sessionSelect = document.getElementById('classSessionSelect');
    const selectedSessionId = sessionSelect ? sessionSelect.value : erpState.activeSessionId;

    if (!selectedSessionId) {
        showToast('Please select a session', 'error');
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
                sessionId: selectedSessionId,
                sections: [], // Default empty
            })
        );

        showToast('Class added successfully', 'success');
        document.getElementById('addClassForm').reset();
        await loadClasses(selectedSessionId);
    } catch (error) {
        console.error('Error adding class:', error);
        showToast('Error adding class: ' + error.message, 'error');
        alert('DEBUG: Error adding class -> ' + error.message + '\nStack: ' + error.stack);
    } finally {
        showLoading(false);
    }
}

/**
 * CLASS DETAILS (SECTIONS) LOGIC
 */
async function updateClassDropdowns() {
    const dropdowns = [
        'detailsClassSelect',
        'genFeeClass',
        'idBatchClassSelect',
        'classFilter',
        'uploadQpClass',
        'att_classSelect',
        'hw_classSelect',
        'tt_classSelect',
        'bulkRes_classSelect',
        'analytic_classSelect',
        'notif_classSelect',
        'syllabusClass',
        'enq_class',
        'attnClassSelect',
        'marksClassSelect',
        'allResultsClassSelect',
        'remarkClassSelect',
        'scheduleClassSelect',
        'admitClassSelect',
        'promoteFromClass',
        'tt_classSelect',
        'qpClassFilter',
        'uploadQpClass',
    ];

    dropdowns.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;

        let optionsHtml = '<option value="">Select Class</option>';
        erpState.classes
            .filter((cls) => !cls.disabled)
            .forEach((cls) => {
                // IMPORTANT: detailsClassSelect needs the Firestore ID to manage sections.
                // Others often need the Name for student filtering (class == "Nursery").
                const value = id === 'detailsClassSelect' ? cls.id : cls.name;
                optionsHtml += `<option value="${value}" data-id="${cls.id}">${cls.name}</option>`;
            });
        el.innerHTML = optionsHtml;
    });
}

async function updateSessionDropdowns() {
    // Load sessions if not already loaded
    if (!erpState.sessions || erpState.sessions.length === 0) {
        await loadSessions();
    }

    // If still no sessions, show empty options
    if (!erpState.sessions || erpState.sessions.length === 0) {
        console.warn('No sessions found - please add a session first');
        return;
    }

    // Standard options with ID as value
    const idOptions =
        '<option value="">Select Session</option>' +
        erpState.sessions
            .map((s) => `<option value="${s.id}" ${s.active ? 'selected' : ''}>${s.name}</option>`)
            .join('');

    const sessOptions = [
        'classSessionSelect',
        'bulk_student_session',
        'idGen_session',
        'idIndiv_session',
        'notif_sessionSelect',
        'analytic_sessionSelect',
        'qpSessionFilter',
        'uploadQpSession',
        'att_sessionSelect',
        'repAtt_sessionSelect',
        'hw_sessionSelect',
        'bulkRes_sessionSelect',
        'tt_sessionSelect',
        'student_session',
        'rfid_student_session',
        'pickup_session',
        'addSessionSelect',
    ];

    sessOptions.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = idOptions;
            // Add change listener to load classes when session is selected
            if (!el.getAttribute('data-listener')) {
                el.addEventListener('change', (e) => {
                    if (typeof loadClasses === 'function') {
                        loadClasses(e.target.value);
                    }
                });
                el.setAttribute('data-listener', 'true');
            }
        }
    });

    // Student Registration options with Name as value (for storage consistency)
    const nameOptions =
        '<option value="">Select Session</option>' +
        erpState.sessions
            .map((s) => `<option value="${s.name}" data-id="${s.id}" ${s.active ? 'selected' : ''}>${s.name}</option>`)
            .join('');

    const classSessionSelect = document.getElementById('classSessionSelect');
    if (classSessionSelect) {
        classSessionSelect.innerHTML = idOptions;
        if (!classSessionSelect.getAttribute('data-listener')) {
            classSessionSelect.addEventListener('change', (e) => loadClasses(e.target.value));
            classSessionSelect.setAttribute('data-listener', 'true');
        }
    }

    // Bulk Student Update session dropdown (uses ID as value)
    const bulkSessionSelect = document.getElementById('bulk_student_session');
    if (bulkSessionSelect) {
        bulkSessionSelect.innerHTML = idOptions;
        if (!bulkSessionSelect.getAttribute('data-listener')) {
            bulkSessionSelect.setAttribute('data-listener', 'true');
        }
        // Auto-select active session
        const active = erpState.sessions.find((s) => s.active);
        if (active && !bulkSessionSelect.value) {
            bulkSessionSelect.value = active.id;
        }
    }

    // ID Generator session dropdown
    const idGenSession = document.getElementById('idGen_session');
    if (idGenSession) {
        idGenSession.innerHTML = idOptions;
        const active = erpState.sessions.find((s) => s.active);
        if (active && !idGenSession.value) idGenSession.value = active.id;
    }

    const regSession = document.getElementById('student_session');
    if (regSession) {
        regSession.innerHTML = nameOptions;

        // Auto-load Classes for Registration (only if not already selected/editing)
        if (!regSession.value) {
            const activeSession = erpState.sessions.find((s) => s.active);
            if (activeSession) {
                regSession.value = activeSession.name;
                await loadClassesForRegistration(activeSession.id);
            }
        }
    }
}

/**
 * REGISTRATION FORM DROPDOWNS
 */
async function loadClassesForRegistration(providedSessionId) {
    const regSession = document.getElementById('student_session');
    const classSelect = document.getElementById('student_class');
    if (!classSelect) return;

    let sessionId = providedSessionId;
    if (!sessionId && regSession) {
        const selectedOption = regSession.options[regSession.selectedIndex];
        sessionId = selectedOption?.getAttribute('data-id');
    }

    // Reset selection and show loading
    classSelect.innerHTML = '<option value="">Loading Classes...</option>';
    const secSelect = document.getElementById('student_section');
    if (secSelect) secSelect.innerHTML = '<option value="">Select Class First</option>';

    if (!sessionId) {
        classSelect.innerHTML = '<option value="">Select Session First</option>';
        return;
    }

    try {
        console.log(`Loading classes for session: ${sessionId}`);
        const snapshot = await schoolData('classes').where('sessionId', '==', sessionId).get();

        let classes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // Client-side sort if needed
        classes.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        classSelect.innerHTML =
            '<option value="">Select Class</option>' +
            classes
                .filter((cls) => !cls.disabled) // Filter out disabled
                .map((cls) => `<option value="${cls.name}" data-id="${cls.id}">${cls.name}</option>`)
                .join('');

        // Store registration classes temporarily
        erpState.regClasses = classes;

        if (classes.length === 0) {
            classSelect.innerHTML = '<option value="">No Classes Found</option>';
        }
    } catch (error) {
        console.error('Error loading registration classes:', error);
        classSelect.innerHTML = '<option value="">Error Loading Classes</option>';
    }
}

/**
 * BULK STUDENT UPDATE DROPDOWNS
 */
async function loadClassesForBulkUpdate() {
    const sessionSelect = document.getElementById('bulk_student_session');
    const classSelect = document.getElementById('bulk_student_class');
    const sectionSelect = document.getElementById('bulk_student_section');
    if (!sessionSelect || !classSelect) return;

    const sessionId = sessionSelect.value;
    classSelect.innerHTML = '<option value="">Loading Classes...</option>';
    if (sectionSelect) sectionSelect.innerHTML = '<option value="">Select Class First</option>';

    if (!sessionId) {
        classSelect.innerHTML = '<option value="">Select Session First</option>';
        return;
    }

    try {
        const snapshot = await schoolData('classes').where('sessionId', '==', sessionId).get();
        let classes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        classes.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        classSelect.innerHTML =
            '<option value="">Select Class</option>' +
            classes
                .filter((c) => !c.disabled)
                .map(
                    (c) =>
                        `<option value="${c.name}" data-id="${c.id}" data-sections='${JSON.stringify(c.sections || [])}'>${c.name}</option>`
                )
                .join('');
    } catch (e) {
        console.error('Error loading bulk classes:', e);
        classSelect.innerHTML = '<option value="">Error Loading</option>';
    }
}

window.loadClassesForBulkUpdate = loadClassesForBulkUpdate;

async function loadBulkSectionsForUpdate() {
    const classSelect = document.getElementById('bulk_student_class');
    const sectionSelect = document.getElementById('bulk_student_section');
    if (!classSelect || !sectionSelect) return;

    const selectedOpt = classSelect.options[classSelect.selectedIndex];
    let sections = [];
    try {
        sections = JSON.parse(selectedOpt?.getAttribute('data-sections') || '[]');
    } catch (e) {}

    sectionSelect.innerHTML =
        '<option value="">All Sections</option>' + sections.map((s) => `<option value="${s}">${s}</option>`).join('');
}

window.loadBulkSectionsForUpdate = loadBulkSectionsForUpdate;

async function loadBulkStudentList() {
    const sessionSelect = document.getElementById('bulk_student_session');
    const classSelect = document.getElementById('bulk_student_class');
    const sectionSelect = document.getElementById('bulk_student_section');
    const fieldsSelect = document.getElementById('bulk_update_fields');
    const thead = document.getElementById('bulkUpdateTableHead');
    const tbody = document.getElementById('bulkUpdateTableBody');
    if (!tbody) return;

    const sessionId = sessionSelect?.value;
    const className = classSelect?.value;
    if (!sessionId || !className) {
        tbody.innerHTML =
            '<tr><td colspan="9" class="text-center p-3 text-slate-muted"><i class="fas fa-filter text-2xl opacity-03 mb-1 block"></i>Select Session and Class to start bulk editing</td></tr>';
        return;
    }

    // Update visible columns based on selection
    const fieldSelection = fieldsSelect?.value || 'all';
    const colConfig = {
        col_roll: ['all', 'roll'],
        col_father: ['all', 'father'],
        col_mobile: ['all', 'contact'],
        col_dob: ['all', 'personal'],
        col_blood: ['all', 'personal'],
        col_address: ['all', 'contact'],
        col_sms: ['all', 'contact'],
    };

    // Show/hide headers based on selection
    if (thead) {
        Object.keys(colConfig).forEach((col) => {
            const show = colConfig[col].includes(fieldSelection);
            const th = thead.querySelector('.' + col);
            if (th) {
                th.classList.toggle('hidden', !show);
            }
        });
    }

    tbody.innerHTML =
        '<tr><td colspan="9" class="text-center p-2"><i class="fas fa-spinner fa-spin"></i> Loading students...</td></tr>';

    try {
        // Get the session name for filtering
        const sessionDoc = erpState.sessions.find((s) => s.id === sessionId);
        const sessionName = sessionDoc ? sessionDoc.name : '';

        let q = schoolData('students').where('class', '==', className);
        const snap = await q.get();
        const students = snap.docs
            .map((doc) => ({ docId: doc.id, ...doc.data() }))
            .filter((s) => !sessionName || !s.session || s.session === sessionName);

        const sectionFilter = sectionSelect?.value || '';
        const filtered = sectionFilter ? students.filter((s) => s.section === sectionFilter) : students;

        if (filtered.length === 0) {
            tbody.innerHTML =
                '<tr><td colspan="9" class="text-center p-3">No students found for selected filters.</td></tr>';
            return;
        }

        // Column visibility map for body cells
        const getColClass = (col) => {
            const show = colConfig[col].includes(fieldSelection);
            return show ? col : col + ' hidden';
        };

        tbody.innerHTML = filtered
            .map(
                (s) => `
            <tr data-doc-id="${s.docId}">
                <td>${s.student_id || s.docId}</td>
                <td><input type="text" value="${s.name || ''}" class="form-control" style="min-width:120px" data-field="name" onchange="markBulkDirty('${s.docId}',this)" /></td>
                <td class="${getColClass('col_roll')}"><input type="text" value="${s.roll_no || ''}" class="form-control" data-field="roll_no" onchange="markBulkDirty('${s.docId}',this)" /></td>
                <td class="${getColClass('col_father')}"><input type="text" value="${s.father_name || s.fatherName || ''}" class="form-control" data-field="father_name" onchange="markBulkDirty('${s.docId}',this)" /></td>
                <td class="${getColClass('col_mobile')}"><input type="text" value="${s.mobile || s.phone || ''}" class="form-control" data-field="mobile" onchange="markBulkDirty('${s.docId}',this)" /></td>
                <td class="${getColClass('col_dob')}"><input type="date" value="${s.dob || ''}" class="form-control" data-field="dob" onchange="markBulkDirty('${s.docId}',this)" /></td>
                <td class="${getColClass('col_blood')}"><input type="text" value="${s.blood_group || ''}" class="form-control" data-field="blood_group" onchange="markBulkDirty('${s.docId}',this)" /></td>
                <td class="${getColClass('col_address')}"><input type="text" value="${s.address || ''}" class="form-control" data-field="address" onchange="markBulkDirty('${s.docId}',this)" /></td>
                <td class="${getColClass('col_sms')}"><input type="text" value="${s.sms_contact || ''}" class="form-control" data-field="sms_contact" onchange="markBulkDirty('${s.docId}',this)" /></td>
            </tr>`
            )
            .join('');
    } catch (e) {
        console.error('Error loading bulk students:', e);
        tbody.innerHTML =
            '<tr><td colspan="9" class="text-center p-3 text-danger">Error loading students: ' +
            e.message +
            '</td></tr>';
    }
}

window.loadBulkStudentList = loadBulkStudentList;

// Track dirty rows in bulk update
window._bulkDirtyRows = {};
window.markBulkDirty = function (docId, input) {
    if (!window._bulkDirtyRows[docId]) window._bulkDirtyRows[docId] = {};
    window._bulkDirtyRows[docId][input.getAttribute('data-field')] = input.value;
    input.style.borderColor = '#f59e0b'; // Yellow highlight for changed
};

window.saveBulkStudentUpdate = async function () {
    const dirty = window._bulkDirtyRows;
    const docIds = Object.keys(dirty);
    if (docIds.length === 0) {
        showToast('No changes to save', 'info');
        return;
    }

    if (!confirm(`Save changes for ${docIds.length} student record(s)?`)) return;
    showLoading(true);
    try {
        const batch = (window.db || firebase.firestore()).batch();
        docIds.forEach((id) => {
            batch.update(schoolDoc('students', id), dirty[id]);
        });
        await batch.commit();
        window._bulkDirtyRows = {};
        // Reset highlight
        document
            .querySelectorAll('[style*="border-color: rgb(245, 158, 11)"]')
            .forEach((el) => (el.style.borderColor = ''));
        showToast(`Saved ${docIds.length} student(s) successfully!`);
    } catch (e) {
        showToast('Error saving: ' + e.message, 'error');
    } finally {
        showLoading(false);
    }
};

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
            classes
                .filter((cls) => !cls.disabled)
                .map((cls) => `<option value="${cls.name}">${cls.name}</option>`)
                .join('');

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
window.deleteClass = deleteClass;
window.toggleClassStatus = toggleClassStatus;

/**
 * ID GENERATOR - Cascading Selectors
 */

// Batch Mode: Load classes when session changes
window.idGenLoadClasses = async function () {
    const sessionId = document.getElementById('idGen_session')?.value;
    const classSelect = document.getElementById('idBatchClassSelect');
    if (!classSelect) return;
    classSelect.innerHTML = '<option value="">Loading...</option>';
    if (!sessionId) {
        classSelect.innerHTML = '<option value="">Select Session First</option>';
        return;
    }
    try {
        const snap = await schoolData('classes').where('sessionId', '==', sessionId).get();
        let classes = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((c) => !c.disabled);
        classes.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        classSelect.innerHTML =
            '<option value="">Select Class</option>' +
            classes.map((c) => `<option value="${c.name}">${c.name}</option>`).join('');
    } catch (e) {
        classSelect.innerHTML = '<option value="">Error loading</option>';
    }
};

// Individual Mode: Load classes when session changes
window.idIndivLoadClasses = async function () {
    const sessionId = document.getElementById('idIndiv_session')?.value;
    const classSelect = document.getElementById('idIndiv_class');
    const studentSelect = document.getElementById('idIndiv_student');
    if (!classSelect) return;
    classSelect.innerHTML = '<option value="">Loading...</option>';
    if (studentSelect) studentSelect.innerHTML = '<option value="">Select Class First</option>';
    if (!sessionId) {
        classSelect.innerHTML = '<option value="">Select Session First</option>';
        return;
    }
    try {
        const snap = await schoolData('classes').where('sessionId', '==', sessionId).get();
        let classes = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((c) => !c.disabled);
        classes.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        classSelect.innerHTML =
            '<option value="">Select Class</option>' +
            classes.map((c) => `<option value="${c.name}" data-id="${c.id}">${c.name}</option>`).join('');
    } catch (e) {
        classSelect.innerHTML = '<option value="">Error loading</option>';
    }
};

// Individual Mode: Load students when class changes
window.idIndivLoadStudents = async function () {
    const className = document.getElementById('idIndiv_class')?.value;
    const sessionId = document.getElementById('idIndiv_session')?.value;
    const studentSelect = document.getElementById('idIndiv_student');
    if (!studentSelect) return;
    studentSelect.innerHTML = '<option value="">Loading students...</option>';
    if (!className) {
        studentSelect.innerHTML = '<option value="">Select Class First</option>';
        return;
    }
    try {
        const session = erpState.sessions.find((s) => s.id === sessionId);
        const sessionName = session ? session.name : '';
        const snap = await schoolData('students').where('class', '==', className).get();
        let students = snap.docs
            .map((d) => ({ docId: d.id, ...d.data() }))
            .filter((s) => !sessionName || !s.session || s.session === sessionName);
        students.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        studentSelect.innerHTML =
            '<option value="">Select Student</option>' +
            students
                .map((s) => `<option value="${s.docId}">${s.name || s.docId} (${s.student_id || ''})</option>`)
                .join('');
    } catch (e) {
        studentSelect.innerHTML = '<option value="">Error loading</option>';
    }
};

// Individual Mode: Load ID preview when student is selected
window.idIndivPreview = async function () {
    const docId = document.getElementById('idIndiv_student')?.value;
    if (!docId) return;
    try {
        const doc = await schoolDoc('students', docId).get();
        if (!doc.exists) {
            showToast('Student not found', 'error');
            return;
        }
        const sidInput = document.getElementById('idPrintSid');
        if (sidInput) {
            sidInput.value = docId;
        }
        if (typeof updateIdPreview === 'function') updateIdPreview(doc.data());
        else showToast('Student selected! Click Download to generate ID card.', 'info');
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
};

// Initialize ID Generator session dropdown (called on section open)
window.initIdGenerator = function () {
    const sessOpts =
        '<option value="">Select Session</option>' +
        erpState.sessions
            .map((s) => `<option value="${s.id}" ${s.active ? 'selected' : ''}>${s.name}</option>`)
            .join('');
    const indivSess = document.getElementById('idIndiv_session');
    if (indivSess) indivSess.innerHTML = sessOpts;
    // idGen_session already handled by updateSessionDropdowns
    // Auto-trigger class load for active session in individual mode
    const active = erpState.sessions.find((s) => s.active);
    if (active && indivSess) {
        indivSess.value = active.id;
        window.idIndivLoadClasses();
    }
};
