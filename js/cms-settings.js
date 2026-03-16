// cms-settings.js — Loads all CMS data from Firestore and populates the live website pages.
// Included on all public pages after firebase-config.js

(function applyCMSSettings() {
    function tryApply() {
        if (typeof db === 'undefined' || !db) {
            setTimeout(tryApply, 200);
            return;
        }

        const page = window.location.pathname.split('/').pop() || 'index.html';
        const pageKey = page.replace('.html', '') || 'index';
        applyPageText(pageKey === 'index' ? 'home' : pageKey);

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
        loadHomeMemories();
        loadHeroSlider();
        loadAboutHero();
        loadFacilitiesPageData();
        loadGlobalStats();
    }
    // ===================== ABOUT PAGE HERO =====================
    async function loadAboutHero() {
        const hero = document.getElementById('aboutHeroSection');
        if (!hero) return;

        try {
            const doc = await schoolDoc('settings', 'aboutPage').get();
            if (doc.exists && doc.data().heroUrl) {
                hero.style.backgroundImage = `url("${doc.data().heroUrl}")`;
            }
        } catch (e) {
            console.error('Error loading about hero:', e);
        }
    }

    // ===================== FACILITIES PAGE =====================
    async function loadFacilitiesPageData() {
        const hero = document.getElementById('facilitiesHero');
        const sliderTrack = document.getElementById('facilitiesSliderTrack');
        const hoverGrid = document.getElementById('facilitiesHoverGrid');
        const gallerySliderTrack = document.getElementById('facilitiesGallerySliderTrack');

        if (!hero && !sliderTrack && !hoverGrid && !gallerySliderTrack) return;

        try {
            const doc = await schoolDoc('settings', 'facilitiesPage').get();
            if (!doc.exists) return;
            const data = doc.data();

            // 1. Hero
            if (hero && data.heroUrl) hero.style.backgroundImage = `url("${data.heroUrl}")`;

            // 2. Top Slider (Campus Life)
            if (sliderTrack && data.sliderUrls && data.sliderUrls.length > 0) {
                const imgHtml = data.sliderUrls.map((url) => `<img src="${url}" alt="Campus">`).join('');
                sliderTrack.innerHTML = imgHtml + imgHtml; // Duplicate for infinite loop
            }

            // 3. Hover Features
            if (hoverGrid && data.featureUrls && data.featureUrls.length > 0) {
                const featureImages = hoverGrid.querySelectorAll('.facility-panel img');
                data.featureUrls.forEach((url, i) => {
                    if (featureImages[i] && url) featureImages[i].src = url;
                });
            }

            // 4. Bottom Gallery Slider
            if (gallerySliderTrack && data.galleryUrls && data.galleryUrls.length > 0) {
                const imgHtml = data.galleryUrls
                    .map((url) => `<img src="${url}" loading="lazy" alt="Facility Photo">`)
                    .join('');
                gallerySliderTrack.innerHTML = imgHtml + imgHtml; // Duplicate for infinite loop
            }
        } catch (e) {
            console.error('Error loading facilities page data:', e);
        }
    }

    // ===================== GLOBAL STATS =====================
    async function loadGlobalStats() {
        try {
            const doc = await schoolDoc('settings', 'globalStats').get();
            if (doc.exists) {
                const data = doc.data();
                const map = {
                    stat_students: data.students,
                    stat_teachers: data.teachers,
                    stat_classrooms: data.classrooms,
                    stat_years: data.years,
                };

                for (const [id, val] of Object.entries(map)) {
                    const el = document.getElementById(id);
                    if (el && val !== undefined) {
                        el.setAttribute('data-target', val);
                        // If counter already finished, update it immediately
                        if (el.innerText !== '0') el.innerText = val;
                    }
                }
            }
        } catch (e) {
            console.error('Error loading global stats:', e);
        }
    }

    // ===================== PAGE TEXT CUSTOMIZATION =====================
    async function applyPageText(pageKey) {
        try {
            const doc = await schoolDoc('pageText', pageKey).get();
            if (doc.exists) {
                const data = doc.data();
                for (const [id, value] of Object.entries(data)) {
                    const el = document.getElementById(id);
                    if (el && value) {
                        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = value;
                        else el.innerText = value;
                    }
                }
            }
        } catch (e) {
            console.error(`Error applying text for ${pageKey}:`, e);
        }
    }
    // ===================== HOME PAGE HERO SLIDER =====================
    async function loadHeroSlider() {
        const slider = document.getElementById('heroSlider');
        const dotsContainer = document.getElementById('heroSliderDots');
        if (!slider || !dotsContainer) return;

        try {
            const doc = await schoolDoc('settings', 'homeHero').get();
            let urls = [];
            if (doc.exists) {
                urls = doc.data().urls || [];
            }

            if (urls.length === 0) {
                // Fallback defaults
                urls = [
                    'images/School-Building.jpeg',
                    'images/Bihar-Museum-img4.jpeg',
                    'images/Science-centre-Patna-img15.jpeg',
                    'images/Republic-Day-img1.jpeg',
                ];
            }

            slider.innerHTML = '';
            dotsContainer.innerHTML = '';
            urls.forEach((url, i) => {
                const img = document.createElement('img');
                img.src = url;
                img.className = i === 0 ? 'slide active' : 'slide';
                img.id = `slide_${i + 1}`;
                slider.appendChild(img);

                const dot = document.createElement('span');
                dot.className = i === 0 ? 'dot active' : 'dot';
                dotsContainer.appendChild(dot);
            });

            // Re-init slider logic from script.js
            if (typeof initHeroSlider === 'function') {
                initHeroSlider();
            }
        } catch (e) {
            console.error('Error loading hero slider:', e);
        }
    }

    // ===================== HOME PAGE MEMORIES =====================
    async function loadHomeMemories() {
        const grid = document.getElementById('homeMemoriesGrid');
        if (!grid) return;

        try {
            const doc = await schoolDoc('settings', 'homeMemories').get();
            if (doc.exists) {
                const urls = doc.data().urls || [];
                if (urls.length > 0) {
                    grid.innerHTML = '';
                    urls.forEach((url) => {
                        grid.innerHTML += `<img src="${url}" loading="lazy" onclick="openLightbox(this)" style="cursor:pointer;">`;
                    });
                    return;
                }
            }
            // Fallback to static defaults
            grid.innerHTML = `
                <img src="images/Bihar-Museum-img1.jpeg" onclick="openLightbox(this)">
                <img src="images/Science-centre-Patna-img3.jpeg" onclick="openLightbox(this)">
                <img src="images/Republic-Day-img1.jpeg" onclick="openLightbox(this)">
                <img src="images/Sports-Event-Prize-Distribution-img1.jpeg" onclick="openLightbox(this)">
                <img src="images/Bihar-Museum-img4.jpeg" onclick="openLightbox(this)">
                <img src="images/Bihar-Museum-img7.jpeg" onclick="openLightbox(this)">
                <img src="images/Science-centre-Patna-img1.jpeg" onclick="openLightbox(this)">
                <img src="images/Republic-Day-img2.jpeg" onclick="openLightbox(this)">
            `;
        } catch (e) {
            console.error('Error loading home memories:', e);
        }
    }

    // ===================== HOME PAGE FACILITIES =====================
    async function loadHomeFacilities() {
        const track = document.getElementById('homeFacilitiesTrack');
        if (!track) return;

        try {
            const doc = await schoolDoc('settings', 'homeFacilities').get();
            if (doc.exists) {
                const data = doc.data().facilities || [];
                if (data.length > 0) {
                    track.innerHTML = '';
                    data.forEach((item) => {
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
        } catch (e) {
            console.error('Error loading home facilities:', e);
        }
    }

    // ===================== ADMISSION FACILITIES (admissions.html) =====================
    function loadAdmissionFacilities() {
        const grid = document.getElementById('admissionsFacilitiesGrid');
        if (!grid) return;

        schoolDoc('settings', 'admissions')
            .get()
            .then((doc) => {
                if (!doc.exists) return;
                const d = doc.data();

                const mapping = {
                    facility_smart_class: d.smart_class_urls,
                    facility_computer_lab: d.computer_lab_urls,
                    facility_sports: d.sports_urls,
                    facility_security: d.security_urls,
                    facility_transport: d.transport_urls,
                };

                Object.entries(mapping).forEach(([id, urls]) => {
                    const container = document.getElementById(id);
                    if (container && urls && urls.length > 0) {
                        container.innerHTML = '';
                        urls.forEach((url) => {
                            container.innerHTML += `<img src="${url}" style="width:100%; height:80px; object-fit:cover; border-radius:0.5rem; cursor:pointer;" onclick="event.stopPropagation(); openLightbox({src:'${url}'})">`;
                        });
                    } else if (container) {
                        container.innerHTML =
                            '<p style="grid-column:1/-1; font-size:0.8rem; color:#94a3b8; text-align:center;">No photos yet.</p>';
                    }
                });
            })
            .catch(() => {});
    }

    // ===================== GENERAL SETTINGS =====================
    function loadGeneralSettings() {
        schoolDoc('settings', 'general')
            .get()
            .then(function (doc) {
                if (!doc.exists) return;
                const d = doc.data();

                // Marquee
                if (d.marquee)
                    document
                        .querySelectorAll('.dyn-marquee, #dyn-marquee, marquee')
                        .forEach((el) => (el.textContent = d.marquee));

                // Phone
                if (d.phone) {
                    document
                        .querySelectorAll('.dyn-phone, #dyn-phone, [data-cms="phone"]')
                        .forEach((el) => (el.textContent = d.phone));
                    document
                        .querySelectorAll('.float-whatsapp')
                        .forEach((el) => (el.href = 'https://wa.me/' + d.phone.replace(/[^0-9]/g, '')));
                }

                // Email
                if (d.email) {
                    document
                        .querySelectorAll('.dyn-email, #dyn-email, [data-cms="email"]')
                        .forEach((el) => (el.textContent = d.email));
                }

                // Address
                if (d.address)
                    document
                        .querySelectorAll('.dyn-address, #dyn-address, [data-cms="address"]')
                        .forEach((el) => (el.textContent = d.address));

                // Stats — update data-target and restart counter animation
                const stats = {
                    stat_students: d.stat_students,
                    stat_teachers: d.stat_teachers,
                    stat_classrooms: d.stat_classrooms,
                    stat_years: d.stat_years,
                };
                Object.entries(stats).forEach(([id, val]) => {
                    const el = document.getElementById(id);
                    if (el && val) {
                        el.setAttribute('data-target', val);
                        el.textContent = val + '+';
                    }
                });

                // Hero Slider
                ['1', '2', '3', '4'].forEach((n) => {
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
            })
            .catch((e) => console.warn('CMS settings:', e.message));
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

        schoolData('students')
            .get()
            .then((snap) => {
                if (snap.empty) return;

                let birthdayStudents = [];

                snap.forEach((doc) => {
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
            })
            .catch((e) => console.warn('Birthdays error:', e));
    }

    // ===================== EVENTS =====================
    function loadEvents() {
        const container = document.getElementById('eventsContainer');
        if (!container) return;
        const icons = [
            'fa-calendar-day',
            'fa-hand-holding-heart',
            'fa-door-open',
            'fa-star',
            'fa-flag',
            'fa-graduation-cap',
        ];
        schoolData('events')
            .orderBy('createdAt', 'asc')
            .get()
            .then((snap) => {
                if (snap.empty) return; // keep fallback HTML
                container.innerHTML = '';
                let i = 0;
                snap.forEach((doc) => {
                    const d = doc.data();
                    container.innerHTML += `<div class="premium-card">
                    <i class="fas ${icons[i % icons.length]}" style="color:var(--primary); font-size:2.5rem;"></i>
                    <h3>${d.title}</h3>
                    <p>${d.date}${d.subtitle ? ' · ' + d.subtitle : ''}</p>
                </div>`;
                    i++;
                });
            })
            .catch(() => {});
    }

    // ===================== ACHIEVEMENTS =====================
    function loadAchievements() {
        const container = document.getElementById('achievementsContainer');
        if (!container) return;
        const colors = ['#f1c40f', '#e67e22', '#3498db', '#10b981', '#e74c3c'];
        const icons = ['fa-trophy', 'fa-medal', 'fa-star', 'fa-award', 'fa-certificate'];
        schoolData('achievements')
            .orderBy('createdAt', 'asc')
            .get()
            .then((snap) => {
                if (snap.empty) return;
                container.innerHTML = '';
                let i = 0;
                snap.forEach((doc) => {
                    const d = doc.data();
                    const c = colors[i % colors.length];
                    container.innerHTML += `<div class="premium-card">
                    <i class="fas ${icons[i % icons.length]}" style="color:${c}; font-size:2.5rem; background:${c}22; width:80px; height:80px; line-height:80px; border-radius:50%;"></i>
                    <h3>${d.title}</h3>
                    <p>${d.description || ''}</p>
                </div>`;
                    i++;
                });
            })
            .catch(() => {});
    }

    // ===================== TESTIMONIALS =====================
    function loadTestimonials() {
        const section = document.getElementById('testimonialsSection');
        const container = document.getElementById('testimonialsContainer');
        if (!container || !section) return;
        schoolData('testimonials')
            .orderBy('createdAt', 'asc')
            .get()
            .then((snap) => {
                if (snap.empty) return;
                section.style.display = 'block';
                container.innerHTML = '';
                snap.forEach((doc) => {
                    const d = doc.data();
                    container.innerHTML += `<div class="premium-card" style="text-align:left; padding:2rem;">
                    <i class="fas fa-quote-left" style="color:var(--primary-light); font-size:1.5rem; margin-bottom:1rem;"></i>
                    <p style="font-style:italic; color:var(--text-muted); margin-bottom:1.5rem; line-height:1.7;">"${d.quote}"</p>
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <div style="width:42px; height:42px; background:var(--primary); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-weight:700;">${(d.name || '?')[0]}</div>
                        <div><b style="display:block;">${d.name}</b><span style="font-size:0.8rem; color:var(--text-muted);">${d.relation || ''}</span></div>
                    </div>
                </div>`;
                });
            })
            .catch(() => {});
    }

    // ===================== GALLERY PAGE =====================
    function loadGalleryPage() {
        const container = document.getElementById('galleryDynamicGrid');
        const filters = document.getElementById('galleryFilters');
        if (!container) return;

        // LEGACY IMAGES INTEGRATION
        const legacyImages = [
            { url: 'images/Facilities-Slide-img1.jpeg', category: 'Facilities' },
            { url: 'images/Computer Lap.jpeg', category: 'Facilities' },
            { url: 'images/Facilities-Slide-img2.jpeg', category: 'Facilities' },
            { url: 'images/Facilities-Slide-img3.jpeg', category: 'Facilities' },
            { url: 'images/Facilities-Slide-img4.jpeg', category: 'Facilities' },
            { url: 'images/Classroom-img1.jpeg', category: 'Facilities' },
            { url: 'images/Bihar-Museum-img1.jpeg', category: 'Museum' },
            { url: 'images/Bihar-Museum-img2.jpeg', category: 'Museum' },
            { url: 'images/Bihar-Museum-img3.jpeg', category: 'Museum' },
            { url: 'images/Bihar-Museum-img4.jpeg', category: 'Museum' },
            { url: 'images/Bihar-Museum-img5.jpeg', category: 'Museum' },
            { url: 'images/Bihar-Museum-img6.jpeg', category: 'Museum' },
            { url: 'images/Bihar-Museum-img7.jpeg', category: 'Museum' },
            { url: 'images/Bihar-Museum-img8.jpeg', category: 'Museum' },
            { url: 'images/Bihar-Museum-img10.jpeg', category: 'Museum' },
            { url: 'images/Science-centre-Patna-img3.jpeg', category: 'Science' },
            { url: 'images/Republic-Day-img1.jpeg', category: 'Events' },
            { url: 'images/Republic-Day-img2.jpeg', category: 'Events' },
            { url: 'images/Republic-Day-img3.jpeg', category: 'Events' },
            { url: 'images/Sports-Event-Prize-Distribution-img1.jpeg', category: 'Sports' },
            { url: 'images/Sports-Event-Prize-Distribution-img2.jpeg', category: 'Sports' },
            { url: 'images/Vaisali-School-Trip-img1.jpeg', category: 'Trip' },
            { url: 'images/Vaisali-School-Trip-img2.jpeg', category: 'Trip' },
            { url: 'images/Vaisali-School-Trip-img3.jpeg', category: 'Trip' },
            { url: 'images/Science-centre-Patna-img1.jpeg', category: 'Science' },
            { url: 'images/Science-centre-Patna-img2.jpeg', category: 'Science' },
            { url: 'images/Science-centre-Patna-img4.jpeg', category: 'Science' },
            { url: 'images/Science-centre-Patna-img5.jpeg', category: 'Science' },
            { url: 'images/Science-centre-Patna-img6.jpeg', category: 'Science' },
            { url: 'images/Science-centre-Patna-img7.jpeg', category: 'Science' },
            { url: 'images/Science-centre-Patna-img8.jpeg', category: 'Science' },
            { url: 'images/Science-centre-Patna-img9.jpeg', category: 'Science' },
            { url: 'images/Science-centre-Patna-img10.jpeg', category: 'Science' },
            { url: 'images/Science-centre-Patna-img11.jpeg', category: 'Science' },
            { url: 'images/Science-centre-Patna-img12.jpeg', category: 'Science' },
            { url: 'images/Science-centre-Patna-img13.jpeg', category: 'Science' },
            { url: 'images/Science-centre-Patna-img14.jpeg', category: 'Science' },
            { url: 'images/Science-centre-Patna-img15.jpeg', category: 'Science' },
            { url: 'images/Science-centre-Patna-img16.jpeg', category: 'Science' },
            { url: 'images/Science-centre-Patna-img35.jpeg', category: 'Science' },
        ];

        let allImages = [...legacyImages];

        schoolData('gallery')
            .orderBy('createdAt', 'desc')
            .get()
            .then((snap) => {
                snap.forEach((doc) => allImages.push(doc.data()));

                // Default to the first active category if available
                const defaultFilter = filters ? filters.querySelector('.active').getAttribute('data-filter') : 'Sports';
                renderGallery(defaultFilter);

                if (filters) {
                    filters.addEventListener('click', (e) => {
                        if (e.target.tagName === 'BUTTON') {
                            document.querySelectorAll('.filter-btn').forEach((btn) => {
                                btn.style.background = 'transparent';
                                btn.style.color = '#475569';
                                btn.classList.remove('active');
                            });
                            e.target.style.background = '#1E40AF';
                            e.target.style.color = 'white';
                            e.target.classList.add('active');
                            renderGallery(e.target.getAttribute('data-filter'));
                        }
                    });
                }
            })
            .catch(() => {
                // If firebase fails, still render legacy images
                renderGallery('Sports');
            });

        function renderGallery(filter) {
            container.innerHTML = '';
            // Filter images by selected category
            const filteredImages = allImages.filter((img) => (img.category || 'Others') === filter);

            if (filteredImages.length === 0) {
                container.innerHTML = `<p style="text-align:center; color:#94a3b8; padding:5rem; width:100%;">No images found in this category.</p>`;
                return;
            }

            filteredImages.forEach((d) => {
                const catBadge = d.category ? `<span class="card-category">${d.category}</span>` : '';
                container.innerHTML += `
                    <div class="gallery-card" onclick="openLightbox({src:'${d.url}'})">
                        <img src="${d.url}" alt="${d.caption || 'Gallery'}" loading="lazy">
                        ${catBadge}
                        <div class="card-overlay">
                            ${d.caption ? `<div class="card-caption">${d.caption}</div>` : ''}
                        </div>
                    </div>`;
            });
        }
    }

    // ===================== STAFF (about.html) =====================
    function loadStaff() {
        const section = document.getElementById('staffSection');
        const container = document.getElementById('staffListAdmin');
        if (!container || !section) return;
        schoolData('staff')
            .orderBy('createdAt', 'asc')
            .get()
            .then((snap) => {
                if (snap.empty) return;
                section.style.display = 'block';
                container.innerHTML = '';
                snap.forEach((doc) => {
                    const d = doc.data();
                    container.innerHTML += `<div class="premium-card" style="padding:1.5rem; text-align:center;">
                    <img src="${d.photoUrl || 'images/default-avatar.png'}" style="width:100px; height:100px; border-radius:50%; object-fit:cover; margin-bottom:1rem; border:3px solid var(--primary-light);">
                    <h3 style="font-size:1.1rem; margin-bottom:0.25rem;">${d.name}</h3>
                    <p style="color:var(--primary); font-weight:600; font-size:0.9rem;">${d.role}</p>
                    ${d.qualifications ? `<p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.5rem;">${d.qualifications}</p>` : ''}
                </div>`;
                });
            })
            .catch(() => {});
    }

    // ===================== HOLIDAYS (academics.html) =====================
    function loadHolidays() {
        const section = document.getElementById('holidaysSection');
        const container = document.getElementById('holidaysListAdmin');
        if (!container || !section) return;
        schoolData('holidays')
            .orderBy('dateStr', 'asc')
            .get()
            .then((snap) => {
                if (snap.empty) return;
                section.style.display = 'block';
                container.innerHTML = '';
                snap.forEach((doc) => {
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
            })
            .catch(() => {});
    }

    // ===================== FEE STRUCTURE (admissions.html) =====================
    function loadFees() {
        const container = document.getElementById('feesListAdmin');
        if (!container) return;
        schoolData('fees')
            .get()
            .then((snap) => {
                if (snap.empty) return;
                let html = `<table class="fee-table">
                <tr><th>Class</th><th>Monthly Fee (₹)</th><th>Annual Fee / Misc (₹)</th></tr>`;

                // Re-order by standard class parsing if possible, else just map
                const classOrder = {
                    'play-group': 1,
                    nursery: 2,
                    lkg: 3,
                    ukg: 4,
                    'class-1': 5,
                    'class-2': 6,
                    'class-3': 7,
                    'class-4': 8,
                    'class-5': 9,
                    'class-6': 10,
                    'class-7': 11,
                    'class-8': 12,
                    'class-9': 13,
                    'class-10': 14,
                };
                let docs = [];
                snap.forEach((d) => {
                    const data = d.data();
                    data.id = d.id;
                    docs.push(data);
                });
                docs.sort((a, b) => (classOrder[a.id] || 99) - (classOrder[b.id] || 99));

                docs.forEach((d) => {
                    html += `<tr>
                    <td style="font-weight:600;">${d.id.replace('-', ' ').toUpperCase()}</td>
                    <td>₹${d.monthly || 0}</td>
                    <td>₹${d.annual || 0}</td>
                </tr>`;
                });
                html += `</table>`;
                container.innerHTML = html;
            })
            .catch(() => {});
    }

    // Global Fallback for Lightbox (if not defined in page)
    window.openLightbox =
        window.openLightbox ||
        function (img) {
            const src = img.src || img;
            window.open(src, '_blank');
        };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryApply);
    } else {
        tryApply();
    }
})();
