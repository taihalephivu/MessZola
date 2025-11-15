export class GroupPanel {
  constructor({ store, http, onSelectRoom }) {
    this.store = store;
    this.http = http;
    this.onSelectRoom = onSelectRoom;
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
      
      const submitBtn = this.createGroupForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang tạo...';
      
      try {
        await this.http.post('/rooms/group', { name, memberIds });
        this.groupNameInput.value = '';
        checkboxes.forEach(cb => cb.checked = false);
        // Reload rooms list
        const rooms = await this.http.get('/rooms');
        this.store.setRooms(this.formatRooms(rooms));
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.className = 'success-message';
        successMsg.textContent = '✓ Tạo nhóm thành công!';
        this.createGroupForm.insertAdjacentElement('afterend', successMsg);
        setTimeout(() => successMsg.remove(), 3000);
      } catch (err) {
        alert(err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  formatRooms(rooms) {
    return rooms.map((room) => ({
      ...room,
      members: room.members || '',
      is_group: Number(room.is_group)
    }));
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
      const isOwner = group.owner_id === state.user?.id;
      
      return `
        <div class="group-card" data-group-id="${group.id}">
          <div class="group-avatar">${initial}</div>
          <div class="group-info">
            <strong>${this.escape(group.name)}</strong>
            <small>${members} thành viên${isOwner ? ' • Chủ nhóm' : ''}</small>
          </div>
          ${!isOwner ? `<button class="remove-group-btn" data-leave-group="${group.id}" title="Rời nhóm">×</button>` : ''}
        </div>
      `;
    }).join('');
    
    // Add click handlers for group cards
    this.groupsList.querySelectorAll('.group-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't navigate if clicking the leave button
        if (e.target.classList.contains('remove-group-btn')) {
          return;
        }
        const groupId = card.dataset.groupId;
        if (this.onSelectRoom) {
          this.onSelectRoom(groupId);
          this.store.setView('chat');
        }
      });
    });
    
    // Add click handlers for leave buttons
    this.groupsList.querySelectorAll('[data-leave-group]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const groupId = btn.dataset.leaveGroup;
        const groupName = btn.closest('.group-card').querySelector('strong').textContent;
        
        if (confirm(`Bạn có chắc chắn muốn rời khỏi nhóm "${groupName}"?`)) {
          try {
            console.log('Leaving group:', groupId);
            const result = await this.http.delete(`/rooms/${groupId}/leave`);
            console.log('Leave result:', result);
            // Reload rooms list
            const rooms = await this.http.get('/rooms');
            this.store.setRooms(this.formatRooms(rooms));
          } catch (err) {
            console.error('Leave group error:', err);
            alert(err.message || 'Không thể rời nhóm');
          }
        }
      });
    });
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
