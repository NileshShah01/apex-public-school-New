/**
 * erp-timetable.js - Timetable Management Logic
 */

let timetableState = {
    timetables: {},
};

/**
 * Initialize Timetable Module
 */
async function initERPTimetable() {
    console.log('ERP Timetable Initializing...');

    // Populate session dropdowns
    const sessSelects = ['tt_sessionSelect', 'ttSessionSelect'];
    sessSelects.forEach(id => {
        const el = document.getElementById(id);
        if (el && erpState.sessions) {
            el.innerHTML =
                '<option value="">Select Session</option>' +
                erpState.sessions
                    .map((s) => `<option value="${s.id}" ${s.active ? 'selected' : ''}>${s.name}</option>`)
                    .join('');
        }
    });

    // Populate class dropdowns
    const classSelects = ['tt_classSelect', 'ttClassSelect'];
    classSelects.forEach(id => {
        const el = document.getElementById(id);
        if (el && erpState.classes) {
            el.innerHTML =
                '<option value="">Select Class</option>' +
                erpState.classes
                    .map((cls) => `<option value="${cls.name}" data-id="${cls.id}">${cls.name}</option>`)
                    .join('');
        }
    });

    await loadTimetableList();
}

/**
 * Handle Timetable Upload
 */
async function handleTimetableUpload(event) {
    event.preventDefault();

    const className = document.getElementById('tt_classSelect').value;
    const fileInput = document.getElementById('tt_file');

    if (!className || fileInput.files.length === 0) {
        showToast('Please select a class and a file', 'error');
        return;
    }

    try {
        showLoading(true);
        const file = fileInput.files[0];

        // 1. Upload to Storage
        const storageRef = storage.ref(
            `schools/${schoolId}/timetables/${className.replace(/\s+/g, '_')}_${Date.now()}`
        );
        const uploadTask = await storageRef.put(file);
        const fileUrl = await uploadTask.ref.getDownloadURL();

        // 2. Save to Firestore
        const sessionId = document.getElementById('tt_sessionSelect').value;
        const classId = className.toLowerCase().replace(/\s+/g, '-');
        await schoolDoc('timetables', classId).set(
            withSchool({
                className: className,
                sessionId: sessionId,
                fileData: fileUrl,
                fileUrl: fileUrl,
                uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
            })
        );

        showToast(`Timetable for Class ${className} uploaded successfully!`);
        event.target.reset();
        await loadTimetableList();
    } catch (e) {
        console.error('Error uploading timetable:', e);
        showToast('Error uploading timetable', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Load List of Timetables
 */
async function loadTimetableList() {
    const list = document.getElementById('timetableListBody');
    if (!list) return;

    try {
        const sessFilter = document.getElementById('ttSessionSelect')?.value;
        const classFilter = document.getElementById('ttClassSelect')?.value;

        let query = schoolData('timetables');
        // Note: Firestore doesn't support multiple inequalities, but here we use equality.
        // However, complex filtering might require indexes. For now, we'll filter client-side if needed, 
        // or just apply simple where clauses if possible.
        
        let snap = await query.get();
        let docs = snap.docs.map(doc => ({id: doc.id, ...doc.data()}));

        if (sessFilter) {
            // If session is stored in the doc, filter here. 
            // Currently erp-timetable.js doesn't seem to store sessionId in the doc during upload.
            // Let's check handleTimetableUpload.
        }
        if (classFilter) {
            docs = docs.filter(d => d.className === classFilter);
        }

        if (docs.length === 0) {
            list.innerHTML =
                '<tr><td colspan="3" style="text-align:center; padding:2rem;">No timetables found for the selected criteria.</td></tr>';
            return;
        }

        list.innerHTML = docs
            .map((d) => {
                const date = d.uploadedAt ? new Date(d.uploadedAt.seconds * 1000).toLocaleDateString() : 'N/A';
                return `
                <tr>
                    <td><strong>Class ${d.className}</strong></td>
                    <td>${date}</td>
                    <td style="text-align:right;">
                        <a href="${d.fileUrl}" target="_blank" class="btn-portal btn-ghost btn-sm"><i class="fas fa-eye"></i> View</a>
                        <button onclick="deleteTimetable('${d.id}')" class="btn-portal btn-ghost btn-sm btn-danger"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
            })
            .join('');
    } catch (e) {
        console.error('Error loading timetables:', e);
    }
}

async function deleteTimetable(id) {
    if (!confirm('Are you sure you want to delete this timetable?')) return;
    try {
        showLoading(true);
        await schoolDoc('timetables', id).delete();
        showToast('Timetable deleted');
        await loadTimetableList();
    } catch (e) {
        showToast('Error deleting timetable', 'error');
    } finally {
        showLoading(false);
    }
}

// Hook into window
window.initERPTimetable = initERPTimetable;
window.handleTimetableUpload = handleTimetableUpload;
window.deleteTimetable = deleteTimetable;
window.loadTimetableList = loadTimetableList;
