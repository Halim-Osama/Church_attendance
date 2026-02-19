# ⛪ نظام إدارة حضور كنيسة السيدة العذراء مريم والبابا بطرس خاتم الشهداء بالخانكة
## Church Attendance Management System

<div align="center">

![Python](https://img.shields.io/badge/Python-3.x-blue?style=for-the-badge&logo=python)
![SQLite](https://img.shields.io/badge/SQLite-Database-green?style=for-the-badge&logo=sqlite)
![HTML5](https://img.shields.io/badge/HTML5-Frontend-orange?style=for-the-badge&logo=html5)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple?style=for-the-badge&logo=bootstrap)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

A full-stack local web application for managing Sunday school attendance — students, teachers, and daily records — built for the Virgin Mary & Pope Peter Church in El-Khanka, Egypt.

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Screenshots & Pages](#-screenshots--pages)
- [Data Overview](#-data-overview)
- [Contributing](#-contributing)

---

## 🌟 Overview

This is a **fully local**, single-device attendance management system designed for church Sunday schools. It requires no internet connection after setup, no external services, and no paid subscriptions. Everything runs on your own machine using Python's built-in HTTP server and a SQLite database.

The system manages **398 students** across 13 grade levels and **131 teachers/servants** across 3 departments, with full attendance tracking, history, reporting, and export capabilities.

---

## ✨ Features

### 👨‍🎓 Student Management
- View all students in a card-based grid layout
- **Search** by name and **filter** by grade/class
- **Add** new students (name, grade, birthdate, WhatsApp number)
- **Edit** any student's data — changes saved instantly to the database
- **Delete** students with confirmation
- **Import** students in bulk from Excel files
- **Export** the full student list to Excel
- View individual student detail popup with attendance stats, birthdate, and WhatsApp link
- See per-student attendance history log inside the detail popup

### 👨‍🏫 Teacher / Servant Management
- Same card-based grid as students
- **Search** by name and **filter by department** (ابتدائي / إعدادي وثانوي / أنشطة)
- Add, edit, delete, and import/export teachers
- View individual teacher detail with attendance stats

### 📅 Daily Attendance Marking
- Mark each student as **حاضر (Present)**, **غائب (Absent)**, or **متأخر (Late)**
- Filter the attendance table by class/grade before marking
- Live dashboard stats update as you mark
- Save the day's attendance — permanently stored in the database
- Same flow for teacher/servant attendance on a separate page

### 📊 Reports & Analytics
- Dashboard with today's live counts (present / absent / late / total)
- Attendance trends chart for the last 5 sessions
- Top 5 students by attendance rate
- Per-grade attendance averages with progress bars
- Monthly summary (totals, averages, best/worst day)
- Students needing follow-up (below 85% attendance)

### 📒 Attendance Log
- Full searchable log of all saved attendance records
- **Students tab** — filter by date and/or grade
- **Teachers tab** — filter by date
- Record count shown for every filter combination

### 📤 Export Options
- Export attendance tables to **Excel (.xlsx)**
- Export to **PDF**
- Export as **PNG image** (screenshot of the table)

### 🔐 Login & Security
- Password-protected login screen
- Session persists across page refreshes (no repeated logins)
- Logout button in sidebar

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3 — `http.server` (no external packages needed) |
| **Database** | SQLite 3 (built into Python) |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **UI Framework** | Bootstrap 5.3 |
| **Icons** | Bootstrap Icons 1.11 |
| **Fonts** | Google Fonts — Cairo (Arabic), Playfair Display |
| **Excel Export** | SheetJS (xlsx.js) |
| **PDF Export** | jsPDF + jsPDF-AutoTable |
| **Image Export** | html2canvas |

> ✅ **Zero external Python dependencies** — runs on any machine with Python 3 installed. No `pip install` required.

---

## 📁 Project Structure

```
church_attendance/
│
├── server.py           # Python backend — HTTP server + REST API + SQLite
├── church.DB           # SQLite database (students, teachers, attendance)
│
├── index.html          # Main frontend — all pages in one HTML file
├── script.js           # Frontend logic — API calls, rendering, state management
├── style.css           # All custom styles
│
├── logo.jpeg           # Church logo (add your own)
│
├── start.bat           # One-click launcher for Windows
├── start.sh            # One-click launcher for Mac / Linux
│
└── README.md           # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3** installed on your machine
  - Download from: https://www.python.org/downloads/
  - ⚠️ During installation on Windows, check **"Add Python to PATH"**

### Run the App

**Windows:**
```
Double-click start.bat
```

**Mac / Linux:**
```bash
chmod +x start.sh
./start.sh
```

**Or manually from any OS:**
```bash
python3 server.py
```

### Open in Browser

Once the server is running, open your browser and go to:

```
http://localhost:5000
```

### Default Password
```
virginmarry
```

---

## 📡 API Reference

All API endpoints are served by the Python backend at `http://localhost:5000/api`.

### Students

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/students` | Get all students |
| `POST` | `/api/students` | Add a new student |
| `PUT` | `/api/students/:id` | Edit student data |
| `DELETE` | `/api/students/:id` | Delete a student |
| `GET` | `/api/students/:id/history` | Get attendance history for one student |

**POST / PUT body:**
```json
{
  "name": "اسم الطالب",
  "grade": "KG1",
  "whatsapp": "+201234567890",
  "birthdate": "15/3/2015"
}
```

### Teachers

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/teachers` | Get all teachers |
| `POST` | `/api/teachers` | Add a new teacher |
| `PUT` | `/api/teachers/:id` | Edit teacher data |
| `DELETE` | `/api/teachers/:id` | Delete a teacher |

### Attendance

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/attendance/records?date=YYYY-MM-DD` | Get today's unsaved records |
| `POST` | `/api/attendance/mark` | Mark one student |
| `POST` | `/api/attendance/save` | Commit the day — saves to DB permanently |
| `GET` | `/api/attendance/history` | Get saved daily summaries |
| `GET` | `/api/attendance/log?date=&grade=` | Full saved log with filters |

### Teacher Attendance

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/teacher-attendance/records?date=YYYY-MM-DD` | Today's records |
| `POST` | `/api/teacher-attendance/mark` | Mark one teacher |
| `POST` | `/api/teacher-attendance/save` | Commit the day |
| `GET` | `/api/teacher-attendance/log?date=` | Full saved log |

---

## 🗄 Database Schema

The `church.DB` SQLite file contains both the **original raw sheets** (preserved, read-only) and the **app-managed tables**:

```sql
-- Students managed by the app
CREATE TABLE app_students (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    grade         TEXT NOT NULL,
    whatsapp      TEXT DEFAULT '',
    avatar        TEXT DEFAULT '',
    birthdate     TEXT DEFAULT '',
    attendance    INTEGER DEFAULT 100,
    status        TEXT DEFAULT 'present',
    total_classes INTEGER DEFAULT 0,
    present_count INTEGER DEFAULT 0,
    absent_count  INTEGER DEFAULT 0
);

-- Teachers / servants managed by the app
CREATE TABLE app_teachers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    subject       TEXT DEFAULT 'عام',
    assigned_class TEXT DEFAULT '',
    whatsapp      TEXT DEFAULT '',
    avatar        TEXT DEFAULT '',
    attendance    INTEGER DEFAULT 100,
    status        TEXT DEFAULT 'present',
    total_classes INTEGER DEFAULT 0,
    present_count INTEGER DEFAULT 0,
    absent_count  INTEGER DEFAULT 0
);

-- Per-student daily attendance (unsaved session + saved records)
CREATE TABLE attendance_records (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id   INTEGER,
    record_date  TEXT,
    status       TEXT DEFAULT 'none',
    UNIQUE(student_id, record_date)
);

-- Per-teacher daily attendance
CREATE TABLE teacher_attendance_records (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id   INTEGER,
    record_date  TEXT,
    status       TEXT DEFAULT 'none',
    UNIQUE(teacher_id, record_date)
);

-- Daily summary (saved after clicking "حفظ الحضور")
CREATE TABLE attendance_history (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date   TEXT UNIQUE,
    present_count INTEGER DEFAULT 0,
    absent_count  INTEGER DEFAULT 0,
    late_count    INTEGER DEFAULT 0
);
```

### Grade Codes

| Code | Grade |
|------|-------|
| `KG1` | حضانة أولى |
| `KG2` | حضانة ثانية |
| `1`–`6` | أولى – سادسة ابتدائي |
| `7`–`9` | أولى – ثالثة إعدادي |
| `10`–`12` | أولى – ثالثة ثانوي |

---

## 📸 Screenshots & Pages

| Page | Description |
|------|-------------|
| **Login** | Password screen with shake animation on wrong input |
| **لوحة التحكم** | Dashboard — live stats, attendance trends, top performers |
| **الطلاب** | Student grid with search, grade filter, add/edit/delete |
| **الخدام** | Teacher grid with search, department filter, add/edit/delete |
| **حضور الطلاب** | Mark daily student attendance by class |
| **حضور الخدام** | Mark daily teacher/servant attendance |
| **التقارير** | Grade-level stats, monthly summary, follow-up list |
| **سجل الحضور** | Full saved attendance log with date & grade filters |

---

## 📊 Data Overview

The database was pre-populated from the church's existing Excel records:

| Category | Count |
|----------|-------|
| Total Students | **398** |
| KG1 | 45 |
| KG2 | 29 |
| Grades 1–6 (Primary) | 170 |
| Grades 7–9 (Prep) | 89 |
| Grades 10–12 (Secondary) | 63 |
| **Total Teachers / Servants** | **131** |
| Primary Department (ابتدائي) | 85 |
| Prep & Secondary (إعدادي وثانوي) | 34 |
| Activities (أنشطة) | 12 |

---

## 🤝 Contributing

This project was built specifically for the Virgin Mary & Pope Peter Church in El-Khanka. If you'd like to adapt it for another church or organization:

1. Fork the repository
2. Replace `church.DB` with your own database or start fresh (the app will create all tables on first run)
3. Update the church name in `index.html` (search for `كنيسة السيدة العذراء`)
4. Change the password in `script.js` (search for `CORRECT_PASSWORD`)
5. Add your `logo.jpeg` to the project folder

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">
  Made with ❤️ for the Sunday School of Virgin Mary & Pope Peter Church — El-Khanka, Egypt
</div>
