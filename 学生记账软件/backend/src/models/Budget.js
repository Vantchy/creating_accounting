const { generateUUID } = require('../utils/helpers');

class Budget {
  constructor(db) {
    this.db = db;
  }

  createTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        category_id TEXT,
        amount DECIMAL(10,2) NOT NULL,
        period TEXT NOT NULL CHECK(period IN ('weekly', 'monthly')),
        start_date TEXT NOT NULL,
        end_date TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);
  }

  create(data) {
    const id = generateUUID();
    const { user_id, category_id, amount, period, start_date, end_date } = data;
    const stmt = this.db.prepare(`
      INSERT INTO budgets (id, user_id, category_id, amount, period, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, user_id, category_id || null, amount, period, start_date, end_date || null);
    return this.findById(id);
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);
  }

  list(userId) {
    return this.db.prepare('SELECT * FROM budgets WHERE user_id = ? ORDER BY start_date DESC').all(userId);
  }

  update(id, user_id, data) {
    const fields = [];
    const values = [];

    if (data.category_id !== undefined) {
      fields.push('category_id = ?');
      values.push(data.category_id);
    }
    if (data.amount !== undefined) {
      fields.push('amount = ?');
      values.push(data.amount);
    }
    if (data.period !== undefined) {
      fields.push('period = ?');
      values.push(data.period);
    }
    if (data.start_date !== undefined) {
      fields.push('start_date = ?');
      values.push(data.start_date);
    }
    if (data.end_date !== undefined) {
      fields.push('end_date = ?');
      values.push(data.end_date);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id, user_id);
    const sql = `UPDATE budgets SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
    this.db.prepare(sql).run(...values);
    return this.findById(id);
  }

  delete(id, user_id) {
    const stmt = this.db.prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?');
    const result = stmt.run(id, user_id);
    return result.changes > 0;
  }

  /** 删除用户所有预算 */
  deleteByUser(userId) {
    this.db.prepare('DELETE FROM budgets WHERE user_id = ?').run(userId);
  }
}

module.exports = Budget;