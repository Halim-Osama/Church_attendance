/**
 * config.js — App-wide constants
 */

const API_BASE = 'http://localhost:5000/api';

const GRADE_LABELS = {
    KG1: 'KG1', KG2: 'KG2',
    '1': 'الصف الأول الابتدائي',   '2': 'الصف الثاني الابتدائي',
    '3': 'الصف الثالث الابتدائي',  '4': 'الصف الرابع الابتدائي',
    '5': 'الصف الخامس الابتدائي',  '6': 'الصف السادس الابتدائي',
    '7': 'الصف الأول الإعدادي',    '8': 'الصف الثاني الإعدادي',
    '9': 'الصف الثالث الإعدادي',   '10': 'الصف الأول الثانوي',
    '11': 'الصف الثاني الثانوي',   '12': 'الصف الثالث الثانوي',
};

const STATUS_LABELS = {
    present: 'حاضر',
    absent:  'غائب',
    late:    'متأخر',
    none:    'غير محدد',
};

/** Reusable grade <optgroup> HTML injected into selects */
const GRADE_OPTIONS_HTML = `
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
</optgroup>`;

/** Return grade options HTML with a specific value pre-selected */
function gradeOptionsWithSelected(selected) {
    return GRADE_OPTIONS_HTML.replace(
        `value="${selected}"`,
        `value="${selected}" selected`
    );
}
