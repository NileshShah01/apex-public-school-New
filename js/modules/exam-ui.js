/**
 * Exam Management UI Enhancements
 * Compatible with existing ERP modules
 */

const ExamUI = {
    // Initialize
    async init() {
        this.setupEventListeners();
        console.log('Exam UI Enhanced');
    },

    setupEventListeners() {
        // Exam session filter
        const examSessionFilter = document.getElementById('examSessionFilter');
        if (examSessionFilter) {
            examSessionFilter.addEventListener('change', async (e) => {
                await this.loadExamList(e.target.value);
            });
        }
    },

    async loadExamList(sessionId) {
        const container = document.getElementById('examListContainer');
        if (!container) return;

        try {
            const exams = await ExamService.getExams(sessionId);

            if (exams.length === 0) {
                container.innerHTML = '<tr><td colspan="6" class="text-center">No exams found</td></tr>';
                return;
            }

            container.innerHTML = exams
                .map(
                    (exam) => `
        <tr>
          <td>${exam.name}</td>
          <td>${exam.type}</td>
          <td>Class ${exam.classId}</td>
          <td>${exam.examDate}</td>
          <td><span class="badge badge-${exam.status === 'COMPLETED' ? 'success' : 'warning'}">${exam.status}</span></td>
          <td>
            <button class="btn-portal btn-ghost btn-sm" onclick="ExamUI.viewExam('${exam.id}')">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn-portal btn-ghost btn-sm" onclick="ExamUI.editExam('${exam.id}')">
              <i class="fas fa-edit"></i>
            </button>
          </td>
        </tr>
      `
                )
                .join('');
        } catch (e) {
            console.error('Error loading exams:', e);
        }
    },

    // ==================== CREATE EXAM MODAL ====================

    openCreateExamModal() {
        const modalHtml = `
      <div class="modal-overlay" id="examModal">
        <div class="modal-content modal-lg">
          <div class="modal-header">
            <h3><i class="fas fa-file-alt"></i> Create Examination</h3>
            <button class="close-modal" onclick="ExamUI.closeModal()">&times;</button>
          </div>
          <form id="examForm" onsubmit="ExamUI.handleExamSubmit(event)">
            <div class="form-section">
              <h4>Exam Details</h4>
              <div class="form-grid-2">
                <div class="form-group">
                  <label>Exam Name *</label>
                  <input type="text" id="examName" required placeholder="e.g., Unit Test 1">
                </div>
                <div class="form-group">
                  <label>Exam Type *</label>
                  <select id="examType" required>
                    <option value="PERIODIC">Periodic Test</option>
                    <option value="TERMINAL">Terminal Exam</option>
                    <option value="ANNUAL">Annual Exam</option>
                    <option value="MIDTERM">Mid Term</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Session *</label>
                  <select id="examSession" required>
                    <option value="">Select Session</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Class *</label>
                  <select id="examClass" required>
                    <option value="">Select Class</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Exam Date *</label>
                  <input type="date" id="examDate" required>
                </div>
                <div class="form-group">
                  <label>Total Marks *</label>
                  <input type="number" id="examTotalMarks" value="100" required>
                </div>
                <div class="form-group">
                  <label>Passing Marks *</label>
                  <input type="number" id="examPassingMarks" value="33" required>
                </div>
                <div class="form-group">
                  <label>Start Time</label>
                  <input type="time" id="examStartTime" value="09:00">
                </div>
                <div class="form-group">
                  <label>End Time</label>
                  <input type="time" id="examEndTime" value="12:00">
                </div>
              </div>
              <div class="form-group">
                <label>Instructions</label>
                <textarea id="examInstructions" rows="2" placeholder="Any special instructions..."></textarea>
              </div>
            </div>
            
            <div class="form-section">
              <h4>Subjects</h4>
              <div id="examSubjectsList">
                <p class="text-muted">Select subjects after creating exam</p>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn-portal btn-secondary" onclick="ExamUI.closeModal()">Cancel</button>
              <button type="submit" class="btn-portal btn-primary">Create Exam</button>
            </div>
          </form>
        </div>
      </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Load sessions and classes
        this.loadDropdowns();
    },

    closeModal() {
        document.getElementById('examModal')?.remove();
    },

    async loadDropdowns() {
        try {
            const sessions = await ClassService.getSessions();
            const sessionSelect = document.getElementById('examSession');
            if (sessionSelect) {
                sessionSelect.innerHTML =
                    '<option value="">Select Session</option>' +
                    sessions.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
            }

            const classes = await ClassService.getClasses();
            const classSelect = document.getElementById('examClass');
            if (classSelect) {
                classSelect.innerHTML =
                    '<option value="">Select Class</option>' +
                    classes.map((c) => `<option value="${c.name}">${c.name}</option>`).join('');
            }
        } catch (e) {
            console.error('Error loading dropdowns:', e);
        }
    },

    async handleExamSubmit(e) {
        e.preventDefault();

        const data = {
            name: document.getElementById('examName').value,
            type: document.getElementById('examType').value,
            sessionId: document.getElementById('examSession').value,
            classId: document.getElementById('examClass').value,
            examDate: document.getElementById('examDate').value,
            totalMarks: parseInt(document.getElementById('examTotalMarks').value),
            passingMarks: parseInt(document.getElementById('examPassingMarks').value),
            startTime: document.getElementById('examStartTime').value,
            endTime: document.getElementById('examEndTime').value,
            instructions: document.getElementById('examInstructions').value,
        };

        setLoading(true);
        try {
            await ExamService.createExam(data);
            showToast('Exam created successfully!', 'success');
            this.closeModal();
            await this.loadExamList(data.sessionId);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    },

    // ==================== MARKS ENTRY MODAL ====================

    openMarksEntryModal(examId, classId) {
        const modalHtml = `
      <div class="modal-overlay" id="marksModal">
        <div class="modal-content modal-lg">
          <div class="modal-header">
            <h3><i class="fas fa-pen"></i> Enter Marks</h3>
            <button class="close-modal" onclick="ExamUI.closeMarksModal()">&times;</button>
          </div>
          <div class="form-group">
            <label>Select Subject *</label>
            <select id="marksSubject" onchange="ExamUI.loadStudentMarksList('${examId}', '${classId}', this.value)">
              <option value="">Select Subject</option>
            </select>
          </div>
          <div id="marksEntryTable">
            <p class="text-muted">Select a subject to load students</p>
          </div>
        </div>
      </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Load subjects for this exam
        this.loadSubjectsForExam(examId);
    },

    closeMarksModal() {
        document.getElementById('marksModal')?.remove();
    },

    async loadSubjectsForExam(examId) {
        try {
            const exam = await ExamService.getExam(examId);
            const select = document.getElementById('marksSubject');

            if (select && exam.subjects) {
                select.innerHTML =
                    '<option value="">Select Subject</option>' +
                    exam.subjects.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
            }
        } catch (e) {
            console.error('Error loading subjects:', e);
        }
    },

    async loadStudentMarksList(examId, classId, subjectId) {
        const container = document.getElementById('marksEntryTable');
        if (!container) return;

        try {
            // Get students
            const students = await StudentService.getStudents({ class: classId, status: 'ACTIVE' });

            // Get existing marks
            const existingMarks = await ExamService.getMarks(examId, classId, subjectId);
            const marksMap = {};
            existingMarks.forEach((m) => {
                marksMap[m.studentId] = m;
            });

            container.innerHTML = `
        <table class="table">
          <thead>
            <tr>
              <th>Roll No</th>
              <th>Student Name</th>
              <th>Marks</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${students
                .map((s) => {
                    const existing = marksMap[s.id];
                    return `
                <tr>
                  <td>${s.roll_no || '-'}</td>
                  <td>${s.name}</td>
                  <td>
                    <input type="number" class="marks-input" 
                           data-student="${s.id}" 
                           value="${existing?.marks || ''}"
                           min="0" max="100">
                  </td>
                  <td>
                    <select class="status-select" data-student="${s.id}">
                      <option value="PRESENT" ${existing?.isAbsent ? '' : 'selected'}>Present</option>
                      <option value="ABSENT" ${existing?.isAbsent ? 'selected' : ''}>Absent</option>
                    </select>
                  </td>
                </tr>
              `;
                })
                .join('')}
          </tbody>
        </table>
        <div class="form-actions mt-3">
          <button class="btn-portal btn-primary" onclick="ExamUI.saveMarks('${examId}', '${classId}', '${subjectId}')">
            Save Marks
          </button>
        </div>
      `;
        } catch (e) {
            console.error('Error loading marks:', e);
        }
    },

    async saveMarks(examId, classId, subjectId) {
        const rows = document.querySelectorAll('#marksEntryTable tbody tr');
        const marksData = [];

        rows.forEach((row) => {
            const studentId = row.querySelector('.marks-input').dataset.student;
            const marks = parseFloat(row.querySelector('.marks-input').value) || 0;
            const status = row.querySelector('.status-select').value;

            marksData.push({
                studentId,
                marks,
                isAbsent: status === 'ABSENT',
            });
        });

        setLoading(true);
        try {
            const result = await ExamService.submitMarks(examId, classId, subjectId, marksData);
            showToast(`Marks saved! ${result.success} entries`, 'success');
            this.closeMarksModal();
        } catch (e) {
            showToast('Error saving marks', 'error');
        } finally {
            setLoading(false);
        }
    },

    // ==================== GRADING RULES MODAL ====================

    openGradingRulesModal() {
        const modalHtml = `
      <div class="modal-overlay" id="gradingModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3><i class="fas fa-star"></i> Grading Rules</h3>
            <button class="close-modal" onclick="ExamUI.closeGradingModal()">&times;</button>
          </div>
          <form id="gradingForm" onsubmit="ExamUI.handleGradingSubmit(event)">
            <div class="form-group">
              <label>Session *</label>
              <select id="gradingSession" required>
                <option value="">Select Session</option>
              </select>
            </div>
            <div id="gradingRulesContainer">
              <div class="grading-rule-row">
                <input type="text" placeholder="Grade (e.g., A+)" class="grade-input">
                <input type="number" placeholder="Min %" class="min-percent-input" value="90">
                <button type="button" class="btn-portal btn-ghost btn-sm text-danger" onclick="this.parentElement.remove()">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
            <button type="button" class="btn-portal btn-ghost mt-2" onclick="ExamUI.addGradingRule()">
              <i class="fas fa-plus"></i> Add Grade
            </button>
            <div class="form-actions mt-3">
              <button type="button" class="btn-portal btn-secondary" onclick="ExamUI.closeGradingModal()">Cancel</button>
              <button type="submit" class="btn-portal btn-primary">Save Rules</button>
            </div>
          </form>
        </div>
      </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Load sessions
        this.loadSessionDropdown('gradingSession');
    },

    closeGradingModal() {
        document.getElementById('gradingModal')?.remove();
    },

    addGradingRule() {
        const container = document.getElementById('gradingRulesContainer');
        const row = document.createElement('div');
        row.className = 'grading-rule-row';
        row.innerHTML = `
      <input type="text" placeholder="Grade" class="grade-input">
      <input type="number" placeholder="Min %" class="min-percent-input" value="80">
      <button type="button" class="btn-portal btn-ghost btn-sm text-danger" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;
        container.appendChild(row);
    },

    async handleGradingSubmit(e) {
        e.preventDefault();

        const sessionId = document.getElementById('gradingSession').value;
        const rules = [];

        document.querySelectorAll('.grading-rule-row').forEach((row) => {
            const grade = row.querySelector('.grade-input').value;
            const minPercent = parseFloat(row.querySelector('.min-percent-input').value);
            if (grade && minPercent) {
                rules.push({ grade, minPercent });
            }
        });

        // Sort by minPercent descending
        rules.sort((a, b) => b.minPercent - a.minPercent);

        setLoading(true);
        try {
            await ExamService.saveGradingRules(sessionId, rules);
            showToast('Grading rules saved!', 'success');
            this.closeGradingModal();
        } catch (e) {
            showToast('Error saving grading rules', 'error');
        } finally {
            setLoading(false);
        }
    },

    async loadSessionDropdown(targetId) {
        const select = document.getElementById(targetId);
        if (!select) return;

        try {
            const sessions = await ClassService.getSessions();
            select.innerHTML =
                '<option value="">Select Session</option>' +
                sessions.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
        } catch (e) {
            console.error('Error loading sessions:', e);
        }
    },

    // ==================== VIEW EXAM ====================

    async viewExam(examId) {
        try {
            const exam = await ExamService.getExam(examId);

            const modalHtml = `
        <div class="modal-overlay" id="viewExamModal">
          <div class="modal-content">
            <div class="modal-header">
              <h3>${exam.name}</h3>
              <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="detail-grid">
              <div class="detail-item">
                <label>Type</label>
                <span>${exam.type}</span>
              </div>
              <div class="detail-item">
                <label>Class</label>
                <span>${exam.classId}</span>
              </div>
              <div class="detail-item">
                <label>Date</label>
                <span>${exam.examDate}</span>
              </div>
              <div class="detail-item">
                <label>Total Marks</label>
                <span>${exam.totalMarks}</span>
              </div>
              <div class="detail-item">
                <label>Passing Marks</label>
                <span>${exam.passingMarks}</span>
              </div>
              <div class="detail-item">
                <label>Status</label>
                <span class="badge badge-${exam.status === 'COMPLETED' ? 'success' : 'warning'}">${exam.status}</span>
              </div>
            </div>
            <div class="form-actions mt-3">
              <button class="btn-portal btn-primary" onclick="ExamUI.openMarksEntryModal('${examId}', '${exam.classId}')">
                <i class="fas fa-pen"></i> Enter Marks
              </button>
              <button class="btn-portal" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
          </div>
        </div>
      `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } catch (e) {
            showToast('Error loading exam', 'error');
        }
    },
};

window.ExamUI = ExamUI;
