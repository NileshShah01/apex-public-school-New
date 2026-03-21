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

            // 4. Get School & Exam Details
            const schoolDoc_ref = await schoolDoc('settings', 'organization').get();
            const schoolDetails = schoolDoc_ref.exists ? schoolDoc_ref.data() : { name: 'Apex Public School' };

            const examSnap = await schoolDoc('exams', examId).get();
            const examDetails = {
                title: examSnap.exists ? examSnap.data().name : 'Exam',
                session: sessionId.replace('_', '-'),
            };

            // 5. Generate PDF using Factory
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');

            // Note: Since Factory usually saves the file, we might need to modify it or capture output.
            // For bulk, we'll use a modified approach to get the Blob/Base64.

            // Re-implementing a bit of Himalayan logic for Blob capture
            await this._renderReportCard(doc, templateType, student, marks, examDetails, schoolDetails);

            const pdfBlob = doc.output('blob');
            const fileName = `ReportCard_${student.name.replace(/\s+/g, '_')}_${examDetails.title}.pdf`;

            // 6. Upload to Storage
            const school_id = window.CURRENT_SCHOOL_ID || localStorage.getItem('schoolId') || 'SCH001';
            const storagePath = `schools/${school_id}/reports/${studentId}_${examDetails.title}_${sessionId}.pdf`;
            const uploadTask = await storage.ref(storagePath).put(pdfBlob);
            const downloadUrl = await uploadTask.ref.getDownloadURL();

            // 7. Update publications reference for student portal
            const year = sessionId.split('_')[0];
            await schoolDoc('reports', `${studentId}_${year}`).set(
                withSchool({
                    studentId: studentId,
                    examId: examId,
                    sessionId: sessionId,
                    fileData: downloadUrl, // Student portal uses this
                    uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
                })
            );

            return { success: true, url: downloadUrl };
        } catch (e) {
            console.error('Report Card Generation Error:', e);
            return { success: false, error: e.message };
        }
    },

    async _calculateAttendance(studentId) {
        try {
            const snap = await schoolData('attendance').where('studentId', '==', studentId).get();
            if (snap.empty) return 'N/A';

            let total = 0;
            let present = 0;
            snap.forEach((doc) => {
                total++;
                if (['present', 'late'].includes(doc.data().status)) present++;
            });
            return `${Math.round((present / total) * 100)}%`;
        } catch (e) {
            return 'N/A';
        }
    },

    async _renderReportCard(doc, type, student, marks, examDetails, schoolDetails) {
        const f = window.ReportCardFactory;
        
        if (type === 'premium') {
            await f._renderPremium(doc, student, marks, examDetails, schoolDetails);
            return;
        }

        // Default or other templates
        const W = 210, H = 297, margin = 10;
        f._drawHeader(doc, schoolDetails, examDetails, margin, W);
        let currentY = 45;
        currentY = f._drawProfile(doc, student, currentY, margin, W);
        currentY += 5;
        currentY = f._drawScholasticTable(doc, marks, currentY, margin, W);

        currentY += 10;
        if (currentY + 60 > H - 35) {
            doc.addPage();
            currentY = margin;
        }

        // Add Attendance & Conduct
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`ATTENDANCE: ${student.attendance}`, margin, currentY);
        doc.text(`CONDUCT: EXCELLENT`, W - margin, currentY, { align: 'right' });
        currentY += 10;

        await f._drawGraphicalAnalysis(doc, marks, currentY, margin, W);
        f._drawSignatures(doc, H - 30, margin, W);
    },
};

window.ReportCardTool = ReportCardTool;
