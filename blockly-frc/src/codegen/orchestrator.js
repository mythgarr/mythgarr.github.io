/* ================================================================
 * Blockly for FRC — application controller
 * Developed by FRC 2789 (Texplosion)
 * ================================================================ */

(function () {
    'use strict';

    /* Render a command expression from stored XML (for functions and for
     * inactive controller workspaces when generating the full file). */
    function renderExprFromXml(obj) {
        if (!obj.blocklyXml) return null;
        try {
            const tmp = new Blockly.Workspace();
            const dom = Blockly.utils.xml.textToDom(obj.blocklyXml);
            Blockly.Xml.domToWorkspace(dom, tmp);
            const expr = BlocklyFRC.generateJavaExpression(tmp);
            tmp.dispose();
            return expr;
        } catch (e) {
            console.warn('Failed to render expr from XML', e);
            return null;
        }
    }

    /* Indent every line of `s` except the first. */
    function indentExprFor(s, n) {
        const pad = ' '.repeat(n);
        return s.split('\n').map((line, idx) => idx === 0 ? line : pad + line.replace(/^\s+/, pad)).join('\n').replace(new RegExp(`\\n${pad}${pad}`, 'g'), `\n${pad}`);
    }

    /* Render all binding lines from a controller's stored XML. */
    function renderBindingLinesFromXml(ctrl) {
        if (!ctrl.blocklyXml) return [];
        try {
            const tmp = new Blockly.Workspace();
            const dom = Blockly.utils.xml.textToDom(ctrl.blocklyXml);
            Blockly.Xml.domToWorkspace(dom, tmp);
            const lines = BlocklyFRC.generateControllerBindingLines(tmp);
            tmp.dispose();
            return lines;
        } catch (e) {
            console.warn('Failed to render binding lines from XML', e);
            return [];
        }
    }

    /* Generates the full Commands.java for ALL controllers and functions. */
    function generateFullJava() {
        /* ── Binding lines from every controller workspace ───────────── */
        const allBindingData = [];   /* [{ ctrl, lines: [{name,button,edge,expr}] }] */
        const state = BlocklyFRC.state;
        const workspace = BlocklyFRC.workspace;
        if (!state) return null;
        for (const ctrl of state.controllers) {
            let lines;
            if (state.editMode === 'binding' && ctrl.id === state.activeControllerId && workspace) {
                lines = BlocklyFRC.generateControllerBindingLines(workspace);
            } else {
                lines = renderBindingLinesFromXml(ctrl);
            }
            allBindingData.push({ctrl, lines});
        }

        /* ── Command expression for each command function ─────────────── */
        const functionExprs = [];
        for (const fn of state.commandFunctions) {
            let expr;
            if (state.editMode === 'function' && fn.id === state.activeFunctionId && workspace) {
                expr = BlocklyFRC.generateJavaExpression(workspace);
            } else {
                expr = renderExprFromXml(fn);
            }
            if (!expr) expr = 'Commands.none()';
            functionExprs.push({fn, expr});
        }

        const pkg = state.project.packageName || 'frc.robot';
        const cls = BlocklyFRC.pascal(state.project.className || 'Commands');

        const subsystemImports = state.subsystems.map(s => `import ${pkg}.subsystems.${BlocklyFRC.pascal(s.name)};`);

        /* Constructor dependency injection: fields are declared without
         * initializers; the caller (RobotContainer) passes instances in. */
        const subsystemFields = state.subsystems.map(s => {
            const T = BlocklyFRC.pascal(s.name);
            const f = BlocklyFRC.camel(s.name);
            return `  private final ${T} m_${f};`;
        });

        /* Constructor parameter list: (Drivetrain drivetrain, Arm arm, …) */
        const constructorParams = state.subsystems.map(s => {
            const T = BlocklyFRC.pascal(s.name);
            const f = BlocklyFRC.camel(s.name);
            return `${T} ${f}`;
        }).join(', ');

        /* Assignments inside the constructor body. */
        const subsystemAssignments = state.subsystems.map(s => {
            const f = BlocklyFRC.camel(s.name);
            return `    this.m_${f} = ${f};`;
        }).join('\n');

        const controllerImports = BlocklyFRC.uniq(state.controllers.map(c => `import edu.wpi.first.wpilibj2.command.button.${c.type};`));
        const controllerFields = state.controllers.map(c => {
            const T = c.type;
            const f = BlocklyFRC.camel(c.name);
            return `  private final ${T} m_${f} = new ${T}(${c.port});`;
        });

        /* Format each binding line: // name\n    m_ctrl.button().edge(\n        expr\n    ); */
        const bindingLines = [];
        for (const {ctrl, lines} of allBindingData) {
            const ctrlName = BlocklyFRC.camel(ctrl.name);
            for (const {name, button, edge, expr} of lines) {
                bindingLines.push(`    // ${name}\n    m_${ctrlName}.${button}().${edge}(\n        ${indentExprFor(expr, 8)}\n    );`);
            }
        }

        /* Build the command-function method declarations. */
        const functionMethods = functionExprs.map(({fn, expr}) => {
            const methodName = BlocklyFRC.camel(fn.name);
            return `  /** Composed command: ${fn.name} */\n  public Command ${methodName}() {\n    return ${indentExprFor(expr, 4)};\n  }`;
        });

        const padCrafterUrl = BlocklyFRC.generatePadCrafterUrl(allBindingData);
        const padCrafterLine = padCrafterUrl ? ` * Controller mapping: ${padCrafterUrl}\n *\n` : '';

        /* Format the constructor signature. When the param list is long,
         * break each parameter onto its own indented line. */
        const paramsFormatted = (() => {
            if (!constructorParams) return '';
            const params = state.subsystems.map(s => `${BlocklyFRC.pascal(s.name)} ${BlocklyFRC.camel(s.name)}`);
            const oneLiner = params.join(', ');
            if (oneLiner.length <= 60) return oneLiner;
            return '\n      ' + params.join(',\n      ') + '\n  ';
        })();

        return `package ${pkg};

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
${controllerImports.join('\n')}
${subsystemImports.join('\n')}

/**
 * Generated by Blockly for FRC.
 * Developed by FRC 2789 (Texplosion).
 * Composes commands and binds them to controller triggers.
${padCrafterLine} */
public class ${cls} {

  // ─── Subsystems ─────────────────────────────────────────────
${subsystemFields.join('\n')}

  // ─── Operator Interfaces ────────────────────────────────────
${controllerFields.join('\n')}

  public ${cls}(${paramsFormatted}) {
${subsystemAssignments}${subsystemAssignments ? '\n' : ''}    configureBindings();
  }

  private void configureBindings() {
${bindingLines.join('\n\n')}
  }
${functionMethods.length ? '\n  // ─── Command Functions ──────────────────────────────────────\n' + functionMethods.join('\n\n') + '\n' : ''}}
`;
    }

    BlocklyFRC.register({generateFullJava});
})();