class TransactionService {
  constructor(transactionModel, accountModel) {
    this.transactionModel = transactionModel;
    this.accountModel = accountModel;
  }

  /**
   * 创建交易记录
   */
  create(userId, data) {
    const transaction = this.transactionModel.create({
      ...data,
      user_id: userId
    });

    // 同步更新账户余额
    if (data.account_id) {
      const account = this.accountModel.findById(data.account_id);
      if (account) {
        const amount = parseFloat(data.amount) || 0;
        const currentBalance = parseFloat(account.balance) || 0;
        const newBalance = data.type === 'income'
          ? currentBalance + amount
          : currentBalance - amount;
        this.accountModel.update(data.account_id, userId, { balance: newBalance });
      }
    }

    return transaction;
  }

  /**
   * 分页查询交易记录
   */
  list(userId, { page = 1, limit = 20, startDate, endDate, categoryId, type, accountId } = {}) {
    return this.transactionModel.list({
      user_id: userId,
      page: Math.max(1, parseInt(page)),
      limit: Math.min(100, Math.max(1, parseInt(limit))),
      start_date: startDate,
      end_date: endDate,
      category_id: categoryId,
      type,
      account_id: accountId
    });
  }

  /**
   * 更新交易记录
   */
  update(id, userId, data) {
    const existing = this.transactionModel.findById(id);
    if (!existing) {
      throw new Error('交易记录不存在');
    }
    if (existing.user_id !== userId) {
      throw new Error('无权修改此记录');
    }
    return this.transactionModel.update(id, userId, data);
  }

  /**
   * 删除交易记录
   */
  delete(id, userId) {
    const existing = this.transactionModel.findById(id);
    if (!existing) {
      throw new Error('交易记录不存在');
    }
    if (existing.user_id !== userId) {
      throw new Error('无权删除此记录');
    }
    const deleted = this.transactionModel.delete(id, userId);
    if (!deleted) {
      throw new Error('删除失败');
    }
    return { success: true };
  }

  /**
   * 获取单条交易记录
   */
  getById(id, userId) {
    const transaction = this.transactionModel.findById(id);
    if (!transaction) {
      throw new Error('交易记录不存在');
    }
    if (transaction.user_id !== userId) {
      throw new Error('无权查看此记录');
    }
    return transaction;
  }
}

module.exports = TransactionService;