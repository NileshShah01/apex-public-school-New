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
            // Initialize ERP Class Management if available
            if (typeof initERPClassMgmt === 'function') initERPClassMgmt();
            
            // Initial Routing based on Hash
            const initialSection = window.location.hash.replace('#', '');
            if (initialSection) {
                showSection(initialSection);
            } else {
                showSection('dashboardOverview');
            }
        } else {
            window.location.href = 'admin-login.html';
        }
    });

    // Hash change routing
    window.addEventListener('hashchange', () => {
        const sectionId = window.location.hash.replace('#', '');
        if (sectionId) showSection(sectionId, false); // false = don't update hash again
    });
});

async function initializeApp() {
    setLoading(true);
    await loadInitialData();
    updateStats();
    
    // Phase 8 + ERP Initializers
    initCMS();
    initCMSHero();
    initCMSText();
    initERPExams();
    initCMSAdmission();
    
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

function showSection(sectionId, updateHash = true) {
    if (!sectionId) sectionId = 'dashboardOverview';
    
    // Update hash for persistence
    if (updateHash) {
        window.location.hash = sectionId;
    }

    // Hide all
    document.querySelectorAll('.dashboard-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.cat-header').forEach(h => h.classList.remove('active'));

    // Show target
    const target = document.getElementById(sectionId + 'Section');
    if (target) {
        target.style.display = 'block';
    } else {
        const fallbackTarget = document.getElementById(sectionId);
        if (fallbackTarget) fallbackTarget.style.display = 'block';
        else {
            console.warn(`Section ${sectionId} not found, defaulting to dashboardOverview`);
            showSection('dashboardOverview', true);
            return;
        }
    }

    const activeLink = document.querySelector(`.nav-link[onclick*="'${sectionId}'"]`);
    if (activeLink) {
        activeLink.classList.add('active');
        
        // Also highlight parent category header if it's a sub-link
        if (activeLink.classList.contains('sub-link')) {
            const parentCat = activeLink.closest('.nav-category');
            if (parentCat) {
                const header = parentCat.querySelector('.cat-header');
                const submenu = parentCat.querySelector('.cat-submenu');
                if (header) header.classList.add('active');
                if (submenu) submenu.classList.add('open');
            }
        }
    }

    const titles = {
        'dashboardOverview': 'School Overview',
        'studentList': 'Student Search & Management',
        'resultsStatus': 'Documents Verification',
        'admitCardTool': 'Admit Card PDF Tool',
        'addStudent': 'Add/Edit Student Information',
        'bulkImport': 'Bulk Upload Students',
        'notices': 'Manage School Notices',
        'promotions': 'Student Class Promotions',
        'websiteSettings': 'Frontend Website Settings',
        'inquiries': 'Admission Inquiries',
        'bulkPdf': 'Bulk PDF Report Upload',
        
        // Employee
        'addEmployee': 'Add New Employee',
        'searchEmployee': 'Search Employees',
        'bulkEmployeeUpdate': 'Bulk Employee Data Update',
        'employeeIdPrint': 'Employee Identity Cards',
        
        // Class
        'addSession': 'Academic Sessions Management',
        'addClass': 'Standard Classes Management',
        'addClassDetails': 'Manage Sections & Class Details',
        'addSubject': 'Define Subjects',
        'addNonSubject': 'Define Non-Scholastic Subjects',
        'addSyllabus': 'Upload Syllabus',
        'manageSyllabus': 'Manage Academic Syllabus',
        
        // Time Table
        'createTimetable': 'Generate Class Timetable',
        'viewTimetable': 'View/Print Timetables',
        
        // Admission
        'addEnquiry': 'New Admission Enquiry',
        'searchEnquiry': 'Search/Follow-up Enquiries',
        'studentAdmission': 'Complete Admission Process',
        
        // Student Extras
        'electiveMapping': 'Elective Subject Allocation',
        'studentIdPrint': 'Bulk ID Card Printing',
        'pickupIdPrint': 'Pickup/Gate Pass Printing',
        'studentBulkUpdate': 'Bulk Student Data Plan',
        'hostelReport': 'Hostel Residents Report',
        'transportReport': 'Transport/Bus Routes Report',
        
        // Fees
        'feeMaster': 'Master Fee Configuration',
        'createMonthlyFee': 'Generate Monthly Fee Records',
        'bulkFeeDiscount': 'Apply Bulk Fee Discounts',
        'searchStudentFee': 'Individual Student Fee History',
        'classFeePayment': 'Class-wise Fee Collection',
        'searchFeeDues': 'Arrears & Pending Dues List',
        'sendFeeMessage': 'Automatic Due Notifications',
        'manageFeeFine': 'Late Payment Fine Setup',
        'feeCarryForward': 'Session Carry Forward (Dues)',
        
        // Exam
        'examGrading': 'Setup Examination Grading Rules',
        'manageExam': 'Define Examination Terms',
        'manageExamSchedule': 'Create Exam Time Table',
        'viewExamSchedule': 'View/Verify Exam Schedules',
        'publishExamSchedule': 'Publish Schedules to Portal',
        'examAttendanceCard': 'Print Exam Attendance Sheets',
        'studentExamAttendance': 'Mark Student Exam Attendance',
        'viewExamAttendance': 'View Exam Attendance Reports',
        'examHallPlan': 'Design Exam Sitting Arrangement',
        'examHallDetail': 'View Hall/Room Details',
        'examSittingPlan': 'Export Student Sitting Plan',
        
        // Result
        'manageResult': 'Process Examination Results',
        'addResult': 'Manual Marks Entry',
        'manageAllResults': 'Consolidated Result Manager',
        'viewAllResults': 'View Full School Results',
        'manageNonSubResult': 'Non-Subject Performance Entry',
        'viewNonSubResult': 'View Co-Scholastic Results',
        'publishResult': 'Publish Exam Results Live',
        'reportCardRemarks': 'Bulk Report Card Remarks',
        'generateReportCard': 'Generate Students Report Cards',
        'viewReportCard': 'View/Download Generated Cards',
        'publishReportCard': 'Push Report Cards to Student Portal',

        // CMS
        'cmsStats': 'Live Stats & Numbers',
        'cmsEvents': 'Official School Events',
        'cmsAchievements': 'School Achievements',
        'cmsTestimonials': 'Parent Testimonials',
        'cmsAdmission': 'Portal Admission Status',
        'cmsHolidays': 'Annual Holiday Calendar',
        'cmsGallery': 'Website Gallery Manager',
        'cmsStaff': 'Staff & Teachers Directory',
        'cmsTimetable': 'Timetable PDF Manager',
        'cmsFees': 'Frontend Fee Structure',
        'cmsHero': 'Hero Slider Images',
        'cmsTheme': 'Global Website Theme',
        'cmsStudentDashboard': 'Attendance & Portal Config',
        'resultsStatus': 'Student Results & Performance Status',
        'viewTimetable': 'Class Timetables Management',
        'publishResult': 'Publish Results to Student Portal',
        'manageResult': 'Review & Manage Student Marks',
        'viewExamSchedule': 'Complete Exam Date Sheet',
        'cmsFeeTools': 'Parents Fee Due Analytics',
        'websiteSettings': 'Global Site Configuration'
    };
    document.getElementById('sectionTitle').textContent = titles[sectionId] || 'Dashboard';

    
    // Visibility logic
    const statsGrid = document.getElementById('statsOverview');
    if (statsGrid) {
        statsGrid.style.display = (sectionId === 'studentList' || sectionId === 'dashboardOverview') ? 'grid' : 'none';
    }

    if (sectionId === 'dashboardOverview') loadDashboardOverview();
    if (sectionId === 'resultsStatus') populateResultsStatus();
    
    // ERP Loaders
    if (sectionId === 'addSession') loadSessions();
    if (sectionId === 'addClass') loadClasses();
    if (sectionId === 'addClassDetails') loadClasses();
    if (sectionId === 'addSubject') loadSubjects();
    if (sectionId === 'addNonSubject') loadNonSubjects();
    if (sectionId === 'electiveMapping') loadElectiveDropdowns();
    if (sectionId === 'studentBulkUpdate') initBulkUpdate();
    if (sectionId === 'generateReportCard') initReportCardSection();
    if (['examGrading', 'manageExam', 'manageExamSchedule', 'addResult'].includes(sectionId)) {
        initERPExams();
    }
    
    if (sectionId === 'studentList') loadInitialData();
    if (sectionId === 'addStudent') {
        if (!editingDocId) {
            document.getElementById('studentForm')?.reset();
            document.getElementById('formTitle').textContent = 'Add New Student';
            document.getElementById('photoPreview').innerHTML = '<i class="fas fa-user" style="font-size: 2.5rem; color: #94a3b8;"></i>';
            document.getElementById('student_id').value = '';
        }
        if (typeof updateSessionDropdowns === 'function') updateSessionDropdowns();
    }
    if (sectionId === 'websiteSettings') loadWebsiteSettings();
    if (sectionId === 'inquiries') loadInquiries();
    if (sectionId === 'cmsStudentDashboard') {
        initSearchableSelect('attendanceStudentSelect', (s) => {
            document.getElementById('att_studentId').value = s.id;
        });
    }
}

async function loadDashboardOverview() {
    // Populate counts from allStudents global array
    if (allStudents && allStudents.length > 0) {
        document.getElementById('totalStudentsCount').textContent = allStudents.length;
    } else {
        // Fallback for first load
        const snap = await db.collection('students').get();
        document.getElementById('totalStudentsCount').textContent = snap.size;
    }
    
    // Other counts (Mocked for now, will connect to real collections in Phase 3)
    document.getElementById('totalTeachersCount').textContent = "12";
    document.getElementById('monthlyFeesTotal').textContent = "₹ 1,45,000";
    document.getElementById('attendanceRate').textContent = "94%";
}

async function updateStudentAttendance() {
    const studentId = document.getElementById('att_studentId').value;
    const month = document.getElementById('att_month').value;
    const percent = document.getElementById('att_percent').value;

    if (!studentId || !month || !percent) {
        showToast("Please select student, month and enter percentage", "error");
        return;
    }

    setLoading(true);
    try {
        await db.collection('attendance').doc(`${studentId}_${month}`).set({
            studentId,
            month,
            percentage: Number(percent),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        showToast("Attendance updated successfully!");
    } catch (e) {
        showToast("Error updating attendance: " + e.message, "error");
    } finally {
        setLoading(false);
    }
}

async function filterAndDisplayStudents() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || "";
    const classVal = document.getElementById('classFilter')?.value || "";
    const tbody = document.getElementById('studentTableBody');
    if (!tbody) return;
    
    const filtered = allStudents.filter(s => {
        const name = (s.name || "").toLowerCase();
        const sid = (s.student_id || "").toLowerCase();
        const father = (s.father_name || "").toLowerCase();
        const phone = (s.phone || "").toLowerCase();
        
        const matchesSearch = name.includes(searchTerm) || 
                             sid.includes(searchTerm) || 
                             father.includes(searchTerm) || 
                             phone.includes(searchTerm);
        
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
    
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Checking documents...</td></tr>';
    
    // Sort students by name for better verification UX
    const sortedStudents = [...allStudents].sort((a,b) => (a.name || "").localeCompare(b.name || ""));
    
    let resultsCount = 0;
    tbody.innerHTML = '';
    
    // Limit to first 50 to avoid browser hang/overload if huge dataset
    const displayLimit = 50; 
    const verifiedList = sortedStudents.slice(0, displayLimit);

    for (const student of verifiedList) {
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
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <input type="file" id="upload-pdf-${docId}" accept="application/pdf" style="display:none;" onchange="uploadResult(event, '${docId}', '${year}')">
                        <button class="btn-portal btn-ghost btn-sm" onclick="document.getElementById('upload-pdf-${docId}').click()" style="font-size:0.75rem;">
                            <i class="fas fa-upload"></i> Report
                        </button>
                        <a id="preview-btn-${docId}" href="#" target="_blank" class="btn-portal btn-ghost btn-sm hidden" style="font-size:0.75rem;">
                            <i class="fas fa-external-link-alt"></i> View
                        </a>
                    </div>
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
        
        // Check Report Card 
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

        // Check Admit Card
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
        showToast('File too large! Max 900KB.', 'error');
        return;
    }
    setLoading(true);
    try {
        const base64 = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
        await db.collection('reports').doc(`${docId}_${year}`).set({
            fileData: base64,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('Result PDF saved!');
        populateResultsStatus(); 
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    } finally {
        setLoading(false);
    }
}

async function uploadAdmitCard(event, docId, year) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 900 * 1024) {
        showToast('File too large! Max 900KB.', 'error');
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
        showToast('Admit Card saved!');
        populateResultsStatus(); 
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
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
    if (confirm(`Promote ${targets.length} students to Class ${toClass}?`)) {
        setLoading(true);
        try {
            const batch = db.batch();
            targets.forEach(s => batch.update(db.collection('students').doc(s.id), { class: toClass }));
            await batch.commit();
            showToast(`Promoted ${targets.length} students!`);
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

// // ===================== ERP TOOLS =====================

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
        showToast("Website Settings updated!");
    } catch (e) {
        showToast("Error update: " + e.message, "error");
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
        XLSX.utils.book_append_sheet(wb, ws, "Students");
        XLSX.writeFile(wb, `apex_students_${new Date().toISOString().split('T')[0]}.xlsx`);
        showToast("Exported!");
    } catch (e) {
        showToast("Export failed: " + e.message, "error");
    }
}

// Student Management Core
async function handleStudentSubmit(e) {
    e.preventDefault();
    const sid = document.getElementById('student_id').value.trim();
    const name = document.getElementById('student_name').value.trim();
    const father = document.getElementById('student_father').value.trim();
    const phone = document.getElementById('student_phone').value.trim();
    const sclass = document.getElementById('student_class').value.trim();
    const sect = document.getElementById('student_section').value.trim();
    const roll_no = document.getElementById('student_roll_no').value.trim();
    const reg_no = document.getElementById('student_reg_no').value.trim();
    const session = document.getElementById('student_session').value.trim();
    const join_date = document.getElementById('student_join_date').value.trim();
    const dob = document.getElementById('student_dob').value.trim();
    const gender = document.getElementById('student_gender').value;
    const aadhar = document.getElementById('student_aadhar').value.trim();
    const religion = document.getElementById('student_religion').value.trim();
    const category = document.getElementById('student_category').value.trim();
    const caste = document.getElementById('student_caste').value.trim();
    const pen = document.getElementById('student_pen').value.trim();
    const smart_card_no = document.getElementById('student_smart_card_no').value.trim();
    const mother = document.getElementById('student_mother').value.trim();
    const father_aadhar = document.getElementById('student_father_aadhar').value.trim();
    const mother_aadhar = document.getElementById('student_mother_aadhar').value.trim();
    const guardian_name = document.getElementById('student_guardian_name').value.trim();
    const guardian_phone = document.getElementById('student_guardian_phone').value.trim();
    const address = document.getElementById('student_address').value.trim();
    const permanent_address = document.getElementById('student_permanent_address').value.trim();
    const city = document.getElementById('student_city').value.trim();
    const hostel = document.getElementById('student_hostel').value;
    const transport = document.getElementById('student_transport').value;
    const photoFile = document.getElementById('student_photo').files[0];

    if (!name || !father || !phone) {
        showToast('Please fill all mandatory fields (Name, Father Name, Mobile Number)', 'error');
        return;
    }

    if (!sclass || !sect || !session) {
        showToast('Please select Session, Class and Section from dropdowns', 'error');
        return;
    }

    setLoading(true);
    try {
        let photoUrl = '';
        let finalSid = sid;
        let docId = editingDocId;

        // NEW STUDENT: Auto-generate ID starting from 1000
        if (!docId) {
            const nextId = await window.getNextStudentId();
            finalSid = nextId.toString();
            docId = finalSid; // Use student_id as firestore doc index
        }

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
            student_id: finalSid,
            name,
            father_name: father,
            phone,
            class: sclass,
            section: sect,
            roll_no,
            reg_no,
            session,
            join_date,
            dob,
            gender,
            aadhar,
            religion,
            category,
            caste,
            pen,
            smart_card_no,
            mother_name: mother,
            father_aadhar,
            mother_aadhar,
            guardian_name,
            guardian_phone,
            address,
            permanent_address,
            city,
            hostel,
            transport,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
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

async function editStudent(id) {
    const s = allStudents.find(x => x.id === id);
    if (!s) return;
    editingDocId = id; // remember doc ID for saving
    
    // Show section first to ensure HTML elements exist
    showSection('addStudent');
    document.getElementById('formTitle').textContent = 'Edit Student Profile';
    
    // Basic Fields
    document.getElementById('student_id').value = s.student_id || '';
    document.getElementById('student_name').value = s.name || '';
    document.getElementById('student_father').value = s.father_name || '';
    document.getElementById('student_phone').value = s.phone || '';
    
    // ERP Dropdowns (Async chain)
    if (typeof updateSessionDropdowns === 'function') {
        setLoading(true);
        try {
            await updateSessionDropdowns();
            const sessionSelect = document.getElementById('student_session');
            if (sessionSelect) {
                sessionSelect.value = s.session || '';
                await loadClassesForRegistration();
                
                const classSelect = document.getElementById('student_class');
                if (classSelect) {
                    classSelect.value = s.class || '';
                    await updateRegistrationSections();
                    
                    const secSelect = document.getElementById('student_section');
                    if (secSelect) secSelect.value = s.section || '';
                }
            }
        } catch (e) {
            console.error("Error pre-filling registration dropdowns:", e);
        } finally {
            setLoading(false);
        }
    }

    document.getElementById('student_roll_no').value = s.roll_no || '';
    document.getElementById('student_reg_no').value = s.reg_no || '';
    document.getElementById('student_join_date').value = s.join_date || '';
    document.getElementById('student_dob').value = s.dob || '';
    document.getElementById('student_gender').value = s.gender || '';
    document.getElementById('student_aadhar').value = s.aadhar || '';
    document.getElementById('student_religion').value = s.religion || '';
    document.getElementById('student_category').value = s.category || '';
    document.getElementById('student_caste').value = s.caste || '';
    document.getElementById('student_pen').value = s.pen || '';
    document.getElementById('student_smart_card_no').value = s.smart_card_no || '';
    document.getElementById('student_mother').value = s.mother_name || '';
    document.getElementById('student_father_aadhar').value = s.father_aadhar || '';
    document.getElementById('student_mother_aadhar').value = s.mother_aadhar || '';
    document.getElementById('student_guardian_name').value = s.guardian_name || '';
    document.getElementById('student_guardian_phone').value = s.guardian_phone || '';
    document.getElementById('student_address').value = s.address || '';
    document.getElementById('student_permanent_address').value = s.permanent_address || '';
    document.getElementById('student_city').value = s.city || '';
    document.getElementById('student_hostel').value = s.hostel || 'No';
    document.getElementById('student_transport').value = s.transport || 'No';
    
    // Show existing photo
    const photoDiv = document.getElementById('photoPreview');
    if (s.photo_url) {
        photoDiv.innerHTML = `<img src="${s.photo_url}" style="width:100%;height:100%;object-fit:cover;">`;
    } else {
        photoDiv.innerHTML = '<i class="fas fa-user" style="font-size:2.5rem;color:#94a3b8;"></i>';
    }
}

// Bulk Import (Excel Version)
async function handleBulkImport(e) {
    e.preventDefault();
    const file = document.getElementById('excelFile').files[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert to JSON with headers
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            if (jsonData.length === 0) {
                showToast("The Excel file seems to be empty.", "error");
                setLoading(false);
                return;
            }

            document.getElementById('importStats').style.display = 'block';
            document.getElementById('totalImport').textContent = jsonData.length;

            let processed = 0;
            for (const row of jsonData) {
                // Map fields from Excel to Firestore schema
                const studentData = {
                    student_id: (row['Id'] || row['student_id'] || '').toString().trim(),
                    name: (row['Name'] || row['name'] || '').toString().trim(),
                    reg_no: (row['Reg No'] || row['reg_no'] || '').toString().trim(),
                    roll_no: (row['Roll No'] || row['roll_no'] || '').toString().trim(),
                    session: (row['Session'] || row['session'] || '').toString().trim(),
                    class: (row['Class'] || row['class'] || '').toString().trim(),
                    section: (row['Section'] || row['section'] || '').toString().trim(),
                    dob: (row['Birth Date'] || row['dob'] || '').toString().trim(),
                    join_date: (row['Join Date'] || row['join_date'] || '').toString().trim(),
                    gender: (row['Gender'] || row['gender'] || '').toString().trim(),
                    father_name: (row['Father Name'] || row['father_name'] || '').toString().trim(),
                    mother_name: (row['Mother Name'] || row['mother_name'] || '').toString().trim(),
                    phone: (row['Phone'] || row['phone'] || '').toString().trim(),
                    religion: (row['Religion'] || row['religion'] || '').toString().trim(),
                    category: (row['Category'] || row['category'] || '').toString().trim(),
                    pen: (row['PEN'] || row['pen'] || '').toString().trim(),
                    aadhar: (row['Aadhar'] || row['aadhar'] || '').toString().trim(),
                    father_aadhar: (row['Father Aadhar'] || row['father_aadhar'] || '').toString().trim(),
                    mother_aadhar: (row['Mother Aadhar'] || row['mother_aadhar'] || '').toString().trim(),
                    caste: (row['Caste'] || row['caste'] || '').toString().trim(),
                    hostel: (row['Hostel'] || row['hostel'] || '').toString().trim(),
                    transport: (row['Transport'] || row['transport'] || '').toString().trim(),
                    address: (row['Address'] || row['address'] || '').toString().trim(),
                    permanent_address: (row['Permanent Address'] || row['permanent_address'] || '').toString().trim(),
                    city: (row['City'] || row['city'] || '').toString().trim(),
                    guardian_name: (row['Guardian Name'] || row['guardian_name'] || '').toString().trim(),
                    guardian_phone: (row['Guardian Phone'] || row['guardian_phone'] || '').toString().trim(),
                    smart_card_no: (row['Smart Card No'] || row['smart_card_no'] || '').toString().trim(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                // Mandatory fields validation
                if (!studentData.name || !studentData.phone || !studentData.father_name) {
                    continue;
                }

                const docId = studentData.student_id || studentData.phone;
                await db.collection('students').doc(docId).set(studentData, { merge: true });
                processed++;
                document.getElementById('currentImport').textContent = processed;
            }

            showToast(`Bulk Import Complete: ${processed} students processed.`);
            showSection('studentList');
        } catch (error) {
            console.error("Excel processing error:", error);
            showToast("Failed to process Excel file.", "error");
        } finally {
            setLoading(false);
        }
    };
    reader.readAsArrayBuffer(file);
}

function downloadExcelTemplate() {
    const headers = [
        "Id", "Name", "Reg No", "Roll No", "Session", "Class", "Section", 
        "Birth Date", "Join Date", "Gender", "Father Name", "Mother Name", 
        "Phone", "Religion", "Category", "PEN", "Aadhar", "Father Aadhar", 
        "Mother Aadhar", "Caste", "Hostel", "Transport", "Address", 
        "Permanent Address", "City", "Guardian Name", "Guardian Phone", "Smart Card No"
    ];
    
    const sampleData = [["APEX001", "Rahul Kumar", "R101", "12", "2026-27", "6", "A", "01.01.2012", "15.04.2023", "Male", "Suresh Kumar", "Meena Devi", "9876543210", "Hindu", "General", "P12345", "123456789012", "234567890123", "345678901234", "OBC", "No", "Yes", "Main Road, Saran", "Village Apex, Saran", "Saran", "Suresh Kumar", "9876543210", "SC1001"]];

    const ws_data = [headers, ...sampleData];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students Template");
    XLSX.writeFile(wb, "apex_student_import_template.xlsx");
    showToast("Excel template downloaded!");
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

// ===================== CSV EXPORT =====================
async function exportToCSV(collection) {
    try {
        setLoading(true);
        const snap = await db.collection(collection).get();
        if (snap.empty) {
            showToast('No data to export', 'error');
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,";
        let headers = [];
        let rows = [];

        snap.forEach(doc => {
            const data = doc.data();
            const row = {};
            
            // Format specific based on collection
            if (collection === 'students') {
                row['Student ID'] = data.student_id;
                row['Name'] = data.name;
                row['Class'] = data.class;
                row['Section'] = data.section;
                row['DOB'] = data.dob;
                row['Mobile'] = data.phone;
                row['Father Name'] = data.father_name;
                row['Village/Address'] = data.village;
            } else if (collection === 'staff') {
                row['Name'] = data.name;
                row['Subject/Role'] = data.subject || data.role;
                row['Qualifications'] = data.qualifications || '';
            } else if (collection === 'inquiries') {
                row['Date'] = data.submittedAt ? new Date(data.submittedAt.toDate()).toLocaleDateString() : '';
                row['Parent Name'] = data.parent;
                row['Student Name'] = data.student;
                row['Mobile'] = data.mobile;
                row['Class'] = data.class;
                row['Village'] = data.village;
                row['Status'] = data.status;
                row['Message'] = data.message;
            }

            rows.push(row);
        });

        // Extract headers from first row
        if (rows.length > 0) {
            headers = Object.keys(rows[0]);
            csvContent += headers.map(h => `"${h}"`).join(",") + "\r\n";
            
            rows.forEach(row => {
                const values = headers.map(header => {
                    let val = row[header] === undefined ? '' : row[header];
                    // Escape quotes
                    if (typeof val === 'string') {
                        val = val.replace(/"/g, '""');
                        if (val.search(/("|,|\n)/g) >= 0) val = `"${val}"`;
                    }
                    return val;
                });
                csvContent += values.join(",") + "\r\n";
            });
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${collection}_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast(`Exported ${rows.length} records!`);
    } catch(e) {
        showToast('Error exporting: ' + e.message, 'error');
    } finally {
        setLoading(false);
    }
}

// ===================== ADMIT CARD PDF TOOL =====================
async function processAdmitCardPdf() {
    const classVal = document.getElementById('admitToolClass').value;
    const year = document.getElementById('admitToolYear').value;
    const fileInput = document.getElementById('admitToolFile');
    const logArea = document.getElementById('admitToolLog');
    const progressSpan = document.getElementById('admitToolProgress');

    if (!classVal || !fileInput.files[0]) {
        alert("Please select a Class and upload a PDF file.");
        return;
    }

    const file = fileInput.files[0];
    logArea.innerHTML = `> Starting process for Class: ${classVal}, Year: ${year}<br>`;
    logArea.innerHTML += `> File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)<br>`;
    progressSpan.innerText = "Initializing...";

    // 1. Get students for this class, sorted by Student ID
    const students = allStudents
        .filter(s => s.class === classVal)
        .sort((a, b) => {
            const idA = (a.student_id || "").toLowerCase();
            const idB = (b.student_id || "").toLowerCase();
            return idA.localeCompare(idB);
        });

    if (students.length === 0) {
        logArea.innerHTML += `<span style="color:#ef4444;">> ERROR: No students found in Class ${classVal}. Aborting.</span><br>`;
        progressSpan.innerText = "Failed";
        return;
    }

    logArea.innerHTML += `> Found ${students.length} students in Class ${classVal}.<br>`;

    try {
        progressSpan.innerText = "Reading PDF...";
        const arrayBuffer = await file.arrayBuffer();
        const { PDFDocument } = PDFLib;
        const mainPdfDoc = await PDFDocument.load(arrayBuffer);
        const pageCount = mainPdfDoc.getPageCount();

        logArea.innerHTML += `> PDF has ${pageCount} pages.<br>`;

        if (pageCount !== students.length) {
            logArea.innerHTML += `<span style="color:#f59e0b;">> WARNING: Page count (${pageCount}) does not match student count (${students.length}).</span><br>`;
        }

        const limit = Math.min(pageCount, students.length);
        let successCount = 0;

        for (let i = 0; i < limit; i++) {
            const student = students[i];
            progressSpan.innerText = `Splitting: ${i + 1}/${limit}`;
            
            try {
                // Create a new PDF for this single page
                const subPdfDoc = await PDFDocument.create();
                const [copiedPage] = await subPdfDoc.copyPages(mainPdfDoc, [i]);
                subPdfDoc.addPage(copiedPage);
                
                const pdfBytes = await subPdfDoc.save();
                const base64 = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onload = e => resolve(e.target.result);
                    reader.readAsDataURL(new Blob([pdfBytes], { type: 'application/pdf' }));
                });

                logArea.innerHTML += `> Processing student: <b>${student.student_id}</b> (${student.name})...<br>`;

                // Upload to Firestore
                await db.collection('admitcards').doc(`${student.id}_${year}`).set({
                    fileData: base64,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                logArea.innerHTML += `<span style="color:#10b981;">  ✅ Successfully assigned page ${i+1} to ${student.student_id}</span><br>`;
                successCount++;
            } catch (err) {
                logArea.innerHTML += `<span style="color:#ef4444;">  ❌ Failed for ${student.student_id}: ${err.message}</span><br>`;
            }
            
            // Auto-scroll log
            logArea.scrollTop = logArea.scrollHeight;
        }

        logArea.innerHTML += `<span style="color:#38bdf8; font-weight:bold;">> COMPLETED: ${successCount} admit cards processed successfully.</span><br>`;
        progressSpan.innerText = "Done";
        showToast(`Admit Card Split complete! ${successCount} successful.`, 'success');

    } catch (e) {
        logArea.innerHTML += `<span style="color:#ef4444;">> CRITICAL ERROR: ${e.message}</span><br>`;
        progressSpan.innerText = "Error";
        console.error(e);
    }
}
// ===================== SEARCHABLE STUDENT SELECT =====================
function initSearchableSelect(containerId, onSelect) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="searchable-select-wrapper" style="position:relative;">
            <div class="select-trigger" onclick="toggleSearchDropdown('${containerId}')" style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem 1rem; border:1px solid var(--border); border-radius:0.5rem; background:white; cursor:pointer;">
                <span id="${containerId}_label" style="color:var(--text-muted);">Select Student...</span>
                <i class="fas fa-chevron-down" style="font-size:0.8rem; color:var(--text-muted);"></i>
            </div>
            <div id="${containerId}_dropdown" style="display:none; position:absolute; top:100%; left:0; right:0; background:white; border:1px solid var(--border); border-radius:0.5rem; margin-top:0.5rem; box-shadow:0 10px 25px rgba(0,0,0,0.1); z-index:1000; max-height:300px; overflow:hidden; display:flex; flex-direction:column;">
                <div style="padding:0.75rem; border-bottom:1px solid var(--border); background:#f8fafc;">
                    <input type="text" placeholder="Search by name, father name or phone..." oninput="filterSearchDropdown('${containerId}', this.value)" style="width:100%; padding:0.6rem; border:1px solid var(--border); border-radius:0.4rem; font-size:0.9rem;">
                </div>
                <div id="${containerId}_list" style="overflow-y:auto; flex:1; max-height:220px;">
                    <!-- List populated dynamically -->
                </div>
            </div>
        </div>
    `;
    
    window[`${containerId}_select`] = (s) => {
        document.getElementById(`${containerId}_label`).textContent = `${s.name} [${s.father_name}] [${s.student_id}]`;
        document.getElementById(`${containerId}_dropdown`).style.display = 'none';
        if (onSelect) onSelect(s);
    };
}

function toggleSearchDropdown(id) {
    const drop = document.getElementById(`${id}_dropdown`);
    const isVisible = drop.style.display === 'flex';
    
    // Close others
    document.querySelectorAll('[id$="_dropdown"]').forEach(el => el.style.display = 'none');
    
    if (!isVisible) {
        drop.style.display = 'flex';
        renderDropdownList(id, allStudents);
        const input = drop.querySelector('input');
        if (input) { input.value = ''; input.focus(); }
    }
}

function filterSearchDropdown(id, q) {
    const term = q.toLowerCase();
    const filtered = allStudents.filter(s => 
        (s.name || '').toLowerCase().includes(term) || 
        (s.student_id || '').toLowerCase().includes(term) || 
        (s.father_name || '').toLowerCase().includes(term) ||
        (s.phone || '').toLowerCase().includes(term)
    );
    renderDropdownList(id, filtered.slice(0, 30)); // Limit for performance
}

function renderDropdownList(id, list) {
    const el = document.getElementById(`${id}_list`);
    if (!el) return;
    
    if (list.length === 0) {
        el.innerHTML = '<div style="padding:1rem; text-align:center; color:var(--text-muted); font-size:0.9rem;">No students found</div>';
        return;
    }

    el.innerHTML = list.map(s => `
        <div onclick="window['${id}_select'](${JSON.stringify(s).replace(/"/g, '&quot;')})" style="padding:0.75rem 1rem; border-bottom:1px solid #f1f5f9; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'">
            <div style="font-weight:600; font-size:0.95rem; color:var(--secondary);">${s.name}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">F/N: ${s.father_name || '-'} | ID: ${s.student_id || '-'}</div>
        </div>
    `).join('');
}

// Close dropdowns on click outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.searchable-select-wrapper')) {
        document.querySelectorAll('[id$="_dropdown"]').forEach(el => el.style.display = 'none');
    }
});

// ==================== BULK STUDENT UPDATE LOGIC ====================
async function initBulkUpdate() {
    const sessionSelect = document.getElementById('bulk_student_session');
    if (!sessionSelect) return;

    // Use sessions from erpState (loaded via erp-class-mgmt.js)
    if (typeof erpState !== 'undefined' && erpState.sessions.length > 0) {
        populateBulkSessionDropdown();
    } else {
        await loadSessions(); // This is the fallback if erpState not ready
        populateBulkSessionDropdown();
    }
}

function populateBulkSessionDropdown() {
    const sessionSelect = document.getElementById('bulk_student_session');
    if (!sessionSelect) return;
    
    sessionSelect.innerHTML = '<option value="">Select Session</option>' + 
        erpState.sessions.map(s => `<option value="${s.name}" data-id="${s.id}" ${s.active ? 'selected' : ''}>${s.name}</option>`).join('');
    
    if (erpState.activeSessionId) loadClassesForBulkUpdate();
}

async function loadClassesForBulkUpdate() {
    const sessionSelect = document.getElementById('bulk_student_session');
    const sessionId = sessionSelect.options[sessionSelect.selectedIndex]?.getAttribute('data-id');
    const classSelect = document.getElementById('bulk_student_class');
    if (!classSelect || !sessionId) return;

    try {
        const snapshot = await db.collection('classes').where('sessionId', '==', sessionId).orderBy('sortOrder', 'asc').get();
        const classes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        classSelect.innerHTML = '<option value="">Select Class</option>' + 
            classes.map(cls => `<option value="${cls.name}" data-id="${cls.id}">${cls.name}</option>`).join('');
        
        document.getElementById('bulk_student_section').innerHTML = '<option value="">Select Class First</option>';
    } catch (e) {
        console.error("Error loading classes for bulk update:", e);
    }
}

async function loadBulkStudentList() {
    const session = document.getElementById('bulk_student_session').value;
    const className = document.getElementById('bulk_student_class').value;
    const section = document.getElementById('bulk_student_section').value;
    const body = document.getElementById('bulkUpdateTableBody');

    if (!session || !className) return;

    body.innerHTML = '<tr><td colspan="9" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading students...</td></tr>';

    try {
        let query = db.collection('students')
            .where('session', '==', session)
            .where('class', '==', className);
        
        if (section) query = query.where('section', '==', section);

        const snapshot = await query.get();
        const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (students.length === 0) {
            body.innerHTML = '<tr><td colspan="9" style="text-align:center;">No students found matching filters.</td></tr>';
            return;
        }

        // Maintain scroll position or reset?
        body.innerHTML = students.map(s => `
            <tr data-id="${s.id}">
                <td style="font-family:monospace; font-size:0.75rem;">${s.student_id || s.id.slice(0,6)}</td>
                <td><input type="text" class="bulk-input b-name" value="${s.name || ''}"></td>
                <td class="col_roll"><input type="text" class="bulk-input b-roll" value="${s.roll_no || ''}"></td>
                <td class="col_father"><input type="text" class="bulk-input b-father" value="${s.father_name || ''}"></td>
                <td class="col_mobile"><input type="text" class="bulk-input b-mobile" value="${s.mobile || ''}"></td>
                <td class="col_dob"><input type="date" class="bulk-input b-dob" value="${s.dob || ''}"></td>
                <td class="col_blood" style="display:none;"><input type="text" class="bulk-input b-blood" value="${s.blood_group || ''}"></td>
                <td class="col_address" style="display:none;"><input type="text" class="bulk-input b-address" value="${s.address || ''}"></td>
                <td class="col_sms" style="display:none;"><input type="text" class="bulk-input b-sms" value="${s.sms_contact || ''}"></td>
            </tr>
        `).join('');

        // Re-apply current column visibility
        document.querySelectorAll('#bulkColumnToggles input[type="checkbox"]').forEach(cb => {
            const colClass = cb.getAttribute('onchange').match(/'([^']+)'/)[1];
            toggleBulkCol(colClass, cb.checked);
        });

    } catch (e) {
        console.error("Error loading bulk list:", e);
        body.innerHTML = '<tr><td colspan="9" style="text-align:center; color:var(--danger);">Error loading students.</td></tr>';
    }
}

function toggleBulkUpdateColumns() {
    const toggles = document.getElementById('bulkColumnToggles');
    toggles.style.display = toggles.style.display === 'none' ? 'block' : 'none';
}

function toggleBulkCol(colClass, forceState = null) {
    const elements = document.querySelectorAll(`.${colClass}`);
    const checkbox = document.querySelector(`input[onchange*="'${colClass}'"]`);
    
    const shouldShow = forceState !== null ? forceState : checkbox.checked;
    if (checkbox) checkbox.checked = shouldShow;

    elements.forEach(el => {
        el.style.display = shouldShow ? '' : 'none';
    });
}

async function saveBulkStudentUpdate() {
    const rows = document.querySelectorAll('#bulkUpdateTableBody tr[data-id]');
    if (rows.length === 0) return;

    try {
        setLoading(true);
        const batch = db.batch();
        let changeCount = 0;

        rows.forEach(row => {
            const id = row.getAttribute('data-id');
            const data = {
                name: row.querySelector('.b-name').value.trim(),
                roll_no: row.querySelector('.b-roll').value.trim(),
                father_name: row.querySelector('.b-father').value.trim(),
                mobile: row.querySelector('.b-mobile').value.trim(),
                dob: row.querySelector('.b-dob').value,
                blood_group: row.querySelector('.b-blood').value.trim(),
                address: row.querySelector('.b-address').value.trim(),
                sms_contact: row.querySelector('.b-sms').value.trim(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            batch.update(db.collection('students').doc(id), data);
            changeCount++;
        });

        await batch.commit();
        showToast(`Successfully updated ${changeCount} student records!`, "success");
        loadInitialData(); // Refresh main list too
    } catch (e) {
        console.error("Bulk update failed:", e);
        showToast("Failed to save changes: " + e.message, "error");
    } finally {
        setLoading(false);
    }
}

// Global exposure
window.toggleBulkUpdateColumns = toggleBulkUpdateColumns;
window.toggleBulkCol = toggleBulkCol;
window.loadClassesForBulkUpdate = loadClassesForBulkUpdate;
window.loadBulkStudentList = loadBulkStudentList;
window.saveBulkStudentUpdate = saveBulkStudentUpdate;
window.initBulkUpdate = initBulkUpdate;

// ==================== REPORT CARD LOGIC (Phase 5) ====================
async function initReportCardSection() {
    const sessionSelect = document.getElementById('rc_session');
    if (!sessionSelect) return;

    if (typeof erpState !== 'undefined' && erpState.sessions.length > 0) {
        populateRcSessionDropdown();
    } else {
        await loadSessions();
        populateRcSessionDropdown();
    }
}

function populateRcSessionDropdown() {
    const sessionSelect = document.getElementById('rc_session');
    if (!sessionSelect) return;
    sessionSelect.innerHTML = '<option value="">Select Session</option>' + 
        erpState.sessions.map(s => `<option value="${s.name}" data-id="${s.id}" ${s.active ? 'selected' : ''}>${s.name}</option>`).join('');
    if (erpState.activeSessionId) loadRcClasses();
}

async function loadRcClasses() {
    const sessionSelect = document.getElementById('rc_session');
    const sessionId = sessionSelect.options[sessionSelect.selectedIndex]?.getAttribute('data-id');
    const classSelect = document.getElementById('rc_class');
    if (!classSelect || !sessionId) return;

    try {
        const snapshot = await db.collection('classes').where('sessionId', '==', sessionId).orderBy('sortOrder', 'asc').get();
        const classes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        classSelect.innerHTML = '<option value="">Select Class</option>' + 
            classes.map(cls => `<option value="${cls.name}" data-id="${cls.id}">${cls.name}</option>`).join('');
        document.getElementById('rc_section').innerHTML = '<option value="">Select Class First</option>';
        document.getElementById('rc_student').innerHTML = '<option value="">Select Details Above</option>';
    } catch (e) { console.error(e); }
}

async function loadRcSections() {
    const classSelect = document.getElementById('rc_class');
    const className = classSelect.value;
    const sectSelect = document.getElementById('rc_section');
    if (!sectSelect || !className) return;

    const session = document.getElementById('rc_session').value;
    try {
        const snapshot = await db.collection('students').where('session', '==', session).where('class', '==', className).get();
        const students = snapshot.docs.map(doc => doc.data());
        const sections = [...new Set(students.map(s => s.section).filter(Boolean))];
        sectSelect.innerHTML = '<option value="">Select Section</option>' + 
            sections.map(s => `<option value="${s}">${s}</option>`).join('');
    } catch (e) { console.error(e); }
}

async function loadRcStudents() {
    const session = document.getElementById('rc_session').value;
    const className = document.getElementById('rc_class').value;
    const section = document.getElementById('rc_section').value;
    const studentSelect = document.getElementById('rc_student');
    if (!studentSelect || !session || !className) return;

    studentSelect.innerHTML = '<option value="">Loading students...</option>';
    try {
        let query = db.collection('students').where('session', '==', session).where('class', '==', className);
        if (section) query = query.where('section', '==', section);
        const snapshot = await query.get();
        const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        studentSelect.innerHTML = '<option value="">Select Student</option>' + 
            students.map(s => `<option value="${s.id}">${s.name} (${s.student_id || s.id.slice(0,6)})</option>`).join('');
    } catch (e) { console.error(e); }
}

async function processReportCardGeneration() {
    const studentId = document.getElementById('rc_student').value;
    const format = document.getElementById('rc_format').value;
    const session = document.getElementById('rc_session').value;

    if (!studentId) { showToast("Please select a student first", "error"); return; }

    try {
        setLoading(true);
        // 1. Fetch Student Data
        const sDoc = await db.collection('students').doc(studentId).get();
        if (!sDoc.exists) throw new Error("Student not found");
        const student = sDoc.data();

        // 2. Fetch Marks (For now, just getting all marks for this student/session)
        // In a real scenario, you'd filter by Term/Exam too
        const mSnap = await db.collection('marks').where('studentId', '==', studentId).where('session', '==', session).get();
        const marks = mSnap.docs.map(doc => doc.data());

        // 3. School Details (Mock or from Settings)
        const schoolDetails = {
            name: "HIMALAYAN INTERNATIONAL SCHOOL", // As per reference
            address: "CHETAN PARSA, PARSA, SARAN, BIHAR - 841219"
        };

        const examDetails = {
            title: "TERM 2",
            session: session
        };

        // 4. Generate via common Factory
        if (format === 'Himalayan') {
            await window.ReportCardFactory.generateHimalayan(student, marks, examDetails, schoolDetails);
        } else if (format === 'MCQ_Normal') {
            await window.ReportCardFactory.generateMCQNormal(student, marks, examDetails, schoolDetails);
        } else if (format === 'MCQ_Standard') {
            await window.ReportCardFactory.generateMCQStandard(student, marks, examDetails, schoolDetails);
        } else if (format === 'MCQ_Advance') {
            await window.ReportCardFactory.generateMCQAdvance(student, marks, examDetails, schoolDetails);
        } else {
            showToast("Selected format is not yet supported.", "error");
        }
        
    } catch (e) {
        console.error("Report generation failed:", e);
        showToast("Error: " + e.message, "error");
    } finally {
        setLoading(false);
    }
}

// Global exposure
window.loadRcClasses = loadRcClasses;
window.loadRcSections = loadRcSections;
window.loadRcStudents = loadRcStudents;
window.processReportCardGeneration = processReportCardGeneration;
window.initReportCardSection = initReportCardSection;
