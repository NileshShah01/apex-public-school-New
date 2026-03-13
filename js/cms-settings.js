// cms-settings.js
// Loads the "settings/general" document from Firestore and applies it to the live site.
// Add this script (AFTER firebase-config.js) to any public page you want to be CMS-controlled.

(function applyCMSSettings() {
    // Wait for firebase to be ready
    function tryApply() {
        if (typeof db === 'undefined' || !db) {
            setTimeout(tryApply, 200);
            return;
        }

        db.collection('settings').doc('general').get().then(function(doc) {
            if (!doc.exists) return;
            const data = doc.data();

            // --- Marquee / Announcement Banner ---
            if (data.marquee) {
                document.querySelectorAll('.dyn-marquee, #dyn-marquee, marquee').forEach(function(el) {
                    el.textContent = data.marquee;
                });
            }

            // --- Phone Numbers ---
            if (data.phone) {
                document.querySelectorAll('.dyn-phone, #dyn-phone, [data-cms="phone"]').forEach(function(el) {
                    el.textContent = data.phone;
                });
                // Update WhatsApp float link
                document.querySelectorAll('.whatsapp-float').forEach(function(el) {
                    const cleanPhone = data.phone.replace(/[^0-9]/g, '');
                    el.href = 'https://wa.me/' + cleanPhone;
                });
            }

            // --- Email ---
            if (data.email) {
                document.querySelectorAll('.dyn-email, #dyn-email, [data-cms="email"]').forEach(function(el) {
                    el.textContent = data.email;
                });
                // Update email float link
                const emailFloat = document.getElementById('dyn-float-email');
                if (emailFloat) emailFloat.href = 'mailto:' + data.email;
            }

            // --- Address ---
            if (data.address) {
                document.querySelectorAll('.dyn-address, #dyn-address, [data-cms="address"]').forEach(function(el) {
                    el.textContent = data.address;
                });
            }

        }).catch(function(err) {
            console.warn('CMS settings load error:', err.message);
        });
    }

    // If DOMContentLoaded has already fired, run now; else wait
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryApply);
    } else {
        tryApply();
    }
})();
