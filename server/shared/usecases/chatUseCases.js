class ChatUseCases {
  constructor({ chatService }) {
    this.chatService = chatService;
  }

  sendMessage(payload, options) {
    return this.chatService.sendMessage(payload, options);
  }

  getHistory(payload) {
    return this.chatService.getHistory(payload);
  }

  saveCallHistory({ roomId, userId, status }) {
    return this.chatService.sendMessage({
      roomId,
      senderId: userId,
      content: null,
      type: 'call-history',
      metadata: JSON.stringify({ call_status: status })
    }, { broadcast: true, skipPermissionCheck: true });
  }
}

module.exports = ChatUseCases;
