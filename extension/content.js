
if (typeof marked !== 'undefined') {
    marked.setOptions({ gfm: true, breaks: true, headerIds: false, mangle: false });
}

function safetyClean(text) {
    if (settings.language === 'English') {
        text = text.replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g, '');
    }

    // Convert raw Greek symbols into LaTeX automatically if they aren't already wrapped
    text = text.replace(/([\u0370-\u03ff\u1f00-\u1fff])(?![^$]*\$)/g, '$$$1$$');

    // Convert common failed delimiters into stable $ dollar signs
    // e.g., (\theta) -> $\theta$  and  [\theta] -> $$\theta$$
    text = text.replace(/\(([^)]*?\\[a-zA-Z]+[^)]*?)\)/g, '$$$1$$');
    text = text.replace(/\[([^\]]*?\\[a-zA-Z]+[^\]]*?)\]/g, '$$$$$1$$$$');

    return text;
}

let conversationHistory = [];
let overlay = null;
let settings = {
    syllabus: 'IB',
    mode: 'concept',
    depth: 'high',
    language: 'English'
};


chrome.storage.local.get(['syllabus', 'mode', 'depth', 'language'], (items) => {
    if (items.syllabus) settings.syllabus = items.syllabus;
    if (items.mode) settings.mode = items.mode;
    if (items.depth) settings.depth = items.depth;
    if (items.language) settings.language = items.language;
});


chrome.storage.onChanged.addListener((changes, namespace) => {
    for (let [key, { newValue }] of Object.entries(changes)) {
        if (key in settings) {
            settings[key] = newValue;
        }
    }
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("CogniLens: Received message", request);
    if (request.action === "explain_selection") {

        if (request.settings) {
            Object.assign(settings, request.settings);
        }

        const selection = window.getSelection().toString().trim();
        console.log("CogniLens: Selection found:", selection);
        if (!selection) {
            alert("Please select some text first.");
            return;
        }


        conversationHistory = [];
        createOverlay(selection);
    }
});

function createOverlay(text) {
    console.log("CogniLens: Creating overlay...");


    const selection = window.getSelection();
    let top = 20, left = 20;

    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        top = rect.bottom + 10;
        left = rect.left;

        if (left + 380 > window.innerWidth) left = window.innerWidth - 390;
        if (top + 450 > window.innerHeight) top = rect.top - 460;
        if (top < 10) top = 10;
        if (left < 10) left = 10;
    }

    if (overlay) {
        document.body.removeChild(overlay);
    }


    overlay = document.createElement('div');
    overlay.id = 'cognilens-overlay';
    overlay.style.top = top + 'px';
    overlay.style.left = left + 'px';

    const syllabusLabels = {
        'IB': 'IB Framework',
        'AP': 'Advanced Placement',
        'IGCSE': 'IGCSE Standard'
    };

    const modeLabels = {
        'concept': 'Concept Analysis',
        'guided': 'Guided Problem Solving',
        'concise': 'Abridged Summary',
        'detailed': 'In-depth Exploration'
    };

    overlay.innerHTML = `
    <div id="cognilens-header">
      <span id="cognilens-title">CogniLens / ${syllabusLabels[settings.syllabus] || settings.syllabus}</span>
      <span id="cognilens-close">×</span>
    </div>
    <div id="cognilens-content">
      <div id="cognilens-messages">
        <div class="cognilens-loading">
          Analyzing context...
          <small>${modeLabels[settings.mode] || settings.mode} &middot; ${settings.language}</small>
        </div>
      </div>
    </div>
    <div id="cognilens-footer">
      <input type="text" id="cognilens-input" placeholder="Ask a follow-up..." />
      <button id="cognilens-send">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
      </button>
    </div>
  `;

    document.body.appendChild(overlay);


    document.getElementById('cognilens-close').addEventListener('click', () => {
        document.body.removeChild(overlay);
        overlay = null;
    });


    const input = document.getElementById('cognilens-input');
    const sendBtn = document.getElementById('cognilens-send');

    const handleSend = () => {
        const query = input.value.trim();
        if (query) {
            input.value = '';
            input.disabled = true;
            sendBtn.disabled = true;
            appendUserMessage(query);
            fetchExplanation(query, true);
        }
    };

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
    sendBtn.addEventListener('click', handleSend);


    makeDraggable(overlay);


    fetchExplanation(text);
}

function appendUserMessage(text) {
    const messages = document.getElementById('cognilens-messages');
    const userMsg = document.createElement('div');
    userMsg.className = 'cognilens-user-message';
    userMsg.textContent = text;
    messages.appendChild(userMsg);
    messages.scrollTop = messages.scrollHeight;
}

async function fetchExplanation(text, isFollowUp = false) {
    const messagesContainer = document.getElementById('cognilens-messages');

    let loadingEl = null;
    if (isFollowUp) {
        loadingEl = document.createElement('div');
        loadingEl.className = 'cognilens-loading';
        loadingEl.innerHTML = 'Thinking...';
        messagesContainer.appendChild(loadingEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

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
                language: settings.language,
                history: conversationHistory
            })
        });

        if (!response.ok) {
            throw new Error(response.statusText);
        }

        const data = await response.json();

        if (loadingEl) loadingEl.remove();

        renderExplanation(data.explanation, true);


        conversationHistory.push({ role: "user", content: text });
        conversationHistory.push({ role: "assistant", content: data.explanation });

    } catch (error) {
        if (loadingEl) loadingEl.remove();
        const content = document.getElementById('cognilens-messages');
        if (content) {
            content.innerHTML += `
          <div class="cognilens-error">
            Communication error.
            <br/><small style="opacity: 0.6; font-size: 11px;">${error.message}</small>
          </div>
        `;
        }
    } finally {
        const input = document.getElementById('cognilens-input');
        const sendBtn = document.getElementById('cognilens-send');
        if (input) input.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        if (input) input.focus();
    }
}

function renderExplanation(markdownText, animate = false) {
    const messagesContainer = document.getElementById('cognilens-messages');
    if (!messagesContainer) return;

    markdownText = safetyClean(markdownText);

    const initialLoading = messagesContainer.querySelector('.cognilens-loading');
    if (initialLoading && !conversationHistory.length) {
        initialLoading.remove();
    }

    const container = document.createElement('div');
    container.className = 'cognilens-rendered-markdown';
    messagesContainer.appendChild(container);

    const parseMD = (text) => {
        // Prevent marked from mangling LaTeX backslashes or underscore formatting
        return typeof marked !== 'undefined' ? marked.parse(text) : text.replace(/\n/g, '<br/>');
    };

    if (!animate) {
        container.innerHTML = parseMD(markdownText);
        renderMathAndScroll(container, messagesContainer, true);
    } else {
        let currentCharIndex = 0;
        const speed = 10;
        const batchSize = 8;

        const type = () => {
            if (currentCharIndex < markdownText.length) {
                currentCharIndex += batchSize;
                if (currentCharIndex > markdownText.length) currentCharIndex = markdownText.length;

                const currentText = markdownText.substring(0, currentCharIndex);
                container.innerHTML = parseMD(currentText);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;

                if (currentCharIndex < markdownText.length) {
                    setTimeout(type, speed);
                } else {

                    renderMathAndScroll(container, messagesContainer, true);
                }
            }
        };
        type();
    }
}

function renderMathAndScroll(container, messagesContainer, isFinal = false) {
    const doRender = () => {
        if (window.renderMathInElement) {
            try {
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
            } catch (e) { }
        }
    };

    doRender();
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    if (isFinal) {
        setTimeout(doRender, 100);
        setTimeout(doRender, 500);
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 600);
    }
}


function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = document.getElementById(element.id.replace('overlay', 'header'));
    if (header) {
        header.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        if (e.target.id === 'cognilens-close') return;
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
