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
    this.fileInput = this.root.querySelector('[data-file-input]');
    this.callButton = this.root.querySelector('[data-call]');
    this.infoButton = this.root.querySelector('[data-info]');
    this.chatName = this.root.querySelector('[data-chat-name]');
    this.chatStatus = this.root.querySelector('[data-chat-status]');
    this.chatAvatar = this.root.querySelector('[data-chat-avatar]');
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

    // Scroll to load more
    this.messageList.addEventListener('scroll', () => {
      if (this.messageList.scrollTop === 0) {
        const { currentRoomId } = this.store.getState();
        if (currentRoomId && this.cursors[currentRoomId]) {
          this.loadOlder(currentRoomId);
        }
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

    this.infoButton.addEventListener('click', () => {
      const { currentRoomId } = this.store.getState();
      if (currentRoomId) {
        // TODO: Show room info modal or panel
        alert('Tính năng chi tiết đang được phát triển');
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
      // Update header with room info
      this.chatName.textContent = room.name;
      const initial = room.name.charAt(0).toUpperCase();
      this.chatAvatar.textContent = initial;
      
      if (room.is_group) {
        const members = room.members ? room.members.split(',').length : 0;
        this.chatStatus.textContent = `${members} thành viên`;
      } else {
        // For direct chat, show online status (mock for now)
        const isOnline = Math.random() > 0.5;
        this.chatStatus.textContent = isOnline ? 'Đang hoạt động' : 'Ngoại tuyến';
      }
      
      this.ensureHistory(room.id);
    } else {
      // No room selected
      this.chatName.textContent = 'Chọn một cuộc trò chuyện';
      this.chatStatus.textContent = 'Chọn từ danh sách bên trái';
      this.chatAvatar.textContent = '💬';
    }
    
    const messages = state.messages[state.currentRoomId] || [];
    this.renderMessages(messages, state.user?.id);
    
    const typers = state.typing[state.currentRoomId] || [];
    this.typingEl.style.display = typers.length ? 'flex' : 'none';
  }

  renderMessages(messages, userId) {
    if (!messages.length) {
      this.messageList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💬</div>
          <h3>Chưa có tin nhắn</h3>
          <p>Bắt đầu cuộc trò chuyện bằng cách gửi tin nhắn đầu tiên</p>
        </div>
      `;
      return;
    }
    
    const maxRender = 200;
    const slice = messages.length > maxRender ? messages.slice(messages.length - maxRender) : messages;
    
    // Group messages by sender
    const grouped = [];
    let currentGroup = null;
    
    slice.forEach((msg) => {
      if (!currentGroup || currentGroup.senderId !== msg.senderId) {
        currentGroup = {
          senderId: msg.senderId,
          senderName: msg.senderName || 'User',
          messages: []
        };
        grouped.push(currentGroup);
      }
      currentGroup.messages.push(msg);
    });
    
    this.messageList.innerHTML = grouped
      .map((group) => this.renderMessageGroup(group, userId))
      .join('');
    this.scrollToBottom();
  }

  renderMessageGroup(group, userId) {
    const isMe = group.senderId === userId;
    
    // Get proper display name and initial
    let displayName = group.senderName || 'User';
    let initial = displayName.charAt(0).toUpperCase();
    
    // If it's the current user, use "You" or their name
    if (isMe) {
      const state = this.store.getState();
      if (state.user) {
        displayName = state.user.displayName || state.user.phone || 'Bạn';
        initial = displayName.charAt(0).toUpperCase();
      }
    }
    
    // Generate color based on senderId for consistent avatar colors
    const avatarColor = this.getAvatarColor(group.senderId);
    
    const messagesHtml = group.messages.map(msg => {
      const filesMarkup = (msg.files || [])
        .map((file) => `<a class="file-pill" href="${file.url}" target="_blank">${this.escape(file.name)} (${Math.round(file.size / 1024)} KB)</a>`)
        .join('');
      const time = new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      
      return `
        <div class="message ${isMe ? 'me' : ''}">
          ${this.escape(msg.content || '')}
          ${filesMarkup}
          <small>${time}</small>
        </div>
      `;
    }).join('');
    
    return `
      <div class="message-group ${isMe ? 'me' : ''}">
        <div class="message-avatar" style="background: ${avatarColor};">${initial}</div>
        <div class="message-content">
          ${!isMe ? `<div class="message-sender">${this.escape(displayName)}</div>` : ''}
          ${messagesHtml}
        </div>
      </div>
    `;
  }

  getAvatarColor(userId) {
    // Generate consistent color based on userId
    const colors = [
      'linear-gradient(135deg, #6D83F2, #8EA3FF)',
      'linear-gradient(135deg, #F29D52, #FFB87A)',
      'linear-gradient(135deg, #10B981, #34D399)',
      'linear-gradient(135deg, #8B5CF6, #A78BFA)',
      'linear-gradient(135deg, #EF4444, #F87171)',
      'linear-gradient(135deg, #06B6D4, #22D3EE)',
      'linear-gradient(135deg, #F59E0B, #FBBF24)',
      'linear-gradient(135deg, #EC4899, #F472B6)'
    ];
    
    // Simple hash function to get consistent color for same userId
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  scrollToBottom() {
    setTimeout(() => {
      this.messageList.scrollTop = this.messageList.scrollHeight;
    }, 50);
  }

  getTemplate() {
    return `
      <div class="chat-header">
        <div class="chat-header-info">
          <div class="chat-header-avatar" data-chat-avatar>💬</div>
          <div class="chat-header-details">
            <h3 data-chat-name>Chọn một cuộc trò chuyện</h3>
            <p data-chat-status>Chọn từ danh sách bên trái</p>
          </div>
        </div>
        <div class="chat-header-actions">
          <button type="button" data-call class="icon-btn" title="Gọi video">📹</button>
          <button type="button" data-info class="icon-btn" title="Chi tiết">ℹ️</button>
        </div>
      </div>
      <div class="message-list" data-message-list>
        <div class="empty-state">
          <div class="empty-state-icon">💬</div>
          <h3>Chưa có tin nhắn</h3>
          <p>Bắt đầu cuộc trò chuyện bằng cách gửi tin nhắn đầu tiên</p>
        </div>
      </div>
      <div class="typing-indicator" data-typing style="display:none;">
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span>Đang nhập...</span>
      </div>
      <form class="chat-input" data-message-form>
        <div class="chat-input-wrapper">
          <div class="chat-input-actions">
            <button type="button" title="Emoji">😊</button>
            <label title="Đính kèm file">
              📎
              <input type="file" data-file-input style="display:none;" />
            </label>
          </div>
          <input data-message-input placeholder="Nhập tin nhắn..." />
        </div>
        <button type="submit" class="send-btn" title="Gửi">➤</button>
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
