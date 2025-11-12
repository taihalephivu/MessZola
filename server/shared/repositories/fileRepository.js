class FileRepository {
  constructor(dbClient) {
    this.db = dbClient;
  }

  create(fileEntity) {
    const record = fileEntity.toRecord();
    this.db.run(
      `INSERT INTO files (id, message_id, file_name, mime_type, size, url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [record.id, record.message_id, record.file_name, record.mime_type, record.size, record.url]
    );
    return record;
  }

  listByMessageIds(messageIds) {
    if (!messageIds.length) return [];
    const placeholders = messageIds.map(() => '?').join(',');
    return this.db.all(`SELECT * FROM files WHERE message_id IN (${placeholders})`, messageIds);
  }
}

module.exports = FileRepository;
