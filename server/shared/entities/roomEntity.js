const { v4: uuidv4 } = require('uuid');

class RoomEntity {
  constructor({ id = uuidv4(), name, isGroup = false, ownerId = null, createdAt = Date.now() }) {
    this.id = id;
    this.name = name;
    this.isGroup = isGroup ? 1 : 0;
    this.ownerId = ownerId;
    this.createdAt = createdAt;
  }

  toRecord() {
    return {
      id: this.id,
      name: this.name,
      is_group: this.isGroup,
      owner_id: this.ownerId,
      created_at: this.createdAt
    };
  }

  static createDirectRoom(userNameA, userNameB) {
    return new RoomEntity({ name: `${userNameA} & ${userNameB}`, isGroup: false });
  }
}

module.exports = RoomEntity;
