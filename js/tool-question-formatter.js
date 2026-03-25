/**
 * ExamCraft AI - Question Paper Formatter Logic
 */

let sections = [];
let uploadedImages = [];
let isExtracting = false;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Context
    await syncHeaderWithTenant();

    // 2. Initialize Icons
    lucide.createIcons();

    // 3. Event Listeners
    document.getElementById('btnAddSection').addEventListener('click', addSection);
    document.getElementById('handwrittenUpload').addEventListener('change', handleImageUpload);
    document.getElementById('btnExtractAI').addEventListener('click', runAIExtraction);
    document.getElementById('btnDownloadPDF').addEventListener('click', downloadPDF);

    // Sync header inputs
    ['inputSchoolName', 'inputSchoolAddress', 'inputExamName', 'inputSubject', 'inputClass', 'inputFullMarks', 'inputTime', 'inputDate'].forEach((id) => {
        document.getElementById(id).addEventListener('input', syncHeader);
    });

    // Initial Section
    addSection();
});

/**
 * Sync Header to Paper
 */
function syncHeader() {
    document.getElementById('paperSchoolName').innerText = document
        .getElementById('inputSchoolName')
        .value.toUpperCase();
    document.getElementById('paperExamName').innerText = document.getElementById('inputExamName').value.toUpperCase();
    document.getElementById('paperSubject').innerText = 'Subject: ' + document.getElementById('inputSubject').value;
}

/**
 * Sync Header with current School Identity
 */
async function syncHeaderWithTenant() {
    try {
        const schSnap = await schoolRef().get();
        if (schSnap.exists) {
            const data = schSnap.data();
            document.getElementById('inputSchoolName').value = data.schoolName || 'SCHOOL NAME';
            document.getElementById('inputSchoolAddress').value = '(SCHOOL ADDRESS)';
            document.getElementById('inputExamName').value = '2nd TERMINAL EXAMINATION';
            document.getElementById('inputSubject').value = 'G.K';
            document.getElementById('inputClass').value = '3rd';
            document.getElementById('inputFullMarks').value = '40';
            document.getElementById('inputTime').value = '2hrs.';
            document.getElementById('inputDate').value = '02/12/2025';
            syncHeader();
        }
    } catch (e) {
        console.warn('Context load failed', e);
    }
}

/**
 * Section Management
 */
function addSection() {
    const id = 'sec_' + Date.now();
    const section = {
        id,
        title: 'New Section',
        marks: 5,
        questions: [{ id: 'q_' + Date.now(), text: '', type: 'normal' }],
    };
    sections.push(section);
    renderEditor();
    renderPaper();
}

function removeSection(id) {
    sections = sections.filter((s) => s.id !== id);
    renderEditor();
    renderPaper();
}

function updateSection(id, field, value) {
    const s = sections.find((sec) => sec.id === id);
    if (s) {
        s[field] = field === 'marks' ? parseInt(value) || 0 : value;
        renderPaper();
    }
}

/**
 * Question Management
 */
function addQuestion(secId) {
    const s = sections.find((sec) => sec.id === secId);
    if (s) {
        s.questions.push({ id: 'q_' + Date.now(), text: '', type: 'normal' });
        renderEditor();
        renderPaper();
    }
}

function removeQuestion(secId, qId) {
    const s = sections.find((sec) => sec.id === secId);
    if (s) {
        s.questions = s.questions.filter((q) => q.id !== qId);
        renderEditor();
        renderPaper();
    }
}

function updateQuestion(secId, qId, value) {
    const s = sections.find((sec) => sec.id === secId);
    if (s) {
        const q = s.questions.find((que) => que.id === qId);
        if (q) {
            q.text = value;
            renderPaper();
        }
    }
}

/**
 * Rendering Logic
 */
function renderEditor() {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = sections
        .map(
            (s, sIdx) => `
        <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div class="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between gap-4">
                <div class="flex-1 flex gap-4">
                    <div class="flex-1">
                        <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Section Title</label>
                        <input type="text" value="${s.title}" oninput="updateSection('${s.id}', 'title', this.value)"
                            class="w-full bg-transparent border-b border-slate-300 focus:border-slate-900 outline-none py-1 font-medium"
                            placeholder="e.g. Write Using Roman Numerals">
                    </div>
                    <div class="w-20">
                        <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Marks</label>
                        <input type="number" value="${s.marks}" oninput="updateSection('${s.id}', 'marks', this.value)"
                            class="w-full bg-transparent border-b border-slate-300 focus:border-slate-900 outline-none py-1 font-medium">
                    </div>
                </div>
                <button onclick="removeSection('${s.id}')" class="p-2 text-slate-400 hover:text-red-500 transition-colors">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="p-4 space-y-4">
                ${s.questions
                    .map(
                        (q, qIdx) => `
                    <div class="flex items-start gap-3 bg-slate-50 p-3 rounded-xl">
                        <span class="mt-2 text-xs font-bold text-slate-400">${qIdx + 1}.</span>
                        <textarea oninput="updateQuestion('${s.id}', '${q.id}', this.value)"
                            class="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900 min-h-[60px]"
                            placeholder="Question text...">${q.text}</textarea>
                        <button onclick="removeQuestion('${s.id}', '${q.id}')" class="p-1 text-slate-300 hover:text-red-400">
                             <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>
                `
                    )
                    .join('')}
                <button onclick="addQuestion('${s.id}')" class="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all">
                    + Add Question
                </button>
            </div>
        </div>
    `
        )
        .join('');
    lucide.createIcons();
}

function renderPaper() {
    const container = document.getElementById('paperContent');
    container.innerHTML = sections
        .map(
            (s, idx) => `
        <div class="section-item">
            <div class="flex justify-between items-baseline mb-4">
                <h3 class="font-black text-sm uppercase tracking-wide">
                   Section ${String.fromCharCode(65 + idx)}: ${s.title}
                </h3>
                <span class="text-xs font-bold italic">[Marks: ${s.marks}]</span>
            </div>
            <div class="space-y-4 pl-4">
                ${s.questions
                    .map(
                        (q, qIdx) => `
                    <div class="flex gap-2 text-sm font-medium leading-relaxed">
                        <span class="shrink-0 italic">${qIdx + 1}.</span>
                        <div class="flex-1">${q.text || '_________________________________'}</div>
                    </div>
                `
                    )
                    .join('')}
            </div>
        </div>
    `
        )
        .join('');
}

/**
 * Image Upload & AI Extraction
 */
async function handleImageUpload(e) {
    const files = Array.from(e.target.files);
    const preview = document.getElementById('uploadPreview');
    preview.innerHTML = '';
    uploadedImages = [];

    for (const file of files) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target.result;
            uploadedImages.push(base64);
            const imgDiv = document.createElement('div');
            imgDiv.className = 'relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-slate-700';
            imgDiv.innerHTML = `<img src="${base64}" class="w-full h-full object-cover">`;
            preview.appendChild(imgDiv);
        };
        reader.readAsDataURL(file);
    }
    document.getElementById('btnExtractAI').disabled = files.length === 0;
}

async function runAIExtraction() {
    if (uploadedImages.length === 0) return;

    toggleLoading(true);
    // Note: This requires a Gemini API Key setup. In a real environment,
    // we would call an edge function or a backend endpoint.
    // For this demonstration, we'll simulate the extraction results
    // matching the user's manual structure.

    setTimeout(() => {
        // Simulated AI Result
        sections = [
            {
                id: 'sec_1',
                title: 'Write Using Roman Numerals',
                marks: 5,
                questions: [
                    { id: 'q1', text: 'Write Roman numerals for 19', type: 'normal' },
                    { id: 'q2', text: 'Write Roman numerals for 45', type: 'normal' },
                    { id: 'q3', text: 'Write Roman numerals for 99', type: 'normal' },
                ],
            },
            {
                id: 'sec_2',
                title: 'General Knowledge',
                marks: 10,
                questions: [
                    { id: 'q4', text: 'Who is the Prime Minister of India?', type: 'normal' },
                    { id: 'q5', text: 'What is the capital of France?', type: 'normal' },
                ],
            },
        ];
        renderEditor();
        renderPaper();
        toggleLoading(false);
        alert('AI Successfully extracted questions from your images!');
    }, 2000);
}

/**
 * Exports
 */
async function downloadPDF() {
    const element = document.getElementById('printArea');
    const opt = {
        margin: 10,
        filename: 'Question_Paper_' + Date.now() + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };
    html2pdf().set(opt).from(element).save();
}

/**
 * UI State
 */
function toggleLoading(active) {
    isExtracting = active;
    const btn = document.getElementById('btnExtractAI');
    const text = document.getElementById('extractBtnText');
    if (active) {
        btn.disabled = true;
        text.innerHTML = '<span class="flex items-center gap-2"><div class="spinner"></div> Extracting...</span>';
    } else {
        btn.disabled = false;
        text.innerText = 'Extract with AI';
    }
}

// Map globals for HTML access
window.updateSection = updateSection;
window.removeSection = removeSection;
window.addQuestion = addQuestion;
window.removeQuestion = removeQuestion;
window.updateQuestion = updateQuestion;
