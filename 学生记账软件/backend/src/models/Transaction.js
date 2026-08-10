const { generateUUID } = require('../utils/helpers');

class Transaction {
  constructor(db) {
    this.db = db;
  }

  createTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        account_id TEXT,
        category_id TEXT,
        amount DECIMAL(10,2) NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        note TEXT DEFAULT '',
        date TEXT NOT NULL,
        image_url TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (account_id) REFERENCES accounts(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);
  }

  create(data) {
    const id = generateUUID();
    const { user_id, account_id, category_id, amount, type, note, date, image_url } = data;
    const stmt = this.db.prepare(`
      INSERT INTO transactions (id, user_id, account_id, category_id, amount, type, note, date, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, user_id, account_id || null, category_id || null, amount, type, note || '', date, image_url || '');
    return this.findById(id);
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
  }

  list({ user_id, page = 1, limit = 20, start_date, end_date, category_id, type, account_id }) {
    let sql = 'SELECT * FROM transactions WHERE user_id = ?';
    const params = [user_id];

    if (start_date) {
      sql += ' AND date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND date <= ?';
      params.push(end_date);
    }
    if (category_id) {
      sql += ' AND category_id = ?';
      params.push(category_id);
    }
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    if (account_id) {
      sql += ' AND account_id = ?';
      params.push(account_id);
    }

    // 先查总数
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const { total } = this.db.prepare(countSql).get(...params);

    // 分页
    sql += ' ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?';
    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const rows = this.db.prepare(sql).all(...params);
    return { list: rows, total, page, limit };
  }

  update(id, user_id, data) {
    const fields = [];
    const values = [];

    const allowedFields = ['account_id', 'category_id', 'amount', 'type', 'note', 'date', 'image_url'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(data[field]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id, user_id);
    const sql = `UPDATE transactions SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
    this.db.prepare(sql).run(...values);
    return this.findById(id);
  }

  delete(id, user_id) {
    const stmt = this.db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?');
    const result = stmt.run(id, user_id);
    return result.changes > 0;
  }

  /** 删除用户所有交易记录 */
  deleteByUser(userId) {
    this.db.prepare('DELETE FROM transactions WHERE user_id = ?').run(userId);
  }
}

module.exports = Transaction;