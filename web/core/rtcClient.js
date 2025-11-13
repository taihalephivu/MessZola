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
  }
  
  setIncomingCallHandler(handler) {
    this.onIncomingCall = handler;
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
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.emit();
    }
    return this.localStream;
  }

  async stop() {
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.remoteStreams.forEach((stream) => stream.getTracks().forEach((track) => track.stop()));
    this.remoteStreams.clear();
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.roomId) {
      this.wsClient.sendRtc({ t: 'rtc-leave', roomId: this.roomId });
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
      case 'rtc-peers':
        this.store.setCallState({ peers: event.peers });
        event.peers.forEach((peerId) => this.createPeer(peerId, true));
        break;
      case 'rtc-joined':
        this.store.setCallState({ peers: [...new Set([...(this.store.getState().call.peers || []), event.userId])] });
        break;
      case 'rtc-left':
        this.closePeer(event.userId);
        break;
      case 'rtc-offer':
        this.ensurePeer(event.from, false).then(async (pc) => {
          await pc.setRemoteDescription(new RTCSessionDescription(event.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          this.wsClient.sendRtc({ t: 'rtc-answer', roomId: this.roomId, to: event.from, sdp: answer });
        });
        break;
      case 'rtc-answer':
        this.peerConnections.get(event.from)?.setRemoteDescription(new RTCSessionDescription(event.sdp));
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

  async ensurePeer(peerId, initiator) {
    if (this.peerConnections.has(peerId)) {
      return this.peerConnections.get(peerId);
    }
    return this.createPeer(peerId, initiator);
  }

  async createPeer(peerId, initiator) {
    await this.ensureLocalStream();
    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.peerConnections.set(peerId, pc);
    this.localStream.getTracks().forEach((track) => pc.addTrack(track, this.localStream));
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.wsClient.sendRtc({ t: 'rtc-ice', roomId: this.roomId, to: peerId, candidate: event.candidate });
      }
    };
    pc.ontrack = (event) => {
      this.remoteStreams.set(peerId, event.streams[0]);
      this.emit();
    };
    pc.onconnectionstatechange = () => {
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        this.closePeer(peerId);
      }
    };
    if (initiator) {
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
