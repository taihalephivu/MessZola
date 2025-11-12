export class AppShell {
  constructor({
    mount,
    store,
    onLogout,
    onStartDirect,
    onViewChange,
    onSelectRoom,
    chatPanel,
    friendPanel,
    profilePanel,
    groupPanel
  }) {
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
    this.mount.innerHTML = this.getTemplate();
    this.sidebarFriends = this.mount.querySelector('[data-sidebar-friends]');
    this.menuButtons = this.mount.querySelectorAll('[data-menu]');
    this.headerUser = this.mount.querySelector('[data-header-user]');
    this.avatarMenu = this.mount.querySelector('[data-avatar-menu]');
    this.avatarBtn = this.mount.querySelector('[data-avatar-btn]');
    this.avatarDropdown = this.mount.querySelector('[data-avatar-dropdown]');
    this.avatarImg = this.mount.querySelector('[data-avatar-img]');
    this.avatarInitial = this.mount.querySelector('[data-avatar-initial]');
    this.slots = {
      chat: this.mount.querySelector('[data-slot="chat"]'),
      friends: this.mount.querySelector('[data-slot="friends"]'),
      groups: this.mount.querySelector('[data-slot="groups"]'),
      profile: this.mount.querySelector('[data-slot="profile"]')
    };
    this.bindEvents();
    this.chatPanel.mount(this.slots.chat);
    this.friendPanel.mount(this.slots.friends);
    this.groupPanel.mount(this.slots.groups);
    this.profilePanel.mount(this.slots.profile);
    this.unsubscribe = this.store.subscribe((state) => this.render(state));
    this.render(this.store.getState());
  }

  bindEvents() {
    this.menuButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.closeDropdown();
        this.onViewChange(btn.dataset.menu);
      });
    });
    const logoutBtn = this.avatarDropdown.querySelector('[data-action="logout"]');
    logoutBtn.addEventListener('click', () => {
      this.closeDropdown();
      this.onLogout();
    });
    const profileBtn = this.avatarDropdown.querySelector('[data-dropdown="profile"]');
    profileBtn.addEventListener('click', () => {
      this.closeDropdown();
      this.onViewChange('profile');
    });
    const settingsBtn = this.avatarDropdown.querySelector('[data-dropdown="settings"]');
    settingsBtn.addEventListener('click', () => {
      this.closeDropdown();
      alert('Tính năng cài đặt sẽ sớm ra mắt.');
    });
    this.avatarBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      this.avatarMenu.classList.toggle('open');
    });
    this.handleDocumentClick = (event) => {
      if (!this.avatarMenu.contains(event.target)) {
        this.closeDropdown();
      }
    };
    document.addEventListener('click', this.handleDocumentClick);
  }

  render(state) {
    this.headerUser.textContent = state.user ? state.user.displayName : '';
    this.renderSidebarFriends(state);
    this.updateAvatar(state.user);
    this.menuButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.menu === state.view);
    });
    this.slots.chat.style.display = state.view === 'chat' ? 'flex' : 'none';
    this.slots.friends.style.display = state.view === 'friends' ? 'block' : 'none';
    this.slots.groups.style.display = state.view === 'groups' ? 'block' : 'none';
    this.slots.profile.style.display = state.view === 'profile' ? 'block' : 'none';
  }

  renderSidebarFriends(state) {
    if (!state.friends.length) {
      this.sidebarFriends.innerHTML = `
        <div class="sidebar-empty">
          <p>Chưa có bạn nào</p>
          <small>Thêm bạn mới ở tab Bạn bè.</small>
        </div>
      `;
      return;
    }
    this.sidebarFriends.innerHTML = state.friends
      .map((friend) => {
        const online = friend.online ? 'online' : 'offline';
        const name = friend.display_name || friend.displayName || friend.phone;
        const phone = friend.phone || '';
        return `
          <button class="sidebar-friend" data-direct="${friend.id}">
            <span class="status-dot ${online}" aria-label="${online}"></span>
            <div>
              <strong>${name}</strong>
              <small>${phone}</small>
            </div>
          </button>
        `;
      })
      .join('');
    this.sidebarFriends.querySelectorAll('button[data-direct]').forEach((btn) => {
      btn.addEventListener('click', () => this.onStartDirect(btn.dataset.direct));
    });
  }

  updateAvatar(user) {
    if (!this.avatarImg || !this.avatarInitial) {
      return;
    }
    if (user?.avatarUrl) {
      this.avatarImg.src = user.avatarUrl;
      this.avatarImg.style.display = 'block';
      this.avatarInitial.style.display = 'none';
    } else {
      const initial = user?.displayName?.[0]?.toUpperCase() || 'U';
      this.avatarInitial.textContent = initial;
      this.avatarImg.style.display = 'none';
      this.avatarInitial.style.display = 'grid';
    }
  }

  closeDropdown() {
    this.avatarMenu.classList.remove('open');
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    document.removeEventListener('click', this.handleDocumentClick);
  }

  getTemplate() {
    return `
      <div class="app-shell">
        <aside class="sidebar">
          <div class="sidebar-brand">
            <img src="./assets/logo.png" alt="MessZola Logo" width="48" height="48" />
            <div>
              <strong>MessZola</strong>
              <small data-header-user></small>
            </div>
          </div>
          <div class="sidebar-section">
            <h4>Bạn bè</h4>
            <div class="friend-scroll" data-sidebar-friends></div>
          </div>
        </aside>
        <div class="main-panel">
          <header class="app-header">
            <div class="header-left">
              <img src="./assets/logo.png" alt="MessZola Logo" class="header-logo" />
              <nav class="app-menu">
                <button type="button" data-menu="friends">Bạn bè</button>
                <button type="button" data-menu="groups">Nhóm</button>
              </nav>
            </div>
            <div class="header-right">
              <div class="avatar-toggle" data-avatar-menu>
                <button class="avatar-btn" type="button" data-avatar-btn>
                  <img data-avatar-img alt="Ảnh đại diện" />
                  <span data-avatar-initial></span>
                </button>
                <div class="avatar-dropdown" data-avatar-dropdown>
                  <button type="button" data-dropdown="profile">Trang cá nhân</button>
                  <button type="button" data-dropdown="settings">Cài đặt</button>
                  <button type="button" data-action="logout">Đăng xuất</button>
                </div>
              </div>
            </div>
          </header>
          <div class="content-area">
            <div data-slot="chat"></div>
            <div data-slot="friends" style="display:none;"></div>
            <div data-slot="groups" style="display:none;"></div>
            <div data-slot="profile" style="display:none;"></div>
          </div>
        </div>
      </div>
    `;
  }
}
