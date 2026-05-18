/* ================================================================
 * Blockly for FRC — Export view
 * Developed by FRC 2789 (Texplosion)
 *
 * Regenerates the Java preview shown in the builder sidebar and the
 * full Java output on the Export tab. Exposes `regenerateAll` on the
 * BlocklyFRC namespace so the rest of the app can trigger a refresh.
 * ================================================================ */

(function () {
    'use strict';

    /* ================================================================
     * CODE GENERATION & PREVIEW
     * ================================================================ */
    function regenerateAll() {
        const preview = BlocklyFRC.$('#binding-preview-code');
        const state = BlocklyFRC.state;
        if (!state) return;
        if (state.editMode === 'function' && BlocklyFRC.workspace) {
            /* Show the function's command expression. */
            const expr = BlocklyFRC.generateJavaExpression(BlocklyFRC.workspace);
            if (expr) {
                preview.classList.add('hljs');
                preview.innerHTML = BlocklyFRC.highlightJava(expr);
            } else {
                preview.classList.remove('hljs');
                preview.textContent = '// Compose a command to see the generated Java.';
            }
        } else if (BlocklyFRC.workspace && state.activeControllerId) {
            /* Show all binding lines for the active controller. */
            const ctrl = state.controllers.find(c => c.id === state.activeControllerId);
            if (ctrl) {
                const lines = BlocklyFRC.generateControllerBindingLines(BlocklyFRC.workspace);
                const ctrlName = BlocklyFRC.camel(ctrl.name);
                const formatted = lines.map(({
                                                 name,
                                                 button,
                                                 edge,
                                                 expr
                                             }) => `// ${name}\nm_${ctrlName}.${button}().${edge}(\n    ${expr}\n);`);
                const previewText = formatted.join('\n\n');
                if (previewText) {
                    preview.classList.add('hljs');
                    preview.innerHTML = BlocklyFRC.highlightJava(previewText);
                } else {
                    preview.classList.remove('hljs');
                    preview.textContent = '// Drag binding blocks onto the canvas to compose commands.';
                }
            }
        } else {
            preview.classList.remove('hljs');
            preview.textContent = '// Select a controller or function to start.';
        }

        /* Update the export view. */
        const full = BlocklyFRC.generateFullJava();
        const fullEl = BlocklyFRC.$('#full-code-output');
        fullEl.classList.add('hljs');
        fullEl.innerHTML = BlocklyFRC.highlightJava(full);
    }

    /* Expose the entry point other modules call. */
    BlocklyFRC.register({regenerateAll});
})();
