/**
 * erp-report-card-tool.js - Advanced Report Card Generation Workflow
 */

const ReportCardTool = {
    /**
     * Generate and Upload a single report card
     */
    async processReportCard(studentId, examId, sessionId, templateType = 'himalayan') {
        try {
            // 1. Fetch Student Data
            const studentSnap = await schoolDoc('students', studentId).get();
            if (!studentSnap.exists) throw new Error('Student not found');
            const student = { id: studentSnap.id, ...studentSnap.data() };

            // 2. Fetch Marks for this exam
            const marksSnap = await schoolData('marks')
                .where('studentId', '==', studentId)
                .where('examId', '==', examId)
                .get();

            if (marksSnap.empty) {
                console.warn(`No marks found for student ${studentId} in exam ${examId}`);
                return { success: false, reason: 'No marks found' };
            }

            // We also need subjects to get names
            const subjectsSnap = await schoolData('subjects').where('sessionId', '==', sessionId).get();
            const subjects = {};
            subjectsSnap.forEach((doc) => (subjects[doc.id] = doc.data().name));

            const marks = marksSnap.docs.map((doc) => {
                const d = doc.data();
                return {
                    subject: subjects[d.subjectId] || d.subjectId,
                    total: d.obtained || 0,
                    periodic: d.periodic || 0, // In case periodic marks exist
                    term: d.term || d.obtained || 0,
                };
            });

            // 3. Fetch Attendance
            const attendance = await this._calculateAttendance(studentId);
            student.attendance = attendance;
