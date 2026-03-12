// Admin Dashboard Logic - Premium Version
const SITE_URL = 'https://nileshshah01.github.io/Apex-public-school-test-01';
let allStudents = [];
let selectedStudents = new Set();
let currentPage = 1;
const itemsPerPage = 20;

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();

    // Event Listeners
    document.getElementById('studentForm')?.addEventListener('submit', handleStudentSubmit);
    document.getElementById('bulkImportForm')?.addEventListener('submit', handleBulkImport);
    document.getElementById('noticeForm')?.addEventListener('submit', handleNoticeSubmit);
    document.getElementById('searchInput')?.addEventListener('input', () => { currentPage = 1; filterAndDisplayStudents(); });
    document.getElementById('classFilter')?.addEventListener('change', () => { currentPage = 1; filterAndDisplayStudents(); });
    document.getElementById('selectAll')?.addEventListener('change', handleSelectAll);

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
        'promotions': 'Class Promotions'
    };
    document.getElementById('sectionTitle').textContent = titles[sectionId] || 'Dashboard';
    
    // Visibility logic
    document.getElementById('statsOverview').style.display = sectionId === 'studentList' ? 'grid' : 'none';

    if (sectionId === 'resultsStatus') populateResultsStatus();
    if (sectionId === 'studentList') loadInitialData();
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
            <td><span class="badge" style="background:#f1f5f9; color:#475569;">Class ${student.class}</span></td>
            <td>${student.section}</td>
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

// Result Verification
async function populateResultsStatus() {
    const tbody = document.getElementById('resultsStatusTableBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Scanning repository for PDF files...</td></tr>';
    
    let resultsCount = 0;
    tbody.innerHTML = '';
    
    for (const student of allStudents) {
        const tr = document.createElement('tr');
        const url = `${SITE_URL}/pdf/results/${student.student_id}.pdf`;
        
        tr.innerHTML = `
            <td>${student.student_id}</td>
            <td>${student.name}</td>
            <td>Class ${student.class}</td>
            <td id="status-row-${student.student_id}"><span class="badge" style="background:#f1f5f9; color:#94a3b8;">Checking...</span></td>
            <td><button class="btn-portal btn-ghost btn-sm" onclick="window.open('${url}', '_blank')"><i class="fas fa-external-link-alt"></i> Preview</button></td>
        `;
        tbody.appendChild(tr);
        
        // Async check
        fetch(url, { method: 'HEAD' }).then(res => {
            const cell = document.getElementById(`status-row-${student.student_id}`);
            if (res.ok) {
                cell.innerHTML = '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Available</span>';
                resultsCount++;
                document.getElementById('statTotalResults').textContent = resultsCount;
            } else {
                cell.innerHTML = '<span class="badge badge-danger"><i class="fas fa-times-circle"></i> Missing</span>';
            }
        }).catch(() => {
            document.getElementById(`status-row-${student.student_id}`).innerHTML = '<span class="badge badge-danger">Error</span>';
        });
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

// Export Data
function exportStudentData() {
    if (allStudents.length === 0) return;
    
    const headers = "student_id,name,class,section,roll_no,reg_no,gender,dob,father_name,mother_name,phone,address\n";
    const data = allStudents.map(s => 
        `${s.student_id},${s.name},${s.class},${s.section || ''},${s.roll_no || ''},${s.reg_no || ''},${s.gender || ''},${s.dob || ''},${s.father_name || ''},${s.mother_name || ''},${s.phone || ''},"${(s.address || '').replace(/"/g, '""')}"`
    ).join('\n');
    const blob = new Blob([headers + data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apex_students_backup_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

// Student Management Core
async function handleStudentSubmit(e) {
    e.preventDefault();
    const sid = document.getElementById('student_id').value.trim();
    const name = document.getElementById('student_name').value.trim();
    const sclass = document.getElementById('student_class').value.trim();
    const sect = document.getElementById('student_section').value.trim();
    const roll_no = document.getElementById('student_roll_no').value.trim();
    const reg_no = document.getElementById('student_reg_no').value.trim();
    const gender = document.getElementById('student_gender').value;
    const dob = document.getElementById('student_dob').value.trim();
    const phone = document.getElementById('student_phone').value.trim();
    const father = document.getElementById('student_father').value.trim();
    const mother = document.getElementById('student_mother').value.trim();
    const address = document.getElementById('student_address').value.trim();

    setLoading(true);
    try {
        await db.collection('students').doc(sid).set({
            student_id: sid,
            name, class: sclass, section: sect,
            roll_no, reg_no, gender, dob, phone,
            father_name: father, mother_name: mother, address
        }, { merge: true });
        showToast("Student data saved");
        showSection('studentList');
    } catch (e) {
        showToast(e.message, "error");
    } finally {
        setLoading(false);
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
    showSection('addStudent');
    document.getElementById('formTitle').textContent = "Edit Student Profile";
    document.getElementById('student_id').value = s.student_id;
    document.getElementById('student_id').disabled = true;
    document.getElementById('student_name').value = s.name;
    document.getElementById('student_class').value = s.class;
    document.getElementById('student_section').value = s.section || '';
    document.getElementById('student_roll_no').value = s.roll_no || '';
    document.getElementById('student_reg_no').value = s.reg_no || '';
    document.getElementById('student_gender').value = s.gender || '';
    document.getElementById('student_dob').value = s.dob || '';
    document.getElementById('student_phone').value = s.phone || '';
    document.getElementById('student_father').value = s.father_name || '';
    document.getElementById('student_mother').value = s.mother_name || '';
    document.getElementById('student_address').value = s.address || '';
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
