/* ================================================================
 * Blockly for FRC — application controller
 * Developed by FRC 2789 (Texplosion)
 * ================================================================ */

(function () {
    'use strict';

    const BUTTON_MAP = {
        a: 'aButton',
        b: 'bButton',
        x: 'xButton',
        y: 'yButton',
        leftBumper: 'leftBumper',
        rightBumper: 'rightBumper',
        leftTrigger: 'leftTrigger',
        rightTrigger: 'rightTrigger',
        back: 'backButton',
        start: 'startButton',
        leftStick: 'leftStickClick',
        rightStick: 'rightStickClick',
        povUp: 'dpadUp',
        povRight: 'dpadRight',
        povDown: 'dpadDown',
        povLeft: 'dpadLeft'
    };

    const EDGE_PREFIX = {
        onTrue: '',
        whileTrue: '(Hold) ',
        onFalse: '(Release) ',
        toggleOnTrue: '(Toggle) ',
        whileFalse: '(While Released) '
    };

    /* Builds a PadCrafter URL from binding blocks across all controller
     * workspaces. Each controller becomes a separate template/profile. */
    function generatePadCrafterUrl(allBindingData) {
        const state = BlocklyFRC.state;
        if (!state || !state.controllers.length) return null;

        const ctrlCount = state.controllers.length;
        const buttonActions = {};
        for (const {ctrl, lines} of allBindingData) {
            const ctrlIndex = state.controllers.indexOf(ctrl);
            for (const {name, button, edge} of lines) {
                const padParam = BUTTON_MAP[button];
                if (!padParam) continue;
                const label = (EDGE_PREFIX[edge] ?? '') + name;
                if (!buttonActions[padParam]) buttonActions[padParam] = Array(ctrlCount).fill('');
                const cur = buttonActions[padParam][ctrlIndex];
                buttonActions[padParam][ctrlIndex] = cur ? cur + ', ' + label : label;
            }
        }

        const hasAny = Object.values(buttonActions).some(arr => arr.some(v => v));
        if (!hasAny) return null;

        const params = new URLSearchParams();
        params.set('templates', state.controllers.map(c => c.name).join('|'));
        for (const [padParam, actions] of Object.entries(buttonActions)) {
            const value = actions.join('|').replace(/\|+$/, '');
            if (value) params.set(padParam, value);
        }
        params.set('timestamp', Date.now().toString());
        return 'https://www.padcrafter.com/index.php?' + params.toString();
    }

    BlocklyFRC.register({generatePadCrafterUrl});
})();