// Admin Dashboard Logic - Premium Version
const SITE_URL = 'https://nileshshah01.github.io/Apex-public-school-test-01';
let allStudents = [];
let selectedStudents = new Set();
let currentPage = 1;
const itemsPerPage = 20;
let editingDocId = null; // tracks which doc is being edited

function previewPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    document.getElementById('photoFileName').textContent = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('photoPreview').innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
    };
    reader.readAsDataURL(file);
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();

    // Event Listeners
    document.getElementById('studentForm')?.addEventListener('submit', handleStudentSubmit);
    document.getElementById('bulkImportForm')?.addEventListener('submit', handleBulkImport);
    document.getElementById('noticeForm')?.addEventListener('submit', handleNoticeSubmit);
    document.getElementById('searchInput')?.addEventListener('input', () => { currentPage = 1; filterAndDisplayStudents(); });
    document.getElementById('classFilter')?.addEventListener('change', () => { currentPage = 1; filterAndDisplayStudents(); });
    document.getElementById('selectAll')?.addEventListener('change', handleSelectAll);
    document.getElementById('websiteSettingsForm')?.addEventListener('submit', handleWebsiteSettingsSave);

    // Set admin email in header
    auth.onAuthStateChanged((user) => {
        if (user) {
            document.getElementById('adminEmail').textContent = user.email;
        } else {
            window.location.href = 'admin-login.html';
        }
    });
});

async function initializeApp() {
    setLoading(true);
    await loadInitialData();
    updateStats();
    setLoading(false);
}

function setLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `badge badge-${type === 'success' ? 'success' : 'danger'}`;
    toast.style.position = 'fixed';
    toast.style.bottom = '2rem';
    toast.style.right = '2rem';
    toast.style.padding = '1rem 2rem';
    toast.style.zIndex = '2000';
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
}

async function loadInitialData() {
    try {
        const snapshot = await db.collection('students').get();
        allStudents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Populate Class Filters
        const classes = [...new Set(allStudents.map(s => s.class))].sort((a,b) => a-b);
        const classFilter = document.getElementById('classFilter');
        const promoteFrom = document.getElementById('promoteFromClass');
        
        if (classFilter) {
            const currentFilter = classFilter.value;
            classFilter.innerHTML = '<option value="">All Classes</option>';
            classes.forEach(c => {
                classFilter.innerHTML += `<option value="${c}">Class ${c}</option>`;
            });
            classFilter.value = currentFilter;
        }

        if (promoteFrom) {
            promoteFrom.innerHTML = '<option value="">Select Class</option>';
            classes.forEach(c => {
                promoteFrom.innerHTML += `<option value="${c}">Class ${c}</option>`;
            });
        }

        filterAndDisplayStudents();
        loadNoticeHistory();
    } catch (error) {
        console.error("Error loading data:", error);
    }
}

function showSection(sectionId) {
    // Hide all
    document.querySelectorAll('.dashboard-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    // Show target
    const target = document.getElementById(sectionId + 'Section');
    if (target) target.style.display = 'block';

    const activeLink = document.querySelector(`.nav-link[onclick*="'${sectionId}'"]`);
    if (activeLink) activeLink.classList.add('active');

    // Section Titles
    const titles = {
        'studentList': 'Student Management',
        'resultsStatus': 'Result Verification',
        'addStudent': 'Add/Edit Student',
        'bulkImport': 'Bulk Import Students',
        'notices': 'School Notice Board',
        'promotions': 'Class Promotions',
        'websiteSettings': 'Frontend Website Settings',
        'inquiries': 'Admission Inquiries',
        'bulkPdf': 'Bulk PDF Upload'
    };
    document.getElementById('sectionTitle').textContent = titles[sectionId] || 'Dashboard';
    
    // Visibility logic
    document.getElementById('statsOverview').style.display = sectionId === 'studentList' ? 'grid' : 'none';

    if (sectionId === 'resultsStatus') populateResultsStatus();
    if (sectionId === 'studentList') loadInitialData();
    if (sectionId === 'websiteSettings') loadWebsiteSettings();
    if (sectionId === 'inquiries') loadInquiries();
}

async function filterAndDisplayStudents() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || "";
    const classVal = document.getElementById('classFilter')?.value || "";
    const tbody = document.getElementById('studentTableBody');
    if (!tbody) return;
    
    const filtered = allStudents.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm) || s.student_id.toLowerCase().includes(searchTerm);
        const matchesClass = classVal === "" || s.class === classVal;
        return matchesSearch && matchesClass;
    });

    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(start, start + itemsPerPage);

    tbody.innerHTML = '';
    paginated.forEach(student => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="student-checkbox" value="${student.id}" onchange="toggleSelect('${student.id}')" ${selectedStudents.has(student.id) ? 'checked' : ''}></td>
            <td>${student.student_id}</td>
            <td><b>${student.name}</b></td>
            <td><span class="badge" style="background:#f1f5f9; color:#475569;">Class ${student.class || '-'}</span></td>
            <td>${student.section || '-'}</td>
            <td>${student.phone || '-'}</td>
            <td>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-portal btn-ghost btn-sm" onclick="editStudent('${student.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-portal btn-ghost btn-sm btn-danger" onclick="deleteStudent('${student.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderPagination(filtered.length);
}

function renderPagination(total) {
    const container = document.getElementById('paginationControls');
    const totalPages = Math.ceil(total / itemsPerPage);
    if (!container) return;

    container.innerHTML = `
        <div style="display: flex; gap: 1rem; align-items: center;">
            <button class="btn-portal btn-ghost" onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>Prev</button>
            <span style="font-size: 0.875rem;">Page ${currentPage} of ${totalPages || 1}</span>
            <button class="btn-portal btn-ghost" onclick="changePage(1)" ${currentPage >= totalPages ? 'disabled' : ''}>Next</button>
        </div>
    `;
}

function changePage(delta) {
    currentPage += delta;
    filterAndDisplayStudents();
}

// Result and Admit Card Verification
async function populateResultsStatus() {
    const tbody = document.getElementById('resultsStatusTableBody');
    const yearSelect = document.getElementById('resultsYearFilter');
    const year = yearSelect ? yearSelect.value : '2026';
    
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Checking Firebase Storage...</td></tr>';
    
    let resultsCount = 0;
    tbody.innerHTML = '';
    
    for (const student of allStudents) {
        const docId = student.id; 
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${student.student_id || docId}</td>
            <td>${student.name}</td>
            <td>Class ${student.class || '-'}</td>
            <td>
                <div style="display:flex; flex-direction:column; gap:0.25rem;">
                    <div id="status-report-${docId}"><span class="badge" style="background:#f1f5f9; color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> Rep: Checking...</span></div>
                    <div id="status-admit-${docId}"><span class="badge" style="background:#f1f5f9; color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> Adm: Checking...</span></div>
                </div>
            </td>
            <td>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <!-- Report Card Row -->
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <input type="file" id="upload-pdf-${docId}" accept="application/pdf" style="display:none;" onchange="uploadResult(event, '${docId}', '${year}')">
                        <button class="btn-portal btn-ghost btn-sm" onclick="document.getElementById('upload-pdf-${docId}').click()" style="font-size:0.75rem;">
                            <i class="fas fa-upload"></i> Report
                        </button>
                        <a id="preview-btn-${docId}" href="#" target="_blank" class="btn-portal btn-ghost btn-sm hidden" style="font-size:0.75rem;">
                            <i class="fas fa-external-link-alt"></i> View
                        </a>
                    </div>
                    <!-- Admit Card Row -->
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <input type="file" id="upload-admit-${docId}" accept="application/pdf" style="display:none;" onchange="uploadAdmitCard(event, '${docId}', '${year}')">
                        <button class="btn-portal btn-ghost btn-sm" onclick="document.getElementById('upload-admit-${docId}').click()" style="font-size:0.75rem; color:#d97706;">
                            <i class="fas fa-upload"></i> Admit
                        </button>
                        <a id="preview-admit-btn-${docId}" href="#" target="_blank" class="btn-portal btn-ghost btn-sm hidden" style="font-size:0.75rem;">
                            <i class="fas fa-external-link-alt"></i> View
                        </a>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
        
        // 1. Check Report Card 
        db.collection('reports').doc(`${docId}_${year}`).get().then(docRef => {
            const cell = document.getElementById(`status-report-${docId}`);
            if(docRef.exists) {
                if(cell) cell.innerHTML = '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Rep: Available</span>';
                const btn = document.getElementById(`preview-btn-${docId}`);
                if(btn) {
                    btn.onclick = (e) => { e.preventDefault(); window.open().document.write(`<iframe src="${docRef.data().fileData}" width="100%" height="100%" style="border:none;"></iframe>`); };
                    btn.classList.remove('hidden');
                }
                resultsCount++;
                document.getElementById('statTotalResults').textContent = resultsCount;
            } else { throw new Error("Missing"); }
        }).catch(() => {
            const cell = document.getElementById(`status-report-${docId}`);
            if(cell) cell.innerHTML = '<span class="badge badge-danger"><i class="fas fa-times-circle"></i> Rep: Missing</span>';
        });

        // 2. Check Admit Card
        db.collection('admitcards').doc(`${docId}_${year}`).get().then(docRef => {
            const cell = document.getElementById(`status-admit-${docId}`);
            if(docRef.exists) {
                if(cell) cell.innerHTML = '<span class="badge badge-success" style="background:#f59e0b;"><i class="fas fa-check-circle"></i> Adm: Available</span>';
                const btn = document.getElementById(`preview-admit-btn-${docId}`);
                if(btn) {
                    btn.onclick = (e) => { e.preventDefault(); window.open().document.write(`<iframe src="${docRef.data().fileData}" width="100%" height="100%" style="border:none;"></iframe>`); };
                    btn.classList.remove('hidden');
                }
            } else { throw new Error("Missing"); }
        }).catch(() => {
            const cell = document.getElementById(`status-admit-${docId}`);
            if(cell) cell.innerHTML = '<span class="badge badge-danger"><i class="fas fa-times-circle"></i> Adm: Missing</span>';
        });
    }
}

async function uploadResult(event, docId, year) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 900 * 1024) {
        showToast('File too large! Max 900KB for free database storage.', 'error');
        return;
    }

    setLoading(true);
    try {
        const base64 = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
        
        // Save string directly to free Firestore DB
        await db.collection('reports').doc(`${docId}_${year}`).set({
            fileData: base64,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('Result PDF saved to free Database!');
        populateResultsStatus(); // Refresh row statuses
    } catch (e) {
        showToast('Error uploading PDF: ' + e.message, 'error');
    } finally {
        setLoading(false);
    }
}

async function uploadAdmitCard(event, docId, year) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 900 * 1024) {
        showToast('File too large! Max 900KB for free DB storage.', 'error');
        return;
    }

    setLoading(true);
    try {
        const base64 = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
        
        await db.collection('admitcards').doc(`${docId}_${year}`).set({
            fileData: base64,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('Admit Card saved to Database!');
        populateResultsStatus(); 
    } catch (e) {
        showToast('Error uploading Admit Card: ' + e.message, 'error');
    } finally {
        setLoading(false);
    }
}

// Promotion System
async function handlePromotion() {
    const fromClass = document.getElementById('promoteFromClass').value;
    const toClass = document.getElementById('promoteToClass').value;

    if (!fromClass || !toClass) {
        alert("Please select both source and target classes.");
        return;
    }

    const targets = allStudents.filter(s => s.class === fromClass);
    if (targets.length === 0) {
        alert("No students found in the selected class.");
        return;
    }

    if (confirm(`Are you sure you want to promote ${targets.length} students from Class ${fromClass} to Class ${toClass}?`)) {
        setLoading(true);
        try {
            const batch = db.batch();
            targets.forEach(s => {
                batch.update(db.collection('students').doc(s.id), { class: toClass });
            });
            await batch.commit();
            showToast(`Promoted ${targets.length} students successfully!`);
            await loadInitialData();
            showSection('studentList');
        } catch (error) {
            showToast("Promotion failed: " + error.message, "error");
        } finally {
            setLoading(false);
        }
    }
}

// Notice Board
async function handleNoticeSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const title = document.getElementById('noticeTitle').value;
    const message = document.getElementById('noticeMessage').value;

    try {
        await db.collection('notices').add({
            title,
            message,
            date: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast("Notice published!");
        e.target.reset();
        await loadNoticeHistory();
    } catch (e) {
        showToast(e.message, "error");
    } finally {
        setLoading(false);
    }
}

async function loadNoticeHistory() {
    const container = document.getElementById('adminNoticesContainer');
    if (!container) return;

    try {
        const snap = await db.collection('notices').orderBy('date', 'desc').get();
        container.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            const date = d.date ? new Date(d.date.seconds*1000).toLocaleDateString() : 'Just now';
            container.innerHTML += `
                <div style="padding:1rem; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:600;">${d.title}</div>
                        <div style="font-size:0.75rem; color:#666;">${date}</div>
                    </div>
                    <button class="btn-portal btn-ghost btn-sm btn-danger" onclick="deleteNotice('${doc.id}')"><i class="fas fa-trash"></i></button>
                </div>
            `;
        });
    } catch (e) {}
}

async function deleteNotice(id) {
    if (confirm("Delete this notice?")) {
        await db.collection('notices').doc(id).delete();
        loadNoticeHistory();
    }
}

// Website Settings / CMS
async function loadWebsiteSettings() {
    try {
        const doc = await db.collection('settings').doc('general').get();
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('set_marquee').value = data.marquee || '';
            document.getElementById('set_phone').value = data.phone || '';
            document.getElementById('set_email').value = data.email || '';
            document.getElementById('set_address').value = data.address || '';
        }
    } catch (e) {
        console.error("Error loading settings:", e);
    }
}

async function handleWebsiteSettingsSave(e) {
    e.preventDefault();
    setLoading(true);
    try {
        const payload = {
            marquee: document.getElementById('set_marquee').value.trim(),
            phone: document.getElementById('set_phone').value.trim(),
            email: document.getElementById('set_email').value.trim(),
            address: document.getElementById('set_address').value.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('settings').doc('general').set(payload, { merge: true });
        showToast("Website Settings updated live globally!");
    } catch (e) {
        showToast("Error updating settings: " + e.message, "error");
    } finally {
        setLoading(false);
    }
}

// Export Data
function exportStudentData() {
    if (allStudents.length === 0) return;
    
    try {
        const formattedData = allStudents.map(s => ({
            "Student ID": s.student_id || '',
            "Name": s.name || '',
            "Mobile/Phone": s.phone || '',
            "Class": s.class || '',
            "Section": s.section || '',
            "Roll No": s.roll_no || '',
            "Reg No": s.reg_no || '',
            "Gender": s.gender || '',
            "DOB": s.dob || '',
            "Father's Name": s.father_name || '',
            "Mother's Name": s.mother_name || '',
            "Address": s.address || ''
        }));
        
        const ws = XLSX.utils.json_to_sheet(formattedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Students Data");
        XLSX.writeFile(wb, `apex_students_data_${new Date().toISOString().split('T')[0]}.xlsx`);
        showToast("Excel Export Successful!");
    } catch (e) {
        showToast("Error generating Excel file: " + e.message, "error");
    }
}

// Student Management Core
async function handleStudentSubmit(e) {
    e.preventDefault();
    const name    = document.getElementById('student_name').value.trim();
    const father  = document.getElementById('student_father').value.trim();
    const phone   = document.getElementById('student_phone').value.trim();
    // Optional fields
    const sid     = document.getElementById('student_id').value.trim() || phone;
    const sclass  = document.getElementById('student_class').value.trim();
    const sect    = document.getElementById('student_section').value.trim();
    const roll_no = document.getElementById('student_roll_no').value.trim();
    const reg_no  = document.getElementById('student_reg_no').value.trim();
    const gender  = document.getElementById('student_gender').value;
    const dob     = document.getElementById('student_dob').value.trim();
    const mother  = document.getElementById('student_mother').value.trim();
    const address = document.getElementById('student_address').value.trim();
    const photoFile = document.getElementById('student_photo').files[0];

    // Use editingDocId if editing, otherwise use phone as doc ID
    const docId = editingDocId || phone;

    setLoading(true);
    try {
        let photoUrl = '';

        // Upload photo string if selected (bypassing Storage)
        if (photoFile) {
            document.getElementById('uploadProgress').style.display = 'block';
            photoUrl = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX = 300;
                        let w = img.width, h = img.height;
                        if (w > MAX) { h *= MAX/w; w = MAX; }
                        canvas.width = w; canvas.height = h;
                        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                        resolve(canvas.toDataURL('image/jpeg', 0.8));
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(photoFile);
            });
            document.getElementById('uploadProgress').style.display = 'none';
        }

        const studentData = {
            student_id: sid, name, father_name: father,
            phone, class: sclass, section: sect,
            roll_no, reg_no, gender, dob,
            mother_name: mother, address
        };
        if (photoUrl) studentData.photo_url = photoUrl;

        await db.collection('students').doc(docId).set(studentData, { merge: true });
        showToast('Student saved successfully!');
        editingDocId = null;
        showSection('studentList');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        setLoading(false);
        document.getElementById('uploadProgress').style.display = 'none';
    }
}

function toggleSelect(id) {
    if (selectedStudents.has(id)) selectedStudents.delete(id);
    else selectedStudents.add(id);
    updateBulkUI();
}

function handleSelectAll(e) {
    const cbs = document.querySelectorAll('.student-checkbox');
    cbs.forEach(cb => {
        cb.checked = e.target.checked;
        if (e.target.checked) selectedStudents.add(cb.value);
        else selectedStudents.delete(cb.value);
    });
    updateBulkUI();
}

function updateBulkUI() {
    const btn = document.getElementById('bulkDeleteBtn');
    const count = document.getElementById('selectedCount');
    if (selectedStudents.size > 0) {
        btn.classList.remove('hidden');
        count.textContent = selectedStudents.size;
    } else {
        btn.classList.add('hidden');
    }
}

async function handleBulkDelete() {
    if (confirm(`Delete ${selectedStudents.size} students?`)) {
        setLoading(true);
        const batch = db.batch();
        selectedStudents.forEach(id => batch.delete(db.collection('students').doc(id)));
        await batch.commit();
        selectedStudents.clear();
        updateBulkUI();
        loadInitialData();
        setLoading(false);
    }
}

async function deleteStudent(id) {
    if (confirm("Delete this student profile?")) {
        setLoading(true);
        await db.collection('students').doc(id).delete();
        loadInitialData();
        setLoading(false);
    }
}

function editStudent(id) {
    const s = allStudents.find(x => x.id === id);
    if (!s) return;
    editingDocId = id; // remember doc ID for saving
    showSection('addStudent');
    document.getElementById('formTitle').textContent = 'Edit Student Profile';
    document.getElementById('student_id').value = s.student_id || '';
    document.getElementById('student_id').disabled = false;
    document.getElementById('student_name').value = s.name || '';
    document.getElementById('student_father').value = s.father_name || '';
    document.getElementById('student_phone').value = s.phone || '';
    document.getElementById('student_class').value = s.class || '';
    document.getElementById('student_section').value = s.section || '';
    document.getElementById('student_roll_no').value = s.roll_no || '';
    document.getElementById('student_reg_no').value = s.reg_no || '';
    document.getElementById('student_gender').value = s.gender || '';
    document.getElementById('student_dob').value = s.dob || '';
    document.getElementById('student_mother').value = s.mother_name || '';
    document.getElementById('student_address').value = s.address || '';
    // Show existing photo
    const photoDiv = document.getElementById('photoPreview');
    if (s.photo_url) {
        photoDiv.innerHTML = `<img src="${s.photo_url}" style="width:100%;height:100%;object-fit:cover;">`;
    } else {
        photoDiv.innerHTML = '<i class="fas fa-user" style="font-size:2.5rem;color:#94a3b8;"></i>';
    }
}

// Bulk Import
async function handleBulkImport(e) {
    e.preventDefault();
    const file = document.getElementById('csvFile').files[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
        const lines = event.target.result.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        document.getElementById('importStats').style.display = 'block';
        document.getElementById('totalImport').textContent = lines.length - 1;

        let processed = 0;
        for (let i = 1; i < lines.length; i++) {
            const vals = lines[i].split(',').map(v => v.trim());
            if (vals.length < headers.length || !vals[0]) continue;

            const student = {};
            headers.forEach((h, idx) => student[h] = vals[idx]);
            
            if (student.student_id) {
                await db.collection('students').doc(student.student_id).set(student, { merge: true });
                processed++;
                document.getElementById('currentImport').textContent = processed;
            }
        }
        showToast(`Imported ${processed} students!`);
        showSection('studentList');
    };
    reader.readAsText(file);
}

function downloadCSVTemplate() {
    const data = "student_id,name,class,section,roll_no,reg_no,gender,dob,father_name,mother_name,phone,address\n1001,Rahul Kumar,6,A,12,B101,Male,01.01.2015,Suresh Kumar,Meena Devi,9999999999,At- Village Name Dist- Saran";
    const blob = new Blob([data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "student_template.csv";
    a.click();
}

function logoutAdmin() {
    auth.signOut().then(() => window.location.href = 'admin-login.html');
}

function updateStats() {
    document.getElementById('statTotalStudents').textContent = allStudents.length;
    const classes = new Set(allStudents.map(s => s.class));
    document.getElementById('statTotalClasses').textContent = classes.size;
}

// ===================== INQUIRIES =====================
async function loadInquiries() {
    const tbody = document.getElementById('inquiryTableBody');
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading inquiries...</td></tr>';

    try {
        const snap = await db.collection('inquiries').orderBy('submittedAt', 'desc').get();
        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#64748b;">No inquiries yet.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            const date = d.submittedAt ? new Date(d.submittedAt.seconds * 1000).toLocaleDateString('en-IN') : 'N/A';
            const statusColor = d.status === 'New' ? '#ef4444' : d.status === 'Contacted' ? '#f59e0b' : '#10b981';
            tbody.innerHTML += `
                <tr>
                    <td>${date}</td>
                    <td><b>${d.student || '-'}</b></td>
                    <td>${d.parent || '-'}</td>
                    <td><a href="tel:${d.mobile}">${d.mobile || '-'}</a></td>
                    <td>${d.class || '-'}</td>
                    <td>${d.village || '-'}</td>
                    <td><span class="badge" style="background:${statusColor}; color:white;">${d.status || 'New'}</span></td>
                    <td>
                        <select onchange="updateInquiryStatus('${doc.id}', this.value)" style="padding:0.3rem; border-radius:0.3rem; border:1px solid #d1d5db; font-size:0.8rem;">
                            <option ${d.status==='New'?'selected':''}>New</option>
                            <option ${d.status==='Contacted'?'selected':''}>Contacted</option>
                            <option ${d.status==='Admitted'?'selected':''}>Admitted</option>
                            <option ${d.status==='Not Interested'?'selected':''}>Not Interested</option>
                        </select>
                    </td>
                </tr>`;
        });
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#ef4444;">Error: ${e.message}</td></tr>`;
    }
}

async function updateInquiryStatus(docId, newStatus) {
    try {
        await db.collection('inquiries').doc(docId).update({ status: newStatus });
        showToast(`Status updated to "${newStatus}"`);
    } catch(e) {
        showToast('Error updating status: ' + e.message, 'error');
    }
}

// ===================== BULK PDF UPLOAD =====================
async function handleBulkUpload(event, collection) {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    const isReport = collection === 'reports';
    const year = document.getElementById(isReport ? 'bulkReportYear' : 'bulkAdmitYear').value;
    const logDiv = document.getElementById('bulkUploadLog');
    const logItems = document.getElementById('bulkUploadLogItems');
    logDiv.style.display = 'block';
    logItems.innerHTML = `<p style="color:#64748b; margin-bottom:1rem;">Processing ${files.length} files for Year ${year}...</p>`;

    // Build lookup: student_id -> firestore doc.id
    const lookup = {};
    allStudents.forEach(s => {
        if (s.student_id) lookup[s.student_id.trim().toLowerCase()] = s.id;
    });

    let success = 0, failed = 0;

    for (const file of files) {
        const studentIdFromFile = file.name.replace(/\.pdf$/i, '').trim().toLowerCase();
        const docId = lookup[studentIdFromFile];

        if (!docId) {
            logItems.innerHTML += `<div style="padding:0.5rem; background:#fff1f2; border-radius:0.5rem; margin-bottom:0.5rem; color:#be123c;">
                ❌ <b>${file.name}</b> — Student ID "<b>${studentIdFromFile}</b>" not found in system.
            </div>`;
            failed++;
            continue;
        }

        if (file.size > 900 * 1024) {
            logItems.innerHTML += `<div style="padding:0.5rem; background:#fef9c3; border-radius:0.5rem; margin-bottom:0.5rem; color:#854d0e;">
                ⚠️ <b>${file.name}</b> — File too large (max 900KB). Skipped.
            </div>`;
            failed++;
            continue;
        }

        try {
            const base64 = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
            await db.collection(collection).doc(`${docId}_${year}`).set({
                fileData: base64,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            logItems.innerHTML += `<div style="padding:0.5rem; background:#ecfdf5; border-radius:0.5rem; margin-bottom:0.5rem; color:#065f46;">
                ✅ <b>${file.name}</b> — Uploaded for Student "${studentIdFromFile}" (${year})
            </div>`;
            success++;
        } catch(e) {
            logItems.innerHTML += `<div style="padding:0.5rem; background:#fff1f2; border-radius:0.5rem; margin-bottom:0.5rem; color:#be123c;">
                ❌ <b>${file.name}</b> — Upload failed: ${e.message}
            </div>`;
            failed++;
        }
    }

    logItems.innerHTML += `<div style="margin-top:1rem; padding:1rem; background:#f1f5f9; border-radius:0.5rem; font-weight:700;">
        Done: ✅ ${success} uploaded, ❌ ${failed} failed out of ${files.length} files.
    </div>`;
    showToast(`Bulk upload complete: ${success} success, ${failed} failed`);
    event.target.value = ''; // Reset file input
}
