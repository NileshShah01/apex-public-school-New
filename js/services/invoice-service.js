/**
 * Invoice Service - Fee Invoice Generation & Management
 * Compatible with existing schoolData(), schoolDoc(), withSchool()
 */

const InvoiceService = {
    // Generate invoice number
    async generateInvoiceNumber() {
        const config = await schoolData('settings').doc('invoice_config').get();
        const data = config.exists ? config.data() : {};

        const lastNumber = data.last_invoice_number || 0;
        const newNumber = lastNumber + 1;
        const prefix = data.invoice_prefix || 'INV';
        const year = new Date().getFullYear();

        // Update counter
        await schoolData('settings').doc('invoice_config').set(
            {
                last_invoice_number: newNumber,
                updated_at: firebase.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
        );

        return `${prefix}-${year}-${String(newNumber).padStart(6, '0')}`;
    },

    // Generate monthly fees for a class
    async generateMonthlyFees(className, month, year, session) {
        const db = firebase.firestore();

        // Get students in the class
        const students = await schoolData('students')
            .where('class', '==', className)
            .where('status', '==', 'ACTIVE')
            .get();

        if (students.empty) {
            return { generated: 0, message: 'No active students in this class' };
        }

        // Get fee structures for the class
        const feeStructures = await schoolData('feeStructures')
            .where('class', '==', className)
            .where('session', '==', session)
            .where('is_active', '==', true)
            .get();

        if (feeStructures.empty) {
            return { generated: 0, message: 'No fee structures defined for this class' };
        }

        // Check if invoices already exist for this month/year/class
        const existingInvoices = await schoolData('invoices')
            .where('class', '==', className)
            .where('month', '==', month)
            .where('year', '==', year)
            .get();

        if (!existingInvoices.empty) {
            return { generated: 0, message: `Invoices already generated for ${month} ${year}` };
        }

        // Batch create invoices
        const batch = db.batch();
        let generated = 0;
        let skipped = 0;

        for (const studentDoc of students.docs) {
            const student = studentDoc.data();

            // Skip if student is inactive
            if (student.status !== 'ACTIVE') {
                skipped++;
                continue;
            }

            // Build line items from fee structures
            const lineItems = [];
            let totalAmount = 0;

            for (const fsDoc of feeStructures.docs) {
                const fs = fsDoc.data();
                lineItems.push({
                    fee_structure_id: fsDoc.id,
                    fee_type: fs.fee_type,
                    fee_type_id: fs.fee_type_id,
                    amount: fs.amount,
                    discount: 0,
                    penalty: 0,
                    net_amount: fs.amount,
                });
                totalAmount += fs.amount;
            }

            // Create invoice
            const invoiceNo = await this.generateInvoiceNumber();
            const invoiceRef = schoolData('invoices').doc();

            batch.set(
                invoiceRef,
                withSchool({
                    invoice_no: invoiceNo,
                    student_id: studentDoc.id,
                    student_name: student.name,
                    student_roll: student.roll_no,
                    class: className,
                    section: student.section || '',
                    session: session,
                    month: month,
                    year: year,
                    status: 'PENDING',
                    issue_date: firebase.firestore.FieldValue.serverTimestamp(),
                    due_date: this.calculateDueDate(year, month, 10),
                    line_items: lineItems,
                    total_amount: totalAmount,
                    amount_paid: 0,
                    discount_total: 0,
                    penalty_total: 0,
                    amount_due: totalAmount,
                    created_by: auth.currentUser?.uid,
                    created_at: firebase.firestore.FieldValue.serverTimestamp(),
                })
            );

            generated++;
        }

        await batch.commit();

        return {
            generated,
            skipped,
            message: `Generated ${generated} invoices, skipped ${skipped} inactive students`,
        };
    },

    // Calculate due date based on month/year
    calculateDueDate(year, month, dueDay) {
        const monthMap = {
            January: 0,
            February: 1,
            March: 2,
            April: 3,
            May: 4,
            June: 5,
            July: 6,
            August: 7,
            September: 8,
            October: 9,
            November: 10,
            December: 11,
        };

        const monthIndex = monthMap[month];
        const dueDate = new Date(year, monthIndex, dueDay);

        return firebase.firestore.Timestamp.fromDate(dueDate);
    },

    // Generate invoice for single student
    async generateStudentInvoice(studentId, month, year, session) {
        const studentDoc = await schoolDoc('students', studentId).get();

        if (!studentDoc.exists) {
            throw new Error('Student not found');
        }

        const student = studentDoc.data();

        // Get fee structures
        const feeStructures = await schoolData('feeStructures')
            .where('class', '==', student.class)
            .where('session', '==', session)
            .where('is_active', '==', true)
            .get();

        // Build line items
        const lineItems = [];
        let totalAmount = 0;

        for (const fsDoc of feeStructures.docs) {
            const fs = fsDoc.data();
            lineItems.push({
                fee_structure_id: fsDoc.id,
                fee_type: fs.fee_type,
                amount: fs.amount,
                discount: 0,
                penalty: 0,
                net_amount: fs.amount,
            });
            totalAmount += fs.amount;
        }

        const invoiceNo = await this.generateInvoiceNumber();

        const docRef = await schoolData('invoices').add(
            withSchool({
                invoice_no: invoiceNo,
                student_id: studentId,
                student_name: student.name,
                student_roll: student.roll_no,
                class: student.class,
                section: student.section || '',
                session: session,
                month: month,
                year: year,
                status: 'PENDING',
                issue_date: firebase.firestore.FieldValue.serverTimestamp(),
                due_date: this.calculateDueDate(year, month, 10),
                line_items: lineItems,
                total_amount: totalAmount,
                amount_paid: 0,
                amount_due: totalAmount,
                created_by: auth.currentUser?.uid,
            })
        );

        return { id: docRef.id, invoiceNo };
    },

    // Get invoices for a student
    async getStudentInvoices(studentId) {
        const snapshot = await schoolData('invoices')
            .where('student_id', '==', studentId)
            .orderBy('created_at', 'desc')
            .get();

        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    // Get invoice details
    async getInvoice(invoiceId) {
        const doc = await schoolDoc('invoices', invoiceId).get();

        if (!doc.exists) {
            throw new Error('Invoice not found');
        }

        return { id: doc.id, ...doc.data() };
    },

    // Get invoices by class with filters
    async getClassInvoices(className, filters = {}) {
        let query = schoolData('invoices').where('class', '==', className);

        if (filters.month) query = query.where('month', '==', filters.month);
        if (filters.year) query = query.where('year', '==', parseInt(filters.year));
        if (filters.status) query = query.where('status', '==', filters.status);

        const snapshot = await query.orderBy('created_at', 'desc').get();
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    // Get all pending invoices (dues)
    async getPendingInvoices(filters = {}) {
        let query = schoolData('invoices').where('status', 'in', ['PENDING', 'PARTIAL', 'OVERDUE']);

        if (filters.class) query = query.where('class', '==', filters.class);
        if (filters.session) query = query.where('session', '==', filters.session);

        const snapshot = await query.orderBy('due_date').get();
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    // Apply discount to invoice
    async applyDiscount(invoiceId, discountAmount, reason) {
        const invoiceDoc = await schoolDoc('invoices', invoiceId).get();

        if (!invoiceDoc.exists) {
            throw new Error('Invoice not found');
        }

        const invoice = invoiceDoc.data();
        const newDiscountTotal = (invoice.discount_total || 0) + discountAmount;
        const newAmountDue = invoice.total_amount - newDiscountTotal - (invoice.penalty_total || 0);

        await schoolDoc('invoices', invoiceId).update({
            discount_total: newDiscountTotal,
            amount_due: newAmountDue,
            discount_reason: reason,
            updated_by: auth.currentUser?.uid,
            updated_at: firebase.firestore.FieldValue.serverTimestamp(),
        });

        return { id: invoiceId, status: 'DISCOUNT_APPLIED' };
    },

    // Apply penalty (late fee)
    async applyPenalty(invoiceId, penaltyAmount, reason) {
        const invoiceDoc = await schoolDoc('invoices', invoiceId).get();

        if (!invoiceDoc.exists) {
            throw new Error('Invoice not found');
        }

        const invoice = invoiceDoc.data();
        const newPenaltyTotal = (invoice.penalty_total || 0) + penaltyAmount;
        const newAmountDue = invoice.total_amount - (invoice.discount_total || 0) - newPenaltyTotal;

        await schoolDoc('invoices', invoiceId).update({
            penalty_total: newPenaltyTotal,
            amount_due: newAmountDue,
            penalty_reason: reason,
            updated_by: auth.currentUser?.uid,
            updated_at: firebase.firestore.FieldValue.serverTimestamp(),
        });

        return { id: invoiceId, status: 'PENALTY_APPLIED' };
    },

    // Waive entire invoice
    async waiveInvoice(invoiceId, reason) {
        await schoolDoc('invoices', invoiceId).update({
            status: 'WAIVED',
            waiver_reason: reason,
            waived_by: auth.currentUser?.uid,
            waived_at: firebase.firestore.FieldValue.serverTimestamp(),
        });

        return { id: invoiceId, status: 'WAIVED' };
    },

    // Update invoice status based on payments
    async updateInvoiceStatus(invoiceId) {
        const invoiceDoc = await schoolDoc('invoices', invoiceId).get();

        if (!invoiceDoc.exists) return;

        const invoice = invoiceDoc.data();
        const { total_amount, amount_paid, discount_total, penalty_total } = invoice;

        const amountDue = total_amount - (discount_total || 0) - (penalty_total || 0);
        let newStatus = invoice.status;

        if (amount_paid >= amountDue) {
            newStatus = 'PAID';
        } else if (amount_paid > 0) {
            newStatus = 'PARTIAL';
        } else {
            // Check if overdue
            if (invoice.due_date && new Date(invoice.due_date.toDate()) < new Date()) {
                newStatus = 'OVERDUE';
            } else {
                newStatus = 'PENDING';
            }
        }

        if (newStatus !== invoice.status) {
            await schoolDoc('invoices', invoiceId).update({
                status: newStatus,
                updated_at: firebase.firestore.FieldValue.serverTimestamp(),
            });
        }

        return { id: invoiceId, status: newStatus };
    },
};

// Make available globally
window.InvoiceService = InvoiceService;
