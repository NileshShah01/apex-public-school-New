/**
 * Payment Service - Core Business Logic for Fees and Payments
 */
const PaymentService = {
    /**
     * Records a payment and updates related fee records atomically.
     * @param {Object} paymentData { studentId, amount, method, remarks, session }
     */
    async recordPayment(paymentData) {
        const { studentId, amount, method, remarks, session, reference } = paymentData;
        
        if (!studentId || isNaN(amount) || amount <= 0) {
            throw new Error('Invalid payment data provided.');
        }

        const db = window.db || firebase.firestore();
        const receiptNo = 'R-' + Math.floor(Math.random() * 900000 + 100000);
        
        return db.runTransaction(async (transaction) => {
            // 1. Fetch pending fees for the student
            const feeQuery = schoolData('fees')
                .where('studentId', '==', studentId)
                .where('status', 'in', ['pending', 'partial']);
            
            const feeSnap = await transaction.get(feeQuery);
            
            // 2. Allocation Logic (FIFO)
            let remainingAmount = amount;
            const updates = [];
            const allocations = []; // Track which fees are paid
            
            // Sort fees by year and month to ensure FIFO
            const sortedDocs = feeSnap.docs.sort((a, b) => {
                const fa = a.data();
                const fb = b.data();
                const dateA = new Date(`${fa.month} ${fa.year}`);
                const dateB = new Date(`${fb.month} ${fb.year}`);
                return dateA - dateB;
            });

            for (const doc of sortedDocs) {
                if (remainingAmount <= 0) break;
                
                const fee = doc.data();
                const due = fee.amount - (fee.paidAmount || 0);
                const paymentForThisFee = Math.min(remainingAmount, due);
                
                const newPaidAmount = (fee.paidAmount || 0) + paymentForThisFee;
                const newStatus = newPaidAmount >= fee.amount ? 'paid' : 'partial';
                
                allocations.push({
                    feeId: doc.id,
                    feeType: fee.feeType || 'Tuition Fee',
                    month: fee.month,
                    year: fee.year,
                    amount: fee.amount,
                    paidNow: paymentForThisFee,
                    remainingAfter: fee.amount - newPaidAmount
                });

                updates.push({
                    ref: doc.ref,
                    data: {
                        paidAmount: newPaidAmount,
                        status: newStatus,
                        lastPaidDate: firebase.firestore.FieldValue.serverTimestamp(),
                        lastMethod: method
                    }
                });
                
                remainingAmount -= paymentForThisFee;
            }

            // 3. Create Receipt
            const paymentRef = schoolData('feePayments').doc();
            transaction.set(paymentRef, withSchool({
                studentId,
                amount,
                paymentMode: method,
                receiptNo,
                transactionId: reference || '',
                remarks: remarks || '',
                session: session || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                appliedAmount: amount - remainingAmount,
                excessAmount: remainingAmount,
                allocations: allocations // Store what was paid for itemized printing
            }));

            // 4. Commit all fee updates
            updates.forEach(upd => transaction.update(upd.ref, upd.data));

            return { paymentId: paymentRef.id, paymentId: paymentRef.id, receiptNo };
        });
    },

    /**
     * Fetches detailed ledger for a student
     */
    async getStudentLedger(studentId) {
        const feesSnap = await schoolData('fees').where('studentId', '==', studentId).get();
        const paymentsSnap = await schoolData('feePayments').where('studentId', '==', studentId).orderBy('createdAt', 'desc').get();
        
        // Sort and process fees
        const ledger = feesSnap.docs.map(d => {
            const data = d.data();
            return { 
                id: d.id, 
                ...data,
                // Default missing fields for legacy records
                feeType: data.feeType || 'Tuition Fee',
                frequency: data.frequency || 'Monthly',
                dueDate: data.dueDate || '--',
                discount: data.discount || 0,
                dueAmount: (data.amount || 0) - (data.paidAmount || 0)
            };
        }).sort((a, b) => {
            // Sort by Date (Reverse Chronological for table)
            const dateA = new Date(`${a.month} ${a.year}`);
            const dateB = new Date(`${b.month} ${b.year}`);
            return dateB - dateA;
        });

        const history = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const totalAmount = ledger.reduce((sum, f) => sum + (f.amount || 0), 0);
        const totalPaid = ledger.reduce((sum, f) => sum + (f.paidAmount || 0), 0);
        const totalDiscount = ledger.reduce((sum, f) => sum + (f.discount || 0), 0);
        
        return {
            ledger,
            history,
            summary: {
                total: totalAmount,
                paid: totalPaid,
                discount: totalDiscount,
                balance: totalAmount - totalPaid - totalDiscount
            }
        };
    }
};

window.PaymentService = PaymentService;
