/**
 * Student Service - Student Management, Enrollment, Guardians
 * Compatible with existing schoolData(), schoolDoc(), withSchool()
 */

const StudentService = {
    // ==================== STUDENT CRUD ====================

    async getStudents(filters = {}) {
        let query = schoolData('students').orderBy('name');

        if (filters.status) query = query.where('status', '==', filters.status);
        if (filters.class) query = query.where('class', '==', filters.class);
        if (filters.section) query = query.where('section', '==', filters.section);
        if (filters.session) query = query.where('session', '==', filters.session);

        const snapshot = await query.get();
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async getStudent(studentId) {
        const doc = await schoolDoc('students', studentId).get();
        if (!doc.exists) throw new Error('Student not found');
        return { id: doc.id, ...doc.data() };
    },

    async searchStudents(searchTerm, filters = {}) {
        const allStudents = await this.getStudents(filters);
        const term = searchTerm.toLowerCase();

        return allStudents.filter(
            (s) =>
                s.name?.toLowerCase().includes(term) ||
                s.student_id?.toLowerCase().includes(term) ||
                s.roll_no?.toString().includes(term) ||
                s.father_name?.toLowerCase().includes(term) ||
                s.phone?.includes(term) ||
                s.aadhar?.includes(term)
        );
    },

    async createStudent(data) {
        // Generate student number
        const studentNumber = await this.generateStudentNumber();

        const docRef = await schoolData('students').add(
            withSchool({
                student_id: studentNumber,
                admission_number: data.admissionNumber || '',
                name: data.name,
                first_name: data.firstName,
                last_name: data.lastName,
                class: data.class,
                classId: data.classId,
                section: data.section,
                sectionId: data.sectionId,
                session: data.session,
                sessionId: data.sessionId,
                roll_number: data.rollNumber || null,
                dob: data.dob,
                gender: data.gender,
                blood_group: data.bloodGroup || '',
                category: data.category || '',
                caste: data.caste || '',
                religion: data.religion || '',
                aadhar: data.aadhar || '',
                pen: data.pen || '',
                rfid: data.rfid || '',
                photo_url: data.photoUrl || '',
                father_name: data.fatherName || '',
                mother_name: data.motherName || '',
                phone: data.phone || '',
                email: data.email || '',
                address: data.address || '',
                city: data.city || '',
                state: data.state || '',
                pincode: data.pincode || '',
                guardian_name: data.guardianName || '',
                guardian_phone: data.guardianPhone || '',
                hostel: data.hostel || false,
                transport: data.transport || false,
                transport_route_id: data.transportRouteId || null,
                join_date: data.joinDate || new Date().toISOString().split('T')[0],
                status: 'ACTIVE',
                electives: data.electives || [],
                createdBy: auth.currentUser?.uid,
            })
        );

        // Create guardian records
        if (data.guardians && data.guardians.length > 0) {
            for (const guardian of data.guardians) {
                await this.addGuardian(docRef.id, guardian);
            }
        }

        return { id: docRef.id, studentNumber, status: 'CREATED' };
    },

    async updateStudent(studentId, data) {
        const updateData = {
            ...data,
            updatedBy: auth.currentUser?.uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        await schoolDoc('students', studentId).update(updateData);
        return { id: studentId, status: 'UPDATED' };
    },

    async deleteStudent(studentId) {
        // Soft delete - just mark as deleted
        await schoolDoc('students', studentId).update({
            status: 'DELETED',
            deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
            deletedBy: auth.currentUser?.uid,
        });
        return { id: studentId, status: 'DELETED' };
    },

    async generateStudentNumber() {
        const config = await schoolData('settings').doc('student_config').get();
        const data = config.exists ? config.data() : {};

        const lastNumber = data.last_student_number || 0;
        const newNumber = lastNumber + 1;
        const prefix = data.student_prefix || 'STU';
        const year = new Date().getFullYear();

        await schoolData('settings').doc('student_config').set(
            {
                last_student_number: newNumber,
                updated_at: firebase.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
        );

        return `${prefix}-${year}-${String(newNumber).padStart(4, '0')}`;
    },

    // ==================== GUARDIANS ====================

    async getGuardians(studentId) {
        const snapshot = await schoolData('guardians').where('studentId', '==', studentId).get();
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async addGuardian(studentId, data) {
        const docRef = await schoolData('guardians').add(
            withSchool({
                studentId: studentId,
                relationship: data.relationship || 'FATHER',
                first_name: data.firstName,
                last_name: data.lastName,
                phone: data.phone || '',
                phone_primary_encrypted: data.phoneEncrypted || '',
                email: data.email || '',
                occupation: data.occupation || '',
                is_emergency_contact: data.isEmergencyContact || false,
                can_pickup: data.canPickup !== false,
                createdBy: auth.currentUser?.uid,
            })
        );

        return { id: docRef.id, status: 'CREATED' };
    },

    async updateGuardian(guardianId, data) {
        await schoolDoc('guardians', guardianId).update({
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { id: guardianId, status: 'UPDATED' };
    },

    async deleteGuardian(guardianId) {
        await schoolDoc('guardians', guardianId).update({
            isDeleted: true,
            deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { id: guardianId, status: 'DELETED' };
    },

    // ==================== ENROLLMENT ====================

    async enrollStudent(studentId, enrollmentData) {
        const docRef = await schoolData('enrollments').add(
            withSchool({
                studentId: studentId,
                sessionId: enrollmentData.sessionId,
                classId: enrollmentData.classId,
                sectionId: enrollmentData.sectionId || null,
                rollNumber: enrollmentData.rollNumber,
                enrollmentDate: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'ENROLLED',
                createdBy: auth.currentUser?.uid,
            })
        );

        // Update student record
        await schoolDoc('students', studentId).update({
            sessionId: enrollmentData.sessionId,
            classId: enrollmentData.classId,
            sectionId: enrollmentData.sectionId || null,
            rollNumber: enrollmentData.rollNumber,
            status: 'ACTIVE',
        });

        return { id: docRef.id, status: 'ENROLLED' };
    },

    async transferStudent(studentId, newClassId, newSectionId, reason) {
        const student = await this.getStudent(studentId);

        // Create transfer record
        await schoolData('transfers').add(
            withSchool({
                studentId: studentId,
                fromClass: student.classId,
                toClass: newClassId,
                fromSection: student.sectionId,
                toSection: newSectionId,
                reason: reason,
                transferDate: firebase.firestore.FieldValue.serverTimestamp(),
                transferredBy: auth.currentUser?.uid,
            })
        );

        // Update student
        await schoolDoc('students', studentId).update({
            classId: newClassId,
            sectionId: newSectionId,
            transferHistory: firebase.firestore.FieldValue.arrayUnion({
                date: firebase.firestore.FieldValue.serverTimestamp(),
                fromClass: student.classId,
                toClass: newClassId,
            }),
        });

        return { id: studentId, status: 'TRANSFERRED' };
    },

    async promoteStudents(fromClassId, toClassId, toSectionId) {
        const students = await schoolData('students')
            .where('classId', '==', fromClassId)
            .where('status', '==', 'ACTIVE')
            .get();

        const batch = firebase.firestore().batch();
        let promoted = 0;

        for (const doc of students.docs) {
            batch.update(doc.ref, {
                classId: toClassId,
                sectionId: toSectionId,
                promotionDate: firebase.firestore.FieldValue.serverTimestamp(),
            });
            promoted++;
        }

        await batch.commit();
        return { promoted };
    },

    // ==================== BULK OPERATIONS ====================

    async bulkUpdateStudents(studentIds, updateData) {
        const batch = firebase.firestore().batch();

        for (const studentId of studentIds) {
            const ref = schoolDoc('students', studentId);
            batch.update(ref, {
                ...updateData,
                bulkUpdatedBy: auth.currentUser?.uid,
                bulkUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
        }

        await batch.commit();
        return { updated: studentIds.length };
    },

    async bulkImportStudents(studentsData, classId, sessionId) {
        const batch = firebase.firestore().batch();
        const results = { success: 0, failed: 0, errors: [] };

        for (let i = 0; i < studentsData.length; i++) {
            try {
                const studentNumber = await this.generateStudentNumber();
                const docRef = schoolData('students').doc();

                batch.set(
                    docRef,
                    withSchool({
                        ...studentsData[i],
                        student_id: studentNumber,
                        classId: classId,
                        sessionId: sessionId,
                        status: 'ACTIVE',
                        createdBy: auth.currentUser?.uid,
                        importedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    })
                );

                results.success++;
            } catch (e) {
                results.failed++;
                results.errors.push({ row: i + 1, error: e.message });
            }
        }

        await batch.commit();
        return results;
    },

    // ==================== REPORTS ====================

    async getClassStrength(classId) {
        const snapshot = await schoolData('students')
            .where('classId', '==', classId)
            .where('status', '==', 'ACTIVE')
            .get();

        const students = snapshot.docs.map((d) => d.data());

        // Count by section
        const bySection = {};
        students.forEach((s) => {
            const section = s.section || 'N/A';
            bySection[section] = (bySection[section] || 0) + 1;
        });

        return {
            total: students.length,
            bySection,
            gender: {
                male: students.filter((s) => s.gender === 'MALE').length,
                female: students.filter((s) => s.gender === 'FEMALE').length,
            },
        };
    },

    async getStudentHistory(studentId) {
        const student = await this.getStudent(studentId);

        // Get enrollments
        const enrollments = await schoolData('enrollments')
            .where('studentId', '==', studentId)
            .orderBy('enrollmentDate', 'desc')
            .get();

        // Get fees
        const invoices = await schoolData('invoices').where('student_id', '==', studentId).get();

        // Get payments
        const payments = await schoolData('payments')
            .where('student_id', '==', studentId)
            .orderBy('payment_date', 'desc')
            .get();

        // Get attendance
        const attendance = await schoolData('attendance').where('student_id', '==', studentId).get();

        return {
            student,
            enrollments: enrollments.docs.map((d) => d.data()),
            fees: {
                invoices: invoices.docs.map((d) => d.data()),
                totalInvoiced: invoices.docs.reduce((sum, d) => sum + (d.data().total_amount || 0), 0),
                totalPaid: payments.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0),
            },
            attendance: {
                total: attendance.size,
                present: attendance.docs.filter((d) => d.data().status === 'PRESENT').length,
            },
        };
    },
};

window.StudentService = StudentService;
