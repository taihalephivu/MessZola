export class GroupPanel {
  constructor({ store, http }) {
    this.store = store;
    this.http = http;
    this.root = document.createElement('div');
    this.root.className = 'group-panel';
    this.root.innerHTML = this.getTemplate();
    this.createGroupForm = this.root.querySelector('[data-create-group-form]');
    this.groupNameInput = this.root.querySelector('[data-group-name]');
    this.friendCheckboxes = this.root.querySelector('[data-group-friends]');
    this.groupsList = this.root.querySelector('[data-groups-list]');
    this.bindEvents();
    this.unsubscribe = this.store.subscribe((state) => this.render(state));
  }

  bindEvents() {
    this.createGroupForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const name = this.groupNameInput.value.trim();
      const checkboxes = this.friendCheckboxes.querySelectorAll('input[type="checkbox"]:checked');
      const memberIds = Array.from(checkboxes).map(cb => cb.value);
      
      if (!name || memberIds.length === 0) {
        alert('Vui lòng nhập tên nhóm và chọn ít nhất 1 thành viên');
        return;
      }
      
      try {
        await this.http.post('/rooms', { name, memberIds, isGroup: true });
        this.groupNameInput.value = '';
        checkboxes.forEach(cb => cb.checked = false);
        alert('Tạo nhóm thành công!');
      } catch (err) {
        alert(err.message);
      }
    });
  }

  mount(container) {
    container.innerHTML = '';
    container.appendChild(this.root);
    this.render(this.store.getState());
  }

  render(state) {
    if (state.view !== 'groups') {
      this.root.style.display = 'none';
      return;
    }
    this.root.style.display = 'block';
    
    // Render friend checkboxes for group creation
    this.renderFriendCheckboxes(state.friends || []);
    
    // Render groups list
    this.renderGroupsList(state);
  }

  renderFriendCheckboxes(friends) {
    if (friends.length === 0) {
      this.friendCheckboxes.innerHTML = '<p style="color: var(--color-muted); text-align: center;">Chưa có bạn bè để tạo nhóm</p>';
      return;
    }
    
    this.friendCheckboxes.innerHTML = friends.map(friend => {
      const name = friend.display_name || friend.displayName || friend.phone;
      return `
        <label>
          <input type="checkbox" value="${friend.id}" />
          <span>${this.escape(name)}</span>
        </label>
      `;
    }).join('');
  }

  renderGroupsList(state) {
    const groups = state.rooms ? state.rooms.filter(r => r.is_group) : [];
    
    if (groups.length === 0) {
      this.groupsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👨‍👩‍👧‍👦</div>
          <h3>Chưa có nhóm</h3>
          <p>Tạo nhóm mới ở phía trên để bắt đầu</p>
        </div>
      `;
      return;
    }
    
    this.groupsList.innerHTML = groups.map(group => {
      const members = group.members ? group.members.split(',').length : 0;
      const initial = group.name.charAt(0).toUpperCase();
      
      return `
        <div class="group-card">
          <div class="group-avatar">${initial}</div>
          <div class="group-info">
            <strong>${this.escape(group.name)}</strong>
            <small>${members} thành viên</small>
          </div>
        </div>
      `;
    }).join('');
  }

  escape(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getTemplate() {
    return `
      <div class="panel-container">
        <h2>Nhóm</h2>
        
        <section class="panel-section">
          <h3>Tạo nhóm mới</h3>
          <form data-create-group-form>
            <div class="form-field">
              <label>Tên nhóm</label>
              <input type="text" data-group-name placeholder="Nhập tên nhóm..." required />
            </div>
            
            <div class="form-field">
              <label>Chọn thành viên</label>
              <div class="checkbox-group" data-group-friends>
                <!-- Friend checkboxes will be rendered here -->
              </div>
            </div>
            
            <button type="submit" class="btn-primary">Tạo nhóm</button>
          </form>
        </section>
        
        <section class="panel-section">
          <h3>Danh sách nhóm</h3>
          <div class="groups-list" data-groups-list>
            <!-- Groups will be rendered here -->
          </div>
        </section>
      </div>
    `;
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
