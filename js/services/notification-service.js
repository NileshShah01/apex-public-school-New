/**
 * Notification Service - SMS, Email, Push Notifications
 * Compatible with existing schoolData(), schoolDoc(), withSchool()
 */

const NotificationService = {
    // ==================== NOTIFICATIONS ====================

    async sendSMS(phoneNumbers, message) {
        // Integration with SMS gateway (e.g., Twilio, Msg91, etc.)
        // This is a placeholder - actual implementation depends on provider

        const results = {
            total: phoneNumbers.length,
            sent: 0,
            failed: 0,
            logId: null,
        };

        // Create notification log
        const logRef = await schoolData('notifications').add(
            withSchool({
                type: 'SMS',
                recipientCount: phoneNumbers.length,
                message: message,
                status: 'SENDING',
                createdBy: auth.currentUser?.uid,
            })
        );

        results.logId = logRef.id;

        // In production, call SMS API here
        // For now, simulate success
        results.sent = phoneNumbers.length;

        // Update log
        await schoolDoc('notifications', logRef.id).update({
            status: 'SENT',
            sentAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        return results;
    },

    async sendBulkSMS(filters, message) {
        // Get students based on filters
        const students = await StudentService.getStudents(filters);

        const phoneNumbers = students.map((s) => s.phone).filter((p) => p && p.length >= 10);

        return await this.sendSMS([...new Set(phoneNumbers)], message);
    },

    async sendEmail(emails, subject, body) {
        // Integration with email provider

        const results = {
            total: emails.length,
            sent: 0,
            failed: 0,
        };

        // Log notification
        await schoolData('notifications').add(
            withSchool({
                type: 'EMAIL',
                recipientCount: emails.length,
                subject: subject,
                message: body,
                status: 'SENT',
                createdBy: auth.currentUser?.uid,
                sentAt: firebase.firestore.FieldValue.serverTimestamp(),
            })
        );

        results.sent = emails.length;
        return results;
    },

    // ==================== TEMPLATES ====================

    async getTemplates() {
        const snapshot = await schoolData('notificationTemplates').get();
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async createTemplate(data) {
        const docRef = await schoolData('notificationTemplates').add(
            withSchool({
                name: data.name,
                type: data.type, // SMS, EMAIL
                subject: data.subject || '',
                body: data.body,
                variables: data.variables || [],
                createdBy: auth.currentUser?.uid,
            })
        );

        return { id: docRef.id, status: 'CREATED' };
    },

    // ==================== FEE REMINDERS ====================

    async sendFeeReminder(studentIds) {
        const results = { sent: 0, failed: 0 };

        for (const studentId of studentIds) {
            try {
                const student = await StudentService.getStudent(studentId);
                const invoices = await InvoiceService.getStudentInvoices(studentId);

                const pending = invoices.filter((i) => ['PENDING', 'PARTIAL', 'OVERDUE'].includes(i.status));

                if (pending.length === 0) continue;

                const totalDue = pending.reduce((sum, i) => sum + (i.amount_due || 0), 0);
                const message = `Dear ${student.father_name}, your ward ${student.name} has pending fees of Rs. ${totalDue}. Please pay soon. - ${window.SCHOOL_NAME || 'School'}`;

                if (student.phone) {
                    await this.sendSMS([student.phone], message);
                    results.sent++;
                }
            } catch (e) {
                results.failed++;
            }
        }

        return results;
    },

    // ==================== ATTENDANCE ALERTS ====================

    async sendAttendanceAlert(studentIds) {
        const results = { sent: 0 };

        for (const studentId of studentIds) {
            try {
                const student = await StudentService.getStudent(studentId);
                const today = new Date().toISOString().split('T')[0];

                const attendance = await AttendanceService.getAttendance(student.class, today);
                const isAbsent = attendance.find((a) => a.studentId === studentId && a.status === 'ABSENT');

                if (isAbsent && student.phone) {
                    const message = `Dear ${student.father_name}, your ward ${student.name} was marked ABSENT today. - ${window.SCHOOL_NAME || 'School'}`;
                    await this.sendSMS([student.phone], message);
                    results.sent++;
                }
            } catch (e) {
                console.error('Error sending attendance alert:', e);
            }
        }

        return results;
    },

    // ==================== BULK NOTIFICATIONS ====================

    async notifyClass(className, type, message) {
        const students = await StudentService.getStudents({ class: className, status: 'ACTIVE' });

        if (type === 'SMS') {
            const phones = students.map((s) => s.phone).filter((p) => p);
            return await this.sendSMS([...new Set(phones)], message);
        } else if (type === 'EMAIL') {
            const emails = students.map((s) => s.email).filter((e) => e);
            return await this.sendEmail([...new Set(emails)], 'School Notification', message);
        }
    },

    async notifyAll(type, message) {
        const students = await StudentService.getStudents({ status: 'ACTIVE' });

        if (type === 'SMS') {
            const phones = students.map((s) => s.phone).filter((p) => p);
            return await this.sendSMS([...new Set(phones)], message);
        } else if (type === 'EMAIL') {
            const emails = students.map((s) => s.email).filter((e) => e);
            return await this.sendEmail([...new Set(emails)], 'School Notification', message);
        }
    },

    // ==================== NOTIFICATION HISTORY ====================

    async getNotificationHistory(filters = {}) {
        let query = schoolData('notifications').orderBy('createdAt', 'desc');

        if (filters.type) query = query.where('type', '==', filters.type);
        if (filters.status) query = query.where('status', '==', filters.status);

        const snapshot = await query.limit(100).get();
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async getDeliveryStatus(notificationId) {
        const doc = await schoolDoc('notifications', notificationId).get();
        return { id: doc.id, ...doc.data() };
    },
};

window.NotificationService = NotificationService;
