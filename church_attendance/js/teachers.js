/**
 * teachers.js — Teachers grid, search/filter, add/edit/delete, modal.
 */

const Teachers = (() => {

    function filter() {
        const search  = (document.getElementById('teacherSearch')?.value          || '').toLowerCase();
        const subject = (document.getElementById('teacherSubjectFilter')?.value   || 'all');

        Store.filteredTeachers = Store.teachers.filter(t =>
            t.name.toLowerCase().includes(search) &&
            (subject === 'all' || t.subject === subject)
        );
        render();
    }

    function render() {
        const container = document.getElementById('teachersGrid');
        if (!container) return;

        if (!Store.filteredTeachers.length) {
            container.innerHTML = `
                <div class="col-12 text-center text-muted py-5">
                    <i class="bi bi-person-badge fs-1 d-block mb-3"></i>لا يوجد خدام
                </div>`;
            return;
        }

        container.innerHTML = Store.filteredTeachers.map(t => `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="student-card">
                    <div class="student-header">
                        <div class="student-info" onclick="Teachers.showModal(${t.id})" style="cursor:pointer;">
                            <div class="student-avatar">${t.avatar}</div>
                            <div>
                                <div class="student-name">${t.name}</div>
                                <div class="student-grade">${t.subject} • ${Utils.gradeLabel(t.assignedClass)}</div>
                            </div>
                        </div>
                        <span class="status-badge status-${t.status}">${Utils.statusLabel(t.status)}</span>
                    </div>

                    <div class="student-stats" onclick="Teachers.showModal(${t.id})" style="cursor:pointer;">
                        <div class="attendance-info">
                            <span class="attendance-label">نسبة الحضور</span>
                            <span class="attendance-value">${t.attendance}%</span>
                        </div>
                        <div class="progress">
                            <div class="progress-bar ${Utils.progressClass(t.attendance)}"
                                 style="width:${t.attendance}%"></div>
                        </div>
                    </div>

                    <div class="student-details" onclick="Teachers.showModal(${t.id})" style="cursor:pointer;">
                        <div class="detail-item"><p>حاضر</p><p class="text-success">${t.present}</p></div>
                        <div class="detail-item"><p>غائب</p><p class="text-danger">${t.absent}</p></div>
                    </div>

                    <div class="student-actions">
                        <a href="https://wa.me/${t.whatsapp}" target="_blank" class="btn btn-whatsapp">
                            <i class="bi bi-whatsapp"></i> واتساب
                        </a>
                        <button class="btn btn-outline-secondary btn-sm"
                                onclick="Teachers.showEditModal(${t.id}, event)"
                                style="border-radius:8px;padding:6px 12px;">
                            <i class="bi bi-pencil-fill"></i> تعديل
                        </button>
                        <button class="btn btn-delete" onclick="Teachers.delete(${t.id}, event)">
                            <i class="bi bi-trash-fill"></i> حذف
                        </button>
                    </div>
                </div>
            </div>`).join('');
    }

    function showModal(teacherId) {
        const t = Store.teachers.find(x => x.id === teacherId);
        if (!t) return;
        Utils.showModal(`
            <div class="text-center mb-4">
                <div class="modal-student-avatar">${t.avatar}</div>
                <h3 class="modal-student-name">${t.name}</h3>
                <p class="modal-student-grade">${t.subject} • ${Utils.gradeLabel(t.assignedClass)}</p>
            </div>
            <div class="modal-attendance-box">
                <div class="modal-attendance-header">
                    <span class="modal-attendance-label">إجمالي الحضور</span>
                    <span class="modal-attendance-value">${t.attendance}%</span>
                </div>
                <div class="progress" style="height:12px;">
                    <div class="progress-bar ${Utils.progressClass(t.attendance)}" style="width:${t.attendance}%"></div>
                </div>
            </div>
            <div class="modal-stats-grid">
                <div class="modal-stat-box modal-stat-present"><h3>${t.present}</h3><p>حاضر</p></div>
                <div class="modal-stat-box modal-stat-absent"><h3>${t.absent}</h3><p>غائب</p></div>
                <div class="modal-stat-box modal-stat-total"><h3>${t.totalClasses}</h3><p>إجمالي</p></div>
            </div>
            <div class="mb-3">
                <a href="https://wa.me/${t.whatsapp}" target="_blank" class="btn btn-whatsapp w-100">
                    <i class="bi bi-whatsapp me-2"></i> التواصل عبر واتساب
                </a>
            </div>
            <div class="modal-current-status status-badge status-${t.status} w-100">
                الحالة الحالية: ${Utils.statusLabel(t.status)}
            </div>`);
    }

    function showAddModal() {
        const modal = Utils.showModal(`
            <h5 class="mb-4 fw-bold"><i class="bi bi-person-badge-fill me-2"></i>إضافة خادم جديد</h5>
            <form id="addTeacherForm">
                <div class="mb-3">
                    <label class="form-label">اسم الخادم</label>
                    <input type="text" class="form-control" id="newTeacherName" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">المادة</label>
                    <input type="text" class="form-control" id="newTeacherSubject" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">الفصل المخصص</label>
                    <select class="form-select" id="newTeacherClass">${GRADE_OPTIONS_HTML}</select>
                </div>
                <div class="mb-3">
                    <label class="form-label">رقم الواتساب</label>
                    <input type="text" class="form-control" id="newTeacherWhatsapp" placeholder="+20123456789">
                </div>
                <button type="submit" class="btn btn-gradient w-100">إضافة خادم</button>
            </form>`);

        document.getElementById('addTeacherForm').addEventListener('submit', async e => {
            e.preventDefault();
            try {
                const raw = await Api.post('/teachers', {
                    name:          document.getElementById('newTeacherName').value.trim(),
                    subject:       document.getElementById('newTeacherSubject').value.trim(),
                    assignedClass: document.getElementById('newTeacherClass').value,
                    whatsapp:      document.getElementById('newTeacherWhatsapp').value.trim(),
                });
                _pushToStore(raw);
                modal.hide();
                alert('تم إضافة الخادم بنجاح!');
            } catch (err) { alert('خطأ: ' + err.message); }
        });
    }

    function showEditModal(teacherId, event) {
        event?.stopPropagation();
        const t = Store.teachers.find(x => x.id === teacherId);
        if (!t) return;

        const modal = Utils.showModal(`
            <h5 class="mb-4 fw-bold"><i class="bi bi-pencil-fill me-2"></i>تعديل بيانات الخادم</h5>
            <form id="editTeacherForm">
                <div class="mb-3">
                    <label class="form-label">اسم الخادم</label>
                    <input type="text" class="form-control" id="editTeacherName" value="${t.name}" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">القسم / المادة</label>
                    <input type="text" class="form-control" id="editTeacherSubject" value="${t.subject || ''}">
                </div>
                <div class="mb-3">
                    <label class="form-label">الفصل المخصص</label>
                    <input type="text" class="form-control" id="editTeacherClass" value="${t.assignedClass || ''}">
                </div>
                <div class="mb-3">
                    <label class="form-label">رقم الواتساب</label>
                    <input type="text" class="form-control" id="editTeacherWhatsapp" value="${t.whatsapp || ''}">
                </div>
                <div class="d-flex gap-2">
                    <button type="submit" class="btn btn-gradient flex-fill">حفظ التعديلات</button>
                    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">إلغاء</button>
                </div>
            </form>`);

        document.getElementById('editTeacherForm').addEventListener('submit', async e => {
            e.preventDefault();
            try {
                const updated = await Api.put(`/teachers/${teacherId}`, {
                    name:          document.getElementById('editTeacherName').value.trim(),
                    subject:       document.getElementById('editTeacherSubject').value.trim(),
                    assignedClass: document.getElementById('editTeacherClass').value.trim(),
                    whatsapp:      document.getElementById('editTeacherWhatsapp').value.trim(),
                });
                _updateInStore(updated);
                Store.filteredTeachers = [...Store.teachers];
                filter();
                modal.hide();
                alert('تم تعديل بيانات الخادم بنجاح!');
            } catch (err) { alert('خطأ: ' + err.message); }
        });
    }

    async function deleteTeacher(teacherId, event) {
        event?.stopPropagation();
        if (!confirm('هل أنت متأكد من حذف هذا الخادم؟')) return;
        try {
            await Api.del(`/teachers/${teacherId}`);
            Store.teachers        = Store.teachers.filter(t => t.id !== teacherId);
            Store.filteredTeachers = [...Store.teachers];
            render();
            alert('تم حذف الخادم بنجاح!');
        } catch (err) { alert('خطأ: ' + err.message); }
    }

    function exportToExcel() {
        const rows = Store.teachers.map(t => ({
            'ID':             String(t.id).padStart(4, '0'),
            'الاسم':          t.name,
            'المادة':         t.subject,
            'الفصل المخصص':  t.assignedClass,
            'الحالة':         Utils.statusLabel(t.status),
            'نسبة الحضور':   t.attendance + '%',
            'حاضر':           t.present,
            'غائب':           t.absent,
            'إجمالي الحصص': t.totalClasses,
            'واتساب':        t.whatsapp,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'الخدام');
        XLSX.writeFile(wb, `الخدام_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.xlsx`);
    }

    // ── private ────────────────────────────────────────────────────────────
    function _map(raw) {
        return {
            id: raw.id, name: raw.name, subject: raw.subject,
            assignedClass: raw.assigned_class,
            whatsapp:  raw.whatsapp || '',
            avatar:    raw.avatar || raw.name.substring(0, 2).toUpperCase(),
            attendance: raw.attendance, status: raw.status,
            totalClasses: raw.total_classes, present: raw.present_count, absent: raw.absent_count,
        };
    }
    function _pushToStore(raw) {
        Store.teachers.push(_map(raw));
        Store.filteredTeachers = [...Store.teachers];
        render();
    }
    function _updateInStore(raw) {
        const idx = Store.teachers.findIndex(x => x.id === raw.id);
        if (idx > -1) Store.teachers[idx] = { ...Store.teachers[idx], ..._map(raw) };
    }

    return { filter, render, showModal, showAddModal, showEditModal, delete: deleteTeacher, exportToExcel };
})();
