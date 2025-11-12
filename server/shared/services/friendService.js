const FriendshipEntity = require('../entities/friendshipEntity');

class FriendService {
  constructor({ friendshipRepository, userRepository }) {
    this.friendshipRepository = friendshipRepository;
    this.userRepository = userRepository;
  }

  sendRequest(userId, toUserId) {
    if (userId === toUserId) {
      throw new Error('Không thể tự kết bạn với chính bạn');
    }
    const target = this.userRepository.findById(toUserId);
    if (!target) {
      throw new Error('Người dùng không tồn tại');
    }
    const existing = this.friendshipRepository.findBetween(userId, toUserId);
    if (existing) {
      if (existing.status === 'accepted') {
        throw new Error('Hai bạn đã là bạn bè');
      }
      if (existing.user_id === userId) {
        throw new Error('Đã gửi lời mời trước đó');
      }
      if (existing.friend_id === userId) {
        return this.acceptRequest(existing.id, userId);
      }
    }
    const entity = FriendshipEntity.create({ userId, friendId: toUserId });
    return this.friendshipRepository.create(entity);
  }

  acceptRequest(requestId, userId) {
    const request = this.friendshipRepository.findById(requestId);
    if (!request || request.friend_id !== userId) {
      throw new Error('Không tìm thấy lời mời');
    }
    return this.friendshipRepository.updateStatus(requestId, 'accepted');
  }

  listRequests(userId) {
    return this.friendshipRepository.listRequestsForUser(userId);
  }

  listFriends(userId) {
    return this.friendshipRepository.listFriends(userId);
  }
}

module.exports = FriendService;
