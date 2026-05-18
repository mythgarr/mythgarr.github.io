/* ================================================================
 * Blockly for FRC — custom block definitions
 *
 * Uses Blockly's standard extension model:
 *   • Block definitions are JSON, registered via
 *     Blockly.common.defineBlocksWithJsonArray.
 *   • Cross-cutting behavior (the subsystem→method dropdown sync,
 *     the trigger root's no-delete/no-move flags) is registered as
 *     Extensions via Blockly.Extensions.register.
 *   • Colors come from theme block-styles (defined in boot.js's
 *     theme), referenced from each block's "style" property — the
 *     blocks themselves never call setColour.
 *
 * Block taxonomy:
 *   1. Trigger / Root           — top of every binding
 *   2. Composition              — sequence, parallel, race, deadline
 *   3. Leaf commands            — subsystem suppliers, runOnce/run,
 *                                 waitSeconds, waitUntil, print, none
 *   4. Decorators               — withTimeout, until, unless,
 *                                 onlyWhile, asProxy, repeatedly
 *   5. Conditional execution    — either
 *   6. Boolean inputs           — subsystem suppliers, literals,
 *                                 not, and/or, controller-state
 * ================================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------------
   * Extensions
   * Blockly.Extensions.register(name, fn) — fn runs as `this`==block
   * during init, after the JSON has been applied. Referenced from
   * the JSON definition's "extensions" array.
   * -------------------------------------------------------------- */

  /* The trigger root is special: it can't be deleted or moved. */
  Blockly.Extensions.register('frc_root_lock', function () {
    this.setDeletable(false);
    this.setMovable(false);
  });

  /* Generic helper — given a SUBSYSTEM and METHOD field pair, this
   * builds dynamic dropdowns and keeps METHOD valid when SUBSYSTEM
   * changes. The returnType parameter selects which methods to show. */
  function makeSubsystemMethodSync(returnType) {
    return function () {
      const block = this;

      const subInput = block.getInput('ROW');
      if (!subInput) return;

      const subDropdown = new Blockly.FieldDropdown(
        () => BlocklyFRC.getSubsystemOptions()
      );
      const methodDropdown = new Blockly.FieldDropdown(
        () => BlocklyFRC.getMethodOptions(
          block.getFieldValue('SUBSYSTEM'), returnType
        )
      );

      /* Build the row contents. JSON declared the input as empty; we
       * populate it here because dynamic-options dropdowns can't be
       * declared in JSON. */
      subInput.appendField(subDropdown, 'SUBSYSTEM')
              .appendField('.')
              .appendField(methodDropdown, 'METHOD')
              .appendField('()');

      /* Keep METHOD valid when SUBSYSTEM changes. */
      block.setOnChange(function (e) {
        if (!e || e.type !== Blockly.Events.BLOCK_CHANGE) return;
        if (e.blockId !== block.id) return;
        if (e.name !== 'SUBSYSTEM') return;
        const opts = BlocklyFRC.getMethodOptions(
          block.getFieldValue('SUBSYSTEM'), returnType
        );
        if (opts.length) {
          block.setFieldValue(opts[0][1], 'METHOD');
        }
      });
    };
  }

  Blockly.Extensions.register(
    'frc_dropdown_sync_command',
    makeSubsystemMethodSync('Command')
  );
  Blockly.Extensions.register(
    'frc_dropdown_sync_boolean',
    makeSubsystemMethodSync('Boolean')
  );

  /* The subsystem-requirement dropdown on runOnce/run pulls from the
   * live config. */
  Blockly.Extensions.register('frc_dynamic_subsystem_dropdown', function () {
    const input = this.getInput('REQ_ROW');
    if (!input) return;
    input.appendField(
      new Blockly.FieldDropdown(() => BlocklyFRC.getSubsystemOptions()),
      'REQUIRES'
    );
  });

  /* The command-function block has a dynamic dropdown of all defined
   * command functions (names/ids sourced from BlocklyFRC state). */
  Blockly.Extensions.register('frc_dropdown_function', function () {
    const block = this;
    const input = block.getInput('ROW');
    if (!input) return;
    input.appendField(
      new Blockly.FieldDropdown(function () {
        const opts = BlocklyFRC.getCommandFunctionOptions();
        return opts.length ? opts : [['(no functions)', 'NONE']];
      }),
      'FUNCTION'
    );
    input.appendField('()');
  });

  /* The trigger-state block has dynamic controller and button dropdowns. */
  Blockly.Extensions.register('frc_dynamic_controller_button', function () {
    const input = this.getInput('TRIG_ROW');
    if (!input) return;
    input.appendField(
            new Blockly.FieldDropdown(() => BlocklyFRC.getControllerOptions()),
            'CONTROLLER'
         )
         .appendField(' is pressing ')
         .appendField(
            new Blockly.FieldDropdown(() => BlocklyFRC.getButtonOptions()),
            'BUTTON'
         );
  });

  /* Controller-binding BUTTON dropdown: dynamic so it pulls the image
   * options from BlocklyFRC.getButtonOptions() — single source of truth
   * shared with the trigger_state block. */
  Blockly.Extensions.register('frc_binding_button_dropdown', function () {
    const input = this.getInput('BUTTON_ROW');
    if (!input) return;
    input.appendField(
      new Blockly.FieldDropdown(() => BlocklyFRC.getButtonOptions()),
      'BUTTON'
    );
  });

  /* ----------------------------------------------------------------
   * Block JSON definitions
   * -------------------------------------------------------------- */
  const BLOCK_JSON = [

    /* ─── 0. CONTROLLER BINDING ────────────────────────────────── */
    {
      /* A standalone block that maps one controller button+edge to a
       * composed command. Lives on the controller's canvas — one block
       * per binding. No prev/next statement so it cannot be nested.
       *
       * Reads as a sentence: "when [A button image] is [pressed]  /
       * do: …".  The BUTTON dropdown is filled at init by the
       * frc_binding_button_dropdown extension, which pulls image
       * options from BlocklyFRC.getButtonOptions() so the binding
       * block and trigger_state block share one button picker.
       *
       * The optional NAME row at the bottom is used as the comment
       * label in generated Java and as the binding name in the
       * Padcrafter mapping URL. When empty, java_generator.js
       * synthesizes a label from the BUTTON+EDGE display text. */
      type: 'frc_controller_binding',
      message0: 'when %1 is %2',
      args0: [
        { type: 'input_dummy', name: 'BUTTON_ROW' },
        {
          type: 'field_dropdown', name: 'EDGE',
          options: [
            ['pressed',          'onTrue'],
            ['held down',        'whileTrue'],
            ['released',         'onFalse'],
            ['pressed (toggle)', 'toggleOnTrue'],
            ['not held',         'whileFalse']
          ]
        }
      ],
      message1: 'do %1',
      args1: [
        { type: 'input_statement', name: 'COMMAND', check: 'Command' }
      ],
      message2: 'name (optional) %1',
      args2: [
        { type: 'field_input', name: 'NAME', text: '' }
      ],
      style: 'frc_trigger_blocks',
      tooltip: 'Runs the commands inside when the chosen button event happens on this controller. For example, "when A button is pressed, do: drive forward" generates m_controller.a().onTrue(driveForward()). The optional name is used as a code comment and as the label on the Padcrafter controller-mapping image.',
      extensions: ['frc_binding_button_dropdown']
    },

    /* ─── 1. FUNCTION ROOT (used inside Command Function workspaces) ── */
    {
      type: 'frc_binding_root',
      message0: 'this routine returns:',
      message1: '%1',
      args1: [
        { type: 'input_statement', name: 'COMMAND', check: 'Command' }
      ],
      style: 'frc_trigger_blocks',
      tooltip: 'The starting point of a saved routine. Whatever you attach here becomes the routine that other blocks can call.',
      extensions: ['frc_root_lock']
    },

    /* ─── 2. COMPOSITION ───────────────────────────────────────── */
    {
      type: 'frc_sequence',
      message0: 'do in order',
      message1: '%1',
      args1: [
        { type: 'input_statement', name: 'CHILDREN', check: 'Command' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_sequence_blocks',
      tooltip: 'Runs each block inside one after the other, top to bottom. Generates Commands.sequence(...).',
      helpUrl: 'https://docs.wpilib.org/en/stable/docs/software/commandbased/command-compositions.html'
    },
    {
      type: 'frc_parallel',
      message0: 'do at the same time',
      message1: '%1',
      args1: [
        { type: 'input_statement', name: 'CHILDREN', check: 'Command' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_parallel_blocks',
      tooltip: 'Starts every block inside at the same time. Finishes when ALL of them finish. Generates Commands.parallel(...).'
    },
    {
      type: 'frc_race',
      message0: 'race — stop when the first one finishes',
      message1: '%1',
      args1: [
        { type: 'input_statement', name: 'CHILDREN', check: 'Command' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_race_blocks',
      tooltip: 'Starts every block inside at the same time. Finishes as soon as ANY one of them finishes — the rest are stopped. Generates Commands.race(...).'
    },
    {
      type: 'frc_deadline',
      message0: 'run together — stop when the time-keeper finishes',
      message1: 'time-keeper %1',
      args1: [
        { type: 'input_statement', name: 'DEADLINE', check: 'Command' }
      ],
      message2: 'alongside %1',
      args2: [
        { type: 'input_statement', name: 'CHILDREN', check: 'Command' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_deadline_blocks',
      tooltip: 'All blocks start at the same time. The group ends when the time-keeper block finishes — anything still running alongside it is stopped. Generates Commands.deadline(...).'
    },

    /* ─── 3. LEAF COMMANDS ─────────────────────────────────────── */
    {
      /* The frc_dropdown_sync_command extension fills ROW with the
       * dynamic dropdowns. */
      type: 'frc_subsystem_command',
      message0: '%1',
      args0: [
        { type: 'input_dummy', name: 'ROW' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_command_blocks',
      tooltip: 'Runs an action defined on one of your robot\'s subsystems.',
      extensions: ['frc_dropdown_sync_command']
    },
    {
      type: 'frc_runonce',
      message0: 'runOnce %1   on %2',
      args0: [
        { type: 'field_input', name: 'BODY', text: '// instant action' },
        { type: 'input_dummy', name: 'REQ_ROW' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_command_blocks',
      tooltip: 'A one-shot command that runs the body once and immediately finishes. Maps to Commands.runOnce(() -> { … }, requirement).',
      extensions: ['frc_dynamic_subsystem_dropdown']
    },
    {
      type: 'frc_run',
      message0: 'run %1   on %2',
      args0: [
        { type: 'field_input', name: 'BODY', text: '// per-loop action' },
        { type: 'input_dummy', name: 'REQ_ROW' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_command_blocks',
      tooltip: 'Runs the body every loop until interrupted. Maps to Commands.run(() -> { … }, requirement).',
      extensions: ['frc_dynamic_subsystem_dropdown']
    },
    {
      type: 'frc_wait_seconds',
      message0: 'wait %1 seconds',
      args0: [
        { type: 'field_number', name: 'SECONDS', value: 1.0, min: 0, max: 600, precision: 0.05 }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_command_blocks',
      tooltip: 'Pauses for a fixed number of seconds, then finishes. Maps to Commands.waitSeconds(s).'
    },
    {
      type: 'frc_wait_until',
      message0: 'wait until %1',
      args0: [
        { type: 'input_value', name: 'COND', check: 'Boolean' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_command_blocks',
      tooltip: 'Pauses until the yes/no question becomes yes (true). Maps to Commands.waitUntil(supplier).'
    },
    {
      type: 'frc_print',
      message0: 'print message %1',
      args0: [
        { type: 'field_input', name: 'TEXT', text: 'hello' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_command_blocks',
      tooltip: 'Prints a message to the driver-station console. Maps to Commands.print("…").'
    },
    {
      type: 'frc_none',
      message0: 'do nothing',
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_command_blocks',
      tooltip: 'A placeholder that does nothing — useful for the "otherwise" branch of an if/else. Maps to Commands.none().'
    },

    /* ─── 4. DECORATORS ────────────────────────────────────────── */
    /* Two-row Scratch-style layout: title row (message0) + body row
     * (message1) so the wrap relationship is visible at a glance. */
    {
      type: 'frc_with_timeout',
      message0: 'stop after %1 seconds',
      args0: [
        { type: 'field_number', name: 'SECONDS', value: 2.0, min: 0.01, max: 600, precision: 0.05 }
      ],
      message1: 'do %1',
      args1: [
        { type: 'input_statement', name: 'CMD', check: 'Command' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_decorator_blocks',
      tooltip: 'Stops the wrapped action if it has not finished after the given number of seconds. Maps to .withTimeout(s).'
    },
    {
      type: 'frc_until',
      message0: 'stop when %1',
      args0: [
        { type: 'input_value', name: 'COND', check: 'Boolean' }
      ],
      message1: 'do %1',
      args1: [
        { type: 'input_statement', name: 'CMD', check: 'Command' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_decorator_blocks',
      tooltip: 'Stops the wrapped action as soon as the question becomes yes (true). Maps to .until(supplier).'
    },
    {
      type: 'frc_unless',
      message0: 'skip if %1',
      args0: [
        { type: 'input_value', name: 'COND', check: 'Boolean' }
      ],
      message1: 'do %1',
      args1: [
        { type: 'input_statement', name: 'CMD', check: 'Command' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_decorator_blocks',
      tooltip: 'Skips the wrapped action entirely if the question is yes (true) right when it would start. Maps to .unless(supplier).'
    },
    {
      type: 'frc_only_while',
      message0: 'only while %1',
      args0: [
        { type: 'input_value', name: 'COND', check: 'Boolean' }
      ],
      message1: 'do %1',
      args1: [
        { type: 'input_statement', name: 'CMD', check: 'Command' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_decorator_blocks',
      tooltip: 'Runs the wrapped action only as long as the question stays yes (true). Maps to .onlyWhile(supplier).'
    },
    {
      type: 'frc_as_proxy',
      message0: 'as proxy',
      message1: 'do %1',
      args1: [
        { type: 'input_statement', name: 'CMD', check: 'Command' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_decorator_blocks',
      tooltip: 'Advanced: wraps a command in a ProxyCommand so its subsystem requirements are not propagated to the outer composition. Maps to .asProxy().'
    },
    {
      type: 'frc_repeat',
      message0: 'repeat forever',
      message1: 'do %1',
      args1: [
        { type: 'input_statement', name: 'CMD', check: 'Command' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_decorator_blocks',
      tooltip: 'Restarts the wrapped action every time it ends. Generates .repeatedly().'
    },

    /* ─── 5. CONDITIONAL EXECUTION ─────────────────────────────── */
    {
      type: 'frc_either',
      message0: 'if %1',
      args0: [
        { type: 'input_value', name: 'COND', check: 'Boolean' }
      ],
      message1: 'then %1',
      args1: [
        { type: 'input_statement', name: 'ON_TRUE', check: 'Command' }
      ],
      message2: 'else %1',
      args2: [
        { type: 'input_statement', name: 'ON_FALSE', check: 'Command' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_decorator_blocks',
      tooltip: 'Checks the question once when this block starts. If yes (true), runs the "then" branch; otherwise runs the "else" branch. Maps to Commands.either(onTrue, onFalse, supplier).'
    },

    /* ─── 3b. COMMAND FUNCTION CALL ───────────────────────────── */
    {
      /* Calls a command function defined on this Commands class.
       * The frc_dropdown_function extension fills ROW with the
       * dynamic function-name dropdown. */
      type: 'frc_command_function',
      message0: 'run routine %1',
      args0: [
        { type: 'input_dummy', name: 'ROW' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_command_blocks',
      tooltip: 'Runs a saved routine that you built in Build → Command Functions. Generates routineName().',
      extensions: ['frc_dropdown_function']
    },

    /* ─── 6. BOOLEAN / VALUE BLOCKS ────────────────────────────── */
    {
      type: 'frc_subsystem_boolean',
      message0: '%1',
      args0: [
        { type: 'input_dummy', name: 'ROW' }
      ],
      output: 'Boolean',
      style: 'frc_condition_blocks',
      tooltip: 'Asks a yes/no question that one of your subsystems can answer.',
      extensions: ['frc_dropdown_sync_boolean']
    },
    {
      type: 'frc_bool_literal',
      message0: '%1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'VAL',
          options: [['yes (true)', 'TRUE'], ['no (false)', 'FALSE']]
        }
      ],
      output: 'Boolean',
      style: 'frc_boolean_blocks',
      tooltip: 'A fixed yes/no value.'
    },
    {
      type: 'frc_bool_not',
      message0: 'not %1',
      args0: [
        { type: 'input_value', name: 'A', check: 'Boolean' }
      ],
      inputsInline: true,
      output: 'Boolean',
      style: 'frc_boolean_blocks',
      tooltip: 'Flips a yes/no value: yes becomes no, no becomes yes.'
    },
    {
      type: 'frc_bool_combine',
      message0: '%1 %2 %3',
      args0: [
        { type: 'input_value', name: 'A', check: 'Boolean' },
        {
          type: 'field_dropdown',
          name: 'OP',
          options: [['and', 'AND'], ['or', 'OR']]
        },
        { type: 'input_value', name: 'B', check: 'Boolean' }
      ],
      inputsInline: true,
      output: 'Boolean',
      style: 'frc_boolean_blocks',
      tooltip: 'Combines two yes/no values. "and" is yes only when both are yes; "or" is yes when either is yes.'
    },
    {
      type: 'frc_trigger_state',
      message0: '%1',
      args0: [
        { type: 'input_dummy', name: 'TRIG_ROW' }
      ],
      output: 'Boolean',
      style: 'frc_condition_blocks',
      tooltip: 'A yes/no question that reads the current state of a controller button right now (e.g. is m_driver.a() currently pressed?).',
      extensions: ['frc_dynamic_controller_button']
    }
  ];

  Blockly.common.defineBlocksWithJsonArray(BLOCK_JSON);

})();
