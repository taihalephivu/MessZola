const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');

class HttpServer {
  constructor({ restRouter }) {
    this.app = express();
    this.restRouter = restRouter;
    this.server = null;
  }

  configure() {
    this.app.use(cors({ origin: config.clientOrigin === '*' ? true : config.clientOrigin, credentials: true }));
    this.app.use(express.json({ limit: '2mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(morgan('dev'));
    const publicDir = path.join(__dirname, '..', '..', 'web');
    this.app.use('/assets', express.static(path.join(publicDir, 'assets')));
    this.app.use('/uploads', express.static(path.join(__dirname, '..', 'data', 'uploads')));
    if (this.restRouter) {
      this.app.use('/api', this.restRouter);
    }
    this.app.use(express.static(publicDir));
    this.app.get(/.*/, (_, res) => {
      res.sendFile(path.join(publicDir, 'index.html'));
    });
  }

  start() {
    this.configure();
    this.server = this.app.listen(config.port, () => {
      console.log(`HTTP server listening on http://localhost:${config.port}`);
    });
    return this.server;
  }
}

module.exports = HttpServer;
