/**
 * 账户控制器
 */
class AccountController {
  constructor(accountService) {
    this.accountService = accountService;
  }

  /**
   * 创建账户
   * POST /api/accounts
   */
  create(req, res) {
    try {
      const { name, type, balance } = req.body;

      if (!name) {
        return res.json({ code: 1, message: '账户名称不能为空' });
      }

      const account = this.accountService.create(req.userId, { name, type, balance });
      res.json({ code: 0, data: account, message: '创建成功' });
    } catch (err) {
      res.json({ code: 1, message: err.message || '创建失败' });
    }
  }

  /**
   * 列出所有账户
   * GET /api/accounts
   */
  list(req, res) {
    try {
      const accounts = this.accountService.list(req.userId);
      res.json({ code: 0, data: accounts });
    } catch (err) {
      res.json({ code: 1, message: err.message || '查询失败' });
    }
  }

  /**
   * 更新账户
   * PUT /api/accounts/:id
   */
  update(req, res) {
    try {
      const { id } = req.params;
      const account = this.accountService.update(id, req.userId, req.body);
      res.json({ code: 0, data: account, message: '更新成功' });
    } catch (err) {
      res.json({ code: 1, message: err.message || '更新失败' });
    }
  }

  /**
   * 删除账户
   * DELETE /api/accounts/:id
   */
  delete(req, res) {
    try {
      const { id } = req.params;
      this.accountService.delete(id, req.userId);
      res.json({ code: 0, message: '删除成功' });
    } catch (err) {
      res.json({ code: 1, message: err.message || '删除失败' });
    }
  }
}

module.exports = AccountController;