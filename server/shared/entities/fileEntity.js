const { v4: uuidv4 } = require('uuid');

class FileEntity {
  constructor({ id = uuidv4(), messageId, fileName, mimeType, size, url }) {
    this.id = id;
    this.messageId = messageId;
    this.fileName = fileName;
    this.mimeType = mimeType;
    this.size = size;
    this.url = url;
  }

  toRecord() {
    return {
      id: this.id,
      message_id: this.messageId,
      file_name: this.fileName,
      mime_type: this.mimeType,
      size: this.size,
      url: this.url
    };
  }
}

module.exports = FileEntity;
