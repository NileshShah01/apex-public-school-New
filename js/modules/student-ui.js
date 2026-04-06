/**
 * Student Management UI Enhancements
 * Compatible with existing ERP modules
 */

const StudentUI = {
    // Initialize
    async init() {
        this.setupEventListeners();
        console.log('Student UI Enhanced');
    },

    // Setup event listeners
    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));
        }
    },

    debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    async handleSearch(e) {
        const term = e.target.value;
        if (term.length < 2) return;

        try {
            const results = await StudentService.searchStudents(term, {
                class: document.getElementById('classFilter')?.value,
            });
            this.renderStudentResults(results);
        } catch (e) {
            console.error('Search error:', e);
        }
    },

    renderStudentResults(students) {
        const tbody = document.getElementById('studentTableBody');
        if (!tbody) return;

        tbody.innerHTML = students
            .map(
                (s) => `
      <tr>
        <td><input type="checkbox" class="student-checkbox" value="${s.id}"></td>
        <td>${s.student_id || '-'}</td>
        <td>${s.roll_no || '-'}</td>
        <td><strong>${s.name || '-'}</strong></td>
        <td>Class ${s.class || '-'} / ${s.section || '-'}</td>
        <td>${s.father_name || '-'}</td>
        <td>${s.phone || '-'}</td>
        <td>
          <button class="btn-portal btn-ghost btn-sm" onclick="StudentUI.viewStudent('${s.id}')">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn-portal btn-ghost btn-sm" onclick="StudentUI.editStudent('${s.id}')">
            <i class="fas fa-edit"></i>
          </button>
        </td>
      </tr>
    `
            )
            .join('');
    },

    // ==================== ADD STUDENT MODAL ====================

    openAddStudentModal() {
        const sessionId =
            document.getElementById('addStudentSession')?.value || document.querySelector('[id*="session"]')?.value;

        const modalHtml = `
      <div class="modal-overlay" id="studentModal">
        <div class="modal-content modal-lg">
          <div class="modal-header">
            <h3><i class="fas fa-user-plus"></i> Add New Student</h3>
            <button class="close-modal" onclick="StudentUI.closeModal()">&times;</button>
          </div>
          <form id="studentForm" onsubmit="StudentUI.handleStudentSubmit(event)">
            <input type="hidden" id="studentSessionId" value="${sessionId || ''}">
            
            <div class="form-section">
              <h4>Basic Information</h4>
              <div class="form-grid-2">
                <div class="form-group">
                  <label>First Name *</label>
                  <input type="text" id="studentFirstName" required>
                </div>
                <div class="form-group">
                  <label>Last Name *</label>
                  <input type="text" id="studentLastName" required>
                </div>
                <div class="form-group">
                  <label>Date of Birth *</label>
                  <input type="date" id="studentDob" required>
                </div>
                <div class="form-group">
                  <label>Gender *</label>
                  <select id="studentGender" required>
                    <option value="">Select</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Blood Group</label>
                  <select id="studentBloodGroup">
                    <option value="">Select</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Category</label>
                  <select id="studentCategory">
                    <option value="">Select</option>
                    <option value="GENERAL">General</option>
                    <option value="OBC">OBC</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div class="form-section">
              <h4>Academic Details</h4>
              <div class="form-grid-2">
                <div class="form-group">
                  <label>Class *</label>
                  <select id="studentClass" required onchange="StudentUI.loadSectionsForClass(this.value)">
                    <option value="">Select Class</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Section</label>
                  <select id="studentSection">
                    <option value="">Select Section</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Roll Number</label>
                  <input type="number" id="studentRoll">
                </div>
                <div class="form-group">
                  <label>Admission Number</label>
                  <input type="text" id="studentAdmissionNumber">
                </div>
              </div>
            </div>
            
            <div class="form-section">
              <h4>Parent/Guardian Information</h4>
              <div class="form-grid-2">
                <div class="form-group">
                  <label>Father's Name</label>
                  <input type="text" id="studentFatherName">
                </div>
                <div class="form-group">
                  <label>Mother's Name</label>
                  <input type="text" id="studentMotherName">
                </div>
                <div class="form-group">
                  <label>Phone Number *</label>
                  <input type="tel" id="studentPhone" required maxlength="10">
                </div>
                <div class="form-group">
                  <label>Email</label>
                  <input type="email" id="studentEmail">
                </div>
              </div>
              <div class="form-group">
                <label>Address</label>
                <textarea id="studentAddress" rows="2"></textarea>
              </div>
            </div>
            
            <div class="form-section">
              <h4>Additional Information</h4>
              <div class="form-grid-2">
                <div class="form-group">
                  <label>Aadhar Number</label>
                  <input type="text" id="studentAadhar" maxlength="14" 
                         placeholder="XXXX-XXXX-XXXX">
                </div>
                <div class="form-group">
                  <label>RFID Number</label>
                  <input type="text" id="studentRfid">
                </div>
                <div class="form-group">
                  <label>Hostel</label>
                  <select id="studentHostel">
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Transport</label>
                  <select id="studentTransport">
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn-portal btn-secondary" onclick="StudentUI.closeModal()">Cancel</button>
              <button type="submit" class="btn-portal btn-primary">Save Student</button>
            </div>
          </form>
        </div>
      </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Load classes
        this.loadClassesForForm();
    },

    closeModal() {
        document.getElementById('studentModal')?.remove();
    },

    async loadClassesForForm() {
        const select = document.getElementById('studentClass');
        if (!select) return;

        try {
            const sessionId = document.getElementById('studentSessionId')?.value;
            const classes = await ClassService.getClasses(sessionId);
            select.innerHTML =
                '<option value="">Select Class</option>' +
                classes
                    .filter((c) => !c.disabled)
                    .map((c) => `<option value="${c.id}">${c.name}</option>`)
                    .join('');
        } catch (e) {
            console.error('Error loading classes:', e);
        }
    },

    async loadSectionsForClass(classId) {
        const sectionSelect = document.getElementById('studentSection');
        if (!sectionSelect || !classId) {
            sectionSelect.innerHTML = '<option value="">Select Section</option>';
            return;
        }

        try {
            const sections = await ClassService.getSections(classId);
            sectionSelect.innerHTML =
                '<option value="">Select Section</option>' +
                sections.map((s) => `<option value="${s.name}">${s.name}</option>`).join('');
        } catch (e) {
            console.error('Error loading sections:', e);
        }
    },

    async handleStudentSubmit(e) {
        e.preventDefault();

        const data = {
            firstName: document.getElementById('studentFirstName').value,
            lastName: document.getElementById('studentLastName').value,
            name:
                document.getElementById('studentFirstName').value +
                ' ' +
                document.getElementById('studentLastName').value,
            dob: document.getElementById('studentDob').value,
            gender: document.getElementById('studentGender').value,
            bloodGroup: document.getElementById('studentBloodGroup').value,
            category: document.getElementById('studentCategory').value,
            classId: document.getElementById('studentClass').value,
            class: document.getElementById('studentClass').selectedOptions[0]?.text,
            section: document.getElementById('studentSection').value,
            rollNumber: parseInt(document.getElementById('studentRoll').value) || null,
            admissionNumber: document.getElementById('studentAdmissionNumber').value,
            fatherName: document.getElementById('studentFatherName').value,
            motherName: document.getElementById('studentMotherName').value,
            phone: document.getElementById('studentPhone').value,
            email: document.getElementById('studentEmail').value,
            address: document.getElementById('studentAddress').value,
            aadhar: document.getElementById('studentAadhar').value,
            rfid: document.getElementById('studentRfid').value,
            hostel: document.getElementById('studentHostel').value === 'Yes',
            transport: document.getElementById('studentTransport').value === 'Yes',
            sessionId: document.getElementById('studentSessionId').value,
        };

        setLoading(true);
        try {
            const result = await StudentService.createStudent(data);
            showToast('Student added successfully!', 'success');
            this.closeModal();

            // Refresh student list
            if (typeof loadInitialData === 'function') {
                loadInitialData();
            }
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    },

    // ==================== VIEW/EDIT STUDENT ====================

    async viewStudent(studentId) {
        try {
            const student = await StudentService.getStudent(studentId);
            const guardians = await StudentService.getGuardians(studentId);

            const modalHtml = `
        <div class="modal-overlay" id="viewStudentModal">
          <div class="modal-content modal-lg">
            <div class="modal-header">
              <h3><i class="fas fa-user"></i> Student Details</h3>
              <button class="close-modal" onclick="StudentUI.closeViewModal()">&times;</button>
            </div>
            <div class="student-details">
              <div class="detail-grid">
                <div class="detail-item">
                  <label>Student ID</label>
                  <span>${student.student_id}</span>
                </div>
                <div class="detail-item">
                  <label>Name</label>
                  <span>${student.name}</span>
                </div>
                <div class="detail-item">
                  <label>Class</label>
                  <span>${student.class} ${student.section || ''}</span>
                </div>
                <div class="detail-item">
                  <label>Roll No</label>
                  <span>${student.roll_no || '-'}</span>
                </div>
                <div class="detail-item">
                  <label>DOB</label>
                  <span>${student.dob || '-'}</span>
                </div>
                <div class="detail-item">
                  <label>Gender</label>
                  <span>${student.gender || '-'}</span>
                </div>
                <div class="detail-item">
                  <label>Father's Name</label>
                  <span>${student.father_name || '-'}</span>
                </div>
                <div class="detail-item">
                  <label>Mother's Name</label>
                  <span>${student.mother_name || '-'}</span>
                </div>
                <div class="detail-item">
                  <label>Phone</label>
                  <span>${student.phone || '-'}</span>
                </div>
                <div class="detail-item">
                  <label>Address</label>
                  <span>${student.address || '-'}</span>
                </div>
              </div>
              
              ${
                  guardians.length > 0
                      ? `
                <h4 class="mt-3">Guardians</h4>
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>Relation</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${guardians
                        .map(
                            (g) => `
                      <tr>
                        <td>${g.relationship}</td>
                        <td>${g.first_name} ${g.last_name || ''}</td>
                        <td>${g.phone || '-'}</td>
                        <td>${g.email || '-'}</td>
                      </tr>
                    `
                        )
                        .join('')}
                  </tbody>
                </table>
              `
                      : ''
              }
            </div>
            <div class="form-actions">
              <button class="btn-portal" onclick="StudentUI.editStudent('${studentId}')">
                <i class="fas fa-edit"></i> Edit
              </button>
              <button class="btn-portal btn-secondary" onclick="StudentUI.closeViewModal()">Close</button>
            </div>
          </div>
        </div>
      `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } catch (error) {
            showToast('Error loading student details', 'error');
        }
    },

    closeViewModal() {
        document.getElementById('viewStudentModal')?.remove();
    },

    async editStudent(studentId) {
        this.closeViewModal();

        try {
            const student = await StudentService.getStudent(studentId);

            // Open modal with data
            await this.openAddStudentModal();

            // Fill form
            document.getElementById('studentFirstName').value = student.name?.split(' ')[0] || '';
            document.getElementById('studentLastName').value = student.name?.split(' ').slice(1).join(' ') || '';
            document.getElementById('studentDob').value = student.dob || '';
            document.getElementById('studentGender').value = student.gender || '';
            document.getElementById('studentFatherName').value = student.father_name || '';
            document.getElementById('studentMotherName').value = student.mother_name || '';
            document.getElementById('studentPhone').value = student.phone || '';
            document.getElementById('studentEmail').value = student.email || '';
            document.getElementById('studentAddress').value = student.address || '';
            document.getElementById('studentAadhar').value = student.aadhar || '';
            document.getElementById('studentRfid').value = student.rfid || '';

            // Store ID for update
            document.getElementById('studentForm').dataset.editId = studentId;
        } catch (e) {
            showToast('Error loading student', 'error');
        }
    },

    // ==================== BULK IMPORT ====================

    openBulkImportModal() {
        const modalHtml = `
      <div class="modal-overlay" id="bulkImportModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3><i class="fas fa-file-import"></i> Bulk Import Students</h3>
            <button class="close-modal" onclick="StudentUI.closeBulkImportModal()">&times;</button>
          </div>
          <form id="bulkImportForm" onsubmit="StudentUI.handleBulkImport(event)">
            <div class="form-group">
              <label>Select Class *</label>
              <select id="importClass" required>
                <option value="">Select Class</option>
              </select>
            </div>
            <div class="form-group">
              <label>Select Session *</label>
              <select id="importSession" required>
                <option value="">Select Session</option>
              </select>
            </div>
            <div class="form-group">
              <label>Upload File *</label>
              <input type="file" id="importFile" accept=".csv,.xlsx,.xls" required>
              <small class="text-muted">CSV or Excel file with columns: Name, Father's Name, Phone, DOB, Gender</small>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-portal btn-secondary" onclick="StudentUI.closeBulkImportModal()">Cancel</button>
              <button type="submit" class="btn-portal btn-primary">Import</button>
            </div>
          </form>
        </div>
      </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Load classes and sessions
        this.loadDropdownsForImport();
    },

    closeBulkImportModal() {
        document.getElementById('bulkImportModal')?.remove();
    },

    async loadDropdownsForImport() {
        try {
            const sessions = await ClassService.getSessions();
            const sessionSelect = document.getElementById('importSession');
            if (sessionSelect) {
                sessionSelect.innerHTML =
                    '<option value="">Select Session</option>' +
                    sessions.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
            }

            const classes = await ClassService.getClasses();
            const classSelect = document.getElementById('importClass');
            if (classSelect) {
                classSelect.innerHTML =
                    '<option value="">Select Class</option>' +
                    classes
                        .filter((c) => !c.disabled)
                        .map((c) => `<option value="${c.id}">${c.name}</option>`)
                        .join('');
            }
        } catch (e) {
            console.error('Error loading dropdowns:', e);
        }
    },

    async handleBulkImport(e) {
        e.preventDefault();

        const fileInput = document.getElementById('importFile');
        const file = fileInput.files[0];
        if (!file) {
            showToast('Please select a file', 'error');
            return;
        }

        setLoading(true);
        try {
            // Parse file (simplified - in production use a proper parser)
            const studentsData = await this.parseFile(file);
            const classId = document.getElementById('importClass').value;
            const sessionId = document.getElementById('importSession').value;

            const result = await StudentService.bulkImportStudents(studentsData, classId, sessionId);

            showToast(`Imported ${result.success} students, ${result.failed} failed`, 'success');
            this.closeBulkImportModal();

            if (typeof loadInitialData === 'function') {
                loadInitialData();
            }
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    },

    async parseFile(file) {
        // Simplified - would need proper CSV/Excel parsing
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                const lines = text.split('\n').filter((l) => l.trim());
                const data = lines.slice(1).map((line) => {
                    const cols = line.split(',');
                    return {
                        name: cols[0]?.trim(),
                        father_name: cols[1]?.trim(),
                        phone: cols[2]?.trim(),
                        dob: cols[3]?.trim(),
                        gender: cols[4]?.trim() || 'MALE',
                    };
                });
                resolve(data);
            };
            reader.readAsText(file);
        });
    },
};

window.StudentUI = StudentUI;
