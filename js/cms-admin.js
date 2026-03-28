// ===================== SNR WORLD: STAGE PERMISSIONS =====================
/**
 * Dynamically show/hide sidebar modules based on the school's active SaaS stage.
 */
async function applyStagePermissions() {
    // Wait for slug resolution before checking permissions
    if (window.schoolBootstrapReady) {
        await window.schoolBootstrapReady;
    }
    console.log(`Checking permissions for: ${CURRENT_SCHOOL_ID}`);
    try {
        // Use direct reference to the school document (root collection)
        const schoolDocSnap = await schoolRef().get();
        if (!schoolDocSnap.exists) {
            console.warn('School record not found. Defaulting to full access (Development Mode).');
            return;
        }

        const data = schoolDocSnap.data();
        // Fix: Use nullish coalescing to respect Stage 0 (Banned/Inactive)
        const stage = data.stage ?? 1;
        console.log(`SaaS Level: Stage ${stage}`);

        // Apply Branding
        applySchoolBranding(data);

        // Sidebar Elements Mapping (Synchronized with Centralized SaaS Policy)
        const modules = window.SAAS_POLICY?.MODULE_PERMISSIONS || {
            // Fallback if policy fails to load
            navAdmission: 4,
            navAttendance: 4,
            navFees: 4,
            navExams: 6,
            navResults: 6
        };

        for (const [id, minStage] of Object.entries(modules)) {
            const el = document.getElementById(id);
            if (el) {
                if (stage < minStage) {
                    el.classList.add('hidden');
                    console.log(`- Restricted: ${id} (Requires Stage ${minStage})`);
                } else {
                    el.classList.remove('hidden');
                }
            }
        }
    } catch (e) {
        console.error('Permission check failed:', e);
    }
}

/**
 * Apply School Branding (Name, Logo, etc.)
 */
function applySchoolBranding(data) {
    if (!data) return;
    const name = data.schoolName || window.SCHOOL_NAME || 'School';
    let logo = data.logo || '/images/ApexPublicSchoolLogo.png';

    // Use centralized path normalization
    if (typeof ensureAbsoluteUrl === 'function') {
        logo = ensureAbsoluteUrl(logo);
    } else {
        // Fallback if utility not loaded
        if (logo.startsWith('../')) logo = logo.substring(2);
        if (!logo.startsWith('/') && !logo.startsWith('http')) logo = '/' + logo;
    }

    // Update Title
    if (document.getElementById('dashboardTitle')) {
        document.getElementById('dashboardTitle').innerText = `Admin Dashboard | ${name}`;
    }

    // Update Mobile Brand
    if (document.getElementById('mobileBrandName')) {
        document.getElementById('mobileBrandName').innerText = name.split(' ')[0] + ' Admin';
    }

    // Update Sidebar
    if (document.getElementById('sidebarSchoolName')) {
        document.getElementById('sidebarSchoolName').innerText = name;
    }
    if (document.getElementById('sidebarLogoImg')) {
        document.getElementById('sidebarLogoImg').src = logo;
        document.getElementById('sidebarLogoImg').alt = `${name} Logo`;
    }

    // Update Page Header
    if (document.getElementById('headerSubtext')) {
        document.getElementById('headerSubtext').innerText = `Manage ${name} Portal`;
    }
}

// Auto-run on dashboard load
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('admin-dashboard')) {
        applyStagePermissions();
    }
});

// ===================== SHOW SECTION ROUTING =====================
const CMS_SECTIONS = {
    cmsStats: { load: loadCmsStats },
    cmsEvents: { load: () => loadCmsList('events', 'eventsListAdmin', renderEventItem) },
    cmsAchievements: { load: () => loadCmsList('achievements', 'achievementsListAdmin', renderAchievementItem) },
    cmsTestimonials: { load: () => loadCmsList('testimonials', 'testimonialsListAdmin', renderTestimonialItem) },
    cmsAdmission: { load: loadAdmissionStatus },
    cmsHolidays: { load: () => loadCmsList('holidays', 'holidaysListAdmin', renderHolidayItem) },
    cmsGallery: { load: () => loadCmsList('gallery', 'galleryListAdmin', renderGalleryItem) },
    cmsStaff: { load: () => loadCmsList('staff', 'staffListAdmin', renderStaffItem) },
    cmsTimetable: { load: loadTimetableSection },
    cmsFees: { load: loadFeeStructure },
    cmsHero: { load: loadHeroSlider },
    cmsTheme: { load: loadCmsTheme },
    cmsStudentDashboard: { load: loadCmsStudentDashboard },
    cmsImgGallery: { load: () => {} },
    cmsImgAdmissions: { load: loadImgAdmissions },
    cmsImgHomeFacilities: { load: loadImgHomeFacilities },
    cmsImgHomeMemories: { load: loadImgHomeMemories },
    cmsImgHomeHero: { load: loadImgHomeHero },
    cmsImgAboutHero: { load: loadImgAboutHero },
    cmsImgFacilities: { load: loadImgFacilities },
    cmsGlobalStats: { load: loadGlobalStatsAdmin },
    cmsTextHome: { load: () => loadPageTextAdmin('home') },
    cmsTextAbout: { load: () => loadPageTextAdmin('about') },
    cmsTextAcademics: { load: () => loadPageTextAdmin('academics') },
    cmsTextAdmissions: { load: () => loadPageTextAdmin('admissions') },
    cmsTextFacilities: { load: () => loadPageTextAdmin('facilities') },
    cmsTextGallery: { load: () => loadPageTextAdmin('gallery') },
    cmsTextContact: { load: () => loadPageTextAdmin('contact') },
    cmsTextInquiry: { load: () => loadPageTextAdmin('inquiry') },
    cmsFeeTools: {
        load: () => {
            window.feeDuesToolResultData = null;
            document.getElementById('fee_resultsArea').classList.add('hidden');
        },
    },
};

// Hook into existing showSection via unified reference
const cmsPreviousShowSection = window.showSection;
window.showSection = function (id, updateHash = true) {
    if (typeof cmsPreviousShowSection === 'function') {
        cmsPreviousShowSection(id, updateHash);
    } else {
        console.warn('Previous showSection not found in CMS extension');
    }

    if (CMS_SECTIONS[id]) CMS_SECTIONS[id].load();

    // Close mobile sidebar if open
    const sidebar = document.getElementById('adminSidebar');
    if (sidebar && sidebar.classList.contains('mobile-open')) {
        toggleMobileSidebar();
    }
};

// ===================== STATS =====================
async function loadCmsStats() {
    try {
        const doc = await schoolDoc('settings', 'general').get();
        if (doc.exists) {
            const d = doc.data();
            document.getElementById('stat_students').value = d.stat_students || '';
            document.getElementById('stat_teachers').value = d.stat_teachers || '';
            document.getElementById('stat_classrooms').value = d.stat_classrooms || '';
            document.getElementById('stat_years').value = d.stat_years || '';
        }
    } catch (e) {
        console.error(e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('cmsStatsForm')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        try {
            await schoolDoc('settings', 'general').set(
                withSchool({
                    stat_students: parseInt(document.getElementById('stat_students').value) || 0,
                    stat_teachers: parseInt(document.getElementById('stat_teachers').value) || 0,
                    stat_classrooms: parseInt(document.getElementById('stat_classrooms').value) || 0,
                    stat_years: parseInt(document.getElementById('stat_years').value) || 0,
                }),
                { merge: true }
            );
            showToast('Stats updated live!');
        } catch (e) {
            showToast('Error: ' + e.message, 'error');
        }
    });

    document.getElementById('cmsHeroForm')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        try {
            await schoolDoc('settings', 'general').set(
                withSchool({
                    hero_1: document.getElementById('hero_1').value.trim(),
                    hero_2: document.getElementById('hero_2').value.trim(),
                    hero_3: document.getElementById('hero_3').value.trim(),
                    hero_4: document.getElementById('hero_4').value.trim(),
                }),
                { merge: true }
            );
            showToast('Hero slider images updated!');
        } catch (e) {
            showToast('Error: ' + e.message, 'error');
        }
    });

    document.getElementById('cmsStudentDashboardForm')?.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Collect links
        const links = [];
        document.querySelectorAll('.cms-link-item').forEach((item) => {
            const title = item.querySelector('.link-title').value.trim();
            const url = item.querySelector('.link-url').value.trim();
            if (title && url) links.push({ title, url });
        });

        const config = {
            examHeading: document.getElementById('cms_examHeading').value.trim(),
            examNotice: document.getElementById('cms_examNotice').value.trim(),
            // Module visibility
            showHomework: document.getElementById('cms_showHomework').checked,
            showFees: document.getElementById('cms_showFees').checked,
            showExams: document.getElementById('cms_showExams').checked,
            showMaterials: document.getElementById('cms_showMaterials').checked,
            // Widget visibility
            showAttendance: document.getElementById('cms_showAttendance').checked,
            showPrincipalMessage: document.getElementById('cms_showPrincipalMessage').checked,
            // Content
            principalMessage: document.getElementById('cms_principalMessage').value.trim(),
            importantLinks: links,
        };

        try {
            await schoolDoc('settings', 'studentPortal').set(withSchool(config), { merge: true });
            showToast('Student Dashboard configuration updated live!');
            // Update preview for banner
            const previewTitle = document.getElementById('previewTitle');
            const previewNotice = document.getElementById('previewNotice');
            if (previewTitle) previewTitle.textContent = config.examHeading || '(No Heading Set)';
            if (previewNotice) previewNotice.textContent = config.examNotice;
        } catch (e) {
            showToast('Error: ' + e.message, 'error');
        }
    });

    // Live preview sync
    document.getElementById('cms_examHeading')?.addEventListener('input', function () {
        document.getElementById('previewTitle').textContent = this.value || 'Final Examination March, 2026';
    });
    document.getElementById('cms_examNotice')?.addEventListener('input', function () {
        document.getElementById('previewNotice').textContent = this.value;
    });

    // Theme Form Submission
    document.getElementById('cmsThemeForm')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        const primary = document.getElementById('theme_primary').value;
        const secondary = document.getElementById('theme_secondary').value;

        try {
            await schoolDoc('settings', 'theme').set(
                withSchool({
                    primaryColor: primary,
                    sidebarColor: secondary,
                }),
                { merge: true }
            );

            showToast('Global theme updated and applied live!');
            applyGlobalTheme(); // Immediately apply in admin panel
        } catch (e) {
            showToast('Error: ' + e.message, 'error');
        }
    });

    // Theme Picker Sync
    ['primary', 'secondary'].forEach((type) => {
        const picker = document.getElementById(`theme_${type}`);
        const text = document.getElementById(`theme_${type}_text`);
        if (picker && text) {
            picker.addEventListener('input', () => (text.value = picker.value));
            text.addEventListener('input', () => {
                if (/^#[0-9A-F]{6}$/i.test(text.value)) picker.value = text.value;
            });
        }
    });

    // Sidebar collapse state restore
    if (localStorage.getItem('adminSidebarCollapsed') === 'true') {
        document.getElementById('adminSidebar')?.classList.add('collapsed');
        const icon = document.getElementById('toggleIcon');
        if (icon) {
            icon.className = 'fas fa-chevron-right';
        }
    }

    document.getElementById('cmsFacilityImagesForm')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        const saveBtn = document.getElementById('cmsAdmissionsImgSaveBtn');
        const loading = document.getElementById('cmsAdmissionsImgLoading');
        if (saveBtn) saveBtn.disabled = true;
        if (loading) loading.classList.remove('hidden');

        try {
            const current = (await schoolDoc('settings', 'admissions').get()).data() || {};
            const processGroup = async (prefix, count, currentUrls) => {
                const urls = [...(currentUrls || [])];
                for (let i = 1; i <= count; i++) {
                    const file = document.getElementById(`${prefix}_${i}`).files[0];
                    if (file) urls[i - 1] = await processCmsImage(file);
                }
                return urls.filter((u) => u);
            };

            const data = {
                smart_class_urls: await processGroup('f_smart', 2, current.smart_class_urls),
                computer_lab_urls: await processGroup('f_computer', 2, current.computer_lab_urls),
                sports_urls: await processGroup('f_sports', 2, current.sports_urls),
                security_urls: await processGroup('f_security', 2, current.security_urls),
                transport_urls: await processGroup('f_transport', 2, current.transport_urls),
            };

            await schoolDoc('settings', 'admissions').set(withSchool(data), { merge: true });
            showToast('Admissions media updated!');
        } catch (e) {
            showToast('Error: ' + e.message, 'error');
        } finally {
            if (saveBtn) saveBtn.disabled = false;
            if (loading) loading.classList.add('hidden');
        }
    });

    document.getElementById('cmsHomeFacilitiesForm')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        const saveBtn = e.target.querySelector('button[type="submit"]');
        if (saveBtn) saveBtn.disabled = true;

        try {
            const current = (await schoolDoc('settings', 'homeFacilities').get()).data() || {};
            const facilities = [...(current.facilities || [])];
            const items = document.querySelectorAll('.facility-cms-item');

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const name = item.querySelector('.f-name').value.trim();
                const file = item.querySelector('.f-file').files[0];

                if (name) {
                    if (!facilities[i]) facilities[i] = { name: '', url: '' };
                    facilities[i].name = name;
                    if (file) facilities[i].url = await processCmsImage(file);
                }
            }

            await schoolDoc('settings', 'homeFacilities').set(
                withSchool({
                    facilities: facilities.filter((f) => f.name),
                })
            );
            showToast('Home page facilities updated!');
        } catch (e) {
            showToast('Error: ' + e.message, 'error');
        } finally {
            if (saveBtn) saveBtn.disabled = false;
        }
    });

    document.getElementById('cmsHomeMemoriesForm')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        const saveBtn = e.target.querySelector('button[type="submit"]');
        if (saveBtn) saveBtn.disabled = true;

        try {
            const current = (await schoolDoc('settings', 'homeMemories').get()).data() || {};
            const urls = [...(current.urls || [])];
            const files = e.target.querySelectorAll('.mem-file');

            for (let i = 0; i < files.length; i++) {
                const file = files[i].files[0];
                if (file) urls[i] = await processCmsImage(file);
            }

            await schoolDoc('settings', 'homeMemories').set(
                withSchool({
                    urls: urls.filter((u) => u),
                })
            );
            showToast('School Memories updated!');
        } catch (e) {
            showToast('Error: ' + e.message, 'error');
        } finally {
            if (saveBtn) saveBtn.disabled = false;
        }
    });

    document.getElementById('cmsHomeHeroForm')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        const saveBtn = e.target.querySelector('button[type="submit"]');
        if (saveBtn) saveBtn.disabled = true;

        try {
            const current = (await schoolDoc('settings', 'homeHero').get()).data() || {};
            const urls = [...(current.urls || [])];
            const files = e.target.querySelectorAll('.hero-file');

            for (let i = 0; i < files.length; i++) {
                const file = files[i].files[0];
                if (file) urls[i] = await processCmsImage(file);
            }

            await schoolDoc('settings', 'homeHero').set(
                withSchool({
                    urls: urls.filter((u) => u),
                })
            );
            showToast('Home Hero Slider updated!');
        } catch (e) {
            showToast('Error: ' + e.message, 'error');
        } finally {
            if (saveBtn) saveBtn.disabled = false;
        }
    });

    document.getElementById('cmsAboutHeroForm')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        const file = document.getElementById('aboutHeroUrl').files[0];
        const saveBtn = e.target.querySelector('button[type="submit"]');

        try {
            let heroUrl = (await schoolDoc('settings', 'aboutPage').get()).data()?.heroUrl || '';
            if (file) {
                if (saveBtn) saveBtn.disabled = true;
                heroUrl = await processCmsImage(file);
            }

            await schoolDoc('settings', 'aboutPage').set(
                withSchool({
                    heroUrl,
                }),
                { merge: true }
            );
            showToast('About page banner updated!');
        } catch (e) {
            showToast('Error: ' + e.message, 'error');
        } finally {
            if (saveBtn) saveBtn.disabled = false;
        }
    });

    document.getElementById('cmsFacilitiesForm')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        const saveBtn = e.target.querySelector('button[type="submit"]');
        if (saveBtn) saveBtn.disabled = true;

        try {
            const current = (await schoolDoc('settings', 'facilitiesPage').get()).data() || {};
            const data = {
                heroUrl: current.heroUrl || '',
                sliderUrls: current.sliderUrls || [],
                featureUrls: current.featureUrls || [],
                galleryUrls: current.galleryUrls || [],
            };

            const heroFile = document.getElementById('facHeroUrl').files[0];
            if (heroFile) data.heroUrl = await processCmsImage(heroFile);

            // Special case: these lists are shared by class, need careful mapping but since they are dynamic inputs now:
            const processList = async (selector, list) => {
                const newList = [...list];
                const inputs = document.querySelectorAll(selector);
                for (let i = 0; i < inputs.length; i++) {
                    const file = inputs[i].files[0];
                    if (file) newList[i] = await processCmsImage(file);
                }
                return newList.filter((u) => u);
            };

            data.sliderUrls = await processList('.fac-slider-file', data.sliderUrls);
            data.featureUrls = await processList('.fac-feature-file', data.featureUrls);
            data.galleryUrls = await processList('.fac-gallery-file', data.galleryUrls);

            await schoolDoc('settings', 'facilitiesPage').set(withSchool(data));
            showToast('Facilities Page imagery updated!');
        } catch (e) {
            showToast('Error: ' + e.message, 'error');
        } finally {
            if (saveBtn) saveBtn.disabled = false;
        }
    });

    document.getElementById('cmsGlobalStatsForm')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        const data = {
            students: parseInt(document.getElementById('statsStudents').value) || 0,
            teachers: parseInt(document.getElementById('statsTeachers').value) || 0,
            classrooms: parseInt(document.getElementById('statsClassrooms').value) || 0,
            years: parseInt(document.getElementById('statsYears').value) || 0,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        try {
            await schoolDoc('settings', 'globalStats').set(withSchool(data));
            showToast('Global Statistics updated across all pages!');
        } catch (e) {
            showToast('Error: ' + e.message, 'error');
        }
    });
});

// ===================== WEBSITE IMAGES CMS =====================
async function loadImgAdmissions() {
    try {
        const doc = await schoolDoc('settings', 'admissions').get();
        if (doc.exists) {
            const d = doc.data();
            const setG = (p, urls) => {
                (urls || []).forEach((u, i) => setMiniPreview(`${p}_${i + 1}_preview`, u));
            };
            setG('f_smart', d.smart_class_urls);
            setG('f_computer', d.computer_lab_urls);
            setG('f_sports', d.sports_urls);
            setG('f_security', d.security_urls);
            setG('f_transport', d.transport_urls);
        }
    } catch (e) {
        console.error('loadImgAdmissions error:', e);
    }
}

async function loadImgHomeFacilities() {
    try {
        const doc = await schoolDoc('settings', 'homeFacilities').get();
        if (doc.exists) {
            const facilities = doc.data().facilities || [];
            const items = document.querySelectorAll('.facility-cms-item');
            items.forEach((item, i) => {
                if (facilities[i]) {
                    item.querySelector('.f-name').value = facilities[i].name || '';
                    setMiniPreview(`f_home_${i + 1}_preview`, facilities[i].url);
                }
            });
        }
    } catch (e) {
        console.error('loadImgHomeFacilities error:', e);
    }
}

async function loadImgHomeMemories() {
    try {
        const doc = await schoolDoc('settings', 'homeMemories').get();
        if (doc.exists) {
            const urls = doc.data().urls || [];
            urls.forEach((url, i) => setMiniPreview(`mem_${i + 1}_preview`, url));
        }
    } catch (e) {
        console.error('loadImgHomeMemories error:', e);
    }
}

async function loadImgHomeHero() {
    try {
        const doc = await schoolDoc('settings', 'homeHero').get();
        if (doc.exists) {
            const urls = doc.data().urls || [];
            urls.forEach((url, i) => setMiniPreview(`hero_img_${i + 1}_preview`, url));
        }
    } catch (e) {
        console.error('loadImgHomeHero error:', e);
    }
}

async function loadImgAboutHero() {
    try {
        const doc = await schoolDoc('settings', 'aboutPage').get();
        if (doc.exists && doc.data().heroUrl) {
            setMiniPreview('aboutHero_preview', doc.data().heroUrl);
        }
    } catch (e) {
        console.error('loadImgAboutHero error:', e);
    }
}

async function loadImgFacilities() {
    try {
        const doc = await schoolDoc('settings', 'facilitiesPage').get();
        if (doc.exists) {
            const data = doc.data();
            if (data.heroUrl) setMiniPreview('facHero_preview', data.heroUrl);

            // Populate slider/feature/gallery previews if containers exist
            // This assumes the inputs are already there (they are static in admin-dashboard.html)
            (data.sliderUrls || []).forEach((u, i) => setMiniPreview(`fac_s_${i + 1}_preview`, u));
            (data.featureUrls || []).forEach((u, i) => setMiniPreview(`fac_f_${i + 1}_preview`, u));
            (data.galleryUrls || []).forEach((u, i) => setMiniPreview(`fac_g_${i + 1}_preview`, u));
        }
    } catch (e) {
        console.error('loadImgFacilities error:', e);
    }
}

async function loadGlobalStatsAdmin() {
    try {
        const doc = await schoolDoc('settings', 'globalStats').get();
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('statsStudents').value = data.students || '';
            document.getElementById('statsTeachers').value = data.teachers || '';
            document.getElementById('statsClassrooms').value = data.classrooms || '';
            document.getElementById('statsYears').value = data.years || '';
        }
    } catch (e) {
        console.error('loadGlobalStatsAdmin error:', e);
    }
}

// ===================== WEBSITE TEXT CMS (GENERIC) =====================
async function loadPageTextAdmin(pageKey) {
    try {
        const doc = await schoolDoc('pageText', pageKey).get();
        if (doc.exists) {
            const data = doc.data();
            const allInputs = document.querySelectorAll(
                `#cmsText${pageKey.charAt(0).toUpperCase() + pageKey.slice(1)}Form [id]`
            );
            allInputs.forEach((input) => {
                const id = input.id;
                // Try several mapping strategies:
                // 1. Pure key match
                if (data[id]) {
                    input.value = data[id];
                }
                // 2. Mapping 'textHomeHeroTitle' -> 'heroTitle'
                else {
                    const pagePrefix = `text${pageKey.charAt(0).toUpperCase() + pageKey.slice(1)}`;
                    const shortKey = id.replace(pagePrefix, '');
                    const dbKey = shortKey.charAt(0).toLowerCase() + shortKey.slice(1);
                    if (data[dbKey]) {
                        input.value = data[dbKey];
                    } else if (data[id.replace('text', '').charAt(0).toLowerCase() + id.replace('text', '').slice(1)]) {
                        input.value =
                            data[id.replace('text', '').charAt(0).toLowerCase() + id.replace('text', '').slice(1)];
                    }
                }
            });
        }
    } catch (e) {
        console.error(`loadPageTextAdmin error for ${pageKey}:`, e);
    }
}

function setupTextForm(pageKey) {
    const form = document.getElementById(`cmsText${pageKey.charAt(0).toUpperCase() + pageKey.slice(1)}Form`);
    if (!form) return;
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const data = { updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
        const inputs = form.querySelectorAll('[id]');
        inputs.forEach((input) => {
            const key = input.id.replace(`text${pageKey.charAt(0).toUpperCase() + pageKey.slice(1)}`, '');
            const dbKey = key.charAt(0).toLowerCase() + key.slice(1);
            data[dbKey] = input.value.trim();
        });

        try {
            await schoolDoc('pageText', pageKey).set(withSchool(data), { merge: true });
            showToast(`${pageKey.charAt(0).toUpperCase() + pageKey.slice(1)} Page text updated!`);
        } catch (e) {
            showToast('Error: ' + e.message, 'error');
        }
    });
}

// Initialize all forms
['home', 'about', 'academics', 'admissions', 'facilities', 'gallery', 'contact', 'inquiry'].forEach(setupTextForm);

// ===================== STUDENT DASHBOARD CMS =====================
async function loadCmsStudentDashboard() {
    try {
        const doc = await schoolDoc('settings', 'studentPortal').get();
        if (doc.exists) {
            const d = doc.data();
            if (document.getElementById('cms_examHeading'))
                document.getElementById('cms_examHeading').value = d.examHeading || '';
            if (document.getElementById('cms_examNotice'))
                document.getElementById('cms_examNotice').value = d.examNotice || '';

            // Modules
            if (document.getElementById('cms_showHomework'))
                document.getElementById('cms_showHomework').checked = d.showHomework !== false;
            if (document.getElementById('cms_showFees'))
                document.getElementById('cms_showFees').checked = d.showFees !== false;
            if (document.getElementById('cms_showExams'))
                document.getElementById('cms_showExams').checked = d.showExams !== false;
            if (document.getElementById('cms_showMaterials'))
                document.getElementById('cms_showMaterials').checked = d.showMaterials !== false;

            // Widgets
            if (document.getElementById('cms_showAttendance'))
                document.getElementById('cms_showAttendance').checked = !!d.showAttendance;
            if (document.getElementById('cms_showPrincipalMessage'))
                document.getElementById('cms_showPrincipalMessage').checked = !!d.showPrincipalMessage;

            if (document.getElementById('cms_principalMessage'))
                document.getElementById('cms_principalMessage').value = d.principalMessage || '';

            // Important Links
            const linksContainer = document.getElementById('cmsImportanLinksList');
            if (linksContainer) {
                linksContainer.innerHTML = '';
                if (d.importantLinks && Array.isArray(d.importantLinks)) {
                    d.importantLinks.forEach((link) => addCmsImportantLink(link.title, link.url));
                }
            }

            // Update Preview
            if (document.getElementById('previewTitle'))
                document.getElementById('previewTitle').textContent = d.examHeading || 'Final Examination March, 2026';
            if (document.getElementById('previewNotice'))
                document.getElementById('previewNotice').textContent =
                    d.examNotice || 'Exams begin on March 23rd. Please carry your Admit Card.';
        }
    } catch (e) {
        console.error('loadCmsStudentDashboard error:', e);
    }
}

function addCmsImportantLink(title = '', url = '') {
    const container = document.getElementById('cmsImportanLinksList');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'cms-link-item cms-link-item-container';

    div.innerHTML = `
        <input type="text" placeholder="Title (e.g. Video Library)" class="link-title cms-link-input" value="${title}">
        <input type="url" placeholder="URL (https://...)" class="link-url cms-link-input" value="${url}">
        <button type="button" onclick="this.parentElement.remove()" class="btn-trash" title="Remove Link">
            <i class="fas fa-trash-alt"></i>
        </button>
    `;
    container.appendChild(div);
}

// ===================== THEME CMS =====================
async function loadCmsTheme() {
    try {
        const doc = await schoolDoc('settings', 'theme').get();
        if (doc.exists) {
            const d = doc.data();
            if (d.primaryColor) {
                document.getElementById('theme_primary').value = d.primaryColor;
                document.getElementById('theme_primary_text').value = d.primaryColor;
            }
            if (d.sidebarColor) {
                document.getElementById('theme_secondary').value = d.sidebarColor;
                document.getElementById('theme_secondary_text').value = d.sidebarColor;
            }
        }
    } catch (e) {
        console.error('loadCmsTheme error:', e);
    }
}

async function updateStudentAttendance() {
    const studentId = document.getElementById('att_studentId').value.trim();
    const month = document.getElementById('att_month').value;
    const percentage = parseInt(document.getElementById('att_percent').value);

    if (!studentId || !month || isNaN(percentage)) {
        showToast('Please fill all attendance fields correctly.', 'error');
        return;
    }

    try {
        const attId = `${studentId}_${month}`;
        await schoolDoc('attendance', attId).set(
            withSchool({
                studentId,
                month,
                percentage,
            }),
            { merge: true }
        );

        showToast(`Attendance updated for ${studentId} (${month})`);

        // Clear inputs except month
        document.getElementById('att_studentId').value = '';
        document.getElementById('att_percent').value = '';
    } catch (e) {
        showToast('Error updating attendance: ' + e.message, 'error');
    }
}

// ===================== COLLAPSIBLE SIDEBAR =====================
function toggleSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const icon = document.getElementById('toggleIcon');
    const isCollapsed = sidebar.classList.toggle('collapsed');
    if (icon) icon.className = isCollapsed ? 'fas fa-chevron-right' : 'fas fa-bars';
    localStorage.setItem('adminSidebarCollapsed', isCollapsed ? 'true' : 'false');
}

// ===================== GENERIC COLLECTION LIST LOADER =====================
async function loadCmsList(collection, containerId, renderFn) {
    const el = document.getElementById(containerId);
    el.innerHTML = '<p style="color:#64748b;"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';
    try {
        const snap = await schoolData(collection).orderBy('createdAt', 'asc').get();
        el.innerHTML = snap.empty
            ? '<p style="color:#94a3b8; text-align:center; padding:2rem;">No items yet. Add one above!</p>'
            : '';
        snap.forEach((doc) => {
            el.innerHTML += renderFn(doc.id, doc.data());
        });
    } catch (e) {
        // Try without orderBy if field missing
        try {
            const snap2 = await schoolData(collection).get();
            el.innerHTML = snap2.empty
                ? '<p style="color:#94a3b8; text-align:center; padding:2rem;">No items yet.</p>'
                : '';
            snap2.forEach((doc) => {
                el.innerHTML += renderFn(doc.id, doc.data());
            });
        } catch (e2) {
            el.innerHTML = `<p style="color:#ef4444;">Error: ${e2.message}</p>`;
        }
    }
}

// ===================== ACCORDION SIDEBAR =====================
function toggleCategory(catId) {
    const cat = document.getElementById(catId);
    const header = cat.previousElementSibling;
    const isOpen = cat.classList.contains('open');

    // Close all other categories (optional: comment out if you want multiple open)
    document.querySelectorAll('.cat-submenu').forEach((el) => {
        el.classList.remove('open');
        el.previousElementSibling.classList.remove('active');
    });

    if (!isOpen) {
        cat.classList.add('open');
        header.classList.add('active');
    }
}

// ===================== MOBILE DRAWER =====================
function toggleMobileSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const isOpening = !sidebar.classList.contains('mobile-open');

    sidebar.classList.toggle('mobile-open');

    // Create overlay if not exists
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.onclick = toggleMobileSidebar;
        document.body.appendChild(overlay);
    }

    if (isOpening) {
        overlay.style.display = 'block';
        setTimeout(() => overlay.classList.add('active'), 10);
        document.body.style.overflow = 'hidden';
    } else {
        overlay.classList.remove('active');
        setTimeout(() => {
            if (!overlay.classList.contains('active')) overlay.style.display = 'none';
        }, 300);
        document.body.style.overflow = '';
    }
}

// ===================== RESPONSIVE TABLES HELPER =====================
function initResponsiveTables() {
    document.querySelectorAll('table').forEach((table) => {
        if (!table.parentElement.classList.contains('table-responsive')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-responsive';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        }
    });
}

// Add to DOMContentLoaded or relevant init
document.addEventListener('DOMContentLoaded', () => {
    initResponsiveTables();
});

// ===================== RENDER HELPERS =====================
function renderEventItem(id, d) {
    return `<div style="display:flex; align-items:center; justify-content:space-between; padding:1rem 1.25rem; background:#f8fafc; border-radius:0.75rem; border-left:4px solid #3b82f6;">
        <div><b>${d.title || ''}</b> — <span style="color:#64748b;">${d.date || ''}</span> <span style="color:#94a3b8; font-size:0.85rem;">${d.subtitle || ''}</span></div>
        <button onclick="deleteCmsItem('events','${id}',loadCmsList.bind(null,'events','eventsListAdmin',renderEventItem))" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.2rem;"><i class="fas fa-trash"></i></button>
    </div>`;
}

function renderAchievementItem(id, d) {
    return `<div style="display:flex; align-items:center; justify-content:space-between; padding:1rem 1.25rem; background:#f8fafc; border-radius:0.75rem; border-left:4px solid #f59e0b;">
        <div><b>${d.title || ''}</b> — <span style="color:#64748b; font-size:0.875rem;">${d.description || ''}</span></div>
        <button onclick="deleteCmsItem('achievements','${id}',loadCmsList.bind(null,'achievements','achievementsListAdmin',renderAchievementItem))" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.2rem;"><i class="fas fa-trash"></i></button>
    </div>`;
}

function renderTestimonialItem(id, d) {
    return `<div style="display:flex; align-items:center; justify-content:space-between; padding:1rem 1.25rem; background:#f8fafc; border-radius:0.75rem; border-left:4px solid #10b981;">
        <div><b>${d.name || ''}</b> (${d.relation || ''}) — <span style="color:#64748b; font-style:italic; font-size:0.875rem;">"${d.quote || ''}"</span></div>
        <button onclick="deleteCmsItem('testimonials','${id}',loadCmsList.bind(null,'testimonials','testimonialsListAdmin',renderTestimonialItem))" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.2rem;"><i class="fas fa-trash"></i></button>
    </div>`;
}

function renderHolidayItem(id, d) {
    return `<div style="display:flex; align-items:center; justify-content:space-between; padding:0.75rem 1rem; background:#fefce8; border-radius:0.5rem;">
        <div><b style="color:#facc15; margin-right:0.5rem;">🎉</b> <b>${d.name || ''}</b> — <span style="color:#64748b;">${d.date || ''}</span></div>
        <button onclick="deleteCmsItem('holidays','${id}',loadCmsList.bind(null,'holidays','holidaysListAdmin',renderHolidayItem))" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fas fa-trash"></i></button>
    </div>`;
}

function renderGalleryItem(id, d) {
    const url = d.url || d.imageUrl || '';
    const catBadge = d.category
        ? `<span style="position:absolute; top:0.4rem; left:0.4rem; background:#1E40AF; color:white; font-size:0.65rem; padding:0.2rem 0.4rem; border-radius:4px; font-weight:bold;">${d.category}</span>`
        : '';
    return `<div style="position:relative; border-radius:0.75rem; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <img src="${url}" style="width:100%; height:140px; object-fit:cover; display:block;" onerror="this.src='https://via.placeholder.com/180x140?text=Invalid+URL'">
        ${catBadge}
        <div style="padding:0.4rem 0.6rem; font-size:0.75rem; color:#64748b;">${d.caption || ''}</div>
        <button onclick="deleteCmsItem('gallery','${id}',loadCmsList.bind(null,'gallery','galleryListAdmin',renderGalleryItem))" style="position:absolute;top:0.4rem;right:0.4rem; background:rgba(239,68,68,0.9); border:none; color:white; border-radius:50%; width:26px; height:26px; cursor:pointer;"><i class="fas fa-times"></i></button>
    </div>`;
}

function renderStaffItem(id, d) {
    return `<div style="background:white; padding:1.25rem; border-radius:1rem; box-shadow:0 2px 8px rgba(0,0,0,0.08); text-align:center; position:relative;">
        <img src="${d.photo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(d.name || 'Staff') + '&background=1e3a8a&color=fff'}" style="width:70px; height:70px; border-radius:50%; object-fit:cover; margin-bottom:0.75rem;">
        <p style="font-weight:700; margin-bottom:0.25rem;">${d.name || ''}</p>
        <p style="color:#64748b; font-size:0.8rem;">${d.subject || ''}</p>
        <button onclick="deleteCmsItem('staff','${id}',loadCmsList.bind(null,'staff','staffListAdmin',renderStaffItem))" style="position:absolute;top:0.5rem;right:0.5rem; background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fas fa-trash"></i></button>
    </div>`;
}

// ===================== DELETE CMS ITEM =====================
async function deleteCmsItem(collection, id, reloadFn) {
    if (!confirm('Delete this item?')) return;
    try {
        await schoolDoc(collection, id).delete();
        showToast('Deleted!');
        reloadFn();
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

// ===================== MODAL SYSTEM =====================
const cmsActions = {
    events: {
        save: async (data) => {
            await schoolData('events').add(
                withSchool({ title: data.cms_title, date: data.cms_date, subtitle: data.cms_subtitle })
            );
            loadCmsList('events', 'eventsListAdmin', renderEventItem);
        },
    },
    achievements: {
        save: async (data) => {
            await schoolData('achievements').add(withSchool({ title: data.cms_title, description: data.cms_desc }));
            loadCmsList('achievements', 'achievementsListAdmin', renderAchievementItem);
        },
    },
    testimonials: {
        save: async (data) => {
            await schoolData('testimonials').add(
                withSchool({ name: data.cms_name, relation: data.cms_relation, quote: data.cms_quote })
            );
            loadCmsList('testimonials', 'testimonialsListAdmin', renderTestimonialItem);
        },
    },
    holidays: {
        save: async (data) => {
            await schoolData('holidays').add(withSchool({ name: data.cms_name, date: data.cms_date }));
            loadCmsList('holidays', 'holidaysListAdmin', renderHolidayItem);
        },
    },
    gallery: {
        save: async (data) => {
            await schoolData('gallery').add(
                withSchool({ url: data.cms_photo, category: data.cms_category, caption: data.cms_caption })
            );
            loadCmsList('gallery', 'galleryListAdmin', renderGalleryItem);
        },
    },
    staff: {
        save: async (data) => {
            await schoolData('staff').add(
                withSchool({ name: data.cms_name, subject: data.cms_subject, photo: data.cms_photo })
            );
            loadCmsList('staff', 'staffListAdmin', renderStaffItem);
        },
    },
};

const MODAL_CONFIGS = {
    event: {
        title: 'Add Upcoming Event',
        fields: [
            { id: 'cms_title', label: 'Event Title *', type: 'text', required: true },
            { id: 'cms_date', label: 'Date *', type: 'text', placeholder: 'e.g. March 30, 2026', required: true },
            { id: 'cms_subtitle', label: 'Short Description', type: 'text' },
        ],
        save: cmsActions.events.save,
    },
    achievement: {
        title: 'Add Achievement',
        fields: [
            { id: 'cms_title', label: 'Achievement Title *', type: 'text', required: true },
            { id: 'cms_desc', label: 'Description', type: 'text' },
        ],
        save: cmsActions.achievements.save,
    },
    testimonial: {
        title: 'Add Testimonial',
        fields: [
            { id: 'cms_name', label: 'Parent / Student Name *', type: 'text', required: true },
            { id: 'cms_relation', label: 'Relation (e.g. Parent of Class 5)', type: 'text' },
            { id: 'cms_quote', label: 'Quote / Review *', type: 'textarea', required: true },
        ],
        save: async (data) => {
            await db
                .collection('testimonials')
                .add(withSchool({ name: data.cms_name, relation: data.cms_relation, quote: data.cms_quote }));
            loadCmsList('testimonials', 'testimonialsListAdmin', renderTestimonialItem);
        },
    },
    holiday: {
        title: 'Add Holiday',
        fields: [
            { id: 'cms_name', label: 'Holiday Name *', type: 'text', required: true },
            { id: 'cms_date', label: 'Date (e.g. April 14, 2026) *', type: 'text', required: true },
        ],
        save: async (data) => {
            await db.collection('holidays').add(withSchool({ name: data.cms_name, date: data.cms_date }));
            loadCmsList('holidays', 'holidaysListAdmin', renderHolidayItem);
        },
    },
    gallery: {
        title: 'Add Gallery Image',
        fields: [
            { id: 'cms_photo', label: 'Choose Image *', type: 'file', required: true },
            {
                id: 'cms_category',
                label: 'Category *',
                type: 'select',
                options: ['Sports', 'Events', 'Functions', 'Awards', 'Others'],
                required: true,
            },
            { id: 'cms_caption', label: 'Caption (optional)', type: 'text' },
        ],
        save: async (data) => {
            await db
                .collection('gallery')
                .add(withSchool({ url: data.cms_photo, category: data.cms_category, caption: data.cms_caption }));
            loadCmsList('gallery', 'galleryListAdmin', renderGalleryItem);
        },
    },
    staff: {
        title: 'Add Staff / Teacher',
        fields: [
            { id: 'cms_name', label: 'Full Name *', type: 'text', required: true },
            { id: 'cms_subject', label: 'Subject / Designation', type: 'text' },
            { id: 'cms_photo', label: 'Choose Photo (optional)', type: 'file' },
        ],
        save: async (data) => {
            await db
                .collection('staff')
                .add(withSchool({ name: data.cms_name, subject: data.cms_subject, photo: data.cms_photo }));
            loadCmsList('staff', 'staffListAdmin', renderStaffItem);
        },
    },
};

function openCmsModal(type) {
    const config = MODAL_CONFIGS[type];
    if (!config) return;
    document.getElementById('cmsModalTitle').textContent = config.title;
    let html = '';
    config.fields.forEach((f) => {
        html += `<div class="form-group" style="margin-bottom:1rem;">
            <label style="font-weight:600; display:block; margin-bottom:0.4rem;">${f.label}</label>`;

        if (f.type === 'textarea') {
            html += `<textarea id="${f.id}" ${f.required ? 'required' : ''} rows="3" style="width:100%; padding:0.6rem; border:1px solid var(--border); border-radius:0.5rem;"></textarea>`;
        } else if (f.type === 'select') {
            html += `<select id="${f.id}" ${f.required ? 'required' : ''} style="width:100%; padding:0.6rem; border:1px solid var(--border); border-radius:0.5rem; background:white;">`;
            f.options.forEach((opt) => (html += `<option value="${opt}">${opt}</option>`));
            html += `</select>`;
        } else if (f.type === 'file') {
            html += `
                <input type="file" id="${f.id}" accept="image/*" style="width:100%; padding:0.6rem; border:1px solid var(--border); border-radius:0.5rem;" onchange="previewCmsImage(event, '${f.id}_preview')">
                <div id="${f.id}_preview" style="margin-top:1rem; display:none;">
                    <img src="" style="width:100%; max-height:200px; object-fit:contain; border-radius:0.5rem; border:1px solid var(--border);">
                </div>`;
        } else {
            html += `<input type="${f.type}" id="${f.id}" ${f.required ? 'required' : ''} placeholder="${f.placeholder || ''}" style="width:100%; padding:0.6rem; border:1px solid var(--border); border-radius:0.5rem;">`;
        }

        html += `</div>`;
    });
    html += `<div id="cmsModalLoading" style="display:none; text-align:center; padding:1rem; color:var(--primary);"><i class="fas fa-spinner fa-spin"></i> Processing Image...</div>`;
    html += `<button class="btn-portal btn-primary" id="cmsSaveBtn" onclick="saveCmsModal('${type}')" style="width:100%;"><i class="fas fa-plus"></i> Add</button>`;
    document.getElementById('cmsModalBody').innerHTML = html;
    document.getElementById('cmsModal').style.display = 'block';
}

function closeCmsModal() {
    document.getElementById('cmsModal').style.display = 'none';
}

// Helper to set previews during load
function setMiniPreview(containerId, url) {
    const container = document.getElementById(containerId);
    if (container && url) {
        container.innerHTML = `<img src="${url}" style="width:100%; border-radius:0.5rem; margin-top:0.5rem; border:1px solid #ddd;">`;
        container.style.display = 'block';
    } else if (container) {
        container.innerHTML = '';
        container.style.display = 'none';
    }
}

function previewCmsImage(event, previewId) {
    const file = event.target.files[0];
    const previewContainer = document.getElementById(previewId);
    if (!file || !previewContainer) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        previewContainer.innerHTML = `<img src="${e.target.result}" style="width:100%; border-radius:0.5rem; margin-top:0.5rem; border:1px solid #ddd;">`;
        previewContainer.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

async function saveCmsModal(type) {
    const config = MODAL_CONFIGS[type];
    const data = {};
    const saveBtn = document.getElementById('cmsSaveBtn');
    const loading = document.getElementById('cmsModalLoading');

    for (const f of config.fields) {
        const el = document.getElementById(f.id);

        if (f.type === 'file') {
            const file = el.files[0];
            if (f.required && !file) {
                showToast('Please select an image!', 'error');
                return;
            }
            if (file) {
                if (saveBtn) saveBtn.disabled = true;
                if (loading) loading.classList.remove('hidden');

                try {
                    data[f.id] = await processCmsImage(file);
                } catch (e) {
                    showToast('Error processing image: ' + e.message, 'error');
                    if (saveBtn) saveBtn.disabled = false;
                    if (loading) loading.classList.add('hidden');
                    return;
                }
            } else {
                data[f.id] = '';
            }
        } else {
            if (f.required && !el.value.trim()) {
                showToast('Please fill required fields!', 'error');
                return;
            }
            data[f.id] = el.value.trim();
        }
    }

    try {
        await config.save(data);
        closeCmsModal();
        showToast('Added successfully!');
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    } finally {
        if (saveBtn) saveBtn.disabled = false;
        if (loading) loading.classList.add('hidden');
    }
}

async function processCmsImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1000;
                const MAX_HEIGHT = 1000;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Compress to stay under 900KB. 0.7 quality usually does the trick for 1000px.
                const dataUrl = canvas.toDataURL('image/jpeg', 0.75);

                // Check size (base64 is ~1.37x file size)
                const approximateSizeInBytes = dataUrl.length * (3 / 4);
                if (approximateSizeInBytes > 900 * 1024) {
                    reject(new Error('Image is too large even after compression. Please use a smaller image.'));
                } else {
                    resolve(dataUrl);
                }
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ===================== ADMISSION STATUS =====================
async function loadAdmissionStatus() {
    try {
        const doc = await schoolDoc('settings', 'general').get();
        const status = doc.exists ? doc.data().admissionStatus || 'open' : 'open';
        const session = doc.exists ? doc.data().admissionSession || '2026-2027' : '2026-2027';
        updateAdmissionBadge(status);
        document.getElementById('admissionSessionYear').value = session;
    } catch (e) {
        console.error(e);
    }
}

function updateAdmissionBadge(status) {
    const badge = document.getElementById('admissionStatusBadge');
    const text = document.getElementById('admissionStatusText');
    if (status === 'open') {
        badge.style.background = '#10b981';
        badge.textContent = 'OPEN';
        text.textContent = 'Admissions are OPEN';
    } else {
        badge.style.background = '#ef4444';
        badge.textContent = 'CLOSED';
        text.textContent = 'Admissions are CLOSED';
    }
}

async function setAdmissionStatus(status) {
    try {
        await schoolDoc('settings', 'general').set(withSchool({ admissionStatus: status }), { merge: true });
        updateAdmissionBadge(status);
        showToast(`Admission status set to ${status.toUpperCase()}!`);
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

async function saveAdmissionSession() {
    const val = document.getElementById('admissionSessionYear').value.trim();
    if (!val) return;
    try {
        await schoolDoc('settings', 'general').set(withSchool({ admissionSession: val }), { merge: true });
        showToast('Session year saved!');
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

// ===================== TIMETABLES =====================
const CLASSES = [
    'Play Group',
    'Nursery',
    'LKG',
    'UKG',
    'Class 1',
    'Class 2',
    'Class 3',
    'Class 4',
    'Class 5',
    'Class 6',
    'Class 7',
    'Class 8',
];

async function loadTimetableSection() {
    const grid = document.getElementById('timetableGrid');
    grid.innerHTML = '';
    for (const cls of CLASSES) {
        const safeId = cls.replace(/\s+/g, '_').toLowerCase();
        const docRef = await schoolDoc('timetables', safeId).get();
        const exists = docRef.exists;
        grid.innerHTML += `
            <div style="background:#f8fafc; border:1px solid var(--border); border-radius:0.75rem; padding:1rem; text-align:center;">
                <p style="font-weight:700; margin-bottom:0.75rem;">${cls}</p>
                <span class="badge ${exists ? 'badge-success' : 'badge-danger'}" style="margin-bottom:0.75rem; display:block;">${exists ? '✅ Uploaded' : '❌ Missing'}</span>
                <input type="file" id="tt_${safeId}" accept="application/pdf" style="display:none;" onchange="uploadTimetable(event,'${safeId}')">
                <div style="display:flex; flex-direction:column; gap:0.5rem;">
                    <button class="btn-portal btn-ghost" style="font-size:0.8rem;" onclick="document.getElementById('tt_${safeId}').click()"><i class="fas fa-upload"></i> Upload</button>
                    ${exists ? `<button class="btn-portal btn-ghost" style="font-size:0.8rem; color:#ef4444;" onclick="deleteTimetable('${safeId}','${cls}')"><i class="fas fa-trash"></i> Remove</button>` : ''}
                </div>
            </div>`;
    }
}

async function uploadTimetable(event, classId) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 900 * 1024) {
        showToast('File too large! Max 900KB.', 'error');
        return;
    }
    setLoading(true);
    try {
        const base64 = await new Promise((r) => {
            const reader = new FileReader();
            reader.onload = (e) => r(e.target.result);
            reader.readAsDataURL(file);
        });
        await schoolDoc('timetables', classId).set(withSchool({ fileData: base64 }));
        showToast('Timetable uploaded!');
        loadTimetableSection();
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    } finally {
        setLoading(false);
    }
}

async function deleteTimetable(classId, className) {
    if (!confirm(`Delete timetable for ${className}?`)) return;
    await schoolDoc('timetables', classId).delete();
    showToast('Timetable deleted!');
    loadTimetableSection();
}

// ===================== FEE STRUCTURE =====================
async function loadFeeStructure() {
    const container = document.getElementById('feesTableAdmin');
    let feeData = {};
    try {
        const doc = await schoolDoc('settings', 'fees').get();
        if (doc.exists) feeData = doc.data();
    } catch (e) {}

    let html = '<div style="display:grid; gap:0.75rem;">';
    for (const cls of CLASSES) {
        const safeId = cls.replace(/\s+/g, '_').toLowerCase();
        html += `<div style="display:grid; grid-template-columns:180px 1fr 1fr; gap:1rem; align-items:center; padding:0.75rem; background:#f8fafc; border-radius:0.5rem;">
            <span style="font-weight:700;">${cls}</span>
            <input type="number" id="fee_monthly_${safeId}" placeholder="Monthly Fee (₹)" value="${feeData[safeId + '_monthly'] || ''}" style="padding:0.5rem; border:1px solid var(--border); border-radius:0.5rem;">
            <input type="number" id="fee_annual_${safeId}" placeholder="Annual Fee (₹)" value="${feeData[safeId + '_annual'] || ''}" style="padding:0.5rem; border:1px solid var(--border); border-radius:0.5rem;">
        </div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

async function saveFeeStructure() {
    setLoading(true);
    try {
        const data = {};
        for (const cls of CLASSES) {
            const safeId = cls.replace(/\s+/g, '_').toLowerCase();
            data[safeId + '_monthly'] = parseInt(document.getElementById(`fee_monthly_${safeId}`)?.value) || 0;
            data[safeId + '_annual'] = parseInt(document.getElementById(`fee_annual_${safeId}`)?.value) || 0;
        }
        await schoolDoc('settings', 'fees').set(withSchool(data));
        showToast('Fee structure saved!');
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    } finally {
        setLoading(false);
    }
}

// ===================== HERO SLIDER =====================
async function loadHeroSlider() {
    try {
        const doc = await schoolDoc('settings', 'general').get();
        if (doc.exists) {
            const d = doc.data();
            document.getElementById('hero_1').value = d.hero_1 || '';
            document.getElementById('hero_2').value = d.hero_2 || '';
            document.getElementById('hero_3').value = d.hero_3 || '';
            document.getElementById('hero_4').value = d.hero_4 || '';
        }
    } catch (e) {
        console.error(e);
    }
}

// ===================== LEGACY FEE TOOLS REMOVED (Migrated to js/fee-dues-tool.js) =====================
