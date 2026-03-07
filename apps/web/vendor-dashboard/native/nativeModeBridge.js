(function () {
  'use strict';

  const MODE_KEY = 'vendor_dashboard_mode';
  const VALID_MODES = ['native', 'legacy'];
  const NATIVE_BUILD = '20260305.2';
  const NATIVE_SRC = '/vendor-dashboard/native/vendor-dashboard.html';

  const LEGACY_PATH_BY_VIEW = {
    analytics: '/vendor-analytics.html',
    'new-leads': '/vendor-new-leads.html',
    'active-quotes': '/vendor-active-quotes.html',
    messages: '/vendor-messages.html',
    profile: '/vendor-profile.html',
    settings: '/vendor-settings.html',
    billing: '/vendor-billing.html'
  };

  const VIEW_BY_PATH = {
    '/vendor-dashboard': 'analytics',
    '/vendor-dashboard/vendor-analytics': 'analytics',
    '/vendor-dashboard/vendor-new-leads': 'new-leads',
    '/vendor-dashboard/vendor-active-quotes': 'active-quotes',
    '/vendor-dashboard/vendor-messages': 'messages',
    '/vendor-dashboard/vendor-profile': 'profile',
    '/vendor-dashboard/vendor-settings': 'settings',
    '/vendor-dashboard/vendor-billing': 'billing'
  };

  function normalizeMode(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return VALID_MODES.includes(normalized) ? normalized : null;
  }

  function getHashMode() {
    const hash = window.location.hash || '';
    const queryIndex = hash.indexOf('?');
    if (queryIndex < 0) return null;
    return new URLSearchParams(hash.slice(queryIndex + 1)).get('mode');
  }

  function resolveMode() {
    const searchMode = new URLSearchParams(window.location.search).get('mode');
    const resolved = normalizeMode(searchMode)
      || normalizeMode(getHashMode())
      || normalizeMode(localStorage.getItem(MODE_KEY))
      || 'native';
    localStorage.setItem(MODE_KEY, resolved);
    return resolved;
  }

  function currentView() {
    const path = window.location.pathname;
    if (VIEW_BY_PATH[path]) return VIEW_BY_PATH[path];
    const hashPath = (window.location.hash || '').replace(/^#/, '').split('?')[0];
    return VIEW_BY_PATH[hashPath] || 'analytics';
  }

  function switchMode() {
    const mode = resolveMode();
    const nextMode = mode === 'native' ? 'legacy' : 'native';
    localStorage.setItem(MODE_KEY, nextMode);

    const url = new URL(window.location.href);
    url.searchParams.delete('mode');
    const hashPath = (window.location.hash || '#/vendor-dashboard').split('?')[0];
    url.hash = `${hashPath}?mode=${encodeURIComponent(nextMode)}`;
    window.location.href = url.toString();
  }

  function injectToggle() {
    let button = document.getElementById('vendor-mode-toggle');
    if (!button) {
      button = document.createElement('button');
      button.id = 'vendor-mode-toggle';
      button.type = 'button';
      button.style.position = 'fixed';
      button.style.top = '10px';
      button.style.right = '14px';
      button.style.zIndex = '2147483646';
      button.style.height = '34px';
      button.style.padding = '0 12px';
      button.style.borderRadius = '9px';
      button.style.border = '1px solid rgba(0,229,160,0.45)';
      button.style.background = 'linear-gradient(180deg, rgba(10,13,20,0.96), rgba(5,7,9,0.96))';
      button.style.color = '#00E5A0';
      button.style.fontFamily = 'Space Mono, monospace';
      button.style.fontSize = '11px';
      button.style.fontWeight = '700';
      button.style.cursor = 'pointer';
      button.style.boxShadow = '0 0 16px rgba(0,229,160,0.2)';
      document.body.appendChild(button);
    }

    const mode = resolveMode();
    button.textContent = `${mode === 'native' ? 'NATIVE' : 'LEGACY'} ⇄ ${mode === 'native' ? 'LEGACY' : 'NATIVE'}`;
    button.onclick = switchMode;
  }

  function renderNative() {
    let host = document.getElementById('vendor-native-shell');
    if (!host) {
      host = document.createElement('div');
      host.id = 'vendor-native-shell';
      host.style.position = 'fixed';
      host.style.inset = '0';
      host.style.zIndex = '2147483645';
      host.style.background = '#050709';
      host.innerHTML = '<iframe id="vendorNativeFrame" title="TradeMatch Vendor Native" style="width:100%;height:100%;border:0;display:block;background:#050709;"></iframe>';
      document.body.appendChild(host);
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }

    const frame = document.getElementById('vendorNativeFrame');
    if (!frame) return;

    const view = currentView();

    async function fetchLegacySnapshot(targetView) {
      const legacyPath = LEGACY_PATH_BY_VIEW[targetView] || LEGACY_PATH_BY_VIEW.analytics;
      try {
        const response = await fetch(legacyPath, { cache: 'no-store' });
        if (!response.ok) return null;

        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const cleanText = (value) => String(value || '')
          .replace(/\u00A0/g, ' ')
          .replace(/Â£/g, '£')
          .replace(/â†‘|â†’|â†“|â†�/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const pickText = (selectors) => {
          for (let index = 0; index < selectors.length; index += 1) {
            const node = doc.querySelector(selectors[index]);
            if (node && node.textContent && node.textContent.trim()) {
              return cleanText(node.textContent);
            }
          }
          return '';
        };

        const metricNodes = Array.from(doc.querySelectorAll('.stat-card, .metric-card, .overview-card')).slice(0, 4);
        const metrics = metricNodes
          .map((node) => {
            const label = cleanText(node.querySelector('.stat-label, .metric-label, .card-label, h4')?.textContent || '');
            const value = cleanText(node.querySelector('.stat-value, .metric-value, .card-value, strong')?.textContent || '');
            const delta = cleanText(node.querySelector('.stat-subtext, .metric-change, .delta, .trend, .card-meta')?.textContent || '');
            if (!label || !value) return null;
            return [label, value, delta || ''];
          })
          .filter(Boolean);

        const rows = Array.from(doc.querySelectorAll('table tr'))
          .map((row) => Array.from(row.querySelectorAll('td')).map((cell) => cleanText(cell.textContent || '')))
          .filter((cells) => cells.length >= 3)
          .slice(0, 3)
          .map((cells) => [cells[0], cells[1], cells[2]]);

        const fallbackRows = rows.length
          ? rows
          : Array.from(doc.querySelectorAll('.lead-card, .quote-item, .conversation-item, .billing-row, .job-card'))
            .slice(0, 3)
            .map((node) => {
              const line1 = cleanText(node.querySelector('.lead-title, .quote-title, .conversation-name, .job-title, h3')?.textContent || '');
              const line2 = cleanText(node.querySelector('.lead-time, .quote-meta, .conversation-job, .job-meta, .row-meta')?.textContent || '');
              return [line1 || 'Item', line2 || 'Updated', ''];
            });

        const safeMetrics = metrics.length
          ? metrics
          : [
            ['Items', String(fallbackRows.length || 0), 'Loaded'],
            ['Status', 'Synced', legacyPath],
            ['Theme', localStorage.getItem('theme') || 'dark', 'Runtime'],
            ['Mode', resolveMode(), 'Native']
          ];

        return {
          title: pickText(['.page-title', '.dashboard-title', 'h1']),
          subtitle: pickText(['.page-subtitle', '.dashboard-subtitle']),
          metrics: safeMetrics,
          rows: fallbackRows,
          sideText: pickText(['.alert-content p', '.warning-content p', '.section-description'])
        };
      } catch (error) {
        return null;
      }
    }

    async function pushRuntimeSnapshot(targetView) {
      const payload = await fetchLegacySnapshot(targetView);
      if (!payload) return;
      frame.contentWindow?.postMessage({
        type: 'dashboard-native-data',
        role: 'vendor',
        view: targetView,
        payload
      }, window.location.origin);
    }

    frame.src = `${NATIVE_SRC}?view=${encodeURIComponent(view)}&v=${encodeURIComponent(NATIVE_BUILD)}`;
    frame.addEventListener('load', () => {
      frame.contentWindow?.postMessage({
        type: 'vendor-native-nav',
        view
      }, window.location.origin);

      frame.contentWindow?.postMessage({
        type: 'dashboard-native-nav',
        role: 'vendor',
        view
      }, window.location.origin);

      pushRuntimeSnapshot(view);
    }, { once: true });

    let hasSyncedReady = false;
    window.addEventListener('message', (event) => {
      const data = event && event.data ? event.data : null;
      if (!data || data.type !== 'dashboard-native-ready') return;
      if (data.role !== 'vendor') return;
      if (hasSyncedReady) return;

      hasSyncedReady = true;
      pushRuntimeSnapshot(data.view || view);
    }, { once: true });
  }

  function bootstrap() {
    injectToggle();
    if (resolveMode() !== 'native') return;
    renderNative();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
    return;
  }

  bootstrap();
})();