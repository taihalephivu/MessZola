class RtcSignaler {
  constructor() {
    this.activeRooms = new Map(); // roomId -> Set<userId>
  }

  join(roomId, userId) {
    if (!this.activeRooms.has(roomId)) {
      this.activeRooms.set(roomId, new Set());
    }
    const roomSet = this.activeRooms.get(roomId);
    const peers = Array.from(roomSet);
    roomSet.add(userId);
    return peers;
  }

  leave(roomId, userId) {
    if (!this.activeRooms.has(roomId)) {
      return [];
    }
    const roomSet = this.activeRooms.get(roomId);
    roomSet.delete(userId);
    const remaining = Array.from(roomSet);
    if (!roomSet.size) {
      this.activeRooms.delete(roomId);
    }
    return remaining;
  }
}

module.exports = new RtcSignaler();
