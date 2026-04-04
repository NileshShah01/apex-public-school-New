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
            await schoolDoc('settings', 'fees').set(
                {
                    fineAmount: parseFloat(fineAmount) || 0,
                    gracePeriod: parseInt(gracePeriod) || 10,
                    fineType: fineType,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
            );

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
                if (document.getElementById('feeFineAmount'))
                    document.getElementById('feeFineAmount').value = data.fineAmount || 0;
                if (document.getElementById('feeFineGracePeriod'))
                    document.getElementById('feeFineGracePeriod').value = data.gracePeriod || 10;
                if (document.getElementById('feeFineType'))
                    document.getElementById('feeFineType').value = data.fineType || 'fixed';
            }
        } catch (error) {
            console.error('Error loading fine settings:', error);
        }
    };

    // --- SYLLABUS & RESOURCE MANAGEMENT ---
    window.saveSyllabus = async function (e) {
        if (e) e.preventDefault();
        setLoading(true);

        const className = document.getElementById('syllabusClass').value;
        const subject = document.getElementById('syllabusSubject').value;
        const resourceType = document.getElementById('syllabusType').value;
        const fileInput = document.getElementById('syllabusFile');
        const linkInput = document.getElementById('syllabusLink').value;

        if (!className || !subject) {
            showToast('Please select class and enter subject', 'warning');
            setLoading(false);
            return;
        }

        try {
            let fileUrl = linkInput;
            let fileName = '';

            // Handle file upload if selected
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                fileName = file.name;

                // For now, store as base64 for small files (Firestore limit)
                // For production, use Firebase Storage
                if (file.size < 2 * 1024 * 1024) {
                    // 2MB limit for base64
                    const reader = new FileReader();
                    const base64Promise = new Promise((resolve, reject) => {
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                    const base64 = await base64Promise;
                    fileUrl = base64;
                } else {
                    showToast('File too large. Please use a URL for large files.', 'warning');
                    setLoading(false);
                    return;
                }
            } else if (!linkInput) {
                showToast('Please upload a file or enter a URL', 'warning');
                setLoading(false);
                return;
            }

            const syllabusId = `${className}_${subject}_${resourceType}`.replace(/\s+/g, '_').toLowerCase();
            await schoolDoc('syllabus', syllabusId).set(
                {
                    id: syllabusId,
                    className,
                    subject,
                    resourceType,
                    fileUrl,
                    fileName: fileName || linkInput.split('/').pop(),
                    link: linkInput,
                    uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
            );

            showToast(
                `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} uploaded successfully!`,
                'success'
            );
            document.getElementById('addSyllabusForm').reset();
            loadSyllabusList();
        } catch (error) {
            console.error('Error saving syllabus:', error);
            showToast('Failed to save syllabus.', 'error');
        } finally {
            setLoading(false);
        }
    };

    window.loadSyllabusList = async function () {
        const container = document.getElementById('syllabusListContainer');
        const filterClass = document.getElementById('syllabusFilterClass')?.value || '';
        if (!container) return;

        container.innerHTML =
            '<div class="col-span-full text-center p-2"><i class="fas fa-spinner fa-spin"></i> Loading resources...</div>';

        try {
            let snapshot;
            if (filterClass) {
                snapshot = await schoolData('syllabus').where('className', '==', filterClass).get();
            } else {
                snapshot = await schoolData('syllabus').get();
            }

            if (snapshot.empty) {
                container.innerHTML =
                    '<div class="col-span-full text-center p-2 text-muted">No resources uploaded yet.</div>';
                return;
            }

            // Group by class
            const grouped = {};
            snapshot.forEach((doc) => {
                const data = doc.data();
                const cls = data.className || 'Other';
                if (!grouped[cls]) grouped[cls] = [];
                grouped[cls].push({ id: doc.id, ...data });
            });

            let html = '';
            for (const cls of Object.keys(grouped).sort()) {
                html += `<div class="col-span-full font-bold text-primary mt-1-5">${cls}</div>`;
                for (const item of grouped[cls]) {
                    const typeIcon =
                        item.resourceType === 'book'
                            ? 'fa-book'
                            : item.resourceType === 'notes'
                              ? 'fa-sticky-note'
                              : item.resourceType === 'worksheet'
                                ? 'fa-file-alt'
                                : item.resourceType === 'guide'
                                  ? 'fa-bookmark'
                                  : 'fa-list-alt';
                    const isBase64 = item.fileUrl && item.fileUrl.startsWith('data:');

                    html += `
                        <div class="card p-1 flex-between gap-1">
                            <div class="flex items-center gap-1">
                                <i class="fas ${typeIcon} text-primary text-xl"></i>
                                <div>
                                    <div class="font-600">${item.subject}</div>
                                    <div class="text-xs text-muted">${item.resourceType} - ${item.fileName || 'Document'}</div>
                                </div>
                            </div>
                            <div class="flex gap-0-5">
                                <a href="${item.fileUrl}" target="_blank" class="btn-portal btn-sm btn-primary">
                                    <i class="fas fa-eye"></i> View
                                </a>
                                <button onclick="deleteSyllabus('${item.id}')" class="btn-portal btn-sm btn-danger" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }
            }
            container.innerHTML = html;
        } catch (error) {
            console.error('Error loading syllabus:', error);
            container.innerHTML =
                '<div class="col-span-full text-center p-2 text-danger">Error loading resources.</div>';
        }
    };

    window.deleteSyllabus = async function (id) {
        if (!confirm('Are you sure you want to delete this resource?')) return;
        setLoading(true);
        try {
            await schoolDoc('syllabus', id).delete();
            showToast('Resource deleted', 'success');
            loadSyllabusList();
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Delete failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Override or extend showSection via unified reference
    const toolsPreviousShowSection = window.showSection;
    window.showSection = function (sectionId, updateHash = true) {
        if (typeof toolsPreviousShowSection === 'function') {
            toolsPreviousShowSection(sectionId, updateHash);
        } else {
            console.warn('Previous showSection not found in Tools extension');
        }

        if (sectionId === 'manageFeeFine') loadFeeFineSettings();
        if (sectionId === 'addSyllabusSection') loadSyllabusList();
    };
})();
