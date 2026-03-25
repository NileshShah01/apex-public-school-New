/**
 * Manual Report Card Upload Tool
 * Handles manual PDF uploads and links them to student IDs in Firestore
 */

async function initManualUpload() {
    console.log("Initializing Manual Upload Tool...");
    const sessionSelect = document.getElementById('mrcu_session');
    const classSelect = document.getElementById('mrcu_class');
    const examSelect = document.getElementById('mrcu_exam');
    
    // Clear existing
    if (sessionSelect) sessionSelect.innerHTML = '<option value="">Loading Sessions...</option>';
    if (classSelect) classSelect.innerHTML = '<option value="">Select Session First</option>';
    if (examSelect) examSelect.innerHTML = '<option value="">Loading Exams...</option>';

    try {
        // 1. Load Sessions using standard ERP logic
        const sessions = await db.collection('sessions').orderBy('name', 'desc').get();
        if (sessionSelect) {
            sessionSelect.innerHTML = '<option value="">Select Session</option>';
            sessions.forEach(doc => {
                const data = doc.data();
                const option = document.createElement('option');
                option.value = data.name;
                option.textContent = data.name;
                sessionSelect.appendChild(option);
            });
            
            // Auto-select current session if available
            if (window.CURRENT_SESSION) {
                sessionSelect.value = window.CURRENT_SESSION;
                loadMrcuClasses();
            }

            sessionSelect.onchange = loadMrcuClasses;
        }

        // 2. Load Exams using standard ERP logic
        const exams = await db.collection('exams').orderBy('name', 'asc').get();
        if (examSelect) {
            examSelect.innerHTML = '<option value="">Select Exam Term</option>';
            exams.forEach(doc => {
                const data = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = data.name;
                examSelect.appendChild(option);
            });
        }

    } catch (error) {
        console.error("Error initializing MRCU:", error);
        showToast("Error loading configuration", "error");
    }
}

async function loadMrcuClasses() {
    const session = document.getElementById('mrcu_session').value;
    const classSelect = document.getElementById('mrcu_class');
    if (!session || !classSelect) return;

    classSelect.innerHTML = '<option value="">Loading Classes...</option>';
    
    try {
        const classes = await db.collection('classes').where('session', '==', session).get();
        classSelect.innerHTML = '<option value="">Select Class</option>';
        classes.forEach(doc => {
            const data = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = data.name;
            classSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading classes:", error);
    }
}

async function loadMrcuStudents() {
    const classId = document.getElementById('mrcu_class').value;
    const container = document.getElementById('mrcu_studentContainer');
    if (!classId || !container) return;

    container.innerHTML = '<div class="text-center p-2"><i class="fas fa-spinner fa-spin"></i> Loading Students...</div>';

    try {
        const students = await db.collection('students')
            .where('classId', '==', classId)
            .orderBy('name', 'asc')
            .get();

        if (students.empty) {
            container.innerHTML = '<p class="text-center p-2 text-muted">No students found in this class.</p>';
            return;
        }

        let html = '<div class="grid-auto-150 gap-0-5">';
        students.forEach(doc => {
            const data = doc.data();
            html += `
                <div class="student-select-card border border-radius-0-5 p-0-5 cursor-pointer hover-bg-indigo-opacity-10 transition-all flex align-center gap-0-5" 
                     onclick="selectMrcuStudent('${doc.id}', '${data.name}', this)">
                    <div class="avatar-xs flex-shrink-0">${data.name.charAt(0)}</div>
                    <div class="truncate text-xs font-600">${data.name}</div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error("Error loading students:", error);
        container.innerHTML = '<p class="text-center p-2 text-red">Error loading students.</p>';
    }
}

function selectMrcuStudent(id, name, element) {
    // Remove active from others
    document.querySelectorAll('.student-select-card').forEach(el => el.classList.remove('border-indigo', 'bg-indigo-opacity-10'));
    
    // Set active
    element.classList.add('border-indigo', 'bg-indigo-opacity-10');
    
    // Set hidden input
    document.getElementById('mrcu_studentId').value = id;
}

async function handleManualUpload() {
    const studentId = document.getElementById('mrcu_studentId').value;
    const session = document.getElementById('mrcu_session').value;
    const examId = document.getElementById('mrcu_exam').value;
    const fileInput = document.getElementById('mrcu_file');
    const isPublished = document.getElementById('mrcu_published').checked;
    
    if (!studentId || !session || !examId || !fileInput.files[0]) {
        customAlert("Please fill all fields and select a PDF file.", "warning");
        return;
    }

    const file = fileInput.files[0];
    if (file.type !== 'application/pdf') {
        customAlert("Please upload a valid PDF file.", "error");
        return;
    }

    // Show progress
    const progressArea = document.getElementById('mrcu_uploadProgress');
    const progressBar = document.getElementById('mrcu_progressBar');
    const percentText = document.getElementById('mrcu_percent');
    
    progressArea.classList.remove('hidden');
    setLoading(true);

    try {
        // Converting to Data URL (Base64) for Firestore storage (simpler for 1-click implementation without Storage rules setup)
        // Note: Firestore has 1MB limit. Most school report cards are < 500KB.
        const reader = new FileReader();
        
        const fileData = await new Promise((resolve, reject) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });

        // Update progress UI simulation
        progressBar.style.width = '50%';
        percentText.textContent = '50%';

        const docId = `${studentId}_${session}_${examId}`;
        
        await db.collection('reports').doc(docId).set({
            studentId,
            session,
            examId,
            fileData, // Base64 PDF
            fileName: file.name,
            uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
            published: isPublished,
            type: 'manual_upload'
        });

        progressBar.style.width = '100%';
        percentText.textContent = '100%';
        
        setTimeout(() => {
            setLoading(false);
            progressArea.classList.add('hidden');
            customAlert("Report Card uploaded successfully and linked to student portal!", "success");
            resetMrcu();
        }, 500);

    } catch (error) {
        console.error("Upload failed:", error);
        setLoading(false);
        progressArea.classList.add('hidden');
        customAlert("Upload failed: " + error.message, "error");
    }
}

function resetMrcu() {
    document.getElementById('mrcu_file').value = '';
    document.getElementById('mrcu_fileStatus').textContent = 'No file chosen';
    document.getElementById('mrcu_studentId').value = '';
    document.getElementById('mrcu_studentContainer').innerHTML = '<p class="text-muted text-sm italic">Select a class to see students...</p>';
    document.getElementById('mrcu_class').value = '';
}
