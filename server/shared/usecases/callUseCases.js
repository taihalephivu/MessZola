class CallUseCases {
  constructor({ callService }) {
    this.callService = callService;
  }

  getPeerIds(roomId, userId) {
    return this.callService.getPeerIds(roomId, userId);
  }
}

module.exports = CallUseCases;
