/* ================================================================
 * Blockly for FRC — application controller
 * Developed by FRC 2789 (Texplosion)
 * ================================================================ */

const BlocklyFRC = (function () {
  'use strict';

  /* ----------------------------------------------------------------
   * STATE
   * Single source of truth for the entire app. Persisted to
   * localStorage on every change so reloads are non-destructive.
   * -------------------------------------------------------------- */
  const state = {
    project: {
      packageName: 'frc.robot',
      className: 'Commands',
      teamNumber: ''
    },
    /* Each subsystem has a stable id; the user-visible name doubles
     * as the Java class identifier. Methods are just metadata until
     * code generation time. */
    subsystems: [],        // { id, name, methods: [{id, name, returnType: 'Command'|'Boolean'}] }
    /* Controllers each own a full Blockly workspace. All bindings for
     * that controller live as frc_controller_binding blocks on its canvas. */
    controllers: [],       // { id, name, port, type, blocklyXml }
    commandFunctions: [],  // { id, name, blocklyXml } — generate public Command methods
    activeControllerId: null,
    activeFunctionId: null,
    editMode: 'binding'    // 'binding' | 'function'
  };

  const STORAGE_KEY = 'blockly-frc.v1';

  /* ----------------------------------------------------------------
   * Default seed — gives a new user something tangible to play with.
   * -------------------------------------------------------------- */
  function seedDefaults() {
    state.subsystems = [
      {
        id: uid(), name: 'Drivetrain',
        methods: [
          { id: uid(), name: 'driveForward', returnType: 'Command' },
          { id: uid(), name: 'stop', returnType: 'Command' },
          { id: uid(), name: 'isStopped', returnType: 'Boolean' }
        ]
      },
      {
        id: uid(), name: 'Arm',
        methods: [
          { id: uid(), name: 'raiseToScore', returnType: 'Command' },
          { id: uid(), name: 'lowerToIntake', returnType: 'Command' },
          { id: uid(), name: 'holdPosition', returnType: 'Command' },
          { id: uid(), name: 'isAtTop', returnType: 'Boolean' }
        ]
      },
      {
        id: uid(), name: 'Intake',
        methods: [
          { id: uid(), name: 'intake', returnType: 'Command' },
          { id: uid(), name: 'eject', returnType: 'Command' },
          { id: uid(), name: 'hasGamePiece', returnType: 'Boolean' }
        ]
      }
    ];
    state.controllers = [
      { id: uid(), name: 'driver',   port: 0, type: 'CommandXboxController', blocklyXml: null },
      { id: uid(), name: 'operator', port: 1, type: 'CommandXboxController', blocklyXml: null }
    ];
    state.commandFunctions = [];
    state.activeControllerId = state.controllers[0].id;
    state.activeFunctionId = null;
    state.editMode = 'binding';
  }

  /* ----------------------------------------------------------------
   * Utilities
   * -------------------------------------------------------------- */
  function uid() { return Math.random().toString(36).slice(2, 10); }

  function $(sel, root = document) { return root.querySelector(sel); }
  function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  /* Snapshot the live workspace XML into whichever object is currently
   * being edited (a controller canvas or a command function). */
  function saveCurrentContext() {
    if (!workspace) return;
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
    } catch (e) { /* ignore during early init */ }
  }

  function persist() {
    saveCurrentContext();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* quota exceeded — non-fatal */ }
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
    } catch (e) { return false; }
  }

  /* Convert a user-visible name into a safe Java identifier. */
  function toJavaId(name) {
    if (!name) return 'unnamed';
    let id = name.replace(/[^A-Za-z0-9_]/g, '_');
    if (/^\d/.test(id)) id = '_' + id;
    return id;
  }

  function pascal(name) {
    const id = toJavaId(name);
    return id.charAt(0).toUpperCase() + id.slice(1);
  }

  function camel(name) {
    const id = toJavaId(name);
    return id.charAt(0).toLowerCase() + id.slice(1);
  }

  /* ----------------------------------------------------------------
   * EXPOSED HELPERS used by custom_blocks.js / java_generator.js
   * -------------------------------------------------------------- */
  function getSubsystemOptions() {
    if (!state.subsystems.length) return [['(no subsystems)', 'NONE']];
    return state.subsystems.map(s => [s.name, s.id]);
  }

  function getMethodOptions(subsystemId, returnType) {
    const sub = state.subsystems.find(s => s.id === subsystemId);
    if (!sub) return [['(none)', 'NONE']];
    const methods = sub.methods.filter(m => m.returnType === returnType);
    if (!methods.length) return [['(no ' + returnType.toLowerCase() + ' methods)', 'NONE']];
    return methods.map(m => [m.name, m.name]);
  }

  function getSubsystemFieldName(subsystemId) {
    const sub = state.subsystems.find(s => s.id === subsystemId);
    if (!sub) return null;
    return 'm_' + camel(sub.name);
  }

  /* Command-function helpers — used by custom_blocks.js and java_generator.js. */
  function getCommandFunctionOptions() {
    if (!state.commandFunctions.length) return [['(no functions)', 'NONE']];
    return state.commandFunctions.map(f => [f.name, f.id]);
  }

  function getCommandFunctionName(id) {
    const fn = state.commandFunctions.find(f => f.id === id);
    return fn ? fn.name : null;
  }

  function getControllerOptions() {
    if (!state.controllers.length) return [['(no controllers)', 'NONE']];
    return state.controllers.map(c => [c.name, c.id]);
  }

  function getControllerFieldName(controllerId) {
    const ctrl = state.controllers.find(c => c.id === controllerId);
    if (!ctrl) return null;
    return 'm_' + camel(ctrl.name);
  }

  function getButtonOptions() {
    /* These are the standard CommandXboxController triggers. */
    return [
      ['a', 'a'], ['b', 'b'], ['x', 'x'], ['y', 'y'],
      ['leftBumper', 'leftBumper'], ['rightBumper', 'rightBumper'],
      ['leftTrigger', 'leftTrigger'], ['rightTrigger', 'rightTrigger'],
      ['back', 'back'], ['start', 'start'],
      ['leftStick', 'leftStick'], ['rightStick', 'rightStick'],
      ['povUp', 'povUp'], ['povRight', 'povRight'],
      ['povDown', 'povDown'], ['povLeft', 'povLeft']
    ];
  }

  /* ================================================================
   * CONFIGURATION VIEW
   * ================================================================ */
  function renderSubsystems() {
    const list = $('#subsystem-list');
    list.innerHTML = '';
    const empty = $('#subsystem-empty');
    if (state.subsystems.length === 0) {
      empty.classList.add('visible');
      return;
    }
    empty.classList.remove('visible');

    for (const sub of state.subsystems) {
      const card = document.createElement('div');
      card.className = 'subsystem-card';
      card.innerHTML = `
        <div class="subsystem-header">
          <div class="subsystem-icon">${pascal(sub.name).slice(0, 2).toUpperCase()}</div>
          <div class="subsystem-title">
            <input class="subsystem-name-input" data-id="${sub.id}" value="${escapeHtml(sub.name)}" spellcheck="false" />
            <div class="subsystem-meta">m_${escapeHtml(camel(sub.name))} · ${sub.methods.length} method${sub.methods.length===1?'':'s'}</div>
          </div>
          <button class="btn-icon subsystem-toggle" data-id="${sub.id}" title="Collapse">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <button class="btn-icon subsystem-delete" data-id="${sub.id}" title="Remove subsystem">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
        <div class="subsystem-body">
          <div class="method-list" data-sub="${sub.id}"></div>
          <button class="add-method-btn" data-id="${sub.id}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add method
          </button>
        </div>
      `;
      list.appendChild(card);

      const methodList = card.querySelector('.method-list');
      for (const m of sub.methods) {
        methodList.appendChild(buildMethodRow(sub.id, m));
      }
    }

    /* wire up handlers */
    $$('.subsystem-name-input', list).forEach(el => {
      el.addEventListener('input', e => {
        const sub = state.subsystems.find(s => s.id === e.target.dataset.id);
        if (!sub) return;
        sub.name = e.target.value;
        const meta = e.target.closest('.subsystem-header').querySelector('.subsystem-meta');
        meta.textContent = `m_${camel(sub.name)} · ${sub.methods.length} method${sub.methods.length===1?'':'s'}`;
        const icon = e.target.closest('.subsystem-header').querySelector('.subsystem-icon');
        icon.textContent = pascal(sub.name).slice(0, 2).toUpperCase();
        persist();
        rebuildToolbox();
        regenerateAll();
      });
    });

    $$('.subsystem-delete', list).forEach(el => {
      el.addEventListener('click', e => {
        const id = e.currentTarget.dataset.id;
        confirmModal('Remove subsystem', 'This will remove the subsystem and any blocks referencing it. Continue?', () => {
          state.subsystems = state.subsystems.filter(s => s.id !== id);
          persist();
          renderSubsystems();
          rebuildToolbox();
          regenerateAll();
          toast('Subsystem removed.');
        });
      });
    });

    $$('.add-method-btn', list).forEach(el => {
      el.addEventListener('click', e => {
        const sub = state.subsystems.find(s => s.id === e.currentTarget.dataset.id);
        if (!sub) return;
        sub.methods.push({ id: uid(), name: 'newMethod', returnType: 'Command' });
        persist();
        renderSubsystems();
        rebuildToolbox();
      });
    });
  }

  function buildMethodRow(subId, method) {
    const row = document.createElement('div');
    row.className = 'method-row';
    row.innerHTML = `
      <select data-method="${method.id}" data-sub="${subId}" data-field="returnType">
        <option value="Command" ${method.returnType==='Command'?'selected':''}>Supplier&lt;Command&gt;</option>
        <option value="Boolean" ${method.returnType==='Boolean'?'selected':''}>Supplier&lt;Boolean&gt;</option>
      </select>
      <input type="text" data-method="${method.id}" data-sub="${subId}" data-field="name" value="${escapeHtml(method.name)}" placeholder="methodName" spellcheck="false">
      <span class="type-badge" style="background:${method.returnType==='Boolean'?'rgba(77,132,212,0.12)':'rgba(39,166,146,0.12)'};color:${method.returnType==='Boolean'?'#4d84d4':'#27a692'};border:1px solid ${method.returnType==='Boolean'?'rgba(77,132,212,0.3)':'rgba(39,166,146,0.3)'};">${method.returnType==='Boolean'?'BOOL':'CMD'}</span>
      <button class="btn-icon" data-method="${method.id}" data-sub="${subId}" data-field="delete" title="Remove method">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;

    row.querySelectorAll('select, input').forEach(el => {
      el.addEventListener('change', updateMethod);
      el.addEventListener('input', updateMethod);
    });
    row.querySelector('[data-field="delete"]').addEventListener('click', e => {
      const subId = e.currentTarget.dataset.sub;
      const methodId = e.currentTarget.dataset.method;
      const sub = state.subsystems.find(s => s.id === subId);
      if (!sub) return;
      sub.methods = sub.methods.filter(m => m.id !== methodId);
      persist();
      renderSubsystems();
      rebuildToolbox();
      regenerateAll();
    });
    return row;
  }

  function updateMethod(e) {
    const subId = e.target.dataset.sub;
    const methodId = e.target.dataset.method;
    const field = e.target.dataset.field;
    const sub = state.subsystems.find(s => s.id === subId);
    if (!sub) return;
    const method = sub.methods.find(m => m.id === methodId);
    if (!method) return;
    method[field] = e.target.value;
    persist();
    /* Update the badge inline without full re-render to avoid losing focus. */
    if (field === 'returnType') {
      renderSubsystems();
    } else {
      rebuildToolbox();
      regenerateAll();
    }
  }

  /* ---- controllers (Configure tab) ---- */
  function renderControllers() {
    const list = $('#controller-list');
    list.innerHTML = '';
    for (const ctrl of state.controllers) {
      const card = document.createElement('div');
      card.className = 'controller-card';
      card.innerHTML = `
        <div class="controller-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 12H2a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h0M22 12h0a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-1M6 19h12a4 4 0 0 0 4-4V9a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v6a4 4 0 0 0 4 4z"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/></svg>
        </div>
        <div class="controller-info">
          <input type="text" data-id="${ctrl.id}" data-field="name" value="${escapeHtml(ctrl.name)}" spellcheck="false">
          <select data-id="${ctrl.id}" data-field="type">
            <option value="CommandXboxController" ${ctrl.type==='CommandXboxController'?'selected':''}>Xbox · port ${ctrl.port}</option>
            <option value="CommandPS5Controller" ${ctrl.type==='CommandPS5Controller'?'selected':''}>PS5 · port ${ctrl.port}</option>
            <option value="CommandJoystick" ${ctrl.type==='CommandJoystick'?'selected':''}>Joystick · port ${ctrl.port}</option>
          </select>
        </div>
        <button class="btn-icon" data-id="${ctrl.id}" data-action="port" title="Change port">
          <span style="font-family:var(--font-mono);font-size:11px;">:${ctrl.port}</span>
        </button>
        <button class="btn-icon controller-delete" data-id="${ctrl.id}" title="Remove controller">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;
      list.appendChild(card);

      card.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('change', updateController);
        el.addEventListener('input', updateController);
      });
      card.querySelector('[data-action="port"]').addEventListener('click', e => {
        const id = e.currentTarget.dataset.id;
        const ctrl = state.controllers.find(c => c.id === id);
        if (!ctrl) return;
        const next = prompt('Driver Station port (0–5)', ctrl.port);
        if (next === null) return;
        const n = parseInt(next, 10);
        if (isNaN(n) || n < 0 || n > 5) { toast('Port must be 0–5.', 'error'); return; }
        ctrl.port = n;
        persist();
        renderControllers();
        regenerateAll();
      });
      card.querySelector('.controller-delete').addEventListener('click', e => {
        const id = e.currentTarget.dataset.id;
        confirmModal('Remove controller', 'This will remove the controller and all its binding blocks. Continue?', () => {
          state.controllers = state.controllers.filter(c => c.id !== id);
          /* If we were editing this controller, switch to another. */
          if (state.activeControllerId === id) {
            state.activeControllerId = state.controllers[0]?.id ?? null;
            state.editMode = 'binding';
            if (workspace) loadActiveContext();
          }
          persist();
          renderControllers();
          renderControllerTabs();
          regenerateAll();
        });
      });
    }
  }

  function updateController(e) {
    const id = e.target.dataset.id;
    const field = e.target.dataset.field;
    const ctrl = state.controllers.find(c => c.id === id);
    if (!ctrl) return;
    ctrl[field] = e.target.value;
    persist();
    if (field === 'name') {
      renderControllers();
      renderControllerTabs();
    }
    regenerateAll();
  }

  /* ================================================================
   * CONTROLLER TABS (Build sidebar)
   * Each controller maps to one canvas that holds all its binding blocks.
   * ================================================================ */
  function renderControllerTabs() {
    const list = $('#controller-tabs');
    if (!list) return;
    list.innerHTML = '';

    if (state.controllers.length === 0) {
      list.innerHTML = '<div style="color:var(--fg-mute);padding:12px;font-size:12px;text-align:center;">No controllers.<br>Add one in Configure.</div>';
    } else {
      for (const ctrl of state.controllers) {
        const isActive = state.editMode === 'binding' && ctrl.id === state.activeControllerId;
        const tab = document.createElement('button');
        tab.className = 'binding-tab' + (isActive ? ' active' : '');
        tab.dataset.id = ctrl.id;
        tab.innerHTML = `
          <div class="binding-tab-name">${escapeHtml(ctrl.name)}</div>
          <div class="binding-tab-trigger">m_${escapeHtml(camel(ctrl.name))} · ${ctrl.type.replace('Command', '')} · port ${ctrl.port}</div>
        `;
        tab.addEventListener('click', () => switchToController(ctrl.id));
        list.appendChild(tab);
      }
    }

    /* Update the toolbar header */
    if (state.editMode === 'function' && state.activeFunctionId) {
      const fn = state.commandFunctions.find(f => f.id === state.activeFunctionId);
      if (fn) {
        $('#bbi-label-1').textContent = 'Function';
        $('#bbi-name').textContent = fn.name || '(unnamed)';
        $('#bbi-label-2').textContent = 'Signature';
        $('#bbi-trigger').textContent = `public Command ${camel(fn.name)}()`;
        $('#bbi-name').onclick = () => renameFunctionModal(fn.id);
        $('#bbi-trigger').onclick = () => renameFunctionModal(fn.id);
        $('#bbi-name').style.cursor = 'pointer';
        $('#bbi-trigger').style.cursor = 'pointer';
      }
    } else {
      const ctrl = state.controllers.find(c => c.id === state.activeControllerId);
      if (ctrl) {
        $('#bbi-label-1').textContent = 'Controller';
        $('#bbi-name').textContent = ctrl.name;
        $('#bbi-label-2').textContent = 'Type';
        $('#bbi-trigger').textContent = `m_${camel(ctrl.name)} · ${ctrl.type.replace('Command', '')} · port ${ctrl.port}`;
        $('#bbi-name').onclick = null;
        $('#bbi-trigger').onclick = null;
        $('#bbi-name').style.cursor = '';
        $('#bbi-trigger').style.cursor = '';
      } else {
        $('#bbi-name').textContent = '—';
        $('#bbi-trigger').textContent = 'Select a controller or function to edit';
      }
    }
  }

  function switchToController(id) {
    saveCurrentContext();
    state.editMode = 'binding';
    state.activeControllerId = id;
    state.activeFunctionId = null;
    loadActiveContext();
    renderControllerTabs();
    renderFunctionTabs();
    rebuildToolbox();
    persist();
    regenerateAll();
  }

  /* ----------------------------------------------------------------
   * Command Function tabs (Build sidebar)
   * -------------------------------------------------------------- */
  function renderFunctionTabs() {
    const list = $('#function-tabs');
    if (!list) return;
    list.innerHTML = '';

    if (state.commandFunctions.length === 0) {
      list.innerHTML = '<div style="color:var(--fg-mute);padding:12px;font-size:12px;text-align:center;">No functions yet.<br>Create one to start composing.</div>';
      return;
    }

    for (const fn of state.commandFunctions) {
      const isActive = state.editMode === 'function' && fn.id === state.activeFunctionId;
      const tab = document.createElement('button');
      tab.className = 'binding-tab' + (isActive ? ' active' : '');
      tab.dataset.id = fn.id;
      tab.innerHTML = `
        <div class="binding-tab-name">${escapeHtml(fn.name || 'unnamed')}</div>
        <div class="binding-tab-trigger">public Command ${escapeHtml(camel(fn.name))}()</div>
        <span class="binding-tab-delete" data-id="${fn.id}" title="Delete function">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </span>
      `;
      tab.addEventListener('click', e => {
        if (e.target.closest('.binding-tab-delete')) return;
        switchToFunction(fn.id);
      });
      tab.querySelector('.binding-tab-delete').addEventListener('click', e => {
        e.stopPropagation();
        deleteCommandFunction(fn.id);
      });
      list.appendChild(tab);
    }
  }

  function newCommandFunction() {
    const n = state.commandFunctions.length + 1;
    const fn = {
      id: uid(),
      name: `commandFunction${n}`,
      blocklyXml: null
    };
    state.commandFunctions.push(fn);
    persist();
    rebuildToolbox();
    /* Switch into the new function so the user can immediately compose it. */
    switchToFunction(fn.id);
    toast('Function created — compose its body in the canvas.');
  }

  function deleteCommandFunction(id) {
    confirmModal('Delete function', 'This will remove the command function and its blocks. Existing call-blocks in bindings will fall back to Commands.none(). Continue?', () => {
      state.commandFunctions = state.commandFunctions.filter(f => f.id !== id);
      /* If we were editing this function, fall back to binding mode. */
      if (state.editMode === 'function' && state.activeFunctionId === id) {
        state.editMode = 'binding';
        state.activeFunctionId = null;
        if (workspace) loadActiveContext();
      }
      persist();
      renderControllerTabs();
      renderFunctionTabs();
      rebuildToolbox();
      regenerateAll();
      toast('Function removed.');
    });
  }

  function renameFunctionModal(id) {
    const fn = state.commandFunctions.find(f => f.id === id);
    if (!fn) return;
    showModal(`
      <h3 class="modal-title">Rename function</h3>
      <p class="modal-desc">This changes the generated method name. Update any call-sites in your robot code.</p>
      <div class="form-grid" style="grid-template-columns:1fr;">
        <label class="field">
          <span>Function name</span>
          <input type="text" id="m-fn-name" value="${escapeHtml(fn.name)}" spellcheck="false">
        </label>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="m-cancel">Cancel</button>
        <button class="btn btn-primary" id="m-save">Save</button>
      </div>
    `);
    $('#m-cancel').addEventListener('click', closeModal);
    $('#m-save').addEventListener('click', () => {
      fn.name = $('#m-fn-name').value.trim() || fn.name;
      persist();
      renderControllerTabs();
      renderFunctionTabs();
      rebuildToolbox();
      regenerateAll();
      closeModal();
    });
  }

  function switchToFunction(id) {
    saveCurrentContext();
    state.editMode = 'function';
    state.activeFunctionId = id;
    loadActiveContext();
    renderControllerTabs();
    renderFunctionTabs();
    rebuildToolbox();
    persist();
    regenerateAll();
  }

  /* ================================================================
   * BLOCKLY WORKSPACE
   * ================================================================ */
  let workspace = null;

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
      const labelDom = this.rowDiv_.getElementsByClassName(
        'blocklyToolboxCategoryLabel'
      )[0];
      if (isSelected) {
        this.rowDiv_.classList.add('frcToolboxCategorySelected');
        if (labelDom) labelDom.style.color = '#0a0c10';
      } else {
        this.rowDiv_.classList.remove('frcToolboxCategorySelected');
        if (labelDom) labelDom.style.color = '';
      }
      Blockly.utils.aria.setState(
        this.htmlDiv_,
        Blockly.utils.aria.State.SELECTED,
        isSelected
      );
    }
  }

  /* Register our subclass as the default toolbox category. The
   * `true` final arg means we are overriding an existing
   * registration, not adding a new one. */
  Blockly.registry.register(
    Blockly.registry.Type.TOOLBOX_ITEM,
    Blockly.ToolboxCategory.registrationName,
    FRCToolboxCategory,
    /* opt_allowOverrides */ true
  );

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
      frc_trigger_blocks:   { colourPrimary: '#c9882e', colourSecondary: '#a86e24', colourTertiary: '#82541b' },
      frc_sequence_blocks:  { colourPrimary: '#4570c0', colourSecondary: '#37599c', colourTertiary: '#2b4679' },
      frc_parallel_blocks:  { colourPrimary: '#7850b5', colourSecondary: '#5e3f92', colourTertiary: '#473070' },
      frc_race_blocks:      { colourPrimary: '#bf6450', colourSecondary: '#9e4f3e', colourTertiary: '#7a3c2e' },
      frc_deadline_blocks:  { colourPrimary: '#a86e25', colourSecondary: '#87571d', colourTertiary: '#664115' },
      frc_command_blocks:   { colourPrimary: '#27a692', colourSecondary: '#1f8574', colourTertiary: '#156356' },
      frc_decorator_blocks: { colourPrimary: '#8460cc', colourSecondary: '#6849a6', colourTertiary: '#4e3680' },
      frc_condition_blocks: { colourPrimary: '#4d84d4', colourSecondary: '#3b6aaa', colourTertiary: '#2c5082' },
      frc_boolean_blocks:   { colourPrimary: '#459857', colourSecondary: '#367a45', colourTertiary: '#275c34' }
    };
    return Blockly.Theme.defineTheme('blockly-frc', {
      base: Blockly.Themes.Classic,
      blockStyles: blockStyles,
      categoryStyles: {
        frc_composition_category:  { colour: blockStyles.frc_sequence_blocks.colourPrimary },
        frc_commands_category:     { colour: blockStyles.frc_command_blocks.colourPrimary },
        frc_decorators_category:   { colour: blockStyles.frc_decorator_blocks.colourPrimary },
        frc_conditions_category:   { colour: blockStyles.frc_condition_blocks.colourPrimary },
        frc_functions_category:    { colour: blockStyles.frc_command_blocks.colourPrimary }
      },
      componentStyles: {
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
      },
      fontStyle: {
        family: 'JetBrains Mono, monospace',
        weight: '500',
        size: 12
      }
    });
  }

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
  function toolboxDefinition() {
    return {
      kind: 'categoryToolbox',
      contents: [
        {
          kind: 'category',
          name: 'Bindings',
          categorystyle: 'frc_composition_category',
          contents: [
            { kind: 'block', type: 'frc_controller_binding' }
          ]
        },
        {
          kind: 'category',
          name: 'Composition',
          categorystyle: 'frc_composition_category',
          contents: [
            { kind: 'block', type: 'frc_sequence' },
            { kind: 'block', type: 'frc_parallel' },
            { kind: 'block', type: 'frc_race' },
            { kind: 'block', type: 'frc_deadline' }
          ]
        },
        {
          kind: 'category',
          name: 'Subsystem Commands',
          categorystyle: 'frc_commands_category',
          custom: 'FRC_SUBSYSTEM_COMMANDS'
        },
        {
          kind: 'category',
          name: 'Command Functions',
          categorystyle: 'frc_functions_category',
          custom: 'FRC_COMMAND_FUNCTIONS'
        },
        {
          kind: 'category',
          name: 'Built-in Commands',
          categorystyle: 'frc_commands_category',
          contents: [
            { kind: 'block', type: 'frc_runonce' },
            { kind: 'block', type: 'frc_run' },
            { kind: 'block', type: 'frc_wait_seconds' },
            { kind: 'block', type: 'frc_wait_until' },
            { kind: 'block', type: 'frc_print' },
            { kind: 'block', type: 'frc_none' }
          ]
        },
        {
          kind: 'category',
          name: 'Decorators',
          categorystyle: 'frc_decorators_category',
          contents: [
            { kind: 'block', type: 'frc_with_timeout' },
            { kind: 'block', type: 'frc_until' },
            { kind: 'block', type: 'frc_unless' },
            { kind: 'block', type: 'frc_only_while' },
            { kind: 'block', type: 'frc_repeat' },
            { kind: 'block', type: 'frc_as_proxy' },
            { kind: 'block', type: 'frc_either' }
          ]
        },
        {
          kind: 'category',
          name: 'Subsystem Conditions',
          categorystyle: 'frc_conditions_category',
          custom: 'FRC_SUBSYSTEM_CONDITIONS'
        },
        {
          kind: 'category',
          name: 'Logic',
          categorystyle: 'frc_conditions_category',
          contents: [
            { kind: 'block', type: 'frc_trigger_state' },
            { kind: 'block', type: 'frc_bool_not' },
            { kind: 'block', type: 'frc_bool_combine' },
            { kind: 'block', type: 'frc_bool_literal' }
          ]
        }
      ]
    };
  }

  /* ----------------------------------------------------------------
   * Dynamic toolbox callbacks
   *
   * These are the heart of the live-configuration story. When the
   * user opens "Subsystem Commands", Blockly calls our callback,
   * which emits one pre-populated frc_subsystem_command block per
   * (subsystem, command-method) pair. Same for boolean methods.
   * No manual toolbox refresh needed — opening the flyout
   * re-runs the callback against the current state.
   * -------------------------------------------------------------- */
  function subsystemCommandsFlyout(_workspace) {
    const blocks = [];
    for (const sub of state.subsystems) {
      const cmdMethods = sub.methods.filter(m => m.returnType === 'Command');
      for (const m of cmdMethods) {
        blocks.push({
          kind: 'block',
          type: 'frc_subsystem_command',
          fields: { SUBSYSTEM: sub.id, METHOD: m.name }
        });
      }
    }
    if (blocks.length === 0) {
      blocks.push({
        kind: 'label',
        text: 'Define subsystem methods first',
        'web-class': 'frcEmptyFlyoutLabel'
      });
    } else {
      blocks.push({
        kind: 'label',
        text: '— or use the generic block —',
        'web-class': 'frcEmptyFlyoutLabel'
      });
      blocks.push({ kind: 'block', type: 'frc_subsystem_command' });
    }
    return blocks;
  }

  function subsystemConditionsFlyout(_workspace) {
    const blocks = [];
    for (const sub of state.subsystems) {
      const boolMethods = sub.methods.filter(m => m.returnType === 'Boolean');
      for (const m of boolMethods) {
        blocks.push({
          kind: 'block',
          type: 'frc_subsystem_boolean',
          fields: { SUBSYSTEM: sub.id, METHOD: m.name }
        });
      }
    }
    if (blocks.length === 0) {
      blocks.push({
        kind: 'label',
        text: 'Define a Boolean-returning method first',
        'web-class': 'frcEmptyFlyoutLabel'
      });
    } else {
      blocks.push({
        kind: 'label',
        text: '— or use the generic block —',
        'web-class': 'frcEmptyFlyoutLabel'
      });
      blocks.push({ kind: 'block', type: 'frc_subsystem_boolean' });
    }
    return blocks;
  }

  /* Command functions flyout — one pre-populated frc_command_function
   * block per defined function. Hides the currently-edited function to
   * prevent direct self-reference in the block canvas. */
  function commandFunctionsFlyout(_workspace) {
    const blocks = [];
    for (const fn of state.commandFunctions) {
      /* Hide the function currently open in the editor so users can't
       * accidentally build a direct infinite-loop call. */
      if (state.editMode === 'function' && fn.id === state.activeFunctionId) continue;
      blocks.push({
        kind: 'block',
        type: 'frc_command_function',
        fields: { FUNCTION: fn.id }
      });
    }
    if (blocks.length === 0) {
      blocks.push({
        kind: 'label',
        text: 'Create functions via Build → New Function',
        'web-class': 'frcEmptyFlyoutLabel'
      });
    }
    return blocks;
  }

  function registerDynamicCategories() {
    if (!workspace) return;
    workspace.registerToolboxCategoryCallback(
      'FRC_SUBSYSTEM_COMMANDS', subsystemCommandsFlyout
    );
    workspace.registerToolboxCategoryCallback(
      'FRC_SUBSYSTEM_CONDITIONS', subsystemConditionsFlyout
    );
    workspace.registerToolboxCategoryCallback(
      'FRC_COMMAND_FUNCTIONS', commandFunctionsFlyout
    );
  }

  function initBlockly() {
    workspace = Blockly.inject('blockly-area', {
      toolbox: toolboxDefinition(),
      theme: blocklyTheme(),
      grid: {
        spacing: 24,
        length: 1,
        colour: '#1a1f2c',
        snap: true
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 0.95,
        maxScale: 2,
        minScale: 0.4,
        scaleSpeed: 1.1
      },
      trashcan: true,
      renderer: 'thrasos',
      sounds: false
    });

    registerDynamicCategories();
    workspace.addChangeListener(onWorkspaceChange);
  }

  function onWorkspaceChange(e) {
    if (e.isUiEvent) return;
    if (e.type === Blockly.Events.FINISHED_LOADING) return;
    /* Save & regenerate on each meaningful change. */
    persist();
    regenerateAll();
  }

  /* No-op kept for backward compatibility with existing call sites.
   * With dynamic categories, we don't need to rebuild the toolbox
   * when subsystem state changes — the next time the user opens a
   * dynamic flyout, the callback runs against fresh state.
   * However if the open flyout happens to be one of our dynamic
   * categories, refreshSelection() re-runs the callback so the user
   * sees the change immediately. This matches what the built-in
   * variables/procedures categories do. */
  function rebuildToolbox() {
    if (!workspace) return;
    const toolbox = workspace.getToolbox();
    if (toolbox && typeof toolbox.refreshSelection === 'function') {
      toolbox.refreshSelection();
    }
  }

  /* Load whatever is currently active (a controller canvas or a command
   * function) into the shared Blockly workspace. */
  function loadActiveContext() {
    if (!workspace) return;
    workspace.clear();

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

  /* Kept for internal call-sites. */
  function loadBindingIntoWorkspace() { loadActiveContext(); }

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

  /* ================================================================
   * CODE GENERATION & PREVIEW
   * ================================================================ */

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

  /* Builds a PadCrafter URL from binding blocks across all controller
   * workspaces. Each controller becomes a separate template/profile. */
  function generatePadCrafterUrl(allBindingData) {
    if (!state.controllers.length) return null;

    const BUTTON_MAP = {
      a: 'aButton', b: 'bButton', x: 'xButton', y: 'yButton',
      leftBumper: 'leftBumper',   rightBumper: 'rightBumper',
      leftTrigger: 'leftTrigger', rightTrigger: 'rightTrigger',
      back: 'backButton', start: 'startButton',
      leftStick: 'leftStickClick', rightStick: 'rightStickClick',
      povUp: 'dpadUp', povRight: 'dpadRight', povDown: 'dpadDown', povLeft: 'dpadLeft'
    };
    const EDGE_PREFIX = {
      onTrue: '', whileTrue: '(Hold) ', onFalse: '(Release) ',
      toggleOnTrue: '(Toggle) ', whileFalse: '(While Released) '
    };

    const ctrlCount = state.controllers.length;
    const buttonActions = {};
    for (const { ctrl, lines } of allBindingData) {
      const ctrlIndex = state.controllers.indexOf(ctrl);
      for (const { name, button, edge } of lines) {
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

  /* Generates the full Commands.java for ALL controllers and functions. */
  function generateFullJava() {
    /* ── Binding lines from every controller workspace ───────────── */
    const allBindingData = [];   /* [{ ctrl, lines: [{name,button,edge,expr}] }] */
    for (const ctrl of state.controllers) {
      let lines;
      if (state.editMode === 'binding' && ctrl.id === state.activeControllerId && workspace) {
        lines = BlocklyFRC.generateControllerBindingLines(workspace);
      } else {
        lines = renderBindingLinesFromXml(ctrl);
      }
      allBindingData.push({ ctrl, lines });
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
      functionExprs.push({ fn, expr });
    }

    const pkg = state.project.packageName || 'frc.robot';
    const cls = pascal(state.project.className || 'Commands');

    const subsystemImports = state.subsystems.map(s => `import ${pkg}.subsystems.${pascal(s.name)};`);

    /* Constructor dependency injection: fields are declared without
     * initializers; the caller (RobotContainer) passes instances in. */
    const subsystemFields = state.subsystems.map(s => {
      const T = pascal(s.name);
      const f = camel(s.name);
      return `  private final ${T} m_${f};`;
    });

    /* Constructor parameter list: (Drivetrain drivetrain, Arm arm, …) */
    const constructorParams = state.subsystems.map(s => {
      const T = pascal(s.name);
      const f = camel(s.name);
      return `${T} ${f}`;
    }).join(', ');

    /* Assignments inside the constructor body. */
    const subsystemAssignments = state.subsystems.map(s => {
      const f = camel(s.name);
      return `    this.m_${f} = ${f};`;
    }).join('\n');

    const controllerImports = uniq(state.controllers.map(c =>
      `import edu.wpi.first.wpilibj2.command.button.${c.type};`
    ));
    const controllerFields = state.controllers.map(c => {
      const T = c.type;
      const f = camel(c.name);
      return `  private final ${T} m_${f} = new ${T}(${c.port});`;
    });

    /* Format each binding line: // name\n    m_ctrl.button().edge(\n        expr\n    ); */
    const bindingLines = [];
    for (const { ctrl, lines } of allBindingData) {
      const ctrlName = camel(ctrl.name);
      for (const { name, button, edge, expr } of lines) {
        bindingLines.push(
          `    // ${name}\n    m_${ctrlName}.${button}().${edge}(\n        ${indentExprFor(expr, 8)}\n    );`
        );
      }
    }

    /* Build the command-function method declarations. */
    const functionMethods = functionExprs.map(({ fn, expr }) => {
      const methodName = camel(fn.name);
      return `  /** Composed command: ${fn.name} */\n  public Command ${methodName}() {\n    return ${indentExprFor(expr, 4)};\n  }`;
    });

    const padCrafterUrl = generatePadCrafterUrl(allBindingData);
    const padCrafterLine = padCrafterUrl
      ? ` * Controller mapping: ${padCrafterUrl}\n *\n`
      : '';

    /* Format the constructor signature. When the param list is long,
     * break each parameter onto its own indented line. */
    const paramsFormatted = (() => {
      if (!constructorParams) return '';
      const params = state.subsystems.map(s => `${pascal(s.name)} ${camel(s.name)}`);
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

  /* Indent every line of `s` except the first. */
  function indentExprFor(s, n) {
    const pad = ' '.repeat(n);
    return s.split('\n').map((line, idx) => idx === 0 ? line : pad + line.replace(/^\s+/, pad)).join('\n').replace(new RegExp(`\\n${pad}${pad}`, 'g'), `\n${pad}`);
  }

  function uniq(arr) { return Array.from(new Set(arr)); }

  function regenerateAll() {
    const preview = $('#binding-preview-code');

    if (state.editMode === 'function' && workspace) {
      /* Show the function's command expression. */
      const expr = BlocklyFRC.generateJavaExpression(workspace);
      if (expr) {
        preview.classList.add('hljs');
        preview.innerHTML = highlightJava(expr);
      } else {
        preview.classList.remove('hljs');
        preview.textContent = '// Compose a command to see the generated Java.';
      }
    } else if (workspace && state.activeControllerId) {
      /* Show all binding lines for the active controller. */
      const ctrl = state.controllers.find(c => c.id === state.activeControllerId);
      if (ctrl) {
        const lines = BlocklyFRC.generateControllerBindingLines(workspace);
        const ctrlName = camel(ctrl.name);
        const formatted = lines.map(({ name, button, edge, expr }) =>
          `// ${name}\nm_${ctrlName}.${button}().${edge}(\n    ${expr}\n);`
        );
        const previewText = formatted.join('\n\n');
        if (previewText) {
          preview.classList.add('hljs');
          preview.innerHTML = highlightJava(previewText);
        } else {
          preview.classList.remove('hljs');
          preview.textContent = '// Drag binding blocks onto the canvas to compose commands.';
        }
      }
    } else {
      preview.classList.remove('hljs');
      preview.textContent = '// Select a controller or function to start.';
    }

    /* Update the export view. */
    const full = generateFullJava();
    const fullEl = $('#full-code-output');
    fullEl.classList.add('hljs');
    fullEl.innerHTML = highlightJava(full);
  }

  /* Java syntax highlighting via highlight.js. The library is loaded
   * from a CDN in index.html. We call hljs.highlight() directly rather
   * than using highlightElement() because we manage innerHTML ourselves
   * and want to avoid hljs's "already highlighted" guard. */
  function highlightJava(src) {
    if (typeof hljs !== 'undefined' && hljs.getLanguage && hljs.getLanguage('java')) {
      try {
        return hljs.highlight(src, { language: 'java', ignoreIllegals: true }).value;
      } catch (e) {
        console.warn('hljs highlight failed', e);
      }
    }
    /* Fallback: escape and return plain text if hljs is unavailable. */
    return src
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /* ================================================================
   * UI WIRING
   * ================================================================ */
  function switchView(name) {
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === name));
    $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));

    /* When entering builder, init Blockly if needed. */
    if (name === 'build') {
      if (!workspace) {
        initBlockly();
        loadBindingIntoWorkspace();
      } else {
        /* Trigger resize so blocks render correctly. */
        setTimeout(() => Blockly.svgResize(workspace), 50);
      }
    }
    if (name === 'export') {
      regenerateAll();
    }
  }

  /* ---- modal ---- */
  function showModal(html) {
    const m = $('#modal-backdrop');
    $('#modal-content').innerHTML = html;
    m.classList.add('visible');
  }
  function closeModal() {
    $('#modal-backdrop').classList.remove('visible');
  }
  function confirmModal(title, desc, onConfirm) {
    showModal(`
      <h3 class="modal-title">${escapeHtml(title)}</h3>
      <p class="modal-desc">${escapeHtml(desc)}</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="m-cancel">Cancel</button>
        <button class="btn btn-danger" id="m-confirm">Confirm</button>
      </div>
    `);
    $('#m-cancel').addEventListener('click', closeModal);
    $('#m-confirm').addEventListener('click', () => { closeModal(); onConfirm(); });
  }

  /* ---- toast ---- */
  let toastTimer = null;
  function toast(msg, kind = 'ok') {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('toast-error', kind === 'error');
    t.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('visible'), 2400);
  }

  /* ---- HTML escape ---- */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  }

  /* ---- import / export project ---- */
  function exportProject() {
    persist();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blockly-frc-${pascal(state.project.className)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Project saved.');
  }

  function importProject() {
    $('#file-input').click();
  }

  function handleFileImport(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const loaded = JSON.parse(e.target.result);
        Object.assign(state, loaded);
        persist();
        renderSubsystems();
        renderControllers();
        renderControllerTabs();
        renderFunctionTabs();
        $('#cfg-package').value = state.project.packageName;
        $('#cfg-classname').value = state.project.className;
        $('#cfg-team').value = state.project.teamNumber || '';
        if (workspace) {
          loadBindingIntoWorkspace();
          rebuildToolbox();
        }
        regenerateAll();
        toast('Project loaded.');
      } catch (err) {
        toast('Could not parse that file.', 'error');
        console.error(err);
      }
    };
    reader.readAsText(file);
  }

  /* ---- copy / download ---- */
  function copyFullCode() {
    const text = generateFullJava();
    navigator.clipboard.writeText(text).then(
      () => toast('Java copied to clipboard.'),
      () => toast('Copy failed — your browser blocked it.', 'error')
    );
  }

  function downloadFullCode() {
    const text = generateFullJava();
    const blob = new Blob([text], { type: 'text/x-java-source' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = pascal(state.project.className) + '.java';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* ================================================================
   * BOOT
   * ================================================================ */
  function boot() {
    if (!restore()) seedDefaults();

    /* tabs */
    $$('.tab').forEach(t => t.addEventListener('click', () => switchView(t.dataset.view)));

    /* config view */
    $('#add-subsystem').addEventListener('click', () => {
      const n = state.subsystems.length + 1;
      state.subsystems.push({
        id: uid(),
        name: `Subsystem${n}`,
        methods: [{ id: uid(), name: 'doThing', returnType: 'Command' }]
      });
      persist();
      renderSubsystems();
      rebuildToolbox();
    });

    $('#add-controller').addEventListener('click', () => {
      const usedPorts = new Set(state.controllers.map(c => c.port));
      let port = 0;
      while (usedPorts.has(port) && port < 6) port++;
      const newCtrl = {
        id: uid(),
        name: `controller${state.controllers.length + 1}`,
        port,
        type: 'CommandXboxController',
        blocklyXml: null
      };
      state.controllers.push(newCtrl);
      /* Auto-select the new controller if nothing is active. */
      if (!state.activeControllerId) state.activeControllerId = newCtrl.id;
      persist();
      renderControllers();
      renderControllerTabs();
    });

    $('#cfg-package').value = state.project.packageName;
    $('#cfg-classname').value = state.project.className;
    $('#cfg-team').value = state.project.teamNumber || '';

    $('#cfg-package').addEventListener('input', e => { state.project.packageName = e.target.value; persist(); regenerateAll(); });
    $('#cfg-classname').addEventListener('input', e => { state.project.className = e.target.value; persist(); regenerateAll(); });
    $('#cfg-team').addEventListener('input', e => { state.project.teamNumber = e.target.value; persist(); });

    /* builder view */
    $('#add-function').addEventListener('click', () => {
      if (!workspace) { switchView('build'); }
      newCommandFunction();
    });
    $('#btn-clear-blocks').addEventListener('click', () => {
      if (!workspace) return;
      const label = state.editMode === 'function' ? 'function' : 'controller canvas';
      confirmModal('Clear canvas', `Remove all blocks from this ${label}?`, () => {
        workspace.clear();
        if (state.editMode === 'function') seedRootBlock();
        else seedBindingBlock();
        regenerateAll();
        persist();
      });
    });
    $('#btn-preview').addEventListener('click', () => switchView('export'));

    /* export view */
    $('#btn-copy-code').addEventListener('click', copyFullCode);
    $('#btn-download-code').addEventListener('click', downloadFullCode);

    /* topbar */
    $('#btn-export-json').addEventListener('click', exportProject);
    $('#btn-import').addEventListener('click', importProject);
    $('#file-input').addEventListener('change', e => {
      if (e.target.files[0]) handleFileImport(e.target.files[0]);
      e.target.value = '';
    });

    /* modal backdrop click */
    $('#modal-backdrop').addEventListener('click', e => {
      if (e.target === $('#modal-backdrop')) closeModal();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });

    /* Ensure active controller is valid after restore. */
    if (!state.controllers.find(c => c.id === state.activeControllerId)) {
      state.activeControllerId = state.controllers[0]?.id ?? null;
    }

    /* initial render */
    renderSubsystems();
    renderControllers();
    renderControllerTabs();
    renderFunctionTabs();
    regenerateAll();
  }

  /* expose helpers for blocks/generator modules */
  return {
    boot,
    getSubsystemOptions,
    getMethodOptions,
    getSubsystemFieldName,
    getControllerOptions,
    getControllerFieldName,
    getButtonOptions,
    getCommandFunctionOptions,
    getCommandFunctionName
  };
})();

/* boot once everything is loaded */
window.addEventListener('DOMContentLoaded', BlocklyFRC.boot);
