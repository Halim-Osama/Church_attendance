# Church Attendance System — Local Backend

## Requirements
- **Python 3** (no extra packages needed — uses built-in modules only)

## How to Run

### Windows
Double-click `start.bat`  
  or open Command Prompt and run:
```
python server.py
```

### Mac / Linux
```bash
chmod +x start.sh
./start.sh
```
  or:
```bash
python3 server.py
```

## Open in Browser
After starting the server, open your browser and go to:
**http://localhost:5000**

---

## Folder Structure
```
church_attendance/
├── server.py          ← Python backend (SQLite API)
├── church.DB          ← SQLite database (auto-updated)
├── index.html         ← Frontend
├── script.js          ← Frontend logic (API-connected)
├── style.css          ← Styles
├── logo.jpeg          ← Church logo (place here if you have it)
├── start.bat          ← Windows launcher
├── start.sh           ← Mac/Linux launcher
└── README.md          ← This file
```

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/students | Get all students |
| POST | /api/students | Add a student |
| DELETE | /api/students/:id | Delete a student |
| GET | /api/teachers | Get all teachers |
| POST | /api/teachers | Add a teacher |
| DELETE | /api/teachers/:id | Delete a teacher |
| GET | /api/attendance/records?date=YYYY-MM-DD | Daily records |
| POST | /api/attendance/mark | Mark one student |
| POST | /api/attendance/save | Save & commit day |
| GET | /api/teacher-attendance/records?date=YYYY-MM-DD | Teacher records |
| POST | /api/teacher-attendance/mark | Mark one teacher |
| POST | /api/teacher-attendance/save | Save teacher day |
| GET | /api/attendance/history | Attendance history |

## Notes
- All data is persisted in `church.DB` (SQLite).
- The original raw sheets from the DB are preserved untouched.
- Students and teachers added via the UI are stored in `app_students` / `app_teachers` tables.
- Password: **virginmarry** (same as original)
