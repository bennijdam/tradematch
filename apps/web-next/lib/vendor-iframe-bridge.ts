export type VendorBridgeMessageType =
  | 'INIT'
  | 'READY'
  | 'STATE_SYNC'
  | 'PATCH_METRICS'
  | 'TOAST'
  | 'FORCE_REFRESH'
  | 'ERROR'
  | 'PING'
  | 'PONG';

export type VendorBridgeMessage<TPayload = unknown> = {
  type: VendorBridgeMessageType;
  version: '1.0';
  requestId: string;
  timestamp: number;
  payload?: TPayload;
};

export type VendorMetricsPatch = {
  showUpRate?: number;
  winRate?: number;
};

type BridgeOptions = {
  iframeElement: HTMLIFrameElement;
  targetOrigin: string;
  sourceName?: string;
};

type BridgeHandler = (message: VendorBridgeMessage) => void;

const ALLOWED_TYPES = new Set<VendorBridgeMessageType>([
  'INIT',
  'READY',
  'STATE_SYNC',
  'PATCH_METRICS',
  'TOAST',
  'FORCE_REFRESH',
  'ERROR',
  'PING',
  'PONG',
]);

function makeRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isBridgeMessage(value: unknown): value is VendorBridgeMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const message = value as Partial<VendorBridgeMessage>;
  if (!message.type || !ALLOWED_TYPES.has(message.type)) {
    return false;
  }

  return (
    message.version === '1.0'
    && typeof message.requestId === 'string'
    && typeof message.timestamp === 'number'
  );
}

export class VendorIframeBridge {
  private readonly iframeElement: HTMLIFrameElement;

  private readonly targetOrigin: string;

  private readonly sourceName: string;

  private readonly handlers = new Map<VendorBridgeMessageType, Set<BridgeHandler>>();

  private readonly queue: VendorBridgeMessage[] = [];

  private readonly seenRequestIds = new Set<string>();

  private ready = false;

  private handshakeAttempts = 0;

  private handshakeTimer: number | null = null;

  private heartbeatTimer: number | null = null;

  private boundOnMessage: (event: MessageEvent) => void;

  constructor(options: BridgeOptions) {
    this.iframeElement = options.iframeElement;
    this.targetOrigin = options.targetOrigin;
    this.sourceName = options.sourceName || 'tradematch-parent';
    this.boundOnMessage = this.onMessage.bind(this);
  }

  start() {
    window.addEventListener('message', this.boundOnMessage);
    this.sendInit();
    this.handshakeTimer = window.setInterval(() => {
      if (this.ready || this.handshakeAttempts >= 8) {
        if (this.handshakeTimer !== null) {
          window.clearInterval(this.handshakeTimer);
          this.handshakeTimer = null;
        }
        return;
      }
      this.sendInit();
    }, 1200);
  }

  destroy() {
    window.removeEventListener('message', this.boundOnMessage);
    if (this.handshakeTimer !== null) {
      window.clearInterval(this.handshakeTimer);
    }
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
    }
    this.queue.length = 0;
    this.handlers.clear();
  }

  on(type: VendorBridgeMessageType, handler: BridgeHandler) {
    const list = this.handlers.get(type) ?? new Set<BridgeHandler>();
    list.add(handler);
    this.handlers.set(type, list);

    return () => {
      const current = this.handlers.get(type);
      current?.delete(handler);
    };
  }

  isReady() {
    return this.ready;
  }

  stateSync(payload: Record<string, unknown>) {
    this.send('STATE_SYNC', payload);
  }

  patchMetrics(payload: VendorMetricsPatch) {
    this.send('PATCH_METRICS', payload);
  }

  toast(message: string, tone: 'success' | 'error' = 'success') {
    this.send('TOAST', { message, tone });
  }

  forceRefresh() {
    this.send('FORCE_REFRESH', { reason: 'admin-request' });
  }

  private startHeartbeat() {
    if (this.heartbeatTimer !== null) {
      return;
    }

    this.heartbeatTimer = window.setInterval(() => {
      this.send('PING', { source: this.sourceName });
    }, 20000);
  }

  private onMessage(event: MessageEvent) {
    if (event.origin !== this.targetOrigin || event.source !== this.iframeElement.contentWindow) {
      return;
    }

    if (!isBridgeMessage(event.data)) {
      return;
    }

    if (this.seenRequestIds.has(event.data.requestId)) {
      return;
    }
    this.seenRequestIds.add(event.data.requestId);

    if (event.data.type === 'READY') {
      this.ready = true;
      this.flushQueue();
      this.startHeartbeat();
    }

    const handlers = this.handlers.get(event.data.type);
    handlers?.forEach((handler) => handler(event.data));
  }

  private sendInit() {
    this.handshakeAttempts += 1;
    this.send('INIT', {
      source: this.sourceName,
      features: ['STATE_SYNC', 'PATCH_METRICS', 'TOAST', 'FORCE_REFRESH'],
    }, true);
  }

  private flushQueue() {
    if (!this.ready) {
      return;
    }

    while (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        this.post(next);
      }
    }
  }

  private send(type: VendorBridgeMessageType, payload?: unknown, bypassReady = false) {
    const message: VendorBridgeMessage = {
      type,
      version: '1.0',
      requestId: makeRequestId(),
      timestamp: Date.now(),
      payload,
    };

    if (!this.ready && !bypassReady) {
      this.queue.push(message);
      return;
    }

    this.post(message);
  }

  private post(message: VendorBridgeMessage) {
    this.iframeElement.contentWindow?.postMessage(message, this.targetOrigin);
  }
}
