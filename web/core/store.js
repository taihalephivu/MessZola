export class Store {
  constructor() {
    let initialView = 'chat';
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        initialView = window.localStorage.getItem('messzola_view') || 'chat';
      }
    } catch (err) {
      // Ignore storage errors; fall back to default view
    }
    this.state = {
      token: null,
      user: null,
      friends: [],
      friendRequests: [],
      rooms: [],
      currentRoomId: null,
      messages: {},
      typing: {},
      view: initialView,
      call: { activeRoomId: null, peers: [] },
      onlineUsers: new Set() // Track online user IDs
    };
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  setState(patch) {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  setToken(token) {
    this.setState({ token });
  }

  setUser(user) {
    this.setState({ user });
  }

  setRooms(rooms) {
    this.setState({ rooms });
  }

  upsertRoom(room) {
    if (!room || !room.id) {
      return;
    }
    const rooms = [...(this.state.rooms || [])];
    const index = rooms.findIndex((r) => r.id === room.id);
    if (index >= 0) {
      rooms[index] = { ...rooms[index], ...room };
    } else {
      rooms.unshift(room);
    }
    this.setState({ rooms });
  }

  removeRoom(roomId) {
    const rooms = (this.state.rooms || []).filter((room) => room.id !== roomId);
    const messages = { ...this.state.messages };
    delete messages[roomId];
    const typing = { ...this.state.typing };
    delete typing[roomId];
    const patch = { rooms, messages, typing };
    if (this.state.currentRoomId === roomId) {
      patch.currentRoomId = null;
    }
    this.setState(patch);
  }

  setFriends(friends) {
    this.setState({ friends });
  }

  setFriendRequests(friendRequests) {
    this.setState({ friendRequests });
  }

  setCurrentRoom(roomId, options = {}) {
    const { switchToChat = true } = options;
    if (switchToChat && this.state.view !== 'chat') {
      this.setView('chat');
    }
    this.setState({ currentRoomId: roomId });
  }

  addMessage(roomId, message) {
    const current = this.state.messages[roomId] || [];
    this.state.messages = { ...this.state.messages, [roomId]: [...current, message] };
    this.emit();
  }

  prependMessages(roomId, messages) {
    const current = this.state.messages[roomId] || [];
    this.state.messages = { ...this.state.messages, [roomId]: [...messages, ...current] };
    this.emit();
  }

  setMessages(roomId, messages) {
    this.state.messages = { ...this.state.messages, [roomId]: messages };
    this.emit();
  }

  setTyping(roomId, userId, on) {
    const typing = { ...this.state.typing };
    const set = new Set(typing[roomId] || []);
    if (on) {
      set.add(userId);
    } else {
      set.delete(userId);
    }
    typing[roomId] = Array.from(set);
    this.setState({ typing });
  }

  setView(view) {
    this.setState({ view });
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('messzola_view', view);
      }
    } catch (err) {
      // Ignore storage errors so UX still works
    }
  }

  setCallState(callState) {
    this.setState({ call: { ...this.state.call, ...callState } });
  }

  setOnlineUsers(users) {
    this.state.onlineUsers = new Set(users);
    this.emit();
  }

  setUserOnline(userId, isOnline) {
    if (isOnline) {
      this.state.onlineUsers.add(userId);
    } else {
      this.state.onlineUsers.delete(userId);
    }
    this.emit();
  }

  isUserOnline(userId) {
    return this.state.onlineUsers.has(userId);
  }

  getState() {
    return this.state;
  }
}
