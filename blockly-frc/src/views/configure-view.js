/* ================================================================
 * Blockly for FRC — Configure view
 * Developed by FRC 2789 (Texplosion)
 *
 * Renders the Configure tab: the subsystem list (with method rows)
 * and the controller list. Attaches `renderSubsystems` and
 * `renderControllers` onto the BlocklyFRC namespace so the rest of
 * the app can trigger a re-render.
 * ================================================================ */

(function () {
    'use strict';

    /* ================================================================
     * CONFIGURATION VIEW
     * ================================================================ */
    function renderSubsystems() {
        const list = BlocklyFRC.$('#subsystem-list');
        list.innerHTML = '';
        const empty = BlocklyFRC.$('#subsystem-empty');
        const state = BlocklyFRC.state;
        if (!state || !state.subsystems.length) {
            empty.classList.add('visible');
            return;
        }
        empty.classList.remove('visible');

        for (const sub of state.subsystems) {
            const card = document.createElement('div');
            card.className = 'subsystem-card';
            card.innerHTML = `
        <div class="subsystem-header">
          <div class="subsystem-icon">${BlocklyFRC.pascal(sub.name).slice(0, 2).toUpperCase()}</div>
          <div class="subsystem-title">
            <input class="subsystem-name-input" data-id="${sub.id}" value="${BlocklyFRC.escapeHtml(sub.name)}" spellcheck="false" />
            <div class="subsystem-meta">m_${BlocklyFRC.escapeHtml(BlocklyFRC.camel(sub.name))} · ${sub.methods.length} method${sub.methods.length === 1 ? '' : 's'}</div>
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
        BlocklyFRC.$$('.subsystem-name-input', list).forEach(el => {
            el.addEventListener('input', e => {
                const sub = BlocklyFRC.state.subsystems.find(s => s.id === e.target.dataset.id);
                if (!sub) return;
                sub.name = e.target.value;
                const meta = e.target.closest('.subsystem-header').querySelector('.subsystem-meta');
                meta.textContent = `m_${BlocklyFRC.camel(sub.name)} · ${sub.methods.length} method${sub.methods.length === 1 ? '' : 's'}`;
                const icon = e.target.closest('.subsystem-header').querySelector('.subsystem-icon');
                icon.textContent = BlocklyFRC.pascal(sub.name).slice(0, 2).toUpperCase();
                BlocklyFRC.persist();
                BlocklyFRC.rebuildToolbox();
                BlocklyFRC.regenerateAll();
            });
        });

        BlocklyFRC.$$('.subsystem-delete', list).forEach(el => {
            el.addEventListener('click', e => {
                const id = e.currentTarget.dataset.id;
                BlocklyFRC.confirmModal('Remove subsystem', 'This will remove the subsystem and any blocks referencing it. Continue?', () => {
                    BlocklyFRC.state.subsystems = BlocklyFRC.state.subsystems.filter(s => s.id !== id);
                    BlocklyFRC.persist();
                    renderSubsystems();
                    BlocklyFRC.rebuildToolbox();
                    BlocklyFRC.regenerateAll();
                    BlocklyFRC.toast('Subsystem removed.');
                });
            });
        });

        BlocklyFRC.$$('.add-method-btn', list).forEach(el => {
            el.addEventListener('click', e => {
                const sub = BlocklyFRC.state.subsystems.find(s => s.id === e.currentTarget.dataset.id);
                if (!sub) return;
                sub.methods.push({id: BlocklyFRC.uid(), name: 'newMethod', returnType: 'Command'});
                BlocklyFRC.persist();
                renderSubsystems();
                BlocklyFRC.rebuildToolbox();
            });
        });
    }

    function buildMethodRow(subId, method) {
        const row = document.createElement('div');
        row.className = 'method-row';
        row.innerHTML = `
      <select data-method="${method.id}" data-sub="${subId}" data-field="returnType">
        <option value="Command" ${method.returnType === 'Command' ? 'selected' : ''}>Supplier&lt;Command&gt;</option>
        <option value="Boolean" ${method.returnType === 'Boolean' ? 'selected' : ''}>Supplier&lt;Boolean&gt;</option>
      </select>
      <input type="text" data-method="${method.id}" data-sub="${subId}" data-field="name" value="${BlocklyFRC.escapeHtml(method.name)}" placeholder="methodName" spellcheck="false">
      <span class="type-badge" style="background:${method.returnType === 'Boolean' ? 'rgba(77,132,212,0.12)' : 'rgba(39,166,146,0.12)'};color:${method.returnType === 'Boolean' ? '#4d84d4' : '#27a692'};border:1px solid ${method.returnType === 'Boolean' ? 'rgba(77,132,212,0.3)' : 'rgba(39,166,146,0.3)'};">${method.returnType === 'Boolean' ? 'BOOL' : 'CMD'}</span>
      <button class="btn-icon" data-method="${method.id}" data-sub="${subId}" data-field="delete" title="Remove method">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;

        row.querySelectorAll('select, input').forEach(el => {
            el.addEventListener('change', updateMethod);
            el.addEventListener('input', updateMethod);
        });
        row.querySelector('[data-field="delete"]').addEventListener('click', e => {
            const state = BlocklyFRC.state;
            if (!state) return;
            const subId = e.currentTarget.dataset.sub;
            const methodId = e.currentTarget.dataset.method;
            const sub = BlocklyFRC.state.subsystems.find(s => s.id === subId);
            if (!sub) return;
            sub.methods = sub.methods.filter(m => m.id !== methodId);
            BlocklyFRC.persist();
            renderSubsystems();
            BlocklyFRC.rebuildToolbox();
            BlocklyFRC.regenerateAll();
        });
        return row;
    }

    function updateMethod(e) {
        const subId = e.target.dataset.sub;
        const methodId = e.target.dataset.method;
        const field = e.target.dataset.field;
        const sub = BlocklyFRC.state.subsystems.find(s => s.id === subId);
        if (!sub) return;
        const method = sub.methods.find(m => m.id === methodId);
        if (!method) return;
        method[field] = e.target.value;
        BlocklyFRC.persist();
        /* Update the badge inline without full re-render to avoid losing focus. */
        if (field === 'returnType') {
            renderSubsystems();
        } else {
            BlocklyFRC.rebuildToolbox();
            BlocklyFRC.regenerateAll();
        }
    }

    /* ---- controllers (Configure tab) ---- */
    function renderControllers() {
        const list = BlocklyFRC.$('#controller-list');
        list.innerHTML = '';
        for (const ctrl of BlocklyFRC.state.controllers) {
            const card = document.createElement('div');
            card.className = 'controller-card';
            card.innerHTML = `
        <div class="controller-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 12H2a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h0M22 12h0a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-1M6 19h12a4 4 0 0 0 4-4V9a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v6a4 4 0 0 0 4 4z"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/></svg>
        </div>
        <div class="controller-info">
          <input type="text" data-id="${ctrl.id}" data-field="name" value="${BlocklyFRC.escapeHtml(ctrl.name)}" spellcheck="false">
          <select data-id="${ctrl.id}" data-field="type">
            <option value="CommandXboxController" ${ctrl.type === 'CommandXboxController' ? 'selected' : ''}>Xbox · port ${ctrl.port}</option>
            <option value="CommandPS5Controller" ${ctrl.type === 'CommandPS5Controller' ? 'selected' : ''}>PS5 · port ${ctrl.port}</option>
            <option value="CommandJoystick" ${ctrl.type === 'CommandJoystick' ? 'selected' : ''}>Joystick · port ${ctrl.port}</option>
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
                const ctrl = BlocklyFRC.state.controllers.find(c => c.id === id);
                if (!ctrl) return;
                const next = prompt('Driver Station port (0–5)', ctrl.port);
                if (next === null) return;
                const n = parseInt(next, 10);
                if (isNaN(n) || n < 0 || n > 5) {
                    BlocklyFRC.toast('Port must be 0–5.', 'error');
                    return;
                }
                ctrl.port = n;
                BlocklyFRC.persist();
                renderControllers();
                BlocklyFRC.regenerateAll();
            });
            card.querySelector('.controller-delete').addEventListener('click', e => {
                const id = e.currentTarget.dataset.id;
                BlocklyFRC.confirmModal('Remove controller', 'This will remove the controller and all its binding blocks. Continue?', () => {
                    BlocklyFRC.state.controllers = BlocklyFRC.state.controllers.filter(c => c.id !== id);
                    /* If we were editing this controller, switch to another. */
                    if (BlocklyFRC.state.activeControllerId === id) {
                        BlocklyFRC.state.activeControllerId = BlocklyFRC.state.controllers[0]?.id ?? null;
                        BlocklyFRC.state.editMode = 'binding';
                        if (BlocklyFRC.workspace) BlocklyFRC.loadActiveContext();
                    }
                    BlocklyFRC.persist();
                    renderControllers();
                    BlocklyFRC.renderControllerTabs();
                    BlocklyFRC.regenerateAll();
                });
            });
        }
    }

    function updateController(e) {
        const id = e.target.dataset.id;
        const field = e.target.dataset.field;
        const ctrl = BlocklyFRC.state.controllers.find(c => c.id === id);
        if (!ctrl) return;
        ctrl[field] = e.target.value;
        BlocklyFRC.persist();
        if (field === 'name') {
            renderControllers();
            BlocklyFRC.renderControllerTabs();
        }
        BlocklyFRC.regenerateAll();
    }

    /* Expose the two entry points other modules call. */
    BlocklyFRC.register({renderSubsystems, renderControllers});
})();
