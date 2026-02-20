/**
 * attendance-log.js — Permanent attendance log page.
 *
 * Reads from the backend's `attendance_log` table (written on save),
 * NOT from the working `attendance_records` table, so data always
 * persists correctly after saving.
 */

const AttendanceLog = (() => {

    let currentTab = 'students';   // 'students' | 'teachers'

    function switchTab(tab, linkEl) {
        currentTab = tab;

        // Update tab active state
        document.querySelectorAll('#logTabs .nav-link').forEach(a => a.classList.remove('active'));
        linkEl.classList.add('active');

        // Grade filter only relevant for students
        const gradeWrap = document.getElementById('logGradeFilterWrap');
        if (gradeWrap) gradeWrap.style.display = tab === 'students' ? '' : 'none';

        load();
    }

    async function load() {
        const dateVal  = document.getElementById('logDateFilter')?.value  || '';
        const gradeVal = document.getElementById('logGradeFilter')?.value || 'all';

        const thead   = document.getElementById('logTableHead');
        const tbody   = document.getElementById('logTableBody');
        const countEl = document.getElementById('logRecordCount');
        if (!thead || !tbody) return;

        // Show spinner
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="spinner-border spinner-border-sm text-primary me-2"></div>
                    جاري التحميل...
                </td>
            </tr>`;
        if (countEl) countEl.textContent = '';

        try {
            if (currentTab === 'students') {
                await _loadStudentLog(dateVal, gradeVal, thead, tbody, countEl);
            } else {
                await _loadTeacherLog(dateVal, thead, tbody, countEl);
            }
        } catch (err) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger py-4">
                        <i class="bi bi-exclamation-triangle me-2"></i>خطأ في تحميل البيانات
                    </td>
                </tr>`;
            console.error('AttendanceLog error:', err);
        }
    }

    function clearFilters() {
        const dateEl  = document.getElementById('logDateFilter');
        const gradeEl = document.getElementById('logGradeFilter');
        if (dateEl)  dateEl.value  = '';
        if (gradeEl) gradeEl.value = 'all';
        load();
    }

    // ── private ────────────────────────────────────────────────────────────

    async function _loadStudentLog(dateVal, gradeVal, thead, tbody, countEl) {
        const params = new URLSearchParams();
        if (dateVal) params.set('date', dateVal);
        // Teachers are locked to their own class; admins can filter freely
        const effectiveGrade = Store.isAdmin ? gradeVal : Store.assignedClass;
        if (effectiveGrade && effectiveGrade !== 'all') params.set('grade', effectiveGrade);

        const records = await Api.get('/attendance/log?' + params.toString());

        thead.innerHTML = `
            <tr>
                <th>#</th><th>الاسم</th><th>الفصل</th>
                <th>التاريخ</th><th>الحالة</th>
            </tr>`;

        if (!records.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        لا توجد سجلات بهذه الفلاتر
                    </td>
                </tr>`;
            return;
        }

        if (countEl) countEl.textContent = records.length + ' سجل';
        tbody.innerHTML = records.map((r, i) => `
            <tr>
                <td class="text-muted small">${i + 1}</td>
                <td><strong>${r.name}</strong></td>
                <td><span class="grade-badge">${Utils.gradeLabel(r.grade)}</span></td>
                <td>${Utils.formatDate(r.date)}</td>
                <td><span class="status-badge status-${r.status}">${Utils.statusLabel(r.status)}</span></td>
            </tr>`).join('');
    }

    async function _loadTeacherLog(dateVal, thead, tbody, countEl) {
        const params = new URLSearchParams();
        if (dateVal) params.set('date', dateVal);

        const records = await Api.get('/teacher-attendance/log?' + params.toString());

        thead.innerHTML = `
            <tr>
                <th>#</th><th>الاسم</th><th>المادة</th>
                <th>الفصل</th><th>التاريخ</th><th>الحالة</th>
            </tr>`;

        if (!records.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        لا توجد سجلات بهذه الفلاتر
                    </td>
                </tr>`;
            return;
        }

        if (countEl) countEl.textContent = records.length + ' سجل';
        tbody.innerHTML = records.map((r, i) => `
            <tr>
                <td class="text-muted small">${i + 1}</td>
                <td><strong>${r.name}</strong></td>
                <td>${r.subject}</td>
                <td>${r.assigned_class || '—'}</td>
                <td>${Utils.formatDate(r.date)}</td>
                <td><span class="status-badge status-${r.status}">${Utils.statusLabel(r.status)}</span></td>
            </tr>`).join('');
    }

    return { switchTab, load, clearFilters };
})();
