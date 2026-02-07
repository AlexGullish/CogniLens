document.addEventListener('DOMContentLoaded', () => {
    // Load saved settings
    chrome.storage.local.get(['syllabus', 'mode', 'depth'], (items) => {
        if (items.syllabus) document.getElementById('syllabus').value = items.syllabus;
        if (items.mode) document.getElementById('mode').value = items.mode;
        if (items.depth) document.getElementById('depth').value = items.depth;
    });

    // Save settings
    document.getElementById('save').addEventListener('click', () => {
        const syllabus = document.getElementById('syllabus').value;
        const mode = document.getElementById('mode').value;
        const depth = document.getElementById('depth').value;

        chrome.storage.local.set({ syllabus, mode, depth }, () => {
            const status = document.getElementById('status');
            status.textContent = 'Settings saved!';
            setTimeout(() => { status.textContent = ''; }, 2000);
        });
    });

    // Trigger Explanation
    document.getElementById('explain').addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "explain_selection" });
            }
        });
    });
});
