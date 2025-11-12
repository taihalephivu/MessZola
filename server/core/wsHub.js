const { WebSocketServer } = require('ws');
const { URL } = require('url');
const config = require('./config');

class WsHub {
  constructor({ server, tokenService }) {
    this.tokenService = tokenService;
    this.handlers = new Map();
    this.connections = new Map(); // ws -> { user }
    this.userSockets = new Map(); // userId -> Set<ws>
    this.wss = new WebSocketServer({ server, path: config.wsPath });
    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
    this.heartbeat = setInterval(() => this.checkHeartbeat(), config.wsHeartbeatInterval);
  }

  registerHandler(type, handler) {
    this.handlers.set(type, handler);
  }

  handleConnection(ws, req) {
    try {
      const requestUrl = new URL(req.url, 'http://localhost');
      const token = requestUrl.searchParams.get('token');
      if (!token) {
        ws.close(4001, 'Missing token');
        return;
      }
      const user = this.tokenService.verify(token);
      this.connections.set(ws, { user });
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id).add(ws);
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });
      ws.on('message', (raw) => this.handleMessage(ws, raw));
      ws.on('close', () => this.handleClose(ws));
      this.send(ws, { t: 'connected', user });
    } catch (err) {
      ws.close(4002, 'Invalid token');
    }
  }

  handleMessage(ws, raw) {
    let payload;
    try {
      payload = JSON.parse(raw.toString());
    } catch (err) {
      return;
    }
    const handler = this.handlers.get(payload.t);
    if (handler) {
      const context = { hub: this, ws, user: this.connections.get(ws).user, data: payload };
      handler(context);
    }
  }

  handleClose(ws) {
    const meta = this.connections.get(ws);
    if (!meta) return;
    const userId = meta.user.id;
    if (this.userSockets.has(userId)) {
      const set = this.userSockets.get(userId);
      set.delete(ws);
      if (!set.size) {
        this.userSockets.delete(userId);
      }
    }
    this.connections.delete(ws);
  }

  checkHeartbeat() {
    this.wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }

  send(ws, payload) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  sendToUser(userId, payload) {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return;
    sockets.forEach((socket) => this.send(socket, payload));
  }

  broadcastToUsers(userIds, payload, options = {}) {
    userIds.forEach((userId) => {
      if (options.exclude === userId) return;
      this.sendToUser(userId, payload);
    });
  }
}

module.exports = WsHub;
