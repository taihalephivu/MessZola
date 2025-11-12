class MessageRepository {
  constructor(dbClient) {
    this.db = dbClient;
  }

  create(messageEntity) {
    const record = messageEntity.toRecord();
    this.db.run(
      `INSERT INTO messages (id, room_id, sender_id, content, type, created_at, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [record.id, record.room_id, record.sender_id, record.content, record.type, record.created_at, record.metadata]
    );
    return record;
  }

  listByRoom(roomId, limit = 30, before) {
    const params = [roomId];
    let sql = `SELECT * FROM messages WHERE room_id = ?`;
    if (before) {
      sql += ' AND created_at < ?';
      params.push(before);
    }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    const rows = this.db.all(sql, params);
    return rows.reverse();
  }
}

module.exports = MessageRepository;
