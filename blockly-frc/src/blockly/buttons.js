/* ================================================================
 * Blockly for FRC — application controller
 * Developed by FRC 2789 (Texplosion)
 * ================================================================ */

(function () {
    'use strict';

    /* Image-dropdown options for the controller-button picker. The value
     * (second element of each pair) is the Java method name on
     * CommandXboxController; the first element is an image spec that
     * Blockly renders inline. `alt` is used as the display text wherever
     * an image can't be shown (e.g. when the field is serialized to text,
     * or via FieldDropdown.getText() for auto-generated binding names). */
    const BUTTON_IMG_SIZE = 28;

    function buttonImage(file, alt) {
        return {src: 'images/xbox/' + file, width: BUTTON_IMG_SIZE, height: BUTTON_IMG_SIZE, alt: alt};
    }

    function getButtonOptions() {
        /* Standard CommandXboxController triggers, with XboxSeriesX glyphs. */
        return [[buttonImage('XboxSeriesX_A.png', 'A button'), 'a'], [buttonImage('XboxSeriesX_B.png', 'B button'), 'b'], [buttonImage('XboxSeriesX_X.png', 'X button'), 'x'], [buttonImage('XboxSeriesX_Y.png', 'Y button'), 'y'], [buttonImage('XboxSeriesX_LB.png', 'left bumper'), 'leftBumper'], [buttonImage('XboxSeriesX_RB.png', 'right bumper'), 'rightBumper'], [buttonImage('XboxSeriesX_LT.png', 'left trigger'), 'leftTrigger'], [buttonImage('XboxSeriesX_RT.png', 'right trigger'), 'rightTrigger'], [buttonImage('XboxSeriesX_View.png', 'back button'), 'back'], [buttonImage('XboxSeriesX_Menu.png', 'start button'), 'start'], [buttonImage('XboxSeriesX_Left_Stick_Click.png', 'left stick'), 'leftStick'], [buttonImage('XboxSeriesX_Right_Stick_Click.png', 'right stick'), 'rightStick'], [buttonImage('XboxSeriesX_Dpad_Up.png', 'POV up'), 'povUp'], [buttonImage('XboxSeriesX_Dpad_Right.png', 'POV right'), 'povRight'], [buttonImage('XboxSeriesX_Dpad_Down.png', 'POV down'), 'povDown'], [buttonImage('XboxSeriesX_Dpad_Left.png', 'POV left'), 'povLeft']];
    }

    BlocklyFRC.register({getButtonOptions});
})();