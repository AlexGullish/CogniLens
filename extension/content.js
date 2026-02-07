// CogniLens Content Script

let overlay = null;
let settings = {
    syllabus: 'IB',
    mode: 'concept',
    depth: 'high'
};

// Initialize by loading settings
chrome.storage.local.get(['syllabus', 'mode', 'depth'], (items) => {
    if (items.syllabus) settings.syllabus = items.syllabus;
    if (items.mode) settings.mode = items.mode;
    if (items.depth) settings.depth = items.depth;
});

// Update settings when they change
chrome.storage.onChanged.addListener((changes, namespace) => {
    for (let [key, { newValue }] of Object.entries(changes)) {
        if (key in settings) {
            settings[key] = newValue;
        }
    }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("CogniLens: Received message", request);
    if (request.action === "explain_selection") {
        const selection = window.getSelection().toString().trim();
        console.log("CogniLens: Selection found:", selection);
        if (!selection) {
            alert("Please select some text first.");
            return;
        }
        createOverlay(selection);
    }
});

function createOverlay(text) {
    console.log("CogniLens: Creating overlay...");
    if (overlay) {
        document.body.removeChild(overlay);
    }

    // Create container
    overlay = document.createElement('div');
    overlay.id = 'cognilens-overlay';
    overlay.innerHTML = `
    <div id="cognilens-header">
      <span id="cognilens-title">CogniLens (${settings.syllabus})</span>
      <span id="cognilens-close">X</span>
    </div>
    <div id="cognilens-content">
      <div class="cognilens-loading">Generatiing explanation...<br/>Mode: ${settings.mode}</div>
    </div>
  `;

    document.body.appendChild(overlay);

    // Close handler
    document.getElementById('cognilens-close').addEventListener('click', () => {
        document.body.removeChild(overlay);
        overlay = null;
    });

    // Make draggable
    makeDraggable(overlay);

    // Fetch explanation
    fetchExplanation(text);
}

async function fetchExplanation(text) {
    console.log("CogniLens: Starting fetch for syllabus", settings.syllabus);
    try {
        const response = await fetch('http://localhost:8000/explain', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                syllabus: settings.syllabus,
                mode: settings.mode,
                depth: settings.depth
            })
        });

        console.log("CogniLens: Fetch response status:", response.status);

        if (!response.ok) {
            throw new Error('Backend error: ' + response.statusText);
        }

        const data = await response.json();
        console.log("CogniLens: Data received, rendering...");
        renderExplanation(data.explanation);

    } catch (error) {
        console.error("CogniLens: Fetch Error:", error);
        const content = document.getElementById('cognilens-content');
        if (content) {
            content.innerHTML = `
          <div class="cognilens-error">
            <strong>Connection Failed</strong><br/>
            Ensure Local AI Backend is running.<br/>
            <small>${error.message}</small>
          </div>
        `;
        }
    }
}

function renderExplanation(markdownText) {
    const content = document.getElementById('cognilens-content');
    if (!content) return;

    // 1. Convert Markdown to HTML using marked.js
    // We use a basic configuration
    const htmlContent = typeof marked !== 'undefined' ? marked.parse(markdownText) : markdownText.replace(/\n/g, '<br/>');

    // 2. Wrap in a container
    const container = document.createElement('div');
    container.className = 'cognilens-rendered-markdown';
    container.innerHTML = htmlContent;

    // 3. Post-process: Add 'Why this step?' buttons to headings that look like steps
    // We check for H3, H4, or strong at the start of paragraphs
    const headers = container.querySelectorAll('h1, h2, h3, h4, h5, h6, strong');
    headers.forEach(header => {
        const text = header.textContent.trim();
        if (text.match(/^(Step \d+|^\d+\.|^First|^Next|^Finally)/i)) {
            // This is a step! Add the rationale button
            const wrapper = document.createElement('div');
            wrapper.className = 'cognilens-step-container';

            const btn = document.createElement('button');
            btn.className = 'cognilens-toggle-btn';
            btn.textContent = '?';
            btn.title = 'Why this step?';

            const rationale = document.createElement('div');
            rationale.className = 'cognilens-rationale';
            rationale.textContent = "This follows curriculum objective " + settings.syllabus + ".";

            header.appendChild(btn);
            header.appendChild(rationale);

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                rationale.classList.toggle('visible');
            });
        }
    });

    content.innerHTML = '';
    content.appendChild(container);

    // 4. Trigger KaTeX rendering
    if (window.renderMathInElement) {
        window.renderMathInElement(content, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false },
                { left: '\\[', right: '\\]', display: true },
                { left: '(', right: ')', display: false }, // Broadest possible match for (theta)
                { left: '[', right: ']', display: true },  // Broadest possible match for [math]
                { left: '\\ce{', right: '}', display: false }
            ],
            throwOnError: false,
            trust: true // Essential for some mhchem features
        });
    }
}

// Helper: Draggable Overlay
function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = document.getElementById(element.id.replace('overlay', 'header'));
    if (header) {
        header.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}
