/**
 * Reports & Analytics Service
 * Compatible with existing schoolData(), schoolDoc(), withSchool()
 */

const ReportsService = {
    // ==================== STUDENT REPORTS ====================

    async getStudentDirectory(classId, sessionId) {
        const filters = {};
        if (classId) filters.class = classId;
        if (sessionId) filters.session = sessionId;

        const students = await StudentService.getStudents(filters);

        return students.map((s) => ({
            studentId: s.student_id,
            name: s.name,
            class: s.class,
            section: s.section,
            rollNo: s.roll_no,
            fatherName: s.father_name,
            phone: s.phone,
            address: s.address,
        }));
    },

    async getStudentProfileCard(studentId) {
        const student = await StudentService.getStudent(studentId);
        const invoices = await InvoiceService.getStudentInvoices(studentId);
        const payments = await PaymentServiceEnhanced.getStudentPayments(studentId);
        const attendance = await AttendanceService.getStudentAttendanceReport(studentId);

        return {
            student,
            fees: {
                totalInvoiced: invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0),
                totalPaid: invoices.reduce((sum, i) => sum + (i.amount_paid || 0), 0),
                pending: invoices.filter((i) => i.status !== 'PAID').length,
            },
            attendance: attendance,
            payments: payments.slice(0, 5), // Last 5 payments
        };
    },

    // ==================== ACADEMIC REPORTS ====================

    async getClassPerformance(classId, examId) {
        const exam = await ExamService.getExam(examId);
        const marks = await ExamService.getMarks(examId, classId, null);
        const gradingRules = await ExamService.getGradingRules(exam.sessionId);

        // Calculate statistics
        const marksList = marks.filter((m) => !m.isAbsent && !m.isExempt).map((m) => m.marks);
        const avg = marksList.length > 0 ? marksList.reduce((a, b) => a + b, 0) / marksList.length : 0;
        const highest = marksList.length > 0 ? Math.max(...marksList) : 0;
        const lowest = marksList.length > 0 ? Math.min(...marksList) : 0;

        // Grade distribution
        const gradeDist = {};
        marks.forEach((m) => {
            if (m.isAbsent) return;
            const percent = (m.marks / m.maxMarks) * 100;
            const grade = ExamService.calculateGrade(percent, gradingRules);
            gradeDist[grade] = (gradeDist[grade] || 0) + 1;
        });

        return {
            exam: exam.name,
            class: classId,
            totalStudents: marks.length,
            present: marksList.length,
            absent: marks.length - marksList.length,
            average: avg.toFixed(2),
            highest,
            lowest,
            gradeDistribution: gradeDist,
        };
    },

    async getSessionSummary(sessionId) {
        const classes = await ClassService.getClasses(sessionId);
        const students = await StudentService.getStudents({ session: sessionId });
        const fees = await InvoiceService.getPendingInvoices({ session: sessionId });

        let totalFeeDemand = 0;
        let totalFeeCollected = 0;

        fees.forEach((f) => {
            totalFeeDemand += f.total_amount || 0;
            totalFeeCollected += f.amount_paid || 0;
        });

        return {
            sessionId,
            classes: classes.length,
            totalStudents: students.length,
            feeCollection: {
                demand: totalFeeDemand,
                collected: totalFeeCollected,
                pending: totalFeeDemand - totalFeeCollected,
                collectionRate: totalFeeDemand > 0 ? ((totalFeeCollected / totalFeeDemand) * 100).toFixed(1) : 0,
            },
        };
    },

    // ==================== FINANCE REPORTS ====================

    async getFeeCollectionReport(startDate, endDate, classId) {
        const payments = await PaymentServiceEnhanced.getCollectionReport(startDate, endDate);

        let byClass = {};
        payments.studentSummary.forEach((s) => {
            if (classId && s.class !== classId) return;
            if (!byClass[s.class]) {
                byClass[s.class] = { students: 0, amount: 0 };
            }
            byClass[s.class].students++;
            byClass[s.class].amount += s.totalPaid;
        });

        return {
            startDate,
            endDate,
            totalCollected: payments.totalAmount,
            totalTransactions: payments.totalTransactions,
            byClass,
        };
    },

    async getOutstandingFees(classId) {
        const filters = {};
        if (classId) filters.class = classId;

        const invoices = await InvoiceService.getPendingInvoices(filters);

        let totalOutstanding = 0;
        const byClass = {};

        invoices.forEach((inv) => {
            const outstanding = (inv.total_amount || 0) - (inv.amount_paid || 0);
            totalOutstanding += outstanding;

            if (!byClass[inv.class]) {
                byClass[inv.class] = { invoices: 0, amount: 0 };
            }
            byClass[inv.class].invoices++;
            byClass[inv.class].amount += outstanding;
        });

        return {
            totalOutstanding,
            totalInvoices: invoices.length,
            byClass,
        };
    },

    // ==================== ATTENDANCE REPORTS ====================

    async getAttendanceSummary(classId, month, year) {
        const attendance = await AttendanceService.getMonthlyAttendance(classId, month, year);

        let totalDays = 0;
        let totalPresent = 0;
        let totalAbsent = 0;

        attendance.forEach((s) => {
            Object.values(s.days).forEach((status) => {
                totalDays++;
                if (status === 'PRESENT') totalPresent++;
                else if (status === 'ABSENT') totalAbsent++;
            });
        });

        return {
            class: classId,
            month,
            year,
            totalStudentDays: totalDays,
            present: totalPresent,
            absent: totalAbsent,
            attendancePercentage: totalDays > 0 ? ((totalPresent / totalDays) * 100).toFixed(1) : 0,
        };
    },

    async getLowAttendanceStudents(threshold = 75) {
        const students = await StudentService.getStudents({ status: 'ACTIVE' });
        const lowAttendance = [];

        for (const student of students) {
            const report = await AttendanceService.getStudentAttendanceReport(student.id);

            if (parseFloat(report.attendancePercentage) < threshold) {
                lowAttendance.push({
                    student: student.name,
                    class: student.class,
                    percentage: report.attendancePercentage,
                });
            }
        }

        return lowAttendance;
    },

    // ==================== EXPORT FUNCTIONS ====================

    generateCSV(data, filename) {
        if (!data.length) return;

        const headers = Object.keys(data[0]);
        const csvRows = [];

        // Header
        csvRows.push(headers.join(','));

        // Rows
        data.forEach((row) => {
            const values = headers.map((header) => {
                const val = row[header] || '';
                return `"${String(val).replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    },

    generatePrintReport(reportData, title) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .summary { margin: 20px 0; padding: 10px; background: #f9f9f9; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="summary">
            ${Object.entries(reportData)
                .map(([key, val]) => (typeof val === 'object' ? '' : `<p><strong>${key}:</strong> ${val}</p>`))
                .join('')}
          </div>
          <pre>${JSON.stringify(reportData, null, 2)}</pre>
        </body>
      </html>
    `);
        printWindow.print();
    },
};

window.ReportsService = ReportsService;
