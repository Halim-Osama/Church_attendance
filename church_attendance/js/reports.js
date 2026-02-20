/**
 * reports.js — Reports page: grade attendance, monthly summary, attention list.
 */

const Reports = (() => {

    function render() {
        _renderGradeAttendance();
        _renderMonthlySummary();
        _renderAttentionStudents();
    }

    // ── private ────────────────────────────────────────────────────────────

    function _renderGradeAttendance() {
        const container = document.getElementById('gradeAttendance');
        if (!container) return;

        const grades = ['KG1','KG2','1','2','3','4','5','6','7','8','9','10','11','12'];
        const html   = grades.map(g => {
            const list = Store.students.filter(s => s.grade === g);
            if (!list.length) return '';
            const avg = Math.round(list.reduce((sum, s) => sum + s.attendance, 0) / list.length);
            return `
                <div class="grade-report">
                    <div class="grade-header">
                        <div>
                            <h4 class="grade-title">${Utils.gradeLabel(g)}</h4>
                            <p class="grade-count">${list.length} طالب</p>
                        </div>
                        <div class="grade-percentage">
                            <h3>${avg}%</h3>
                            <p>متوسط النسبة</p>
                        </div>
                    </div>
                    <div class="progress" style="height:12px;">
                        <div class="progress-bar ${Utils.progressClass(avg)}" style="width:${avg}%"></div>
                    </div>
                </div>`;
        }).join('');

        container.innerHTML = html
            ? `<div class="mt-3">${html}</div>`
            : '<p class="text-muted text-center mt-3">لا يوجد طلاب بعد</p>';
    }

    function _renderMonthlySummary() {
        const container = document.getElementById('monthlySummary');
        if (!container) return;

        const hist = Store.attendanceHistory;
        if (!hist.length) {
            container.innerHTML = '<p class="text-muted text-center mt-3">لا توجد بيانات بعد</p>';
            return;
        }

        const tp = hist.reduce((s, d) => s + d.present, 0);
        const ta = hist.reduce((s, d) => s + d.absent,  0);
        const tl = hist.reduce((s, d) => s + d.late,    0);
        const gt = tp + ta + tl;

        const pp = gt ? Math.round(tp / gt * 100) : 0;
        const ap = gt ? Math.round(ta / gt * 100) : 0;
        const lp = gt ? Math.round(tl / gt * 100) : 0;

        const maxDay = hist.reduce((m, d) => d.present > m.present ? d : m, hist[0]);
        const minDay = hist.reduce((m, d) => d.present < m.present ? d : m, hist[0]);

        container.innerHTML = `
            <div class="row g-3 mb-4">
                <div class="col-4">
                    <div class="summary-box summary-success"><h2>${pp}%</h2><p>حاضر</p></div>
                </div>
                <div class="col-4">
                    <div class="summary-box summary-danger"><h2>${ap}%</h2><p>غائب</p></div>
                </div>
                <div class="col-4">
                    <div class="summary-box summary-warning"><h2>${lp}%</h2><p>متأخر</p></div>
                </div>
            </div>
            <div class="summary-details">
                <div class="summary-item">
                    <span>إجمالي أيام مسجلة</span>
                    <strong>${hist.length}</strong>
                </div>
                <div class="summary-item">
                    <span>متوسط الحضور اليومي</span>
                    <strong>${Math.round(tp / hist.length)} طالب</strong>
                </div>
                <div class="summary-item">
                    <span>أعلى يوم حضور</span>
                    <strong>${Utils.formatDate(maxDay.date)} (${maxDay.present})</strong>
                </div>
                <div class="summary-item">
                    <span>أقل يوم حضور</span>
                    <strong>${Utils.formatDate(minDay.date)} (${minDay.present})</strong>
                </div>
            </div>`;
    }

    function _renderAttentionStudents() {
        const container = document.getElementById('attentionStudents');
        if (!container) return;

        const low = Store.students.filter(s => s.attendance < 85);
        if (!low.length) {
            container.innerHTML = '<div class="col-12 text-center text-muted py-3">جميع الطلاب بحضور ممتاز! 🎉</div>';
            return;
        }

        container.innerHTML = low.map(s => `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="attention-card" onclick="Students.showModal(${s.id})" style="cursor:pointer;">
                    <div class="attention-header">
                        <div class="attention-avatar">${s.avatar}</div>
                        <div>
                            <div class="attention-name">${s.name}</div>
                            <div class="attention-grade">${Utils.gradeLabel(s.grade)}</div>
                        </div>
                    </div>
                    <div class="attention-stats">
                        <span class="attention-label">الحضور</span>
                        <span class="attention-value">${s.attendance}%</span>
                    </div>
                    <div class="attention-bar">
                        <div class="attention-fill" style="width:${s.attendance}%"></div>
                    </div>
                </div>
            </div>`).join('');
    }

    return { render };
})();
