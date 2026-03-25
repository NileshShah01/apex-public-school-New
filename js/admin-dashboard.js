// Admin Dashboard Logic - Premium Version
const SITE_URL = 'https://nileshshah01.github.io/Apex-public-school-test-01';
let allStudents = [];
let selectedStudents = new Set();
let currentPage = 1;
const itemsPerPage = 20;
let isInitializing = false;
let editingDocId = null; // Track current student being edited

// Global Loading Helper (backward compatibility for erp modules)
window.showLoading = function (show) {
    if (typeof setLoading === 'function') setLoading(show);
};

// Safety watchdog: Force-hide loading after 10 seconds if still stuck
// Started immediately to ensure it catches early hangs
const globalLoadWatchdog = setTimeout(() => {
    console.warn('Global loading watchdog triggered - force hiding loader');
    setLoading(false);
}, 10000);

// Global error handler for admin dashboard to prevent stuck loader on JS crash
window.onerror = function (msg, url, line, col, error) {
    console.error('Critical Admin JS Error:', msg, 'at', url, ':', line);
    setLoading(false);
    return false; // Let browser handle the rest
};

/**
 * Core function to switch between dashboard sections
 * Exposed to window for global access/extensibility
 */
window.showSection = function(sectionId, updateHash = true) {
    if (!sectionId) sectionId = 'dashboardOverview';

    console.log(`Showing section request: ${sectionId}`);

    // Update hash for persistence
    if (updateHash) {
        window.location.hash = sectionId;
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Hide all
    document.querySelectorAll('.dashboard-section').forEach((s) => {
        s.style.display = 'none';
        s.classList.add('hidden');
        s.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
    document.querySelectorAll('.cat-header').forEach((h) => h.classList.remove('active'));

    // Show target
    const target = document.getElementById(sectionId + 'Section');
    if (target) {
        target.style.display = 'block';
        target.classList.remove('hidden');
        target.classList.add('active');
    } else {
        const fallbackTarget = document.getElementById(sectionId);
        if (fallbackTarget) {
            fallbackTarget.style.display = 'block';
            fallbackTarget.classList.remove('hidden');
            fallbackTarget.classList.add('active');
        } else {
            console.warn(`Section ${sectionId} not found, defaulting to dashboardOverview`);
            if (sectionId !== 'dashboardOverview' && sectionId !== '') {
                window.showSection('dashboardOverview', true);
            }
            return;
        }
    }

    // Active link highlighting
    const activeLink = document.querySelector(`.nav-link[onclick*="'${sectionId}'"]`) || 
                      document.querySelector(`.nav-link[href="#${sectionId}"]`);
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

    // Update Section Title & Subtitle
    const sectionMetadata = {
        dashboardOverview: { title: 'School Overview', sub: 'Real-time performance metrics' },
        studentList: { title: 'Student Search & Management', sub: 'Quick search and comprehensive student profiles' },
        resultsStatus: { title: 'Documents Verification', sub: 'Audit and verify student enrollment documents' },
        admitCardTool: { title: 'Admit Card PDF Tool', sub: 'Generate and print examination admit cards' },
        bulkResultGenerator: { title: 'Report Card PDF Tool', sub: 'Bulk generate student report cards' },
        feeMaster: { title: 'Fee Management', sub: 'Track payments, dues, and fee structures' },
        manageExam: { title: 'Examination & Marks', sub: 'Manage schedules, subjects, and marks entry' },
        attendanceManagement: { title: 'Attendance Marking', sub: 'Daily student attendance tracking' },
        notices: { title: 'Notice Board', sub: 'Publish and manage school-wide announcements' },
        academicSession: { title: 'Academic Sessions', sub: 'Configure and switch between academic years' },
        addClass: { title: 'Classes & Sections', sub: 'Manage school structure and class levels' },
        addSubject: { title: 'Subject Management', sub: 'Define and assign subjects to classes' },
        idCardPrint: { title: 'ID Card Generator', sub: 'Design and print student identity cards' },
        adminPortalCMS: { title: 'Admin Portal CMS', sub: 'Customize portal settings and branding' },
        parentsNotPaidTool: { title: 'Fee Default Tracking', sub: 'Identify and notify parents with pending dues' },
        manualReportCardUpload: { title: 'Manual Report Card Upload', sub: 'Upload legacy report cards for students' },
        addEnquiry: { title: 'New Admission Enquiry', sub: 'Record and track potential student leads' },
        searchEnquiry: { title: 'Search Enquiries', sub: 'Filter and manage admission enquiries' },
        studentAdmission: { title: 'Student Admission', sub: 'Register new student profiles in the system' },
        viewAttendanceStats: { title: 'Attendance Reports', sub: 'Analyze student attendance trends' },
        assignHomework: { title: 'Assign Homework', sub: 'Create and distribute homework to classes' },
        homeworkHistory: { title: 'Homework History', sub: 'Review and manage past homework assignments' },
        classTimetables: { title: 'Class Timetables', sub: 'Manage and view class-wise schedules' },
        teacherTimetables: { title: 'Teacher Timetables', sub: 'Manage and view teacher-wise schedules' },
        manageExamSchedule: { title: 'Exam Timetable', sub: 'Configure dates and timing for examinations' },
        viewExamSchedule: { title: 'View Date-Sheet', sub: 'Monitor upcoming exam schedules' },
        publishExamSchedule: { title: 'Publish Schedule', sub: 'Make exam schedules visible to students' },
        examAttendanceCard: { title: 'Exam Attendance', sub: 'Generate attendance sheets for exams' },
        addResult: { title: 'Bulk Marks Entry', sub: 'Batch update student exam marks' },
        viewReportCard: { title: 'View Report Card', sub: 'Preview individual student results' },
        publishResults: { title: 'Publish Results', sub: 'Release examination results to portals' },
        resultAnalytics: { title: 'Result Analytics', sub: 'In-depth performance analysis and stats' },
        manageAllResults: { title: 'Manage Results', sub: 'Administrative control over all student marks' },
        createMonthlyFee: { title: 'Create Monthly Fee', sub: 'Generate fee structures for the month' },
        searchStudentFee: { title: 'Search Student Fee', sub: 'Query individual student payment status' },
        searchFeeDues: { title: 'Search Fee Dues', sub: 'Filter students with outstanding balances' },
        sendNotification: { title: 'Send Bulk Message', sub: 'Blast announcements via SMS or Email' },
        bookCatalog: { title: 'Book Catalog', sub: 'Manage library book inventory' },
        issueReturn: { title: 'Issue / Return Book', sub: 'Log library circulation transactions' },
        manageRoutes: { title: 'Manage Routes', sub: 'Configure school transport paths' },
        mapTransport: { title: 'Assign Students', sub: 'Link students to transport routes' },
        addEmployee: { title: 'Add Employee', sub: 'Register new staff members' },
        searchEmployee: { title: 'Search Employee', sub: 'Filter and manage staff profiles' },
        cmsHero: { title: 'Hero Slider CMS', sub: 'Manage home page banner images' },
        cmsGallery: { title: 'Photo Gallery CMS', sub: 'Update website image gallery' },
        cmsStaff: { title: 'Staff Directory CMS', sub: 'Manage staff profiles on the website' }
    };
    
    const titleEl = document.getElementById('sectionTitle');
    const subtextEl = document.getElementById('headerSubtext');
    
    if (titleEl && sectionMetadata[sectionId]) {
        titleEl.textContent = sectionMetadata[sectionId].title;
        if (subtextEl) subtextEl.textContent = sectionMetadata[sectionId].sub;
    }
    
    // ERP Integration: Auto-populate dropdowns when entering registration sections
    if ((sectionId === 'addStudentSection' || sectionId === 'studentList') && typeof updateSessionDropdowns === 'function') {
        updateSessionDropdowns();
    }
    // Bulk Student Update: auto-populate session dropdown
    if (sectionId === 'studentBulkUpdateSection' && typeof updateSessionDropdowns === 'function') {
        updateSessionDropdowns();
    }

    // Result Management Initializers
    if (sectionId === 'bulkResultGenerator') {
        if (typeof BulkReportCardUI !== 'undefined') BulkReportCardUI.initUI();
    }
    if (sectionId === 'viewReportCard') {
        if (typeof RcPreviewUI !== 'undefined') RcPreviewUI.init();
    }
    if (sectionId === 'publishResults') {
        if (window.refreshPublishStatus) window.refreshPublishStatus();
    }
    if (sectionId === 'reportCardRemarksSection' || sectionId === 'reportCardRemarks') {
        if (window.loadRemarksGrid) window.loadRemarksGrid();
    }
    // ID Generator: auto-populate session dropdown
    if (sectionId === 'studentIdPrintSection' && typeof updateSessionDropdowns === 'function') {
        updateSessionDropdowns().then(() => {
            if (typeof initERPIdCards === 'function') initERPIdCards();
        });
    }

    // Homework Management hook
    if ((sectionId === 'assignHomework' || sectionId === 'homeworkHistory') && typeof initERPHomework === 'function') {
        initERPHomework();
    }
    
    // Library Management hook
    if ((sectionId === 'bookCatalog' || sectionId === 'issueReturn') && typeof ERPLibrary !== 'undefined') {
        ERPLibrary.init();
    }
    
    // Transport Management hook
    if ((sectionId === 'manageRoutes' || sectionId === 'assignTransport' || sectionId === 'transportReport') && typeof initERPTransport === 'function') {
        initERPTransport();
    }

    // Attendance Management hook
    if ((sectionId === 'attendanceManagement' || sectionId === 'viewAttendanceStats') && typeof initERPAttendance === 'function') {
        initERPAttendance();
    }

    // Exam & Report Card hook
    const examSections = [
        'examGrading', 'manageExam', 'manageExamSchedule', 
        'viewExamSchedule', 'publishExamSchedule', 'admitCardTool', 'examAttendanceCard', 
        'studentExamAttendance', 'addResult', 'viewReportCard', 
        'publishResults', 'bulkResultGenerator', 'resultAnalytics', 
        'manageAllResults', 'reportCardRemarks', 'manualReportCardUpload'
    ];
    if (examSections.includes(sectionId) && typeof initERPExams === 'function') {
        initERPExams();
    }

    // Notification System hook
    if ((sectionId === 'sendNotification' || sectionId === 'notificationHistory') && typeof ERPNotifications !== 'undefined') {
        ERPNotifications.init();
    }

    // Analytics hook
    if (sectionId === 'resultAnalytics' && typeof ResultAnalytics !== 'undefined') {
        ResultAnalytics.init();
    }

    // Timetable hook
    if (['classTimetables', 'teacherTimetables', 'createTimetable', 'viewTimetable'].includes(sectionId) && typeof initERPTimetable === 'function') {
        initERPTimetable();
    }

    // Question Paper hook
    if (sectionId === 'questionPaperLibrary' && typeof initQuestionPapers === 'function') {
        initQuestionPapers().then(() => {
            if (typeof loadQuestionPapers === 'function') loadQuestionPapers();
        });
    }

    // Admin Portal CMS hook
    if (sectionId === 'adminPortalCMS' && typeof initAdminPortalCMS === 'function') {
        initAdminPortalCMS();
    }

    // Manual Report Card Upload hook
    if (sectionId === 'manualReportCardUpload' && typeof initManualUpload === 'function') {
        initManualUpload();
    }
};

// Set original reference for external scripts (like cms-admin.js or admin-tools.js) to override
window.originalShowSection = window.showSection;

document.addEventListener('DOMContentLoaded', () => {
    // Event Listeners
    document.getElementById('studentForm')?.addEventListener('submit', handleStudentSubmit);
    document.getElementById('bulkImportForm')?.addEventListener('submit', handleBulkImport);

    document.getElementById('noticeForm')?.addEventListener('submit', handleNoticeSubmit);
    document.getElementById('searchInput')?.addEventListener('input', () => {
        currentPage = 1;
        filterAndDisplayStudents();
    });
    document.getElementById('classFilter')?.addEventListener('change', () => {
        currentPage = 1;
        filterAndDisplayStudents();
    });
    document.getElementById('selectAll')?.addEventListener('change', handleSelectAll);
    document.getElementById('websiteSettingsForm')?.addEventListener('submit', handleWebsiteSettingsSave);

    // Initial Auth and App Initialization
    auth.onAuthStateChanged((user) => {
        if (user) {
            document.getElementById('adminEmail').textContent = user.email;
            
            // Only initialize once
            if (!isInitializing) {
                initializeApp();
            }

            // Initial Routing based on Hash - delayed to ensure everything is ready
            setTimeout(() => {
                const initialSection = window.location.hash.replace('#', '');
                window.showSection(initialSection || 'dashboardOverview');
            }, 100);
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
    if (isInitializing) return;
    
    // Ensure school resolution is complete before any data fetching
    if (window.schoolBootstrapReady) {
        console.log('Admin Dashboard: Waiting for school bootstrap...');
        await window.schoolBootstrapReady;
    }
    
    isInitializing = true;
    console.log('Initializing App for School:', CURRENT_SCHOOL_ID);
    setLoading(true);

    try {
        await loadInitialData();
        updateStats();

        // Phase 8 + ERP Initializers (Wrapped to prevent one failure from hanging the whole app)
        const safeInit = (fn, name) => {
            try {
                if (typeof fn === 'function') fn();
                else console.warn(`Initializer ${name} not found.`);
            } catch (e) {
                console.error(`Error in ${name}:`, e);
            }
        };

        // Note: initCMS* are mostly handled by DOMContentLoaded in cms-admin.js

        if (typeof initERPClassMgmt === 'function') safeInit(initERPClassMgmt, 'initERPClassMgmt');
        if (typeof initERPExams === 'function') safeInit(initERPExams, 'initERPExams');
        if (typeof initERPFees === 'function') safeInit(initERPFees, 'initERPFees');
        if (typeof initERPAdmission === 'function') safeInit(initERPAdmission, 'initERPAdmission');
        if (typeof initQuestionPapers === 'function') safeInit(initQuestionPapers, 'initQuestionPapers');
        
        // Final Branding Cleanup
        if (typeof applyAdminBranding === 'function') applyAdminBranding();
    } catch (error) {
        console.error('Initialization failed:', error);
    } finally {
        clearTimeout(globalLoadWatchdog);
        setLoading(false);
        console.log('Initialization complete.');
    }
}

function setLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        if (show) {
            overlay.classList.remove('hidden');
            overlay.style.display = 'flex';
        } else {
            overlay.classList.add('hidden');
            overlay.style.display = 'none';
        }
    }
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
    setTimeout(() => (toast.style.display = 'none'), 3000);
}

async function loadInitialData(classFilterVal = '') {
    try {
        let query = schoolData('students');

        // Optimization: Use .where() if a class filter is provided
        if (classFilterVal) {
            query = query.where('class', '==', classFilterVal);
        }

        const snapshot = await query.get();
        allStudents = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // Update Stats
        updateStats();

        // Populate Class Filters only if it's the first load (to avoid wiping out the selection)
        if (!classFilterVal) {
            const classes = [...new Set(allStudents.map((s) => s.class))].filter(Boolean).sort((a, b) => a - b);
            const classFilter = document.getElementById('classFilter');
            const promoteFrom = document.getElementById('promoteFromClass');

            if (classFilter) {
                const currentFilter = classFilter.value;
                classFilter.innerHTML = '<option value="">All Classes</option>';
                classes.forEach((c) => {
                    classFilter.innerHTML += `<option value="${c}">Class ${c}</option>`;
                });
                classFilter.value = currentFilter;
            }

            if (promoteFrom) {
                promoteFrom.innerHTML = '<option value="">Select Class</option>';
                classes.forEach((c) => {
                    promoteFrom.innerHTML += `<option value="${c}">Class ${c}</option>`;
                });
            }
        }

        filterAndDisplayStudents();
        loadNoticeHistory();
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Error loading student data', 'error');
    }
}

async function loadDashboardOverview() {
    // Rely on updateStats for dynamic counts
    updateStats();

    // Other counts (Mocked for now, will connect to real collections in Phase 3)
    const teachers = document.getElementById('totalTeachersCount');
    if (teachers) teachers.textContent = '12';
    
    const fees = document.getElementById('monthlyFeesTotal');
    if (fees) fees.textContent = '₹ 1,45,000';
    
    const attendance = document.getElementById('attendanceRate');
    if (attendance) attendance.textContent = '94%';

    // Load custom quick links
    loadCustomQuickLinks();
}

/**
 * ADMIN PORTAL CMS LOGIC
 */
let adminPortalSettings = {
    logoUrl: '',
    principalSignatureUrl: '',
    showSchoolName: true,
    quickLinks: [
        { title: 'New Enquiry', icon: 'fa-user-plus', sectionId: 'addEnquiry', color: 'blue' },
        { title: 'Add Student', icon: 'fa-user-plus', sectionId: 'studentList', color: 'blue' },
        { title: 'ID Card', icon: 'fa-id-card', sectionId: 'studentIdPrint', color: 'green' },
        { title: 'Report Card', icon: 'fa-print', sectionId: 'bulkResultGenerator', color: 'indigo' },
        { title: 'Fee Management', icon: 'fa-credit-card', sectionId: 'feeMaster', color: 'amber' },
        { title: 'Exams', icon: 'fa-magic', sectionId: 'manageExam', color: 'indigo' },
        { title: 'Attendance', icon: 'fa-check-double', sectionId: 'attendanceManagement', color: 'red' },
        { title: 'Classes', icon: 'fa-ruler-combined', sectionId: 'addClass', color: 'amber' }
    ]
};

async function initAdminPortalCMS() {
    setLoading(true);
    try {
        const doc = await schoolData('settings').doc('admin_portal').get();
        if (doc.exists) {
            adminPortalSettings = { ...adminPortalSettings, ...doc.data() };
        }

        // Apply to form
        const logoPreview = document.getElementById('cms_logoPreview');
        const sigPreview = document.getElementById('cms_signaturePreview');
        const showNameCheck = document.getElementById('cms_showSchoolName');

        if (logoPreview && adminPortalSettings.logoUrl) logoPreview.src = adminPortalSettings.logoUrl;
        if (sigPreview && adminPortalSettings.principalSignatureUrl) sigPreview.src = adminPortalSettings.principalSignatureUrl;
        if (showNameCheck) showNameCheck.checked = adminPortalSettings.showSchoolName !== false;

        renderAdminQuickLinksEditor();
    } catch (error) {
        console.error('Error loading Admin CMS settings:', error);
        showToast('Error loading settings', 'error');
    } finally {
        setLoading(false);
    }
}

function renderAdminQuickLinksEditor() {
    const list = document.getElementById('cms_quickLinksList');
    if (!list) return;

    list.innerHTML = '';
    adminPortalSettings.quickLinks.forEach((link, index) => {
        const row = document.createElement('div');
        row.className = 'flex gap-0-5 mb-0-75 align-center card bg-light p-0-75 border-radius-8';
        row.innerHTML = `
            <div class="flex-1">
                <input type="text" class="form-control form-control-sm mb-0-25" placeholder="Title" value="${link.title}" onchange="updateQuickLink(${index}, 'title', this.value)">
                <div class="flex gap-0-5">
                    <input type="text" class="form-control form-control-sm" placeholder="Icon (fa-...)" value="${link.icon}" onchange="updateQuickLink(${index}, 'icon', this.value)">
                    <select class="form-control form-control-sm" onchange="updateQuickLink(${index}, 'sectionId', this.value)">
                        <option value="dashboardOverview" ${link.sectionId === 'dashboardOverview' ? 'selected' : ''}>Overview</option>
                        <option value="studentList" ${link.sectionId === 'studentList' ? 'selected' : ''}>Students</option>
                        <option value="studentIdPrint" ${link.sectionId === 'studentIdPrint' ? 'selected' : ''}>ID Cards</option>
                        <option value="bulkResultGenerator" ${link.sectionId === 'bulkResultGenerator' ? 'selected' : ''}>Report Cards</option>
                        <option value="feeMaster" ${link.sectionId === 'feeMaster' ? 'selected' : ''}>Fees</option>
                        <option value="manageExam" ${link.sectionId === 'manageExam' ? 'selected' : ''}>Exams</option>
                        <option value="attendanceManagement" ${link.sectionId === 'attendanceManagement' ? 'selected' : ''}>Attendance</option>
                        <option value="addClass" ${link.sectionId === 'addClass' ? 'selected' : ''}>Classes</option>
                        <option value="notices" ${link.sectionId === 'notices' ? 'selected' : ''}>Notices</option>
                        <option value="addEnquiry" ${link.sectionId === 'addEnquiry' ? 'selected' : ''}>Enquiry</option>
                    </select>
                </div>
            </div>
            <button class="btn-portal btn-ghost btn-sm text-red" onclick="removeQuickLinkRow(${index})"><i class="fas fa-times"></i></button>
        `;
        list.appendChild(row);
    });
}

function updateQuickLink(index, field, value) {
    adminPortalSettings.quickLinks[index][field] = value;
}

function addQuickLinkRow() {
    adminPortalSettings.quickLinks.push({ title: 'New Link', icon: 'fa-link', sectionId: 'dashboardOverview', color: 'blue' });
    renderAdminQuickLinksEditor();
}

function removeQuickLinkRow(index) {
    adminPortalSettings.quickLinks.splice(index, 1);
    renderAdminQuickLinksEditor();
}

/**
 * Global helper for image previews
 */
window.previewImage = function(input, previewId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById(previewId).src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
};

async function saveAdminPortalCMS() {
    setLoading(true);
    try {
        const logoInput = document.getElementById('cms_logoInput');
        const sigInput = document.getElementById('cms_signatureInput');
        const showNameCheck = document.getElementById('cms_showSchoolName');

        // Handle Image Uploads (Base64 for this version)
        if (logoInput.files && logoInput.files[0]) {
            adminPortalSettings.logoUrl = await toBase64(logoInput.files[0]);
        }
        if (sigInput.files && sigInput.files[0]) {
            adminPortalSettings.principalSignatureUrl = await toBase64(sigInput.files[0]);
        }

        adminPortalSettings.showSchoolName = showNameCheck ? showNameCheck.checked : true;

        await schoolData('settings').doc('admin_portal').set(withSchool(adminPortalSettings));
        
        // Update global branding instantly
        if (typeof applyAdminBranding === 'function') applyAdminBranding();
        
        showToast('Settings saved successfully!');
    } catch (error) {
        console.error('Error saving Admin CMS settings:', error);
        showToast('Error saving settings', 'error');
    } finally {
        setLoading(false);
    }
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

/**
 * Load and render custom quick links on dashboard home
 */
async function loadCustomQuickLinks() {
    const hub = document.querySelector('#quickActionsHub .feature-grid');
    if (!hub) return;

    try {
        // Try to fetch latest settings
        const doc = await schoolData('settings').doc('admin_portal').get();
        if (doc.exists) {
            adminPortalSettings = { ...adminPortalSettings, ...doc.data() };
        }

        // Apply dynamic visibility
        applyAdminBranding();

        // Render links
        hub.innerHTML = '';
        adminPortalSettings.quickLinks.forEach(link => {
            const card = document.createElement('div');
            card.className = 'feature-card';
            card.onclick = () => showSection(link.sectionId);
            card.innerHTML = `
                <div class="icon-box-small flex-center bg-${link.color || 'blue'}-light text-primary border-radius-12">
                    <i class="fas ${link.icon}"></i>
                </div>
                <h4>${link.title}</h4>
                <p>Quick Access</p>
            `;
            hub.appendChild(card);
        });

    } catch (e) {
        console.warn('Could not load custom quick links, using defaults', e);
    }
}

/**
 * Apply dynamic branding across the portal
 */
function applyAdminBranding() {
    const sNameElements = document.querySelectorAll('.school-name-dynamic');
    const sLogoElements = document.querySelectorAll('.school-logo-dynamic');
    
    const showName = adminPortalSettings.showSchoolName !== false;
    const logoUrl = adminPortalSettings.logoUrl || window.SCHOOL_LOGO || '/images/ApexPublicSchoolLogo.png';
    const name = window.SCHOOL_NAME || 'School Portal';

    sNameElements.forEach(el => {
        el.textContent = name;
        el.style.display = showName ? 'block' : 'none';
    });

    sLogoElements.forEach(el => {
        el.src = logoUrl;
    });

    // Update global variables for other modules
    if (adminPortalSettings.logoUrl) window.SCHOOL_LOGO = adminPortalSettings.logoUrl;
    if (adminPortalSettings.principalSignatureUrl) window.PRINCIPAL_SIGNATURE = adminPortalSettings.principalSignatureUrl;
}


async function updateStudentAttendance() {
    const studentId = document.getElementById('att_studentId').value;
    const date = document.getElementById('att_date')?.value || new Date().toISOString().split('T')[0];
    const status = document.getElementById('att_status')?.value || 'present';
    const sclass = document.getElementById('att_class')?.value || '';
    const section = document.getElementById('att_section')?.value || '';

    if (!studentId || !date) {
        showToast('Please select student and date', 'error');
        return;
    }

    setLoading(true);
    try {
        await schoolData('attendance').add(
            withSchool({
                studentId,
                class: sclass,
                section,
                date,
                status,
            })
        );

        showToast('Attendance marked successfully!');
    } catch (e) {
        showToast('Error updating attendance: ' + e.message, 'error');
    } finally {
        setLoading(false);
    }
}

async function filterAndDisplayStudents() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const classVal = document.getElementById('classFilter')?.value || '';
    const tbody = document.getElementById('studentTableBody');
    if (!tbody) return;

    const filtered = allStudents.filter((s) => {
        const name = (s.name || '').toLowerCase();
        const sid = (s.student_id || '').toLowerCase();
        const roll = (s.roll_no || '').toLowerCase();
        const reg = (s.reg_no || '').toLowerCase();
        const aadhar = (s.aadhar || s.student_aadhar || '').toLowerCase();
        const father = (s.father_name || s.fatherName || '').toLowerCase();
        const mother = (s.mother_name || s.mother || '').toLowerCase();
        const mobile = (s.mobile || s.phone || '').toLowerCase();

        const matchesSearch =
            name.includes(searchTerm) ||
            sid.includes(searchTerm) ||
            roll.includes(searchTerm) ||
            reg.includes(searchTerm) ||
            aadhar.includes(searchTerm) ||
            father.includes(searchTerm) ||
            mother.includes(searchTerm) ||
            mobile.includes(searchTerm);

        const matchesClass = classVal === '' || s.class === classVal;
        return matchesSearch && matchesClass;
    });

    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(start, start + itemsPerPage);

    tbody.innerHTML = '';
    paginated.forEach((student) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="student-checkbox" value="${student.id}" onchange="toggleSelect('${student.id}')" ${selectedStudents.has(student.id) ? 'checked' : ''}></td>
            <td>${student.student_id || '-'}</td>
            <td>${student.roll_no || '-'}</td>
            <td>${student.reg_no || '-'}</td>
            <td><b>${student.name || '-'}</b></td>
            <td><span class="badge" style="background:#f1f5f9; color:#475569;">Class ${student.class || '-'} / ${student.section || '-'}</span></td>
            <td>${student.session || '-'}</td>
            <td>${student.father_name || '-'}</td>
            <td>${student.mother_name || '-'}</td>
            <td>${student.phone || student.mobile || '-'}</td>
            <td>${student.dob || '-'}</td>
            <td>${student.gender || '-'}</td>
            <td>${student.category || '-'}</td>
            <td>${student.caste || '-'}</td>
            <td>${student.religion || '-'}</td>
            <td>${student.aadhar || '-'}</td>
            <td>${student.pen || '-'}</td>
            <td>${student.smart_card_no || '-'}</td>
            <td>${student.guardian_name || '-'}</td>
            <td>${student.guardian_phone || '-'}</td>
            <td>${student.address || '-'}</td>
            <td>${student.permanent_address || '-'}</td>
            <td>${student.city || '-'}</td>
            <td>${student.hostel || '-'}</td>
            <td>${student.transport || '-'}</td>
            <td>${student.join_date || '-'}</td>
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
document.getElementById('classFilter')?.addEventListener('change', (e) => {
    currentPage = 1;
    const classVal = e.target.value;
    if (classVal) {
        loadInitialData(classVal);
    } else {
        loadInitialData(); // Load all if cleared
    }
});

async function populateResultsStatus() {
    const tbody = document.getElementById('resultsStatusTableBody');
    const yearSelect = document.getElementById('resultsYearFilter');
    const year = yearSelect ? yearSelect.value : '2026';

    tbody.innerHTML =
        '<tr><td colspan="5" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Checking documents...</td></tr>';

    // Use currently loaded students (which might be filtered by class already)
    const sortedStudents = [...allStudents].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    let resultsCount = 0;
    tbody.innerHTML = '';
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

        // OPTIMIZATION: Check session cache first for document status
        const cacheKey = `status_${docId}_${year}`;
        const cachedStatus = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');

        const updateUI = (type, exists, data = null) => {
            const cellId = type === 'report' ? `status-report-${docId}` : `status-admit-${docId}`;
            const btnId = type === 'report' ? `preview-btn-${docId}` : `preview-admit-btn-${docId}`;
            const cell = document.getElementById(cellId);
            const btn = document.getElementById(btnId);

            if (exists) {
                if (cell) {
                    cell.innerHTML =
                        type === 'report'
                            ? '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Rep: Available</span>'
                            : '<span class="badge badge-success" style="background:#f59e0b;"><i class="fas fa-check-circle"></i> Adm: Available</span>';
                }
                if (btn) {
                    btn.onclick = (e) => {
                        e.preventDefault();
                        const win = window.open();
                        win.document.write(
                            `<iframe src="${data}" width="100%" height="100%" style="border:none;"></iframe>`
                        );
                    };
                    btn.classList.remove('hidden');
                }
                if (type === 'report') {
                    resultsCount++;
                    const countEl = document.getElementById('statTotalResults');
                    if (countEl) countEl.textContent = resultsCount;
                }
            } else {
                if (cell)
                    cell.innerHTML = `<span class="badge badge-danger"><i class="fas fa-times-circle"></i> ${type === 'report' ? 'Rep' : 'Adm'}: Missing</span>`;
            }
        };

        // Check Report Card (Cached or Firestore)
        if (cachedStatus.reportData) {
            updateUI('report', true, cachedStatus.reportData);
        } else {
            schoolDoc('reports', `${docId}_${year}`)
                .get()
                .then((docRef) => {
                    if (docRef.exists) {
                        const data = docRef.data().fileData;
                        updateUI('report', true, data);
                        const current = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
                        sessionStorage.setItem(cacheKey, JSON.stringify({ ...current, reportData: data }));
                    } else {
                        updateUI('report', false);
                    }
                })
                .catch(() => updateUI('report', false));
        }

        // Check Admit Card (Cached or Firestore)
        if (cachedStatus.admitData) {
            updateUI('admit', true, cachedStatus.admitData);
        } else {
            schoolDoc('admitcards', `${docId}_${year}`)
                .get()
                .then((docRef) => {
                    if (docRef.exists) {
                        const data = docRef.data().fileData;
                        updateUI('admit', true, data);
                        const current = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
                        sessionStorage.setItem(cacheKey, JSON.stringify({ ...current, admitData: data }));
                    } else {
                        updateUI('admit', false);
                    }
                })
                .catch(() => updateUI('admit', false));
        }
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
        const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
        await schoolDoc('reports', `${docId}_${year}`).set(
            withSchool({
                fileData: base64,
            })
        );
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
        const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
        await schoolDoc('admitcards', `${docId}_${year}`).set(
            withSchool({
                fileData: base64,
            })
        );
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
        alert('Please select both source and target classes.');
        return;
    }
    const targets = allStudents.filter((s) => s.class === fromClass);
    if (targets.length === 0) {
        alert('No students found in the selected class.');
        return;
    }
    if (confirm(`Promote ${targets.length} students to Class ${toClass}?`)) {
        setLoading(true);
        try {
            const batch = (window.db || firebase.firestore()).batch();
            targets.forEach((s) => batch.update(schoolDoc('students', s.id), { class: toClass }));
            await batch.commit();
            showToast(`Promoted ${targets.length} students!`);
            await loadInitialData();
            showSection('studentList');
        } catch (error) {
            showToast('Promotion failed: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    }
}

const BulkReportCardUI = {
    async init() {
        const sessionSelect = document.getElementById('bulkRes_sessionSelect');
        if (sessionSelect && typeof erpState !== 'undefined' && erpState.sessions) {
            sessionSelect.innerHTML =
                '<option value="">Select Session</option>' +
                erpState.sessions
                    .map((s) => `<option value="${s.id}" ${s.active ? 'selected' : ''}>${s.name}</option>`)
                    .join('');

            if (erpState.activeSessionId) {
                this.loadExams();
            }
        }
    },

    loadExams() {
        RcPreviewUI.loadExams();
    },

    async loadStudents() {
        const sessEl = document.getElementById('bulkRes_sessionSelect');
        if (!sessEl) return;
        const sess = sessEl.options[sessEl.selectedIndex]?.text;
        const cls = document.getElementById('bulkRes_classSelect').value;
        const sec = document.getElementById('bulkRes_sectionSelect').value;
        const body = document.getElementById('bulkResTableBody');

        if (!cls || !body) return;
        body.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';

        try {
            const q = schoolData('students').where('session', '==', sess).where('class', '==', cls);
            const snap = sec === 'All' ? await q.get() : await q.where('section', '==', sec).get();

            if (snap.empty) {
                body.innerHTML = '<tr><td colspan="5" style="text-align:center;">No students found.</td></tr>';
                return;
            }

            body.innerHTML = snap.docs
                .map((doc) => {
                    const s = doc.data();
                    return `
                    <tr>
                        <td><input type="checkbox" class="bulk-res-check" value="${doc.id}"></td>
                        <td>${s.roll_no || '-'}</td>
                        <td><strong>${s.name}</strong></td>
                        <td><span class="badge" style="background:#f1f5f9;">Ready</span></td>
                        <td id="status_${doc.id}"><span style="color:var(--text-muted);">Waiting</span></td>
                    </tr>
                `;
                })
                .join('');
            document.getElementById('startBulkGenBtn').disabled = false;
        } catch (e) {
            console.error(e);
            body.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--danger);">Error loading students.</td></tr>';
        }
    },

    async runBulk() {
        const selected = Array.from(document.querySelectorAll('.bulk-res-check:checked')).map((cb) => cb.value);
        if (selected.length === 0) {
            showToast('No students selected', 'warning');
            return;
        }

        const examId = document.getElementById('bulkRes_examSelect').value;
        const sessionId = document.getElementById('bulkRes_sessionSelect').value;
        const format = 'premium';

        if (!examId) {
            showToast('Select Exam First', 'error');
            return;
        }

        if (!confirm(`Generate & Publish report cards for ${selected.length} students?`)) return;

        const progressArea = document.getElementById('bulkResProgressArea');
        const bar = document.getElementById('bulkResProgressBar');
        const statusMsg = document.getElementById('bulkResStatusMsg');
        const percentMsg = document.getElementById('bulkResPercentMsg');

        if (progressArea) progressArea.style.display = 'block';
        document.getElementById('startBulkGenBtn').disabled = true;

        let successCount = 0;
        for (let i = 0; i < selected.length; i++) {
            const sid = selected[i];
            const nameEl = document.getElementById(`status_${sid}`);
            if (nameEl) nameEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

            try {
                if (window.processIndividualReportCard) {
                    await window.processIndividualReportCard(sid, examId, sessionId, format);
                    successCount++;
                    if (nameEl) nameEl.innerHTML = '<i class="fas fa-check-circle" style="color:var(--success);"></i> Generated';
                } else {
                    throw new Error('Generation logic not found');
                }
            } catch (err) {
                console.error(err);
                if (nameEl) nameEl.innerHTML = `<i class="fas fa-times-circle" style="color:var(--danger);"></i> Failed`;
            }

            const p = Math.round(((i + 1) / selected.length) * 100);
            if (bar) bar.style.width = `${p}%`;
            if (percentMsg) percentMsg.textContent = `${p}%`;
            if (statusMsg) statusMsg.textContent = `Processing student ${i + 1} of ${selected.length}...`;
        }

        showToast(`Bulk processing complete! ${successCount}/${selected.length} success.`);
        document.getElementById('startBulkGenBtn').disabled = false;
    }
};

const IdCardPreviewUI = {
    async init() {
        const sessEl = document.getElementById('idIndiv_session');
        if (!sessEl) return;
        if (typeof erpState !== 'undefined' && erpState.sessions) {
            const options = '<option value="">Select Session</option>' +
                erpState.sessions.map(s => `<option value="${s.id}" ${s.active ? 'selected' : ''}>${s.name}</option>`).join('');
            sessEl.innerHTML = options;
            if (erpState.activeSessionId) {
                setTimeout(() => this.loadClasses(), 100);
            }
        }
    },
    async loadClasses() {
        const sessId = document.getElementById('idIndiv_session').value;
        const el = document.getElementById('idIndiv_class');
        if (!el || !sessId) return;
        const snap = await schoolData('classes').where('sessionId', '==', sessId).orderBy('sortOrder', 'asc').get();
        el.innerHTML = '<option value="">Select Class</option>' + 
            snap.docs.map(doc => `<option value="${doc.data().name}">${doc.data().name}</option>`).join('');
    },
    async loadStudents() {
        const sessEl = document.getElementById('idIndiv_session');
        const sess = sessEl.options[sessEl.selectedIndex]?.text;
        const cls = document.getElementById('idIndiv_class').value;
        const el = document.getElementById('idIndiv_student');
        if (!el || !cls || !sess) return;

        const snap = await schoolData('students').where('session', '==', sess).where('class', '==', cls).get();
        el.innerHTML = '<option value="">Select Student</option>' + 
            snap.docs.map(doc => `<option value="${doc.id}">${doc.data().name}</option>`).join('');
    },
    preview() {
        const sid = document.getElementById('idIndiv_student').value;
        if (!sid) return;
        document.getElementById('idPrintSid').value = sid;
        if (window.updateIdPreview) window.updateIdPreview();
    }
};

const RcPreviewUI = {
    async init() {
        const sessionDropdowns = [
            'rcPreviewSession', 
            'publishSessionSelect', 
            'bulkRes_sessionSelect', 
            'remarkSessionSelect',
            'manageResultsSession'
        ];
        
        // Find at least one existing dropdown to proceed
        const exists = sessionDropdowns.some(id => document.getElementById(id));
        if (!exists) return;

        if (typeof erpState !== 'undefined' && erpState.sessions) {
            const options = '<option value="">Select Session</option>' +
                erpState.sessions.map(s => `<option value="${s.id}" ${s.active ? 'selected' : ''}>${s.name}</option>`).join('');
            
            sessionDropdowns.forEach(id => {
                const el = document.getElementById(id);
                if (el && el.options.length <= 1) el.innerHTML = options;
            });
            
            if (erpState.activeSessionId) {
                setTimeout(() => {
                    this.loadClasses('rcPreviewSession', 'rcPreviewClass');
                    this.loadClasses('publishSessionSelect', 'publishClassSelect');
                    this.loadClasses('bulkRes_sessionSelect', 'bulkRes_classSelect');
                    this.loadClasses('remarkSessionSelect', 'remarkClassSelect');
                    this.loadClasses('manageResultsSession', 'manageResultsClass');
                    this.loadExams();
                }, 100);
            }
        }
    },

    async loadClasses(sessIdStr, targetIdStr) {
        const sessId = document.getElementById(sessIdStr)?.value;
        const el = document.getElementById(targetIdStr);
        if (!el || !sessId) return;
        
        const snap = await schoolData('classes').where('sessionId', '==', sessId).orderBy('sortOrder', 'asc').get();
        const options = '<option value="">Select Class</option>' +
            snap.docs.map(doc => `<option value="${doc.data().name}">${doc.data().name}</option>`).join('');
        el.innerHTML = options;
    },

    async loadSections(sessIdStr, classIdStr, targetIdStr) {
        const sessId = document.getElementById(sessIdStr)?.value;
        const cls = document.getElementById(classIdStr)?.value;
        const el = document.getElementById(targetIdStr);
        if (!el || !cls || !sessId) return;

        const snap = await schoolData('classes').where('sessionId', '==', sessId).where('name', '==', cls).limit(1).get();
        if (!snap.empty) {
            const sections = snap.docs[0].data().sections || ['A'];
            const options = '<option value="">Select Section</option>' +
                sections.map(s => `<option value="${s}">${s}</option>`).join('');
            el.innerHTML = options;
        }
    },

    async loadStudents() {
        const sessEl = document.getElementById('rcPreviewSession');
        const sess = sessEl.options[sessEl.selectedIndex].text;
        const cls = document.getElementById('rcPreviewClass').value;
        const sec = document.getElementById('rcPreviewSection').value;
        const studentSelect = document.getElementById('rcPreviewStudentSelect');

        if (!cls || !sec) return;

        const q = schoolData('students').where('session', '==', sess).where('class', '==', cls).where('section', '==', sec);
        const snap = await q.get();
        
        studentSelect.innerHTML = '<option value="All">All Students</option>' +
            snap.docs.map(doc => `<option value="${doc.id}">${doc.data().name}</option>`).join('');
    },

    async loadExams() {
        const sessionDropdowns = [
            'rcPreviewSession', 
            'publishSessionSelect', 
            'bulkRes_sessionSelect', 
            'remarkSessionSelect',
            'manageResultsSession'
        ];
        const examDropdowns = [
            'rcPreviewExam', 
            'publishExamSelect', 
            'bulkRes_examSelect', 
            'remarkExamSelect',
            'manageResultsExam'
        ];

        for (let i = 0; i < sessionDropdowns.length; i++) {
            const sessId = document.getElementById(sessionDropdowns[i])?.value;
            const exEl = document.getElementById(examDropdowns[i]);
            if (!sessId || !exEl) continue;

            const exSnap = await schoolData('exams').where('sessionId', '==', sessId).get();
            exEl.innerHTML = '<option value="">Select Exam</option>' +
                exSnap.docs.map(doc => `<option value="${doc.id}">${doc.data().name}</option>`).join('');
        }
    }
};

const PublishResultsUI = {
    loadClasses() { window.loadPublishClasses(); },
    loadSections() { window.loadPublishSections(); },
    refresh() { if (window.refreshPublishStatus) window.refreshPublishStatus(); }
};

const BulkReportCardUI = {
    initUI() {
        if (typeof RcPreviewUI !== 'undefined') {
            RcPreviewUI.init();
        }
    },
    loadClasses() { window.loadBulkResClasses(); },
    loadSections() { window.loadBulkResSections(); },
    async loadStudents() {
        const sessEl = document.getElementById('bulkRes_sessionSelect');
        const sess = sessEl.options[sessEl.selectedIndex].text;
        const cls = document.getElementById('bulkRes_classSelect').value;
        const sec = document.getElementById('bulkRes_sectionSelect').value;
        const body = document.getElementById('bulkRes_studentList');
        if (!body || !cls || !sec) return;

        try {
            const q = schoolData('students').where('session', '==', sess).where('class', '==', cls).where('section', '==', sec);
            const snap = await q.get();
            body.innerHTML = snap.docs.map(doc => `
                <div class="flex align-center gap-0-75 p-0-5 surface-hover rounded-sm mb-0-25">
                    <input type="checkbox" class="bulk-res-check" value="${doc.id}" checked>
                    <span class="text-sm">${doc.data().name}</span>
                </div>
            `).join('');
        } catch (e) { console.error(e); }
    },
    async runBulk() {
        const selected = Array.from(document.querySelectorAll('.bulk-res-check:checked')).map(cb => cb.value);
        const examId = document.getElementById('bulkRes_examSelect').value;
        const format = document.getElementById('bulkRes_formatSelect').value;
        const sessionId = document.getElementById('bulkRes_sessionSelect').value;

        if (!selected.length || !examId) {
            showToast('Select students and exam first', 'error');
            return;
        }

        if (!confirm(`Generate ${selected.length} report cards?`)) return;

        try {
            setLoading(true);
            showToast(`Generating ${selected.length} report cards...`, 'info');
            for (const id of selected) {
                if (window.processIndividualReportCard) {
                    await window.processIndividualReportCard(id, examId, sessionId, format, false);
                }
            }
            showToast('All report cards generated successfully!', 'success');
        } catch (e) {
            showToast('Bulk Error: ' + e.message, 'error');
        } finally {
            setLoading(false);
        }
    }
};

// Global hooks
// Global hooks for Report Card Preview
window.loadRcClasses = () => RcPreviewUI.loadClasses('rcPreviewSession', 'rcPreviewClass');
window.loadRcSections = () => RcPreviewUI.loadSections('rcPreviewSession', 'rcPreviewClass', 'rcPreviewSection');
window.loadRcStudents = () => RcPreviewUI.loadStudents();

window.idIndivLoadClasses = () => IdCardPreviewUI.loadClasses();
window.idIndivLoadStudents = () => IdCardPreviewUI.loadStudents();
window.idIndivPreview = () => IdCardPreviewUI.preview();

window.loadPublishClasses = () => RcPreviewUI.loadClasses('publishSessionSelect', 'publishClassSelect');
window.loadPublishSections = () => {
    RcPreviewUI.loadSections('publishSessionSelect', 'publishClassSelect', 'publishSectionSelect');
    if (window.refreshPublishStatus) refreshPublishStatus();
};

window.loadRemarkClasses = () => RcPreviewUI.loadClasses('remarkSessionSelect', 'remarkClassSelect');
window.loadRemarkSections = () => {
    RcPreviewUI.loadSections('remarkSessionSelect', 'remarkClassSelect', 'remarkSectionSelect');
    if (window.loadRemarksGrid) loadRemarksGrid();
};

window.loadManageResultsClasses = () => RcPreviewUI.loadClasses('manageResultsSession', 'manageResultsClass');
window.loadManageResultsSections = () => {
    RcPreviewUI.loadSections('manageResultsSession', 'manageResultsClass', 'manageResultsSectionSelect');
    if (window.refreshManageResultsTable) refreshManageResultsTable();
};
window.loadManageResultsSubjects = () => {
    const sessId = document.getElementById('manageResultsSession')?.value;
    if (window.loadSubjectsForResults && sessId) {
        window.loadSubjectsForResults(sessId, 'manageResultsSubject');
    }
};

window.loadBulkResClasses = () => RcPreviewUI.loadClasses('bulkRes_sessionSelect', 'bulkRes_classSelect');
window.loadBulkResSections = () => {
    RcPreviewUI.loadSections('bulkRes_sessionSelect', 'bulkRes_classSelect', 'bulkRes_sectionSelect');
    BulkReportCardUI.loadStudents();
};

window.loadStudentsForBulkRes = () => BulkReportCardUI.loadStudents();
window.toggleBulkResSelection = (master) => {
    document.querySelectorAll('.bulk-res-check').forEach((cb) => (cb.checked = master.checked));
};
window.runBulkGeneration = () => BulkReportCardUI.runBulk();
window.previewSingleReportCard = (isDownload = false) => {
    if (typeof previewSingleReportCard === 'function') {
        window.previewSingleReportCard(isDownload);
    } else {
        showToast('Report card logic initializing...', 'info');
    }
};

// Notice Board
async function handleNoticeSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const title = document.getElementById('noticeTitle').value;
    const message = document.getElementById('noticeMessage').value;
    try {
        await schoolData('notices').add(
            withSchool({
                title,
                message,
            })
        );
        showToast('Notice published!');
        e.target.reset();
        await loadNoticeHistory();
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        setLoading(false);
    }
}

async function loadNoticeHistory() {
    const container = document.getElementById('adminNoticesContainer');
    if (!container) return;
    try {
        const snap = await schoolData('notices').orderBy('date', 'desc').get();
        container.innerHTML = '';
        snap.forEach((doc) => {
            const d = doc.data();
            const date = d.date ? new Date(d.date.seconds * 1000).toLocaleDateString() : 'Just now';
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
    if (confirm('Delete this notice?')) {
        try {
            await schoolDoc('notices', id).delete();
            showToast('Notice deleted');
            loadNoticeHistory();
        } catch (e) {
            showToast('Error deleting notice: ' + e.message, 'error');
        }
    }
}

// // ===================== ERP TOOLS =====================

// Website Settings / CMS
async function loadWebsiteSettings() {
    try {
        const doc = await schoolDoc('settings', 'general').get();
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('set_marquee').value = data.marquee || '';
            document.getElementById('set_phone').value = data.phone || '';
            document.getElementById('set_email').value = data.email || '';
            document.getElementById('set_address').value = data.address || '';

            // Sync to localStorage for React tools
            if (data.schoolName) localStorage.setItem('schoolName', data.schoolName);
            if (data.logo) localStorage.setItem('schoolLogo', data.logo);
        }
    } catch (e) {
        console.error('Error loading settings:', e);
    }
}

async function handleWebsiteSettingsSave(e) {
    e.preventDefault();
    setLoading(true);
    try {
        const schoolName = document.getElementById('set_schoolName')?.value.trim() || '';
        const logo = document.getElementById('set_logo')?.value.trim() || ''; // Assuming there's a logo field or URL

        const payload = {
            marquee: document.getElementById('set_marquee').value.trim(),
            phone: document.getElementById('set_phone').value.trim(),
            email: document.getElementById('set_email').value.trim(),
            address: document.getElementById('set_address').value.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        if (schoolName) payload.schoolName = schoolName;

        await schoolDoc('settings', 'general').set(payload, { merge: true });
        showToast('Website Settings updated!');
        // Sync to localStorage
        if (schoolName) localStorage.setItem('schoolName', schoolName);
    } catch (e) {
        showToast('Error update: ' + e.message, 'error');
    } finally {
        setLoading(false);
    }
}

// Export Data
function exportStudentData() {
    if (allStudents.length === 0) { showToast('No students to export', 'info'); return; }
    try {
        const formattedData = allStudents.map((s) => ({
            // ── Identifiers ──────────────────────────────────
            'Student ID':           s.student_id || '',
            'Registration No':      s.reg_no || '',
            'Admission No':         s.admission_no || '',
            'PEN No':               s.pen || '',
            'Smart Card No':        s.smart_card_no || '',
            'Aadhar No':            s.aadhar || '',

            // ── Personal ─────────────────────────────────────
            'Name':                 s.name || '',
            'Gender':               s.gender || '',
            'Date of Birth':        s.dob || '',
            'Religion':             s.religion || '',
            'Category':             s.category || '',
            'Caste':                s.caste || '',
            'Blood Group':          s.blood_group || '',
            'Nationality':          s.nationality || '',

            // ── Academic ─────────────────────────────────────
            'Session':              s.session || '',
            'Class':                s.class || '',
            'Section':              s.section || '',
            'Roll No':              s.roll_no || '',
            'Join Date':            s.join_date || s.joinDate || '',
            'Previous School':      s.previous_school || '',
            'TC No':                s.tc_no || '',

            // ── Parents / Guardian ────────────────────────────
            "Father's Name":        s.father_name || s.fatherName || '',
            "Father's Aadhar":      s.father_aadhar || '',
            "Father's Mobile":      s.father_mobile || '',
            "Father's Occupation":  s.father_occupation || '',
            "Mother's Name":        s.mother_name || s.motherName || '',
            "Mother's Aadhar":      s.mother_aadhar || '',
            "Mother's Mobile":      s.mother_mobile || '',
            'Guardian Name':        s.guardian_name || '',
            'Guardian Phone':       s.guardian_phone || '',
            'Guardian Relation':    s.guardian_relation || '',
            'SMS Contact (Mobile)': s.sms_contact || s.phone || '',

            // ── Contact ───────────────────────────────────────
            'Mobile / Phone':       s.phone || s.mobile || '',
            'Email':                s.email || '',
            'Current Address':      s.address || '',
            'Permanent Address':    s.permanent_address || '',
            'City':                 s.city || '',
            'State':                s.state || '',
            'Pincode':              s.pincode || '',

            // ── Facilities ────────────────────────────────────
            'Hostel':               s.hostel || '',
            'Transport':            s.transport || '',
            'Bus Route':            s.bus_route || '',
            'Bus Stop':             s.bus_stop || '',

            // ── Status ────────────────────────────────────────
            'Status':               s.status || 'Active',
            'Remarks':              s.remarks || '',
            'Photo URL':            s.photo || s.photoUrl || '',
            'Created At':           s.createdAt ? new Date(s.createdAt.seconds ? s.createdAt.seconds * 1000 : s.createdAt).toLocaleDateString() : '',
        }));

        const ws = XLSX.utils.json_to_sheet(formattedData);
        // Auto-fit column widths
        const colWidths = Object.keys(formattedData[0]).map(k => ({ wch: Math.max(k.length + 2, 14) }));
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Students');
        XLSX.writeFile(wb, `apex_students_${new Date().toISOString().split('T')[0]}.xlsx`);
        showToast(`Exported ${formattedData.length} student(s) — all fields included!`);
    } catch (e) {
        showToast('Export failed: ' + e.message, 'error');
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
            try {
                photoUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const MAX = 300;
                            let w = img.width,
                                h = img.height;
                            if (w > MAX) {
                                h *= MAX / w;
                                w = MAX;
                            }
                            canvas.width = w;
                            canvas.height = h;
                            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                            resolve(canvas.toDataURL('image/jpeg', 0.8));
                        };
                        img.onerror = () => reject(new Error('Failed to load image file.'));
                        img.src = e.target.result;
                    };
                    reader.onerror = () => reject(new Error('Failed to read photo file.'));
                    reader.readAsDataURL(photoFile);
                });
            } catch (imageErr) {
                console.error('Photo processing error:', imageErr);
                showToast('Warning: Photo could not be processed, saving without photo.', 'error');
            }
            document.getElementById('uploadProgress').style.display = 'none';
        }

        const studentData = {
            studentId: finalSid,
            student_id: finalSid,
            name: name,
            father_name: father,
            phone: phone,
            mobile: phone,
            class: sclass,
            section: sect,
            roll_no: roll_no,
            reg_no: reg_no,
            session: session,
            admissionYear: session,
            join_date,
            dob: dob,
            dateOfBirth: dob,
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
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };
        if (photoUrl) studentData.photo_url = photoUrl;

        await schoolDoc('students', docId).set(withSchool(studentData), { merge: true });
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
    cbs.forEach((cb) => {
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
        const batch = (window.db || firebase.firestore()).batch();
        selectedStudents.forEach((id) => batch.delete(schoolDoc('students', id)));
        await batch.commit();
        selectedStudents.clear();
        updateBulkUI();
        loadInitialData();
        setLoading(false);
    }
}

async function deleteStudent(id) {
    if (confirm('Delete this student profile?')) {
        setLoading(true);
        await schoolDoc('students', id).delete();
        loadInitialData();
        setLoading(false);
    }
}

async function editStudent(id) {
    const s = allStudents.find((x) => x.id === id);
    if (!s) return;
    editingDocId = id; // remember doc ID for saving

    // Show section first to ensure HTML elements exist
    showSection('addStudent');
    document.getElementById('formTitle').textContent = 'Edit Student Profile';

    // Basic Fields
    document.getElementById('student_id').value = s.studentId || s.student_id || '';
    document.getElementById('student_name').value = s.name || '';
    document.getElementById('student_father').value = s.fatherName || s.father_name || '';
    document.getElementById('student_phone').value = s.mobile || s.phone || '';

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
            console.error('Error pre-filling registration dropdowns:', e);
        } finally {
            setLoading(false);
        }
    }

    document.getElementById('student_roll_no').value = s.roll_no || s.rollNo || '';
    document.getElementById('student_reg_no').value = s.reg_no || s.regNo || '';
    document.getElementById('student_join_date').value = s.join_date || '';
    document.getElementById('student_dob').value = s.dob || s.dateOfBirth || '';
    document.getElementById('student_gender').value = s.gender || '';
    document.getElementById('student_aadhar').value = s.aadhar || '';
    document.getElementById('student_religion').value = s.religion || '';
    document.getElementById('student_category').value = s.category || '';
    document.getElementById('student_caste').value = s.caste || '';
    document.getElementById('student_pen').value = s.pen || '';
    document.getElementById('student_smart_card_no').value = s.smart_card_no || '';
    document.getElementById('student_mother').value = s.mother_name || s.motherName || '';
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
    const previewImg = document.getElementById('proto_preview_img');
    const placeholderIcon = document.getElementById('photo_placeholder_icon');
    const fileNameSpan = document.getElementById('photoFileName');

    if (s.photo_url) {
        if (previewImg) {
            previewImg.src = s.photo_url;
            previewImg.classList.remove('hidden');
        }
        if (placeholderIcon) placeholderIcon.classList.add('hidden');
    } else {
        if (previewImg) {
            previewImg.src = '';
            previewImg.classList.add('hidden');
        }
        if (placeholderIcon) placeholderIcon.classList.remove('hidden');
    }
    if (fileNameSpan) fileNameSpan.textContent = '';
}

// Added Photo Preview helper
window.previewPhoto = function(event) {
    const file = event.target.files[0];
    const previewImg = document.getElementById('proto_preview_img');
    const placeholderIcon = document.getElementById('photo_placeholder_icon');
    const fileNameSpan = document.getElementById('photoFileName');

    if (file) {
        if (fileNameSpan) fileNameSpan.textContent = file.name;
        const reader = new FileReader();
        reader.onload = function(e) {
            if (previewImg) {
                previewImg.src = e.target.result;
                previewImg.classList.remove('hidden');
            }
            if (placeholderIcon) placeholderIcon.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    } else {
        if (fileNameSpan) fileNameSpan.textContent = '';
        if (previewImg) {
            previewImg.src = '';
            previewImg.classList.add('hidden');
        }
        if (placeholderIcon) placeholderIcon.classList.remove('hidden');
    }
};

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
                showToast('The Excel file seems to be empty.', 'error');
                setLoading(false);
                return;
            }

            document.getElementById('importStats').style.display = 'block';
            document.getElementById('totalImport').textContent = jsonData.length;

            let processed = 0;
            for (const row of jsonData) {
                // Map fields from Excel to Firestore schema
                const studentData = {
                    studentId: (row['Id'] || row['studentId'] || row['student_id'] || '').toString().trim(),
                    name: (row['Name'] || row['name'] || '').toString().trim(),
                    regNo: (row['Reg No'] || row['regNo'] || row['reg_no'] || '').toString().trim(),
                    rollNo: (row['Roll No'] || row['rollNo'] || row['roll_no'] || '').toString().trim(),
                    admissionYear: (row['Session'] || row['admissionYear'] || row['session'] || '').toString().trim(),
                    class: (row['Class'] || row['class'] || '').toString().trim(),
                    section: (row['Section'] || row['section'] || '').toString().trim(),
                    dateOfBirth: (row['Birth Date'] || row['dateOfBirth'] || row['dob'] || '').toString().trim(),
                    join_date: (row['Join Date'] || row['join_date'] || '').toString().trim(),
                    gender: (row['Gender'] || row['gender'] || '').toString().trim(),
                    fatherName: (row['Father Name'] || row['fatherName'] || row['father_name'] || '').toString().trim(),
                    motherName: (row['Mother Name'] || row['motherName'] || row['mother_name'] || '').toString().trim(),
                    mobile: (row['Phone'] || row['mobile'] || row['phone'] || '').toString().trim(),
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
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                };

                // Mandatory fields validation
                if (!studentData.name || !studentData.mobile || !studentData.fatherName) {
                    continue;
                }

                const docId = studentData.studentId || studentData.mobile;
                await schoolDoc('students', docId).set(withSchool(studentData), { merge: true });
                processed++;
                document.getElementById('currentImport').textContent = processed;
            }

            showToast(`Bulk Import Complete: ${processed} students processed.`);
            showSection('studentList');
        } catch (error) {
            console.error('Excel processing error:', error);
            showToast('Failed to process Excel file.', 'error');
        } finally {
            setLoading(false);
        }
    };
    reader.readAsArrayBuffer(file);
}


function logoutAdmin() {
    auth.signOut().then(() => (window.location.href = 'admin-login.html'));
}

function updateStats() {
    const totalStudents = document.getElementById('totalStudentsCount');
    if (totalStudents) {
        totalStudents.textContent = allStudents.length;
    }
    
    const totalClasses = document.getElementById('statTotalClasses');
    if (totalClasses) {
        const classes = new Set(allStudents.map((s) => s.class));
        totalClasses.textContent = classes.size;
    }

    // Secondary UI IDs (for backward compatibility or multiple views)
    const statStudents = document.getElementById('statTotalStudents');
    if (statStudents) statStudents.textContent = allStudents.length;
}

// ===================== INQUIRIES =====================
async function loadInquiries() {
    const tbody = document.getElementById('inquiryTableBody');
    tbody.innerHTML =
        '<tr><td colspan="8" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading inquiries...</td></tr>';

    try {
        const snap = await schoolData('inquiries').orderBy('submittedAt', 'desc').get();
        if (snap.empty) {
            tbody.innerHTML =
                '<tr><td colspan="8" style="text-align:center; color:#64748b;">No inquiries yet.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        snap.forEach((doc) => {
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
                            <option ${d.status === 'New' ? 'selected' : ''}>New</option>
                            <option ${d.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
                            <option ${d.status === 'Admitted' ? 'selected' : ''}>Admitted</option>
                            <option ${d.status === 'Not Interested' ? 'selected' : ''}>Not Interested</option>
                        </select>
                    </td>
                </tr>`;
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#ef4444;">Error: ${e.message}</td></tr>`;
    }
}

async function updateInquiryStatus(docId, newStatus) {
    try {
        await schoolDoc('inquiries', docId).update({ status: newStatus });
        showToast(`Status updated to "${newStatus}"`);
    } catch (e) {
        showToast('Error updating status: ' + e.message, 'error');
    }
}

// ===================== LIBRARY HELPERS =====================
function toggleAddBookForm() {
    const wrapper = document.getElementById('addBookFormWrapper');
    if (wrapper) wrapper.style.display = wrapper.style.display === 'none' ? 'block' : 'none';
}

function toggleAddRouteForm() {
    const wrapper = document.getElementById('addRouteFormWrapper');
    if (wrapper) wrapper.style.display = wrapper.style.display === 'none' ? 'block' : 'none';
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
    allStudents.forEach((s) => {
        if (s.student_id) lookup[s.student_id.trim().toLowerCase()] = s.id;
    });

    let success = 0,
        failed = 0;

    for (const file of files) {
        const studentIdFromFile = file.name
            .replace(/\.pdf$/i, '')
            .trim()
            .toLowerCase();
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
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
            await schoolDoc(collection, `${docId}_${year}`).set(
                withSchool({
                    fileData: base64,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                })
            );
            logItems.innerHTML += `<div style="padding:0.5rem; background:#ecfdf5; border-radius:0.5rem; margin-bottom:0.5rem; color:#065f46;">
                ✅ <b>${file.name}</b> — Uploaded for Student "${studentIdFromFile}" (${year})
            </div>`;
            success++;
        } catch (e) {
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
        const snap = await schoolData(collection).get();
        if (snap.empty) {
            showToast('No data to export', 'error');
            return;
        }

        let csvContent = 'data:text/csv;charset=utf-8,';
        let headers = [];
        let rows = [];

        snap.forEach((doc) => {
            const data = doc.data();
            const row = {};

            // Format specific based on collection
            if (collection === 'students') {
                row['Student ID'] = data.studentId || data.student_id;
                row['Name'] = data.name;
                row['Class'] = data.class;
                row['Section'] = data.section;
                row['DOB'] = data.dateOfBirth || data.dob;
                row['Mobile'] = data.mobile || data.phone;
                row['Father Name'] = data.fatherName || data.father_name;
                row['Village/Address'] = data.village || data.address;
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
            csvContent += headers.map((h) => `"${h}"`).join(',') + '\r\n';

            rows.forEach((row) => {
                const values = headers.map((header) => {
                    let val = row[header] === undefined ? '' : row[header];
                    // Escape quotes
                    if (typeof val === 'string') {
                        val = val.replace(/"/g, '""');
                        if (val.search(/("|,|\n)/g) >= 0) val = `"${val}"`;
                    }
                    return val;
                });
                csvContent += values.join(',') + '\r\n';
            });
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `${collection}_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast(`Exported ${rows.length} records!`);
    } catch (e) {
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
        alert('Please select a Class and upload a PDF file.');
        return;
    }

    const file = fileInput.files[0];
    logArea.innerHTML = `> Starting process for Class: ${classVal}, Year: ${year}<br>`;
    logArea.innerHTML += `> File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)<br>`;
    progressSpan.innerText = 'Initializing...';

    // 1. Get students for this class, sorted by Student ID
    const students = allStudents
        .filter((s) => s.class === classVal)
        .sort((a, b) => {
            const idA = (a.studentId || a.student_id || '').toLowerCase();
            const idB = (b.studentId || b.student_id || '').toLowerCase();
            return idA.localeCompare(idB);
        });

    if (students.length === 0) {
        logArea.innerHTML += `<span style="color:#ef4444;">> ERROR: No students found in Class ${classVal}. Aborting.</span><br>`;
        progressSpan.innerText = 'Failed';
        return;
    }

    logArea.innerHTML += `> Found ${students.length} students in Class ${classVal}.<br>`;

    try {
        progressSpan.innerText = 'Reading PDF...';
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
                const base64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(new Blob([pdfBytes], { type: 'application/pdf' }));
                });

                logArea.innerHTML += `> Processing student: <b>${student.studentId || student.student_id}</b> (${student.name})...<br>`;

                // Upload to Firestore
                await schoolDoc('admitcards', `${student.id}_${year}`).set(
                    withSchool({
                        fileData: base64,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    })
                );

                logArea.innerHTML += `<span style="color:#10b981;">  ✅ Successfully assigned page ${i + 1} to ${student.studentId || student.student_id}</span><br>`;
                successCount++;
            } catch (err) {
                logArea.innerHTML += `<span style="color:#ef4444;">  ❌ Failed for ${student.studentId || student.student_id}: ${err.message}</span><br>`;
            }

            // Auto-scroll log
            logArea.scrollTop = logArea.scrollHeight;
        }

        logArea.innerHTML += `<span style="color:#38bdf8; font-weight:bold;">> COMPLETED: ${successCount} admit cards processed successfully.</span><br>`;
        progressSpan.innerText = 'Done';
        showToast(`Admit Card Split complete! ${successCount} successful.`, 'success');
    } catch (e) {
        logArea.innerHTML += `<span style="color:#ef4444;">> CRITICAL ERROR: ${e.message}</span><br>`;
        progressSpan.innerText = 'Error';
        console.error(e);
    }
}
// ===================== SEARCHABLE STUDENT SELECT =====================
function initSearchableSelect(containerId, dataArray, onSelect) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Attach data to window for the global toggle/filter functions to access
    window[`${containerId}_data`] = dataArray;

    container.innerHTML = `
        <div class="searchable-select-wrapper" style="position:relative;">
            <div class="select-trigger" onclick="toggleSearchDropdown('${containerId}')" style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem 1rem; border:1px solid var(--border); border-radius:0.5rem; background:white; cursor:pointer;">
                <span id="${containerId}_label" style="color:var(--text-muted);">Select Item...</span>
                <i class="fas fa-chevron-down" style="font-size:0.8rem; color:var(--text-muted);"></i>
            </div>
            <div id="${containerId}_dropdown" style="display:none; position:absolute; top:100%; left:0; right:0; background:white; border:1px solid var(--border); border-radius:0.5rem; margin-top:0.5rem; box-shadow:0 10px 25px rgba(0,0,0,0.1); z-index:1000; max-height:300px; overflow:hidden; display:flex; flex-direction:column;">
                <div style="padding:0.75rem; border-bottom:1px solid var(--border); background:#f8fafc;">
                    <input type="text" placeholder="Search..." oninput="filterSearchDropdown('${containerId}', this.value)" style="width:100%; padding:0.6rem; border:1px solid var(--border); border-radius:0.4rem; font-size:0.9rem;">
                </div>
                <div id="${containerId}_list" style="overflow-y:auto; flex:1; max-height:220px;">
                    <!-- List populated dynamically -->
                </div>
            </div>
        </div>
    `;

    window[`${containerId}_select`] = (sJson) => {
        const s = JSON.parse(decodeURIComponent(sJson));
        // Default label formatting for students vs classes
        const labelText = s.student_id ? `${s.name} [${s.father_name || ''}] [${s.student_id}]` : (s.name || s.id);
        document.getElementById(`${containerId}_label`).textContent = labelText;
        document.getElementById(`${containerId}_dropdown`).style.display = 'none';
        if (onSelect) onSelect(s);
    };
}

function toggleSearchDropdown(id) {
    const drop = document.getElementById(`${id}_dropdown`);
    const isVisible = drop.style.display === 'flex';
    const dataArray = window[`${id}_data`] || [];

    // Close others
    document.querySelectorAll('[id$="_dropdown"]').forEach((el) => (el.style.display = 'none'));

    if (!isVisible) {
        drop.style.display = 'flex';
        renderDropdownList(id, dataArray);
        const input = drop.querySelector('input');
        if (input) {
            input.value = '';
            input.focus();
        }
    }
}

function filterSearchDropdown(id, q) {
    const term = q.toLowerCase();
    const dataArray = window[`${id}_data`] || [];
    const filtered = dataArray.filter(
        (s) =>
            (s.name || '').toLowerCase().includes(term) ||
            (s.student_id || '').toLowerCase().includes(term) ||
            (s.father_name || '').toLowerCase().includes(term) ||
            (s.phone || '').toLowerCase().includes(term)
    );
    renderDropdownList(id, filtered.slice(0, 30)); // Limit for performance
}

function renderDropdownList(id, list) {
    const el = document.getElementById(`${id}_list`);
    if (!el) return; // Added check for el
    if (!list || list.length === 0) {
        el.innerHTML = '<div style="padding:0.75rem; text-align:center; color:var(--text-muted);">No results found</div>';
        return;
    }

    el.innerHTML = list
        .map((s) => {
            const labelText = s.student_id ? `${s.name} (${s.student_id})` : (s.name || s.id);
            const subText = s.father_name ? `<br><small style="color:var(--text-muted)">Father: ${s.father_name}</small>` : '';
            return `<div onclick="window['${id}_select']('${encodeURIComponent(JSON.stringify(s))}')" style="padding:0.75rem 1rem; border-bottom:1px solid var(--border); cursor:pointer; transition:background 0.2s;">
                <div style="font-weight:500;">${labelText}</div>
                ${subText}
            </div>`;
        })
        .join('');
}

// Close dropdowns on click outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.searchable-select-wrapper')) {
        document.querySelectorAll('[id$="_dropdown"]').forEach((el) => (el.style.display = 'none'));
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

    sessionSelect.innerHTML =
        '<option value="">Select Session</option>' +
        erpState.sessions
            .map((s) => `<option value="${s.name}" data-id="${s.id}" ${s.active ? 'selected' : ''}>${s.name}</option>`)
            .join('');

    if (erpState.activeSessionId) loadClassesForBulkUpdate();
}

async function loadClassesForBulkUpdate() {
    const sessionSelect = document.getElementById('bulk_student_session');
    const sessionId = sessionSelect.options[sessionSelect.selectedIndex]?.getAttribute('data-id');
    const classSelect = document.getElementById('bulk_student_class');
    if (!classSelect || !sessionId) return;

    try {
        const snapshot = await schoolData('classes')
            .where('sessionId', '==', sessionId)
            .orderBy('sortOrder', 'asc')
            .get();
        const classes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        classSelect.innerHTML =
            '<option value="">Select Class</option>' +
            classes.map((cls) => `<option value="${cls.name}" data-id="${cls.id}">${cls.name}</option>`).join('');

        document.getElementById('bulk_student_section').innerHTML = '<option value="">Select Class First</option>';
    } catch (e) {
        console.error('Error loading classes for bulk update:', e);
    }
}

async function loadBulkStudentList() {
    const session = document.getElementById('bulk_student_session').value;
    const className = document.getElementById('bulk_student_class').value;
    const section = document.getElementById('bulk_student_section').value;
    const body = document.getElementById('bulkUpdateTableBody');

    if (!session || !className) return;

    body.innerHTML =
        '<tr><td colspan="9" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading students...</td></tr>';

    try {
        let query = schoolData('students').where('session', '==', session).where('class', '==', className);

        if (section) query = query.where('section', '==', section);

        const snapshot = await query.get();
        const students = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        if (students.length === 0) {
            body.innerHTML =
                '<tr><td colspan="9" style="text-align:center;">No students found matching filters.</td></tr>';
            return;
        }

        // Maintain scroll position or reset?
        body.innerHTML = students
            .map(
                (s) => `
            <tr data-id="${s.id}">
                <td style="font-family:monospace; font-size:0.75rem;">${s.student_id || s.id.slice(0, 6)}</td>
                <td><input type="text" class="bulk-input b-name" value="${s.name || ''}"></td>
                <td class="col_roll"><input type="text" class="bulk-input b-roll" value="${s.roll_no || ''}"></td>
                <td class="col_father"><input type="text" class="bulk-input b-father" value="${s.father_name || ''}"></td>
                <td class="col_mobile"><input type="text" class="bulk-input b-mobile" value="${s.mobile || ''}"></td>
                <td class="col_dob"><input type="date" class="bulk-input b-dob" value="${s.dob || ''}"></td>
                <td class="col_blood" style="display:none;"><input type="text" class="bulk-input b-blood" value="${s.blood_group || ''}"></td>
                <td class="col_address" style="display:none;"><input type="text" class="bulk-input b-address" value="${s.address || ''}"></td>
                <td class="col_sms" style="display:none;"><input type="text" class="bulk-input b-sms" value="${s.sms_contact || ''}"></td>
            </tr>
        `
            )
            .join('');

        // Re-apply current column visibility
        document.querySelectorAll('#bulkColumnToggles input[type="checkbox"]').forEach((cb) => {
            const colClass = cb.getAttribute('onchange').match(/'([^']+)'/)[1];
            toggleBulkCol(colClass, cb.checked);
        });
    } catch (e) {
        console.error('Error loading bulk list:', e);
        body.innerHTML =
            '<tr><td colspan="9" style="text-align:center; color:var(--danger);">Error loading students.</td></tr>';
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

    elements.forEach((el) => {
        el.style.display = shouldShow ? '' : 'none';
    });
}

async function saveBulkStudentUpdate() {
    const rows = document.querySelectorAll('#bulkUpdateTableBody tr[data-id]');
    if (rows.length === 0) return;

    try {
        setLoading(true);
        const batch = (window.db || firebase.firestore()).batch();
        let changeCount = 0;

        rows.forEach((row) => {
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
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            };

            batch.update(schoolDoc('students', id), data);
            changeCount++;
        });

        await batch.commit();
        showToast(`Successfully updated ${changeCount} student records!`, 'success');
        loadInitialData(); // Refresh main list too
    } catch (e) {
        console.error('Bulk update failed:', e);
        showToast('Failed to save changes: ' + e.message, 'error');
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
    sessionSelect.innerHTML =
        '<option value="">Select Session</option>' +
        erpState.sessions
            .map((s) => `<option value="${s.name}" data-id="${s.id}" ${s.active ? 'selected' : ''}>${s.name}</option>`)
            .join('');
    if (erpState.activeSessionId) loadRcClasses();
}

async function loadRcClasses() {
    const sessionSelect = document.getElementById('rc_session');
    const sessionId = sessionSelect.options[sessionSelect.selectedIndex]?.getAttribute('data-id');
    const classSelect = document.getElementById('rc_class');
    if (!classSelect || !sessionId) return;

    try {
        const snapshot = await schoolData('classes')
            .where('sessionId', '==', sessionId)
            .orderBy('sortOrder', 'asc')
            .get();
        const classes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        classSelect.innerHTML =
            '<option value="">Select Class</option>' +
            classes.map((cls) => `<option value="${cls.name}" data-id="${cls.id}">${cls.name}</option>`).join('');
        document.getElementById('rc_section').innerHTML = '<option value="">Select Class First</option>';
        document.getElementById('rc_student').innerHTML = '<option value="">Select Details Above</option>';
    } catch (e) {
        console.error(e);
    }
}

async function loadRcSections() {
    const classSelect = document.getElementById('rc_class');
    const className = classSelect.value;
    const sectSelect = document.getElementById('rc_section');
    if (!sectSelect || !className) return;

    const session = document.getElementById('rc_session').value;
    try {
        const snapshot = await schoolData('students')
            .where('session', '==', session)
            .where('class', '==', className)
            .get();
        const students = snapshot.docs.map((doc) => doc.data());
        const sections = [...new Set(students.map((s) => s.section).filter(Boolean))];
        sectSelect.innerHTML =
            '<option value="">Select Section</option>' +
            sections.map((s) => `<option value="${s}">${s}</option>`).join('');
    } catch (e) {
        console.error(e);
    }
}

async function loadRcStudents() {
    const session = document.getElementById('rc_session').value;
    const className = document.getElementById('rc_class').value;
    const section = document.getElementById('rc_section').value;
    const studentSelect = document.getElementById('rc_student');
    if (!studentSelect || !session || !className) return;

    studentSelect.innerHTML = '<option value="">Loading students...</option>';
    try {
        let query = schoolData('students').where('session', '==', session).where('class', '==', className);
        if (section) query = query.where('section', '==', section);
        const snapshot = await query.get();
        const students = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        const container = document.getElementById('rcStudentContainer');
        if (container) {
            initSearchableSelect('rcStudentContainer', students, (selectedStudent) => {
                document.getElementById('rc_student').value = selectedStudent.id;
            });
            // Reset the hidden value initially
            document.getElementById('rc_student').value = '';
        }
    } catch (e) {
        console.error(e);
    }
}

async function processReportCardGeneration() {
    const studentId = document.getElementById('rc_student').value;
    const format = document.getElementById('rc_format').value;
    const session = document.getElementById('rc_session').value;

    if (!studentId) {
        showToast('Please select a student first', 'error');
        return;
    }

    try {
        setLoading(true);
        const sessionSelect = document.getElementById('rc_session');
        const sessionId = sessionSelect.options[sessionSelect.selectedIndex]?.getAttribute('data-id') || session;

        // 1. Fetch Student Data
        const sDoc = await schoolDoc('students', studentId).get();
        if (!sDoc.exists) throw new Error('Student not found');
        const student = sDoc.data();

        // 2. Fetch Marks (For now, just getting all marks for this student/session)
        // In a real scenario, you'd filter by Term/Exam too
        const mSnap = await schoolData('marks')
            .where('studentId', '==', studentId)
            .where('session', '==', session)
            .get();
        const marks = mSnap.docs.map((doc) => doc.data());

        // 3. School Details (Mock or from Settings)
        const schoolDetails = {
            name: 'HIMALAYAN INTERNATIONAL SCHOOL', // As per reference
            address: 'CHETAN PARSA, PARSA, SARAN, BIHAR - 841219',
        };

        const examDetails = {
            title: 'TERM 2',
            session: session,
        };

        // 4. Generate via common Factory
        if (format === 'premium') {
            // Premium uses the advanced tool with attendance calculation
            if (window.ReportCardTool) {
                await window.ReportCardTool.processReportCard(studentId, 'premium', sessionId, 'premium');
            } else {
                await window.ReportCardFactory.generatePremium(student, marks, examDetails, schoolDetails);
            }
        } else if (format === 'Himalayan') {
            await window.ReportCardFactory.generateHimalayan(student, marks, examDetails, schoolDetails);
        } else if (format === 'MCQ_Normal') {
            await window.ReportCardFactory.generateMCQNormal(student, marks, examDetails, schoolDetails);
        } else if (format === 'MCQ_Standard') {
            await window.ReportCardFactory.generateMCQStandard(student, marks, examDetails, schoolDetails);
        } else if (format === 'MCQ_Advance') {
            await window.ReportCardFactory.generateMCQAdvance(student, marks, examDetails, schoolDetails);
        } else {
            showToast('Selected format is not yet supported.', 'error');
        }
    } catch (e) {
        console.error('Report generation failed:', e);
        showToast('Error: ' + e.message, 'error');
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

async function loadEmployeesForIdPrint() {
    const select = document.getElementById('empIdSelect');
    if (!select) return;

    try {
        const snap = await schoolData('employees').get();
        select.innerHTML = '<option value="">-- Select Employee --</option>';
        snap.docs.forEach((doc) => {
            const emp = doc.data();
            select.innerHTML += `<option value="${doc.id}">${emp.name} (${emp.designation || ''})</option>`;
        });
    } catch (e) {
        console.error(e);
    }
}

async function populateEnquiryClasses() {
    const select = document.getElementById('enq_class');
    if (!select) return;

    try {
        const snap = await schoolData('classes').get();
        select.innerHTML = '<option value="">Select Class</option>';
        snap.docs.forEach((doc) => {
            const c = doc.data();
            select.innerHTML += `<option value="${c.name}">${c.name}</option>`;
        });
    } catch (e) {
        console.error(e);
    }
}

/**
 * Standardized Excel Template Generator
 * Supports: students, marks, fee_dues, fee_payments
 */
function downloadExcelTemplate(type) {
    let filename = 'template.xlsx';
    let headers = [];
    let sampleData = [];

    switch (type) {
        case 'students':
            filename = 'student_import_template.xlsx';
            headers = ['Id', 'Name', 'Class', 'Section', 'Phone', 'Father Name', 'Address'];
            sampleData = [['1001', 'John Doe', '5', 'A', '9876543210', 'Richard Doe', 'Main St, City']];
            break;
        case 'marks':
            filename = 'marks_upload_template.xlsx';
            headers = ['Roll No', 'Name', 'Marks Obtained'];
            sampleData = [['1', 'John Doe', '85']];
            break;
        case 'fee_dues':
            filename = 'fee_dues_template.xlsx';
            headers = ['Student Id', 'Student Name', 'Father Name', 'Phone', 'Session', 'Class', 'Due Amount'];
            sampleData = [['1001', 'John Doe', 'Richard Doe', '9876543210', '2025-26', '5', '5000']];
            break;
        case 'fee_payments':
            filename = 'monthly_payments_template.xlsx';
            headers = ['Student Id', 'Student Name', 'Father Name', 'Phone', 'Session', 'Class', 'Paid Amount'];
            sampleData = [['1001', 'John Doe', 'Richard Doe', '9876543210', '2025-26', '5', '2000']];
            break;
        default:
            showToast('Invalid template type', 'error');
            return;
    }

    try {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
        
        // Basic column widths
        ws['!cols'] = headers.map(() => ({ wch: 15 }));
        
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, filename);
        showToast(`Downloaded ${filename}`, 'success');
    } catch (e) {
        console.error('Template download error:', e);
        showToast('Failed to generate template', 'error');
    }
}

// Global Exports for templates
window.downloadExcelTemplate = downloadExcelTemplate;
