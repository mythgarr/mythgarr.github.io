/* ================================================================
 * Blockly for FRC — custom block definitions
 *
 * Uses Blockly's standard extension model:
 *   • Block definitions are JSON, registered via
 *     Blockly.common.defineBlocksWithJsonArray.
 *   • Cross-cutting behavior (the subsystem→method dropdown sync,
 *     the trigger root's no-delete/no-move flags) is registered as
 *     Extensions via Blockly.Extensions.register.
 *   • Colors come from theme block-styles (defined in app.js's
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
         .appendField('.')
         .appendField(
            new Blockly.FieldDropdown(() => BlocklyFRC.getButtonOptions()),
            'BUTTON'
         )
         .appendField('()');
  });

  /* ----------------------------------------------------------------
   * Block JSON definitions
   * -------------------------------------------------------------- */
  const BLOCK_JSON = [

    /* ─── 0. CONTROLLER BINDING ────────────────────────────────── */
    {
      /* A standalone block that maps one controller button+edge to a
       * composed command. Lives on the controller's canvas — one block
       * per binding. No prev/next statement so it cannot be nested. */
      type: 'frc_controller_binding',
      message0: '▸ %1   %2   %3   schedule: %4',
      args0: [
        { type: 'field_input',   name: 'NAME',   text: 'new binding' },
        {
          type: 'field_dropdown', name: 'BUTTON',
          options: [
            ['a',            'a'],           ['b',            'b'],
            ['x',            'x'],           ['y',            'y'],
            ['leftBumper',   'leftBumper'],  ['rightBumper',  'rightBumper'],
            ['leftTrigger',  'leftTrigger'], ['rightTrigger', 'rightTrigger'],
            ['back',         'back'],        ['start',        'start'],
            ['leftStick',    'leftStick'],   ['rightStick',   'rightStick'],
            ['povUp',        'povUp'],       ['povRight',     'povRight'],
            ['povDown',      'povDown'],     ['povLeft',      'povLeft']
          ]
        },
        {
          type: 'field_dropdown', name: 'EDGE',
          options: [
            ['on press',       'onTrue'],
            ['while held',     'whileTrue'],
            ['on release',     'onFalse'],
            ['toggle on press','toggleOnTrue'],
            ['while released', 'whileFalse']
          ]
        },
        { type: 'input_statement', name: 'COMMAND', check: 'Command' }
      ],
      style: 'frc_trigger_blocks',
      tooltip: 'A controller button binding. Set the name, choose a button and trigger type, then drop command blocks inside. Generates m_controller.button().edge(command).'
    },

    /* ─── 1. FUNCTION ROOT (used inside Command Function workspaces) ── */
    {
      type: 'frc_binding_root',
      message0: 'ƒ command function body %1 return: %2',
      args0: [
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'COMMAND', check: 'Command' }
      ],
      style: 'frc_trigger_blocks',
      tooltip: 'The root of this command function. Blocks attached here define the command that is returned.',
      extensions: ['frc_root_lock']
    },

    /* ─── 2. COMPOSITION ───────────────────────────────────────── */
    {
      type: 'frc_sequence',
      message0: '⇣  sequence %1',
      args0: [
        { type: 'input_statement', name: 'CHILDREN', check: 'Command' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_sequence_blocks',
      tooltip: 'Runs commands one after another. Generates Commands.sequence(...).',
      helpUrl: 'https://docs.wpilib.org/en/stable/docs/software/commandbased/command-compositions.html'
    },
    {
      type: 'frc_parallel',
      message0: '∥  parallel %1',
      args0: [
        { type: 'input_statement', name: 'CHILDREN', check: 'Command' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_parallel_blocks',
      tooltip: 'Runs all commands at once. Ends when all are finished. Generates Commands.parallel(...).'
    },
    {
      type: 'frc_race',
      message0: '🏁  parallel race %1',
      args0: [
        { type: 'input_statement', name: 'CHILDREN', check: 'Command' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_race_blocks',
      tooltip: 'Runs all commands at once. Ends when ANY one finishes — the rest are interrupted. Generates Commands.race(...).'
    },
    {
      type: 'frc_deadline',
      message0: '⌛  parallel deadline   deadline: %1   alongside: %2',
      args0: [
        { type: 'input_statement', name: 'DEADLINE', check: 'Command' },
        { type: 'input_statement', name: 'CHILDREN', check: 'Command' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_deadline_blocks',
      tooltip: 'All commands start together. Ends when the deadline command finishes — the others are then interrupted. Generates Commands.deadline(...).'
    },

    /* ─── 3. LEAF COMMANDS ─────────────────────────────────────── */
    {
      /* The frc_dropdown_sync_command extension fills ROW with the
       * dynamic dropdowns. */
      type: 'frc_subsystem_command',
      message0: '▶ %1',
      args0: [
        { type: 'input_dummy', name: 'ROW' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_command_blocks',
      tooltip: 'Calls a Supplier<Command> method on a subsystem.',
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
      tooltip: 'Idles for a fixed number of seconds. Maps to Commands.waitSeconds(s).'
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
      tooltip: 'Blocks until the boolean supplier returns true. Maps to Commands.waitUntil(supplier).'
    },
    {
      type: 'frc_print',
      message0: 'print %1',
      args0: [
        { type: 'field_input', name: 'TEXT', text: 'hello' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_command_blocks',
      tooltip: 'Prints to console. Maps to Commands.print("…").'
    },
    {
      type: 'frc_none',
      message0: '—  no-op (idle)',
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_command_blocks',
      tooltip: 'Does nothing. Useful as a placeholder branch in either(). Maps to Commands.none().'
    },

    /* ─── 4. DECORATORS ────────────────────────────────────────── */
    {
      type: 'frc_with_timeout',
      message0: '🕒  timeout after %1 s   command: %2',
      args0: [
        { type: 'field_number', name: 'SECONDS', value: 2.0, min: 0.01, max: 600, precision: 0.05 },
        { type: 'input_statement', name: 'CMD', check: 'Command' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_decorator_blocks',
      tooltip: 'Interrupts the wrapped command if it runs longer than X seconds. Maps to .withTimeout(s).'
    },
    {
      type: 'frc_until',
      message0: '▣  until %1   command: %2',
      args0: [
        { type: 'input_value', name: 'COND', check: 'Boolean' },
        { type: 'input_statement', name: 'CMD', check: 'Command' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_decorator_blocks',
      tooltip: 'Interrupts the wrapped command when the condition becomes true. Maps to .until(supplier).'
    },
    {
      type: 'frc_unless',
      message0: '⊘  unless %1   command: %2',
      args0: [
        { type: 'input_value', name: 'COND', check: 'Boolean' },
        { type: 'input_statement', name: 'CMD', check: 'Command' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_decorator_blocks',
      tooltip: 'Skips the wrapped command if the condition is true at start. Maps to .unless(supplier).'
    },
    {
      type: 'frc_only_while',
      message0: '▸  only while %1   command: %2',
      args0: [
        { type: 'input_value', name: 'COND', check: 'Boolean' },
        { type: 'input_statement', name: 'CMD', check: 'Command' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_decorator_blocks',
      tooltip: 'Runs only while the condition is true. Maps to .onlyWhile(supplier).'
    },
    {
      type: 'frc_as_proxy',
      message0: '⇄  as proxy   command: %1',
      args0: [
        { type: 'input_statement', name: 'CMD', check: 'Command' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_decorator_blocks',
      tooltip: 'Wraps a command in a ProxyCommand so its requirements are not propagated. Maps to .asProxy().'
    },
    {
      type: 'frc_repeat',
      message0: '↻  repeat forever   command: %1',
      args0: [
        { type: 'input_statement', name: 'CMD', check: 'Command' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_decorator_blocks',
      tooltip: 'Restarts the wrapped command every time it ends. Generates .repeatedly().'
    },

    /* ─── 5. CONDITIONAL EXECUTION ─────────────────────────────── */
    {
      type: 'frc_either',
      message0: '?  if %1 then %2 else %3',
      args0: [
        { type: 'input_value', name: 'COND', check: 'Boolean' },
        { type: 'input_statement', name: 'ON_TRUE', check: 'Command' },
        { type: 'input_statement', name: 'ON_FALSE', check: 'Command' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_decorator_blocks',
      tooltip: 'Picks one of two commands at scheduling time. Maps to Commands.either(onTrue, onFalse, supplier).'
    },

    /* ─── 3b. COMMAND FUNCTION CALL ───────────────────────────── */
    {
      /* Calls a command function defined on this Commands class.
       * The frc_dropdown_function extension fills ROW with the
       * dynamic function-name dropdown. */
      type: 'frc_command_function',
      message0: 'ƒ %1',
      args0: [
        { type: 'input_dummy', name: 'ROW' }
      ],
      previousStatement: 'Command',
      nextStatement: 'Command',
      style: 'frc_command_blocks',
      tooltip: 'Calls a command function defined on this Commands class. Generates functionName(). Define functions in Build → Command Functions.',
      extensions: ['frc_dropdown_function']
    },

    /* ─── 6. BOOLEAN / VALUE BLOCKS ────────────────────────────── */
    {
      type: 'frc_subsystem_boolean',
      message0: '? %1',
      args0: [
        { type: 'input_dummy', name: 'ROW' }
      ],
      output: 'Boolean',
      style: 'frc_condition_blocks',
      tooltip: 'Calls a Supplier<Boolean> method on a subsystem. Returns the boolean.',
      extensions: ['frc_dropdown_sync_boolean']
    },
    {
      type: 'frc_bool_literal',
      message0: '%1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'VAL',
          options: [['true', 'TRUE'], ['false', 'FALSE']]
        }
      ],
      output: 'Boolean',
      style: 'frc_boolean_blocks',
      tooltip: 'A boolean literal.'
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
      tooltip: 'Logical NOT of the supplier.'
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
      tooltip: 'Combine two boolean suppliers with AND or OR.'
    },
    {
      type: 'frc_trigger_state',
      message0: 'controller %1',
      args0: [
        { type: 'input_dummy', name: 'TRIG_ROW' }
      ],
      output: 'Boolean',
      style: 'frc_condition_blocks',
      tooltip: 'Reads the current state of a controller button as a BooleanSupplier (e.g. m_driver.a().getAsBoolean()).',
      extensions: ['frc_dynamic_controller_button']
    }
  ];

  Blockly.common.defineBlocksWithJsonArray(BLOCK_JSON);

})();
