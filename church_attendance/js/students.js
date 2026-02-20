/**
 * students.js — Students grid, search/filter, add/edit/delete, modal.
 */

const Students = (() => {

    // Wire up search/filter inputs
    function init() {
        document.getElementById('studentSearch')
            ?.addEventListener('input', filter);
        document.getElementById('gradeFilter')
            ?.addEventListener('change', filter);
    }

    function filter() {
        const search     = (document.getElementById('studentSearch')?.value  || '').toLowerCase();
        const gradeValue = (document.getElementById('gradeFilter')?.value    || 'all');

        Store.filteredStudents = Store.students.filter(s => {
            const nameMatch  = s.name.toLowerCase().includes(search);
            // Teachers are locked to their own class — grade filter only for admin
            const gradeMatch = !Store.isAdmin || gradeValue === 'all' || s.grade === gradeValue;
            return nameMatch && gradeMatch;
        });
        render();
    }

    function render() {
        const container = document.getElementById('studentsGrid');
        if (!container) return;

        if (!Store.filteredStudents.length) {
            container.innerHTML = `
                <div class="col-12 text-center text-muted py-5">
                    <i class="bi bi-people fs-1 d-block mb-3"></i>لا يوجد طلاب
                </div>`;
            return;
        }

        container.innerHTML = Store.filteredStudents.map(s => `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="student-card">
                    <div class="student-header">
                        <div class="student-info" onclick="Students.showModal(${s.id})" style="cursor:pointer;">
                            <div class="student-avatar">${s.avatar}</div>
                            <div>
                                <div class="student-name">${s.name}</div>
                                <div class="student-grade">${Utils.gradeLabel(s.grade)}</div>
                            </div>
                        </div>
                        <span class="status-badge status-${s.status}">${Utils.statusLabel(s.status)}</span>
                    </div>

                    <div class="student-stats" onclick="Students.showModal(${s.id})" style="cursor:pointer;">
                        <div class="attendance-info">
                            <span class="attendance-label">نسبة الحضور</span>
                            <span class="attendance-value">${s.attendance}%</span>
                        </div>
                        <div class="progress">
                            <div class="progress-bar ${Utils.progressClass(s.attendance)}"
                                 style="width:${s.attendance}%"></div>
                        </div>
                    </div>

                    <div class="student-details" onclick="Students.showModal(${s.id})" style="cursor:pointer;">
                        <div class="detail-item">
                            <p>حاضر</p><p class="text-success">${s.present}</p>
                        </div>
                        <div class="detail-item">
                            <p>غائب</p><p class="text-danger">${s.absent}</p>
                        </div>
                    </div>

                    <div class="student-actions">
                        <a href="https://wa.me/${s.whatsapp}" target="_blank" class="btn btn-whatsapp">
                            <i class="bi bi-whatsapp"></i> واتساب
                        </a>
                        <button class="btn btn-outline-secondary btn-sm"
                                onclick="Students.showEditModal(${s.id}, event)"
                                style="border-radius:8px;padding:6px 12px;">
                            <i class="bi bi-pencil-fill"></i> تعديل
                        </button>
                        <button class="btn btn-delete" onclick="Students.delete(${s.id}, event)">
                            <i class="bi bi-trash-fill"></i> حذف
                        </button>
                    </div>
                </div>
            </div>`).join('');
    }

    async function showModal(studentId) {
        const s = Store.students.find(x => x.id === studentId);
        if (!s) return;

        const modal = Utils.showModal(`
            <div class="text-center mb-4">
                <div class="modal-student-avatar">${s.avatar}</div>
                <h3 class="modal-student-name">${s.name}</h3>
                <p class="modal-student-grade">${Utils.gradeLabel(s.grade)}</p>
                ${s.birthdate ? `<p class="text-muted small mb-0"><i class="bi bi-calendar3 me-1"></i>تاريخ الميلاد: ${s.birthdate}</p>` : ''}
            </div>
            <div class="modal-attendance-box">
                <div class="modal-attendance-header">
                    <span class="modal-attendance-label">إجمالي الحضور</span>
                    <span class="modal-attendance-value">${s.attendance}%</span>
                </div>
                <div class="progress" style="height:12px;">
                    <div class="progress-bar ${Utils.progressClass(s.attendance)}"
                         style="width:${s.attendance}%"></div>
                </div>
            </div>
            <div class="modal-stats-grid">
                <div class="modal-stat-box modal-stat-present"><h3>${s.present}</h3><p>حاضر</p></div>
                <div class="modal-stat-box modal-stat-absent"><h3>${s.absent}</h3><p>غائب</p></div>
                <div class="modal-stat-box modal-stat-total"><h3>${s.totalClasses}</h3><p>إجمالي</p></div>
            </div>
            <div class="mb-3">
                <a href="https://wa.me/${s.whatsapp}" target="_blank" class="btn btn-whatsapp w-100">
                    <i class="bi bi-whatsapp me-2"></i> التواصل عبر واتساب
                </a>
            </div>
            <div class="modal-current-status status-badge status-${s.status} w-100">
                الحالة الحالية: ${Utils.statusLabel(s.status)}
            </div>
            <div id="studentHistorySection" class="mt-3">
                <p class="text-muted text-center small"><i class="bi bi-hourglass-split me-1"></i>جاري تحميل السجل...</p>
            </div>`);

        // Load history asynchronously
        try {
            const history = await Api.get(`/students/${s.id}/history`);
            const histEl  = document.getElementById('studentHistorySection');
            if (!histEl) return;
            if (!history.length) {
                histEl.innerHTML = '<p class="text-muted text-center small">لا يوجد سجل حضور محفوظ بعد</p>';
            } else {
                histEl.innerHTML = `
                    <h6 class="fw-bold mb-2"><i class="bi bi-clock-history me-1"></i>سجل الحضور</h6>
                    <div style="max-height:160px;overflow-y:auto;">
                        <table class="table table-sm table-bordered mb-0">
                            <thead><tr><th>التاريخ</th><th>الحالة</th></tr></thead>
                            <tbody>
                                ${history.map(h => `
                                    <tr>
                                        <td>${Utils.formatDate(h.date)}</td>
                                        <td><span class="status-badge status-${h.status}">${Utils.statusLabel(h.status)}</span></td>
                                    </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>`;
            }
        } catch { /* ignore */ }
    }

    function showAddModal() {
        const isTeacher    = !Store.isAdmin;
        const classSection = isTeacher
            ? `<input type="hidden" id="newStudentGrade" value="${Store.assignedClass}">
               <p class="text-muted small">سيُضاف الطالب إلى فصلك: <strong>${Utils.gradeLabel(Store.assignedClass)}</strong></p>`
            : `<div class="mb-3">
                   <label class="form-label">الفصل</label>
                   <select class="form-select" id="newStudentGrade">${GRADE_OPTIONS_HTML}</select>
               </div>`;

        const modal = Utils.showModal(`
            <h5 class="mb-4 fw-bold"><i class="bi bi-person-plus-fill me-2"></i>إضافة طالب جديد</h5>
            <form id="addStudentForm">
                <div class="mb-3">
                    <label class="form-label">اسم الطالب</label>
                    <input type="text" class="form-control" id="newStudentName" required>
                </div>
                ${classSection}
                <div class="mb-3">
                    <label class="form-label">رقم الواتساب</label>
                    <input type="text" class="form-control" id="newStudentWhatsapp" placeholder="+20123456789">
                </div>
                <button type="submit" class="btn btn-gradient w-100">إضافة طالب</button>
            </form>`);

        document.getElementById('addStudentForm').addEventListener('submit', async e => {
            e.preventDefault();
            try {
                const raw = await Api.post('/students', {
                    name:     document.getElementById('newStudentName').value.trim(),
                    grade:    document.getElementById('newStudentGrade').value,
                    whatsapp: document.getElementById('newStudentWhatsapp').value.trim(),
                });
                _pushToStore(raw);
                modal.hide();
                alert('تم إضافة الطالب بنجاح!');
            } catch (err) { alert('خطأ: ' + err.message); }
        });
    }

    function showEditModal(studentId, event) {
        event?.stopPropagation();
        const s         = Store.students.find(x => x.id === studentId);
        if (!s) return;
        const isTeacher = !Store.isAdmin;

        const classSection = isTeacher
            ? `<input type="hidden" id="editStudentGrade" value="${s.grade}">
               <p class="text-muted small">الفصل: <strong>${Utils.gradeLabel(s.grade)}</strong></p>`
            : `<div class="mb-3">
                   <label class="form-label">الفصل</label>
                   <select class="form-select" id="editStudentGrade">${gradeOptionsWithSelected(s.grade)}</select>
               </div>`;

        const modal = Utils.showModal(`
            <h5 class="mb-4 fw-bold"><i class="bi bi-pencil-fill me-2"></i>تعديل بيانات الطالب</h5>
            <form id="editStudentForm">
                <div class="mb-3">
                    <label class="form-label">اسم الطالب</label>
                    <input type="text" class="form-control" id="editStudentName" value="${s.name}" required>
                </div>
                ${classSection}
                <div class="mb-3">
                    <label class="form-label">تاريخ الميلاد</label>
                    <input type="text" class="form-control" id="editStudentBirthdate"
                           value="${s.birthdate || ''}" placeholder="مثال: 15/3/2010">
                </div>
                <div class="mb-3">
                    <label class="form-label">رقم الواتساب</label>
                    <input type="text" class="form-control" id="editStudentWhatsapp" value="${s.whatsapp || ''}">
                </div>
                <div class="d-flex gap-2">
                    <button type="submit" class="btn btn-gradient flex-fill">حفظ التعديلات</button>
                    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">إلغاء</button>
                </div>
            </form>`);

        document.getElementById('editStudentForm').addEventListener('submit', async e => {
            e.preventDefault();
            try {
                const updated = await Api.put(`/students/${studentId}`, {
                    name:      document.getElementById('editStudentName').value.trim(),
                    grade:     document.getElementById('editStudentGrade').value,
                    birthdate: document.getElementById('editStudentBirthdate').value.trim(),
                    whatsapp:  document.getElementById('editStudentWhatsapp').value.trim(),
                });
                _updateInStore(updated);
                Store.filteredStudents = [...Store.students];
                filter();
                modal.hide();
                alert('تم تعديل بيانات الطالب بنجاح!');
            } catch (err) { alert('خطأ: ' + err.message); }
        });
    }

    async function deleteStudent(studentId, event) {
        event?.stopPropagation();
        if (!confirm('هل أنت متأكد من حذف هذا الطالب؟')) return;
        try {
            await Api.del(`/students/${studentId}`);
            Store.students        = Store.students.filter(s => s.id !== studentId);
            Store.filteredStudents = [...Store.students];
            filter();
            alert('تم حذف الطالب بنجاح!');
        } catch (err) { alert('خطأ: ' + err.message); }
    }

    function exportToExcel() {
        const rows = Store.students.map(s => ({
            'ID':             String(s.id).padStart(4, '0'),
            'الاسم':          s.name,
            'الفصل':          s.grade,
            'الحالة':         Utils.statusLabel(s.status),
            'نسبة الحضور':   s.attendance + '%',
            'حاضر':           s.present,
            'غائب':           s.absent,
            'إجمالي الحصص': s.totalClasses,
            'واتساب':        s.whatsapp,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'الطلاب');
        XLSX.writeFile(wb, `الطلاب_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.xlsx`);
    }

    // ── private helpers ────────────────────────────────────────────────────

    function _mapStudent(raw) {
        return {
            id: raw.id, name: raw.name, grade: raw.grade,
            whatsapp:    raw.whatsapp    || '',
            avatar:      raw.avatar      || raw.name.substring(0, 2).toUpperCase(),
            birthdate:   raw.birthdate   || '',
            attendance:  raw.attendance,
            status:      raw.status,
            totalClasses: raw.total_classes,
            present:     raw.present_count,
            absent:      raw.absent_count,
        };
    }

    function _pushToStore(raw) {
        const s = _mapStudent(raw);
        Store.students.push(s);
        Store.filteredStudents = [...Store.students];
        render();
    }

    function _updateInStore(raw) {
        const idx = Store.students.findIndex(x => x.id === raw.id);
        if (idx > -1) Store.students[idx] = { ...Store.students[idx], ..._mapStudent(raw) };
    }

    return { init, filter, render, showModal, showAddModal, showEditModal, delete: deleteStudent, exportToExcel };
})();
