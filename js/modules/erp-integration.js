/**
 * ERP Dashboard Integration
 * Initializes all enhanced services and integrates them with the existing dashboard
 */

async function initERPIntegration() {
    console.log('Initializing ERP Integration...');

    // 1. Wait for core initialization
    if (window.schoolBootstrapReady) {
        await window.schoolBootstrapReady;
    }

    // 2. Initialize Services
    await initServices();

    // 3. Initialize Enhanced Modules
    await initEnhancedModules();

    // 4. Setup global error handling
    setupErrorHandling();

    console.log('ERP Integration Complete');
}

async function initServices() {
    // Ensure services are loaded
    if (typeof FeeService === 'undefined') {
        // Services loaded via script tags, wait for them
        await new Promise((resolve) => {
            const check = setInterval(() => {
                if (typeof FeeService !== 'undefined') {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
            setTimeout(() => clearInterval(check), 5000);
        });
    }

    // Initialize Security Module
    if (typeof ERPSecurityModule !== 'undefined') {
        await ERPSecurityModule.init();
    }

    // Make services globally available
    window.FeeService = window.FeeService || FeeService;
    window.InvoiceService = window.InvoiceService || InvoiceService;
    window.PaymentService = window.PaymentService || PaymentServiceEnhanced;

    console.log('Services initialized');
}

async function initEnhancedModules() {
    // Load enhanced fee module
    if (typeof initFeeEnhancements === 'function') {
        await initFeeEnhancements();
    }

    // Setup navigation callbacks
    setupNavigationCallbacks();

    console.log('Enhanced modules initialized');
}

function setupNavigationCallbacks() {
    // Override section display to initialize modules when navigated
    const originalShowSection = window.showSection;
    window.showSection = async function (sectionId, updateHash = true) {
        // Call original function
        if (originalShowSection) {
            originalShowSection(sectionId, updateHash);
        }

        // Initialize module-specific functionality
        await handleSectionNavigation(sectionId);
    };
}

async function handleSectionNavigation(sectionId) {
    // Map sections to initialization functions
    const sectionHandlers = {
        feeMasterSection: () => {
            if (typeof window.loadFeeMasterEnhanced === 'function') {
                window.loadFeeMasterEnhanced();
            }
        },
        createMonthlyFeeSection: () => {
            loadGenerateFeeOptions();
        },
        searchStudentFeeSection: () => {
            loadFeeSearchOptions();
        },
        classFeePaymentSection: () => {
            loadPaymentDashboard();
        },
    };

    if (sectionHandlers[sectionId]) {
        await sectionHandlers[sectionId]();
    }
}

async function loadGenerateFeeOptions() {
    // Populate class dropdown for fee generation
    const classSelect = document.getElementById('genFeeClass');
    if (!classSelect) return;

    try {
        const classes = await schoolData('classes').where('disabled', '==', false).orderBy('sortOrder').get();

        classSelect.innerHTML =
            '<option value="">Select Class</option>' +
            classes.docs.map((c) => `<option value="${c.data().name}">${c.data().name}</option>`).join('');
    } catch (e) {
        console.error('Error loading classes for fee generation:', e);
    }
}

async function loadFeeSearchOptions() {
    // Initialize searchable student select
    const container = document.getElementById('feeSearchSidContainer');
    if (!container || typeof initSearchableSelect !== 'function') return;

    try {
        const students = await schoolData('students').where('status', '==', 'ACTIVE').orderBy('name').limit(500).get();

        const studentList = students.docs.map((d) => ({
            id: d.id,
            name: d.data().name,
            class: d.data().class,
            studentId: d.data().student_id,
        }));

        initSearchableSelect('feeSearchSidContainer', studentList, (student) => {
            document.getElementById('feeSearchSid').value = student.studentId || student.id;
            if (typeof window.searchStudentFees === 'function') {
                window.searchStudentFees();
            }
        });
    } catch (e) {
        console.error('Error loading students for fee search:', e);
    }
}

async function loadPaymentDashboard() {
    // Initialize payment dashboard
    const dashboard = document.getElementById('paymentDashboardStats');
    if (!dashboard) return;

    try {
        // Get today's collection
        const todayCollection = await PaymentServiceEnhanced.getDailyCollection(new Date());

        // Update UI
        const totalEl = document.getElementById('todayCollectionTotal');
        if (totalEl) {
            totalEl.textContent = `₹${todayCollection.totalAmount?.toLocaleString() || 0}`;
        }

        const countEl = document.getElementById('todayCollectionCount');
        if (countEl) {
            countEl.textContent = todayCollection.totalTransactions || 0;
        }
    } catch (e) {
        console.error('Error loading payment dashboard:', e);
    }
}

function setupErrorHandling() {
    // Global error handler for uncaught errors
    window.addEventListener('error', (event) => {
        console.error('ERP Error:', event.error);

        // Log to audit if it's a significant error
        if (event.error && typeof ERPSecurityModule?.logSecurityEvent === 'function') {
            ERPSecurityModule.logSecurityEvent('JS_ERROR', {
                message: event.error.message,
                stack: event.error.stack?.substring(0, 500),
            });
        }
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled Promise Rejection:', event.reason);

        if (typeof ERPSecurityModule?.logSecurityEvent === 'function') {
            ERPSecurityModule.logSecurityEvent('UNHANDLED_REJECTION', {
                reason: String(event.reason)?.substring(0, 500),
            });
        }
    });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initERPIntegration);
} else {
    initERPIntegration();
}

// Export for external use
window.ERPIntegration = {
    init: initERPIntegration,
    services: {
        fee: () => FeeService,
        invoice: () => InvoiceService,
        payment: () => PaymentServiceEnhanced,
    },
};
