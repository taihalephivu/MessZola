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
    this.inviteDialog = null;
    this.latestState = null;
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
        await this.reloadRooms();
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

  async reloadRooms() {
    const rooms = await this.http.get('/rooms');
    this.store.setRooms(this.formatRooms(rooms));
  }

  mount(container) {
    container.innerHTML = '';
    container.appendChild(this.root);
    this.render(this.store.getState());
  }

  render(state) {
    this.latestState = state;
    if (state.view !== 'groups') {
      this.root.style.display = 'none';
      this.closeInviteDialog();
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
      const actionButtons = isOwner
        ? `<div class="group-actions">
             <button class="remove-group-btn" data-invite-group="${group.id}" title="Mời thêm thành viên">＋</button>
             <button class="remove-group-btn" data-disband-group="${group.id}" title="Giải tán nhóm">🗑</button>
           </div>`
        : `<button class="remove-group-btn" data-leave-group="${group.id}" title="Rời nhóm">×</button>`;
      
      return `
        <div class="group-card" data-group-id="${group.id}">
          <div class="group-avatar">${initial}</div>
          <div class="group-info">
            <strong>${this.escape(group.name)}</strong>
            <small>${members} thành viên${isOwner ? ' • Chủ nhóm' : ''}</small>
          </div>
          ${actionButtons}
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
            await this.reloadRooms();
          } catch (err) {
            console.error('Leave group error:', err);
            alert(err.message || 'Không thể rời nhóm');
          }
        }
      });
    });

    this.groupsList.querySelectorAll('[data-disband-group]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const groupId = btn.dataset.disbandGroup;
        const groupName = btn.closest('.group-card').querySelector('strong').textContent;
        if (!confirm(`Giải tán nhóm "${groupName}"? Hành động này không thể hoàn tác.`)) {
          return;
        }
        const originalLabel = btn.textContent;
        btn.disabled = true;
        btn.textContent = '...';
        try {
          await this.http.delete(`/rooms/${groupId}`);
          await this.reloadRooms();
        } catch (err) {
          console.error('Disband group error:', err);
          alert(err.message || 'Không thể giải tán nhóm');
        } finally {
          btn.disabled = false;
          btn.textContent = originalLabel;
        }
      });
    });

    this.groupsList.querySelectorAll('[data-invite-group]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const groupId = btn.dataset.inviteGroup;
        const group = groups.find((g) => g.id === groupId);
        if (group) {
          this.openInviteDialog(group);
        }
      });
    });
  }

  openInviteDialog(group) {
    const friends = this.latestState?.friends || [];
    const memberSet = new Set((group.members || '').split(',').filter(Boolean));
    const eligibleFriends = friends.filter((friend) => !memberSet.has(friend.id));
    if (!eligibleFriends.length) {
      alert('Không còn bạn bè nào để mời vào nhóm này');
      return;
    }
    this.closeInviteDialog();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 9999;`;
    overlay.innerHTML = `
      <div class="modal" style="background: #fff; padding: 24px; border-radius: 12px; width: min(420px, 90%); max-height: 80vh; overflow: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.25);">
        <h3 style="margin-top: 0;">Mời bạn bè vào "${this.escape(group.name)}"</h3>
        <form data-invite-form>
          <div class="checkbox-group" data-invite-list style="margin-bottom: 16px;">
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" data-close-modal class="btn-secondary">Hủy</button>
            <button type="submit" class="btn-primary">Mời</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);
    this.inviteDialog = overlay;
    const list = overlay.querySelector('[data-invite-list]');
    list.innerHTML = eligibleFriends.map((friend) => {
      const name = friend.display_name || friend.displayName || friend.phone;
      return `
        <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <input type="checkbox" value="${friend.id}" />
          <span>${this.escape(name)}</span>
        </label>
      `;
    }).join('');

    overlay.querySelector('[data-close-modal]').addEventListener('click', () => this.closeInviteDialog());
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        this.closeInviteDialog();
      }
    });

    const form = overlay.querySelector('[data-invite-form]');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const checked = list.querySelectorAll('input[type="checkbox"]:checked');
      const memberIds = Array.from(checked).map((cb) => cb.value);
      if (memberIds.length === 0) {
        alert('Vui lòng chọn ít nhất một người bạn');
        return;
      }
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang mời...';
      try {
        await this.http.post(`/rooms/${group.id}/members`, { memberIds });
        await this.reloadRooms();
        this.closeInviteDialog();
        alert('Đã gửi lời mời thành công');
      } catch (err) {
        console.error('Invite members error:', err);
        alert(err.message || 'Không thể mời thành viên');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  closeInviteDialog() {
    if (this.inviteDialog) {
      this.inviteDialog.remove();
      this.inviteDialog = null;
    }
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
    this.closeInviteDialog();
  }
}
