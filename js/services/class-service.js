/**
 * Class Service - Session, Class, Section, Subject Management
 * Compatible with existing schoolData(), schoolDoc(), withSchool()
 */

const ClassService = {
    // ==================== SESSIONS ====================

    async getSessions() {
        const snapshot = await schoolData('sessions').orderBy('startDate', 'desc').get();
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async getActiveSession() {
        const snapshot = await schoolData('sessions').where('isActive', '==', true).limit(1).get();
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    },

    async createSession(data) {
        // If this session is active, deactivate others
        if (data.isActive) {
            await this.deactivateAllSessions();
        }

        const docRef = await schoolData('sessions').add(
            withSchool({
                name: data.name,
                startDate: data.startDate,
                endDate: data.endDate,
                isActive: data.isActive || false,
                isEnrollmentOpen: data.isEnrollmentOpen || false,
                registrationDeadline: data.registrationDeadline || null,
                createdBy: auth.currentUser?.uid,
            })
        );

        return { id: docRef.id, status: 'CREATED' };
    },

    async updateSession(sessionId, data) {
        // If activating, deactivate others
        if (data.isActive) {
            await this.deactivateAllSessions();
        }

        await schoolDoc('sessions', sessionId).update({
            ...data,
            updatedBy: auth.currentUser?.uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        return { id: sessionId, status: 'UPDATED' };
    },

    async activateSession(sessionId) {
        await this.deactivateAllSessions();
        await schoolDoc('sessions', sessionId).update({
            isActive: true,
            activatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { id: sessionId, status: 'ACTIVATED' };
    },

    async deactivateAllSessions() {
        const sessions = await schoolData('sessions').where('isActive', '==', true).get();
        const batch = firebase.firestore().batch();
        sessions.docs.forEach((doc) => {
            batch.update(doc.ref, { isActive: false });
        });
        await batch.commit();
    },

    async deleteSession(sessionId) {
        // Check if has classes
        const classes = await schoolData('classes').where('sessionId', '==', sessionId).get();
        if (!classes.empty) {
            throw new Error('Cannot delete session with existing classes');
        }

        await schoolDoc('sessions', sessionId).update({
            isDeleted: true,
            deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { id: sessionId, status: 'DELETED' };
    },

    // ==================== CLASSES ====================

    async getClasses(sessionId) {
        let query = schoolData('classes').orderBy('sortOrder', 'asc');
        if (sessionId) query = query.where('sessionId', '==', sessionId);

        const snapshot = await query.get();
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async getClass(classId) {
        const doc = await schoolDoc('classes', classId).get();
        if (!doc.exists) throw new Error('Class not found');
        return { id: doc.id, ...doc.data() };
    },

    async createClass(data) {
        // Check for duplicate
        const existing = await schoolData('classes')
            .where('sessionId', '==', data.sessionId)
            .where('name', '==', data.name)
            .get();

        if (!existing.empty) {
            throw new Error('Class already exists in this session');
        }

        const docRef = await schoolData('classes').add(
            withSchool({
                name: data.name,
                numericEquivalent: data.numericEquivalent || this.extractNumeric(data.name),
                sortOrder: data.sortOrder || data.numericEquivalent || 0,
                sessionId: data.sessionId,
                capacity: data.capacity || 40,
                sections: [],
                disabled: false,
                createdBy: auth.currentUser?.uid,
            })
        );

        return { id: docRef.id, status: 'CREATED' };
    },

    async updateClass(classId, data) {
        await schoolDoc('classes', classId).update({
            ...data,
            updatedBy: auth.currentUser?.uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { id: classId, status: 'UPDATED' };
    },

    async deleteClass(classId) {
        // Check for students
        const students = await schoolData('students').where('classId', '==', classId).get();
        if (!students.empty) {
            throw new Error('Cannot delete class with enrolled students');
        }

        await schoolDoc('classes', classId).update({
            disabled: true,
            deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { id: classId, status: 'DELETED' };
    },

    extractNumeric(className) {
        const match = className.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
    },

    // ==================== SECTIONS ====================

    async getSections(classId) {
        const snapshot = await schoolData('sections').where('classId', '==', classId).orderBy('name').get();
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async createSection(classId, data) {
        // Check for duplicate within class
        const existing = await schoolData('sections')
            .where('classId', '==', classId)
            .where('name', '==', data.name)
            .get();

        if (!existing.empty) {
            throw new Error('Section already exists in this class');
        }

        const docRef = await schoolData('sections').add(
            withSchool({
                classId: classId,
                name: data.name,
                roomNumber: data.roomNumber || '',
                capacity: data.capacity || 40,
                instructorId: data.instructorId || null,
                createdBy: auth.currentUser?.uid,
            })
        );

        // Update class sections array
        const classDoc = await schoolDoc('classes', classId).get();
        const classData = classDoc.data();
        const sections = classData.sections || [];
        sections.push(docRef.id);
        await schoolDoc('classes', classId).update({ sections });

        return { id: docRef.id, status: 'CREATED' };
    },

    async updateSection(sectionId, data) {
        await schoolDoc('sections', sectionId).update({
            ...data,
            updatedBy: auth.currentUser?.uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { id: sectionId, status: 'UPDATED' };
    },

    async deleteSection(classId, sectionId) {
        // Check for students in section
        const students = await schoolData('students')
            .where('classId', '==', classId)
            .where('sectionId', '==', sectionId)
            .get();

        if (!students.empty) {
            throw new Error('Cannot delete section with enrolled students');
        }

        // Update class sections array
        const classDoc = await schoolDoc('classes', classId).get();
        const classData = classDoc.data();
        const sections = (classData.sections || []).filter((id) => id !== sectionId);
        await schoolDoc('classes', classId).update({ sections });

        await schoolDoc('sections', sectionId).update({
            isDeleted: true,
            deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        return { id: sectionId, status: 'DELETED' };
    },

    // ==================== SUBJECTS ====================

    async getSubjects(sessionId) {
        let query = schoolData('subjects').orderBy('name');
        if (sessionId) query = query.where('sessionId', '==', sessionId);

        const snapshot = await query.get();
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async getSubjectsByClass(classId, sessionId) {
        const snapshot = await schoolData('subjects').where('sessionId', '==', sessionId).get();

        return snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((s) => s.applicableClasses?.includes(classId) || true);
    },

    async createSubject(data) {
        const docRef = await schoolData('subjects').add(
            withSchool({
                name: data.name,
                code: data.code || '',
                type: data.type || 'CORE', // CORE, ELECTIVE, CO_SCHOLASTIC
                sessionId: data.sessionId,
                applicableClasses: data.applicableClasses || [],
                isActive: true,
                createdBy: auth.currentUser?.uid,
            })
        );

        return { id: docRef.id, status: 'CREATED' };
    },

    async updateSubject(subjectId, data) {
        await schoolDoc('subjects', subjectId).update({
            ...data,
            updatedBy: auth.currentUser?.uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { id: subjectId, status: 'UPDATED' };
    },

    async deleteSubject(subjectId) {
        await schoolDoc('subjects', subjectId).update({
            isActive: false,
            deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { id: subjectId, status: 'DELETED' };
    },

    // ==================== INSTRUCTORS ====================

    async getInstructors() {
        const snapshot = await schoolData('instructors').where('isActive', '==', true).orderBy('displayName').get();
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async getInstructor(instructorId) {
        const doc = await schoolDoc('instructors', instructorId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    },

    // ==================== SCHEDULES ====================

    async getSchedules(classId, sectionId, dayOfWeek) {
        let query = schoolData('schedules').where('classId', '==', classId);
        if (sectionId) query = query.where('sectionId', '==', sectionId);
        if (dayOfWeek) query = query.where('dayOfWeek', '==', dayOfWeek);

        const snapshot = await query.orderBy('periodNumber').get();
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async createSchedule(data) {
        const docRef = await schoolData('schedules').add(
            withSchool({
                classId: data.classId,
                sectionId: data.sectionId || null,
                dayOfWeek: data.dayOfWeek,
                periodNumber: data.periodNumber,
                subjectId: data.subjectId,
                instructorId: data.instructorId,
                startTime: data.startTime,
                endTime: data.endTime,
                roomNumber: data.roomNumber || '',
                createdBy: auth.currentUser?.uid,
            })
        );

        return { id: docRef.id, status: 'CREATED' };
    },

    async updateSchedule(scheduleId, data) {
        await schoolDoc('schedules', scheduleId).update({
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { id: scheduleId, status: 'UPDATED' };
    },

    async deleteSchedule(scheduleId) {
        await schoolDoc('schedules', scheduleId).delete();
        return { id: scheduleId, status: 'DELETED' };
    },

    // ==================== BULK OPERATIONS ====================

    async createBulkClasses(sessionId, classNames) {
        const batch = firebase.firestore().batch();
        const created = [];

        for (let i = 0; i < classNames.length; i++) {
            const name = classNames[i];
            const docRef = schoolData('classes').doc();
            batch.set(
                docRef,
                withSchool({
                    name: name,
                    numericEquivalent: i + 1,
                    sortOrder: i + 1,
                    sessionId: sessionId,
                    capacity: 40,
                    sections: [],
                    disabled: false,
                    createdBy: auth.currentUser?.uid,
                })
            );
            created.push({ name, id: docRef.id });
        }

        await batch.commit();
        return { created: created.length, classes: created };
    },

    async createBulkSections(classId, sectionNames) {
        const batch = firebase.firestore().batch();
        const classRef = schoolDoc('classes', classId);
        const classDoc = await classRef.get();
        const classData = classDoc.data();
        const existingSections = classData.sections || [];
        const created = [];

        for (const name of sectionNames) {
            const docRef = schoolData('sections').doc();
            batch.set(
                docRef,
                withSchool({
                    classId: classId,
                    name: name,
                    capacity: 40,
                    createdBy: auth.currentUser?.uid,
                })
            );
            existingSections.push(docRef.id);
            created.push({ name, id: docRef.id });
        }

        batch.update(classRef, { sections: existingSections });
        await batch.commit();

        return { created: created.length, sections: created };
    },
};

window.ClassService = ClassService;
