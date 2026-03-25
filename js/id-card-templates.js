/**
 * ID CARD TEMPLATES DEFINITIONS
 * Refined for CR80 Standard (85.6mm x 53.98mm).
 * Optimized for high-density student data and ultra-premium aesthetics.
 */

const ID_TEMPLATES = {
    // Format 1: Teal Amber - CR80 Vertical (54mm x 86mm)
    format1: (data) => `
        <div class="id-card-wrapper temp-luxury-teal ${data.orientation}" style="width: 54mm; height: 86mm; background: #fff; border: 0.5mm solid #00695c; position: relative; overflow: hidden; font-family: 'Inter', sans-serif; box-sizing: border-box;">
            <div class="luxury-bg-logo" style="position:absolute; inset:0; background: url('${data.schoolLogo}') center/contain no-repeat; opacity:0.03; z-index:0;"></div>
            <div class="header" style="background: linear-gradient(135deg, #00897b 0%, #004d40 100%); padding: 2mm 1.5mm; display: flex; align-items: center; justify-content: center; gap: 2mm; position: relative; z-index: 1;">
                <img src="${data.schoolLogo}" style="height: 8mm; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">
                <div style="text-align: left; color: #fff;">
                    <div style="font-weight: 900; font-size: 8.5pt; line-height: 1; letter-spacing: 0.2px;">${data.schoolName}</div>
                    <div style="font-size: 4pt; opacity: 0.9; font-weight: 600; letter-spacing: 0.1px;">${data.schoolTagline || 'EDUCATING FOR TOMORROW'}</div>
                </div>
            </div>
            <div style="text-align: center; margin-top: 3mm; position: relative; z-index: 1;">
                <div class="gold-photo-frame" style="width: 28mm; height: 34mm; margin: 0 auto; border: 2mm solid #fff; box-shadow: 0 4px 8px rgba(0,0,0,0.15); background: #f8fafc; overflow: hidden; position: relative; border-radius: 4px;">
                    ${
                        data.photo
                            ? `<img src="${data.photo}" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;">`
                            : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; flex-direction:column; color:#cbd5e1;">
                            <img src="${data.schoolLogo}" style="width:60%; opacity:0.1; filter:grayscale(1);">
                         </div>`
                    }
                </div>
                <div style="margin-top: 1.5mm; background: #004d40; color: #fff; display: inline-block; padding: 0.5mm 3mm; border-radius: 50px; font-weight: 800; font-size: 7pt;">ID: ${data.studentId}</div>
            </div>
            <div class="luxury-details" style="padding: 2mm 4mm; position: relative; z-index: 1;">
                <div style="text-align: center; font-weight: 950; font-size: 13pt; color: #004d40; text-transform: uppercase; margin-bottom: 2mm; border-bottom: 0.5mm solid #fbbf24; padding-bottom: 1mm;">${data.name}</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; margin-top: 2mm;">
                     <div style="text-align: left;"><b style="color: #00695c; font-size: 5pt;">FATHER</b><br><span style="font-weight: 800; font-size: 8pt; color: #1e293b;">${data.fatherName}</span></div>
                     <div style="text-align: left;"><b style="color: #00695c; font-size: 5pt;">CLASS / ROLL</b><br><span style="font-weight: 800; font-size: 8pt; color: #1e293b;">${data.class} (${data.rollNo})</span></div>
                     <div style="text-align: left;"><b style="color: #00695c; font-size: 5pt;">MOBILE</b><br><span style="font-weight: 800; font-size: 8pt; color: #1e293b;">${data.mobile}</span></div>
                     <div style="text-align: left;"><b style="color: #00695c; font-size: 5pt;">DOB</b><br><span style="font-weight: 800; font-size: 8pt; color: #1e293b;">${data.dateOfBirth}</span></div>
                </div>
                <div style="margin-top: 2mm; text-align: left;"><b style="color: #00695c; font-size: 5pt;">ADDRESS</b><br><span style="font-weight: 600; font-size: 7pt; color: #475569; line-height: 1.1; display: block; max-height: 8mm; overflow: hidden;">${data.address}</span></div>
            </div>
            <div class="luxury-footer" style="position: absolute; bottom: 0; width: 100%; background: #f8fafc; border-top: 0.2mm solid #e2e8f0; height: 12mm; display: flex; align-items: center; justify-content: space-between; padding: 0 4mm; z-index: 1; box-sizing: border-box;">
                 <div style="font-size: 4.5pt; color: #64748b; font-weight: 700; line-height: 1.3;">
                     <i class="fas fa-phone"></i> ${data.schoolContact}<br>
                     <i class="fas fa-globe"></i> ${data.schoolWebsite}
                 </div>
                 <div style="text-align: center;">
                      <img src="/images/principal-sign.png" style="height: 8mm; mix-blend-mode: multiply;">
                      <div style="font-size: 4pt; font-weight: 900; color: #004d40; border-top: 0.2mm solid #004d40; padding-top: 0.5mm; text-transform: uppercase;">Principal</div>
                 </div>
            </div>
        </div>
    `,

    // Format 2: Corporate Blue - CR80 Vertical
    format2: (data) => `
        <div class="id-card-wrapper temp-luxury-blue ${data.orientation}" style="width: 54mm; height: 86mm; background: #fff; border: 0.5mm solid #1e3a8a; position: relative; overflow: hidden; font-family: 'Inter', sans-serif; box-sizing: border-box;">
            <div class="luxury-bg-logo" style="position:absolute; inset:0; background: url('${data.schoolLogo}') center/contain no-repeat; opacity:0.04; z-index:0;"></div>
            <div class="header-v" style="background: #1e3a8a; padding: 2mm; display: flex; flex-direction: column; align-items: center; position: relative; z-index: 1; border-bottom: 0.8mm solid #fbbf24;">
                <img src="${data.schoolLogo}" style="height: 8mm; filter: brightness(0) invert(1); margin-bottom: 1mm;">
                <div style="font-weight: 900; font-size: 10pt; color: #fff; letter-spacing: 0.3px; text-transform: uppercase;">${data.schoolName}</div>
                <div style="font-size: 5pt; color: #fbbf24; font-weight: 800; letter-spacing: 1px;">VVIP IDENTITY PASS</div>
            </div>
            <div style="padding: 2.5mm; position: relative; z-index: 1;">
                <div style="display: flex; gap: 3mm; align-items: flex-start;">
                    <div class="photo-container-luxury" style="width: 25mm; height: 32mm; border: 0.8mm solid #1e3a8a; background: #f1f5f9; border-radius: 1mm;">
                         ${
                             data.photo
                                 ? `<img src="${data.photo}" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;">`
                                 : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center;"><img src="${data.schoolLogo}" style="width:50%; opacity:0.15;"></div>`
                         }
                    </div>
                    <div style="flex: 1; text-align: left;">
                         <div style="font-weight: 950; font-size: 14pt; color: #1e3a8a; margin-bottom: 1.5mm; line-height: 1; text-transform: uppercase;">${data.name}</div>
                         <div style="background: #fbbf24; color: #1e3a8a; padding: 0.2mm 1.5mm; font-weight: 950; font-size: 7.5pt; display: inline-block; border-radius: 0.5mm;">CLASS: ${data.class}</div>
                         <div style="margin-top: 2.5mm; font-size: 7.5pt; color: #334155; line-height: 1.4;">
                             <b>SID:</b> ${data.studentId}<br>
                             <b>FATHER:</b> ${data.fatherName}<br>
                             <b>PHONE:</b> ${data.mobile}
                         </div>
                    </div>
                </div>
                <div style="margin-top: 3mm; padding: 1.5mm; background: #f8fafc; border-radius: 1mm; border: 0.2mm solid #e2e8f0; font-size: 7pt; color: #475569; line-height: 1.2;">
                    <b style="color: #1e3a8a;">ROLL: #${data.rollNo}</b> | <b style="color: #1e3a8a;">ADDR:</b> ${data.address}
                </div>
            </div>
            <div style="position: absolute; bottom: 8mm; right: 4mm; text-align: center; position: relative; z-index: 1; margin-top: 2mm;">
                 <div style="text-align: right; padding-right: 4mm;">
                      <img src="/images/principal-sign.png" style="height: 9mm; mix-blend-mode: multiply;">
                      <div style="font-size: 4.5pt; font-weight: 950; color: #1e3a8a; text-transform: uppercase; border-top: 0.2mm solid #1e3a8a; display: inline-block;">Auth Sign</div>
                 </div>
            </div>
            <div style="position: absolute; bottom: 0; width: 100%; background: #1e3a8a; height: 5mm; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 4.8pt; font-weight: 900;">
                 <i class="fas fa-globe"></i>&nbsp; ${data.schoolWebsite} &nbsp;|&nbsp; <i class="fas fa-phone"></i>&nbsp; ${data.schoolContact}
            </div>
        </div>
    `,

    // Format 3: Wave Dark - CR80 Vertical
    format3: (data) => `
        <div class="id-card-wrapper temp-luxury-wave ${data.orientation}" style="width: 54mm; height: 86mm; background: #fff; border-radius: 3mm; overflow: hidden; border: 0.4mm solid #1e1b4b; position: relative; font-family: 'Inter', sans-serif; box-sizing: border-box;">
            <div class="luxury-bg-logo" style="position:absolute; inset:0; background: url('${data.schoolLogo}') center/contain no-repeat; opacity:0.04; z-index:0;"></div>
            <div class="luxury-header-wave" style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding: 2.5mm; text-align: center; position: relative; min-height: 25mm; box-sizing: border-box;">
                 <img src="${data.schoolLogo}" style="height: 8mm; filter: drop-shadow(0 0 5px rgba(251,191,36,0.5)); margin-bottom: 1mm;">
                 <div style="font-weight: 950; font-size: 9.5pt; color: #fff; text-transform: uppercase;">${data.schoolName}</div>
                 <div style="font-size: 4.5pt; color: #fbbf24; font-weight: 800; letter-spacing: 1mm;">EXCELLENCE IN EDUCATION</div>
            </div>
            <div style="text-align: center; margin-top: -12mm; position: relative; z-index: 5;">
                <div class="luxury-photo-ring" style="width: 28mm; height: 28mm; border: 1mm solid #fff; border-radius: 50%; box-shadow: 0 4px 10px rgba(0,0,0,0.2); background: #fff; margin: 0 auto; overflow: hidden;">
                     ${
                         data.photo
                             ? `<img src="${data.photo}" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;">`
                             : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; opacity:0.1;"><img src="${data.schoolLogo}" style="width:50%;"></div>`
                     }
                </div>
            </div>
            <div style="padding: 2mm 5mm; text-align: center; position: relative; z-index: 1;">
                <div style="font-weight: 950; font-size: 14pt; color: #1e1b4b; text-transform: uppercase;">${data.name}</div>
                <div style="height: 0.5mm; background: linear-gradient(90deg, transparent, #fbbf24, transparent); margin: 2mm 0;"></div>
                <table style="width: 100%; font-size: 7.5pt; border-collapse: separate; border-spacing: 0 1mm;">
                     <tr><td style="color: #64748b; font-weight: 800; text-align: left; font-size: 5.5pt;">FATHER</td><td style="font-weight: 900; text-align: right; color:#1e1b4b;">${data.fatherName}</td></tr>
                     <tr><td style="color: #64748b; font-weight: 800; text-align: left; font-size: 5.5pt;">CLASS</td><td style="font-weight: 900; text-align: right; color:#1e1b4b;">${data.class} (${data.rollNo})</td></tr>
                     <tr><td style="color: #64748b; font-weight: 800; text-align: left; font-size: 5.5pt;">ID / MOB</td><td style="font-weight: 900; text-align: right; color:#1e1b4b;">${data.studentId} / ${data.mobile}</td></tr>
                </table>
                <div style="margin-top: 1.5mm; font-size: 6.5pt; color: #64748b; line-height: 1.1; display: block; max-height: 6mm; overflow: hidden;"><b>ADDR:</b> ${data.address}</div>
            </div>
            <div style="position: absolute; bottom: 0; width: 100%; height: 14mm; background: #f8fafc; border-top: 0.3mm dashed #cbd5e1; display: flex; align-items: center; justify-content: space-between; padding: 0 5mm; box-sizing: border-box;">
                 <div style="text-align: left; font-size: 4.2pt; color: #64748b; font-weight: 900;">
                     <i class="fas fa-phone"></i> ${data.schoolContact}<br>
                     <i class="fas fa-envelope"></i> help@apex.com
                 </div>
                 <div style="text-align: center;">
                      <img src="/images/principal-sign.png" style="height: 8mm; mix-blend-mode: multiply;">
                      <div style="font-size: 4pt; font-weight: 950; color: #1e1b4b; border-top: 0.3mm solid #1e1b4b; text-transform: uppercase;">Principal</div>
                 </div>
            </div>
        </div>
    `,

    // Format 4: Curve Primary - CR80 Vertical
    format4: (data) => `
        <div class="id-card-wrapper temp-luxury-modern ${data.orientation}" style="width: 54mm; height: 86mm; background: #fff; border: 1mm solid #0f172a; position: relative; overflow: hidden; font-family: 'Inter', sans-serif; box-sizing: border-box;">
            <div class="header-peak" style="background: #0f172a; padding: 3mm 2.5mm; clip-path: polygon(0 0, 100% 0, 100% 88%, 0 100%); text-align: center; min-height: 20mm;">
                 <div style="display: flex; align-items: center; justify-content: center; gap: 2.5mm;">
                     <img src="${data.schoolLogo}" style="height: 8mm; filter: brightness(0) invert(1);">
                     <div style="text-align: left;">
                         <div style="font-weight: 950; font-size: 9pt; color: #fff; line-height: 1;">${data.schoolName}</div>
                         <div style="font-size: 5pt; font-weight: 900; color: #fbbf24; text-transform: uppercase;">IDENTITY CARD</div>
                     </div>
                 </div>
            </div>
            <div style="padding: 2.5mm 4mm;">
                 <div style="display: flex; gap: 4mm; align-items: flex-start;">
                     <div style="width: 26mm; height: 32mm; border: 0.8mm solid #0f172a; border-radius: 1mm; overflow: hidden; background: #f1f5f9;">
                          ${
                              data.photo
                                  ? `<img src="${data.photo}" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;">`
                                  : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#cbd5e1;"><i class="fas fa-user" style="font-size:1.5rem;"></i></div>`
                          }
                     </div>
                     <div style="flex: 1; text-align: left;">
                          <div style="font-weight: 950; font-size: 15pt; color: #0f172a; text-transform: uppercase; line-height: 0.9; margin-bottom: 2mm;">${data.name}</div>
                          <div style="background: #0f172a; color: #fff; padding: 0.5mm 2.5mm; font-weight: 950; font-size: 7.5pt; display: inline-block;">SID: ${data.studentId}</div>
                          <div style="margin-top: 3mm; border-left: 1mm solid #fbbf24; padding-left: 2.5mm;">
                               <b style="font-size: 5pt; color: #64748b; text-transform: uppercase;">FATHER</b><br><span style="font-weight: 950; font-size: 8.5pt; color:#0f172a;">${data.fatherName}</span>
                          </div>
                     </div>
                 </div>
            </div>
            <div style="padding: 0 4mm; margin-top: 1.5mm;">
                 <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3.5mm; border-top: 0.2mm solid #e2e8f0; padding-top: 2.5mm;">
                      <div><b style="font-size: 5.5pt; color:#64748b;">CLASS:</b><br><span style="font-weight:950; font-size:8.5pt; color:#0f172a;">Gr. ${data.class}</span></div>
                      <div><b style="font-size: 5.5pt; color:#64748b;">ROLL:</b><br><span style="font-weight:950; font-size:8.5pt; color:#0f172a;">#${data.rollNo}</span></div>
                      <div><b style="font-size: 5.5pt; color:#64748b;">DOB:</b><br><span style="font-weight:950; font-size:8.5pt; color:#0f172a;">${data.dateOfBirth}</span></div>
                      <div><b style="font-size: 5.5pt; color:#64748b;">PH:</b><br><span style="font-weight:950; font-size:8.5pt; color:#0f172a;">${data.mobile}</span></div>
                 </div>
                 <div style="margin-top: 3mm; font-size: 6.5pt; color: #475569; line-height: 1.1; max-height: 8mm; overflow: hidden;"><b style="color:#0f172a;">ADDR:</b> ${data.address}</div>
            </div>
            <div style="position: absolute; bottom: 3mm; width: 100%; padding: 0 4mm; display: flex; justify-content: space-between; align-items: flex-end; box-sizing: border-box;">
                 <div style="font-size: 4.5pt; color: #64748b; font-weight: 950; opacity: 0.6;">SECURITY PASS v4.0</div>
                 <div style="text-align: center;">
                      <img src="/images/principal-sign.png" style="height: 8mm; mix-blend-mode: multiply;">
                      <div style="font-size: 4pt; font-weight: 950; border-top: 0.3mm solid #0f172a; text-transform: uppercase; color: #0f172a;">Issuing Auth</div>
                 </div>
            </div>
        </div>
    `,

    // Format 5: Stark Modern - CR80 Vertical
    format5: (data) => `
        <div class="id-card-wrapper temp-luxury-gold ${data.orientation}" style="width: 54mm; height: 86mm; background: #fff; border: 1.25mm solid #fbbf24; outline: 0.8mm solid #1e293b; outline-offset: -2mm; position: relative; font-family: 'Inter', sans-serif; overflow: hidden; box-sizing: border-box;">
            <div style="text-align: center; padding: 4mm 4mm 1.5mm; position: relative; z-index: 1;">
                 <img src="${data.schoolLogo}" style="height: 8mm; margin-bottom: 1.5mm;">
                 <div style="font-weight: 950; font-size: 10pt; color: #1e293b; text-transform: uppercase; line-height: 1;">${data.schoolName}</div>
                 <div style="font-size: 4.5pt; font-weight: 900; color: #9a3412; letter-spacing: 0.5mm; text-transform: uppercase;">PREMIUM EDUCATION CENTER</div>
            </div>
            <div style="text-align: center; position: relative; z-index: 1;">
                 <div style="width: 28mm; height: 34mm; border: 1mm double #fbbf24; margin: 0 auto; background: #fff; padding: 0.5mm; border-radius: 0.5mm;">
                      ${
                          data.photo
                              ? `<img src="${data.photo}" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;">`
                              : `<div style="width:100%; height:100%; opacity:0.1; display:flex; align-items:center; justify-content:center;"><img src="${data.schoolLogo}" style="width:60%;"></div>`
                      }
                 </div>
            </div>
            <div style="padding: 2.5mm 5mm; text-align: center; position: relative; z-index: 1;">
                 <div style="font-weight: 950; font-size: 14pt; color: #9a3412; text-transform: uppercase; line-height: 1;">${data.name}</div>
                 <div style="display: flex; justify-content: center; gap: 3mm; margin-top: 2.5mm;">
                      <span style="font-size: 7.5pt; font-weight: 950; color: #1e293b; background: rgba(251,191,36,0.2); padding: 0.2mm 2mm; border-radius: 0.5mm;">ROLL: #${data.rollNo}</span>
                      <span style="font-size: 7.5pt; font-weight: 950; color: #1e293b; background: rgba(30,41,59,0.1); padding: 0.2mm 2mm; border-radius: 0.5mm;">SID: ${data.studentId}</span>
                 </div>
                 <div style="margin-top: 3mm; border-top: 0.2mm solid #e2e8f0; padding-top: 2.5mm;">
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; text-align: left;">
                           <div><b style="font-size: 5pt; color: #64748b;">FATHER:</b><br><span style="font-weight: 950; font-size: 8pt; color: #1e293b;">${data.fatherName}</span></div>
                           <div><b style="font-size: 5pt; color: #64748b;">CLASS:</b><br><span style="font-weight: 950; font-size: 8pt; color: #1e293b;">Gr. ${data.class}</span></div>
                           <div><b style="font-size: 5pt; color: #64748b;">PHONE:</b><br><span style="font-weight: 950; font-size: 8pt; color: #1e293b;">${data.mobile}</span></div>
                           <div><b style="font-size: 5pt; color: #64748b;">DOB:</b><br><span style="font-weight: 950; font-size: 8pt; color: #1e293b;">${data.dateOfBirth}</span></div>
                      </div>
                      <div style="margin-top: 2.5mm; font-size: 6.5pt; color: #475569; text-align: left; max-height: 7mm; overflow: hidden;"><b style="color:#1e293b;">ADDR:</b> ${data.address}</div>
                 </div>
            </div>
            <div style="position: absolute; bottom: 3mm; width: 100%; padding: 0 5mm; display: flex; justify-content: space-between; align-items: flex-end; box-sizing: border-box;">
                 <div style="text-align: left; font-size: 4pt; color: #64748b; font-weight: 800; opacity: 0.7;">VERIFIED AUTHENTIC</div>
                 <div style="text-align: center;">
                      <img src="/images/principal-sign.png" style="height: 8mm; mix-blend-mode: multiply;">
                      <div style="font-size: 4pt; font-weight: 950; color: #1e293b; border-top: 0.4mm solid #1e293b; text-transform: uppercase;">Principal</div>
                 </div>
            </div>
        </div>
    `,

    // Format 6: Poppins Elite - CR80 Vertical
    format6: (data) => `
        <div class="id-card-wrapper temp-poppins-elite ${data.orientation}" style="width: 54mm; height: 86mm; background: white; border-radius: 3mm; box-shadow: 0 4px 10px rgba(0,0,0,0.1); overflow: hidden; position: relative; font-family: 'Poppins', sans-serif; box-sizing: border-box; border: 0.2mm solid #ddd;">
            <div class="header" style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 3mm 4mm; text-align: center; color: white;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 2.5mm; margin-bottom: 1.5mm;">
                    <img src="${data.schoolLogo}" style="height: 6mm; background: white; border-radius: 50%; padding: 1px;">
                    <div style="font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2px; line-height: 1.1;">${data.schoolName}</div>
                </div>
                <div style="font-size: 6.5pt; opacity: 0.9; font-weight: 300;">Identity Card 2024-25</div>
            </div>
            <div class="photo-area" style="display: flex; justify-content: center; margin-top: -8mm; position: relative; z-index: 2;">
                <div class="photo-frame" style="width: 25mm; height: 25mm; background-color: #f1f5f9; border: 1mm solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.1); overflow: hidden; display: flex; align-items: center; justify-content: center;">
                    ${
                        data.photo
                            ? `<img src="${data.photo}" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;">`
                            : `<div style="text-align: center;"><i class="fas fa-user" style="font-size: 2rem; color: #cbd5e1;"></i></div>`
                    }
                </div>
            </div>
            <div class="content" style="padding: 2mm 5mm; text-align: center;">
                <div class="student-name" style="font-size: 14pt; font-weight: 800; color: #1e3c72; margin-bottom: 1mm; text-transform: uppercase; line-height: 1.1;">${data.name}</div>
                <div class="value" style="font-size: 8pt; color: #FF4B2B; font-weight: 700;">Gr. ${data.class} | Roll: #${data.rollNo}</div>
                <div class="info-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin-top: 4mm; text-align: left;">
                    <div class="info-item">
                        <strong style="display: block; font-size: 5.5pt; color: #1e3c72; text-transform: uppercase;">Father</strong>
                        <span style="font-size: 8.5pt; color: #333; font-weight: 700;">${data.fatherName}</span>
                    </div>
                    <div class="info-item">
                        <strong style="display: block; font-size: 5.5pt; color: #1e3c72; text-transform: uppercase;">ID No</strong>
                        <span style="font-size: 8.5pt; color: #333; font-weight: 700;">${data.studentId}</span>
                    </div>
                </div>
                <div style="margin-top: 3mm; text-align: left;">
                    <strong style="display: block; font-size: 5.5pt; color: #1e3c72; text-transform: uppercase;">Address</strong>
                    <span style="font-size: 7.5pt; color: #444; line-height: 1.2; display: block; max-height: 8mm; overflow: hidden;">${data.address}</span>
                </div>
            </div>
            <div class="footer" style="position: absolute; bottom: 0; width: 100%; background: #f8fafc; padding: 2.5mm 5mm; border-top: 0.2mm solid #eee; display: flex; justify-content: space-between; align-items: flex-end; box-sizing: border-box;">
                <div style="line-height: 1.2;">
                    <strong style="color: #1e3c72; font-size: 7.5pt;">PH:</strong> <span style="font-size: 7.5pt; color: #333;">${data.mobile}</span><br>
                    <span style="font-size: 6pt; color: #888;">${data.schoolWebsite}</span>
                </div>
                <div class="signature-box" style="text-align: center;">
                    <img src="/images/principal-sign.png" style="height: 8mm; margin-bottom: -1mm; mix-blend-mode: multiply;">
                    <div style="width: 60px; border-bottom: 0.3mm solid #333; margin: 0 auto 1mm;"></div>
                    <div style="font-weight: 800; color: #1e3c72; text-transform: uppercase; font-size: 5.5pt;">Principal</div>
                </div>
            </div>
        </div>
    `,

    // Format 7: Modern Tech H1 - CR80 Horizontal (86mm x 54mm)
    format7: (data) => `
        <div class="id-card-wrapper temp-modern-tech-h ${data.orientation}" style="width: 86mm; height: 54mm; background: white; border-radius: 4mm; box-shadow: 0 10px 25px rgba(0,0,0,0.15); display: flex; overflow: hidden; font-family: 'Poppins', sans-serif; box-sizing: border-box; border: 0.2mm solid #ddd;">
            <div class="left-panel" style="width: 30%; background: linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; position: relative; padding: 2mm;">
                <div class="school-name-side" style="position: absolute; top: 3mm; font-size: 8pt; font-weight: 800; text-transform: uppercase; text-align: center; width: 90%; line-height: 1.1;">${data.schoolName}</div>
                <div class="photo-frame-side" style="width: 22mm; height: 22mm; background: rgba(255,255,255,0.25); border-radius: 2mm; margin-top: 4mm; display: flex; align-items: center; justify-content: center; border: 0.5mm solid rgba(255,255,255,0.4); overflow: hidden;">
                    ${
                        data.photo
                            ? `<img src="${data.photo}" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;">`
                            : `<div style="font-size:6pt; font-weight:700;">PHOTO</div>`
                    }
                </div>
                <div style="margin-top: 3mm; background: rgba(0,0,0,0.15); padding: 0.5mm 3mm; border-radius: 1mm; font-size: 7.5pt; font-weight: 800;">ID: ${data.studentId}</div>
            </div>
            <div class="right-panel" style="width: 70%; padding: 4mm 6mm; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
                <div class="header-row" style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h2 class="student-name-side" style="font-size: 16pt; font-weight: 800; color: #2d3436; margin: 0; line-height: 1; text-transform: uppercase;">${data.name}</h2>
                        <div class="student-sub" style="font-size: 9pt; color: #FF4B2B; font-weight: 700; margin-top: 1.5mm;">CLASS ${data.class} | ROLL ${data.rollNo}</div>
                    </div>
                    <img src="${data.schoolLogo}" style="height: 8mm;">
                </div>
                <div class="details-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; margin-top: 2mm;">
                    <div class="detail-box" style="background: #f8f9fa; padding: 1.5mm 3mm; border-radius: 1.5mm; border-left: 1mm solid #FF4B2B;">
                        <span style="font-size: 5.5pt; color: #888; text-transform: uppercase; display: block;">Father</span>
                        <span style="font-size: 9pt; color: #2d3436; font-weight: 800;">${data.fatherName}</span>
                    </div>
                    <div class="detail-box" style="background: #f8f9fa; padding: 1.5mm 3mm; border-radius: 1.5mm; border-left: 1mm solid #FF4B2B;">
                        <span style="font-size: 5.5pt; color: #888; text-transform: uppercase; display: block;">Contact</span>
                        <span style="font-size: 9pt; color: #2d3436; font-weight: 800;">${data.mobile}</span>
                    </div>
                    <div class="detail-box full" style="grid-column: span 2; background: #f8f9fa; padding: 1.5mm 3mm; border-radius: 1.5mm; border-left: 1mm solid #FF4B2B;">
                        <span style="font-size: 5.5pt; color: #888; text-transform: uppercase; display: block;">Address</span>
                        <span style="font-size: 8pt; color: #2d3436; font-weight: 600; line-height: 1.1; display: block; max-height: 6mm; overflow: hidden;">${data.address}</span>
                    </div>
                </div>
                <div class="footer-side" style="margin-top: 2mm; display: flex; justify-content: space-between; align-items: flex-end; border-top: 0.2mm solid #eee; padding-top: 2mm;">
                    <div style="font-size: 7.5pt; color: #636e72;"><strong>PH:</strong> ${data.schoolContact}</div>
                    <div class="sign-area" style="text-align: right;">
                        <img src="/images/principal-sign.png" style="height: 7mm; mix-blend-mode: multiply; margin-bottom: -1mm;">
                        <span style="width: 25mm; height: 0.3mm; background: #2d3436; display: block; margin-bottom: 0.5mm;"></span>
                        <span style="font-size: 6pt; font-weight: 800; color:#2d3436; text-transform:uppercase;">Principal</span>
                    </div>
                </div>
            </div>
        </div>
    `,

    // Format 8: Modern Tech Design 2 - CR80 Horizontal
    format8: (data) => `
        <div class="id-card-wrapper temp-modern-tech-v2 ${data.orientation}" style="width: 86mm; height: 54mm; background: white; border-radius: 4mm; box-shadow: 0 15px 35px rgba(0,0,0,0.2); display: flex; overflow: hidden; font-family: 'Poppins', sans-serif; box-sizing: border-box; border: 0.2mm solid #ddd;">
            <div class="left-panel" style="width: 34%; background: linear-gradient(145deg, #FF416C 0%, #FF4B2B 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; position: relative; padding: 3mm;">
                <div class="school-name-side" style="position: absolute; top: 3.5mm; left: 0; right: 0; font-size: 8.5pt; font-weight: 800; text-transform: uppercase; text-align: center; line-height: 1.1;">${data.schoolName}</div>
                <div class="photo-frame-side" style="width: 24mm; height: 24mm; background: rgba(255,255,255,0.2); border-radius: 3mm; margin-top: 5mm; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); border: 0.6mm solid rgba(255,255,255,0.35); overflow: hidden;">
                    ${
                        data.photo
                            ? `<img src="${data.photo}" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;">`
                            : `<div style="font-size:20pt;">👤</div>`
                    }
                </div>
                <div style="margin-top: 4mm; display: flex; flex-direction: column; align-items: center;">
                    <div style="background: rgba(255,255,255,0.25); padding: 0.2mm 3mm; border-radius: 1mm; font-size: 8pt; font-weight: 800;">${data.studentId}</div>
                    <span style="font-size: 5pt; opacity: 0.9; margin-top: 1mm; font-weight: 600; text-transform: uppercase;">Identity No</span>
                </div>
            </div>
            <div class="right-panel" style="width: 66%; padding: 4mm 6mm; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
                <div class="header-row" style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="flex: 1; margin-right: 3mm;">
                        <h2 class="student-name-side" style="font-size: 18pt; font-weight: 800; color: #2d3436; margin: 0; line-height: 1; text-transform: uppercase;">${data.name}</h2>
                        <div class="student-sub" style="font-size: 10pt; color: #FF4B2B; font-weight: 700; display: flex; align-items: center; gap: 2mm; margin-top: 1.5mm;">
                            <span style="width: 15px; height: 0.8mm; background: #FF4B2B; border-radius: 0.5mm;"></span>
                            GR ${data.class} | ROLL ${data.rollNo}
                        </div>
                    </div>
                    <img src="${data.schoolLogo}" style="height: 9mm;">
                </div>
                <div class="details-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; margin-top: 2mm;">
                    <div class="detail-box" style="background: #f1f3f5; padding: 1.5mm 3mm; border-radius: 2mm; border-left: 1mm solid #FF4B2B;">
                        <span style="font-size: 5.5pt; color: #adb5bd; text-transform: uppercase; font-weight: 800;">Father</span>
                        <span style="font-size: 9.5pt; color: #2d3436; font-weight: 800; line-height: 1;">${data.fatherName}</span>
                    </div>
                    <div class="detail-box" style="background: #f1f3f5; padding: 1.5mm 3mm; border-radius: 2mm; border-left: 1mm solid #FF4B2B;">
                        <span style="font-size: 5.5pt; color: #adb5bd; text-transform: uppercase; font-weight: 800;">PH</span>
                        <span style="font-size: 9.5pt; color: #2d3436; font-weight: 800; line-height: 1;">${data.mobile}</span>
                    </div>
                    <div class="detail-box full" style="grid-column: span 2; background: #f1f3f5; padding: 1.5mm 3mm; border-radius: 2mm; border-left: 1mm solid #FF4B2B;">
                        <span style="font-size: 5.5pt; color: #adb5bd; text-transform: uppercase; font-weight: 800;">Address</span>
                        <span style="font-size: 8pt; color: #2d3436; font-weight: 600; line-height: 1.1; max-height: 6mm; overflow: hidden; display: block;">${data.address}</span>
                    </div>
                </div>
                <div class="footer-side" style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 0.4mm dashed #dee2e6; padding-top: 2mm; margin-top: 1.5mm;">
                    <div style="font-size: 6.5pt; color: #495057; line-height: 1.2;">
                        <strong style="color: #2d3436; font-size: 7.5pt;">Contact</strong><br>${data.schoolContact}
                    </div>
                    <div class="sign-area" style="text-align: center;">
                        <img src="/images/principal-sign.png" style="height: 8mm; mix-blend-mode: multiply; margin-bottom: -1mm;">
                        <span style="width: 30mm; height: 0.4mm; background: #2d3436; display: block; margin-bottom: 0.5mm;"></span>
                        <span style="font-size: 6.5pt; color: #2d3436; text-transform: uppercase; font-weight: 800;">Principal</span>
                    </div>
                </div>
            </div>
        </div>
    `,

    // ─────────────────────────────────────────────────────────────────────────
    // 5 PREMIUM SCHOOL ID CARD TEMPLATES (Internet-Grade Professional Quality)
    // ─────────────────────────────────────────────────────────────────────────

    // Format 9: GRADIENT ELITE — Full-bleed royal blue gradient, glowing photo ring
    // Style: Premium vertical card, very popular in central school / KVS style
    format9: (data) => `
        <div class="id-card-wrapper temp-gradient-elite ${data.orientation}" style="width:54mm;height:86mm;background:linear-gradient(160deg,#1e3c72 0%,#2a5298 55%,#1a237e 100%);border-radius:3mm;overflow:hidden;position:relative;font-family:'Poppins',sans-serif;box-sizing:border-box;">
            <!-- Decorative circles -->
            <div style="position:absolute;top:-12mm;right:-12mm;width:40mm;height:40mm;border-radius:50%;background:rgba(255,255,255,0.06);"></div>
            <div style="position:absolute;bottom:-8mm;left:-8mm;width:28mm;height:28mm;border-radius:50%;background:rgba(255,255,255,0.04);"></div>

            <!-- Header: Logo + School Name -->
            <div style="padding:3mm 3mm 1.5mm;display:flex;align-items:center;justify-content:center;gap:2mm;position:relative;z-index:2;">
                <img src="${data.schoolLogo}" style="height:9mm;filter:drop-shadow(0 0 6px rgba(255,255,255,0.5));background:white;border-radius:50%;padding:1px;">
                <div style="color:#fff;text-align:left;">
                     <div style="font-weight:800;font-size:9pt;line-height:1;text-transform:uppercase;letter-spacing:0.3px;">${data.schoolName}</div>
                    <div style="font-size:4.5pt;opacity:0.8;font-weight:500;letter-spacing:1px;text-transform:uppercase;">${data.schoolTagline || 'Excellence · Integrity · Growth'}</div>
                </div>
            </div>

            <!-- Gold Divider -->
            <div style="height:0.6mm;background:linear-gradient(90deg,transparent,#ffd700,transparent);margin:0 4mm;"></div>

            <!-- Student Photo (Glowing Ring) -->
            <div style="text-align:center;margin-top:3mm;position:relative;z-index:2;">
                <div style="width:28mm;height:28mm;border-radius:50%;margin:0 auto;padding:1mm;background:linear-gradient(135deg,#ffd700,#fff,#ffd700);box-shadow:0 0 16px rgba(255,215,0,0.45);">
                    <div style="width:100%;height:100%;border-radius:50%;overflow:hidden;background:#1e3c72;">
                        ${data.photo
                            ? `<img src="${data.photo}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;object-position:center top;">`
                            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><img src="${data.schoolLogo}" style="width:55%;opacity:0.3;filter:brightness(0) invert(1);"></div>`
                        }
                    </div>
                </div>
                <!-- ID Badge below photo -->
                <div style="display:inline-block;background:rgba(255,215,0,0.2);border:0.4mm solid #ffd700;color:#ffd700;font-size:7pt;font-weight:800;padding:0.5mm 3mm;border-radius:50px;margin-top:1.5mm;letter-spacing:0.5px;">ID: ${data.studentId}</div>
            </div>

            <!-- Student Info -->
            <div style="padding:2.5mm 4.5mm;position:relative;z-index:2;">
                <div style="color:#fff;text-align:center;font-weight:800;font-size:13pt;text-transform:uppercase;line-height:1;letter-spacing:0.5px;">${data.name}</div>
                <div style="text-align:center;margin-top:1mm;margin-bottom:2.5mm;">
                    <span style="color:#ffd700;font-size:7.5pt;font-weight:700;">CLASS ${data.class}</span>
                    <span style="color:rgba(255,255,255,0.5);margin:0 1.5mm;">|</span>
                    <span style="color:#fff;font-size:7.5pt;font-weight:700;">ROLL #${data.rollNo}</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:2mm;">
                    <div style="background:rgba(255,255,255,0.1);border-radius:1.5mm;padding:1.5mm 2mm;">
                        <div style="color:rgba(255,215,0,0.8);font-size:4.5pt;font-weight:700;text-transform:uppercase;">Father</div>
                        <div style="color:#fff;font-size:7.5pt;font-weight:700;line-height:1.1;">${data.fatherName}</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.1);border-radius:1.5mm;padding:1.5mm 2mm;">
                        <div style="color:rgba(255,215,0,0.8);font-size:4.5pt;font-weight:700;text-transform:uppercase;">Mobile</div>
                        <div style="color:#fff;font-size:7.5pt;font-weight:700;line-height:1.1;">${data.mobile}</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.1);border-radius:1.5mm;padding:1.5mm 2mm;">
                        <div style="color:rgba(255,215,0,0.8);font-size:4.5pt;font-weight:700;text-transform:uppercase;">DOB</div>
                        <div style="color:#fff;font-size:7.5pt;font-weight:700;line-height:1.1;">${data.dateOfBirth}</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.1);border-radius:1.5mm;padding:1.5mm 2mm;">
                        <div style="color:rgba(255,215,0,0.8);font-size:4.5pt;font-weight:700;text-transform:uppercase;">Blood Group</div>
                        <div style="color:#ff6b6b;font-size:8pt;font-weight:900;">${data.bloodGroup || 'N/A'}</div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div style="position:absolute;bottom:0;width:100%;background:rgba(0,0,0,0.25);backdrop-filter:blur(4px);padding:1.5mm 4mm;box-sizing:border-box;display:flex;justify-content:space-between;align-items:center;">
                <div style="color:rgba(255,255,255,0.75);font-size:4.5pt;font-weight:600;line-height:1.3;">
                    📞 ${data.schoolContact}<br>
                    🌐 ${data.schoolWebsite}
                </div>
                <div style="text-align:center;">
                    <img src="/images/principal-sign.png" style="height:6mm;filter:brightness(0) invert(1);opacity:0.7;mix-blend-mode:screen;">
                    <div style="color:rgba(255,255,255,0.8);font-size:4pt;font-weight:800;border-top:0.3mm solid rgba(255,255,255,0.3);text-transform:uppercase;margin-top:0.5mm;">Principal</div>
                </div>
            </div>
        </div>
    `,

    // Format 10: STARK MODERN — Horizontal minimalist, bold side-bar accent
    // Style: Clean white card, single color sidebar, very modern, popular in CBSE schools
    format10: (data) => `
        <div class="id-card-wrapper temp-stark-modern ${data.orientation}" style="width:86mm;height:54mm;background:#fff;border-radius:2mm;overflow:hidden;display:flex;font-family:'Inter',sans-serif;box-sizing:border-box;border:0.3mm solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,0.1);">
            <!-- Bold Side Color Bar -->
            <div style="width:4mm;background:linear-gradient(180deg,#7c3aed 0%,#4f46e5 100%);flex-shrink:0;"></div>

            <!-- Student Photo -->
            <div style="width:28mm;flex-shrink:0;background:#f1f5f9;display:flex;align-items:center;justify-content:center;border-right:0.4mm solid #e2e8f0;">
                <div style="width:24mm;height:30mm;overflow:hidden;border-radius:1mm;border:0.5mm solid #7c3aed;">
                    ${data.photo
                        ? `<img src="${data.photo}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;object-position:center top;">`
                        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#cbd5e1;flex-direction:column;background:#fff;"><i class="fas fa-user" style="font-size:1.5rem;"></i></div>`
                    }
                </div>
            </div>

            <!-- Main Content -->
            <div style="flex:1;padding:3.5mm 4mm;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;">
                <!-- School Header -->
                <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:0.5mm solid #e2e8f0;padding-bottom:2mm;margin-bottom:2mm;">
                    <div>
                        <div style="font-weight:900;font-size:9pt;color:#1e293b;line-height:1;text-transform:uppercase;">${data.schoolName}</div>
                        <div style="font-size:5pt;color:#7c3aed;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Identity Card — ${data.session || '2025-26'}</div>
                    </div>
                    <img src="${data.schoolLogo}" style="height:8mm;opacity:0.85;">
                </div>

                <!-- Student Name -->
                <div>
                    <div style="font-size:16pt;font-weight:900;color:#0f172a;line-height:0.9;text-transform:uppercase;">${data.name}</div>
                    <div style="margin-top:1mm;display:flex;gap:2mm;align-items:center;">
                        <span style="background:#7c3aed;color:#fff;font-size:6.5pt;font-weight:800;padding:0.3mm 2mm;border-radius:50px;">GR. ${data.class}</span>
                        <span style="color:#64748b;font-size:6.5pt;font-weight:700;">Roll #${data.rollNo}</span>
                        <span style="color:#64748b;font-size:6.5pt;font-weight:700;">|</span>
                        <span style="color:#64748b;font-size:6.5pt;font-weight:700;">SID: ${data.studentId}</span>
                    </div>
                </div>

                <!-- Details Grid -->
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5mm;">
                    <div>
                        <div style="font-size:4.5pt;color:#94a3b8;font-weight:700;text-transform:uppercase;">Father</div>
                        <div style="font-size:8pt;color:#1e293b;font-weight:700;">${data.fatherName}</div>
                    </div>
                    <div>
                        <div style="font-size:4.5pt;color:#94a3b8;font-weight:700;text-transform:uppercase;">Mobile</div>
                        <div style="font-size:8pt;color:#1e293b;font-weight:700;">${data.mobile}</div>
                    </div>
                    <div>
                        <div style="font-size:4.5pt;color:#94a3b8;font-weight:700;text-transform:uppercase;">DOB</div>
                        <div style="font-size:8pt;color:#1e293b;font-weight:700;">${data.dateOfBirth}</div>
                    </div>
                    <div>
                        <div style="font-size:4.5pt;color:#94a3b8;font-weight:700;text-transform:uppercase;">Blood</div>
                        <div style="font-size:8pt;color:#ef4444;font-weight:900;">${data.bloodGroup || 'N/A'}</div>
                    </div>
                </div>

                <!-- Footer -->
                <div style="display:flex;justify-content:space-between;align-items:flex-end;border-top:0.4mm solid #e2e8f0;padding-top:1.5mm;">
                    <div style="font-size:5pt;color:#64748b;">
                        📞 ${data.schoolContact} &nbsp;|&nbsp; 🌐 ${data.schoolWebsite}
                    </div>
                    <div style="text-align:center;">
                        <img src="/images/principal-sign.png" style="height:6mm;mix-blend-mode:multiply;">
                        <div style="font-size:4pt;font-weight:800;color:#0f172a;border-top:0.3mm solid #0f172a;text-transform:uppercase;">Principal</div>
                    </div>
                </div>
            </div>
        </div>
    `,

    // Format 11: ROYAL MAROON — Premium maroon-gold school theme
    // Style: Traditional, premium, used by top ICSE/ISC private schools
    format11: (data) => `
        <div class="id-card-wrapper temp-royal-maroon ${data.orientation}" style="width:54mm;height:86mm;background:#fff;border-radius:2mm;overflow:hidden;position:relative;font-family:'Times New Roman',Georgia,serif;box-sizing:border-box;border:1mm solid #7b0000;">
            <!-- Inner border -->
            <div style="position:absolute;inset:1.5mm;border:0.3mm solid #d4a017;border-radius:1mm;pointer-events:none;z-index:10;"></div>

            <!-- Royal Header -->
            <div style="background:linear-gradient(135deg,#7b0000 0%,#9b1111 60%,#7b0000 100%);padding:3mm 2mm;text-align:center;position:relative;z-index:2;">
                <img src="${data.schoolLogo}" style="height:10mm;filter:drop-shadow(0 0 4px rgba(212,160,23,0.6));">
                <div style="color:#d4a017;font-size:9.5pt;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-top:1mm;line-height:1;">${data.schoolName}</div>
                <div style="color:rgba(255,255,255,0.75);font-size:5pt;font-style:italic;margin-top:0.5mm;">${data.schoolTagline || 'Excellence in Education'}</div>
                <!-- Gold divider -->
                <div style="height:0.6mm;background:linear-gradient(90deg,transparent,#d4a017,transparent);margin-top:2mm;"></div>
                <div style="color:#d4a017;font-size:6pt;font-weight:700;letter-spacing:2px;margin-top:1mm;text-transform:uppercase;">IDENTITY CARD</div>
            </div>

            <!-- Photo + ID -->
            <div style="text-align:center;margin-top:3mm;position:relative;z-index:2;">
                <div style="display:inline-block;padding:1mm;border:0.8mm solid #d4a017;background:#fff3cd;box-shadow:0 2px 8px rgba(123,0,0,0.15);">
                    <div style="width:26mm;height:32mm;overflow:hidden;background:#f5f5f5;">
                        ${data.photo
                            ? `<img src="${data.photo}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;object-position:center top;">`
                            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;opacity:0.2;"><img src="${data.schoolLogo}" style="width:60%;"></div>`
                        }
                    </div>
                </div>
                <div style="margin-top:1.5mm;font-size:6.5pt;font-weight:700;color:#7b0000;font-family:'Inter',sans-serif;">Reg. No.: ${data.studentId}</div>
            </div>

            <!-- Details -->
            <div style="padding:2mm 4.5mm;position:relative;z-index:2;">
                <div style="text-align:center;font-size:13pt;font-weight:700;color:#7b0000;text-transform:uppercase;border-bottom:0.5mm dotted #d4a017;padding-bottom:1.5mm;margin-bottom:2mm;line-height:1;">${data.name}</div>
                <table style="width:100%;font-family:'Inter',sans-serif;font-size:7pt;border-collapse:collapse;">
                    <tr><td style="color:#7b0000;font-weight:700;padding-bottom:1.5mm;width:35%;font-size:5.5pt;">CLASS</td><td style="font-weight:800;color:#1e293b;">${data.class} &nbsp;(Roll: ${data.rollNo})</td></tr>
                    <tr><td style="color:#7b0000;font-weight:700;padding-bottom:1.5mm;font-size:5.5pt;">FATHER</td><td style="font-weight:800;color:#1e293b;">${data.fatherName}</td></tr>
                    <tr><td style="color:#7b0000;font-weight:700;padding-bottom:1.5mm;font-size:5.5pt;">MOBILE</td><td style="font-weight:800;color:#1e293b;">${data.mobile}</td></tr>
                    <tr><td style="color:#7b0000;font-weight:700;padding-bottom:1.5mm;font-size:5.5pt;">DOB</td><td style="font-weight:800;color:#1e293b;">${data.dateOfBirth}</td></tr>
                </table>
            </div>

            <!-- Footer -->
            <div style="position:absolute;bottom:0;width:100%;background:linear-gradient(135deg,#7b0000,#9b1111);padding:2mm 4mm;box-sizing:border-box;display:flex;justify-content:space-between;align-items:center;">
                <div style="color:rgba(255,255,255,0.8);font-size:4.5pt;font-style:italic;">If found, please return to school</div>
                <div style="text-align:center;">
                    <img src="/images/principal-sign.png" style="height:6mm;filter:brightness(0) invert(1);opacity:0.7;">
                    <div style="color:#d4a017;font-size:4pt;font-weight:700;border-top:0.3mm solid #d4a017;text-transform:uppercase;margin-top:0.5mm;">Principal</div>
                </div>
            </div>
        </div>
    `,

    // Format 12: SAFFRON INDIA — National palette (Saffron + White + Green), republic style
    // Style: Patriotic theme, popular in government & aided schools
    format12: (data) => `
        <div class="id-card-wrapper temp-saffron-india ${data.orientation}" style="width:86mm;height:54mm;background:#fff;border-radius:2mm;overflow:hidden;display:flex;flex-direction:column;font-family:'Inter',sans-serif;box-sizing:border-box;border:0.5mm solid #ddd;box-shadow:0 2px 12px rgba(0,0,0,0.1);">
            <!-- Tricolor Header Stripe -->
            <div style="display:flex;height:3mm;flex-shrink:0;">
                <div style="flex:1;background:#FF9933;"></div>
                <div style="flex:1;background:#fff;border-top:0.3mm solid #eee;border-bottom:0.3mm solid #eee;"></div>
                <div style="flex:1;background:#138808;"></div>
            </div>

            <!-- Main Body -->
            <div style="flex:1;display:flex;padding:2.5mm;gap:3mm;box-sizing:border-box;">
                <!-- Left: School Branding -->
                <div style="width:20mm;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:space-between;border-right:0.4mm solid #e2e8f0;padding-right:3mm;">
                    <img src="${data.schoolLogo}" style="height:12mm;">
                    <div style="text-align:center;">
                        <div style="font-size:6pt;font-weight:900;color:#FF9933;text-transform:uppercase;line-height:1.1;">${data.schoolName}</div>
                    </div>
                    <!-- Photo -->
                    <div style="width:18mm;height:22mm;border:0.5mm solid #FF9933;overflow:hidden;background:#f8f8f8;">
                        ${data.photo
                            ? `<img src="${data.photo}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;object-position:center top;">`
                            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#ddd;"><i class="fas fa-user" style="font-size:1.5rem;"></i></div>`
                        }
                    </div>
                    <div style="font-size:5pt;font-weight:800;color:#1e293b;text-align:center;">ID: ${data.studentId}</div>
                </div>

                <!-- Right: Student Info -->
                <div style="flex:1;display:flex;flex-direction:column;justify-content:space-between;">
                    <div>
                        <div style="font-size:13pt;font-weight:900;color:#0f172a;text-transform:uppercase;line-height:0.95;">${data.name}</div>
                        <div style="display:flex;gap:1.5mm;margin-top:1mm;flex-wrap:wrap;">
                            <span style="background:#FF9933;color:#fff;font-size:6pt;font-weight:800;padding:0.3mm 2mm;border-radius:1mm;">CLASS ${data.class}</span>
                            <span style="background:#138808;color:#fff;font-size:6pt;font-weight:800;padding:0.3mm 2mm;border-radius:1mm;">ROLL #${data.rollNo}</span>
                        </div>
                    </div>

                    <table style="width:100%;font-size:7pt;border-collapse:collapse;margin-top:1mm;">
                        <tr><td style="color:#64748b;font-size:5pt;font-weight:700;text-transform:uppercase;padding-bottom:1mm;">Father 👨</td><td style="font-weight:800;color:#1e293b;">${data.fatherName}</td></tr>
                        <tr><td style="color:#64748b;font-size:5pt;font-weight:700;text-transform:uppercase;padding-bottom:1mm;">Mobile 📱</td><td style="font-weight:800;color:#1e293b;">${data.mobile}</td></tr>
                        <tr><td style="color:#64748b;font-size:5pt;font-weight:700;text-transform:uppercase;padding-bottom:1mm;">DOB 🎂</td><td style="font-weight:800;color:#1e293b;">${data.dateOfBirth}</td></tr>
                        <tr><td style="color:#64748b;font-size:5pt;font-weight:700;text-transform:uppercase;">Blood 🩸</td><td style="font-weight:800;color:#ef4444;">${data.bloodGroup || 'N/A'}</td></tr>
                    </table>

                    <div style="font-size:5pt;color:#94a3b8;">📞 ${data.schoolContact} &nbsp; 🌐 ${data.schoolWebsite}</div>
                </div>
            </div>

            <!-- Tricolor Footer Stripe -->
            <div style="display:flex;height:2.5mm;flex-shrink:0;">
                <div style="flex:1;background:#FF9933;"></div>
                <div style="flex:1;background:#fff;border-top:0.3mm solid #eee;"></div>
                <div style="flex:1;background:#138808;"></div>
            </div>
        </div>
    `,

    // Format 13: DEEP SPACE — Dark premium theme, holographic accent, modern tech feel
    // Style: Ultra-premium, used in elite private/international schools
    format13: (data) => `
        <div class="id-card-wrapper temp-deep-space ${data.orientation}" style="width:54mm;height:86mm;background:linear-gradient(145deg,#0a0a1a 0%,#0f172a 60%,#0a0a1a 100%);border-radius:3mm;overflow:hidden;position:relative;font-family:'Inter',sans-serif;box-sizing:border-box;border:0.5mm solid #1e293b;">
            <!-- Holographic accent line -->
            <div style="position:absolute;top:0;left:0;right:0;height:0.8mm;background:linear-gradient(90deg,#00f2fe,#4facfe,#a855f7,#ec4899,#fbbf24,#00f2fe);background-size:200%;z-index:10;"></div>

            <!-- Background glow blobs -->
            <div style="position:absolute;top:10mm;left:-10mm;width:35mm;height:35mm;border-radius:50%;background:radial-gradient(circle,rgba(168,85,247,0.12) 0%,transparent 70%);z-index:0;"></div>
            <div style="position:absolute;bottom:10mm;right:-5mm;width:30mm;height:30mm;border-radius:50%;background:radial-gradient(circle,rgba(79,172,254,0.1) 0%,transparent 70%);z-index:0;"></div>

            <!-- School Header -->
            <div style="padding:3.5mm 3mm 2mm;display:flex;align-items:center;justify-content:center;gap:2.5mm;position:relative;z-index:2;">
                <img src="${data.schoolLogo}" style="height:9mm;filter:drop-shadow(0 0 8px rgba(79,172,254,0.7));background:rgba(255,255,255,0.05);border-radius:50%;padding:1px;">
                <div style="text-align:left;">
                    <div style="font-weight:900;font-size:9pt;color:#f8fafc;text-transform:uppercase;line-height:1;letter-spacing:0.3px;">${data.schoolName}</div>
                    <div style="background:linear-gradient(90deg,#4facfe,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-size:5pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Student Identity Card</div>
                </div>
            </div>

            <!-- Holographic separator -->
            <div style="height:0.4mm;background:linear-gradient(90deg,transparent,#4facfe,#a855f7,transparent);margin:0 4mm;position:relative;z-index:2;"></div>

            <!-- Photo -->
            <div style="text-align:center;margin-top:3mm;position:relative;z-index:2;">
                <div style="width:26mm;height:26mm;margin:0 auto;border-radius:50%;padding:1mm;background:linear-gradient(135deg,#4facfe,#a855f7,#ec4899);box-shadow:0 0 20px rgba(79,172,254,0.35);">
                    <div style="width:100%;height:100%;border-radius:50%;overflow:hidden;background:#0f172a;">
                        ${data.photo
                            ? `<img src="${data.photo}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;object-position:center top;">`
                            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-user" style="font-size:1.5rem;color:rgba(255,255,255,0.2);"></i></div>`
                        }
                    </div>
                </div>
                <div style="display:inline-flex;align-items:center;gap:1mm;background:rgba(79,172,254,0.12);border:0.4mm solid rgba(79,172,254,0.5);border-radius:50px;padding:0.5mm 3mm;margin-top:1.5mm;">
                    <div style="width:2mm;height:2mm;border-radius:50%;background:#4facfe;box-shadow:0 0 4px #4facfe;"></div>
                    <span style="color:#e2e8f0;font-size:7pt;font-weight:800;">ID: ${data.studentId}</span>
                </div>
            </div>

            <!-- Student Info -->
            <div style="padding:2mm 4mm;position:relative;z-index:2;">
                <div style="text-align:center;font-weight:900;font-size:13pt;color:#f8fafc;text-transform:uppercase;line-height:1;">${data.name}</div>
                <div style="text-align:center;margin:1mm 0 2.5mm;">
                    <span style="background:linear-gradient(90deg,#4facfe,#a855f7);font-size:7pt;font-weight:800;padding:0.3mm 2.5mm;border-radius:50px;color:#fff;">CLASS ${data.class}</span>
                    <span style="color:#64748b;margin:0 1mm;">•</span>
                    <span style="color:#94a3b8;font-size:7pt;font-weight:700;">ROLL #${data.rollNo}</span>
                </div>

                <!-- Info Rows -->
                <div style="display:flex;flex-direction:column;gap:1.5mm;">
                    <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.04);border:0.3mm solid rgba(255,255,255,0.08);border-radius:1.5mm;padding:1.5mm 2.5mm;">
                        <span style="font-size:5pt;color:#64748b;font-weight:700;text-transform:uppercase;">Father</span>
                        <span style="font-size:7.5pt;font-weight:800;color:#e2e8f0;">${data.fatherName}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.04);border:0.3mm solid rgba(255,255,255,0.08);border-radius:1.5mm;padding:1.5mm 2.5mm;">
                        <span style="font-size:5pt;color:#64748b;font-weight:700;text-transform:uppercase;">Mobile</span>
                        <span style="font-size:7.5pt;font-weight:800;color:#e2e8f0;">${data.mobile}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.04);border:0.3mm solid rgba(255,255,255,0.08);border-radius:1.5mm;padding:1.5mm 2.5mm;">
                        <span style="font-size:5pt;color:#64748b;font-weight:700;text-transform:uppercase;">DOB</span>
                        <span style="font-size:7.5pt;font-weight:800;color:#e2e8f0;">${data.dateOfBirth}</span>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div style="position:absolute;bottom:0;width:100%;padding:1.5mm 4mm;box-sizing:border-box;display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.3);border-top:0.3mm solid rgba(255,255,255,0.06);">
                <div style="font-size:4.5pt;color:#475569;line-height:1.3;">
                    📞 ${data.schoolContact}<br>🌐 ${data.schoolWebsite}
                </div>
                <div style="text-align:center;">
                    <img src="/images/principal-sign.png" style="height:5.5mm;filter:brightness(0) invert(1);opacity:0.5;">
                    <div style="font-size:4pt;font-weight:800;color:#475569;border-top:0.3mm solid #1e293b;text-transform:uppercase;margin-top:0.5mm;">Principal</div>
                </div>
            </div>

            <!-- Bottom holographic line -->
            <div style="position:absolute;bottom:0;left:0;right:0;height:0.6mm;background:linear-gradient(90deg,#00f2fe,#4facfe,#a855f7,#ec4899);z-index:10;"></div>
        </div>
    `,
};

// Export to window
window.ID_TEMPLATES = ID_TEMPLATES;

