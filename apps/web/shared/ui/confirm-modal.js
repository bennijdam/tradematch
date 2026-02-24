/**
 * TradeMatch — Universal Confirm Modal
 * Singleton, Promise-based, theme-aware. Zero dependencies.
 *
 * Usage:
 *   const ok = await CustomConfirm.ask('Delete Photo', 'This cannot be undone.', 'Delete', 'danger');
 *   if (!ok) return;
 *
 *   const { confirmed, value } = await CustomConfirm.prompt(
 *     'Log Out All Devices',
 *     'Enter your password to confirm.',
 *     'Current password',
 *     'Log Out All',
 *     'danger'
 *   );
 *
 *   CustomConfirm.toast('Saved!', 'success'); // falls back to page's showToast() if available
 *
 * Types: 'danger' | 'warning' | 'info' | 'primary'
 */
(function () {
    'use strict';

    const MODAL_ID = 'tm-confirm-modal';

    // ── Icons per type ────────────────────────────────────────────────────────
    const ICONS = {
        danger: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>',
        warning: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9S16.97 3 12 3z"/>',
        info: '<path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9S16.97 3 12 3z"/>',
        primary: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    };

    // ── CSS ───────────────────────────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById('tm-confirm-modal-styles')) return;
        const style = document.createElement('style');
        style.id = 'tm-confirm-modal-styles';
        style.textContent = `
            #tm-confirm-modal {
                position: fixed;
                inset: 0;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
                background: rgba(0, 0, 0, 0.55);
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s ease;
            }
            #tm-confirm-modal.is-open {
                opacity: 1;
                pointer-events: all;
            }
            #tm-confirm-modal .tm-card {
                background: var(--bg-card, #ffffff);
                border: 1px solid var(--border, rgba(0,0,0,0.08));
                border-radius: 16px;
                box-shadow: var(--shadow-lg, 0 24px 48px rgba(0,0,0,0.2));
                padding: 28px 28px 24px;
                width: 100%;
                max-width: 420px;
                transform: scale(0.96) translateY(10px);
                transition: transform 0.2s ease;
            }
            #tm-confirm-modal.is-open .tm-card {
                transform: scale(1) translateY(0);
            }
            .tm-modal-icon {
                width: 44px;
                height: 44px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 16px;
                flex-shrink: 0;
            }
            .tm-modal-icon.danger  { background: rgba(239,68,68,0.12);   color: var(--accent-danger,  #ef4444); }
            .tm-modal-icon.warning { background: rgba(245,158,11,0.12);  color: var(--accent-warning, #f59e0b); }
            .tm-modal-icon.info    { background: rgba(59,130,246,0.12);  color: var(--accent-info,    #3b82f6); }
            .tm-modal-icon.primary { background: rgba(16,185,129,0.12);  color: var(--accent-primary, #10b981); }
            #tm-confirm-title {
                font-size: 17px;
                font-weight: 700;
                color: var(--text-primary, #1a2332);
                margin: 0 0 8px;
                line-height: 1.3;
                font-family: inherit;
            }
            #tm-confirm-body {
                font-size: 14px;
                color: var(--text-secondary, #4b5563);
                margin: 0 0 20px;
                line-height: 1.6;
                font-family: inherit;
            }
            #tm-confirm-input-group {
                margin-bottom: 20px;
                display: none;
            }
            #tm-confirm-input-group.has-input {
                display: block;
            }
            #tm-confirm-input-label {
                display: block;
                font-size: 13px;
                font-weight: 600;
                color: var(--text-secondary, #4b5563);
                margin-bottom: 6px;
                font-family: inherit;
            }
            #tm-confirm-input {
                width: 100%;
                padding: 10px 14px;
                border: 1px solid var(--border, rgba(0,0,0,0.12));
                border-radius: 10px;
                font-size: 14px;
                color: var(--text-primary, #1a2332);
                background: var(--bg-secondary, #f8fafb);
                box-sizing: border-box;
                outline: none;
                transition: border-color 0.15s, box-shadow 0.15s;
                font-family: inherit;
            }
            #tm-confirm-input:focus {
                border-color: var(--accent-primary, #10b981);
                box-shadow: 0 0 0 3px rgba(16,185,129,0.15);
            }
            .tm-modal-actions {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }
            #tm-cancel-btn {
                padding: 10px 20px;
                border: 1px solid var(--border, rgba(0,0,0,0.12));
                border-radius: 10px;
                background: transparent;
                color: var(--text-secondary, #4b5563);
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.15s;
                font-family: inherit;
            }
            #tm-cancel-btn:hover {
                background: var(--bg-tertiary, #f3f4f6);
            }
            #tm-proceed-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 10px;
                font-size: 14px;
                font-weight: 700;
                cursor: pointer;
                color: #fff;
                transition: opacity 0.15s, transform 0.1s;
                font-family: inherit;
            }
            #tm-proceed-btn:hover  { opacity: 0.88; }
            #tm-proceed-btn:active { transform: scale(0.97); }
            #tm-proceed-btn.danger  { background: var(--accent-danger,  #ef4444); }
            #tm-proceed-btn.warning { background: var(--accent-warning, #f59e0b); }
            #tm-proceed-btn.info    { background: var(--accent-info,    #3b82f6); }
            #tm-proceed-btn.primary { background: var(--accent-primary, #10b981); }

            /* Fallback toast for pages that don't have their own showToast() */
            #tm-toast {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 10000;
                padding: 14px 20px;
                border-radius: 12px;
                font-size: 14px;
                font-weight: 600;
                color: #fff;
                box-shadow: 0 8px 24px rgba(0,0,0,0.25);
                pointer-events: none;
                opacity: 0;
                transform: translateY(8px);
                transition: opacity 0.25s ease, transform 0.25s ease;
                max-width: 320px;
                font-family: inherit;
            }
            #tm-toast.is-visible {
                opacity: 1;
                transform: translateY(0);
            }
            #tm-toast.success { background: var(--accent-success, #16a34a); }
            #tm-toast.error   { background: var(--accent-danger,  #ef4444); }
            #tm-toast.info    { background: var(--accent-info,    #3b82f6); }
        `;
        document.head.appendChild(style);
    }

    // ── Modal HTML ────────────────────────────────────────────────────────────
    function injectModal() {
        if (document.getElementById(MODAL_ID)) return;
        const el = document.createElement('div');
        el.id = MODAL_ID;
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        el.setAttribute('aria-labelledby', 'tm-confirm-title');
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML = `
            <div class="tm-card">
                <div class="tm-modal-icon danger" id="tm-modal-icon">
                    <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    </svg>
                </div>
                <h3 id="tm-confirm-title">Are you sure?</h3>
                <p id="tm-confirm-body">This action cannot be undone.</p>
                <div id="tm-confirm-input-group">
                    <label id="tm-confirm-input-label" for="tm-confirm-input">Password</label>
                    <input id="tm-confirm-input" type="password" autocomplete="current-password" placeholder="Enter your password" />
                </div>
                <div class="tm-modal-actions">
                    <button id="tm-cancel-btn" type="button">Cancel</button>
                    <button id="tm-proceed-btn" type="button" class="danger">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(el);
    }

    // ── Singleton API ─────────────────────────────────────────────────────────
    const CustomConfirm = {

        _open(opts) {
            const modal      = document.getElementById(MODAL_ID);
            const iconEl     = document.getElementById('tm-modal-icon');
            const titleEl    = document.getElementById('tm-confirm-title');
            const bodyEl     = document.getElementById('tm-confirm-body');
            const inputGrp   = document.getElementById('tm-confirm-input-group');
            const inputLbl   = document.getElementById('tm-confirm-input-label');
            const inputEl    = document.getElementById('tm-confirm-input');
            const proceedBtn = document.getElementById('tm-proceed-btn');
            const cancelBtn  = document.getElementById('tm-cancel-btn');

            const type = opts.type || 'danger';

            // ── Populate ──────────────────────────────────────────────────────
            titleEl.textContent    = opts.title;
            bodyEl.textContent     = opts.body;
            proceedBtn.textContent = opts.proceedLabel || 'Confirm';
            proceedBtn.className   = type;
            iconEl.className       = `tm-modal-icon ${type}`;
            iconEl.querySelector('svg').innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="${(ICONS[type] || ICONS.danger).match(/d="([^"]+)"/)[1]}"/>`;

            // ── Input field (password prompt variant) ─────────────────────────
            if (opts.inputLabel) {
                inputLbl.textContent = opts.inputLabel;
                inputEl.type         = opts.inputType || 'password';
                inputEl.placeholder  = opts.inputPlaceholder || `Enter ${opts.inputLabel.toLowerCase()}`;
                inputEl.value        = '';
                inputGrp.classList.add('has-input');
                setTimeout(() => inputEl.focus(), 220);
            } else {
                inputGrp.classList.remove('has-input');
                setTimeout(() => proceedBtn.focus(), 220);
            }

            modal.classList.add('is-open');
            modal.removeAttribute('aria-hidden');

            return new Promise((resolve) => {
                const finish = (confirmed) => {
                    modal.classList.remove('is-open');
                    modal.setAttribute('aria-hidden', 'true');
                    proceedBtn.onclick = null;
                    cancelBtn.onclick  = null;
                    modal.onclick      = null;
                    document.removeEventListener('keydown', onKey);
                    resolve(opts.inputLabel ? { confirmed, value: inputEl.value } : confirmed);
                };

                const onKey = (e) => {
                    if (e.key === 'Escape') finish(false);
                    if (e.key === 'Enter' && opts.inputLabel && document.activeElement === inputEl) finish(true);
                };

                proceedBtn.onclick = () => finish(true);
                cancelBtn.onclick  = () => finish(false);
                modal.onclick      = (e) => { if (e.target === modal) finish(false); };
                document.addEventListener('keydown', onKey);
            });
        },

        /**
         * Standard confirm dialog.
         * @param {string} title
         * @param {string} body
         * @param {string} [proceedLabel='Confirm']
         * @param {'danger'|'warning'|'info'|'primary'} [type='danger']
         * @returns {Promise<boolean>}
         */
        ask(title, body, proceedLabel = 'Confirm', type = 'danger') {
            return this._open({ title, body, proceedLabel, type });
        },

        /**
         * Confirm dialog with a text/password input field.
         * @param {string} title
         * @param {string} body
         * @param {string} [inputLabel='Password']
         * @param {string} [proceedLabel='Confirm']
         * @param {'danger'|'warning'|'info'|'primary'} [type='danger']
         * @returns {Promise<{confirmed: boolean, value: string}>}
         */
        prompt(title, body, inputLabel = 'Password', proceedLabel = 'Confirm', type = 'danger') {
            return this._open({ title, body, inputLabel, proceedLabel, type });
        },

        /**
         * Show a toast. Uses the page's own showToast() if available,
         * otherwise uses the built-in fallback toast.
         * @param {string} message
         * @param {'success'|'error'|'info'} [type='success']
         */
        toast(message, type = 'success') {
            if (typeof window.showToast === 'function') {
                window.showToast(message, type);
                return;
            }
            let el = document.getElementById('tm-toast');
            if (!el) {
                el = document.createElement('div');
                el.id = 'tm-toast';
                document.body.appendChild(el);
            }
            el.textContent = message;
            el.className = `is-visible ${type}`;
            clearTimeout(el._t);
            el._t = setTimeout(() => el.classList.remove('is-visible'), 3500);
        },
    };

    document.addEventListener('DOMContentLoaded', () => {
        injectStyles();
        injectModal();
        window.CustomConfirm = CustomConfirm;
    });
})();
