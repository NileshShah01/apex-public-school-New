/**
 * ERP ID CARDS GENERATION MODULE - PREMIUM VERSION
 */

let selectedStudentData = null;

async function initERPIdCards() {
    console.log('Initializing Premium ID Card Module...');
    populateTemplateGallery();
    loadIdGenSessions();
    loadIdIndivSessions();
    loadClassesForIdBatch();
    loadIdGenSessions();
    loadIdIndivSessions();
}

// Load sessions for Batch Generation
async function loadIdGenSessions() {
    const select = document.getElementById('idGen_session');
    if (!select) return;
    
    try {
        const snap = await schoolData('sessions').orderBy('startDate', 'desc').get();
        select.innerHTML = '<option value="">Select Session</option>';
        snap.docs.forEach(doc => {
            const d = doc.data();
            select.innerHTML += `<option value="${d.name}">${d.name}</option>`;
        });
    } catch (e) {
        console.error('Error loading sessions:', e);
    }
}

// Load sessions for Individual Student
async function loadIdIndivSessions() {
    const select = document.getElementById('idIndiv_session');
    if (!select) return;
    
    try {
        const snap = await schoolData('sessions').orderBy('startDate', 'desc').get();
        select.innerHTML = '<option value="">Select Session</option>';
        snap.docs.forEach(doc => {
            const d = doc.data();
            select.innerHTML += `<option value="${d.name}">${d.name}</option>`;
        });
    } catch (e) {
        console.error('Error loading sessions:', e);
    }
}

// Load classes for Individual Student section
async function idIndivLoadClasses() {
    const sel = document.getElementById('idIndiv_session');
    const cls = document.getElementById('idIndiv_class');
    const stu = document.getElementById('idIndiv_student');
    if (!cls || !stu) return;
    
    if (!sel.value) {
        cls.innerHTML = '<option value="">Select Session First</option>';
        stu.innerHTML = '<option value="">Select Class First</option>';
        return;
    }
    
    try {
        const snap = await schoolData('classes')
            .where('sessionId', '==', sel.value)
            .orderBy('sortOrder', 'asc')
            .get();
        
        cls.innerHTML = '<option value="">Select Class</option>';
        snap.docs.forEach(doc => {
            const d = doc.data();
            cls.innerHTML += `<option value="${d.name}">${d.name}</option>`;
        });
    } catch (e) {
        console.error('Error loading classes:', e);
    }
}

// Load students for Individual Student section
async function idIndivLoadStudents() {
    const sel = document.getElementById('idIndiv_session');
    const cls = document.getElementById('idIndiv_class');
    const stu = document.getElementById('idIndiv_student');
    if (!stu) return;
    
    if (!cls.value) {
        stu.innerHTML = '<option value="">Select Class First</option>';
        return;
    }
    
    stu.innerHTML = '<option value="">Loading...</option>';
    
    try {
        const snap = await schoolData('students')
            .where('session', '==', sel.value)
            .where('class', '==', cls.value)
            .orderBy('roll_no', 'asc')
            .get();
        
        stu.innerHTML = '<option value="">Select Student</option>';
        snap.docs.forEach(doc => {
            const d = doc.data();
            stu.innerHTML += `<option value="${doc.id}" data-name="${d.name}">${d.name} - ${d.roll_no || ''}</option>`;
        });
    } catch (e) {
        console.error('Error loading students:', e);
        stu.innerHTML = '<option value="">Error loading</option>';
    }
}

// Preview individual student ID card
async function idIndivPreview() {
    const stu = document.getElementById('idIndiv_student');
    if (!stu || !stu.value) return;
    
    const opt = stu.options[stu.selectedIndex];
    const studentName = opt.getAttribute('data-name') || opt.text;
    
    try {
        const doc = await schoolData('students').doc(stu.value).get();
        if (!doc.exists) return;
        
        const data = doc.data();
        updateIdPreviewWithData(data);
    } catch (e) {
        console.error('Error loading student:', e);
    }
}

// Update preview with student data
async function updateIdPreviewWithData(data) {
    const container = document.getElementById('idCardPreviewContainer');
    if (!container) return;
    
    const selectedTemplate = document.getElementById('selectedIdTemplate')?.value || 'template1';
    const orientation = document.getElementById('idCardOrientation')?.value || 'vertical';
    
    const studentData = {
        name: data.name || '',
        studentId: data.studentId || data.admNo || '',
        class: data.class || '',
        section: data.section || '',
        session: data.session || '',
        fatherName: data.father_name || '',
        dateOfBirth: data.dob || '',
        bloodGroup: data.blood_group || '',
        address: data.address || '',
        photo: data.photo_url || '',
        orientation: orientation,
        schoolName: window.SCHOOL_NAME || 'School ERP',
        schoolLogo: window.SCHOOL_LOGO || '',
    };
    
    // Use template function
    if (window.ID_TEMPLATES && window.ID_TEMPLATES[selectedTemplate]) {
        container.innerHTML = window.ID_TEMPLATES[selectedTemplate](studentData);
    } else {
        container.innerHTML = `<div class="id-card-preview">
            <div class="id-card-header">${studentData.name}</div>
            <div class="id-card-body">Class ${studentData.class} - ${studentData.section}</div>
        </div>`;
    }
}

    // Show initial template preview on load
    setTimeout(() => {
        const selectedTemplate = document.getElementById('selectedIdTemplate')?.value || 'format1';
        showTemplatePreview(selectedTemplate);
    }, 500);
}

function populateTemplateGallery() {
    const gallery = document.getElementById('idTemplateGallery');
    if (!gallery) return;

    gallery.innerHTML = '';
    const templates = [
        { key: 'format1', title: 'Teal Amber', iconColor: '#00897b' },
        { key: 'format2', title: 'Corporate Blue', iconColor: '#1e3a8a' },
        { key: 'format3', title: 'Wave Dark', iconColor: '#312e81' },
        { key: 'format4', title: 'Curve Primary', iconColor: '#0f172a' },
        { key: 'format5', title: 'Gold Premium', iconColor: '#9a3412' },
        { key: 'format6', title: 'Poppins Elite', iconColor: '#1e3c72' },
        { key: 'format7', title: 'Modern Tech H1', iconColor: '#FF416C' },
        { key: 'format8', title: 'Modern Tech H2', iconColor: '#FF4B2B' },
        // 5 NEW PREMIUM TEMPLATES
        { key: 'format9', title: '✨ Gradient Elite', iconColor: '#2a5298', badge: 'NEW' },
        { key: 'format10', title: '✨ Stark Modern', iconColor: '#7c3aed', badge: 'NEW' },
        { key: 'format11', title: '✨ Royal Maroon', iconColor: '#7b0000', badge: 'NEW' },
        { key: 'format12', title: '✨ Saffron India', iconColor: '#FF9933', badge: 'NEW' },
        { key: 'format13', title: '✨ Deep Space', iconColor: '#0a0a1a', badge: 'NEW' },
    ];

    templates.forEach((temp, i) => {
        const div = document.createElement('div');
        div.className = `template-item ${i === 0 ? 'active' : ''}`;
        div.onclick = () => selectTemplate(temp.key, div);
        div.innerHTML = `
            <div style="height:40px; background:${temp.iconColor}; border-radius:4px; display:flex; align-items:center; justify-content:center; color:white; position:relative; overflow:hidden;">
                ${temp.badge ? `<span style="position:absolute;top:2px;right:2px;background:#fbbf24;color:#1e293b;font-size:6px;font-weight:900;padding:1px 4px;border-radius:3px;">${temp.badge}</span>` : ''}
                <i class="fas fa-id-card"></i>
            </div>
            <span>${temp.title}</span>
        `;
        gallery.appendChild(div);
    });
}

function selectTemplate(templateKey, element) {
    document.querySelectorAll('.template-item').forEach((el) => el.classList.remove('active'));
    element.classList.add('active');
    document.getElementById('selectedIdTemplate').value = templateKey;

    // Show sample preview on template selection (without needing a student selected)
    showTemplatePreview(templateKey);
    updateIdPreview();
}

function showTemplatePreview(templateKey) {
    const container = document.getElementById('idCardPreviewContainer');
    if (!container) return;

    // Sample data for preview
    const sampleData = {
        name: 'Sample Student',
        studentId: 'STU-001',
        class: '12',
        section: 'A',
        session: '2025-26',
        fatherName: 'Father Name',
        dateOfBirth: '01-01-2010',
        bloodGroup: 'O+',
        address: 'Sample Address',
        photo: '',
        orientation: document.getElementById('idCardOrientation').value || 'vertical',
        schoolName: window.SCHOOL_NAME || 'School ERP',
        schoolLogo: window.SCHOOL_LOGO || '/images/logo.png',
        schoolContact: window.SCHOOL_PHONE || '',
        schoolWebsite: window.SCHOOL_WEBSITE || '',
        trustName: window.TRUST_NAME || '',
        address_summary: window.SCHOOL_ADDRESS || '',
    };

    const templateFn = window.ID_TEMPLATES[templateKey] || window.ID_TEMPLATES.format1;
    container.innerHTML = templateFn(sampleData);
}

async function updateIdPreview() {
    const studentId = document.getElementById('idPrintSid').value;
    const container = document.getElementById('idCardPreviewContainer');
    const templateKey = document.getElementById('selectedIdTemplate').value || 'format1';
    const orientation = document.getElementById('idCardOrientation').value;

    if (!studentId) return;

    try {
        if (!selectedStudentData || selectedStudentData.id !== studentId) {
            const snap = await schoolDoc('students', studentId).get();
            if (!snap.exists) return;
            selectedStudentData = { id: snap.id, ...snap.data() };
        }

        const data = {
            ...selectedStudentData,
            orientation: orientation,
            schoolName: window.SCHOOL_NAME || 'School ERP',
            schoolLogo: window.SCHOOL_LOGO || '/images/logo.png',
            schoolContact: window.SCHOOL_PHONE || '',
            schoolWebsite: window.SCHOOL_WEBSITE || '',
            trustName: window.TRUST_NAME || '',
            address_summary: window.SCHOOL_ADDRESS || '',
            address: selectedStudentData.address || selectedStudentData.current_address || 'N/A',
            studentId:
                selectedStudentData.studentId || selectedStudentData.student_id || selectedStudentData.id || 'N/A',
            fatherName: selectedStudentData.fatherName || selectedStudentData.father_name || 'N/A',
            motherName: selectedStudentData.motherName || selectedStudentData.mother_name || 'N/A',
            dateOfBirth: selectedStudentData.dateOfBirth || selectedStudentData.dob || 'N/A',
            mobile:
                selectedStudentData.mobile || selectedStudentData.phone || selectedStudentData.student_phone || 'N/A',
            rollNo: selectedStudentData.rollNo || selectedStudentData.roll_no || 'N/A',
            class: selectedStudentData.class || selectedStudentData.student_class || 'N/A',
            section: selectedStudentData.section || '',
            session: selectedStudentData.session || selectedStudentData.academic_session || '2025-26',
            bloodGroup:
                selectedStudentData.bloodGroup || selectedStudentData.blood_group || selectedStudentData.blood || 'N/A',
            photo: selectedStudentData.photo_url || selectedStudentData.photo || '', // Handled by template if empty
        };

        const templateFn = window.ID_TEMPLATES[templateKey] || window.ID_TEMPLATES.template1;
        container.innerHTML = templateFn(data);
    } catch (e) {
        console.error('Preview error:', e);
    }
}

async function generateSingleIdCard() {
    console.log('Attempting to download single ID card...');
    const previewArea = document.getElementById('idCardPreviewContainer');
    const container = previewArea?.querySelector('.id-card-wrapper');

    if (!container) {
        console.warn('No ID card wrapper found in preview area');
        showToast('Please select a student and template first', 'error');
        return;
    }

    try {
        setLoading(true);
        console.log('Capturing ID card canvas...');

        const canvas = await html2canvas(container, {
            scale: 3, // Higher resolution for printing
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: true,
        });

        console.log('Canvas captured successfully. Generating PDF...');
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;

        // Accurate mm conversion (1px = 0.264583mm)
        const widthMm = container.offsetWidth * 0.264583;
        const heightMm = container.offsetHeight * 0.264583;

        const pdf = new jsPDF({
            orientation: widthMm > heightMm ? 'l' : 'p',
            unit: 'mm',
            format: [widthMm, heightMm],
        });

        pdf.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm);
        const fileName = `ID_${selectedStudentData?.name?.replace(/\s+/g, '_') || 'Student'}.pdf`;
        pdf.save(fileName);

        console.log(`PDF saved as ${fileName}`);
        showToast('ID Card Downloaded Successfully', 'success');
    } catch (e) {
        console.error('PDF Export error:', e);
        showToast('Export failed: ' + (e.message || 'Unknown error'), 'error');
    } finally {
        setLoading(false);
    }
}

async function loadClassesForIdBatch() {
    const select = document.getElementById('idBatchClassSelect');
    const sessionSelect = document.getElementById('idGen_session');
    if (!select) return;

    // Get current session from dropdown
    let sessionName = '';
    if (sessionSelect && sessionSelect.value) {
        const sessionOption = sessionSelect.options[sessionSelect.selectedIndex];
        sessionName = sessionOption?.text || '';
    }

    // Filter classes based on session
    let classes = [...new Set(window.allStudents?.map((s) => s.class))].filter(Boolean).sort();

    // If we have a session selected, filter by that session
    if (sessionName && window.allStudents) {
        const sessionStudents = window.allStudents.filter((s) => s.session === sessionName);
        classes = [...new Set(sessionStudents.map((s) => s.class))].filter(Boolean).sort();
    }

    select.innerHTML = '<option value="">-- Select Class --</option>';
    classes.forEach((c) => {
        select.innerHTML += `<option value="${c}">Class ${c}</option>`;
    });
}

async function generateBatchIdCards() {
    const sessionSelect = document.getElementById('idGen_session');
    const className = document.getElementById('idBatchClassSelect').value;
    if (!className) {
        showToast('Please select a class', 'error');
        return;
    }

    try {
        setLoading(true);
        console.log(`Starting batch generation for Class ${className}...`);

        // Get session name for filtering
        const sessionId = sessionSelect?.value || '';
        const sessionDoc = erpState.sessions.find((s) => s.id === sessionId);
        const sessionName = sessionDoc ? sessionDoc.name : '';

        // Filter students by class AND session
        let students = window.allStudents.filter((s) => s.class === className);

        // Also filter by session if selected
        if (sessionName) {
            students = students.filter((s) => s.session === sessionName);
        }

        if (students.length === 0) {
            showToast('No students found in this class', 'error');
            return;
        }

        const templateKey = document.getElementById('selectedIdTemplate').value || 'format1';
        const orientation = document.getElementById('idCardOrientation').value;
        const templateFn = window.ID_TEMPLATES[templateKey] || window.ID_TEMPLATES.format1;

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        let x = 10,
            y = 10;

        // Dynamic Dimensions based on orientation (CR80 Standard)
        const isHorizontal = orientation === 'horizontal';
        const cardW = isHorizontal ? 85.6 : 53.98;
        const cardH = isHorizontal ? 53.98 : 85.6;
        const gap = 8;

        // Hidden container for rendering
        const renderDiv = document.createElement('div');
        renderDiv.style.position = 'absolute';
        renderDiv.style.left = '-9999px';
        renderDiv.style.top = '0';
        document.body.appendChild(renderDiv);

        console.log(`Processing ${students.length} students...`);

        for (let i = 0; i < students.length; i++) {
            const s = students[i];
            const data = {
                ...s,
                orientation: orientation,
                schoolName: window.SCHOOL_NAME || 'School ERP',
                schoolLogo: window.SCHOOL_LOGO || '/images/logo.png',
                schoolContact: window.SCHOOL_PHONE || '',
                schoolWebsite: window.SCHOOL_WEBSITE || '',
                trustName: window.TRUST_NAME || '',
                address_summary: window.SCHOOL_ADDRESS || '',
                address: s.address || s.current_address || 'N/A',
                studentId: s.studentId || s.student_id || s.id || 'N/A',
                fatherName: s.fatherName || s.father_name || 'N/A',
                motherName: s.motherName || s.mother_name || 'N/A',
                dateOfBirth: s.dateOfBirth || s.dob || 'N/A',
                mobile: s.mobile || s.phone || s.student_phone || 'N/A',
                rollNo: s.rollNo || s.roll_no || 'N/A',
                class: s.class || s.student_class || 'N/A',
                section: s.section || '',
                session: s.session || s.academic_session || '2025-26',
                bloodGroup: s.bloodGroup || s.blood_group || s.blood || 'N/A',
                photo: s.photo_url || s.photo || '',
            };

            renderDiv.innerHTML = templateFn(data);
            const cardEl = renderDiv.querySelector('.id-card-wrapper');

            if (!cardEl) continue;

            const canvas = await html2canvas(cardEl, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
            });
            const imgData = canvas.toDataURL('image/png');

            if (y + cardH > 280) {
                pdf.addPage();
                y = 10;
            }

            pdf.addImage(imgData, 'PNG', x, y, cardW, cardH);

            x += cardW + gap;
            if (x + cardW > 200) {
                x = 10;
                y += cardH + gap;
            }
        }

        document.body.removeChild(renderDiv);
        const batchFileName = `ID_Cards_Class_${className}.pdf`;
        pdf.save(batchFileName);

        console.log(`Batch PDF saved as ${batchFileName}`);
        showToast(`Generated ${students.length} ID Cards`, 'success');
    } catch (e) {
        console.error('Batch Export error:', e);
        showToast('Batch generation failed', 'error');
    } finally {
        setLoading(false);
    }
}

// Global Exports
window.initERPIdCards = initERPIdCards;
window.updateIdPreview = updateIdPreview;
window.generateSingleIdCard = generateSingleIdCard;
window.generateBatchIdCards = generateBatchIdCards;
window.selectTemplate = selectTemplate;
window.showTemplatePreview = showTemplatePreview;
window.idIndivLoadClasses = idIndivLoadClasses;
window.idIndivLoadStudents = idIndivLoadStudents;
window.idIndivPreview = idIndivPreview;
window.loadIdGenSessions = loadIdGenSessions;
window.loadIdIndivSessions = loadIdIndivSessions;
window.loadClassesForIdBatch = loadClassesForIdBatch;
