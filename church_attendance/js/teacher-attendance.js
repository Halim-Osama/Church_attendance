/**
 * teacher-attendance.js — Teacher attendance table: mark, save, export.
 */

const TeacherAttendance = (() => {

    function render() {
        const tbody = document.querySelector('#teacherAttendanceTable tbody');
        if (!tbody) return;

        if (!Store.teachers.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">لا يوجد خدام</td></tr>';
            return;
        }

        tbody.innerHTML = Store.teachers.map(t => {
            const cs = Store.teacherAttendanceRecords[t.id]?.status || 'none';
            return `
                <tr>
                    <td>
                        <div class="table-student-info"
                             onclick="Teachers.showModal(${t.id})" style="cursor:pointer;">
                            <div class="table-avatar">${t.avatar}</div>
                            <div>
                                <div class="table-name">${t.name}</div>
                                <div class="table-id">ID: ${String(t.id).padStart(4, '0')}</div>
                            </div>
                        </div>
                    </td>
                    <td><span class="grade-badge">${t.subject}</span></td>
                    <td><span class="grade-badge">${Utils.gradeLabel(t.assignedClass)}</span></td>
                    <td>
                        <div class="rate-display">
                            <div class="rate-bar">
                                <div class="rate-fill"
                                     style="width:${t.attendance}%;background:${Utils.rateColor(t.attendance)}">
                                </div>
                            </div>
                            <span class="rate-text">${t.attendance}%</span>
                        </div>
                    </td>
                    <td>
                        <div class="status-actions">
                            <button class="btn-status btn-present  ${cs === 'present' ? 'active' : ''}"
                                    onclick="TeacherAttendance.mark(${t.id}, 'present')">
                                <i class="bi bi-check-circle-fill"></i> حاضر
                            </button>
                            <button class="btn-status btn-absent   ${cs === 'absent'  ? 'active' : ''}"
                                    onclick="TeacherAttendance.mark(${t.id}, 'absent')">
                                <i class="bi bi-x-circle-fill"></i> غائب
                            </button>
                            <button class="btn-status btn-late     ${cs === 'late'    ? 'active' : ''}"
                                    onclick="TeacherAttendance.mark(${t.id}, 'late')">
                                <i class="bi bi-clock-fill"></i> متأخر
                            </button>
                        </div>
                    </td>
                </tr>`;
        }).join('');
    }

    function mark(teacherId, status) {
        const date = Utils.today();
        Store.teacherAttendanceRecords[teacherId] = { status, date };
        Api.post('/teacher-attendance/mark', { teacherId, status, date }).catch(() => {});
        render();
    }

    async function save() {
        const today   = Utils.today();
        const records = {};
        let   hasAny  = false;

        Store.teachers.forEach(t => {
            const rec = Store.teacherAttendanceRecords[t.id];
            if (rec && rec.status !== 'none' && rec.date === today) {
                records[t.id] = rec.status;
                hasAny = true;
            }
        });

        if (!hasAny) { alert('لم يتم تسجيل أي حضور اليوم!'); return; }

        try {
            const result = await Api.post('/teacher-attendance/save', { date: today, records });
            await Store.reload();
            alert(`تم حفظ حضور الخدام بنجاح! تم تحديث ${result.updated} خادم.`);
            render();
        } catch (err) {
            alert('خطأ في حفظ الحضور.\n' + err.message);
        }
    }

    function exportData(format) {
        const today = new Date().toLocaleDateString('ar-EG');
        const date  = today.replace(/\//g, '-');

        if (format === 'excel') {
            const rows = Store.teachers.map(t => ({
                'ID':           String(t.id).padStart(4, '0'),
                'الاسم':        t.name,
                'المادة':       t.subject,
                'الفصل المخصص': t.assignedClass,
                'الحالة':       Utils.statusLabel(Store.teacherAttendanceRecords[t.id]?.status || 'none'),
                'نسبة الحضور': t.attendance + '%',
                'حاضر':         t.present,
                'غائب':         t.absent,
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'حضور_الخدام');
            XLSX.writeFile(wb, `حضور_الخدام_${date}.xlsx`);

        } else if (format === 'pdf') {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.setFontSize(18); doc.text('تقرير حضور الخدام', 14, 20);
            doc.setFontSize(12); doc.text(`التاريخ: ${today}`, 14, 30);
            doc.autoTable({
                head: [['ID','الاسم','المادة','الفصل','الحالة','النسبة','حاضر','غائب']],
                body: Store.teachers.map(t => [
                    String(t.id).padStart(4,'0'), t.name, t.subject, t.assignedClass,
                    Utils.statusLabel(Store.teacherAttendanceRecords[t.id]?.status || 'none'),
                    t.attendance + '%', t.present + '', t.absent + '',
                ]),
                startY: 40, theme: 'grid',
                headStyles: { fillColor: [102, 126, 234] },
            });
            doc.save(`حضور_الخدام_${date}.pdf`);

        } else if (format === 'image') {
            html2canvas(document.getElementById('teacherAttendanceTable'), { scale: 2, backgroundColor: '#fff' })
                .then(canvas => {
                    const a = document.createElement('a');
                    a.download = `حضور_الخدام_${date}.png`;
                    a.href = canvas.toDataURL();
                    a.click();
                });
        }
    }

    return { render, mark, save, export: exportData };
})();
