"""
Church Attendance System - Backend Server
Run with: python server.py
Then open: http://localhost:5000
"""

import sqlite3
import json
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import urllib.parse

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'church.DB')
FRONTEND_DIR = os.path.dirname(os.path.abspath(__file__))

# ─────────────────────────────────────────────
#  Database helpers
# ─────────────────────────────────────────────

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Create app tables if they don't exist yet."""
    conn = get_conn()
    cur = conn.cursor()
    # Students table (app-managed, separate from the original raw sheets)
    cur.execute('''
        CREATE TABLE IF NOT EXISTS app_students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            grade TEXT NOT NULL,
            whatsapp TEXT DEFAULT '',
            avatar TEXT DEFAULT '',
            attendance INTEGER DEFAULT 100,
            status TEXT DEFAULT 'present',
            total_classes INTEGER DEFAULT 0,
            present_count INTEGER DEFAULT 0,
            absent_count INTEGER DEFAULT 0
        )
    ''')
    # Teachers table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS app_teachers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            subject TEXT DEFAULT 'عام',
            assigned_class TEXT DEFAULT 'KG1',
            whatsapp TEXT DEFAULT '',
            avatar TEXT DEFAULT '',
            attendance INTEGER DEFAULT 100,
            status TEXT DEFAULT 'present',
            total_classes INTEGER DEFAULT 0,
            present_count INTEGER DEFAULT 0,
            absent_count INTEGER DEFAULT 0
        )
    ''')
    # Attendance records (daily session records)
    cur.execute('''
        CREATE TABLE IF NOT EXISTS attendance_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            record_date TEXT,
            status TEXT DEFAULT 'none',
            UNIQUE(student_id, record_date)
        )
    ''')
    # Teacher attendance records
    cur.execute('''
        CREATE TABLE IF NOT EXISTS teacher_attendance_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            teacher_id INTEGER,
            record_date TEXT,
            status TEXT DEFAULT 'none',
            UNIQUE(teacher_id, record_date)
        )
    ''')
    # Attendance history (saved daily summaries)
    cur.execute('''
        CREATE TABLE IF NOT EXISTS attendance_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            record_date TEXT UNIQUE,
            present_count INTEGER DEFAULT 0,
            absent_count INTEGER DEFAULT 0,
            late_count INTEGER DEFAULT 0
        )
    ''')
    conn.commit()
    conn.close()
    print("✓ Database initialized")

# ─────────────────────────────────────────────
#  REST API handlers
# ─────────────────────────────────────────────

def api_get_students():
    conn = get_conn()
    rows = conn.execute('SELECT id, name, grade, whatsapp, avatar, attendance, status, total_classes, present_count, absent_count, COALESCE(birthdate,"") as birthdate FROM app_students ORDER BY id').fetchall()
    conn.close()
    return [dict(r) for r in rows]

def api_add_student(data):
    name = data.get('name', '').strip()
    grade = data.get('grade', 'KG1')
    whatsapp = data.get('whatsapp', '')
    parts = name.split()
    avatar = (parts[0][0] + parts[1][0]).upper() if len(parts) > 1 else name[:2].upper()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('''INSERT INTO app_students (name, grade, whatsapp, avatar, attendance, status, total_classes, present_count, absent_count)
                   VALUES (?,?,?,?,100,'present',0,0,0)''', (name, grade, whatsapp, avatar))
    new_id = cur.lastrowid
    conn.commit()
    row = conn.execute('SELECT * FROM app_students WHERE id=?', (new_id,)).fetchone()
    conn.close()
    return dict(row)


def api_edit_student(student_id, data):
    name = data.get('name', '').strip()
    grade = data.get('grade', '')
    whatsapp = data.get('whatsapp', '')
    birthdate = data.get('birthdate', '')
    if not name:
        return {'error': 'Name required'}, 400
    parts = name.split()
    avatar = (parts[0][0] + parts[1][0]).upper() if len(parts) > 1 else name[:2].upper()
    conn = get_conn()
    conn.execute(
        'UPDATE app_students SET name=?, grade=?, whatsapp=?, birthdate=?, avatar=? WHERE id=?',
        (name, grade, whatsapp, birthdate, avatar, student_id)
    )
    conn.commit()
    row = conn.execute('SELECT id, name, grade, whatsapp, avatar, attendance, status, total_classes, present_count, absent_count, COALESCE(birthdate,"") as birthdate FROM app_students WHERE id=?', (student_id,)).fetchone()
    conn.close()
    if row:
        return dict(row)
    return {'error': 'Not found'}

def api_edit_teacher(teacher_id, data):
    name = data.get('name', '').strip()
    subject = data.get('subject', '')
    assigned_class = data.get('assignedClass', '')
    whatsapp = data.get('whatsapp', '')
    if not name:
        return {'error': 'Name required'}, 400
    parts = name.split()
    avatar = (parts[0][0] + parts[1][0]).upper() if len(parts) > 1 else name[:2].upper()
    conn = get_conn()
    conn.execute(
        'UPDATE app_teachers SET name=?, subject=?, assigned_class=?, whatsapp=?, avatar=? WHERE id=?',
        (name, subject, assigned_class, whatsapp, avatar, teacher_id)
    )
    conn.commit()
    row = conn.execute('SELECT * FROM app_teachers WHERE id=?', (teacher_id,)).fetchone()
    conn.close()
    if row:
        return dict(row)
    return {'error': 'Not found'}

def api_delete_student(student_id):
    conn = get_conn()
    conn.execute('DELETE FROM app_students WHERE id=?', (student_id,))
    conn.execute('DELETE FROM attendance_records WHERE student_id=?', (student_id,))
    conn.commit()
    conn.close()
    return {'success': True}

def api_get_teachers():
    conn = get_conn()
    rows = conn.execute('SELECT * FROM app_teachers ORDER BY id').fetchall()
    conn.close()
    return [dict(r) for r in rows]

def api_add_teacher(data):
    name = data.get('name', '').strip()
    subject = data.get('subject', 'عام')
    assigned_class = data.get('assignedClass', 'KG1')
    whatsapp = data.get('whatsapp', '')
    parts = name.split()
    avatar = (parts[0][0] + parts[1][0]).upper() if len(parts) > 1 else name[:2].upper()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('''INSERT INTO app_teachers (name, subject, assigned_class, whatsapp, avatar, attendance, status, total_classes, present_count, absent_count)
                   VALUES (?,?,?,?,?,100,'present',0,0,0)''', (name, subject, assigned_class, whatsapp, avatar))
    new_id = cur.lastrowid
    conn.commit()
    row = conn.execute('SELECT * FROM app_teachers WHERE id=?', (new_id,)).fetchone()
    conn.close()
    return dict(row)

def api_delete_teacher(teacher_id):
    conn = get_conn()
    conn.execute('DELETE FROM app_teachers WHERE id=?', (teacher_id,))
    conn.execute('DELETE FROM teacher_attendance_records WHERE teacher_id=?', (teacher_id,))
    conn.commit()
    conn.close()
    return {'success': True}

def api_get_attendance_records(date):
    conn = get_conn()
    rows = conn.execute('SELECT student_id, status FROM attendance_records WHERE record_date=?', (date,)).fetchall()
    conn.close()
    return {str(r['student_id']): r['status'] for r in rows}

def api_mark_attendance(data):
    student_id = data.get('studentId')
    status = data.get('status')
    date = data.get('date')
    conn = get_conn()
    conn.execute('''INSERT INTO attendance_records (student_id, record_date, status)
                    VALUES (?,?,?)
                    ON CONFLICT(student_id, record_date) DO UPDATE SET status=excluded.status''',
                 (student_id, date, status))
    conn.commit()
    conn.close()
    return {'success': True}

def api_save_attendance(data):
    date = data.get('date')
    records = data.get('records', {})  # {student_id: status}
    
    conn = get_conn()
    present_c = absent_c = late_c = 0
    
    for sid_str, status in records.items():
        sid = int(sid_str)
        if status == 'none':
            continue
        # Update student stats
        if status == 'present':
            conn.execute('UPDATE app_students SET present_count=present_count+1, total_classes=total_classes+1, status=? WHERE id=?', (status, sid))
            present_c += 1
        elif status == 'absent':
            conn.execute('UPDATE app_students SET absent_count=absent_count+1, total_classes=total_classes+1, status=? WHERE id=?', (status, sid))
            absent_c += 1
        elif status == 'late':
            conn.execute('UPDATE app_students SET present_count=present_count+1, total_classes=total_classes+1, status=? WHERE id=?', (status, sid))
            late_c += 1
        # Recalc attendance%
        conn.execute('''UPDATE app_students SET attendance=ROUND(CAST(present_count AS REAL)/NULLIF(total_classes,0)*100)
                        WHERE id=?''', (sid,))
        # Reset daily record
        conn.execute('''UPDATE attendance_records SET status='none' WHERE student_id=? AND record_date=?''', (sid, date))
    
    # Upsert history
    conn.execute('''INSERT INTO attendance_history (record_date, present_count, absent_count, late_count)
                    VALUES (?,?,?,?)
                    ON CONFLICT(record_date) DO UPDATE SET
                    present_count=excluded.present_count, absent_count=excluded.absent_count, late_count=excluded.late_count''',
                 (date, present_c, absent_c, late_c))
    conn.commit()
    conn.close()
    return {'success': True, 'updated': present_c + absent_c + late_c}

def api_get_teacher_attendance_records(date):
    conn = get_conn()
    rows = conn.execute('SELECT teacher_id, status FROM teacher_attendance_records WHERE record_date=?', (date,)).fetchall()
    conn.close()
    return {str(r['teacher_id']): r['status'] for r in rows}

def api_mark_teacher_attendance(data):
    teacher_id = data.get('teacherId')
    status = data.get('status')
    date = data.get('date')
    conn = get_conn()
    conn.execute('''INSERT INTO teacher_attendance_records (teacher_id, record_date, status)
                    VALUES (?,?,?)
                    ON CONFLICT(teacher_id, record_date) DO UPDATE SET status=excluded.status''',
                 (teacher_id, date, status))
    conn.commit()
    conn.close()
    return {'success': True}

def api_save_teacher_attendance(data):
    date = data.get('date')
    records = data.get('records', {})
    conn = get_conn()
    updated = 0
    for tid_str, status in records.items():
        tid = int(tid_str)
        if status == 'none':
            continue
        if status in ('present', 'late'):
            conn.execute('UPDATE app_teachers SET present_count=present_count+1, total_classes=total_classes+1, status=? WHERE id=?', (status, tid))
        elif status == 'absent':
            conn.execute('UPDATE app_teachers SET absent_count=absent_count+1, total_classes=total_classes+1, status=? WHERE id=?', (status, tid))
        conn.execute('''UPDATE app_teachers SET attendance=ROUND(CAST(present_count AS REAL)/NULLIF(total_classes,0)*100)
                        WHERE id=?''', (tid,))
        conn.execute('UPDATE teacher_attendance_records SET status=\'none\' WHERE teacher_id=? AND record_date=?', (tid, date))
        updated += 1
    conn.commit()
    conn.close()
    return {'success': True, 'updated': updated}

def api_get_attendance_history():
    conn = get_conn()
    rows = conn.execute('SELECT record_date as date, present_count as present, absent_count as absent, late_count as late FROM attendance_history ORDER BY record_date DESC LIMIT 60').fetchall()
    conn.close()
    return [dict(r) for r in rows]

def api_get_full_attendance_log(date_filter=None, grade_filter=None):
    conn = get_conn()
    query = '''
        SELECT ar.record_date as date, ar.status,
               s.id as student_id, s.name, s.grade
        FROM attendance_records ar
        JOIN app_students s ON s.id = ar.student_id
        WHERE ar.status != 'none'
    '''
    params = []
    if date_filter:
        query += ' AND ar.record_date = ?'
        params.append(date_filter)
    if grade_filter and grade_filter != 'all':
        query += ' AND s.grade = ?'
        params.append(grade_filter)
    query += ' ORDER BY ar.record_date DESC, s.grade, s.name'
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def api_get_student_history(student_id):
    conn = get_conn()
    rows = conn.execute('''
        SELECT record_date as date, status
        FROM attendance_records
        WHERE student_id = ? AND status != 'none'
        ORDER BY record_date DESC
    ''', (student_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def api_get_teacher_full_log(date_filter=None):
    conn = get_conn()
    query = '''
        SELECT tar.record_date as date, tar.status,
               t.id as teacher_id, t.name, t.subject, t.assigned_class
        FROM teacher_attendance_records tar
        JOIN app_teachers t ON t.id = tar.teacher_id
        WHERE tar.status != 'none'
    '''
    params = []
    if date_filter:
        query += ' AND tar.record_date = ?'
        params.append(date_filter)
    query += ' ORDER BY tar.record_date DESC, t.name'
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ─────────────────────────────────────────────
#  HTTP Request Handler
# ─────────────────────────────────────────────

class Handler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        # Suppress default access log spam; only print errors
        if args and str(args[1]) not in ('200', '304'):
            print(f"  {args[0]} → {args[1]}")

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, path, content_type):
        with open(path, 'rb') as f:
            data = f.read()
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def read_body(self):
        length = int(self.headers.get('Content-Length', 0))
        if length:
            return json.loads(self.rfile.read(length))
        return {}

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)

        # ── Static files ──
        if path == '/' or path == '/index.html':
            self.send_file(os.path.join(FRONTEND_DIR, 'index.html'), 'text/html; charset=utf-8')
            return
        if path == '/style.css':
            self.send_file(os.path.join(FRONTEND_DIR, 'style.css'), 'text/css; charset=utf-8')
            return
        if path == '/script.js':
            self.send_file(os.path.join(FRONTEND_DIR, 'script.js'), 'application/javascript; charset=utf-8')
            return
        if path == '/logo.jpeg':
            logo_path = os.path.join(FRONTEND_DIR, 'logo.jpeg')
            if os.path.exists(logo_path):
                self.send_file(logo_path, 'image/jpeg')
            else:
                self.send_response(404); self.end_headers()
            return

        # ── API ──
        if path == '/api/students':
            self.send_json(api_get_students())
        elif path == '/api/teachers':
            self.send_json(api_get_teachers())
        elif path == '/api/attendance/records':
            date = qs.get('date', [''])[0]
            self.send_json(api_get_attendance_records(date))
        elif path == '/api/teacher-attendance/records':
            date = qs.get('date', [''])[0]
            self.send_json(api_get_teacher_attendance_records(date))
        elif path == '/api/attendance/history':
            self.send_json(api_get_attendance_history())
        elif path == '/api/attendance/log':
            date_filter = qs.get('date', [''])[0] or None
            grade_filter = qs.get('grade', ['all'])[0]
            self.send_json(api_get_full_attendance_log(date_filter, grade_filter))
        elif path.startswith('/api/students/') and path.endswith('/history'):
            sid = int(path.split('/')[3])
            self.send_json(api_get_student_history(sid))
        elif path == '/api/teacher-attendance/log':
            date_filter = qs.get('date', [''])[0] or None
            self.send_json(api_get_teacher_full_log(date_filter))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        path = urlparse(self.path).path
        data = self.read_body()

        if path == '/api/students':
            result = api_add_student(data)
            self.send_json(result, 201)
        elif path == '/api/teachers':
            result = api_add_teacher(data)
            self.send_json(result, 201)
        elif path == '/api/attendance/mark':
            self.send_json(api_mark_attendance(data))
        elif path == '/api/attendance/save':
            self.send_json(api_save_attendance(data))
        elif path == '/api/teacher-attendance/mark':
            self.send_json(api_mark_teacher_attendance(data))
        elif path == '/api/teacher-attendance/save':
            self.send_json(api_save_teacher_attendance(data))
        else:
            self.send_response(404); self.end_headers()


    def do_PUT(self):
        path = urlparse(self.path).path
        data = self.read_body()

        if path.startswith('/api/students/') and not path.endswith('/history'):
            sid = int(path.split('/')[-1])
            result = api_edit_student(sid, data)
            self.send_json(result)
        elif path.startswith('/api/teachers/'):
            tid = int(path.split('/')[-1])
            result = api_edit_teacher(tid, data)
            self.send_json(result)
        else:
            self.send_response(404); self.end_headers()

    def do_DELETE(self):
        path = urlparse(self.path).path

        if path.startswith('/api/students/'):
            sid = int(path.split('/')[-1])
            self.send_json(api_delete_student(sid))
        elif path.startswith('/api/teachers/'):
            tid = int(path.split('/')[-1])
            self.send_json(api_delete_teacher(tid))
        else:
            self.send_response(404); self.end_headers()


# ─────────────────────────────────────────────
#  Entry point
# ─────────────────────────────────────────────

if __name__ == '__main__':
    init_db()
    PORT = 5000
    server = HTTPServer(('localhost', PORT), Handler)
    print(f"""
╔══════════════════════════════════════════════╗
║   Church Attendance System - Backend Ready   ║
╠══════════════════════════════════════════════╣
║  Open in browser:  http://localhost:{PORT}      ║
║  Press Ctrl+C to stop the server             ║
╚══════════════════════════════════════════════╝
""")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
