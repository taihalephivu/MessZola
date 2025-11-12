const { v4: uuidv4 } = require('uuid');

class FriendshipEntity {
  constructor({ id = uuidv4(), userId, friendId, status = 'pending', createdAt = Date.now() }) {
    this.id = id;
    this.userId = userId;
    this.friendId = friendId;
    this.status = status;
    this.createdAt = createdAt;
  }

  toRecord() {
    return {
      id: this.id,
      user_id: this.userId,
      friend_id: this.friendId,
      status: this.status,
      created_at: this.createdAt
    };
  }

  static create({ userId, friendId }) {
    return new FriendshipEntity({ userId, friendId });
  }
}

module.exports = FriendshipEntity;
