export class AppShell {
  constructor({ mount, store, onLogout, onStartDirect, onViewChange, onSelectRoom, chatPanel, friendPanel, profilePanel, groupPanel, settingsPanel }) {
    this.mount = mount;
    this.store = store;
    this.onLogout = onLogout;
    this.onStartDirect = onStartDirect;
    this.onViewChange = onViewChange;
    this.onSelectRoom = onSelectRoom;
    this.chatPanel = chatPanel;
    this.friendPanel = friendPanel;
    this.profilePanel = profilePanel;
    this.groupPanel = groupPanel;
    this.settingsPanel = settingsPanel;
    this.mount.innerHTML = this.getTemplate();
    this.sidebarContent = this.mount.querySelector('[data-sidebar-content]');
    this.navButtons = this.mount.querySelectorAll('.nav-btn[data-view]');
    this.userAvatar = this.mount.querySelector('[data-user-avatar]');
    this.userDropdown = this.mount.querySelector('[data-user-dropdown]');
    this.searchInput = this.mount.querySelector('[data-search-input]');
    this.slots = {
      chat: this.mount.querySelector('[data-slot=\"chat\"]'),
      friends: this.mount.querySelector('[data-slot=\"friends\"]'),
      groups: this.mount.querySelector('[data-slot=\"groups\"]'),
      profile: this.mount.querySelector('[data-slot=\"profile\"]'),
      settings: this.mount.querySelector('[data-slot=\"settings\"]')
    };
    this.bindEvents();
    this.chatPanel.mount(this.slots.chat);
    this.friendPanel.mount(this.slots.friends);
    this.profilePanel.mount(this.slots.profile);
    if (this.groupPanel) this.groupPanel.mount(this.slots.groups);
    if (this.settingsPanel) this.settingsPanel.mount(this.slots.settings);
    this.unsubscribe = this.store.subscribe((state) => this.render(state));
    this.render(this.store.getState());
  }

  bindEvents() {
    // Logout button
    this.mount.querySelector('[data-action="logout"]').addEventListener('click', this.onLogout);
    
    // Navigation buttons
    this.navButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.onViewChange(btn.dataset.view);
        this.navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // User dropdown menu
    const toggleBtn = this.mount.querySelector('[data-toggle-menu]');
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.userDropdown.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      this.userDropdown.classList.remove('show');
    });

    // Dropdown menu items
    this.userDropdown.querySelectorAll('button[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.onViewChange(btn.dataset.view);
        this.userDropdown.classList.remove('show');
      });
    });

    // Search input
    this.searchInput.addEventListener('input', (e) => {
      this.filterSidebar(e.target.value);
    });
  }

  render(state) {
    // Update user avatar
    if (state.user) {
      const initial = (state.user.displayName || state.user.phone || 'U').charAt(0).toUpperCase();
      this.userAvatar.textContent = initial;
    }
    
    // Update active view buttons
    this.navButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.view === state.view));
    
    // Show/hide sidebar based on view
    const sidebar = this.mount.querySelector('.sidebar');
    if (state.view === 'chat' || state.view === 'groups') {
      sidebar.style.display = 'flex';
      this.renderSidebar(state);
    } else {
      sidebar.style.display = 'none';
    }
    
    // Toggle content slots
    Object.keys(this.slots).forEach(key => {
      this.slots[key].style.display = state.view === key ? (key === 'chat' ? 'flex' : 'block') : 'none';
    });
  }

  renderSidebar(state) {
    const view = state.view;
    
    if (view === 'chat') {
      this.renderFriendsList(state);
    } else if (view === 'groups') {
      this.renderGroupsList(state);
    } else {
      // Hide sidebar for other views
      this.sidebarContent.innerHTML = '';
    }
  }

  renderFriendsList(state) {
    if (!state.friends || state.friends.length === 0) {
      this.sidebarContent.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <h3>Chưa có bạn bè</h3>
          <p>Thêm bạn bè để bắt đầu trò chuyện</p>
        </div>
      `;
      return;
    }
    
    const items = state.friends.map((friend) => {
      const initial = (friend.display_name || friend.displayName || friend.phone || 'U').charAt(0).toUpperCase();
      const isOnline = Math.random() > 0.5; // Mock online status - replace with real data
      const name = friend.display_name || friend.displayName || friend.phone;
      
      return `
        <div class="sidebar-item" data-friend-id="${friend.id}">
          <div class="sidebar-avatar ${isOnline ? 'online' : 'offline'}">${initial}</div>
          <div class="sidebar-info">
            <strong>${this.escape(name)}</strong>
            <small class="status-text">${isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}</small>
          </div>
          <div class="online-indicator ${isOnline ? 'online' : 'offline'}"></div>
        </div>
      `;
    });
    
    this.sidebarContent.innerHTML = items.join('');
    this.sidebarContent.querySelectorAll('[data-friend-id]').forEach((el) => {
      el.addEventListener('click', () => this.onStartDirect(el.dataset.friendId));
    });
  }

  renderGroupsList(state) {
    const groups = state.rooms ? state.rooms.filter(r => r.is_group) : [];
    
    if (groups.length === 0) {
      this.sidebarContent.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👨‍👩‍👧‍👦</div>
          <h3>Chưa có nhóm</h3>
          <p>Tạo nhóm mới để trò chuyện cùng nhiều người</p>
        </div>
      `;
      return;
    }
    
    const items = groups.map((group) => {
      const initial = group.name.charAt(0).toUpperCase();
      const members = group.members ? group.members.split(',').length : 0;
      const lastMessage = this.getLastMessage(state, group.id);
      
      return `
        <div class="sidebar-item ${state.currentRoomId === group.id ? 'active' : ''}" data-room-id="${group.id}">
          <div class="sidebar-avatar group">${initial}</div>
          <div class="sidebar-info">
            <strong>${this.escape(group.name)}</strong>
            <small>${lastMessage || `${members} thành viên`}</small>
          </div>
        </div>
      `;
    });
    
    this.sidebarContent.innerHTML = items.join('');
    this.sidebarContent.querySelectorAll('[data-room-id]').forEach((el) => {
      el.addEventListener('click', () => this.onSelectRoom(el.dataset.roomId));
    });
  }
  
  getLastMessage(state, roomId) {
    const messages = state.messages[roomId];
    if (!messages || messages.length === 0) return '';
    const last = messages[messages.length - 1];
    const preview = last.content ? last.content.substring(0, 30) : '📎 File';
    return preview.length < (last.content?.length || 0) ? preview + '...' : preview;
  }
  
  escape(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  filterSidebar(query) {
    const items = this.sidebarContent.querySelectorAll('.sidebar-item');
    const lowerQuery = query.toLowerCase();
    
    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(lowerQuery) ? 'flex' : 'none';
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
        <!-- Header -->
        <header class="app-main-header">
          <div class="header-left">
            <img src="./assets/logo.png" alt="MessZola" class="header-logo" />
          </div>
          <nav class="header-nav">
            <button data-view="chat" class="nav-btn active">
              <span class="nav-icon">💬</span>
              <span class="nav-text">Trò chuyện</span>
            </button>
            <button data-view="friends" class="nav-btn">
              <span class="nav-icon">👥</span>
              <span class="nav-text">Bạn bè</span>
            </button>
            <button data-view="groups" class="nav-btn">
              <span class="nav-icon">👨‍👩‍👧‍👦</span>
              <span class="nav-text">Nhóm</span>
            </button>
          </nav>
          <div class="header-right">
            <div class="user-menu">
              <button class="user-avatar-btn" data-toggle-menu>
                <div class="user-avatar" data-user-avatar>👤</div>
              </button>
              <div class="user-dropdown" data-user-dropdown>
                <button data-view="profile">
                  <span>👤</span> Trang cá nhân
                </button>
                <button data-view="settings">
                  <span>⚙️</span> Cài đặt
                </button>
                <div class="dropdown-divider"></div>
                <button data-action="logout" class="danger">
                  <span>🚪</span> Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Sidebar -->
        <aside class="sidebar">
          <div class="sidebar-search">
            <input type="text" placeholder="Tìm kiếm..." data-search-input />
          </div>
          <div class="sidebar-content" data-sidebar-content>
            <!-- Danh sách bạn bè sẽ được render ở đây -->
          </div>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
          <div data-slot="chat"></div>
          <div data-slot="friends" style="display:none;"></div>
          <div data-slot="groups" style="display:none;"></div>
          <div data-slot="profile" style="display:none;"></div>
          <div data-slot="settings" style="display:none;"></div>
        </main>
      </div>
    `;
  }
}
