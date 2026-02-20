/**
 * dashboard.js — Dashboard page: stats, trends, top performers.
 */

const Dashboard = (() => {

    function init() {
        updateDate();
        updateStats();
        renderTrends();
        renderTopPerformers();
    }

    function updateDate() {
        const el = document.getElementById('currentDate');
        if (!el) return;
        el.textContent = new Date().toLocaleDateString('ar-EG', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });
    }

    function updateStats() {
        const today  = Utils.today();
        let present = 0, absent = 0, late = 0, anyToday = false;

        Object.values(Store.attendanceRecords).forEach(rec => {
            if (rec.date === today && rec.status !== 'none') {
                anyToday = true;
                if (rec.status === 'present') present++;
                else if (rec.status === 'absent') absent++;
                else if (rec.status === 'late')   late++;
            }
        });

        if (!anyToday) {
            const hist = Store.attendanceHistory.find(h => h.date === today);
            if (hist) { present = hist.present; absent = hist.absent; late = hist.late; }
        }

        _set('totalStudentsStat', Store.students.length);
        _set('presentTodayStat',  present);
        _set('absentTodayStat',   absent);
        _set('lateTodayStat',     late);
    }

    function renderTrends() {
        const container = document.getElementById('attendanceTrends');
        if (!container) return;

        const recent = Store.attendanceHistory.slice(0, 5);
        if (!recent.length) {
            container.innerHTML = '<p class="text-muted text-center mt-3">لا توجد بيانات بعد</p>';
            return;
        }

        const html = recent.map(day => {
            const total = day.present + day.absent + day.late;
            if (!total) return '';
            const pp = (day.present / total) * 100;
            const ap = (day.absent  / total) * 100;
            const lp = (day.late    / total) * 100;
            const ds = Utils.formatDate(day.date);
            return `
                <div class="trend-item">
                    <div class="trend-header">
                        <span class="trend-date">${ds}</span>
                        <span class="trend-count">${total} طالب</span>
                    </div>
                    <div class="trend-bar">
                        <div class="trend-present" style="width:${pp}%"></div>
                        <div class="trend-absent"  style="width:${ap}%"></div>
                        <div class="trend-late"    style="width:${lp}%"></div>
                    </div>
                </div>`;
        }).join('');

        container.innerHTML = `<div class="mt-3">${html}</div>`;
    }

    function renderTopPerformers() {
        const container = document.getElementById('topPerformers');
        if (!container) return;

        const top  = [...Store.students].sort((a, b) => b.attendance - a.attendance).slice(0, 5);
        const html = top.map((s, i) => {
            const rankClass = i === 0 ? 'rank-gold' : i === 1 ? 'rank-silver' : i === 2 ? 'rank-bronze' : 'rank-other';
            const rankIcon  = i < 3 ? '<i class="bi bi-award-fill"></i>' : (i + 1);
            return `
                <div class="performer-item">
                    <div class="performer-rank ${rankClass}">${rankIcon}</div>
                    <div class="performer-info">
                        <div class="performer-name">${s.name}</div>
                        <div class="performer-grade">${Utils.gradeLabel(s.grade)}</div>
                    </div>
                    <div class="performer-rate">${s.attendance}%</div>
                </div>`;
        }).join('');

        container.innerHTML = `<div class="mt-3">${html}</div>`;
    }

    // ── private ────────────────────────────────────────────────────────────
    function _set(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    return { init, updateDate, updateStats, renderTrends, renderTopPerformers };
})();
