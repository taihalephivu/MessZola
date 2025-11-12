class UserUseCases {
  constructor({ userService }) {
    this.userService = userService;
  }

  getProfile(userId) {
    return this.userService.getProfile(userId);
  }

  updateProfile(userId, payload) {
    return this.userService.updateProfile(userId, payload);
  }

  search(keyword) {
    return this.userService.search(keyword);
  }
}

module.exports = UserUseCases;
