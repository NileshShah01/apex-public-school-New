/**
 * erp-notifications.js - Bulk Messaging & Notification System
 */

const ERPNotifications = {
    history: [],

    async init() {
        console.log('ERP Notifications Initializing...');

        // Populate session select
        const sessSelect = document.getElementById('notif_sessionSelect');
        if (sessSelect && erpState.sessions) {
            sessSelect.innerHTML =
                '<option value="">Select Session</option>' +
                erpState.sessions
                    .map((s) => `<option value="${s.id}" ${s.active ? 'selected' : ''}>${s.name}</option>`)
                    .join('');

            if (erpState.activeSessionId) {
                await this.loadClasses();
            }
        }

        await this.loadHistory();
    },

    async loadClasses() {
        const sessId = document.getElementById('notif_sessionSelect').value;
        const el = document.getElementById('notif_classSelect');
        if (!el || !sessId) return;
        const snap = await schoolData('classes').where('sessionId', '==', sessId).orderBy('sortOrder', 'asc').get();
        el.innerHTML =
            '<option value="All">All Classes</option>' +
            snap.docs.map((doc) => `<option value="${doc.data().name}">${doc.data().name}</option>`).join('');
    },

    async loadSections() {
        const sessId = document.getElementById('notif_sessionSelect').value;
        const cls = document.getElementById('notif_classSelect').value;
        const el = document.getElementById('notif_sectionSelect');
        if (!el || !cls || cls === 'All') {
            if (el) el.innerHTML = '<option value="All">All Sections</option>';
            return;
        }
        const snap = await schoolData('classes')
            .where('sessionId', '==', sessId)
            .where('name', '==', cls)
            .limit(1)
            .get();
        if (!snap.empty) {
            const sections = snap.docs[0].data().sections || [];
            el.innerHTML =
                '<option value="All">All Sections</option>' +
                sections.map((s) => `<option value="${s}">${s}</option>`).join('');
        }
    },

    async sendNotification(event) {
        if (event) event.preventDefault();

        const type = document.getElementById('notif_type').value;
        const title = document.getElementById('notif_title').value.trim();
        const targetClass = document.getElementById('notif_classSelect').value;
        const targetSection = document.getElementById('notif_sectionSelect').value;
        const message = document.getElementById('notif_message').value.trim();

        if (!message || !title) {
            showToast('Please enter a title and message', 'error');
            return;
        }

        try {
            showLoading(true);

            const notificationDoc = {
                type: type,
                title: title,
                target: {
                    class: targetClass,
                    section: targetSection,
                },
                message: message,
                sentBy: auth.currentUser?.email || 'Admin',
                sentAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'Delivered',
            };

            await schoolData('notifications').add(withSchool(notificationDoc));

            showToast(`Notification sent successfully!`);
            document.getElementById('sendNotifForm').reset();
            await this.loadHistory();
        } catch (e) {
            console.error(e);
            showToast('Error sending notification', 'error');
        } finally {
            showLoading(false);
        }
    },

    async loadHistory() {
        const listBody = document.getElementById('notif_historyBody');
        if (!listBody) return;

        try {
            const snap = await schoolData('notifications').orderBy('sentAt', 'desc').limit(50).get();
            if (snap.empty) {
                listBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No history found.</td></tr>';
                return;
            }

            listBody.innerHTML = snap.docs
                .map((doc) => {
                    const d = doc.data();
                    const date = d.sentAt ? new Date(d.sentAt.seconds * 1000).toLocaleString() : 'Just now';
                    const target =
                        d.target.class === 'All' ? 'All Students' : `${d.target.class} - ${d.target.section}`;
                    const icon =
                        d.type === 'WhatsApp' ? 'fa-whatsapp' : d.type === 'SMS' ? 'fa-comment-sms' : 'fa-bell';
                    const color = d.type === 'WhatsApp' ? '#25D366' : d.type === 'SMS' ? '#3b82f6' : '#6366f1';

                    return `
                    <tr>
                        <td>${date}</td>
                        <td>${target}</td>
                        <td><i class="fab ${icon}" style="color:${color};"></i> <strong>${d.title || 'Notification'}</strong></td>
                        <td><span class="badge" style="background:#dcfce7; color:#166534;">${d.status}</span></td>
                        <td style="text-align:right;">
                            <button class="btn-portal btn-ghost btn-sm" title="${d.message}"><i class="fas fa-eye"></i></button>
                        </td>
                    </tr>
                `;
                })
                .join('');
        } catch (e) {
            console.error(e);
        }
    },
};

window.ERPNotifications = ERPNotifications;
