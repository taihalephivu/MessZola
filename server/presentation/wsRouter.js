const { registerChatWs } = require('../features/chat/wsHandlers');
const { registerCallWs } = require('../features/call/wsHandlers');
const { registerRoomWs } = require('../features/room/wsHandlers');

module.exports = function registerWs(hub) {
  registerChatWs(hub);
  registerCallWs(hub);
  registerRoomWs(hub);
};
