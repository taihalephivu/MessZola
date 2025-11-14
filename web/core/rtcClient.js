const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

export class RtcClient {
  constructor({ store, wsClient }) {
    this.store = store;
    this.wsClient = wsClient;
    this.peerConnections = new Map();
    this.remoteStreams = new Map();
    this.localStream = null;
    this.roomId = null;
    this.listeners = new Set();
    this.micEnabled = true;
    this.camEnabled = true;
    this.onIncomingCall = null;
    this.onCallEnd = null;
  }
  
  setIncomingCallHandler(handler) {
    this.onIncomingCall = handler;
  }

  setCallEndHandler(handler) {
    this.onCallEnd = handler;
  }

  onUpdate(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit() {
    const payload = {
      localStream: this.localStream,
      remoteStreams: Array.from(this.remoteStreams.entries())
    };
    this.listeners.forEach((listener) => listener(payload));
  }

  async start(roomId, isAnswering = false) {
    this.roomId = roomId;
    const stream = await this.ensureLocalStream();
    this.store.setCallState({ activeRoomId: roomId });
    
    // Only send call notification if starting a new call (not answering)
    if (!isAnswering) {
      const state = this.store.getState();
      const callerName = state.user?.displayName || state.user?.phone || 'Người dùng';
      this.wsClient.sendRtc({ t: 'rtc-call-start', roomId, callerName });
    }
    
    // Then join room
    this.wsClient.sendRtc({ t: 'rtc-join', roomId });
    
    return stream;
  }

  async ensureLocalStream() {
    if (!this.localStream) {
      console.log('🎥 Requesting camera and microphone access...');
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        console.log('✅ Local stream obtained:', this.localStream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
        this.emit();
      } catch (err) {
        console.error('❌ Failed to get local stream:', err.name, err.message);
        
        // Show user-friendly error message
        if (err.name === 'NotAllowedError') {
          alert('Vui lòng cho phép truy cập camera và microphone để thực hiện cuộc gọi.');
        } else if (err.name === 'NotReadableError') {
          alert('Camera đang được sử dụng bởi ứng dụng khác. Vui lòng đóng các ứng dụng khác và thử lại.');
        } else if (err.name === 'NotFoundError') {
          alert('Không tìm thấy camera hoặc microphone. Vui lòng kiểm tra thiết bị của bạn.');
        } else {
          alert('Không thể truy cập camera/microphone: ' + err.message);
        }
        
        throw err;
      }
    }
    return this.localStream;
  }

  async stop() {
    const currentRoomId = this.roomId;
    const currentPeers = this.store.getState().call.peers || [];
    
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.remoteStreams.forEach((stream) => stream.getTracks().forEach((track) => track.stop()));
    this.remoteStreams.clear();
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (currentRoomId) {
      // If no peers have joined yet (still ringing), send cancel instead of leave
      if (currentPeers.length === 0) {
        console.log('📵 Cancelling call (no one joined yet)');
        this.wsClient.sendRtc({ t: 'rtc-call-cancel', roomId: currentRoomId });
      } else {
        console.log('👋 Leaving call');
        this.wsClient.sendRtc({ t: 'rtc-leave', roomId: currentRoomId });
      }
    }
    this.store.setCallState({ activeRoomId: null, peers: [] });
    this.emit();
    this.roomId = null;
  }

  handleSignal(event) {
    switch (event.t) {
      case 'rtc-call-incoming':
        if (this.onIncomingCall) {
          this.onIncomingCall(event.roomId, event.from, event.callerName);
        }
        break;
      case 'rtc-call-declined':
        // Handle when someone declines the call
        if (this.roomId === event.roomId) {
          console.log('Call declined by user:', event.userId);
          // Show notification to caller
          this.showCallDeclinedNotification();
          // Auto close the call after a short delay
          setTimeout(() => {
            const roomId = this.roomId;
            this.stop();
            // Notify app to close modal and add call history
            if (this.onCallEnd) {
              this.onCallEnd(roomId, 'declined');
            }
          }, 2000);
        }
        break;
      case 'rtc-call-cancelled':
        // Handle when caller cancels the call before we answer
        console.log('Call cancelled by caller:', event.userId);
        // This will be handled by app.js to hide incoming call notification
        if (this.onCallEnd) {
          this.onCallEnd(event.roomId, 'cancelled');
        }
        break;
      case 'rtc-peers':
        console.log(`👥 Existing peers in room:`, event.peers);
        this.store.setCallState({ peers: event.peers });
        event.peers.forEach((peerId) => this.createPeer(peerId, true));
        break;
      case 'rtc-joined':
        console.log(`👤 User ${event.userId} joined the call`);
        this.store.setCallState({ peers: [...new Set([...(this.store.getState().call.peers || []), event.userId])] });
        break;
      case 'rtc-left':
        console.log(`👋 User ${event.userId} left the call`);
        this.closePeer(event.userId);
        
        // Check if there are any remaining peers
        const remainingPeers = this.store.getState().call.peers || [];
        console.log(`Remaining peers after ${event.userId} left:`, remainingPeers);
        
        // If no one else is in the call, show notification and auto-close after delay
        if (remainingPeers.length === 0) {
          console.log('No more peers in call, auto-closing...');
          this.showCallEndedNotification();
          setTimeout(() => {
            const roomId = this.roomId;
            this.stop();
            if (this.onCallEnd) {
              this.onCallEnd(roomId, 'ended');
            }
          }, 2000);
        }
        break;
      case 'rtc-offer':
        console.log(`📨 Received offer from ${event.from}`);
        this.ensurePeer(event.from, false).then(async (pc) => {
          console.log(`📝 Setting remote description and creating answer for ${event.from}`);
          await pc.setRemoteDescription(new RTCSessionDescription(event.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log(`📤 Sending answer to ${event.from}`);
          this.wsClient.sendRtc({ t: 'rtc-answer', roomId: this.roomId, to: event.from, sdp: answer });
        }).catch(err => {
          console.error(`❌ Error handling offer from ${event.from}:`, err);
        });
        break;
      case 'rtc-answer':
        console.log(`📨 Received answer from ${event.from}`);
        const pc = this.peerConnections.get(event.from);
        if (pc) {
          pc.setRemoteDescription(new RTCSessionDescription(event.sdp))
            .then(() => console.log(`✅ Remote description set for ${event.from}`))
            .catch(err => console.error(`❌ Error setting remote description for ${event.from}:`, err));
        } else {
          console.error(`❌ No peer connection found for ${event.from}`);
        }
        break;
      case 'rtc-ice':
        if (event.candidate) {
          this.peerConnections.get(event.from)?.addIceCandidate(new RTCIceCandidate(event.candidate));
        }
        break;
      default:
        break;
    }
  }

  showCallDeclinedNotification() {
    this.showNotification('📞', 'Cuộc gọi đã bị từ chối', 'rgba(220, 38, 38, 0.95)');
  }

  showCallEndedNotification() {
    this.showNotification('📞', 'Người kia đã kết thúc cuộc gọi', 'rgba(100, 116, 139, 0.95)');
  }

  showNotification(icon, text, bgColor) {
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.className = 'call-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">${icon}</span>
        <span class="notification-text">${text}</span>
      </div>
    `;
    
    // Add styles inline
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${bgColor};
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      animation: slideDown 0.3s ease-out;
      font-size: 16px;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 2 seconds
    setTimeout(() => {
      notification.style.animation = 'slideUp 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  async ensurePeer(peerId, initiator) {
    if (this.peerConnections.has(peerId)) {
      return this.peerConnections.get(peerId);
    }
    return this.createPeer(peerId, initiator);
  }

  async createPeer(peerId, initiator) {
    console.log(`🔗 Creating peer connection with ${peerId}, initiator: ${initiator}`);
    
    await this.ensureLocalStream();
    
    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.peerConnections.set(peerId, pc);
    
    // Add local tracks to peer connection
    this.localStream.getTracks().forEach((track) => {
      console.log(`➕ Adding ${track.kind} track to peer ${peerId}`);
      pc.addTrack(track, this.localStream);
    });
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.wsClient.sendRtc({ t: 'rtc-ice', roomId: this.roomId, to: peerId, candidate: event.candidate });
      }
    };
    
    pc.ontrack = (event) => {
      console.log(`📥 Received ${event.track.kind} track from peer ${peerId}`);
      console.log('Stream:', event.streams[0], 'Tracks:', event.streams[0].getTracks().map(t => `${t.kind}: ${t.enabled}`));
      this.remoteStreams.set(peerId, event.streams[0]);
      this.emit();
    };
    
    pc.onconnectionstatechange = () => {
      console.log(`🔌 Peer ${peerId} connection state: ${pc.connectionState}`);
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        this.closePeer(peerId);
      }
    };
    
    if (initiator) {
      console.log(`📤 Creating offer for peer ${peerId}`);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.wsClient.sendRtc({ t: 'rtc-offer', roomId: this.roomId, to: peerId, sdp: offer });
    }
    
    return pc;
  }

  closePeer(peerId) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
    const stream = this.remoteStreams.get(peerId);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      this.remoteStreams.delete(peerId);
    }
    const peers = (this.store.getState().call.peers || []).filter((id) => id !== peerId);
    this.store.setCallState({ peers });
    this.emit();
  }

  toggleAudio() {
    if (!this.localStream) return;
    this.micEnabled = !this.micEnabled;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = this.micEnabled;
    });
    return this.micEnabled;
  }

  toggleVideo() {
    if (!this.localStream) return;
    this.camEnabled = !this.camEnabled;
    this.localStream.getVideoTracks().forEach((track) => {
      track.enabled = this.camEnabled;
    });
    return this.camEnabled;
  }

  async shareScreen() {
    if (!this.roomId) return;
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = screenStream.getVideoTracks()[0];
    this.peerConnections.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(screenTrack);
      }
    });
    screenTrack.onended = () => {
      const videoTrack = this.localStream.getVideoTracks()[0];
      this.peerConnections.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });
    };
  }
}
