/**
 * ERP Fees Module - Enhanced Integration
 * Adds enhanced services while maintaining backward compatibility with existing erp-fees.js
 *
 * This file extends the existing ERP fees functionality with:
 * - Enhanced Fee Service (FeeType, FeeStructure management)
 * - Invoice Service (Invoice generation, discounts, penalties)
 * - Payment Service (Payment recording, receipts, reports)
 * - Security enhancements (audit logging, encryption hooks)
 */

// Wait for core dependencies
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for auth and school initialization
    if (typeof waitForAuth === 'function') {
        await waitForAuth();
    }

    // Initialize enhanced services
    initFeeEnhancements();
});

async function initFeeEnhancements() {
    console.log('Loading Enhanced Fee Services...');

    // Make enhanced services available globally
    window.FeeService = FeeService;
    window.InvoiceService = InvoiceService;
    window.PaymentServiceEnhanced = PaymentServiceEnhanced;

    // Inject UI enhancements
    injectFeeMasterEnhancements();
    injectPaymentEnhancements();
    injectInvoiceEnhancements();

    console.log('Enhanced Fee Services Loaded');
}

// ===================== FEE MASTER ENHANCEMENTS =====================

function injectFeeMasterEnhancements() {
    // Enhanced Fee Master UI
    window.loadFeeMasterEnhanced = async function () {
        const container = document.getElementById('feeMasterTableBody');
        if (!container) return;

        setLoading(true);
        try {
            const sessionId = document.getElementById('feeMasterSessionFilter')?.value;
            const classFilter = document.getElementById('feeMasterClassFilter')?.value;

            // Get fee types
            const feeTypes = await FeeService.getFeeTypes();

            // Get fee structures
            const filters = {};
            if (sessionId) filters.session = sessionId;
            if (classFilter) filters.class = classFilter;

            const structures = await FeeService.getFeeStructures(filters);

            // Group by class
            const byClass = {};
            structures.forEach((s) => {
                if (!byClass[s.class]) byClass[s.class] = [];
                byClass[s.class].push(s);
            });

            // Render
            container.innerHTML = Object.keys(byClass)
                .sort()
                .map(
                    (className) => `
                <tr class="fee-class-row">
                    <td colspan="7" class="bg-light font-bold">
                        <i class="fas fa-school mr-2"></i>Class ${className}
                        <span class="badge badge-primary ml-2">${byClass[className].length} fees</span>
                    </td>
                </tr>
                ${byClass[className]
                    .map(
                        (fs) => `
                    <tr>
                        <td>${fs.fee_type}</td>
                        <td>${fs.class}</td>
                        <td>₹${fs.amount?.toLocaleString()}</td>
                        <td><span class="badge badge-${fs.frequency === 'Monthly' ? 'info' : 'success'}">${fs.frequency}</span></td>
                        <td>${fs.due_date_day || 10}</td>
                        <td>
                            ${
                                fs.late_fee_applicable
                                    ? `<span class="badge badge-warning">₹${fs.late_fee_amount}</span>`
                                    : '<span class="text-muted">-</span>'
                            }
                        </td>
                        <td>
                            <div class="flex gap-0-5">
                                <button class="btn-portal btn-ghost btn-sm" onclick="editFeeStructure('${fs.id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-portal btn-ghost btn-sm btn-danger" onclick="deleteFeeStructure('${fs.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `
                    )
                    .join('')}
            `
                )
                .join('');
        } catch (e) {
            console.error('Error loading fee master:', e);
            showToast('Error loading fee structures', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Create Fee Structure Modal
    window.openAddFeeStructureModal = function () {
        const modalHtml = `
            <div class="modal-overlay" id="feeStructureModal">
                <div class="modal-content modal-lg">
                    <div class="modal-header">
                        <h3><i class="fas fa-rupee-sign"></i> Add Fee Structure</h3>
                        <button class="close-modal" onclick="closeFeeStructureModal()">&times;</button>
                    </div>
                    <form id="feeStructureForm" onsubmit="handleFeeStructureSubmit(event)">
                        <div class="form-grid-2">
                            <div class="form-group">
                                <label>Fee Type *</label>
                                <select id="fsFeeType" required>
                                    <option value="">Select Fee Type</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Class *</label>
                                <select id="fsClass" required>
                                    <option value="">Select Class</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Amount (₹) *</label>
                                <input type="number" id="fsAmount" required min="0" step="0.01">
                            </div>
                            <div class="form-group">
                                <label>Frequency *</label>
                                <select id="fsFrequency" required>
                                    <option value="Monthly">Monthly</option>
                                    <option value="Quarterly">Quarterly</option>
                                    <option value="Yearly">Yearly</option>
                                    <option value="One-time">One-time</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Due Date (Day of Month)</label>
                                <input type="number" id="fsDueDate" value="10" min="1" max="31">
                            </div>
                            <div class="form-group">
                                <label>Session</label>
                                <select id="fsSession" required>
                                    <option value="">Select Session</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h4><i class="fas fa-clock"></i> Late Fee Settings</h4>
                            <div class="form-row">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="fsLateFeeApplicable">
                                    <span>Enable Late Fee</span>
                                </label>
                            </div>
                            <div class="late-fee-settings" style="display:none;">
                                <div class="form-grid-2">
                                    <div class="form-group">
                                        <label>Late Fee Type</label>
                                        <select id="fsLateFeeType">
                                            <option value="FIXED">Fixed Amount</option>
                                            <option value="PERCENTAGE">Percentage</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Late Fee Amount</label>
                                        <input type="number" id="fsLateFeeAmount" value="0" min="0">
                                    </div>
                                    <div class="form-group">
                                        <label>Grace Days</label>
                                        <input type="number" id="fsGraceDays" value="5" min="0" max="30">
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn-portal btn-secondary" onclick="closeFeeStructureModal()">Cancel</button>
                            <button type="submit" class="btn-portal btn-primary">Save Fee Structure</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Populate dropdowns
        loadFeeTypeOptions();
        loadClassOptions('fsClass');
        loadSessionOptions('fsSession');

        // Toggle late fee settings
        document.getElementById('fsLateFeeApplicable')?.addEventListener('change', function () {
            document.querySelector('.late-fee-settings').style.display = this.checked ? 'block' : 'none';
        });
    };

    window.closeFeeStructureModal = function () {
        document.getElementById('feeStructureModal')?.remove();
    };

    window.handleFeeStructureSubmit = async function (e) {
        e.preventDefault();

        const data = {
            feeTypeId: document.getElementById('fsFeeType').value,
            feeType: document.getElementById('fsFeeType').selectedOptions[0]?.text,
            class: document.getElementById('fsClass').value,
            amount: parseFloat(document.getElementById('fsAmount').value),
            frequency: document.getElementById('fsFrequency').value,
            dueDateDay: parseInt(document.getElementById('fsDueDate').value),
            session: document.getElementById('fsSession').value,
            lateFeeApplicable: document.getElementById('fsLateFeeApplicable').checked,
            lateFeeType: document.getElementById('fsLateFeeType').value,
            lateFeeAmount: parseFloat(document.getElementById('fsLateFeeAmount').value || 0),
            graceDays: parseInt(document.getElementById('fsGraceDays').value),
        };

        setLoading(true);
        try {
            await FeeService.createFeeStructure(data);
            showToast('Fee structure created successfully!', 'success');
            closeFeeStructureModal();
            if (typeof loadFeeMasterEnhanced === 'function') loadFeeMasterEnhanced();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    window.editFeeStructure = async function (id) {
        // Load existing and open modal
        console.log('Edit fee structure:', id);
    };

    window.deleteFeeStructure = async function (id) {
        if (!confirm('Are you sure you want to delete this fee structure?')) return;

        setLoading(true);
        try {
            await FeeService.deleteFeeStructure(id);
            showToast('Fee structure deleted', 'success');
            if (typeof loadFeeMasterEnhanced === 'function') loadFeeMasterEnhanced();
        } catch (e) {
            showToast('Error deleting fee structure', 'error');
        } finally {
            setLoading(false);
        }
    };
}

// ===================== PAYMENT ENHANCEMENTS =====================

function injectPaymentEnhancements() {
    // Enhanced Payment Modal
    window.openPaymentModalEnhanced = function (studentId, studentName, pendingAmount, invoiceId) {
        const maxAmount = pendingAmount || 999999;

        const modalHtml = `
            <div class="modal-overlay" id="paymentModalEnhanced">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-credit-card"></i> Record Payment</h3>
                        <button class="close-modal" onclick="closePaymentModalEnhanced()">&times;</button>
                    </div>
                    <div class="payment-student-info">
                        <div class="info-row">
                            <span class="label">Student:</span>
                            <span class="value">${studentName}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Pending Amount:</span>
                            <span class="value text-danger">₹${pendingAmount?.toLocaleString() || 0}</span>
                        </div>
                    </div>
                    <form id="paymentFormEnhanced" onsubmit="handleEnhancedPayment(event)">
                        <input type="hidden" id="payStudentId" value="${studentId}">
                        <input type="hidden" id="payInvoiceId" value="${invoiceId || ''}">
                        
                        <div class="form-group">
                            <label>Amount (₹) *</label>
                            <input type="number" id="payAmount" required min="1" max="${maxAmount}" 
                                   placeholder="Enter amount">
                        </div>
                        
                        <div class="form-group">
                            <label>Payment Mode *</label>
                            <select id="payMethod" required>
                                <option value="">Select Payment Mode</option>
                                <option value="CASH">💵 Cash</option>
                                <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                                <option value="UPI">📱 UPI</option>
                                <option value="CARD">💳 Card</option>
                                <option value="CHEQUE">📝 Cheque</option>
                                <option value="DD">📄 DD</option>
                                <option value="WAIVER">✓ Waiver</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Transaction Reference</label>
                            <input type="text" id="payReference" placeholder="Transaction ID / Cheque No.">
                        </div>
                        
                        <div class="form-group">
                            <label>Remarks</label>
                            <textarea id="payRemarks" rows="2" placeholder="Optional notes"></textarea>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn-portal btn-secondary" onclick="closePaymentModalEnhanced()">Cancel</button>
                            <button type="submit" class="btn-portal btn-success">
                                <i class="fas fa-check"></i> Process Payment
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    window.closePaymentModalEnhanced = function () {
        document.getElementById('paymentModalEnhanced')?.remove();
    };

    window.handleEnhancedPayment = async function (e) {
        e.preventDefault();

        const paymentData = {
            studentId: document.getElementById('payStudentId').value,
            amount: parseFloat(document.getElementById('payAmount').value),
            method: document.getElementById('payMethod').value,
            invoiceId: document.getElementById('payInvoiceId').value || null,
            reference: document.getElementById('payReference').value,
            remarks: document.getElementById('payRemarks').value,
        };

        setLoading(true);
        try {
            const result = await PaymentServiceEnhanced.recordPayment(paymentData);

            showToast(`Payment recorded! Receipt: ${result.receiptNumber}`, 'success');
            closePaymentModalEnhanced();

            // Generate and show receipt
            await showPaymentReceipt(result);

            // Refresh student ledger
            if (typeof loadStudentLedgerData === 'function') {
                loadStudentLedgerData(paymentData.studentId);
            }
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    window.showPaymentReceipt = async function (paymentResult) {
        // Get payment details
        const payment = await PaymentServiceEnhanced.getPayment(paymentResult.paymentId);

        const receiptHtml = `
            <div class="receipt-modal" id="receiptModal">
                <div class="receipt-content">
                    <div class="receipt-header">
                        <h2>Payment Receipt</h2>
                        <button class="close-modal" onclick="closeReceiptModal()">&times;</button>
                    </div>
                    <div class="receipt-body">
                        <div class="receipt-school">
                            <h3>${window.SCHOOL_NAME || 'School Name'}</h3>
                            <p>${window.SCHOOL_ADDRESS || ''}</p>
                        </div>
                        <div class="receipt-details">
                            <div class="detail-row">
                                <span>Receipt No:</span>
                                <strong>${payment.receipt_no}</strong>
                            </div>
                            <div class="detail-row">
                                <span>Date:</span>
                                <strong>${payment.payment_date?.toDate?.()?.toLocaleDateString() || new Date().toLocaleDateString()}</strong>
                            </div>
                            <div class="detail-row">
                                <span>Student Name:</span>
                                <strong>${payment.student_name}</strong>
                            </div>
                            <div class="detail-row">
                                <span>Class:</span>
                                <strong>${payment.class}</strong>
                            </div>
                        </div>
                        <table class="receipt-table">
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Fee Payment</td>
                                    <td>₹${payment.amount?.toLocaleString()}</td>
                                </tr>
                                ${
                                    payment.allocations
                                        ?.map(
                                            (a) => `
                                    <tr>
                                        <td>${a.month} ${a.year} (${a.invoice_no})</td>
                                        <td>₹${a.amount?.toLocaleString()}</td>
                                    </tr>
                                `
                                        )
                                        .join('') || ''
                                }
                            </tbody>
                            <tfoot>
                                <tr>
                                    <th>Total Paid</th>
                                    <th>₹${payment.amount?.toLocaleString()}</th>
                                </tr>
                            </tfoot>
                        </table>
                        <div class="receipt-footer">
                            <p>Payment Mode: ${payment.payment_mode}</p>
                            <p>Collected by: ${payment.created_by}</p>
                        </div>
                    </div>
                    <div class="receipt-actions">
                        <button class="btn-portal" onclick="printReceipt()">
                            <i class="fas fa-print"></i> Print
                        </button>
                        <button class="btn-portal btn-secondary" onclick="closeReceiptModal()">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', receiptHtml);
    };

    window.closeReceiptModal = function () {
        document.getElementById('receiptModal')?.remove();
    };

    window.printReceipt = function () {
        window.print();
    };
}

// ===================== INVOICE ENHANCEMENTS =====================

function injectInvoiceEnhancements() {
    // Generate Monthly Fees Enhanced
    window.generateMonthlyFeesEnhanced = async function (className, month, year) {
        const session = window.erpState?.activeSessionId || document.getElementById('genFeeSession')?.value;

        if (!className || !month || !year || !session) {
            showToast('Please select class, month, and session', 'error');
            return;
        }

        setLoading(true);
        try {
            const result = await InvoiceService.generateMonthlyFees(className, month, year, session);

            if (result.generated > 0) {
                showToast(`Successfully generated ${result.generated} invoices!`, 'success');
            } else {
                showToast(result.message, 'warning');
            }
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Load invoice details
    window.loadInvoiceDetails = async function (invoiceId) {
        try {
            const invoice = await InvoiceService.getInvoice(invoiceId);

            // Show invoice details modal
            const modalHtml = `
                <div class="modal-overlay" id="invoiceDetailModal">
                    <div class="modal-content modal-lg">
                        <div class="modal-header">
                            <h3><i class="fas fa-file-invoice"></i> Invoice Details</h3>
                            <button class="close-modal" onclick="closeInvoiceModal()">&times;</button>
                        </div>
                        <div class="invoice-details">
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <label>Invoice No</label>
                                    <span>${invoice.invoice_no}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Student</label>
                                    <span>${invoice.student_name}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Class</label>
                                    <span>${invoice.class} ${invoice.section || ''}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Month</label>
                                    <span>${invoice.month} ${invoice.year}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Status</label>
                                    <span class="badge badge-${
                                        invoice.status === 'PAID'
                                            ? 'success'
                                            : invoice.status === 'OVERDUE'
                                              ? 'danger'
                                              : 'warning'
                                    }">
                                        ${invoice.status}
                                    </span>
                                </div>
                            </div>
                            
                            <table class="table mt-3">
                                <thead>
                                    <tr>
                                        <th>Fee Type</th>
                                        <th>Amount</th>
                                        <th>Discount</th>
                                        <th>Penalty</th>
                                        <th>Net</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${invoice.line_items
                                        ?.map(
                                            (item) => `
                                        <tr>
                                            <td>${item.fee_type}</td>
                                            <td>₹${item.amount}</td>
                                            <td>₹${item.discount || 0}</td>
                                            <td>₹${item.penalty || 0}</td>
                                            <td>₹${item.net_amount}</td>
                                        </tr>
                                    `
                                        )
                                        .join('')}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <th colspan="4" class="text-right">Total:</th>
                                        <th>₹${invoice.total_amount}</th>
                                    </tr>
                                    <tr>
                                        <th colspan="4" class="text-right">Paid:</th>
                                        <th class="text-success">₹${invoice.amount_paid}</th>
                                    </tr>
                                    <tr>
                                        <th colspan="4" class="text-right">Balance:</th>
                                        <th class="text-danger">₹${invoice.total_amount - invoice.amount_paid}</th>
                                    </tr>
                                </tfoot>
                            </table>
                            
                            <div class="invoice-actions mt-3">
                                ${
                                    invoice.status !== 'PAID'
                                        ? `
                                    <button class="btn-portal btn-success" onclick="openPaymentModalEnhanced('${invoice.student_id}', '${invoice.student_name}', ${invoice.total_amount - invoice.amount_paid}, '${invoice.id}')">
                                        <i class="fas fa-credit-card"></i> Record Payment
                                    </button>
                                `
                                        : ''
                                }
                                <button class="btn-portal" onclick="printInvoice('${invoiceId}')">
                                    <i class="fas fa-print"></i> Print
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } catch (error) {
            showToast('Error loading invoice', 'error');
        }
    };

    window.closeInvoiceModal = function () {
        document.getElementById('invoiceDetailModal')?.remove();
    };

    window.printInvoice = function (invoiceId) {
        window.print();
    };
}

// ===================== HELPER FUNCTIONS =====================

async function loadFeeTypeOptions() {
    try {
        const feeTypes = await FeeService.getFeeTypes();
        const select = document.getElementById('fsFeeType');
        if (select) {
            select.innerHTML =
                '<option value="">Select Fee Type</option>' +
                feeTypes.map((ft) => `<option value="${ft.id}">${ft.name}</option>`).join('');
        }
    } catch (e) {
        console.error('Error loading fee types:', e);
    }
}

async function loadClassOptions(targetId) {
    const select = document.getElementById(targetId);
    if (!select) return;

    try {
        const classes = (await window.ClassService?.getClasses()) || [];
        select.innerHTML =
            '<option value="">Select Class</option>' +
            classes.map((c) => `<option value="${c.name}">${c.name}</option>`).join('');
    } catch (e) {
        console.error('Error loading classes:', e);
    }
}

async function loadSessionOptions(targetId) {
    const select = document.getElementById(targetId);
    if (!select) return;

    try {
        const sessions = await schoolData('sessions').orderBy('name', 'desc').get();
        select.innerHTML =
            '<option value="">Select Session</option>' +
            sessions.docs.map((s) => `<option value="${s.id}">${s.data().name}</option>`).join('');
    } catch (e) {
        console.error('Error loading sessions:', e);
    }
}

// Make services globally available immediately
window.FeeService = FeeService;
window.InvoiceService = InvoiceService;
window.PaymentServiceEnhanced = PaymentServiceEnhanced;

// Inject UI enhancements
injectFeeMasterEnhancements();
injectPaymentEnhancements();
injectInvoiceEnhancements();

// Auto-load data when section is shown - with safety check
(function () {
    const safeOverride = () => {
        const original = window.showSection;
        if (typeof original !== 'function') {
            console.warn('showSection not ready, retrying...');
            setTimeout(safeOverride, 200);
            return;
        }
        window.showSection = function (sectionId, updateHash) {
            original(sectionId, updateHash);
            if (sectionId === 'classFeeTypeSection') {
                setTimeout(() => loadClassFeeTypes?.(), 100);
            }
            if (sectionId === 'transportFeeTypeSection') {
                setTimeout(() => loadTransportFeeTypes?.(), 100);
            }
            if (sectionId === 'feeMasterSection') {
                setTimeout(() => loadFeeMasterEnhanced?.(), 100);
            }
        };
        console.log('Fee enhancements hooked into showSection');
    };
    // Wait for DOM and start checking
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', safeOverride);
    } else {
        setTimeout(safeOverride, 100);
    }
})();

// Inline form handler for Class Fee Type
window.handleInlineFeeTypeSubmit = async function (e) {
    e.preventDefault();
    const service = window.FeeService || FeeService;
    if (!service) {
        showToast('Fee service not loaded', 'error');
        return;
    }

    setLoading(true);
    try {
        await service.createFeeType({
            name: document.getElementById('inlineCftName').value,
            category: document.getElementById('inlineCftCategory').value,
            description: document.getElementById('inlineCftDescription').value,
            isTaxable: false,
        });
        showToast('Fee type created!', 'success');
        document.getElementById('addClassFeeTypeForm').reset();
        loadClassFeeTypes();
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
    setLoading(false);
};

// Inline form handler for Transport Fee Type
window.handleInlineTransportFeeTypeSubmit = async function (e) {
    e.preventDefault();
    const service = window.FeeService || FeeService;
    if (!service) {
        showToast('Fee service not loaded', 'error');
        return;
    }

    setLoading(true);
    try {
        await service.createFeeType({
            name: document.getElementById('inlineTftName').value,
            category: 'TRANSPORT',
            description: document.getElementById('inlineTftDescription').value,
            isTaxable: false,
        });
        showToast('Transport fee type created!', 'success');
        document.getElementById('addTransportFeeTypeForm').reset();
        loadTransportFeeTypes();
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
    setLoading(false);
};

// Inline form handler for Fee Structure
window.handleInlineFeeStructureSubmit = async function (e) {
    e.preventDefault();
    const service = window.FeeService || FeeService;
    if (!service) {
        showToast('Fee service not loaded', 'error');
        return;
    }

    setLoading(true);
    try {
        await service.createFeeStructure({
            feeTypeId: document.getElementById('inlineFsFeeType').value,
            feeType: document.getElementById('inlineFsFeeType').selectedOptions[0].text,
            class: document.getElementById('inlineFsClass').value,
            amount: parseFloat(document.getElementById('inlineFsAmount').value),
            frequency: document.getElementById('inlineFsFrequency').value,
            dueDateDay: parseInt(document.getElementById('inlineFsDueDay').value) || 10,
            session: document.getElementById('feeMasterSessionFilter')?.value || '2025-26',
        });
        showToast('Fee structure created!', 'success');
        document.getElementById('addFeeStructureForm').reset();
        loadFeeMasterEnhanced?.();
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
    setLoading(false);
};

console.log('Fee Module Enhancements Loaded');
window.openAddClassFeeTypeModal = function () {
    console.log('Opening Class Fee Type Modal...');
    const modalHtml = `
        <div class="modal-overlay" id="classFeeTypeModal" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">
            <div class="modal-content" style="background:#fff;padding:25px;border-radius:12px;max-width:500px;width:90%;box-shadow:0 10px 40px rgba(0,0,0,0.2);">
                <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:1px solid #eee;padding-bottom:15px;">
                    <h3 style="margin:0;color:#333;"><i class="fas fa-tag" style="color:#0284c7;"></i> Add Class Fee Type</h3>
                    <button onclick="document.getElementById('classFeeTypeModal').remove()" style="background:none;border:none;font-size:28px;cursor:pointer;color:#666;">&times;</button>
                </div>
                <form onsubmit="handleClassFeeTypeSubmit(event)">
                    <div class="form-group" style="margin-bottom:15px;">
                        <label style="display:block;margin-bottom:5px;font-weight:600;color:#333;">Fee Type Name *</label>
                        <input type="text" id="cftName" class="form-control" placeholder="e.g. Tuition Fee" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;">
                    </div>
                    <div class="form-group" style="margin-bottom:15px;">
                        <label style="display:block;margin-bottom:5px;font-weight:600;color:#333;">Category</label>
                        <select id="cftCategory" class="form-control" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;">
                            <option value="ACADEMIC">Academic</option>
                            <option value="TRANSPORT">Transport</option>
                            <option value="HOSTEL">Hostel</option>
                            <option value="EXTRA">Extra</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom:15px;">
                        <label style="display:block;margin-bottom:5px;font-weight:600;color:#333;">Description</label>
                        <textarea id="cftDescription" class="form-control" placeholder="Optional description" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;min-height:80px;"></textarea>
                    </div>
                    <div class="form-group" style="margin-bottom:20px;">
                        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                            <input type="checkbox" id="cftTaxable" style="width:18px;height:18px;"> 
                            <span style="color:#333;">Taxable (GST applicable)</span>
                        </label>
                    </div>
                    <div style="display:flex;gap:10px;justify-content:flex-end;">
                        <button type="button" onclick="document.getElementById('classFeeTypeModal').remove()" style="padding:10px 20px;border:1px solid #ddd;background:#fff;border-radius:6px;cursor:pointer;">Cancel</button>
                        <button type="submit" style="padding:10px 25px;background:#0284c7;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Save</button>
                    </div>
                </form>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.handleClassFeeTypeSubmit = async function (e) {
    e.preventDefault();
    console.log('Submitting fee type...');
    console.log('FeeService in submit:', typeof window.FeeService);

    const service = window.FeeService || FeeService;
    if (!service) {
        showToast('Fee service not loaded. Please refresh the page.', 'error');
        console.error('FeeService not available');
        return;
    }

    setLoading(true);
    try {
        const name = document.getElementById('cftName').value;
        const category = document.getElementById('cftCategory').value;
        const description = document.getElementById('cftDescription').value;
        const isTaxable = document.getElementById('cftTaxable').checked;

        console.log('Creating fee type:', { name, category, description, isTaxable });

        await service.createFeeType({
            name: name,
            category: category,
            description: description,
            isTaxable: isTaxable,
        });
        showToast('Fee type created successfully!', 'success');
        document.getElementById('classFeeTypeModal')?.remove();
        if (typeof loadClassFeeTypes === 'function') loadClassFeeTypes();
    } catch (e) {
        console.error('Error creating fee type:', e);
        showToast('Error: ' + e.message, 'error');
    }
    setLoading(false);
};

window.loadClassFeeTypes = async function () {
    const tbody = document.getElementById('classFeeTypeTableBody');
    if (!tbody) return;
    console.log('Loading fee types...');
    console.log('FeeService available:', typeof window.FeeService !== 'undefined');

    const service = window.FeeService || FeeService;
    if (!service) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-danger">Fee service not loaded</td></tr>';
        return;
    }

    try {
        const types = await service.getFeeTypes();
        console.log('Fee types loaded:', types);
        tbody.innerHTML = types.length
            ? types
                  .map(
                      (ft) => `
                <tr>
                    <td>${ft.name}</td>
                    <td><span class="badge badge-info">${ft.category}</span></td>
                    <td>${ft.description || '-'}</td>
                    <td>${ft.is_taxable ? '<span class="text-success">Yes</span>' : '<span class="text-muted">No</span>'}</td>
                    <td><span class="badge badge-${ft.is_active ? 'success' : 'secondary'}">${ft.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn-portal btn-ghost btn-sm" onclick="editClassFeeType('${ft.id}')"><i class="fas fa-edit"></i></button>
                    </td>
                </tr>
            `
                  )
                  .join('')
            : '<tr><td colspan="6" class="text-center p-4 text-muted">No fee types found</td></tr>';
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-danger">Error loading fee types</td></tr>';
    }
};

// Transport Fee Type Modal
window.openAddTransportFeeTypeModal = function () {
    const modalHtml = `
        <div class="modal-overlay" id="transportFeeTypeModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-bus"></i> Add Transport Fee Type</h3>
                    <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <form onsubmit="handleTransportFeeTypeSubmit(event)">
                    <div class="form-group">
                        <label>Fee Type Name *</label>
                        <input type="text" id="tftName" class="form-control" placeholder="e.g. Route A - Monthly" required>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="tftDescription" class="form-control" placeholder="Route details"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-portal btn-secondary" onclick="document.getElementById('transportFeeTypeModal')?.remove()">Cancel</button>
                        <button type="submit" class="btn-portal btn-primary">Save</button>
                    </div>
                </form>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.handleTransportFeeTypeSubmit = async function (e) {
    e.preventDefault();
    setLoading(true);
    try {
        await FeeService.createFeeType({
            name: document.getElementById('tftName').value,
            category: 'TRANSPORT',
            description: document.getElementById('tftDescription').value,
            isTaxable: false,
        });
        showToast('Transport fee type created!', 'success');
        document.getElementById('transportFeeTypeModal')?.remove();
        if (typeof loadTransportFeeTypes === 'function') loadTransportFeeTypes();
    } catch (e) {
        showToast(e.message, 'error');
    }
    setLoading(false);
};

window.loadTransportFeeTypes = async function () {
    const tbody = document.getElementById('transportFeeTypeTableBody');
    if (!tbody) return;
    try {
        const types = await FeeService.getFeeTypes();
        const transportTypes = types.filter((ft) => ft.category === 'TRANSPORT');
        tbody.innerHTML = transportTypes.length
            ? transportTypes
                  .map(
                      (ft) => `
                <tr>
                    <td>${ft.name}</td>
                    <td>${ft.description || '-'}</td>
                    <td>View Routes</td>
                    <td><span class="badge badge-${ft.is_active ? 'success' : 'secondary'}">${ft.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td><button class="btn-portal btn-ghost btn-sm"><i class="fas fa-edit"></i></button></td>
                </tr>
            `
                  )
                  .join('')
            : '<tr><td colspan="5" class="text-center p-4 text-muted">No transport fee types</td></tr>';
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-danger">Error loading</td></tr>';
    }
};

console.log('Fee Module Enhancements Loaded');
