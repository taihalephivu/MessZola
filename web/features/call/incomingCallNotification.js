export class IncomingCallNotification {
  constructor({ mount, store, onAccept, onDecline }) {
    this.mount = mount;
    this.store = store;
    this.onAccept = onAccept;
    this.onDecline = onDecline;
    this.notification = null;
    this.currentRoomId = null;
    this.ringtone = null;
    this.audioUnlocked = false;
    this.setupAudioUnlock();
  }

  setupAudioUnlock() {
    const unlockAudio = () => {
      if (this.audioUnlocked) return;
      
      this.initRingtone();
      // Play and immediately pause to unlock audio
      const playPromise = this.ringtone.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          this.ringtone.pause();
          this.ringtone.currentTime = 0;
          this.audioUnlocked = true;
          console.log('✓ Audio unlocked for ringtone playback');
          // Remove listeners after unlock
          document.removeEventListener('click', unlockAudio);
          document.removeEventListener('touchstart', unlockAudio);
          document.removeEventListener('keydown', unlockAudio);
        }).catch(() => {
          // Still locked, will try again on next interaction
        });
      }
    };

    // Listen for first user interaction
    document.addEventListener('click', unlockAudio, { once: false });
    document.addEventListener('touchstart', unlockAudio, { once: false });
    document.addEventListener('keydown', unlockAudio, { once: false });
  }

  initRingtone() {
    if (!this.ringtone) {
      console.log('Initializing ringtone from /assets/ringtone.mp3');
      this.ringtone = new Audio('/assets/ringtone.mp3');
      this.ringtone.loop = true;
      this.ringtone.volume = 0.5;
      
      this.ringtone.addEventListener('loadeddata', () => {
        console.log('✓ Ringtone loaded successfully');
      });
      
      this.ringtone.addEventListener('error', (e) => {
        console.error('✗ Ringtone load error:', e);
        console.log('Make sure ringtone.mp3 exists in web/assets/ folder');
      });
    }
  }

  playRingtone() {
    this.initRingtone();
    
    if (!this.audioUnlocked) {
      console.warn('⚠ Audio not unlocked yet. Ringtone may not play until user interacts with page.');
    }
    
    console.log('Attempting to play ringtone...');
    this.ringtone.play()
      .then(() => {
        console.log('✓ Ringtone playing successfully');
      })
      .catch(err => {
        console.error('✗ Cannot play ringtone:', err.name);
        if (err.name === 'NotAllowedError') {
          console.log('💡 Click anywhere on the page to enable ringtone for future calls');
        }
      });
  }

  stopRingtone() {
    if (this.ringtone) {
      this.ringtone.pause();
      this.ringtone.currentTime = 0;
    }
  }

  init() {
    this.mount.innerHTML = this.getTemplate();
    this.notification = this.mount.querySelector('.incoming-call-notification');
    
    const acceptBtn = this.mount.querySelector('[data-action="accept"]');
    const declineBtn = this.mount.querySelector('[data-action="decline"]');
    
    acceptBtn.addEventListener('click', () => {
      const roomId = this.currentRoomId;
      this.hide();
      if (this.onAccept && roomId) {
        this.onAccept(roomId);
      }
    });
    
    declineBtn.addEventListener('click', () => {
      const roomId = this.currentRoomId;
      this.hide();
      if (this.onDecline && roomId) {
        this.onDecline(roomId);
      }
    });
  }

  show(roomId, callerName, callerAvatar) {
    if (!this.notification) {
      this.init();
    }
    
    this.currentRoomId = roomId;
    const nameEl = this.notification.querySelector('[data-caller-name]');
    const avatarEl = this.notification.querySelector('[data-caller-avatar]');
    
    nameEl.textContent = callerName;
    
    if (callerAvatar) {
      avatarEl.innerHTML = `<img src="${callerAvatar}" alt="${callerName}" />`;
    } else {
      avatarEl.textContent = callerName.charAt(0).toUpperCase();
    }
    
    this.notification.classList.add('show');
    this.playRingtone();
  }

  hide() {
    if (this.notification) {
      this.notification.classList.remove('show');
    }
    this.stopRingtone();
    this.currentRoomId = null;
  }


  getTemplate() {
    return `
      <div class="incoming-call-notification">
        <div class="incoming-call-header">
          <div class="incoming-call-avatar" data-caller-avatar>
            👤
          </div>
          <div class="incoming-call-info">
            <h3 data-caller-name>Người dùng</h3>
            <p>Cuộc gọi video đến...</p>
          </div>
        </div>
        <div class="incoming-call-actions">
          <button class="incoming-call-btn decline" data-action="decline">
            <span>📞</span>
            <span>Từ chối</span>
          </button>
          <button class="incoming-call-btn accept" data-action="accept">
            <span>📹</span>
            <span>Chấp nhận</span>
          </button>
        </div>
      </div>
    `;
  }
}
