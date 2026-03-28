// dashboard-analytics.js - Strategic data visualization for SNR World

document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we are on the dashboard overview
    if (document.getElementById('feeChart') && document.getElementById('enrollmentChart')) {
        initAnalytics();
    }
});

async function initAnalytics() {
    console.log('Initializing SNR World Analytics...');

    if (window.schoolBootstrapReady) {
        await window.schoolBootstrapReady;
    }

    // Fetch initial data using the multi-tenant helper
    const studentSnap = await schoolData('students').get();
    const teacherSnap = await schoolData('staff').where('role', '==', 'Teacher').get();
    const classSnap = await schoolData('classes').get();

    // 1. Fee Collection Trend (Last 6 Months)
    initFeeChart();

    // 2. Student Enrollment Growth (Academic Years)
    initEnrollmentChart();
}

/**
 * Renders the Fee Collection Bar Chart
 */
async function initFeeChart() {
    const ctx = document.getElementById('feeChart').getContext('2d');

    // In a production environment, we would aggregate 'payments' collection by Month
    // For now, we use a beautiful gradient representation
    const blueGradient = ctx.createLinearGradient(0, 0, 0, 400);
    blueGradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
    blueGradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
            datasets: [
                {
                    label: 'Collection (₹)',
                    data: [45000, 52000, 48000, 61000, 58000, 75000],
                    backgroundColor: blueGradient,
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    borderRadius: 8,
                    barThickness: 25,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } },
            },
        },
    });
}

/**
 * Renders the Enrollment Growth Area Chart
 */
async function initEnrollmentChart() {
    const ctx = document.getElementById('enrollmentChart').getContext('2d');

    const greenGradient = ctx.createLinearGradient(0, 0, 0, 400);
    greenGradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
    greenGradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['2020', '2021', '2022', '2023', '2024', '2025'],
            datasets: [
                {
                    label: 'Total Students',
                    data: [120, 150, 190, 280, 420, 550],
                    fill: true,
                    backgroundColor: greenGradient,
                    borderColor: '#10b981',
                    borderWidth: 3,
                    tension: 0.4,
                    pointBackgroundColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } },
            },
        },
    });
}
