class AuthUseCases {
  constructor({ authService }) {
    this.authService = authService;
  }

  register(payload) {
    return this.authService.register(payload);
  }

  login(payload) {
    return this.authService.login(payload);
  }
}

module.exports = AuthUseCases;
