/**
 * Exam Service - Examination & Result Management
 * Compatible with existing schoolData(), schoolDoc(), withSchool()
 */

const ExamService = {
    // ==================== EXAMS ====================

    async getExams(sessionId) {
        let query = schoolData('exams').orderBy('examDate', 'desc');
        if (sessionId) query = query.where('sessionId', '==', sessionId);

        const snapshot = await query.get();
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async getExam(examId) {
        const doc = await schoolDoc('exams', examId).get();
        if (!doc.exists) throw new Error('Exam not found');
        return { id: doc.id, ...doc.data() };
    },

    async createExam(data) {
        const docRef = await schoolData('exams').add(
            withSchool({
                name: data.name,
                type: data.type || 'PERIODIC', // PERIODIC, TERMINAL, ANNUAL
                sessionId: data.sessionId,
                classId: data.classId,
                subjects: data.subjects || [],
                examDate: data.examDate,
                startTime: data.startTime,
                endTime: data.endTime,
                totalMarks: data.totalMarks || 100,
                passingMarks: data.passingMarks || 33,
                instructions: data.instructions || '',
                status: 'SCHEDULED',
                createdBy: auth.currentUser?.uid,
            })
        );

        return { id: docRef.id, status: 'CREATED' };
    },

    async updateExam(examId, data) {
        await schoolDoc('exams', examId).update({
            ...data,
            updatedBy: auth.currentUser?.uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { id: examId, status: 'UPDATED' };
    },

    async deleteExam(examId) {
        await schoolDoc('exams', examId).update({
            isDeleted: true,
            deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { id: examId, status: 'DELETED' };
    },

    // ==================== EXAM SCHEDULE ====================

    async getExamSchedule(classId, sessionId) {
        let query = schoolData('examSchedules')
            .where('classId', '==', classId)
            .where('sessionId', '==', sessionId)
            .orderBy('examDate');

        const snapshot = await query.get();
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async createExamSchedule(data) {
        const docRef = await schoolData('examSchedules').add(
            withSchool({
                examId: data.examId,
                classId: data.classId,
                sessionId: data.sessionId,
                subjectId: data.subjectId,
                subjectName: data.subjectName,
                examDate: data.examDate,
                startTime: data.startTime,
                endTime: data.endTime,
                roomNumber: data.roomNumber || '',
                createdBy: auth.currentUser?.uid,
            })
        );

        return { id: docRef.id, status: 'CREATED' };
    },

    async bulkCreateSchedule(examId, scheduleData) {
        const batch = firebase.firestore().batch();
        const created = [];

        for (const schedule of scheduleData) {
            const docRef = schoolData('examSchedules').doc();
            batch.set(
                docRef,
                withSchool({
                    examId,
                    ...schedule,
                    createdBy: auth.currentUser?.uid,
                })
            );
            created.push(docRef.id);
        }

        await batch.commit();
        return { created: created.length };
    },

    // ==================== MARKS ====================

    async getMarks(examId, classId, subjectId) {
        const snapshot = await schoolData('marks')
            .where('examId', '==', examId)
            .where('classId', '==', classId)
            .where('subjectId', '==', subjectId)
            .get();

        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async getStudentMarks(studentId, sessionId) {
        const snapshot = await schoolData('marks')
            .where('studentId', '==', studentId)
            .where('sessionId', '==', sessionId)
            .get();

        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async submitMarks(examId, classId, subjectId, marksData) {
        const batch = firebase.firestore().batch();
        const results = { success: 0, failed: 0 };

        for (const mark of marksData) {
            try {
                const docRef = schoolData('marks').doc();
                batch.set(
                    docRef,
                    withSchool({
                        examId,
                        classId,
                        subjectId,
                        studentId: mark.studentId,
                        marks: parseFloat(mark.marks),
                        maxMarks: mark.maxMarks || 100,
                        isAbsent: mark.isAbsent || false,
                        isExempt: mark.isExempt || false,
                        remarks: mark.remarks || '',
                        submittedBy: auth.currentUser?.uid,
                        submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    })
                );
                results.success++;
            } catch (e) {
                results.failed++;
            }
        }

        await batch.commit();
        return results;
    },

    async updateMark(markId, data) {
        await schoolDoc('marks', markId).update({
            ...data,
            updatedBy: auth.currentUser?.uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { id: markId, status: 'UPDATED' };
    },

    // ==================== GRADING RULES ====================

    async getGradingRules(sessionId) {
        const snapshot = await schoolData('gradingRules').where('sessionId', '==', sessionId).limit(1).get();

        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    },

    async saveGradingRules(sessionId, rules) {
        // Check if exists
        const existing = await schoolData('gradingRules').where('sessionId', '==', sessionId).limit(1).get();

        if (existing.empty) {
            await schoolData('gradingRules').add(
                withSchool({
                    sessionId,
                    rules: rules,
                    createdBy: auth.currentUser?.uid,
                })
            );
        } else {
            await schoolDoc('gradingRules', existing.docs[0].id).update({
                rules: rules,
                updatedBy: auth.currentUser?.uid,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
        }

        return { status: 'SAVED' };
    },

    // ==================== RESULTS ====================

    async calculateResult(studentId, examId, sessionId) {
        const exam = await this.getExam(examId);
        const marks = await this.getMarks(examId, exam.classId, null);
        const gradingRules = await this.getGradingRules(sessionId);

        const studentMarks = marks.filter((m) => m.studentId === studentId);

        let totalMarks = 0;
        let totalMaxMarks = 0;
        let subjectsPassed = 0;
        let totalSubjects = studentMarks.length;

        for (const mark of studentMarks) {
            if (mark.isAbsent || mark.isExempt) continue;

            totalMarks += mark.marks;
            totalMaxMarks += mark.maxMarks;

            // Check passing
            const passingPercent = (exam.passingMarks / exam.totalMarks) * 100;
            const markPercent = (mark.marks / mark.maxMarks) * 100;

            if (markPercent >= passingPercent) {
                subjectsPassed++;
            }
        }

        const percentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;
        const grade = this.calculateGrade(percentage, gradingRules);

        return {
            studentId,
            examId,
            totalMarks,
            totalMaxMarks,
            percentage: percentage.toFixed(2),
            subjectsPassed,
            totalSubjects,
            grade,
            result: subjectsPassed >= totalSubjects ? 'PASS' : 'FAIL',
        };
    },

    calculateGrade(percentage, gradingRules) {
        if (!gradingRules || !gradingRules.rules) {
            // Default grading
            if (percentage >= 90) return 'A+';
            if (percentage >= 80) return 'A';
            if (percentage >= 70) return 'B+';
            if (percentage >= 60) return 'B';
            if (percentage >= 50) return 'C';
            if (percentage >= 40) return 'D';
            return 'F';
        }

        // Custom grading
        for (const rule of gradingRules.rules) {
            if (percentage >= rule.minPercent) {
                return rule.grade;
            }
        }

        return 'F';
    },

    async publishResults(examId, students) {
        const batch = firebase.firestore().batch();

        for (const studentId of students) {
            const resultRef = schoolData('results').doc();
            const result = await this.calculateResult(studentId, examId, (await this.getExam(examId)).sessionId);

            batch.set(
                resultRef,
                withSchool({
                    ...result,
                    published: true,
                    publishedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    publishedBy: auth.currentUser?.uid,
                })
            );
        }

        await batch.commit();
        return { published: students.length };
    },

    // ==================== REPORT CARDS ====================

    async generateReportCard(studentId, sessionId) {
        // Get student info
        const student = await schoolDoc('students', studentId).get();
        const studentData = student.data();

        // Get all exams in session
        const exams = await schoolData('exams').where('sessionId', '==', sessionId).get();

        // Get all marks for student
        const allMarks = await schoolData('marks').where('studentId', '==', studentId).get();

        // Get results
        const results = await schoolData('results').where('studentId', '==', studentId).get();

        // Get grading rules
        const gradingRules = await this.getGradingRules(sessionId);

        // Calculate overall performance
        let totalMarks = 0;
        let totalMaxMarks = 0;

        allMarks.docs.forEach((d) => {
            const m = d.data();
            if (!m.isAbsent && !m.isExempt) {
                totalMarks += m.marks;
                totalMaxMarks += m.maxMarks;
            }
        });

        const overallPercentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;
        const overallGrade = this.calculateGrade(overallPercentage, gradingRules);

        return {
            student: {
                id: studentId,
                name: studentData.name,
                class: studentData.class,
                section: studentData.section,
                rollNo: studentData.roll_no,
            },
            sessionId,
            exams: exams.docs.map((d) => ({ id: d.id, ...d.data() })),
            marks: allMarks.docs.map((d) => ({ id: d.id, ...d.data() })),
            results: results.docs.map((d) => ({ id: d.id, ...d.data() })),
            summary: {
                totalMarks,
                totalMaxMarks,
                percentage: overallPercentage.toFixed(2),
                grade: overallGrade,
            },
        };
    },

    // ==================== ATTENDANCE ====================

    async markExamAttendance(examId, attendanceData) {
        const batch = firebase.firestore().batch();

        for (const att of attendanceData) {
            const docRef = schoolData('examAttendance').doc();
            batch.set(
                docRef,
                withSchool({
                    examId,
                    studentId: att.studentId,
                    status: att.status, // PRESENT, ABSENT, LATE
                    markedBy: auth.currentUser?.uid,
                    markedAt: firebase.firestore.FieldValue.serverTimestamp(),
                })
            );
        }

        await batch.commit();
        return { marked: attendanceData.length };
    },
};

window.ExamService = ExamService;
