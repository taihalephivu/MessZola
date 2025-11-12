export class SettingsPanel {
  constructor({ store }) {
    this.store = store;
    this.root = document.createElement('div');
    this.root.className = 'settings-panel';
    this.root.innerHTML = this.getTemplate();
  }

  mount(container) {
    container.innerHTML = '';
    container.appendChild(this.root);
    this.render(this.store.getState());
  }

  render(state) {
    if (state.view !== 'settings') {
      this.root.style.display = 'none';
      return;
    }
    this.root.style.display = 'block';
  }

  getTemplate() {
    return `
      <div class="panel-container">
        <h2>Cài đặt</h2>
        
        <section class="panel-section">
          <h3>Thông báo</h3>
          <div class="setting-item">
            <label>
              <input type="checkbox" checked />
              <span>Bật thông báo tin nhắn mới</span>
            </label>
          </div>
          <div class="setting-item">
            <label>
              <input type="checkbox" checked />
              <span>Bật âm thanh thông báo</span>
            </label>
          </div>
        </section>
        
        <section class="panel-section">
          <h3>Giao diện</h3>
          <div class="setting-item">
            <label>
              <span>Chế độ hiển thị</span>
              <select>
                <option value="light">Sáng</option>
                <option value="dark">Tối</option>
                <option value="auto">Tự động</option>
              </select>
            </label>
          </div>
        </section>
        
        <section class="panel-section">
          <h3>Quyền riêng tư</h3>
          <div class="setting-item">
            <label>
              <input type="checkbox" checked />
              <span>Hiển thị trạng thái trực tuyến</span>
            </label>
          </div>
          <div class="setting-item">
            <label>
              <input type="checkbox" checked />
              <span>Cho phép người khác tìm kiếm bằng số điện thoại</span>
            </label>
          </div>
        </section>
      </div>
    `;
  }

  destroy() {
    // Cleanup if needed
  }
}
