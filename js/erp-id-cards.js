/**
 * ERP ID CARDS GENERATION MODULE - PREMIUM VERSION
 */

let selectedStudentData = null;

async function initERPIdCards() {
    console.log("Initializing Premium ID Card Module...");
    populateTemplateGallery();
    loadClassesForIdBatch();
}

function populateTemplateGallery() {
    const gallery = document.getElementById('idTemplateGallery');
    if (!gallery) return;

    gallery.innerHTML = '';
    const templates = [
        { key: 'format1', title: 'Teal Amber', iconColor: '#4db6ac' },
        { key: 'format2', title: 'Corporate Blue', iconColor: '#1e40af' },
        { key: 'format3', title: 'Wave Dark', iconColor: '#1e3a8a' },
        { key: 'format4', title: 'Curve Primary', iconColor: '#312e81' },
        { key: 'format5', title: 'Stark Modern', iconColor: '#1e293b' }
    ];

    templates.forEach((temp, i) => {
        const div = document.createElement('div');
        div.className = `template-item ${i === 0 ? 'active' : ''}`;
        div.onclick = () => selectTemplate(temp.key, div);
        div.innerHTML = `
            <div style="height:40px; background:${temp.iconColor}; border-radius:4px; display:flex; align-items:center; justify-content:center; color:white;">
                <i class="fas fa-id-card"></i>
            </div>
            <span>${temp.title}</span>
        `;
        gallery.appendChild(div);
    });
}

function selectTemplate(templateKey, element) {
    document.querySelectorAll('.template-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    document.getElementById('selectedIdTemplate').value = templateKey;
    updateIdPreview();
}

async function updateIdPreview() {
    const studentId = document.getElementById('idPrintSid').value;
    const container = document.getElementById('idCardPreviewContainer');
    const templateKey = document.getElementById('selectedIdTemplate').value || 'format1';
    const orientation = document.getElementById('idCardOrientation').value;

    if (!studentId) return;

    try {
        if (!selectedStudentData || selectedStudentData.id !== studentId) {
            const snap = await db.collection('students').doc(studentId).get();
            if (!snap.exists) return;
            selectedStudentData = { id: snap.id, ...snap.data() };
        }

        const data = {
            ...selectedStudentData,
            orientation: orientation,
            schoolName: "APEX PUBLIC SCHOOL",
            schoolLogo: "../images/ApexPublicSchoolLogo.png",
            schoolContact: "+91 98765 43210",
            schoolWebsite: "www.apexpublicschool.edu",
            trustName: "APEX EDUCATION TRUST (R)",
            address_summary: "Main Road, Sector 5, City - 000000",
            address: selectedStudentData.address || "Main Road, Sector 5, City",
            studentId: selectedStudentData.studentId || selectedStudentData.student_id || selectedStudentData.id || "N/A",
            fatherName: selectedStudentData.fatherName || selectedStudentData.father_name || "N/A",
            motherName: selectedStudentData.motherName || selectedStudentData.mother_name || "N/A",
            dateOfBirth: selectedStudentData.dateOfBirth || selectedStudentData.dob || "N/A",
            mobile: selectedStudentData.mobile || selectedStudentData.phone || "N/A",
            rollNo: selectedStudentData.rollNo || selectedStudentData.roll_no || "N/A"
        };

        const templateFn = window.ID_TEMPLATES[templateKey] || window.ID_TEMPLATES.template1;
        container.innerHTML = templateFn(data);
    } catch (e) {
        console.error("Preview error:", e);
    }
}

async function generateSingleIdCard() {
    const container = document.getElementById('idCardPreviewContainer').querySelector('.id-card-wrapper');
    if (!container) {
        showToast("Please select a student and template first", "error");
        return;
    }

    try {
        setLoading(true);
        const canvas = await html2canvas(container, {
            scale: 4, // High Resolution
            useCORS: true,
            backgroundColor: null
        });

        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const width = container.offsetWidth * 0.264583; // px to mm
        const height = container.offsetHeight * 0.264583;

        const pdf = new jsPDF({
            orientation: width > height ? 'l' : 'p',
            unit: 'mm',
            format: [width, height]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, width, height);
        pdf.save(`ID_${selectedStudentData.name || 'Student'}.pdf`);
        showToast("ID Card Downloaded", "success");
    } catch (e) {
        console.error(e);
        showToast("Export failed", "error");
    } finally {
        setLoading(false);
    }
}

async function loadClassesForIdBatch() {
    const select = document.getElementById('idBatchClassSelect');
    if (!select) return;
    
    // Use cached classes from admin-dashboard.js if available
    const classes = [...new Set(window.allStudents?.map(s => s.class))].filter(Boolean).sort();
    select.innerHTML = '<option value="">-- Select Class --</option>';
    classes.forEach(c => {
        select.innerHTML += `<option value="${c}">Class ${c}</option>`;
    });
}

async function generateBatchIdCards() {
    const className = document.getElementById('idBatchClassSelect').value;
    if (!className) {
        showToast("Please select a class", "error");
        return;
    }

    try {
        setLoading(true);
        const students = window.allStudents.filter(s => s.class === className);
        if (students.length === 0) {
            showToast("No students found in this class", "error");
            return;
        }

        const templateKey = document.getElementById('selectedIdTemplate').value;
        const orientation = document.getElementById('idCardOrientation').value;
        const templateFn = window.ID_TEMPLATES[templateKey] || window.ID_TEMPLATES.template1;

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        let x = 10, y = 10;
        const cardW = 54, cardH = 86; // mm
        const gap = 10;

        // Hidden container for rendering
        const renderDiv = document.createElement('div');
        renderDiv.style.position = 'absolute';
        renderDiv.style.left = '-9999px';
        document.body.appendChild(renderDiv);

        for (let i = 0; i < students.length; i++) {
            const s = students[i];
            const data = {
                ...s,
                orientation: orientation,
                schoolName: "APEX PUBLIC SCHOOL",
                schoolLogo: "../images/ApexPublicSchoolLogo.png",
                schoolContact: "+91 98765 43210",
                schoolWebsite: "www.apexpublicschool.edu",
                trustName: "APEX EDUCATION TRUST (R)",
                address_summary: "Main Road, Sector 5, City - 000000",
                address: s.address || "N/A",
                studentId: s.studentId || s.student_id || s.id || "N/A",
                fatherName: s.fatherName || s.father_name || "N/A",
                motherName: s.motherName || s.mother_name || "N/A",
                dateOfBirth: s.dateOfBirth || s.dob || "N/A",
                mobile: s.mobile || s.phone || "N/A",
                rollNo: s.rollNo || s.roll_no || "N/A"
            };

            renderDiv.innerHTML = templateFn(data);
            const cardEl = renderDiv.querySelector('.id-card-wrapper');
            
            const canvas = await html2canvas(cardEl, { scale: 3, useCORS: true });
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
        pdf.save(`ID_Cards_Class_${className}.pdf`);
        showToast(`Generated ${students.length} ID Cards`, "success");
    } catch (e) {
        console.error(e);
        showToast("Batch generation failed", "error");
    } finally {
        setLoading(false);
    }
}

// Global Exports
window.initERPIdCards = initERPIdCards;
window.updateIdPreview = updateIdPreview;
window.generateSingleIdCard = generateSingleIdCard;
window.generateBatchIdCards = generateBatchIdCards;
