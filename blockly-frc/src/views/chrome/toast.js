/* ================================================================
 * Blockly for FRC — application controller
 * Developed by FRC 2789 (Texplosion)
 * ================================================================ */

(function () {
    'use strict';

    /* ---- toast ---- */
    let toastTimer = null;

    function toast(msg, kind = 'ok') {
        const t = BlocklyFRC.$('#toast');
        t.textContent = msg;
        t.classList.toggle('toast-error', kind === 'error');
        t.classList.add('visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('visible'), 2400);
    }

    BlocklyFRC.register({toast});
})();
