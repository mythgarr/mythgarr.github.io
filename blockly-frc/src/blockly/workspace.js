/* ================================================================
 * Blockly for FRC — application controller
 * Developed by FRC 2789 (Texplosion)
 * ================================================================ */

(function () {
    'use strict';

    /* ================================================================
     * BLOCKLY WORKSPACE
     * ================================================================ */
    let workspace = null;

    /* Load whatever is currently active (a controller canvas or a command
     * function) into the shared Blockly workspace. */
    function loadActiveContext() {
        if (!workspace) return;
        workspace.clear();

        const state = BlocklyFRC.state;
        let xmlToLoad = null;
        if (state.editMode === 'function' && state.activeFunctionId) {
            const fn = state.commandFunctions.find(f => f.id === state.activeFunctionId);
            xmlToLoad = fn ? fn.blocklyXml : null;
        } else if (state.activeControllerId) {
            const ctrl = state.controllers.find(c => c.id === state.activeControllerId);
            xmlToLoad = ctrl ? ctrl.blocklyXml : null;
        }

        if (xmlToLoad) {
            try {
                const dom = Blockly.utils.xml.textToDom(xmlToLoad);
                Blockly.Xml.domToWorkspace(dom, workspace);
                return;
            } catch (e) {
                console.warn('Failed to load context XML; starting fresh.', e);
            }
        }
        /* No saved blocks → seed an appropriate starter block. */
        if (state.editMode === 'function') {
            seedRootBlock();      // frc_binding_root for command functions
        } else {
            seedBindingBlock();   // one frc_controller_binding for controller canvases
        }
    }

    function initBlockly() {
        workspace = Blockly.inject('blockly-area', {
            toolbox: BlocklyFRC.toolboxDefinition(), theme: BlocklyFRC.blocklyTheme(), grid: {
                spacing: 24, length: 1, colour: '#1a1f2c', snap: true
            }, zoom: {
                controls: true, wheel: true, startScale: 0.95, maxScale: 2, minScale: 0.4, scaleSpeed: 1.1
            }, trashcan: true, renderer: 'thrasos', sounds: false
        });

        BlocklyFRC.registerDynamicCategories(workspace);
        workspace.addChangeListener(onWorkspaceChange);
    }

    function onWorkspaceChange(e) {
        if (e.isUiEvent) return;
        if (e.type === Blockly.Events.FINISHED_LOADING) return;
        /* Save & regenerate on each meaningful change. */
        BlocklyFRC.persist();
        BlocklyFRC.regenerateAll();
    }

    /* Rebuild the toolbox structure from current state. Called whenever
     * subsystems or methods are added/removed/renamed/retyped, because
     * the Actions / Conditions categories are now structural — they
     * have one sub-category per subsystem rather than a single dynamic
     * flyout. updateToolbox preserves the user's selected category
     * when possible. */
    function rebuildToolbox() {
        if (!workspace) return;
        if (typeof workspace.updateToolbox === 'function') {
            try {
                workspace.updateToolbox(BlocklyFRC.toolboxDefinition());
                return;
            } catch (e) {
                console.warn('updateToolbox failed; falling back to refreshSelection', e);
            }
        }
        const toolbox = workspace.getToolbox();
        if (toolbox && typeof toolbox.refreshSelection === 'function') {
            toolbox.refreshSelection();
        }
    }

    /* Snapshot the live workspace XML into whichever object is currently
     * being edited (a controller canvas or a command function). */
    function saveCurrentContext() {
        const state = BlocklyFRC.state;
        if (!workspace) return;
        if (!state) return;
        try {
            const xml = Blockly.Xml.workspaceToDom(workspace);
            const xmlStr = Blockly.Xml.domToText(xml);
            if (state.editMode === 'function' && state.activeFunctionId) {
                const fn = state.commandFunctions.find(f => f.id === state.activeFunctionId);
                if (fn) fn.blocklyXml = xmlStr;
            } else if (state.activeControllerId) {
                const ctrl = state.controllers.find(c => c.id === state.activeControllerId);
                if (ctrl) ctrl.blocklyXml = xmlStr;
            }
        } catch (e) { /* ignore during early init */
        }
    }

    /* Seed the function-root block used in command function workspaces. */
    function seedRootBlock() {
        const root = workspace.newBlock('frc_binding_root');
        root.initSvg();
        root.render();
        root.moveBy(40, 40);
    }

    /* Seed a single binding block on a fresh controller canvas. */
    function seedBindingBlock() {
        const b = workspace.newBlock('frc_controller_binding');
        b.initSvg();
        b.render();
        b.moveBy(40, 40);
    }

    Object.defineProperty(BlocklyFRC, 'workspace', {
        get: function() {
            return workspace;
        }
    });
    BlocklyFRC.register({initBlockly, loadActiveContext, rebuildToolbox, saveCurrentContext, seedRootBlock, seedBindingBlock});
})();