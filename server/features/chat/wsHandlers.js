const eventBus = require('../../core/eventBus');
const { usecases } = require('../../shared/container');

function registerChatWs(hub) {
  eventBus.on('message:created', ({ roomId, message }) => {
    const memberIds = usecases.room.getMemberIds(roomId);
    hub.broadcastToUsers(memberIds, { t: 'msg', roomId, message });
  });

  hub.registerHandler('send', ({ user, data, hub: wsHub }) => {
    try {
      usecases.chat.sendMessage({
        roomId: data.roomId,
        senderId: user.id,
        content: data.text,
        type: data.type || 'text',
        metadata: data.metadata || null
      });
    } catch (err) {
      wsHub.sendToUser(user.id, { t: 'error', message: err.message });
    }
  });

  hub.registerHandler('typing', ({ user, data, hub: wsHub }) => {
    try {
      const memberIds = usecases.room.getMemberIds(data.roomId, user.id);
      wsHub.broadcastToUsers(memberIds, {
        t: 'typing',
        roomId: data.roomId,
        from: user.id,
        on: Boolean(data.on)
      }, { exclude: user.id });
    } catch (err) {
      wsHub.sendToUser(user.id, { t: 'error', message: err.message });
    }
  });
}

module.exports = { registerChatWs };
