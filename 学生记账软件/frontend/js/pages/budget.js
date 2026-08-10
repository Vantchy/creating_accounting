/**
 * 预算管理页面
 * 新增预算、预算列表、进度条显示
 */

(function () {
  /**
   * 渲染预算管理页面
   */
  async function renderBudget(container) {
    // 加载分类
    await loadCategories();

    container.innerHTML =
      '<h1 class="page-title">预算管理</h1>' +
      // 新增预算按钮
      '<div style="margin-bottom:16px;">' +
        '<button class="btn" id="add-budget-btn">+ 新增预算</button>' +
      '</div>' +
      // 预算列表
      '<div id="budget-list"></div>';

    // 绑定新增预算事件
    document.getElementById('add-budget-btn').addEventListener('click', function () {
      showBudgetModal(null);
    });

    // 加载预算列表
    await loadBudgetList();
  }

  /**
   * 加载预算列表
   */
  async function loadBudgetList() {
    var container = document.getElementById('budget-list');
    if (!container) return;

    try {
      // 获取预算进度
      var res = await get('/budgets/progress', { year: getCurrentYear(), month: getCurrentMonth() });
      var data = res.data || [];

      if (data.length === 0) {
        container.innerHTML = '<div class="card"><div class="empty-state"><span class="empty-text">暂无预算，点击上方按钮添加</span></div></div>';
        return;
      }

      container.innerHTML = data.map(function (item) {
        var spent = item.spent || 0;
        var budgetAmount = item.amount || 0;
        var percentage = budgetAmount > 0 ? Math.min((spent / budgetAmount) * 100, 100) : 0;
        var catName = getCategoryName(item.category_id);

        // 进度条颜色
        var progressClass = 'progress-normal';
        if (percentage >= 100) {
          progressClass = 'progress-danger';
        } else if (percentage >= 80) {
          progressClass = 'progress-warning';
        }

        return '<div class="card">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
            '<div>' +
              '<div style="font-size:14px;font-weight:500;color:#333;">' + catName + '</div>' +
              '<div style="font-size:12px;color:#999;margin-top:2px;">周期: ' + (item.period === 'weekly' ? '每周' : '每月') + '</div>' +
            '</div>' +
            '<div style="text-align:right;">' +
              '<div style="font-size:14px;font-weight:500;color:#333;">¥' + spent.toFixed(2) + ' / ¥' + budgetAmount.toFixed(2) + '</div>' +
              '<div style="font-size:12px;color:#999;margin-top:2px;">已用 ' + percentage.toFixed(1) + '%</div>' +
            '</div>' +
          '</div>' +
          '<div class="progress-bar ' + progressClass + '">' +
            '<div class="progress-bar-fill" style="width:' + percentage + '%;"></div>' +
          '</div>' +
          '<div style="margin-top:12px;text-align:right;">' +
            '<button class="btn btn-sm btn-danger btn-delete-budget" data-id="' + item.id + '">删除</button>' +
          '</div>' +
        '</div>';
      }).join('');

      // 绑定删除事件
      container.querySelectorAll('.btn-delete-budget').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          var id = this.getAttribute('data-id');
          await handleDeleteBudget(id);
        });
      });
    } catch (err) {
      container.innerHTML = '<div class="card"><div class="empty-state"><span class="empty-text">加载失败: ' + err.message + '</span></div></div>';
    }
  }

  /**
   * 显示新增预算弹窗
   * @param {object} budget - 预算对象（编辑时使用）
   */
  function showBudgetModal() {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.style.display = 'flex';
    overlay.innerHTML =
      '<div class="modal">' +
        '<div class="modal-title">新增预算</div>' +
        '<form id="budget-form">' +
          '<div class="form-group">' +
            '<label class="form-label">分类</label>' +
            '<select class="form-select" id="budget-category">' +
              '<option value="">请选择分类</option>' +
              (AppState.categories.length > 0
                ? AppState.categories
                  .filter(function (c) { return c.type === 'expense'; })
                  .map(function (c) { return '<option value="' + c.id + '">' + c.name + '</option>'; }).join('')
                : '<option value="" disabled>暂无分类</option>'
              ) +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">预算金额</label>' +
            '<input class="form-input" type="number" id="budget-amount" placeholder="0.00" step="0.01" min="0" />' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">周期</label>' +
            '<select class="form-select" id="budget-period">' +
              '<option value="monthly">每月</option>' +
              '<option value="weekly">每周</option>' +
            '</select>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button class="btn" type="button" id="budget-cancel">取消</button>' +
            '<button class="btn btn-primary" type="submit">确认</button>' +
          '</div>' +
        '</form>' +
      '</div>';

    document.body.appendChild(overlay);

    // 绑定取消事件
    document.getElementById('budget-cancel').addEventListener('click', function () {
      overlay.remove();
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    // 绑定提交事件
    document.getElementById('budget-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      await handleCreateBudget(overlay);
    });
  }

  /**
   * 处理创建预算
   */
  async function handleCreateBudget(overlay) {
    var categoryId = document.getElementById('budget-category').value;
    var amount = document.getElementById('budget-amount').value;
    var period = document.getElementById('budget-period').value;

    if (!categoryId) {
      showToast('请选择分类', 'error');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      showToast('请输入有效预算金额', 'error');
      return;
    }

    var now = new Date();
    var startDate = getMonthStart();
    var endDate = getMonthEnd();

    // 如果周期是周，设置本周范围
    if (period === 'weekly') {
      var weekRange = getWeekRange();
      startDate = weekRange.start;
      endDate = weekRange.end;
    }

    try {
      await post('/budgets', {
        categoryId: categoryId,
        amount: parseFloat(amount),
        period: period,
        startDate: startDate,
        endDate: endDate
      });

      showToast('预算创建成功', 'success');
      overlay.remove();
      await loadBudgetList();
    } catch (err) {
      showToast(err.message || '创建失败', 'error');
    }
  }

  /**
   * 处理删除预算
   * @param {number} id - 预算 ID
   */
  async function handleDeleteBudget(id) {
    var confirmed = await confirmDialog('确定要删除这个预算吗？');
    if (!confirmed) return;

    try {
      await del('/budgets/' + id);
      showToast('删除成功', 'success');
      await loadBudgetList();
    } catch (err) {
      showToast(err.message || '删除失败', 'error');
    }
  }

  // 注册页面
  registerPage('budget', renderBudget);
})();