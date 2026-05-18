/* ================================================================
 * Blockly for FRC — application controller
 * Developed by FRC 2789 (Texplosion)
 * ================================================================ */

/* ================================================================
 * Blockly for FRC — namespace bootstrap
 *
 * Loaded first. Creates the BlocklyFRC global so every other module
 * (util, buttons, custom_blocks, java_generator, app, …) can attach
 * to a shared object without worrying about script load order or
 * who got there first.
 *
 * Modules should attach via:
 *
 *   BlocklyFRC.register('util', { uid, $, $$, ... });
 *   // or, for top-level functions:
 *   BlocklyFRC.register({ getButtonOptions });
 *
 * register() refuses to overwrite an existing key — that turns
 * accidental name clashes between modules into a loud console
 * error instead of a silent overwrite.
 * ================================================================ */
(function () {
    'use strict';

    const NS = (window.BlocklyFRC = window.BlocklyFRC || {});

    /* Attach properties to the namespace, optionally under a sub-key.
     *   register('util', { uid, ... })  → BlocklyFRC.util.uid
     *   register({ getButtonOptions })   → BlocklyFRC.getButtonOptions
     */
    NS.register = function (keyOrObj, maybeObj) {
        const target =
            typeof keyOrObj === 'string'
                ? (NS[keyOrObj] = NS[keyOrObj] || {})
                : NS;
        const props = typeof keyOrObj === 'string' ? maybeObj : keyOrObj;
        for (const [k, v] of Object.entries(props)) {
            if (k in target && target[k] !== v) {
                console.warn(`[BlocklyFRC] duplicate registration for "${k}"`);
            }
            target[k] = v;
        }
        return target;
    };
})();