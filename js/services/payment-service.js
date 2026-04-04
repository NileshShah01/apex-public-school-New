/**
 * Payment Service - Core Business Logic for Fees and Payments
 * Enhanced with audit logging, receipt data generation, and reporting
 */
const PaymentService = {
    /**
     * Records a payment and updates related fee records atomically.
     * @param {Object} paymentData { studentId, amount, method, remarks, session, reference }
     */
    async recordPayment(paymentData) {
        const { studentId, amount, method, remarks, session, reference } = paymentData;

        if (!studentId || isNaN(amount) || amount <= 0) {
            throw new Error('Invalid payment data provided.');
        }

        // Validate amount doesn't exceed total dues
        const ledger = await this.getStudentLedger(studentId);
        if (amount > ledger.summary.balance + 1) {
            // +1 for rounding tolerance
            throw new Error(`Payment amount (₹${amount}) exceeds total outstanding dues (₹${ledger.summary.balance})`);
        }

        const receiptNo = 'R-' + Math.floor(Math.random() * 900000 + 100000);
        const schoolId = window.CURRENT_SCHOOL_ID || '';

        return window.schoolData('fees').firestore.runTransaction(async (transaction) => {
            // 1. Fetch pending fees for the student
            const feeQuery = window
                .schoolData('fees')
                .where('studentId', '==', studentId)
                .where('status', 'in', ['pending', 'partial']);

            const feeSnap = await transaction.get(feeQuery);

            // 2. Allocation Logic (FIFO)
            let remainingAmount = amount;
            const updates = [];
            const allocations = [];

            const sortedDocs = feeSnap.docs.sort((a, b) => {
                const fa = a.data();
                const fb = b.data();
                const dateA = new Date(`${fa.month} ${fa.year}`);
                const dateB = new Date(`${fb.month} ${fb.year}`);
                return dateA - dateB;
            });

            for (const doc of sortedDocs) {
                if (remainingAmount <= 0) break;

                const fee = doc.data();
                const due = fee.amount - (fee.paidAmount || 0);
                const paymentForThisFee = Math.min(remainingAmount, due);

                const newPaidAmount = (fee.paidAmount || 0) + paymentForThisFee;
                const newStatus = newPaidAmount >= fee.amount ? 'paid' : 'partial';

                allocations.push({
                    feeId: doc.id,
                    feeType: fee.feeType || 'Tuition Fee',
                    month: fee.month,
                    year: fee.year,
                    amount: fee.amount,
                    discount: fee.discount || 0,
                    paidNow: paymentForThisFee,
                    remainingAfter: fee.amount - newPaidAmount,
                });

                updates.push({
                    ref: doc.ref,
                    data: {
                        paidAmount: newPaidAmount,
                        status: newStatus,
                        lastPaidDate: firebase.firestore.FieldValue.serverTimestamp(),
                        lastMethod: method,
                    },
                });

                remainingAmount -= paymentForThisFee;
            }

            // 3. Create Payment Record
            const paymentRef = window.schoolData('feePayments').doc();
            transaction.set(
                paymentRef,
                window.withSchool({
                    studentId,
                    amount,
                    paymentMode: method,
                    receiptNo,
                    transactionId: reference || '',
                    remarks: remarks || '',
                    session: session || '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    appliedAmount: amount - remainingAmount,
                    excessAmount: remainingAmount,
                    allocations,
                    schoolId,
                })
            );

            // 4. Commit all fee updates
            updates.forEach((upd) => transaction.update(upd.ref, upd.data));

            // 5. Create audit log (outside transaction - fire and forget)
            this.createAuditLog('payment_recorded', {
                paymentId: paymentRef.id,
                receiptNo,
                studentId,
                amount,
                method,
                allocations: allocations.length,
                session,
            }).catch((e) => console.warn('Audit log failed:', e));

            return { paymentId: paymentRef.id, receiptNo, allocations };
        });
    },

    /**
     * Fetches detailed ledger for a student
     */
    async getStudentLedger(studentId) {
        const feesSnap = await window.schoolData('fees').where('studentId', '==', studentId).get();
        const paymentsSnap = await window
            .schoolData('feePayments')
            .where('studentId', '==', studentId)
            .orderBy('createdAt', 'desc')
            .get();

        const ledger = feesSnap.docs
            .map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    feeType: data.feeType || 'Tuition Fee',
                    frequency: data.frequency || 'Monthly',
                    dueDate: data.dueDate || '--',
                    discount: data.discount || 0,
                    dueAmount: (data.amount || 0) - (data.paidAmount || 0),
                };
            })
            .sort((a, b) => {
                const dateA = new Date(`${a.month} ${a.year}`);
                const dateB = new Date(`${b.month} ${b.year}`);
                return dateB - dateA;
            });

        const history = paymentsSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((p) => !p.deleted);

        const totalAmount = ledger.reduce((sum, f) => sum + (f.amount || 0), 0);
        // Important: Recalculate totalPaid based on non-deleted payments or fee records
        // Using fee records is safer as they are updated during deletion
        const totalPaid = ledger.reduce((sum, f) => sum + (f.paidAmount || 0), 0);
        const totalDiscount = ledger.reduce((sum, f) => sum + (f.discount || 0), 0);

        return {
            ledger,
            history,
            summary: {
                total: totalAmount,
                paid: totalPaid,
                discount: totalDiscount,
                balance: totalAmount - totalPaid - totalDiscount,
            },
        };
    },

    /**
     * Soft deletes a payment and reverses fee updates.
     */
    async deletePayment(paymentId) {
        if (!paymentId) throw new Error('Payment ID is required');

        return window.schoolData('fees').firestore.runTransaction(async (transaction) => {
            // 1. Fetch the payment record
            const pRef = window.schoolDoc('feePayments', paymentId);
            const pSnap = await transaction.get(pRef);
            if (!pSnap.exists) throw new Error('Payment record not found');
            const payment = pSnap.data();

            if (payment.deleted) throw new Error('Payment is already deleted');

            // 2. Reverse allocations
            const allocations = payment.allocations || [];
            for (const alloc of allocations) {
                const fRef = window.schoolDoc('fees', alloc.feeId);
                const fSnap = await transaction.get(fRef);
                if (fSnap.exists) {
                    const fee = fSnap.data();
                    const newPaidAmount = Math.max(0, (fee.paidAmount || 0) - alloc.paidNow);
                    const newStatus =
                        newPaidAmount <= 0
                            ? 'pending'
                            : newPaidAmount < (fee.amount || 0) - (fee.discount || 0)
                              ? 'partial'
                              : 'paid';

                    transaction.update(fRef, {
                        paidAmount: newPaidAmount,
                        status: newStatus,
                        lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastDeletedPayment: paymentId,
                    });
                }
            }

            // 3. Mark payment as deleted
            transaction.update(pRef, {
                deleted: true,
                deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
                deletedBy: firebase.auth().currentUser?.email || 'admin',
            });

            // 4. Audit Log
            this.createAuditLog('payment_deleted', {
                paymentId: paymentId,
                receiptNo: payment.receiptNo,
                studentId: payment.studentId,
                amount: payment.amount,
                deletedBy: firebase.auth().currentUser?.email || 'admin',
            }).catch((e) => console.warn('Audit log failed:', e));

            return { success: true };
        });
    },

    /**
     * Records every payment/demand action to audit_logs
     */
    async createAuditLog(action, details) {
        try {
            await window.schoolData('audit_logs').add(
                window.withSchool({
                    action,
                    details,
                    performedBy: firebase.auth().currentUser?.email || 'admin',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                })
            );
        } catch (e) {
            console.warn('Audit log write failed:', e);
        }
    },

    /**
     * Fetches all data needed for a payment receipt
     */
    async generatePaymentReceiptData(paymentId) {
        // Fetch payment record
        const pSnap = await window.schoolDoc('feePayments', paymentId).get();
        if (!pSnap.exists) throw new Error('Payment record not found');
        const payment = pSnap.data();

        // Fetch student record
        const sSnap = await window.schoolData('students').where('studentId', '==', payment.studentId).limit(1).get();
        const student = sSnap.empty ? {} : sSnap.docs[0].data();

        // Fetch school branding
        const schSnap = await window.schoolRef().get();
        const school = schSnap.exists ? schSnap.data() : {};

        // Fetch related fee records for itemized breakdown
        const allocations = payment.allocations || [];

        // Fetch current balance
        const ledger = await this.getStudentLedger(payment.studentId);

        // Fetch audit trail for this payment
        let auditTrail = [];
        try {
            const auditSnap = await window
                .schoolData('audit_logs')
                .where('details.paymentId', '==', paymentId)
                .orderBy('timestamp', 'desc')
                .limit(5)
                .get();
            auditTrail = auditSnap.docs.map((d) => d.data());
        } catch (e) {
            // Audit logs collection may not exist yet
        }

        return {
            payment,
            student,
            school,
            allocations,
            currentBalance: ledger.summary.balance,
            auditTrail,
            paymentId,
        };
    },

    /**
     * Monthly collection report for a given session/month/year
     */
    async getMonthlyCollectionReport(session, month, year) {
        const paymentsSnap = await window.schoolData('feePayments').where('session', '==', session).get();

        let totalCollected = 0;
        let paymentCount = 0;
        const modeBreakdown = {};
        const studentSet = new Set();
        const studentList = [];

        paymentsSnap.docs.forEach((doc) => {
            const p = doc.data();
            const pDate = p.createdAt ? new Date(p.createdAt.seconds * 1000) : null;
            if (!pDate) return;

            const pMonth = pDate.toLocaleString('default', { month: 'long' });
            const pYear = pDate.getFullYear().toString();

            if (pMonth === month && pYear === year) {
                totalCollected += p.amount || 0;
                paymentCount++;
                const mode = p.paymentMode || 'Unknown';
                modeBreakdown[mode] = (modeBreakdown[mode] || 0) + (p.amount || 0);
                if (!studentSet.has(p.studentId)) {
                    studentSet.add(p.studentId);
                    studentList.push({
                        studentId: p.studentId,
                        amount: p.amount || 0,
                        receiptNo: p.receiptNo,
                        mode: p.paymentMode,
                        date: pDate.toLocaleDateString(),
                    });
                }
            }
        });

        return {
            session,
            month,
            year,
            totalCollected,
            paymentCount,
            modeBreakdown,
            studentList,
        };
    },

    /**
     * Get audit logs for a specific action type or all
     */
    async getAuditLogs(actionFilter, limit = 50) {
        let query = window.schoolData('audit_logs').orderBy('timestamp', 'desc');
        if (actionFilter) {
            query = query.where('action', '==', actionFilter);
        }
        const snap = await query.limit(limit).get();
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
};

window.PaymentService = PaymentService;
