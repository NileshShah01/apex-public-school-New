/**
 * erp-timetable.js - Timetable Management Logic
 */

let timetableState = {
    timetables: {},
};

/**
 * Initialize Timetable Module
 */
async function initERPTimetable() {
    console.log('ERP Timetable Initializing...');

    // Populate session dropdowns
    const sessSelects = ['tt_sessionSelect', 'ttSessionSelect'];
    sessSelects.forEach((id) => {
        const el = document.getElementById(id);
        if (el && erpState.sessions) {
            el.innerHTML =
                '<option value="">Select Session</option>' +
                erpState.sessions
                    .map((s) => `<option value="${s.id}" ${s.active ? 'selected' : ''}>${s.name}</option>`)
                    .join('');
        }
    });

    // Populate class dropdowns
    const classSelects = ['tt_classSelect', 'ttClassSelect'];
    classSelects.forEach((id) => {
        const el = document.getElementById(id);
        if (el && erpState.classes) {
            el.innerHTML =
                '<option value="">Select Class</option>' +
                erpState.classes
                    .map((cls) => `<option value="${cls.name}" data-id="${cls.id}">${cls.name}</option>`)
                    .join('');
        }
    });

    await loadTimetableList();
}

/**
 * Handle Timetable Upload
 */
async function handleTimetableUpload(event) {
    event.preventDefault();

    const className = document.getElementById('tt_classSelect').value;
    const fileInput = document.getElementById('tt_file');

    if (!className || fileInput.files.length === 0) {
        showToast('Please select a class and a file', 'error');
        return;
    }

    try {
        showLoading(true);
        const file = fileInput.files[0];

        // 1. Upload to Storage
        const storageRef = storage.ref(
            `schools/${schoolId}/timetables/${className.replace(/\s+/g, '_')}_${Date.now()}`
        );
        const uploadTask = await storageRef.put(file);
        const fileUrl = await uploadTask.ref.getDownloadURL();

        // 2. Save to Firestore
        const sessionId = document.getElementById('tt_sessionSelect').value;
        const classId = className.toLowerCase().replace(/\s+/g, '-');
        await schoolDoc('timetables', classId).set(
            withSchool({
                className: className,
                sessionId: sessionId,
                fileData: fileUrl,
                fileUrl: fileUrl,
                uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
            })
        );

        showToast(`Timetable for Class ${className} uploaded successfully!`);
        event.target.reset();
        await loadTimetableList();
    } catch (e) {
        console.error('Error uploading timetable:', e);
        showToast('Error uploading timetable', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Load List of Timetables
 */
async function loadTimetableList() {
    const list = document.getElementById('timetableListBody');
    if (!list) return;

    try {
        const sessFilter = document.getElementById('ttSessionSelect')?.value;
        const classFilter = document.getElementById('ttClassSelect')?.value;

        let query = schoolData('timetables');
        // Note: Firestore doesn't support multiple inequalities, but here we use equality.
        // However, complex filtering might require indexes. For now, we'll filter client-side if needed,
        // or just apply simple where clauses if possible.

        let snap = await query.get();
        let docs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        if (sessFilter) {
            // If session is stored in the doc, filter here.
            // Currently erp-timetable.js doesn't seem to store sessionId in the doc during upload.
            // Let's check handleTimetableUpload.
        }
        if (classFilter) {
            docs = docs.filter((d) => d.className === classFilter);
        }

        if (docs.length === 0) {
            list.innerHTML =
                '<tr><td colspan="3" style="text-align:center; padding:2rem;">No timetables found for the selected criteria.</td></tr>';
            return;
        }

        list.innerHTML = docs
            .map((d) => {
                const date = d.uploadedAt ? new Date(d.uploadedAt.seconds * 1000).toLocaleDateString() : 'N/A';
                return `
                <tr>
                    <td><strong>Class ${d.className}</strong></td>
                    <td>${date}</td>
                    <td style="text-align:right;">
                        <a href="${d.fileUrl}" target="_blank" class="btn-portal btn-ghost btn-sm"><i class="fas fa-eye"></i> View</a>
                        <button onclick="deleteTimetable('${d.id}')" class="btn-portal btn-ghost btn-sm btn-danger"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
            })
            .join('');
    } catch (e) {
        console.error('Error loading timetables:', e);
    }
}

async function deleteTimetable(id) {
    if (!confirm('Are you sure you want to delete this timetable?')) return;
    try {
        showLoading(true);
        await schoolDoc('timetables', id).delete();
        showToast('Timetable deleted');
        await loadTimetableList();
    } catch (e) {
        showToast('Error deleting timetable', 'error');
    } finally {
        showLoading(false);
    }
}

// ===== STRUCTURED TIMETABLE BUILDER =====
let ttbState = {
    periods: [],
    schedule: {},
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

function ttbLoadClasses() {
    const sessionEl = document.getElementById('tbSession');
    const classEl = document.getElementById('tbClass');
    if (!sessionEl || !classEl) return;

    if (erpState.sessions && sessionEl.options.length <= 1) {
        sessionEl.innerHTML =
            '<option value="">Select Session</option>' +
            erpState.sessions
                .map((s) => `<option value="${s.id}" ${s.active ? 'selected' : ''}>${s.name}</option>`)
                .join('');
    }

    if (erpState.classes) {
        classEl.innerHTML =
            '<option value="">Select Class</option>' +
            erpState.classes.map((c) => `<option value="${c.name}" data-id="${c.id}">${c.name}</option>`).join('');
    }
}

function ttbInitBuilder() {
    const className = document.getElementById('tbClass').value;
    if (!className) {
        showToast('Please select a class', 'warning');
        return;
    }
    document.getElementById('ttbPeriodConfig').classList.remove('hidden');
    document.getElementById('ttbGridContainer').classList.remove('hidden');
    ttbState.periods = [];
    ttbState.schedule = {};
    ttbRenderPeriods();
    ttbRenderGrid();
}

function ttbAddPeriod() {
    const name = document.getElementById('ttbPeriodName').value.trim();
    const start = document.getElementById('ttbPeriodStart').value;
    const end = document.getElementById('ttbPeriodEnd').value;

    if (!name || !start || !end) {
        showToast('Please fill all period fields', 'warning');
        return;
    }

    ttbState.periods.push({ name, startTime: start, endTime: end, isBreak: false });
    document.getElementById('ttbPeriodName').value = '';
    document.getElementById('ttbPeriodStart').value = '';
    document.getElementById('ttbPeriodEnd').value = '';
    ttbRenderPeriods();
    ttbRenderGrid();
}

function ttbAddStandardPeriods() {
    const standard = [
        { name: 'Period 1', startTime: '08:00', endTime: '08:40' },
        { name: 'Period 2', startTime: '08:40', endTime: '09:20' },
        { name: 'Period 3', startTime: '09:20', endTime: '10:00' },
        { name: 'Break', startTime: '10:00', endTime: '10:20', isBreak: true },
        { name: 'Period 4', startTime: '10:20', endTime: '11:00' },
        { name: 'Period 5', startTime: '11:00', endTime: '11:40' },
        { name: 'Period 6', startTime: '11:40', endTime: '12:20' },
        { name: 'Lunch', startTime: '12:20', endTime: '13:00', isBreak: true },
        { name: 'Period 7', startTime: '13:00', endTime: '13:40' },
        { name: 'Period 8', startTime: '13:40', endTime: '14:20' },
    ];
    ttbState.periods = standard;
    ttbRenderPeriods();
    ttbRenderGrid();
    showToast('Standard periods added', 'success');
}

function ttbAddBreak() {
    const name = document.getElementById('ttbPeriodName').value.trim() || 'Break';
    const start = document.getElementById('ttbPeriodStart').value || '10:00';
    const end = document.getElementById('ttbPeriodEnd').value || '10:15';

    ttbState.periods.push({ name, startTime: start, endTime: end, isBreak: true });
    document.getElementById('ttbPeriodName').value = '';
    ttbRenderPeriods();
    ttbRenderGrid();
}

function ttbRemovePeriod(idx) {
    ttbState.periods.splice(idx, 1);
    ttbRenderPeriods();
    ttbRenderGrid();
}

function ttbRenderPeriods() {
    const container = document.getElementById('ttbPeriodList');
    if (!container) return;
    container.innerHTML = ttbState.periods
        .map(
            (p, i) => `
        <span class="badge ${p.isBreak ? 'badge-warning' : 'badge-primary'} flex align-center gap-0-5 p-0-5 px-1">
            ${p.name} (${p.startTime}-${p.endTime})
            <button onclick="ttbRemovePeriod(${i})" class="btn-icon-sm" title="Remove">&times;</button>
        </span>
    `
        )
        .join('');
}

function ttbRenderGrid() {
    const head = document.getElementById('ttbGridHead');
    const body = document.getElementById('ttbGridBody');
    if (!head || !body || ttbState.periods.length === 0) return;

    head.innerHTML = `<tr>
        <th style="min-width:120px">Period / Time</th>
        ${ttbState.days.map((d) => `<th class="text-center">${d}</th>`).join('')}
    </tr>`;

    body.innerHTML = ttbState.periods
        .map((p, pi) => {
            if (p.isBreak) {
                return `<tr class="bg-warning-light">
                <td class="font-600">${p.name}<br><small class="text-muted">${p.startTime}-${p.endTime}</small></td>
                ${ttbState.days.map((d) => `<td class="text-center text-muted bg-slate-50">${p.name}</td>`).join('')}
            </tr>`;
            }
            return `<tr>
            <td class="font-600">${p.name}<br><small class="text-muted">${p.startTime}-${p.endTime}</small></td>
            ${ttbState.days
                .map((d) => {
                    const val = ttbState.schedule[d]?.[p.name] || {};
                    return `<td>
                    <input type="text" class="form-control ttb-cell mb-0-5"
                        data-day="${d}" data-period="${p.name}" data-field="subject"
                        value="${val.subject || ''}" placeholder="Subject" style="font-size:0.8rem;padding:4px 6px;">
                    <input type="text" class="form-control ttb-cell"
                        data-day="${d}" data-period="${p.name}" data-field="teacher"
                        value="${val.teacher || ''}" placeholder="Teacher" style="font-size:0.75rem;padding:3px 6px;">
                </td>`;
                })
                .join('')}
        </tr>`;
        })
        .join('');
}

async function ttbLoadExisting() {
    const className = document.getElementById('tbClass').value;
    if (!className) return;

    try {
        const docId = className.toLowerCase().replace(/\s+/g, '-') + '-structured';
        const doc = await schoolDoc('timetables', docId).get();
        if (doc.exists) {
            const data = doc.data();
            ttbState.periods = data.periods || [];
            ttbState.schedule = data.schedule || {};
            document.getElementById('ttbPeriodConfig').classList.remove('hidden');
            document.getElementById('ttbGridContainer').classList.remove('hidden');
            ttbRenderPeriods();
            ttbRenderGrid();
            showToast('Existing timetable loaded', 'success');
        }
    } catch (e) {
        console.error('Error loading timetable:', e);
    }
}

async function ttbSaveTimetable() {
    const className = document.getElementById('tbClass').value;
    const sessionId = document.getElementById('tbSession').value;

    if (!className || ttbState.periods.length === 0) {
        showToast('Please configure periods first', 'warning');
        return;
    }

    const inputs = document.querySelectorAll('.ttb-cell');
    inputs.forEach((inp) => {
        const day = inp.dataset.day;
        const period = inp.dataset.period;
        const field = inp.dataset.field;
        if (!ttbState.schedule[day]) ttbState.schedule[day] = {};
        if (!ttbState.schedule[day][period]) ttbState.schedule[day][period] = {};
        ttbState.schedule[day][period][field] = inp.value;
    });

    try {
        showLoading(true);
        const docId = className.toLowerCase().replace(/\s+/g, '-') + '-structured';
        await schoolDoc('timetables', docId).set(
            withSchool({
                className,
                sessionId,
                type: 'structured',
                periods: ttbState.periods,
                schedule: ttbState.schedule,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            }),
            { merge: true }
        );

        showToast('Timetable saved successfully!', 'success');
    } catch (e) {
        console.error('Error saving:', e);
        showToast('Error saving timetable', 'error');
    } finally {
        showLoading(false);
    }
}

function ttbPrintTimetable() {
    const grid = document.getElementById('ttbGridContainer');
    if (!grid) return;
    const printWin = window.open('', '_blank');
    printWin.document.write(`<html><head><title>Timetable - ${document.getElementById('tbClass').value}</title>
        <style>
            body{font-family:Arial,sans-serif;padding:20px;}
            table{width:100%;border-collapse:collapse;}
            th,td{border:1px solid #333;padding:6px 8px;font-size:12px;text-align:center;}
            th{background:#a21a46;color:#fff;}
            input{border:none;background:none;font-size:12px;text-align:center;width:100%;}
        </style></head><body>
        <h2 style="text-align:center;">Class ${document.getElementById('tbClass').value} - Weekly Timetable</h2>
        ${grid.innerHTML}
        </body></html>`);
    printWin.document.close();
    printWin.print();
}

// Hook into window
window.ttbLoadClasses = ttbLoadClasses;
window.ttbInitBuilder = ttbInitBuilder;
window.ttbAddPeriod = ttbAddPeriod;
window.ttbAddStandardPeriods = ttbAddStandardPeriods;
window.ttbAddBreak = ttbAddBreak;
window.ttbRemovePeriod = ttbRemovePeriod;
window.ttbLoadExisting = ttbLoadExisting;
window.ttbSaveTimetable = ttbSaveTimetable;
window.ttbPrintTimetable = ttbPrintTimetable;

// Hook into window
window.initERPTimetable = initERPTimetable;
window.handleTimetableUpload = handleTimetableUpload;
window.deleteTimetable = deleteTimetable;
window.loadTimetableList = loadTimetableList;
