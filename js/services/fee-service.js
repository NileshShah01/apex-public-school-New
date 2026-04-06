/**
 * Fee Service - Enhanced CRUD Operations
 * Compatible with existing schoolData(), schoolDoc(), withSchool()
 */

const FeeService = {
    // Fee Types (categories like Tuition, Transport, Exam, etc.)
    async getFeeTypes() {
        const snapshot = await schoolData('feeTypes').orderBy('name').get();
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async createFeeType(data) {
        const docRef = await schoolData('feeTypes').add(
            withSchool({
                name: data.name,
                description: data.description || '',
                category: data.category || 'ACADEMIC',
                is_taxable: data.isTaxable || false,
                is_active: true,
                created_by: auth.currentUser?.uid,
            })
        );
        return { id: docRef.id, status: 'CREATED' };
    },

    async updateFeeType(feeTypeId, data) {
        await schoolDoc('feeTypes', feeTypeId).update({
            ...data,
            updated_by: auth.currentUser?.uid,
            updated_at: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { id: feeTypeId, status: 'UPDATED' };
    },

    async deleteFeeType(feeTypeId) {
        await schoolDoc('feeTypes', feeTypeId).update({ is_active: false });
        return { id: feeTypeId, status: 'DELETED' };
    },

    // Fee Structures (amounts per class)
    async getFeeStructures(filters = {}) {
        let query = schoolData('feeStructures').where('is_active', '==', true);

        if (filters.class) query = query.where('class', '==', filters.class);
        if (filters.session) query = query.where('session', '==', filters.session);
        if (filters.feeTypeId) query = query.where('fee_type_id', '==', filters.feeTypeId);

        const snapshot = await query.orderBy('created_at', 'desc').get();
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async createFeeStructure(data) {
        // Check if structure already exists for this class/feeType/session
        const existing = await schoolData('feeStructures')
            .where('class', '==', data.class)
            .where('fee_type_id', '==', data.feeTypeId)
            .where('session', '==', data.session)
            .where('is_active', '==', true)
            .get();

        if (!existing.empty) {
            throw new Error('Fee structure already exists for this class. Update it instead.');
        }

        const docRef = await schoolData('feeStructures').add(
            withSchool({
                fee_type: data.feeType,
                fee_type_id: data.feeTypeId,
                class: data.class,
                session: data.session,
                amount: parseFloat(data.amount),
                frequency: data.frequency || 'Monthly',
                due_date_day: data.dueDateDay || 10,
                late_fee_applicable: data.lateFeeApplicable || false,
                late_fee_type: data.lateFeeType || 'FIXED',
                late_fee_amount: data.lateFeeAmount || 0,
                grace_days: data.graceDays || 5,
                is_mandatory: data.isMandatory !== false,
                is_active: true,
                created_by: auth.currentUser?.uid,
            })
        );

        return { id: docRef.id, status: 'CREATED' };
    },

    async updateFeeStructure(feeStructureId, data) {
        const updateData = {
            ...data,
            updated_by: auth.currentUser?.uid,
            updated_at: firebase.firestore.FieldValue.serverTimestamp(),
        };

        await schoolDoc('feeStructures', feeStructureId).update(updateData);
        return { id: feeStructureId, status: 'UPDATED' };
    },

    async deleteFeeStructure(feeStructureId) {
        await schoolDoc('feeStructures', feeStructureId).update({
            is_active: false,
            deleted_at: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { id: feeStructureId, status: 'DELETED' };
    },

    // Get all fees for a specific class
    async getClassFees(className, session) {
        const snapshot = await schoolData('feeStructures')
            .where('class', '==', className)
            .where('session', '==', session)
            .where('is_active', '==', true)
            .get();

        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    // Get fee summary for student
    async getStudentFeeSummary(studentId) {
        const invoices = await schoolData('invoices').where('student_id', '==', studentId).get();

        let totalAmount = 0;
        let totalPaid = 0;
        let totalPending = 0;
        let totalOverdue = 0;

        const invoiceList = invoices.docs.map((d) => {
            const data = d.data();
            const pending = data.total_amount - (data.amount_paid || 0);

            totalAmount += data.total_amount || 0;
            totalPaid += data.amount_paid || 0;
            totalPending += pending;

            if (data.status === 'OVERDUE') {
                totalOverdue += pending;
            }

            return {
                id: d.id,
                invoice_no: data.invoice_no,
                month: data.month,
                year: data.year,
                total: data.total_amount,
                paid: data.amount_paid || 0,
                pending: pending,
                status: data.status,
            };
        });

        return {
            studentId,
            invoices: invoiceList,
            summary: {
                totalAmount,
                totalPaid,
                totalPending,
                totalOverdue,
            },
        };
    },
};

// Make available globally
window.FeeService = FeeService;
