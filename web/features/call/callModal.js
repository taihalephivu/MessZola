export class CallModal {
  constructor({ mount, rtcClient, store }) {
    this.mount = mount;
    this.rtcClient = rtcClient;
    this.store = store;
    this.overlay = null;
    this.videoGrid = null;
    this.localVideo = null;
    this.unsubscribe = null;
  }

  init() {
    this.mount.innerHTML = this.getTemplate();
    this.overlay = this.mount.querySelector('.call-overlay');
    this.videoGrid = this.mount.querySelector('.video-grid');
    this.localVideo = this.mount.querySelector('[data-local-video]');
    
    const micBtn = this.mount.querySelector('[data-action="mic"]');
    const camBtn = this.mount.querySelector('[data-action="cam"]');
    const shareBtn = this.mount.querySelector('[data-action="share"]');
    
    this.mount.querySelector('[data-action="end"]').addEventListener('click', () => this.close());
    
    micBtn.addEventListener('click', (e) => {
      const enabled = this.rtcClient.toggleAudio();
      e.currentTarget.classList.toggle('off', !enabled);
      e.currentTarget.title = enabled ? 'Tắt mic' : 'Bật mic';
    });
    
    camBtn.addEventListener('click', (e) => {
      const enabled = this.rtcClient.toggleVideo();
      e.currentTarget.classList.toggle('off', !enabled);
      e.currentTarget.title = enabled ? 'Tắt camera' : 'Bật camera';
    });
    
    shareBtn.addEventListener('click', (e) => {
      this.rtcClient.shareScreen();
      e.currentTarget.classList.toggle('active');
    });
    
    this.unsubscribe = this.rtcClient.onUpdate((payload) => this.renderStreams(payload));
  }

  async open(roomId, isAnswering = false) {
    if (!this.overlay) {
      this.init();
    }
    this.overlay.classList.add('active');
    const stream = await this.rtcClient.start(roomId, isAnswering);
    this.attachLocalStream(stream);
  }

  async close() {
    await this.rtcClient.stop();
    if (this.overlay) {
      this.overlay.classList.remove('active');
    }
  }

  renderStreams({ localStream, remoteStreams }) {
    console.log('Rendering streams - Local:', !!localStream, 'Remote count:', remoteStreams.length);
    
    this.attachLocalStream(localStream);
    
    // Remove disconnected peers
    const activePeerIds = new Set(remoteStreams.map(([peerId]) => peerId));
    this.videoGrid.querySelectorAll('.video-container[data-peer]').forEach((container) => {
      if (!activePeerIds.has(container.dataset.peer)) {
        console.log('Removing disconnected peer:', container.dataset.peer);
        container.remove();
      }
    });
    
    // Add or update remote streams
    remoteStreams.forEach(([peerId, stream]) => {
      console.log('Processing remote stream for peer:', peerId, 'Stream:', stream);
      let container = this.videoGrid.querySelector(`.video-container[data-peer="${peerId}"]`);
      
      if (!container) {
        console.log('Creating new video container for peer:', peerId);
        // Create new video container
        container = document.createElement('div');
        container.className = 'video-container remote-video';
        container.dataset.peer = peerId;
        
        const videoEl = document.createElement('video');
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        videoEl.srcObject = stream;
        
        const label = document.createElement('div');
        label.className = 'video-label';
        label.textContent = this.getUserName(peerId);
        
        container.appendChild(videoEl);
        container.appendChild(label);
        this.videoGrid.appendChild(container);
        
        console.log('Video element created, attempting to play...');
        videoEl.play().catch((err) => {
          console.error('Failed to play remote video:', err);
        });
      } else {
        // Update existing video
        const videoEl = container.querySelector('video');
        if (videoEl && videoEl.srcObject !== stream) {
          console.log('Updating existing video stream for peer:', peerId);
          videoEl.srcObject = stream;
          videoEl.play().catch((err) => {
            console.error('Failed to play updated video:', err);
          });
        }
      }
    });
    
    console.log('Total video containers in grid:', this.videoGrid.querySelectorAll('.video-container').length);
  }

  getUserName(userId) {
    const state = this.store.getState();
    
    // Check if it's the current user
    if (state.user && state.user.id === userId) {
      return state.user.displayName || state.user.phone || 'Bạn';
    }
    
    // Check in friends list
    const friend = state.friends?.find(f => f.id === userId);
    if (friend) {
      return friend.display_name || friend.displayName || friend.phone || 'Người dùng';
    }
    
    // Check in current room members
    const currentRoom = state.rooms?.find(r => r.id === state.currentRoomId);
    if (currentRoom && currentRoom.members) {
      // This is a fallback, ideally we should have user info
      return `Người dùng ${userId.substring(0, 6)}`;
    }
    
    return `Người dùng ${userId.substring(0, 6)}`;
  }

  attachLocalStream(stream) {
    if (this.localVideo && stream && this.localVideo.srcObject !== stream) {
      this.localVideo.srcObject = stream;
      this.localVideo.muted = true;
      this.localVideo.playsInline = true;
      this.localVideo.play().catch(() => {});
    }
  }

  getTemplate() {
    return `
      <div class="call-overlay">
        <div class="call-wrapper">
          <div class="video-grid" data-video-grid>
            <div class="video-container local-video">
              <video data-local-video autoplay muted playsinline></video>
              <div class="video-label">Bạn</div>
            </div>
          </div>
          <div class="call-controls">
            <div class="control-btn-group">
              <button class="control-btn mic-btn" data-action="mic" title="Tắt mic">
                <span class="control-icon">🎤</span>
              </button>
              <button class="control-btn cam-btn" data-action="cam" title="Tắt camera">
                <span class="control-icon">📹</span>
              </button>
              <button class="control-btn share-btn" data-action="share" title="Chia sẻ màn hình">
                <span class="control-icon">🖥️</span>
              </button>
            </div>
            <button class="control-btn end-btn" data-action="end" title="Kết thúc cuộc gọi">
              <span class="control-icon">📞</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
