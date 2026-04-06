/**
 * Class Management UI Enhancements
 * Compatible with existing ERP modules
 */

const ClassUI = {
    // Initialize
    async init() {
        await this.loadSessions();
        this.setupEventListeners();
        console.log('Class UI Enhanced');
    },

    // Load sessions for dropdowns
    async loadSessions() {
        try {
            const sessions = await ClassService.getSessions();

            // Session dropdowns
            const sessionSelects = ['sessionFilter', 'classSessionSelect', 'subjectSessionSelect'];
            sessionSelects.forEach((id) => {
                const el = document.getElementById(id);
                if (el) {
                    el.innerHTML =
                        '<option value="">Select Session</option>' +
                        sessions.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');

                    // Auto-select active session
                    const activeSession = sessions.find((s) => s.isActive);
                    if (activeSession && !el.value) {
                        el.value = activeSession.id;
                    }
                }
            });

            return sessions;
        } catch (e) {
            console.error('Error loading sessions:', e);
            return [];
        }
    },

    // Load classes for a session
    async loadClasses(sessionId, targetId = 'classFilter') {
        const el = document.getElementById(targetId);
        if (!el) return;

        try {
            const classes = await ClassService.getClasses(sessionId);
            el.innerHTML =
                '<option value="">Select Class</option>' +
                classes
                    .filter((c) => !c.disabled)
                    .map((c) => `<option value="${c.id}">${c.name}</option>`)
                    .join('');
        } catch (e) {
            console.error('Error loading classes:', e);
        }
    },

    // Setup event listeners
    setupEventListeners() {
        // Session change -> load classes
        document.querySelectorAll('[id*="Session"]').forEach((el) => {
            if (el.id.includes('Filter') || el.id.includes('Select')) {
                el.addEventListener('change', async (e) => {
                    const targetId = e.target.id.replace('Session', 'Class');
                    if (document.getElementById(targetId)) {
                        await this.loadClasses(e.target.value, targetId);
                    }
                });
            }
        });
    },

    // ==================== SESSION MODAL ====================

    openSessionModal() {
        const modalHtml = `
      <div class="modal-overlay" id="sessionModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3><i class="fas fa-calendar"></i> Create Academic Session</h3>
            <button class="close-modal" onclick="ClassUI.closeSessionModal()">&times;</button>
          </div>
          <form id="sessionForm" onsubmit="ClassUI.handleSessionSubmit(event)">
            <div class="form-group">
              <label>Session Name *</label>
              <input type="text" id="sessionName" placeholder="e.g., 2025-26" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Start Date *</label>
                <input type="date" id="sessionStart" required>
              </div>
              <div class="form-group">
                <label>End Date *</label>
                <input type="date" id="sessionEnd" required>
              </div>
            </div>
            <div class="form-row">
              <label class="checkbox-label">
                <input type="checkbox" id="sessionActive">
                <span>Set as Active Session</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" id="sessionEnrollmentOpen">
                <span>Open Enrollment</span>
              </label>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-portal btn-secondary" onclick="ClassUI.closeSessionModal()">Cancel</button>
              <button type="submit" class="btn-portal btn-primary">Create Session</button>
            </div>
          </form>
        </div>
      </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Set default dates
        const currentYear = new Date().getFullYear();
        document.getElementById('sessionStart').value = `${currentYear}-04-01`;
        document.getElementById('sessionEnd').value = `${currentYear + 1}-03-31`;
    },

    closeSessionModal() {
        document.getElementById('sessionModal')?.remove();
    },

    async handleSessionSubmit(e) {
        e.preventDefault();

        const data = {
            name: document.getElementById('sessionName').value,
            startDate: document.getElementById('sessionStart').value,
            endDate: document.getElementById('sessionEnd').value,
            isActive: document.getElementById('sessionActive').checked,
            isEnrollmentOpen: document.getElementById('sessionEnrollmentOpen').checked,
        };

        setLoading(true);
        try {
            await ClassService.createSession(data);
            showToast('Session created successfully!', 'success');
            this.closeSessionModal();
            await this.loadSessions();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    },

    // ==================== CLASS MODAL ====================

    openClassModal() {
        const sessionSelect = document.getElementById('classSessionSelect')?.value;
        if (!sessionSelect) {
            showToast('Please select a session first', 'warning');
            return;
        }

        const modalHtml = `
      <div class="modal-overlay" id="classModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3><i class="fas fa-school"></i> Add Class</h3>
            <button class="close-modal" onclick="ClassUI.closeClassModal()">&times;</button>
          </div>
          <form id="classForm" onsubmit="ClassUI.handleClassSubmit(event)">
            <input type="hidden" id="classSessionId" value="${sessionSelect}">
            <div class="form-group">
              <label>Class Name *</label>
              <input type="text" id="className" placeholder="e.g., Class 10" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Numeric Order</label>
                <input type="number" id="classNumeric" placeholder="10" min="1">
              </div>
              <div class="form-group">
                <label>Capacity</label>
                <input type="number" id="classCapacity" value="40" min="1">
              </div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-portal btn-secondary" onclick="ClassUI.closeClassModal()">Cancel</button>
              <button type="submit" class="btn-portal btn-primary">Create Class</button>
            </div>
          </form>
        </div>
      </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    closeClassModal() {
        document.getElementById('classModal')?.remove();
    },

    async handleClassSubmit(e) {
        e.preventDefault();

        const data = {
            name: document.getElementById('className').value,
            numericEquivalent:
                parseInt(document.getElementById('classNumeric').value) ||
                parseInt(document.getElementById('className').value.match(/\d+/)?.[0]) ||
                0,
            capacity: parseInt(document.getElementById('classCapacity').value) || 40,
            sessionId: document.getElementById('classSessionId').value,
        };

        setLoading(true);
        try {
            await ClassService.createClass(data);
            showToast('Class created successfully!', 'success');
            this.closeClassModal();
            loadClassesList();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    },

    // ==================== SECTION MODAL ====================

    openSectionModal(classId, className) {
        const modalHtml = `
      <div class="modal-overlay" id="sectionModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3><i class="fas fa-layer-group"></i> Add Section to ${className}</h3>
            <button class="close-modal" onclick="ClassUI.closeSectionModal()">&times;</button>
          </div>
          <form id="sectionForm" onsubmit="ClassUI.handleSectionSubmit(event)">
            <input type="hidden" id="sectionClassId" value="${classId}">
            <div class="form-group">
              <label>Section Name *</label>
              <input type="text" id="sectionName" placeholder="e.g., A, B, C" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Room Number</label>
                <input type="text" id="sectionRoom" placeholder="101">
              </div>
              <div class="form-group">
                <label>Capacity</label>
                <input type="number" id="sectionCapacity" value="40" min="1">
              </div>
            </div>
            <div class="form-group">
              <label>Class Teacher</label>
              <select id="sectionInstructor">
                <option value="">Select Teacher</option>
              </select>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-portal btn-secondary" onclick="ClassUI.closeSectionModal()">Cancel</button>
              <button type="submit" class="btn-portal btn-primary">Add Section</button>
            </div>
          </form>
        </div>
      </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Load instructors
        this.loadInstructors();
    },

    closeSectionModal() {
        document.getElementById('sectionModal')?.remove();
    },

    async loadInstructors() {
        const select = document.getElementById('sectionInstructor');
        if (!select) return;

        try {
            const instructors = await ClassService.getInstructors();
            select.innerHTML =
                '<option value="">Select Teacher</option>' +
                instructors.map((i) => `<option value="${i.id}">${i.displayName}</option>`).join('');
        } catch (e) {
            console.error('Error loading instructors:', e);
        }
    },

    async handleSectionSubmit(e) {
        e.preventDefault();

        const data = {
            name: document.getElementById('sectionName').value,
            roomNumber: document.getElementById('sectionRoom').value,
            capacity: parseInt(document.getElementById('sectionCapacity').value) || 40,
            instructorId: document.getElementById('sectionInstructor').value || null,
        };

        const classId = document.getElementById('sectionClassId').value;

        setLoading(true);
        try {
            await ClassService.createSection(classId, data);
            showToast('Section added successfully!', 'success');
            this.closeSectionModal();
            loadClassDetails(classId);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    },

    // ==================== SUBJECT MODAL ====================

    openSubjectModal() {
        const sessionId = document.getElementById('subjectSessionSelect')?.value;
        if (!sessionId) {
            showToast('Please select a session first', 'warning');
            return;
        }

        const modalHtml = `
      <div class="modal-overlay" id="subjectModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3><i class="fas fa-book"></i> Add Subject</h3>
            <button class="close-modal" onclick="ClassUI.closeSubjectModal()">&times;</button>
          </div>
          <form id="subjectForm" onsubmit="ClassUI.handleSubjectSubmit(event)">
            <input type="hidden" id="subjectSessionId" value="${sessionId}">
            <div class="form-group">
              <label>Subject Name *</label>
              <input type="text" id="subjectName" placeholder="e.g., Mathematics" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Code</label>
                <input type="text" id="subjectCode" placeholder="e.g., MATH">
              </div>
              <div class="form-group">
                <label>Type</label>
                <select id="subjectType">
                  <option value="CORE">Core</option>
                  <option value="ELECTIVE">Elective</option>
                  <option value="CO_SCHOLASTIC">Co-Scholastic</option>
                </select>
              </div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-portal btn-secondary" onclick="ClassUI.closeSubjectModal()">Cancel</button>
              <button type="submit" class="btn-portal btn-primary">Add Subject</button>
            </div>
          </form>
        </div>
      </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    closeSubjectModal() {
        document.getElementById('subjectModal')?.remove();
    },

    async handleSubjectSubmit(e) {
        e.preventDefault();

        const data = {
            name: document.getElementById('subjectName').value,
            code: document.getElementById('subjectCode').value,
            type: document.getElementById('subjectType').value,
            sessionId: document.getElementById('subjectSessionId').value,
        };

        setLoading(true);
        try {
            await ClassService.createSubject(data);
            showToast('Subject added successfully!', 'success');
            this.closeSubjectModal();
            loadSubjectsList();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    },
};

window.ClassUI = ClassUI;
