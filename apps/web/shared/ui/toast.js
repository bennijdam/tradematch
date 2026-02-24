/**
 * TradeMatch — shared/ui/toast.js
 * Unified toast notification utility.
 *
 * Usage (any page):
 *   <script src="/shared/ui/toast.js" defer></script>
 *   showToast('Saved!', 'success');   // types: success | error | warning | info
 *   showToast('Something went wrong', 'error', 6000); // custom duration ms
 *
 * If confirm-modal.js is also loaded it delegates to CustomConfirm.toast()
 * so there is only ever one toast container on screen.
 */
(function () {
    'use strict';

    // Inject styles once
    if (!document.getElementById('tm-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'tm-toast-styles';
        style.textContent = `
            #tm-toast-container {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            }
            .tm-toast {
                pointer-events: auto;
                min-width: 260px;
                max-width: 400px;
                padding: 12px 16px;
                border-radius: 10px;
                font-family: 'Archivo', sans-serif;
                font-size: 14px;
                font-weight: 500;
                color: #fff;
                display: flex;
                align-items: center;
                gap: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,.35);
                animation: tmToastIn .25s ease forwards;
            }
            .tm-toast.removing { animation: tmToastOut .25s ease forwards; }
            .tm-toast.success  { background: #10b981; }
            .tm-toast.error    { background: #ef4444; }
            .tm-toast.warning  { background: #f59e0b; }
            .tm-toast.info     { background: #3b82f6; }
            .tm-toast-icon { flex-shrink: 0; width: 18px; height: 18px; }
            .tm-toast-close {
                margin-left: auto;
                background: none;
                border: none;
                color: rgba(255,255,255,.75);
                cursor: pointer;
                font-size: 16px;
                line-height: 1;
                padding: 0 2px;
            }
            @keyframes tmToastIn  { from { opacity:0; transform:translateX(30px); } to { opacity:1; transform:translateX(0); } }
            @keyframes tmToastOut { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(30px); } }
        `;
        document.head.appendChild(style);
    }

    const ICONS = {
        success: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>',
        error:   '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>',
        warning: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>',
        info:    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    };

    function getContainer() {
        let c = document.getElementById('tm-toast-container');
        if (!c) {
            c = document.createElement('div');
            c.id = 'tm-toast-container';
            document.body.appendChild(c);
        }
        return c;
    }

    function removeToast(el) {
        el.classList.add('removing');
        el.addEventListener('animationend', () => el.remove(), { once: true });
    }

    /**
     * showToast(message, type, duration)
     * @param {string} message
     * @param {'success'|'error'|'warning'|'info'} [type='success']
     * @param {number} [duration=4000]  ms before auto-dismiss (0 = never)
     */
    function showToast(message, type, duration) {
        // Prefer CustomConfirm.toast if available (avoids two separate stacks)
        if (typeof CustomConfirm !== 'undefined' && typeof CustomConfirm.toast === 'function') {
            CustomConfirm.toast(message, type || 'success');
            return;
        }

        type = type || 'success';
        duration = (duration === undefined) ? 4000 : duration;

        const el = document.createElement('div');
        el.className = 'tm-toast ' + type;
        el.innerHTML = `
            <svg class="tm-toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                ${ICONS[type] || ICONS.info}
            </svg>
            <span>${message}</span>
            <button class="tm-toast-close" aria-label="Dismiss">&times;</button>
        `;

        el.querySelector('.tm-toast-close').addEventListener('click', () => removeToast(el));
        getContainer().appendChild(el);

        if (duration > 0) {
            setTimeout(() => removeToast(el), duration);
        }
    }

    // Expose globally
    window.showToast = showToast;

    // Alias helpers that dashboards use, so pages that call showDashToast / showVendorToast
    // without their own dashboardApp.js loaded still work.
    if (typeof window.showDashToast === 'undefined') {
        window.showDashToast = showToast;
    }
    if (typeof window.showVendorToast === 'undefined') {
        window.showVendorToast = showToast;
    }
    if (typeof window.notifyToast === 'undefined') {
        window.notifyToast = showToast;
    }
}());
