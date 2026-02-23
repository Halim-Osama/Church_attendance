"""
Church Attendance System — Backend Server
Run:  python server.py
Open: http://localhost:5000

Default admin  →  username: admin  |  password: virginmarry
"""

import sqlite3, json, os, hashlib, secrets
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# ─── Paths ────────────────────────────────────────────────────────────────────

# ─── In-memory session store: token → session dict ────────────────────────────
sessions: dict = {}


# ══════════════════════════════════════════════════════════════════════════════
#  DATABASE
# ══════════════════════════════════════════════════════════════════════════════

def get_conn():
    
    
    return conn


def init_db():
    """Create all tables and seed the default admin account."""
    conn = get_conn()
    c = conn.cursor()

    # Users  (username-based, not email)
    c.execute('''
        CREATE TABLE IF NOT EXISTS app_users (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            name           TEXT    NOT NULL,
            username       TEXT    UNIQUE NOT NULL,
            password_hash  TEXT    NOT NULL,
            role           TEXT    NOT NULL DEFAULT 'teacher',
            assigned_class TEXT    DEFAULT NULL,
            created_at     TEXT    DEFAULT (datetime('now'))
        )
    ''')
    c.execute(
        "INSERT OR IGNORE INTO app_users (name, username, password_hash, role) "
        "VALUES ('مسؤول النظام', 'admin', ?, 'admin')",
        (hashlib.sha256(''.encode()).hexdigest(),)
    )

    # Students
    c.execute('''
        CREATE TABLE IF NOT EXISTS app_students (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            name          TEXT NOT NULL,
            grade         TEXT NOT NULL,
            whatsapp      TEXT DEFAULT '',
            avatar        TEXT DEFAULT '',
            birthdate     TEXT DEFAULT '',
            attendance    INTEGER DEFAULT 100,
            status        TEXT    DEFAULT 'present',
            total_classes INTEGER DEFAULT 0,
            present_count INTEGER DEFAULT 0,
            absent_count  INTEGER DEFAULT 0
        )
    ''')

    # Teachers
    c.execute('''
        CREATE TABLE IF NOT EXISTS app_teachers (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            name           TEXT NOT NULL,
            subject        TEXT DEFAULT 'عام',
            assigned_class TEXT DEFAULT 'KG1',
            whatsapp       TEXT DEFAULT '',
            avatar         TEXT DEFAULT '',
            attendance     INTEGER DEFAULT 100,
            status         TEXT    DEFAULT 'present',
            total_classes  INTEGER DEFAULT 0,
            present_count  INTEGER DEFAULT 0,
            absent_count   INTEGER DEFAULT 0
        )
    ''')

    # Daily working records (cleared after save)
    c.execute('''
        CREATE TABLE IF NOT EXISTS attendance_records (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id  INTEGER,
            record_date TEXT,
            status      TEXT DEFAULT 'none',
            UNIQUE(student_id, record_date)
        )
    ''')

    # ── PERMANENT attendance log — one row per student per saved day ──────────
    c.execute('''
        CREATE TABLE IF NOT EXISTS attendance_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id  INTEGER,
            record_date TEXT,
            status      TEXT,
            UNIQUE(student_id, record_date)
        )
    ''')

    # Teacher daily working records
    c.execute('''
        CREATE TABLE IF NOT EXISTS teacher_attendance_records (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            teacher_id  INTEGER,
            record_date TEXT,
            status      TEXT DEFAULT 'none',
            UNIQUE(teacher_id, record_date)
        )
    ''')

    # Permanent teacher attendance log
    c.execute('''
        CREATE TABLE IF NOT EXISTS teacher_attendance_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            teacher_id  INTEGER,
            record_date TEXT,
            status      TEXT,
            UNIQUE(teacher_id, record_date)
        )
    ''')

    # Daily summary (for dashboard trends)
    c.execute('''
        CREATE TABLE IF NOT EXISTS attendance_history (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            record_date  TEXT UNIQUE,
            present_count INTEGER DEFAULT 0,
            absent_count  INTEGER DEFAULT 0,
            late_count    INTEGER DEFAULT 0
        )
    ''')

    conn.commit()
    conn.close()
    print('✓ Database initialised')


# ══════════════════════════════════════════════════════════════════════════════
#  AUTH HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()


def get_session(handler) -> dict | None:
    auth = handler.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        return sessions.get(auth[7:])
    return None


def require_auth(handler) -> dict | None:
    return get_session(handler)


# ══════════════════════════════════════════════════════════════════════════════
#  USER MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════

def api_login(data: dict):
    username = data.get('username', '').strip().lower()
    pw_hash  = _hash(data.get('password', ''))
    conn = get_conn()
    row  = conn.execute(
        'SELECT * FROM app_users WHERE LOWER(username)=? AND password_hash=?',
        (username, pw_hash)
    ).fetchone()
    conn.close()
    if not row:
        return {'success': False, 'error': 'اسم المستخدم أو كلمة المرور غير صحيحة'}
    token = secrets.token_hex(32)
    sessions[token] = {
        'user_id':       row['id'],
        'role':          row['role'],
        'assigned_class': row['assigned_class'],
        'name':          row['name'],
        'username':      row['username'],
    }
    return {
        'success':       True,
        'token':         token,
        'role':          row['role'],
        'assigned_class': row['assigned_class'],
        'name':          row['name'],
    }


def api_get_users():
    conn = get_conn()
    rows = conn.execute(
        'SELECT id, name, username, role, assigned_class, created_at FROM app_users ORDER BY id'
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def api_create_user(data: dict):
    name           = data.get('name', '').strip()
    username       = data.get('username', '').strip().lower()
    password       = data.get('password', '')
    role           = data.get('role', 'teacher')
    assigned_class = data.get('assigned_class') or None
    if not name or not username or not password:
        return {'error': 'جميع الحقول مطلوبة'}, 400
    conn = get_conn()
    try:
        c = conn.cursor()
        c.execute(
            'INSERT INTO app_users (name, username, password_hash, role, assigned_class) VALUES (?,?,?,?,?)',
            (name, username, _hash(password), role, assigned_class)
        )
        conn.commit()
        row = conn.execute(
            'SELECT id, name, username, role, assigned_class, created_at FROM app_users WHERE id=?',
            (c.lastrowid,)
        ).fetchone()
        conn.close()
        return dict(row), None
    except sqlite3.IntegrityError:
        conn.close()
        return {'error': 'اسم المستخدم مستخدم بالفعل'}, 400


def api_edit_user(user_id: int, data: dict):
    name           = data.get('name', '').strip()
    username       = data.get('username', '').strip().lower()
    role           = data.get('role', 'teacher')
    assigned_class = data.get('assigned_class') or None
    password       = data.get('password', '').strip()
    if not name or not username:
        return {'error': 'الاسم واسم المستخدم مطلوبان'}, 400
    conn = get_conn()
    try:
        if password:
            conn.execute(
                'UPDATE app_users SET name=?, username=?, role=?, assigned_class=?, password_hash=? WHERE id=?',
                (name, username, role, assigned_class, _hash(password), user_id)
            )
        else:
            conn.execute(
                'UPDATE app_users SET name=?, username=?, role=?, assigned_class=? WHERE id=?',
                (name, username, role, assigned_class, user_id)
            )
        conn.commit()
        row = conn.execute(
            'SELECT id, name, username, role, assigned_class, created_at FROM app_users WHERE id=?',
            (user_id,)
        ).fetchone()
        conn.close()
        # refresh live sessions
        for s in sessions.values():
            if s['user_id'] == user_id:
                s.update({'name': name, 'role': role, 'assigned_class': assigned_class})
        return dict(row), None
    except sqlite3.IntegrityError:
        conn.close()
        return {'error': 'اسم المستخدم مستخدم بالفعل'}, 400


def api_delete_user(user_id: int):
    conn = get_conn()
    row = conn.execute('SELECT role FROM app_users WHERE id=?', (user_id,)).fetchone()
    if not row:
        conn.close()
        return {'error': 'المستخدم غير موجود'}, 404
    if row['role'] == 'admin':
        cnt = conn.execute("SELECT COUNT(*) AS c FROM app_users WHERE role='admin'").fetchone()['c']
        if cnt <= 1:
            conn.close()
            return {'error': 'لا يمكن حذف المسؤول الوحيد'}, 400
    conn.execute('DELETE FROM app_users WHERE id=?', (user_id,))
    conn.commit()
    conn.close()
    for t in [k for k, v in sessions.items() if v['user_id'] == user_id]:
        del sessions[t]
    return {'success': True}, None


# ══════════════════════════════════════════════════════════════════════════════
#  STUDENTS
# ══════════════════════════════════════════════════════════════════════════════

_STUDENT_COLS = 'id, name, grade, whatsapp, avatar, COALESCE(birthdate,"") AS birthdate, attendance, status, total_classes, present_count, absent_count'


def api_get_students(grade_filter=None):
    conn = get_conn()
    if grade_filter:
        rows = conn.execute(f'SELECT {_STUDENT_COLS} FROM app_students WHERE grade=? ORDER BY name', (grade_filter,)).fetchall()
    else:
        rows = conn.execute(f'SELECT {_STUDENT_COLS} FROM app_students ORDER BY grade, name').fetchall()
    conn.close()
    return [dict(r) for r in rows]


def api_add_student(data: dict):
    name     = data.get('name', '').strip()
    grade    = data.get('grade', 'KG1')
    whatsapp = data.get('whatsapp', '')
    avatar   = _make_avatar(name)
    conn = get_conn()
    c = conn.cursor()
    c.execute(
        "INSERT INTO app_students (name, grade, whatsapp, avatar, attendance, status, total_classes, present_count, absent_count)"
        " VALUES (?,?,?,?,100,'present',0,0,0)",
        (name, grade, whatsapp, avatar)
    )
    conn.commit()
    row = conn.execute(f'SELECT {_STUDENT_COLS} FROM app_students WHERE id=?', (c.lastrowid,)).fetchone()
    conn.close()
    return dict(row)


def api_edit_student(student_id: int, data: dict):
    name      = data.get('name', '').strip()
    grade     = data.get('grade', '')
    whatsapp  = data.get('whatsapp', '')
    birthdate = data.get('birthdate', '')
    if not name:
        return {'error': 'الاسم مطلوب'}, 400
    conn = get_conn()
    conn.execute(
        'UPDATE app_students SET name=?, grade=?, whatsapp=?, birthdate=?, avatar=? WHERE id=?',
        (name, grade, whatsapp, birthdate, _make_avatar(name), student_id)
    )
    conn.commit()
    row = conn.execute(f'SELECT {_STUDENT_COLS} FROM app_students WHERE id=?', (student_id,)).fetchone()
    conn.close()
    return dict(row) if row else ({'error': 'غير موجود'}, 404)


def api_delete_student(student_id: int):
    conn = get_conn()
    conn.execute('DELETE FROM app_students WHERE id=?', (student_id,))
    conn.execute('DELETE FROM attendance_records WHERE student_id=?', (student_id,))
    conn.execute('DELETE FROM attendance_log WHERE student_id=?', (student_id,))
    conn.commit()
    conn.close()
    return {'success': True}


# ══════════════════════════════════════════════════════════════════════════════
#  TEACHERS
# ══════════════════════════════════════════════════════════════════════════════

def api_get_teachers():
    conn = get_conn()
    rows = conn.execute('SELECT * FROM app_teachers ORDER BY name').fetchall()
    conn.close()
    return [dict(r) for r in rows]


def api_add_teacher(data: dict):
    name           = data.get('name', '').strip()
    subject        = data.get('subject', 'عام')
    assigned_class = data.get('assignedClass', 'KG1')
    whatsapp       = data.get('whatsapp', '')
    conn = get_conn()
    c = conn.cursor()
    c.execute(
        "INSERT INTO app_teachers (name, subject, assigned_class, whatsapp, avatar, attendance, status, total_classes, present_count, absent_count)"
        " VALUES (?,?,?,?,?,100,'present',0,0,0)",
        (name, subject, assigned_class, whatsapp, _make_avatar(name))
    )
    conn.commit()
    row = conn.execute('SELECT * FROM app_teachers WHERE id=?', (c.lastrowid,)).fetchone()
    conn.close()
    return dict(row)


def api_edit_teacher(teacher_id: int, data: dict):
    name           = data.get('name', '').strip()
    subject        = data.get('subject', '')
    assigned_class = data.get('assignedClass', '')
    whatsapp       = data.get('whatsapp', '')
    if not name:
        return {'error': 'الاسم مطلوب'}, 400
    conn = get_conn()
    conn.execute(
        'UPDATE app_teachers SET name=?, subject=?, assigned_class=?, whatsapp=?, avatar=? WHERE id=?',
        (name, subject, assigned_class, whatsapp, _make_avatar(name), teacher_id)
    )
    conn.commit()
    row = conn.execute('SELECT * FROM app_teachers WHERE id=?', (teacher_id,)).fetchone()
    conn.close()
    return dict(row) if row else ({'error': 'غير موجود'}, 404)


def api_delete_teacher(teacher_id: int):
    conn = get_conn()
    conn.execute('DELETE FROM app_teachers WHERE id=?', (teacher_id,))
    conn.execute('DELETE FROM teacher_attendance_records WHERE teacher_id=?', (teacher_id,))
    conn.execute('DELETE FROM teacher_attendance_log WHERE teacher_id=?', (teacher_id,))
    conn.commit()
    conn.close()
    return {'success': True}


# ══════════════════════════════════════════════════════════════════════════════
#  STUDENT ATTENDANCE
# ══════════════════════════════════════════════════════════════════════════════

def api_get_attendance_records(date: str):
    conn = get_conn()
    rows = conn.execute(
        'SELECT student_id, status FROM attendance_records WHERE record_date=?', (date,)
    ).fetchall()
    conn.close()
    return {str(r['student_id']): r['status'] for r in rows}


def api_mark_attendance(data: dict):
    conn = get_conn()
    conn.execute(
        'INSERT INTO attendance_records (student_id, record_date, status) VALUES (?,?,?)'
        ' ON CONFLICT(student_id, record_date) DO UPDATE SET status=excluded.status',
        (data['studentId'], data['date'], data['status'])
    )
    conn.commit()
    conn.close()
    return {'success': True}


def api_save_attendance(data: dict):
    """
    Commit today's attendance:
    - Update student stats (present_count, absent_count, total_classes, attendance %)
    - Write to permanent attendance_log (upsert)
    - Update daily summary in attendance_history
    - Reset working attendance_records for those students
    """
    date    = data.get('date')
    records = data.get('records', {})   # {student_id_str: status}
    conn    = get_conn()
    present_c = absent_c = late_c = 0

    for sid_str, status in records.items():
        sid = int(sid_str)
        if status == 'none':
            continue
        if status == 'present':
            conn.execute(
                'UPDATE app_students SET present_count=present_count+1, total_classes=total_classes+1, status=? WHERE id=?',
                (status, sid)
            )
            present_c += 1
        elif status == 'absent':
            conn.execute(
                'UPDATE app_students SET absent_count=absent_count+1, total_classes=total_classes+1, status=? WHERE id=?',
                (status, sid)
            )
            absent_c += 1
        elif status == 'late':
            conn.execute(
                'UPDATE app_students SET present_count=present_count+1, total_classes=total_classes+1, status=? WHERE id=?',
                (status, sid)
            )
            late_c += 1

        # recalculate attendance %
        conn.execute(
            'UPDATE app_students SET attendance=ROUND(CAST(present_count AS REAL)/NULLIF(total_classes,0)*100) WHERE id=?',
            (sid,)
        )
        # write to permanent log
        conn.execute(
            'INSERT INTO attendance_log (student_id, record_date, status) VALUES (?,?,?)'
            ' ON CONFLICT(student_id, record_date) DO UPDATE SET status=excluded.status',
            (sid, date, status)
        )
        # clear working record
        conn.execute(
            "UPDATE attendance_records SET status='none' WHERE student_id=? AND record_date=?",
            (sid, date)
        )

    # upsert daily summary
    conn.execute(
        'INSERT INTO attendance_history (record_date, present_count, absent_count, late_count) VALUES (?,?,?,?)'
        ' ON CONFLICT(record_date) DO UPDATE SET present_count=excluded.present_count,'
        ' absent_count=excluded.absent_count, late_count=excluded.late_count',
        (date, present_c, absent_c, late_c)
    )
    conn.commit()
    conn.close()
    return {'success': True, 'updated': present_c + absent_c + late_c}


def api_get_attendance_history():
    conn = get_conn()
    rows = conn.execute(
        'SELECT record_date AS date, present_count AS present, absent_count AS absent, late_count AS late'
        ' FROM attendance_history ORDER BY record_date DESC LIMIT 60'
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def api_get_attendance_log(date_filter=None, grade_filter=None):
    """
    Read from permanent attendance_log — always populated regardless of date.
    """
    conn  = get_conn()
    query = (
        'SELECT al.record_date AS date, al.status, s.id AS student_id, s.name, s.grade'
        ' FROM attendance_log al'
        ' JOIN app_students s ON s.id = al.student_id'
        ' WHERE 1=1'
    )
    params = []
    if date_filter:
        query += ' AND al.record_date=?'; params.append(date_filter)
    if grade_filter and grade_filter != 'all':
        query += ' AND s.grade=?';        params.append(grade_filter)
    query += ' ORDER BY al.record_date DESC, s.grade, s.name'
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def api_get_student_history(student_id: int):
    conn = get_conn()
    rows = conn.execute(
        'SELECT record_date AS date, status FROM attendance_log WHERE student_id=? ORDER BY record_date DESC',
        (student_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ══════════════════════════════════════════════════════════════════════════════
#  TEACHER ATTENDANCE
# ══════════════════════════════════════════════════════════════════════════════

def api_get_teacher_attendance_records(date: str):
    conn = get_conn()
    rows = conn.execute(
        'SELECT teacher_id, status FROM teacher_attendance_records WHERE record_date=?', (date,)
    ).fetchall()
    conn.close()
    return {str(r['teacher_id']): r['status'] for r in rows}


def api_mark_teacher_attendance(data: dict):
    conn = get_conn()
    conn.execute(
        'INSERT INTO teacher_attendance_records (teacher_id, record_date, status) VALUES (?,?,?)'
        ' ON CONFLICT(teacher_id, record_date) DO UPDATE SET status=excluded.status',
        (data['teacherId'], data['date'], data['status'])
    )
    conn.commit()
    conn.close()
    return {'success': True}


def api_save_teacher_attendance(data: dict):
    date    = data.get('date')
    records = data.get('records', {})
    conn    = get_conn()
    updated = 0
    for tid_str, status in records.items():
        tid = int(tid_str)
        if status == 'none':
            continue
        if status in ('present', 'late'):
            conn.execute(
                'UPDATE app_teachers SET present_count=present_count+1, total_classes=total_classes+1, status=? WHERE id=?',
                (status, tid)
            )
        else:
            conn.execute(
                'UPDATE app_teachers SET absent_count=absent_count+1, total_classes=total_classes+1, status=? WHERE id=?',
                (status, tid)
            )
        conn.execute(
            'UPDATE app_teachers SET attendance=ROUND(CAST(present_count AS REAL)/NULLIF(total_classes,0)*100) WHERE id=?',
            (tid,)
        )
        conn.execute(
            'INSERT INTO teacher_attendance_log (teacher_id, record_date, status) VALUES (?,?,?)'
            ' ON CONFLICT(teacher_id, record_date) DO UPDATE SET status=excluded.status',
            (tid, date, status)
        )
        conn.execute(
            "UPDATE teacher_attendance_records SET status='none' WHERE teacher_id=? AND record_date=?",
            (tid, date)
        )
        updated += 1
    conn.commit()
    conn.close()
    return {'success': True, 'updated': updated}


def api_get_teacher_attendance_log(date_filter=None):
    conn  = get_conn()
    query = (
        'SELECT tal.record_date AS date, tal.status,'
        '       t.id AS teacher_id, t.name, t.subject, t.assigned_class'
        ' FROM teacher_attendance_log tal'
        ' JOIN app_teachers t ON t.id = tal.teacher_id'
        ' WHERE 1=1'
    )
    params = []
    if date_filter:
        query += ' AND tal.record_date=?'; params.append(date_filter)
    query += ' ORDER BY tal.record_date DESC, t.name'
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ══════════════════════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _make_avatar(name: str) -> str:
    parts = name.split()
    return (parts[0][0] + parts[1][0]).upper() if len(parts) > 1 else name[:2].upper()


# ══════════════════════════════════════════════════════════════════════════════
#  HTTP HANDLER
# ══════════════════════════════════════════════════════════════════════════════

MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.jpeg': 'image/jpeg',
    '.jpg':  'image/jpeg',
    '.png':  'image/png',
}


class Handler(BaseHTTPRequestHandler):

    # ── logging ────────────────────────────────────────────────────────────
    def log_message(self, fmt, *args):
        if args and str(args[1]) not in ('200', '304'):
            print(f'  {self.path}  →  {args[1]}')

    # ── response helpers ───────────────────────────────────────────────────
    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type',   'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin',  '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, path: str, mime: str):
        with open(path, 'rb') as f:
            data = f.read()
        self.send_response(200)
        self.send_header('Content-Type',   mime)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def send_401(self): self.send_json({'error': 'غير مصرح'},             401)
    def send_403(self): self.send_json({'error': 'غير مسموح بهذا الإجراء'}, 403)
    def send_404(self): self.send_response(404); self.end_headers()

    def read_body(self) -> dict:
        n = int(self.headers.get('Content-Length', 0))
        return json.loads(self.rfile.read(n)) if n else {}

    # ── OPTIONS (CORS preflight) ───────────────────────────────────────────
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin',  '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    # ── GET ────────────────────────────────────────────────────────────────
    def do_GET(self):
        parsed = urlparse(self.path)
        path   = parsed.path
        qs     = parse_qs(parsed.query)

        # ── static files ──
        static_map = {
            '/':           'index.html',
            '/index.html': 'index.html',
            '/style.css':  'style.css',
            '/logo.jpeg':  'logo.jpeg',
            '/logo.jpg':   'logo.jpg',
        }
        # serve js/module files from js/ sub-folder
        if path.startswith('/js/'):
            file_path = os.path.join(FRONTEND_DIR, path.lstrip('/'))
            if os.path.exists(file_path):
                ext  = os.path.splitext(file_path)[1]
                self.send_file(file_path, MIME.get(ext, 'text/plain'))
            else:
                self.send_404()
            return
        if path in static_map:
            file_path = os.path.join(FRONTEND_DIR, static_map[path])
            if os.path.exists(file_path):
                ext = os.path.splitext(file_path)[1]
                self.send_file(file_path, MIME.get(ext, 'text/plain'))
            else:
                self.send_404()
            return

        # ── /api/me (no auth required) ──
        if path == '/api/me':
            s = get_session(self)
            self.send_json({'authenticated': bool(s), **(s or {})})
            return

        # ── all other API routes require auth ──
        session = require_auth(self)
        if not session:
            self.send_401(); return

        role           = session['role']
        assigned_class = session['assigned_class']
        is_admin       = (role == 'admin')

        # Students
        if path == '/api/students':
            self.send_json(api_get_students() if is_admin else api_get_students(assigned_class))

        # Teachers (admin only)
        elif path == '/api/teachers':
            if not is_admin: self.send_403(); return
            self.send_json(api_get_teachers())

        # Attendance working records
        elif path == '/api/attendance/records':
            self.send_json(api_get_attendance_records(qs.get('date', [''])[0]))

        # Teacher attendance working records (admin only)
        elif path == '/api/teacher-attendance/records':
            if not is_admin: self.send_403(); return
            self.send_json(api_get_teacher_attendance_records(qs.get('date', [''])[0]))

        # Dashboard history
        elif path == '/api/attendance/history':
            self.send_json(api_get_attendance_history())

        # Permanent attendance log
        elif path == '/api/attendance/log':
            date_f  = qs.get('date',  [''])[0]    or None
            grade_f = qs.get('grade', ['all'])[0] if is_admin else assigned_class
            self.send_json(api_get_attendance_log(date_f, grade_f))

        # Individual student history
        elif path.startswith('/api/students/') and path.endswith('/history'):
            sid = int(path.split('/')[3])
            if not is_admin:
                conn = get_conn()
                r    = conn.execute('SELECT grade FROM app_students WHERE id=?', (sid,)).fetchone()
                conn.close()
                if not r or r['grade'] != assigned_class:
                    self.send_403(); return
            self.send_json(api_get_student_history(sid))

        # Permanent teacher attendance log (admin only)
        elif path == '/api/teacher-attendance/log':
            if not is_admin: self.send_403(); return
            date_f = qs.get('date', [''])[0] or None
            self.send_json(api_get_teacher_attendance_log(date_f))

        # User list (admin only)
        elif path == '/api/users':
            if not is_admin: self.send_403(); return
            self.send_json(api_get_users())

        else:
            self.send_404()

    # ── POST ───────────────────────────────────────────────────────────────
    def do_POST(self):
        path = urlparse(self.path).path
        data = self.read_body()

        # Login — no auth required
        if path == '/api/login':
            result = api_login(data)
            self.send_json(result, 200 if result['success'] else 401)
            return

        # Logout — no auth required
        if path == '/api/logout':
            auth = self.headers.get('Authorization', '')
            if auth.startswith('Bearer '):
                sessions.pop(auth[7:], None)
            self.send_json({'success': True})
            return

        session = require_auth(self)
        if not session: self.send_401(); return
        role           = session['role']
        assigned_class = session['assigned_class']
        is_admin       = (role == 'admin')

        if path == '/api/students':
            if not is_admin: data['grade'] = assigned_class
            self.send_json(api_add_student(data), 201)

        elif path == '/api/teachers':
            if not is_admin: self.send_403(); return
            self.send_json(api_add_teacher(data), 201)

        elif path == '/api/attendance/mark':
            if not is_admin:
                conn = get_conn()
                r    = conn.execute('SELECT grade FROM app_students WHERE id=?', (data.get('studentId'),)).fetchone()
                conn.close()
                if not r or r['grade'] != assigned_class: self.send_403(); return
            self.send_json(api_mark_attendance(data))

        elif path == '/api/attendance/save':
            self.send_json(api_save_attendance(data))

        elif path == '/api/teacher-attendance/mark':
            if not is_admin: self.send_403(); return
            self.send_json(api_mark_teacher_attendance(data))

        elif path == '/api/teacher-attendance/save':
            if not is_admin: self.send_403(); return
            self.send_json(api_save_teacher_attendance(data))

        elif path == '/api/users':
            if not is_admin: self.send_403(); return
            result, err = api_create_user(data)
            self.send_json(result, err or 201)

        else:
            self.send_404()

    # ── PUT ────────────────────────────────────────────────────────────────
    def do_PUT(self):
        path = urlparse(self.path).path
        data = self.read_body()
        session = require_auth(self)
        if not session: self.send_401(); return
        role           = session['role']
        assigned_class = session['assigned_class']
        is_admin       = (role == 'admin')

        if path.startswith('/api/students/') and not path.endswith('/history'):
            sid = int(path.split('/')[-1])
            if not is_admin:
                conn = get_conn()
                r    = conn.execute('SELECT grade FROM app_students WHERE id=?', (sid,)).fetchone()
                conn.close()
                if not r or r['grade'] != assigned_class: self.send_403(); return
                data['grade'] = assigned_class  # teacher cannot move student to another class
            result = api_edit_student(sid, data)
            self.send_json(result if isinstance(result, dict) else result[0],
                           200  if isinstance(result, dict) else result[1])

        elif path.startswith('/api/teachers/'):
            if not is_admin: self.send_403(); return
            result = api_edit_teacher(int(path.split('/')[-1]), data)
            self.send_json(result if isinstance(result, dict) else result[0],
                           200  if isinstance(result, dict) else result[1])

        elif path.startswith('/api/users/'):
            if not is_admin: self.send_403(); return
            result, err = api_edit_user(int(path.split('/')[-1]), data)
            self.send_json(result, err or 200)

        else:
            self.send_404()

    # ── DELETE ─────────────────────────────────────────────────────────────
    def do_DELETE(self):
        path = urlparse(self.path).path
        session = require_auth(self)
        if not session: self.send_401(); return
        role           = session['role']
        assigned_class = session['assigned_class']
        is_admin       = (role == 'admin')

        if path.startswith('/api/students/'):
            sid = int(path.split('/')[-1])
            if not is_admin:
                conn = get_conn()
                r    = conn.execute('SELECT grade FROM app_students WHERE id=?', (sid,)).fetchone()
                conn.close()
                if not r or r['grade'] != assigned_class: self.send_403(); return
            self.send_json(api_delete_student(sid))

        elif path.startswith('/api/teachers/'):
            if not is_admin: self.send_403(); return
            self.send_json(api_delete_teacher(int(path.split('/')[-1])))

        elif path.startswith('/api/users/'):
            if not is_admin: self.send_403(); return
            result, err = api_delete_user(int(path.split('/')[-1]))
            self.send_json(result, err or 200)

        else:
            self.send_404()


# ══════════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    init_db()
    PORT   = 5000
    server = HTTPServer(('localhost', PORT), Handler)
    print(f"""
╔══════════════════════════════════════════════╗
║   System  —  Server Ready   ║
                     ║
╚══════════════════════════════════════════════╝
""")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nServer stopped.')
