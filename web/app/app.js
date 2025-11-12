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

const appMount = document.getElementById('app');
const callRoot = document.getElementById('call-root');

const store = new Store();
const http = new HttpClient('/api');
const wsClient = new WsClient({ store });
const rtcClient = new RtcClient({ store, wsClient });
const callModal = new CallModal({ mount: callRoot, rtcClient });
wsClient.setRtcHandler((event) => rtcClient.handleSignal(event));

let shell = null;
let chatPanel;
let friendPanel;
let profilePanel;

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
    profilePanel
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
  if (!store.getState().currentRoomId && rooms.length) {
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
}

async function startDirectRoom(peerId) {
  try {
    const room = await http.post('/rooms/direct', { peerId });
    const rooms = await http.get('/rooms');
    store.setRooms(formatRooms(rooms));
    store.setCurrentRoom(room.id);
  } catch (err) {
    alert(err.message);
  }
}

async function handleLogout() {
  await rtcClient.stop();
  wsClient.disconnect();
  localStorage.removeItem('messzola_token');
  store.setState({ token: null, user: null, rooms: [], friends: [], currentRoomId: null, messages: {}, view: 'chat' });
  if (shell) {
    shell.destroy();
    shell = null;
  }
  appMount.innerHTML = '';
  showAuth();
}

bootstrap();
