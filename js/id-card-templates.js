/**
 * ID CARD TEMPLATES DEFINITIONS
 * Refined high-fidelity formats matching user images exactly.
 */

const ID_TEMPLATES = {
    // Format 1: Teal Amber (Inspired by Image 1)
    format1: (data) => `
        <div class="id-card-wrapper temp-teal-amber ${data.orientation}">
            <div class="top-banner">
                <div style="display:flex; align-items:center; gap:8px;">
                    <img src="${data.schoolLogo}" class="id-card-logo" style="filter: brightness(0) invert(1); height:10mm;">
                    <div>
                        <div style="font-weight:900; font-size:10pt; line-height:1.1;">APEX PUBLIC SCHOOL</div>
                        <div style="font-size:6pt; opacity:0.9;">${data.address_summary || 'Main Road, Sector 5, City'}</div>
                    </div>
                </div>
            </div>
            <div class="photo-frame">
                <div class="photo-inner">
                    <img src="${data.photo || 'https://via.placeholder.com/150'}" style="width:100%; height:100%; object-fit:cover;">
                </div>
            </div>
            <div style="position:absolute; right:8px; top:40mm; writing-mode:vertical-rl; color:#cbd5e1; font-weight:800; font-size:12pt; opacity:0.4; letter-spacing:1.5px;">STUDENT ID CARD</div>
            <div class="details" style="padding:0 15px; margin-top:2mm;">
                <table style="width:100%; font-size:7.5pt; border-spacing:0 3px;">
                    <tr><td width="70" style="color:#4db6ac; font-weight:700;">Name</td> <td width="5">:</td> <td style="font-weight:800; color:#1e293b;">${data.name}</td></tr>
                    <tr><td style="color:#4db6ac; font-weight:700;">F/Name</td> <td>:</td> <td style="font-weight:600;">${data.fatherName}</td></tr>
                    <tr><td style="color:#4db6ac; font-weight:700;">M/Name</td> <td>:</td> <td style="font-weight:600;">${data.motherName || 'N/A'}</td></tr>
                    <tr><td style="color:#4db6ac; font-weight:700;">Class</td> <td>:</td> <td style="font-weight:600;">${data.class} (${data.rollNo})</td></tr>
                    <tr><td style="color:#4db6ac; font-weight:700;">ID No.</td> <td>:</td> <td style="font-weight:600;">${data.studentId}</td></tr>
                    <tr><td style="color:#4db6ac; font-weight:700; vertical-align:top;">Address</td> <td style="vertical-align:top;">:</td> <td style="font-weight:500; font-size:6.5pt; line-height:1.2; color:#475569;">${data.address}</td></tr>
                </table>
            </div>
            <div class="footer" style="position:absolute; bottom:10px; width:100%; padding:0 15px; display:flex; justify-content:space-between; align-items:flex-end;">
                <div style="font-size:7pt; color:#4db6ac; font-weight:800;">
                    <i class="fas fa-mobile-alt"></i> ${data.schoolContact}
                </div>
                <div style="text-align:right;">
                    <div style="font-family:'Alex Brush', cursive; font-size:12pt; color:#1e293b; line-height:0.8;">Gobi Ananth</div>
                    <div style="font-size:6pt; font-weight:800; color:#64748b;">Principal</div>
                </div>
            </div>
        </div>
    `,

    // Format 2: Corporate Blue (Inspired by Image 2 - Govt Style)
    format2: (data) => `
        <div class="id-card-wrapper temp-corp-blue ${data.orientation}">
            <div class="header-band">
                <div style="display:flex; align-items:center; gap:10px; justify-content:center;">
                    <img src="${data.schoolLogo}" style="height:12mm; filter:brightness(0) invert(1);">
                    <div style="text-align:left;">
                        <div style="font-weight:900; font-size:12.5pt; line-height:1;">APEX PUBLIC SCHOOL</div>
                        <div style="font-size:6pt; opacity:0.9; margin-top:2px;">(Govt. Recognised)</div>
                        <div style="font-size:5.5pt; opacity:0.8; line-height:1.1;">Address: ${data.address_summary || 'Sector 5, City - 000000'}</div>
                        <div style="font-size:6.5pt; font-weight:700;">Phone No.: ${data.schoolContact}</div>
                    </div>
                </div>
            </div>
            <div style="background:#f1f5f9; text-align:center; padding:5px; font-weight:900; font-size:9pt; color:#1e3a8a; letter-spacing:1.5px; border-bottom:1px solid #e2e8f0; margin-top:15px;">IDENTITY CARD</div>
            <div class="photo-box">
                <img src="${data.photo || 'https://via.placeholder.com/150'}" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <div style="text-align:center; font-weight:900; font-size:13pt; color:#1e40af; margin-bottom:5px; text-transform:uppercase;">${data.name}</div>
            <table class="info-table">
                <tr><td width="42%" style="color:#64748b; font-weight:700;">Father's Name</td><td style="font-weight:700; color:#1e293b;">: ${data.fatherName}</td></tr>
                <tr><td style="color:#64748b; font-weight:700;">Mother's Name</td><td style="font-weight:700; color:#1e293b;">: ${data.motherName || 'N/A'}</td></tr>
                <tr><td style="color:#64748b; font-weight:700;">D.O.B</td><td style="font-weight:700; color:#1e293b;">: ${data.dateOfBirth || 'N/A'}</td></tr>
                <tr><td style="color:#64748b; font-weight:700;">Contact No</td><td style="font-weight:700; color:#1e293b;">: ${data.mobile}</td></tr>
                <tr><td style="color:#64748b; font-weight:700; vertical-align:top;">Add.</td><td style="font-weight:700; color:#1e293b; font-size:6.5pt; line-height:1.2;">: ${data.address}</td></tr>
            </table>
            <div style="position:absolute; bottom:12px; left:12px; font-size:8pt; font-weight:900; color:#1e40af;">Class : ${data.class}</div>
            <div style="position:absolute; bottom:10px; right:15px; text-align:center;">
                 <div style="font-family:cursive; font-size:10pt; color:#1e3a8a;">Signature</div>
                 <div style="font-size:6.5pt; font-weight:800; color:#64748b; border-top:1px solid #64748b; margin-top:2px;">Principal Sign.</div>
            </div>
        </div>
    `,

    // Format 3: Siddhartha Style (Inspired by Image 3 - Modern Curved)
    format3: (data) => `
        <div class="id-card-wrapper temp-wave-dark ${data.orientation}">
            <div class="header-curved">
                <div style="font-size:5pt; background:white; color:#1e3a8a; display:inline-block; padding:1px 6px; border-radius:10px; font-weight:900; margin-bottom:3px;">${data.trustName || 'APEX EDUCATION TRUST (R)'}</div>
                <div style="font-weight:900; font-size:11pt; line-height:1.1;">APEX PUBLIC SCHOOL</div>
                <div style="font-size:5.5pt; opacity:0.8;">${data.address_summary || 'Main Road, City - 581320'}</div>
            </div>
            <div class="photo-circle">
                 <img src="${data.photo || 'https://via.placeholder.com/150'}" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <div style="text-align:center; padding:5px 15px;">
                <div style="font-weight:900; font-size:13pt; color:#1e3a8a; text-transform:uppercase; margin-bottom:2px; letter-spacing:-0.5px;">${data.name}</div>
                <div style="background:#1e3a8a; color:white; padding:1px 12px; border-radius:12px; font-size:7pt; font-weight:800; display:inline-block; margin-bottom:5px;">CLASS: ${data.class}</div>
                
                <div style="text-align:left; font-size:7.5pt; color:#334155; line-height:1.3;">
                    <div style="display:flex; justify-content:space-between;"><b>Father Name</b> <span>: ${data.fatherName}</span></div>
                    <div style="display:flex; justify-content:space-between;"><b>Mother Name</b> <span>: ${data.motherName || 'N/A'}</span></div>
                    <div style="display:flex; justify-content:space-between;"><b>Date of Birth</b> <span>: ${data.dateOfBirth || 'N/A'}</span></div>
                    <div style="display:flex; justify-content:space-between;"><b>Admission No</b> <span>: ${data.studentId}</span></div>
                    <div style="display:flex; justify-content:space-between;"><b>Address</b> <span style="font-size:6pt; max-width:30mm; text-align:right;">: ${data.address}</span></div>
                </div>
            </div>
            <div class="footer-wave">
                <div style="font-size:12pt; font-family:cursive; opacity:0.6; line-height:1;">Signature</div>
                <div style="position:absolute; bottom:1px; font-size:5pt; font-weight:900;">Principal's Sign</div>
            </div>
        </div>
    `,

    // Format 4: Aadarsh Style (Inspired by Image 4 - Red Ribbon)
    format4: (data) => `
        <div class="id-card-wrapper temp-curve-primary ${data.orientation}">
            <div class="top-curve">
                <div style="text-align:center; color:white;">
                    <div style="font-weight:900; font-size:11pt;">APEX PUBLIC SCHOOL</div>
                    <div style="font-size:6.5pt; opacity:0.9;">Main Road, Sector 5, City</div>
                    <div style="font-size:7pt; background:#facc15; color:#1e1b4b; padding:1px 8px; display:inline-block; margin-top:4px; font-weight:900; border-radius:4px;">ENGLISH MEDIUM SCHOOL</div>
                </div>
            </div>
            <div class="photo-container">
                <img src="${data.photo || 'https://via.placeholder.com/150'}" style="width:28mm; height:34mm;">
            </div>
            <div style="text-align:center;">
                <div style="font-weight:900; font-size:13pt; color:#dc2626; text-transform:uppercase; line-height:1;">${data.name}</div>
                <div style="color:#1e3a8a; font-weight:900; font-size:10pt; margin-top:1px;">CLASS - ${data.class}</div>
            </div>
            <div style="padding:5px 20px; font-size:8pt;">
                <div style="display:flex; justify-content:space-between; margin-bottom:3px; border-bottom:1px solid #f8fafc;"><span style="color:#64748b; font-weight:700;">Father Name</span><span style="font-weight:700; color:#1e293b;">: ${data.fatherName}</span></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:3px; border-bottom:1px solid #f8fafc;"><span style="color:#64748b; font-weight:700;">Mother Name</span><span style="font-weight:700; color:#1e293b;">: ${data.motherName || 'N/A'}</span></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:3px; border-bottom:1px solid #f8fafc;"><span style="color:#64748b; font-weight:700;">D.O.B.</span><span style="font-weight:700; color:#1e293b;">: ${data.dateOfBirth || 'N/A'}</span></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:3px; border-bottom:1px solid #f8fafc;"><span style="color:#64748b; font-weight:700;">Mobile No.</span><span style="font-weight:700; color:#1e293b;">: ${data.mobile}</span></div>
                <div style="display:flex; justify-content:space-between;"><span style="color:#64748b; font-weight:700;">Address</span><span style="font-weight:700; color:#1e293b; max-width:35mm; text-align:right; font-size:6.5pt; line-height:1.1;">: ${data.address}</span></div>
            </div>
            <div class="bottom-ribbon">
                <div style="background:#facc15; color:#1e1b4b; padding:1px 6px; border-radius:10px; font-size:7.5pt; font-weight:900;">
                    <i class="fas fa-phone-alt"></i> ${data.schoolContact}
                </div>
                <div style="text-align:right;">
                    <div style="font-family:'Alex Brush', cursive; font-size:12pt; line-height:0.8; filter:brightness(0) invert(1);">Signature</div>
                    <div style="font-size:5.5pt; font-weight:900;">Principal Signature</div>
                </div>
            </div>
        </div>
    `,

    // Format 5: Stark Side (Inspired by Image 5 - RBSK Modern)
    format5: (data) => `
        <div class="id-card-wrapper temp-stark-modern ${data.orientation}" style="border: 2px solid #0f172a;">
            <div class="peak-header">
                 <div style="font-weight:900; font-size:15pt; line-height:1; letter-spacing:-0.5px;">APEX MEMORIAL</div>
                 <div style="font-size:10pt; font-weight:900; color:#facc15; margin-top:2px;">PUBLIC SCHOOL</div>
            </div>
            <div style="text-align:center; margin-top:3mm;">
                <div class="photo-ring">
                    <img src="${data.photo || 'https://via.placeholder.com/150'}" style="width:100%; height:100%; object-fit:cover;">
                </div>
            </div>
            <div style="text-align:center; padding:0 15px;">
                <div style="font-weight:900; font-size:17pt; color:#0f172a; letter-spacing:-1px; margin-bottom:5px;">${data.name}</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:8pt; text-align:left; border-top:1px solid #eee; padding-top:10px;">
                    <div><b style="color:#64748b; font-size:7pt;">Father's -</b><br><span style="font-weight:700; color:#0f172a;">${data.fatherName}</span></div>
                    <div><b style="color:#64748b; font-size:7pt;">Mother's -</b><br><span style="font-weight:700; color:#0f172a;">${data.motherName || 'N/A'}</span></div>
                    <div><b style="color:#64748b; font-size:7pt;">DOB - </b><br><span style="font-weight:700; color:#0f172a;">${data.dateOfBirth || 'N/A'}</span></div>
                    <div><b style="color:#64748b; font-size:7pt;">Class - </b><br><span style="font-weight:700; color:#0f172a;">${data.class}</span></div>
                </div>
            </div>
            <div class="bottom-bar">
                <div style="font-weight:900; font-size:6.5pt; color:#facc15;">Call Us For More Details: ${data.schoolContact}</div>
                <div style="font-size:6.5pt; color:white; margin-top:2px; font-weight:700; line-height:1.2;">Address: ${data.address}</div>
            </div>
        </div>
    `
};

// Export to window
window.ID_TEMPLATES = ID_TEMPLATES;
