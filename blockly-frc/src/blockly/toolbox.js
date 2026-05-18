/* ================================================================
 * Blockly for FRC — application controller
 * Developed by FRC 2789 (Texplosion)
 * ================================================================ */

(function () {
    /* ----------------------------------------------------------------
     * Custom ToolboxCategory class
     *
     * Extends the built-in Blockly.ToolboxCategory to give the
     * category rows a colored left-edge accent + colored row
     * background when selected, matching our dark UI palette. This
     * follows the pattern shown in the official Blockly "Customizing
     * a Toolbox" codelab — we override the two styling hooks
     * (addColourBorder_ and setSelected) and register the subclass
     * against Blockly.ToolboxCategory.registrationName, replacing
     * the default.
     * -------------------------------------------------------------- */
    class FRCToolboxCategory extends Blockly.ToolboxCategory {
        addColourBorder_(colour) {
            /* Push the accent into a custom CSS variable so styles.css
             * can render the indicator stripe & icon hue. */
            this.rowDiv_.style.setProperty('--frc-cat-color', colour);
            this.rowDiv_.classList.add('frcToolboxCategory');
        }

        setSelected(isSelected) {
            const labelDom = this.rowDiv_.getElementsByClassName('blocklyToolboxCategoryLabel')[0];
            if (isSelected) {
                this.rowDiv_.classList.add('frcToolboxCategorySelected');
                if (labelDom) labelDom.style.color = '#0a0c10';
            } else {
                this.rowDiv_.classList.remove('frcToolboxCategorySelected');
                if (labelDom) labelDom.style.color = '';
            }
            Blockly.utils.aria.setState(this.htmlDiv_, Blockly.utils.aria.State.SELECTED, isSelected);
        }
    }

    /* Register our subclass as the default toolbox category. The
     * `true` final arg means we are overriding an existing
     * registration, not adding a new one. */
    Blockly.registry.register(Blockly.registry.Type.TOOLBOX_ITEM, Blockly.ToolboxCategory.registrationName, FRCToolboxCategory, /* opt_allowOverrides */ true);

    /* ----------------------------------------------------------------
     * Toolbox JSON
     *
     * Two of the categories ("Subsystem Commands", "Subsystem
     * Conditions") are dynamic — `custom: 'KEY'` tells Blockly to
     * call our registered callback (see registerDynamicCategories
     * below) every time the user opens that flyout. The callback
     * generates one block per subsystem method based on the live
     * configuration state. This is the same mechanism Blockly uses
     * for its built-in Variables and Procedures categories.
     * -------------------------------------------------------------- */
    /* Build the Actions parent category, with one sub-category per
     * subsystem (only those that actually have Command-returning
     * methods) plus a "Basic" sub-category covering the not-subsystem-
     * specific commands and the blank generic block. Sub-categories
     * keep each visible list short and let students drill down by
     * subsystem name. */
    function buildActionsCategory() {
        const subCats = [];
        subCats.push({
            kind: 'category',
            name: 'Basic',
            categorystyle: 'frc_commands_category',
            contents: [
                {kind: 'block', type: 'frc_wait_seconds'},
                {kind: 'block', type: 'frc_print'},
                {kind: 'block', type: 'frc_none'},
                {kind: 'label', text: '— or build your own —', 'web-class': 'frcEmptyFlyoutLabel'},
                {kind: 'block', type: 'frc_subsystem_command'}
            ]
        });
        for (const sub of BlocklyFRC.state.subsystems) {
            const cmds = sub.methods.filter(m => m.returnType === 'Command');
            if (!cmds.length) continue;
            subCats.push({
                kind: 'category',
                name: sub.name,
                categorystyle: 'frc_commands_category',
                contents: cmds.map(m => ({
                    kind: 'block',
                    type: 'frc_subsystem_command',
                    fields: {SUBSYSTEM: sub.id, METHOD: m.name}
                }))
            });
        }
        return {
            kind: 'category',
            name: 'Actions',
            categorystyle: 'frc_commands_category',
            contents: subCats
        };
    }

    /* Same idea for boolean-returning subsystem methods. */
    function buildConditionsCategory() {
        const subCats = [];
        subCats.push({
            kind: 'category',
            name: 'Basic',
            categorystyle: 'frc_conditions_category',
            contents: [
                {kind: 'block', type: 'frc_trigger_state'},
                {kind: 'label', text: '— or build your own —', 'web-class': 'frcEmptyFlyoutLabel'},
                {kind: 'block', type: 'frc_subsystem_boolean'}
            ]
        });
        for (const sub of BlocklyFRC.state.subsystems) {
            const bools = sub.methods.filter(m => m.returnType === 'Boolean');
            if (!bools.length) continue;
            subCats.push({
                kind: 'category',
                name: sub.name,
                categorystyle: 'frc_conditions_category',
                contents: bools.map(m => ({
                    kind: 'block',
                    type: 'frc_subsystem_boolean',
                    fields: {SUBSYSTEM: sub.id, METHOD: m.name}
                }))
            });
        }
        return {
            kind: 'category',
            name: 'Conditions',
            categorystyle: 'frc_conditions_category',
            contents: subCats
        };
    }

    function toolboxDefinition() {
        return {
            kind: 'categoryToolbox', contents: [{
                kind: 'category',
                name: 'Bindings',
                categorystyle: 'frc_composition_category',
                contents: [{kind: 'block', type: 'frc_controller_binding'}]
            }, {
                kind: 'category',
                name: 'Combine actions',
                categorystyle: 'frc_composition_category',
                contents: [{kind: 'block', type: 'frc_sequence'}, {kind: 'block', type: 'frc_parallel'}]
            },
                buildActionsCategory(),
                {
                    kind: 'category',
                    name: 'Modifiers',
                    categorystyle: 'frc_decorators_category',
                    contents: [{kind: 'block', type: 'frc_with_timeout'}, {
                        kind: 'block',
                        type: 'frc_until'
                    }, {kind: 'block', type: 'frc_only_while'}, {kind: 'block', type: 'frc_repeat'}, {
                        kind: 'block',
                        type: 'frc_either'
                    }]
                },
                buildConditionsCategory(),
                /* Everything below is hidden behind a single Advanced category
                 * so the day-one toolbox stays focused. Adding the nested "My
                 * routines" sub-category here keeps the dynamic flyout
                 * available without making it a top-level destination. */
                {
                    kind: 'category', name: 'Advanced', categorystyle: 'frc_decorators_category', contents: [{
                        kind: 'category',
                        name: 'My routines',
                        categorystyle: 'frc_functions_category',
                        custom: 'FRC_COMMAND_FUNCTIONS'
                    }, {kind: 'label', text: 'Combine actions', 'web-class': 'frcEmptyFlyoutLabel'}, {
                        kind: 'block',
                        type: 'frc_race'
                    }, {kind: 'block', type: 'frc_deadline'}, {
                        kind: 'label',
                        text: 'Basic actions',
                        'web-class': 'frcEmptyFlyoutLabel'
                    }, {kind: 'block', type: 'frc_runonce'}, {kind: 'block', type: 'frc_run'}, {
                        kind: 'block',
                        type: 'frc_wait_until'
                    }, {kind: 'label', text: 'Modifiers', 'web-class': 'frcEmptyFlyoutLabel'}, {
                        kind: 'block',
                        type: 'frc_unless'
                    }, {kind: 'block', type: 'frc_as_proxy'}, {
                        kind: 'label',
                        text: 'Conditions',
                        'web-class': 'frcEmptyFlyoutLabel'
                    }, {kind: 'block', type: 'frc_bool_not'}, {kind: 'block', type: 'frc_bool_combine'}, {
                        kind: 'block',
                        type: 'frc_bool_literal'
                    }]
                }]
        };
    }

    /* ----------------------------------------------------------------
     * Dynamic toolbox callbacks
     *
     * Actions / Conditions are no longer flat dynamic flyouts —
     * they're structural categories with one sub-category per
     * subsystem, rebuilt via rebuildToolbox() whenever the subsystem
     * set changes. The only remaining dynamic flyout is My routines,
     * because routines are appended to over a working session and
     * a live flyout is the right idiom there.
     * -------------------------------------------------------------- */

    /* Command functions flyout — one pre-populated frc_command_function
     * block per defined function. Hides the currently-edited function to
     * prevent direct self-reference in the block canvas. */
    function commandFunctionsFlyout(_workspace) {
        const blocks = [];
        for (const fn of BlocklyFRC.state.commandFunctions) {
            /* Hide the function currently open in the editor so users can't
             * accidentally build a direct infinite-loop call. */
            if (BlocklyFRC.state.editMode === 'function' && fn.id === BlocklyFRC.state.activeFunctionId) continue;
            blocks.push({
                kind: 'block', type: 'frc_command_function', fields: {FUNCTION: fn.id}
            });
        }
        if (blocks.length === 0) {
            blocks.push({
                kind: 'label', text: 'Create functions via Build → New Function', 'web-class': 'frcEmptyFlyoutLabel'
            });
        }
        return blocks;
    }

    function registerDynamicCategories(workspace) {
        if (!workspace) return;
        workspace.registerToolboxCategoryCallback('FRC_COMMAND_FUNCTIONS', commandFunctionsFlyout);
    }

    BlocklyFRC.register({toolboxDefinition, registerDynamicCategories});
})();