export class GroupPanel {
  constructor({ store, onSelectRoom }) {
    this.store = store;
    this.onSelectRoom = onSelectRoom;
    this.root = document.createElement('div');
    this.root.className = 'group-panel';
    this.root.innerHTML = this.getTemplate();
    this.listEl = this.root.querySelector('[data-group-list]');
    this.emptyEl = this.root.querySelector('[data-group-empty]');
    this.unsubscribe = this.store.subscribe((state) => this.render(state));
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
    const groups = state.rooms.filter((room) => Number(room.is_group) === 1);
    if (!groups.length) {
      this.listEl.innerHTML = '';
      this.emptyEl.style.display = 'flex';
      return;
    }
    this.emptyEl.style.display = 'none';
    this.listEl.innerHTML = groups
      .map((group) => {
        const members = group.members ? group.members.split(',').length : 1;
        return `
          <button class="group-card" data-group-id="${group.id}">
            <div>
              <strong>${group.name}</strong>
              <small>${members} thành viên</small>
            </div>
            <span class="group-card__cta">Trò chuyện</span>
          </button>
        `;
      })
      .join('');
    this.listEl.querySelectorAll('[data-group-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.onSelectRoom(btn.dataset.groupId);
      });
    });
  }

  getTemplate() {
    return `
      <section>
        <div class="panel-headline">
          <div>
            <h2>Nhóm của bạn</h2>
            <p>Chọn nhóm để mở khung chat nhóm tương ứng.</p>
          </div>
        </div>
        <div data-group-empty class="panel-empty">
          <p>Chưa có nhóm nào, hãy tạo nhóm mới từ tab Bạn bè.</p>
        </div>
        <div class="group-grid" data-group-list></div>
      </section>
    `;
  }
}
