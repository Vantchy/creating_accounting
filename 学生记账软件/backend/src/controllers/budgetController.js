/**
 * 预算控制器
 */
class BudgetController {
  constructor(budgetService) {
    this.budgetService = budgetService;
  }

  /**
   * 创建预算
   * POST /api/budgets
   */
  create(req, res) {
    try {
      const body = req.body;
      const category_id = body.category_id || body.categoryId;
      const amount = body.amount;
      const period = body.period;
      const start_date = body.start_date || body.startDate;
      const end_date = body.end_date || body.endDate;

      if (!amount || !period || !start_date) {
        return res.json({ code: 1, message: '预算金额、周期和开始日期不能为空' });
      }

      if (!['weekly', 'monthly'].includes(period)) {
        return res.json({ code: 1, message: '周期必须是 weekly 或 monthly' });
      }

      const budget = this.budgetService.create(req.userId, {
        category_id, amount, period, start_date, end_date
      });
      res.json({ code: 0, data: budget, message: '创建成功' });
    } catch (err) {
      res.json({ code: 1, message: err.message || '创建失败' });
    }
  }

  /**
   * 列出所有预算
   * GET /api/budgets
   */
  list(req, res) {
    try {
      const budgets = this.budgetService.list(req.userId);
      res.json({ code: 0, data: budgets });
    } catch (err) {
      res.json({ code: 1, message: err.message || '查询失败' });
    }
  }

  /**
   * 更新预算
   * PUT /api/budgets/:id
   */
  update(req, res) {
    try {
      const { id } = req.params;
      const budget = this.budgetService.update(id, req.userId, req.body);
      res.json({ code: 0, data: budget, message: '更新成功' });
    } catch (err) {
      res.json({ code: 1, message: err.message || '更新失败' });
    }
  }

  /**
   * 删除预算
   * DELETE /api/budgets/:id
   */
  delete(req, res) {
    try {
      const { id } = req.params;
      this.budgetService.delete(id, req.userId);
      res.json({ code: 0, message: '删除成功' });
    } catch (err) {
      res.json({ code: 1, message: err.message || '删除失败' });
    }
  }

  /**
   * 获取预算进度
   * GET /api/budgets/progress?year=2024&month=1
   */
  getProgress(req, res) {
    try {
      const year = parseInt(req.query.year) || new Date().getFullYear();
      const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
      const progress = this.budgetService.getProgress(req.userId, year, month);
      res.json({ code: 0, data: progress });
    } catch (err) {
      res.json({ code: 1, message: err.message || '查询失败' });
    }
  }
}

module.exports = BudgetController;