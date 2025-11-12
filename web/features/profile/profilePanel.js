export class ProfilePanel {
  constructor({ store, http }) {
    this.store = store;
    this.http = http;
    this.root = document.createElement('div');
    this.root.className = 'profile-panel';
    this.root.innerHTML = this.getTemplate();
    this.profileForm = this.root.querySelector('[data-profile-form]');
    this.passwordForm = this.root.querySelector('[data-password-form]');
    this.messageEl = this.root.querySelector('[data-profile-msg]');
    this.passwordMsg = this.root.querySelector('[data-password-msg]');
    this.bindEvents();
    this.unsubscribe = this.store.subscribe((state) => this.render(state));
  }

  bindEvents() {
    this.profileForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(this.profileForm);
      try {
        const payload = {
          displayName: formData.get('displayName'),
          bio: formData.get('bio'),
          avatarUrl: formData.get('avatarUrl')
        };
        const profile = await this.http.patch('/users/me', payload);
        this.store.setUser(profile);
        this.messageEl.textContent = 'Đã cập nhật hồ sơ';
      } catch (err) {
        this.messageEl.textContent = err.message;
      }
    });

    this.passwordForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(this.passwordForm);
      try {
        await this.http.patch('/users/me/password', { password: formData.get('password') });
        this.passwordMsg.textContent = 'Đã đổi mật khẩu';
        this.passwordForm.reset();
      } catch (err) {
        this.passwordMsg.textContent = err.message;
      }
    });
  }

  mount(container) {
    container.innerHTML = '';
    container.appendChild(this.root);
    this.render(this.store.getState());
  }

  render(state) {
    if (state.view !== 'profile') {
      this.root.style.display = 'none';
      return;
    }
    this.root.style.display = 'block';
    const user = state.user || {};
    this.profileForm.displayName.value = user.displayName || '';
    this.profileForm.bio.value = user.bio || '';
    this.profileForm.avatarUrl.value = user.avatarUrl || '';
  }

  getTemplate() {
    return `
      <section>
        <h2>Hồ sơ cá nhân</h2>
        <form data-profile-form>
          <label>Tên hiển thị</label>
          <input name="displayName" required />
          <label>Avatar URL</label>
          <input name="avatarUrl" placeholder="https://..." />
          <label>Giới thiệu</label>
          <textarea name="bio" rows="3"></textarea>
          <p data-profile-msg style="color: var(--color-accent);"></p>
          <button type="submit">Lưu hồ sơ</button>
        </form>
        <hr style="margin:2rem 0; border:none; border-top:1px solid rgba(0,0,0,0.06);" />
        <h3>Bảo mật</h3>
        <form data-password-form>
          <label>Mật khẩu mới</label>
          <input type="password" name="password" required />
          <p data-password-msg style="color: var(--color-accent);"></p>
          <button type="submit">Đổi mật khẩu</button>
        </form>
      </section>
    `;
  }
}
