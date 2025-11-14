export class WsClient {
  constructor({ store }) {
    this.store = store;
    this.ws = null;
    this.token = null;
    this.queue = [];
    this.retry = 0;
    this.rtcHandler = null;
  }

  setRtcHandler(handler) {
    this.rtcHandler = handler;
  }

  connect(token) {
    this.token = token;
    if (this.ws) {
      this.ws.close();
    }
    this.open();
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
    this.ws = null;
    this.queue = [];
  }

  open() {
    if (!this.token) return;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    this.ws = new WebSocket(`${protocol}://${window.location.host}/ws?token=${this.token}`);
    this.ws.onopen = () => {
      this.retry = 0;
      this.flushQueue();
    };
    this.ws.onmessage = (event) => this.handleMessage(event);
    this.ws.onclose = () => {
      const delay = Math.min(5000, 1000 * 2 ** this.retry);
      this.retry += 1;
      setTimeout(() => this.open(), delay);
    };
  }

  flushQueue() {
    while (this.queue.length && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(this.queue.shift());
    }
  }

  send(payload) {
    const message = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      this.queue.push(message);
    }
  }

  sendMessage(roomId, text) {
    this.send({ t: 'send', roomId, text });
  }

  sendTyping(roomId, on) {
    this.send({ t: 'typing', roomId, on });
  }

  sendRtc(payload) {
    this.send(payload);
  }

  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      switch (data.t) {
        case 'msg':
          this.store.addMessage(data.roomId, data.message);
          break;
        case 'typing':
          this.store.setTyping(data.roomId, data.from, data.on);
          break;
        case 'rtc-call-incoming':
        case 'rtc-call-declined':
        case 'rtc-call-cancelled':
        case 'rtc-peers':
        case 'rtc-joined':
        case 'rtc-left':
        case 'rtc-offer':
        case 'rtc-answer':
        case 'rtc-ice':
          if (this.rtcHandler) {
            this.rtcHandler(data);
          }
          break;
        default:
          break;
      }
    } catch (err) {
      console.error('WS parse error', err);
    }
  }
}
