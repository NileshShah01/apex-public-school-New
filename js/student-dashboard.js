// Student Dashboard Logic - Premium Version
const GITHUB_BASE = 'https://nileshshah01.github.io/Apex-public-school-test-01';
let currentStudentID = null;
let currentStudentClass = null;
let currentStudentData = null;
let isVisitor = false;

document.addEventListener('DOMContentLoaded', () => {
    // Apply Tenant Branding First
    applyStudentBranding();

    const session = localStorage.getItem('student_session');
    if (!session) {
        const slug = getURLSlug();
        window.location.href = slug ? `/${slug}/Student-Login` : '/portal/student-login.html';
        return;
    }

    const sessionData = JSON.parse(session);
    
    // SECURITY: Tenant Validation
    // Ensure the student belongs to the current school portal context
    if (sessionData.schoolId && window.CURRENT_SCHOOL_ID && sessionData.schoolId !== window.CURRENT_SCHOOL_ID) {
        console.warn(`Tenant Mismatch: Student belongs to ${sessionData.schoolId}, but is on ${window.CURRENT_SCHOOL_ID} portal.`);
        alert("Session mismatch. Please login to this school's portal.");
        localStorage.removeItem('student_session');
        const slug = getURLSlug();
        window.location.href = slug ? `/${slug}/Student-Login` : '/portal/student-login.html';
        return;
    }

    currentStudentID = sessionData.student_phone || sessionData.student_id;
    isVisitor = sessionData.role === 'visitor';

    if (!currentStudentID && !isVisitor) {
        const slug = getURLSlug();
        window.location.href = slug ? `/${slug}/Student-Login` : '/portal/student-login.html';
        return;
    }

    // Initialize UI
    fetchStudentData();
    fetchNotices();
    loadDashboardConfig();

    // Handle Hash-based Routing
    window.addEventListener('hashchange', handleRouting);
    handleRouting();

    // Event Listeners
    document.getElementById('academicYear')?.addEventListener('change', updateAcademicData);
});

/**
 * Apply dynamic branding based on school record
 */
async function applyStudentBranding() {
    try {
        const schoolDocSnap = await schoolRef().get();
        if (!schoolDocSnap.exists) return;

        const data = schoolDocSnap.data();
        const name = data.schoolName || 'Apex Public School';
        const logo = data.logo || '../images/ApexPublicSchoolLogo.png';

        // Update Title
        if (document.getElementById('studentPortalTitle')) {
            document.getElementById('studentPortalTitle').innerText = `${name} | Student Portal`;
        }

        // Sidebar Branding
        if (document.getElementById('sidebarBrandName')) {
            document.getElementById('sidebarBrandName').innerText = name;
        }
        if (document.getElementById('sidebarLogoImg')) {
            document.getElementById('sidebarLogoImg').src = logo;
            document.getElementById('sidebarLogoImg').style.display = 'block';
        }

        // Mobile Brand
        if (document.getElementById('mobileBrandName')) {
            document.getElementById('mobileBrandName').innerText = name;
        }

        // Notice Tag
        if (document.getElementById('noticeTagText')) {
            document.getElementById('noticeTagText').innerText = `${name} Notice`;
        }

        // Footer & Loading
        if (document.getElementById('portalFooterText')) {
            document.getElementById('portalFooterText').innerText = `© ${new Date().getFullYear()} ${name}. Powered by Nexorasoftagency.`;
        }
        if (document.getElementById('loadingPortalText')) {
            document.getElementById('loadingPortalText').innerText = `Syncing with ${name} Registry...`;
        }

        // Favicon
        let favicon = document.querySelector('link[rel="icon"]');
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
        }
        favicon.href = logo;

    } catch (e) {
        console.error('Branding failed:', e);
    }
}

// ===================== ROUTING & NAVIGATION =====================
function handleRouting() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    showPortalSection(hash, false);
}

function showPortalSection(sectionId, updateHash = true) {
    if (updateHash) window.location.hash = sectionId;

    // Hide all sections
    document.querySelectorAll('.portal-section').forEach((s) => (s.style.display = 'none'));

    // Show target
    const target = document.getElementById(sectionId + 'Section');
    if (target) {
        target.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Update Sidebar Links
    document.querySelectorAll('.sidebar .nav-link').forEach((l) => {
        l.classList.remove('active');
        if (l.getAttribute('href') === `#${sectionId}`) {
            l.classList.add('active');
        }
    });

    // Load section specific data if needed
    if (sectionId === 'homework') fetchHomework();
    if (sectionId === 'fees') fetchDuesAndReceipts();
    if (sectionId === 'attendance') fetchAttendance();
    if (sectionId === 'transport') fetchTransport();
    if (sectionId === 'library') fetchLibrary();
    if (sectionId === 'materials') loadExamMaterials();
    if (sectionId === 'results' || sectionId === 'exams') fetchUnifiedReports();

    // Visitor Access Logic
    if (isVisitor) {
        const privateSections = ['homework', 'attendance', 'profile', 'fees', 'exams', 'results', 'library', 'transport'];
        if (privateSections.includes(sectionId)) {
            const sectionEl = document.getElementById(sectionId + 'Section');
            if (sectionEl) {
                sectionEl.innerHTML = `
                    <div class="card p-4 text-center">
                        <i class="fas fa-lock text-4xl mb-1 opacity-20"></i>
                        <h2 class="text-2xl mb-1">Authenticated Access Required</h2>
                        <p class="text-muted mb-2">Detailed ${sectionId} records are only available for registered students.</p>
                        <hr class="mb-2 opacity-10">
                        <div class="flex gap-1 justify-center">
                            <a href="/portal/student-login.html${getURLSlug() ? '?s=' + getURLSlug() : ''}" class="btn-portal primary">Student Login</a>
                            <a href="/admissions.html" class="btn-portal">Apply for Admission</a>
                        </div>
                    </div>
                `;
            }
        }
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active');
}

// ===================== DATA FETCHING =====================

async function loadDashboardConfig() {
    try {
        const doc = await schoolDoc('settings', 'studentPortal').get();
        if (!doc.exists) return; // Use default visibility
        const d = doc.data();

        // 1. Exam Banner
        const banner = document.getElementById('examAnnouncementBanner');
        if (d.examHeading && banner) {
            document.getElementById('examAnnouncementTitle').textContent = d.examHeading;
            document.getElementById('examAnnouncementNotice').textContent = d.examNotice || '';
            banner.style.display = 'block';
        } else if (banner) {
            banner.style.display = 'none';
        }

        // 2. Sidebar Visibility Controls
        const moduleMap = {
            homework: d.showHomework,
            fees: d.showFees,
            exams: d.showExams,
            materials: d.showMaterials,
        };

        Object.entries(moduleMap).forEach(([m, show]) => {
            const link = document.querySelector(`.nav-link[href="#${m}"]`);
            if (link) {
                link.style.display = show !== false ? 'flex' : 'none';
            }
        });

        // 3. Home Dash Widgets
        const attWidget = document.getElementById('attendanceWidget');
        if (attWidget) {
            if (d.showAttendance) {
                attWidget.style.display = 'block';
                fetchAttendance();
            } else {
                attWidget.style.display = 'none';
            }
        }

        const priWidget = document.getElementById('principalMessageWidget');
        if (priWidget) {
            if (d.showPrincipalMessage && d.principalMessage) {
                priWidget.style.display = 'block';
                document.getElementById('principalMessageText').textContent = d.principalMessage;
            } else {
                priWidget.style.display = 'none';
            }
        }

        const linksWidget = document.getElementById('importantLinksWidget');
        const list = document.getElementById('linksList');
        if (linksWidget && list) {
            if (d.importantLinks && d.importantLinks.length > 0) {
                linksWidget.style.display = 'block';
                list.innerHTML = d.importantLinks
                    .map(
                        (l) => `
                    <a href="${l.url}" target="_blank" class="nav-link" style="padding: 0.5rem; justify-content: flex-start; color: var(--primary);">
                        <i class="fas fa-external-link-square-alt"></i> ${l.title}
                    </a>
                `
                    )
                    .join('');
            } else {
                linksWidget.style.display = 'none';
            }
        }
    } catch (e) {
        console.warn('Student portal config load failed:', e.message);
    }
}

async function fetchStudentData() {
    setLoading(true);
    try {
        if (isVisitor) {
            displayGuestProfile();
            return;
        }
        const sessionData = JSON.parse(localStorage.getItem('student_session'));
        const CACHE_KEY = `student_profile_${sessionData.student_phone || sessionData.student_id}`;

        let doc = null;
        if (sessionData.student_phone) {
            const snap = await schoolData('students').where('phone', '==', sessionData.student_phone).get();
            if (!snap.empty) {
                doc =
                    snap.docs.find(
                        (d) => d.data().name.trim().toLowerCase() === sessionData.name.trim().toLowerCase()
                    ) || snap.docs[0];
                currentStudentID = doc.id;
            }
        }

        if (!doc && currentStudentID) {
            const fallbackDoc = await schoolDoc('students', currentStudentID).get();
            if (fallbackDoc.exists) doc = fallbackDoc;
        }

        if (doc) {
            currentStudentData = doc.data();
            displayStudentProfile(currentStudentData);
            // Fetch initial fee status for home dashboard
            fetchHomeDues();
        } else {
            alert('Record not found.');
            logoutStudent();
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        setLoading(false);
    }
}

function displayStudentProfile(data) {
    // Top Profile Card
    document.getElementById('disp_student_name').textContent = data.name;
    document.getElementById('disp_student_id').textContent = data.studentId || data.admNo || 'N/A';
    currentStudentClass = data.class || '';
    document.getElementById('disp_class').textContent = `Class ${currentStudentClass}`;
    document.getElementById('disp_section').textContent = data.section || 'N/A';

    // Sidebar & Mobile Profile
    document.getElementById('sidebarStudentName').textContent = data.name;
    document.getElementById('sidebarStudentClass').textContent =
        `Class ${currentStudentClass} - ${data.section || 'N/A'}`;

    // Personal Info Section
    document.getElementById('p_name').textContent = data.name;
    document.getElementById('p_dob').textContent = data.dob || data.dateOfBirth || 'N/A';
    document.getElementById('p_father').textContent = data.fatherName || 'N/A';
    document.getElementById('p_mother').textContent = data.motherName || 'N/A';
    document.getElementById('p_adm').textContent = data.studentId || data.admNo || 'N/A';
    document.getElementById('p_phone').textContent = data.phone || 'N/A';
    document.getElementById('p_address').textContent = data.address || 'N/A';

    // Photo handling
    const photoUrl = data.photo_url || `${GITHUB_BASE}/images/students/${data.studentId || data.admNo}.jpg`;
    updateStudentPhoto(photoUrl);

    // Dynamic Section Visibility (if not already handled by loadDashboardConfig)
    updateResultLink();
}

function applyVisitorSidebarFilter() {
    const navLinks = document.querySelectorAll('.nav-link');
    const allowedHashes = ['#dashboard', '#materials', '#inquiry', '#support'];

    navLinks.forEach((link) => {
        const hash = link.getAttribute('href');
        if (hash && hash.startsWith('#') && !allowedHashes.includes(hash)) {
            link.style.opacity = '0.4';
            link.classList.add('pointer-events-none');
            // link.classList.add('locked-item'); // Could add a lock icon via CSS if desired
            const span = link.querySelector('span');
            if (span && !span.innerHTML.includes('<i class="fas fa-lock ml-0-5"></i>')) {
                span.innerHTML += ' <i class="fas fa-lock ml-0-25 text-xs"></i>';
            }
        }
    });

    // Update Logout Button
    const logoutBtn = document.querySelector('button[onclick="logoutStudent()"]');
    if (logoutBtn) {
        const span = logoutBtn.querySelector('span');
        if (span) span.textContent = 'Exit Visitor Mode';
        logoutBtn.classList.remove('text-red-300');
        logoutBtn.classList.add('text-secondary');
    }
}

function displayGuestProfile() {
    // Top Profile Card
    document.getElementById('disp_student_name').textContent = 'Guest Visitor';
    document.getElementById('disp_student_id').textContent = 'VISITOR-GUEST';
    document.getElementById('disp_class').textContent = 'Prospective Student';
    document.getElementById('disp_section').textContent = 'GUEST';

    // Sidebar & Mobile Profile
    document.getElementById('sidebarStudentName').textContent = 'Guest Visitor';
    document.getElementById('sidebarStudentClass').textContent = 'Visitor Mode';

    // Personal Info Section
    document.getElementById('p_name').textContent = 'Guest Visitor';
    document.getElementById('p_dob').textContent = 'N/A';
    document.getElementById('p_father').textContent = 'N/A';
    document.getElementById('p_mother').textContent = 'N/A';
    document.getElementById('p_adm').textContent = 'GUEST-001';
    document.getElementById('p_phone').textContent = 'N/A';
    document.getElementById('p_address').textContent = 'Anonymous Access';

    // Photo handling
    const placeholderUrl = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
    updateStudentPhoto(placeholderUrl);

    // Disable fee balance on home
    const feeBal = document.getElementById('homeFeeBalance');
    if (feeBal) feeBal.textContent = '₹ --';
}

function updateStudentPhoto(url) {
    const divs = ['sidebarStudentPhoto', 'mobileStudentPhoto', 'studentPhotoCard', 'profilePhotoLarge'];
    const img = new Image();
    img.onload = () => {
        divs.forEach((did) => {
            const el = document.getElementById(did);
            if (el) el.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover;">`;
        });
    };
    img.onerror = () => {
        /* Keep placeholders */
    };
    img.src = url;
}

// ===================== HOMEWORK MODULE =====================
async function fetchHomework() {
    const grid = document.getElementById('homeworkGrid');
    const empty = document.getElementById('noHomeworkMsg');
    if (!grid || !currentStudentClass) return;

    // Premium Skeleton Loading
    grid.innerHTML = `
        <div class="skeleton-card" style="height: 180px; border-radius: 1rem;"></div>
        <div class="skeleton-card" style="height: 180px; border-radius: 1rem;"></div>
        <div class="skeleton-card" style="height: 180px; border-radius: 1rem;"></div>
    `;

    try {
        const currentStudentSection = currentStudentData?.section || 'A';
        const snap = await schoolData('homework')
            .where('class', '==', currentStudentClass)
            .where('section', 'in', ['All', currentStudentSection])
            .orderBy('date', 'desc')
            .limit(10)
            .get();

        if (snap.empty) {
            grid.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        grid.innerHTML = '';
        snap.forEach((doc) => {
            const d = doc.data();
            const dateStr = d.date ? new Date(d.date.seconds * 1000).toLocaleDateString() : 'N/A';
            const card = `
                <div class="card hover-translate transition-all-500" style="padding: 1.5rem; position: relative; overflow: hidden; border: 1px solid var(--glass-border); background: var(--glass-bg); backdrop-filter: blur(8px);">
                    <span class="badge" style="position: absolute; top: 1rem; right: 1rem; background: var(--primary); color: white;">${d.subject}</span>
                    <h4 style="margin-bottom: 0.5rem; color: var(--secondary); font-weight: 700;">${d.title}</h4>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;"><i class="far fa-calendar-alt mr-0-25"></i> Published: ${dateStr}</p>
                    <div style="font-size: 0.9rem; line-height: 1.5; color: var(--text-main); margin-bottom: 1.5rem; opacity: 0.8;">${d.content || d.description}</div>
                    ${d.attachment ? `<a href="${d.attachment}" target="_blank" class="btn-portal btn-ghost" style="width: 100%; justify-content: center; border-radius: 0.5rem;"><i class="fas fa-paperclip"></i> View Attachment</a>` : ''}
                </div>
            `;
            grid.innerHTML += card;
        });

        // Update Home Preview
        const preview = document.getElementById('homeHomeworkPreview');
        if (preview) {
            const latest = snap.docs[0].data();
            preview.innerHTML = `
                <div style="background: var(--bg-gray); padding: 1rem; border-radius: 0.75rem;">
                    <div style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.5rem;">
                        <span class="badge" style="background: var(--primary); color: white;">${latest.subject}</span>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(latest.date.seconds * 1000).toLocaleDateString()}</span>
                    </div>
                    <h4 style="font-size: 0.9rem; margin-bottom: 0.25rem;">${latest.title}</h4>
                    <p style="font-size: 0.8rem; color: var(--text-muted);">${(latest.content || latest.description).substring(0, 60)}...</p>
                </div>
            `;
        }
    } catch (e) {
        console.error('Homework error:', e);
        grid.innerHTML =
            '<p style="grid-column: 1/-1; text-align:center; color: var(--danger);">Failed to load homework.</p>';
    }
}

// ===================== FEES MODULE =====================
async function fetchHomeDues() {
    if (!currentStudentID) return;
    try {
        const ledger = await schoolDoc('studentFeeLedger', currentStudentID).get();
        if (ledger.exists) {
            const data = ledger.data();
            const balance = data.totalBalance || 0;
            document.getElementById('homeFeeBalance').textContent = `₹${balance.toLocaleString()}`;

            // Basic logic for next due - usually monthly
            const months = [
                'January',
                'February',
                'March',
                'April',
                'May',
                'June',
                'July',
                'August',
                'September',
                'October',
                'November',
                'December',
            ];
            const currentMonth = months[new Date().getMonth()];
            document.getElementById('homeNextDue').textContent = `${currentMonth} 10th`;
        }
    } catch (e) {
        /* silent */
    }
}

async function fetchDuesAndReceipts() {
    const paymentsTable = document.getElementById('studentPaymentsTable');
    const ledgerTable = document.getElementById('studentLedgerTable');
    if (!paymentsTable || !currentStudentID) return;

    paymentsTable.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading receipts...</td></tr>';
    ledgerTable.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading ledger...</td></tr>';

    try {
        // 1. Fetch Ledger
        const ledgerSnap = await schoolDoc('studentFeeLedger', currentStudentID).get();
        if (ledgerSnap.exists) {
            const l = ledgerSnap.data();
            document.getElementById('feeTotalPayable').textContent = `₹${(l.totalExpected || 0).toLocaleString()}`;
            document.getElementById('feeTotalPaid').textContent = `₹${(l.totalPaid || 0).toLocaleString()}`;
            document.getElementById('feeTotalBalance').textContent = `₹${(l.totalBalance || 0).toLocaleString()}`;

            ledgerTable.innerHTML = '';
            const fees = l.fees || {};
            // Sort months logically (Academic start April)
            const sortedMonths = [
                'April',
                'May',
                'June',
                'July',
                'August',
                'September',
                'October',
                'November',
                'December',
                'January',
                'February',
                'March',
            ];

            sortedMonths.forEach((m) => {
                if (fees[m]) {
                    const f = fees[m];
                    const balance = f.expected - f.paid;
                    const status =
                        balance <= 0
                            ? '<span class="badge" style="background:#dcfce7; color:#166534;">PAID</span>'
                            : '<span class="badge" style="background:#fef2f2; color:#be123c;">PENDING</span>';
                    ledgerTable.innerHTML += `
                        <tr>
                            <td>${m}</td>
                            <td style="font-size: 0.75rem; color: var(--text-muted);">${f.particulars || 'Monthly Fee'}</td>
                            <td>₹${f.expected}</td>
                            <td>₹${f.paid}</td>
                            <td style="font-weight:700;">₹${balance}</td>
                            <td>${status}</td>
                        </tr>
                    `;
                }
            });
        }

        // 2. Fetch Payments (Receipts)
        const paySnap = await schoolData('feePayments')
            .where('studentId', '==', currentStudentID)
            .orderBy('paymentDate', 'desc')
            .get();

        if (paySnap.empty) {
            paymentsTable.innerHTML =
                '<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-muted);">No payment history found.</td></tr>';
        } else {
            paymentsTable.innerHTML = '';
            paySnap.forEach((doc) => {
                const p = doc.data();
                const d = p.paymentDate ? new Date(p.paymentDate.seconds * 1000).toLocaleDateString() : 'N/A';
                paymentsTable.innerHTML += `
                    <tr>
                        <td style="font-weight:700; color: var(--primary);">${p.receiptNo}</td>
                        <td>${d}</td>
                        <td style="text-transform: capitalize;">${p.paymentMode}</td>
                        <td style="font-weight:700;">₹${p.amountPaid.toLocaleString()}</td>
                        <td style="text-align: right;">
                            <button onclick="printStudentReceipt('${doc.id}')" class="btn-portal btn-ghost" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;">
                                <i class="fas fa-print"></i> Receipt
                            </button>
                        </td>
                    </tr>
                `;
            });
        }
    } catch (e) {
        console.error('Fee fetch error:', e);
    }
}

async function printStudentReceipt(paymentId) {
    setLoading(true);
    try {
        const payDoc = await schoolData('feePayments').doc(paymentId).get();
        if (!payDoc.exists) return;
        const p = payDoc.data();
        
        const schoolSnap = await schoolRef().get();
        const sc = schoolSnap.data() || {};
        
        const modal = document.getElementById('portalModal');
        const body = document.getElementById('modalBody');
        
        const receiptHtml = `
            <div class="premium-receipt">
                <div class="receipt-header">
                    <div class="receipt-logo">
                        <img src="${sc.logo || '../images/ApexPublicSchoolLogo.png'}" alt="Logo" onerror="this.src='../images/ApexPublicSchoolLogo.png'">
                        <div>
                            <h2 style="margin:0; color:var(--primary); font-size:1.4rem;">${sc.schoolName || 'Apex Public School'}</h2>
                            <p style="margin:0; font-size:0.75rem; color:var(--text-muted);">${sc.address || 'School Campus Address'}</p>
                        </div>
                    </div>
                    <div class="receipt-title-box">
                        <h1>FEE RECEIPT</h1>
                        <p style="margin:0; font-weight:700;">No: ${p.receiptNo}</p>
                    </div>
                </div>

                <div class="receipt-grid">
                    <div class="info-group">
                        <label>Student Name</label>
                        <p>${currentStudentData.name}</p>
                    </div>
                    <div class="info-group">
                        <label>Student ID / Admission No</label>
                        <p>${currentStudentData.studentId || currentStudentData.admNo}</p>
                    </div>
                    <div class="info-group">
                        <label>Class & Section</label>
                        <p>Class ${currentStudentClass} - ${currentStudentData.section || 'N/A'}</p>
                    </div>
                    <div class="info-group">
                        <label>Payment Date</label>
                        <p>${p.paymentDate ? new Date(p.paymentDate.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
                    </div>
                </div>

                <table class="receipt-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th style="text-align:right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>School Fee Payment (${p.paymentMode})</td>
                            <td style="text-align:right; font-weight:700;">₹${p.amountPaid.toLocaleString()}</td>
                        </tr>
                        <tr class="total-row">
                            <td>TOTAL AMOUNT PAID</td>
                            <td style="text-align:right;">₹${p.amountPaid.toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>

                <div style="margin-bottom: 2rem;">
                    <p style="font-size: 0.85rem; color: var(--text-muted);">Amount in Words: <b style="color:var(--secondary); text-transform:capitalize;">${numberToWords(p.amountPaid)} Rupees Only</b></p>
                </div>

                <div class="receipt-footer">
                    <div class="seal-area">SCHOOL SEAL</div>
                    <div class="signature-box">
                        <div class="signature-line">Authorized Signatory</div>
                    </div>
                </div>

                <div style="margin-top:2rem; font-size:0.65rem; color:#aaa; text-align:center;">
                    This is a computer generated receipt and does not require a physical signature.
                </div>
            </div>
        `;
        
        body.innerHTML = receiptHtml;
        modal.classList.remove('hidden');
    } catch (e) {
        console.error('Receipt preview failed:', e);
        alert('Failed to generate receipt preview.');
    } finally {
        setLoading(false);
    }
}

function closePortalModal() {
    document.getElementById('portalModal').classList.add('hidden');
}

function numberToWords(amount) {
    // Simple enough for 5 digits for now
    const words = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    
    if (amount === 0) return "Zero";
    
    if (amount < 20) return words[amount];
    
    if (amount < 100) return tens[Math.floor(amount / 10)] + (amount % 10 !== 0 ? " " + words[amount % 10] : "");
    
    if (amount < 1000) return words[Math.floor(amount / 100)] + " Hundred" + (amount % 100 !== 0 ? " and " + numberToWords(amount % 100) : "");
    
    if (amount < 100000) return numberToWords(Math.floor(amount / 1000)) + " Thousand" + (amount % 1000 !== 0 ? " " + numberToWords(amount % 1000) : "");
    
    return amount.toString(); // Fallback
}

// ===================== OTHER UPDATES =====================
function updateAcademicData() {
    updateResultLink();
    fetchDuesAndReceipts();
}

async function fetchAttendance() {
    if (!currentStudentID) return;
    const table = document.getElementById('studentAttendanceTable');
    if (!table) return;

    table.innerHTML = '<tr><td colspan="3" style="text-align:center;">Loading attendance records...</td></tr>';

    try {
        const snap = await schoolData('attendance')
            .where('studentId', '==', currentStudentID)
            .orderBy('date', 'desc')
            .get();

        if (snap.empty) {
            table.innerHTML =
                '<tr><td colspan="3" style="text-align:center; padding:2rem;">No attendance records found yet.</td></tr>';
            return;
        }

        let total = 0;
        let present = 0;
        let absent = 0;

        table.innerHTML = '';
        snap.forEach((doc) => {
            const d = doc.data();
            total++;
            if (d.status === 'present' || d.status === 'late') present++;
            if (d.status === 'absent') absent++;

            const statusClass =
                {
                    present: 'background:#dcfce7; color:#166534;',
                    absent: 'background:#fef2f2; color:#be123c;',
                    late: 'background:#fffbeb; color:#92400e;',
                    leave: 'background:#eff6ff; color:#1e40af;',
                }[d.status] || '';

            table.innerHTML += `
                <tr class="hover-translate transition-all">
                    <td style="font-weight:600; padding: 1rem 0.5rem;">${new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td><span class="badge" style="border-radius: 0.5rem; font-weight: 700; ${statusClass}">${d.status.toUpperCase()}</span></td>
                    <td style="font-size:0.8rem; color:var(--text-muted);">${d.remarks || '-'}</td>
                </tr>
            `;
        });

        // Update Stats
        const percent = Math.round((present / total) * 100) || 0;
        document.getElementById('att_presentDays').textContent = present;
        document.getElementById('att_absentDays').textContent = absent;
        document.getElementById('att_percentage').textContent = `${percent}%`;

        // Update Home Widget if exists
        const homePercent = document.getElementById('attendancePercent');
        const homeCircle = document.getElementById('attendanceCircle');
        const homeStatus = document.getElementById('attendanceStatusText');
        if (homePercent) homePercent.textContent = `${percent}%`;
        if (homeCircle) homeCircle.setAttribute('stroke-dasharray', `${percent}, 100`);
        if (homeStatus) homeStatus.textContent = `Regularity: ${percent}%`;
    } catch (e) {
        console.error('Attendance fetch error:', e);
        table.innerHTML =
            '<tr><td colspan="3" style="text-align:center; color:var(--danger);">Error loading attendance.</td></tr>';
    }
}

async function updateResultLink() {
    const year = document.getElementById('academicYear').value;
    const resultArea = document.getElementById('resultStatusArea');
    const admitArea = document.getElementById('admitCardStatusArea');
    const timetableArea = document.getElementById('timetableStatusArea');

    if (resultArea) resultArea.innerHTML = '<span class="badge">Checking...</span>';
    if (admitArea) admitArea.innerHTML = '<span class="badge">Checking...</span>';

    loadExamMaterials();

    // Check Result Card (Manual Upload or Generated)
    try {
        // Priority 1: Check for manual uploads in reports collection
        const manualSnap = await schoolData('reports')
            .where('studentId', '==', currentStudentID)
            .where('session', '==', year)
            .where('published', '==', true)
            .orderBy('uploadedAt', 'desc')
            .limit(1)
            .get();

        if (!manualSnap.empty) {
            const reportData = manualSnap.docs[0].data();
            resultArea.innerHTML = `<a href="${reportData.fileData}" download="${reportData.fileName || 'ReportCard.pdf'}" class="btn-portal btn-primary" style="width: 100%; justify-content: center;"><i class="fas fa-file-download"></i> Download Report</a>`;
        } else {
            // Priority 2: Check for generated report card (Legacy/Phase 5 auto-gen)
            const docRef = await schoolDoc('reports', `${currentStudentID}_${year}`).get();
            if (docRef.exists) {
                const pubSnap = await schoolData('publications')
                    .where('className', '==', currentStudentClass)
                    .where('published', '==', true)
                    .get();
                if (!pubSnap.empty) {
                    resultArea.innerHTML = `<a href="${docRef.data().fileData}" download class="btn-portal btn-primary" style="width: 100%; justify-content: center;"><i class="fas fa-download"></i> Result</a>`;
                } else {
                    resultArea.innerHTML = '<div style="font-size:0.8rem; color:#b45309;">Processing...</div>';
                }
            } else {
                resultArea.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted);">Not published</div>';
            }
        }
    } catch (e) {
        console.error("Result check error:", e);
        if (resultArea)
            resultArea.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted);">Not published</div>';
    }

    // Timetable
    if (timetableArea && currentStudentClass) {
        try {
            const classId = currentStudentClass.toLowerCase().replace(/\s+/g, '-');
            const docRef = await schoolDoc('timetables', classId).get();
            if (docRef.exists) {
                timetableArea.innerHTML = `<a href="${docRef.data().fileData}" download class="btn-portal" style="background:#0d9488; color:white; width:auto; justify-content:center;"><i class="fas fa-download"></i> View Timetable</a>`;
            } else {
                throw new Error('404');
            }
        } catch (e) {
            timetableArea.innerHTML =
                '<span style="font-size:0.8rem; color:var(--text-muted); padding: 0.5rem; display: block; background: var(--bg-gray); border-radius: 0.5rem;">Class timetable not uploaded yet.</span>';
        }
    }
}

/**
 * Unified logic to fetch both auto-generated and manual report cards
 */
async function fetchUnifiedReports() {
    const manualArea = document.getElementById('manualResultsArea');
    const examResultArea = document.getElementById('resultStatusArea');
    if (!manualArea && !examResultArea) return;

    const year = document.getElementById('academicYear').value;
    const skeleton = `
        <div class="skeleton-card" style="height: 60px; margin-bottom: 0.75rem; border-radius: 0.75rem;"></div>
        <div class="skeleton-card" style="height: 60px; margin-bottom: 0.75rem; border-radius: 0.75rem;"></div>
    `;

    if (manualArea) manualArea.innerHTML = skeleton;
    if (examResultArea) examResultArea.innerHTML = '<span class="text-xs opacity-50">Syncing...</span>';

    try {
        // 1. Fetch Manual Uploads
        const manualSnap = await schoolData('reports')
            .where('studentId', 'in', [currentStudentData.studentId || '', currentStudentData.admNo || '', currentStudentID])
            .where('published', '==', true)
            .get();

        // 2. Check Auto-Generated (Legacy format or specific term reports)
        const autoDoc = await schoolDoc('reports', `${currentStudentID}_${year}`).get();
        let pubStatus = false;
        if (autoDoc.exists) {
            const pubSnap = await schoolData('publications')
                .where('className', '==', currentStudentClass)
                .where('published', '==', true)
                .get();
            pubStatus = !pubSnap.empty;
        }

        // Logic for "Exams" Section (Latest Result)
        if (examResultArea) {
            if (pubStatus && autoDoc.exists) {
                examResultArea.innerHTML = `<a href="${autoDoc.data().fileData}" download="Report_${year}.pdf" class="btn-portal btn-primary w-full justify-center"><i class="fas fa-download"></i> Latest Result</a>`;
            } else if (!manualSnap.empty) {
                const latest = manualSnap.docs[0].data();
                examResultArea.innerHTML = `<a href="${latest.fileData}" download="${latest.title || 'Result'}.pdf" class="btn-portal btn-primary w-full justify-center"><i class="fas fa-download"></i> View Report</a>`;
            } else {
                examResultArea.innerHTML = '<div class="text-xs opacity-50 py-1">No active reports</div>';
            }
        }

        // Logic for "My Report Card" Section (List)
        if (manualArea) {
            let reportsHtml = '';

            // Add auto-gen if published
            if (pubStatus && autoDoc.exists) {
                reportsHtml += renderReportRow({
                    title: `Annual Report Card ${year}`,
                    session: year,
                    fileData: autoDoc.data().fileData,
                    uploadedAt: autoDoc.data().generatedAt || null,
                    type: 'System Generated'
                });
            }

            // Add manuals
            manualSnap.forEach(doc => {
                reportsHtml += renderReportRow({
                    ...doc.data(),
                    type: 'Official Upload'
                });
            });

            if (reportsHtml === '') {
                manualArea.innerHTML = `
                    <div class="flex-center p-4 text-muted border-radius-1 bg-secondary dashed">
                        <p class="m-0 italic">No published reports currently available.</p>
                    </div>
                `;
            } else {
                manualArea.innerHTML = reportsHtml;
            }
        }

    } catch (e) {
        console.error("Unified Report Fetch Error:", e);
        if (manualArea) manualArea.innerHTML = '<p class="text-xs text-danger">Failed to load reports archive.</p>';
    }
}

function renderReportRow(r) {
    const dateStr = r.uploadedAt ? (r.uploadedAt.toDate ? r.uploadedAt.toDate().toLocaleDateString() : new Date(r.uploadedAt).toLocaleDateString()) : 'Institutional Record';
    return `
        <div class="card flex-between p-1 border-left-primary bg-white shadow-sm hover-translate transition-all" style="margin-bottom: 0.75rem;">
            <div class="flex align-center gap-1">
                <div class="w-10 h-10 bg-blue-light text-primary flex-center border-radius-0-75 text-lg">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <div class="text-left">
                    <h4 class="m-0 secondary text-sm fw-700">${r.title || 'Academic Record'}</h4>
                    <p class="text-xs text-muted m-0">${r.type} | ${dateStr}</p>
                </div>
            </div>
            <button onclick="downloadReport('${r.fileData}', '${r.title || 'ReportCard'}')" class="btn-portal btn-white shadow-sm font-bold text-xs p-0-5-1">
                <i class="fas fa-download mr-0-5"></i>
            </button>
        </div>
    `;
}

async function loadExamMaterials() {
    const list = document.getElementById('paperDownloadList');
    const status = document.getElementById('examMaterialsStatusArea');
    
    // Determine search class
    let searchClass = currentStudentClass;
    if (isVisitor) searchClass = 'Sample'; // Default for visitors

    if (!list || (!searchClass && !isVisitor)) return;

    list.innerHTML = '<p class="text-center p-2">Looking for practice materials...</p>';
    try {
        const year = document.getElementById('academicYear').value;
        const sessionId = `${year - 1}_${year.toString().slice(-2)}`;
        
        let query = schoolData('questionPapers')
            .where('published', '==', true);

        if (searchClass) {
            query = query.where('class', '==', searchClass);
        }

        const snap = await query.orderBy('createdAt', 'desc').get();

        if (snap.empty) {
            list.innerHTML = '<p class="text-center text-muted p-2">No practice papers published yet.</p>';
            if (status) status.innerHTML = '<span class="badge">No papers yet</span>';
            return;
        }

        if (status)
            status.innerHTML = `<span class="badge" style="background:#dcfce7; color:#166534;">${snap.size} Materials Available</span>`;
        
        list.innerHTML = '';
        snap.forEach((doc) => {
            const d = doc.data();
            const card = document.createElement('div');
            card.className = 'card p-1-25 flex-col gap-0-75';
            card.style.background = 'rgba(255,255,255,0.05)';
            
            const url = d.fileUrl || '#';
            const isManual = d.paperType === 'manualUpload';

            card.innerHTML = `
                <div class="flex justify-between align-start">
                    <div>
                        <h4 class="mb-0-25 text-sm">${d.subject}</h4>
                        <p class="text-xs opacity-60">${d.examId || 'Practice Test'}</p>
                    </div>
                    <i class="fas fa-file-pdf text-xl" style="color:#ef4444;"></i>
                </div>
                <a href="${url}" target="_blank" class="btn-portal btn-ghost btn-sm" style="width: 100%; justify-content: center; margin-top: auto;">
                    <i class="fas fa-download"></i> Download PDF
                </a>
            `;
            list.appendChild(card);
        });
    } catch (e) {
        console.error('Materials load failed:', e);
        list.innerHTML = '<p class="text-center text-danger p-2">Error loading materials.</p>';
    }
}

async function fetchNotices() {
    const container = document.getElementById('noticesContainer');
    if (!container) return;
    try {
        const snap = await schoolData('notifications')
            .orderBy('sentAt', 'desc')
            .limit(10)
            .get();

        if (snap.empty) {
            container.innerHTML = '<div class="text-center py-3 opacity-05"><i class="fas fa-bell-slash text-2xl mb-1 block"></i><p class="text-sm">No recent notifications.</p></div>';
            return;
        }

        container.innerHTML = snap.docs.map(doc => {
            const d = doc.data();
            const date = d.sentAt ? new Date(d.sentAt.seconds * 1000).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : 'Just now';
            
            // Filter target (optional but good for privacy/relevance)
            // If class is specified and doesn't match current student, skip (unless target is 'All')
            if (d.target && d.target.class !== 'All' && d.target.class !== currentStudentClass) {
                return '';
            }

            return `
                <div class="notice-item p-1 border-bottom-soft">
                    <div class="flex justify-between align-start mb-0-25">
                        <h4 class="text-sm font-bold text-secondary">${d.type === 'WhatsApp' ? '<i class="fab fa-whatsapp text-success mr-0-5"></i>' : ''}${d.title || 'Notification'}</h4>
                        <span class="text-xs opacity-50 font-mono">${date}</span>
                    </div>
                    <p class="text-xs line-height-1-5 opacity-90">${d.message}</p>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Notice fetch failed:', error);
    }
}

async function fetchTransport() {
    const area = document.getElementById('transportInfoArea');
    if (!area || !currentStudentData) return;

    if (currentStudentData.is_transport_user === 'Yes') {
        area.innerHTML = `
            <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--secondary);">${currentStudentData.transport_route || 'Not Set'}</h2>
            <p style="font-size: 1.1rem; color: var(--primary); font-weight: 700;">Pickup Point: ${currentStudentData.transport_stop || 'Main Gate'}</p>
            <div style="margin-top: 1.5rem; padding: 1rem; background: var(--bg-gray); border-radius: 0.5rem; font-size: 0.85rem; color: var(--text-muted);">
                <i class="fas fa-info-circle"></i> Please be at the stop 5 minutes early.
            </div>
        `;
    } else {
        area.innerHTML = `
            <p style="color: var(--text-muted); margin-bottom: 1.5rem;">You are not registered for school transport.</p>
            <button class="btn-portal btn-ghost">Apply for Transport</button>
        `;
    }
}

async function fetchLibrary() {
    const table = document.getElementById('studentLibraryTable');
    if (!table || !currentStudentID) return;

    table.innerHTML = '<tr><td colspan="3" style="text-align:center;">Loading books...</td></tr>';

    try {
        const snap = await schoolData('library_transactions')
            .where('studentId', '==', currentStudentID)
            .where('status', '==', 'Issued')
            .get();

        if (snap.empty) {
            table.innerHTML =
                '<tr><td colspan="3" style="text-align:center; padding: 2rem;">No books currently issued.</td></tr>';
            return;
        }

        table.innerHTML = snap.docs
            .map((doc) => {
                const d = doc.data();
                const issueDate = d.issueDate ? new Date(d.issueDate.seconds * 1000).toLocaleDateString() : 'N/A';
                return `
                <tr>
                    <td style="font-weight:700;">${d.bookTitle}</td>
                    <td>${issueDate}</td>
                    <td style="color: var(--danger); font-weight: 600;">${d.expectedReturnDate || '-'}</td>
                </tr>
            `;
            })
            .join('');
    } catch (e) {
        console.error(e);
        table.innerHTML =
            '<tr><td colspan="3" style="text-align:center; color: var(--danger);">Error loading library data.</td></tr>';
    }
}

function setLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
}

function logoutStudent() {
    localStorage.removeItem('student_session');
    const slug = getURLSlug();
    window.location.href = slug ? `/${slug}/Student-Login` : '/portal/student-login.html';
}

window.showPortalSection = showPortalSection;
window.toggleSidebar = toggleSidebar;
window.logoutStudent = logoutStudent;
window.printStudentReceipt = printStudentReceipt;
window.closePortalModal = closePortalModal;

/**
 * Redundant - Handled by fetchUnifiedReports
 */
async function fetchManualReports() {
    return fetchUnifiedReports();
}

function downloadReport(base64, filename) {
    const link = document.createElement('a');
    link.href = base64;
    link.download = `${filename.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
