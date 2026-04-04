/**
 * Demand Fee Receipt System - Enhanced
 * Generates monthly demand notices with preview, PDF export, and overdue tracking
 */

const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];
const MONTH_MAP = {
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

async function fetchStudentDuesForDemand(studentId, sessionId, tillMonth, includePrevious) {
    const feesSnap = await window
        .schoolData('fees')
        .where('studentId', '==', studentId)
        .where('status', 'in', ['pending', 'partial'])
        .get();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dues = [];

    feesSnap.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        const feeMonthIndex = MONTH_MAP[data.month];
        const isSameSession = data.session === sessionId || data.sessionId === sessionId;
        const isPreviousSession = data.session < sessionId || data.sessionId < sessionId;

        if (isSameSession && (feeMonthIndex === undefined || feeMonthIndex <= tillMonth)) {
            const balance = (data.amount || 0) - (data.paidAmount || 0) - (data.discount || 0);
            if (balance > 0) {
                const dueDate = data.dueDate ? new Date(data.dueDate) : null;
                const daysOverdue = dueDate ? Math.max(0, Math.floor((today - dueDate) / 86400000)) : 0;
                dues.push({
                    ...data,
                    balance,
                    daysOverdue,
                    isOverdue: daysOverdue > 0,
                    dueDateStr: dueDate
                        ? dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '--',
                });
            }
        } else if (includePrevious && isPreviousSession) {
            const balance = (data.amount || 0) - (data.paidAmount || 0) - (data.discount || 0);
            if (balance > 0) {
                const dueDate = data.dueDate ? new Date(data.dueDate) : null;
                const daysOverdue = dueDate ? Math.max(0, Math.floor((today - dueDate) / 86400000)) : 0;
                dues.push({
                    ...data,
                    balance,
                    daysOverdue,
                    isOverdue: daysOverdue > 0,
                    dueDateStr: dueDate
                        ? dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '--',
                });
            }
        }
    });

    return dues.sort((a, b) => {
        if (a.session !== b.session) return (a.session || '').localeCompare(b.session || '');
        return (MONTH_MAP[a.month] || 0) - (MONTH_MAP[b.month] || 0);
    });
}

function generateSingleDemandReceiptHtml(school, student, session, className, dues, dueDate, combine) {
    let feeRows = '';
    let total = 0;
    let runningTotal = 0;
    const itemsToRender = combine ? combineDues(dues) : dues;
    const overdueItems = itemsToRender.filter((d) => d.isOverdue);

    itemsToRender.forEach((item, index) => {
        const amt = item.balance || item.remainingAmount || item.amount;
        total += amt;
        runningTotal += amt;
        const overdueBadge = item.isOverdue ? `<span class="overdue-badge">${item.daysOverdue}d overdue</span>` : '';
        const monthLabel =
            !combine && item.month ? `(${item.month.substring(0, 3)}${item.year ? ' ' + item.year : ''})` : '';
        const dueDateCol = item.dueDateStr || '--';

        feeRows += `
            <tr class="${item.isOverdue ? 'overdue-row' : ''}">
                <td>${item.feeType || 'Fee'} ${monthLabel}</td>
                <td>${dueDateCol}</td>
                <td class="text-right">₹${amt}</td>
                <td class="text-right">${overdueBadge}</td>
                <td class="text-right font-bold">₹${runningTotal}</td>
            </tr>
        `;
    });

    const formattedDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedDueDate = dueDate
        ? new Date(dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '--';

    let previousDuesHtml = '';
    const prevDues = dues.filter((d) => d.session < session || d.sessionId < session);
    if (prevDues.length > 0) {
        const prevTotal = prevDues.reduce((s, d) => s + (d.balance || 0), 0);
        previousDuesHtml = `
            <div class="dr-previous-dues">
                <b>Previous Session Dues:</b> ₹${prevTotal}
                <span class="overdue-badge">Carried Forward</span>
            </div>
        `;
    }

    const overdueWarning =
        overdueItems.length > 0
            ? `<div class="dr-overdue-warning"><i class="fas fa-exclamation-triangle"></i> ${overdueItems.length} item(s) overdue. Please pay immediately to avoid late fees.</div>`
            : '';

    const studentName = student.name || 'Student';
    const admNo = student.admissionNo || student.regId || student.studentId || student.student_id || 'N/A';
    const rollNo = student.rollNo || student.roll_no || '--';
    const fatherName = student.fatherName || student.father_name || '--';

    return `
        <div class="demand-receipt-card">
            <div class="dr-header">
                <div class="dr-school-info">
                    <h2>${school.schoolName || 'School'}</h2>
                    <p>${school.address || ''}</p>
                    <p>Phone: ${school.phone || ''} ${school.email ? '| ' + school.email : ''}</p>
                </div>
                <div class="dr-label">
                    <h3>Demand Notice</h3>
                    <p>Date: ${formattedDate}</p>
                    <p>Session: ${session}</p>
                </div>
            </div>

            <div class="dr-student-grid dr-grid-header">
                <div>Student Name</div>
                <div>Reg No</div>
                <div>Roll</div>
                <div>Father's Name</div>
                <div>Class</div>
            </div>
            <div class="dr-student-grid">
                <div style="font-weight:700">${studentName}</div>
                <div>${admNo}</div>
                <div>${rollNo}</div>
                <div>${fatherName}</div>
                <div>${className}</div>
            </div>

            <table class="dr-table">
                <thead>
                    <tr>
                        <th>Fee Type</th>
                        <th>Due Date</th>
                        <th class="text-right">Amount</th>
                        <th class="text-right">Status</th>
                        <th class="text-right">Running Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${feeRows}
                </tbody>
                <tfoot>
                    <tr class="dr-total-row">
                        <td colspan="4" class="text-right"><b>Total Due:</b></td>
                        <td class="text-right"><b>₹${total}</b></td>
                    </tr>
                </tfoot>
            </table>

            ${previousDuesHtml}
            ${overdueWarning}

            <div class="dr-summary">
                <div class="dr-note">
                    Dear Parent/Guardian, total outstanding fees for <b>${studentName}</b> (Class ${className}) amount to <b>₹${total}</b>.
                    Please pay before <b>${formattedDueDate}</b> to avoid late fees.
                </div>
                <div class="dr-qr-placeholder">
                    <div class="qr-box">
                        <i class="fas fa-qrcode" style="font-size:28px;color:#94a3b8;"></i>
                        <span style="font-size:7px;color:#94a3b8;">Pay Online</span>
                    </div>
                </div>
            </div>

            <div class="dr-footer">
                <div style="font-size: 7pt; color: #94a3b8;">
                    * This is a computer generated demand notice.
                    ${school.phone ? 'Contact: ' + school.phone : ''}
                </div>
                <div style="border-top: 1px solid #1e293b; width: 100px; text-align: center; font-size: 8pt; padding-top: 1mm;">Authorized Sign</div>
            </div>
        </div>
    `;
}

function combineDues(dues) {
    const combined = {};
    dues.forEach((d) => {
        const key = d.feeType || 'Fee';
        if (!combined[key]) {
            combined[key] = { feeType: key, remainingAmount: 0, isOverdue: false, daysOverdue: 0, dueDateStr: '--' };
        }
        combined[key].remainingAmount += d.balance || d.remainingAmount || d.amount;
        if (d.isOverdue) {
            combined[key].isOverdue = true;
            combined[key].daysOverdue = Math.max(combined[key].daysOverdue, d.daysOverdue);
        }
    });
    return Object.values(combined);
}

async function generateBatchDemandReceipts() {
    const session = document.getElementById('demandSessionSelect').value;
    const classId = document.getElementById('demandClassSelect').value;
    const dueDate = document.getElementById('demandDueDate').value;
    const tillMonth = parseInt(document.getElementById('demandTillMonth').value);
    const includePrevious = document.getElementById('demandIncludePrevious').checked;
    const combineFees = document.getElementById('demandCombineFees').checked;
    const overdueOnly = document.getElementById('demandOverdueOnly')?.checked || false;

    if (!session || !classId || !dueDate) {
        window.showToast('Please select Session, Class, and Due Date', 'error');
        return;
    }

    window.setLoading(true);
    try {
        const className =
            document.getElementById('demandClassSelect').options[
                document.getElementById('demandClassSelect').selectedIndex
            ].text;

        const studentsSnap = await window
            .schoolData('students')
            .where('classId', '==', classId)
            .where('status', '==', 'Active')
            .get();

        if (studentsSnap.empty) {
            window.showToast('No active students found in this class', 'warning');
            window.setLoading(false);
            return;
        }

        const students = [];
        studentsSnap.forEach((doc) => students.push({ id: doc.id, ...doc.data() }));

        const schSnap = await window.schoolRef().get();
        const schoolInfo = schSnap.exists ? schSnap.data() : {};

        const allReceiptsHtml = [];
        let currentBatch = [];
        let studentCount = 0;

        const batch = window.db ? window.db.batch() : null;
        let batchCount = 0;
        const MAX_BATCH = 400;

        for (const student of students) {
            let dues = await fetchStudentDuesForDemand(student.id, session, tillMonth, includePrevious);
            if (overdueOnly) {
                dues = dues.filter((d) => d.isOverdue);
            }
            if (dues.length > 0) {
                const receiptHtml = generateSingleDemandReceiptHtml(
                    schoolInfo,
                    student,
                    session,
                    className,
                    dues,
                    dueDate,
                    combineFees
                );
                currentBatch.push(receiptHtml);
                studentCount++;

                // Save demand notice to Firestore for student dashboard visibility
                const totalDue = dues.reduce((s, d) => s + (d.balance || 0), 0);
                const items = dues.map((d) => ({
                    name: `${d.feeType || 'Fee'} (${(d.month || '').substring(0, 3)})`,
                    feeType: d.feeType || 'Fee',
                    month: d.month || '',
                    year: d.year || '',
                    amount: d.balance || 0,
                    dueDate: d.dueDate || null,
                }));

                const noticeRef = window.schoolData('demand_notices').doc();
                await noticeRef.set(
                    window.withSchool({
                        studentId: student.id || student.studentId || student.student_id,
                        studentName: student.name || '',
                        className: className,
                        sessionId: session,
                        month: MONTH_NAMES[tillMonth] || '',
                        period: `${MONTH_NAMES[0]} - ${MONTH_NAMES[tillMonth]}`,
                        totalDue: totalDue,
                        items: items,
                        feeType: 'Monthly Fee Demand',
                        dueDate: dueDate ? firebase.firestore.Timestamp.fromDate(new Date(dueDate)) : null,
                        generatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        status: 'pending',
                        includePrevious: includePrevious,
                        combined: combineFees,
                    })
                );

                if (currentBatch.length === 4) {
                    allReceiptsHtml.push(`<div class="demand-print-page">${currentBatch.join('')}</div>`);
                    currentBatch = [];
                }
            }
        }

        if (currentBatch.length > 0) {
            allReceiptsHtml.push(`<div class="demand-print-page">${currentBatch.join('')}</div>`);
        }

        if (allReceiptsHtml.length === 0) {
            window.showToast('No pending dues found for the selected criteria', 'info');
            window.setLoading(false);
            return;
        }

        // Store for preview/export
        window._demandReceiptHtml = allReceiptsHtml.join('');
        window._demandStudentCount = studentCount;

        // Show preview
        const previewContainer = document.getElementById('demandReceiptPreview');
        previewContainer.innerHTML = window._demandReceiptHtml;
        previewContainer.classList.remove('hidden');
        previewContainer.style.display = 'block';

        // Also populate print container
        const printContainer = document.getElementById('demandReceiptPrintContainer');
        if (printContainer) {
            printContainer.innerHTML = window._demandReceiptHtml;
        }

        window.showToast(`Generated ${studentCount} demand notices. Preview ready.`, 'success');

        // Log audit
        if (window.PaymentService?.createAuditLog) {
            await window.PaymentService.createAuditLog('demand_generated', {
                session,
                classId,
                className,
                studentCount,
                tillMonth: MONTH_NAMES[tillMonth],
                includePrevious,
                overdueOnly,
            });
        }
    } catch (error) {
        console.error('Error generating demand receipts:', error);
        window.showToast('Failed to generate receipts: ' + error.message, 'error');
    } finally {
        window.setLoading(false);
    }
}

async function previewDemandReceipts() {
    await generateBatchDemandReceipts();
}

async function exportDemandToPDF() {
    if (!window._demandReceiptHtml) {
        window.showToast('Please generate demand receipts first', 'warning');
        return;
    }

    window.setLoading(true);
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const previewContainer = document.getElementById('demandReceiptPreview');

        if (!previewContainer || previewContainer.innerHTML.trim() === '') {
            window.showToast('No receipt data to export', 'warning');
            return;
        }

        // Use html2canvas to capture the preview
        const canvas = await window.html2canvas(previewContainer, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            doc.addPage();
            doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        const fileName = `Demand_Notices_${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(fileName);
        window.showToast(`PDF exported: ${fileName}`, 'success');

        // Log audit
        if (window.PaymentService?.createAuditLog) {
            await window.PaymentService.createAuditLog('demand_exported_pdf', {
                fileName,
                studentCount: window._demandStudentCount,
            });
        }
    } catch (error) {
        console.error('PDF export error:', error);
        window.showToast('Failed to export PDF: ' + error.message, 'error');
    } finally {
        window.setLoading(false);
    }
}

function generateMonthlyDemandNotice() {
    return generateBatchDemandReceipts();
}

// Initialize demand receipt session/class selectors
async function initDemandReceiptSelectors() {
    const sessionEl = document.getElementById('demandSessionSelect');
    const classEl = document.getElementById('demandClassSelect');

    if (!sessionEl || !classEl) return;

    try {
        const snap = await window.schoolData('sessions').orderBy('name', 'desc').get();
        sessionEl.innerHTML =
            '<option value="">Select Session</option>' +
            snap.docs.map((d) => `<option value="${d.id}">${d.data().name}</option>`).join('');

        sessionEl.addEventListener('change', async () => {
            if (sessionEl.value) {
                const classSnap = await window
                    .schoolData('classes')
                    .where('sessionId', '==', sessionEl.value)
                    .orderBy('sortOrder', 'asc')
                    .get();
                classEl.innerHTML =
                    '<option value="">Select Class</option>' +
                    classSnap.docs
                        .filter((c) => !c.data().disabled)
                        .map((c) => `<option value="${c.id}">${c.data().name}</option>`)
                        .join('');
            }
        });
    } catch (e) {
        console.error('Error initializing demand selectors:', e);
    }
}

// Exports to window
window.generateBatchDemandReceipts = generateBatchDemandReceipts;
window.fetchStudentDuesForDemand = fetchStudentDuesForDemand;
window.generateSingleDemandReceiptHtml = generateSingleDemandReceiptHtml;
window.previewDemandReceipts = previewDemandReceipts;
window.exportDemandToPDF = exportDemandToPDF;
window.generateMonthlyDemandNotice = generateMonthlyDemandNotice;
window.initDemandReceiptSelectors = initDemandReceiptSelectors;
