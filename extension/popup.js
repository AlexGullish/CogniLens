document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['syllabus', 'mode', 'depth', 'language'], (items) => {
        if (items.syllabus) document.getElementById('syllabus').value = items.syllabus;
        if (items.mode) document.getElementById('mode').value = items.mode;
        if (items.depth) document.getElementById('depth').value = items.depth;
        if (items.language) document.getElementById('language').value = items.language;
    });

    document.getElementById('save').addEventListener('click', () => {
        const syllabus = document.getElementById('syllabus').value;
        const mode = document.getElementById('mode').value;
        const depth = document.getElementById('depth').value;
        const language = document.getElementById('language').value;

        chrome.storage.local.set({ syllabus, mode, depth, language }, () => {
            const status = document.getElementById('status');
            status.textContent = 'Preferences updated.';
            setTimeout(() => { status.textContent = ''; }, 2000);
        });
    });

    document.getElementById('explain').addEventListener('click', () => {
        const syllabus = document.getElementById('syllabus').value;
        const mode = document.getElementById('mode').value;
        const depth = document.getElementById('depth').value;
        const language = document.getElementById('language').value;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "explain_selection",
                    settings: { syllabus, mode, depth, language }
                });
            }
        });
    });
});
