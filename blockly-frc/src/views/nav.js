/* ================================================================
 * Blockly for FRC — Top-level navigation
 * Developed by FRC 2789 (Texplosion)
 *
 * Owns the Configure / Build / Export tab switching. Lazily boots
 * Blockly the first time the Build tab is opened and regenerates
 * the full-program preview when entering Export. Exposes
 * `switchView` on the BlocklyFRC namespace so the tab click
 * handlers wired up in boot.js can call it.
 * ================================================================ */

(function () {
    'use strict';

    function switchView(name) {
        BlocklyFRC.$$('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === name));
        BlocklyFRC.$$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));

        /* When entering builder, init Blockly if needed. */
        if (name === 'build') {
            if (!BlocklyFRC.workspace) {
                BlocklyFRC.initBlockly();
                BlocklyFRC.loadActiveContext();
            } else {
                /* Trigger resize so blocks render correctly. */
                setTimeout(() => Blockly.svgResize(BlocklyFRC.workspace), 50);
            }
        }
        if (name === 'export') {
            BlocklyFRC.regenerateAll();
        }
    }

    BlocklyFRC.register({switchView});
})();
