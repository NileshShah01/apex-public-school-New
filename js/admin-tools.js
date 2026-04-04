/**
 * admin-tools.js
 * Handles specialized administrative modules like Fee Fines, Discounts, and Syllabus.
 */

(function () {
    // Relies on global schoolData and schoolDoc from firebase-config.js

    // --- FEE FINE MANAGEMENT ---
    window.saveFeeFineSettings = async function (e) {
        if (e) e.preventDefault();
        const fineAmount = document.getElementById('feeFineAmount').value;
        const gracePeriod = document.getElementById('feeFineGracePeriod').value;
        const fineType = document.getElementById('feeFineType').value;

        try {
            await schoolDoc('settings', 'fees').set({
                fineAmount: parseFloat(fineAmount) || 0,
                gracePeriod: parseInt(gracePeriod) || 10,
                fineType: fineType,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            showToast('Fee fine settings saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving fine settings:', error);
            showToast('Failed to save fine settings.', 'error');
        }
    };

    window.loadFeeFineSettings = async function () {
        try {
            const doc = await schoolDoc('settings', 'fees').get();
            if (doc.exists) {
                const data = doc.data();
                if (document.getElementById('feeFineAmount')) document.getElementById('feeFineAmount').value = data.fineAmount || 0;
                if (document.getElementById('feeFineGracePeriod')) document.getElementById('feeFineGracePeriod').value = data.gracePeriod || 10;
                if (document.getElementById('feeFineType')) document.getElementById('feeFineType').value = data.fineType || 'fixed';
            }
        } catch (error) {
            console.error('Error loading fine settings:', error);
        }
    };

    // --- SYLLABUS MANAGEMENT ---
    window.saveSyllabus = async function (e) {
        if (e) e.preventDefault();
        const className = document.getElementById('syllabusClass').value;
        const subject = document.getElementById('syllabusSubject').value;
        const link = document.getElementById('syllabusLink').value;

        if (!className || !subject || !link) {
            showToast('Please fill all fields', 'warning');
            return;
        }

        try {
            const syllabusId = `${className}_${subject}`.replace(/\s+/g, '_').toLowerCase();
            await schoolDoc('syllabus', syllabusId).set({
                className,
                subject,
                link,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showToast('Syllabus added successfully!', 'success');
            document.getElementById('addSyllabusForm').reset();
            loadSyllabusList();
        } catch (error) {
            console.error('Error saving syllabus:', error);
            showToast('Failed to save syllabus.', 'error');
        }
    };

    window.loadSyllabusList = async function () {
        const container = document.getElementById('syllabusListContainer');
        if (!container) return;

        container.innerHTML = '<p class="text-center p-2">Loading syllabus...</p>';

        try {
            const snapshot = await schoolData('syllabus').orderBy('updatedAt', 'desc').get();
            
            if (snapshot.empty) {
                container.innerHTML = '<p class="text-center p-2 text-muted">No syllabus added yet.</p>';
                return;
            }

            let html = `
                <table class="table-portal mt-1">
                    <thead>
                        <tr>
                            <th>Class</th>
                            <th>Subject</th>
                            <th>Link</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            snapshot.forEach(doc => {
                const data = doc.data();
                html += `
                    <tr>
                        <td>${data.className}</td>
                        <td>${data.subject}</td>
                        <td><a href="${data.link}" target="_blank" class="text-primary"><i class="fas fa-external-link-alt"></i> View</a></td>
                        <td>
                            <button onclick="deleteSyllabus('${doc.id}')" class="btn-icon text-danger" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });

            html += '</tbody></table>';
            container.innerHTML = html;
        } catch (error) {
            console.error('Error loading syllabus:', error);
            // Try without orderBy if field missing
            try {
                const snapshot2 = await schoolData('syllabus').get();
                if (snapshot2.empty) {
                    container.innerHTML = '<p class="text-center p-2 text-muted">No syllabus added yet.</p>';
                    return;
                }
                // ... same render logic ...
                let html2 = `<table class="table-portal mt-1"><thead><tr><th>Class</th><th>Subject</th><th>Link</th><th>Action</th></tr></thead><tbody>`;
                snapshot2.forEach(doc => {
                    const data = doc.data();
                    html2 += `<tr><td>${data.className}</td><td>${data.subject}</td><td><a href="${data.link}" target="_blank" class="text-primary"><i class="fas fa-external-link-alt"></i> View</a></td><td><button onclick="deleteSyllabus('${doc.id}')" class="btn-icon text-danger" title="Delete"><i class="fas fa-trash"></i></button></td></tr>`;
                });
                html2 += '</tbody></table>';
                container.innerHTML = html2;
            } catch (e2) {
                container.innerHTML = '<p class="text-center p-2 text-danger">Error loading syllabus.</p>';
            }
        }
    };

    window.deleteSyllabus = async function (id) {
        if (!confirm('Are you sure you want to delete this syllabus?')) return;
        try {
            await schoolDoc('syllabus', id).delete();
            showToast('Syllabus deleted', 'success');
            loadSyllabusList();
        } catch (error) {
            showToast('Delete failed', 'error');
        }
    };

    // Register callback for section changes via robust hook system
    if (typeof window.addShowSectionHook === 'function') {
        window.addShowSectionHook((sectionId) => {
            if (sectionId === 'manageFeeFine') loadFeeFineSettings();
            if (sectionId === 'addSyllabus') loadSyllabusList();
        });
    } else {
        // Fallback for older configurations (deprecated)
        const toolsPreviousShowSection = window.showSection;
        window.showSection = function (sectionId, updateHash = true) {
            if (typeof toolsPreviousShowSection === 'function') toolsPreviousShowSection(sectionId, updateHash);
            if (sectionId === 'manageFeeFine') loadFeeFineSettings();
            if (sectionId === 'addSyllabus') loadSyllabusList();
        };
    }

})();
