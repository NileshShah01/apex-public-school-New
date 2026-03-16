/**
 * erp-analytics.js - Result & Performance Analytics
 */

const ResultAnalytics = {
    charts: {},

    async init() {
        // Populate filters
        const sessionSelect = document.getElementById('analytic_sessionSelect');
        if (sessionSelect && erpState.sessions) {
            sessionSelect.innerHTML =
                '<option value="">Select Session</option>' +
                erpState.sessions
                    .map((s) => `<option value="${s.id}" ${s.active ? 'selected' : ''}>${s.name}</option>`)
                    .join('');

            if (erpState.activeSessionId) {
                await this.loadClasses();
                await this.loadExams();
            }
        }
    },

    async loadClasses() {
        const sessId = document.getElementById('analytic_sessionSelect').value;
        const el = document.getElementById('analytic_classSelect');
        if (!el || !sessId) return;
        const snap = await schoolData('classes').where('sessionId', '==', sessId).orderBy('sortOrder', 'asc').get();
        el.innerHTML =
            '<option value="">Select Class</option>' +
            snap.docs.map((doc) => `<option value="${doc.data().name}">${doc.data().name}</option>`).join('');
    },

    async loadExams() {
        const sessId = document.getElementById('analytic_sessionSelect').value;
        const el = document.getElementById('analytic_examSelect');
        if (!el || !sessId) return;
        const snap = await schoolData('exams').where('sessionId', '==', sessId).get();
        el.innerHTML =
            '<option value="">Select Exam</option>' +
            snap.docs.map((doc) => `<option value="${doc.id}">${doc.data().name}</option>`).join('');
    },

    async refresh() {
        const sessId = document.getElementById('analytic_sessionSelect').value;
        const cls = document.getElementById('analytic_classSelect').value;
        const examId = document.getElementById('analytic_examSelect').value;

        if (!cls || !examId) return;

        showLoading(true);
        try {
            // 1. Fetch Marks
            const marksSnap = await schoolData('marks')
                .where('examId', '==', examId)
                .where('className', '==', cls)
                .get();

            if (marksSnap.empty) {
                showToast('No data found for the selected criteria', 'info');
                return;
            }

            const marks = marksSnap.docs.map((doc) => doc.data());

            // 2. Fetch Subjects
            const subsSnap = await schoolData('subjects').where('sessionId', '==', sessId).get();
            const subjects = {};
            subsSnap.forEach((doc) => (subjects[doc.id] = doc.data().name));

            // 3. Process Data
            this.processOverview(marks);
            this.renderSubjectPerformance(marks, subjects);
            this.renderDistribution(marks);
        } catch (e) {
            console.error(e);
        } finally {
            showLoading(false);
        }
    },

    processOverview(marks) {
        const totalEntries = marks.length;
        const totalMarks = marks.reduce((acc, m) => acc + (parseFloat(m.obtained) || 0), 0);
        const avg = totalEntries > 0 ? (totalMarks / totalEntries).toFixed(1) : 0;

        const highest = Math.max(...marks.map((m) => parseFloat(m.obtained) || 0));
        const passed = marks.filter((m) => (parseFloat(m.obtained) || 0) >= 33).length; // 33% pass logic
        const passPercent = totalEntries > 0 ? Math.round((passed / totalEntries) * 100) : 0;

        document.getElementById('an_avgScore').textContent = avg;
        document.getElementById('an_highestScore').textContent = highest;
        document.getElementById('an_passPercent').textContent = `${passPercent}%`;
    },

    renderSubjectPerformance(marks, subjectNames) {
        const subjectStats = {};
        marks.forEach((m) => {
            if (!subjectStats[m.subjectId]) subjectStats[m.subjectId] = { total: 0, count: 0 };
            subjectStats[m.subjectId].total += parseFloat(m.obtained) || 0;
            subjectStats[m.subjectId].count++;
        });

        const labels = Object.keys(subjectStats).map((id) => subjectNames[id] || id);
        const data = Object.keys(subjectStats).map((id) =>
            (subjectStats[id].total / subjectStats[id].count).toFixed(1)
        );

        this.drawChart('subjectChart', 'bar', labels, data, 'Avg Marks by Subject', 'rgba(54, 162, 235, 0.8)');
    },

    renderDistribution(marks) {
        const ranges = { '90-100': 0, '75-89': 0, '60-74': 0, '45-59': 0, '33-44': 0, '<33': 0 };
        marks.forEach((m) => {
            const s = parseFloat(m.obtained) || 0;
            if (s >= 90) ranges['90-100']++;
            else if (s >= 75) ranges['75-89']++;
            else if (s >= 60) ranges['60-74']++;
            else if (s >= 45) ranges['45-59']++;
            else if (s >= 33) ranges['33-44']++;
            else ranges['<33']++;
        });

        this.drawChart('distChart', 'pie', Object.keys(ranges), Object.values(ranges), 'Score Distribution', [
            '#10b981',
            '#3b82f6',
            '#f59e0b',
            '#6366f1',
            '#ec4899',
            '#ef4444',
        ]);
    },

    drawChart(canvasId, type, labels, data, label, colors) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        if (this.charts[canvasId]) this.charts[canvasId].destroy();

        this.charts[canvasId] = new Chart(ctx, {
            type: type,
            data: {
                labels: labels,
                datasets: [
                    {
                        label: label,
                        data: data,
                        backgroundColor: colors,
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
            },
        });
    },
};

window.ResultAnalytics = ResultAnalytics;
