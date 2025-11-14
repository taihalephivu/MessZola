import { Store } from '../core/store.js';
import { HttpClient } from '../core/httpClient.js';
import { WsClient } from '../core/wsClient.js';
import { RtcClient } from '../core/rtcClient.js';
import { renderAuthPage } from '../features/auth/authPage.js';
import { ChatPanel } from '../features/chat/chatPanel.js';
import { ProfilePanel } from '../features/profile/profilePanel.js';
import { FriendPanel } from '../features/friends/friendPanel.js';
import { AppShell } from './shell.js';
import { CallModal } from '../features/call/callModal.js';
import { GroupPanel } from '../features/groups/groupPanel.js';
import { SettingsPanel } from '../features/settings/settingsPanel.js';
import { IncomingCallNotification } from '../features/call/incomingCallNotification.js';

const appMount = document.getElementById('app');
const callRoot = document.getElementById('call-root');
const incomingCallRoot = document.getElementById('incoming-call-root');

const store = new Store();
const http = new HttpClient('/api');
const wsClient = new WsClient({ store });
const rtcClient = new RtcClient({ store, wsClient });
const callModal = new CallModal({ mount: callRoot, rtcClient, store });
const incomingCallNotification = new IncomingCallNotification({
  mount: incomingCallRoot,
  store,
  onAccept: async (roomId) => {
    await callModal.open(roomId, true); // true = answering call
  },
  onDecline: (roomId) => {
    wsClient.sendRtc({ t: 'rtc-call-decline', roomId });
  }
});

// Set incoming call handler
rtcClient.setIncomingCallHandler((roomId, callerId, callerName) => {
  const state = store.getState();
  const friend = state.friends?.find(f => f.id === callerId);
  const name = friend ? (friend.display_name || friend.displayName || friend.phone) : callerName;
  const avatar = friend ? (friend.avatar_url || friend.avatarUrl) : null;
  
  incomingCallNotification.show(roomId, name, avatar);
});

// Set call end handler
rtcClient.setCallEndHandler(async (roomId, reason) => {
  // Close the call modal
  await callModal.close();
  
  // Hide incoming call notification if it's showing
  incomingCallNotification.hide();
  
  // Send call end event to server to save history (server will broadcast to all)
  if (reason === 'declined') {
    wsClient.sendRtc({ t: 'rtc-call-end', roomId, status: 'declined' });
  } else if (reason === 'ended') {
    wsClient.sendRtc({ t: 'rtc-call-end', roomId, status: 'completed' });
  }
  // Note: 'cancelled' is already handled by rtc-call-cancel in stop()
});

wsClient.setRtcHandler((event) => rtcClient.handleSignal(event));

let shell = null;
let chatPanel;
let friendPanel;
let profilePanel;
let groupPanel;
let settingsPanel;

async function bootstrap() {
  const token = localStorage.getItem('messzola_token');
  if (token) {
    try {
      http.setToken(token);
      store.setToken(token);
      const user = await http.get('/users/me');
      store.setUser(user);
      await startApp();
    } catch (err) {
      console.error(err);
      localStorage.removeItem('messzola_token');
      showAuth();
    }
  } else {
    showAuth();
  }
}

function showAuth() {
  renderAuthPage({
    mount: appMount,
    http,
    store,
    onSuccess: async () => {
      await startApp();
    }
  });
}

async function startApp() {
  if (!chatPanel) {
    chatPanel = new ChatPanel({ store, http, wsClient, callModal });
    friendPanel = new FriendPanel({ store, http });
    profilePanel = new ProfilePanel({ store, http });
    groupPanel = new GroupPanel({ store, http, onSelectRoom: selectRoom });
    settingsPanel = new SettingsPanel({ store });
  }
  if (shell) {
    shell.destroy();
  }
  shell = new AppShell({
    mount: appMount,
    store,
    onLogout: handleLogout,
    onStartDirect: startDirectRoom,
    onViewChange: (view) => store.setView(view),
    onSelectRoom: selectRoom,
    chatPanel,
    friendPanel,
    profilePanel,
    groupPanel,
    settingsPanel
  });
  wsClient.connect(store.getState().token);
  await loadInitialData();
}

async function loadInitialData() {
  const [friends, requests, rooms] = await Promise.all([
    http.get('/friends'),
    http.get('/friends/requests'),
    http.get('/rooms')
  ]);
  store.setFriends(friends);
  store.setFriendRequests(requests);
  store.setRooms(formatRooms(rooms));
  
  // Restore last room from localStorage
  const lastRoomId = localStorage.getItem('messzola_last_room');
  if (lastRoomId && rooms.find(r => r.id === lastRoomId)) {
    // Room still exists, restore it
    store.setCurrentRoom(lastRoomId);
  } else if (!store.getState().currentRoomId && rooms.length) {
    // No saved room or room doesn't exist, use first room
    store.setCurrentRoom(rooms[0].id);
  }
}

function formatRooms(rooms) {
  return rooms.map((room) => ({
    ...room,
    members: room.members || '',
    is_group: Number(room.is_group)
  }));
}

async function selectRoom(roomId) {
  store.setCurrentRoom(roomId);
  // Save to localStorage
  localStorage.setItem('messzola_last_room', roomId);
}

async function startDirectRoom(peerId) {
  try {
    const room = await http.post('/rooms/direct', { peerId });
    const rooms = await http.get('/rooms');
    store.setRooms(formatRooms(rooms));
    store.setCurrentRoom(room.id);
    store.setView('chat');
    // Save to localStorage
    localStorage.setItem('messzola_last_room', room.id);
  } catch (err) {
    alert(err.message);
  }
}

async function handleLogout() {
  await rtcClient.stop();
  wsClient.disconnect();
  localStorage.removeItem('messzola_token');
  localStorage.removeItem('messzola_last_room');
  store.setState({ token: null, user: null, rooms: [], friends: [], currentRoomId: null, messages: {}, view: 'chat' });
  if (shell) {
    shell.destroy();
    shell = null;
  }
  appMount.innerHTML = '';
  showAuth();
}

bootstrap();
