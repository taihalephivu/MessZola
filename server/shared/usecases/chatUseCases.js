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
}

module.exports = ChatUseCases;
