/**
 * Provisioning script for Multi-School Dynamic Branding
 * Usage: node scripts/provision-multi-school.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Ensure you have this or use default credentials

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const schools = {
    'SCH001': {
        name: 'Apex Public School',
        tagline: 'Quality education for a brighter future',
        location: 'Anjani Bazar, Parsa, Saran',
        address_short: 'Anjani Bazar, Parsa, Saran',
        address_full: 'Anjani Bazar, Parsa, Saran, Bihar 841219',
        phone: '8084243031',
        email: 'Apexpublicschool61@gmail.com',
        udise: '10171706503',
        reg: '2111449',
        logoUrl: '/images/ApexPublicSchoolLogo.png',
        mapIframeUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3559.9999999999995!2d84.99999999999999!3d25.999999999999996!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjXCsDU5JzM2LjAiTiA4NMKwNTknNTIuOCJF!5e0!3m2!1sen!2sin!4v1741520000000',
        copyright: '© 2026 Apex Public School. All Rights Reserved.',
        admissionStatus: 'open',
        admissionSession: '2024-25',
        marquee: 'Welcome to Apex Public School - Admissions Open for 2024-25 Session!'
    },
    'SCH002': {
        name: 'SNR World School',
        tagline: 'Empowering Minds, Shaping Futures',
        location: 'Patna, Bihar',
        address_short: 'Patna, Bihar',
        address_full: 'SNR World Campus, Boring Road, Patna, Bihar 800001',
        phone: '9724649971',
        email: 'info@snrworld.edu.in',
        udise: '10171700000',
        reg: '2024001',
        logoUrl: '/images/SNRWorldLogo.png', // Placeholder or generated
        mapIframeUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d115132.86107233816!2d85.0713459145657!3d25.6081755712175!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39ed5842f033ebe9%3A0x10f031ecc441f92c!2sPatna%2C%20Bihar!5e0!3m2!1sen!2sin!4v1741520000000',
        copyright: '© 2026 SNR World School. Empowered by SNR World.',
        admissionStatus: 'open',
        admissionSession: '2024-25',
        marquee: 'SNR World School Patna - Excellence in Education.'
    }
};

async function provision() {
    for (const [schoolId, data] of Object.entries(schools)) {
        console.log(`Provisioning ${schoolId}...`);
        await db.collection('schools').doc(schoolId).collection('settings').doc('general').set(data, { merge: true });
        
        // Ensure the school record exists in the main schools collection
        await db.collection('schools').doc(schoolId).set({
            name: data.name,
            status: 'active',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }
    console.log('Done!');
}

provision().catch(console.error);
