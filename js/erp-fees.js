async function initERPFees() {
    console.log("ERP Fees Module Initialized");
    // Load fee structure from settings
    const doc = await db.collection('settings').doc('fees').get();
    if (doc.exists) {
        window.feeStructure = doc.data();
    }
    
    // Initialize Searchable Student Select for Payment Search
    if (typeof initSearchableSelect === 'function') {
        initSearchableSelect('feeSearchSidContainer', (s) => {
            document.getElementById('feeSearchSid').value = s.studentId || s.student_id;
            searchStudentFees();
        });
    }
}

async function handleMonthlyFeeGenerate(e) {
    e.preventDefault();
    const sclass = document.getElementById('genFeeClass').value;
    const month = document.getElementById('genFeeMonth').value; // format: 2026-03
    
    if (!sclass || !month) {
        showToast("Please select class and month", "error");
        return;
    }

    const [year, monthNum] = month.split('-');
    const monthName = new Date(year, monthNum - 1).toLocaleString('default', { month: 'long' });

    setLoading(true);
    try {
        // 1. Get all students of this class
        const studentsSnap = await db.collection('students').where('class', '==', sclass).get();
        if (studentsSnap.empty) {
            showToast("No students found in this class", "error");
            return;
        }

        // 2. Get fee amount for this class
        const safeId = sclass.replace(/\s+/g, '_').toLowerCase();
        const amount = (window.feeStructure && window.feeStructure[safeId + '_monthly']) || 0;

        const batch = db.batch();
        let count = 0;

        studentsSnap.forEach(doc => {
            const student = doc.data();
            const sid = student.studentId || student.student_id;
            const feeId = `${sid}_${month}`;
            
            const feeRef = db.collection('fees').doc(feeId);
            batch.set(feeRef, {
                studentId: sid,
                class: sclass,
                month: monthName,
                year: year,
                amount: amount,
                paidAmount: 0,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            count++;
        });

        await batch.commit();
        showToast(`Generated ${count} fee records for ${monthName} ${year}`);
    } catch (e) {
        showToast("Error generating fees: " + e.message, "error");
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
        const snap = await db.collection('fees').where('studentId', '==', sid).orderBy('year', 'desc').get();
        if (snap.empty) {
            resultsDiv.innerHTML = '<p>No fee records found for this student.</p>';
            return;
        }

        let html = '<table class="portal-table"><thead><tr><th>Month/Year</th><th>Amount</th><th>Paid</th><th>Status</th><th>Action</th></tr></thead><tbody>';
        snap.forEach(doc => {
            const d = doc.data();
            const statusColor = d.status === 'paid' ? '#10b981' : d.status === 'partial' ? '#f59e0b' : '#ef4444';
            html += `
                <tr>
                    <td>${d.month} ${d.year}</td>
                    <td>₹${d.amount}</td>
                    <td>₹${d.paidAmount || 0}</td>
                    <td><span class="badge" style="background:${statusColor}; color:white;">${d.status}</span></td>
                    <td>
                        ${d.status !== 'paid' ? `<button onclick="openPaymentModal('${doc.id}', ${d.amount}, ${d.paidAmount || 0})" class="btn-portal btn-sm btn-primary">Pay</button>` : '<i class="fas fa-check-circle" style="color:#10b981;"></i>'}
                    </td>
                </tr>`;
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
        <div class="form-group">
            <label>Amount to Pay (Due: ₹${due})</label>
            <input type="number" id="payAmountInput" value="${due}" max="${due}" min="1">
        </div>
        <div class="form-group">
            <label>Payment Method</label>
            <select id="payMethodInput">
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / Online</option>
                <option value="Bank">Bank Transfer</option>
            </select>
        </div>
        <button onclick="submitFeePayment('${feeId}', ${total}, ${paid})" class="btn-portal btn-primary" style="width:100%;">Confirm Payment</button>
    `;
    
    // Check if openCmsModal exists (from cms-admin.js) or implement local modal
    if (typeof openCmsModal === 'function') {
        document.getElementById('cmsModalTitle').textContent = "Process Payment";
        document.getElementById('cmsModalBody').innerHTML = html;
        document.getElementById('cmsModal').style.display = 'block';
    } else {
        alert("Modal system not found. Payment cannot be processed.");
    }
}

async function submitFeePayment(feeId, total, previouslyPaid) {
    const amountToPay = parseInt(document.getElementById('payAmountInput').value);
    const method = document.getElementById('payMethodInput').value;

    if (isNaN(amountToPay) || amountToPay <= 0) {
        showToast("Invalid amount", "error");
        return;
    }

    const newPaidAmount = previouslyPaid + amountToPay;
    const status = newPaidAmount >= total ? 'paid' : 'partial';

    setLoading(true);
    try {
        await db.collection('fees').doc(feeId).update({
            paidAmount: newPaidAmount,
            status: status,
            paymentDate: firebase.firestore.FieldValue.serverTimestamp(),
            lastPaymentMethod: method
        });

        // Log payment in separate 'payments' collection for history
        await db.collection('payments').add({
            feeId,
            amount: amountToPay,
            method,
            date: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast("Payment recorded successfully!");
        if (typeof closeCmsModal === 'function') closeCmsModal();
        searchStudentFees(); // Refresh list
    } catch (e) {
        showToast("Payment failed: " + e.message, "error");
    } finally {
        setLoading(false);
    }
}
