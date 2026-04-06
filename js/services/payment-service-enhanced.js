/**
 * Enhanced Payment Service - Complete Payment Workflow
 * Compatible with existing schoolData(), schoolDoc(), withSchool()
 */

const PaymentServiceEnhanced = {
    // Payment modes
    PAYMENT_MODES: ['CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE', 'DD', 'WAIVER'],

    // Generate receipt number
    async generateReceiptNumber() {
        const config = await schoolData('settings').doc('invoice_config').get();
        const data = config.exists ? config.data() : {};

        const lastNumber = data.last_receipt_number || 0;
        const newNumber = lastNumber + 1;
        const prefix = data.receipt_prefix || 'RCP';
        const year = new Date().getFullYear();

        await schoolData('settings').doc('invoice_config').set(
            {
                last_receipt_number: newNumber,
                updated_at: firebase.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
        );

        return `${prefix}-${year}-${String(newNumber).padStart(6, '0')}`;
    },

    // Record a payment (full transaction)
    async recordPayment(paymentData) {
        const { studentId, amount, method, invoiceId, reference, remarks } = paymentData;

        if (!studentId || !amount || amount <= 0) {
            throw new Error('Invalid payment data: studentId and amount required');
        }

        if (!this.PAYMENT_MODES.includes(method)) {
            throw new Error('Invalid payment mode');
        }

        const db = firebase.firestore();

        return await db.runTransaction(async (transaction) => {
            // 1. Verify student exists
            const studentRef = schoolDoc('students', studentId);
            const studentDoc = await transaction.get(studentRef);

            if (!studentDoc.exists) {
                throw new Error('Student not found');
            }

            const student = studentDoc.data();

            // 2. Get pending invoices if no specific invoice provided
            let targetInvoices = [];

            if (invoiceId) {
                const invoiceRef = schoolDoc('invoices', invoiceId);
                const invoiceDoc = await transaction.get(invoiceRef);

                if (!invoiceDoc.exists) {
                    throw new Error('Invoice not found');
                }

                targetInvoices = [{ ref: invoiceRef, data: invoiceDoc.data() }];
            } else {
                // Get all pending/partial invoices for student (FIFO)
                const pendingInvoices = await schoolData('invoices')
                    .where('student_id', '==', studentId)
                    .where('status', 'in', ['PENDING', 'PARTIAL', 'OVERDUE'])
                    .get();

                targetInvoices = pendingInvoices.docs.map((d) => ({
                    ref: d.ref,
                    data: d.data(),
                }));

                // Sort by due date (oldest first)
                targetInvoices.sort((a, b) => {
                    const dateA = a.data.due_date?.toDate() || new Date();
                    const dateB = b.data.due_date?.toDate() || new Date();
                    return dateA - dateB;
                });
            }

            if (targetInvoices.length === 0) {
                throw new Error('No pending invoices found for this student');
            }

            // 3. Allocate payment to invoices (FIFO)
            let remainingAmount = parseFloat(amount);
            const allocations = [];
            let totalAllocated = 0;

            for (const inv of targetInvoices) {
                if (remainingAmount <= 0) break;

                const invData = inv.data;
                const totalDue =
                    (invData.total_amount || 0) - (invData.discount_total || 0) - (invData.penalty_total || 0);
                const alreadyPaid = invData.amount_paid || 0;
                const pendingForInv = totalDue - alreadyPaid;

                if (pendingForInv <= 0) continue;

                const allocationAmount = Math.min(remainingAmount, pendingForInv);

                allocations.push({
                    invoice_id: inv.ref.id,
                    invoice_no: invData.invoice_no,
                    month: invData.month,
                    amount: allocationAmount,
                    previous_paid: alreadyPaid,
                    new_paid: alreadyPaid + allocationAmount,
                });

                totalAllocated += allocationAmount;
                remainingAmount -= allocationAmount;

                // Update invoice in transaction
                const newPaid = alreadyPaid + allocationAmount;
                const newStatus = newPaid >= totalDue ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'PENDING';

                transaction.update(inv.ref, {
                    amount_paid: newPaid,
                    status: newStatus,
                    last_payment_date: firebase.firestore.FieldValue.serverTimestamp(),
                    last_payment_method: method,
                    last_payment_amount: allocationAmount,
                    updated_at: firebase.firestore.FieldValue.serverTimestamp(),
                });
            }

            // 4. Create payment record
            const receiptNo = await this.generateReceiptNumber();

            const paymentRef = schoolData('payments').doc();
            transaction.set(
                paymentRef,
                withSchool({
                    receipt_no: receiptNo,
                    student_id: studentId,
                    student_name: student.name,
                    class: student.class,
                    invoice_id: invoiceId || allocations[0]?.invoice_id || null,
                    amount: parseFloat(amount),
                    amount_allocated: totalAllocated,
                    excess_amount: remainingAmount,
                    payment_mode: method,
                    transaction_reference: reference || '',
                    payment_date: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'COMPLETED',
                    allocations: allocations,
                    remarks: remarks || '',
                    created_by: auth.currentUser?.uid,
                    created_at: firebase.firestore.FieldValue.serverTimestamp(),
                })
            );

            // 5. Update student record
            const currentTotalPaid = student.total_fees_paid || 0;
            transaction.update(studentRef, {
                total_fees_paid: currentTotalPaid + totalAllocated,
                last_payment_date: firebase.firestore.FieldValue.serverTimestamp(),
            });

            return {
                paymentId: paymentRef.id,
                receiptNumber: receiptNo,
                totalAllocated,
                excessAmount: remainingAmount,
                allocations,
                status: 'SUCCESS',
            };
        });
    },

    // Get payment history for student
    async getStudentPayments(studentId) {
        const snapshot = await schoolData('payments')
            .where('student_id', '==', studentId)
            .orderBy('payment_date', 'desc')
            .get();

        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    // Get payment by ID
    async getPayment(paymentId) {
        const doc = await schoolDoc('payments', paymentId).get();

        if (!doc.exists) {
            throw new Error('Payment not found');
        }

        return { id: doc.id, ...doc.data() };
    },

    // Get all payments with filters
    async getPayments(filters = {}) {
        let query = schoolData('payments').orderBy('payment_date', 'desc');

        if (filters.class) query = query.where('class', '==', filters.class);
        if (filters.studentId) query = query.where('student_id', '==', filters.studentId);
        if (filters.startDate && filters.endDate) {
            // Filter in memory for date range
        }

        const snapshot = await query.limit(filters.limit || 100).get();
        let payments = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Filter by date range if provided
        if (filters.startDate) {
            const start = new Date(filters.startDate);
            payments = payments.filter((p) => p.payment_date?.toDate() >= start);
        }
        if (filters.endDate) {
            const end = new Date(filters.endDate);
            payments = payments.filter((p) => p.payment_date?.toDate() <= end);
        }

        return payments;
    },

    // Search payments
    async searchPayments(searchTerm) {
        // Search by receipt number, student name, student ID
        const allPayments = await schoolData('payments').orderBy('payment_date', 'desc').limit(500).get();

        const term = searchTerm.toLowerCase();

        return allPayments.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter(
                (p) =>
                    p.receipt_no?.toLowerCase().includes(term) ||
                    p.student_name?.toLowerCase().includes(term) ||
                    p.student_id?.toLowerCase().includes(term)
            );
    },

    // Cancel/Reverse payment (admin only)
    async reversePayment(paymentId, reason, reversedBy) {
        const db = firebase.firestore();

        return await db.runTransaction(async (transaction) => {
            // Get payment
            const paymentRef = schoolDoc('payments', paymentId);
            const paymentDoc = await transaction.get(paymentRef);

            if (!paymentDoc.exists) {
                throw new Error('Payment not found');
            }

            const payment = paymentDoc.data();

            if (payment.status === 'REFUNDED') {
                throw new Error('Payment already reversed');
            }

            // Reverse allocations
            for (const allocation of payment.allocations || []) {
                const invoiceRef = schoolDoc('invoices', allocation.invoice_id);
                const invoiceDoc = await transaction.get(invoiceRef);

                if (invoiceDoc.exists) {
                    const invoice = invoiceDoc.data();
                    const newPaid = invoice.amount_paid - allocation.amount;

                    transaction.update(invoiceRef, {
                        amount_paid: Math.max(0, newPaid),
                        status: newPaid > 0 ? 'PARTIAL' : 'PENDING',
                        updated_at: firebase.firestore.FieldValue.serverTimestamp(),
                    });
                }
            }

            // Update payment status
            transaction.update(paymentRef, {
                status: 'REFUNDED',
                reversed: {
                    reason,
                    reversed_by: reversedBy || auth.currentUser?.uid,
                    reversed_at: firebase.firestore.FieldValue.serverTimestamp(),
                },
            });

            return { paymentId, status: 'REVERSED' };
        });
    },

    // Get daily collection summary
    async getDailyCollection(date = new Date()) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const snapshot = await schoolData('payments')
            .where('payment_date', '>=', firebase.firestore.Timestamp.fromDate(startOfDay))
            .where('payment_date', '<=', firebase.firestore.Timestamp.fromDate(endOfDay))
            .where('status', '==', 'COMPLETED')
            .get();

        let totalAmount = 0;
        let byMode = {};
        let byClass = {};

        for (const doc of snapshot.docs) {
            const payment = doc.data();
            totalAmount += payment.amount || 0;

            // By mode
            const mode = payment.payment_mode || 'OTHER';
            byMode[mode] = (byMode[mode] || 0) + payment.amount;

            // By class
            const cls = payment.class || 'Unknown';
            byClass[cls] = (byClass[cls] || 0) + payment.amount;
        }

        return {
            date: date.toISOString().split('T')[0],
            totalAmount,
            totalTransactions: snapshot.size,
            byMode,
            byClass,
        };
    },

    // Get collection report for date range
    async getCollectionReport(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        const snapshot = await schoolData('payments')
            .where('payment_date', '>=', firebase.firestore.Timestamp.fromDate(start))
            .where('payment_date', '<=', firebase.firestore.Timestamp.fromDate(end))
            .where('status', '==', 'COMPLETED')
            .get();

        let totalAmount = 0;
        let studentPayments = {};

        for (const doc of snapshot.docs) {
            const payment = doc.data();
            totalAmount += payment.amount || 0;

            if (!studentPayments[payment.student_id]) {
                studentPayments[payment.student_id] = {
                    studentName: payment.student_name,
                    class: payment.class,
                    totalPaid: 0,
                    paymentCount: 0,
                };
            }
            studentPayments[payment.student_id].totalPaid += payment.amount;
            studentPayments[payment.student_id].paymentCount += 1;
        }

        return {
            startDate,
            endDate,
            totalAmount,
            totalTransactions: snapshot.size,
            uniqueStudents: Object.keys(studentPayments).length,
            studentSummary: Object.values(studentPayments),
        };
    },
};

// Make available globally
window.PaymentServiceEnhanced = PaymentServiceEnhanced;

// Alias for backward compatibility
window.EnhancedPaymentService = PaymentServiceEnhanced;
