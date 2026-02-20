/**
 * users.js — User management page (admin only).
 * Create / edit / delete teacher accounts.
 */

const UserMgmt = (() => {

    async function load() {
        try {
            const users = await Api.get('/users');
            _render(users);
        } catch (err) {
            document.getElementById('usersGrid').innerHTML =
                `<div class="col-12 text-center text-danger py-4">
                    <i class="bi bi-exclamation-triangle me-2"></i>خطأ في تحميل الحسابات
                </div>`;
        }
    }

    function showAddModal() {
        const modal = Utils.showModal(`
            <h5 class="mb-4 fw-bold">
                <i class="bi bi-person-plus-fill me-2"></i>إضافة حساب جديد
            </h5>
            <form id="addUserForm" autocomplete="off">
                <div class="mb-3">
                    <label class="form-label">الاسم الكامل</label>
                    <input type="text" class="form-control" id="newUserName" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">اسم المستخدم</label>
                    <input type="text" class="form-control" id="newUserUsername"
                           required autocomplete="off" dir="ltr">
                </div>
                <div class="mb-3">
                    <label class="form-label">كلمة المرور</label>
                    <input type="password" class="form-control" id="newUserPassword"
                           required minlength="6" autocomplete="new-password">
                </div>
                <div class="mb-3">
                    <label class="form-label">الدور</label>
                    <select class="form-select" id="newUserRole"
                            onchange="_toggleClassField('newClassWrap', this.value)">
                        <option value="teacher">خادم (معلم)</option>
                        <option value="admin">مسؤول</option>
                    </select>
                </div>
                <div class="mb-3" id="newClassWrap">
                    <label class="form-label">الفصل المخصص</label>
                    <select class="form-select" id="newUserClass">${GRADE_OPTIONS_HTML}</select>
                </div>
                <button type="submit" class="btn btn-gradient w-100">إنشاء الحساب</button>
            </form>`);

        document.getElementById('addUserForm').addEventListener('submit', async e => {
            e.preventDefault();
            const role = document.getElementById('newUserRole').value;
            try {
                await Api.post('/users', {
                    name:           document.getElementById('newUserName').value.trim(),
                    username:       document.getElementById('newUserUsername').value.trim().toLowerCase(),
                    password:       document.getElementById('newUserPassword').value,
                    role,
                    assigned_class: role === 'teacher'
                        ? document.getElementById('newUserClass').value
                        : null,
                });
                modal.hide();
                load();
                alert('تم إنشاء الحساب بنجاح!');
            } catch (err) { alert('خطأ: ' + err.message); }
        });
    }

    async function showEditModal(userId) {
        let users;
        try { users = await Api.get('/users'); }
        catch { alert('خطأ في تحميل البيانات'); return; }

        const u = users.find(x => x.id === userId);
        if (!u) return;

        const isTeacher = u.role === 'teacher';
        const modal = Utils.showModal(`
            <h5 class="mb-4 fw-bold">
                <i class="bi bi-pencil-fill me-2"></i>تعديل الحساب
            </h5>
            <form id="editUserForm" autocomplete="off">
                <div class="mb-3">
                    <label class="form-label">الاسم الكامل</label>
                    <input type="text" class="form-control" id="editUserName" value="${u.name}" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">اسم المستخدم</label>
                    <input type="text" class="form-control" id="editUserUsername"
                           value="${u.username}" required dir="ltr">
                </div>
                <div class="mb-3">
                    <label class="form-label">
                        كلمة مرور جديدة
                        <small class="text-muted">(اتركها فارغة للإبقاء على الحالية)</small>
                    </label>
                    <input type="password" class="form-control" id="editUserPassword"
                           placeholder="اترك فارغاً للإبقاء" autocomplete="new-password">
                </div>
                <div class="mb-3">
                    <label class="form-label">الدور</label>
                    <select class="form-select" id="editUserRole"
                            onchange="_toggleClassField('editClassWrap', this.value)">
                        <option value="teacher" ${!isTeacher ? ''        : 'selected'}>خادم (معلم)</option>
                        <option value="admin"   ${ isTeacher ? '' : 'selected'}>مسؤول</option>
                    </select>
                </div>
                <div class="mb-3" id="editClassWrap"
                     style="${isTeacher ? '' : 'display:none'}">
                    <label class="form-label">الفصل المخصص</label>
                    <select class="form-select" id="editUserClass">
                        ${gradeOptionsWithSelected(u.assigned_class || 'KG1')}
                    </select>
                </div>
                <div class="d-flex gap-2">
                    <button type="submit" class="btn btn-gradient flex-fill">حفظ التعديلات</button>
                    <button type="button" class="btn btn-outline-secondary"
                            data-bs-dismiss="modal">إلغاء</button>
                </div>
            </form>`);

        document.getElementById('editUserForm').addEventListener('submit', async e => {
            e.preventDefault();
            const role = document.getElementById('editUserRole').value;
            try {
                await Api.put(`/users/${userId}`, {
                    name:           document.getElementById('editUserName').value.trim(),
                    username:       document.getElementById('editUserUsername').value.trim().toLowerCase(),
                    password:       document.getElementById('editUserPassword').value,
                    role,
                    assigned_class: role === 'teacher'
                        ? document.getElementById('editUserClass').value
                        : null,
                });
                modal.hide();
                load();
                alert('تم تعديل الحساب بنجاح!');
            } catch (err) { alert('خطأ: ' + err.message); }
        });
    }

    async function deleteUser(userId) {
        if (!confirm('هل أنت متأكد من حذف هذا الحساب؟')) return;
        try {
            await Api.del(`/users/${userId}`);
            load();
            alert('تم حذف الحساب بنجاح!');
        } catch (err) { alert('خطأ: ' + err.message); }
    }

    // ── private ────────────────────────────────────────────────────────────

    function _render(users) {
        const container = document.getElementById('usersGrid');
        if (!container) return;

        if (!users.length) {
            container.innerHTML = '<div class="col-12 text-center text-muted py-5">لا توجد حسابات</div>';
            return;
        }

        container.innerHTML = users.map(u => {
            const isAdmin  = u.role === 'admin';
            const initials = Utils.makeAvatar(u.name);
            return `
                <div class="col-12 col-md-6 col-lg-4">
                    <div class="user-card">
                        <div class="d-flex align-items-center gap-3 mb-3">
                            <div class="user-avatar-big ${isAdmin ? 'avatar-admin' : 'avatar-teacher'}">
                                ${initials}
                            </div>
                            <div class="flex-grow-1 overflow-hidden">
                                <div class="fw-bold text-truncate"
                                     style="font-family:'Cairo',sans-serif;">
                                    ${u.name}
                                </div>
                                <div class="text-muted small" dir="ltr">${u.username}</div>
                            </div>
                            <span class="role-badge ${isAdmin ? 'role-admin' : 'role-teacher'} flex-shrink-0">
                                ${isAdmin ? 'مسؤول' : 'خادم'}
                            </span>
                        </div>
                        ${u.assigned_class
                            ? `<div class="mb-3 text-muted small">
                                   <i class="bi bi-mortarboard me-1"></i>
                                   الفصل: <strong>${Utils.gradeLabel(u.assigned_class)}</strong>
                               </div>`
                            : ''}
                        <div class="d-flex gap-2">
                            <button class="btn btn-outline-primary btn-sm flex-fill"
                                    onclick="UserMgmt.showEditModal(${u.id})">
                                <i class="bi bi-pencil-fill me-1"></i>تعديل
                            </button>
                            <button class="btn btn-outline-danger btn-sm"
                                    onclick="UserMgmt.deleteUser(${u.id})">
                                <i class="bi bi-trash-fill"></i>
                            </button>
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    return { load, showAddModal, showEditModal, deleteUser };
})();

/** Global helper used by inline onchange in the modal — toggle class field visibility */
function _toggleClassField(wrapId, role) {
    const wrap = document.getElementById(wrapId);
    if (wrap) wrap.style.display = role === 'teacher' ? '' : 'none';
}
