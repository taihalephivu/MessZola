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
    // Avatar upload
    const avatarInput = this.root.querySelector('#avatarInput');
    const uploadBtn = this.root.querySelector('#uploadAvatarBtn');
    const avatarMsg = this.root.querySelector('#avatarMsg');
    
    uploadBtn.addEventListener('click', () => avatarInput.click());
    
    avatarInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      if (!file.type.startsWith('image/')) {
        avatarMsg.textContent = 'Vui lòng chọn file ảnh';
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        avatarMsg.textContent = 'Ảnh không được vượt quá 5MB';
        return;
      }
      
      const formData = new FormData();
      formData.append('avatar', file);
      
      uploadBtn.disabled = true;
      uploadBtn.textContent = 'Đang tải lên...';
      
      try {
        const response = await fetch('/api/users/me/avatar', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('messzola_token')}` },
          body: formData
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload thất bại');
        }
        
        const profile = await response.json();
        this.store.setUser(profile);
        avatarMsg.textContent = '✓ Đã cập nhật avatar';
        avatarMsg.style.color = 'var(--color-accent)';
      } catch (err) {
        avatarMsg.textContent = err.message;
        avatarMsg.style.color = '#EF4444';
      } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Chọn ảnh avatar';
      }
    });
    
    this.profileForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(this.profileForm);
      try {
        const payload = {
          displayName: formData.get('displayName'),
          bio: formData.get('bio')
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
    this.profileForm.phone.value = user.phone || '';
    this.profileForm.displayName.value = user.displayName || '';
    this.profileForm.bio.value = user.bio || '';
    
    // Update avatar preview
    const avatarImage = this.root.querySelector('#avatarImage');
    const avatarInitial = this.root.querySelector('#avatarInitial');
    
    if (user.avatarUrl) {
      avatarImage.src = user.avatarUrl;
      avatarImage.style.display = 'block';
      avatarInitial.style.display = 'none';
    } else {
      avatarImage.style.display = 'none';
      avatarInitial.style.display = 'block';
      const initial = (user.displayName || user.phone || 'U').charAt(0).toUpperCase();
      avatarInitial.textContent = initial;
    }
  }

  getTemplate() {
    return `
      <div class="panel-container">
        <h2>Trang cá nhân</h2>
        
        <section class="panel-section">
          <h3>Ảnh đại diện</h3>
          <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
            <div id="avatarPreview" style="width: 120px; height: 120px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, var(--color-primary), #8EA3FF); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(109, 131, 242, 0.3);">
              <span id="avatarInitial" style="font-size: 3rem; color: #fff; font-weight: 600;">U</span>
              <img id="avatarImage" src="" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; display: none;" />
            </div>
            <input type="file" id="avatarInput" accept="image/*" style="display: none;" />
            <button type="button" id="uploadAvatarBtn" class="btn-primary">Chọn ảnh avatar</button>
            <p id="avatarMsg" style="color: var(--color-accent); margin-top: 0.5rem;"></p>
          </div>
        </section>
        
        <section class="panel-section">
          <h3>Thông tin cá nhân</h3>
          <form data-profile-form>
            <div class="form-field">
              <label>Số điện thoại</label>
              <input name="phone" disabled style="background: var(--color-bg); cursor: not-allowed;" />
            </div>
            <div class="form-field">
              <label>Tên hiển thị</label>
              <input name="displayName" required />
            </div>
            <div class="form-field">
              <label>Giới thiệu</label>
              <textarea name="bio" rows="3" placeholder="Viết vài dòng về bạn..."></textarea>
            </div>
            <p data-profile-msg style="color: var(--color-accent);"></p>
            <button type="submit" class="btn-primary">Lưu hồ sơ</button>
          </form>
        </section>
        
        <section class="panel-section">
          <h3>Bảo mật</h3>
          <form data-password-form>
            <input type="text" name="username" autocomplete="username" style="display: none;" />
            <div class="form-field">
              <label>Mật khẩu mới</label>
              <input type="password" name="password" autocomplete="new-password" required />
            </div>
            <p data-password-msg style="color: var(--color-accent);"></p>
            <button type="submit" class="btn-primary">Đổi mật khẩu</button>
          </form>
        </section>
      </div>
    `;
  }
}
