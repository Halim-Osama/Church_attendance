/**
 * attendance.js — Student attendance table: mark, save, export.
 */

const Attendance = (() => {

    function filterByClass() {
        Store.selectedAttendanceClass = document.getElementById('attendanceClassFilter').value;
        render();
    }

    function render() {
        const tbody = document.querySelector('#attendanceTable tbody');
        if (!tbody) return;

        const classFilter = Store.isAdmin
            ? Store.selectedAttendanceClass
            : (Store.assignedClass || 'all');

        const list = classFilter === 'all'
            ? Store.students
            : Store.students.filter(s => s.grade === classFilter);

        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">لا يوجد طلاب</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(s => {
            const cs = Store.attendanceRecords[s.id]?.status || 'none';
            return `
                <tr>
                    <td>
                        <div class="table-student-info"
                             onclick="Students.showModal(${s.id})" style="cursor:pointer;">
                            <div class="table-avatar">${s.avatar}</div>
                            <div>
                                <div class="table-name">${s.name}</div>
                                <div class="table-id">ID: ${String(s.id).padStart(4, '0')}</div>
                            </div>
                        </div>
                    </td>
                    <td><span class="grade-badge">${Utils.gradeLabel(s.grade)}</span></td>
                    <td>
                        <div class="rate-display">
                            <div class="rate-bar">
                                <div class="rate-fill"
                                     style="width:${s.attendance}%;background:${Utils.rateColor(s.attendance)}">
                                </div>
                            </div>
                            <span class="rate-text">${s.attendance}%</span>
                        </div>
                    </td>
                    <td>
                        <div class="status-actions">
                            <button class="btn-status btn-present  ${cs === 'present' ? 'active' : ''}"
                                    onclick="Attendance.mark(${s.id}, 'present')">
                                <i class="bi bi-check-circle-fill"></i> حاضر
                            </button>
                            <button class="btn-status btn-absent   ${cs === 'absent'  ? 'active' : ''}"
                                    onclick="Attendance.mark(${s.id}, 'absent')">
                                <i class="bi bi-x-circle-fill"></i> غائب
                            </button>
                            <button class="btn-status btn-late     ${cs === 'late'    ? 'active' : ''}"
                                    onclick="Attendance.mark(${s.id}, 'late')">
                                <i class="bi bi-clock-fill"></i> متأخر
                            </button>
                        </div>
                    </td>
                </tr>`;
        }).join('');
    }

    function mark(studentId, status) {
        const date = Utils.today();
        Store.attendanceRecords[studentId] = { status, date };
        Api.post('/attendance/mark', { studentId, status, date }).catch(() => {});
        render();
        Dashboard.updateStats();
    }

    async function save() {
        const today   = Utils.today();
        const records = {};
        let   hasAny  = false;

        Store.students.forEach(s => {
            const rec = Store.attendanceRecords[s.id];
            if (rec && rec.status !== 'none' && rec.date === today) {
                records[s.id] = rec.status;
                hasAny = true;
            }
        });

        if (!hasAny) { alert('لم يتم تسجيل أي حضور اليوم!'); return; }

        try {
            const result = await Api.post('/attendance/save', { date: today, records });
            await Store.reload();
            alert(`تم حفظ الحضور بنجاح! تم تحديث ${result.updated} طالب.`);
            render();
            Dashboard.updateStats();
            Dashboard.renderTrends();
            Dashboard.renderTopPerformers();
        } catch (err) {
            alert('خطأ في حفظ الحضور. تأكد من تشغيل الخادم.\n' + err.message);
        }
    }

    function exportData(format) {
        const today = new Date().toLocaleDateString('ar-EG');
        const date  = today.replace(/\//g, '-');

        if (format === 'excel') {
            const rows = Store.students.map(s => ({
                'ID':           String(s.id).padStart(4, '0'),
                'الاسم':        s.name,
                'الفصل':        s.grade,
                'الحالة':       Utils.statusLabel(Store.attendanceRecords[s.id]?.status || 'none'),
                'نسبة الحضور': s.attendance + '%',
                'حاضر':         s.present,
                'غائب':         s.absent,
                'إجمالي':       s.totalClasses,
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'الحضور');
            XLSX.writeFile(wb, `حضور_${date}.xlsx`);

        } else if (format === 'pdf') {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.setFontSize(18); doc.text('تقرير الحضور', 14, 20);
            doc.setFontSize(12); doc.text(`التاريخ: ${today}`, 14, 30);
            doc.autoTable({
                head: [['ID','الاسم','الفصل','الحالة','نسبة الحضور','حاضر','غائب']],
                body: Store.students.map(s => [
                    String(s.id).padStart(4,'0'), s.name, s.grade,
                    Utils.statusLabel(Store.attendanceRecords[s.id]?.status || 'none'),
                    s.attendance + '%', s.present + '', s.absent + '',
                ]),
                startY: 40, theme: 'grid',
                headStyles: { fillColor: [102, 126, 234] },
            });
            doc.save(`حضور_${date}.pdf`);

        } else if (format === 'image') {
            html2canvas(document.getElementById('attendanceTable'), { scale: 2, backgroundColor: '#fff' })
                .then(canvas => {
                    const a = document.createElement('a');
                    a.download = `حضور_${date}.png`;
                    a.href = canvas.toDataURL();
                    a.click();
                });
        }
    }

    return { filterByClass, render, mark, save, export: exportData };
})();
