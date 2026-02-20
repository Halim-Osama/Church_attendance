/**
 * app.js — Application entry point.
 *
 * Wires up global event listeners and decides whether to show the
 * login screen or restore an existing session on page load.
 */

window.addEventListener('DOMContentLoaded', () => {

    // ── Sidebar toggles ────────────────────────────────────────────────────
    document.getElementById('sidebarToggle')
        ?.addEventListener('click', () =>
            document.getElementById('sidebar').classList.remove('show'));

    document.getElementById('mobileMenuToggle')
        ?.addEventListener('click', () =>
            document.getElementById('sidebar').classList.add('show'));

    // ── Restore session (survives page refresh) ────────────────────────────
    if (Store.loadSession()) {
        document.getElementById('loginOverlay').style.display     = 'none';
        document.getElementById('dashboardWrapper').style.display = '';

        Sidebar.setup();
        Store.reload()
            .then(() => Dashboard.init())
            .catch(err => {
                // If the server rejected the token (401), logout() was already called
                if (err.message !== 'Unauthorized') {
                    alert('تعذر الاتصال بالخادم.\nتأكد من تشغيل server.py ثم أعد تحميل الصفحة.');
                }
            });
    } else {
        // Focus the username field so the user can start typing immediately
        setTimeout(() => document.getElementById('loginUsernameInput')?.focus(), 100);
    }

    // ── Student search / grade filter (students page) ──────────────────────
    document.getElementById('studentSearch')
        ?.addEventListener('input', () => Students.filter());

    document.getElementById('gradeFilter')
        ?.addEventListener('change', () => Students.filter());
});
