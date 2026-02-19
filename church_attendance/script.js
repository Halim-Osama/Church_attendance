// ===================================
// API CONFIGURATION
// ===================================
const API_BASE = 'http://localhost:5000/api';

async function apiFetch(endpoint, options = {}) {
    try {
        const res = await fetch(API_BASE + endpoint, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        if (!res.ok) throw new Error('API error ' + res.status);
        return await res.json();
    } catch (e) {
        console.error('API call failed:', endpoint, e);
        throw e;
    }
}

// ===================================
// BACKEND-CONNECTED STORAGE HELPERS
// ===================================

// saveToStorage: now a no-op — data is persisted to SQLite via API calls
function saveToStorage() {
    // Data is persisted to SQLite via the backend
}

// loadFromStorage is replaced by loadFromAPI (called at startup)
function loadFromStorage() {
    // Replaced by loadFromAPI()
}

async function loadFromAPI() {
    const today = new Date().toISOString().split('T')[0];
    const [students, teachers, history, attRec, teacherAttRec] = await Promise.all([
        apiFetch('/students'),
        apiFetch('/teachers'),
        apiFetch('/attendance/history'),
        apiFetch('/attendance/records?date=' + today),
        apiFetch('/teacher-attendance/records?date=' + today)
    ]);

    // Map DB columns to JS object shape expected by existing code
    mockStudents = students.map(s => ({
        id: s.id,
        name: s.name,
        grade: s.grade,
        whatsapp: s.whatsapp || '',
        avatar: s.avatar || s.name.substring(0,2).toUpperCase(),
        attendance: s.attendance,
        status: s.status,
        totalClasses: s.total_classes,
        present: s.present_count,
        absent: s.absent_count,
        birthdate: s.birthdate || ''
    }));

    mockTeachers = teachers.map(t => ({
        id: t.id,
        name: t.name,
        subject: t.subject,
        assignedClass: t.assigned_class,
        whatsapp: t.whatsapp || '',
        avatar: t.avatar || t.name.substring(0,2).toUpperCase(),
        attendance: t.attendance,
        status: t.status,
        totalClasses: t.total_classes,
        present: t.present_count,
        absent: t.absent_count
    }));

    attendanceHistory = history;

    // attendance records: {studentId: {status, date}}
    attendanceRecords = {};
    for (const [sid, status] of Object.entries(attRec)) {
        attendanceRecords[parseInt(sid)] = { status, date: today };
    }

    teacherAttendanceRecords = {};
    for (const [tid, status] of Object.entries(teacherAttRec)) {
        teacherAttendanceRecords[parseInt(tid)] = { status, date: today };
    }

    filteredStudents = [...mockStudents];
    filteredTeachers = [...mockTeachers];
}

// ===================================
// DEFAULT DATA — cleared, all data comes from the database
// ===================================
const DEFAULT_STUDENTS = [];
const DEFAULT_TEACHERS = [];

// ===================================
// LOCAL STORAGE HELPERS
// ===================================
function saveToStorage() {
    try {
        localStorage.setItem('church_students', JSON.stringify(mockStudents));
        localStorage.setItem('church_teachers', JSON.stringify(mockTeachers));
        localStorage.setItem('church_attendanceHistory', JSON.stringify(attendanceHistory));
        localStorage.setItem('church_attendanceRecords', JSON.stringify(attendanceRecords));
        localStorage.setItem('church_teacherAttendanceRecords', JSON.stringify(teacherAttendanceRecords));
    } catch(e) {
        console.warn('Could not save to localStorage:', e);
    }
}

function loadFromStorage() {
    try {
        const students = localStorage.getItem('church_students');
        const teachers = localStorage.getItem('church_teachers');
        const history = localStorage.getItem('church_attendanceHistory');
        const attRec = localStorage.getItem('church_attendanceRecords');
        const teacherAttRec = localStorage.getItem('church_teacherAttendanceRecords');

        if (students) mockStudents = JSON.parse(students);
        if (teachers) mockTeachers = JSON.parse(teachers);
        if (history) attendanceHistory = JSON.parse(history);
        if (attRec) attendanceRecords = JSON.parse(attRec);
        if (teacherAttRec) teacherAttendanceRecords = JSON.parse(teacherAttRec);
    } catch(e) {
        console.warn('Could not load from localStorage:', e);
    }
}

// ===================================
// DATA
// ===================================
let mockStudents = [...DEFAULT_STUDENTS];
let mockTeachers = [...DEFAULT_TEACHERS];

let attendanceHistory = []; // loaded from database via API

// ===================================
// STATE MANAGEMENT
// ===================================
let currentDashboardPage = 'dashboard';
let filteredStudents = [];
let filteredTeachers = [];

// Current user is always admin (no login)
let currentUser = {
    role: 'admin',
    name: 'مسؤول النظام'
};

let attendanceRecords = {};
let teacherAttendanceRecords = {};
let selectedAttendanceClass = 'all';

// ===================================
// EXPORT ALL DATA (JSON backup)
// ===================================
function exportAllData() {
    const data = {
        students: mockStudents,
        teachers: mockTeachers,
        attendanceHistory: attendanceHistory,
        attendanceRecords: attendanceRecords,
        teacherAttendanceRecords: teacherAttendanceRecords,
        exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `church_backup_${new Date().toLocaleDateString('ar-EG').replace(/\//g,'-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// ===================================
// IMPORT ALL DATA (JSON restore)
// ===================================
function importAllData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.students) mockStudents = data.students;
            if (data.teachers) mockTeachers = data.teachers;
            if (data.attendanceHistory) attendanceHistory = data.attendanceHistory;
            if (data.attendanceRecords) attendanceRecords = data.attendanceRecords;
            if (data.teacherAttendanceRecords) teacherAttendanceRecords = data.teacherAttendanceRecords;
            saveToStorage();
            filteredStudents = [...mockStudents];
            filteredTeachers = [...mockTeachers];
            initDashboard();
            alert('تم استيراد البيانات بنجاح!');
        } catch(err) {
            alert('خطأ في قراءة الملف. تأكد من أنه ملف JSON صحيح.');
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

// ===================================
// PAGE NAVIGATION
// ===================================
function showDashboardPage(page) {
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    if (event && event.target) {
        const navLink = event.target.closest('.nav-link');
        if (navLink) navLink.classList.add('active');
    }
    
    const pages = ['dashboard', 'students', 'teachers', 'attendance', 'teacherAttendance', 'reports', 'attendanceLog'];
    pages.forEach(p => {
        const el = document.getElementById(p + 'Page');
        if (el) el.classList.add('d-none');
    });
    
    currentDashboardPage = page;
    const targetPage = document.getElementById(page + 'Page');
    if (targetPage) targetPage.classList.remove('d-none');
    
    if (window.innerWidth < 992) {
        document.getElementById('sidebar').classList.remove('show');
    }
    
    if (page === 'students') {
        filteredStudents = [...mockStudents];
        renderStudentsGrid();
    } else if (page === 'teachers') {
        filteredTeachers = [...mockTeachers];
        renderTeachersGrid();
    } else if (page === 'attendance') {
        renderAttendanceTable();
    } else if (page === 'teacherAttendance') {
        renderTeacherAttendanceTable();
    } else if (page === 'reports') {
        renderReports();
    } else if (page === 'attendanceLog') {
        loadAttendanceLog();
    } else if (page === 'dashboard') {
        updateCurrentDate();
        updateDashboardStats();
        renderAttendanceTrends();
        renderTopPerformers();
    }
}

// ===================================
// SIDEBAR TOGGLE
// ===================================
document.getElementById('sidebarToggle').addEventListener('click', function() {
    document.getElementById('sidebar').classList.remove('show');
});

document.getElementById('mobileMenuToggle').addEventListener('click', function() {
    document.getElementById('sidebar').classList.add('show');
});

// ===================================
// DASHBOARD INITIALIZATION
// ===================================
function initDashboard() {
    updateCurrentDate();
    updateDashboardStats();
    renderAttendanceTrends();
    renderTopPerformers();
    
    // Initialize attendance records for any new students/teachers
    mockStudents.forEach(student => {
        if (!attendanceRecords[student.id]) {
            attendanceRecords[student.id] = { status: 'none', date: null };
        }
    });
    mockTeachers.forEach(teacher => {
        if (!teacherAttendanceRecords[teacher.id]) {
            teacherAttendanceRecords[teacher.id] = { status: 'none', date: null };
        }
    });
}

function updateCurrentDate() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateEl = document.getElementById('currentDate');
    if (dateEl) dateEl.textContent = today.toLocaleDateString('ar-EG', options);
    
    // Schedule refresh at next midnight so date stays current
    const now = new Date();
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
    setTimeout(() => {
        updateCurrentDate();
        updateDashboardStats();
        renderAttendanceTrends();
    }, msUntilMidnight);
}

function updateDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    
    // Count from current unsaved session records first
    let presentCount = 0, absentCount = 0, lateCount = 0;
    let anyTodayRecord = false;
    
    Object.values(attendanceRecords).forEach(rec => {
        if (rec.date === today && rec.status !== 'none') {
            anyTodayRecord = true;
            if (rec.status === 'present') presentCount++;
            else if (rec.status === 'absent') absentCount++;
            else if (rec.status === 'late') lateCount++;
        }
    });

    // If attendance was already saved today, use attendanceHistory
    if (!anyTodayRecord) {
        const todayHistory = attendanceHistory.find(h => h.date === today);
        if (todayHistory) {
            presentCount = todayHistory.present;
            absentCount = todayHistory.absent;
            lateCount = todayHistory.late;
        }
    }

    const totalEl = document.getElementById('totalStudentsStat');
    const presentEl = document.getElementById('presentTodayStat');
    const absentEl = document.getElementById('absentTodayStat');
    const lateEl = document.getElementById('lateTodayStat');
    
    if (totalEl) totalEl.textContent = mockStudents.length;
    if (presentEl) presentEl.textContent = presentCount;
    if (absentEl) absentEl.textContent = absentCount;
    if (lateEl) lateEl.textContent = lateCount;
}

// ===================================
// RENDER ATTENDANCE TRENDS
// ===================================
function renderAttendanceTrends() {
    const container = document.getElementById('attendanceTrends');
    if (!container) return;
    
    let html = '<div class="mt-3">';
    attendanceHistory.slice(-5).reverse().forEach(day => {
        const total = day.present + day.absent + day.late;
        if (total === 0) return;
        const presentPerc = (day.present / total) * 100;
        const absentPerc = (day.absent / total) * 100;
        const latePerc = (day.late / total) * 100;
        
        const date = new Date(day.date);
        const dateStr = date.toLocaleDateString('ar-EG', { weekday: 'short', month: 'short', day: 'numeric' });
        
        html += `
            <div class="trend-item">
                <div class="trend-header">
                    <span class="trend-date">${dateStr}</span>
                    <span class="trend-count">${total} طالب</span>
                </div>
                <div class="trend-bar">
                    <div class="trend-present" style="width: ${presentPerc}%"></div>
                    <div class="trend-absent" style="width: ${absentPerc}%"></div>
                    <div class="trend-late" style="width: ${latePerc}%"></div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// ===================================
// RENDER TOP PERFORMERS
// ===================================
function renderTopPerformers() {
    const container = document.getElementById('topPerformers');
    if (!container) return;
    const topStudents = [...mockStudents].sort((a, b) => b.attendance - a.attendance).slice(0, 5);
    
    let html = '<div class="mt-3">';
    topStudents.forEach((student, index) => {
        let rankClass = 'rank-other';
        if (index === 0) rankClass = 'rank-gold';
        else if (index === 1) rankClass = 'rank-silver';
        else if (index === 2) rankClass = 'rank-bronze';
        
        const rankIcon = index < 3 ? '<i class="bi bi-award-fill"></i>' : (index + 1);
        
        html += `
            <div class="performer-item">
                <div class="performer-rank ${rankClass}">${rankIcon}</div>
                <div class="performer-info">
                    <div class="performer-name">${student.name}</div>
                    <div class="performer-grade">${getGradeLabel(student.grade)}</div>
                </div>
                <div class="performer-rate">${student.attendance}%</div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// ===================================
// STUDENTS GRID
// ===================================
function renderStudentsGrid() {
    const container = document.getElementById('studentsGrid');
    if (!container) return;
    
    let html = '';
    filteredStudents.forEach(student => {
        const progressClass = student.attendance >= 90 ? 'bg-success' : 
                            student.attendance >= 75 ? 'bg-warning' : 'bg-danger';
        
        html += `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="student-card">
                    <div class="student-header">
                        <div class="student-info" onclick="showStudentModal(${student.id})" style="cursor:pointer;">
                            <div class="student-avatar">${student.avatar}</div>
                            <div>
                                <div class="student-name">${student.name}</div>
                                <div class="student-grade">${getGradeLabel(student.grade)}</div>
                            </div>
                        </div>
                        <span class="status-badge status-${student.status}">${getStatusArabic(student.status)}</span>
                    </div>
                    
                    <div class="student-stats" onclick="showStudentModal(${student.id})" style="cursor:pointer;">
                        <div class="attendance-info">
                            <span class="attendance-label">نسبة الحضور</span>
                            <span class="attendance-value">${student.attendance}%</span>
                        </div>
                        <div class="progress">
                            <div class="progress-bar ${progressClass}" style="width: ${student.attendance}%"></div>
                        </div>
                    </div>
                    
                    <div class="student-details" onclick="showStudentModal(${student.id})" style="cursor:pointer;">
                        <div class="detail-item">
                            <p>حاضر</p>
                            <p class="text-success">${student.present}</p>
                        </div>
                        <div class="detail-item">
                            <p>غائب</p>
                            <p class="text-danger">${student.absent}</p>
                        </div>
                    </div>
                    
                    <div class="student-actions">
                        <a href="https://wa.me/${student.whatsapp}" target="_blank" class="btn btn-whatsapp">
                            <i class="bi bi-whatsapp"></i> واتساب
                        </a>
                        <button class="btn btn-outline-secondary btn-sm" onclick="showEditStudentModal(${student.id}, event)" style="border-radius:8px;padding:6px 12px;">
                            <i class="bi bi-pencil-fill"></i> تعديل
                        </button>
                        <button class="btn btn-delete" onclick="deleteStudent(${student.id}, event)">
                            <i class="bi bi-trash-fill"></i> حذف
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<div class="col-12 text-center text-muted py-5"><i class="bi bi-people fs-1 d-block mb-3"></i>لا يوجد طلاب</div>';
}

// ===================================
// UTILITY FUNCTIONS
// ===================================
function getStatusArabic(status) {
    const statusMap = {
        'present': 'حاضر',
        'absent': 'غائب',
        'late': 'متأخر',
        'none': 'غير محدد'
    };
    return statusMap[status] || status;
}

function getGradeLabel(grade) {
    const gradeMap = {
        'KG1': 'KG1',
        'KG2': 'KG2',
        '1':  'الصف الأول الابتدائي',
        '2':  'الصف الثاني الابتدائي',
        '3':  'الصف الثالث الابتدائي',
        '4':  'الصف الرابع الابتدائي',
        '5':  'الصف الخامس الابتدائي',
        '6':  'الصف السادس الابتدائي',
        '7':  'الصف الأول الإعدادي',
        '8':  'الصف الثاني الإعدادي',
        '9':  'الصف الثالث الإعدادي',
        '10': 'الصف الأول الثانوي',
        '11': 'الصف الثاني الثانوي',
        '12': 'الصف الثالث الثانوي',
    };
    return gradeMap[grade] || grade;
}

// ===================================
// STUDENT SEARCH & FILTER
// ===================================
document.getElementById('studentSearch')?.addEventListener('input', filterStudents);
document.getElementById('gradeFilter')?.addEventListener('change', filterStudents);

function filterStudents() {
    const searchEl = document.getElementById('studentSearch');
    const gradeEl = document.getElementById('gradeFilter');
    const searchTerm = searchEl ? searchEl.value.toLowerCase() : '';
    const gradeFilter = gradeEl ? gradeEl.value : 'all';
    
    filteredStudents = mockStudents.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(searchTerm);
        const matchesGrade = gradeFilter === 'all' || student.grade === gradeFilter;
        return matchesSearch && matchesGrade;
    });
    
    renderStudentsGrid();
}

// ===================================
// STUDENT MODAL
// ===================================
function showStudentModal(studentId) {
    const student = mockStudents.find(s => s.id === studentId);
    if (!student) return;
    
    const modalBody = document.getElementById('studentModalBody');
    const progressClass = student.attendance >= 90 ? 'bg-success' : 
                        student.attendance >= 75 ? 'bg-warning' : 'bg-danger';
    
    modalBody.innerHTML = `
        <div class="text-center mb-4">
            <div class="modal-student-avatar">${student.avatar}</div>
            <h3 class="modal-student-name">${student.name}</h3>
            <p class="modal-student-grade">${getGradeLabel(student.grade)}</p>
            ${student.birthdate ? `<p class="text-muted small mb-0"><i class="bi bi-calendar3 me-1"></i>تاريخ الميلاد: ${student.birthdate}</p>` : ''}
        </div>
        
        <div class="modal-attendance-box">
            <div class="modal-attendance-header">
                <span class="modal-attendance-label">إجمالي الحضور</span>
                <span class="modal-attendance-value">${student.attendance}%</span>
            </div>
            <div class="progress" style="height: 12px;">
                <div class="progress-bar ${progressClass}" style="width: ${student.attendance}%"></div>
            </div>
        </div>
        
        <div class="modal-stats-grid">
            <div class="modal-stat-box modal-stat-present">
                <h3>${student.present}</h3>
                <p>حاضر</p>
            </div>
            <div class="modal-stat-box modal-stat-absent">
                <h3>${student.absent}</h3>
                <p>غائب</p>
            </div>
            <div class="modal-stat-box modal-stat-total">
                <h3>${student.totalClasses}</h3>
                <p>إجمالي</p>
            </div>
        </div>
        
        <div class="mb-3">
            <a href="https://wa.me/${student.whatsapp}" target="_blank" class="btn btn-whatsapp w-100">
                <i class="bi bi-whatsapp me-2"></i> التواصل عبر واتساب
            </a>
        </div>
        
        <div class="modal-current-status status-badge status-${student.status} w-100">
            الحالة الحالية: ${getStatusArabic(student.status)}
        </div>
    `;
    
    // Add attendance history section
    fetch(API_BASE + '/students/' + student.id + '/history')
        .then(r => r.json())
        .then(history => {
            const histDiv = document.createElement('div');
            histDiv.className = 'mt-3';
            if (history.length === 0) {
                histDiv.innerHTML = '<p class="text-muted text-center small">لا يوجد سجل حضور محفوظ بعد</p>';
            } else {
                histDiv.innerHTML = '<h6 class="fw-bold mb-2"><i class="bi bi-clock-history me-1"></i>سجل الحضور</h6>' +
                    '<div style="max-height:160px;overflow-y:auto;">' +
                    '<table class="table table-sm table-bordered mb-0"><thead><tr><th>التاريخ</th><th>الحالة</th></tr></thead><tbody>' +
                    history.map(h => `<tr><td>${new Date(h.date).toLocaleDateString('ar-EG')}</td><td><span class="status-badge status-${h.status}">${getStatusArabic(h.status)}</span></td></tr>`).join('') +
                    '</tbody></table></div>';
            }
            document.getElementById('studentModalBody').appendChild(histDiv);
        }).catch(() => {});

    const modal = new bootstrap.Modal(document.getElementById('studentModal'));
    modal.show();
}

// ===================================
// CLASS FILTER FOR ATTENDANCE
// ===================================
function filterAttendanceByClass() {
    selectedAttendanceClass = document.getElementById('attendanceClassFilter').value;
    renderAttendanceTable();
}

// ===================================
// ATTENDANCE TABLE
// ===================================
function renderAttendanceTable() {
    const tbody = document.querySelector('#attendanceTable tbody');
    if (!tbody) return;
    
    let studentsToShow = selectedAttendanceClass === 'all' ? 
        mockStudents : 
        mockStudents.filter(s => s.grade === selectedAttendanceClass);
    
    let html = '';
    studentsToShow.forEach(student => {
        const rateColor = student.attendance >= 90 ? '#10b981' : 
                         student.attendance >= 75 ? '#f59e0b' : '#ef4444';
        const currentStatus = attendanceRecords[student.id]?.status || 'none';
        
        html += `
            <tr>
                <td>
                    <div class="table-student-info" onclick="showStudentModal(${student.id})" style="cursor: pointer;">
                        <div class="table-avatar">${student.avatar}</div>
                        <div>
                            <div class="table-name">${student.name}</div>
                            <div class="table-id">ID: ${String(student.id).padStart(4, '0')}</div>
                        </div>
                    </div>
                </td>
                <td><span class="grade-badge">${getGradeLabel(student.grade)}</span></td>
                <td>
                    <div class="rate-display">
                        <div class="rate-bar">
                            <div class="rate-fill" style="width: ${student.attendance}%; background: ${rateColor}"></div>
                        </div>
                        <span class="rate-text">${student.attendance}%</span>
                    </div>
                </td>
                <td>
                    <div class="status-actions">
                        <button class="btn-status btn-present ${currentStatus === 'present' ? 'active' : ''}" 
                                onclick="markAttendance(${student.id}, 'present')">
                            <i class="bi bi-check-circle-fill"></i> حاضر
                        </button>
                        <button class="btn-status btn-absent ${currentStatus === 'absent' ? 'active' : ''}" 
                                onclick="markAttendance(${student.id}, 'absent')">
                            <i class="bi bi-x-circle-fill"></i> غائب
                        </button>
                        <button class="btn-status btn-late ${currentStatus === 'late' ? 'active' : ''}" 
                                onclick="markAttendance(${student.id}, 'late')">
                            <i class="bi bi-clock-fill"></i> متأخر
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html || '<tr><td colspan="4" class="text-center text-muted py-4">لا يوجد طلاب</td></tr>';
}

// ===================================
// MARK ATTENDANCE
// ===================================
function markAttendance(studentId, status) {
    const today = new Date().toISOString().split('T')[0];
    attendanceRecords[studentId] = { status: status, date: today };
    // Persist to backend
    apiFetch('/attendance/mark', {
        method: 'POST',
        body: JSON.stringify({ studentId, status, date: today })
    }).catch(e => console.warn('markAttendance API failed', e));
    renderAttendanceTable();
    updateDashboardStats();
}

// ===================================
// SAVE ATTENDANCE AND UPDATE STATS
// ===================================
async function saveAttendance() {
    const today = new Date().toISOString().split('T')[0];
    
    // Build records map for API
    const records = {};
    let hasAny = false;
    mockStudents.forEach(student => {
        const rec = attendanceRecords[student.id];
        if (rec && rec.status !== 'none' && rec.date === today) {
            records[student.id] = rec.status;
            hasAny = true;
        }
    });
    
    if (!hasAny) {
        alert('لم يتم تسجيل أي حضور اليوم!');
        return;
    }
    
    try {
        const result = await apiFetch('/attendance/save', {
            method: 'POST',
            body: JSON.stringify({ date: today, records })
        });
        
        // Reload fresh data from DB
        await loadFromAPI();
        alert(`تم حفظ الحضور بنجاح! تم تحديث ${result.updated} طالب.`);
        renderAttendanceTable();
        updateDashboardStats();
        renderTopPerformers();
        renderAttendanceTrends();
    } catch(e) {
        alert('خطأ في حفظ الحضور. تأكد من تشغيل الخادم.');
    }
}

// ===================================
// IMPORT STUDENTS FROM EXCEL (Attendance page)
// ===================================
function importFromExcel(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            
            let importCount = 0;
            jsonData.forEach(row => {
                const existingStudent = mockStudents.find(s => 
                    s.name.toLowerCase() === (row['Name'] || row['الاسم'] || '').toLowerCase()
                );
                
                if (!existingStudent && (row['Name'] || row['الاسم'])) {
                    const name = row['Name'] || row['الاسم'] || '';
                    const grade = row['Grade'] || row['الفصل'] || 'KG1';
                    const whatsapp = row['WhatsApp'] || row['واتساب'] || '+20100000000';
                    const nameParts = name.split(' ');
                    const avatar = nameParts.length > 1 ? 
                        nameParts[0].substring(0, 1) + nameParts[1].substring(0, 1) : 
                        nameParts[0].substring(0, 2);
                    
                    const newStudent = {
                        id: Math.max(...mockStudents.map(s => s.id), 0) + 1,
                        name, grade,
                        attendance: 100,
                        status: 'present',
                        avatar: avatar.toUpperCase(),
                        totalClasses: 0, present: 0, absent: 0,
                        whatsapp
                    };
                    
                    mockStudents.push(newStudent);
                    importCount++;
                }
            });
            
            // Sync new students with backend
            const newOnes = mockStudents.slice(-(importCount));
            const addPromises = newOnes.map(s => apiFetch('/students', {
                method: 'POST',
                body: JSON.stringify({ name: s.name, grade: s.grade, whatsapp: s.whatsapp })
            }).then(r => { s.id = r.id; }).catch(() => {}));
            Promise.all(addPromises).then(() => {
                alert(`تم استيراد ${importCount} طالب جديد بنجاح!`);
                filterStudents();
            });
            event.target.value = '';
        } catch (error) {
            console.error('Error importing Excel:', error);
            alert('حدث خطأ أثناء استيراد الملف. تأكد من صحة تنسيق الملف.');
        }
    };
    reader.readAsArrayBuffer(file);
}

// ===================================
// IMPORT STUDENTS FROM EXCEL (Students page)
// ===================================
function importStudentsFromExcel(event) {
    importFromExcel(event);
    if (currentDashboardPage === 'students') {
        filteredStudents = [...mockStudents];
        renderStudentsGrid();
    }
}

// ===================================
// EXPORT STUDENTS TO EXCEL
// ===================================
function exportStudentsToExcel() {
    const data = mockStudents.map(student => ({
        'ID': String(student.id).padStart(4, '0'),
        'الاسم': student.name,
        'الفصل': student.grade,
        'الحالة': getStatusArabic(student.status),
        'نسبة الحضور': student.attendance + '%',
        'حاضر': student.present,
        'غائب': student.absent,
        'إجمالي الحصص': student.totalClasses,
        'واتساب': student.whatsapp
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الطلاب');
    XLSX.writeFile(wb, `الطلاب_${new Date().toLocaleDateString('ar-EG').replace(/\//g,'-')}.xlsx`);
}

// ===================================
// IMPORT TEACHERS FROM EXCEL
// ===================================
function importTeachersFromExcel(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            
            let importCount = 0;
            jsonData.forEach(row => {
                const existingTeacher = mockTeachers.find(t => 
                    t.name.toLowerCase() === (row['Name'] || row['الاسم'] || '').toLowerCase()
                );
                
                if (!existingTeacher && (row['Name'] || row['الاسم'])) {
                    const name = row['Name'] || row['الاسم'] || '';
                    const subject = row['Subject'] || row['المادة'] || 'عام';
                    const assignedClass = row['Class'] || row['الفصل'] || 'KG1';
                    const whatsapp = row['WhatsApp'] || row['واتساب'] || '+20100000000';
                    const nameParts = name.split(' ');
                    const avatar = nameParts.length > 1 ? 
                        nameParts[0].substring(0, 1) + nameParts[1].substring(0, 1) : 
                        nameParts[0].substring(0, 2);
                    
                    const newTeacher = {
                        id: Math.max(...mockTeachers.map(t => t.id), 0) + 1,
                        name, subject, assignedClass,
                        attendance: 100,
                        status: 'present',
                        avatar: avatar.toUpperCase(),
                        totalClasses: 0, present: 0, absent: 0,
                        whatsapp
                    };
                    
                    mockTeachers.push(newTeacher);
                    importCount++;
                }
            });
            
            const newOnes = mockTeachers.slice(-(importCount));
            const addPromises = newOnes.map(t => apiFetch('/teachers', {
                method: 'POST',
                body: JSON.stringify({ name: t.name, subject: t.subject, assignedClass: t.assignedClass, whatsapp: t.whatsapp })
            }).then(r => { t.id = r.id; }).catch(() => {}));
            Promise.all(addPromises).then(() => {
                filteredTeachers = [...mockTeachers];
                renderTeachersGrid();
                alert(`تم استيراد ${importCount} خادم جديد بنجاح!`);
            });
            event.target.value = '';
        } catch (error) {
            console.error('Error importing Excel:', error);
            alert('حدث خطأ أثناء استيراد الملف.');
        }
    };
    reader.readAsArrayBuffer(file);
}

// ===================================
// EXPORT TEACHERS TO EXCEL
// ===================================
function exportTeachersToExcel() {
    const data = mockTeachers.map(teacher => ({
        'ID': String(teacher.id).padStart(4, '0'),
        'الاسم': teacher.name,
        'المادة': teacher.subject,
        'الفصل المخصص': teacher.assignedClass,
        'الحالة': getStatusArabic(teacher.status),
        'نسبة الحضور': teacher.attendance + '%',
        'حاضر': teacher.present,
        'غائب': teacher.absent,
        'إجمالي الحصص': teacher.totalClasses,
        'واتساب': teacher.whatsapp
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الخدام');
    XLSX.writeFile(wb, `الخدام_${new Date().toLocaleDateString('ar-EG').replace(/\//g,'-')}.xlsx`);
}

// ===================================
// EXPORT ATTENDANCE FUNCTIONS
// ===================================
function exportAttendance(format) {
    const today = new Date().toLocaleDateString('ar-EG');
    if (format === 'excel') exportToExcel(today);
    else if (format === 'pdf') exportToPDF(today);
    else if (format === 'image') exportToImage(today);
}

function exportToExcel(dateStr) {
    const data = mockStudents.map(student => ({
        'ID': String(student.id).padStart(4, '0'),
        'الاسم': student.name,
        'الفصل': student.grade,
        'الحالة': getStatusArabic(attendanceRecords[student.id]?.status || 'none'),
        'نسبة الحضور': student.attendance + '%',
        'حاضر': student.present,
        'غائب': student.absent,
        'إجمالي الحصص': student.totalClasses
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الحضور');
    XLSX.writeFile(wb, `حضور_${dateStr.replace(/\//g, '-')}.xlsx`);
}

function exportToPDF(dateStr) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('تقرير الحضور', 14, 20);
    doc.setFontSize(12);
    doc.text(`التاريخ: ${dateStr}`, 14, 30);
    
    const tableData = mockStudents.map(student => [
        String(student.id).padStart(4, '0'),
        student.name,
        student.grade,
        getStatusArabic(attendanceRecords[student.id]?.status || 'none'),
        student.attendance + '%',
        student.present.toString(),
        student.absent.toString()
    ]);
    
    doc.autoTable({
        head: [['ID', 'الاسم', 'الفصل', 'الحالة', 'نسبة الحضور', 'حاضر', 'غائب']],
        body: tableData,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [102, 126, 234] }
    });
    
    doc.save(`حضور_${dateStr.replace(/\//g, '-')}.pdf`);
}

function exportToImage(dateStr) {
    const table = document.getElementById('attendanceTable');
    html2canvas(table, { scale: 2, backgroundColor: '#ffffff' }).then(canvas => {
        const link = document.createElement('a');
        link.download = `حضور_${dateStr.replace(/\//g, '-')}.png`;
        link.href = canvas.toDataURL();
        link.click();
    });
}

// ===================================
// REPORTS PAGE
// ===================================
function renderReports() {
    renderGradeAttendance();
    renderMonthlySummary();
    renderAttentionStudents();
}

function renderGradeAttendance() {
    const container = document.getElementById('gradeAttendance');
    if (!container) return;
    
    const gradeNames = ['KG1','KG2','1','2','3','4','5','6','7','8','9','10','11','12'];
    
    let html = '<div class="mt-3">';
    gradeNames.forEach(gradeName => {
        const gradeStudents = mockStudents.filter(s => s.grade === gradeName);
        if (gradeStudents.length === 0) return;
        const avgAttendance = Math.round(gradeStudents.reduce((sum, s) => sum + s.attendance, 0) / gradeStudents.length);
        const progressClass = avgAttendance >= 90 ? 'bg-success' : avgAttendance >= 75 ? 'bg-warning' : 'bg-danger';
        
        html += `
            <div class="grade-report">
                <div class="grade-header">
                    <div>
                        <h4 class="grade-title">${getGradeLabel(gradeName)}</h4>
                        <p class="grade-count">${gradeStudents.length} طالب</p>
                    </div>
                    <div class="grade-percentage">
                        <h3>${avgAttendance}%</h3>
                        <p>متوسط النسبة</p>
                    </div>
                </div>
                <div class="progress" style="height: 12px;">
                    <div class="progress-bar ${progressClass}" style="width: ${avgAttendance}%"></div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function renderMonthlySummary() {
    const container = document.getElementById('monthlySummary');
    if (!container) return;
    
    if (attendanceHistory.length === 0) {
        container.innerHTML = '<p class="text-muted text-center mt-3">لا توجد بيانات بعد</p>';
        return;
    }
    
    const totalPresent = attendanceHistory.reduce((sum, d) => sum + d.present, 0);
    const totalAbsent = attendanceHistory.reduce((sum, d) => sum + d.absent, 0);
    const totalLate = attendanceHistory.reduce((sum, d) => sum + d.late, 0);
    const grandTotal = totalPresent + totalAbsent + totalLate;
    const presentPerc = grandTotal > 0 ? Math.round((totalPresent / grandTotal) * 100) : 0;
    const absentPerc = grandTotal > 0 ? Math.round((totalAbsent / grandTotal) * 100) : 0;
    const latePerc = grandTotal > 0 ? Math.round((totalLate / grandTotal) * 100) : 0;
    
    const maxDay = attendanceHistory.reduce((max, d) => (d.present > max.present ? d : max), attendanceHistory[0]);
    const minDay = attendanceHistory.reduce((min, d) => (d.present < min.present ? d : min), attendanceHistory[0]);
    const avgDaily = Math.round(totalPresent / attendanceHistory.length);
    
    container.innerHTML = `
        <div class="row g-3 mb-4">
            <div class="col-4">
                <div class="summary-box summary-success">
                    <h2>${presentPerc}%</h2>
                    <p>حاضر</p>
                </div>
            </div>
            <div class="col-4">
                <div class="summary-box summary-danger">
                    <h2>${absentPerc}%</h2>
                    <p>غائب</p>
                </div>
            </div>
            <div class="col-4">
                <div class="summary-box summary-warning">
                    <h2>${latePerc}%</h2>
                    <p>متأخر</p>
                </div>
            </div>
        </div>
        <div class="summary-details">
            <div class="summary-item">
                <span>إجمالي أيام مسجلة</span>
                <strong>${attendanceHistory.length}</strong>
            </div>
            <div class="summary-item">
                <span>متوسط الحضور اليومي</span>
                <strong>${avgDaily} طالب</strong>
            </div>
            <div class="summary-item">
                <span>أعلى يوم حضور</span>
                <strong>${new Date(maxDay.date).toLocaleDateString('ar-EG')} (${maxDay.present})</strong>
            </div>
            <div class="summary-item">
                <span>أقل يوم حضور</span>
                <strong>${new Date(minDay.date).toLocaleDateString('ar-EG')} (${minDay.present})</strong>
            </div>
        </div>
    `;
}

function renderAttentionStudents() {
    const container = document.getElementById('attentionStudents');
    if (!container) return;
    const lowAttendance = mockStudents.filter(s => s.attendance < 85);
    
    let html = '';
    lowAttendance.forEach(student => {
        html += `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="attention-card" onclick="showStudentModal(${student.id})" style="cursor: pointer;">
                    <div class="attention-header">
                        <div class="attention-avatar">${student.avatar}</div>
                        <div>
                            <div class="attention-name">${student.name}</div>
                            <div class="attention-grade">${getGradeLabel(student.grade)}</div>
                        </div>
                    </div>
                    <div class="attention-stats">
                        <span class="attention-label">الحضور</span>
                        <span class="attention-value">${student.attendance}%</span>
                    </div>
                    <div class="attention-bar">
                        <div class="attention-fill" style="width: ${student.attendance}%"></div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<div class="col-12 text-center text-muted py-3">جميع الطلاب بحضور ممتاز!</div>';
}

// ===================================
// TEACHERS GRID
// ===================================
function renderTeachersGrid() {
    const container = document.getElementById('teachersGrid');
    if (!container) return;
    
    let html = '';
    filteredTeachers.forEach(teacher => {
        const progressClass = teacher.attendance >= 90 ? 'bg-success' : 
                            teacher.attendance >= 75 ? 'bg-warning' : 'bg-danger';
        
        html += `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="student-card">
                    <div class="student-header">
                        <div class="student-info" onclick="showTeacherModal(${teacher.id})" style="cursor:pointer;">
                            <div class="student-avatar">${teacher.avatar}</div>
                            <div>
                                <div class="student-name">${teacher.name}</div>
                                <div class="student-grade">${teacher.subject} • ${getGradeLabel(teacher.assignedClass)}</div>
                            </div>
                        </div>
                        <span class="status-badge status-${teacher.status}">${getStatusArabic(teacher.status)}</span>
                    </div>
                    
                    <div class="student-stats" onclick="showTeacherModal(${teacher.id})" style="cursor:pointer;">
                        <div class="attendance-info">
                            <span class="attendance-label">نسبة الحضور</span>
                            <span class="attendance-value">${teacher.attendance}%</span>
                        </div>
                        <div class="progress">
                            <div class="progress-bar ${progressClass}" style="width: ${teacher.attendance}%"></div>
                        </div>
                    </div>
                    
                    <div class="student-details" onclick="showTeacherModal(${teacher.id})" style="cursor:pointer;">
                        <div class="detail-item">
                            <p>حاضر</p>
                            <p class="text-success">${teacher.present}</p>
                        </div>
                        <div class="detail-item">
                            <p>غائب</p>
                            <p class="text-danger">${teacher.absent}</p>
                        </div>
                    </div>
                    
                    <div class="student-actions">
                        <a href="https://wa.me/${teacher.whatsapp}" target="_blank" class="btn btn-whatsapp">
                            <i class="bi bi-whatsapp"></i> واتساب
                        </a>
                        <button class="btn btn-outline-secondary btn-sm" onclick="showEditTeacherModal(${teacher.id}, event)" style="border-radius:8px;padding:6px 12px;">
                            <i class="bi bi-pencil-fill"></i> تعديل
                        </button>
                        <button class="btn btn-delete" onclick="deleteTeacher(${teacher.id}, event)">
                            <i class="bi bi-trash-fill"></i> حذف
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<div class="col-12 text-center text-muted py-5"><i class="bi bi-person-badge fs-1 d-block mb-3"></i>لا يوجد خدام</div>';
}

// ===================================
// TEACHER SEARCH & FILTER
// ===================================
function filterTeachers() {
    const searchTerm = document.getElementById('teacherSearch')?.value.toLowerCase() || '';
    const subjectFilter = document.getElementById('teacherSubjectFilter')?.value || 'all';
    filteredTeachers = mockTeachers.filter(teacher => {
        const matchesSearch = teacher.name.toLowerCase().includes(searchTerm);
        const matchesSubject = subjectFilter === 'all' || teacher.subject === subjectFilter;
        return matchesSearch && matchesSubject;
    });
    renderTeachersGrid();
}

// ===================================
// TEACHER MODAL
// ===================================
function showTeacherModal(teacherId) {
    const teacher = mockTeachers.find(t => t.id === teacherId);
    if (!teacher) return;
    
    const modalBody = document.getElementById('studentModalBody');
    const progressClass = teacher.attendance >= 90 ? 'bg-success' : 
                        teacher.attendance >= 75 ? 'bg-warning' : 'bg-danger';
    
    modalBody.innerHTML = `
        <div class="text-center mb-4">
            <div class="modal-student-avatar">${teacher.avatar}</div>
            <h3 class="modal-student-name">${teacher.name}</h3>
            <p class="modal-student-grade">${teacher.subject} • ${getGradeLabel(teacher.assignedClass)}</p>
        </div>
        
        <div class="modal-attendance-box">
            <div class="modal-attendance-header">
                <span class="modal-attendance-label">إجمالي الحضور</span>
                <span class="modal-attendance-value">${teacher.attendance}%</span>
            </div>
            <div class="progress" style="height: 12px;">
                <div class="progress-bar ${progressClass}" style="width: ${teacher.attendance}%"></div>
            </div>
        </div>
        
        <div class="modal-stats-grid">
            <div class="modal-stat-box modal-stat-present">
                <h3>${teacher.present}</h3>
                <p>حاضر</p>
            </div>
            <div class="modal-stat-box modal-stat-absent">
                <h3>${teacher.absent}</h3>
                <p>غائب</p>
            </div>
            <div class="modal-stat-box modal-stat-total">
                <h3>${teacher.totalClasses}</h3>
                <p>إجمالي</p>
            </div>
        </div>
        
        <div class="mb-3">
            <a href="https://wa.me/${teacher.whatsapp}" target="_blank" class="btn btn-whatsapp w-100">
                <i class="bi bi-whatsapp me-2"></i> التواصل عبر واتساب
            </a>
        </div>
        
        <div class="modal-current-status status-badge status-${teacher.status} w-100">
            الحالة الحالية: ${getStatusArabic(teacher.status)}
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('studentModal'));
    modal.show();
}

// ===================================
// DELETE TEACHER
// ===================================
function deleteTeacher(teacherId, event) {
    event.stopPropagation();
    if (confirm('هل أنت متأكد من حذف هذا الخادم؟')) {
        apiFetch('/teachers/' + teacherId, { method: 'DELETE' }).then(() => {
            const index = mockTeachers.findIndex(t => t.id === teacherId);
            if (index > -1) mockTeachers.splice(index, 1);
            filteredTeachers = [...mockTeachers];
            renderTeachersGrid();
            alert('تم حذف الخادم بنجاح!');
        }).catch(() => alert('خطأ في حذف الخادم.'));
    }
}

// ===================================
// ADD TEACHER
// ===================================
function showAddTeacherModal() {
    const modalBody = document.getElementById('studentModalBody');
    
    modalBody.innerHTML = `
        <form id="addTeacherForm">
            <div class="mb-3">
                <label class="form-label">اسم الخادم</label>
                <input type="text" class="form-control" id="teacherName" required>
            </div>
            <div class="mb-3">
                <label class="form-label">المادة</label>
                <input type="text" class="form-control" id="teacherSubject" required>
            </div>
            <div class="mb-3">
                <label class="form-label">الفصل المخصص</label>
                <select class="form-select" id="teacherClass" required>
                    <optgroup label="── ابتدائي ──">
                        <option value="KG1">KG1</option>
                        <option value="KG2">KG2</option>
                        <option value="1">الصف الأول الابتدائي</option>
                        <option value="2">الصف الثاني الابتدائي</option>
                        <option value="3">الصف الثالث الابتدائي</option>
                        <option value="4">الصف الرابع الابتدائي</option>
                        <option value="5">الصف الخامس الابتدائي</option>
                        <option value="6">الصف السادس الابتدائي</option>
                    </optgroup>
                    <optgroup label="── إعدادي ──">
                        <option value="7">الصف الأول الإعدادي</option>
                        <option value="8">الصف الثاني الإعدادي</option>
                        <option value="9">الصف الثالث الإعدادي</option>
                    </optgroup>
                    <optgroup label="── ثانوي ──">
                        <option value="10">الصف الأول الثانوي</option>
                        <option value="11">الصف الثاني الثانوي</option>
                        <option value="12">الصف الثالث الثانوي</option>
                    </optgroup>
                </select>
            </div>
            <div class="mb-3">
                <label class="form-label">رقم الواتساب</label>
                <input type="text" class="form-control" id="teacherWhatsapp" placeholder="+20123456789" required>
            </div>
            <button type="submit" class="btn btn-gradient w-100">إضافة خادم</button>
        </form>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('studentModal'));
    modal.show();
    
    document.getElementById('addTeacherForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('teacherName').value;
        const subject = document.getElementById('teacherSubject').value;
        const assignedClass = document.getElementById('teacherClass').value;
        const whatsapp = document.getElementById('teacherWhatsapp').value;
        
        const nameParts = name.split(' ');
        const avatar = nameParts.length > 1 ? 
            nameParts[0].substring(0, 1) + nameParts[nameParts.length - 1].substring(0, 1) : 
            nameParts[0].substring(0, 2);
        
        apiFetch('/teachers', {
            method: 'POST',
            body: JSON.stringify({ name, subject, assignedClass, whatsapp })
        }).then(newTeacher => {
            const mapped = {
                id: newTeacher.id, name: newTeacher.name, subject: newTeacher.subject,
                assignedClass: newTeacher.assigned_class, whatsapp: newTeacher.whatsapp,
                avatar: newTeacher.avatar, attendance: newTeacher.attendance, status: newTeacher.status,
                totalClasses: newTeacher.total_classes, present: newTeacher.present_count, absent: newTeacher.absent_count
            };
            mockTeachers.push(mapped);
            filteredTeachers = [...mockTeachers];
            renderTeachersGrid();
            modal.hide();
            alert('تم إضافة الخادم بنجاح!');
        }).catch(() => alert('خطأ في إضافة الخادم. تأكد من تشغيل الخادم.'));
    });
}

// ===================================
// DELETE STUDENT
// ===================================
function deleteStudent(studentId, event) {
    event.stopPropagation();
    if (confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
        apiFetch('/students/' + studentId, { method: 'DELETE' }).then(() => {
            const index = mockStudents.findIndex(s => s.id === studentId);
            if (index > -1) mockStudents.splice(index, 1);
            filterStudents();
            alert('تم حذف الطالب بنجاح!');
        }).catch(() => alert('خطأ في حذف الطالب.'));
    }
}

// ===================================
// ADD STUDENT
// ===================================
function showAddStudentModal() {
    const modalBody = document.getElementById('studentModalBody');
    
    modalBody.innerHTML = `
        <form id="addStudentForm">
            <div class="mb-3">
                <label class="form-label">اسم الطالب</label>
                <input type="text" class="form-control" id="studentName" required>
            </div>
            <div class="mb-3">
                <label class="form-label">الفصل</label>
                <select class="form-select" id="studentGrade" required>
                    <optgroup label="── ابتدائي ──">
                        <option value="KG1">KG1</option>
                        <option value="KG2">KG2</option>
                        <option value="1">الصف الأول الابتدائي</option>
                        <option value="2">الصف الثاني الابتدائي</option>
                        <option value="3">الصف الثالث الابتدائي</option>
                        <option value="4">الصف الرابع الابتدائي</option>
                        <option value="5">الصف الخامس الابتدائي</option>
                        <option value="6">الصف السادس الابتدائي</option>
                    </optgroup>
                    <optgroup label="── إعدادي ──">
                        <option value="7">الصف الأول الإعدادي</option>
                        <option value="8">الصف الثاني الإعدادي</option>
                        <option value="9">الصف الثالث الإعدادي</option>
                    </optgroup>
                    <optgroup label="── ثانوي ──">
                        <option value="10">الصف الأول الثانوي</option>
                        <option value="11">الصف الثاني الثانوي</option>
                        <option value="12">الصف الثالث الثانوي</option>
                    </optgroup>
                </select>
            </div>
            <div class="mb-3">
                <label class="form-label">رقم الواتساب</label>
                <input type="text" class="form-control" id="studentWhatsapp" placeholder="+20123456789" required>
            </div>
            <button type="submit" class="btn btn-gradient w-100">إضافة طالب</button>
        </form>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('studentModal'));
    modal.show();
    
    document.getElementById('addStudentForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('studentName').value;
        const grade = document.getElementById('studentGrade').value;
        const whatsapp = document.getElementById('studentWhatsapp').value;
        
        const nameParts = name.split(' ');
        const avatar = nameParts.length > 1 ? 
            nameParts[0].substring(0, 1) + nameParts[1].substring(0, 1) : 
            nameParts[0].substring(0, 2);
        
        apiFetch('/students', {
            method: 'POST',
            body: JSON.stringify({ name, grade, whatsapp })
        }).then(newStudent => {
            const mapped = {
                id: newStudent.id, name: newStudent.name, grade: newStudent.grade,
                whatsapp: newStudent.whatsapp, avatar: newStudent.avatar,
                attendance: newStudent.attendance, status: newStudent.status,
                totalClasses: newStudent.total_classes, present: newStudent.present_count, absent: newStudent.absent_count
            };
            mockStudents.push(mapped);
            filterStudents();
            modal.hide();
            alert('تم إضافة الطالب بنجاح!');
        }).catch(() => alert('خطأ في إضافة الطالب. تأكد من تشغيل الخادم.'));
    });
}

// ===================================
// TEACHER ATTENDANCE TABLE
// ===================================
function renderTeacherAttendanceTable() {
    const tbody = document.querySelector('#teacherAttendanceTable tbody');
    if (!tbody) return;
    
    let html = '';
    mockTeachers.forEach(teacher => {
        const rateColor = teacher.attendance >= 90 ? '#10b981' : 
                         teacher.attendance >= 75 ? '#f59e0b' : '#ef4444';
        const currentStatus = teacherAttendanceRecords[teacher.id]?.status || 'none';
        
        html += `
            <tr>
                <td>
                    <div class="table-student-info" onclick="showTeacherModal(${teacher.id})" style="cursor: pointer;">
                        <div class="table-avatar">${teacher.avatar}</div>
                        <div>
                            <div class="table-name">${teacher.name}</div>
                            <div class="table-id">ID: ${String(teacher.id).padStart(4, '0')}</div>
                        </div>
                    </div>
                </td>
                <td><span class="grade-badge">${teacher.subject}</span></td>
                <td><span class="grade-badge">${getGradeLabel(teacher.assignedClass)}</span></td>
                <td>
                    <div class="rate-display">
                        <div class="rate-bar">
                            <div class="rate-fill" style="width: ${teacher.attendance}%; background: ${rateColor}"></div>
                        </div>
                        <span class="rate-text">${teacher.attendance}%</span>
                    </div>
                </td>
                <td>
                    <div class="status-actions">
                        <button class="btn-status btn-present ${currentStatus === 'present' ? 'active' : ''}" 
                                onclick="markTeacherAttendance(${teacher.id}, 'present')">
                            <i class="bi bi-check-circle-fill"></i> حاضر
                        </button>
                        <button class="btn-status btn-absent ${currentStatus === 'absent' ? 'active' : ''}" 
                                onclick="markTeacherAttendance(${teacher.id}, 'absent')">
                            <i class="bi bi-x-circle-fill"></i> غائب
                        </button>
                        <button class="btn-status btn-late ${currentStatus === 'late' ? 'active' : ''}" 
                                onclick="markTeacherAttendance(${teacher.id}, 'late')">
                            <i class="bi bi-clock-fill"></i> متأخر
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html || '<tr><td colspan="5" class="text-center text-muted py-4">لا يوجد خدام</td></tr>';
}

// ===================================
// MARK TEACHER ATTENDANCE
// ===================================
function markTeacherAttendance(teacherId, status) {
    const today = new Date().toISOString().split('T')[0];
    teacherAttendanceRecords[teacherId] = { status: status, date: today };
    apiFetch('/teacher-attendance/mark', {
        method: 'POST',
        body: JSON.stringify({ teacherId, status, date: today })
    }).catch(e => console.warn('markTeacherAttendance API failed', e));
    renderTeacherAttendanceTable();
}

// ===================================
// SAVE TEACHER ATTENDANCE
// ===================================
async function saveTeacherAttendance() {
    const today = new Date().toISOString().split('T')[0];
    
    const records = {};
    let hasAny = false;
    mockTeachers.forEach(teacher => {
        const rec = teacherAttendanceRecords[teacher.id];
        if (rec && rec.status !== 'none' && rec.date === today) {
            records[teacher.id] = rec.status;
            hasAny = true;
        }
    });
    
    if (!hasAny) {
        alert('لم يتم تسجيل أي حضور اليوم!');
        return;
    }
    
    try {
        const result = await apiFetch('/teacher-attendance/save', {
            method: 'POST',
            body: JSON.stringify({ date: today, records })
        });
        await loadFromAPI();
        alert(`تم حفظ حضور الخدام بنجاح! تم تحديث ${result.updated} خادم.`);
        renderTeacherAttendanceTable();
    } catch(e) {
        alert('خطأ في حفظ الحضور. تأكد من تشغيل الخادم.');
    }
}

// ===================================
// EXPORT TEACHER ATTENDANCE FUNCTIONS
// ===================================
function exportTeacherAttendance(format) {
    const today = new Date().toLocaleDateString('ar-EG');
    if (format === 'excel') exportTeacherToExcel(today);
    else if (format === 'pdf') exportTeacherToPDF(today);
    else if (format === 'image') exportTeacherToImage(today);
}

function exportTeacherToExcel(dateStr) {
    const data = mockTeachers.map(teacher => ({
        'ID': String(teacher.id).padStart(4, '0'),
        'الاسم': teacher.name,
        'المادة': teacher.subject,
        'الفصل المخصص': teacher.assignedClass,
        'الحالة': getStatusArabic(teacherAttendanceRecords[teacher.id]?.status || 'none'),
        'نسبة الحضور': teacher.attendance + '%',
        'حاضر': teacher.present,
        'غائب': teacher.absent,
        'إجمالي الحصص': teacher.totalClasses
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'حضور_الخدام');
    XLSX.writeFile(wb, `حضور_الخدام_${dateStr.replace(/\//g, '-')}.xlsx`);
}

function exportTeacherToPDF(dateStr) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('تقرير حضور الخدام', 14, 20);
    doc.setFontSize(12);
    doc.text(`التاريخ: ${dateStr}`, 14, 30);
    
    const tableData = mockTeachers.map(teacher => [
        String(teacher.id).padStart(4, '0'),
        teacher.name,
        teacher.subject,
        teacher.assignedClass,
        getStatusArabic(teacherAttendanceRecords[teacher.id]?.status || 'none'),
        teacher.attendance + '%',
        teacher.present.toString(),
        teacher.absent.toString()
    ]);
    
    doc.autoTable({
        head: [['ID', 'الاسم', 'المادة', 'الفصل', 'الحالة', 'النسبة', 'حاضر', 'غائب']],
        body: tableData,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [102, 126, 234] }
    });
    
    doc.save(`حضور_الخدام_${dateStr.replace(/\//g, '-')}.pdf`);
}

function exportTeacherToImage(dateStr) {
    const table = document.getElementById('teacherAttendanceTable');
    html2canvas(table, { scale: 2, backgroundColor: '#ffffff' }).then(canvas => {
        const link = document.createElement('a');
        link.download = `حضور_الخدام_${dateStr.replace(/\//g, '-')}.png`;
        link.href = canvas.toDataURL();
        link.click();
    });
}

// ===================================
// LOGIN
// ===================================
const CORRECT_PASSWORD = 'virginmarry';

function attemptLogin() {
    const input = document.getElementById('loginPasswordInput');
    const errorEl = document.getElementById('loginError');
    const box = document.getElementById('loginBox');

    if (input.value === CORRECT_PASSWORD) {
        // Save session so refresh doesn't require re-login
        sessionStorage.setItem('church_auth', '1');
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('dashboardWrapper').style.display = '';
        errorEl.textContent = '';
        input.value = '';
        loadFromAPI().then(() => initDashboard()).catch(err => {
            console.error('Failed to load data from API:', err);
            alert('تعذر الاتصال بالخادم. تأكد من تشغيل server.py ثم أعد تحميل الصفحة.');
        });
    } else {
        errorEl.textContent = 'كلمة المرور غير صحيحة، حاول مرة أخرى';
        // shake animation
        box.classList.remove('shake');
        void box.offsetWidth; // reflow to restart animation
        box.classList.add('shake');
        input.value = '';
        input.focus();
    }
}

function togglePasswordVisibility() {
    const input = document.getElementById('loginPasswordInput');
    const icon = document.getElementById('eyeIcon');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'bi bi-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'bi bi-eye';
    }
}

function logout() {
    sessionStorage.removeItem('church_auth');
    document.getElementById('dashboardWrapper').style.display = 'none';
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('loginPasswordInput').value = '';
    document.getElementById('loginError').textContent = '';
}

// ===================================
// INITIALIZE ON PAGE LOAD
// ===================================


// ===================================
// EDIT STUDENT MODAL
// ===================================
function showEditStudentModal(studentId, event) {
    if (event) event.stopPropagation();
    const student = mockStudents.find(s => s.id === studentId);
    if (!student) return;

    const modalBody = document.getElementById('studentModalBody');
    modalBody.innerHTML = `
        <h5 class="mb-4 fw-bold"><i class="bi bi-pencil-fill me-2"></i>تعديل بيانات الطالب</h5>
        <form id="editStudentForm">
            <div class="mb-3">
                <label class="form-label">اسم الطالب</label>
                <input type="text" class="form-control" id="editStudentName" value="${student.name}" required>
            </div>
            <div class="mb-3">
                <label class="form-label">الفصل</label>
                <select class="form-select" id="editStudentGrade" required>
                    <optgroup label="── ابتدائي ──">
                        <option value="KG1" ${student.grade==='KG1'?'selected':''}>KG1</option>
                        <option value="KG2" ${student.grade==='KG2'?'selected':''}>KG2</option>
                        <option value="1" ${student.grade==='1'?'selected':''}>الصف الأول الابتدائي</option>
                        <option value="2" ${student.grade==='2'?'selected':''}>الصف الثاني الابتدائي</option>
                        <option value="3" ${student.grade==='3'?'selected':''}>الصف الثالث الابتدائي</option>
                        <option value="4" ${student.grade==='4'?'selected':''}>الصف الرابع الابتدائي</option>
                        <option value="5" ${student.grade==='5'?'selected':''}>الصف الخامس الابتدائي</option>
                        <option value="6" ${student.grade==='6'?'selected':''}>الصف السادس الابتدائي</option>
                    </optgroup>
                    <optgroup label="── إعدادي ──">
                        <option value="7" ${student.grade==='7'?'selected':''}>الصف الأول الإعدادي</option>
                        <option value="8" ${student.grade==='8'?'selected':''}>الصف الثاني الإعدادي</option>
                        <option value="9" ${student.grade==='9'?'selected':''}>الصف الثالث الإعدادي</option>
                    </optgroup>
                    <optgroup label="── ثانوي ──">
                        <option value="10" ${student.grade==='10'?'selected':''}>الصف الأول الثانوي</option>
                        <option value="11" ${student.grade==='11'?'selected':''}>الصف الثاني الثانوي</option>
                        <option value="12" ${student.grade==='12'?'selected':''}>الصف الثالث الثانوي</option>
                    </optgroup>
                </select>
            </div>
            <div class="mb-3">
                <label class="form-label">تاريخ الميلاد</label>
                <input type="text" class="form-control" id="editStudentBirthdate" value="${student.birthdate || ''}" placeholder="مثال: 15/3/2010">
            </div>
            <div class="mb-3">
                <label class="form-label">رقم الواتساب</label>
                <input type="text" class="form-control" id="editStudentWhatsapp" value="${student.whatsapp || ''}" placeholder="+20123456789">
            </div>
            <div class="d-flex gap-2">
                <button type="submit" class="btn btn-gradient flex-fill">حفظ التعديلات</button>
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">إلغاء</button>
            </div>
        </form>
    `;

    const modal = new bootstrap.Modal(document.getElementById('studentModal'));
    modal.show();

    document.getElementById('editStudentForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = document.getElementById('editStudentName').value.trim();
        const grade = document.getElementById('editStudentGrade').value;
        const birthdate = document.getElementById('editStudentBirthdate').value.trim();
        const whatsapp = document.getElementById('editStudentWhatsapp').value.trim();

        try {
            const updated = await apiFetch('/students/' + studentId, {
                method: 'PUT',
                body: JSON.stringify({ name, grade, whatsapp, birthdate })
            });
            // Update local data
            const idx = mockStudents.findIndex(s => s.id === studentId);
            if (idx > -1) {
                mockStudents[idx] = { ...mockStudents[idx], name: updated.name, grade: updated.grade,
                    whatsapp: updated.whatsapp, birthdate: updated.birthdate || '', avatar: updated.avatar };
            }
            filteredStudents = [...mockStudents];
            filterStudents();
            modal.hide();
            alert('تم تعديل بيانات الطالب بنجاح!');
        } catch(e) {
            alert('خطأ في تعديل البيانات. تأكد من تشغيل الخادم.');
        }
    });
}

// ===================================
// EDIT TEACHER MODAL
// ===================================
function showEditTeacherModal(teacherId, event) {
    if (event) event.stopPropagation();
    const teacher = mockTeachers.find(t => t.id === teacherId);
    if (!teacher) return;

    const modalBody = document.getElementById('studentModalBody');
    modalBody.innerHTML = `
        <h5 class="mb-4 fw-bold"><i class="bi bi-pencil-fill me-2"></i>تعديل بيانات الخادم</h5>
        <form id="editTeacherForm">
            <div class="mb-3">
                <label class="form-label">اسم الخادم</label>
                <input type="text" class="form-control" id="editTeacherName" value="${teacher.name}" required>
            </div>
            <div class="mb-3">
                <label class="form-label">القسم / المادة</label>
                <input type="text" class="form-control" id="editTeacherSubject" value="${teacher.subject || ''}">
            </div>
            <div class="mb-3">
                <label class="form-label">الفصل المخصص</label>
                <input type="text" class="form-control" id="editTeacherClass" value="${teacher.assignedClass || ''}">
            </div>
            <div class="mb-3">
                <label class="form-label">رقم الواتساب</label>
                <input type="text" class="form-control" id="editTeacherWhatsapp" value="${teacher.whatsapp || ''}" placeholder="+20123456789">
            </div>
            <div class="d-flex gap-2">
                <button type="submit" class="btn btn-gradient flex-fill">حفظ التعديلات</button>
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">إلغاء</button>
            </div>
        </form>
    `;

    const modal = new bootstrap.Modal(document.getElementById('studentModal'));
    modal.show();

    document.getElementById('editTeacherForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = document.getElementById('editTeacherName').value.trim();
        const subject = document.getElementById('editTeacherSubject').value.trim();
        const assignedClass = document.getElementById('editTeacherClass').value.trim();
        const whatsapp = document.getElementById('editTeacherWhatsapp').value.trim();

        try {
            const updated = await apiFetch('/teachers/' + teacherId, {
                method: 'PUT',
                body: JSON.stringify({ name, subject, assignedClass, whatsapp })
            });
            const idx = mockTeachers.findIndex(t => t.id === teacherId);
            if (idx > -1) {
                mockTeachers[idx] = { ...mockTeachers[idx], name: updated.name, subject: updated.subject,
                    assignedClass: updated.assigned_class, whatsapp: updated.whatsapp, avatar: updated.avatar };
            }
            filteredTeachers = [...mockTeachers];
            filterTeachers();
            modal.hide();
            alert('تم تعديل بيانات الخادم بنجاح!');
        } catch(e) {
            alert('خطأ في تعديل البيانات. تأكد من تشغيل الخادم.');
        }
    });
}

// ===================================
// ATTENDANCE LOG PAGE
// ===================================
let currentLogTab = 'students';

function switchLogTab(tab, el) {
    currentLogTab = tab;
    document.querySelectorAll('#logTabs .nav-link').forEach(a => a.classList.remove('active'));
    el.classList.add('active');
    // Show/hide grade filter for students only
    document.getElementById('logGradeFilterWrap').style.display = tab === 'students' ? '' : 'none';
    loadAttendanceLog();
}

function clearLogFilters() {
    document.getElementById('logDateFilter').value = '';
    document.getElementById('logGradeFilter').value = 'all';
    loadAttendanceLog();
}

async function loadAttendanceLog() {
    const date = document.getElementById('logDateFilter')?.value || '';
    const grade = document.getElementById('logGradeFilter')?.value || 'all';
    const thead = document.getElementById('logTableHead');
    const tbody = document.getElementById('logTableBody');
    const countEl = document.getElementById('logRecordCount');
    if (!thead || !tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div> جاري التحميل...</td></tr>';

    try {
        let records = [];
        if (currentLogTab === 'students') {
            const params = new URLSearchParams();
            if (date) params.set('date', date);
            if (grade !== 'all') params.set('grade', grade);
            const res = await fetch(API_BASE + '/attendance/log?' + params.toString());
            records = await res.json();

            thead.innerHTML = '<tr><th>#</th><th>الاسم</th><th>الفصل</th><th>التاريخ</th><th>الحالة</th></tr>';
            if (records.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">لا توجد سجلات بهذه الفلاتر</td></tr>';
                countEl.textContent = '';
                return;
            }
            countEl.textContent = records.length + ' سجل';
            tbody.innerHTML = records.map((r, i) => `
                <tr>
                    <td class="text-muted small">${i + 1}</td>
                    <td><strong>${r.name}</strong></td>
                    <td><span class="grade-badge">${getGradeLabel(r.grade)}</span></td>
                    <td>${new Date(r.date).toLocaleDateString('ar-EG')}</td>
                    <td><span class="status-badge status-${r.status}">${getStatusArabic(r.status)}</span></td>
                </tr>
            `).join('');

        } else {
            // teachers log
            const params = new URLSearchParams();
            if (date) params.set('date', date);
            const res = await fetch(API_BASE + '/teacher-attendance/log?' + params.toString());
            records = await res.json();

            thead.innerHTML = '<tr><th>#</th><th>الاسم</th><th>المادة</th><th>الفصل</th><th>التاريخ</th><th>الحالة</th></tr>';
            if (records.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">لا توجد سجلات بهذه الفلاتر</td></tr>';
                countEl.textContent = '';
                return;
            }
            countEl.textContent = records.length + ' سجل';
            tbody.innerHTML = records.map((r, i) => `
                <tr>
                    <td class="text-muted small">${i + 1}</td>
                    <td><strong>${r.name}</strong></td>
                    <td>${r.subject}</td>
                    <td>${r.assigned_class || '—'}</td>
                    <td>${new Date(r.date).toLocaleDateString('ar-EG')}</td>
                    <td><span class="status-badge status-${r.status}">${getStatusArabic(r.status)}</span></td>
                </tr>
            `).join('');
        }
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">خطأ في تحميل البيانات</td></tr>';
        console.error(e);
    }
}

// ===================================
// STUDENT MODAL — with history tab
// ===================================
window.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in this session
    if (sessionStorage.getItem('church_auth') === '1') {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('dashboardWrapper').style.display = '';
        loadFromAPI().then(() => initDashboard()).catch(err => {
            console.error('Failed to load data from API:', err);
            alert('تعذر الاتصال بالخادم. تأكد من تشغيل server.py ثم أعد تحميل الصفحة.');
        });
    } else {
        // Show login — focus the password field
        setTimeout(() => {
            const inp = document.getElementById('loginPasswordInput');
            if (inp) inp.focus();
        }, 100);
    }
});