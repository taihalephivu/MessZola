export class Store {
  constructor() {
    this.state = {
      token: null,
      user: null,
      friends: [],
      friendRequests: [],
      rooms: [],
      currentRoomId: null,
      messages: {},
      typing: {},
      view: 'chat',
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

  setFriends(friends) {
    this.setState({ friends });
  }

  setFriendRequests(friendRequests) {
    this.setState({ friendRequests });
  }

  setCurrentRoom(roomId) {
    this.setState({ currentRoomId: roomId, view: 'chat' });
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
