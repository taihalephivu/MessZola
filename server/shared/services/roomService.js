const RoomEntity = require('../entities/roomEntity');
const eventBus = require('../../core/eventBus');

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

  leaveGroup(roomId, userId) {
    const room = this.roomRepository.getRoom(roomId);
    if (!room) {
      throw new Error('Không tìm thấy nhóm');
    }
    if (Number(room.is_group) !== 1) {
      throw new Error('Không thể rời phòng chat trực tiếp');
    }
    if (room.owner_id === userId) {
      throw new Error('Chủ nhóm không thể rời nhóm. Vui lòng chuyển quyền chủ nhóm trước.');
    }
    const members = this.roomRepository.listMembers(roomId);
    const isMember = members.some((m) => m.user_id === userId);
    if (!isMember) {
      throw new Error('Bạn không phải thành viên của nhóm này');
    }
    this.roomRepository.removeMember(roomId, userId);
  }

  disbandGroup(roomId, ownerId) {
    const room = this.roomRepository.getRoom(roomId);
    if (!room) {
      throw new Error('Không tìm thấy nhóm');
    }
    const isGroup = Number(room.is_group) === 1;
    if (!isGroup) {
      throw new Error('Chỉ có thể giải tán nhóm');
    }
    if (room.owner_id !== ownerId) {
      throw new Error('Chỉ chủ nhóm mới có quyền giải tán');
    }
    const memberIds = this.roomRepository.listMemberIds(roomId);
    this.roomRepository.deleteRoom(roomId);
    eventBus.emit('room:disbanded', { roomId, memberIds, ownerId });
  }

  addMembers(roomId, requesterId, memberIds) {
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      throw new Error('Danh sách thành viên mời không hợp lệ');
    }
    const room = this.roomRepository.getRoom(roomId);
    if (!room) {
      throw new Error('Không tìm thấy nhóm');
    }
    if (Number(room.is_group) !== 1) {
      throw new Error('Không thể thêm thành viên vào phòng trực tiếp');
    }
    if (room.owner_id !== requesterId) {
      throw new Error('Chỉ chủ nhóm mới có thể mời thêm thành viên');
    }
    const currentMemberIds = new Set(this.roomRepository.listMemberIds(roomId));
    if (!currentMemberIds.has(requesterId)) {
      throw new Error('Bạn không phải thành viên của nhóm này');
    }
    const uniqueIds = Array.from(new Set(memberIds.map((id) => String(id).trim()))).filter(Boolean);
    const candidates = uniqueIds.filter((id) => !currentMemberIds.has(id));
    if (!candidates.length) {
      throw new Error('Tất cả thành viên đã có trong nhóm');
    }
    const users = this.userRepository.listByIds(candidates);
    if (!users.length) {
      throw new Error('Không tìm thấy người dùng để thêm');
    }
    const validIds = users.map((u) => u.id);
    validIds.forEach((id) => {
      this.roomRepository.addMember(roomId, id);
    });
    const memberList = this.roomRepository.listMemberIds(roomId);
    const roomSnapshot = this.roomRepository.getRoomWithMembers(roomId) || room;
    if (!roomSnapshot.members) {
      roomSnapshot.members = memberList.join(',');
    }
    eventBus.emit('room:members-added', {
      roomId,
      memberIds: memberList,
      addedMemberIds: validIds,
      room: roomSnapshot
    });
    return { room: roomSnapshot, addedMemberIds: validIds };
  }
}

module.exports = RoomService;
