const RoomEntity = require('../entities/roomEntity');

class RoomService {
  constructor({ roomRepository, userRepository }) {
    this.roomRepository = roomRepository;
    this.userRepository = userRepository;
  }

  ensureDirectRoom(userId, peerId) {
    const existing = this.roomRepository.findDirectRoom(userId, peerId);
    if (existing) {
      return existing;
    }
    const users = this.userRepository.listByIds([userId, peerId]);
    if (users.length < 2) {
      throw new Error('Không tìm thấy người dùng');
    }
    const userMap = new Map(users.map((u) => [u.id, u]));
    const entity = RoomEntity.createDirectRoom(userMap.get(userId).display_name, userMap.get(peerId).display_name);
    const record = this.roomRepository.create(entity);
    this.roomRepository.addMember(record.id, userId);
    this.roomRepository.addMember(record.id, peerId);
    return record;
  }

  createGroup({ ownerId, name, memberIds }) {
    const entity = new RoomEntity({ name, isGroup: true, ownerId });
    const record = this.roomRepository.create(entity);
    this.roomRepository.addMember(record.id, ownerId, 'owner');
    memberIds.forEach((memberId) => {
      if (memberId !== ownerId) {
        this.roomRepository.addMember(record.id, memberId);
      }
    });
    return record;
  }

  rename(roomId, name) {
    return this.roomRepository.rename(roomId, name);
  }

  ensureMember(roomId, userId) {
    const members = this.roomRepository.listMembers(roomId);
    const isMember = members.some((m) => m.user_id === userId);
    if (!isMember) {
      throw new Error('Không có quyền truy cập phòng');
    }
    return members;
  }

  getMemberIds(roomId, userId = null) {
    if (userId) {
      this.ensureMember(roomId, userId);
    }
    return this.roomRepository.listMemberIds(roomId);
  }

  listRooms(userId) {
    return this.roomRepository.listRoomsForUser(userId);
  }
}

module.exports = RoomService;
