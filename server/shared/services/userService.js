class UserService {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  getProfile(userId) {
    const user = this.userRepository.findById(userId);
    return this.toSafeUser(user);
  }

  updateProfile(userId, payload) {
    const updated = this.userRepository.updateProfile(userId, payload);
    return this.toSafeUser(updated);
  }

  updatePassword(userId, passwordHash) {
    const updated = this.userRepository.updatePassword(userId, passwordHash);
    return this.toSafeUser(updated);
  }

  search(keyword) {
    return this.userRepository.search(keyword).map((u) => this.toSafeUser(u));
  }

  toSafeUser(record) {
    if (!record) return null;
    return {
      id: record.id,
      phone: record.phone,
      displayName: record.display_name,
      avatarUrl: record.avatar_url,
      bio: record.bio
    };
  }
}

module.exports = UserService;
