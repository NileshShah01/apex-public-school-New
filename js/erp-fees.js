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
        // Legacy Search
        initSearchableSelect('feeSearchSidContainer', (s) => {
            document.getElementById('feeSearchSid').value = s.studentId || s.student_id;
            searchStudentFees();
        });

        // New Payment Collector Search
        initSearchableSelect('feeCollectorSidContainer', (s) => {
            document.getElementById('feeCollectorSid').value = s.studentId || s.student_id;
            loadStudentLedgerData(s.studentId || s.student_id);
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
                snap.docs.map((doc) => `<option value="${doc.data().name}">${doc.data().name}</option>`).join('');

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
            return;
        }

        const safeId = sclass.replace(/\s+/g, '_').toLowerCase();
        const amount = (window.feeStructure && window.feeStructure[safeId + '_monthly']) || 0;

        const batch = db.batch();
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
    resultsDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';

    try {
        const snap = await schoolData('fees').where('studentId', '==', sid).orderBy('year', 'desc').get();
        if (snap.empty) {
            resultsDiv.innerHTML = '<p>No fee records found for this student.</p>';
            return;
        }

        let html =
            '<table class="portal-table"><thead><tr><th>Month/Year</th><th>Amount</th><th>Paid</th><th>Status</th><th>Action</th></tr></thead><tbody>';
        snap.forEach((doc) => {
            const d = doc.data();
            const statusColor = d.status === 'paid' ? '#10b981' : d.status === 'partial' ? '#f59e0b' : '#ef4444';
            html += `<tr><td>${d.month} ${d.year}</td><td>₹${d.amount}</td><td>₹${d.paidAmount || 0}</td><td><span class="badge" style="background:${statusColor}; color:white;">${d.status}</span></td><td>${d.status !== 'paid' ? `<button onclick="openPaymentModal('${doc.id}', ${d.amount}, ${d.paidAmount || 0})" class="btn-portal btn-sm btn-primary">Pay</button>` : '<i class="fas fa-check-circle" style="color:#10b981;"></i>'}</td></tr>`;
        });
        html += '</tbody></table>';
        resultsDiv.innerHTML = html;
    } catch (e) {
        resultsDiv.innerHTML = `<p style="color:red;">Error: ${e.message}</p>`;
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
        console.error(e);
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
        const studentSnap = await schoolData('students').where('studentId', '==', sid).limit(1).get();
        if (studentSnap.empty) {
            ledgerTable.innerHTML = '<tr><td colspan="6" class="text-center">Not found.</td></tr>';
            return;
        }
        const s = studentSnap.docs[0].data();
        document.getElementById('fcStudentName').textContent = s.name;
        document.getElementById('fcStudentClassSection').textContent = `Class ${s.class}`;
        infoBox.style.display = 'block';

        const feeSnap = await schoolData('fees').where('studentId', '==', sid).get();
        let total = 0,
            paid = 0;
        ledgerTable.innerHTML = feeSnap.docs
            .map((doc) => {
                const f = doc.data();
                total += f.amount;
                paid += f.paidAmount || 0;
                return `<tr><td>${f.month}</td><td>${f.feeType || 'Fee'}</td><td>₹${f.amount}</td><td>₹${f.paidAmount || 0}</td><td>₹${f.amount - (f.paidAmount || 0)}</td><td>${f.status}</td></tr>`;
            })
            .join('');
        document.getElementById('fcTotalFee').textContent = `₹${total}`;
        document.getElementById('fcTotalPaid').textContent = `₹${paid}`;
        document.getElementById('fcTotalBalance').textContent = `₹${total - paid}`;
        activeStudentLedger = { sid, balance: total - paid };

        const paySnap = await schoolData('feePayments')
            .where('studentId', '==', sid)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        historyTable.innerHTML =
            paySnap.docs
                .map((doc) => {
                    const p = doc.data();
                    return `<tr><td>${p.receiptNo}</td><td>${new Date(p.createdAt.seconds * 1000).toLocaleDateString()}</td><td>₹${p.amount}</td><td>${p.paymentMode}</td><td><button onclick="printReceipt('${doc.id}')"><i class="fas fa-print"></i></button></td></tr>`;
                })
                .join('') || '<tr><td colspan="5">No history</td></tr>';
    } catch (e) {
        console.error(e);
    }
}

async function handleFeePayment(e) {
    e.preventDefault();
    if (!activeStudentLedger) return;
    const amount = parseFloat(document.getElementById('payAmount').value);
    const mode = document.getElementById('payMode').value;
    const receiptNo = 'R-' + Math.floor(Math.random() * 900000 + 100000);
    try {
        setLoading(true);
        const payRef = await schoolData('feePayments').add({
            studentId: activeStudentLedger.sid,
            amount,
            paymentMode: mode,
            receiptNo,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        const feeSnap = await schoolData('fees')
            .where('studentId', '==', activeStudentLedger.sid)
            .where('status', '!=', 'paid')
            .get();
        let rem = amount;
        const batch = db.batch();
        feeSnap.forEach((doc) => {
            if (rem <= 0) return;
            const f = doc.data();
            const due = f.amount - (f.paidAmount || 0);
            const pay = Math.min(rem, due);
            batch.update(schoolDoc('fees', doc.id), {
                paidAmount: (f.paidAmount || 0) + pay,
                status: f.paidAmount + pay >= f.amount ? 'paid' : 'partial',
            });
            rem -= pay;
        });
        await batch.commit();
        showToast('Payment Successful!');
        loadStudentLedgerData(activeStudentLedger.sid);
        printReceipt(payRef.id);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
}

// ===================== RECEIPT & WORDS =====================

async function printReceipt(pid) {
    try {
        setLoading(true);
        const pSnap = await schoolDoc('feePayments', pid).get();
        const p = pSnap.data();
        const sSnap = await schoolData('students').where('studentId', '==', p.studentId).limit(1).get();
        const s = sSnap.docs[0].data();
        const sch = (await db.collection('schools').doc(CURRENT_SCHOOL_ID).get()).data();

        document.getElementById('rtcSchoolName').textContent = sch.schoolName;
        document.getElementById('rtcName').textContent = s.name;
        document.getElementById('rtcNo').textContent = p.receiptNo;
        document.getElementById('rtcPaid').textContent = `₹${p.amount}`;
        document.getElementById('rtcAmountWords').textContent = numberToWords(p.amount) + ' Rupees Only';

        const area = document.getElementById('feeReceiptPrintTemplate');
        area.style.display = 'block';
        window.print();
        area.style.display = 'none';
    } catch (e) {
        console.error(e);
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
