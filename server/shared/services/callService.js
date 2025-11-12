class CallService {
  constructor({ roomService }) {
    this.roomService = roomService;
  }

  getPeerIds(roomId, userId) {
    return this.roomService.getMemberIds(roomId, userId);
  }
}

module.exports = CallService;
