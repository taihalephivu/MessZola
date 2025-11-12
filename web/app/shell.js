export class AppShell {
  constructor({ mount, store, onLogout, onStartDirect, onViewChange, onSelectRoom, chatPanel, friendPanel, profilePanel }) {
    this.mount = mount;
    this.store = store;
    this.onLogout = onLogout;
    this.onStartDirect = onStartDirect;
    this.onViewChange = onViewChange;
    this.onSelectRoom = onSelectRoom;
    this.chatPanel = chatPanel;
    this.friendPanel = friendPanel;
    this.profilePanel = profilePanel;
    this.mount.innerHTML = this.getTemplate();
    this.sidebarRooms = this.mount.querySelector('[data-room-list]');
    this.sidebarFriends = this.mount.querySelector('[data-friend-shortcuts]');
    this.navButtons = this.mount.querySelectorAll('[data-view]');
    this.headerUser = this.mount.querySelector('[data-header-user]');
    this.slots = {
      chat: this.mount.querySelector('[data-slot=\"chat\"]'),
      friends: this.mount.querySelector('[data-slot=\"friends\"]'),
      profile: this.mount.querySelector('[data-slot=\"profile\"]')
    };
    this.bindEvents();
    this.chatPanel.mount(this.slots.chat);
    this.friendPanel.mount(this.slots.friends);
    this.profilePanel.mount(this.slots.profile);
    this.unsubscribe = this.store.subscribe((state) => this.render(state));
    this.render(this.store.getState());
  }

  bindEvents() {
    this.mount.querySelector('[data-action="logout"]').addEventListener('click', this.onLogout);
    this.navButtons.forEach((btn) => {
      btn.addEventListener('click', () => this.onViewChange(btn.dataset.view));
    });
  }

  render(state) {
    this.headerUser.textContent = state.user ? `Xin chào, ${state.user.displayName}` : '';
    this.navButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.view === state.view));
    this.renderRooms(state);
    this.renderFriendShortcuts(state);
    this.slots.chat.style.display = state.view === 'chat' ? 'flex' : 'none';
    this.slots.friends.style.display = state.view === 'friends' ? 'block' : 'none';
    this.slots.profile.style.display = state.view === 'profile' ? 'block' : 'none';
  }

  renderRooms(state) {
    const items = state.rooms.map((room) => {
      const members = room.members ? room.members.split(',').length : 0;
      return `
        <div class="friend-item ${state.currentRoomId === room.id ? 'active' : ''}" data-room-id="${room.id}">
          <div>
            <strong>${room.name}</strong>
            <small>${room.is_group ? `${members} thành viên` : 'Trực tiếp'}</small>
          </div>
        </div>
      `;
    });
    this.sidebarRooms.innerHTML = items.join('') || '<p>Chưa có phòng nào</p>';
    this.sidebarRooms.querySelectorAll('[data-room-id]').forEach((el) => {
      el.addEventListener('click', () => this.onSelectRoom(el.dataset.roomId));
    });
  }

  renderFriendShortcuts(state) {
    this.sidebarFriends.innerHTML = state.friends
      .map((friend) => `<button data-direct="${friend.id}">${friend.display_name || friend.displayName || friend.phone}</button>`)
      .join('');
    this.sidebarFriends.querySelectorAll('button[data-direct]').forEach((btn) => {
      btn.addEventListener('click', () => this.onStartDirect(btn.dataset.direct));
    });
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  getTemplate() {
    return `
      <div class="app-shell">
        <aside class="sidebar">
          <div class="logo">MessZola</div>
          <div>
            <h4>Cuộc trò chuyện</h4>
            <div class="friend-list" data-room-list></div>
          </div>
          <div>
            <h4>Bạn bè</h4>
            <div class="friend-shortcuts" data-friend-shortcuts></div>
          </div>
        </aside>
        <div class="main-panel">
          <header class="app-header">
            <div>
              <p data-header-user></p>
              <small>Trạng thái online</small>
            </div>
            <div class="nav-group">
              <button data-view="chat">Chat</button>
              <button data-view="friends">Bạn bè</button>
              <button data-view="profile">Hồ sơ</button>
              <button data-action="logout" style="background:#ef4444;color:#fff;">Đăng xuất</button>
            </div>
          </header>
          <div class="content-area" data-content>
            <div data-slot="chat"></div>
            <div data-slot="friends" style="display:none;"></div>
            <div data-slot="profile" style="display:none;"></div>
          </div>
        </div>
      </div>
    `;
  }
}
