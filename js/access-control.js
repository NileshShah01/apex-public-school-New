/**
 * Access Control System - Role-Based Permissions
 * Defines what each user role can and cannot access
 */

const ACCESS_CONTROL = {
    // User Roles
    ROLES: {
        ADMIN: 'admin',
        TEACHER: 'teacher',
        STUDENT: 'student',
        PARENT: 'parent',
        ACCOUNTANT: 'accountant',
        LIBRARIAN: 'librarian',
        TRANSPORT: 'transport',
        VIEWER: 'viewer',
    },

    // Define permissions for each role
    PERMISSIONS: {
        // Admin - Full access to everything
        admin: {
            dashboard: true,
            students: { read: true, write: true, delete: true },
            attendance: { read: true, write: true, delete: true },
            fees: { read: true, write: true, delete: true },
            exams: { read: true, write: true, delete: true },
            results: { read: true, write: true, delete: true },
            homework: { read: true, write: true, delete: true },
            library: { read: true, write: true, delete: true },
            transport: { read: true, write: true, delete: true },
            employees: { read: true, write: true, delete: true },
            reports: { read: true, write: true, delete: true },
            settings: { read: true, write: true, delete: true },
            cms: { read: true, write: true, delete: true },
            // Can download
            downloadAdmitCard: true,
            downloadReportCard: true,
            downloadSyllabus: true,
            downloadHomework: true,
            downloadFeeReceipt: true,
            viewAllFees: true,
            viewAllStudents: true,
            viewAllAttendance: true,
        },

        // Teacher - Limited write on students, results, homework
        teacher: {
            dashboard: true,
            students: { read: true, write: false, delete: false },
            attendance: { read: true, write: true, delete: false },
            fees: { read: true, write: false, delete: false },
            exams: { read: true, write: true, delete: false },
            results: { read: true, write: true, delete: false },
            homework: { read: true, write: true, delete: true },
            library: { read: true, write: false, delete: false },
            transport: { read: true, write: false, delete: false },
            employees: { read: true, write: false, delete: false },
            reports: { read: true, write: false, delete: false },
            settings: { read: false, write: false, delete: false },
            cms: { read: true, write: false, delete: false },
            downloadAdmitCard: true,
            downloadReportCard: true,
            downloadSyllabus: true,
            downloadHomework: true,
            downloadFeeReceipt: false,
            viewAllFees: false,
            viewAllStudents: true,
            viewAllAttendance: true,
        },

        // Student - Can ONLY view own data and download specific items
        student: {
            dashboard: true,
            students: { read: false, write: false, delete: false },
            attendance: { read: 'own', write: false, delete: false },
            fees: { read: 'own', write: false, delete: false },
            exams: { read: 'own', write: false, delete: false },
            results: { read: 'own', write: false, delete: false },
            homework: { read: 'own', write: false, delete: false },
            library: { read: 'own', write: false, delete: false },
            transport: { read: 'own', write: false, delete: false },
            employees: { read: false, write: false, delete: false },
            reports: { read: 'own', write: false, delete: false },
            settings: { read: false, write: false, delete: false },
            cms: { read: true, write: false, delete: false },
            downloadAdmitCard: 'own',
            downloadReportCard: 'own',
            downloadSyllabus: 'own',
            downloadHomework: 'own',
            downloadFeeReceipt: 'own',
            viewAllFees: false,
            viewAllStudents: false,
            viewAllAttendance: false,
        },

        // Parent - Can view their child's data
        parent: {
            dashboard: true,
            students: { read: false, write: false, delete: false },
            attendance: { read: 'own', write: false, delete: false },
            fees: { read: 'own', write: false, delete: false },
            exams: { read: 'own', write: false, delete: false },
            results: { read: 'own', write: false, delete: false },
            homework: { read: 'own', write: false, delete: false },
            library: { read: 'own', write: false, delete: false },
            transport: { read: 'own', write: false, delete: false },
            employees: { read: false, write: false, delete: false },
            reports: { read: 'own', write: false, delete: false },
            settings: { read: false, write: false, delete: false },
            cms: { read: true, write: false, delete: false },
            downloadAdmitCard: 'own',
            downloadReportCard: 'own',
            downloadSyllabus: 'own',
            downloadHomework: 'own',
            downloadFeeReceipt: 'own',
            viewAllFees: false,
            viewAllStudents: false,
            viewAllAttendance: false,
        },

        // Accountant - Can manage fees only
        accountant: {
            dashboard: true,
            students: { read: true, write: false, delete: false },
            attendance: { read: false, write: false, delete: false },
            fees: { read: true, write: true, delete: true },
            exams: { read: false, write: false, delete: false },
            results: { read: false, write: false, delete: false },
            homework: { read: false, write: false, delete: false },
            library: { read: false, write: false, delete: false },
            transport: { read: false, write: false, delete: false },
            employees: { read: false, write: false, delete: false },
            reports: { read: true, write: false, delete: false },
            settings: { read: false, write: false, delete: false },
            cms: { read: false, write: false, delete: false },
            downloadAdmitCard: false,
            downloadReportCard: false,
            downloadSyllabus: false,
            downloadHomework: false,
            downloadFeeReceipt: true,
            viewAllFees: true,
            viewAllStudents: false,
            viewAllAttendance: false,
        },

        // Librarian - Library only
        librarian: {
            dashboard: true,
            students: { read: false, write: false, delete: false },
            attendance: { read: false, write: false, delete: false },
            fees: { read: false, write: false, delete: false },
            exams: { read: false, write: false, delete: false },
            results: { read: false, write: false, delete: false },
            homework: { read: false, write: false, delete: false },
            library: { read: true, write: true, delete: true },
            transport: { read: false, write: false, delete: false },
            employees: { read: false, write: false, delete: false },
            reports: { read: false, write: false, delete: false },
            settings: { read: false, write: false, delete: false },
            cms: { read: false, write: false, delete: false },
            downloadAdmitCard: false,
            downloadReportCard: false,
            downloadSyllabus: false,
            downloadHomework: false,
            downloadFeeReceipt: false,
            viewAllFees: false,
            viewAllStudents: false,
            viewAllAttendance: false,
        },

        // Transport Manager
        transport: {
            dashboard: true,
            students: { read: true, write: false, delete: false },
            attendance: { read: false, write: false, delete: false },
            fees: { read: false, write: false, delete: false },
            exams: { read: false, write: false, delete: false },
            results: { read: false, write: false, delete: false },
            homework: { read: false, write: false, delete: false },
            library: { read: false, write: false, delete: false },
            transport: { read: true, write: true, delete: true },
            employees: { read: false, write: false, delete: false },
            reports: { read: true, write: false, delete: false },
            settings: { read: false, write: false, delete: false },
            cms: { read: false, write: false, delete: false },
            downloadAdmitCard: false,
            downloadReportCard: false,
            downloadSyllabus: false,
            downloadHomework: false,
            downloadFeeReceipt: false,
            viewAllFees: false,
            viewAllStudents: false,
            viewAllAttendance: false,
        },

        // Viewer - Read only
        viewer: {
            dashboard: true,
            students: { read: true, write: false, delete: false },
            attendance: { read: true, write: false, delete: false },
            fees: { read: true, write: false, delete: false },
            exams: { read: true, write: false, delete: false },
            results: { read: true, write: false, delete: false },
            homework: { read: true, write: false, delete: false },
            library: { read: true, write: false, delete: false },
            transport: { read: true, write: false, delete: false },
            employees: { read: true, write: false, delete: false },
            reports: { read: true, write: false, delete: false },
            settings: { read: false, write: false, delete: false },
            cms: { read: true, write: false, delete: false },
            downloadAdmitCard: false,
            downloadReportCard: false,
            downloadSyllabus: false,
            downloadHomework: false,
            downloadFeeReceipt: false,
            viewAllFees: true,
            viewAllStudents: true,
            viewAllAttendance: true,
        },
    },

    // Current user role (set after login)
    currentRole: null,
    currentUserId: null,
    currentStudentId: null,

    /**
     * Initialize access control for current user
     */
    init: function (userData) {
        this.currentRole = userData.role || userData.userType || 'student';
        this.currentUserId = userData.id || userData.studentId || userData.phone;
        this.currentStudentId = userData.studentId || userData.id;

        // Store in session
        sessionStorage.setItem('USER_ROLE', this.currentRole);
        sessionStorage.setItem('USER_ID', this.currentUserId);

        console.log('Access Control initialized:', this.currentRole);
    },

    /**
     * Check if current user has permission
     */
    can: function (module, action) {
        if (!this.currentRole) {
            console.warn('Access control not initialized');
            return false;
        }

        const perms = this.PERMISSIONS[this.currentRole];
        if (!perms) {
            console.warn('Unknown role:', this.currentRole);
            return false;
        }

        // Handle special modules with object permissions
        if (typeof perms[module] === 'object') {
            const modPerm = perms[module];
            // 'own' means can only access own data
            if (modPerm[action] === 'own') {
                return true; // Will be filtered by student ID
            }
            return modPerm[action] === true;
        }

        // Handle simple boolean permissions
        return perms[module] === true;
    },

    /**
     * Check if user can access own data only
     */
    canAccessOwnOnly: function (module) {
        if (!this.currentRole) return false;
        const perms = this.PERMISSIONS[this.currentRole];
        if (!perms) return false;

        const modPerm = perms[module];
        if (typeof modPerm === 'object') {
            return modPerm.read === 'own';
        }
        return false;
    },

    /**
     * Get filter for own data only
     */
    getOwnFilter: function () {
        return this.currentStudentId || this.currentUserId;
    },

    /**
     * Check if can download specific item
     */
    canDownload: function (downloadType) {
        if (!this.currentRole) return false;
        const perms = this.PERMISSIONS[this.currentRole];
        if (!perms) return false;

        const perm = perms[downloadType];
        // true = can download, 'own' = own only, false = cannot
        return perm === true || perm === 'own';
    },

    /**
     * Check if can view all data
     */
    canViewAll: function (dataType) {
        if (!this.currentRole) return false;
        const key = 'viewAll' + dataType;
        return this.PERMISSIONS[this.currentRole][key] === true;
    },

    /**
     * Clear access control on logout
     */
    clear: function () {
        this.currentRole = null;
        this.currentUserId = null;
        this.currentStudentId = null;
        sessionStorage.removeItem('USER_ROLE');
        sessionStorage.removeItem('USER_ID');
    },
};

// Export to window
window.ACCESS_CONTROL = ACCESS_CONTROL;
window.AccessControl = ACCESS_CONTROL;
