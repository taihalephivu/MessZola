export class CallModal {
  constructor({ mount, rtcClient }) {
    this.mount = mount;
    this.rtcClient = rtcClient;
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
    this.mount.querySelector('[data-action="end"]').addEventListener('click', () => this.close());
    this.mount.querySelector('[data-action="mic"]').addEventListener('click', (e) => {
      const enabled = this.rtcClient.toggleAudio();
      e.currentTarget.textContent = enabled ? 'Tắt mic' : 'Bật mic';
    });
    this.mount.querySelector('[data-action="cam"]').addEventListener('click', (e) => {
      const enabled = this.rtcClient.toggleVideo();
      e.currentTarget.textContent = enabled ? 'Tắt cam' : 'Bật cam';
    });
    this.mount.querySelector('[data-action="share"]').addEventListener('click', () => this.rtcClient.shareScreen());
    this.unsubscribe = this.rtcClient.onUpdate((payload) => this.renderStreams(payload));
  }

  async open(roomId) {
    if (!this.overlay) {
      this.init();
    }
    this.overlay.classList.add('active');
    const stream = await this.rtcClient.start(roomId);
    this.attachLocalStream(stream);
  }

  async close() {
    await this.rtcClient.stop();
    if (this.overlay) {
      this.overlay.classList.remove('active');
    }
  }

  renderStreams({ localStream, remoteStreams }) {
    this.attachLocalStream(localStream);
    const activePeerIds = new Set(remoteStreams.map(([peerId]) => peerId));
    this.videoGrid.querySelectorAll('video[data-peer]').forEach((video) => {
      if (!activePeerIds.has(video.dataset.peer)) {
        video.remove();
      }
    });
    remoteStreams.forEach(([peerId, stream]) => {
      let videoEl = this.mount.querySelector(`[data-peer="${peerId}"]`);
      if (!videoEl) {
        videoEl = document.createElement('video');
        videoEl.dataset.peer = peerId;
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        this.videoGrid.appendChild(videoEl);
      }
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
        videoEl.play().catch(() => {});
      }
    });
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
          <div class="video-grid">
            <video data-local-video autoplay muted playsinline></video>
          </div>
          <div class="call-controls">
            <button data-action="mic">Tắt mic</button>
            <button data-action="cam">Tắt cam</button>
            <button data-action="share" style="background: var(--color-accent);">Chia sẻ màn hình</button>
            <button data-action="end" style="background:#ef4444;">Kết thúc</button>
          </div>
        </div>
      </div>
    `;
  }
}
