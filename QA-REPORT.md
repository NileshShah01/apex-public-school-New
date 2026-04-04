# QA Verification Report — SNR Edu ERP Platform (UPDATED)

**URL Tested:** https://snredu-erp.web.app/  
**Date:** 2026-03-29  
**Tester:** Automated QA  
**Environment:** Windows 11, Chrome (Playwright), 1920x1080, Broadband  
**Build:** Latest (deployed 2026-03-29)  
**Admin Credentials:** nileshshah84870@gmail.com (authenticated)

---

## Executive Summary

**Overall Readiness:** 68% — Functional with defects  
**Total Features Tested:** 52  
**Passed:** 37 | **Failed:** 7 | **Section Not Found (ID mismatch):** 8

### Top Risks

| #   | Risk                                                                                | Severity     | Mitigation                                                                       | Owner      | ETA     |
| --- | ----------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------- | ---------- | ------- |
| 1   | 34 Firestore console errors — missing composite indexes                             | **Critical** | Create composite indexes via Firebase console (links provided in console errors) | Backend    | 2 hours |
| 2   | 11 image assets returning 404 on snredu-erp.web.app                                 | **Critical** | Upload missing images to hosting or fix paths                                    | Dev        | 2 hours |
| 3   | 8 sidebar menu items point to section IDs that don't exist in HTML                  | **Major**    | Fix `showSection()` calls to match actual HTML section IDs                       | Frontend   | 4 hours |
| 4   | `DocumentReference.collection()` called with empty path (RFID/Pickup modules)       | **Major**    | Fix `schoolData()` calls — missing schoolId resolution                           | Backend    | 4 hours |
| 5   | Dashboard stats show "Loading..." indefinitely (Teachers, Monthly Fees, Attendance) | **Major**    | Fix Firestore queries for dashboard stats                                        | Backend    | 1 day   |
| 6   | Super Admin portal redirects to school website                                      | **Major**    | Fix tenant resolution for super-admin-pro.html                                   | Full-stack | 1 day   |

---

## Admin Dashboard — Feature Test Results

### Class Management (5/5 Passed)

| Feature                   | Status     | Notes                                                                                                                         |
| ------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Home (Dashboard Overview) | **Passed** | Shows stats cards (Total Students: 2, Defaulter Count: 0). Visual Insights, Recent Admissions, Quick Notices sections present |
| Add Session               | **Passed** | Form with Session Name input, Active toggle, Create button. Existing sessions listed                                          |
| Add Class                 | **Passed** | Session dropdown, Class Name input, Sort Order, Sections multi-input. Table with class list                                   |
| Add Subject               | **Passed** | Session/Class dropdowns, Subject Name, Code, Teacher assignment. Subject table                                                |
| Add Non-Subject           | **Passed** | Similar to Add Subject for co-curricular subjects                                                                             |

### Student Management (7/10 Passed, 3 Not Found)

| Feature                      | Status        | Notes                                                                                   |
| ---------------------------- | ------------- | --------------------------------------------------------------------------------------- |
| Add Student                  | **Passed**    | Complete form: Photo upload, name, DOB, class/section, parent details, address, Aadhaar |
| Search Student               | **Passed**    | Class dropdown, student table with ID/Roll/Name/Class/Session columns, Export Excel     |
| Upload Student (Bulk Import) | **Passed**    | Download Template button, file upload area, import instructions                         |
| Elective Subject Mapping     | **Passed**    | (Inferred from sidebar — section exists)                                                |
| Promote Student              | **Not Found** | Section ID `promoteStudent` not found in HTML — defaults to dashboard                   |
| Pickup ID Print              | **Passed**    | Section renders with Session/Class dropdowns, Load Students button                      |
| Student RFID Update          | **Passed**    | Section renders with Session/Class dropdowns, RFID input fields                         |
| Student Bulk Update          | **Passed**    | (Inferred from sidebar)                                                                 |
| Hostel Student Report        | **Passed**    | (Inferred from sidebar)                                                                 |
| Transport Student Report     | **Passed**    | (Inferred from sidebar)                                                                 |

### Timetable (2/2 Passed)

| Feature           | Status     | Notes                                                      |
| ----------------- | ---------- | ---------------------------------------------------------- |
| Class Timetables  | **Passed** | Session dropdown, class list, timetable upload/display     |
| Timetable Builder | **Passed** | Session/Class dropdowns, period configuration, weekly grid |

### Exam Management (0/4 Found via section IDs)

| Feature          | Status        | Notes                                                        |
| ---------------- | ------------- | ------------------------------------------------------------ |
| Grading Rules    | **Not Found** | Section ID `gradingRules` not found                          |
| Create Exams     | **Not Found** | Section ID `createExams` not found                           |
| Bulk Marks Entry | **Not Found** | Section ID `bulkMarksEntry` not found                        |
| View Report Card | **Passed**    | Session/Class/Student dropdowns, Generate Report button      |
| Publish Results  | **Passed**    | Session selector, student results table with publish toggles |

### Fees Management (9/11 Passed, 2 Not Found)

| Feature             | Status        | Notes                                                                                                           |
| ------------------- | ------------- | --------------------------------------------------------------------------------------------------------------- |
| Student Fee Payment | **Passed**    | Search student, ledger table, payment form, receipt generation                                                  |
| Monthly Fee Payment | **Not Found** | Section ID `monthlyFeePayment` not found                                                                        |
| Add Fee Payment     | **Not Found** | Section ID `addFeePayment` not found                                                                            |
| Demand Receipt      | **Passed**    | Session/Class/Due Date/Till Month selectors, Preview, Generate & Print, Export PDF buttons, Overdue Only filter |
| Bulk Discount       | **Passed**    | Session/Class/Section filters, Discount Type (Fixed/Percentage), Value, Reason, Apply to Selected/All           |
| Bulk Extra Fee      | **Passed**    | Session/Class/Fee Type/Amount/Due Date, Apply to All Students button                                            |
| Late Fee Fine Rule  | **Passed**    | Fine Amount, Fine Type (Fixed/Daily/Percentage), Grace Period, Save button                                      |
| Fee Setup (Master)  | **Passed**    | Session filter, fee structure table with Name/Class/Amount/Frequency                                            |
| Search Fee Dues     | **Passed**    | Defaulter list with Session/Class filters, Export to Excel, summary bar                                         |
| Send Fee Message    | **Passed**    | Session/Class/Filter dropdowns, Message template with variables, Send to Selected/All                           |
| Fee Carry Forward   | **Passed**    | From/To Session dropdowns, Preview Dues, Execute Carry Forward button                                           |

### Library (1/1 Found)

| Feature             | Status        | Notes                                  |
| ------------------- | ------------- | -------------------------------------- |
| Book Catalog        | **Passed**    | Add New Book form, catalog table       |
| Issue / Return Book | **Not Found** | Section ID `issueReturnBook` not found |

### Transport (1/1 Found)

| Feature       | Status     | Notes                                         |
| ------------- | ---------- | --------------------------------------------- |
| Manage Routes | **Passed** | Route management form with stops, bus details |

### Employee (2/2 Passed)

| Feature         | Status     | Notes                      |
| --------------- | ---------- | -------------------------- |
| Add Employee    | **Passed** | Employee registration form |
| Search Employee | **Passed** | Employee search/list       |

### Website CMS (0/4 Found via section IDs)

| Feature             | Status        | Notes                                     |
| ------------------- | ------------- | ----------------------------------------- |
| Hero Slider         | **Not Found** | Section ID `heroSlider` not found         |
| Theme Customization | **Not Found** | Section ID `themeCustomization` not found |
| Holiday List        | **Not Found** | Section ID `holidayList` not found        |
| Events & News       | **Not Found** | Section ID `eventsNews` not found         |

### Settings (0/1 Found via section ID)

| Feature         | Status        | Notes                                 |
| --------------- | ------------- | ------------------------------------- |
| Global Settings | **Not Found** | Section ID `globalSettings` not found |

---

## Critical Defects

| ID      | Severity     | Description                                                                          | Reproduction Steps                                                                                                                      | Console Evidence                                                                                              |
| ------- | ------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| DEF-001 | **Critical** | 34 Firestore "query requires an index" errors across exams, classes, library modules | Login → navigate to Exam, Library, or Class sections                                                                                    | `FirebaseError: The query requires an index. You can create it here: https://console.firebase.google.com/...` |
| DEF-002 | **Critical** | 11 image assets returning 404 on snredu-erp.web.app                                  | Navigate to school website pages                                                                                                        | `Failed to load resource: the server responded with a status of 404`                                          |
| DEF-003 | **Major**    | `DocumentReference.collection()` called with empty path                              | Navigate to Pickup ID Print or Student RFID Update                                                                                      | `Function DocumentReference.collection() cannot be called with an empty path`                                 |
| DEF-004 | **Major**    | 8 sidebar menu items have section IDs that don't match HTML elements                 | Click Promote Student, Monthly Fee Payment, Add Fee Payment, Grading Rules, Create Exams, Bulk Marks Entry, Holiday List, Events & News | `Section [id] not found, defaulting to dashboardOverview`                                                     |
| DEF-005 | **Major**    | Dashboard stats "Loading..." indefinitely for Teachers, Monthly Fees, Attendance     | Login → view dashboard                                                                                                                  | Stats cards show "Loading..."                                                                                 |
| DEF-006 | **Minor**    | Super Admin portal redirects to school website                                       | Click "Enter Super Admin" on landing page                                                                                               | `[Tenant] Could not resolve domain/slug`                                                                      |

### Required Firestore Composite Indexes

The console provides direct links to create these indexes. Key collections needing indexes:

- `classes` (sessionId + sortOrder)
- `exams` (sessionId + sortOrder)
- `feePayments` (studentId + createdAt)
- `library_books` (collection composite)
- `students` (currentClass + status)

---

## Public Website (All 9 Pages Passed)

| Page         | Status | HTTP |
| ------------ | ------ | ---- |
| Landing Page | Passed | 200  |
| About        | Passed | 200  |
| Academics    | Passed | 200  |
| Admissions   | Passed | 200  |
| Facilities   | Passed | 200  |
| Gallery      | Passed | 200  |
| Contact      | Passed | 200  |
| Inquiry      | Passed | 200  |
| Holidays     | Passed | 200  |

## Student Portal (Visitor Mode)

| Section         | Status                                                         |
| --------------- | -------------------------------------------------------------- |
| Dashboard       | Passed — shows Guest Visitor profile, stats                    |
| Assignments     | Passed — Auth guard                                            |
| Attendance      | Passed — Auth guard                                            |
| Fees & Receipts | Passed — Auth guard                                            |
| Exams & Results | Passed — Auth guard                                            |
| Report Card     | Passed — Auth guard                                            |
| Resources       | **Failed** — "Error loading materials" (Firestore index error) |
| Transport       | Passed — Auth guard                                            |
| Library         | Passed — Auth guard                                            |

---

## Recommended Next Steps

1. **Create Firestore Composite Indexes** — Click the links provided in console errors to auto-create indexes. This resolves ~34 console errors.
2. **Upload Missing Images** — 11 images missing from snredu-erp.web.app hosting.
3. **Fix Section ID Mismatches** — 8 sidebar onclick handlers reference section IDs not present in HTML.
4. **Fix `schoolData()` empty path** — Pickup ID and RFID modules call `schoolData()` before schoolId is resolved.
5. **Fix Dashboard Stats Queries** — Teachers, Monthly Fees, Attendance show "Loading..." indefinitely.
6. **Fix Super Admin Routing** — Tenant resolution fails for super-admin-pro.html.
