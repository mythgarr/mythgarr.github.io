/* ================================================================
 * Blockly for FRC — application controller
 * Developed by FRC 2789 (Texplosion)
 * ================================================================ */

(function () {
    'use strict';
    /* ----------------------------------------------------------------
     * EXPOSED HELPERS used by custom_blocks.js / java_generator.js
     * -------------------------------------------------------------- */
    /* Command-function helpers — used by custom_blocks.js and java_generator.js. */
    function getCommandFunctionOptions() {
        const state = BlocklyFRC.state;
        if (!state.commandFunctions.length) return [['(no functions)', 'NONE']];
        return state.commandFunctions.map(f => [f.name, f.id]);
    }

    function getCommandFunctionName(id) {
        const state = BlocklyFRC.state;
        const fn = state.commandFunctions.find(f => f.id === id);
        return fn ? fn.name : null;
    }

    BlocklyFRC.register({getCommandFunctionOptions, getCommandFunctionName});
})();