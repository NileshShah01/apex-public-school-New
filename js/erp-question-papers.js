/**
 * ERP QUESTION PAPERS MODULE
 * Handles paper library, manual uploads, and publication to student portal
 */

let questionPaperState = {
    papers: [],
    loading: false,
};

async function initQuestionPapers() {
    console.log('ERP Question Papers Initializing...');
    // Initial load will be triggered by showSection
}

async function loadQuestionPapers() {
    const listBody = document.getElementById('paperLibraryTableBody');
    if (!listBody) return;

    const sessionId = document.getElementById('qpSessionFilter').value;
    const examId = document.getElementById('qpExamFilter').value;
    const classId = document.getElementById('qpClassFilter').value;
    const subjectId = document.getElementById('qpSubjectFilter').value;

    listBody.innerHTML =
        '<tr><td colspan="7" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading papers...</td></tr>';

    try {
        let query = schoolData('questionPapers');

        if (sessionId) query = query.where('sessionId', '==', sessionId);
        if (examId) query = query.where('examId', '==', examId);
        if (classId) query = query.where('class', '==', classId);
        if (subjectId) query = query.where('subjectId', '==', subjectId);

        const snap = await query.get();
        // Filter out archived papers and sort by date client-side to avoid complex indexes for now
        questionPaperState.papers = snap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((p) => p.status !== 'archived')
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        renderQuestionPapers();
    } catch (e) {
        console.error('Error loading papers:', e);
        listBody.innerHTML =
            '<tr><td colspan="7" style="text-align:center; color:var(--danger);">Error loading library. Ensure indexes are created.</td></tr>';
    }
}

function renderQuestionPapers() {
    const listBody = document.getElementById('paperLibraryTableBody');
    if (!listBody) return;

    if (questionPaperState.papers.length === 0) {
        listBody.innerHTML =
            '<tr><td colspan="7" style="text-align:center;">No question papers found for selected criteria.</td></tr>';
        return;
    }

    listBody.innerHTML = questionPaperState.papers
        .map((p) => {
            const date = p.createdAt ? new Date(p.createdAt.seconds * 1000).toLocaleDateString() : '-';
            const publishStatus = p.published
                ? '<span class="badge badge-success"><i class="fas fa-globe"></i> Published</span>'
                : '<span class="badge badge-warning"><i class="fas fa-lock"></i> Unpublished</span>';

            let statusColor = '#94a3b8'; // draft
            if (p.status === 'final') statusColor = '#059669';

            return `
            <tr>
                <td><strong>${p.subject}</strong></td>
                <td><span class="badge" style="background:#f1f5f9; color:#64748b;">Class ${p.class}</span></td>
                <td>${p.examId || '-'}</td>
                <td>${p.createdBy || 'AI Tool'} <br><small style="color:var(--text-muted)">Rev: ${p.revisionNumber || 1}</small></td>
                <td><span class="badge" style="background:${statusColor}22; color:${statusColor}; border:1px solid ${statusColor}">${p.status.toUpperCase()}</span></td>
                <td>${publishStatus}</td>
                <td style="text-align:right;">
                    <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
                        ${
                            p.status === 'draft'
                                ? `
                            <button onclick="finalizePaper('${p.id}')" class="btn-portal btn-ghost btn-sm" style="color:var(--success)" title="Finalize"><i class="fas fa-check-circle"></i></button>
                        `
                                : ''
                        }
                        <button onclick="viewPaper('${p.id}')" class="btn-portal btn-ghost btn-sm" title="View/Edit"><i class="fas fa-eye"></i></button>
                        <button onclick="togglePublishPaper('${p.id}', ${!p.published})" class="btn-portal btn-ghost btn-sm" style="color:${p.published ? 'var(--danger)' : 'var(--success)'}" title="${p.published ? 'Unpublish' : 'Publish'}">
                            <i class="fas fa-${p.published ? 'eye-slash' : 'share-square'}"></i>
                        </button>
                        <button onclick="deletePaper('${p.id}')" class="btn-portal btn-ghost btn-sm text-danger" title="Archive"><i class="fas fa-archive"></i></button>
                    </div>
                </td>
            </tr>
        `;
        })
        .join('');
}

async function handleManualPaperUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const session = document.getElementById('uploadQpSession').value;
    const exam = document.getElementById('uploadQpExam').value;
    const className = document.getElementById('uploadQpClass').value;
    const subjectId = document.getElementById('uploadQpSubject').value;

    if (!session || !exam || !className || !subjectId) {
        alert('Please fill all details before uploading.');
        return;
    }

    showLoading(true);
    try {
        const fileName = `${Date.now()}_${file.name}`;
        const storagePath = `question-papers/${CURRENT_SCHOOL_ID}/${session}/${exam}/${className}/${fileName}`;
        const storageRef = firebase.storage().ref(storagePath);

        const task = await storageRef.put(file);
        const downloadUrl = await task.ref.getDownloadURL();

        const subjectName =
            document.getElementById('uploadQpSubject').options[document.getElementById('uploadQpSubject').selectedIndex]
                .text;

        const paperPayload = {
            sessionId: session,
            examId: exam,
            class: className,
            subject: subjectName,
            subjectId: subjectId,
            paperType: 'manualUpload',
            fileUrl: downloadUrl, // Store directly for Student Portal
            status: 'final',
            published: false,
            revisionNumber: 1,
            createdBy: auth.currentUser?.email || 'Admin',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await schoolData('questionPapers').add(withSchool(paperPayload));

        // Store content separately
        await docRef.collection('paperContent').doc('document').set({
            fileUrl: downloadUrl,
            storagePath: storagePath,
        });

        showToast('Question Paper uploaded to Storage!', 'success');
        loadQuestionPapers();
        document.getElementById('manualUploadForm').reset();
    } catch (e) {
        showToast('Upload failed: ' + e.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function togglePublishPaper(id, status) {
    try {
        await schoolDoc('questionPapers', id).update({
            published: status,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        showToast(status ? 'Paper published to Student Portal' : 'Paper unpublished', 'success');
        loadQuestionPapers();
    } catch (e) {
        showToast('Failed to update status', 'error');
    }
}

async function deletePaper(id) {
    if (!confirm('Are you sure you want to archive this paper? It will be removed from the portal.')) return;
    try {
        await schoolDoc('questionPapers', id).update({
            status: 'archived',
            published: false,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        showToast('Paper archived successfully', 'success');
        loadQuestionPapers();
    } catch (e) {
        showToast('Failed to archive', 'error');
    }
}

async function finalizePaper(id) {
    try {
        await schoolDoc('questionPapers', id).update({
            status: 'final',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        showToast('Paper marked as FINAL', 'success');
        loadQuestionPapers();
    } catch (e) {
        showToast('Failed to update status', 'error');
    }
}

async function viewPaper(id) {
    const paper = questionPaperState.papers.find((p) => p.id === id);
    if (!paper) return;

    showLoading(true);
    try {
        const contentDoc = await schoolDoc('questionPapers', id).collection('paperContent').doc('document').get();
        if (!contentDoc.exists) throw new Error('Paper content not found.');

        const content = contentDoc.data();

        if (paper.paperType === 'manualUpload') {
            window.open(content.fileUrl, '_blank');
        } else {
            localStorage.setItem('editPaperData', JSON.stringify(content.paperData));
            window.open('question-formatter/index.html?edit=true&paperId=' + id, '_blank');
        }
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Populate UI Helpers
async function populateQpFilters() {
    const sessions = await schoolData('sessions').get();
    const sessList = sessions.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const sessSelects = ['qpSessionFilter', 'uploadQpSession'];
    sessSelects.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML =
                '<option value="">Select Session</option>' +
                sessList
                    .map((s) => `<option value="${s.id}" ${s.active ? 'selected' : ''}>${s.name}</option>`)
                    .join('');
        }
    });

    const activeSess = sessList.find((s) => s.active);
    if (activeSess) {
        updateQpExams(activeSess.id);
        updateQpClasses(activeSess.id);
        updateQpSubjects(activeSess.id);
    }
}

async function updateQpExams(sessionId) {
    if (!sessionId) return;
    const exams = await schoolData('exams').where('sessionId', '==', sessionId).get();
    const examList = exams.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const examSelects = ['qpExamFilter', 'uploadQpExam'];
    examSelects.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML =
                '<option value="">Select Exam</option>' +
                examList.map((e) => `<option value="${e.id}">${e.name}</option>`).join('');
        }
    });
}

async function updateQpClasses(sessionId) {
    if (!sessionId) return;
    const classes = await schoolData('classes').where('sessionId', '==', sessionId).orderBy('sortOrder', 'asc').get();
    const clsList = classes.docs.map((doc) => doc.data().name);

    const clsSelects = ['qpClassFilter', 'uploadQpClass'];
    clsSelects.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML =
                '<option value="">Select Class</option>' +
                clsList.map((c) => `<option value="${c}">${c}</option>`).join('');
        }
    });
}

async function updateQpSubjects(sessionId) {
    if (!sessionId) return;
    const subjects = await schoolData('subjects').where('sessionId', '==', sessionId).get();
    const subList = subjects.docs.map((doc) => ({ id: doc.id, name: doc.data().name }));

    const subSelects = ['qpSubjectFilter', 'uploadQpSubject'];
    subSelects.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML =
                '<option value="">Select Subject</option>' +
                subList.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
        }
    });
}

// Global exposure
window.initQuestionPapers = initQuestionPapers;
window.loadQuestionPapers = loadQuestionPapers;
window.handleManualPaperUpload = handleManualPaperUpload;
window.deletePaper = deletePaper;
window.finalizePaper = finalizePaper;
window.viewPaper = viewPaper;
window.populateQpFilters = populateQpFilters;
window.updateQpExams = updateQpExams;
window.updateQpClasses = updateQpClasses;
window.updateQpSubjects = updateQpSubjects;
