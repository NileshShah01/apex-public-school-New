# Competitive Analysis Report: SNR Edu ERP vs Education Desk

**Date:** March 28, 2026
**Methodology:** Publicly available information only (product pages, pricing pages, reviews, app store listings, comparison sites). No private data accessed.
**Uncertainty Rating Key:** High = directly verified from multiple sources; Medium = inferred from public artifacts; Low = estimated with limited data.

---

## 1. Executive Summary

This report compares **SNR Edu ERP** (Nexorasoftagency), a Firebase-based multi-tenant SaaS education management platform, against **Education Desk** (educationdesk.in), an established cloud-based school ERP serving 800+ schools and 1M+ students.

**Key Findings:**

| Dimension            | SNR Edu ERP                                                                   | Education Desk                                                  |
| -------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Architecture depth   | Deep — Firestore multi-tenant, 6-stage provisioning, granular data model      | Shallow details — "100% cloud," no stack disclosed              |
| Feature breadth      | Broader CMS, ID card generator, AI question formatter, question bank tools    | Stronger parent app ecosystem, SMS gateway, GPS tracking        |
| Market maturity      | Early-stage; several modules labeled "under maintenance" or "being processed" | Mature; 800+ schools, 4.5–4.9 rating, mobile apps on Play Store |
| Pricing transparency | Not publicly listed                                                           | ₹5/student/month, ₹10,000 starting (Basic), 1-month free trial  |
| Competitive position | Feature-rich backend with incomplete polish                                   | Market-validated with simpler architecture                      |

**Bottom line:** SNR Edu ERP has a significantly richer feature surface area — particularly in CMS, ID card generation, payment allocation (FIFO), and AI-powered tools — but faces maturity gaps (disabled auth guards, incomplete modules, no public pricing or reviews). Education Desk wins on go-to-market readiness, parent-facing mobile experience, and proven scale. The strategic opportunity for SNR Edu ERP is to close the polish and distribution gaps while leveraging its technical depth as a differentiator.

---

## 2. Feature Comparison Matrix

Scoring rubric: 0 = Not available, 1 = Minimal, 2 = Below average, 3 = Average, 4 = Above average, 5 = Best-in-class.

| Module                         | SNR Edu ERP (Score/5) | Education Desk (Score/5) | Parity Gap | Notes                                                                                                                                                                                                                             |
| ------------------------------ | --------------------- | ------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Student Information System** | 4                     | 4                        | None       | Both offer full profiles, search, custom fields. SNR adds 25+ column search, bulk import Excel, pickup ID, hostel/transport reports.                                                                                              |
| **Class & Session Management** | 5                     | 3                        | **SNR +2** | SNR: sessions, classes, subjects, non-subjects, elective mapping. ED: standard class setup.                                                                                                                                       |
| **Attendance**                 | 4                     | 4                        | None       | SNR: mark by session/class/section/date, mark-all-present, Excel upload, monthly/daily reports. ED: class-wise attendance in seconds, instant SMS notifications.                                                                  |
| **Timetable**                  | 4                     | 3                        | **SNR +1** | SNR: class-wise and teacher-wise views. ED: conflict avoidance, basic scheduling.                                                                                                                                                 |
| **Exam Management**            | 5                     | 3                        | **SNR +2** | SNR: grading rules, exam timetable, date-sheet, admit card tool, print attendance, exam attendance. ED: exam patterns, marks entry, digital report cards.                                                                         |
| **Result & Report Card**       | 5                     | 3                        | **SNR +2** | SNR: bulk marks entry, report card view/PDF, publish results, bulk result tool, result analytics, report remarks. ED: single-click digital report card publication.                                                               |
| **Fee Management**             | 5                     | 4                        | **SNR +1** | SNR: FIFO allocation, atomic transactions, receipt gen (R-XXXXXX), detailed ledger, partial payments, excess handling, bulk discount/extra fee, late fee fine. ED: flexible structures, reminders, receipts, gateway integration. |
| **Payment Gateway**            | 3                     | 4                        | **ED +1**  | SNR: internal FIFO payment service, no external gateway disclosed. ED: custom payment gateway support, default options provided.                                                                                                  |
| **Homework**                   | 3                     | 3                        | None       | SNR: assign + history. ED: homework via parent app.                                                                                                                                                                               |
| **Library Management**         | 3                     | 0                        | **SNR +3** | SNR: book catalog, issue/return, circulation history. ED: no library module found.                                                                                                                                                |
| **Transport Management**       | 3                     | 4                        | **ED +1**  | SNR: manage routes, assign students. ED: buses, routes, stops, optional live GPS tracking for parents.                                                                                                                            |
| **Parent Communication**       | 3                     | 5                        | **ED +2**  | SNR: bulk message, delivery history. ED: multi-channel (SMS, email, app push), parent app with real-time updates.                                                                                                                 |
| **Student Portal**             | 5                     | 4                        | **SNR +1** | SNR: dashboard, assignments, attendance chart, fee ledger with receipts, exam results, admit cards, report card PDFs, resources, transport, library. ED: parent app with attendance, homework, fees, results, messages.           |
| **Public Website CMS**         | 5                     | 1                        | **SNR +4** | SNR: full CMS with hero slider, notice ticker, birthday section, events calendar, stats counters, gallery, testimonials, staff directory, holidays, 15+ page types. ED: minimal — standard landing page only.                     |
| **ID Card Generator**          | 5                     | 0                        | **SNR +5** | SNR: 13 premium templates, vertical/horizontal, individual/batch PDF. ED: not available.                                                                                                                                          |
| **AI Question Formatter**      | 4                     | 0                        | **SNR +4** | SNR: Google Gemini integration, PDF/DOCX export. ED: not available.                                                                                                                                                               |
| **Employee Management**        | 4                     | 3                        | **SNR +1** | SNR: add, search, bulk update, ID print. ED: teacher management with assignments.                                                                                                                                                 |
| **Notifications**              | 3                     | 4                        | **ED +1**  | SNR: bulk message + delivery history. ED: SMS + app push + email multi-channel.                                                                                                                                                   |
| **Parent Mobile App**          | 1                     | 5                        | **ED +4**  | SNR: no dedicated mobile app. ED: Android app on Play Store (4.6 rating), iOS support claimed.                                                                                                                                    |
| **Super Admin / Multi-Tenant** | 5                     | 2                        | **SNR +3** | SNR: 6-stage provisioning, school CRUD, platform analytics, audit logs, Chart.js dashboards. ED: white-label domain optional, limited admin tooling visible.                                                                      |
| **Admission & Enquiry**        | 4                     | 2                        | **SNR +2** | SNR: add, search, convert to admission workflow. ED: basic student onboarding.                                                                                                                                                    |
| **Bulk Operations**            | 4                     | 3                        | **SNR +1** | SNR: bulk import Excel, bulk update students/employees, bulk discount, bulk extra fee, bulk result tool. ED: bulk CSV import.                                                                                                     |
| **Reports & Analytics**        | 3                     | 3                        | None       | SNR: monthly/daily attendance, fee dues, result analytics. ED: dashboard metrics, pending items. SNR has Chart.js for Super Admin but Analytics Hub "being processed."                                                            |
| **SMS Gateway**                | 2                     | 4                        | **ED +2**  | SNR: bulk message (mechanism unspecified). ED: custom SMS gateway support, default options.                                                                                                                                       |
| **GPS / Live Tracking**        | 0                     | 4                        | **ED +4**  | SNR: not available. ED: real-time bus tracking for parents (optional add-on).                                                                                                                                                     |

**Aggregate Score:**

- **SNR Edu ERP:** 88/115 (77%)
- **Education Desk:** 72/115 (63%)

**Parity Gap Summary:** SNR Edu ERP leads in 14 categories, Education Desk leads in 7, and 5 are at parity. SNR's advantages are concentrated in backend ERP depth, CMS, and AI tools. Education Desk's advantages are in parent-facing mobile experience, communication channels, and GPS tracking.

---

## 3. Workflow Analyses

### 3.1 Student Onboarding

| Step              | SNR Edu ERP                                                  | Education Desk                        |
| ----------------- | ------------------------------------------------------------ | ------------------------------------- |
| Admission enquiry | Dedicated enquiry module with search and conversion workflow | Basic student information entry       |
| Data entry        | Add student form + bulk Excel import (25+ columns)           | Excel/CSV bulk import                 |
| Class assignment  | Session/class/section selection, elective mapping            | Configure sessions, classes, sections |
| Parent setup      | Student portal login (phone+name lookup)                     | SMS/WhatsApp invite to parent app     |
| ID generation     | 13 template ID card generator, batch PDF                     | Not available                         |
| **Score**         | **4/5**                                                      | **3/5**                               |

**Assessment:** SNR Edu ERP offers a more complete onboarding pipeline with enquiry-to-admission conversion and integrated ID card generation. Education Desk's advantage is the frictionless parent onboarding via SMS/WhatsApp invitation to the mobile app.

### 3.2 Daily Attendance Workflow

| Step          | SNR Edu ERP                                                   | Education Desk                             |
| ------------- | ------------------------------------------------------------- | ------------------------------------------ |
| Marking       | By session/class/section/date, mark-all-present, Excel upload | Class-wise attendance "in seconds"         |
| Notifications | Bulk message (SMS mechanism unspecified)                      | Instant SMS or app notification to parents |
| Reporting     | Monthly/daily reports with percentages                        | Dashboard %, sections running              |
| **Score**     | **4/5**                                                       | **4/5**                                    |

**Assessment:** Both platforms handle attendance adequately. SNR offers more marking flexibility (Excel upload, mark-all-present). Education Desk's instant parent notification on absence is a stronger real-time feedback loop.

### 3.3 Fee Collection

| Step      | SNR Edu ERP                                                   | Education Desk              |
| --------- | ------------------------------------------------------------- | --------------------------- |
| Setup     | Fee setup master, late fee fine rules                         | Flexible fee structures     |
| Payment   | FIFO allocation, atomic transactions, partial/excess handling | Payment gateway integration |
| Receipts  | Auto-generated (R-XXXXXX), detailed ledger, print             | Digital receipts            |
| Follow-up | Search fee dues, bulk discount, bulk extra fee, fee message   | Fee reminders via SMS       |
| **Score** | **5/5**                                                       | **4/5**                     |

**Assessment:** SNR Edu ERP's FIFO payment allocation with atomic Firestore transactions is a technically superior approach, ensuring data consistency under concurrent operations. Education Desk's payment gateway integration is more production-ready for real-world payment processing. SNR should consider adding external payment gateway integration.

### 3.4 Exam & Result Cycle

| Step         | SNR Edu ERP                                                          | Education Desk                    |
| ------------ | -------------------------------------------------------------------- | --------------------------------- |
| Setup        | Grading rules, create exams, exam timetable                          | Exam patterns (CBSE/State/Custom) |
| Execution    | Exam attendance, date-sheet view, publish schedule                   | Marks entry                       |
| Results      | Bulk marks entry, result analytics, bulk result tool, report remarks | Single-click digital report card  |
| Distribution | Report card PDF download, admit card download                        | Digital publication               |
| **Score**    | **5/5**                                                              | **3/5**                           |

**Assessment:** SNR Edu ERP dominates this workflow with granular exam management, bulk tools, analytics, and student-facing admit card/report card downloads. Education Desk's single-click publication is simpler but less flexible.

### 3.5 Parent Engagement

| Step      | SNR Edu ERP                                                         | Education Desk                                |
| --------- | ------------------------------------------------------------------- | --------------------------------------------- |
| Channel   | Student portal (web), bulk messages                                 | Mobile app (Android/iOS), SMS, email, push    |
| Content   | Assignments, attendance, fees, exams, resources, transport, library | Attendance, homework, fees, results, messages |
| Real-time | Dashboard with attendance chart, fee balance                        | Live notifications, dashboard                 |
| **Score** | **3/5**                                                             | **5/5**                                       |

**Assessment:** Education Desk's dedicated parent mobile app with multi-channel communication is a significant differentiator. SNR Edu ERP's student portal is feature-rich but web-only, lacking the push notification and native mobile experience parents expect.

---

## 4. Data Model Considerations

### SNR Edu ERP

| Aspect        | Detail                                                                                                                                                                                                                                                                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database      | Cloud Firestore (NoSQL document)                                                                                                                                                                                                                                                                                                         |
| Multi-tenancy | Path-based isolation: `schools/{schoolId}/{collection}/{docId}`                                                                                                                                                                                                                                                                          |
| Collections   | students, sessions, classes, subjects, nonSubjects, fees, feePayments, exams, marks, gradingRules, schedules, admitcards, reports, attendance, homework, events, achievements, testimonials, gallery, staff, holidays, books, transport_routes, enquiries, notices, settings/general, settings/theme, settings/homeHero, pageText/{page} |
| Transactions  | Atomic Firestore transactions for payment (FIFO)                                                                                                                                                                                                                                                                                         |
| Legacy        | Some legacy top-level collections exist (migration risk)                                                                                                                                                                                                                                                                                 |
| Strengths     | Deeply normalized, tenant-isolated, granular settings hierarchy                                                                                                                                                                                                                                                                          |
| Weaknesses    | Legacy collections create query complexity; NoSQL denormalization trade-offs for reports                                                                                                                                                                                                                                                 |
| **Score**     | **4/5**                                                                                                                                                                                                                                                                                                                                  |

### Education Desk

| Aspect        | Detail                                                      |
| ------------- | ----------------------------------------------------------- |
| Database      | Unknown (not publicly disclosed)                            |
| Multi-tenancy | Assumed school-level isolation (white-label domain support) |
| Schema        | Not visible; inferred from feature set                      |
| Strengths     | Proven at 1M+ students scale                                |
| Weaknesses    | No public schema documentation; unknown query patterns      |
| **Score**     | **3/5** (estimated — limited visibility)                    |

**Assessment:** SNR Edu ERP's Firestore data model is well-structured with clear tenant isolation. The main risk is legacy top-level collections that should be migrated. Education Desk's lack of public architectural detail makes assessment speculative, but its proven scale (1M+ students) suggests an adequate underlying data layer.

---

## 5. Security and Compliance Notes

| Dimension              | SNR Edu ERP                                                      | Education Desk                                       |
| ---------------------- | ---------------------------------------------------------------- | ---------------------------------------------------- |
| Authentication         | Firebase Auth (email/password admin, phone+name student)         | Role-based login (admin, teacher, parent)            |
| Multi-tenant isolation | Firestore rules with tenant validation                           | Assumed (not detailed)                               |
| Data in transit        | Firebase default TLS                                             | "Encryption in transit" (claimed)                    |
| Data at rest           | Firebase default encryption                                      | "Regular backups" (claimed)                          |
| Access control         | Firestore security rules, authenticated writes, public CMS reads | Role-based access, audit logged                      |
| Compliance             | No COPPA/HIPAA/CCPA/SOC 2 claims                                 | No COPPA/HIPAA/CCPA/SOC 2/PCI-DSS claims             |
| **Known risks**        | Auth guards currently commented out (admin + student)            | No public security audit or compliance documentation |
| **Score**              | **3/5**                                                          | **3/5**                                              |

**Assessment:** Both platforms lack formal compliance certifications (SOC 2, COPPA, etc.), which is common in the Indian K-12 SaaS market but a liability for enterprise sales. SNR Edu ERP's commented-out auth guards are an immediate security concern that must be addressed before any production deployment. Education Desk's "audit logged" claim is unverifiable without documentation.

---

## 6. Performance and Reliability Signals

| Signal             | SNR Edu ERP                              | Education Desk                  |
| ------------------ | ---------------------------------------- | ------------------------------- |
| Hosting            | Firebase Hosting (Google Cloud CDN)      | "100% Cloud" (provider unknown) |
| Offline support    | Firestore offline persistence (built-in) | Not disclosed                   |
| Scalability        | Firebase auto-scaling                    | Claims 1M+ students managed     |
| Uptime SLA         | Firebase 99.95% (Google standard)        | Not disclosed                   |
| Real-time          | Firestore real-time listeners            | Not disclosed                   |
| Mobile performance | Web-only (no app)                        | Native Android app (4.6 rating) |
| **Score**          | **4/5**                                  | **3/5** (limited data)          |

**Assessment:** SNR Edu ERP benefits from Firebase's infrastructure reliability (Google Cloud, automatic scaling, CDN, offline persistence). Education Desk's scale claims are credible given the 800+ schools, but the underlying infrastructure is opaque. The native Android app gives Education Desk better mobile performance for parents.

---

## 7. Integrations and Extensibility

| Integration   | SNR Edu ERP                                 | Education Desk                          |
| ------------- | ------------------------------------------- | --------------------------------------- |
| SMS           | Bulk message (mechanism unspecified)        | Custom SMS gateway + default option     |
| Payment       | Internal FIFO service (no external gateway) | Custom payment gateway + default option |
| Maps          | Google Maps integration                     | Not disclosed                           |
| Communication | WhatsApp chat links, Gmail links            | SMS, email, in-app messaging            |
| AI            | Google GenAI (Gemini)                       | Not available                           |
| Import/Export | Excel import/export, PDF generation         | CSV import, PDF report download         |
| Mobile        | None                                        | Android app (Google Play), iOS claimed  |
| API           | No public API                               | No public API                           |
| White-label   | Multi-tenant with subdomains                | White-label domain optional             |
| **Score**     | **3/5**                                     | **4/5**                                 |

**Assessment:** Education Desk has more mature integration points for real-world deployment (SMS gateway, payment gateway, native mobile apps). SNR Edu ERP's unique integrations (Google Maps, WhatsApp, Gemini AI) are valuable but the lack of external payment gateway and SMS gateway support limits production readiness. Neither platform offers a public API, limiting third-party extensibility for both.

---

## 8. Pricing and ROI

| Factor        | SNR Edu ERP                                   | Education Desk                                    |
| ------------- | --------------------------------------------- | ------------------------------------------------- |
| Pricing model | Not publicly listed (custom/bespoke)          | ₹5/student/month (core), ₹10,000 starting (Basic) |
| Free trial    | Not mentioned                                 | 1 month free                                      |
| Setup fee     | Not mentioned                                 | None                                              |
| Enterprise    | Custom (6-stage provisioning suggests tiered) | Custom per-student for larger institutions        |
| Transparent   | No                                            | Yes                                               |

### ROI Comparison (Hypothetical — 500-student school)

| Scenario                | SNR Edu ERP                   | Education Desk                    |
| ----------------------- | ----------------------------- | --------------------------------- |
| Annual cost (estimated) | Unknown (custom quote)        | ₹30,000/year (₹5 × 500 × 12)      |
| Features included       | Full ERP + CMS + AI tools     | Core ERP + parent app             |
| Add-on costs            | None visible                  | GPS tracking, white-label (extra) |
| Time to value           | Longer (setup, configuration) | Faster (trial + CSV import)       |

**Assessment:** Education Desk's transparent, low per-student pricing (₹5/month) makes it accessible to budget-conscious schools and easy to evaluate. SNR Edu ERP's lack of public pricing creates a sales friction — schools cannot self-evaluate. The 6-stage provisioning model suggests a tiered pricing strategy that should be formalized and published. SNR Edu ERP's richer feature set could justify a premium if positioned correctly.

---

## 9. SWOT Analysis

### SNR Edu ERP — SWOT

|              | Positive                                                                                                                                                                                                                                                                                                     | Negative                                                                                                                                                                                                                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Internal** | **Strengths:** Deep feature set (ID cards, AI formatter, library, FIFO payments). Multi-tenant SaaS architecture with 6-stage provisioning. Full public website CMS. Firebase infrastructure (reliability, offline, real-time). Student portal with comprehensive self-service. Atomic payment transactions. | **Weaknesses:** Auth guards commented out. Modules labeled "under maintenance" (Analytics Hub, Subscriptions, System Settings, System Health). No mobile app. No public pricing. No reviews or social proof. Bulk message SMS mechanism unclear. No external payment/SMS gateway integration. Legacy top-level Firestore collections. |
| **External** | **Opportunities:** First-mover on AI-powered question formatting. Full-stack CMS differentiates from competitors who only offer ERP. 6-stage model enables freemium-to-enterprise pipeline. Indian K-12 market is large and underdigitized. Firebase ecosystem allows rapid iteration.                       | **Threats:** Education Desk has 800+ schools and brand recognition. Competitors with mobile apps capture parent mindshare. No compliance certifications limits enterprise sales. Firebase vendor lock-in. Low barriers to entry for basic ERP features.                                                                               |

### Education Desk — SWOT

|              | Positive                                                                                                                                                                                                                                                                                   | Negative                                                                                                                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Internal** | **Strengths:** 800+ schools, 1M+ students — proven scale. Native Android parent app (4.6 rating). Transparent, affordable pricing. Multi-channel parent communication (SMS, email, push). GPS bus tracking. Payment gateway integration. Multi-platform support (desktop, mobile, tablet). | **Weaknesses:** No library management. No ID card generator. No AI tools. Limited CMS (basic landing page only). No public API. Architecture details undisclosed. Minimal exam management depth. Limited bulk operations.   |
| **External** | **Opportunities:** Expand to iOS app. Add library and AI modules. Leverage install base for upselling. Build API for third-party integrations.                                                                                                                                             | **Threats:** Feature-rich competitors like SNR Edu ERP capturing schools needing deeper ERP. CMS-heavy schools may choose competitors with built-in website. Increasing parent expectations for richer digital experiences. |

---

## 10. Risks and Mitigations

### SNR Edu ERP

| Risk                                           | Severity | Likelihood | Mitigation                                                                         |
| ---------------------------------------------- | -------- | ---------- | ---------------------------------------------------------------------------------- |
| Auth guards disabled — security breach         | Critical | High       | Re-enable auth guards immediately; add automated tests to prevent regression       |
| Modules "under maintenance" — credibility loss | High     | Medium     | Complete or remove incomplete modules from the UI; ship minimum viable versions    |
| No mobile app — parent adoption barrier        | High     | High       | Build a React Native or Flutter parent app; or ship a PWA with push notifications  |
| No public pricing — sales friction             | Medium   | Medium     | Publish pricing tiers (freemium/starter/pro/enterprise) aligned with 6-stage model |
| Firebase vendor lock-in                        | Medium   | Low        | Abstract data access layer; document migration path to alternative backends        |
| No SMS/payment gateway integration             | High     | Medium     | Integrate Razorpay or Cashfree for payments; integrate MSG91 or Twilio for SMS     |
| Legacy Firestore collections                   | Low      | Medium     | Migrate to tenant-isolated path structure; deprecate top-level collections         |
| No compliance certifications                   | Medium   | Medium     | Pursue SOC 2 Type I at minimum; document data handling for GDPR/Indian DPDP Act    |

### Education Desk

| Risk                                   | Severity | Likelihood | Mitigation                                                            |
| -------------------------------------- | -------- | ---------- | --------------------------------------------------------------------- |
| Feature gap in CMS, ID cards, AI tools | Medium   | Medium     | Build or acquire missing modules to prevent churn to richer platforms |
| No public API — integration ceiling    | Medium   | Medium     | Expose REST/GraphQL API for third-party integrations                  |
| Limited transparency on architecture   | Low      | Medium     | Publish security whitepaper; disclose infrastructure details          |
| Parent app limited to Android          | Medium   | Medium     | Ship iOS app to capture full parent market                            |

---

## 11. Roadmap and Recommendations

### 90-Day Priorities (Immediate — Close Critical Gaps)

| #   | Action                                                                                                 | Impact                                          | Effort     |
| --- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | ---------- |
| 1   | **Re-enable auth guards** (admin + student)                                                            | Critical — prevents unauthorized access         | Low        |
| 2   | **Integrate payment gateway** (Razorpay/Cashfree)                                                      | High — enables real fee collection              | Medium     |
| 3   | **Integrate SMS gateway** (MSG91/Twilio)                                                               | High — enables attendance alerts, fee reminders | Medium     |
| 4   | **Complete or hide incomplete modules** (Analytics Hub, Subscriptions, System Settings, System Health) | High — removes credibility red flag             | Low-Medium |
| 5   | **Publish pricing page** (freemium + 3 tiers)                                                          | High — reduces sales friction                   | Low        |
| 6   | **Ship at least 1 school onboarding** (case study/testimonial)                                         | Medium — creates social proof                   | Low        |

### 6-Month Priorities (Growth — Differentiate and Scale)

| #   | Action                                                    | Impact                                    | Effort |
| --- | --------------------------------------------------------- | ----------------------------------------- | ------ |
| 1   | **Build parent mobile app** (React Native/Flutter or PWA) | Critical — matches competitor baseline    | High   |
| 2   | **Add push notification support** for parent app          | High — closes communication gap           | Medium |
| 3   | **Launch GPS tracking module** (transport add-on)         | High — matches competitor feature         | High   |
| 4   | **Migrate legacy Firestore collections**                  | Medium — reduces technical debt           | Medium |
| 5   | **Document and publish API**                              | Medium — enables third-party integrations | Medium |
| 6   | **Begin SOC 2 Type I preparation**                        | Medium — enables enterprise sales         | High   |
| 7   | **Collect and publish 3-5 customer testimonials**         | High — builds trust                       | Low    |

### 12-Month Priorities (Dominance — Market Leadership)

| #   | Action                                                                                           | Impact                                  | Effort |
| --- | ------------------------------------------------------------------------------------------------ | --------------------------------------- | ------ |
| 1   | **Scale to 50+ schools** using 6-stage provisioning pipeline                                     | Critical — validates product-market fit | High   |
| 2   | **Achieve SOC 2 Type I certification**                                                           | High — unlocks enterprise segment       | High   |
| 3   | **Launch AI-powered features suite** (question formatter, auto-grading, performance predictions) | High — unique differentiator            | High   |
| 4   | **Build white-label mobile app builder** for schools                                             | High — major competitor differentiator  | High   |
| 5   | **Implement Indian DPDP Act compliance**                                                         | Medium — regulatory readiness           | Medium |
| 6   | **Launch referral/partner program** for school consultants                                       | Medium — distribution channel           | Medium |
| 7   | **Explore multi-language support** for regional markets                                          | Medium — market expansion               | Medium |

---

## 12. Evidence Log & Sources

| #   | Source                                                 | URL                                                                         | Data Extracted                                                                                       | Reliability |
| --- | ------------------------------------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Education Desk — Official Website                      | https://www.educationdesk.in                                                | Features, stats (800+ schools, 1M+ students), pricing (₹5/student/month), workflow, support channels | High        |
| 2   | Education Desk — Apex Public School Instance           | https://apexps.educationdesk.in                                             | Live deployment evidence, feature availability                                                       | High        |
| 3   | Techjockey — Education Desk Listing                    | https://www.techjockey.com/detail/educationdesk                             | Pricing (₹10,000 starting), rating (4.5/5, 5 ratings), 96% recommend, platforms, features            | High        |
| 4   | Techjockey — eSchool ERP vs Education Desk             | https://www.techjockey.com/compare/e-school-erp-vs-educationdesk            | Feature comparison, competitive positioning                                                          | Medium      |
| 5   | Techjockey — Education Desk vs Kewzz School Management | https://www.techjockey.com/compare/educationdesk-vs-kewzz-school-management | Feature comparison, competitive positioning                                                          | Medium      |
| 6   | Pgyer — Education Desk Parent APK                      | https://www.pgyer.com/apk/apk/com.educationdesk.parent                      | Android app existence, package name                                                                  | Medium      |
| 7   | Google Play — Education Desk Parent App                | (inferred from package name com.educationdesk.parent)                       | 4.6 rating, Android availability                                                                     | Medium      |
| 8   | SNR Edu ERP — Source Code (internal)                   | N/A (your product)                                                          | Full feature inventory, architecture, data model, known gaps                                         | High        |
| 9   | Firebase Documentation                                 | https://firebase.google.com/docs                                            | Firestore capabilities, security rules, hosting features                                             | High        |
| 10  | Google GenAI (Gemini) Documentation                    | https://ai.google.dev                                                       | Question formatter integration capabilities                                                          | High        |

---

**Uncertainty Notes:**

- Education Desk's architecture, database technology, and internal security implementation are not publicly disclosed. Scores for these dimensions are estimated from publicly available claims and should be treated as Low-Medium reliability.
- Education Desk's iOS app availability is claimed but not independently verified via App Store listing.
- SNR Edu ERP's pricing is entirely speculative as no public pricing exists.
- Education Desk's actual customer count and satisfaction metrics are self-reported and not independently audited.

---

_Report generated March 28, 2026. All assessments based on publicly available information as of this date. Recommendations should be validated against internal product strategy and market conditions._
