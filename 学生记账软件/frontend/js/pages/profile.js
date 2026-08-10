/**
 * 个人中心页面
 * 用户信息展示、月生活费设置、生活费到账日设置、退出登录、数据导出
 */

(function () {
  /**
   * 渲染个人中心页面
   */
  async function renderProfile(container) {
    // 加载用户信息
    try {
      var res = await get('/auth/profile');
      AppState.user = res.data || AppState.user;
    } catch (err) {
      console.warn('加载用户信息失败:', err);
    }

    var user = AppState.user || {};
    var nickname = user.nickname || '未设置';
    var phone = user.phone || '未绑定';

    // 从 localStorage 读取生活费设置（因为后端可能没有对应接口）
    var monthlyAllowance = localStorage.getItem('monthlyAllowance') || '2000';
    var allowanceDay = localStorage.getItem('allowanceDay') || '1';

    container.innerHTML =
      '<h1 class="page-title">我的</h1>' +
      // 用户信息卡片
      '<div class="card">' +
        '<div class="card-title">个人信息</div>' +
        '<div style="display:flex;align-items:center;gap:16px;padding:8px 0;">' +
          '<div style="width:48px;height:48px;border-radius:50%;background:#F0F0F0;display:flex;align-items:center;justify-content:center;font-size:20px;color:#999;">' +
            (nickname.charAt(0) || '?') +
          '</div>' +
          '<div>' +
            '<div style="font-size:16px;font-weight:500;color:#333;">' + nickname + '</div>' +
            '<div style="font-size:13px;color:#999;margin-top:2px;">' + phone + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      // 生活费设置
      '<div class="card">' +
        '<div class="card-title">生活费设置</div>' +
        '<div class="form-group">' +
          '<label class="form-label">月生活费（元）</label>' +
          '<input class="form-input" type="number" id="allowance-amount" value="' + monthlyAllowance + '" placeholder="请输入月生活费金额" />' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">生活费到账日（每月几号）</label>' +
          '<select class="form-select" id="allowance-day">' +
            generateDayOptions(parseInt(allowanceDay)) +
          '</select>' +
        '</div>' +
        '<button class="btn btn-primary" id="save-allowance">保存设置</button>' +
      '</div>' +

      // 操作按钮
      '<div class="card">' +
        '<div class="card-title">账号管理</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px;">' +
          '<button class="btn btn-block" id="change-password-btn" style="justify-content:flex-start;text-align:left;">修改密码</button>' +
          '<button class="btn btn-block" id="export-csv" style="justify-content:flex-start;text-align:left;">导出账单 CSV</button>' +
          '<button class="btn btn-block btn-danger" id="reset-data-btn" style="justify-content:flex-start;text-align:left;">初始化数据</button>' +
          '<button class="btn btn-block btn-danger" id="logout-btn" style="justify-content:flex-start;text-align:left;">退出登录</button>' +
        '</div>' +
      '</div>';

    // 绑定保存生活费设置
    document.getElementById('save-allowance').addEventListener('click', function () {
      var amount = document.getElementById('allowance-amount').value;
      var day = document.getElementById('allowance-day').value;

      if (!amount || parseFloat(amount) <= 0) {
        showToast('请输入有效金额', 'error');
        return;
      }

      localStorage.setItem('monthlyAllowance', amount);
      localStorage.setItem('allowanceDay', day);
      showToast('设置已保存于本地', 'success');
    });

    // 绑定修改密码
    document.getElementById('change-password-btn').addEventListener('click', function () {
      showChangePasswordModal();
    });

    // 绑定导出 CSV
    document.getElementById('export-csv').addEventListener('click', async function () {
      await handleExport();
    });

    // 绑定初始化数据
    document.getElementById('reset-data-btn').addEventListener('click', async function () {
      var confirmed = await confirmDialog('确定要初始化数据吗？\n此操作将删除所有交易记录、预算，并重置账户余额为 0。\n此操作不可撤销！');
      if (!confirmed) return;

      var btn = document.getElementById('reset-data-btn');
      btn.disabled = true;
      btn.textContent = '重置中...';
      try {
        await post('/reset');
        showToast('数据已重置', 'success');
        // 刷新页面
        renderProfile(container);
      } catch (err) {
        showToast(err.message || '重置失败', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '初始化数据';
      }
    });

    // 绑定退出登录
    document.getElementById('logout-btn').addEventListener('click', async function () {
      var confirmed = await confirmDialog('确定要退出登录吗？');
      if (confirmed) {
        clearToken();
        AppState.user = null;
        showToast('已退出登录', 'success');
        navigateTo('/auth');
      }
    });
  }

  /**
   * 生成日期选项
   * @param {number} selectedDay - 选中的日期
   * @returns {string} 选项 HTML
   */
  function generateDayOptions(selectedDay) {
    var options = '';
    for (var i = 1; i <= 28; i++) {
      options += '<option value="' + i + '"' + (i === selectedDay ? ' selected' : '') + '>' + i + '号</option>';
    }
    return options;
  }

  /**
   * 处理导出 CSV
   */
  async function handleExport() {
    var exportBtn = document.getElementById('export-csv');
    exportBtn.disabled = true;
    exportBtn.textContent = '导出中...';

    try {
      // 尝试从后端获取 CSV
      var token = getToken();
      var url = 'http://localhost:3000/api/export/csv?startDate=2020-01-01&endDate=2099-12-31';

      var response = await fetch(url, {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });

      if (response.ok) {
        var content = await response.text();
        var filename = '账单导出_' + formatDate(new Date()) + '.csv';
        downloadFile(content, filename, 'text/csv;charset=utf-8;');
        showToast('导出成功', 'success');
      } else {
        throw new Error('导出接口返回错误');
      }
    } catch (err) {
      // 如果后端导出接口不可用，生成本地 CSV
      showToast('正在从本地数据生成...', 'info');
      try {
        await generateLocalCSV();
      } catch (csvErr) {
        showToast('导出失败: ' + csvErr.message, 'error');
      }
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = '导出账单 CSV';
    }
  }

  /**
   * 生成本地 CSV（后端接口不可用时的降级方案）
   */
  async function generateLocalCSV() {
    var res = await get('/transactions', { page: 1, limit: 10000 });
    var list = res.data && res.data.list ? res.data.list : [];

    if (list.length === 0) {
      showToast('暂无数据可导出', 'error');
      return;
    }

    // CSV 头部
    var csv = '日期,类型,金额,分类,账户,备注\n';

    var totalIncome = 0;
    var totalExpense = 0;

    list.forEach(function (t) {
      var amount = parseFloat(t.amount) || 0;
      if (t.type === 'income') totalIncome += amount;
      else totalExpense += amount;

      var row = [
        formatDate(t.date),
        t.type === 'income' ? '收入' : '支出',
        amount.toFixed(2),
        getCategoryName(t.category_id),
        getAccountName(t.account_id),
        escapeCSV(t.note || '无')
      ];
      csv += row.join(',') + '\n';
    });

    // 汇总行
    var netAmount = totalIncome - totalExpense;
    csv += '\n';
    csv += '"汇总",,,,,\n';
    csv += '"收入总计","","' + totalIncome.toFixed(2) + '",,,,\n';
    csv += '"支出总计","","' + totalExpense.toFixed(2) + '",,,,\n';
    csv += '"净收入","","' + netAmount.toFixed(2) + '",,,,\n';

    // 添加 BOM 以便 Excel 正确识别 UTF-8 编码
    var filename = '账单导出_' + formatDate(new Date()) + '.csv';
    downloadFile('\ufeff' + csv, filename, 'text/csv;charset=utf-8;');
    showToast('导出成功', 'success');
  }

  /**
   * 显示修改密码弹窗
   */
  function showChangePasswordModal() {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.style.display = 'flex';
    overlay.innerHTML =
      '<div class="modal">' +
        '<div class="modal-title">修改密码</div>' +
        '<form id="change-password-form">' +
          '<div class="form-group">' +
            '<label class="form-label">旧密码</label>' +
            '<input class="form-input" type="password" id="cp-old" placeholder="请输入当前密码" />' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">新密码</label>' +
            '<input class="form-input" type="password" id="cp-new" placeholder="请输入新密码（至少6位）" />' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">确认新密码</label>' +
            '<input class="form-input" type="password" id="cp-confirm" placeholder="请再次输入新密码" />' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button class="btn" type="button" id="cp-cancel">取消</button>' +
            '<button class="btn btn-primary" type="submit">确认修改</button>' +
          '</div>' +
        '</form>' +
      '</div>';

    document.body.appendChild(overlay);

    document.getElementById('cp-cancel').addEventListener('click', function () {
      overlay.remove();
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.remove();
    });

    document.getElementById('change-password-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var oldPassword = document.getElementById('cp-old').value;
      var newPassword = document.getElementById('cp-new').value;
      var confirmPassword = document.getElementById('cp-confirm').value;

      if (!oldPassword) { showToast('请输入当前密码', 'error'); return; }
      if (!newPassword) { showToast('请输入新密码', 'error'); return; }
      if (newPassword.length < 6) { showToast('密码至少6位', 'error'); return; }
      if (newPassword !== confirmPassword) { showToast('两次密码输入不一致', 'error'); return; }

      try {
        var res = await post('/auth/change-password', { oldPassword: oldPassword, newPassword: newPassword });
        showToast('密码修改成功', 'success');
        overlay.remove();
      } catch (err) {
        showToast(err.message || '修改失败', 'error');
      }
    });
  }

  // 注册页面
  registerPage('profile', renderProfile);
})();