/**
 * Attendance Management UI Enhancements
 * Compatible with existing ERP modules
 */

const AttendanceUI = {
    // Initialize
    async init() {
        this.setupEventListeners();
        console.log('Attendance UI Enhanced');
    },

    setupEventListeners() {
        // Class filter change
        const classFilter = document.getElementById('attendanceClassFilter');
        if (classFilter) {
            classFilter.addEventListener('change', async (e) => {
                await this.loadStudentsForAttendance(e.target.value);
            });
        }

        // Date change
        const dateInput = document.getElementById('attendanceDate');
        if (dateInput) {
            dateInput.addEventListener('change', async () => {
                const classId = document.getElementById('attendanceClassFilter')?.value;
                if (classId) {
                    await this.loadExistingAttendance(classId, dateInput.value);
                }
            });
        }
    },

    // ==================== MARK ATTENDANCE ====================

    async loadStudentsForAttendance(className) {
        const container = document.getElementById('attendanceStudentsList');
        if (!container) return;

        try {
            const students = await StudentService.getStudents({ class: className, status: 'ACTIVE' });

            container.innerHTML = students
                .map(
                    (s) => `
        <tr>
          <td>${s.roll_no || '-'}</td>
          <td>${s.name}</td>
          <td>
            <select class="attendance-status" id="status-${s.id}" data-student="${s.id}">
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LEAVE">Leave</option>
              <option value="LATE">Late</option>
            </select>
          </td>
          <td>
            <input type="text" id="remarks-${s.id}" placeholder="Optional remarks">
          </td>
        </tr>
      `
                )
                .join('');

            // Store student IDs for bulk operations
            this.currentStudents = students.map((s) => s.id);
        } catch (e) {
            console.error('Error loading students:', e);
        }
    },

    async loadExistingAttendance(className, date) {
        if (!className || !date) return;

        try {
            const existing = await AttendanceService.getAttendance(className, date);

            existing.forEach((att) => {
                const statusSelect = document.getElementById(`status-${att.studentId}`);
                const remarksInput = document.getElementById(`remarks-${att.studentId}`);

                if (statusSelect) statusSelect.value = att.status;
                if (remarksInput) remarksInput.value = att.remarks || '';
            });
        } catch (e) {
            console.error('Error loading existing attendance:', e);
        }
    },

    async saveAttendance() {
        const className = document.getElementById('attendanceClassFilter')?.value;
        const date = document.getElementById('attendanceDate')?.value;

        if (!className || !date) {
            showToast('Please select class and date', 'error');
            return;
        }

        const attendanceData = [];
        const rows = document.querySelectorAll('#attendanceStudentsList tr');

        rows.forEach((row) => {
            const studentId = row.querySelector('.attendance-status').dataset.student;
            const status = row.querySelector('.attendance-status').value;
            const remarks = row.querySelector('input[type="text"]')?.value;

            attendanceData.push({ studentId, status, remarks });
        });

        setLoading(true);
        try {
            const result = await AttendanceService.markAttendance(className, date, attendanceData);
            showToast(`Attendance marked! ${result.marked} students`, 'success');
        } catch (e) {
            showToast('Error saving attendance', 'error');
        } finally {
            setLoading(false);
        }
    },

    async markAllPresent() {
        const className = document.getElementById('attendanceClassFilter')?.value;
        const date = document.getElementById('attendanceDate')?.value;

        if (!className || !date || !this.currentStudents) {
            showToast('Please select class and date', 'error');
            return;
        }

        setLoading(true);
        try {
            const result = await AttendanceService.markAllPresent(className, date, this.currentStudents);
            showToast(`All ${result.marked} students marked present`, 'success');

            // Update UI
            this.currentStudents.forEach((id) => {
                const select = document.getElementById(`status-${id}`);
                if (select) select.value = 'PRESENT';
            });
        } catch (e) {
            showToast('Error marking all present', 'error');
        } finally {
            setLoading(false);
        }
    },

    // ==================== ATTENDANCE REPORTS ====================

    openAttendanceReportModal() {
        const modalHtml = `
      <div class="modal-overlay" id="attendanceReportModal">
        <div class="modal-content modal-lg">
          <div class="modal-header">
            <h3><i class="fas fa-chart-bar"></i> Attendance Report</h3>
            <button class="close-modal" onclick="AttendanceUI.closeReportModal()">&times;</button>
          </div>
          <div class="form-section">
            <div class="form-row">
              <div class="form-group">
                <label>Class</label>
                <select id="reportClass">
                  <option value="">Select Class</option>
                </select>
              </div>
              <div class="form-group">
                <label>Start Date</label>
                <input type="date" id="reportStartDate">
              </div>
              <div class="form-group">
                <label>End Date</label>
                <input type="date" id="reportEndDate">
              </div>
            </div>
            <button class="btn-portal btn-primary" onclick="AttendanceUI.generateReport()">
              Generate Report
            </button>
          </div>
          <div id="attendanceReportContent">
            <p class="text-muted">Select class and date range to generate report</p>
          </div>
        </div>
      </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Load classes
        this.loadClassesForReport();

        // Set default dates
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        document.getElementById('reportStartDate').value = monthStart.toISOString().split('T')[0];
        document.getElementById('reportEndDate').value = today.toISOString().split('T')[0];
    },

    closeReportModal() {
        document.getElementById('attendanceReportModal')?.remove();
    },

    async loadClassesForReport() {
        const select = document.getElementById('reportClass');
        if (!select) return;

        try {
            const classes = await ClassService.getClasses();
            select.innerHTML =
                '<option value="">Select Class</option>' +
                classes.map((c) => `<option value="${c.name}">${c.name}</option>`).join('');
        } catch (e) {
            console.error('Error loading classes:', e);
        }
    },

    async generateReport() {
        const className = document.getElementById('reportClass').value;
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;

        if (!className || !startDate || !endDate) {
            showToast('Please fill all fields', 'error');
            return;
        }

        setLoading(true);
        try {
            const report = await AttendanceService.getClassAttendanceReport(className, startDate, endDate);

            const container = document.getElementById('attendanceReportContent');
            container.innerHTML = `
        <div class="report-summary">
          <div class="summary-card">
            <h4>${report.attendancePercentage}%</h4>
            <p>Attendance Rate</p>
          </div>
          <div class="summary-card">
            <h4>${report.totalPresent}</h4>
            <p>Total Present</p>
          </div>
          <div class="summary-card">
            <h4>${report.totalAbsent}</h4>
            <p>Total Absent</p>
          </div>
          <div class="summary-card">
            <h4>${report.totalDays}</h4>
            <p>Days Covered</p>
          </div>
        </div>
        <table class="table mt-3">
          <thead>
            <tr>
              <th>Date</th>
              <th>Present</th>
              <th>Absent</th>
              <th>Leave</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(report.byDate)
                .map(
                    ([date, data]) => `
              <tr>
                <td>${date}</td>
                <td class="text-success">${data.present}</td>
                <td class="text-danger">${data.absent}</td>
                <td>${data.leave}</td>
              </tr>
            `
                )
                .join('')}
          </tbody>
        </table>
      `;
        } catch (e) {
            showToast('Error generating report', 'error');
        } finally {
            setLoading(false);
        }
    },

    // ==================== HOLIDAYS MODAL ====================

    openHolidayModal() {
        const modalHtml = `
      <div class="modal-overlay" id="holidayModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3><i class="fas fa-calendar-minus"></i> Add Holiday</h3>
            <button class="close-modal" onclick="AttendanceUI.closeHolidayModal()">&times;</button>
          </div>
          <form id="holidayForm" onsubmit="AttendanceUI.handleHolidaySubmit(event)">
            <div class="form-group">
              <label>Holiday Name *</label>
              <input type="text" id="holidayName" required placeholder="e.g., Independence Day">
            </div>
            <div class="form-group">
              <label>Date *</label>
              <input type="date" id="holidayDate" required>
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea id="holidayDescription" rows="2"></textarea>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-portal btn-secondary" onclick="AttendanceUI.closeHolidayModal()">Cancel</button>
              <button type="submit" class="btn-portal btn-primary">Add Holiday</button>
            </div>
          </form>
        </div>
      </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    closeHolidayModal() {
        document.getElementById('holidayModal')?.remove();
    },

    async handleHolidaySubmit(e) {
        e.preventDefault();

        const data = {
            name: document.getElementById('holidayName').value,
            date: document.getElementById('holidayDate').value,
            description: document.getElementById('holidayDescription').value,
            sessionId: document.getElementById('holidaySession')?.value,
        };

        setLoading(true);
        try {
            await AttendanceService.createHoliday(data);
            showToast('Holiday added!', 'success');
            this.closeHolidayModal();
        } catch (e) {
            showToast('Error adding holiday', 'error');
        } finally {
            setLoading(false);
        }
    },
};

window.AttendanceUI = AttendanceUI;
