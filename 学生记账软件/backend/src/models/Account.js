const { generateUUID } = require('../utils/helpers');

class Account {
  constructor(db) {
    this.db = db;
  }

  createTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT '现金',
        balance DECIMAL(10,2) DEFAULT 0.00,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
  }

  create(data) {
    const id = generateUUID();
    const { user_id, name, type, balance } = data;
    const stmt = this.db.prepare(
      'INSERT INTO accounts (id, user_id, name, type, balance) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(id, user_id, name, type || '现金', balance || 0);
    return this.findById(id);
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
  }

  list(userId) {
    return this.db.prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at ASC').all(userId);
  }

  update(id, user_id, data) {
    const fields = [];
    const values = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.type !== undefined) {
      fields.push('type = ?');
      values.push(data.type);
    }
    if (data.balance !== undefined) {
      fields.push('balance = ?');
      values.push(data.balance);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id, user_id);
    const sql = `UPDATE accounts SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
    this.db.prepare(sql).run(...values);
    return this.findById(id);
  }

  delete(id, user_id) {
    const stmt = this.db.prepare('DELETE FROM accounts WHERE id = ? AND user_id = ?');
    const result = stmt.run(id, user_id);
    return result.changes > 0;
  }

  /** 重置用户所有账户余额为 0 */
  resetBalances(userId) {
    this.db.prepare('UPDATE accounts SET balance = 0 WHERE user_id = ?').run(userId);
  }
}

module.exports = Account;