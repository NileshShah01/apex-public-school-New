/**
 * Library & Transport UI Enhancements
 * Compatible with existing ERP modules
 */

const LibraryUI = {
    async init() {
        console.log('Library UI Enhanced');
    },

    openAddBookModal() {
        const modalHtml = `
      <div class="modal-overlay" id="bookModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3><i class="fas fa-book"></i> Add Book</h3>
            <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <form onsubmit="LibraryUI.handleBookSubmit(event)">
            <div class="form-grid-2">
              <div class="form-group"><label>Title *</label><input type="text" id="bookTitle" required></div>
              <div class="form-group"><label>Author *</label><input type="text" id="bookAuthor" required></div>
              <div class="form-group"><label>ISBN</label><input type="text" id="bookIsbn"></div>
              <div class="form-group"><label>Category</label>
                <select id="bookCategory">
                  <option value="GENERAL">General</option>
                  <option value="TEXTBOOK">Textbook</option>
                  <option value="REFERENCE">Reference</option>
                  <option value="FICTION">Fiction</option>
                </select>
              </div>
              <div class="form-group"><label>Copies *</label><input type="number" id="bookCopies" value="1" required></div>
              <div class="form-group"><label>Cost</label><input type="number" id="bookCost"></div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-portal btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
              <button type="submit" class="btn-portal btn-primary">Add Book</button>
            </div>
          </form>
        </div>
      </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    async handleBookSubmit(e) {
        e.preventDefault();
        const data = {
            title: document.getElementById('bookTitle').value,
            author: document.getElementById('bookAuthor').value,
            isbn: document.getElementById('bookIsbn').value,
            category: document.getElementById('bookCategory').value,
            copies: document.getElementById('bookCopies').value,
            cost: document.getElementById('bookCost').value,
        };
        setLoading(true);
        try {
            await LibraryService.addBook(data);
            showToast('Book added!', 'success');
            document.querySelector('#bookModal')?.remove();
        } catch (e) {
            showToast(e.message, 'error');
        }
        setLoading(false);
    },

    async openIssueBookModal() {
        const modalHtml = `
      <div class="modal-overlay" id="issueModal">
        <div class="modal-content">
          <div class="modal-header"><h3><i class="fas fa-hand-holding"></i> Issue Book</h3>
            <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <form onsubmit="LibraryUI.handleIssueSubmit(event)">
            <div class="form-group"><label>Select Book *</label><select id="issueBook" required><option value="">Select</option></select></div>
            <div class="form-group"><label>Student *</label><select id="issueStudent" required><option value="">Select</option></select></div>
            <div class="form-group"><label>Due Date *</label><input type="date" id="issueDueDate" required></div>
            <div class="form-actions">
              <button type="button" class="btn-portal btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
              <button type="submit" class="btn-portal btn-primary">Issue</button>
            </div>
          </form>
        </div>
      </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Load books and students
        const books = await LibraryService.getBooks({ available: true });
        const bookSelect = document.getElementById('issueBook');
        bookSelect.innerHTML =
            '<option value="">Select</option>' +
            books.map((b) => `<option value="${b.id}">${b.title} (${b.available})</option>`).join('');

        const students = await StudentService.getStudents({ status: 'ACTIVE' });
        const studentSelect = document.getElementById('issueStudent');
        studentSelect.innerHTML =
            '<option value="">Select</option>' +
            students.map((s) => `<option value="${s.id}">${s.name} - ${s.class}</option>`).join('');

        // Set default due date (14 days)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);
        document.getElementById('issueDueDate').value = dueDate.toISOString().split('T')[0];
    },

    async handleIssueSubmit(e) {
        e.preventDefault();
        setLoading(true);
        try {
            await LibraryService.issueBook(
                document.getElementById('issueBook').value,
                document.getElementById('issueStudent').value,
                document.getElementById('issueDueDate').value
            );
            showToast('Book issued!', 'success');
            document.querySelector('#issueModal')?.remove();
        } catch (e) {
            showToast(e.message, 'error');
        }
        setLoading(false);
    },
};

const TransportUI = {
    async init() {
        console.log('Transport UI Enhanced');
    },

    async openAddRouteModal() {
        const modalHtml = `
      <div class="modal-overlay" id="routeModal">
        <div class="modal-content">
          <div class="modal-header"><h3><i class="fas fa-route"></i> Add Route</h3>
            <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <form onsubmit="TransportUI.handleRouteSubmit(event)">
            <div class="form-grid-2">
              <div class="form-group"><label>Route Name *</label><input type="text" id="routeName" required></div>
              <div class="form-group"><label>Route Number</label><input type="text" id="routeNumber"></div>
              <div class="form-group"><label>Start Point *</label><input type="text" id="startPoint" required></div>
              <div class="form-group"><label>End Point *</label><input type="text" id="endPoint" required></div>
              <div class="form-group"><label>Capacity</label><input type="number" id="routeCapacity" value="50"></div>
              <div class="form-group"><label>Monthly Fare (₹) *</label><input type="number" id="routeFare" required></div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-portal btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
              <button type="submit" class="btn-portal btn-primary">Create Route</button>
            </div>
          </form>
        </div>
      </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    async handleRouteSubmit(e) {
        e.preventDefault();
        const data = {
            routeName: document.getElementById('routeName').value,
            routeNumber: document.getElementById('routeNumber').value,
            startPoint: document.getElementById('startPoint').value,
            endPoint: document.getElementById('endPoint').value,
            capacity: document.getElementById('routeCapacity').value,
            fare: document.getElementById('routeFare').value,
        };
        setLoading(true);
        try {
            await TransportService.createRoute(data);
            showToast('Route created!', 'success');
            document.querySelector('#routeModal')?.remove();
        } catch (e) {
            showToast(e.message, 'error');
        }
        setLoading(false);
    },

    openAssignTransportModal(studentId) {
        const modalHtml = `
      <div class="modal-overlay" id="assignTransportModal">
        <div class="modal-content">
          <div class="modal-header"><h3><i class="fas fa-bus"></i> Assign Transport</h3>
            <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <form onsubmit="TransportUI.handleAssignSubmit(event)">
            <input type="hidden" id="assignStudentId" value="${studentId}">
            <div class="form-group"><label>Route *</label><select id="assignRoute" required onchange="TransportUI.loadStops(this.value)"><option value="">Select</option></select></div>
            <div class="form-group"><label>Stop *</label><select id="assignStop" required><option value="">Select Route First</option></select></div>
            <div class="form-actions">
              <button type="button" class="btn-portal btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
              <button type="submit" class="btn-portal btn-primary">Assign</button>
            </div>
          </form>
        </div>
      </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        (async () => {
            const routes = await TransportService.getRoutes();
            document.getElementById('assignRoute').innerHTML =
                '<option value="">Select</option>' +
                routes.map((r) => `<option value="${r.id}">${r.routeName} - ₹${r.fare}/month</option>`).join('');
        })();
    },

    async loadStops(routeId) {
        if (!routeId) return;
        const route = await TransportService.getRoute(routeId);
        const stops = route.viaStops || [];
        document.getElementById('assignStop').innerHTML =
            '<option value="">Select</option>' +
            stops.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
    },

    async handleAssignSubmit(e) {
        e.preventDefault();
        setLoading(true);
        try {
            await TransportService.assignStudent(
                document.getElementById('assignStudentId').value,
                document.getElementById('assignRoute').value,
                document.getElementById('assignStop').value
            );
            showToast('Transport assigned!', 'success');
            document.querySelector('#assignTransportModal')?.remove();
        } catch (e) {
            showToast(e.message, 'error');
        }
        setLoading(false);
    },
};

window.LibraryUI = LibraryUI;
window.TransportUI = TransportUI;
