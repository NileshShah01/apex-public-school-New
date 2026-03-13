// cms-admin.js - All CMS Admin Panel functions for website content management

// ===================== SHOW SECTION ROUTING =====================
const CMS_SECTIONS = {
    'cmsStats': { load: loadCmsStats },
    'cmsEvents': { load: () => loadCmsList('events', 'eventsListAdmin', renderEventItem) },
    'cmsAchievements': { load: () => loadCmsList('achievements', 'achievementsListAdmin', renderAchievementItem) },
    'cmsTestimonials': { load: () => loadCmsList('testimonials', 'testimonialsListAdmin', renderTestimonialItem) },
    'cmsAdmission': { load: loadAdmissionStatus },
    'cmsHolidays': { load: () => loadCmsList('holidays', 'holidaysListAdmin', renderHolidayItem) },
    'cmsGallery': { load: () => loadCmsList('gallery', 'galleryListAdmin', renderGalleryItem) },
    'cmsStaff': { load: () => loadCmsList('staff', 'staffListAdmin', renderStaffItem) },
    'cmsTimetable': { load: loadTimetableSection },
    'cmsFees': { load: loadFeeStructure },
    'cmsHero': { load: loadHeroSlider },
    'cmsStudentDashboard': { load: loadCmsStudentDashboard }
};

// Hook into existing showSection 
const _origShowSection = window.showSection;
window.showSection = function(id) {
    _origShowSection(id);
    if (CMS_SECTIONS[id]) CMS_SECTIONS[id].load();
    
    // Close mobile sidebar if open
    const sidebar = document.getElementById('adminSidebar');
    if (sidebar && sidebar.classList.contains('mobile-open')) {
        toggleMobileSidebar();
    }
};

// ===================== STATS =====================
async function loadCmsStats() {
    try {
        const doc = await db.collection('settings').doc('general').get();
        if (doc.exists) {
            const d = doc.data();
            document.getElementById('stat_students').value = d.stat_students || '';
            document.getElementById('stat_teachers').value = d.stat_teachers || '';
            document.getElementById('stat_classrooms').value = d.stat_classrooms || '';
            document.getElementById('stat_years').value = d.stat_years || '';
        }
    } catch(e) { console.error(e); }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('cmsStatsForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        try {
            await db.collection('settings').doc('general').set({
                stat_students: parseInt(document.getElementById('stat_students').value) || 0,
                stat_teachers: parseInt(document.getElementById('stat_teachers').value) || 0,
                stat_classrooms: parseInt(document.getElementById('stat_classrooms').value) || 0,
                stat_years: parseInt(document.getElementById('stat_years').value) || 0
            }, { merge: true });
            showToast('Stats updated live!');
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    });

    document.getElementById('cmsHeroForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        try {
            await db.collection('settings').doc('general').set({
                hero_1: document.getElementById('hero_1').value.trim(),
                hero_2: document.getElementById('hero_2').value.trim(),
                hero_3: document.getElementById('hero_3').value.trim(),
                hero_4: document.getElementById('hero_4').value.trim()
            }, { merge: true });
            showToast('Hero slider images updated!');
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    });

    document.getElementById('cmsStudentDashboardForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const config = {
            examHeading: document.getElementById('cms_examHeading').value.trim(),
            examNotice: document.getElementById('cms_examNotice').value.trim(),
            showQuickActions: document.getElementById('cms_showQuickActions').checked,
            showAttendance: document.getElementById('cms_showAttendance').checked,
            showTimings: document.getElementById('cms_showTimings').checked,
            showPrincipalMessage: document.getElementById('cms_showPrincipalMessage').checked,
            schoolTimings: document.getElementById('cms_schoolTimings').value.trim(),
            principalMessage: document.getElementById('cms_principalMessage').value.trim()
        };

        try {
            await db.collection('settings').doc('dashboardConfig').set(config, { merge: true });
            showToast('Student Dashboard configuration updated live!');
            // Update preview for banner
            const previewTitle = document.getElementById('previewTitle');
            const previewNotice = document.getElementById('previewNotice');
            if (previewTitle) previewTitle.textContent = config.examHeading || '(No Heading Set)';
            if (previewNotice) previewNotice.textContent = config.examNotice;
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    });

    // Live preview sync
    document.getElementById('cms_examHeading')?.addEventListener('input', function() {
        document.getElementById('previewTitle').textContent = this.value || 'Final Examination March, 2026';
    });
    document.getElementById('cms_examNotice')?.addEventListener('input', function() {
        document.getElementById('previewNotice').textContent = this.value;
    });

    // Sidebar collapse state restore
    if (localStorage.getItem('adminSidebarCollapsed') === 'true') {
        document.getElementById('adminSidebar')?.classList.add('collapsed');
        const icon = document.getElementById('toggleIcon');
        if (icon) { icon.className = 'fas fa-chevron-right'; }
    }
});

// ===================== STUDENT DASHBOARD CMS =====================
async function loadCmsStudentDashboard() {
    try {
        const doc = await db.collection('settings').doc('dashboardConfig').get();
        if (doc.exists) {
            const d = doc.data();
            if (document.getElementById('cms_examHeading')) document.getElementById('cms_examHeading').value = d.examHeading || '';
            if (document.getElementById('cms_examNotice')) document.getElementById('cms_examNotice').value = d.examNotice || '';
            
            if (document.getElementById('cms_showQuickActions')) document.getElementById('cms_showQuickActions').checked = !!d.showQuickActions;
            if (document.getElementById('cms_showAttendance')) document.getElementById('cms_showAttendance').checked = !!d.showAttendance;
            if (document.getElementById('cms_showTimings')) document.getElementById('cms_showTimings').checked = !!d.showTimings;
            if (document.getElementById('cms_showPrincipalMessage')) document.getElementById('cms_showPrincipalMessage').checked = !!d.showPrincipalMessage;
            
            if (document.getElementById('cms_schoolTimings')) document.getElementById('cms_schoolTimings').value = d.schoolTimings || '';
            if (document.getElementById('cms_principalMessage')) document.getElementById('cms_principalMessage').value = d.principalMessage || '';

            // Update Preview
            if (document.getElementById('previewTitle')) document.getElementById('previewTitle').textContent = d.examHeading || 'Final Examination March, 2026';
            if (document.getElementById('previewNotice')) document.getElementById('previewNotice').textContent = d.examNotice || 'Exams begin on March 23rd. Please carry your Admit Card.';
        }
    } catch(e) { console.error('loadCmsStudentDashboard error:', e); }
}

async function updateStudentAttendance() {
    const studentId = document.getElementById('att_studentId').value.trim();
    const month = document.getElementById('att_month').value;
    const percentage = parseInt(document.getElementById('att_percent').value);

    if (!studentId || !month || isNaN(percentage)) {
        showToast('Please fill all attendance fields correctly.', 'error');
        return;
    }

    try {
        const attId = `${studentId}_${month}`;
        await db.collection('attendance').doc(attId).set({
            studentId,
            month,
            percentage,
            date: new Date()
        }, { merge: true });
        
        showToast(`Attendance updated for ${studentId} (${month})`);
        
        // Clear inputs except month
        document.getElementById('att_studentId').value = '';
        document.getElementById('att_percent').value = '';
    } catch(e) {
        showToast('Error updating attendance: ' + e.message, 'error');
    }
}

// ===================== COLLAPSIBLE SIDEBAR =====================
function toggleSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const icon = document.getElementById('toggleIcon');
    const isCollapsed = sidebar.classList.toggle('collapsed');
    if (icon) icon.className = isCollapsed ? 'fas fa-chevron-right' : 'fas fa-bars';
    localStorage.setItem('adminSidebarCollapsed', isCollapsed ? 'true' : 'false');
}

// ===================== ACCORDION SIDEBAR =====================
function toggleCategory(catId) {
    const cat = document.getElementById(catId);
    const header = cat.previousElementSibling;
    const isOpen = cat.classList.contains('open');

    // Close all other categories (optional: comment out if you want multiple open)
    document.querySelectorAll('.cat-submenu').forEach(el => {
        el.classList.remove('open');
        el.previousElementSibling.classList.remove('active');
    });

    if (!isOpen) {
        cat.classList.add('open');
        header.classList.add('active');
    }
}

// ===================== MOBILE DRAWER =====================
function toggleMobileSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    sidebar.classList.toggle('mobile-open');
    
    // Create overlay if not exists
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.onclick = toggleMobileSidebar;
        document.body.appendChild(overlay);
    }
    overlay.classList.toggle('active');
}

// ===================== RESPONSIVE TABLES HELPER =====================
function initResponsiveTables() {
    document.querySelectorAll('table').forEach(table => {
        if (!table.parentElement.classList.contains('table-responsive')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-responsive';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        }
    });
}

// Add to DOMContentLoaded or relevant init
document.addEventListener('DOMContentLoaded', () => {
    initResponsiveTables();
});

// ===================== GENERIC COLLECTION LIST LOADER =====================
async function loadCmsList(collection, containerId, renderFn) {
    const el = document.getElementById(containerId);
    el.innerHTML = '<p style="color:#64748b;"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';
    try {
        const snap = await db.collection(collection).orderBy('createdAt', 'asc').get();
        el.innerHTML = snap.empty ? '<p style="color:#94a3b8; text-align:center; padding:2rem;">No items yet. Add one above!</p>' : '';
        snap.forEach(doc => { el.innerHTML += renderFn(doc.id, doc.data()); });
    } catch(e) {
        // Try without orderBy if field missing
        try {
            const snap2 = await db.collection(collection).get();
            el.innerHTML = snap2.empty ? '<p style="color:#94a3b8; text-align:center; padding:2rem;">No items yet.</p>' : '';
            snap2.forEach(doc => { el.innerHTML += renderFn(doc.id, doc.data()); });
        } catch(e2) { el.innerHTML = `<p style="color:#ef4444;">Error: ${e2.message}</p>`; }
    }
}

// ===================== RENDER HELPERS =====================
function renderEventItem(id, d) {
    return `<div style="display:flex; align-items:center; justify-content:space-between; padding:1rem 1.25rem; background:#f8fafc; border-radius:0.75rem; border-left:4px solid #3b82f6;">
        <div><b>${d.title || ''}</b> — <span style="color:#64748b;">${d.date || ''}</span> <span style="color:#94a3b8; font-size:0.85rem;">${d.subtitle || ''}</span></div>
        <button onclick="deleteCmsItem('events','${id}',loadCmsList.bind(null,'events','eventsListAdmin',renderEventItem))" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.2rem;"><i class="fas fa-trash"></i></button>
    </div>`;
}

function renderAchievementItem(id, d) {
    return `<div style="display:flex; align-items:center; justify-content:space-between; padding:1rem 1.25rem; background:#f8fafc; border-radius:0.75rem; border-left:4px solid #f59e0b;">
        <div><b>${d.title || ''}</b> — <span style="color:#64748b; font-size:0.875rem;">${d.description || ''}</span></div>
        <button onclick="deleteCmsItem('achievements','${id}',loadCmsList.bind(null,'achievements','achievementsListAdmin',renderAchievementItem))" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.2rem;"><i class="fas fa-trash"></i></button>
    </div>`;
}

function renderTestimonialItem(id, d) {
    return `<div style="display:flex; align-items:center; justify-content:space-between; padding:1rem 1.25rem; background:#f8fafc; border-radius:0.75rem; border-left:4px solid #10b981;">
        <div><b>${d.name || ''}</b> (${d.relation || ''}) — <span style="color:#64748b; font-style:italic; font-size:0.875rem;">"${d.quote || ''}"</span></div>
        <button onclick="deleteCmsItem('testimonials','${id}',loadCmsList.bind(null,'testimonials','testimonialsListAdmin',renderTestimonialItem))" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.2rem;"><i class="fas fa-trash"></i></button>
    </div>`;
}

function renderHolidayItem(id, d) {
    return `<div style="display:flex; align-items:center; justify-content:space-between; padding:0.75rem 1rem; background:#fefce8; border-radius:0.5rem;">
        <div><b style="color:#facc15; margin-right:0.5rem;">🎉</b> <b>${d.name || ''}</b> — <span style="color:#64748b;">${d.date || ''}</span></div>
        <button onclick="deleteCmsItem('holidays','${id}',loadCmsList.bind(null,'holidays','holidaysListAdmin',renderHolidayItem))" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fas fa-trash"></i></button>
    </div>`;
}

function renderGalleryItem(id, d) {
    const url = d.url || d.imageUrl || '';
    const catBadge = d.category ? `<span style="position:absolute; top:0.4rem; left:0.4rem; background:#1E40AF; color:white; font-size:0.65rem; padding:0.2rem 0.4rem; border-radius:4px; font-weight:bold;">${d.category}</span>` : '';
    return `<div style="position:relative; border-radius:0.75rem; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <img src="${url}" style="width:100%; height:140px; object-fit:cover; display:block;" onerror="this.src='https://via.placeholder.com/180x140?text=Invalid+URL'">
        ${catBadge}
        <div style="padding:0.4rem 0.6rem; font-size:0.75rem; color:#64748b;">${d.caption || ''}</div>
        <button onclick="deleteCmsItem('gallery','${id}',loadCmsList.bind(null,'gallery','galleryListAdmin',renderGalleryItem))" style="position:absolute;top:0.4rem;right:0.4rem; background:rgba(239,68,68,0.9); border:none; color:white; border-radius:50%; width:26px; height:26px; cursor:pointer;"><i class="fas fa-times"></i></button>
    </div>`;
}

function renderStaffItem(id, d) {
    return `<div style="background:white; padding:1.25rem; border-radius:1rem; box-shadow:0 2px 8px rgba(0,0,0,0.08); text-align:center; position:relative;">
        <img src="${d.photo || 'https://ui-avatars.com/api/?name='+encodeURIComponent(d.name||'Staff')+'&background=1e3a8a&color=fff'}" style="width:70px; height:70px; border-radius:50%; object-fit:cover; margin-bottom:0.75rem;">
        <p style="font-weight:700; margin-bottom:0.25rem;">${d.name || ''}</p>
        <p style="color:#64748b; font-size:0.8rem;">${d.subject || ''}</p>
        <button onclick="deleteCmsItem('staff','${id}',loadCmsList.bind(null,'staff','staffListAdmin',renderStaffItem))" style="position:absolute;top:0.5rem;right:0.5rem; background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fas fa-trash"></i></button>
    </div>`;
}

// ===================== DELETE CMS ITEM =====================
async function deleteCmsItem(collection, id, reloadFn) {
    if (!confirm('Delete this item?')) return;
    try {
        await db.collection(collection).doc(id).delete();
        showToast('Deleted!');
        reloadFn();
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

// ===================== MODAL SYSTEM =====================
const MODAL_CONFIGS = {
    event: {
        title: 'Add Upcoming Event',
        fields: [
            { id: 'cms_title', label: 'Event Title *', type: 'text', required: true },
            { id: 'cms_date', label: 'Date *', type: 'text', placeholder: 'e.g. March 30, 2026', required: true },
            { id: 'cms_subtitle', label: 'Short Description', type: 'text' }
        ],
        save: async (data) => { await db.collection('events').add({ title: data.cms_title, date: data.cms_date, subtitle: data.cms_subtitle, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); loadCmsList('events', 'eventsListAdmin', renderEventItem); }
    },
    achievement: {
        title: 'Add Achievement',
        fields: [
            { id: 'cms_title', label: 'Achievement Title *', type: 'text', required: true },
            { id: 'cms_desc', label: 'Description', type: 'text' }
        ],
        save: async (data) => { await db.collection('achievements').add({ title: data.cms_title, description: data.cms_desc, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); loadCmsList('achievements', 'achievementsListAdmin', renderAchievementItem); }
    },
    testimonial: {
        title: 'Add Testimonial',
        fields: [
            { id: 'cms_name', label: 'Parent / Student Name *', type: 'text', required: true },
            { id: 'cms_relation', label: 'Relation (e.g. Parent of Class 5)', type: 'text' },
            { id: 'cms_quote', label: 'Quote / Review *', type: 'textarea', required: true }
        ],
        save: async (data) => { await db.collection('testimonials').add({ name: data.cms_name, relation: data.cms_relation, quote: data.cms_quote, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); loadCmsList('testimonials', 'testimonialsListAdmin', renderTestimonialItem); }
    },
    holiday: {
        title: 'Add Holiday',
        fields: [
            { id: 'cms_name', label: 'Holiday Name *', type: 'text', required: true },
            { id: 'cms_date', label: 'Date (e.g. April 14, 2026) *', type: 'text', required: true }
        ],
        save: async (data) => { await db.collection('holidays').add({ name: data.cms_name, date: data.cms_date, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); loadCmsList('holidays', 'holidaysListAdmin', renderHolidayItem); }
    },
    gallery: {
        title: 'Add Gallery Image',
        fields: [
            { id: 'cms_url', label: 'Image URL *', type: 'url', required: true, placeholder: 'https://...' },
            { id: 'cms_category', label: 'Category *', type: 'select', options: ['Sports', 'Events', 'Functions', 'Awards', 'Others'], required: true },
            { id: 'cms_caption', label: 'Caption (optional)', type: 'text' }
        ],
        save: async (data) => { await db.collection('gallery').add({ url: data.cms_url, category: data.cms_category, caption: data.cms_caption, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); loadCmsList('gallery', 'galleryListAdmin', renderGalleryItem); }
    },
    staff: {
        title: 'Add Staff / Teacher',
        fields: [
            { id: 'cms_name', label: 'Full Name *', type: 'text', required: true },
            { id: 'cms_subject', label: 'Subject / Designation', type: 'text' },
            { id: 'cms_photo', label: 'Photo URL (optional)', type: 'url', placeholder: 'https://...' }
        ],
        save: async (data) => { await db.collection('staff').add({ name: data.cms_name, subject: data.cms_subject, photo: data.cms_photo, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); loadCmsList('staff', 'staffListAdmin', renderStaffItem); }
    }
};

function openCmsModal(type) {
    const config = MODAL_CONFIGS[type];
    if (!config) return;
    document.getElementById('cmsModalTitle').textContent = config.title;
    let html = '';
    config.fields.forEach(f => {
        html += `<div class="form-group" style="margin-bottom:1rem;">
            <label style="font-weight:600; display:block; margin-bottom:0.4rem;">${f.label}</label>`;
            
        if (f.type === 'textarea') {
            html += `<textarea id="${f.id}" ${f.required ? 'required' : ''} rows="3" style="width:100%; padding:0.6rem; border:1px solid var(--border); border-radius:0.5rem;"></textarea>`;
        } else if (f.type === 'select') {
            html += `<select id="${f.id}" ${f.required ? 'required' : ''} style="width:100%; padding:0.6rem; border:1px solid var(--border); border-radius:0.5rem; background:white;">`;
            f.options.forEach(opt => html += `<option value="${opt}">${opt}</option>`);
            html += `</select>`;
        } else {
            html += `<input type="${f.type}" id="${f.id}" ${f.required ? 'required' : ''} placeholder="${f.placeholder || ''}" style="width:100%; padding:0.6rem; border:1px solid var(--border); border-radius:0.5rem;">`;
        }
        
        html += `</div>`;
    });
    html += `<button class="btn-portal btn-primary" onclick="saveCmsModal('${type}')" style="width:100%;"><i class="fas fa-plus"></i> Add</button>`;
    document.getElementById('cmsModalBody').innerHTML = html;
    document.getElementById('cmsModal').style.display = 'block';
}

function closeCmsModal() {
    document.getElementById('cmsModal').style.display = 'none';
}

async function saveCmsModal(type) {
    const config = MODAL_CONFIGS[type];
    const data = {};
    for (const f of config.fields) {
        const el = document.getElementById(f.id);
        if (f.required && !el.value.trim()) { showToast('Please fill required fields!', 'error'); return; }
        data[f.id] = el.value.trim();
    }
    try {
        await config.save(data);
        closeCmsModal();
        showToast('Added successfully!');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

// ===================== ADMISSION STATUS =====================
async function loadAdmissionStatus() {
    try {
        const doc = await db.collection('settings').doc('general').get();
        const status = doc.exists ? (doc.data().admissionStatus || 'open') : 'open';
        const session = doc.exists ? (doc.data().admissionSession || '2026-2027') : '2026-2027';
        updateAdmissionBadge(status);
        document.getElementById('admissionSessionYear').value = session;
    } catch(e) { console.error(e); }
}

function updateAdmissionBadge(status) {
    const badge = document.getElementById('admissionStatusBadge');
    const text = document.getElementById('admissionStatusText');
    if (status === 'open') {
        badge.style.background = '#10b981';
        badge.textContent = 'OPEN';
        text.textContent = 'Admissions are OPEN';
    } else {
        badge.style.background = '#ef4444';
        badge.textContent = 'CLOSED';
        text.textContent = 'Admissions are CLOSED';
    }
}

async function setAdmissionStatus(status) {
    try {
        await db.collection('settings').doc('general').set({ admissionStatus: status }, { merge: true });
        updateAdmissionBadge(status);
        showToast(`Admission status set to ${status.toUpperCase()}!`);
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

async function saveAdmissionSession() {
    const val = document.getElementById('admissionSessionYear').value.trim();
    if (!val) return;
    try {
        await db.collection('settings').doc('general').set({ admissionSession: val }, { merge: true });
        showToast('Session year saved!');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

// ===================== TIMETABLES =====================
const CLASSES = ['Play Group', 'Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8'];

async function loadTimetableSection() {
    const grid = document.getElementById('timetableGrid');
    grid.innerHTML = '';
    for (const cls of CLASSES) {
        const safeId = cls.replace(/\s+/g, '_').toLowerCase();
        const docRef = await db.collection('timetables').doc(safeId).get();
        const exists = docRef.exists;
        grid.innerHTML += `
            <div style="background:#f8fafc; border:1px solid var(--border); border-radius:0.75rem; padding:1rem; text-align:center;">
                <p style="font-weight:700; margin-bottom:0.75rem;">${cls}</p>
                <span class="badge ${exists ? 'badge-success' : 'badge-danger'}" style="margin-bottom:0.75rem; display:block;">${exists ? '✅ Uploaded' : '❌ Missing'}</span>
                <input type="file" id="tt_${safeId}" accept="application/pdf" style="display:none;" onchange="uploadTimetable(event,'${safeId}')">
                <div style="display:flex; flex-direction:column; gap:0.5rem;">
                    <button class="btn-portal btn-ghost" style="font-size:0.8rem;" onclick="document.getElementById('tt_${safeId}').click()"><i class="fas fa-upload"></i> Upload</button>
                    ${exists ? `<button class="btn-portal btn-ghost" style="font-size:0.8rem; color:#ef4444;" onclick="deleteTimetable('${safeId}','${cls}')"><i class="fas fa-trash"></i> Remove</button>` : ''}
                </div>
            </div>`;
    }
}

async function uploadTimetable(event, classId) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 900 * 1024) { showToast('File too large! Max 900KB.', 'error'); return; }
    setLoading(true);
    try {
        const base64 = await new Promise(r => { const reader = new FileReader(); reader.onload = e => r(e.target.result); reader.readAsDataURL(file); });
        await db.collection('timetables').doc(classId).set({ fileData: base64, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        showToast('Timetable uploaded!');
        loadTimetableSection();
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
    finally { setLoading(false); }
}

async function deleteTimetable(classId, className) {
    if (!confirm(`Delete timetable for ${className}?`)) return;
    await db.collection('timetables').doc(classId).delete();
    showToast('Timetable deleted!');
    loadTimetableSection();
}

// ===================== FEE STRUCTURE =====================
async function loadFeeStructure() {
    const container = document.getElementById('feesTableAdmin');
    let feeData = {};
    try {
        const doc = await db.collection('settings').doc('fees').get();
        if (doc.exists) feeData = doc.data();
    } catch(e) {}

    let html = '<div style="display:grid; gap:0.75rem;">';
    for (const cls of CLASSES) {
        const safeId = cls.replace(/\s+/g, '_').toLowerCase();
        html += `<div style="display:grid; grid-template-columns:180px 1fr 1fr; gap:1rem; align-items:center; padding:0.75rem; background:#f8fafc; border-radius:0.5rem;">
            <span style="font-weight:700;">${cls}</span>
            <input type="number" id="fee_monthly_${safeId}" placeholder="Monthly Fee (₹)" value="${feeData[safeId+'_monthly'] || ''}" style="padding:0.5rem; border:1px solid var(--border); border-radius:0.5rem;">
            <input type="number" id="fee_annual_${safeId}" placeholder="Annual Fee (₹)" value="${feeData[safeId+'_annual'] || ''}" style="padding:0.5rem; border:1px solid var(--border); border-radius:0.5rem;">
        </div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

async function saveFeeStructure() {
    setLoading(true);
    try {
        const data = {};
        for (const cls of CLASSES) {
            const safeId = cls.replace(/\s+/g, '_').toLowerCase();
            data[safeId+'_monthly'] = parseInt(document.getElementById(`fee_monthly_${safeId}`)?.value) || 0;
            data[safeId+'_annual'] = parseInt(document.getElementById(`fee_annual_${safeId}`)?.value) || 0;
        }
        data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('settings').doc('fees').set(data);
        showToast('Fee structure saved!');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
    finally { setLoading(false); }
}

// ===================== HERO SLIDER =====================
async function loadHeroSlider() {
    try {
        const doc = await db.collection('settings').doc('general').get();
        if (doc.exists) {
            const d = doc.data();
            document.getElementById('hero_1').value = d.hero_1 || '';
            document.getElementById('hero_2').value = d.hero_2 || '';
            document.getElementById('hero_3').value = d.hero_3 || '';
            document.getElementById('hero_4').value = d.hero_4 || '';
        }
    } catch(e) { console.error(e); }
}
