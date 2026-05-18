/* ================================================================
 * Blockly for FRC — application controller
 * Developed by FRC 2789 (Texplosion)
 * ================================================================ */

(function () {
    'use strict';

    /* ----------------------------------------------------------------
     * STATE
     * Single source of truth for the entire app. Persisted to
     * localStorage on every change so reloads are non-destructive.
     * -------------------------------------------------------------- */
    const state = {
        project: {
            packageName: 'frc.robot', className: 'Commands', teamNumber: ''
        }, /* Each subsystem has a stable id; the user-visible name doubles
             * as the Java class identifier. Methods are just metadata until
             * code generation time. */
        subsystems: [],        // { id, name, methods: [{id, name, returnType: 'Command'|'Boolean'}] }
        /* Controllers each own a full Blockly workspace. All bindings for
         * that controller live as frc_controller_binding blocks on its canvas. */
        controllers: [],       // { id, name, port, type, blocklyXml }
        commandFunctions: [],  // { id, name, blocklyXml } — generate public Command methods
        activeControllerId: null, activeFunctionId: null, editMode: 'binding'    // 'binding' | 'function'
    };

    const STORAGE_KEY = 'blockly-frc.v1';

    /* ----------------------------------------------------------------
     * Default seed — gives a new user something tangible to play with.
     * -------------------------------------------------------------- */
    function seedDefaults() {
        const state = BlocklyFRC.state;
        state.subsystems = [{
            id: BlocklyFRC.uid(),
            name: 'Drivetrain',
            methods: [{id: BlocklyFRC.uid(), name: 'driveForward', returnType: 'Command'}, {
                id: BlocklyFRC.uid(),
                name: 'stop',
                returnType: 'Command'
            }, {id: BlocklyFRC.uid(), name: 'isStopped', returnType: 'Boolean'}]
        }, {
            id: BlocklyFRC.uid(),
            name: 'Arm',
            methods: [{id: BlocklyFRC.uid(), name: 'raiseToScore', returnType: 'Command'}, {
                id: BlocklyFRC.uid(),
                name: 'lowerToIntake',
                returnType: 'Command'
            }, {id: BlocklyFRC.uid(), name: 'holdPosition', returnType: 'Command'}, {
                id: BlocklyFRC.uid(),
                name: 'isAtTop',
                returnType: 'Boolean'
            }]
        }, {
            id: BlocklyFRC.uid(),
            name: 'Intake',
            methods: [{id: BlocklyFRC.uid(), name: 'intake', returnType: 'Command'}, {
                id: BlocklyFRC.uid(),
                name: 'eject',
                returnType: 'Command'
            }, {id: BlocklyFRC.uid(), name: 'hasGamePiece', returnType: 'Boolean'}]
        }];
        state.controllers = [{
            id: BlocklyFRC.uid(),
            name: 'driver',
            port: 0,
            type: 'CommandXboxController',
            blocklyXml: null
        }, {id: BlocklyFRC.uid(), name: 'operator', port: 1, type: 'CommandXboxController', blocklyXml: null}];
        state.commandFunctions = [];
        state.activeControllerId = state.controllers[0].id;
        state.activeFunctionId = null;
        state.editMode = 'binding';
    }

    function persist() {
        BlocklyFRC.saveCurrentContext();
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) { /* quota exceeded — non-fatal */
        }
    }

    function restore() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return false;
            const loaded = JSON.parse(raw);
            /* ── Migrations ─────────────────────────────────────────────── */
            if (!Array.isArray(loaded.commandFunctions)) loaded.commandFunctions = [];
            if (!loaded.editMode) loaded.editMode = 'binding';
            if (!('activeFunctionId' in loaded)) loaded.activeFunctionId = null;
            /* v2: bindings moved from a top-level array into controller.blocklyXml.
             * Old saves have `bindings` array and no `activeControllerId`. Drop the
             * old binding list; the user will recreate them as blocks on the canvas. */
            if (!('activeControllerId' in loaded)) {
                loaded.activeControllerId = loaded.controllers?.[0]?.id ?? null;
                delete loaded.bindings;
                delete loaded.activeBindingId;
            }
            /* Ensure every controller has a blocklyXml field. */
            if (Array.isArray(loaded.controllers)) {
                for (const c of loaded.controllers) {
                    if (!('blocklyXml' in c)) c.blocklyXml = null;
                }
            }
            Object.assign(state, loaded);
            return true;
        } catch (e) {
            return false;
        }
    }

    BlocklyFRC.register({state, seedDefaults, persist, restore});
})();
