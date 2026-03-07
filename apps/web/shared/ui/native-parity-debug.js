(function registerNativeParityDebug(global) {
  function isDebugEnabled() {
    try {
      return new URLSearchParams(global.location.search).get('debug') === '1'
        || global.localStorage.getItem('nativeParityDebug') === '1';
    } catch (_error) {
      return false;
    }
  }

  global.createNativeParityDebug = function createNativeParityDebug(config) {
    const options = config || {};
    const enabled = isDebugEnabled();
    let panel = null;
    let body = null;

    function ensurePanel() {
      if (!enabled) return null;
      if (panel && body) return panel;

      panel = document.createElement('div');
      panel.style.position = 'fixed';
      panel.style.left = options.left || '12px';
      panel.style.bottom = options.bottom || '12px';
      panel.style.width = options.width || '360px';
      panel.style.maxHeight = options.maxHeight || '45vh';
      panel.style.overflow = 'auto';
      panel.style.padding = '10px';
      panel.style.background = 'rgba(5,7,9,0.92)';
      panel.style.border = '1px solid rgba(0,229,160,0.45)';
      panel.style.borderRadius = '10px';
      panel.style.zIndex = '2147483647';
      panel.style.fontFamily = 'Space Mono, monospace';
      panel.style.fontSize = '10px';
      panel.style.lineHeight = '1.45';
      panel.style.color = '#d1fae5';

      const heading = document.createElement('div');
      heading.style.fontWeight = '700';
      heading.style.color = '#00E5A0';
      heading.style.marginBottom = '6px';
      heading.textContent = options.label || 'PARITY DEBUG';

      body = document.createElement('pre');
      body.style.whiteSpace = 'pre-wrap';
      body.style.margin = '0';

      panel.appendChild(heading);
      panel.appendChild(body);
      document.body.appendChild(panel);
      return panel;
    }

    return {
      enabled,
      write(payload) {
        if (!enabled) return;
        ensurePanel();
        if (!body) return;
        body.textContent = JSON.stringify(payload, null, 2);
      }
    };
  };
})(window);