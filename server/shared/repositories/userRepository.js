class UserRepository {
  constructor(dbClient) {
    this.db = dbClient;
  }

  create(userEntity) {
    const record = userEntity.toRecord();
    this.db.run(
      `INSERT INTO users (id, phone, password_hash, display_name, avatar_url, bio, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.phone,
        record.password_hash,
        record.display_name,
        record.avatar_url,
        record.bio,
        record.created_at,
        record.updated_at
      ]
    );
    return record;
  }

  updateProfile(userId, data) {
    const now = Date.now();
    const current = this.findById(userId);
    if (!current) {
      throw new Error('User not found');
    }
    this.db.run(
      `UPDATE users SET display_name = ?, avatar_url = ?, bio = ?, updated_at = ? WHERE id = ?`,
      [
        data.displayName ?? current.display_name,
        data.avatarUrl ?? current.avatar_url,
        data.bio ?? current.bio,
        now,
        userId
      ]
    );
    return this.findById(userId);
  }

  updatePassword(userId, passwordHash) {
    this.db.run(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`, [passwordHash, Date.now(), userId]);
    return this.findById(userId);
  }

  findByPhone(phone) {
    return this.db.get(`SELECT * FROM users WHERE phone = ?`, [phone]);
  }

  findById(id) {
    return this.db.get(`SELECT * FROM users WHERE id = ?`, [id]);
  }

  listByIds(ids) {
    if (!ids.length) return [];
    const placeholders = ids.map(() => '?').join(',');
    return this.db.all(`SELECT * FROM users WHERE id IN (${placeholders})`, ids);
  }

  search(keyword, limit = 10) {
    const like = `%${keyword}%`;
    return this.db.all(
      `SELECT * FROM users WHERE phone LIKE ? OR display_name LIKE ? LIMIT ?`,
      [like, like, limit]
    );
  }
}

module.exports = UserRepository;
