const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..');
const uploadsDir = path.join(rootDir, 'data', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

module.exports = {
  port: parseInt(process.env.PORT || '4000', 10),
  wsPath: '/ws',
  uploadsDir,
  databaseFilePath: path.join(rootDir, 'data', 'messzola.sqlite'),
  schemaPath: path.join(__dirname, 'schema.sql'),
  jwtSecret: process.env.JWT_SECRET || 'messzola-super-secret',
  tokenExpiresIn: '7d',
  wsHeartbeatInterval: 25000,
  clientOrigin: process.env.CLIENT_ORIGIN || '*',
  stunServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ],
  turnServers: process.env.TURN_URL
    ? [{ urls: process.env.TURN_URL, username: process.env.TURN_USER || '', credential: process.env.TURN_PASS || '' }]
    : [],
  maxUploadBytes: 20 * 1024 * 1024
};
