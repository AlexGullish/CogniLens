// CogniLens Content Script

let overlay = null;
let settings = {
    syllabus: 'IB',
    mode: 'concept',
    depth: 'high',
    language: 'English'
};

// Initialize by loading settings
chrome.storage.local.get(['syllabus', 'mode', 'depth', 'language'], (items) => {
    if (items.syllabus) settings.syllabus = items.syllabus;
    if (items.mode) settings.mode = items.mode;
    if (items.depth) settings.depth = items.depth;
    if (items.language) settings.language = items.language;
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

    // Get selection position
    const selection = window.getSelection();
    let top = 20, left = 20;

    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        // Position it near the selection, but keep it within viewport
        top = Math.max(10, rect.bottom + window.scrollY + 10);
        left = Math.max(10, rect.right + window.scrollX - 380); // try to align to right of selection

        // If it goes off screen, adjust
        if (left < 10) left = 10;
        if (left + 380 > window.innerWidth) left = window.innerWidth - 390;

        // Use fixed for simplicity in current implementation
        top = rect.bottom + 10;
        left = rect.left;
        if (left + 380 > window.innerWidth) left = window.innerWidth - 390;
        if (top + 400 > window.innerHeight) top = rect.top - 410;
        if (top < 10) top = 10;
    }

    if (overlay) {
        document.body.removeChild(overlay);
    }

    // Create container
    overlay = document.createElement('div');
    overlay.id = 'cognilens-overlay';
    overlay.style.top = top + 'px';
    overlay.style.left = left + 'px';
    overlay.innerHTML = `
    <div id="cognilens-header">
      <span id="cognilens-title">CogniLens / ${settings.syllabus}</span>
      <span id="cognilens-close">×</span>
    </div>
    <div id="cognilens-content">
      <div class="cognilens-loading">
        Analyzing context...
        <small>Mode: ${settings.mode} / ${settings.language}</small>
      </div>
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
                depth: settings.depth,
                language: settings.language
            })
        });

        if (!response.ok) {
            throw new Error(response.statusText);
        }

        const data = await response.json();
        renderExplanation(data.explanation);

    } catch (error) {
        const content = document.getElementById('cognilens-content');
        if (content) {
            content.innerHTML = `
          <div class="cognilens-error">
            Local model not available. Start backend to enable explanations.
            <br/><small style="opacity: 0.6; font-size: 11px;">${error.message}</small>
          </div>
        `;
        }
    }
}

function renderExplanation(markdownText) {
    const content = document.getElementById('cognilens-content');
    if (!content) return;

    // 1. Convert Markdown to HTML using marked.js
    const htmlContent = typeof marked !== 'undefined' ? marked.parse(markdownText) : markdownText.replace(/\n/g, '<br/>');

    // 2. Prepare container
    const container = document.createElement('div');
    container.className = 'cognilens-rendered-markdown';
    container.innerHTML = htmlContent;

    // 3. Trigger KaTeX rendering on the container BEFORE adding to DOM
    if (window.renderMathInElement) {
        window.renderMathInElement(container, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false },
                { left: '\\[', right: '\\]', display: true },
                { left: '\\ce{', right: '}', display: false }
            ],
            throwOnError: false,
            trust: true,
            strict: false
        });
    }

    content.innerHTML = '';
    content.appendChild(container);

    // 4. Force a second pass after brief delay to catch any missed elements (e.g. from async marked)
    setTimeout(() => {
        if (window.renderMathInElement) {
            window.renderMathInElement(content, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true },
                    { left: '\\ce{', right: '}', display: false }
                ],
                throwOnError: false,
                trust: true
            });
        }
    }, 100);
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
