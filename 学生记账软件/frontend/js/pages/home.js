/**
 * 首页/快速记账页面
 * 显示今日收支概览，快速记账表单，最近交易记录
 */

(function () {
  // 默认分类列表（当 API 不可用时使用）
  var defaultCategories = [
    { id: 0, name: '餐饮', symbol: '饭' },
    { id: 1, name: '交通', symbol: '行' },
    { id: 2, name: '购物', symbol: '购' },
    { id: 3, name: '学习', symbol: '学' },
    { id: 4, name: '娱乐', symbol: '乐' },
    { id: 5, name: '住宿', symbol: '宿' },
    { id: 6, name: '通讯', symbol: '信' },
    { id: 7, name: '其他', symbol: '其' }
  ];

  var incomeCategories = [
    { id: 100, name: '生活费', symbol: '活' },
    { id: 101, name: '兼职', symbol: '兼' },
    { id: 102, name: '奖学金', symbol: '奖' },
    { id: 103, name: '其他', symbol: '其' }
  ];

  var selectedCategoryId = null;
  var transactionType = 'expense'; // 'expense' 或 'income'

  /**
   * 渲染首页
   */
  async function renderHome(container) {
    // 加载基础数据
    await Promise.all([
      loadCategories(),
      loadAccounts()
    ]);

    container.innerHTML =
      '<h1 class="page-title">首页</h1>' +
      // 今日概览
      '<div class="overview-numbers" id="today-overview">' +
        '<div class="overview-item">' +
          '<div class="label">今日收入</div>' +
          '<div class="number income" id="today-income">¥0.00</div>' +
        '</div>' +
        '<div class="overview-item">' +
          '<div class="label">今日支出</div>' +
          '<div class="number expense" id="today-expense">¥0.00</div>' +
        '</div>' +
        '<div class="overview-item">' +
          '<div class="label">今日结余</div>' +
          '<div class="number" id="today-balance">¥0.00</div>' +
        '</div>' +
      '</div>' +
      // 快速记账卡片
      '<div class="card">' +
        '<div class="card-title">快速记账</div>' +
        '<form id="quick-form">' +
          // 类型切换
          '<div class="form-row" style="margin-bottom:16px;">' +
            '<button class="btn btn-sm" type="button" id="type-expense" style="flex:1;' + (transactionType === 'expense' ? 'background:#333;color:#fff;border-color:#333;' : '') + '">支出</button>' +
            '<button class="btn btn-sm" type="button" id="type-income" style="flex:1;' + (transactionType === 'income' ? 'background:#333;color:#fff;border-color:#333;' : '') + '">收入</button>' +
          '</div>' +
          // 分类选择
          '<div class="form-label">选择分类</div>' +
          '<div class="category-grid" id="category-grid"></div>' +
          // 金额输入
          '<div class="form-group">' +
            '<label class="form-label">金额</label>' +
            '<input class="form-input" type="number" id="quick-amount" placeholder="0.00" step="0.01" min="0" />' +
          '</div>' +
          // 备注输入
          '<div class="form-group">' +
            '<label class="form-label">备注</label>' +
            '<input class="form-input" type="text" id="quick-note" placeholder="可选" />' +
          '</div>' +
          // 日期选择
          '<div class="form-group">' +
            '<label class="form-label">日期</label>' +
            '<input class="form-input" type="date" id="quick-date" />' +
          '</div>' +
          // 账户选择
          '<div class="form-group">' +
            '<label class="form-label">账户</label>' +
            '<select class="form-select" id="quick-account">' +
              '<option value="">请选择账户</option>' +
              (AppState.accounts.length > 0
                ? AppState.accounts.map(function (a) { return '<option value="' + a.id + '">' + a.name + '</option>'; }).join('')
                : '<option value="" disabled>暂无账户，请先在账户页面添加</option>'
              ) +
            '</select>' +
          '</div>' +
          '<button class="btn btn-primary btn-block" type="submit" id="quick-submit">记一笔</button>' +
        '</form>' +
      '</div>' +
      // 最近交易
      '<div class="card">' +
        '<div class="card-title">最近交易</div>' +
        '<div id="recent-transactions"></div>' +
      '</div>';

    // 设置默认日期
    document.getElementById('quick-date').value = toDateInputValue();

    // 渲染分类
    renderCategories();

    // 绑定事件
    document.getElementById('type-expense').addEventListener('click', function () {
      transactionType = 'expense';
      document.getElementById('type-expense').style.cssText = 'flex:1;background:#333;color:#fff;border-color:#333;';
      document.getElementById('type-income').style.cssText = 'flex:1;background:transparent;color:#333;';
      renderCategories();
    });

    document.getElementById('type-income').addEventListener('click', function () {
      transactionType = 'income';
      document.getElementById('type-income').style.cssText = 'flex:1;background:#333;color:#fff;border-color:#333;';
      document.getElementById('type-expense').style.cssText = 'flex:1;background:transparent;color:#333;';
      renderCategories();
    });

    document.getElementById('quick-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      await handleQuickSubmit();
    });

    // 加载数据
    await loadTodayOverview();
    await loadRecentTransactions();
  }

  /**
   * 渲染分类选择网格
   */
  function renderCategories() {
    var grid = document.getElementById('category-grid');
    if (!grid) return;

    var categories = transactionType === 'expense'
      ? (AppState.categories.length > 0 ? AppState.categories.filter(function (c) { return c.type === 'expense' || !c.type; }) : defaultCategories)
      : (AppState.categories.length > 0 ? AppState.categories.filter(function (c) { return c.type === 'income' || c.id >= 100; }) : incomeCategories);

    // 如果 API 有分类数据，使用 API 的；否则用默认的
    if (AppState.categories.length > 0) {
      categories = AppState.categories.filter(function (c) {
        return transactionType === 'expense' ? (c.type === 'expense' || !c.type) : (c.type === 'income');
      });
      if (categories.length === 0) {
        categories = AppState.categories;
      }
    }

    grid.innerHTML = categories.map(function (cat) {
      var symbol = cat.name.charAt(0) || '?';
      return '<div class="category-item' + (selectedCategoryId === cat.id ? ' active' : '') + '" data-category-id="' + cat.id + '">' +
        '<span class="category-symbol">' + symbol + '</span>' +
        cat.name +
        '</div>';
    }).join('');

    // 绑定分类点击事件
    grid.querySelectorAll('.category-item').forEach(function (item) {
      item.addEventListener('click', function () {
        grid.querySelectorAll('.category-item').forEach(function (el) { el.classList.remove('active'); });
        this.classList.add('active');
        selectedCategoryId = this.getAttribute('data-category-id');
      });
    });
  }

  /**
   * 处理快速记账提交
   */
  async function handleQuickSubmit() {
    var amount = document.getElementById('quick-amount').value;
    var note = document.getElementById('quick-note').value.trim();
    var date = document.getElementById('quick-date').value;
    var accountId = document.getElementById('quick-account').value;

    // 验证
    if (!selectedCategoryId) {
      showToast('请选择分类', 'error');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      showToast('请输入有效金额', 'error');
      return;
    }
    if (!accountId) {
      showToast('请选择账户', 'error');
      return;
    }

    var submitBtn = document.getElementById('quick-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = '提交中...';

    try {
      await post('/transactions', {
        accountId: accountId,
        categoryId: selectedCategoryId,
        amount: parseFloat(amount),
        type: transactionType,
        note: note,
        date: date
      });

      showToast('记账成功', 'success');

      // 重置表单
      document.getElementById('quick-amount').value = '';
      document.getElementById('quick-note').value = '';
      selectedCategoryId = null;
      document.querySelectorAll('.category-item').forEach(function (el) { el.classList.remove('active'); });

      // 刷新概览、最近交易和账户缓存
      await Promise.all([
        loadTodayOverview(),
        loadRecentTransactions(),
        loadAccounts()
      ]);
    } catch (err) {
      showToast(err.message || '记账失败', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '记一笔';
    }
  }

  /**
   * 加载今日概览
   */
  async function loadTodayOverview() {
    var today = getToday();
    try {
      var res = await get('/transactions', {
        startDate: today,
        endDate: today,
        limit: 1000
      });
      var transactions = res.data && res.data.list ? res.data.list : [];
      var income = 0;
      var expense = 0;
      transactions.forEach(function (t) {
        if (t.type === 'income') {
          income += Number(t.amount) || 0;
        } else {
          expense += Number(t.amount) || 0;
        }
      });

      document.getElementById('today-income').textContent = '¥' + income.toFixed(2);
      document.getElementById('today-expense').textContent = '¥' + expense.toFixed(2);
      document.getElementById('today-balance').textContent = '¥' + (income - expense).toFixed(2);
    } catch (err) {
      console.warn('加载今日概览失败:', err);
    }
  }

  /**
   * 加载最近交易记录
   */
  async function loadRecentTransactions() {
    var container = document.getElementById('recent-transactions');
    if (!container) return;

    try {
      var res = await get('/transactions', { page: 1, limit: 5 });
      var list = res.data && res.data.list ? res.data.list : [];

      if (list.length === 0) {
        container.innerHTML = '<div class="empty-state"><span class="empty-text">暂无交易记录</span></div>';
        return;
      }

      container.innerHTML = list.map(function (t) {
        var catName = getCategoryName(t.category_id);
        var accName = getAccountName(t.account_id);
        var amountClass = t.type === 'income' ? 'amount-income' : 'amount-expense';
        var sign = t.type === 'income' ? '+' : '-';
        return '<div class="list-item">' +
          '<div class="item-left">' +
            '<div class="item-title">' + catName + (t.note ? ' - ' + t.note : '') + '</div>' +
            '<div class="item-sub">' + accName + ' ' + formatTime(t.created_at) + '</div>' +
          '</div>' +
          '<div class="item-right">' +
            '<span class="' + amountClass + '">' + sign + '¥' + Math.abs(t.amount).toFixed(2) + '</span>' +
          '</div>' +
        '</div>';
      }).join('');
    } catch (err) {
      container.innerHTML = '<div class="empty-state"><span class="empty-text">加载失败</span></div>';
    }
  }

  // 注册页面
  registerPage('home', renderHome);
})();