/**
 * sidebar.js — Sidebar rendering and page navigation.
 */

const Sidebar = (() => {

    /** Build sidebar nav links based on the current user's role */
    function setup() {
        const isAdmin = Store.isAdmin;
        const nav     = document.getElementById('sidebarNav');

        const links = [
            { page: 'dashboard',         icon: 'bi-grid-fill',            label: 'لوحة التحكم',      always: true  },
            { page: 'students',          icon: 'bi-people-fill',          label: 'الطلاب',            always: true  },
            { page: 'teachers',          icon: 'bi-person-badge-fill',    label: 'الخدام',            admin: true   },
            { page: 'attendance',        icon: 'bi-calendar-check-fill',  label: 'حضور الطلاب',      always: true  },
            { page: 'teacherAttendance', icon: 'bi-clipboard-check-fill', label: 'حضور الخدام',      admin: true   },
            { page: 'reports',           icon: 'bi-bar-chart-fill',       label: 'التقارير',          always: true  },
            { page: 'attendanceLog',     icon: 'bi-journal-check',        label: 'سجل الحضور',       admin: true  },
            { page: 'users',             icon: 'bi-shield-lock-fill',     label: 'إدارة الحسابات',   admin: true   },
        ];

        nav.innerHTML = links
            .filter(l => l.always || (l.admin && isAdmin))
            .map(l => `
                <a href="#" class="nav-link" data-page="${l.page}"
                onclick="Sidebar.navigate('${l.page}')">
                    <i class="bi ${l.icon}"></i>
                    <span>${l.label}</span>
                </a>`)
            .join('');

        // Update footer
        const u        = Store.currentUser;
        const initials = Utils.makeAvatar(u.name);
        document.getElementById('sidebarAvatar').textContent  = initials;
        document.getElementById('sidebarUserName').textContent = u.name;
        document.getElementById('sidebarUserRole').textContent = isAdmin
            ? 'مسؤول'
            : 'خادم' + (u.assigned_class ? ` — ${Utils.gradeLabel(u.assigned_class)}` : '');

        // Hide teacher log tab for non-admins
        const teacherTab = document.getElementById('teacherLogTabLi');
        if (teacherTab) teacherTab.style.display = isAdmin ? '' : 'none';

        // Hide grade filter on students page for teachers
        const gfw = document.getElementById('gradeFilterWrap');
        if (gfw) gfw.style.display = isAdmin ? '' : 'none';

        // Hide class filter on attendance page for teachers
        const acCard = document.getElementById('attendanceClassFilterCard');
        if (acCard) acCard.style.display = isAdmin ? '' : 'none';

        // Activate first link
        _setActive('dashboard');
    }

    /** Navigate to a named page */
    function navigate(page) {
        // Permission guard
        const adminOnly = ['teachers', 'teacherAttendance', 'users'];
        if (!Store.isAdmin && adminOnly.includes(page)) return;

        _setActive(page);
        _showPage(page);

        // Close sidebar on mobile
        if (window.innerWidth < 992) {
            document.getElementById('sidebar').classList.remove('show');
        }

        // Trigger page-specific render
        const renders = {
            dashboard:         () => { Dashboard.updateDate(); Dashboard.updateStats(); Dashboard.renderTrends(); Dashboard.renderTopPerformers(); },
            students:          () => { Store.filteredStudents = [...Store.students]; Students.render(); },
            teachers:          () => { Store.filteredTeachers = [...Store.teachers]; Teachers.render(); },
            attendance:        () => {
                if (!Store.isAdmin && Store.assignedClass) Store.selectedAttendanceClass = Store.assignedClass;
                Attendance.render();
            },
            teacherAttendance: () => TeacherAttendance.render(),
            reports:           () => Reports.render(),
            attendanceLog:     () => AttendanceLog.load(),
            users:             () => UserMgmt.load(),
        };
        renders[page]?.();
    }

    // ── private ────────────────────────────────────────────────────────────

    function _setActive(page) {
        document.querySelectorAll('.sidebar-nav .nav-link').forEach(l => {
            l.classList.toggle('active', l.dataset.page === page);
        });
    }

    function _showPage(page) {
        const pages = ['dashboard','students','teachers','attendance',
                       'teacherAttendance','reports','attendanceLog','users'];
        pages.forEach(p => {
            document.getElementById(p + 'Page')?.classList.toggle('d-none', p !== page);
        });
    }

    return { setup, navigate };
})();
