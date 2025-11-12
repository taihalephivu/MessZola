const FileEntity = require('../entities/fileEntity');

class FileService {
  constructor({ fileRepository }) {
    this.fileRepository = fileRepository;
  }

  attachToMessage(payload) {
    const entity = new FileEntity(payload);
    return this.fileRepository.create(entity);
  }
}

module.exports = FileService;
