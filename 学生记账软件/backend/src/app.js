const express = require('express');
const cors = require('cors');
const { initDatabase, db } = require('./utils/database');
const { PORT } = require('./config');

async function main() {
  // ========== 初始化数据库 ==========
  await initDatabase();
  console.log('数据库连接成功');

  // ========== 初始化模型 ==========
  const User = require('./models/User');
  const Transaction = require('./models/Transaction');
  const Category = require('./models/Category');
  const Account = require('./models/Account');
  const Budget = require('./models/Budget');
  const Notification = require('./models/Notification');

  const userModel = new User(db);
  const transactionModel = new Transaction(db);
  const categoryModel = new Category(db);
  const accountModel = new Account(db);
  const budgetModel = new Budget(db);
  const notificationModel = new Notification(db);

  // 创建所有表
  userModel.createTable();
  transactionModel.createTable();
  categoryModel.createTable();
  accountModel.createTable();
  budgetModel.createTable();
  notificationModel.createTable();

  // 插入默认分类
  categoryModel.insertDefaultCategories();

  console.log('数据库初始化完成');

  // ========== 初始化服务 ==========
  const AuthService = require('./services/authService');
  const TransactionService = require('./services/transactionService');
  const BudgetService = require('./services/budgetService');
  const AccountService = require('./services/accountService');
  const StatisticsService = require('./services/statisticsService');
  const ExportService = require('./services/exportService');
  const ReminderService = require('./services/reminderService');

  const authService = new AuthService(userModel);
  const transactionService = new TransactionService(transactionModel, accountModel);
  const budgetService = new BudgetService(budgetModel, transactionModel);
  const accountService = new AccountService(accountModel);
  const statisticsService = new StatisticsService(transactionModel);
  const exportService = new ExportService(transactionModel);
  const reminderService = new ReminderService(userModel, budgetModel, transactionModel, notificationModel);

  // ========== 初始化控制器 ==========
  const AuthController = require('./controllers/authController');
  const TransactionController = require('./controllers/transactionController');
  const BudgetController = require('./controllers/budgetController');
  const AccountController = require('./controllers/accountController');
  const StatisticsController = require('./controllers/statisticsController');
  const ExportController = require('./controllers/exportController');
  const CategoryController = require('./controllers/categoryController');
  const ResetController = require('./controllers/resetController');

  const controllers = {
    auth: new AuthController(authService),
    transaction: new TransactionController(transactionService),
    budget: new BudgetController(budgetService),
    account: new AccountController(accountService),
    statistics: new StatisticsController(statisticsService),
    exportCtrl: new ExportController(exportService),
    category: new CategoryController(categoryModel),
    reset: new ResetController(transactionModel, budgetModel, accountModel)
  };

  // ========== 创建 Express 应用 ==========
  const app = express();

  // 注册中间件
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 注册路由
  const setupRoutes = require('./routes/index');
  setupRoutes(app, controllers);

  // ========== 启动定时任务 ==========
  reminderService.start();

  // ========== 全局错误处理 ==========
  app.use((err, req, res, next) => {
    console.error('服务异常:', err);
    res.status(500).json({ code: 1, message: '服务器内部错误' });
  });

  // ========== 启动服务 ==========
  app.listen(PORT, () => {
    console.log(`校园记账服务已启动，端口: ${PORT}`);
    console.log(`API 地址: http://localhost:${PORT}/api`);
  });
}

main().catch(err => {
  console.error('启动失败:', err);
  process.exit(1);
});