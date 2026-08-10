class ReminderService {
  constructor(userModel, budgetModel, transactionModel, notificationModel) {
    this.userModel = userModel;
    this.budgetModel = budgetModel;
    this.transactionModel = transactionModel;
    this.notificationModel = notificationModel;
    this.db = transactionModel.db;
    this.timer = null;
  }

  /**
   * 启动定时任务（每天检查）
   */
  start() {
    // 每天检查一次（每 6 小时检查一次，确保覆盖）
    this.timer = setInterval(() => {
      this.checkAllowanceDay();
      this.checkBudgetOverspend();
    }, 6 * 60 * 60 * 1000);

    // 启动时立即执行一次
    this.checkAllowanceDay();
    this.checkBudgetOverspend();

    console.log('定时提醒任务已启动');
  }

  /**
   * 停止定时任务
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * 检查今天是否是用户的生活费到账日
   */
  checkAllowanceDay() {
    const today = new Date();
    const dayOfMonth = today.getDate();

    // 查询所有 allowance_day 等于今天日期的用户
    const users = this.userModel.db.prepare(
      'SELECT * FROM users WHERE allowance_day = ?'
    ).all(dayOfMonth);

    for (const user of users) {
      // 检查今天是否已经发送过通知
      const todayStr = this.formatDate(today);
      const existing = this.notificationModel.db.prepare(`
        SELECT COUNT(*) as count FROM notifications
        WHERE user_id = ? AND type = 'allowance' AND date(created_at) = ?
      `).get(user.id, todayStr);

      if (existing.count === 0) {
        this.notificationModel.create({
          user_id: user.id,
          type: 'allowance',
          title: '生活费到账提醒',
          content: `今天是您的虚拟生活费到账日（每月${dayOfMonth}号），当前月收入预算为 ${user.monthly_income} 元，请合理规划本月支出！`
        });
      }
    }
  }

  /**
   * 检查预算超支情况
   */
  checkBudgetOverspend() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    // 获取所有月度预算
    const budgets = this.budgetModel.db.prepare(
      'SELECT * FROM budgets WHERE period = ?'
    ).all('monthly');

    for (const budget of budgets) {
      // 查询该分类当月支出
      let sql = 'SELECT COALESCE(SUM(amount), 0) as spent FROM transactions WHERE user_id = ? AND type = ?';
      const params = [budget.user_id, 'expense'];

      if (budget.category_id) {
        sql += ' AND category_id = ?';
        params.push(budget.category_id);
      }
      sql += ' AND date LIKE ?';
      params.push(`${monthStr}%`);

      const { spent } = this.db.prepare(sql).get(...params);

      // 如果已支出超过预算，生成通知
      if (spent > budget.amount) {
        const existing = this.notificationModel.db.prepare(`
          SELECT COUNT(*) as count FROM notifications
          WHERE user_id = ? AND type = 'budget_overspend' AND date(created_at) = ?
        `).get(budget.user_id, this.formatDate(now));

        if (existing.count === 0) {
          this.notificationModel.create({
            user_id: budget.user_id,
            type: 'budget_overspend',
            title: '预算超支提醒',
            content: `您本月预算已超支！预算金额：${budget.amount} 元，已支出：${spent} 元，超支：${(spent - budget.amount).toFixed(2)} 元。`
          });
        }
      }
    }
  }

  formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

module.exports = ReminderService;