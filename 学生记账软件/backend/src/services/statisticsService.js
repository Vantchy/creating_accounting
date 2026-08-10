class StatisticsService {
  constructor(transactionModel) {
    this.transactionModel = transactionModel;
    this.db = transactionModel.db;
  }

  /**
   * 月收入/支出/结余
   */
  getMonthlySummary(userId, year, month) {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    const income = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE user_id = ? AND type = 'income' AND date LIKE ?
    `).get(userId, `${monthStr}%`);

    const expense = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE user_id = ? AND type = 'expense' AND date LIKE ?
    `).get(userId, `${monthStr}%`);

    return {
      year,
      month,
      income: income.total,
      expense: expense.total,
      balance: income.total - expense.total
    };
  }

  /**
   * 分类支出占比
   */
  getCategoryBreakdown(userId, year, month) {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    const rows = this.db.prepare(`
      SELECT c.id, c.name, c.icon, COALESCE(SUM(t.amount), 0) as total
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.type = 'expense' AND t.date LIKE ?
      GROUP BY t.category_id
      ORDER BY total DESC
    `).all(userId, `${monthStr}%`);

    const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);

    return rows.map(row => ({
      category: row.name || '未分类',
      amount: row.total,
      percentage: grandTotal > 0 ? Math.round((row.total / grandTotal) * 10000) / 100 : 0
    }));
  }

  /**
   * 近N月趋势数据
   */
  getTrend(userId, months = 6) {
    const result = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;

      const income = this.db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE user_id = ? AND type = 'income' AND date LIKE ?
      `).get(userId, `${monthStr}%`);

      const expense = this.db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE user_id = ? AND type = 'expense' AND date LIKE ?
      `).get(userId, `${monthStr}%`);

      result.push({
        month: monthStr,
        income: income.total,
        expense: expense.total
      });
    }

    return result;
  }
}

module.exports = StatisticsService;