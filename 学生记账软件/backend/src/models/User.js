const { generateUUID } = require('../utils/helpers');

class User {
  constructor(db) {
    this.db = db;
  }

  createTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        phone TEXT UNIQUE NOT NULL,
        nickname TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        monthly_income DECIMAL(10,2) DEFAULT 0.00,
        allowance_day INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      )
    `);
  }

  create({ phone, nickname, passwordHash }) {
    const id = generateUUID();
    const stmt = this.db.prepare(
      'INSERT INTO users (id, phone, nickname, password_hash) VALUES (?, ?, ?, ?)'
    );
    stmt.run(id, phone, nickname, passwordHash);
    return this.findById(id);
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  findByPhone(phone) {
    return this.db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  }

  update(id, data) {
    const fields = [];
    const values = [];

    if (data.nickname !== undefined) {
      fields.push('nickname = ?');
      values.push(data.nickname);
    }
    if (data.monthly_income !== undefined) {
      fields.push('monthly_income = ?');
      values.push(data.monthly_income);
    }
    if (data.allowance_day !== undefined) {
      fields.push('allowance_day = ?');
      values.push(data.allowance_day);
    }

    if (fields.length === 0) return this.findById(id);

    fields.push('created_at = created_at');
    values.push(id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...values);
    return this.findById(id);
  }

  /** 更新密码 */
  updatePassword(id, passwordHash) {
    this.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
  }
}

module.exports = User;