class RoomRepository {
  constructor(dbClient) {
    this.db = dbClient;
  }

  create(roomEntity) {
    const record = roomEntity.toRecord();
    this.db.run(
      `INSERT INTO rooms (id, name, is_group, owner_id, created_at)
       VALUES (?, ?, ?, ?, ?)` ,
      [record.id, record.name, record.is_group, record.owner_id, record.created_at]
    );
    return record;
  }

  addMember(roomId, userId, role = 'member') {
    const id = `${roomId}-${userId}`;
    this.db.run(
      `INSERT OR IGNORE INTO room_members (id, room_id, user_id, role, joined_at)
       VALUES (?, ?, ?, ?, ?)` ,
      [id, roomId, userId, role, Date.now()]
    );
  }

  removeMember(roomId, userId) {
    this.db.run(`DELETE FROM room_members WHERE room_id = ? AND user_id = ?`, [roomId, userId]);
  }

  listRoomsForUser(userId) {
    return this.db.all(
      `SELECT r.*, GROUP_CONCAT(m.user_id) as members FROM rooms r
       JOIN room_members m ON m.room_id = r.id
       WHERE r.id IN (SELECT room_id FROM room_members WHERE user_id = ?)
       GROUP BY r.id
       ORDER BY r.created_at DESC`,
      [userId]
    );
  }

  getRoom(roomId) {
    return this.db.get(`SELECT * FROM rooms WHERE id = ?`, [roomId]);
  }

  listMembers(roomId) {
    return this.db.all(`SELECT * FROM room_members WHERE room_id = ?`, [roomId]);
  }

  listMemberIds(roomId) {
    return this.db.all(`SELECT user_id FROM room_members WHERE room_id = ?`, [roomId]).map((row) => row.user_id);
  }

  findDirectRoom(userIdA, userIdB) {
    return this.db.get(
      `SELECT r.* FROM rooms r
       WHERE r.is_group = 0
       AND r.id IN (SELECT room_id FROM room_members WHERE user_id = ?)
       AND r.id IN (SELECT room_id FROM room_members WHERE user_id = ?)
       LIMIT 1`,
      [userIdA, userIdB]
    );
  }

  rename(roomId, name) {
    this.db.run(`UPDATE rooms SET name = ? WHERE id = ?`, [name, roomId]);
    return this.getRoom(roomId);
  }
}

module.exports = RoomRepository;
