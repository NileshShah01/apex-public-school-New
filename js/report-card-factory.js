/**
 * Report Card Factory
 * Generates various PDF report card formats with embedded charts
 */

const ReportCardFactory = {
    /**
     * Generate Himalayan Standard Report Card
     * @param {Object} student - Student data
     * @param {Array} marks - Marks for the selected exam
     * @param {Object} examDetails - Exam term/session details
     * @param {Object} schoolDetails - Header info (Logo, Name, etc.)
     */
    async generateHimalayan(student, marks, examDetails, schoolDetails) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const W = 210;
        const H = 297;
        const margin = 10;

        // 1. HEADER
        this._drawHeader(doc, schoolDetails, examDetails, margin, W);

        // 2. STUDENT PROFILE
        let currentY = 45;
        currentY = this._drawProfile(doc, student, currentY, margin, W);

        // 3. SCHOLASTIC AREA (TABLE)
        currentY += 5;
        currentY = this._drawScholasticTable(doc, marks, currentY, margin, W);

        // 4. GRAPHICAL ANALYSIS
        currentY += 10;
        if (currentY + 60 > H - 30) { doc.addPage(); currentY = margin; }
        currentY = await this._drawGraphicalAnalysis(doc, marks, currentY, margin, W);

        // 5. CO-SCHOLASTIC & ATTENDANCE
        currentY += 10;
        currentY = this._drawCoScholastic(doc, student, currentY, margin, W);

        // 6. SIGNATURES
        this._drawSignatures(doc, H - 30, margin, W);

        doc.save(`Report_Card_Himalayan_${student.student_id}.pdf`);
    },

    /**
     * Generate MCQ Normal Report Card (Simple Summary)
     */
    async generateMCQNormal(student, marks, examDetails, schoolDetails) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const W = 210, H = 297, margin = 15;

        this._drawHeader(doc, schoolDetails, examDetails, margin, W);
        let currentY = 50;
        
        doc.setFontSize(14);
        doc.text("MCQ PERFORMANCE SUMMARY", W/2, currentY, { align: 'center' });
        currentY += 10;

        currentY = this._drawProfile(doc, student, currentY, margin, W);
        currentY += 10;

        const totalObtained = marks.reduce((acc, m) => acc + (Number(m.total) || 0), 0);
        const totalMax = marks.length * 100; // Assuming 100 per subject
        const percentage = ((totalObtained / totalMax) * 100).toFixed(1);

        doc.setFontSize(12);
        doc.rect(margin, currentY, W - (margin*2), 40);
        doc.text(`Total Subjects: ${marks.length}`, margin + 10, currentY + 10);
        doc.text(`Total Marks: ${totalObtained} / ${totalMax}`, margin + 10, currentY + 20);
        doc.text(`Percentage: ${percentage}%`, margin + 10, currentY + 30);
        doc.text(`Result Status: ${percentage >= 33 ? 'QUALIFIED' : 'NOT QUALIFIED'}`, W - margin - 10, currentY + 20, { align: 'right' });

        this._drawSignatures(doc, H - 40, margin, W);
        doc.save(`MCQ_Normal_${student.student_id}.pdf`);
    },

    /**
     * Generate MCQ Standard Report Card (With Progress Chart)
     */
    async generateMCQStandard(student, marks, examDetails, schoolDetails) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const W = 210, H = 297, margin = 15;

        this._drawHeader(doc, schoolDetails, examDetails, margin, W);
        let currentY = 50;
        currentY = this._drawProfile(doc, student, currentY, margin, W);
        
        currentY += 10;
        currentY = this._drawScholasticTable(doc, marks, currentY, margin, W);

        currentY += 15;
        doc.setFontSize(11);
        doc.text("PERFORMANCE PROGRESSION", margin, currentY);
        
        // Horizontal Progress Bars (Custom Drawing)
        marks.forEach((m, i) => {
            const barY = currentY + 10 + (i * 8);
            const score = Number(m.total) || 0;
            doc.setFontSize(8);
            doc.text(m.subject, margin, barY + 4);
            doc.setDrawColor(220);
            doc.rect(margin + 40, barY, 100, 5);
            doc.setFillColor(54, 162, 235);
            doc.rect(margin + 40, barY, score, 5, 'F');
            doc.text(`${score}%`, margin + 145, barY + 4);
        });

        this._drawSignatures(doc, H - 40, margin, W);
        doc.save(`MCQ_Standard_${student.student_id}.pdf`);
    },

    /**
     * Generate MCQ Advance Report Card (Deep Analysis)
     */
    async generateMCQAdvance(student, marks, examDetails, schoolDetails) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const W = 210, H = 297, margin = 10;

        this._drawHeader(doc, schoolDetails, examDetails, margin, W);
        let currentY = 45;
        currentY = this._drawProfile(doc, student, currentY, margin, W);
        
        // Subject breakdown
        currentY += 5;
        currentY = this._drawScholasticTable(doc, marks, currentY, margin, W);

        // Radar Chart / Comparative Analysis
        currentY += 10;
        doc.setFontSize(11);
        doc.text("COMPETENCY MAPPING (RADAR ANALYSIS)", W/2, currentY, { align: 'center' });
        
        const canvas = document.createElement('canvas');
        canvas.width = 500; canvas.height = 400;
        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: marks.map(m => m.subject),
                datasets: [{
                    label: 'Student Score',
                    data: marks.map(m => m.total),
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgb(255, 99, 132)',
                }]
            },
            options: { animation: false, scales: { r: { suggestMin: 0, suggestMax: 100 } } }
        });
        
        const imgData = canvas.toDataURL('image/png', 1.0);
        doc.addImage(imgData, 'PNG', margin + 30, currentY + 5, W - (margin*2) - 60, 80);
        currentY += 90;

        // Remedial Suggestions
        doc.rect(margin, currentY, W - (margin*2), 30);
        doc.setFontSize(10);
        doc.text("PERSONALIZED FEEDBACK & REMEDIAL SUGGESTIONS:", margin + 5, currentY + 8);
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        const weakSubjects = marks.filter(m => m.total < 50).map(m => m.subject);
        const feedback = weakSubjects.length > 0 
            ? `Special attention required in: ${weakSubjects.join(', ')}. Focus on fundamental concepts.`
            : "Excellent performance across all domains. Keep maintaining the high standard.";
        doc.text(doc.splitTextToSize(feedback, W - margin*2 - 10), margin + 5, currentY + 18);

        this._drawSignatures(doc, H - 30, margin, W);
        doc.save(`MCQ_Advance_${student.student_id}.pdf`);
    },

    // --- Helper Methods ---

    _drawHeader(doc, school, exam, margin, W) {
        doc.setFillColor(240, 244, 248);
        doc.rect(margin, margin, W - (margin * 2), 30, 'F');
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(20, 50, 100);
        doc.text(school.name || "APEX PUBLIC SCHOOL", W / 2, margin + 12, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(school.address || "CHETAN PARSA, PARSA, SARAN, BIHAR - 841219", W / 2, margin + 18, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(180, 20, 50);
        doc.text(`${exam.title || 'TERM-2'} REPORT CARD (SESSION: ${exam.session || '2024-2025'})`, W / 2, margin + 26, { align: 'center' });
    },

    _drawProfile(doc, s, y, margin, W) {
        doc.setDrawColor(200);
        doc.rect(margin, y, W - (margin * 2), 25);
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(50);
        
        const col1 = margin + 5;
        const col2 = W / 2 + 5;
        const lineH = 6;

        doc.text(`NAME : ${s.name || ''}`, col1, y + 8);
        doc.text(`ADM NO : ${s.admission_no || s.student_id || ''}`, col1, y + 8 + lineH);
        doc.text(`CLASS & SECTION : ${s.class || ''}-${s.section || ''}`, col1, y + 8 + lineH * 2);

        doc.text(`FATHER'S NAME : ${s.father_name || ''}`, col2, y + 8);
        doc.text(`MOTHER'S NAME : ${s.mother_name || ''}`, col2, y + 8 + lineH);
        doc.text(`DATE OF BIRTH : ${s.dob || ''}`, col2, y + 8 + lineH * 2);
        
        return y + 25;
    },

    _drawScholasticTable(doc, marks, y, margin, W) {
        const headers = [['Sn.', 'Subject', 'Periodic Test (10)', 'Term Exam (80)', 'Obtained', 'Grade']];
        const data = marks.map((m, i) => [
            i + 1,
            m.subject,
            m.periodic || '-',
            m.term || '-',
            m.total || '-',
            this._getGrade(m.total, 100)
        ]);

        doc.autoTable({
            startY: y,
            head: headers,
            body: data,
            theme: 'grid',
            headStyles: { fillStyle: 'F', fillColor: [5, 54, 95], textColor: 255, fontSize: 9, halign: 'center' },
            bodyStyles: { fontSize: 8, halign: 'center' },
            columnStyles: { 1: { halign: 'left' } },
            margin: { left: margin, right: margin }
        });

        return doc.lastAutoTable.finalY;
    },

    async _drawGraphicalAnalysis(doc, marks, y, margin, W) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("GRAPHICAL ANALYSIS", W / 2, y, { align: 'center' });
        
        // Create Chart.js in hidden canvas
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: marks.map(m => m.subject),
                datasets: [{
                    label: 'Marks Obtained',
                    data: marks.map(m => m.total),
                    backgroundColor: 'rgba(54, 162, 235, 0.8)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                animation: false,
                responsive: false,
                scales: { 
                    y: { beginAtZero: true, max: 100 }
                }
            }
        });

        // Wait for render (optional since animation is false)
        const imgData = canvas.toDataURL('image/png', 1.0);
        doc.addImage(imgData, 'PNG', margin + 15, y + 5, W - (margin * 2) - 30, 60);
        
        return y + 70;
    },

    _drawCoScholastic(doc, s, y, margin, W) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("CO-SCHOLASTIC ACTIVITIES", margin, y);
        
        // Simple table for co-scholastic
        const data = [
            ['Art & Craft', 'A'], ['Discipline', 'A'], ['Music', 'B'], ['Physical Health', 'A']
        ];
        
        doc.autoTable({
            startY: y + 5,
            body: data,
            theme: 'grid',
            bodyStyles: { fontSize: 8 },
            margin: { left: margin, right: W/2 + 5 }
        });

        return doc.lastAutoTable.finalY;
    },

    _drawSignatures(doc, y, margin, W) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("__________________________", margin + 10, y);
        doc.text("Class Teacher Signature", margin + 10, y + 5);
        
        doc.text("__________________________", W - margin - 50, y);
        doc.text("Principal Signature", W - margin - 45, y + 5);
    },

    _getGrade(score, max) {
        const p = (score / max) * 100;
        if (p >= 91) return 'A1';
        if (p >= 81) return 'A2';
        if (p >= 71) return 'B1';
        if (p >= 61) return 'B2';
        if (p >= 51) return 'C1';
        if (p >= 41) return 'C2';
        if (p >= 33) return 'D';
        return 'E';
    }
};

window.ReportCardFactory = ReportCardFactory;
