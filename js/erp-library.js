/**
 * erp-library.js - Book Cataloging & Circulation System
 */

const ERPLibrary = {
    books: [],

    async init() {
        console.log('ERP Library Initializing...');
        await this.loadBooks();

        // Setup Searchable Student Select for Issue Form
        if (typeof initSearchableSelect === 'function' && document.getElementById('issue_student_select')) {
            initSearchableSelect('issue_student_select', (s) => {
                document.getElementById('selected_student_id').value = s.studentId || s.student_id;
            });
        }
    },

    async loadBooks() {
        const tbody = document.getElementById('bookListBody');
        if (!tbody) return;

        try {
            const snap = await schoolData('books').orderBy('title').get();
            this.books = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

            if (this.books.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No books in catalog.</td></tr>';
                return;
            }

            tbody.innerHTML = this.books
                .map(
                    (b) => `
                <tr>
                    <td><b>${b.accessionNo || '-'}</b></td>
                    <td>${b.title}</td>
                    <td>${b.author || '-'}</td>
                    <td>${b.category || '-'}</td>
                    <td><span class="badge" style="background:${b.available > 0 ? '#dcfce7' : '#fee2e2'}; color:${b.available > 0 ? '#166534' : '#991b1b'};">
                        ${b.available} / ${b.total}
                    </span></td>
                    <td>
                        <button class="btn-portal btn-ghost" onclick="ERPLibrary.editBook('${b.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                    </td>
                </tr>
            `
                )
                .join('');

            // Update Issue Form Dropdown
            const bookSelect = document.getElementById('issue_book_select');
            if (bookSelect) {
                bookSelect.innerHTML =
                    '<option value="">Select Book</option>' +
                    this.books
                        .filter((b) => b.available > 0)
                        .map((b) => `<option value="${b.id}">${b.title} [${b.accessionNo}]</option>`)
                        .join('');
            }
        } catch (e) {
            console.error(e);
        }
    },

    async saveBook(event) {
        if (event) event.preventDefault();
        const form = document.getElementById('addBookForm');
        const formData = new FormData(form);

        const bookData = {
            title: formData.get('title'),
            author: formData.get('author'),
            category: formData.get('category'),
            accessionNo: formData.get('accessionNo'),
            total: parseInt(formData.get('total')) || 0,
            available: parseInt(formData.get('total')) || 0, // Initially all are available
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        try {
            showLoading(true);
            await schoolData('books').add(withSchool(bookData));
            showToast('Book added to catalog!');
            form.reset();
            await this.loadBooks();
        } catch (e) {
            console.error(e);
            showToast('Error adding book', 'error');
        } finally {
            showLoading(false);
        }
    },

    async issueBook(event) {
        if (event) event.preventDefault();
        const bookId = document.getElementById('issue_book_select').value;
        const studentId = document.getElementById('selected_student_id').value;
        const returnDate = document.getElementById('issue_return_date').value;

        if (!bookId || !studentId) {
            showToast('Please select book and student', 'error');
            return;
        }

        try {
            showLoading(true);
            const bookRef = schoolDoc('books', bookId);
            const bookSnap = await bookRef.get();
            const book = bookSnap.data();

            if (book.available <= 0) {
                showToast('Book currently not available', 'error');
                return;
            }

            const batch = db.batch();

            // 1. Create Transaction
            const txRef = schoolData('library_transactions').doc();
            batch.set(
                txRef,
                withSchool({
                    bookId,
                    bookTitle: book.title,
                    studentId,
                    issueDate: firebase.firestore.FieldValue.serverTimestamp(),
                    expectedReturnDate: returnDate,
                    status: 'Issued',
                })
            );

            // 2. Update Book Availability
            batch.update(bookRef, {
                available: firebase.firestore.FieldValue.increment(-1),
            });

            await batch.commit();
            showToast('Book issued successfully!');
            document.getElementById('issueBookForm').reset();
            await this.loadBooks();
            await this.loadTransactions();
        } catch (e) {
            console.error(e);
            showToast('Error issuing book', 'error');
        } finally {
            showLoading(false);
        }
    },

    async loadTransactions() {
        const tbody = document.getElementById('txListBody');
        if (!tbody) return;

        try {
            const snap = await schoolData('library_transactions')
                .where('status', '==', 'Issued')
                .orderBy('issueDate', 'desc')
                .get();
            if (snap.empty) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No active issues.</td></tr>';
                return;
            }

            tbody.innerHTML = snap.docs
                .map((doc) => {
                    const d = doc.data();
                    const issueDate = d.issueDate ? new Date(d.issueDate.seconds * 1000).toLocaleDateString() : 'N/A';
                    return `
                    <tr>
                        <td>${d.bookTitle}</td>
                        <td>${d.studentId}</td>
                        <td>${issueDate}</td>
                        <td>${d.expectedReturnDate || '-'}</td>
                        <td>
                            <button class="btn-portal btn-primary" onclick="ERPLibrary.returnBook('${doc.id}', '${d.bookId}')">
                                <i class="fas fa-undo"></i> Return
                            </button>
                        </td>
                    </tr>
                `;
                })
                .join('');
        } catch (e) {
            console.error(e);
        }
    },

    async returnBook(txId, bookId) {
        if (!confirm('Confirm book return?')) return;

        try {
            showLoading(true);
            const batch = db.batch();

            // 1. Update Transaction
            batch.update(schoolDoc('library_transactions', txId), {
                status: 'Returned',
                returnedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });

            // 2. Update Book Availability
            batch.update(schoolDoc('books', bookId), {
                available: firebase.firestore.FieldValue.increment(1),
            });

            await batch.commit();
            showToast('Book returned successfully!');
            await this.loadBooks();
            await this.loadTransactions();
        } catch (e) {
            console.error(e);
            showToast('Error processing return', 'error');
        } finally {
            showLoading(false);
        }
    },
};

window.ERPLibrary = ERPLibrary;
