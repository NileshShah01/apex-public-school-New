// cms-settings.js — Loads all CMS data from Firestore and populates the live website pages.
// Included on all public pages after firebase-config.js

(function applyCMSSettings() {
    function tryApply() {
        if (typeof db === 'undefined' || !db) { setTimeout(tryApply, 200); return; }
        loadGeneralSettings();
        loadBirthdays();
        loadEvents();
        loadAchievements();
        loadTestimonials();
        loadGalleryPage();
        loadStaff();
        loadHolidays();
        loadAdmissionFacilities();
        loadHomeFacilities();
    }

    // ===================== HOME PAGE FACILITIES =====================
    async function loadHomeFacilities() {
        const track = document.getElementById('homeFacilitiesTrack');
        if (!track) return;

        try {
            const doc = await db.collection('settings').doc('homeFacilities').get();
            if (doc.exists) {
                const data = doc.data().facilities || [];
                if (data.length > 0) {
                    track.innerHTML = '';
                    data.forEach(item => {
                        track.innerHTML += `
                            <div class="facility-slide">
                                <img src="${item.url}" loading="lazy">
                                <div class="facility-name">${item.name}</div>
                            </div>`;
                    });
                    return;
                }
            }
            // Fallback to defaults if no data in DB
            track.innerHTML = `
                <div class="facility-slide"><img src="images/Classroom-img1.jpeg"><div class="facility-name">Smart Classrooms</div></div>
                <div class="facility-slide"><img src="images/School-Building.jpeg"><div class="facility-name">Computer Lab</div></div>
                <div class="facility-slide"><img src="images/Sports-Event-Prize-Distribution-img1.jpeg"><div class="facility-name">Sports Ground</div></div>
                <div class="facility-slide"><img src="images/Classroom-img1.jpeg"><div class="facility-name">CCTV Security</div></div>
            `;
        } catch(e) { console.error('Error loading home facilities:', e); }
    }

    // ===================== ADMISSION FACILITIES (admissions.html) =====================
    function loadAdmissionFacilities() {
        const grid = document.getElementById('admissionsFacilitiesGrid');
        if (!grid) return;

        db.collection('settings').doc('admissions').get().then(doc => {
            if (!doc.exists) return;
            const d = doc.data();
            
            const mapping = {
                'facility_smart_class': d.smart_class_urls,
                'facility_computer_lab': d.computer_lab_urls,
                'facility_sports': d.sports_urls,
                'facility_security': d.security_urls,
                'facility_transport': d.transport_urls
            };

            Object.entries(mapping).forEach(([id, urls]) => {
                const container = document.getElementById(id);
                if (container && urls && urls.length > 0) {
                    container.innerHTML = '';
                    urls.forEach(url => {
                        container.innerHTML += `<img src="${url}" style="width:100%; height:80px; object-fit:cover; border-radius:0.5rem; cursor:pointer;" onclick="event.stopPropagation(); openLightbox({src:'${url}'})">`;
                    });
                } else if (container) {
                    container.innerHTML = '<p style="grid-column:1/-1; font-size:0.8rem; color:#94a3b8; text-align:center;">No photos yet.</p>';
                }
            });
        }).catch(() => {});
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
                document.querySelectorAll('.float-whatsapp').forEach(el => el.href = 'https://wa.me/' + d.phone.replace(/[^0-9]/g, ''));
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

    // ===================== BIRTHDAYS =====================
    function loadBirthdays() {
        const section = document.getElementById('birthdaySection');
        const container = document.getElementById('birthdayContainer');
        if (!container || !section) return;

        // Get today's MM-DD to match against dob strings like "YYYY-MM-DD"
        const today = new Date();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const mm_dd = `${mm}-${dd}`;

        const colors = ['#ff6b6b', '#4dabf7', '#51cf66', '#fcc419', '#cc5de8'];
        
        db.collection('students').get().then(snap => {
            if (snap.empty) return;
            
            let birthdayStudents = [];
            
            snap.forEach(doc => {
                const s = doc.data();
                if (s.dob && s.dob.endsWith(mm_dd)) {
                    birthdayStudents.push(s);
                }
            });

            if (birthdayStudents.length > 0) {
                section.style.display = 'block'; // Show the section if there are birthdays
                container.innerHTML = ''; // clear loading state
                
                birthdayStudents.forEach((d, i) => {
                    const c = colors[i % colors.length];
                    let iconHtml = `<i class="fas fa-cake-candles" style="color: ${c}; font-size: 2.5rem; background: ${c}22; width: 80px; height: 80px; line-height: 80px; border-radius: 50%;"></i>`;
                    
                    if (d.photo_url) {
                        iconHtml = `<img src="${d.photo_url}" alt="${d.name}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 1.5rem; border: 3px solid ${c}; box-shadow: 0 4px 10px ${c}40;">`;
                    }
                    
                    container.innerHTML += `<div class="premium-card">
                        ${iconHtml}
                        <h3>${d.name}</h3>
                        <p>Class ${d.class || '-'}</p>
                    </div>`;
                });
            } else {
                section.style.display = 'none'; // hide if no birthdays
            }
        }).catch(e => console.warn("Birthdays error:", e));
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
        const sliderContainer = document.getElementById('galleryTopSlider');
        const slideshowSection = document.getElementById('gallerySlideshowSection');
        const filters = document.getElementById('galleryFilters');
        if (!container) return;
        
        let allImages = [];
        let topImages = [];

        db.collection('gallery').orderBy('createdAt','desc').get().then(snap => {
            if (snap.empty) { 
                container.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:3rem; width:100%;">No gallery images added yet.</p>'; 
                return; 
            }
            
            snap.forEach(doc => allImages.push(doc.data()));
            
            // TOP 10 FIFO logic for Slider
            topImages = allImages.slice(0, 10);
            if (sliderContainer && topImages.length > 0) {
                renderSlider(topImages);
                if (slideshowSection) slideshowSection.style.display = 'block';
            }

            renderGallery('all');

            if (filters) {
                filters.addEventListener('click', (e) => {
                    if (e.target.tagName === 'BUTTON') {
                        document.querySelectorAll('.filter-btn').forEach(btn => {
                            btn.style.background = 'transparent';
                            btn.style.color = '#475569';
                        });
                        e.target.style.background = '#1E40AF';
                        e.target.style.color = 'white';
                        renderGallery(e.target.getAttribute('data-filter'));
                    }
                });
            }
        }).catch(() => {});

        function renderSlider(images) {
            sliderContainer.innerHTML = '';
            images.forEach((img, idx) => {
                const active = idx === 0 ? 'active' : '';
                sliderContainer.innerHTML += `
                    <div class="gallery-slide ${active}" style="position:absolute; inset:0; opacity:${idx === 0 ? 1 : 0}; transition:opacity 1s ease; background:url('${img.url}') center/cover no-repeat;">
                        <div style="display:none;" class="slide-meta" data-title="${img.caption || 'Apex Memory'}"></div>
                    </div>`;
            });

            // Auto-slide logic (Faster as requested)
            let current = 0;
            const slides = sliderContainer.querySelectorAll('.gallery-slide');
            const titleEl = document.getElementById('sliderTitle');
            
            function showNext() {
                slides[current].style.opacity = 0;
                current = (current + 1) % slides.length;
                slides[current].style.opacity = 1;
                if (titleEl) titleEl.textContent = slides[current].querySelector('.slide-meta').dataset.title;
            }

            if (titleEl && slides[0]) titleEl.textContent = slides[0].querySelector('.slide-meta').dataset.title;
            if (slides.length > 1) setInterval(showNext, 3500); // 3.5s interval
        }

        function renderGallery(filter) {
            container.innerHTML = '';
            const filteredImages = filter === 'all' 
                ? allImages 
                : allImages.filter(img => (img.category || 'Others') === filter);
            
            if (filteredImages.length === 0) {
                container.innerHTML = `<p style="text-align:center; color:#94a3b8; padding:3rem; width:100%;">No images found in this category.</p>`;
                return;
            }

            filteredImages.forEach(d => {
                const catBadge = d.category ? `<span style="position:absolute; top:0.5rem; right:0.5rem; background:#1E40AF; color:white; font-size:0.7rem; padding:0.2rem 0.5rem; border-radius:4px; font-weight:bold;">${d.category}</span>` : '';
                container.innerHTML += `<div style="position:relative; border-radius:0.75rem; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1); cursor:pointer;" onclick="openLightbox({src:'${d.url}'})">
                    <img src="${d.url}" alt="${d.caption||'Gallery'}" loading="lazy" style="width:100%; height:220px; object-fit:cover; display:block;">
                    ${catBadge}
                    ${d.caption ? `<div style="padding:0.5rem 0.75rem; font-size:0.85rem; color:#475569; text-align:center;">${d.caption}</div>` : ''}
                </div>`;
            });
        }
    }

    // ===================== STAFF (about.html) =====================
    function loadStaff() {
        const section = document.getElementById('staffSection');
        const container = document.getElementById('staffListAdmin');
        if (!container || !section) return;
        db.collection('staff').orderBy('createdAt','asc').get().then(snap => {
            if (snap.empty) return;
            section.style.display = 'block';
            container.innerHTML = '';
            snap.forEach(doc => {
                const d = doc.data();
                container.innerHTML += `<div class="premium-card" style="padding:1.5rem; text-align:center;">
                    <img src="${d.photoUrl || 'images/default-avatar.png'}" style="width:100px; height:100px; border-radius:50%; object-fit:cover; margin-bottom:1rem; border:3px solid var(--primary-light);">
                    <h3 style="font-size:1.1rem; margin-bottom:0.25rem;">${d.name}</h3>
                    <p style="color:var(--primary); font-weight:600; font-size:0.9rem;">${d.role}</p>
                    ${d.qualifications ? `<p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.5rem;">${d.qualifications}</p>` : ''}
                </div>`;
            });
        }).catch(() => {});
    }

    // ===================== HOLIDAYS (academics.html) =====================
    function loadHolidays() {
        const section = document.getElementById('holidaysSection');
        const container = document.getElementById('holidaysListAdmin');
        if (!container || !section) return;
        db.collection('holidays').orderBy('dateStr','asc').get().then(snap => {
            if (snap.empty) return;
            section.style.display = 'block';
            container.innerHTML = '';
            snap.forEach(doc => {
                const d = doc.data();
                // Format date manually if needed, or use dateStr directly
                container.innerHTML += `<div class="premium-card" style="display:flex; align-items:center; gap:1rem; padding:1.25rem; text-align:left;">
                    <div style="background:var(--primary-light); color:var(--primary); width:50px; height:50px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">
                        <i class="fas fa-umbrella-beach"></i>
                    </div>
                    <div>
                        <h3 style="margin:0; font-size:1rem;">${d.name}</h3>
                        <p style="margin:0; font-size:0.85rem; color:var(--text-muted); margin-top:0.25rem;">${d.dateStr}</p>
                    </div>
                </div>`;
            });
        }).catch(() => {});
    }

    // ===================== FEE STRUCTURE (admissions.html) =====================
    function loadFees() {
        const container = document.getElementById('feesListAdmin');
        if (!container) return;
        db.collection('fees').get().then(snap => {
            if (snap.empty) return;
            let html = `<table class="fee-table">
                <tr><th>Class</th><th>Monthly Fee (₹)</th><th>Annual Fee / Misc (₹)</th></tr>`;
            
            // Re-order by standard class parsing if possible, else just map
            const classOrder = {
                'play-group':1, 'nursery':2, 'lkg':3, 'ukg':4,
                'class-1':5, 'class-2':6, 'class-3':7, 'class-4':8, 'class-5':9,
                'class-6':10, 'class-7':11, 'class-8':12, 'class-9':13, 'class-10':14
            };
            let docs = [];
            snap.forEach(d => {
                const data = d.data();
                data.id = d.id;
                docs.push(data);
            });
            docs.sort((a,b) => (classOrder[a.id]||99) - (classOrder[b.id]||99));
            
            docs.forEach(d => {
                html += `<tr>
                    <td style="font-weight:600;">${d.id.replace('-',' ').toUpperCase()}</td>
                    <td>₹${d.monthly || 0}</td>
                    <td>₹${d.annual || 0}</td>
                </tr>`;
            });
            html += `</table>`;
            container.innerHTML = html;
        }).catch(() => {});
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', tryApply); }
    else { tryApply(); }
})();
