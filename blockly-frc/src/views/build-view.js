/* ================================================================
 * Blockly for FRC — Build view
 * Developed by FRC 2789 (Texplosion)
 *
 * Renders the Build sidebar: controller tabs (one per controller),
 * command-function tabs, and the modal flows for creating, deleting,
 * and renaming command functions. Exposes its entry points on
 * the BlocklyFRC namespace so the rest of the app can trigger them.
 * ================================================================ */

(function () {
    'use strict';

    /* ================================================================
     * CONTROLLER TABS (Build sidebar)
     * Each controller maps to one canvas that holds all its binding blocks.
     * ================================================================ */
    function renderControllerTabs() {
        const list = BlocklyFRC.$('#controller-tabs');
        if (!list) return;
        list.innerHTML = '';

        const state = BlocklyFRC.state;
        if (!state || !state.controllers.length) {
            list.innerHTML = '<div style="color:var(--fg-mute);padding:12px;font-size:12px;text-align:center;">No controllers.<br>Add one in Configure.</div>';
        } else {
            for (const ctrl of state.controllers) {
                const isActive = state.editMode === 'binding' && ctrl.id === state.activeControllerId;
                const tab = document.createElement('button');
                tab.className = 'binding-tab' + (isActive ? ' active' : '');
                tab.dataset.id = ctrl.id;
                tab.innerHTML = `
          <div class="binding-tab-name">${BlocklyFRC.escapeHtml(ctrl.name)}</div>
          <div class="binding-tab-trigger">m_${BlocklyFRC.escapeHtml(BlocklyFRC.camel(ctrl.name))} · ${ctrl.type.replace('Command', '')} · port ${ctrl.port}</div>
        `;
                tab.addEventListener('click', () => switchToController(ctrl.id));
                list.appendChild(tab);
            }
        }

        /* Update the toolbar header */
        if (state.editMode === 'function' && state.activeFunctionId) {
            const fn = state.commandFunctions.find(f => f.id === state.activeFunctionId);
            if (fn) {
                BlocklyFRC.$('#bbi-label-1').textContent = 'Function';
                BlocklyFRC.$('#bbi-name').textContent = fn.name || '(unnamed)';
                BlocklyFRC.$('#bbi-label-2').textContent = 'Signature';
                BlocklyFRC.$('#bbi-trigger').textContent = `public Command ${BlocklyFRC.camel(fn.name)}()`;
                BlocklyFRC.$('#bbi-name').onclick = () => renameFunctionModal(fn.id);
                BlocklyFRC.$('#bbi-trigger').onclick = () => renameFunctionModal(fn.id);
                BlocklyFRC.$('#bbi-name').style.cursor = 'pointer';
                BlocklyFRC.$('#bbi-trigger').style.cursor = 'pointer';
            }
        } else {
            const ctrl = state.controllers.find(c => c.id === state.activeControllerId);
            if (ctrl) {
                BlocklyFRC.$('#bbi-label-1').textContent = 'Controller';
                BlocklyFRC.$('#bbi-name').textContent = ctrl.name;
                BlocklyFRC.$('#bbi-label-2').textContent = 'Type';
                BlocklyFRC.$('#bbi-trigger').textContent = `m_${BlocklyFRC.camel(ctrl.name)} · ${ctrl.type.replace('Command', '')} · port ${ctrl.port}`;
                BlocklyFRC.$('#bbi-name').onclick = null;
                BlocklyFRC.$('#bbi-trigger').onclick = null;
                BlocklyFRC.$('#bbi-name').style.cursor = '';
                BlocklyFRC.$('#bbi-trigger').style.cursor = '';
            } else {
                BlocklyFRC.$('#bbi-name').textContent = '—';
                BlocklyFRC.$('#bbi-trigger').textContent = 'Select a controller or function to edit';
            }
        }
    }

    function switchToController(id) {
        BlocklyFRC.saveCurrentContext();
        BlocklyFRC.state.editMode = 'binding';
        BlocklyFRC.state.activeControllerId = id;
        BlocklyFRC.state.activeFunctionId = null;
        BlocklyFRC.loadActiveContext();
        renderControllerTabs();
        renderFunctionTabs();
        BlocklyFRC.rebuildToolbox();
        BlocklyFRC.persist();
        BlocklyFRC.regenerateAll();
    }

    /* ----------------------------------------------------------------
     * Command Function tabs (Build sidebar)
     * -------------------------------------------------------------- */
    function renderFunctionTabs() {
        const list = BlocklyFRC.$('#function-tabs');
        if (!list) return;
        list.innerHTML = '';

        const state = BlocklyFRC.state;
        if (!state || !state.commandFunctions.length) {
            list.innerHTML = '<div style="color:var(--fg-mute);padding:12px;font-size:12px;text-align:center;">No functions yet.<br>Create one to start composing.</div>';
            return;
        }

        for (const fn of state.commandFunctions) {
            const isActive = state.editMode === 'function' && fn.id === state.activeFunctionId;
            const tab = document.createElement('button');
            tab.className = 'binding-tab' + (isActive ? ' active' : '');
            tab.dataset.id = fn.id;
            tab.innerHTML = `
        <div class="binding-tab-name">${BlocklyFRC.escapeHtml(fn.name || 'unnamed')}</div>
        <div class="binding-tab-trigger">public Command ${BlocklyFRC.escapeHtml(BlocklyFRC.camel(fn.name))}()</div>
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
        const state = BlocklyFRC.state;
        if (!state) return;
        const n = state.commandFunctions.length + 1;
        const fn = {
            id: BlocklyFRC.uid(), name: `commandFunction${n}`, blocklyXml: null
        };
        state.commandFunctions.push(fn);
        BlocklyFRC.persist();
        BlocklyFRC.rebuildToolbox();
        /* Switch into the new function so the user can immediately compose it. */
        switchToFunction(fn.id);
        BlocklyFRC.toast('Function created — compose its body in the canvas.');
    }

    function deleteCommandFunction(id) {
        BlocklyFRC.confirmModal('Delete function', 'This will remove the command function and its blocks. Existing call-blocks in bindings will fall back to Commands.none(). Continue?', () => {
            const state = BlocklyFRC.state;
            state.commandFunctions = state.commandFunctions.filter(f => f.id !== id);
            /* If we were editing this function, fall back to binding mode. */
            if (state.editMode === 'function' && state.activeFunctionId === id) {
                state.editMode = 'binding';
                state.activeFunctionId = null;
                if (BlocklyFRC.workspace) BlocklyFRC.loadActiveContext();
            }
            BlocklyFRC.persist();
            renderControllerTabs();
            renderFunctionTabs();
            BlocklyFRC.rebuildToolbox();
            BlocklyFRC.regenerateAll();
            BlocklyFRC.toast('Function removed.');
        });
    }

    function renameFunctionModal(id) {
        const state = BlocklyFRC.state;
        if (!state) return;
        const fn = state.commandFunctions.find(f => f.id === id);
        if (!fn) return;
        BlocklyFRC.showModal(`
      <h3 class="modal-title">Rename function</h3>
      <p class="modal-desc">This changes the generated method name. Update any call-sites in your robot code.</p>
      <div class="form-grid" style="grid-template-columns:1fr;">
        <label class="field">
          <span>Function name</span>
          <input type="text" id="m-fn-name" value="${BlocklyFRC.escapeHtml(fn.name)}" spellcheck="false">
        </label>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="m-cancel">Cancel</button>
        <button class="btn btn-primary" id="m-save">Save</button>
      </div>
    `);
        BlocklyFRC.$('#m-cancel').addEventListener('click', BlocklyFRC.closeModal);
        BlocklyFRC.$('#m-save').addEventListener('click', () => {
            fn.name = BlocklyFRC.$('#m-fn-name').value.trim() || fn.name;
            BlocklyFRC.persist();
            renderControllerTabs();
            renderFunctionTabs();
            BlocklyFRC.rebuildToolbox();
            BlocklyFRC.regenerateAll();
            BlocklyFRC.closeModal();
        });
    }

    function switchToFunction(id) {
        BlocklyFRC.saveCurrentContext();
        const state = BlocklyFRC.state || {};
        state.editMode = 'function';
        state.activeFunctionId = id;
        BlocklyFRC.loadActiveContext();
        renderControllerTabs();
        renderFunctionTabs();
        BlocklyFRC.rebuildToolbox();
        BlocklyFRC.persist();
        BlocklyFRC.regenerateAll();
    }

    /* Expose every entry point other modules call. */
    BlocklyFRC.register({
        renderControllerTabs,
        switchToController,
        renderFunctionTabs,
        newCommandFunction,
        deleteCommandFunction,
        renameFunctionModal,
        switchToFunction
    });
})();
