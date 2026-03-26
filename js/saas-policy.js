/**
 * SNR WORLD: SaaS Policy Hub
 * Centralized source of truth for feature tiers and module permissions.
 * This policy is shared between the Super Admin Control Tower and Tenant Dashboards.
 */

const SAAS_TIERS = {
    STAGE_0: { id: 0, name: "Suspended/Inactive", description: "Banned or Inactive School" },
    STAGE_1: { id: 1, name: "Basic Website", description: "Standard Static Website" },
    STAGE_2: { id: 2, name: "CMS Admin", description: "Dynamic Content & Branding Control" },
    STAGE_3: { id: 3, name: "Pro Portal", description: "Student & Parent Dashboard Suite" },
    STAGE_4: { id: 4, name: "ERP Basic", description: "Core Management (Fees, Attendance, etc.)" },
    STAGE_6: { id: 6, name: "Full ERP", description: "Complete Suite (Exams, Library, Transport)" }
};

/**
 * Maps Sidebar Section IDs to their required minimum SaaS Stage.
 */
const MODULE_PERMISSIONS = {
    // Stage 2: CMS & Branding
    navWebsiteCMS: 2,
    navImagery: 2,
    navContent: 2,
    navSettings: 2,
    
    // Stage 3: Student Experience
    navStudent: 3,
    
    // Stage 4: Core ERP
    navAdmission: 4,
    navAttendance: 4,
    navFees: 4,
    navHomework: 4,
    navTimetable: 4, 
    navEmployee: 4,
    navClass: 4,

    // Stage 6: Advanced Suites
    navExams: 6,
    navResults: 6,
    navLibrary: 6,
    navTransport: 6,
    navNotification: 6,
    navAcademic: 6
};

/**
 * Returns a list of enabled module IDs for a given stage.
 * Used primarily by the Super Admin Panel for provisioning.
 */
function getModulesForStage(stage) {
    const s = parseInt(stage) || 1;
    return Object.entries(MODULE_PERMISSIONS)
        .filter(([id, minStage]) => s >= minStage)
        .map(([id, minStage]) => id);
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SAAS_TIERS, MODULE_PERMISSIONS, getModulesForStage };
} else {
    window.SAAS_POLICY = { SAAS_TIERS, MODULE_PERMISSIONS, getModulesForStage };
}
