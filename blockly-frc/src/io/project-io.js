/* ================================================================
 * Blockly for FRC — application controller
 * Developed by FRC 2789 (Texplosion)
 * ================================================================ */

(function () {
    'use strict';

    /* ---- import / export project ---- */
    function exportProject() {
        BlocklyFRC.persist();
        const blob = new Blob([JSON.stringify(BlocklyFRC.state, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `blockly-frc-${BlocklyFRC.pascal(BlocklyFRC.state.project.className)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        BlocklyFRC.toast('Project saved.');
    }

    function importProject() {
        BlocklyFRC.$('#file-input').click();
    }

    function handleFileImport(file) {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const loaded = JSON.parse(e.target.result);
                Object.assign(BlocklyFRC.state, loaded);
                BlocklyFRC.persist();
                BlocklyFRC.renderSubsystems();
                BlocklyFRC.renderControllers();
                BlocklyFRC.renderControllerTabs();
                BlocklyFRC.renderFunctionTabs();
                BlocklyFRC.$('#cfg-package').value = BlocklyFRC.state.project.packageName;
                BlocklyFRC.$('#cfg-classname').value = BlocklyFRC.state.project.className;
                BlocklyFRC.$('#cfg-team').value = BlocklyFRC.state.project.teamNumber || '';
                if (BlocklyFRC.workspace) {
                    BlocklyFRC.loadActiveContext();
                    BlocklyFRC.rebuildToolbox();
                }
                BlocklyFRC.regenerateAll();
                BlocklyFRC.toast('Project loaded.');
            } catch (err) {
                BlocklyFRC.toast('Could not parse that file.', 'error');
                console.error(err);
            }
        };
        reader.readAsText(file);
    }

    /* ---- copy / download ---- */
    function copyFullCode() {
        const text = BlocklyFRC.generateFullJava();
        navigator.clipboard.writeText(text).then(() => BlocklyFRC.toast('Java copied to clipboard.'), () => BlocklyFRC.toast('Copy failed — your browser blocked it.', 'error'));
    }

    function downloadFullCode() {
        const text = BlocklyFRC.generateFullJava();
        const blob = new Blob([text], {type: 'text/x-java-source'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = BlocklyFRC.pascal(BlocklyFRC.state.project.className) + '.java';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    BlocklyFRC.register({exportProject, importProject, handleFileImport, copyFullCode, downloadFullCode});
})();
