/**
 * store.js — Central in-memory data store.
 * All modules read/write shared state through this object.
 */

const Store = {
    // ── Auth ────────────────────────────────────────────────────────────────
    token:       null,   // Bearer token string
    currentUser: null,   // { role, assigned_class, name }

    // ── Data ────────────────────────────────────────────────────────────────
    students:          [],   // full list fetched from API
    teachers:          [],
    attendanceHistory: [],

    // Working (unsaved) attendance for today
    // { [studentId]: { status, date } }
    attendanceRecords:        {},
    teacherAttendanceRecords: {},

    // ── Filtered views (used by grids) ──────────────────────────────────────
    filteredStudents: [],
    filteredTeachers: [],

    // Currently selected class on attendance page
    selectedAttendanceClass: 'all',

    // ── Helpers ─────────────────────────────────────────────────────────────
    get isAdmin()        { return this.currentUser?.role === 'admin'; },
    get assignedClass()  { return this.currentUser?.assigned_class;   },

    /** Persist auth to sessionStorage so page refresh keeps the session */
    saveSession() {
        sessionStorage.setItem('church_token', this.token);
        sessionStorage.setItem('church_user',  JSON.stringify(this.currentUser));
    },
    loadSession() {
        this.token       = sessionStorage.getItem('church_token')  || null;
        const raw        = sessionStorage.getItem('church_user');
        this.currentUser = raw ? JSON.parse(raw) : null;
        return !!(this.token && this.currentUser);
    },
    clearSession() {
        this.token = null; this.currentUser = null;
        sessionStorage.removeItem('church_token');
        sessionStorage.removeItem('church_user');
    },

    /** Load all data from the API and populate store arrays */
    async reload() {
        const today   = new Date().toISOString().split('T')[0];
        const fetches = [
            Api.get('/students'),
            Api.get('/attendance/history'),
            Api.get('/attendance/records?date=' + today),
        ];
        if (this.isAdmin) {
            fetches.push(Api.get('/teachers'));
            fetches.push(Api.get('/teacher-attendance/records?date=' + today));
        }

        const results = await Promise.all(fetches);
        const [rawStudents, history, attRec] = results;
        const rawTeachers = this.isAdmin ? results[3] : [];
        const teacherRec  = this.isAdmin ? results[4] : {};

        this.students = rawStudents.map(s => ({
            id: s.id, name: s.name, grade: s.grade,
            whatsapp: s.whatsapp || '', avatar: s.avatar || s.name.substring(0, 2).toUpperCase(),
            birthdate: s.birthdate || '', attendance: s.attendance, status: s.status,
            totalClasses: s.total_classes, present: s.present_count, absent: s.absent_count,
        }));

        this.teachers = rawTeachers.map(t => ({
            id: t.id, name: t.name, subject: t.subject, assignedClass: t.assigned_class,
            whatsapp: t.whatsapp || '', avatar: t.avatar || t.name.substring(0, 2).toUpperCase(),
            attendance: t.attendance, status: t.status,
            totalClasses: t.total_classes, present: t.present_count, absent: t.absent_count,
        }));

        this.attendanceHistory = history;

        this.attendanceRecords = {};
        for (const [sid, status] of Object.entries(attRec)) {
            this.attendanceRecords[parseInt(sid)] = { status, date: today };
        }

        this.teacherAttendanceRecords = {};
        for (const [tid, status] of Object.entries(teacherRec)) {
            this.teacherAttendanceRecords[parseInt(tid)] = { status, date: today };
        }

        this.filteredStudents = [...this.students];
        this.filteredTeachers = [...this.teachers];
    },
};
