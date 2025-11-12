const tokenService = require('../core/tokenService');

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Invalid token format' });
  }
  try {
    req.user = tokenService.verify(token);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token không hợp lệ' });
  }
};
