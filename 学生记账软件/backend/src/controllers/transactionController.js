/**
 * 交易记录控制器
 */
class TransactionController {
  constructor(transactionService) {
    this.transactionService = transactionService;
  }

  /**
   * 创建交易记录
   * POST /api/transactions
   */
  create(req, res) {
    try {
      // 兼容前端 camelCase 和后端 snake_case
      const body = req.body;
      const account_id = body.account_id || body.accountId;
      const category_id = body.category_id || body.categoryId;
      const { amount, type, note, date, image_url } = body;

      if (!amount || !type || !date) {
        return res.json({ code: 1, message: '金额、类型和日期不能为空' });
      }

      if (!['income', 'expense'].includes(type)) {
        return res.json({ code: 1, message: '类型必须是 income 或 expense' });
      }

      const transaction = this.transactionService.create(req.userId, {
        account_id, category_id, amount, type, note, date, image_url
      });
      res.json({ code: 0, data: transaction, message: '创建成功' });
    } catch (err) {
      res.json({ code: 1, message: err.message || '创建失败' });
    }
  }

  /**
   * 分页查询交易记录
   * GET /api/transactions?page=1&limit=20&startDate=&endDate=&categoryId=&type=&accountId=
   */
  list(req, res) {
    try {
      const { page, limit, startDate, endDate, categoryId, type, accountId } = req.query;
      const result = this.transactionService.list(req.userId, {
        page, limit, startDate, endDate, categoryId, type, accountId
      });
      res.json({ code: 0, data: result });
    } catch (err) {
      res.json({ code: 1, message: err.message || '查询失败' });
    }
  }

  /**
   * 更新交易记录
   * PUT /api/transactions/:id
   */
  update(req, res) {
    try {
      const { id } = req.params;
      const transaction = this.transactionService.update(id, req.userId, req.body);
      res.json({ code: 0, data: transaction, message: '更新成功' });
    } catch (err) {
      res.json({ code: 1, message: err.message || '更新失败' });
    }
  }

  /**
   * 删除交易记录
   * DELETE /api/transactions/:id
   */
  delete(req, res) {
    try {
      const { id } = req.params;
      this.transactionService.delete(id, req.userId);
      res.json({ code: 0, message: '删除成功' });
    } catch (err) {
      res.json({ code: 1, message: err.message || '删除失败' });
    }
  }

  /**
   * 获取单条交易记录
   * GET /api/transactions/:id
   */
  getById(req, res) {
    try {
      const { id } = req.params;
      const transaction = this.transactionService.getById(id, req.userId);
      res.json({ code: 0, data: transaction });
    } catch (err) {
      res.json({ code: 1, message: err.message || '查询失败' });
    }
  }
}

module.exports = TransactionController;