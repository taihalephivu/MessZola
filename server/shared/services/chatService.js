const MessageEntity = require('../entities/messageEntity');
const eventBus = require('../../core/eventBus');

class ChatService {
  constructor({ messageRepository, fileRepository, roomService, userRepository }) {
    this.messageRepository = messageRepository;
    this.fileRepository = fileRepository;
    this.roomService = roomService;
    this.userRepository = userRepository;
  }

  sendMessage({ roomId, senderId, content, type = 'text', metadata = null }, options = {}) {
    this.roomService.ensureMember(roomId, senderId);
    const entity = new MessageEntity({ roomId, senderId, content, type, metadata });
    const record = this.messageRepository.create(entity);
    const formatted = this.formatMessage(record);
    
    // Add sender name
    const sender = this.userRepository.findById(senderId);
    formatted.senderName = sender ? (sender.display_name || sender.phone) : 'User';
    
    if (!options.silent) {
      eventBus.emit('message:created', { roomId, message: formatted });
    }
    return formatted;
  }

  getHistory({ roomId, userId, before, limit = 30 }) {
    this.roomService.ensureMember(roomId, userId);
    const messages = this.messageRepository.listByRoom(roomId, limit, before);
    
    // Get sender info for all messages
    const senderIds = [...new Set(messages.map(m => m.sender_id))];
    const users = senderIds.map(id => this.userRepository.findById(id)).filter(Boolean);
    const userMap = new Map(users.map(u => [u.id, u]));
    
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
      
      // Add sender name
      const sender = userMap.get(m.sender_id);
      formatted.senderName = sender ? (sender.display_name || sender.phone) : 'User';
      
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
