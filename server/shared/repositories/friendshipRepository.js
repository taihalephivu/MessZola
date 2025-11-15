class FriendshipRepository {
  constructor(dbClient) {
    this.db = dbClient;
  }

  create(entity) {
    const record = entity.toRecord();
    this.db.run(
      `INSERT INTO friendships (id, user_id, friend_id, status, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [record.id, record.user_id, record.friend_id, record.status, record.created_at]
    );
    return record;
  }

  findById(id) {
    return this.db.get(`SELECT * FROM friendships WHERE id = ?`, [id]);
  }

  findBetween(userId, friendId) {
    return this.db.get(
      `SELECT * FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)` ,
      [userId, friendId, friendId, userId]
    );
  }

  updateStatus(id, status) {
    this.db.run(`UPDATE friendships SET status = ? WHERE id = ?`, [status, id]);
    return this.findById(id);
  }

  listRequestsForUser(userId) {
    return this.db.all(
      `SELECT f.*, u.display_name, u.phone, u.avatar_url FROM friendships f
       JOIN users u ON u.id = f.user_id
       WHERE f.friend_id = ? AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [userId]
    );
  }

  listFriends(userId) {
    return this.db.all(
      `SELECT u.* FROM friendships f
       JOIN users u ON u.id = CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END
       WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
       GROUP BY u.id`,
      [userId, userId, userId]
    );
  }

  delete(userId, friendId) {
    this.db.run(
      `DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`,
      [userId, friendId, friendId, userId]
    );
  }
}

module.exports = FriendshipRepository;
