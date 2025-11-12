const { v4: uuidv4 } = require('uuid');

class MessageEntity {
  constructor({ id = uuidv4(), roomId, senderId, content = '', type = 'text', createdAt = Date.now(), metadata = null }) {
    this.id = id;
    this.roomId = roomId;
    this.senderId = senderId;
    this.content = content;
    this.type = type;
    this.createdAt = createdAt;
    this.metadata = metadata ? JSON.stringify(metadata) : null;
  }

  toRecord() {
    return {
      id: this.id,
      room_id: this.roomId,
      sender_id: this.senderId,
      content: this.content,
      type: this.type,
      created_at: this.createdAt,
      metadata: this.metadata
    };
  }
}

module.exports = MessageEntity;
