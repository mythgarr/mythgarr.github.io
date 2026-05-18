/* ================================================================
 * Blockly for FRC — Java code generator
 *
 * Generates idiomatic WPILib command-based Java from custom blocks.
 *
 * Implementation notes:
 *
 *   • Subclass of Blockly.CodeGenerator (the standard base class
 *     used by the built-in JavaScript / Python / etc. generators).
 *
 *   • Each block-code function uses the canonical
 *     (block, generator) => string | [string, order]
 *     signature. Statement-shaped command blocks return
 *     [expr, ORDER_FUNCTION_CALL] because in our domain every
 *     "statement" is actually a Command expression composed via
 *     factory methods (Commands.sequence(...), .withTimeout(...),
 *     etc.); we never want trailing semicolons on individual
 *     fragments.
 *
 *   • Boolean blocks return method references like `m_arm::isUp`
 *     when possible and lambdas otherwise, since the WPILib API
 *     wants BooleanSupplier instances.
 *
 *   • Composition / decorator inputs use the standard
 *     generator.valueToCode (for boolean inputs) and
 *     generator.statementToCode helper for statement chains. We
 *     build a small `commandChainToCode` helper that walks a
 *     statement chain and returns its children as a comma-joined
 *     argument list (since our statements are Command expressions,
 *     not Java statements).
 *
 *   • Output style:
 *       – Static imports for Commands.* factory methods.
 *       – Subsystems referenced via field name (e.g. m_drivetrain).
 *       – Decorator chains use fluent .withTimeout(), .until(), etc.
 *       – Composition uses Commands.sequence(...), parallel(...).
 * ================================================================ */

(function () {
  'use strict';

  /* The standard generator base class is exposed as
   * Blockly.CodeGenerator in v10. Older code uses Blockly.Generator,
   * which is an alias kept for compatibility. We use the modern name. */
  const Base = Blockly.CodeGenerator || Blockly.Generator;

  class JavaGenerator extends Base {
    constructor() {
      super('Java');

      /* Operator precedence — Blockly uses these to know when to wrap
       * an expression in parens. All our outputs are method calls, so
       * precedence is mostly atomic. We keep the conventional names
       * because that matches the style of the built-in generators. */
      this.ORDER_ATOMIC = 0;
      this.ORDER_FUNCTION_CALL = 1;
      this.ORDER_LOGICAL_NOT = 2;
      this.ORDER_LOGICAL_AND = 3;
      this.ORDER_LOGICAL_OR = 4;
      this.ORDER_NONE = 99;

      this.INDENT = '  ';
    }

    /* Override scrub_ — this is the standard hook called by
     * blockToCode after generating each block's code. We use it to
     * strip the trailing newline that Blockly adds for statement-
     * shaped blocks, because in our domain the "statements" are
     * really Command expressions that get joined with commas. */
    scrub_(block, code, _opt_thisOnly) {
      return code;
    }
  }

  const javaGenerator = new JavaGenerator();

  /* ----------------------------------------------------------------
   * Helper: walk a command stack input and return its children as a
   * comma-joined argument list. Each child is rendered via the
   * standard generator.blockToCode().
   *
   * We can't use generator.statementToCode here because that
   * appends Blockly's INDENT and a trailing newline, optimized for
   * imperative statements. Our "statements" are Command expressions
   * to be passed as arguments.
   * -------------------------------------------------------------- */
  function commandChain(block, inputName, generator) {
    const parts = [];
    let current = block.getInputTargetBlock(inputName);
    while (current) {
      const out = generator.blockToCode(current, /* opt_thisOnly */ true);
      const expr = Array.isArray(out) ? out[0] : out;
      if (expr && expr.trim()) {
        parts.push(expr.trim().replace(/;\s*$/, ''));
      }
      current = current.getNextBlock();
    }
    return parts;
  }

  /* Wrap a list of expressions in multi-line form when long. */
  function joinList(parts) {
    if (parts.length === 0) return '';
    const longish = parts.some(p => p.length > 50 || p.includes('\n'));
    if (!longish && parts.length <= 2) return parts.join(', ');
    return '\n      ' + parts.join(',\n      ') + '\n    ';
  }

  /* If the user dropped multiple Commands into a decorator slot,
   * wrap them in a sequence so the chain is still valid. */
  function decoratorInner(block, generator) {
    const parts = commandChain(block, 'CMD', generator);
    if (parts.length === 0) return 'Commands.none()';
    if (parts.length === 1) return parts[0];
    return `Commands.sequence(${parts.join(', ')})`;
  }

  /* Boolean utilities — see the boolean handlers below for context. */
  function methodRefToCall(ref) {
    const idx = ref.indexOf('::');
    if (idx < 0) return ref + '.getAsBoolean()';
    return ref.slice(0, idx) + '.' + ref.slice(idx + 2) + '()';
  }
  function callIfLambda(s) {
    s = s.trim();
    const m = s.match(/^\(\)\s*->\s*(.+)$/s);
    if (m) return m[1].trim();
    if (s.includes('::')) return methodRefToCall(s);
    return s + '.getAsBoolean()';
  }

  /* ================================================================
   * BOOLEAN SUPPLIERS
   * ================================================================ */
  javaGenerator.forBlock['frc_subsystem_boolean'] = function (block, generator) {
    const sub = block.getFieldValue('SUBSYSTEM');
    const method = block.getFieldValue('METHOD');
    const fieldName = BlocklyFRC.getSubsystemFieldName(sub) || 'm_' + sub;
    return [`${fieldName}::${method}`, generator.ORDER_ATOMIC];
  };

  javaGenerator.forBlock['frc_bool_literal'] = function (block, generator) {
    const val = block.getFieldValue('VAL') === 'TRUE' ? 'true' : 'false';
    return [`() -> ${val}`, generator.ORDER_ATOMIC];
  };

  javaGenerator.forBlock['frc_bool_not'] = function (block, generator) {
    const inner = generator.valueToCode(block, 'A', generator.ORDER_LOGICAL_NOT) || '() -> false';
    if (inner.includes('::')) {
      return [`() -> !${methodRefToCall(inner)}`, generator.ORDER_LOGICAL_NOT];
    }
    return [`() -> !(${callIfLambda(inner)})`, generator.ORDER_LOGICAL_NOT];
  };

  javaGenerator.forBlock['frc_bool_combine'] = function (block, generator) {
    const op = block.getFieldValue('OP') === 'AND' ? '&&' : '||';
    const a = generator.valueToCode(block, 'A', generator.ORDER_LOGICAL_AND) || '() -> true';
    const b = generator.valueToCode(block, 'B', generator.ORDER_LOGICAL_AND) || '() -> true';
    return [`() -> (${callIfLambda(a)}) ${op} (${callIfLambda(b)})`, generator.ORDER_LOGICAL_AND];
  };

  javaGenerator.forBlock['frc_trigger_state'] = function (block, generator) {
    const ctrl = block.getFieldValue('CONTROLLER');
    const btn = block.getFieldValue('BUTTON');
    const fieldName = BlocklyFRC.getControllerFieldName(ctrl) || 'm_' + ctrl;
    return [`${fieldName}.${btn}()`, generator.ORDER_ATOMIC];
  };

  /* ================================================================
   * COMMAND COMPOSITIONS
   * Statement-shaped blocks. We return a [code, order] tuple even
   * though they're statements, because in our domain a "statement
   * block" is really a Command expression — when the parent walks
   * its children it pulls these out as expressions. The trailing
   * semicolon is stripped by commandChain().
   * ================================================================ */
  javaGenerator.forBlock['frc_sequence'] = function (block, generator) {
    const parts = commandChain(block, 'CHILDREN', generator);
    if (parts.length === 0) return `Commands.none()`;
    if (parts.length === 1) return parts[0];
    return `Commands.sequence(${joinList(parts)})`;
  };

  javaGenerator.forBlock['frc_parallel'] = function (block, generator) {
    const parts = commandChain(block, 'CHILDREN', generator);
    if (parts.length === 0) return `Commands.none()`;
    if (parts.length === 1) return parts[0];
    return `Commands.parallel(${joinList(parts)})`;
  };

  javaGenerator.forBlock['frc_race'] = function (block, generator) {
    const parts = commandChain(block, 'CHILDREN', generator);
    if (parts.length === 0) return `Commands.none()`;
    if (parts.length === 1) return parts[0];
    return `Commands.race(${joinList(parts)})`;
  };

  javaGenerator.forBlock['frc_deadline'] = function (block, generator) {
    const deadlineParts = commandChain(block, 'DEADLINE', generator);
    const deadline = deadlineParts.length === 0
      ? 'Commands.none()'
      : (deadlineParts.length === 1 ? deadlineParts[0] : `Commands.sequence(${deadlineParts.join(', ')})`);
    const others = commandChain(block, 'CHILDREN', generator);
    if (others.length === 0) return [deadline, generator.ORDER_ATOMIC];
    return `Commands.deadline(${deadline}, ${joinList(others)})`;
  };

  /* ================================================================
   * LEAF COMMANDS
   * ================================================================ */
  javaGenerator.forBlock['frc_subsystem_command'] = function (block, generator) {
    const sub = block.getFieldValue('SUBSYSTEM');
    const method = block.getFieldValue('METHOD');
    const fieldName = BlocklyFRC.getSubsystemFieldName(sub) || 'm_' + sub;
    return `${fieldName}.${method}()`;
  };

  /* Command function call — generates `methodName()` with no subsystem
   * prefix, since the function is a method on this Commands class. */
  javaGenerator.forBlock['frc_command_function'] = function (block, generator) {
    const funcId = block.getFieldValue('FUNCTION');
    if (!funcId || funcId === 'NONE') return 'Commands.none()';
    const name = BlocklyFRC.getCommandFunctionName(funcId);
    if (!name) return 'Commands.none()';
    /* camel-case the stored name to match the generated method name. */
    const safeId = name.replace(/[^A-Za-z0-9_]/g, '_').replace(/^\d/, '_$&');
    const camelName = safeId.charAt(0).toLowerCase() + safeId.slice(1);
    return `${camelName}()`;
  };

  javaGenerator.forBlock['frc_runonce'] = function (block, generator) {
    let body = (block.getFieldValue('BODY') || '').trim();
    if (!body) body = '/* no-op */';
    const sub = block.getFieldValue('REQUIRES');
    const fieldName = BlocklyFRC.getSubsystemFieldName(sub) || 'm_' + sub;
    return `Commands.runOnce(() -> ${body.replace(/;$/, '')}, ${fieldName})`;
  };

  javaGenerator.forBlock['frc_run'] = function (block, generator) {
    let body = (block.getFieldValue('BODY') || '').trim();
    if (!body) body = '/* no-op */';
    const sub = block.getFieldValue('REQUIRES');
    const fieldName = BlocklyFRC.getSubsystemFieldName(sub) || 'm_' + sub;
    return `Commands.run(() -> ${body.replace(/;$/, '')}, ${fieldName})`;
  };

  javaGenerator.forBlock['frc_wait_seconds'] = function (block, generator) {
    const s = block.getFieldValue('SECONDS');
    return `Commands.waitSeconds(${s})`;
  };

  javaGenerator.forBlock['frc_wait_until'] = function (block, generator) {
    const cond = generator.valueToCode(block, 'COND', generator.ORDER_NONE) || '() -> true';
    return `Commands.waitUntil(${cond})`;
  };

  javaGenerator.forBlock['frc_print'] = function (block, generator) {
    const text = block.getFieldValue('TEXT') || '';
    const esc = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `Commands.print("${esc}")`;
  };

  javaGenerator.forBlock['frc_none'] = function (_block, generator) {
    return `Commands.none()`;
  };

  /* ================================================================
   * DECORATORS
   * Decorators wrap a single inner command via statement input.
   * ================================================================ */
  javaGenerator.forBlock['frc_with_timeout'] = function (block, generator) {
    const cmd = decoratorInner(block, generator);
    const s = block.getFieldValue('SECONDS');
    return `${cmd}.withTimeout(${s})`;
  };

  javaGenerator.forBlock['frc_until'] = function (block, generator) {
    const cmd = decoratorInner(block, generator);
    const cond = generator.valueToCode(block, 'COND', generator.ORDER_NONE) || '() -> false';
    return `${cmd}.until(${cond})`;
  };

  javaGenerator.forBlock['frc_unless'] = function (block, generator) {
    const cmd = decoratorInner(block, generator);
    const cond = generator.valueToCode(block, 'COND', generator.ORDER_NONE) || '() -> false';
    return `${cmd}.unless(${cond})`;
  };

  javaGenerator.forBlock['frc_only_while'] = function (block, generator) {
    const cmd = decoratorInner(block, generator);
    const cond = generator.valueToCode(block, 'COND', generator.ORDER_NONE) || '() -> true';
    return `${cmd}.onlyWhile(${cond})`;
  };

  javaGenerator.forBlock['frc_as_proxy'] = function (block, generator) {
    const cmd = decoratorInner(block, generator);
    return `${cmd}.asProxy()`;
  };

  javaGenerator.forBlock['frc_repeat'] = function (block, generator) {
    const cmd = decoratorInner(block, generator);
    return `${cmd}.repeatedly()`;
  };

  /* ================================================================
   * CONDITIONAL
   * ================================================================ */
  javaGenerator.forBlock['frc_either'] = function (block, generator) {
    const cond = generator.valueToCode(block, 'COND', generator.ORDER_NONE) || '() -> false';
    const onTrue = commandChain(block, 'ON_TRUE', generator);
    const onFalse = commandChain(block, 'ON_FALSE', generator);
    const tBranch = onTrue.length === 0
      ? 'Commands.none()'
      : (onTrue.length === 1 ? onTrue[0] : `Commands.sequence(${onTrue.join(', ')})`);
    const fBranch = onFalse.length === 0
      ? 'Commands.none()'
      : (onFalse.length === 1 ? onFalse[0] : `Commands.sequence(${onFalse.join(', ')})`);
    return `Commands.either(${tBranch}, ${fBranch}, ${cond})`;
  };

  /* ================================================================
   * ROOT
   * The root just unwraps its child statement(s).
   * ================================================================ */
  javaGenerator.forBlock['frc_binding_root'] = function (block, generator) {
    const parts = commandChain(block, 'COMMAND', generator);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    return `Commands.sequence(${parts.join(', ')})`;
  };

  /* ----------------------------------------------------------------
   * Public entry point used by boot.js for command functions.
   *
   * Returns the Java EXPRESSION for the entire workspace, ready to
   * be substituted into `return <expr>;` inside a command method.
   * Only meaningful when the workspace contains frc_binding_root.
   * -------------------------------------------------------------- */
  function generateJavaExpression (workspace) {
    const top = workspace.getTopBlocks(false).find(b => b.type === 'frc_binding_root');
    if (!top) return null;
    const code = javaGenerator.forBlock['frc_binding_root'](top, javaGenerator);
    if (!code) return null;
    return prettyFormatJava(code);
  }

  /* ----------------------------------------------------------------
   * Public entry point for controller workspaces.
   *
   * Returns an array of binding descriptors for all
   * frc_controller_binding top-blocks found in `workspace`:
   *   [{ name, button, edge, expr }, ...]
   *
   * `expr` is already pretty-formatted and ready to drop into
   * `.onTrue(<expr>)`.  boot.js is responsible for wrapping it into
   * a full binding line with the controller field name.
   * -------------------------------------------------------------- */
  function generateControllerBindingLines(workspace) {
    const results = [];
    const topBlocks = workspace.getTopBlocks(/* ordered */ true);
    for (const block of topBlocks) {
      if (block.type !== 'frc_controller_binding') continue;
      const button = block.getFieldValue('BUTTON') || 'a';
      const edge   = block.getFieldValue('EDGE')   || 'onTrue';
      /* Use the user's name if they set one (NAME is also what gets
       * embedded in the Padcrafter mapping URL). Otherwise synthesize
       * a label from the dropdown DISPLAY text — for the BUTTON
       * field that's the image's alt ("A button"), for the EDGE
       * field it's the wording ("pressed", "held down", …). Falls
       * back to raw field values if a field hasn't been initialized
       * yet (e.g. during early scan). */
      const userName = (block.getFieldValue('NAME') || '').trim();
      function fieldText(name, fallback) {
        const f = block.getField(name);
        if (f && typeof f.getText === 'function') {
          const t = f.getText();
          if (t) return t;
        }
        return fallback;
      }
      const buttonText = fieldText('BUTTON', button);
      const edgeText   = fieldText('EDGE',   edge);
      const name = userName || `${buttonText} is ${edgeText}`;
      const parts  = commandChain(block, 'COMMAND', javaGenerator);
      let expr;
      if (parts.length === 0)      expr = 'Commands.none()';
      else if (parts.length === 1) expr = parts[0];
      else                         expr = `Commands.sequence(${joinList(parts)})`;
      results.push({ name, button, edge, expr: prettyFormatJava(expr) });
    }
    return results;
  }

  /* Pretty-format: insert line breaks inside the outermost
   * Commands.sequence/parallel/race/deadline/either calls. */
  function prettyFormatJava(s) {
    const breakers = ['Commands.sequence(', 'Commands.parallel(', 'Commands.race(', 'Commands.deadline(', 'Commands.either('];
    let out = s;
    for (const b of breakers) {
      out = breakAfter(out, b);
    }
    return out;
  }

  function indent(text, spaces) {
    if (!text) return '';
    const pad = ' '.repeat(spaces);
    return text.split('\n').map(l => l.length ? pad + l : l).join('\n');
  }

  function breakAfter(src, marker) {
    let result = '';
    let i = 0;
    while (i < src.length) {
      const idx = src.indexOf(marker, i);
      if (idx < 0) { result += src.slice(i); break; }
      result += src.slice(i, idx);
      result += marker;
      let depth = 1;
      let j = idx + marker.length;
      const segments = [];
      let last = j;
      while (j < src.length && depth > 0) {
        const c = src[j];
        if (c === '(') depth++;
        else if (c === ')') {
          depth--;
          if (depth === 0) {
            segments.push(src.slice(last, j));
            break;
          }
        } else if (c === ',' && depth === 1) {
          segments.push(src.slice(last, j));
          last = j + 1;
        }
        j++;
      }
      const trimmed = segments.map(s => s.trim()).filter(Boolean);
      if (trimmed.length <= 1 && trimmed.every(t => t.length < 40)) {
        result += trimmed.join(', ') + ')';
      } else {
        result += '\n    ' + trimmed.map(t => indent(t, 4).trimStart()).join(',\n    ') + ')';
      }
      i = j + 1;
    }
    return result;
  }

  /* Expose for boot.js to use when re-formatting outer joins. */
  // BlocklyFRC._prettyJava = prettyFormatJava;
  /* Expose for code reuse and consistency with the built-in
   * generators (e.g. Blockly's own javascriptGenerator). */
  // BlocklyFRC.register('java_generator', {javaGenerator});
  BlocklyFRC.register({javaGenerator, generateJavaExpression, generateControllerBindingLines});
})();
