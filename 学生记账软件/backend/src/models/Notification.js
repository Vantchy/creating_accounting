const { generateUUID } = require('../utils/helpers');

class Notification {
  constructor(db) {
    this.db = db;
  }

  createTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'system',
        title TEXT NOT NULL,
        content TEXT DEFAULT '',
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
  }

  create(data) {
    const id = generateUUID();
    const { user_id, type, title, content } = data;
    const stmt = this.db.prepare(
      'INSERT INTO notifications (id, user_id, type, title, content) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(id, user_id, type || 'system', title, content || '');
    return this.findById(id);
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
  }

  list(userId, { page = 1, limit = 20, unreadOnly = false }) {
    let sql = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [userId];

    if (unreadOnly) {
      sql += ' AND is_read = 0';
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const { total } = this.db.prepare(countSql).get(...params);

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const rows = this.db.prepare(sql).all(...params);
    return { rows, total, page, limit };
  }

  markAsRead(id, user_id) {
    this.db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, user_id);
    return this.findById(id);
  }

  markAllAsRead(userId) {
    this.db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(userId);
  }

  getUnreadCount(userId) {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(userId);
    return result.count;
  }
}

module.exports = Notification;