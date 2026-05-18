/* ================================================================
 * Blockly for FRC — application controller
 * Developed by FRC 2789 (Texplosion)
 * ================================================================ */

(function () {
    'use strict';

    /* ---- modal ---- */
    function showModal(html) {
        const m = BlocklyFRC.$('#modal-backdrop');
        BlocklyFRC.$('#modal-content').innerHTML = html;
        m.classList.add('visible');
    }

    function closeModal() {
        BlocklyFRC.$('#modal-backdrop').classList.remove('visible');
    }

    function confirmModal(title, desc, onConfirm) {
        showModal(`
      <h3 class="modal-title">${BlocklyFRC.escapeHtml(title)}</h3>
      <p class="modal-desc">${BlocklyFRC.escapeHtml(desc)}</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="m-cancel">Cancel</button>
        <button class="btn btn-danger" id="m-confirm">Confirm</button>
      </div>
    `);
        BlocklyFRC.$('#m-cancel').addEventListener('click', closeModal);
        BlocklyFRC.$('#m-confirm').addEventListener('click', () => {
            closeModal();
            onConfirm();
        });
    }

    BlocklyFRC.register({showModal, closeModal, confirmModal});
})();
