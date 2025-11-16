const eventBus = require('../../core/eventBus');

function registerRoomWs(hub) {
  eventBus.on('room:disbanded', ({ roomId, memberIds }) => {
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return;
    }
    hub.broadcastToUsers(memberIds, { t: 'room-disbanded', roomId });
  });

  eventBus.on('room:members-added', ({ room, memberIds }) => {
    if (!room || !Array.isArray(memberIds) || memberIds.length === 0) {
      return;
    }
    hub.broadcastToUsers(memberIds, { t: 'room-updated', room });
  });
}

module.exports = { registerRoomWs };
