/* ================================================================
 * Blockly for FRC — application controller
 * Developed by FRC 2789 (Texplosion)
 * ================================================================ */

(function () {
    'use strict';

    /* ----------------------------------------------------------------
     * Theme
     *
     * Block colors are defined here as block-styles. Block JSON
     * definitions reference these by name via "style": "frc_..._blocks".
     * Category colors are defined the same way and referenced from the
     * toolbox JSON via "categorystyle": "frc_..._category".
     * -------------------------------------------------------------- */
    function blocklyTheme() {
        const blockStyles = {
            frc_trigger_blocks: {colourPrimary: '#c9882e', colourSecondary: '#a86e24', colourTertiary: '#82541b'},
            frc_sequence_blocks: {colourPrimary: '#4570c0', colourSecondary: '#37599c', colourTertiary: '#2b4679'},
            frc_parallel_blocks: {colourPrimary: '#7850b5', colourSecondary: '#5e3f92', colourTertiary: '#473070'},
            frc_race_blocks: {colourPrimary: '#bf6450', colourSecondary: '#9e4f3e', colourTertiary: '#7a3c2e'},
            frc_deadline_blocks: {colourPrimary: '#a86e25', colourSecondary: '#87571d', colourTertiary: '#664115'},
            frc_command_blocks: {colourPrimary: '#27a692', colourSecondary: '#1f8574', colourTertiary: '#156356'},
            frc_decorator_blocks: {colourPrimary: '#8460cc', colourSecondary: '#6849a6', colourTertiary: '#4e3680'},
            frc_condition_blocks: {colourPrimary: '#4d84d4', colourSecondary: '#3b6aaa', colourTertiary: '#2c5082'},
            frc_boolean_blocks: {colourPrimary: '#459857', colourSecondary: '#367a45', colourTertiary: '#275c34'}
        };
        return Blockly.Theme.defineTheme('blockly-frc', {
            base: Blockly.Themes.Classic, blockStyles: blockStyles, categoryStyles: {
                frc_composition_category: {colour: blockStyles.frc_sequence_blocks.colourPrimary},
                frc_commands_category: {colour: blockStyles.frc_command_blocks.colourPrimary},
                frc_decorators_category: {colour: blockStyles.frc_decorator_blocks.colourPrimary},
                frc_conditions_category: {colour: blockStyles.frc_condition_blocks.colourPrimary},
                frc_functions_category: {colour: blockStyles.frc_command_blocks.colourPrimary}
            }, componentStyles: {
                workspaceBackgroundColour: '#0a0c10',
                toolboxBackgroundColour: '#0f1218',
                toolboxForegroundColour: '#98a2b8',
                flyoutBackgroundColour: '#151921',
                flyoutForegroundColour: '#cbd5e1',
                flyoutOpacity: 1,
                scrollbarColour: '#2e3548',
                insertionMarkerColour: blockStyles.frc_command_blocks.colourPrimary,
                insertionMarkerOpacity: 0.4,
                scrollbarOpacity: 0.6,
                cursorColour: blockStyles.frc_command_blocks.colourPrimary,
                selectedGlowColour: blockStyles.frc_command_blocks.colourPrimary,
                selectedGlowOpacity: 0.4
            }, fontStyle: {
                family: 'JetBrains Mono, monospace', weight: '500', size: 12
            }
        });
    }

    BlocklyFRC.register({blocklyTheme});
})();