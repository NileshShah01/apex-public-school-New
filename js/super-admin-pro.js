/**
 * Super Admin Pro - Platform Logic
 * Powers the SNR World Control Tower
 */

let allSchools = [];
let growthChart = null;

const STAGES = [
    { name: "Static Website", id: 1, desc: "Basic online presence with essential school information." },
    { name: "CMS Admin Panel", id: 2, desc: "Full control over website content via a dedicated admin panel." },
    { name: "Student Dashboard", id: 3, desc: "Personalized dashboards for students to track progress." },
    { name: "ERP Tools", id: 4, desc: "Advanced administrative tools for school operations." },
    { name: "Custom Tools", id: 5, desc: "Custom-built specialized tools for unique requirements." },
    { name: "Full ERP Suite", id: 6, desc: "The ultimate ERP solution for complete school management." }
];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auth Guard
    const authorized = await checkSuperAdminAuth();
    if (!authorized) {
        window.location.href = 'admin-login.html';
        return;
    }

    // 2. Initialize UI
    lucide.createIcons();
    initTabNavigation();
    initCharts();
    
    // 3. Data Sync
    await refreshData();

    // 4. Form Listeners
    document.getElementById('proAddSchoolForm')?.addEventListener('submit', handleAddSchool);
    document.getElementById('editSchoolForm')?.addEventListener('submit', handleUpdateSchool);
    document.getElementById('schoolFilter')?.addEventListener('keyup', (e) => filterSchools(e.target.value));

    hideOverlay();
});

/**
 * Authentication check
 */
async function checkSuperAdminAuth() {
    return new Promise((resolve) => {
        auth.onAuthStateChanged((user) => {
            if (user && user.email === 'nileshshah84870@gmail.com') {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

/**
 * Tab Navigation
 */
function initTabNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    // Update Sidebar
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.remove('nav-active', 'text-white');
        b.classList.add('text-slate-400');
        const icon = b.querySelector('i');
        if (icon) icon.classList.remove('text-blue-500');
    });

    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('nav-active', 'text-white');
        activeBtn.classList.remove('text-slate-400');
        const icon = activeBtn.querySelector('i');
        if (icon) icon.classList.add('text-blue-500');
    }

    // Update View
    document.querySelectorAll('.section-view').forEach(v => v.classList.remove('section-active'));
    
    // Handle mapping for IDs with spaces
    const targetId = `view-${tabName.replace(/\s+/g, '-')}`;
    const targetView = document.getElementById(targetId);
    if (targetView) targetView.classList.add('section-active');

    // Trigger specific view logic
    if (tabName === 'Stages') renderStagesGrid();
    if (tabName === 'Logs') loadActivityLog();
}

/**
 * Charts Initialization
 */
function initCharts() {
    const ctx = document.getElementById('growthChart').getContext('2d');
    
    // Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

    growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Student Enrollment',
                data: [45000, 52000, 48000, 61000, 75000, 82000],
                borderColor: '#3b82f6',
                borderWidth: 3,
                fill: true,
                backgroundColor: gradient,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#fff',
                pointBorderWidth: 2,
                pointBorderColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

/**
 * Data Refresh
 */
async function refreshData() {
    await loadStats();
    await loadSchools();
}

async function loadStats() {
    try {
        const schools = await db.collection('schools').get();
        const students = await db.collection('students').get();
        
        document.getElementById('stat-totalSchools').innerText = schools.size;
        document.getElementById('stat-totalStudents').innerText = (students.size / 1000).toFixed(1) + 'k';
        document.getElementById('stat-activeSchools').innerText = schools.docs.filter(d => d.data().status === 'active').length;
        document.getElementById('stat-premiumSchools').innerText = schools.docs.filter(d => d.data().stage >= 5).length;
    } catch (e) {
        console.error("Stats Error:", e);
    }
}

async function loadSchools() {
    const tableBody = document.getElementById('schoolProTableBody');
    if (!tableBody) return;

    try {
        const snap = await db.collection('schools').orderBy('createdDate', 'desc').get();
        allSchools = snap.docs.map(doc => doc.data());
        renderSchoolsTable(allSchools);
    } catch (e) {
        console.error("Load Schools Error:", e);
    }
}

function renderSchoolsTable(schools) {
    const body = document.getElementById('schoolProTableBody');
    body.innerHTML = schools.map(s => `
        <tr class="group hover:bg-white/5 transition-all">
            <td class="py-4 text-sm font-mono text-blue-400">${s.schoolId}</td>
            <td class="py-4 text-sm font-semibold text-white">${s.schoolName}</td>
            <td class="py-4 text-sm text-slate-400 font-mono">${s.subdomain}.snredu.in</td>
            <td class="py-4"><span class="badge-stage">Stage ${s.stage}</span></td>
            <td class="py-4 text-sm text-slate-300">-</td>
            <td class="py-4">
                <div class="flex items-center gap-2">
                    <div class="w-1.5 h-1.5 rounded-full ${s.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}"></div>
                    <span class="text-sm text-slate-300 font-medium">${s.status.toUpperCase()}</span>
                </div>
            </td>
            <td class="py-4 text-right">
                <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="openProEditModal('${s.schoolId}')" class="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white">
                        <i data-lucide="settings" class="w-4 h-4"></i>
                    </button>
                    <button onclick="toggleSchoolStatus('${s.schoolId}', '${s.status}')" class="p-2 hover:bg-white/10 rounded-lg ${s.status === 'active' ? 'text-red-400' : 'text-emerald-400'}">
                        <i data-lucide="${s.status === 'active' ? 'power' : 'play'}" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

/**
 * Filter Schools
 */
function filterSchools(term) {
    const filtered = allSchools.filter(s => 
        s.schoolName.toLowerCase().includes(term.toLowerCase()) || 
        s.schoolId.toLowerCase().includes(term.toLowerCase())
    );
    renderSchoolsTable(filtered);
}

/**
 * Add School
 */
async function handleAddSchool(e) {
    e.preventDefault();
    const name = document.getElementById('proSchoolName').value;
    const subdomain = document.getElementById('proSubdomain').value.toLowerCase().replace(/[^a-z0-9]/g, '');
    const stage = parseInt(document.getElementById('proSchoolStage').value);
    const email = document.getElementById('proAdminEmail').value;

    try {
        showOverlay(true);
        const schoolId = "SCH" + String(allSchools.length + 1).padStart(3, '0');

        await db.collection('schools').doc(schoolId).set({
            schoolId, schoolName: name, subdomain, 
            stage, adminEmail: email, status: 'active',
            createdDate: firebase.firestore.FieldValue.serverTimestamp()
        });

        await logSuperActivity("COMMISSION", `Provisioned new school: ${name}`);
        alert("School instance provisioned successfully!");
        e.target.reset();
        await refreshData();
        switchTab('Schools');
    } catch (e) {
        alert(e.message);
    } finally {
        showOverlay(false);
    }
}

/**
 * Edit School
 */
function openProEditModal(id) {
    const s = allSchools.find(sc => sc.schoolId === id);
    if (!s) return;

    document.getElementById('editSchoolId').value = s.schoolId;
    document.getElementById('editSchoolName').value = s.schoolName;
    document.getElementById('editSchoolStage').value = s.stage;
    
    document.getElementById('editModal').classList.remove('hidden');
    document.getElementById('editModal').classList.add('flex');
}

async function handleUpdateSchool(e) {
    e.preventDefault();
    const id = document.getElementById('editSchoolId').value;
    const name = document.getElementById('editSchoolName').value;
    const stage = parseInt(document.getElementById('editSchoolStage').value);

    try {
        showOverlay(true);
        await db.collection('schools').doc(id).update({ schoolName: name, stage });
        await logSuperActivity("UPDATE", `Modified school settings: ${id}`);
        closeModal('editModal');
        await refreshData();
    } catch (e) {
        alert(e.message);
    } finally {
        showOverlay(false);
    }
}

/**
 * Status Toggle
 */
async function toggleSchoolStatus(id, current) {
    const action = current === 'active' ? 'SUSPEND' : 'ACTIVATE';
    if (!confirm(`Are you sure you want to ${action} ${id}?`)) return;

    try {
        showOverlay(true);
        await db.collection('schools').doc(id).update({ status: current === 'active' ? 'suspended' : 'active' });
        await logSuperActivity("STATUS", `${action} school: ${id}`);
        await refreshData();
    } catch (e) {
        alert(e.message);
    } finally {
        showOverlay(false);
    }
}

/**
 * Stage Grid
 */
function renderStagesGrid() {
    const grid = document.getElementById('stagesGrid');
    grid.innerHTML = STAGES.map(s => `
        <div class="glass-card p-6 border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer">
            <div class="flex items-center gap-4 mb-4">
                <div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold">${s.id}</div>
                <div>
                    <h3 class="text-sm font-bold text-white uppercase">${s.name}</h3>
                    <p class="text-[10px] text-slate-500 mt-1">Status: Operational</p>
                </div>
            </div>
            <p class="text-[11px] text-slate-400 leading-relaxed">${s.desc}</p>
        </div>
    `).join('');
}

/**
 * Appearance
 */
async function saveAppearance() {
    const name = document.getElementById('configName').value;
    const color = document.getElementById('configAccent').value;
    
    // Local Update
    document.documentElement.style.setProperty('--brand-accent', color);
    document.getElementById('brandIcon').style.backgroundColor = color;
    document.getElementById('brandName').innerText = name;

    try {
        await db.collection('settings_super').doc('appearance').set({ name, accentColor: color });
        alert("Platform appearance updated!");
    } catch (e) { console.error(e); }
}

/**
 * Logs
 */
async function loadActivityLog() {
    const container = document.getElementById('logsContainer');
    try {
        const snap = await db.collection('logs_super').orderBy('timestamp', 'desc').limit(20).get();
        if (snap.empty) {
            container.innerHTML = '<p class="text-slate-500 text-center">No audit logs found.</p>';
            return;
        }

        container.innerHTML = snap.docs.map(doc => {
            const l = doc.data();
            const time = l.timestamp ? new Date(l.timestamp.seconds * 1000).toLocaleTimeString() : 'Recent';
            return `
                <div class="flex items-center justify-between p-4 glass-card">
                    <div class="flex items-center gap-4 text-[13px]">
                        <span class="text-slate-500 font-mono text-[11px]">${time}</span>
                        <span class="text-blue-400 font-bold">${l.admin || 'System'}</span>
                        <span class="text-slate-200">${l.detail}</span>
                    </div>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400">${l.type}</span>
                </div>
            `;
        }).join('');
    } catch (e) { console.error(e); }
}

/**
 * Helpers
 */
async function logSuperActivity(type, detail) {
    try {
        await db.collection('logs_super').add({
            type, detail, timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            admin: auth.currentUser?.email || 'System'
        });
    } catch (e) { console.warn(e); }
}

function showOverlay(show) { 
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = show ? 'flex' : 'none'; 
}

function hideOverlay() { showOverlay(false); }

function closeModal(id) { 
    const m = document.getElementById(id);
    if (m) {
        m.classList.remove('flex');
        m.classList.add('hidden');
    }
}

// Attach globals
window.switchTab = switchTab;
window.openProEditModal = openProEditModal;
window.closeModal = closeModal;
window.toggleSchoolStatus = toggleSchoolStatus;
window.saveAppearance = saveAppearance;
window.logoutAdmin = () => auth.signOut().then(() => window.location.href = 'admin-login.html');
