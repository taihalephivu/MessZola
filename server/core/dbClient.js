const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const config = require('./config');

class DbClient {
  constructor() {
    this.db = null;
    this.SQL = null;
    this.persistTimer = null;
  }

  async init() {
    if (this.db) {
      return this.db;
    }
    this.SQL = await initSqlJs({
      locateFile: (file) => path.join(__dirname, '../../node_modules/sql.js/dist', file)
    });
    const fileExists = fs.existsSync(config.databaseFilePath);
    const fileBuffer = fileExists ? fs.readFileSync(config.databaseFilePath) : null;
    this.db = fileBuffer ? new this.SQL.Database(new Uint8Array(fileBuffer)) : new this.SQL.Database();
    const schema = fs.readFileSync(config.schemaPath, 'utf8');
    this.db.run('BEGIN TRANSACTION;');
    schema
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((statement) => this.db.run(`${statement};`));
    this.db.run('COMMIT;');
    this.persist();
    return this.db;
  }

  run(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.run(params);
    stmt.free();
    this.schedulePersist();
  }

  get(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row;
  }

  all(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  transaction(fn) {
    this.db.run('BEGIN;');
    try {
      const result = fn();
      this.db.run('COMMIT;');
      this.schedulePersist();
      return result;
    } catch (err) {
      this.db.run('ROLLBACK;');
      throw err;
    }
  }

  schedulePersist() {
    clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => this.persist(), 300);
  }

  persist() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(config.databaseFilePath, buffer);
  }
}

module.exports = new DbClient();
