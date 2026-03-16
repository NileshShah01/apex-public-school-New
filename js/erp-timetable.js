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

    // Populate class dropdown
    const classSelect = document.getElementById('tt_classSelect');
    if (classSelect && erpState.classes) {
        classSelect.innerHTML =
            '<option value="">Select Class</option>' +
            erpState.classes
                .map((cls) => `<option value="${cls.name}" data-id="${cls.id}">${cls.name}</option>`)
                .join('');
    }

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
        // Use the format expected by student-dashboard.js
        const classId = className.toLowerCase().replace(/\s+/g, '-');
        await schoolDoc('timetables', classId).set(
            withSchool({
                className: className,
                fileData: fileUrl, // student-dashboard uses fileData
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
        const snap = await schoolData('timetables').get();
        if (snap.empty) {
            list.innerHTML =
                '<tr><td colspan="3" style="text-align:center; padding:2rem;">No timetables uploaded yet.</td></tr>';
            return;
        }

        list.innerHTML = snap.docs
            .map((doc) => {
                const d = doc.data();
                const date = d.uploadedAt ? new Date(d.uploadedAt.seconds * 1000).toLocaleDateString() : 'N/A';
                return `
                <tr>
                    <td><strong>Class ${d.className}</strong></td>
                    <td>${date}</td>
                    <td style="text-align:right;">
                        <a href="${d.fileUrl}" target="_blank" class="btn-portal btn-ghost btn-sm"><i class="fas fa-eye"></i> View</a>
                        <button onclick="deleteTimetable('${doc.id}')" class="btn-portal btn-ghost btn-sm btn-danger"><i class="fas fa-trash"></i></button>
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
