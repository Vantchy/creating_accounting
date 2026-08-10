/**
 * 数据重置控制器
 */
class ResetController {
  constructor(transactionModel, budgetModel, accountModel) {
    this.transactionModel = transactionModel;
    this.budgetModel = budgetModel;
    this.accountModel = accountModel;
  }

  /**
   * 重置当前用户的所有数据
   * POST /api/reset
   * 删除所有交易记录、预算、重置账户余额为 0
   */
  reset(req, res) {
    try {
      const userId = req.userId;

      // 删除当前用户的所有交易记录
      this.transactionModel.deleteByUser(userId);
      // 删除当前用户的所有预算
      this.budgetModel.deleteByUser(userId);
      // 重置当前用户所有账户余额为 0
      this.accountModel.resetBalances(userId);

      res.json({ code: 0, message: '数据已重置' });
    } catch (err) {
      res.json({ code: 1, message: err.message || '重置失败' });
    }
  }
}

module.exports = ResetController;