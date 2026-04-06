/**
 * Notifications & Reports UI Enhancements
 * Compatible with existing ERP modules
 */

const NotificationUI = {
    async init() {
        console.log('Notification UI Enhanced');
    },

    openSendSMSModal() {
        const modalHtml = `
      <div class="modal-overlay" id="smsModal">
        <div class="modal-content">
          <div class="modal-header"><h3><i class="fas fa-sms"></i> Send SMS</h3>
            <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <form onsubmit="NotificationUI.handleSMSSubmit(event)">
            <div class="form-group"><label>Recipients *</label>
              <select id="smsRecipients" required>
                <option value="">Select</option>
                <option value="ALL">All Students</option>
                <option value="CLASS">Specific Class</option>
                <option value="FEES_DUE">Students with Fee Dues</option>
              </select>
            </div>
            <div class="form-group" id="classSelectorDiv" style="display:none;">
              <label>Select Class</label><select id="smsClass"><option value="">Select</option></select>
            </div>
            <div class="form-group"><label>Message *</label>
              <textarea id="smsMessage" rows="4" maxlength="160" required placeholder="Max 160 characters"></textarea>
              <small class="text-muted"><span id="smsCharCount">0</span>/160 characters</small>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-portal btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
              <button type="submit" class="btn-portal btn-primary">Send SMS</button>
            </div>
          </form>
        </div>
      </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Character counter
        document.getElementById('smsMessage').addEventListener('input', (e) => {
            document.getElementById('smsCharCount').textContent = e.target.value.length;
        });

        // Show class selector
        document.getElementById('smsRecipients').addEventListener('change', (e) => {
            document.getElementById('classSelectorDiv').style.display = e.target.value === 'CLASS' ? 'block' : 'none';
            if (e.target.value === 'CLASS') this.loadClassesForSMS();
        });
    },

    async loadClassesForSMS() {
        const classes = await ClassService.getClasses();
        document.getElementById('smsClass').innerHTML =
            '<option value="">Select</option>' +
            classes.map((c) => `<option value="${c.name}">${c.name}</option>`).join('');
    },

    async handleSMSSubmit(e) {
        e.preventDefault();
        const recipientType = document.getElementById('smsRecipients').value;
        const message = document.getElementById('smsMessage').value;

        let result;
        setLoading(true);
        try {
            if (recipientType === 'ALL') {
                result = await NotificationService.notifyAll('SMS', message);
            } else if (recipientType === 'CLASS') {
                const className = document.getElementById('smsClass').value;
                result = await NotificationService.notifyClass(className, 'SMS', message);
            } else if (recipientType === 'FEES_DUE') {
                const invoices = await InvoiceService.getPendingInvoices();
                const studentIds = [...new Set(invoices.map((i) => i.student_id))];
                result = await NotificationService.sendFeeReminder(studentIds);
            }

            showToast(`SMS sent to ${result.sent} recipients!`, 'success');
            document.querySelector('#smsModal')?.remove();
        } catch (e) {
            showToast(e.message, 'error');
        }
        setLoading(false);
    },

    openFeeReminderModal() {
        const modalHtml = `
      <div class="modal-overlay" id="feeReminderModal">
        <div class="modal-content">
          <div class="modal-header"><h3><i class="fas fa-bell"></i> Send Fee Reminders</h3>
            <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="form-group">
            <label>Select Recipients</label>
            <select id="feeReminderType">
              <option value="OVERDUE">Overdue Only</option>
              <option value="ALL_PENDING">All Pending</option>
              <option value="SPECIFIC_CLASS">Specific Class</option>
            </select>
          </div>
          <div class="form-group" id="feeReminderClassDiv" style="display:none;">
            <label>Class</label><select id="feeReminderClass"><option value="">Select</option></select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-portal btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button type="button" class="btn-portal btn-primary" onclick="NotificationUI.sendFeeReminders()">Send Reminders</button>
          </div>
        </div>
      </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('feeReminderType').addEventListener('change', (e) => {
            document.getElementById('feeReminderClassDiv').style.display =
                e.target.value === 'SPECIFIC_CLASS' ? 'block' : 'none';
        });
    },

    async sendFeeReminders() {
        const type = document.getElementById('feeReminderType').value;
        let studentIds = [];

        if (type === 'OVERDUE' || type === 'ALL_PENDING') {
            const invoices = await InvoiceService.getPendingInvoices();
            studentIds = [...new Set(invoices.map((i) => i.student_id))];
        } else if (type === 'SPECIFIC_CLASS') {
            const className = document.getElementById('feeReminderClass').value;
            const students = await StudentService.getStudents({ class: className });
            studentIds = students.map((s) => s.id);
        }

        setLoading(true);
        try {
            const result = await NotificationService.sendFeeReminder(studentIds);
            showToast(`Reminders sent to ${result.sent} parents!`, 'success');
            document.querySelector('#feeReminderModal')?.remove();
        } catch (e) {
            showToast(e.message, 'error');
        }
        setLoading(false);
    },
};

const ReportsUI = {
    async init() {
        console.log('Reports UI Enhanced');
    },

    openReportModal(type) {
        const modalHtml = `
      <div class="modal-overlay" id="reportModal">
        <div class="modal-content modal-lg">
          <div class="modal-header"><h3><i class="fas fa-chart-line"></i> ${type} Report</h3>
            <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="form-section">
            <div class="form-row">
              <div class="form-group">
                <label>Class</label><select id="reportClass"><option value="">All Classes</option></select>
              </div>
              <div class="form-group">
                <label>Start Date</label><input type="date" id="reportStartDate">
              </div>
              <div class="form-group">
                <label>End Date</label><input type="date" id="reportEndDate">
              </div>
            </div>
            <button class="btn-portal btn-primary" onclick="ReportsUI.generateReport('${type}')">Generate</button>
          </div>
          <div id="reportContent" class="mt-3"></div>
        </div>
      </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Set default dates
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        document.getElementById('reportStartDate').value = monthStart.toISOString().split('T')[0];
        document.getElementById('reportEndDate').value = today.toISOString().split('T')[0];

        // Load classes
        this.loadClasses();
    },

    async loadClasses() {
        const classes = await ClassService.getClasses();
        document.getElementById('reportClass').innerHTML =
            '<option value="">All Classes</option>' +
            classes.map((c) => `<option value="${c.name}">${c.name}</option>`).join('');
    },

    async generateReport(type) {
        const className = document.getElementById('reportClass').value;
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        const container = document.getElementById('reportContent');

        setLoading(true);
        try {
            let data;
            if (type === 'Fee Collection') {
                data = await ReportsService.getFeeCollectionReport(startDate, endDate, className);
                container.innerHTML = `
          <div class="report-summary">
            <div class="summary-card"><h4>₹${data.totalCollected.toLocaleString()}</h4><p>Total Collected</p></div>
            <div class="summary-card"><h4>${data.totalTransactions}</h4><p>Transactions</p></div>
          </div>
          <table class="table mt-3"><thead><tr><th>Class</th><th>Students</th><th>Amount</th></tr></thead>
          <tbody>${Object.entries(data.byClass)
              .map(([cls, d]) => `<tr><td>${cls}</td><td>${d.students}</td><td>₹${d.amount.toLocaleString()}</td></tr>`)
              .join('')}</tbody></table>
          <button class="btn-portal mt-3" onclick="ReportsService.generateCSV(Object.entries(ReportsService.getFeeCollectionReport).map(([k,v]) => ({class:k,...v})), 'fee-report')">Export CSV</button>`;
            } else if (type === 'Attendance') {
                data = await AttendanceService.getClassAttendanceReport(className, startDate, endDate);
                container.innerHTML = `
          <div class="report-summary">
            <div class="summary-card"><h4>${data.attendancePercentage}%</h4><p>Attendance Rate</p></div>
            <div class="summary-card"><h4>${data.totalPresent}</h4><p>Present</p></div>
            <div class="summary-card"><h4>${data.totalAbsent}</h4><p>Absent</p></div>
          </div>`;
            } else if (type === 'Student Directory') {
                data = await ReportsService.getStudentDirectory(className);
                container.innerHTML = `
          <table class="table"><thead><tr><th>ID</th><th>Name</th><th>Class</th><th>Father</th><th>Phone</th></tr></thead>
          <tbody>${data.map((s) => `<tr><td>${s.studentId}</td><td>${s.name}</td><td>${s.class}</td><td>${s.fatherName}</td><td>${s.phone}</td></tr>`).join('')}</tbody></table>
          <button class="btn-portal mt-3" onclick="ReportsService.generateCSV(${JSON.stringify(data)}, 'student-directory')">Export CSV</button>`;
            }
        } catch (e) {
            showToast('Error generating report', 'error');
        }
        setLoading(false);
    },
};

window.NotificationUI = NotificationUI;
window.ReportsUI = ReportsUI;
