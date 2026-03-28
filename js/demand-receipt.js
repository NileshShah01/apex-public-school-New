/**
 * Demand Fee Receipt System
 * Handles batch generation of fee reminders (pre-bills)
 */

async function generateBatchDemandReceipts() {
    const session = document.getElementById('demandSessionSelect').value;
    const classId = document.getElementById('demandClassSelect').value;
    const dueDate = document.getElementById('demandDueDate').value;
    const tillMonth = parseInt(document.getElementById('demandTillMonth').value);
    const includePrevious = document.getElementById('demandIncludePrevious').checked;
    const combineFees = document.getElementById('demandCombineFees').checked;

    if (!session || !classId || !dueDate) {
        showToast("Please select Session, Class, and Due Date", "error");
        return;
    }

    setLoading(true);
    try {
        const schoolId = CURRENT_SCHOOL_ID;
        const className = document.getElementById('demandClassSelect').options[document.getElementById('demandClassSelect').selectedIndex].text;
        
        // 1. Fetch Students
        const studentsRef = db.collection('schools').doc(schoolId).collection('students');
        const studentsSnap = await studentsRef.where('classId', '==', classId).where('status', '==', 'Active').get();
        
        if (studentsSnap.empty) {
            showToast("No active students found in this class", "warning");
            setLoading(false);
            return;
        }

        const students = [];
        studentsSnap.forEach(doc => students.push({ id: doc.id, ...doc.data() }));

        // 2. Fetch School Info for Branding
        const schoolDoc = await db.collection('schools').doc(schoolId).get();
        const schoolData = schoolDoc.data();

        // 3. Process Each Student
        const allReceiptsHtml = [];
        let currentBatch = [];

        for (const student of students) {
            const dues = await fetchStudentDuesForDemand(schoolId, student.id, session, tillMonth, includePrevious);
            
            if (dues.length > 0) {
                const receiptHtml = generateSingleDemandReceiptHtml(schoolData, student, session, className, dues, dueDate, combineFees);
                currentBatch.push(receiptHtml);

                if (currentBatch.length === 4) {
                    allReceiptsHtml.push(`<div class="demand-print-page">${currentBatch.join('')}</div>`);
                    currentBatch = [];
                }
            }
        }

        if (currentBatch.length > 0) {
            // Fill remaining grid slots to maintain layout if needed, or just append
            allReceiptsHtml.push(`<div class="demand-print-page">${currentBatch.join('')}</div>`);
        }

        if (allReceiptsHtml.length === 0) {
            showToast("No pending dues found for the selected criteria", "info");
            setLoading(false);
            return;
        }

        // 4. Inject into Print Container and Print
        const container = document.getElementById('demandReceiptPrintContainer');
        container.innerHTML = allReceiptsHtml.join('');
        
        window.print();
        
    } catch (error) {
        console.error("Error generating demand receipts:", error);
        showToast("Failed to generate receipts: " + error.message, "error");
    } finally {
        setLoading(false);
    }
}

async function fetchStudentDuesForDemand(schoolId, studentId, session, tillMonth, includePrevious) {
    const feesRef = db.collection('schools').doc(schoolId).collection('fees');
    let query = feesRef.where('studentId', '==', studentId).where('status', '==', 'Pending');

    const snap = await query.get();
    let dues = [];
    snap.forEach(doc => {
        const data = doc.id ? { id: doc.id, ...doc.data() } : doc.data();
        
        // Month filter
        const monthMap = { "January": 0, "February": 1, "March": 2, "April": 3, "May": 4, "June": 5, "July": 6, "August": 7, "September": 8, "October": 9, "November": 10, "December": 11 };
        const feeMonthIndex = monthMap[data.month];

        const isSameSession = data.session === session;
        const isPreviousSession = data.session < session;

        if (isSameSession && feeMonthIndex <= tillMonth) {
            dues.push(data);
        } else if (includePrevious && isPreviousSession) {
            dues.push(data);
        }
    });

    // Sort by Due Date or Session/Month
    return dues.sort((a, b) => {
        if (a.session !== b.session) return a.session.localeCompare(b.session);
        return monthMap[a.month] - monthMap[b.month];
    });
}

function generateSingleDemandReceiptHtml(school, student, session, className, dues, dueDate, combine) {
    let feeRows = "";
    let total = 0;

    const itemsToRender = combine ? combineDues(dues) : dues;

    itemsToRender.forEach((item, index) => {
        const amt = item.remainingAmount || item.amount;
        total += amt;
        feeRows += `
            <tr>
                <td>${item.feeType} ${!combine ? '(' + item.month.substring(0,3) + ')' : ''}</td>
                <td class="text-right">₹${amt}</td>
            </tr>
        `;
    });

    const formattedDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedDueDate = new Date(dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    return `
        <div class="demand-receipt-card">
            <div class="dr-header">
                <div class="dr-school-info">
                    <h2>${school.schoolName || 'APEX PUBLIC SCHOOL'}</h2>
                    <p>${school.address || ''}</p>
                    <p>Phone: ${school.phone || ''}</p>
                </div>
                <div class="dr-label">
                    <h3>Demand Receipt</h3>
                    <p>Date: ${formattedDate}</p>
                </div>
            </div>

            <div class="dr-student-grid dr-grid-header">
                <div>Student Name</div>
                <div>Reg No</div>
                <div>Roll</div>
                <div>Father's Name</div>
                <div>Month</div>
            </div>
            <div class="dr-student-grid">
                <div style="font-weight:700">${student.name}</div>
                <div>${student.admissionNo || student.regId || 'N/A'}</div>
                <div>${student.rollNo || '--'}</div>
                <div>${student.fatherName || '--'}</div>
                <div style="font-size:7pt">${dues[0].month.substring(0,3)} - ${dues[dues.length-1].month.substring(0,3)}</div>
            </div>

            <table class="dr-table">
                <thead>
                    <tr>
                        <th>Fee Name</th>
                        <th class="text-right" style="width: 80px;">Due</th>
                    </tr>
                </thead>
                <tbody>
                    ${feeRows}
                </tbody>
            </table>

            <div class="dr-summary">
                <div class="dr-total-row">
                    <span>Total Due: ₹${total}</span>
                </div>
                <div class="dr-note">
                    Dear Parents, Total dues fee for ${dues[0].month.substring(0,3)} to ${dues[dues.length-1].month.substring(0,3)} is <b>₹${total}</b>. Please pay the fee before <b>${formattedDueDate}</b>.
                </div>
            </div>

            <div class="dr-footer">
                <div style="font-size: 7pt; color: #94a3b8;">* This is a computer generated demand receipt.</div>
                <div style="border-top: 1px solid #1e293b; width: 100px; text-align: center; font-size: 8pt; padding-top: 1mm;">Authorized Sign</div>
            </div>
        </div>
    `;
}

function combineDues(dues) {
    const combined = {};
    dues.forEach(d => {
        if (!combined[d.feeType]) {
            combined[d.feeType] = { feeType: d.feeType, remainingAmount: 0 };
        }
        combined[d.feeType].remainingAmount += (d.remainingAmount || d.amount);
    });
    return Object.values(combined);
}
