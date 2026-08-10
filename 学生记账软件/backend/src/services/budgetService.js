class BudgetService {
  constructor(budgetModel, transactionModel) {
    this.budgetModel = budgetModel;
    this.transactionModel = transactionModel;
  }

  /**
   * 创建预算
   */
  create(userId, data) {
    const budget = this.budgetModel.create({
      ...data,
      user_id: userId
    });
    return budget;
  }

  /**
   * 列出所有预算
   */
  list(userId) {
    return this.budgetModel.list(userId);
  }

  /**
   * 更新预算
   */
  update(id, userId, data) {
    const existing = this.budgetModel.findById(id);
    if (!existing) {
      throw new Error('预算不存在');
    }
    if (existing.user_id !== userId) {
      throw new Error('无权修改此预算');
    }
    return this.budgetModel.update(id, userId, data);
  }

  /**
   * 删除预算
   */
  delete(id, userId) {
    const existing = this.budgetModel.findById(id);
    if (!existing) {
      throw new Error('预算不存在');
    }
    if (existing.user_id !== userId) {
      throw new Error('无权删除此预算');
    }
    const deleted = this.budgetModel.delete(id, userId);
    if (!deleted) {
      throw new Error('删除失败');
    }
    return { success: true };
  }

  /**
   * 计算每个预算的当前进度
   */
  getProgress(userId, year, month) {
    const budgets = this.budgetModel.list(userId);
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    const result = [];
    for (const budget of budgets) {
      // 查询该时间段内该分类的支出总额
      let sql = 'SELECT COALESCE(SUM(amount), 0) as spent FROM transactions WHERE user_id = ? AND type = ?';
      const params = [userId, 'expense'];

      if (budget.category_id) {
        sql += ' AND category_id = ?';
        params.push(budget.category_id);
      }

      // 根据周期筛选日期范围
      if (budget.period === 'monthly') {
        sql += ' AND date LIKE ?';
        params.push(`${monthStr}%`);
      } else {
        // weekly: 按 start_date 和 end_date 范围
        sql += ' AND date >= ? AND date <= ?';
        params.push(budget.start_date, budget.end_date || '2099-12-31');
      }

      const { spent } = this.transactionModel.db.prepare(sql).get(...params);

      result.push({
        id: budget.id,
        category_id: budget.category_id,
        amount: budget.amount,
        period: budget.period,
        spent,
        progress: budget.amount > 0 ? Math.min(100, Math.round((spent / budget.amount) * 100)) : 0,
        remaining: Math.max(0, budget.amount - spent)
      });
    }

    return result;
  }
}

module.exports = BudgetService;