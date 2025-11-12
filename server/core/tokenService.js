const jwt = require('jsonwebtoken');
const config = require('./config');

class TokenService {
  sign(payload, options = {}) {
    return jwt.sign(payload, config.jwtSecret, { expiresIn: config.tokenExpiresIn, ...options });
  }

  verify(token) {
    return jwt.verify(token, config.jwtSecret);
  }
}

module.exports = new TokenService();
