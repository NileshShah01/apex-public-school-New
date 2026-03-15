// super-admin.js - Platform management logic for SNR World

document.addEventListener('DOMContentLoaded', () => {
    loadPlatformStats();
    loadSchoolsList();

    // Add School Form Listener
    document.getElementById('addSchoolForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await registerNewSchool();
    });
});

/**
 * Load global stats across all schools
 */
async function loadPlatformStats() {
    try {
        const schoolSnap = await db.collection('schools').get();
        const studentSnap = await db.collection('students').get();
        
        document.getElementById('countSchools').textContent = schoolSnap.size;
        document.getElementById('countStudents').textContent = studentSnap.size;
        
        const premiumCount = schoolSnap.docs.filter(d => d.data().stage >= 5).length;
        document.getElementById('countPremium').textContent = premiumCount;
    } catch (e) {
        console.error("Stats Error:", e);
    }
}

/**
 * Load the list of provisioned schools
 */
async function loadSchoolsList() {
    const tableBody = document.getElementById('schoolTableBody');
    if (!tableBody) return;

    try {
        const snapshot = await db.collection('schools').orderBy('createdDate', 'desc').get();
        let html = '';

        snapshot.forEach(doc => {
            const school = doc.data();
            html += `
                <tr>
                    <td><code style="color:var(--super-primary); font-weight:700;">${school.schoolId}</code></td>
                    <td style="font-weight:600; color:white;">${school.schoolName}</td>
                    <td>${school.subdomain}.snredu.in</td>
                    <td><span class="badge badge-stage">Stage ${school.stage}</span></td>
                    <td><span class="badge badge-active">${school.status.toUpperCase()}</span></td>
                    <td style="text-align: right;">
                        <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
                            <button class="btn" style="padding:0.4rem 0.6rem; background:rgba(255,255,255,0.05);" onclick="editSchool('${school.schoolId}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn" style="padding:0.4rem 0.6rem; background:rgba(239, 68, 68, 0.1); color:#f87171;" onclick="toggleSchoolStatus('${school.schoolId}', '${school.status}')">
                                <i class="fas fa-power-off"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = html || '<tr><td colspan="6" style="text-align:center; padding:3rem; color:#94a3b8;">No schools found. Register your first school above.</td></tr>';
    } catch (e) {
        console.error("Load Schools Error:", e);
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#f87171;">Error loading database.</td></tr>';
    }
}

/**
 * Register a new school with auto-ID generation
 */
async function registerNewSchool() {
    const name = document.getElementById('schoolName').value;
    const subdomain = document.getElementById('subdomain').value.toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = document.getElementById('adminEmail').value;
    const stage = parseInt(document.getElementById('schoolStage').value);

    try {
        // 1. Generate Next School ID (SCH001, SCH002...)
        const snapshot = await db.collection('schools').get();
        const nextIdNum = snapshot.size + 1;
        const schoolId = "SCH" + String(nextIdNum).padStart(3, '0');

        // 2. Provision in Firestore
        await db.collection('schools').doc(schoolId).set({
            schoolId,
            schoolName: name,
            subdomain,
            adminEmail: email,
            stage,
            status: 'active',
            createdDate: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 3. Optional: Create initial settings for the school
        await db.collection('settings').doc(`general_${schoolId}`).set({
            schoolId,
            schoolName: name,
            schoolEmail: email,
            themePrimary: '#6366f1'
        });

        alert(`Successfully Commissioned: ${name}\nID: ${schoolId}\nURL: ${subdomain}.snredu.in`);
        
        // Reset and Close
        document.getElementById('addSchoolForm').reset();
        document.getElementById('schoolModal').style.display = 'none';
        
        // Refresh
        loadPlatformStats();
        loadSchoolsList();

    } catch (e) {
        alert("Provisioning Failed: " + e.message);
    }
}

/**
 * Toggle school status (Active/Suspended)
 */
async function toggleSchoolStatus(id, currentStatus) {
    if (!confirm(`Are you sure you want to ${currentStatus === 'active' ? 'SUSPEND' : 'ACTIVATE'} ${id}?`)) return;
    
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
        await db.collection('schools').doc(id).update({ status: newStatus });
        loadSchoolsList();
    } catch (e) {
        alert("Status Update Failed: " + e.message);
    }
}

/**
 * Placeholder for edit functionality
 */
function editSchool(id) {
    alert("Advanced School Editing (Module Selection) is coming in the next Phase of SNR World.");
}
