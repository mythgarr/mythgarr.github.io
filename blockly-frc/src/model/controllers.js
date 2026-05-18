/* ================================================================
 * Blockly for FRC — application controller
 * Developed by FRC 2789 (Texplosion)
 * ================================================================ */

(function () {
    'use strict';

    function getControllerOptions() {
        const state = BlocklyFRC.state;
        if (!state || !state.controllers.length) return [['(no controllers)', 'NONE']];
        return state.controllers.map(c => [c.name, c.id]);
    }

    function getControllerFieldName(controllerId) {
        const state = BlocklyFRC.state;
        if (!state) return null;
        const ctrl = state.controllers.find(c => c.id === controllerId);
        if (!ctrl) return null;
        return 'm_' + BlocklyFRC.camel(ctrl.name);
    }

    BlocklyFRC.register({getControllerOptions, getControllerFieldName});
})();
