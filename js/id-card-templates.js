/**
 * ID CARD TEMPLATES DEFINITIONS
 * Hyper-compact refined formats matching user images exactly.
 * Optimized for high-density data display.
 */

const ID_TEMPLATES = {
    // Format 1: Teal Amber (Inspired by Image 1)
    format1: (data) => `
        <div class="id-card-wrapper temp-teal-amber ${data.orientation}">
            <div class="top-banner">
                <div style="display:flex; align-items:center; gap:6px;">
                    <img src="${data.schoolLogo}" style="filter: brightness(0) invert(1); height:8mm;">
                    <div style="text-align:left;">
                        <div style="font-weight:900; font-size:9.5pt; line-height:1;">APEX PUBLIC SCHOOL</div>
                        <div style="font-size:5.5pt; opacity:0.9;">Sector 5, Main Road, City</div>
                    </div>
                </div>
            </div>
            <div class="photo-frame">
                <div style="width:100%; height:100%; overflow:hidden; clip-path:inherit; background:#fff;">
                    <img src="${data.photo || 'https://via.placeholder.com/150'}" style="width:100%; height:100%; object-fit:cover;">
                </div>
            </div>
            <div style="position:absolute; right:5px; top:35mm; writing-mode:vertical-rl; color:#cbd5e1; font-weight:900; font-size:11pt; opacity:0.3; letter-spacing:1px;">ID CARD</div>
            <div class="details" style="padding:0 12px; margin-top:2mm;">
                <table style="width:95%; font-size:7pt; border-spacing:0 2px; line-height:1.2;">
                    <tr><td width="60" style="color:#4db6ac; font-weight:800;">Name</td> <td width="5">:</td> <td style="font-weight:800; color:#1e293b; text-transform:uppercase;">${data.name}</td></tr>
                    <tr><td style="color:#4db6ac; font-weight:800;">F/Name</td> <td>:</td> <td style="font-weight:600;">${data.fatherName}</td></tr>
                    <tr><td style="color:#4db6ac; font-weight:800;">M/Name</td> <td>:</td> <td style="font-weight:600;">${data.motherName || 'N/A'}</td></tr>
                    <tr><td style="color:#4db6ac; font-weight:800;">Class-Roll</td> <td>:</td> <td style="font-weight:600;">${data.class} (${data.rollNo})</td></tr>
                    <tr><td style="color:#4db6ac; font-weight:800;">Adm. No</td> <td>:</td> <td style="font-weight:600;">${data.studentId}</td></tr>
                    <tr><td style="color:#4db6ac; font-weight:800; vertical-align:top;">Address</td> <td style="vertical-align:top;">:</td> <td style="font-weight:500; font-size:5.5pt; color:#475569;">${data.address}</td></tr>
                </table>
            </div>
            <div class="footer" style="position:absolute; bottom:8px; width:100%; padding:0 12px; display:flex; justify-content:space-between; align-items:flex-end;">
                <div style="font-size:6.5pt; color:#4db6ac; font-weight:800; display:flex; align-items:center; gap:2px;">
                    <i class="fas fa-phone-alt"></i> ${data.schoolContact}
                </div>
                <div style="text-align:right;">
                    <div style="font-family:'Alex Brush', cursive; font-size:11pt; color:#1e293b; line-height:0.7;">Sign</div>
                    <div style="font-size:5.5pt; font-weight:900; color:#64748b;">Principal</div>
                </div>
            </div>
        </div>
    `,

    // Format 2: Corporate Blue (Inspired by Image 2)
    format2: (data) => `
        <div class="id-card-wrapper temp-corp-blue ${data.orientation}" style="border-radius:6px; overflow:hidden;">
            <div class="header-band" style="text-align:center;">
                <img src="${data.schoolLogo}" style="height:8mm; filter:brightness(0) invert(1); margin-bottom:2px;">
                <div style="font-weight:900; font-size:10pt; line-height:1;">APEX PUBLIC SCHOOL</div>
                <div style="font-size:5pt; opacity:0.8;">Recognised by Govt. | Phone: ${data.schoolContact}</div>
            </div>
            <div style="background:#f8fafc; text-align:center; padding:3px; font-weight:900; font-size:7.5pt; color:#1e40af; border-bottom:1px solid #e2e8f0;">IDENTITY CARD</div>
            <div class="photo-box" style="margin:8px auto 4px; border:1px solid #1e3a8a; padding:1px; background:#fff;">
                <img src="${data.photo || 'https://via.placeholder.com/150'}" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <div style="text-align:center; font-weight:900; font-size:11pt; color:#1e40af; margin-bottom:2px; text-transform:uppercase;">${data.name}</div>
            <table style="width:100%; border-collapse:collapse; font-size:6.8pt; line-height:1.2;">
                <tr style="border-bottom:1px solid #f1f5f9;"><td width="42%" style="padding:2px 10px; color:#64748b; font-weight:800;">Father's Name</td><td style="padding:2px; font-weight:700;">: ${data.fatherName}</td></tr>
                <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:2px 10px; color:#64748b; font-weight:800;">Mother's Name</td><td style="padding:2px; font-weight:700;">: ${data.motherName || 'N/A'}</td></tr>
                <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:2px 10px; color:#64748b; font-weight:800;">Student ID</td><td style="padding:2px; font-weight:700;">: ${data.studentId}</td></tr>
                <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:2px 10px; color:#64748b; font-weight:800;">Class-Roll</td><td style="padding:2px; font-weight:700;">: ${data.class} (#${data.rollNo})</td></tr>
                <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:2px 10px; color:#64748b; font-weight:800;">Mobile No.</td><td style="padding:2px; font-weight:700;">: ${data.mobile}</td></tr>
                <tr style="border-bottom:none;"><td style="padding:2px 10px; color:#64748b; font-weight:800; vertical-align:top;">Address</td><td style="padding:2px; font-weight:600; font-size:5.5pt; line-height:1.1;">: ${data.address}</td></tr>
            </table>
            <div style="position:absolute; bottom:5px; right:10px; text-align:center;">
                 <div style="font-family:cursive; font-size:9pt; line-height:1;">Sign</div>
                 <div style="font-size:5pt; font-weight:800; color:#64748b; border-top:1px solid #ccc; margin-top:1px;">Principal</div>
            </div>
        </div>
    `,

    // Format 3: Wave Dark (Inspired by Image 3)
    format3: (data) => `
        <div class="id-card-wrapper temp-wave-dark ${data.orientation}" style="border-radius:8px;">
            <div class="header-curved">
                <div style="font-size:4.5pt; background:white; color:#1e3a8a; display:inline-block; padding:1px 5px; border-radius:10px; font-weight:900; margin-bottom:2px;">${data.trustName || 'APEX EDUCATION TRUST (R)'}</div>
                <div style="font-weight:900; font-size:10pt; line-height:1;">APEX PUBLIC SCHOOL</div>
                <div style="font-size:5pt; opacity:0.8;">Main Road, City - 581320</div>
            </div>
            <div class="photo-circle" style="border-color:#facc15; border-width:3px; background:#fff;">
                 <img src="${data.photo || 'https://via.placeholder.com/150'}" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <div style="text-align:center; padding:2px 10px;">
                <div style="font-weight:900; font-size:12pt; color:#1e3a8a; text-transform:uppercase; margin-bottom:1px;">${data.name}</div>
                <div style="background:#1e3a8a; color:white; padding:1px 10px; border-radius:10px; font-size:6.5pt; font-weight:900; display:inline-block; margin-bottom:3px;">CLASS: ${data.class}</div>
                
                <div style="text-align:left; font-size:7pt; color:#334155; line-height:1.2;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:1px;"><b>Father</b> <span>: ${data.fatherName}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:1px;"><b>Mother</b> <span>: ${data.motherName || 'N/A'}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:1px;"><b>Adm. ID</b> <span>: ${data.studentId}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:1px;"><b>D.O.B</b> <span>: ${data.dateOfBirth || 'N/A'}</span></div>
                    <div style="display:flex; justify-content:space-between;"><b>Addr.</b> <span style="font-size:5.5pt; max-width:32mm; text-align:right;">: ${data.address}</span></div>
                </div>
            </div>
            <div class="footer-wave" style="height:10mm; background:#1e3a8a; color:white;">
                <div style="font-family:cursive; font-size:10pt; opacity:0.7; margin-top:-2mm;">Sign</div>
                <div style="position:absolute; bottom:1px; font-size:5pt; font-weight:900;">Principal's Signature</div>
            </div>
        </div>
    `,

    // Format 4: Curve Primary (Inspired by Image 4)
    format4: (data) => `
        <div class="id-card-wrapper temp-curve-primary ${data.orientation}" style="border-radius:10px;">
            <div class="top-curve">
                <div style="text-align:center;">
                    <div style="font-weight:900; font-size:10pt; line-height:1.1;">APEX PUBLIC SCHOOL</div>
                    <div style="font-size:5pt; background:#facc15; color:#1e1b4b; padding:1px 6px; display:inline-block; margin-top:2px; font-weight:900; border-radius:3px;">ENGLISH MEDIUM SCHOOL</div>
                </div>
            </div>
            <div class="photo-container" style="background:#fff;">
                <img src="${data.photo || 'https://via.placeholder.com/150'}" style="margin:0 auto; border:1px solid #ddd; padding:1px;">
            </div>
            <div style="text-align:center; padding-top:2px;">
                <div style="font-weight:900; font-size:11.5pt; color:#dc2626; text-transform:uppercase; line-height:1;">${data.name}</div>
                <div style="color:#1e3a8a; font-weight:900; font-size:9pt; margin-top:1px;">CLASS - ${data.class}</div>
            </div>
            <div style="padding:4px 15px; font-size:7pt; line-height:1.2;">
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9;"><span style="color:#64748b; font-weight:800;">Father Name</span><span style="font-weight:700;">: ${data.fatherName}</span></div>
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9;"><span style="color:#64748b; font-weight:800;">Mother Name</span><span style="font-weight:700;">: ${data.motherName || 'N/A'}</span></div>
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9;"><span style="color:#64748b; font-weight:800;">Student ID</span><span style="font-weight:700;">: ${data.studentId}</span></div>
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9;"><span style="color:#64748b; font-weight:800;">Mobile No.</span><span style="font-weight:700;">: ${data.mobile}</span></div>
                <div style="display:flex; justify-content:space-between;"><span style="color:#64748b; font-weight:800;">Address</span><span style="font-weight:700; max-width:32mm; text-align:right; font-size:5.5pt;">: ${data.address}</span></div>
            </div>
            <div class="bottom-ribbon" style="height:10mm; background:#dc2626; color:white; display:flex; justify-content:space-between; align-items:center;">
                <div style="background:#facc15; color:#1e1b4b; padding:1px 5px; border-radius:10px; font-size:6.5pt; font-weight:900;">
                    <i class="fas fa-phone-alt"></i> ${data.schoolContact}
                </div>
                <div style="text-align:right;">
                    <div style="font-family:cursive; font-size:9pt; line-height:0.7;">Sign</div>
                    <div style="font-size:4.5pt; font-weight:900;">Principal Signature</div>
                </div>
            </div>
        </div>
    `,

    // Format 5: Stark Modern (Inspired by Image 5)
    format5: (data) => `
        <div class="id-card-wrapper temp-stark-modern ${data.orientation}" style="border: 1.5px solid #0f172a;">
            <div class="peak-header">
                 <div style="font-weight:900; font-size:11pt; line-height:1;">APEX MEMORIAL</div>
                 <div style="font-size:7pt; font-weight:900; color:#facc15;">PUBLIC SCHOOL</div>
            </div>
            <div style="text-align:center;">
                <div class="photo-ring" style="border:3px solid #fff; background:#fff;">
                    <img src="${data.photo || 'https://via.placeholder.com/150'}" style="width:100%; height:100%; object-fit:cover;">
                </div>
            </div>
            <div style="text-align:center; padding:2px 12px;">
                <div style="font-weight:900; font-size:13.5pt; color:#0f172a; text-transform:uppercase; line-height:1; margin-bottom:4px;">${data.name}</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:6.8pt; text-align:left; border-top:1px solid #eee; padding-top:4px; line-height:1.2;">
                    <div><b style="color:#64748b; font-size:5.5pt;">Father:</b><br><span style="font-weight:700;">${data.fatherName}</span></div>
                    <div><b style="color:#64748b; font-size:5.5pt;">Mother:</b><br><span style="font-weight:700;">${data.motherName || 'N/A'}</span></div>
                    <div><b style="color:#64748b; font-size:5.5pt;">ID / Class:</b><br><span style="font-weight:700;">${data.studentId} / ${data.class}</span></div>
                    <div><b style="color:#64748b; font-size:5.5pt;">DOB:</b><br><span style="font-weight:700;">${data.dateOfBirth || 'N/A'}</span></div>
                </div>
            </div>
            <div class="bottom-bar" style="background:#0f172a; color:white; padding:4px;">
                <div style="font-weight:900; font-size:5.5pt; color:#facc15;">PH: ${data.schoolContact}</div>
                <div style="font-size:5pt; opacity:0.9; line-height:1.1; margin-top:1px;">Addr: ${data.address}</div>
            </div>
        </div>
    `
};

// Export to window
window.ID_TEMPLATES = ID_TEMPLATES;
