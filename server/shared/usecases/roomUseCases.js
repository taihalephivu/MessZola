class RoomUseCases {
  constructor({ roomService }) {
    this.roomService = roomService;
  }

  ensureDirect(userId, peerId) {
    return this.roomService.ensureDirectRoom(userId, peerId);
  }

  createGroup(payload) {
    return this.roomService.createGroup(payload);
  }

  rename(roomId, name) {
    return this.roomService.rename(roomId, name);
  }

  list(userId) {
    return this.roomService.listRooms(userId);
  }

  getMemberIds(roomId, userId) {
    return this.roomService.getMemberIds(roomId, userId);
  }

  leaveGroup(roomId, userId) {
    return this.roomService.leaveGroup(roomId, userId);
  }

  disband(roomId, ownerId) {
    return this.roomService.disbandGroup(roomId, ownerId);
  }

  addMembers(roomId, ownerId, memberIds) {
    return this.roomService.addMembers(roomId, ownerId, memberIds);
  }
}

module.exports = RoomUseCases;
