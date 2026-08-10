class AccountService {
  constructor(accountModel) {
    this.accountModel = accountModel;
  }

  /**
   * 创建账户
   */
  create(userId, data) {
    const account = this.accountModel.create({
      ...data,
      user_id: userId
    });
    return account;
  }

  /**
   * 列出所有账户
   */
  list(userId) {
    return this.accountModel.list(userId);
  }

  /**
   * 更新账户（可更新余额）
   */
  update(id, userId, data) {
    const existing = this.accountModel.findById(id);
    if (!existing) {
      throw new Error('账户不存在');
    }
    if (existing.user_id !== userId) {
      throw new Error('无权修改此账户');
    }
    return this.accountModel.update(id, userId, data);
  }

  /**
   * 删除账户
   */
  delete(id, userId) {
    const existing = this.accountModel.findById(id);
    if (!existing) {
      throw new Error('账户不存在');
    }
    if (existing.user_id !== userId) {
      throw new Error('无权删除此账户');
    }
    const deleted = this.accountModel.delete(id, userId);
    if (!deleted) {
      throw new Error('删除失败');
    }
    return { success: true };
  }
}

module.exports = AccountService;