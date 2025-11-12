const { registerChatWs } = require('../features/chat/wsHandlers');
const { registerCallWs } = require('../features/call/wsHandlers');

module.exports = function registerWs(hub) {
  registerChatWs(hub);
  registerCallWs(hub);
};
