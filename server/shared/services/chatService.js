const MessageEntity = require('../entities/messageEntity');
const eventBus = require('../../core/eventBus');

class ChatService {
  constructor({ messageRepository, fileRepository, roomService }) {
    this.messageRepository = messageRepository;
    this.fileRepository = fileRepository;
    this.roomService = roomService;
  }

  sendMessage({ roomId, senderId, content, type = 'text', metadata = null }, options = {}) {
    this.roomService.ensureMember(roomId, senderId);
    const entity = new MessageEntity({ roomId, senderId, content, type, metadata });
    const record = this.messageRepository.create(entity);
    const formatted = this.formatMessage(record);
    if (!options.silent) {
      eventBus.emit('message:created', { roomId, message: formatted });
    }
    return formatted;
  }

  getHistory({ roomId, userId, before, limit = 30 }) {
    this.roomService.ensureMember(roomId, userId);
    const messages = this.messageRepository.listByRoom(roomId, limit, before);
    const fileMap = new Map();
    const files = this.fileRepository.listByMessageIds(messages.map((m) => m.id));
    files.forEach((file) => {
      if (!fileMap.has(file.message_id)) {
        fileMap.set(file.message_id, []);
      }
      fileMap.get(file.message_id).push(file);
    });
    return messages.map((m) => {
      const formatted = this.formatMessage(m);
      formatted.files = (fileMap.get(m.id) || []).map((file) => ({
        id: file.id,
        messageId: file.message_id,
        name: file.file_name,
        mimeType: file.mime_type,
        size: file.size,
        url: file.url
      }));
      return formatted;
    });
  }

  formatMessage(row) {
    return {
      id: row.id,
      roomId: row.room_id,
      senderId: row.sender_id,
      content: row.content,
      type: row.type,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      createdAt: row.created_at,
      files: row.files || []
    };
  }
}

module.exports = ChatService;
