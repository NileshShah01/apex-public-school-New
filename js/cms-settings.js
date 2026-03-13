// cms-settings.js — Loads all CMS data from Firestore and populates the live website pages.
// Included on all public pages after firebase-config.js

(function applyCMSSettings() {
    function tryApply() {
        if (typeof db === 'undefined' || !db) { setTimeout(tryApply, 200); return; }
        loadGeneralSettings();
        loadEvents();
        loadAchievements();
        loadTestimonials();
        loadGalleryPage();
    }

    // ===================== GENERAL SETTINGS =====================
    function loadGeneralSettings() {
        db.collection('settings').doc('general').get().then(function(doc) {
            if (!doc.exists) return;
            const d = doc.data();

            // Marquee
            if (d.marquee) document.querySelectorAll('.dyn-marquee, #dyn-marquee, marquee').forEach(el => el.textContent = d.marquee);

            // Phone
            if (d.phone) {
                document.querySelectorAll('.dyn-phone, #dyn-phone, [data-cms="phone"]').forEach(el => el.textContent = d.phone);
                document.querySelectorAll('.whatsapp-float').forEach(el => el.href = 'https://wa.me/' + d.phone.replace(/[^0-9]/g, ''));
            }

            // Email
            if (d.email) {
                document.querySelectorAll('.dyn-email, #dyn-email, [data-cms="email"]').forEach(el => el.textContent = d.email);
            }

            // Address
            if (d.address) document.querySelectorAll('.dyn-address, #dyn-address, [data-cms="address"]').forEach(el => el.textContent = d.address);

            // Stats — update data-target and restart counter animation
            const stats = {
                'stat_students': d.stat_students,
                'stat_teachers': d.stat_teachers,
                'stat_classrooms': d.stat_classrooms,
                'stat_years': d.stat_years
            };
            Object.entries(stats).forEach(([id, val]) => {
                const el = document.getElementById(id);
                if (el && val) { el.setAttribute('data-target', val); el.textContent = val + '+'; }
            });

            // Hero Slider
            ['1','2','3','4'].forEach(n => {
                const img = document.getElementById('slide_' + n);
                if (img && d['hero_' + n]) img.src = d['hero_' + n];
            });

            // Admission Status
            const badge = document.getElementById('admissionBadge');
            const btn = document.getElementById('heroAdmissionBtn');
            if (badge) {
                const isOpen = d.admissionStatus !== 'closed';
                badge.style.background = isOpen ? '#10b981' : '#ef4444';
                badge.textContent = isOpen ? '✅ Admission Open' : '❌ Admission Closed';
            }
            if (btn && d.admissionSession) btn.textContent = 'Admission Open ' + d.admissionSession;

        }).catch(e => console.warn('CMS settings:', e.message));
    }

    // ===================== EVENTS =====================
    function loadEvents() {
        const container = document.getElementById('eventsContainer');
        if (!container) return;
        const icons = ['fa-calendar-day','fa-hand-holding-heart','fa-door-open','fa-star','fa-flag','fa-graduation-cap'];
        db.collection('events').orderBy('createdAt','asc').get().then(snap => {
            if (snap.empty) return; // keep fallback HTML
            container.innerHTML = '';
            let i = 0;
            snap.forEach(doc => {
                const d = doc.data();
                container.innerHTML += `<div class="premium-card">
                    <i class="fas ${icons[i % icons.length]}" style="color:var(--primary); font-size:2.5rem;"></i>
                    <h3>${d.title}</h3>
                    <p>${d.date}${d.subtitle ? ' · ' + d.subtitle : ''}</p>
                </div>`;
                i++;
            });
        }).catch(() => {});
    }

    // ===================== ACHIEVEMENTS =====================
    function loadAchievements() {
        const container = document.getElementById('achievementsContainer');
        if (!container) return;
        const colors = ['#f1c40f','#e67e22','#3498db','#10b981','#e74c3c'];
        const icons = ['fa-trophy','fa-medal','fa-star','fa-award','fa-certificate'];
        db.collection('achievements').orderBy('createdAt','asc').get().then(snap => {
            if (snap.empty) return;
            container.innerHTML = '';
            let i = 0;
            snap.forEach(doc => {
                const d = doc.data();
                const c = colors[i % colors.length];
                container.innerHTML += `<div class="premium-card">
                    <i class="fas ${icons[i % icons.length]}" style="color:${c}; font-size:2.5rem; background:${c}22; width:80px; height:80px; line-height:80px; border-radius:50%;"></i>
                    <h3>${d.title}</h3>
                    <p>${d.description || ''}</p>
                </div>`;
                i++;
            });
        }).catch(() => {});
    }

    // ===================== TESTIMONIALS =====================
    function loadTestimonials() {
        const section = document.getElementById('testimonialsSection');
        const container = document.getElementById('testimonialsContainer');
        if (!container || !section) return;
        db.collection('testimonials').orderBy('createdAt','asc').get().then(snap => {
            if (snap.empty) return;
            section.style.display = 'block';
            container.innerHTML = '';
            snap.forEach(doc => {
                const d = doc.data();
                container.innerHTML += `<div class="premium-card" style="text-align:left; padding:2rem;">
                    <i class="fas fa-quote-left" style="color:var(--primary-light); font-size:1.5rem; margin-bottom:1rem;"></i>
                    <p style="font-style:italic; color:var(--text-muted); margin-bottom:1.5rem; line-height:1.7;">"${d.quote}"</p>
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <div style="width:42px; height:42px; background:var(--primary); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-weight:700;">${(d.name||'?')[0]}</div>
                        <div><b style="display:block;">${d.name}</b><span style="font-size:0.8rem; color:var(--text-muted);">${d.relation || ''}</span></div>
                    </div>
                </div>`;
            });
        }).catch(() => {});
    }

    // ===================== GALLERY PAGE =====================
    function loadGalleryPage() {
        const container = document.getElementById('galleryDynamicGrid');
        if (!container) return;
        db.collection('gallery').orderBy('createdAt','asc').get().then(snap => {
            if (snap.empty) { container.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:3rem;">No gallery images added yet.</p>'; return; }
            container.innerHTML = '';
            snap.forEach(doc => {
                const d = doc.data();
                container.innerHTML += `<div style="position:relative; border-radius:0.75rem; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
                    <img src="${d.url}" alt="${d.caption||'Gallery'}" loading="lazy" style="width:100%; height:220px; object-fit:cover; display:block;">
                    ${d.caption ? `<div style="padding:0.5rem 0.75rem; font-size:0.85rem; color:#475569; text-align:center;">${d.caption}</div>` : ''}
                </div>`;
            });
        }).catch(() => {});
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', tryApply); }
    else { tryApply(); }
})();
