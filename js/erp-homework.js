/**
 * erp-homework.js - Homework Management Logic
 */

let homeworkState = {
    homeworks: [],
    editingId: null,
};

/**
 * Initialize Homework Module
 */
async function initERPHomework() {
    console.log('ERP Homework Initializing...');

    // Populate session dropdown for homework
    const sessionSelect = document.getElementById('hw_sessionSelect');
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
            await loadHomeworkClasses();
        }
    }

    await loadHomeworkHistory();
}

/**
 * Load classes for homework
 */
async function loadHomeworkClasses() {
    const sessionSelect = document.getElementById('hw_sessionSelect');
    const classSelect = document.getElementById('hw_classSelect');
    if (!sessionSelect || !classSelect) return;

    const sessionId = sessionSelect.value;
    if (!sessionId) {
        classSelect.innerHTML = '<option value="">Select Class</option>';
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
        const secSelect = document.getElementById('hw_sectionSelect');
        if (secSelect) secSelect.innerHTML = '<option value="">Select Section</option>';

        // Also load subjects for this session
        await loadHomeworkSubjects(sessionId);
    } catch (e) {
        console.error('Error loading homework classes:', e);
    }
}

async function loadHomeworkSubjects(sessionId) {
    const subSelect = document.getElementById('hw_subjectSelect');
    if (!subSelect) return;

    try {
        const snapshot = await schoolData('subjects').where('sessionId', '==', sessionId).get();
        const subjects = snapshot.docs.map((doc) => doc.data().name);

        subSelect.innerHTML =
            '<option value="">Select Subject</option>' +
            subjects.map((s) => `<option value="${s}">${s}</option>`).join('');
    } catch (e) {
        console.error('Error loading subjects:', e);
    }
}

function updateHomeworkSections() {
    const classSelect = document.getElementById('hw_classSelect');
    const secSelect = document.getElementById('hw_sectionSelect');
    if (!classSelect || !secSelect) return;

    const selectedOption = classSelect.options[classSelect.selectedIndex];
    const classId = selectedOption?.getAttribute('data-id');

    if (!classId) return;

    const cls = erpState.classes.find((c) => c.id === classId);
    if (!cls || !cls.sections) return;

    secSelect.innerHTML =
        '<option value="All">All Sections</option>' +
        cls.sections.map((sec) => `<option value="${sec}">${sec}</option>`).join('');
}

/**
 * Handle Homework Submission
 */
async function handleHomeworkSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const session =
        document.getElementById('hw_sessionSelect').options[document.getElementById('hw_sessionSelect').selectedIndex]
            .text;
    const className = document.getElementById('hw_classSelect').value;
    const section = document.getElementById('hw_sectionSelect').value;
    const subject = document.getElementById('hw_subjectSelect').value;
    const title = document.getElementById('hw_title').value.trim();
    const description = document.getElementById('hw_description').value.trim();
    const date = document.getElementById('hw_date').value || new Date().toISOString().split('T')[0];
    const fileInput = document.getElementById('hw_file');

    if (!className || !subject || !title || !description) {
        showToast('Please fill all mandatory fields', 'error');
        return;
    }

    try {
        showLoading(true);
        let attachmentUrl = '';

        // Handle File Upload if exists
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const storageRef = storage.ref(`schools/${schoolId}/homework/${Date.now()}_${file.name}`);
            const uploadTask = await storageRef.put(file);
            attachmentUrl = await uploadTask.ref.getDownloadURL();
        }

        const hwData = withSchool({
            session,
            class: className,
            section,
            subject,
            title,
            description,
            content: description, // Backward compatibility for student dashboard
            date: firebase.firestore.Timestamp.fromDate(new Date(date)),
            attachment: attachmentUrl,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        });

        if (homeworkState.editingId) {
            await schoolDoc('homework', homeworkState.editingId).update(hwData);
            showToast('Homework updated successfully');
        } else {
            await schoolData('homework').add(hwData);
            showToast('Homework assigned successfully');
        }

        form.reset();
        homeworkState.editingId = null;
        document.getElementById('hw_formSubmitBtn').innerHTML = '<i class="fas fa-paper-plane"></i> Assign Homework';
        await loadHomeworkHistory();
    } catch (e) {
        console.error('Error saving homework:', e);
        showToast('Error saving homework', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Load History
 */
async function loadHomeworkHistory() {
    const list = document.getElementById('homeworkHistoryList');
    if (!list) return;

    try {
        const snap = await schoolData('homework').orderBy('timestamp', 'desc').limit(20).get();

        if (snap.empty) {
            list.innerHTML =
                '<p style="text-align:center; padding:2rem; color:var(--text-muted);">No homework history found.</p>';
            return;
        }

        list.innerHTML = snap.docs
            .map((doc) => {
                const d = doc.data();
                const dateStr = d.date ? new Date(d.date.seconds * 1000).toLocaleDateString() : 'N/A';
                return `
                <div class="card" style="margin-bottom: 1rem; border-left: 4px solid var(--primary);">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <span class="badge" style="background:var(--bg-gray);">${d.subject}</span>
                            <span class="badge" style="background:var(--primary); color:white;">Class ${d.class} (${d.section})</span>
                            <h4 style="margin: 0.5rem 0 0.25rem;">${d.title}</h4>
                            <p style="font-size:0.8rem; color:var(--text-muted);">For Date: ${dateStr}</p>
                        </div>
                        <div style="display:flex; gap:0.5rem;">
                            <button onclick="editHomework('${doc.id}')" class="btn-portal btn-ghost btn-sm" title="Edit"><i class="fas fa-edit"></i></button>
                            <button onclick="deleteHomework('${doc.id}')" class="btn-portal btn-ghost btn-sm btn-danger" title="Delete"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            `;
            })
            .join('');
    } catch (e) {
        console.error('Error loading history:', e);
    }
}

async function deleteHomework(id) {
    if (!confirm('Are you sure you want to delete this homework?')) return;
    try {
        showLoading(true);
        await schoolDoc('homework', id).delete();
        showToast('Homework deleted');
        await loadHomeworkHistory();
    } catch (e) {
        showToast('Error deleting homework', 'error');
    } finally {
        showLoading(false);
    }
}

async function editHomework(id) {
    try {
        showLoading(true);
        const doc = await schoolDoc('homework', id).get();
        if (!doc.exists) return;
        const d = doc.data();

        homeworkState.editingId = id;
        document.getElementById('hw_title').value = d.title;
        document.getElementById('hw_description').value = d.description;
        document.getElementById('hw_subjectSelect').value = d.subject;
        document.getElementById('hw_classSelect').value = d.class;
        updateHomeworkSections();
        document.getElementById('hw_sectionSelect').value = d.section;

        document.getElementById('hw_formSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Update Homework';
        showSection('assignHomework');
    } catch (e) {
        console.error(e);
    } finally {
        showLoading(false);
    }
}

// Hook into window
window.initERPHomework = initERPHomework;
window.loadHomeworkClasses = loadHomeworkClasses;
window.updateHomeworkSections = updateHomeworkSections;
window.handleHomeworkSubmit = handleHomeworkSubmit;
window.deleteHomework = deleteHomework;
window.editHomework = editHomework;
window.loadHomeworkHistory = loadHomeworkHistory;
