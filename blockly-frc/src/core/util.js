/* ================================================================
 * Blockly for FRC — application controller
 * Developed by FRC 2789 (Texplosion)
 * ================================================================ */

/* ----------------------------------------------------------------
 * Utilities
 * -------------------------------------------------------------- */
(function () {
    'use strict';

    function uid() {
        return Math.random().toString(36).slice(2, 10);
    }

    function $(sel, root = document) {
        return root.querySelector(sel);
    }

    function $$(sel, root = document) {
        return Array.from(root.querySelectorAll(sel));
    }

    /* ---- HTML escape ---- */
    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[c]);
    }

    function uniq(arr) {
        return Array.from(new Set(arr));
    }

    /* Convert a user-visible name into a safe Java identifier. */
    function toJavaId(name) {
        if (!name) return 'unnamed';
        let id = name.replace(/[^A-Za-z0-9_]/g, '_');
        if (/^\d/.test(id)) id = '_' + id;
        return id;
    }

    function pascal(name) {
        const id = toJavaId(name);
        return id.charAt(0).toUpperCase() + id.slice(1);
    }

    function camel(name) {
        const id = toJavaId(name);
        return id.charAt(0).toLowerCase() + id.slice(1);
    }

    BlocklyFRC.register({uid, $, $$, pascal, camel, uniq, escapeHtml});
})();