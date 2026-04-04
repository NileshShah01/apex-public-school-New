// ERP Fees Module - Comprehensive Version
async function initERPFees() {
    console.log('ERP Fees Module Initialized');

    // 1. Legacy Fee Support (from settings)
    const doc = await schoolDoc('settings', 'fees').get();
    if (doc.exists) {
        window.feeStructure = doc.data();
    }

    // 2. Initialize Searchable Selects
    if (typeof initSearchableSelect === 'function') {
        // 1. Fee Search Select
        initSearchableSelect('feeSearchSidContainer', window.allStudents || [], (s) => {
            document.getElementById('feeSearchSid').value = s.studentId || s.student_id;
            if (typeof searchStudentFees === 'function') searchStudentFees();
        });

        // 2. Fee Collection Select
        initSearchableSelect('feeCollectorSidContainer', window.allStudents || [], (s) => {
            document.getElementById('feeCollectorSid').value = s.studentId || s.student_id;
            if (typeof loadStudentLedgerData === 'function') loadStudentLedgerData(s.studentId || s.student_id);
        });
    }

    // 3. Initialize Shared Session Dropdowns
    const duesSession = document.getElementById('duesSessionFilter');
    const pnpSession = document.getElementById('pnpSessionFilter');
    const fmSession = document.getElementById('feeMasterSessionFilter');

    if (duesSession || pnpSession || fmSession) {
        try {
            const snap = await schoolData('sessions').orderBy('name', 'desc').get();
            const sessionHtml =
                '<option value="">Select Session</option>' +
                snap.docs.map((doc) => `<option value="${doc.id}">${doc.data().name}</option>`).join('');

            if (duesSession) duesSession.innerHTML = sessionHtml;
            if (fmSession) fmSession.innerHTML = sessionHtml;
            if (pnpSession) pnpSession.innerHTML = sessionHtml;

            // Session Change Listeners
            [duesSession, pnpSession, fmSession].forEach((el) => {
                if (!el) return;
                el.addEventListener('change', async () => {
                    const prefix = el.id.replace('SessionFilter', '');
                    const classEl = document.getElementById(`${prefix}ClassFilter`);
                    if (classEl && el.value) {
                        const classSnap = await schoolData('classes')
                            .where('sessionId', '==', el.value)
                            .orderBy('sortOrder', 'asc')
                            .get();
                        classEl.innerHTML =
                            '<option value="">All Classes</option>' +
                            classSnap.docs
                                .filter((c) => !c.data().disabled)
                                .map((c) => `<option value="${c.data().name}">${c.data().name}</option>`)
                                .join('');
                    }
                    if (el.id === 'feeMasterSessionFilter') loadFeeMaster();
                });
            });
        } catch (e) {
            console.error('Error loading sessions:', e);
        }
    }

    // 4. Load Fine Rules
    loadFineRules();

    // 5. Initialize Demand Receipt Selectors
    if (typeof initDemandReceiptSelectors === 'function') {
        initDemandReceiptSelectors();
    }
}

// ===================== LEGACY FEE GENERATION & SEARCH =====================

async function handleMonthlyFeeGenerate(e) {
    e.preventDefault();
    const sclass = document.getElementById('genFeeClass').value;
    const month = document.getElementById('genFeeMonth').value;

    if (!sclass || !month) {
        showToast('Please select class and month', 'error');
        return;
    }

    const [year, monthNum] = month.split('-');
    const monthName = new Date(year, monthNum - 1).toLocaleString('default', { month: 'long' });

    setLoading(true);
    try {
        const studentsSnap = await schoolData('students').where('class', '==', sclass).get();
        if (studentsSnap.empty) {
            showToast('No students found in this class', 'error');
            setLoading(false);
            return;
        }

        const safeId = sclass.replace(/\s+/g, '_').toLowerCase();
        const amount = (window.feeStructure && window.feeStructure[safeId + '_monthly']) || 0;

        const batch = (window.db || firebase.firestore()).batch();
        let count = 0;

        studentsSnap.forEach((doc) => {
            const student = doc.data();
            const sid = student.studentId || student.student_id;
            const feeId = `${sid}_${month}`;
            const feeRef = schoolDoc('fees', feeId);
            batch.set(
                feeRef,
                withSchool({
                    studentId: sid,
                    class: sclass,
                    month: monthName,
                    year: year,
                    amount: amount,
                    paidAmount: 0,
                    status: 'pending',
                    feeType: 'Tuition Fee',
                    frequency: 'Monthly',
                    dueDate: `${year}-${monthNum}-10`, // Default 10th of month
                    discount: 0,
                }),
                { merge: true }
            );
            count++;
        });

        await batch.commit();
        showToast(`Generated ${count} fee records for ${monthName} ${year}`);
    } catch (e) {
        showToast('Error generating fees: ' + e.message, 'error');
    } finally {
        setLoading(false);
    }
}

async function searchStudentFees() {
    const sid = document.getElementById('feeSearchSid').value.trim();
    if (!sid) return;
    const resultsDiv = document.getElementById('feeSearchResults');
    resultsDiv.innerHTML =
        '<div class="p-4 text-center"><i class="fas fa-spinner fa-spin"></i> Fetching lifecycle data...</div>';

    try {
        const data = await PaymentService.getStudentLedger(sid);
        if (data.ledger.length === 0) {
            resultsDiv.innerHTML = '<div class="p-4 text-center">No fee records found for this student.</div>';
            return;
        }

        // Summary Bar (Competitor benchmark)
        let html = `
            <div class="grid-4 gap-1 p-1-5 bg-slate-50 border-bottom">
                <div class="text-center"><p class="text-xs text-muted mb-0-25">Total Payable</p><p class="font-700 text-lg">₹${data.summary.total}</p></div>
                <div class="text-center"><p class="text-xs text-muted mb-0-25">Total Paid</p><p class="font-700 text-lg text-emerald-600">₹${data.summary.paid}</p></div>
                <div class="text-center"><p class="text-xs text-muted mb-0-25">Discounts</p><p class="font-700 text-lg text-amber-600">₹${data.summary.discount}</p></div>
                <div class="text-center"><p class="text-xs text-muted mb-0-25">Balance Due</p><p class="font-800 text-lg text-rose-600">₹${data.summary.balance}</p></div>
            </div>
            <div class="table-container">
                <table class="portal-table">
                    <thead>
                        <tr>
                            <th>Fee Type</th>
                            <th>Freq</th>
                            <th>Month/Year</th>
                            <th>Due Date</th>
                            <th>Status</th>
                            <th>Amount</th>
                            <th>Paid</th>
                            <th>Discount</th>
                            <th>Due</th>
                            <th class="text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        data.ledger.forEach((f) => {
            const statusColor = f.status === 'paid' ? '#10b981' : f.status === 'partial' ? '#f59e0b' : '#ef4444';
            const due = f.amount - (f.paidAmount || 0) - (f.discount || 0);

            html += `
                <tr>
                    <td class="font-600">${f.feeType}</td>
                    <td><span class="text-xs px-0-5 py-0-25 bg-slate-100 border-radius-4">${f.frequency}</span></td>
                    <td class="whitespace-nowrap">${f.month} ${f.year}</td>
                    <td>${f.dueDate}</td>
                    <td><span class="badge" style="background:${statusColor}; color:white;">${f.status}</span></td>
                    <td class="font-600">₹${f.amount}</td>
                    <td class="text-emerald-500">₹${f.paidAmount || 0}</td>
                    <td class="text-amber-500">₹${f.discount || 0}</td>
                    <td class="text-rose-500 font-700">₹${due > 0 ? due : 0}</td>
                    <td class="text-right">
                        ${due > 0 ? `<button onclick="openPaymentModal('${f.id}', ${f.amount}, ${f.paidAmount || 0})" class="btn-portal btn-sm btn-primary">Pay</button>` : '<i class="fas fa-check-circle text-emerald-500"></i>'}
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
        resultsDiv.innerHTML = html;
    } catch (e) {
        resultsDiv.innerHTML = `<div class="p-4 text-center text-rose-500">Error: ${e.message}</div>`;
    }
}

function openPaymentModal(feeId, total, paid) {
    const due = total - paid;
    const html = `
        <div class="form-group"><label>Amount to Pay (Due: ₹${due})</label><input type="number" id="payAmountInput" value="${due}" max="${due}" min="1"></div>
        <div class="form-group"><label>Payment Method</label><select id="payMethodInput"><option value="Cash">Cash</option><option value="UPI">UPI / Online</option><option value="Bank">Bank Transfer</option></select></div>
        <button onclick="submitFeePayment('${feeId}', ${total}, ${paid})" class="btn-portal btn-primary" style="width:100%;">Confirm Payment</button>
    `;
    if (typeof openCmsModal === 'function') {
        document.getElementById('cmsModalTitle').textContent = 'Process Payment';
        document.getElementById('cmsModalBody').innerHTML = html;
        document.getElementById('cmsModal').style.display = 'block';
    }
}

async function submitFeePayment(feeId, total, previouslyPaid) {
    const amountToPay = parseInt(document.getElementById('payAmountInput').value);
    const method = document.getElementById('payMethodInput').value;
    if (isNaN(amountToPay) || amountToPay <= 0) {
        showToast('Invalid amount', 'error');
        return;
    }

    const newPaidAmount = previouslyPaid + amountToPay;
    const status = newPaidAmount >= total ? 'paid' : 'partial';

    setLoading(true);
    try {
        await schoolDoc('fees', feeId).update({
            paidAmount: newPaidAmount,
            status: status,
            paymentDate: firebase.firestore.FieldValue.serverTimestamp(),
            lastPaymentMethod: method,
        });
        await schoolData('payments').add(withSchool({ feeId, amount: amountToPay, method }));
        showToast('Payment recorded successfully!');
        if (typeof closeCmsModal === 'function') closeCmsModal();
        searchStudentFees();
    } catch (e) {
        showToast('Payment failed: ' + e.message, 'error');
    } finally {
        setLoading(false);
    }
}

// ===================== FEE DUES / DEFAULTER TOOL =====================

async function loadFeeDues() {
    const session = document.getElementById('duesSessionFilter').value;
    const cls = document.getElementById('duesClassFilter').value;
    const body = document.getElementById('feeDuesTableBody');
    const summary = document.getElementById('duesSummaryBar');

    if (!session) {
        showToast('Please select a session', 'error');
        return;
    }
    body.innerHTML =
        '<tr><td colspan="7" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Analyzing arrears...</td></tr>';

    try {
        let studentQuery = schoolData('students');
        if (cls) studentQuery = studentQuery.where('class', '==', cls);
        const studentSnap = await studentQuery.get();
        const studentMap = {};
        studentSnap.forEach((doc) => {
            const d = doc.data();
            studentMap[d.studentId || d.student_id] = d;
        });

        let feeQuery = schoolData('fees').where('status', 'in', ['pending', 'partial']);
        if (cls) feeQuery = feeQuery.where('class', '==', cls);
        const feeSnap = await feeQuery.get();

        const defaulters = {};
        let totalOutstanding = 0;

        feeSnap.forEach((doc) => {
            const f = doc.data();
            const sid = f.studentId;
            if (!defaulters[sid]) {
                defaulters[sid] = {
                    sid: sid,
                    totalDue: 0,
                    months: [],
                    student: studentMap[sid] || { name: 'Unknown Student', fatherName: 'N/A', mobile: 'N/A' },
                };
            }
            const due = f.amount - (f.paidAmount || 0);
            defaulters[sid].totalDue += due;
            defaulters[sid].months.push({ ...f, docId: doc.id, dueAmount: due });
            totalOutstanding += due;
        });

        const defaulterList = Object.values(defaulters).sort((a, b) => b.totalDue - a.totalDue);
        if (defaulterList.length === 0) {
            body.innerHTML = '<tr><td colspan="7" style="text-align:center;">No pending dues found.</td></tr>';
            summary.style.display = 'none';
            return;
        }

        summary.style.display = 'grid';
        document.getElementById('duesTotalDefaulters').textContent = defaulterList.length;
        document.getElementById('duesTotalAmount').textContent = `₹${totalOutstanding.toLocaleString()}`;

        body.innerHTML = defaulterList
            .map((item) => {
                const s = item.student;
                return `<tr><td>${item.sid}</td><td>${s.name}</td><td>${s.class}</td><td>${s.fatherName}</td><td>${s.mobile}</td><td>₹${item.totalDue}</td><td class="text-right"><button onclick="viewDuesBreakdown('${item.sid}')" class="btn-portal btn-sm">Detail</button></td></tr>`;
            })
            .join('');
        window.currentDefaulters = defaulterList;
    } catch (e) {
        console.error(e);
    }
}

async function viewDuesBreakdown(sid) {
    const d = window.currentDefaulters?.find((def) => def.sid === sid);
    if (!d) return;
    const body = d.months
        .map(
            (f) =>
                `<tr><td>${f.month} ${f.year}</td><td>₹${f.amount}</td><td>₹${f.paidAmount || 0}</td><td>₹${f.dueAmount}</td></tr>`
        )
        .join('');
    const html = `<table class="portal-table"><thead><tr><th>Month</th><th>Amount</th><th>Paid</th><th>Due</th></tr></thead><tbody>${body}</tbody></table>`;
    if (typeof openCmsModal === 'function') {
        document.getElementById('cmsModalTitle').textContent = `Breakdown: ${d.student.name}`;
        document.getElementById('cmsModalBody').innerHTML = html;
        document.getElementById('cmsModal').style.display = 'block';
    }
}

function exportDuesToExcel() {
    if (!window.currentDefaulters || window.currentDefaulters.length === 0) return;
    const data = window.currentDefaulters.map((d) => ({
        'Student ID': d.sid,
        Name: d.student.name,
        Class: d.student.class,
        Outstanding: d.totalDue,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Defaulters');
    XLSX.writeFile(wb, 'DefaulterList.xlsx');
}

// ===================== NEW COMPREHENSIVE FEE SYSTEM =====================

async function loadFeeMaster() {
    const session = document.getElementById('feeMasterSessionFilter').value;
    const cls = document.getElementById('feeMasterClassFilter').value;
    const tbody = document.getElementById('feeMasterTableBody');
    if (!session) return;
    tbody.innerHTML =
        '<tr><td colspan="7" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
    try {
        let query = schoolData('feeStructures').where('sessionId', '==', session);
        if (cls) query = query.where('class', '==', cls);
        const snap = await query.get();
        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No structures found.</td></tr>';
            return;
        }
        tbody.innerHTML = snap.docs
            .map((doc) => {
                const d = doc.data();
                return `<tr><td><b>${d.feeType}</b></td><td>${d.class}</td><td>₹${d.amount}</td><td>${d.frequency || 'Monthly'}</td><td>${d.dueMonth || 'N/A'}</td><td>Active</td><td class="text-center"><button onclick="deleteFeeStructure('${doc.id}')" style="color:red;"><i class="fas fa-trash"></i></button></td></tr>`;
            })
            .join('');
    } catch (e) {
        console.error(e);
    }
}

function openAddFeeStructureModal() {
    const session = document.getElementById('feeMasterSessionFilter').value;
    if (!session) {
        showToast('Select session first', 'error');
        return;
    }
    const content = `
        <div style="padding:1rem;">
            <div class="form-group"><label>Fee Type</label><input type="text" id="mfName" class="form-control"></div>
            <div class="form-group"><label>Class</label><select id="mfClass" class="form-control">${document.getElementById('feeMasterClassFilter').innerHTML}</select></div>
            <div class="form-group"><label>Amount (₹)</label><input type="number" id="mfAmount" class="form-control"></div>
            <div class="form-group"><label>Frequency</label><select id="mfFreq" class="form-control"><option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option><option value="Yearly">Yearly</option></select></div>
            <button class="btn-portal btn-primary" style="width:100%;" onclick="saveFeeStructure()">Save</button>
        </div>
    `;
    openCmsModal('Add Fee Structure', content);
}

async function saveFeeStructure() {
    const data = {
        sessionId: document.getElementById('feeMasterSessionFilter').value,
        feeType: document.getElementById('mfName').value,
        class: document.getElementById('mfClass').value,
        amount: parseFloat(document.getElementById('mfAmount').value),
        frequency: document.getElementById('mfFreq').value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    if (!data.feeType || !data.class || isNaN(data.amount)) return;
    try {
        await schoolData('feeStructures').add(data);
        closeCmsModal();
        loadFeeMaster();
    } catch (e) {
        console.error(e);
    }
}

async function deleteFeeStructure(id) {
    if (!confirm('Delete this fee structure?')) return;
    try {
        await schoolDoc('feeStructures', id).delete();
        loadFeeMaster();
    } catch (e) {}
}

// ===================== COLLECTION DASHBOARD (Ledger & Payments) =====================

let activeStudentLedger = null;

async function loadStudentLedgerData(sid) {
    const infoBox = document.getElementById('fcStudentQuickInfo');
    const ledgerTable = document.getElementById('fcLedgerTableBody');
    const historyTable = document.getElementById('fcPaymentsTableBody');

    infoBox.style.display = 'none';
    ledgerTable.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

    try {
        // 1. Fetch Student Info (UI optimization: check if already in window.allStudents)
        const studentSnap = await schoolData('students').where('studentId', '==', sid).limit(1).get();
        if (studentSnap.empty) {
            ledgerTable.innerHTML = '<tr><td colspan="6" class="text-center">Student not found.</td></tr>';
            return;
        }
        const s = studentSnap.docs[0].data();
        document.getElementById('fcStudentName').textContent = s.name;
        document.getElementById('fcStudentClassSection').textContent = `Class ${s.class}`;
        infoBox.style.display = 'block';

        // 2. Fetch Ledger via Service
        const data = await PaymentService.getStudentLedger(sid);

        // 3. Render Ledger
        ledgerTable.innerHTML =
            data.ledger.length > 0
                ? data.ledger
                      .map(
                          (f) => `
                <tr>
                    <td class="whitespace-nowrap">${f.month} ${f.year}</td>
                    <td class="font-semibold">${f.feeType || 'Tuition Fee'}</td>
                    <td>${f.frequency || 'Monthly'}</td>
                    <td>${f.dueDate || '--'}</td>
                    <td class="font-bold">₹${f.amount}</td>
                    <td class="text-emerald-500">₹${f.paidAmount || 0}</td>
                    <td class="text-rose-500">₹${f.amount - (f.paidAmount || 0)}</td>
                    <td><span class="badge" style="background: ${f.status === 'paid' ? '#10b981' : f.status === 'partial' ? '#f59e0b' : '#ef4444'}">${f.status}</span></td>
                </tr>`
                      )
                      .join('')
                : '<tr><td colspan="8" class="text-center p-8 text-slate-500">No fee records found for this student.</td></tr>';

        // 4. Render History
        historyTable.innerHTML =
            data.history.length > 0
                ? data.history
                      .map(
                          (p) => `
                <tr>
                    <td>${p.receiptNo}</td>
                    <td>${p.createdAt ? new Date(p.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
                    <td>₹${p.amount}</td>
                    <td>${p.paymentMode}</td>
                    <td>
                        <button onclick="printReceipt('${p.id}')" class="btn-icon" title="Print Receipt"><i class="fas fa-print"></i></button>
                        <button onclick="generateReceiptPDF('${p.id}')" class="btn-icon" title="Download PDF"><i class="fas fa-file-pdf text-danger"></i></button>
                    </td>
                </tr>`
                      )
                      .join('')
                : '<tr><td colspan="5" class="text-center">No history</td></tr>';

        // 5. Update Totals
        document.getElementById('fcTotalFee').textContent = `₹${data.summary.total}`;
        document.getElementById('fcTotalPaid').textContent = `₹${data.summary.paid}`;
        document.getElementById('fcTotalBalance').textContent = `₹${data.summary.balance}`;

        activeStudentLedger = { sid, balance: data.summary.balance };
    } catch (e) {
        console.error('Error loading ledger:', e);
        showToast('Error loading ledger records', 'error');
    }
}

async function handleFeePayment(e) {
    if (e) e.preventDefault();
    if (!activeStudentLedger) {
        showToast('No student selected', 'error');
        return;
    }

    const amount = parseFloat(document.getElementById('payAmount').value);
    const mode = document.getElementById('payMode').value;
    const reference = document.getElementById('payRef')?.value || '';
    const remarks = document.getElementById('payRemarks')?.value || 'Dashboard Payment';
    const session = document.getElementById('feeMasterSessionFilter')?.value || '';

    if (isNaN(amount) || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    try {
        setLoading(true, 'Processing Payment...');
        const result = await PaymentService.recordPayment({
            studentId: activeStudentLedger.sid,
            amount: amount,
            method: mode,
            session: session,
            reference: reference,
            remarks: remarks,
        });

        showToast(`Payment Recorded: ${result.receiptNo}`, 'success');

        // Refresh UI
        loadStudentLedgerData(activeStudentLedger.sid);

        // Print Receipt
        printReceipt(result.paymentId);

        // Clear input
        document.getElementById('payAmount').value = '';
        if (document.getElementById('payRef')) document.getElementById('payRef').value = '';
        if (document.getElementById('payRemarks')) document.getElementById('payRemarks').value = '';
    } catch (e) {
        console.error('Payment Error:', e);
        showToast('Failed to record payment: ' + e.message, 'error');
    } finally {
        setLoading(false);
    }
}

// ===================== RECEIPT & WORDS =====================

async function printReceipt(pid) {
    try {
        setLoading(true);

        // Use PaymentService for cleaner data fetching
        const receiptData = await PaymentService.generatePaymentReceiptData(pid);
        const { payment: p, student: s, school: sch, allocations, currentBalance, auditTrail } = receiptData;

        // Populate School Info
        document.getElementById('rtcSchoolName').textContent = sch.schoolName || 'Our School';
        document.getElementById('rtcSchoolAddress').textContent = sch.address || 'School Address Not Set';
        document.getElementById('rtcSchoolContact').textContent =
            `Contact: ${sch.phone || '--'} | ${sch.email || '--'}`;

        // Populate Receipt Meta
        document.getElementById('rtcNo').textContent = p.receiptNo || pid.substring(0, 8).toUpperCase();
        document.getElementById('rtcDate').textContent = p.createdAt
            ? new Date(p.createdAt.seconds * 1000).toLocaleDateString()
            : '--/--/----';
        document.getElementById('rtcSession').textContent = p.session || '2023-24';
        document.getElementById('rtcPayId').textContent = pid;
        document.getElementById('rtcMode').textContent = p.paymentMode || 'Cash';

        // Populate Student Info
        document.getElementById('rtcName').textContent = s.name || 'Student';
        document.getElementById('rtcClass').textContent =
            `Class ${s.class || s.currentClass || '--'} ${s.section || s.currentSection || ''}`;
        document.getElementById('rtcAdm').textContent = s.studentId || s.student_id || '--';
        document.getElementById('rtcFName').textContent = s.fatherName || s.father_name || '--';
        if (document.getElementById('rtcRoll'))
            document.getElementById('rtcRoll').textContent = s.rollNo || s.roll_no || '--';

        // Populate Table (Itemized Allocations with enhanced columns)
        const tableBody = document.getElementById('rtcTableBody');

        if (allocations.length > 0) {
            tableBody.innerHTML = allocations
                .map(
                    (alt, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${alt.feeType} - ${alt.month} ${alt.year}</td>
                        <td style="text-align: right;">₹${alt.amount}</td>
                        <td style="text-align: right;">₹${alt.discount || 0}</td>
                        <td style="text-align: right;">₹${alt.remainingAfter}</td>
                        <td style="text-align: right; font-weight: bold;">₹${alt.paidNow}</td>
                    </tr>
                `
                )
                .join('');
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td>1</td>
                    <td>School Fee Payment (Towards Outstanding Dues)</td>
                    <td style="text-align: right;">₹${p.amount}</td>
                    <td style="text-align: right;">₹0</td>
                    <td style="text-align: right;">₹0</td>
                    <td style="text-align: right; font-weight: bold;">₹${p.amount}</td>
                </tr>
            `;
        }

        // Totals & Footer Info
        document.getElementById('rtcTotalFee').textContent = `₹${p.amount}`;
        document.getElementById('rtcPaid').textContent = `₹${p.amount}`;
        document.getElementById('rtcAmountWords').textContent = numberToWords(p.amount) + ' Rupees Only';
        document.getElementById('rtcRemarks').textContent = p.remarks || 'Payment received with thanks.';
        document.getElementById('rtcTime').textContent = p.createdAt
            ? new Date(p.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '--:--';

        // Running balance and received amount
        if (document.getElementById('rtcCurrentDues'))
            document.getElementById('rtcCurrentDues').textContent = `₹${currentBalance}`;
        if (document.getElementById('rtcReceivedAmount'))
            document.getElementById('rtcReceivedAmount').textContent = `₹${p.amount}`;

        // Audit trail display (if element exists)
        const auditEl = document.getElementById('rtcAuditTrail');
        if (auditEl && auditTrail.length > 0) {
            auditEl.innerHTML = auditTrail
                .map(
                    (a) => `
                <div class="receipt-audit-entry">
                    <span class="text-xs text-muted">${a.action}</span>
                    <span class="text-xs">${a.performedBy}</span>
                    <span class="text-xs">${a.timestamp ? new Date(a.timestamp.seconds * 1000).toLocaleString() : ''}</span>
                </div>
            `
                )
                .join('');
            auditEl.style.display = 'block';
        }

        // Show and print
        const area = document.getElementById('feeReceiptPrintTemplate');
        area.classList.remove('hidden');
        area.style.display = 'block';

        // Log receipt print
        await PaymentService.createAuditLog('receipt_printed', { paymentId: pid, receiptNo: p.receiptNo });

        setTimeout(() => {
            window.print();
            area.style.display = 'none';
            area.classList.add('hidden');
        }, 500);
    } catch (e) {
        console.error(pid, e);
        showToast('Error printing receipt: ' + e.message, 'error');
    } finally {
        setLoading(false);
    }
}

async function generateReceiptPDF(pid) {
    try {
        setLoading(true);

        const receiptData = await PaymentService.generatePaymentReceiptData(pid);
        const { payment: p, student: s, school: sch, allocations, currentBalance } = receiptData;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = 210;
        let y = 15;

        // School Header
        doc.setFillColor(5, 150, 105);
        doc.rect(0, 0, pageWidth, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(sch.schoolName || 'School Name', 15, y + 5);
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(sch.address || '', 15, y + 12);
        doc.text(`Phone: ${sch.phone || '--'} | Email: ${sch.email || '--'}`, 15, y + 17);

        // Receipt label
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(200, 200, 200);
        doc.text('FEE RECEIPT', pageWidth - 15, y + 10, { align: 'right' });
        doc.text(`#${p.receiptNo || pid.substring(0, 8)}`, pageWidth - 15, y + 18, { align: 'right' });

        y = 42;
        doc.setTextColor(51, 51, 51);

        // Receipt meta
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        const metaCol1 = 15;
        const metaCol2 = 110;
        doc.text(
            `Date: ${p.createdAt ? new Date(p.createdAt.seconds * 1000).toLocaleDateString() : '--'}`,
            metaCol1,
            y
        );
        doc.text(`Session: ${p.session || '--'}`, metaCol1, y + 5);
        doc.text(`Payment Mode: ${p.paymentMode || 'Cash'}`, metaCol2, y);
        doc.text(`Payment ID: ${pid}`, metaCol2, y + 5);
        y += 14;

        // Student info box
        doc.setFillColor(236, 253, 245);
        doc.roundedRect(15, y, pageWidth - 30, 20, 2, 2, 'F');
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(6, 95, 70);
        doc.text(`Student: ${s.name || 'Student'}`, 20, y + 7);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.text(
            `Class: ${s.class || s.currentClass || '--'} | Adm: ${s.studentId || s.student_id || '--'} | Father: ${s.fatherName || s.father_name || '--'}`,
            20,
            y + 14
        );
        y += 26;

        // Table header
        doc.setFillColor(241, 245, 249);
        doc.rect(15, y, pageWidth - 30, 8, 'F');
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(100, 116, 139);
        const cols = [18, 55, 100, 125, 150, 178];
        doc.text('#', cols[0], y + 5.5);
        doc.text('Fee Description', cols[1], y + 5.5);
        doc.text('Scheduled', cols[2], y + 5.5);
        doc.text('Discount', cols[3], y + 5.5);
        doc.text('Balance', cols[4], y + 5.5);
        doc.text('Paid Now', cols[5], y + 5.5);
        y += 10;

        // Table rows
        doc.setFont(undefined, 'normal');
        doc.setTextColor(30, 41, 59);

        if (allocations.length > 0) {
            allocations.forEach((alt, i) => {
                doc.setFontSize(9);
                doc.text(`${i + 1}`, cols[0], y);
                doc.text(`${alt.feeType} - ${alt.month} ${alt.year}`, cols[1], y);
                doc.text(`₹${alt.amount}`, cols[2], y);
                doc.text(`₹${alt.discount || 0}`, cols[3], y);
                doc.text(`₹${alt.remainingAfter}`, cols[4], y);
                doc.setFont(undefined, 'bold');
                doc.text(`₹${alt.paidNow}`, cols[5], y);
                doc.setFont(undefined, 'normal');
                y += 7;
                doc.setDrawColor(241, 245, 249);
                doc.line(15, y - 2, pageWidth - 15, y - 2);
            });
        } else {
            doc.text('1', cols[0], y);
            doc.text('School Fee Payment', cols[1], y);
            doc.text(`₹${p.amount}`, cols[2], y);
            doc.text('₹0', cols[3], y);
            doc.text('₹0', cols[4], y);
            doc.setFont(undefined, 'bold');
            doc.text(`₹${p.amount}`, cols[5], y);
            y += 7;
        }

        // Totals section
        y += 3;
        doc.setFillColor(248, 250, 252);
        doc.rect(120, y, 75, 20, 'F');
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text('Sub Total:', 125, y + 6);
        doc.text(`₹${p.amount}`, 178, y + 6, { align: 'right' });
        doc.setTextColor(5, 150, 105);
        doc.text('Total Paid:', 125, y + 12);
        doc.setFont(undefined, 'bold');
        doc.text(`₹${p.amount}`, 178, y + 12, { align: 'right' });
        y += 25;

        // Amount in words
        doc.setTextColor(51, 51, 51);
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(`Amount in Words: ${numberToWords(p.amount)} Rupees Only`, 15, y);
        y += 7;

        // Current dues
        doc.text(`Current Outstanding: ₹${currentBalance}`, 15, y);
        y += 10;

        // Remarks
        if (p.remarks) {
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(`Remarks: ${p.remarks}`, 15, y);
            y += 8;
        }

        // Footer
        y = 270;
        doc.setDrawColor(203, 213, 225);
        doc.line(15, y, pageWidth - 15, y);
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('This is a computer-generated receipt. No physical signature required.', 15, y + 5);
        doc.text(`Generated: ${new Date().toLocaleString()} | School ERP`, 15, y + 9);
        doc.text('Authorized Signatory', pageWidth - 40, y + 9);

        const fileName = `Receipt_${p.receiptNo || pid.substring(0, 8)}.pdf`;
        doc.save(fileName);
        showToast(`PDF downloaded: ${fileName}`, 'success');

        await PaymentService.createAuditLog('receipt_exported_pdf', {
            paymentId: pid,
            receiptNo: p.receiptNo,
            fileName,
        });
    } catch (e) {
        console.error('PDF generation error:', e);
        showToast('Error generating PDF: ' + e.message, 'error');
    } finally {
        setLoading(false);
    }
}

async function printDemandFromCollection() {
    if (!activeStudentLedger) {
        showToast('No student selected', 'error');
        return;
    }

    const sid = activeStudentLedger.sid;
    setLoading(true);

    try {
        const studentSnap = await schoolData('students').where('studentId', '==', sid).limit(1).get();
        if (studentSnap.empty) {
            showToast('Student not found', 'error');
            return;
        }
        const student = { id: studentSnap.docs[0].id, ...studentSnap.docs[0].data() };

        const schSnap = await schoolRef().get();
        const schoolInfo = schSnap.exists ? schSnap.data() : {};

        const dues = await fetchStudentDuesForDemand(sid, '', 11, true);

        if (dues.length === 0) {
            showToast('No pending dues for this student', 'info');
            return;
        }

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 15);
        const dueDateStr = dueDate.toISOString().slice(0, 10);

        const className = student.class || student.currentClass || '--';
        const receiptHtml = generateSingleDemandReceiptHtml(
            schoolInfo,
            student,
            'All Sessions',
            className,
            dues,
            dueDateStr,
            false
        );

        const previewContainer = document.getElementById('demandReceiptPreview');
        if (previewContainer) {
            previewContainer.innerHTML = receiptHtml;
            previewContainer.classList.remove('hidden');
            previewContainer.style.display = 'block';
            showToast('Demand notice generated for ' + student.name, 'success');
        } else {
            // Fallback: open in a new window for printing
            const win = window.open('', '_blank');
            win.document.write(`<html><head><title>Demand Notice - ${student.name}</title>
                <style>
                    body { font-family: 'Inter', sans-serif; padding: 20px; }
                    .demand-receipt-card { border: 1px solid #e2e8f0; padding: 15px; max-width: 500px; margin: auto; }
                    .dr-header { display: flex; justify-content: space-between; border-bottom: 2px solid #1e293b; padding-bottom: 8px; margin-bottom: 8px; }
                    .dr-header h2 { font-size: 14px; margin: 0; }
                    .dr-header h3 { font-size: 12px; margin: 0; }
                    .dr-student-grid { display: grid; grid-template-columns: repeat(5, 1fr); font-size: 9px; padding: 4px 0; }
                    .dr-grid-header { font-weight: bold; border-bottom: 1px solid #e2e8f0; }
                    .dr-table { width: 100%; border-collapse: collapse; font-size: 9px; margin: 8px 0; }
                    .dr-table th { background: #f1f5f9; padding: 4px; text-align: left; font-size: 8px; }
                    .dr-table td { padding: 4px; border-bottom: 1px solid #f1f5f9; }
                    .text-right { text-align: right; }
                    .font-bold { font-weight: bold; }
                    .dr-total-row td { font-weight: bold; border-top: 2px solid #1e293b; }
                    .dr-footer { display: flex; justify-content: space-between; margin-top: 10px; font-size: 8px; }
                    @media print { body { padding: 0; } }
                </style></head><body>${receiptHtml}
                <script>setTimeout(()=>{ window.print(); }, 500);</script></body></html>`);
            win.document.close();
        }

        await PaymentService.createAuditLog('demand_generated_single', { studentId: sid, studentName: student.name });
    } catch (e) {
        console.error('Error generating demand:', e);
        showToast('Error: ' + e.message, 'error');
    } finally {
        setLoading(false);
    }
}

function numberToWords(n) {
    const a = [
        '',
        'One ',
        'Two ',
        'Three ',
        'Four ',
        'Five ',
        'Six ',
        'Seven ',
        'Eight ',
        'Nine ',
        'Ten ',
        'Eleven ',
        'Twelve ',
        'Thirteen ',
        'Fourteen ',
        'Fifteen ',
        'Sixteen ',
        'Seventeen ',
        'Eighteen ',
        'Nineteen ',
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    let num = n.toString();
    if (num.length > 9) return 'overflow';
    let grps = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!grps) return '';
    let str = '';
    str += grps[1] != 0 ? (a[Number(grps[1])] || b[grps[1][0]] + ' ' + a[grps[1][1]]) + 'Crore ' : '';
    str += grps[2] != 0 ? (a[Number(grps[2])] || b[grps[2][0]] + ' ' + a[grps[2][1]]) + 'Lakh ' : '';
    str += grps[3] != 0 ? (a[Number(grps[3])] || b[grps[3][0]] + ' ' + a[grps[3][1]]) + 'Thousand ' : '';
    str += grps[4] != 0 ? (a[Number(grps[4])] || b[grps[4][0]] + ' ' + a[grps[4][1]]) + 'Hundred ' : '';
    str += grps[5] != 0 ? (str != '' ? 'and ' : '') + (a[Number(grps[5])] || b[grps[5][0]] + ' ' + a[grps[5][1]]) : '';
    return str.trim();
}

// ===================== BULK EXTRA FEE & FINE RULES =====================

async function applyBulkExtraFee() {
    const session = document.getElementById('befSession').value;
    const cls = document.getElementById('befClass').value;
    const type = document.getElementById('befType').value;
    const amount = parseFloat(document.getElementById('befAmount').value);
    const dueDate = document.getElementById('befDueDate').value;

    if (!session || !cls || !type || isNaN(amount)) {
        showToast('Please fill all fields correctly', 'error');
        return;
    }

    if (!confirm(`Apply charge of ₹${amount} (${type}) to all students in ${cls}?`)) return;

    setLoading(true, 'Applying bulk charges...');
    try {
        const studentsSnap = await schoolData('students').where('class', '==', cls).get();
        if (studentsSnap.empty) {
            showToast('No students found in this class', 'error');
            return;
        }

        const batch = (window.db || firebase.firestore()).batch();
        const now = new Date();
        const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });
        const [month, year] = monthYear.split(' ');

        studentsSnap.forEach((doc) => {
            const sid = doc.data().studentId || doc.data().student_id;
            const feeId = `${sid}_EXTRA_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const feeRef = schoolDoc('fees', feeId);

            batch.set(
                feeRef,
                withSchool({
                    studentId: sid,
                    class: cls,
                    month: month,
                    year: year,
                    amount: amount,
                    paidAmount: 0,
                    status: 'pending',
                    feeType: type,
                    frequency: 'One-off',
                    dueDate: dueDate || '--',
                    discount: 0,
                })
            );
        });

        await batch.commit();
        showToast(`Successfully added "${type}" to ${studentsSnap.size} students`);

        // Reset form
        document.getElementById('befType').value = '';
        document.getElementById('befAmount').value = '';
    } catch (e) {
        showToast('Operation failed: ' + e.message, 'error');
    } finally {
        setLoading(false);
    }
}

async function saveFineRule() {
    const name = document.getElementById('lfrName').value;
    const grace = parseInt(document.getElementById('lfrGrace').value);
    const type = document.getElementById('lfrType').value;
    const amount = parseFloat(document.getElementById('lfrAmount').value);

    if (!name || isNaN(grace) || isNaN(amount)) {
        showToast('Please fill all rule fields', 'error');
        return;
    }

    setLoading(true);
    try {
        await schoolData('fineRules').add(
            withSchool({
                name,
                graceDays: grace,
                fineType: type,
                amount,
                active: true,
            })
        );
        showToast('Fine rule saved successfully');
        loadFineRules();
    } catch (e) {
        showToast('Error saving rule: ' + e.message, 'error');
    } finally {
        setLoading(false);
    }
}

async function loadFineRules() {
    const tbody = document.getElementById('fineRulesTableBody');
    if (!tbody) return;
    try {
        const snap = await schoolData('fineRules').get();
        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4">No rules defined</td></tr>';
            return;
        }
        tbody.innerHTML = snap.docs
            .map((doc) => {
                const r = doc.data();
                return `
                <tr>
                    <td><b>${r.name}</b></td>
                    <td>${r.graceDays} Days</td>
                    <td class="capitalize">${r.fineType.replace('_', ' ')}</td>
                    <td>${r.fineType === 'percent' ? r.amount + '%' : '₹' + r.amount}</td>
                    <td class="text-center">
                        <button onclick="deleteFineRule('${doc.id}')" class="text-rose-500 btn-icon"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
            })
            .join('');
    } catch (e) {
        console.error(e);
    }
}

async function deleteFineRule(id) {
    if (!confirm('Delete this rule?')) return;
    try {
        await schoolDoc('fineRules', id).delete();
        loadFineRules();
    } catch (e) {}
}

// ===================== PARENTS NOT PAID TOOL =====================

async function loadParentsNotPaidTool() {
    const session = document.getElementById('pnpSessionFilter').value;
    const cls = document.getElementById('pnpClassFilter').value;
    const grid = document.getElementById('pnpArrearsGrid');
    if (!session) return;
    grid.innerHTML = 'Loading...';
    try {
        const studentSnap = await schoolData('students').get();
        const studentMap = {};
        studentSnap.forEach((d) => (studentMap[d.data().studentId || d.data().student_id] = d.data()));
        const feeSnap = await schoolData('fees').where('status', '!=', 'paid').get();
        const def = {};
        feeSnap.forEach((d) => {
            const f = d.data();
            const sid = f.studentId;
            if (!def[sid]) def[sid] = { sid, due: 0, s: studentMap[sid] };
            def[sid].due += f.amount - (f.paidAmount || 0);
        });
        const list = Object.values(def).filter((x) => x.s);
        grid.innerHTML = list
            .map(
                (i) =>
                    `<div class="card p-3"><b>${i.s.name}</b><br>Due: ₹${i.due}<br><a href="tel:${i.s.mobile}" class="btn-portal btn-sm mt-2">Call Parent</a></div>`
            )
            .join('');
    } catch (e) {
        console.error(e);
    }
}

// Exports
window.initERPFees = initERPFees;
window.handleMonthlyFeeGenerate = handleMonthlyFeeGenerate;
window.searchStudentFees = searchStudentFees;
window.openPaymentModal = openPaymentModal;
window.submitFeePayment = submitFeePayment;
window.loadFeeDues = loadFeeDues;
window.viewDuesBreakdown = viewDuesBreakdown;
window.exportDuesToExcel = exportDuesToExcel;
window.loadFeeMaster = loadFeeMaster;
window.openAddFeeStructureModal = openAddFeeStructureModal;
window.saveFeeStructure = saveFeeStructure;
window.deleteFeeStructure = deleteFeeStructure;
window.loadStudentLedgerData = loadStudentLedgerData;
window.handleFeePayment = handleFeePayment;
window.printReceipt = printReceipt;
window.loadParentsNotPaidTool = loadParentsNotPaidTool;
window.applyBulkExtraFee = applyBulkExtraFee;
window.saveFineRule = saveFineRule;
window.loadFineRules = loadFineRules;
window.deleteFineRule = deleteFineRule;

// ===== BULK FEE DISCOUNT =====
async function bfdLoadClasses() {
    const sessionId = document.getElementById('bfdSession').value;
    const classEl = document.getElementById('bfdClass');
    if (!sessionId || !classEl) return;

    const classSnap = await schoolData('classes').where('sessionId', '==', sessionId).orderBy('sortOrder').get();
    classEl.innerHTML =
        '<option value="">Select Class</option>' +
        classSnap.docs
            .filter((c) => !c.data().disabled)
            .map((c) => `<option value="${c.data().name}">${c.data().name}</option>`)
            .join('');
}

async function bfdLoadStudents() {
    const className = document.getElementById('bfdClass').value;
    if (!className) return;

    const section = document.getElementById('bfdSection').value;
    let query = schoolData('students').where('currentClass', '==', className).where('status', '==', 'Active');
    if (section) query = query.where('currentSection', '==', section);

    const snap = await query.get();
    const tbody = document.getElementById('bfdTableBody');

    if (snap.empty) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center p-4 text-muted">No students found</td></tr>';
        return;
    }

    const students = [];
    for (const doc of snap.docs) {
        const s = doc.data();
        const feeSnap = await schoolData('fees')
            .where('studentId', '==', s.student_id || doc.id)
            .get();
        let totalFee = 0,
            totalPaid = 0;
        feeSnap.docs.forEach((f) => {
            totalFee += f.data().amount || 0;
            totalPaid += f.data().paidAmount || 0;
        });
        students.push({ id: doc.id, ...s, totalFee, totalPaid, balance: totalFee - totalPaid });
    }

    students.sort((a, b) => (a.roll_no || '').localeCompare(b.roll_no || ''));

    tbody.innerHTML = students
        .map(
            (s) => `
        <tr>
            <td><input type="checkbox" class="bfd-check" data-id="${s.id}" data-sid="${s.student_id || s.id}"></td>
            <td>${s.roll_no || '-'}</td>
            <td>${s.name || '-'}</td>
            <td>${s.currentClass || '-'} / ${s.currentSection || '-'}</td>
            <td>&#8377;${s.totalFee.toLocaleString()}</td>
            <td>&#8377;${s.totalPaid.toLocaleString()}</td>
            <td class="${s.balance > 0 ? 'text-danger font-600' : 'text-success'}">&#8377;${s.balance.toLocaleString()}</td>
            <td>-</td>
        </tr>
    `
        )
        .join('');
}

function bfdToggleAll() {
    const master = document.getElementById('bfdSelectAll');
    document.querySelectorAll('.bfd-check').forEach((cb) => (cb.checked = master.checked));
}

async function bfdApplyToSelected() {
    const checked = document.querySelectorAll('.bfd-check:checked');
    if (!checked.length) {
        showToast('No students selected', 'warning');
        return;
    }
    await _bfdApply([...checked.map((c) => ({ docId: c.dataset.id, studentId: c.dataset.sid }))]);
}

async function bfdApplyToAll() {
    const all = document.querySelectorAll('.bfd-check');
    if (!all.length) {
        showToast('No students loaded', 'warning');
        return;
    }
    await _bfdApply([...all.map((c) => ({ docId: c.dataset.id, studentId: c.dataset.sid }))]);
}

async function _bfdApply(students) {
    const type = document.getElementById('bfdType').value;
    const value = parseFloat(document.getElementById('bfdValue').value);
    const reason = document.getElementById('bfdReason').value.trim();

    if (!value || value <= 0) {
        showToast('Enter a valid discount value', 'warning');
        return;
    }

    try {
        showLoading(true);
        let count = 0;
        for (const s of students) {
            const feeSnap = await schoolData('fees')
                .where('studentId', '==', s.studentId)
                .where('status', 'in', ['pending', 'partial'])
                .get();

            for (const feeDoc of feeSnap.docs) {
                const fee = feeDoc.data();
                const discount =
                    type === 'fixed'
                        ? Math.min(value, fee.amount - (fee.paidAmount || 0))
                        : Math.round(((fee.amount - (fee.paidAmount || 0)) * value) / 100);

                await schoolDoc('fees', feeDoc.id).update({
                    discount: firebase.firestore.FieldValue.increment(discount),
                    discountReason: reason,
                    discountType: type,
                    discountValue: value,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
                count++;
            }
        }
        showToast(`Discount applied to ${count} fee records`, 'success');
        bfdLoadStudents();
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ===== SEND FEE MESSAGE =====
async function sfmLoadClasses() {
    const sessionId = document.getElementById('sfmSession').value;
    const classEl = document.getElementById('sfmClass');
    if (!sessionId || !classEl) return;

    const classSnap = await schoolData('classes').where('sessionId', '==', sessionId).orderBy('sortOrder').get();
    classEl.innerHTML =
        '<option value="">Select Class</option>' +
        classSnap.docs
            .filter((c) => !c.data().disabled)
            .map((c) => `<option value="${c.data().name}">${c.data().name}</option>`)
            .join('');
}

async function sfmLoadDues() {
    const className = document.getElementById('sfmClass').value;
    if (!className) return;

    const filter = document.getElementById('sfmFilter').value;
    const snap = await schoolData('students')
        .where('currentClass', '==', className)
        .where('status', '==', 'Active')
        .get();
    const tbody = document.getElementById('sfmTableBody');

    const students = [];
    for (const doc of snap.docs) {
        const s = doc.data();
        const feeSnap = await schoolData('fees')
            .where('studentId', '==', s.student_id || doc.id)
            .get();
        let totalDues = 0;
        feeSnap.docs.forEach((f) => {
            const bal = (f.data().amount || 0) - (f.data().paidAmount || 0) - (f.data().discount || 0);
            if (bal > 0) totalDues += bal;
        });

        if (filter === 'dues' && totalDues <= 0) continue;
        students.push({ id: doc.id, ...s, totalDues });
    }

    if (!students.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center p-4 text-muted">No students found</td></tr>';
        return;
    }

    tbody.innerHTML = students
        .map(
            (s) => `
        <tr>
            <td><input type="checkbox" class="sfm-check" data-id="${s.id}" data-name="${s.name}" data-class="${s.currentClass}" data-section="${s.currentSection}" data-father="${s.father_name}" data-mobile="${s.mobile}" data-dues="${s.totalDues}"></td>
            <td>${s.name || '-'}</td>
            <td>${s.currentClass || '-'} / ${s.currentSection || '-'}</td>
            <td>${s.father_name || '-'}</td>
            <td>${s.mobile || '-'}</td>
            <td class="${s.totalDues > 0 ? 'text-danger font-600' : 'text-success'}">&#8377;${s.totalDues.toLocaleString()}</td>
            <td>${s.totalDues > 0 ? '<span class="badge badge-danger">Dues Pending</span>' : '<span class="badge badge-success">Clear</span>'}</td>
        </tr>
    `
        )
        .join('');
}

function sfmToggleAll() {
    const master = document.getElementById('sfmSelectAll');
    document.querySelectorAll('.sfm-check').forEach((cb) => (cb.checked = master.checked));
}

async function sfmSendToSelected() {
    const checked = document.querySelectorAll('.sfm-check:checked');
    if (!checked.length) {
        showToast('No students selected', 'warning');
        return;
    }
    await _sfmSend([...checked]);
}

async function sfmSendToAll() {
    const all = document.querySelectorAll('.sfm-check');
    if (!all.length) {
        showToast('No students loaded', 'warning');
        return;
    }
    await _sfmSend([...all]);
}

async function _sfmSend(checkboxes) {
    const template = document.getElementById('sfmMessage').value;
    if (!template.trim()) {
        showToast('Please enter a message template', 'warning');
        return;
    }

    try {
        showLoading(true);
        let count = 0;
        for (const cb of checkboxes) {
            const msg = template
                .replace(/{student_name}/g, cb.dataset.name || '')
                .replace(/{class}/g, cb.dataset.class || '')
                .replace(/{section}/g, cb.dataset.section || '')
                .replace(/{father_name}/g, cb.dataset.father || '')
                .replace(/{amount}/g, cb.dataset.dues || '0');

            await schoolData('notifications').add(
                withSchool({
                    title: 'Fee Due Reminder',
                    message: msg,
                    type: 'fee_reminder',
                    targetStudent: cb.dataset.id,
                    targetMobile: cb.dataset.mobile,
                    sentAt: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'sent',
                })
            );
            count++;
        }
        showToast(`Messages sent to ${count} parents`, 'success');
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ===== FEE CARRY FORWARD =====
async function fcfPreview() {
    const fromSession = document.getElementById('fcfFromSession').value;
    const toSession = document.getElementById('fcfToSession').value;

    if (!fromSession || !toSession) {
        showToast('Select both sessions', 'warning');
        return;
    }
    if (fromSession === toSession) {
        showToast('Sessions must be different', 'warning');
        return;
    }

    try {
        showLoading(true);
        const feeSnap = await schoolData('fees')
            .where('sessionId', '==', fromSession)
            .where('status', 'in', ['pending', 'partial'])
            .get();

        const studentDues = {};
        feeSnap.docs.forEach((doc) => {
            const f = doc.data();
            const bal = (f.amount || 0) - (f.paidAmount || 0) - (f.discount || 0);
            if (bal > 0) {
                if (!studentDues[f.studentId])
                    studentDues[f.studentId] = { name: f.studentName, class: f.className, dues: 0 };
                studentDues[f.studentId].dues += bal;
            }
        });

        const tbody = document.getElementById('fcfTableBody');
        const entries = Object.entries(studentDues);

        if (!entries.length) {
            tbody.innerHTML =
                '<tr><td colspan="5" class="text-center p-4 text-success">No outstanding dues found!</td></tr>';
            document.getElementById('fcfTotalStudents').textContent = '0';
            document.getElementById('fcfTotalAmount').textContent = '\u20B90';
            document.getElementById('fcfExecuteBtn').disabled = true;
            return;
        }

        let totalAmount = 0;
        tbody.innerHTML = entries
            .map(([sid, data]) => {
                totalAmount += data.dues;
                return `<tr>
                <td>${sid}</td>
                <td>${data.name || '-'}</td>
                <td>${data.class || '-'}</td>
                <td class="text-danger font-600">\u20B9${data.dues.toLocaleString()}</td>
                <td><span class="badge badge-warning">Pending</span></td>
            </tr>`;
            })
            .join('');

        document.getElementById('fcfTotalStudents').textContent = entries.length;
        document.getElementById('fcfTotalAmount').textContent = '\u20B9' + totalAmount.toLocaleString();
        document.getElementById('fcfExecuteBtn').disabled = false;
        window._fcfData = { fromSession, toSession, entries };

        showToast(`Found ${entries.length} students with outstanding dues`, 'success');
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function fcfExecute() {
    if (!window._fcfData) {
        showToast('Please preview first', 'warning');
        return;
    }
    if (!confirm('Carry forward outstanding fees to the new session? This will create new fee records.')) return;

    const { fromSession, toSession, entries } = window._fcfData;

    try {
        showLoading(true);
        let count = 0;
        for (const [sid, data] of entries) {
            await schoolData('fees').add(
                withSchool({
                    studentId: sid,
                    studentName: data.name,
                    className: data.class,
                    sessionId: toSession,
                    feeType: 'Carry Forward',
                    amount: data.dues,
                    paidAmount: 0,
                    discount: 0,
                    status: 'pending',
                    carryForwardedFrom: fromSession,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                })
            );
            count++;
        }
        showToast(`Carried forward ${count} fee records to new session`, 'success');
        document.getElementById('fcfExecuteBtn').disabled = true;
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function initBulkDiscountModule() {
    const el = document.getElementById('bfdSession');
    if (!el) return;
    const snap = await schoolData('sessions').orderBy('name', 'desc').get();
    el.innerHTML =
        '<option value="">Select Session</option>' +
        snap.docs.map((d) => `<option value="${d.id}">${d.data().name}</option>`).join('');
}

async function initSendFeeMessageModule() {
    const el = document.getElementById('sfmSession');
    if (!el) return;
    const snap = await schoolData('sessions').orderBy('name', 'desc').get();
    el.innerHTML =
        '<option value="">Select Session</option>' +
        snap.docs.map((d) => `<option value="${d.id}">${d.data().name}</option>`).join('');
}

async function initFeeCarryForwardModule() {
    const fromEl = document.getElementById('fcfFromSession');
    const toEl = document.getElementById('fcfToSession');
    if (!fromEl || !toEl) return;
    const snap = await schoolData('sessions').orderBy('name', 'desc').get();
    const html =
        '<option value="">Select Session</option>' +
        snap.docs.map((d) => `<option value="${d.id}">${d.data().name}</option>`).join('');
    fromEl.innerHTML = html;
    toEl.innerHTML = html;
}

// ==================== THREE-MODE FEE PAYMENT ====================
let fpState = { mode: 'session', students: [] };

function toggleFeePaymentMode(mode) {
    fpState.mode = mode;
    const classContainer = document.getElementById('fpClassContainer');
    const studentContainer = document.getElementById('fpStudentContainer');

    if (mode === 'session') {
        classContainer.querySelector('label').textContent = 'Class (Optional)';
        document.getElementById('fpClass').innerHTML = '<option value="">All Classes</option>';
        studentContainer.classList.add('hidden');
    } else if (mode === 'class') {
        classContainer.querySelector('label').textContent = 'Class *';
        studentContainer.classList.add('hidden');
    } else if (mode === 'particular') {
        classContainer.querySelector('label').textContent = 'Class *';
        studentContainer.classList.remove('hidden');
    }

    if (typeof fpLoadClasses === 'function') fpLoadClasses();
    fpUpdateSummary();
}

async function fpLoadClasses() {
    const sessionId = document.getElementById('fpSession').value;
    const classEl = document.getElementById('fpClass');
    if (!sessionId) return;

    const keepFirst =
        fpState.mode === 'session' ? '<option value="">All Classes</option>' : '<option value="">Select Class</option>';
    classEl.innerHTML = keepFirst;

    const snap = await schoolData('classes').where('sessionId', '==', sessionId).orderBy('sortOrder').get();
    snap.docs
        .filter((c) => !c.data().disabled)
        .forEach((c) => {
            const opt = document.createElement('option');
            opt.value = c.data().name;
            opt.textContent = c.data().name;
            classEl.appendChild(opt);
        });
}

async function fpLoadStudents() {
    const className = document.getElementById('fpClass').value;
    const studentEl = document.getElementById('fpStudent');
    studentEl.innerHTML = '<option value="">Select Student</option>';

    if (!className) {
        fpState.students = [];
        fpUpdateSummary();
        return;
    }

    const snap = await schoolData('students')
        .where('currentClass', '==', className)
        .where('status', '==', 'Active')
        .get();
    fpState.students = [];
    snap.forEach((d) => fpState.students.push({ id: d.id, ...d.data() }));
    fpState.students.sort((a, b) => (a.roll_no || '').localeCompare(b.roll_no || ''));

    fpState.students.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.student_id || s.id;
        opt.textContent = `${s.name} [${s.roll_no || '-'}]`;
        studentEl.appendChild(opt);
    });

    fpUpdateSummary();
}

async function fpUpdateSummary() {
    const mode = fpState.mode;
    const sessionId = document.getElementById('fpSession').value;
    const className = document.getElementById('fpClass').value;
    const studentId = document.getElementById('fpStudent').value;
    const amount = parseFloat(document.getElementById('fpAmount')?.value) || 0;

    let count = 0;

    if (mode === 'session' && sessionId) {
        if (className) {
            count = fpState.students.length || 0;
        } else {
            const snap = await schoolData('students')
                .where('session', '==', sessionId)
                .where('status', '==', 'Active')
                .get();
            count = snap.size;
        }
    } else if (mode === 'class' && className) {
        count = fpState.students.length || 0;
    } else if (mode === 'particular' && studentId) {
        count = 1;
    }

    document.getElementById('fpStudentCount').textContent = count;
    document.getElementById('fpTotalAmount').textContent = '\u20B9' + (count * amount).toLocaleString();
}

async function createFeePayments() {
    const mode = fpState.mode;
    const sessionId = document.getElementById('fpSession').value;
    const className = document.getElementById('fpClass').value;
    const studentId = document.getElementById('fpStudent').value;
    const feeType = document.getElementById('fpFeeType').value;
    const amount = parseFloat(document.getElementById('fpAmount').value);
    const dueDate = document.getElementById('fpDueDate').value;
    const remarks = document.getElementById('fpRemarks').value;

    if (!sessionId) {
        showToast('Select a session', 'warning');
        return;
    }
    if (!feeType) {
        showToast('Select fee type', 'warning');
        return;
    }
    if (!amount || amount <= 0) {
        showToast('Enter valid amount', 'warning');
        return;
    }
    if (mode === 'class' && !className) {
        showToast('Select a class', 'warning');
        return;
    }
    if (mode === 'particular' && !studentId) {
        showToast('Select a student', 'warning');
        return;
    }

    try {
        setLoading(true);
        let students = [];

        if (mode === 'session') {
            let query = schoolData('students').where('session', '==', sessionId).where('status', '==', 'Active');
            if (className) query = query.where('currentClass', '==', className);
            const snap = await query.get();
            snap.forEach((d) => students.push({ id: d.id, ...d.data() }));
        } else if (mode === 'class') {
            students = fpState.students;
        } else if (mode === 'particular') {
            const s = fpState.students.find((s) => (s.student_id || s.id) === studentId);
            if (s) students = [s];
        }

        if (!students.length) {
            showToast('No students found', 'warning');
            setLoading(false);
            return;
        }

        let created = 0;
        for (const s of students) {
            await schoolData('fees').add(
                withSchool({
                    studentId: s.student_id || s.id,
                    studentName: s.name || '',
                    className: s.currentClass || className || '',
                    section: s.currentSection || '',
                    sessionId: sessionId,
                    feeType: feeType,
                    month: new Date().toLocaleString('en-US', { month: 'long' }),
                    year: new Date().getFullYear().toString(),
                    amount: amount,
                    paidAmount: 0,
                    discount: 0,
                    status: 'pending',
                    dueDate: dueDate || null,
                    remarks: remarks || '',
                    createdBy: firebase.auth().currentUser?.email || 'admin',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                })
            );
            created++;
        }

        await schoolData('audit_logs').add(
            withSchool({
                action: 'fee_payment_created',
                details: { mode, feeType, amount, studentCount: created, sessionId, className },
                performedBy: firebase.auth().currentUser?.email || 'admin',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            })
        );

        showToast(`Created ${created} fee records for ${feeType}`, 'success');

        // Reset form
        document.getElementById('fpAmount').value = '';
        document.getElementById('fpRemarks').value = '';
        fpUpdateSummary();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    } finally {
        setLoading(false);
    }
}

// Add event listener for amount changes
document.addEventListener('DOMContentLoaded', () => {
    const amountEl = document.getElementById('fpAmount');
    if (amountEl) amountEl.addEventListener('input', fpUpdateSummary);
});

// ==================== ENHANCED BULK DISCOUNT ====================
async function bfdLoadClasses() {
    const sessionId = document.getElementById('bfdSession').value;
    const classEl = document.getElementById('bfdClass');
    if (!sessionId || !classEl) return;

    const snap = await schoolData('classes').where('sessionId', '==', sessionId).orderBy('sortOrder').get();
    classEl.innerHTML =
        '<option value="">Select Class</option>' +
        snap.docs
            .filter((c) => !c.data().disabled)
            .map((c) => `<option value="${c.data().name}">${c.data().name}</option>`)
            .join('');
}

async function bfdLoadStudents() {
    const className = document.getElementById('bfdClass').value;
    if (!className) return;

    const section = document.getElementById('bfdSection').value;
    let query = schoolData('students').where('currentClass', '==', className).where('status', '==', 'Active');
    if (section) query = query.where('currentSection', '==', section);

    const snap = await query.get();
    const tbody = document.getElementById('bfdTableBody');

    if (snap.empty) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center p-4 text-muted">No students found</td></tr>';
        return;
    }

    const students = [];
    for (const doc of snap.docs) {
        const s = doc.data();
        const feeSnap = await schoolData('fees')
            .where('studentId', '==', s.student_id || doc.id)
            .get();
        let totalFee = 0,
            totalPaid = 0,
            lastDiscount = '-';
        feeSnap.docs.forEach((f) => {
            const fd = f.data();
            totalFee += fd.amount || 0;
            totalPaid += fd.paidAmount || 0;
            if (fd.discount > 0) lastDiscount = `\u20B9${fd.discount} (${fd.discountReason || 'N/A'})`;
        });
        students.push({ id: doc.id, ...s, totalFee, totalPaid, balance: totalFee - totalPaid, lastDiscount });
    }

    students.sort((a, b) => (a.roll_no || '').localeCompare(b.roll_no || ''));

    tbody.innerHTML = students
        .map(
            (s) => `
        <tr>
            <td><input type="checkbox" class="bfd-check" data-id="${s.id}" data-sid="${s.student_id || s.id}" data-balance="${s.balance}" onchange="bfdPreviewDiscount()"></td>
            <td>${s.roll_no || '-'}</td>
            <td>${s.name || '-'}</td>
            <td>${s.currentClass || '-'} / ${s.currentSection || '-'}</td>
            <td>\u20B9${s.totalFee.toLocaleString()}</td>
            <td>\u20B9${s.totalPaid.toLocaleString()}</td>
            <td class="${s.balance > 0 ? 'text-danger font-600' : 'text-success'}">\u20B9${s.balance.toLocaleString()}</td>
            <td class="text-xs">${s.lastDiscount}</td>
        </tr>
    `
        )
        .join('');
}

function bfdToggleAll() {
    const master = document.getElementById('bfdSelectAll');
    document.querySelectorAll('.bfd-check').forEach((cb) => (cb.checked = master.checked));
    bfdPreviewDiscount();
}

function bfdPreviewDiscount() {
    const checked = document.querySelectorAll('.bfd-check:checked');
    const type = document.getElementById('bfdType').value;
    const value = parseFloat(document.getElementById('bfdValue').value) || 0;

    let totalDiscount = 0;
    checked.forEach((cb) => {
        const balance = parseFloat(cb.dataset.balance) || 0;
        totalDiscount += type === 'fixed' ? Math.min(value, balance) : Math.round((balance * value) / 100);
    });

    document.getElementById('bfdPreviewCount').textContent = checked.length;
    document.getElementById('bfdPreviewAmount').textContent = '\u20B9' + totalDiscount.toLocaleString();
    document.getElementById('bfdPreviewBox').classList.toggle('hidden', checked.length === 0);
}

async function bfdApplyToSelected() {
    const checked = document.querySelectorAll('.bfd-check:checked');
    if (!checked.length) {
        showToast('No students selected', 'warning');
        return;
    }
    await _bfdApply([...checked.map((c) => ({ docId: c.dataset.id, studentId: c.dataset.sid }))]);
}

async function bfdApplyToAll() {
    const all = document.querySelectorAll('.bfd-check');
    if (!all.length) {
        showToast('No students loaded', 'warning');
        return;
    }
    await _bfdApply([...all.map((c) => ({ docId: c.dataset.id, studentId: c.dataset.sid }))]);
}

async function _bfdApply(students) {
    const type = document.getElementById('bfdType').value;
    const value = parseFloat(document.getElementById('bfdValue').value);
    const reason = document.getElementById('bfdReason').value.trim();

    if (!value || value <= 0) {
        showToast('Enter valid discount value', 'warning');
        return;
    }
    if (!reason) {
        showToast('Enter reason for discount', 'warning');
        return;
    }

    try {
        setLoading(true);
        let count = 0;
        let totalDiscounted = 0;

        for (const s of students) {
            const feeSnap = await schoolData('fees')
                .where('studentId', '==', s.studentId)
                .where('status', 'in', ['pending', 'partial'])
                .get();

            for (const feeDoc of feeSnap.docs) {
                const fee = feeDoc.data();
                const balance = (fee.amount || 0) - (fee.paidAmount || 0) - (fee.discount || 0);
                if (balance <= 0) continue;

                const discount = type === 'fixed' ? Math.min(value, balance) : Math.round((balance * value) / 100);
                await schoolDoc('fees', feeDoc.id).update({
                    discount: firebase.firestore.FieldValue.increment(discount),
                    discountReason: reason,
                    discountType: type,
                    discountValue: value,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
                totalDiscounted += discount;
                count++;
            }
        }

        // Audit trail
        await schoolData('audit_logs').add(
            withSchool({
                action: 'bulk_discount_applied',
                details: {
                    type,
                    value,
                    reason,
                    studentsAffected: students.length,
                    feesAffected: count,
                    totalDiscounted,
                },
                performedBy: firebase.auth().currentUser?.email || 'admin',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            })
        );

        showToast(`Discount applied: \u20B9${totalDiscounted.toLocaleString()} across ${count} fee records`, 'success');
        bfdLoadStudents();
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    } finally {
        setLoading(false);
    }
}

// Init functions
async function initFeePaymentModule() {
    const el = document.getElementById('fpSession');
    if (!el) return;
    const snap = await schoolData('sessions').orderBy('name', 'desc').get();
    el.innerHTML =
        '<option value="">Select Session</option>' +
        snap.docs
            .map((d) => `<option value="${d.id}" ${d.data().active ? 'selected' : ''}>${d.data().name}</option>`)
            .join('');
    // Auto-select active
    const active = snap.docs.find((d) => d.data().active);
    if (active) {
        el.value = active.id;
        fpLoadClasses();
    }
}

async function initBulkDiscountModule() {
    const el = document.getElementById('bfdSession');
    if (!el) return;
    const snap = await schoolData('sessions').orderBy('name', 'desc').get();
    el.innerHTML =
        '<option value="">Select Session</option>' +
        snap.docs.map((d) => `<option value="${d.id}">${d.data().name}</option>`).join('');
}

// Export to window
window.toggleFeePaymentMode = toggleFeePaymentMode;
window.fpLoadClasses = fpLoadClasses;
window.fpLoadStudents = fpLoadStudents;
window.fpUpdateSummary = fpUpdateSummary;
window.createFeePayments = createFeePayments;
window.bfdLoadClasses = bfdLoadClasses;
window.bfdLoadStudents = bfdLoadStudents;
window.bfdToggleAll = bfdToggleAll;
window.bfdPreviewDiscount = bfdPreviewDiscount;
window.bfdApplyToSelected = bfdApplyToSelected;
window.bfdApplyToAll = bfdApplyToAll;
window.initFeePaymentModule = initFeePaymentModule;
window.initBulkDiscountModule = initBulkDiscountModule;

window.sfmLoadClasses = sfmLoadClasses;
window.sfmLoadDues = sfmLoadDues;
window.sfmToggleAll = sfmToggleAll;
window.sfmSendToSelected = sfmSendToSelected;
window.sfmSendToAll = sfmSendToAll;
window.fcfPreview = fcfPreview;
window.fcfExecute = fcfExecute;
window.initSendFeeMessageModule = initSendFeeMessageModule;
window.initFeeCarryForwardModule = initFeeCarryForwardModule;
window.generateReceiptPDF = generateReceiptPDF;
window.printDemandFromCollection = printDemandFromCollection;

// ==================== DUAL SEARCH MODE ====================
function toggleFeeSearchMode(mode) {
    document.getElementById('feeCodeSearchMode').classList.toggle('hidden', mode !== 'code');
    document.getElementById('feeClassFilterMode').classList.toggle('hidden', mode !== 'class');
    document.getElementById('feeCollectorSid').value = '';
    document.getElementById('fcStudentQuickInfo').classList.add('hidden');
}

async function feeFilterLoadClasses() {
    const sessionId = document.getElementById('feeFilterSession').value;
    const classEl = document.getElementById('feeFilterClass');
    const studentEl = document.getElementById('feeFilterStudent');
    classEl.innerHTML = '<option value="">Select Class</option>';
    studentEl.innerHTML = '<option value="">Select Student</option>';
    if (!sessionId || typeof schoolData !== 'function') return;

    const snap = await schoolData('classes').where('sessionId', '==', sessionId).orderBy('sortOrder').get();
    snap.docs
        .filter((c) => !c.data().disabled)
        .forEach((c) => {
            const opt = document.createElement('option');
            opt.value = c.data().name;
            opt.textContent = c.data().name;
            classEl.appendChild(opt);
        });
}

async function feeFilterLoadStudents() {
    const className = document.getElementById('feeFilterClass').value;
    const studentEl = document.getElementById('feeFilterStudent');
    studentEl.innerHTML = '<option value="">Select Student</option>';
    if (!className) return;

    const snap = await schoolData('students')
        .where('currentClass', '==', className)
        .where('status', '==', 'Active')
        .get();
    const students = [];
    snap.forEach((d) => students.push({ id: d.id, ...d.data() }));
    students.sort((a, b) => (a.roll_no || '').localeCompare(b.roll_no || ''));

    students.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.student_id || s.id;
        opt.textContent = `${s.name} [${s.father_name || '-'}] [${s.roll_no || '-'}]`;
        studentEl.appendChild(opt);
    });
}

function feeFilterSelectStudent(studentId) {
    if (!studentId) return;
    document.getElementById('feeCollectorSid').value = studentId;
    if (typeof loadStudentFeeData === 'function') loadStudentFeeData(studentId);
}

let feeCodeSearchTimeout;
async function searchStudentByCode(query) {
    clearTimeout(feeCodeSearchTimeout);
    const resultsDiv = document.getElementById('feeCodeSearchResults');
    if (!query || query.length < 2) {
        resultsDiv.classList.add('hidden');
        return;
    }

    feeCodeSearchTimeout = setTimeout(async () => {
        const snap = await schoolData('students').where('status', '==', 'Active').limit(50).get();
        const q = query.toLowerCase();
        const matches = [];
        snap.forEach((d) => {
            const s = d.data();
            const searchText = [s.name, s.student_id, s.father_name, s.mobile, s.roll_no].join(' ').toLowerCase();
            if (searchText.includes(q)) matches.push({ id: d.id, ...s });
        });

        if (matches.length === 0) {
            resultsDiv.innerHTML = '<div class="search-result-item text-muted">No students found</div>';
        } else {
            resultsDiv.innerHTML = matches
                .slice(0, 10)
                .map(
                    (s) =>
                        `<div class="search-result-item" onclick="selectFeeCodeStudent('${s.student_id || s.id}', '${(s.name || '').replace(/'/g, "\\'")}')">
                    <b>${s.name}</b> <span class="text-muted">[${s.currentClass || '-'} / ${s.currentSection || '-'}]</span><br>
                    <small class="text-muted">Code: ${s.student_id || '-'} | Father: ${s.father_name || '-'} | ${s.mobile || '-'}</small>
                </div>`
                )
                .join('');
        }
        resultsDiv.classList.remove('hidden');
    }, 300);
}

function selectFeeCodeStudent(studentId, name) {
    document.getElementById('feeCollectorSid').value = studentId;
    document.getElementById('feeStudentCodeInput').value = name;
    document.getElementById('feeCodeSearchResults').classList.add('hidden');
    if (typeof loadStudentFeeData === 'function') loadStudentFeeData(studentId);
}

// ==================== PAYMENT MODALS ====================
function openDiscountModal(studentId, studentName, paymentId, currentBalance) {
    document.getElementById('discount_student_id').value = studentId;
    document.getElementById('discount_payment_id').value = paymentId || '';
    document.getElementById('discount_student_name').textContent = studentName;
    document.getElementById('discount_current_balance').textContent = '₹' + (currentBalance || 0).toLocaleString();
    document.getElementById('discount_amount').value = '';
    document.getElementById('discount_remarks').value = '';
    document.getElementById('discount_preview').textContent = '';
    document.getElementById('discountPaymentModal').classList.remove('hidden');
}

function toggleDiscountFields() {
    const type = document.getElementById('discount_type').value;
    const amountEl = document.getElementById('discount_amount');
    amountEl.placeholder = type === 'fixed' ? 'Enter amount in ₹' : 'Enter percentage (1-100)';
    amountEl.max = type === 'percent' ? '100' : '';
}

function closePaymentModal(type) {
    const modals = {
        discount: 'discountPaymentModal',
        delete: 'deletePaymentModal',
        bulkDelete: 'bulkDeleteModal',
        view: 'viewPaymentModal',
    };
    const el = document.getElementById(modals[type]);
    if (el) el.classList.add('hidden');
}

async function submitDiscountPayment(e) {
    e.preventDefault();
    const studentId = document.getElementById('discount_student_id').value;
    const type = document.getElementById('discount_type').value;
    const value = parseFloat(document.getElementById('discount_amount').value);
    const remarks = document.getElementById('discount_remarks').value.trim();

    if (!value || value <= 0) {
        showToast('Enter valid discount value', 'warning');
        return;
    }
    if (!remarks) {
        showToast('Enter reason for discount', 'warning');
        return;
    }

    try {
        setLoading(true);
        const feeSnap = await schoolData('fees')
            .where('studentId', '==', studentId)
            .where('status', 'in', ['pending', 'partial'])
            .get();
        let count = 0;

        for (const doc of feeSnap.docs) {
            const fee = doc.data();
            const balance = (fee.amount || 0) - (fee.paidAmount || 0) - (fee.discount || 0);
            if (balance <= 0) continue;

            const discount = type === 'fixed' ? Math.min(value, balance) : Math.round((balance * value) / 100);
            await schoolDoc('fees', doc.id).update({
                discount: firebase.firestore.FieldValue.increment(discount),
                discountReason: remarks,
                discountType: type,
                discountValue: value,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });

            // Audit trail
            await schoolData('audit_logs').add(
                withSchool({
                    action: 'discount_applied',
                    details: { studentId, feeId: doc.id, discount, type, value, remarks },
                    performedBy: firebase.auth().currentUser?.email || 'admin',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                })
            );
            count++;
        }

        showToast(`Discount applied to ${count} fee records`, 'success');
        closePaymentModal('discount');
        if (typeof loadStudentFeeData === 'function') loadStudentFeeData(studentId);
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    } finally {
        setLoading(false);
    }
}

function openDeleteModal(paymentId, receiptNo, amount, studentId, studentName) {
    document.getElementById('delete_payment_id').value = paymentId;
    document.getElementById('delete_student_id').value = studentId;
    document.getElementById('delete_receipt_no').textContent = receiptNo;
    document.getElementById('delete_payment_amount').textContent = '₹' + (amount || 0).toLocaleString();
    document.getElementById('delete_student_name').textContent = studentName;
    document.getElementById('delete_remarks').value = '';
    document.getElementById('deletePaymentModal').classList.remove('hidden');
}

async function confirmDeletePayment() {
    const paymentId = document.getElementById('delete_payment_id').value;
    const remarks = document.getElementById('delete_remarks').value.trim();
    if (!remarks) {
        showToast('Enter reason for removal', 'warning');
        return;
    }

    try {
        setLoading(true);
        await schoolDoc('feePayments', paymentId).update({
            deleted: true,
            deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
            deletedBy: firebase.auth().currentUser?.email || 'admin',
            deleteReason: remarks,
        });

        await schoolData('audit_logs').add(
            withSchool({
                action: 'payment_soft_deleted',
                details: { paymentId, remarks },
                performedBy: firebase.auth().currentUser?.email || 'admin',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            })
        );

        showToast('Payment removed (audit trail kept)', 'success');
        closePaymentModal('delete');
        const studentId = document.getElementById('delete_student_id').value;
        if (typeof loadStudentFeeData === 'function') loadStudentFeeData(studentId);
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    } finally {
        setLoading(false);
    }
}

function openBulkDeleteModal() {
    const checked = document.querySelectorAll('.fc-payment-check:checked');
    if (!checked.length) {
        showToast('No payments selected', 'warning');
        return;
    }

    let total = 0;
    const items = [];
    checked.forEach((cb) => {
        const amt = parseFloat(cb.dataset.amount) || 0;
        total += amt;
        items.push(
            `<div class="flex justify-between p-0-5 border-bottom"><span>${cb.dataset.receipt}</span><span>₹${amt.toLocaleString()}</span></div>`
        );
    });

    document.getElementById('bulk_delete_count').textContent = checked.length;
    document.getElementById('bulk_delete_total').textContent = '₹' + total.toLocaleString();
    document.getElementById('bulk_delete_list').innerHTML = items.join('');
    document.getElementById('bulk_delete_ids').value = Array.from(checked)
        .map((cb) => cb.dataset.id)
        .join(',');
    document.getElementById('bulk_delete_remarks').value = '';
    document.getElementById('bulkDeleteModal').classList.remove('hidden');
}

async function confirmBulkDelete() {
    const ids = document.getElementById('bulk_delete_ids').value.split(',');
    const remarks = document.getElementById('bulk_delete_remarks').value.trim();
    if (!remarks) {
        showToast('Enter reason', 'warning');
        return;
    }

    try {
        setLoading(true);
        for (const id of ids) {
            await schoolDoc('feePayments', id).update({
                deleted: true,
                deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
                deletedBy: firebase.auth().currentUser?.email || 'admin',
                deleteReason: remarks,
            });
        }

        await schoolData('audit_logs').add(
            withSchool({
                action: 'payment_bulk_deleted',
                details: { paymentIds: ids, count: ids.length, remarks },
                performedBy: firebase.auth().currentUser?.email || 'admin',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            })
        );

        showToast(`${ids.length} payments removed`, 'success');
        closePaymentModal('bulkDelete');
        location.reload();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    } finally {
        setLoading(false);
    }
}

function fcToggleAllPayments() {
    const master = document.getElementById('fcSelectAllPayments');
    document.querySelectorAll('.fc-payment-check').forEach((cb) => (cb.checked = master.checked));
    toggleBulkActions();
}

function toggleBulkActions() {
    const checked = document.querySelectorAll('.fc-payment-check:checked');
    const bar = document.getElementById('fcBulkActions');
    if (bar) bar.style.display = checked.length > 0 ? 'flex' : 'none';
}

async function loadFeePaymentForStudentCourse(paymentId) {
    document.getElementById('viewPaymentModal').classList.remove('hidden');
    const body = document.getElementById('viewPaymentBody');
    body.innerHTML =
        '<div class="text-center p-4"><i class="fas fa-spinner fa-spin"></i> Loading payment details...</div>';

    try {
        const doc = await schoolDoc('feePayments', paymentId).get();
        if (!doc.exists) {
            body.innerHTML = '<p class="text-center text-danger">Payment not found</p>';
            return;
        }

        const p = doc.data();
        const date = p.createdAt ? new Date(p.createdAt.seconds * 1000).toLocaleDateString() : 'N/A';
        const amount = p.amount || p.amountPaid || 0;

        let allocHtml = '';
        if (p.allocations && p.allocations.length) {
            allocHtml = `<table class="portal-table mt-1"><thead><tr><th>Fee Type</th><th>Month</th><th>Scheduled</th><th>Paid Now</th><th>Balance</th></tr></thead><tbody>
                ${p.allocations.map((a) => `<tr><td>${a.feeType || '-'}</td><td>${a.month || '-'}</td><td>₹${(a.scheduledAmount || 0).toLocaleString()}</td><td>₹${(a.paidAmount || 0).toLocaleString()}</td><td>₹${(a.balance || 0).toLocaleString()}</td></tr>`).join('')}
            </tbody></table>`;
        }

        body.innerHTML = `
            <div class="grid-2 gap-1 mb-1">
                <div class="glass-card p-1"><label class="text-xs text-muted">Receipt No</label><p class="font-bold">${p.receiptNo || '--'}</p></div>
                <div class="glass-card p-1"><label class="text-xs text-muted">Date</label><p class="font-bold">${date}</p></div>
                <div class="glass-card p-1"><label class="text-xs text-muted">Amount</label><p class="font-bold text-success">₹${amount.toLocaleString()}</p></div>
                <div class="glass-card p-1"><label class="text-xs text-muted">Mode</label><p class="font-bold">${p.paymentMode || 'Cash'}</p></div>
                <div class="glass-card p-1"><label class="text-xs text-muted">Student</label><p class="font-bold">${p.studentName || '--'}</p></div>
                <div class="glass-card p-1"><label class="text-xs text-muted">Reference</label><p class="font-bold">${p.reference || '--'}</p></div>
            </div>
            <h4 class="mt-1 mb-0-5"><i class="fas fa-list-ul"></i> Fee Allocations</h4>
            ${allocHtml || '<p class="text-muted">No allocation details</p>'}
            ${p.remarks ? `<div class="glass-card p-1 mt-1"><label class="text-xs text-muted">Remarks</label><p>${p.remarks}</p></div>` : ''}
        `;

        window._viewedPaymentId = paymentId;
    } catch (err) {
        body.innerHTML = `<p class="text-danger">Error: ${err.message}</p>`;
    }
}

window.toggleFeeSearchMode = toggleFeeSearchMode;
window.feeFilterLoadClasses = feeFilterLoadClasses;
window.feeFilterLoadStudents = feeFilterLoadStudents;
window.feeFilterSelectStudent = feeFilterSelectStudent;
window.searchStudentByCode = searchStudentByCode;
window.selectFeeCodeStudent = selectFeeCodeStudent;
window.openDiscountModal = openDiscountModal;
window.closePaymentModal = closePaymentModal;
window.submitDiscountPayment = submitDiscountPayment;
window.openDeleteModal = openDeleteModal;
window.confirmDeletePayment = confirmDeletePayment;
window.openBulkDeleteModal = openBulkDeleteModal;
window.confirmBulkDelete = confirmBulkDelete;
window.fcToggleAllPayments = fcToggleAllPayments;
window.loadFeePaymentForStudentCourse = loadFeePaymentForStudentCourse;
window.toggleBulkActions = toggleBulkActions;
window.toggleDiscountFields = toggleDiscountFields;
