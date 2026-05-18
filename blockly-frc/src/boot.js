/* ================================================================
 * Blockly for FRC — application controller
 * Developed by FRC 2789 (Texplosion)
 * ================================================================ */

(function () {
    'use strict';

    /* ================================================================
     * BOOT
     * ================================================================ */
    function boot() {
        if (!BlocklyFRC.restore()) seedDefaults();
        const state = BlocklyFRC.state;

        /* tabs */
        BlocklyFRC.$$('.tab').forEach(t => t.addEventListener('click', () => BlocklyFRC.switchView(t.dataset.view)));

        /* config view */
        BlocklyFRC.$('#add-subsystem').addEventListener('click', () => {
            const n = state.subsystems.length + 1;
            state.subsystems.push({
                id: BlocklyFRC.uid(), name: `Subsystem${n}`, methods: [{id: BlocklyFRC.uid(), name: 'doThing', returnType: 'Command'}]
            });
            BlocklyFRC.persist();
            BlocklyFRC.renderSubsystems();
            BlocklyFRC.rebuildToolbox();
        });

        BlocklyFRC.$('#add-controller').addEventListener('click', () => {
            const usedPorts = new Set(state.controllers.map(c => c.port));
            let port = 0;
            while (usedPorts.has(port) && port < 6) port++;
            const newCtrl = {
                id: BlocklyFRC.uid(),
                name: `controller${state.controllers.length + 1}`,
                port,
                type: 'CommandXboxController',
                blocklyXml: null
            };
            state.controllers.push(newCtrl);
            /* Auto-select the new controller if nothing is active. */
            if (!state.activeControllerId) state.activeControllerId = newCtrl.id;
            BlocklyFRC.persist();
            BlocklyFRC.renderControllers();
            BlocklyFRC.renderControllerTabs();
        });

        BlocklyFRC.$('#cfg-package').value = state.project.packageName;
        BlocklyFRC.$('#cfg-classname').value = state.project.className;
        BlocklyFRC.$('#cfg-team').value = state.project.teamNumber || '';

        BlocklyFRC.$('#cfg-package').addEventListener('input', e => {
            state.project.packageName = e.target.value;
            BlocklyFRC.persist();
            BlocklyFRC.regenerateAll();
        });
        BlocklyFRC.$('#cfg-classname').addEventListener('input', e => {
            state.project.className = e.target.value;
            BlocklyFRC.persist();
            BlocklyFRC.regenerateAll();
        });
        BlocklyFRC.$('#cfg-team').addEventListener('input', e => {
            state.project.teamNumber = e.target.value;
            BlocklyFRC.persist();
        });

        /* builder view */
        BlocklyFRC.$('#add-function').addEventListener('click', () => {
            if (!BlocklyFRC.workspace) {
                BlocklyFRC.switchView('build');
            }
            BlocklyFRC.newCommandFunction();
        });
        BlocklyFRC.$('#btn-clear-blocks').addEventListener('click', () => {
            if (!BlocklyFRC.workspace) return;
            const label = state.editMode === 'function' ? 'function' : 'controller canvas';
            BlocklyFRC.confirmModal('Clear canvas', `Remove all blocks from this ${label}?`, () => {
                BlocklyFRC.workspace.clear();
                if (state.editMode === 'function') BlocklyFRC.seedRootBlock(); else BlocklyFRC.seedBindingBlock();
                BlocklyFRC.regenerateAll();
                BlocklyFRC.persist();
            });
        });
        BlocklyFRC.$('#btn-preview').addEventListener('click', () => BlocklyFRC.switchView('export'));

        /* export view */
        BlocklyFRC.$('#btn-copy-code').addEventListener('click', BlocklyFRC.copyFullCode);
        BlocklyFRC.$('#btn-download-code').addEventListener('click', BlocklyFRC.downloadFullCode);

        /* topbar */
        BlocklyFRC.$('#btn-export-json').addEventListener('click', BlocklyFRC.exportProject);
        BlocklyFRC.$('#btn-import').addEventListener('click', BlocklyFRC.importProject);
        BlocklyFRC.$('#file-input').addEventListener('change', e => {
            if (e.target.files[0]) BlocklyFRC.handleFileImport(e.target.files[0]);
            e.target.value = '';
        });

        /* modal backdrop click */
        BlocklyFRC.$('#modal-backdrop').addEventListener('click', e => {
            if (e.target === BlocklyFRC.$('#modal-backdrop')) BlocklyFRC.closeModal();
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') BlocklyFRC.closeModal();
        });

        /* Ensure active controller is valid after restore. */
        if (!state.controllers.find(c => c.id === state.activeControllerId)) {
            state.activeControllerId = state.controllers[0]?.id ?? null;
        }

        /* initial render */
        BlocklyFRC.renderSubsystems();
        BlocklyFRC.renderControllers();
        BlocklyFRC.renderControllerTabs();
        BlocklyFRC.renderFunctionTabs();
        BlocklyFRC.regenerateAll();
    }

    /* expose helpers for blocks/generator modules */
    BlocklyFRC.register({
        boot
    });
})();

/* boot once everything is loaded */
window.addEventListener('DOMContentLoaded', BlocklyFRC.boot);
