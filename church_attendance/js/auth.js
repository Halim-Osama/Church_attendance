/**
 * auth.js — Login / logout logic.
 */

const Auth = (() => {

    async function attemptLogin() {
        const username = document.getElementById('loginUsernameInput').value.trim();
        const password = document.getElementById('loginPasswordInput').value;
        const errorEl  = document.getElementById('loginError');
        const box      = document.getElementById('loginBox');

        if (!username || !password) {
            errorEl.textContent = 'أدخل اسم المستخدم وكلمة المرور';
            return;
        }

        try {
            // Use fetch directly (no token needed yet)
            const res  = await fetch(API_BASE + '/login', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ username, password }),
            });
            const data = await res.json();

            if (data.success) {
                Store.token       = data.token;
                Store.currentUser = { role: data.role, assigned_class: data.assigned_class, name: data.name };
                Store.saveSession();

                errorEl.textContent = '';
                document.getElementById('loginPasswordInput').value = '';

                _showDashboard();
            } else {
                errorEl.textContent = data.error || 'فشل تسجيل الدخول';
                _shake(box);
                document.getElementById('loginPasswordInput').value = '';
            }
        } catch {
            errorEl.textContent = 'تعذر الاتصال بالخادم';
        }
    }

    function logout() {
        if (Store.token) {
            fetch(API_BASE + '/logout', {
                method:  'POST',
                headers: { 'Authorization': `Bearer ${Store.token}` },
            }).catch(() => {});
        }
        Store.clearSession();
        document.getElementById('dashboardWrapper').style.display = 'none';
        document.getElementById('loginOverlay').style.display     = 'flex';
        document.getElementById('loginPasswordInput').value  = '';
        document.getElementById('loginUsernameInput').value  = '';
        document.getElementById('loginError').textContent    = '';
    }

    function togglePassword() {
        const input = document.getElementById('loginPasswordInput');
        const icon  = document.getElementById('eyeIcon');
        if (input.type === 'password') {
            input.type       = 'text';
            icon.className   = 'bi bi-eye-slash';
        } else {
            input.type       = 'password';
            icon.className   = 'bi bi-eye';
        }
    }

    // ── private ────────────────────────────────────────────────────────────

    async function _showDashboard() {
        document.getElementById('loginOverlay').style.display    = 'none';
        document.getElementById('dashboardWrapper').style.display = '';
        Sidebar.setup();
        await Store.reload();
        Dashboard.init();
    }

    function _shake(el) {
        el.classList.remove('shake');
        void el.offsetWidth;             // reflow to restart animation
        el.classList.add('shake');
    }

    return { attemptLogin, logout, togglePassword, _showDashboard };
})();
