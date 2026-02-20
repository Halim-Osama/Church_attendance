/**
 * utils.js — Shared helper functions used across modules.
 */

const Utils = (() => {

    /** Translate grade key → Arabic label */
    function gradeLabel(grade) {
        return GRADE_LABELS[grade] || grade;
    }

    /** Translate status key → Arabic label */
    function statusLabel(status) {
        return STATUS_LABELS[status] || status;
    }

    /** Today's date as YYYY-MM-DD */
    function today() {
        return new Date().toISOString().split('T')[0];
    }

    /** Format a YYYY-MM-DD string to Arabic locale date */
    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('ar-EG');
    }

    /** Build initials avatar from a full name */
    function makeAvatar(name) {
        const parts = name.trim().split(/\s+/);
        return parts.length > 1
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : name.substring(0, 2).toUpperCase();
    }

    /** Progress bar colour class based on attendance % */
    function progressClass(pct) {
        if (pct >= 90) return 'bg-success';
        if (pct >= 75) return 'bg-warning';
        return 'bg-danger';
    }

    /** Rate fill colour based on attendance % */
    function rateColor(pct) {
        if (pct >= 90) return '#10b981';
        if (pct >= 75) return '#f59e0b';
        return '#ef4444';
    }

    /**
     * Show the shared Bootstrap modal with custom body HTML.
     * Returns the Bootstrap Modal instance so callers can .hide() it.
     */
    function showModal(bodyHTML, title = 'التفاصيل') {
        document.querySelector('#appModal .modal-title').textContent = title;
        document.getElementById('appModalBody').innerHTML = bodyHTML;
        const instance = new bootstrap.Modal(document.getElementById('appModal'));
        instance.show();
        return instance;
    }

    /** Download a Blob as a file */
    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    }

    return { gradeLabel, statusLabel, today, formatDate, makeAvatar, progressClass, rateColor, showModal, downloadBlob };
})();
