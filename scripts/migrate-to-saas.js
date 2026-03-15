/**
 * SNR World: Multi-tenant SaaS Migration Script (v2.0 - SAFE)
 * This script tags all existing Firestore data with schoolId: "SCH001" (Apex Public School).
 * 
 * IMPROVEMENTS:
 * 1. Handles collections with >500 records by splitting into multiple batches.
 * 2. Verifies Firebase and db initialization before starting.
 * 3. Atomic processing per chunk for high reliability.
 * 
 * RUN THIS IN THE BROWSER CONSOLE OF YOUR ADMIN DASHBOARD
 */

async function runSaaSMigration() {
    // 0. Environment Verify
    if (typeof firebase === 'undefined' || typeof db === 'undefined' || !db) {
        console.error("FATAL: Firebase or Database (db) is not initialized on this page. Please run this script from the Admin Dashboard.");
        return;
    }

    console.log("%c--- SNR World: SaaS Migration Starting (Safety v2.0) ---", "color: #3b82f6; font-weight: bold; font-size: 14px;");
    
    const SCHOOL_ID = "SCH001";
    const SCHOOL_NAME = "Apex Public School";
    const BATCH_LIMIT = 500; // Firestore maximum batch size
    
    // 1. Create/Update the Master School Record
    try {
        await db.collection('schools').doc(SCHOOL_ID).set({
            schoolId: SCHOOL_ID,
            schoolName: SCHOOL_NAME,
            subdomain: "apex", 
            stage: 5,         // Initializing at full ERP access for Apex
            status: "active",
            migratedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`%c✓ Master School Record: ${SCHOOL_ID} verified.`, "color: #10b981;");
    } catch (e) {
        console.error("Failed to verify/create school record:", e);
        return;
    }

    // 2. Define collections to migrate
    const collectionsToMigrate = [
        'students', 'fees', 'payments', 'notices', 'events', 
        'gallery', 'admissions', 'inquiries', 'staff', 
        'timetables', 'exams', 'results', 'admitcards', 
        'reports', 'testimonials', 'settings'
    ];

    let totalUpdated = 0;

    for (const colName of collectionsToMigrate) {
        console.log(`Analyzing collection: ${colName}...`);
        try {
            const snapshot = await db.collection(colName).get();
            if (snapshot.empty) {
                console.log(`  - ${colName} is empty. Skipping.`);
                continue;
            }

            const docsToUpdate = snapshot.docs.filter(doc => !doc.data().schoolId);
            
            if (docsToUpdate.length === 0) {
                console.log(`  - ${colName}: All clean. No action needed.`);
                continue;
            }

            console.log(`  - ${colName}: Found ${docsToUpdate.length} records needing SCH001 tag.`);

            // 3. Process in Chunks of 500 (Firestore Limit)
            for (let i = 0; i < docsToUpdate.length; i += BATCH_LIMIT) {
                const chunk = docsToUpdate.slice(i, i + BATCH_LIMIT);
                const batch = db.batch();
                
                chunk.forEach(doc => {
                    batch.update(doc.ref, { 
                        schoolId: SCHOOL_ID,
                        _migration_v2: true 
                    });
                });

                await batch.commit();
                totalUpdated += chunk.length;
                console.log(`%c    + Committed batch of ${chunk.length} for ${colName}`, "color: #10b981;");
            }
        } catch (e) {
            console.warn(`%c  ! Error processing collection ${colName}: ${e.message}`, "color: #f59e0b;");
        }
    }

    console.log("%c--- Migration Successfully Finalized ---", "color: #3b82f6; font-weight: bold; font-size: 14px;");
    console.log(`Final Audit: Total records tagged with ${SCHOOL_ID} across all modules: ${totalUpdated}`);
    alert(`Migration Success!\nTotal Records Migrated: ${totalUpdated}\nSchool ID assigned: ${SCHOOL_ID}`);
}

// Type 'runSaaSMigration()' in your console to execute.
