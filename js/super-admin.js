// super-admin.js - Advanced Platform Management for SNR World

let allSchools = []; // Local cache for filtering

document.addEventListener('DOMContentLoaded', async () => {
    showOverlay(true);

    // 1. Auth Guard (Strict)
    const isAuthorized = await checkSuperAdminAuth();
    if (!isAuthorized) {
        window.location.href = 'admin-login.html';
        return;
    }

    // 2. Initial Data Load
    await refreshDashboard();

    // 3. Event Listeners
    document.getElementById('addSchoolForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await registerNewSchool();
    });

    document.getElementById('editSchoolForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateSchool();
    });

    showOverlay(false);
});

/**
 * Authentication Guard for Super Admin
 */
async function checkSuperAdminAuth() {
    return new Promise((resolve) => {
        auth.onAuthStateChanged((user) => {
            // Only allow nileshshah84870@gmail.com
            if (user && user.email === 'nileshshah84870@gmail.com') {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

/**
 * Refresh all dashboard data
 */
async function refreshDashboard() {
    await loadPlatformStats();
    await loadSchoolsList();
    await loadActivityLog();
}

/**
 * Load global stats
 */
async function loadPlatformStats() {
    try {
        const schoolSnap = await db.collection('schools').get();
        const studentSnap = await db.collection('students').get();

        document.getElementById('countSchools').textContent = schoolSnap.size;
        document.getElementById('countStudents').textContent = studentSnap.size;

        const premiumCount = schoolSnap.docs.filter((d) => d.data().stage >= 5).length;
        document.getElementById('countPremium').textContent = premiumCount;
    } catch (e) {
        console.error('Stats Error:', e);
    }
}

/**
 * Load and render schools
 */
async function loadSchoolsList() {
    const tableBody = document.getElementById('schoolTableBody');
    if (!tableBody) return;

    try {
        const snapshot = await db.collection('schools').orderBy('schoolId', 'asc').get();
        allSchools = snapshot.docs.map((doc) => doc.data());
        renderSchools(allSchools);
    } catch (e) {
        console.error('Load Schools Error:', e);
        tableBody.innerHTML =
            '<tr><td colspan="6" style="text-align:center; color:#f87171;">Error access database.</td></tr>';
    }
}

function renderSchools(schools) {
    const tableBody = document.getElementById('schoolTableBody');
    let html = '';

    schools.forEach((school) => {
        html += `
            <tr>
                <td><code style="color:var(--super-primary); font-weight:700;">${school.schoolId}</code></td>
                <td style="font-weight:600; color:white;">${school.schoolName}</td>
                <td>${school.subdomain}.snredu.in</td>
                <td><span class="badge badge-stage">Stage ${school.stage}</span></td>
                <td><span class="badge badge-active" style="background:${school.status === 'active' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}; color:${school.status === 'active' ? '#34d399' : '#f87171'}; border:1px solid ${school.status === 'active' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}">${school.status.toUpperCase()}</span></td>
                <td style="text-align: right;">
                    <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
                        <button class="btn" style="padding:0.4rem 0.6rem; background:rgba(255,255,255,0.05);" onclick="openEditModal('${school.schoolId}')" title="Edit School">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn" style="padding:0.4rem 0.6rem; background:${school.status === 'active' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'}; color:${school.status === 'active' ? '#f87171' : '#10b981'};" onclick="toggleSchoolStatus('${school.schoolId}', '${school.status}')" title="${school.status === 'active' ? 'Suspend' : 'Activate'}">
                            <i class="fas ${school.status === 'active' ? 'fa-power-off' : 'fa-play'}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    tableBody.innerHTML =
        html ||
        '<tr><td colspan="6" style="text-align:center; padding:3rem; color:#94a3b8;">No schools matching search.</td></tr>';
}

/**
 * Real-time Search Filter
 */
function filterSchools() {
    const term = document.getElementById('schoolSearch').value.toLowerCase();
    const filtered = allSchools.filter(
        (s) =>
            s.schoolName.toLowerCase().includes(term) ||
            s.schoolId.toLowerCase().includes(term) ||
            s.subdomain.toLowerCase().includes(term)
    );
    renderSchools(filtered);
}

/**
 * Register New School
 */
async function registerNewSchool() {
    const name = document.getElementById('schoolName').value;
    const subdomain = document
        .getElementById('subdomain')
        .value.toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    const email = document.getElementById('adminEmail').value;
    const stage = parseInt(document.getElementById('schoolStage').value);

    const logo = document.getElementById('schoolLogo').value;
    const password = document.getElementById('adminPassword').value;

    try {
        showOverlay(true);
        const snapshot = await db.collection('schools').get();
        const nextIdNum = snapshot.size + 1;
        const schoolId = 'SCH' + String(nextIdNum).padStart(3, '0');

        // 1. Create School Record
        await db.collection('schools').doc(schoolId).set({
            schoolId,
            schoolName: name,
            subdomain,
            adminEmail: email,
            stage,
            status: 'active',
            logoUrl: logo,
            initialPass: password, // For manual setup reference
            createdDate: firebase.firestore.FieldValue.serverTimestamp(),
        });

        // 2. Initialize School Settings (Provisioning)
        await db.collection('schools').doc(schoolId).collection('settings').doc('theme').set({
            logoUrl: logo,
            schoolName: name,
            primaryColor: '#0f172a',
            sidebarColor: '#1e293b',
            updatedBy: 'System',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await logActivity('COMMISSION', `Registered new school: ${name} (${schoolId})`);

        showToast(`Provisioned: ${name}`, 'success');
        document.getElementById('addSchoolForm').reset();
        closeModal('schoolModal');
        await refreshDashboard();
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        showOverlay(false);
    }
}

/**
 * Edit Logic
 */
async function openEditModal(id) {
    const school = allSchools.find((s) => s.schoolId === id);
    if (!school) return;

    document.getElementById('editSchoolId').value = school.schoolId;
    document.getElementById('editSchoolName').value = school.schoolName;
    document.getElementById('editSubdomain').value = school.subdomain;
    document.getElementById('editSchoolStage').value = school.stage;

    document.getElementById('editSchoolModal').style.display = 'flex';
}

async function updateSchool() {
    const id = document.getElementById('editSchoolId').value;
    const name = document.getElementById('editSchoolName').value;
    const subdomain = document.getElementById('editSubdomain').value;
    const stage = parseInt(document.getElementById('editSchoolStage').value);

    try {
        showOverlay(true);
        await db.collection('schools').doc(id).update({
            schoolName: name,
            subdomain,
            stage,
            lastModified: firebase.firestore.FieldValue.serverTimestamp(),
        });

        await logActivity('UPDATE', `Updated school info for ${name} (${id})`);
        showToast('School updated successfully', 'success');
        closeModal('editSchoolModal');
        await refreshDashboard();
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        showOverlay(false);
    }
}

/**
 * Status Toggle
 */
async function toggleSchoolStatus(id, currentStatus) {
    const action = currentStatus === 'active' ? 'SUSPEND' : 'ACTIVATE';
    if (!confirm(`Are you sure you want to ${action} ${id}?`)) return;

    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
        showOverlay(true);
        await db.collection('schools').doc(id).update({ status: newStatus });
        await logActivity('STATUS_CHANGE', `${action} school ID: ${id}`);
        await refreshDashboard();
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        showOverlay(false);
    }
}

/**
 * Activity Logging
 */
async function logActivity(type, detail) {
    try {
        await db.collection('logs_super').add({
            type,
            detail,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            admin: auth.currentUser?.email || 'System',
        });
    } catch (e) {
        console.warn('Log failed:', e);
    }
}

async function loadActivityLog() {
    const container = document.getElementById('activityLog');
    if (!container) return;

    try {
        const snap = await db.collection('logs_super').orderBy('timestamp', 'desc').limit(10).get();
        if (snap.empty) {
            container.innerHTML = '<p style="color:#64748b; text-align:center;">No recent activity.</p>';
            return;
        }

        container.innerHTML = snap.docs
            .map((doc) => {
                const log = doc.data();
                const time = log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString() : 'Just now';
                return `
                <div style="background: rgba(255,255,255,0.03); padding: 0.75rem 1rem; border-radius: 0.5rem; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; gap: 1rem; align-items: center;">
                        <span class="badge" style="background: rgba(99,102,241,0.1); color: #818cf8; width: 80px; text-align: center;">${log.type}</span>
                        <span style="font-size: 0.9rem;">${log.detail}</span>
                    </div>
                    <span style="font-size: 0.75rem; color: #64748b;">${time}</span>
                </div>
            `;
            })
            .join('');
    } catch (e) {
        console.error(e);
    }
}

/**
 * Global UI Helpers
 */
function showOverlay(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}
function openModal(id) {
    document.getElementById(id).style.display = 'flex';
}
function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}
function showToast(msg, type) {
    // Reusing existing toast logic if available, or simple alert
    if (typeof showToastGlobal === 'function') {
        showToastGlobal(msg, type);
    } else {
        alert(msg);
    }
}

// Global Exports
window.filterSchools = filterSchools;
window.openEditModal = openEditModal;
window.toggleSchoolStatus = toggleSchoolStatus;
window.openModal = openModal;
window.closeModal = closeModal;
