class FileUseCases {
  constructor({ fileService }) {
    this.fileService = fileService;
  }

  attach(payload) {
    return this.fileService.attachToMessage(payload);
  }
}

module.exports = FileUseCases;
