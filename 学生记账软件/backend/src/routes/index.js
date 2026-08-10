const { Router } = require('express');
const authMiddleware = require('../middleware/auth');

/**
 * 注册所有路由
 */
function setupRoutes(app, controllers) {
  const router = Router();

  // ========== 认证相关（无需登录） ==========
  router.post('/auth/register', controllers.auth.register.bind(controllers.auth));
  router.post('/auth/login', controllers.auth.login.bind(controllers.auth));
  router.post('/auth/forgot-password', controllers.auth.forgotPassword.bind(controllers.auth));

  // ========== 需要登录的路由 ==========
  router.use('/auth/profile', authMiddleware);
  router.get('/auth/profile', controllers.auth.getProfile.bind(controllers.auth));
  router.use('/auth/change-password', authMiddleware);
  router.post('/auth/change-password', controllers.auth.changePassword.bind(controllers.auth));

  // 交易记录
  router.use('/transactions', authMiddleware);
  router.post('/transactions', controllers.transaction.create.bind(controllers.transaction));
  router.get('/transactions', controllers.transaction.list.bind(controllers.transaction));
  router.get('/transactions/:id', controllers.transaction.getById.bind(controllers.transaction));
  router.put('/transactions/:id', controllers.transaction.update.bind(controllers.transaction));
  router.delete('/transactions/:id', controllers.transaction.delete.bind(controllers.transaction));

  // 预算
  router.use('/budgets', authMiddleware);
  router.post('/budgets', controllers.budget.create.bind(controllers.budget));
  router.get('/budgets', controllers.budget.list.bind(controllers.budget));
  router.get('/budgets/progress', controllers.budget.getProgress.bind(controllers.budget));
  router.put('/budgets/:id', controllers.budget.update.bind(controllers.budget));
  router.delete('/budgets/:id', controllers.budget.delete.bind(controllers.budget));

  // 账户
  router.use('/accounts', authMiddleware);
  router.post('/accounts', controllers.account.create.bind(controllers.account));
  router.get('/accounts', controllers.account.list.bind(controllers.account));
  router.put('/accounts/:id', controllers.account.update.bind(controllers.account));
  router.delete('/accounts/:id', controllers.account.delete.bind(controllers.account));

  // 统计
  router.use('/statistics', authMiddleware);
  router.get('/statistics/monthly', controllers.statistics.getMonthlySummary.bind(controllers.statistics));
  router.get('/statistics/category', controllers.statistics.getCategoryBreakdown.bind(controllers.statistics));
  router.get('/statistics/trend', controllers.statistics.getTrend.bind(controllers.statistics));

  // 导出
  router.use('/export', authMiddleware);
  router.get('/export/csv', controllers.exportCtrl.exportCSV.bind(controllers.exportCtrl));

  // 分类
  router.use('/categories', authMiddleware);
  router.get('/categories', controllers.category.list.bind(controllers.category));

  // 数据重置
  router.use('/reset', authMiddleware);
  router.post('/reset', controllers.reset.reset.bind(controllers.reset));

  // 统一前缀
  app.use('/api', router);
}

module.exports = setupRoutes;