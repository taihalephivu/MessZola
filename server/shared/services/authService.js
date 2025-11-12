const bcrypt = require('bcrypt');
const UserEntity = require('../entities/userEntity');

class AuthService {
  constructor({ userRepository, tokenService }) {
    this.userRepository = userRepository;
    this.tokenService = tokenService;
  }

  async register({ phone, password, displayName }) {
    const existing = this.userRepository.findByPhone(phone);
    if (existing) {
      throw new Error('Số điện thoại đã được sử dụng');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const userEntity = UserEntity.create({ phone, passwordHash, displayName });
    const record = this.userRepository.create(userEntity);
    const accessToken = this.tokenService.sign({ id: record.id, phone: record.phone, displayName: record.display_name });
    return { user: this.toSafeUser(record), accessToken };
  }

  async login({ phone, password }) {
    const user = this.userRepository.findByPhone(phone);
    if (!user) {
      throw new Error('Thông tin đăng nhập không đúng');
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      throw new Error('Thông tin đăng nhập không đúng');
    }
    const accessToken = this.tokenService.sign({ id: user.id, phone: user.phone, displayName: user.display_name });
    return { user: this.toSafeUser(user), accessToken };
  }

  toSafeUser(record) {
    return {
      id: record.id,
      phone: record.phone,
      displayName: record.display_name,
      avatarUrl: record.avatar_url,
      bio: record.bio
    };
  }
}

module.exports = AuthService;
