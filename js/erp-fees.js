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
                    discount: 0
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
    resultsDiv.innerHTML = '<div class="p-4 text-center"><i class="fas fa-spinner fa-spin"></i> Fetching lifecycle data...</div>';

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
    } catch (e) {
    }
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
        ledgerTable.innerHTML = data.ledger.length > 0 
            ? data.ledger.map(f => `
                <tr>
                    <td class="whitespace-nowrap">${f.month} ${f.year}</td>
                    <td class="font-semibold">${f.feeType || 'Tuition Fee'}</td>
                    <td>${f.frequency || 'Monthly'}</td>
                    <td>${f.dueDate || '--'}</td>
                    <td class="font-bold">₹${f.amount}</td>
                    <td class="text-emerald-500">₹${f.paidAmount || 0}</td>
                    <td class="text-rose-500">₹${f.amount - (f.paidAmount || 0)}</td>
                    <td><span class="badge" style="background: ${f.status==='paid'?'#10b981':f.status==='partial'?'#f59e0b':'#ef4444'}">${f.status}</span></td>
                </tr>`).join('')
            : '<tr><td colspan="8" class="text-center p-8 text-slate-500">No fee records found for this student.</td></tr>';

        // 4. Render History
        historyTable.innerHTML = data.history.length > 0
            ? data.history.map(p => `
                <tr>
                    <td>${p.receiptNo}</td>
                    <td>${p.createdAt ? new Date(p.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
                    <td>₹${p.amount}</td>
                    <td>${p.paymentMode}</td>
                    <td><button onclick="printReceipt('${p.id}')" class="btn-icon"><i class="fas fa-print"></i></button></td>
                </tr>`).join('')
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
    if(e) e.preventDefault();
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
            remarks: remarks
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
        const pSnap = await schoolDoc('feePayments', pid).get();
        if (!pSnap.exists) throw new Error("Payment record not found");
        const p = pSnap.data();
        
        const sSnap = await schoolData('students').where('studentId', '==', p.studentId).limit(1).get();
        if (sSnap.empty) throw new Error("Student record not found");
        const s = sSnap.docs[0].data();
        
        const schSnap = await schoolRef().get();
        const sch = schSnap.exists ? schSnap.data() : {};

        // Populate School Info
        document.getElementById('rtcSchoolName').textContent = sch.schoolName || 'Our School';
        document.getElementById('rtcSchoolAddress').textContent = sch.address || 'School Address Not Set';
        document.getElementById('rtcSchoolContact').textContent = `Contact: ${sch.phone || '--'} | ${sch.email || '--'}`;
        
        // Populate Receipt Meta
        document.getElementById('rtcNo').textContent = p.receiptNo || pid.substring(0,8).toUpperCase();
        document.getElementById('rtcDate').textContent = p.createdAt ? new Date(p.createdAt.seconds * 1000).toLocaleDateString() : '--/--/----';
        document.getElementById('rtcSession').textContent = p.session || '2023-24';
        document.getElementById('rtcPayId').textContent = pid;
        document.getElementById('rtcMode').textContent = p.paymentMode || 'Cash';
        
        // Populate Student Info
        document.getElementById('rtcName').textContent = s.name;
        document.getElementById('rtcClass').textContent = `Class ${s.class || '--'} ${s.section || ''}`;
        document.getElementById('rtcAdm').textContent = s.studentId || s.student_id;
        document.getElementById('rtcFName').textContent = s.fatherName || '--';
        if (document.getElementById('rtcRoll')) document.getElementById('rtcRoll').textContent = s.rollNo || '--';
        
        // Populate Table (Itemized Allocations)
        const tableBody = document.getElementById('rtcTableBody');
        const allocations = p.allocations || [];
        
        if (allocations.length > 0) {
            tableBody.innerHTML = allocations.map((alt, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${alt.feeType} - ${alt.month} ${alt.year}</td>
                    <td style="text-align: right;">₹${alt.amount}</td>
                    <td style="text-align: right;">₹0</td>
                    <td style="text-align: right;">₹${alt.remainingAfter + alt.paidNow}</td>
                    <td style="text-align: right; font-weight: bold;">₹${alt.paidNow}</td>
                </tr>
            `).join('');
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td>1</td>
                    <td>School Fee Payment (Towards Outstanding Dues)</td>
                    <td style="text-align: right;">₹${p.amount}</td>
                    <td style="text-align: right;">₹0</td>
                    <td style="text-align: right;">₹${p.amount}</td>
                    <td style="text-align: right; font-weight: bold;">₹${p.amount}</td>
                </tr>
            `;
        }
        
        // Totals & Footer Info
        const currentBalance = (window.activeStudentLedger && window.activeStudentLedger.balance) || 0;
        document.getElementById('rtcTotalFee').textContent = `₹${p.amount}`;
        document.getElementById('rtcPaid').textContent = `₹${p.amount}`;
        document.getElementById('rtcAmountWords').textContent = numberToWords(p.amount) + ' Rupees Only';
        document.getElementById('rtcRemarks').textContent = p.remarks || 'Payment received with thanks.';
        document.getElementById('rtcTime').textContent = p.createdAt ? new Date(p.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
        
        // Match competitor's data points
        if (document.getElementById('rtcCurrentDues')) document.getElementById('rtcCurrentDues').textContent = `₹${currentBalance}`;
        if (document.getElementById('rtcReceivedAmount')) document.getElementById('rtcReceivedAmount').textContent = `₹${p.amount}`;

        const area = document.getElementById('feeReceiptPrintTemplate');
        area.classList.remove('hidden');
        area.style.display = 'block';
        
        setTimeout(() => {
            window.print();
            area.style.display = 'none';
            area.classList.add('hidden');
        }, 500);

    } catch (e) {
        console.error(pId, e);
        showToast("Error printing receipt: " + e.message, "error");
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

        studentsSnap.forEach(doc => {
            const sid = doc.data().studentId || doc.data().student_id;
            const feeId = `${sid}_EXTRA_${Date.now()}_${Math.floor(Math.random()*1000)}`;
            const feeRef = schoolDoc('fees', feeId);
            
            batch.set(feeRef, withSchool({
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
                discount: 0
            }));
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
        await schoolData('fineRules').add(withSchool({
            name, graceDays: grace, fineType: type, amount, active: true
        }));
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
        tbody.innerHTML = snap.docs.map(doc => {
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
        }).join('');
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
