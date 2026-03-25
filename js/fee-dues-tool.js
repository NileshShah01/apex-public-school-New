/**
 * Fee Dues Tool - Parents Who Not Paid
 * Processes Dues and Monthly Payment Excel files to identify pending payments.
 * Generates Excel and Dark-Themed A4 PDF reports.
 */

let feeDuesToolResultData = null;

/**
 * Update file status in UI
 */
function updateFileName(inputId, statusId) {
    const file = document.getElementById(inputId).files[0];
    if (file) {
        document.getElementById(statusId).textContent = '✓ ' + file.name;
    }
}

const SEARCH_TERMS = {
    'Student Id': [
        'studentId', 'student id', 'id', 'admission no', 'adm no', 'id_no',
        'student_id', 'scholar no', 'reg no', 'roll no', 'sid', 'id no',
        'stuid', 'enrollment'
    ],
    'Student Name': ['student name', 'name', 'student_name', 'candidate name', 'full name', 'sname', 'student'],
    'Father Name': ['fatherName', 'father name', 'father_name', 'father', 'guardian name', 'guardian'],
    Phone: ['mobile', 'phone', 'contact', 'mobile number', 'phone number', 'whatsapp', 'mob'],
    Session: ['admissionYear', 'session', 'year', 'academic year', 'acad_year'],
    Class: ['class', 'cls', 'grade', 'standard', 'standard_no'],
    'Due Amount': ['due amount', 'balance', 'pending', 'dues', 'total due', 'amount due', 'due', 'remain', 'arrear'],
};

function findKey(row, keyName) {
    if (!row) return null;
    const searchTerms = SEARCH_TERMS[keyName] || [keyName.toLowerCase()];
    const keys = Object.keys(row);

    for (const term of searchTerms) {
        const exact = keys.find((k) => k.trim().toLowerCase() === term.toLowerCase());
        if (exact) return exact;
    }

    for (const term of searchTerms) {
        const fuzzy = keys.find((k) => k.toLowerCase().includes(term.toLowerCase()));
        if (fuzzy) return fuzzy;
    }
    return null;
}

function mapFeeRow(row) {
    const idKey = findKey(row, 'Student Id');
    const nameKey = findKey(row, 'Student Name');
    const fatherKey = findKey(row, 'Father Name');
    const phoneKey = findKey(row, 'Phone');
    const sessionKey = findKey(row, 'Session');
    const classKey = findKey(row, 'Class');
    const dueKey = findKey(row, 'Due Amount');

    let rawDue = dueKey && row[dueKey] ? String(row[dueKey]) : '0';
    let cleanDue = Number(rawDue.replace(/[^\d.]/g, '')) || 0;

    return {
        'Student Id': idKey ? String(row[idKey] || '').trim() : '',
        'Student Name': nameKey ? String(row[nameKey] || '').trim() : '',
        'Father Name': fatherKey ? String(row[fatherKey] || '').trim() : '',
        Phone: phoneKey ? String(row[phoneKey] || '').trim() : '',
        Session: sessionKey ? String(row[sessionKey] || '').trim() : '',
        Class: classKey ? String(row[classKey] || '').trim() : '',
        'Due Amount': cleanDue,
    };
}

function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const fullAOA = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                let headerRowIndex = 0;
                for (let i = 0; i < Math.min(fullAOA.length, 20); i++) {
                    const row = fullAOA[i];
                    if (!row || !Array.isArray(row)) continue;
                    let matches = 0;
                    const combinedTerms = Object.values(SEARCH_TERMS).flat();
                    row.forEach((cell) => {
                        const cellStr = String(cell || '').toLowerCase().trim();
                        if (combinedTerms.some((term) => cellStr === term || cellStr.includes(term))) {
                            matches++;
                        }
                    });
                    if (matches >= 3) {
                        headerRowIndex = i;
                        break;
                    }
                }
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex });
                resolve(jsonData);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Process the two Excel files and generate intersection logic
 */
async function processFeeData() {
    const duesFile = document.getElementById('fee_duesFile').files[0];
    const paidFile = document.getElementById('fee_paidFile').files[0];

    if (!duesFile || !paidFile) {
        showToast('Please upload both Excel files first.', 'error');
        return;
    }

    try {
        showToast('Processing data...', 'info');
        const rawDuesData = await readExcelFile(duesFile);
        const rawPaidData = await readExcelFile(paidFile);

        if (!rawDuesData.length || !rawPaidData.length) {
            showToast('One of the files seems empty or invalid.', 'error');
            return;
        }

        const duesIdKey = findKey(rawDuesData[0], 'Student Id');
        const paidIdKey = findKey(rawPaidData[0], 'Student Id');

        if (!duesIdKey || !paidIdKey) {
            showToast(`Could not find 'Student id' column. Check headers.`, 'error');
            return;
        }

        const paidIds = new Set(
            rawPaidData.map((row) => String(row[paidIdKey] || '').trim()).filter((id) => id !== '')
        );

        const nonPaying = [];
        rawDuesData.forEach((row) => {
            const id = String(row[duesIdKey] || '').trim();
            if (id !== '' && !paidIds.has(id)) {
                nonPaying.push(mapFeeRow(row));
            }
        });

        if (nonPaying.length === 0) {
            showToast('Great news! All students have paid.', 'success');
            return;
        }

        const grouped = {};
        nonPaying.forEach((std) => {
            const cls = std.Class || 'Unclassified';
            if (!grouped[cls]) grouped[cls] = [];
            grouped[cls].push(std);
        });

        Object.keys(grouped).forEach((cls) => {
            grouped[cls].sort((a, b) => (b['Due Amount'] || 0) - (a['Due Amount'] || 0));
        });

        feeDuesToolResultData = grouped;
        document.getElementById('fee_resultsArea').style.display = 'block';
        document.getElementById('fee_summaryText').textContent =
            `Found ${nonPaying.length} students across ${Object.keys(grouped).length} classes with pending payments.`;
        showToast('Analysis complete!', 'success');
    } catch (e) {
        console.error(e);
        showToast('Error: ' + e.message, 'error');
    }
}

/**
 * Download Excel Report
 */
function downloadFeeExcel() {
    if (!feeDuesToolResultData) return;
    const wb = XLSX.utils.book_new();
    const sortedClasses = Object.keys(feeDuesToolResultData).sort();
    const dateRange = `(01 Dec, 2023 - ${new Date().toLocaleDateString('en-GB')})`;
    const title = [(window.SCHOOL_NAME || 'School') + ` | Parents Who Not Paid | ${dateRange}`];
    const headers = ['Student Id', 'Student Name', 'Father Name', 'Phone', 'Session', 'Class', 'Due Amount'];

    sortedClasses.forEach((cls) => {
        const rows = feeDuesToolResultData[cls];
        const sheetData = [
            title,
            headers,
            ...rows.map((std) => [
                String(std['Student Id']),
                std['Student Name'],
                std['Father Name'],
                std['Phone'],
                std['Session'],
                std['Class'],
                std['Due Amount'],
            ]),
        ];
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws, cls.substring(0, 31));
    });
    XLSX.writeFile(wb, 'Parents_Who_Not_Paid.xlsx');
}

/**
 * Download PDF Report - Dark Mode Premium
 */
async function downloadFeePdf() {
    if (!feeDuesToolResultData) return;
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const sortedClasses = Object.keys(feeDuesToolResultData).sort();
        const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        for (let i = 0; i < sortedClasses.forEach; i++) {} // Fake loop just to use await if needed
        
        // Use a standard loop for async support if we need to load logos
        for (let i = 0; i < sortedClasses.length; i++) {
            const cls = sortedClasses[i];
            if (i > 0) doc.addPage();

            // Background for Dark Mode
            doc.setFillColor(15, 23, 42); // slate-900
            doc.rect(0, 0, 210, 297, 'F');

            const rows = feeDuesToolResultData[cls];
            const headers = [['#', 'ID', 'Student Name', 'Father Name', 'Phone', 'Session', 'Due Amount']];
            const body = rows.map((std, idx) => [
                idx + 1,
                std['Student Id'],
                std['Student Name'],
                std['Father Name'],
                std['Phone'],
                std['Session'],
                Number(std['Due Amount'] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            ]);

            doc.autoTable({
                head: headers,
                body: body,
                startY: 45,
                theme: 'grid',
                headStyles: { 
                    fillColor: [30, 41, 59], // slate-800
                    textColor: [255, 255, 255], 
                    fontStyle: 'bold', 
                    halign: 'center',
                    lineColor: [51, 65, 85]
                },
                styles: { 
                    fontSize: 8.5, 
                    cellPadding: 3.5, 
                    halign: 'left', 
                    font: 'helvetica',
                    fillColor: [15, 23, 42], // slate-900
                    textColor: [226, 232, 240], // slate-200
                    lineColor: [51, 65, 85] // slate-700
                },
                alternateRowStyles: { 
                    fillColor: [30, 41, 59] // slate-800
                },
                margin: { top: 40, bottom: 20 },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },
                    1: { cellWidth: 20 },
                    4: { cellWidth: 28 },
                    6: { halign: 'right', fontStyle: 'bold', textColor: [245, 158, 11] } // accent gold
                },
                didDrawPage: function (data) {
                    // Header Area
                    doc.setFillColor(30, 41, 59);
                    doc.rect(0, 0, 210, 35, 'F');
                    
                    // School Name
                    doc.setFontSize(18);
                    doc.setTextColor(255, 255, 255);
                    doc.setFont('helvetica', 'bold');
                    doc.text(window.SCHOOL_NAME || 'SCHOOL NAME', 105, 15, { align: 'center' });

                    // Report Title
                    doc.setFontSize(11);
                    doc.setTextColor(245, 158, 11);
                    doc.text('PARENTS WHO NOT PAID (Dues Report)', 105, 22, { align: 'center' });

                    // Meta Info
                    doc.setFontSize(9);
                    doc.setTextColor(148, 163, 184); // slate-400
                    doc.setFont('helvetica', 'normal');
                    doc.text(`Class: ${cls} | Date: ${dateStr} | Page ${data.pageNumber}`, 14, 30);
                    
                    // Signature / Stamp Placeholder
                    doc.setFontSize(8);
                    doc.text('Generated by Admin ERP System', 196, 30, { align: 'right' });
                }
            });
        }

        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Due_Fees_Report_${dateStr.replace(/ /g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('Premium Dark PDF generated!');
    } catch (err) {
        console.error(err);
        showToast('PDF Error: ' + err.message, 'error');
    }
}

/**
 * Reset memory and UI
 */
function resetFeeTool() {
    feeDuesToolResultData = null;
    document.getElementById('fee_duesFile').value = '';
    document.getElementById('fee_paidFile').value = '';
    document.getElementById('fee_duesStatus').textContent = '';
    document.getElementById('fee_paidStatus').textContent = '';
    document.getElementById('fee_resultsArea').style.display = 'none';
    showToast('Data cleared.');
}
