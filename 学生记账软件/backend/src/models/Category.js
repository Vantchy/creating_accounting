const { generateUUID } = require('../utils/helpers');

class Category {
  constructor(db) {
    this.db = db;
  }

  createTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        name TEXT NOT NULL,
        icon TEXT DEFAULT '',
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        is_system INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
  }

  create(data) {
    const id = generateUUID();
    const { user_id, name, icon, type, is_system } = data;
    const stmt = this.db.prepare(
      'INSERT INTO categories (id, user_id, name, icon, type, is_system) VALUES (?, ?, ?, ?, ?, ?)'
    );
    stmt.run(id, user_id || null, name, icon || '', type, is_system || 0);
    return this.findById(id);
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  }

  list(userId) {
    // 返回系统分类 + 用户自定义分类，"其他"排在末尾
    return this.db.prepare(
      "SELECT * FROM categories WHERE user_id IS NULL OR user_id = ? ORDER BY is_system DESC, CASE WHEN name = '其他' THEN 1 ELSE 0 END ASC, name ASC"
    ).all(userId);
  }

  listByType(userId, type) {
    return this.db.prepare(
      "SELECT * FROM categories WHERE (user_id IS NULL OR user_id = ?) AND type = ? ORDER BY is_system DESC, CASE WHEN name = '其他' THEN 1 ELSE 0 END ASC, name ASC"
    ).all(userId, type);
  }

  update(id, user_id, data) {
    const fields = [];
    const values = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.icon !== undefined) {
      fields.push('icon = ?');
      values.push(data.icon);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id, user_id);
    const sql = `UPDATE categories SET ${fields.join(', ')} WHERE id = ? AND user_id = ? AND is_system = 0`;
    this.db.prepare(sql).run(...values);
    return this.findById(id);
  }

  delete(id, user_id) {
    // 只能删除非系统分类
    const stmt = this.db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ? AND is_system = 0');
    const result = stmt.run(id, user_id);
    return result.changes > 0;
  }

  /**
   * 插入默认分类（系统内置）
   */
  insertDefaultCategories() {
    const existing = this.db.prepare('SELECT COUNT(*) as count FROM categories WHERE is_system = 1').get();
    if (existing.count > 0) return;

    // 支出分类
    const expenseCategories = [
      { name: '三餐', icon: '🍚' },
      { name: '零食饮料', icon: '🥤' },
      { name: '交通', icon: '🚌' },
      { name: '日用品', icon: '🧴' },
      { name: '学习用品', icon: '📚' },
      { name: '娱乐', icon: '🎮' },
      { name: '通讯话费', icon: '📱' },
      { name: '医疗', icon: '💊' },
      { name: '其他', icon: '📦' }
    ];

    // 收入分类
    const incomeCategories = [
      { name: '生活费', icon: '💰' },
      { name: '兼职', icon: '💼' },
      { name: '奖学金', icon: '🏆' },
      { name: '红包', icon: '🧧' },
      { name: '其他', icon: '📦' }
    ];

    const sql = 'INSERT INTO categories (id, name, icon, type, is_system) VALUES (?, ?, ?, ?, 1)';

    this.db.transaction(() => {
      for (const item of expenseCategories) {
        this.db.prepare(sql).run(generateUUID(), item.name, item.icon, 'expense');
      }
      for (const item of incomeCategories) {
        this.db.prepare(sql).run(generateUUID(), item.name, item.icon, 'income');
      }
    });
  }
}

module.exports = Category;