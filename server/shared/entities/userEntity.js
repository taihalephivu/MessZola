const { v4: uuidv4 } = require('uuid');

class UserEntity {
  constructor({ id = uuidv4(), phone, passwordHash, displayName, avatarUrl = '', bio = '', createdAt = Date.now(), updatedAt = Date.now() }) {
    this.id = id;
    this.phone = phone;
    this.passwordHash = passwordHash;
    this.displayName = displayName;
    this.avatarUrl = avatarUrl;
    this.bio = bio;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  toRecord() {
    return {
      id: this.id,
      phone: this.phone,
      password_hash: this.passwordHash,
      display_name: this.displayName,
      avatar_url: this.avatarUrl,
      bio: this.bio,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };
  }

  static create({ phone, passwordHash, displayName }) {
    return new UserEntity({ phone, passwordHash, displayName });
  }
}

module.exports = UserEntity;
