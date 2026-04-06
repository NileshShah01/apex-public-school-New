/**
 * Attendance Service - Daily & Exam Attendance Management
 * Compatible with existing schoolData(), schoolDoc(), withSchool()
 */

const AttendanceService = {
    // ==================== DAILY ATTENDANCE ====================

    async getAttendance(classId, date) {
        const snapshot = await schoolData('attendance').where('classId', '==', classId).where('date', '==', date).get();

        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async getStudentAttendance(studentId, startDate, endDate) {
        const snapshot = await schoolData('attendance')
            .where('studentId', '==', studentId)
            .where('date', '>=', startDate)
            .where('date', '<=', endDate)
            .orderBy('date')
            .get();

        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async markAttendance(classId, date, attendanceData) {
        const batch = firebase.firestore().batch();
        const results = { marked: 0, failed: 0 };

        // Delete existing attendance for this class/date
        const existing = await schoolData('attendance').where('classId', '==', classId).where('date', '==', date).get();

        existing.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        // Add new attendance records
        for (const att of attendanceData) {
            try {
                const docRef = schoolData('attendance').doc();
                batch.set(
                    docRef,
                    withSchool({
                        classId,
                        sectionId: att.sectionId || null,
                        date: date,
                        studentId: att.studentId,
                        status: att.status, // PRESENT, ABSENT, LEAVE, LATE
                        remarks: att.remarks || '',
                        markedBy: auth.currentUser?.uid,
                        markedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    })
                );
                results.marked++;
            } catch (e) {
                results.failed++;
            }
        }

        await batch.commit();
        return results;
    },

    // Quick mark all present
    async markAllPresent(classId, date, studentIds) {
        const batch = firebase.firestore().batch();

        // Delete existing
        const existing = await schoolData('attendance').where('classId', '==', classId).where('date', '==', date).get();

        existing.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        // Mark all present
        for (const studentId of studentIds) {
            const docRef = schoolData('attendance').doc();
            batch.set(
                docRef,
                withSchool({
                    classId,
                    date: date,
                    studentId: studentId,
                    status: 'PRESENT',
                    markedBy: auth.currentUser?.uid,
                    markedAt: firebase.firestore.FieldValue.serverTimestamp(),
                })
            );
        }

        await batch.commit();
        return { marked: studentIds.length };
    },

    // ==================== MONTHLY ATTENDANCE ====================

    async getMonthlyAttendance(classId, month, year) {
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        const students = await StudentService.getStudents({ class: classId, status: 'ACTIVE' });
        const attendance = await schoolData('attendance')
            .where('classId', '==', classId)
            .where('date', '>=', startDate)
            .where('date', '<=', endDate)
            .get();

        // Organize by student
        const studentAttendance = {};
        students.forEach((s) => {
            studentAttendance[s.id] = {
                student: s,
                days: {},
                summary: { present: 0, absent: 0, leave: 0, late: 0 },
            };
        });

        attendance.docs.forEach((d) => {
            const att = d.data();
            if (studentAttendance[att.studentId]) {
                const day = att.date.split('-')[2];
                studentAttendance[att.studentId].days[day] = att.status;
                studentAttendance[att.studentId].summary[att.status.toLowerCase()]++;
            }
        });

        return Object.values(studentAttendance);
    },

    // ==================== ATTENDANCE REPORTS ====================

    async getClassAttendanceReport(classId, startDate, endDate) {
        const snapshot = await schoolData('attendance')
            .where('classId', '==', classId)
            .where('date', '>=', startDate)
            .where('date', '<=', endDate)
            .get();

        const attendanceByDate = {};
        let totalPresent = 0,
            totalAbsent = 0,
            totalLeave = 0;

        snapshot.docs.forEach((d) => {
            const att = d.data();
            if (!attendanceByDate[att.date]) {
                attendanceByDate[att.date] = { present: 0, absent: 0, leave: 0 };
            }

            attendanceByDate[att.date][att.status.toLowerCase()]++;

            if (att.status === 'PRESENT') totalPresent++;
            else if (att.status === 'ABSENT') totalAbsent++;
            else if (att.status === 'LEAVE') totalLeave++;
        });

        const totalDays = Object.keys(attendanceByDate).length;
        const students = await StudentService.getStudents({ class: classId, status: 'ACTIVE' });
        const totalStudents = students.length;

        return {
            classId,
            startDate,
            endDate,
            totalDays,
            totalStudents,
            totalPresent,
            totalAbsent,
            totalLeave,
            attendancePercentage:
                totalStudents > 0 ? ((totalPresent / (totalStudents * totalDays)) * 100).toFixed(1) : 0,
            byDate: attendanceByDate,
        };
    },

    async getStudentAttendanceReport(studentId, sessionId) {
        const student = await StudentService.getStudent(studentId);

        // Get all attendance for this session
        const session = await ClassService.getSessions();
        const activeSession = session.find((s) => s.isActive);

        const snapshot = await schoolData('attendance').where('studentId', '==', studentId).get();

        let present = 0,
            absent = 0,
            leave = 0,
            late = 0;
        const byMonth = {};

        snapshot.docs.forEach((d) => {
            const att = d.data();
            const month = att.date.substring(0, 7);

            if (!byMonth[month]) {
                byMonth[month] = { present: 0, absent: 0, leave: 0, late: 0 };
            }

            byMonth[month][att.status.toLowerCase()]++;

            if (att.status === 'PRESENT') present++;
            else if (att.status === 'ABSENT') absent++;
            else if (att.status === 'LEAVE') leave++;
            else if (att.status === 'LATE') late++;
        });

        const total = present + absent + leave;
        const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

        return {
            student,
            totalPresent: present,
            totalAbsent: absent,
            totalLeave: leave,
            totalLate: late,
            attendancePercentage: percentage,
            byMonth,
        };
    },

    // ==================== ATTENDANCE SUMMARY ====================

    async getTodayAttendanceSummary() {
        const today = new Date().toISOString().split('T')[0];

        const classes = await ClassService.getClasses();
        const summary = [];

        for (const cls of classes) {
            const attendance = await this.getAttendance(cls.name, today);
            const students = await StudentService.getStudents({ class: cls.name, status: 'ACTIVE' });

            const present = attendance.filter((a) => a.status === 'PRESENT').length;
            const total = students.length;

            summary.push({
                class: cls.name,
                total,
                present,
                absent: total - present,
                percentage: total > 0 ? ((present / total) * 100).toFixed(1) : 0,
            });
        }

        return summary;
    },

    // ==================== HOLIDAYS ====================

    async getHolidays(sessionId) {
        const snapshot = await schoolData('holidays').where('sessionId', '==', sessionId).orderBy('date').get();

        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async createHoliday(data) {
        const docRef = await schoolData('holidays').add(
            withSchool({
                name: data.name,
                date: data.date,
                sessionId: data.sessionId,
                description: data.description || '',
                createdBy: auth.currentUser?.uid,
            })
        );

        return { id: docRef.id, status: 'CREATED' };
    },

    async deleteHoliday(holidayId) {
        await schoolDoc('holidays', holidayId).delete();
        return { id: holidayId, status: 'DELETED' };
    },
};

window.AttendanceService = AttendanceService;
