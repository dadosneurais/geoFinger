(function() {
    "use strict";

    const punish = () => {
        try {
            window.location.replace("about:blank");
        } catch (e) {
            window.close();
        }
    };

    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        const ctrl = e.ctrlKey;
        const shift = e.shiftKey;

        if (
            key === "f12" || 
            (ctrl && shift && (key === "i" || key === "j" || key === "c")) || 
            (ctrl && key === "u")
        ) {
            e.preventDefault();
            punish();
            return false;
        }
    });

    window.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    const checkDevTools = () => {
        const threshold = 160;
        const widthDiff = window.outerWidth - window.innerWidth;
        const heightDiff = window.outerHeight - window.innerHeight;

        if (widthDiff > threshold || heightDiff > threshold) {
            punish();
        }
    };

    setInterval(checkDevTools, 500);

    window.addEventListener('DOMContentLoaded', () => {
        const protectedContent = document.getElementById('protected-content');
        if (protectedContent) {
            protectedContent.style.display = 'block';
        }
    });

})();