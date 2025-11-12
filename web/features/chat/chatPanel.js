export class ChatPanel {
  constructor({ store, http, wsClient, callModal }) {
    this.store = store;
    this.http = http;
    this.wsClient = wsClient;
    this.callModal = callModal;
    this.loadedRooms = new Set();
    this.cursors = {};
    this.root = document.createElement('div');
    this.root.className = 'chat-panel';
    this.root.innerHTML = this.getTemplate();
    this.messageList = this.root.querySelector('[data-message-list]');
    this.messageForm = this.root.querySelector('[data-message-form]');
    this.messageInput = this.root.querySelector('[data-message-input]');
    this.typingEl = this.root.querySelector('[data-typing]');
    this.roomTitle = this.root.querySelector('[data-room-title]');
    this.loadBtn = this.root.querySelector('[data-load-more]');
    this.fileInput = this.root.querySelector('[data-file-input]');
    this.callButton = this.root.querySelector('[data-call]');
    this.typingTimer = null;
    this.bindEvents();
    this.unsubscribe = this.store.subscribe((state) => this.render(state));
  }

  bindEvents() {
    this.messageForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const text = this.messageInput.value.trim();
      const { currentRoomId } = this.store.getState();
      if (!text || !currentRoomId) return;
      this.wsClient.sendMessage(currentRoomId, text);
      this.messageInput.value = '';
      this.wsClient.sendTyping(currentRoomId, false);
    });

    this.messageInput.addEventListener('input', () => {
      const { currentRoomId } = this.store.getState();
      if (!currentRoomId) return;
      clearTimeout(this.typingTimer);
      this.wsClient.sendTyping(currentRoomId, true);
      this.typingTimer = setTimeout(() => this.wsClient.sendTyping(currentRoomId, false), 2000);
    });

    this.loadBtn.addEventListener('click', () => {
      const { currentRoomId } = this.store.getState();
      if (currentRoomId) {
        this.loadOlder(currentRoomId);
      }
    });

    this.fileInput.addEventListener('change', async () => {
      const file = this.fileInput.files[0];
      const { currentRoomId } = this.store.getState();
      if (!file || !currentRoomId) return;
      const data = new FormData();
      data.append('file', file);
      data.append('roomId', currentRoomId);
      try {
        await this.http.post('/files/upload', data);
      } catch (err) {
        alert(err.message);
      } finally {
        this.fileInput.value = '';
      }
    });

    this.callButton.addEventListener('click', () => {
      const { currentRoomId } = this.store.getState();
      if (currentRoomId) {
        this.callModal.open(currentRoomId);
      }
    });
  }

  mount(container) {
    container.innerHTML = '';
    container.appendChild(this.root);
    this.render(this.store.getState());
  }

  async ensureHistory(roomId) {
    if (this.loadedRooms.has(roomId)) return;
    const messages = await this.http.get(`/rooms/${roomId}/messages`);
    this.store.setMessages(roomId, messages);
    if (messages.length) {
      this.cursors[roomId] = messages[0].createdAt;
    }
    this.loadedRooms.add(roomId);
    this.scrollToBottom();
  }

  async loadOlder(roomId) {
    const before = this.cursors[roomId];
    if (!before) return;
    const older = await this.http.get(`/rooms/${roomId}/messages?before=${before}`);
    if (older.length) {
      this.cursors[roomId] = older[0].createdAt;
      this.store.prependMessages(roomId, older);
    } else {
      this.loadBtn.disabled = true;
    }
  }

  render(state) {
    if (state.view !== 'chat') {
      this.root.style.display = 'none';
      return;
    }
    this.root.style.display = 'flex';
    const room = state.rooms.find((r) => r.id === state.currentRoomId);
    if (room) {
      this.roomTitle.textContent = room.name;
      this.ensureHistory(room.id);
    } else {
      this.roomTitle.textContent = 'Chọn một cuộc trò chuyện';
    }
    const messages = state.messages[state.currentRoomId] || [];
    this.renderMessages(messages, state.user?.id);
    this.loadBtn.disabled = !(this.cursors[state.currentRoomId]);
    const typers = state.typing[state.currentRoomId] || [];
    this.typingEl.textContent = typers.length ? 'Đang nhập...' : '';
  }

  renderMessages(messages, userId) {
    const maxRender = 200;
    const slice = messages.length > maxRender ? messages.slice(messages.length - maxRender) : messages;
    this.messageList.innerHTML = slice
      .map((msg) => this.renderMessage(msg, userId))
      .join('');
    this.scrollToBottom();
  }

  renderMessage(message, userId) {
    const isMe = message.senderId === userId;
    const filesMarkup = (message.files || [])
      .map((file) => `<a class="file-pill" href="${file.url}" target="_blank">${this.escape(file.name)} (${Math.round(file.size / 1024)} KB)</a>`)
      .join('');
    return `
      <div class="message ${isMe ? 'me' : ''}">
        <div class="text">${this.escape(message.content || '')}</div>
        ${filesMarkup}
        <small>${new Date(message.createdAt).toLocaleTimeString()}</small>
      </div>
    `;
  }

  scrollToBottom() {
    setTimeout(() => {
      this.messageList.scrollTop = this.messageList.scrollHeight;
    }, 50);
  }

  getTemplate() {
    return `
      <header class="chat-header" style="padding:1rem 1.5rem;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <h3 data-room-title>MessZola</h3>
          <small data-typing></small>
        </div>
        <div style="display:flex;gap:0.5rem;">
          <button type="button" data-call>Gọi video</button>
          <button type="button" data-load-more style="background:rgba(109,131,242,0.2);color:var(--color-primary);">Tải thêm</button>
        </div>
      </header>
      <div class="message-list" data-message-list></div>
      <form class="chat-input" data-message-form>
        <input data-message-input placeholder="Nhập tin nhắn..." />
        <label style="display:flex;align-items:center;justify-content:center;background:rgba(31,41,55,0.08);border-radius:var(--radius-xl);cursor:pointer;">
          📎
          <input type="file" data-file-input style="display:none;" />
        </label>
        <button type="submit">Gửi</button>
      </form>
    `;
  }

  escape(value) {
    return (value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }
}
