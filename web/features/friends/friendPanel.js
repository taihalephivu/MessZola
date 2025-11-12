export class FriendPanel {
  constructor({ store, http }) {
    this.store = store;
    this.http = http;
    this.root = document.createElement('div');
    this.root.className = 'friend-panel';
    this.root.innerHTML = this.getTemplate();
    this.searchInput = this.root.querySelector('[data-search]');
    this.searchResults = this.root.querySelector('[data-results]');
    this.requestList = this.root.querySelector('[data-request-list]');
    this.friendsList = this.root.querySelector('[data-friends]');
    this.groupForm = this.root.querySelector('[data-group-form]');
    this.groupFriends = this.root.querySelector('[data-group-friends]');
    this.bindEvents();
    this.unsubscribe = this.store.subscribe((state) => this.render(state));
  }

  bindEvents() {
    this.searchInput.addEventListener('input', async () => {
      const term = this.searchInput.value.trim();
      if (term.length < 3) {
        this.searchResults.innerHTML = '';
        return;
      }
      try {
        const results = await this.http.get(`/users/search?q=${encodeURIComponent(term)}`);
        this.renderResults(results);
      } catch (err) {
        this.searchResults.innerHTML = `<p>${err.message}</p>`;
      }
    });

    this.groupForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(this.groupForm);
      const name = formData.get('groupName');
      const memberIds = Array.from(this.groupFriends.querySelectorAll('input[type="checkbox"]'))
        .filter((input) => input.checked)
        .map((input) => input.value);
      if (!memberIds.length) {
        alert('Chọn ít nhất một thành viên');
        return;
      }
      try {
        const room = await this.http.post('/rooms/group', { name, memberIds });
        const rooms = await this.http.get('/rooms');
        this.store.setRooms(rooms);
        alert(`Đã tạo nhóm ${room.name}`);
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
    if (state.view !== 'friends') {
      this.root.style.display = 'none';
      return;
    }
    this.root.style.display = 'block';
    this.requestList.innerHTML = state.friendRequests
      .map((req) => `
        <div class="request-card">
          <div>
            <strong>${req.display_name}</strong>
            <p>${req.phone}</p>
          </div>
          <button data-accept="${req.id}">Chấp nhận</button>
        </div>
      `)
      .join('');
    this.requestList.querySelectorAll('button[data-accept]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await this.http.post(`/friends/requests/${btn.dataset.accept}/accept`);
        this.reloadData();
      });
    });
    this.friendsList.innerHTML = state.friends
      .map((friend) => `<div class="friend-item">${friend.display_name || friend.displayName}</div>`)
      .join('');
    this.renderGroupOptions(state.friends);
  }

  async reloadData() {
    const [friends, requests] = await Promise.all([
      this.http.get('/friends'),
      this.http.get('/friends/requests')
    ]);
    this.store.setFriends(friends);
    this.store.setFriendRequests(requests);
  }

  renderResults(results) {
    if (!results.length) {
      this.searchResults.innerHTML = '<p>Không tìm thấy người dùng</p>';
      return;
    }
    this.searchResults.innerHTML = results
      .map((user) => `
        <div class="friend-item" data-invite="${user.id}">
          <span>${user.displayName || user.display_name}</span>
          <button data-invite="${user.id}">Kết bạn</button>
        </div>
      `)
      .join('');
    this.searchResults.querySelectorAll('button[data-invite]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await this.http.post('/friends/requests', { toUserId: btn.dataset.invite });
          btn.textContent = 'Đã gửi';
          btn.disabled = true;
        } catch (err) {
          alert(err.message);
        }
      });
    });
  }

  renderGroupOptions(friends) {
    this.groupFriends.innerHTML = friends
      .map((friend) => `
        <label style="display:flex;align-items:center;gap:0.5rem;">
          <input type="checkbox" value="${friend.id || friend.user_id}" />
          <span>${friend.display_name || friend.displayName || friend.phone}</span>
        </label>
      `)
      .join('');
  }

  getTemplate() {
    return `
      <section>
        <h2>Kết bạn</h2>
        <input data-search placeholder="Tìm bằng tên hoặc số điện thoại" />
        <div data-results style="margin:1rem 0; display:flex; flex-direction:column; gap:0.5rem;"></div>
        <h3>Lời mời kết bạn</h3>
        <div class="friend-requests" data-request-list></div>
        <h3>Bạn bè</h3>
        <div data-friends></div>
        <h3>Tạo nhóm</h3>
        <form data-group-form>
          <input name="groupName" placeholder="Tên nhóm" required />
          <div data-group-friends style="display:grid;gap:0.5rem;margin:0.5rem 0;"></div>
          <button type="submit">Tạo nhóm</button>
        </form>
      </section>
    `;
  }
}
