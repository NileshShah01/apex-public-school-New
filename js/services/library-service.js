/**
 * Library Service - Book Catalog, Circulation, Members
 * Compatible with existing schoolData(), schoolDoc(), withSchool()
 */

const LibraryService = {
    // ==================== BOOKS ====================

    async getBooks(filters = {}) {
        let query = schoolData('libraryBooks').orderBy('title');

        if (filters.category) query = query.where('category', '==', filters.category);
        if (filters.available) query = query.where('isAvailable', '==', true);

        const snapshot = await query.get();
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async getBook(bookId) {
        const doc = await schoolDoc('libraryBooks', bookId).get();
        if (!doc.exists) throw new Error('Book not found');
        return { id: doc.id, ...doc.data() };
    },

    async searchBooks(searchTerm) {
        const allBooks = await this.getBooks();
        const term = searchTerm.toLowerCase();

        return allBooks.filter(
            (b) =>
                b.title?.toLowerCase().includes(term) ||
                b.author?.toLowerCase().includes(term) ||
                b.isbn?.includes(term) ||
                b.category?.toLowerCase().includes(term)
        );
    },

    async addBook(data) {
        // Generate book ID
        const bookId = await this.generateBookNumber();

        const docRef = await schoolData('libraryBooks').add(
            withSchool({
                bookId: bookId,
                title: data.title,
                author: data.author,
                publisher: data.publisher || '',
                isbn: data.isbn || '',
                category: data.category || 'GENERAL',
                subCategory: data.subCategory || '',
                rackNumber: data.rackNumber || '',
                copies: parseInt(data.copies) || 1,
                available: parseInt(data.copies) || 1,
                cost: parseFloat(data.cost) || 0,
                purchaseDate: data.purchaseDate || null,
                createdBy: auth.currentUser?.uid,
            })
        );

        return { id: docRef.id, bookId, status: 'CREATED' };
    },

    async updateBook(bookId, data) {
        await schoolDoc('libraryBooks', bookId).update({
            ...data,
            updatedBy: auth.currentUser?.uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { id: bookId, status: 'UPDATED' };
    },

    async deleteBook(bookId) {
        await schoolDoc('libraryBooks', bookId).update({
            isDeleted: true,
            deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { id: bookId, status: 'DELETED' };
    },

    async generateBookNumber() {
        const config = await schoolData('settings').doc('library_config').get();
        const data = config.exists ? config.data() : {};

        const lastNumber = data.last_book_number || 0;
        const newNumber = lastNumber + 1;

        await schoolData('settings').doc('library_config').set(
            {
                last_book_number: newNumber,
                updated_at: firebase.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
        );

        return `LIB-${String(newNumber).padStart(5, '0')}`;
    },

    // ==================== CIRCULATION ====================

    async issueBook(bookId, studentId, dueDate) {
        const book = await this.getBook(bookId);

        if (book.available <= 0) {
            throw new Error('Book not available');
        }

        const docRef = await schoolData('libraryTransactions').add(
            withSchool({
                bookId: bookId,
                bookTitle: book.title,
                studentId: studentId,
                issueDate: firebase.firestore.FieldValue.serverTimestamp(),
                dueDate: dueDate,
                status: 'ISSUED',
                issuedBy: auth.currentUser?.uid,
            })
        );

        // Update book availability
        await schoolDoc('libraryBooks', bookId).update({
            available: book.available - 1,
            isAvailable: book.available - 1 > 0,
        });

        return { id: docRef.id, status: 'ISSUED' };
    },

    async returnBook(transactionId) {
        const transaction = await schoolDoc('libraryTransactions', transactionId).get();
        const transData = transaction.data();

        const returnDate = firebase.firestore.FieldValue.serverTimestamp();

        // Calculate fine if overdue
        const dueDate = transData.dueDate.toDate();
        const now = new Date();
        let fine = 0;

        if (now > dueDate) {
            const daysOverdue = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
            fine = daysOverdue * 5; // Rs 5 per day
        }

        // Update transaction
        await schoolDoc('libraryTransactions', transactionId).update({
            returnDate: returnDate,
            status: 'RETURNED',
            fine: fine,
            returnedBy: auth.currentUser?.uid,
        });

        // Update book availability
        const book = await this.getBook(transData.bookId);
        await schoolDoc('libraryBooks', transData.bookId).update({
            available: book.available + 1,
            isAvailable: true,
        });

        return { id: transactionId, fine, status: 'RETURNED' };
    },

    async getStudentBooks(studentId) {
        const snapshot = await schoolData('libraryTransactions')
            .where('studentId', '==', studentId)
            .where('status', '==', 'ISSUED')
            .get();

        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async getOverdueBooks() {
        const now = firebase.firestore.Timestamp.now();
        const snapshot = await schoolData('libraryTransactions')
            .where('status', '==', 'ISSUED')
            .where('dueDate', '<', now)
            .get();

        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    // ==================== REPORTS ====================

    async getCirculationReport(startDate, endDate) {
        const snapshot = await schoolData('libraryTransactions')
            .where('issueDate', '>=', startDate)
            .where('issueDate', '<=', endDate)
            .get();

        let issued = 0,
            returned = 0,
            overdue = 0;
        const byStudent = {};
        const byBook = {};
        const now = new Date();

        snapshot.docs.forEach((d) => {
            const trans = d.data();

            if (trans.status === 'ISSUED') {
                issued++;
                if (trans.dueDate.toDate() < now) overdue++;
            } else if (trans.status === 'RETURNED') {
                returned++;
            }

            // By student
            if (!byStudent[trans.studentId]) {
                byStudent[trans.studentId] = { issued: 0, returned: 0 };
            }
            byStudent[trans.studentId][trans.status === 'ISSUED' ? 'issued' : 'returned']++;

            // By book
            if (!byBook[trans.bookId]) {
                byBook[trans.bookId] = { timesIssued: 0 };
            }
            byBook[trans.bookId].timesIssued++;
        });

        return {
            startDate,
            endDate,
            totalIssued: issued,
            totalReturned: returned,
            currentlyIssued: issued - returned,
            overdue,
            byStudent,
            byBook,
        };
    },

    async getBookAvailability() {
        const books = await this.getBooks();

        return {
            totalBooks: books.length,
            totalCopies: books.reduce((sum, b) => sum + (b.copies || 0), 0),
            available: books.reduce((sum, b) => sum + (b.available || 0), 0),
            issued: books.reduce((sum, b) => sum + ((b.copies || 0) - (b.available || 0)), 0),
        };
    },
};

window.LibraryService = LibraryService;
