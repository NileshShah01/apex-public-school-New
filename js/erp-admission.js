/**
 * ERP ADMISSION ENQUIRY MODULE
 */

// db is provided globally by firebase-config.js

async function initERPAdmission() {
    console.log('Initializing ERP Admission...');
    await loadEnquiries();
}

async function saveEnquiry(event) {
    event.preventDefault();

    const data = {
        name: document.getElementById('enq_name').value,
        fatherName: document.getElementById('enq_father').value,
        mobile: document.getElementById('enq_mobile').value,
        classRequired: document.getElementById('enq_class').value,
        source: document.getElementById('enq_source').value,
        followupDate: document.getElementById('enq_followup').value,
        remarks: document.getElementById('enq_remarks').value,
        status: 'Open',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    try {
        setLoading(true);
        await schoolData('enquiries').add(withSchool(data));
        showToast('Enquiry Saved Successfully', 'success');
        document.getElementById('enquiryForm').reset();
        await loadEnquiries();
    } catch (e) {
        console.error(e);
        showToast('Failed to save enquiry', 'error');
    } finally {
        setLoading(false);
    }
}

async function loadEnquiries() {
    const body = document.getElementById('enquiryTableBody');
    if (!body) return;

    try {
        const snap = await schoolData('enquiries').orderBy('createdAt', 'desc').limit(50).get();
        if (snap.empty) {
            body.innerHTML = '<tr><td colspan="7" style="text-align:center;">No enquiries found.</td></tr>';
            return;
        }

        body.innerHTML = snap.docs
            .map((doc) => {
                const enq = doc.data();
                const date = enq.createdAt ? new Date(enq.createdAt.seconds * 1000).toLocaleDateString() : '-';
                return `
                <tr>
                    <td>${date}</td>
                    <td><strong>${enq.name}</strong><br><small>${enq.fatherName}</small></td>
                    <td>${enq.classRequired}</td>
                    <td>${enq.mobile}</td>
                    <td>${enq.followupDate || '-'}</td>
                    <td><span class="badge badge-${enq.status === 'Open' ? 'primary' : 'success'}">${enq.status}</span></td>
                    <td>
                        <button onclick="updateEnquiryStatus('${doc.id}', 'Closed')" class="btn-portal" style="padding:4px 8px; font-size:0.8rem;">Close</button>
                    </td>
                </tr>
            `;
            })
            .join('');
    } catch (e) {
        console.error(e);
    }
}

async function updateEnquiryStatus(id, status) {
    try {
        await schoolDoc('enquiries', id).update({ status });
        showToast('Enquiry Updated', 'success');
        await loadEnquiries();
    } catch (e) {
        console.error(e);
    }
}

// Global Exports
window.initERPAdmission = initERPAdmission;
window.saveEnquiry = saveEnquiry;
window.loadEnquiries = loadEnquiries;
window.updateEnquiryStatus = updateEnquiryStatus;
