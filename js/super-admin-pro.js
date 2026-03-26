/**
 * Super Admin Pro - Platform Logic
 * Powers the SNR World Control Tower
 */

let allSchools = [];
let growthChart = null;

const STAGES = Object.values(window.SAAS_POLICY?.SAAS_TIERS || {}).map(t => ({
    name: t.name,
    id: t.id,
    desc: t.description
})).filter(t => t.id > 0); // Hide Stage 0 from grid

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
    document.querySelectorAll('.nav-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    // Update Sidebar
    document.querySelectorAll('.nav-btn').forEach((b) => {
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
    document.querySelectorAll('.section-view').forEach((v) => v.classList.remove('section-active'));

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
            datasets: [
                {
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
                    pointBorderColor: '#3b82f6',
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
            },
        },
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
        document.getElementById('stat-activeSchools').innerText = schools.docs.filter(
            (d) => d.data().status === 'active'
        ).length;
        document.getElementById('stat-premiumSchools').innerText = schools.docs.filter(
            (d) => d.data().stage >= 5
        ).length;
    } catch (e) {
        console.error('Stats Error:', e);
    }
}

async function loadSchools() {
    const tableBody = document.getElementById('schoolProTableBody');
    if (!tableBody) return;

    try {
        // Using a more reliable order (schoolId) to ensure all schools appear even if createdDate is missing
        const snap = await db.collection('schools').orderBy('schoolId', 'asc').get();
        allSchools = snap.docs.map((doc) => doc.data());
        renderSchoolsTable(allSchools);
    } catch (e) {
        console.error('Load Schools Error:', e);
    }
}

function renderSchoolsTable(schools) {
    const body = document.getElementById('schoolProTableBody');
    body.innerHTML = schools
        .map(
            (s) => {
                const slug = s.subdomain || s.schoolId.toLowerCase();
                const baseUrl = window.location.origin;
                const websiteUrl = s.subdomain.startsWith('http') ? s.subdomain : `${baseUrl}/${slug}/`;
                const dashboardUrl = s.subdomain.startsWith('http') ? `${s.subdomain}/Admin-Dashboard` : `${baseUrl}/${slug}/Admin-Dashboard`;
                
                return `
                <tr class="group hover:bg-white/5 transition-all">
                    <td class="py-4 text-sm font-mono text-blue-400">${s.schoolId}</td>
                    <td class="py-4 text-sm font-semibold text-white">${s.schoolName}</td>
                    <td class="py-4 text-sm text-slate-400 font-mono">
                        <div class="space-y-2">
                            <a href="${websiteUrl}" target="_blank" class="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors group/link">
                                <span class="truncate max-w-[150px]">${slug}</span>
                                <i data-lucide="external-link" class="w-3 h-3"></i>
                                <span class="text-[10px] bg-blue-500/10 px-1.5 py-0.5 rounded text-blue-400 opacity-0 group-hover/link:opacity-100 transition-opacity">Website</span>
                            </a>
                            <a href="${dashboardUrl}" target="_blank" class="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors group/link">
                                <span class="truncate max-w-[150px]">Admin Panel</span>
                                <i data-lucide="shield-check" class="w-3 h-3"></i>
                                <span class="text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-400 opacity-0 group-hover/link:opacity-100 transition-opacity">Login</span>
                            </a>
                        </div>
                    </td>
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
                            <button onclick="openProEditModal('${s.schoolId}')" class="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white" title="Edit School Settings">
                                <i data-lucide="settings" class="w-4 h-4"></i>
                            </button>
                            <button onclick="toggleSchoolStatus('${s.schoolId}', '${s.status}')" class="p-2 hover:bg-white/10 rounded-lg ${s.status === 'active' ? 'text-red-400' : 'text-emerald-400'}" title="${s.status === 'active' ? 'Suspend School' : 'Activate School'}">
                                <i data-lucide="${s.status === 'active' ? 'power' : 'play'}" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </td>
                </tr>
                `;
            }
        )
        .join('');
    lucide.createIcons();
}

/**
 * Filter Schools
 */
function filterSchools(term) {
    const filtered = allSchools.filter(
        (s) =>
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
    const displayName = document.getElementById('proSchoolDisplayName').value;
    const logo = document.getElementById('proSchoolLogo').value;
    const subdomain = document.getElementById('proSubdomain').value.trim();
    const stage = parseInt(document.getElementById('proSchoolStage').value);
    const email = document.getElementById('proAdminEmail').value;
    const password = document.getElementById('proAdminPassword').value;

    try {
        showOverlay(true);

        // 1. Unique School ID Generation (Robust)
        const schoolSnap = await db.collection('schools').get();
        let maxId = 0;
        schoolSnap.forEach(doc => {
            const id = doc.id;
            if (id.startsWith('SCH')) {
                const num = parseInt(id.replace('SCH', ''));
                if (!isNaN(num) && num > maxId) maxId = num;
            }
        });
        const schoolId = 'SCH' + String(maxId + 1).padStart(3, '0');

        // 2. Email Existence Check
        const userCheck = await db.collection('users').where('email', '==', email).get();
        if (!userCheck.empty) {
            throw new Error(`The email address ${email} is already registered to another school/user.`);
        }

        // 3. Create School Admin User (requires secondary app to avoid logging out super admin)
        if (typeof firebaseConfig === 'undefined') {
            throw new Error('Firebase configuration missing. Check firebase-config.js');
        }

        let secondaryApp;
        if (firebase.apps.find(app => app.name === 'secondary')) {
            secondaryApp = firebase.app('secondary');
        } else {
            secondaryApp = firebase.initializeApp(firebaseConfig, 'secondary');
        }
        
        const secondaryAuth = secondaryApp.auth();
        
        try {
            const userCredential = await secondaryAuth.createUserWithEmailAndPassword(email, password);
            const uid = userCredential.user.uid;

            // 4. Provision Everything in a single batch where possible
            const batch = db.batch();
            const schoolBase = db.collection('schools').doc(schoolId);

            // User record
            batch.set(db.collection('users').doc(uid), {
                uid,
                email,
                schoolId,
                role: 'admin',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // School record
            batch.set(schoolBase, {
                schoolId,
                schoolName: displayName,
                name: name,
                logo,
                subdomain,
                stage,
                adminEmail: email,
                status: 'active',
                createdDate: firebase.firestore.FieldValue.serverTimestamp(),
                schoolReg: '0000/0000',
                tagline: 'Quality Education for All',
                phone: '+91 0000000000',
                email: email,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Module permissions (Centralized Policy)
            const modules = window.SAAS_POLICY.getModulesForStage(stage);

            batch.set(schoolBase.collection('settings').doc('access'), {
                maxStage: stage,
                modules,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Settings/General
            batch.set(schoolBase.collection('settings').doc('general'), {
                schoolName: displayName,
                schoolLogo: logo,
                schoolLocation: 'Update Location',
                schoolUdise: '00000000000',
                schoolPhone: '0000000000',
                schoolEmail: email
            });

            // Hero content
            batch.set(schoolBase.collection('settings').doc('homeHero'), {
                urls: [
                    '/images/School-Building.jpeg',
                    '/images/Bihar-Museum-img4.jpeg',
                    '/images/Science-centre-Patna-img15.jpeg',
                    '/images/Republic-Day-img1.jpeg'
                ],
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Page text
            batch.set(schoolBase.collection('pageText').doc('home'), {
                homeHeroTitle: `Welcome to ${displayName}`,
                homeHeroSubtitle: 'Quality Education • Discipline • Character Building',
                homeIntroTitle: `About ${displayName}`,
                homeIntroText: `${displayName} provides quality education and focuses on holistic student development.`,
                homeIntroSubtext: 'Join us in nurturing the leaders of tomorrow.',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Stats
            batch.set(schoolBase.collection('settings').doc('globalStats'), {
                students: '300',
                teachers: '15',
                classrooms: '12',
                years: '1+',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            await batch.commit();

            // 5. Cleanup and Feedback
            await secondaryAuth.signOut();
            await logSuperActivity('COMMISSION', `Provisioned new school: ${displayName} (ID: ${schoolId})`);
            
            alert(`School ${schoolId} provisioned successfully! Admin: ${email}`);
            e.target.reset();
            await refreshData();
            switchTab('Schools');

        } finally {
            await secondaryApp.delete();
        }
    } catch (e) {
        console.error('Provisioning Error:', e);
        alert(e.message);
    } finally {
        showOverlay(false);
    }
}

/**
 * Edit School
 */
function openProEditModal(id) {
    const s = allSchools.find((sc) => sc.schoolId === id);
    if (!s) return;

    document.getElementById('editSchoolId').value = s.schoolId;
    document.getElementById('editSchoolName').value = s.schoolName;
    document.getElementById('editSchoolStage').value = s.stage;
    document.getElementById('editSubdomain').value = s.subdomain || '';

    document.getElementById('editModal').classList.remove('hidden');
    document.getElementById('editModal').classList.add('flex');
}

async function handleUpdateSchool(e) {
    e.preventDefault();
    const id = document.getElementById('editSchoolId').value;
    const name = document.getElementById('editSchoolName').value;
    const stage = parseInt(document.getElementById('editSchoolStage').value);
    const subdomain = document.getElementById('editSubdomain').value.trim();

    try {
        showOverlay(true);
        // Centralized Policy Integration
        const modules = window.SAAS_POLICY.getModulesForStage(stage);

        await db.collection('schools').doc(id).update({ 
            schoolName: name, 
            stage,
            subdomain: subdomain 
        });

        // Update permissions in settings/access
        await db.collection('schools').doc(id).collection('settings').doc('access').set({
            maxStage: stage,
            modules,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        await logSuperActivity('UPDATE', `Modified school settings: ${id}`);
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
        await db
            .collection('schools')
            .doc(id)
            .update({ status: current === 'active' ? 'suspended' : 'active' });
        await logSuperActivity('STATUS', `${action} school: ${id}`);
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
    grid.innerHTML = STAGES.map(
        (s) => `
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
    `
    ).join('');
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
        alert('Platform appearance updated!');
    } catch (e) {
        console.error(e);
    }
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

        container.innerHTML = snap.docs
            .map((doc) => {
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
            })
            .join('');
    } catch (e) {
        console.error(e);
    }
}

/**
 * Helpers
 */
async function logSuperActivity(type, detail) {
    try {
        await db.collection('logs_super').add({
            type,
            detail,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            admin: auth.currentUser?.email || 'System',
        });
    } catch (e) {
        console.warn(e);
    }
}

function showOverlay(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
}

function hideOverlay() {
    showOverlay(false);
}

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
window.logoutAdmin = () => auth.signOut().then(() => (window.location.href = 'admin-login.html'));
