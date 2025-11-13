const { usecases } = require('../../shared/container');
const rtcSignaler = require('../../core/rtcSignaler');

function registerCallWs(hub) {
  hub.registerHandler('rtc-join', ({ user, data, hub: wsHub }) => {
    try {
      usecases.call.getPeerIds(data.roomId, user.id);
      const existing = rtcSignaler.join(data.roomId, user.id);
      wsHub.sendToUser(user.id, { t: 'rtc-peers', roomId: data.roomId, peers: existing });
      existing.forEach((peerId) => {
        wsHub.sendToUser(peerId, { t: 'rtc-joined', roomId: data.roomId, userId: user.id });
      });
    } catch (err) {
      wsHub.sendToUser(user.id, { t: 'error', message: err.message });
    }
  });

  hub.registerHandler('rtc-leave', ({ user, data, hub: wsHub }) => {
    const remaining = rtcSignaler.leave(data.roomId, user.id);
    remaining.forEach((peerId) => {
      wsHub.sendToUser(peerId, { t: 'rtc-left', roomId: data.roomId, userId: user.id });
    });
  });

  ['rtc-offer', 'rtc-answer', 'rtc-ice'].forEach((type) => {
    hub.registerHandler(type, ({ user, data, hub: wsHub }) => {
      try {
        usecases.call.getPeerIds(data.roomId, user.id);
        wsHub.sendToUser(data.to, { ...data, from: user.id });
      } catch (err) {
        wsHub.sendToUser(user.id, { t: 'error', message: err.message });
      }
    });
  });

  // Handle incoming call notification
  hub.registerHandler('rtc-call-start', ({ user, data, hub: wsHub }) => {
    try {
      // Get all members in the room
      const allMemberIds = usecases.call.getPeerIds(data.roomId, user.id);
      // Filter out the caller
      const peerIds = allMemberIds.filter(id => id !== user.id);
      
      // Send incoming call notification to all room members (except caller)
      peerIds.forEach((peerId) => {
        wsHub.sendToUser(peerId, {
          t: 'rtc-call-incoming',
          roomId: data.roomId,
          from: user.id,
          callerName: data.callerName || 'Người dùng'
        });
      });
    } catch (err) {
      wsHub.sendToUser(user.id, { t: 'error', message: err.message });
    }
  });

  // Handle call decline
  hub.registerHandler('rtc-call-decline', ({ user, data, hub: wsHub }) => {
    try {
      // Get all members in the room
      const peerIds = usecases.call.getPeerIds(data.roomId, user.id);
      
      // Notify caller that call was declined
      peerIds.forEach((peerId) => {
        wsHub.sendToUser(peerId, {
          t: 'rtc-call-declined',
          roomId: data.roomId,
          userId: user.id
        });
      });
    } catch (err) {
      // Ignore errors for decline
    }
  });
}

module.exports = { registerCallWs };
