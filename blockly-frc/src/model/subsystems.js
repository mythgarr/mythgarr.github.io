/* ================================================================
 * Blockly for FRC — application controller
 * Developed by FRC 2789 (Texplosion)
 * ================================================================ */

(function () {
    'use strict';

    function getSubsystemOptions() {
        const state = BlocklyFRC.state;
        if (!state) return [['(no subsystems)', 'NONE']];
        if (!state.subsystems.length) return [['(no subsystems)', 'NONE']];
        return state.subsystems.map(s => [s.name, s.id]);
    }

    function getMethodOptions(subsystemId, returnType) {
        const state = BlocklyFRC.state;
        if (!state) return [['(none)', 'NONE']];
        const sub = state.subsystems.find(s => s.id === subsystemId);
        if (!sub) return [['(none)', 'NONE']];
        const methods = sub.methods.filter(m => m.returnType === returnType);
        if (!methods.length) return [['(no ' + returnType.toLowerCase() + ' methods)', 'NONE']];
        return methods.map(m => [m.name, m.name]);
    }

    function getSubsystemFieldName(subsystemId) {
        const state = BlocklyFRC.state;
        const sub = state.subsystems.find(s => s.id === subsystemId);
        if (!sub) return null;
        return 'm_' + BlocklyFRC.camel(sub.name);
    }

    BlocklyFRC.register({getSubsystemOptions, getMethodOptions, getSubsystemFieldName});
})();
