/**
 * 账户管理页面
 * 账户列表、新增账户、编辑余额、删除账户
 */

(function () {
  /**
   * 渲染账户管理页面
   */
  async function renderAccounts(container) {
    container.innerHTML =
      '<h1 class="page-title">账户管理</h1>' +
      '<div style="margin-bottom:16px;">' +
        '<button class="btn" id="add-account-btn">+ 新增账户</button>' +
      '</div>' +
      '<div class="card-grid" id="account-list"></div>';

    // 绑定新增账户事件
    document.getElementById('add-account-btn').addEventListener('click', function () {
      showAccountModal(null);
    });

    // 加载账户列表
    await loadAccountList();
  }

  /**
   * 加载账户列表
   */
  async function loadAccountList() {
    var container = document.getElementById('account-list');
    if (!container) return;

    try {
      var res = await get('/accounts');
      var data = res.data || [];

      if (data.length === 0) {
        container.innerHTML = '<div class="card"><div class="empty-state"><span class="empty-text">暂无账户，点击上方按钮添加</span></div></div>';
        return;
      }

      container.innerHTML = data.map(function (acc) {
        var typeLabel = acc.type === 'credit' ? '信用卡' : acc.type === 'cash' ? '现金' : '储蓄卡';
        return '<div class="card" style="display:flex;flex-direction:column;">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">' +
            '<div>' +
              '<div style="font-size:16px;font-weight:500;color:#333;">' + acc.name + '</div>' +
              '<div style="font-size:12px;color:#999;margin-top:2px;">' + typeLabel + '</div>' +
            '</div>' +
            '<div style="font-size:20px;font-weight:600;color:#333;">¥' + (acc.balance || 0).toFixed(2) + '</div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #F5F5F5;padding-top:12px;">' +
            '<button class="btn btn-sm btn-edit-balance" data-id="' + acc.id + '" data-name="' + acc.name + '" data-balance="' + (acc.balance || 0) + '">调整余额</button>' +
            '<button class="btn btn-sm btn-danger btn-delete-account" data-id="' + acc.id + '">删除</button>' +
          '</div>' +
        '</div>';
      }).join('');

      // 绑定调整余额事件
      container.querySelectorAll('.btn-edit-balance').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = this.getAttribute('data-id');
          var name = this.getAttribute('data-name');
          var balance = parseFloat(this.getAttribute('data-balance'));
          showBalanceModal(id, name, balance);
        });
      });

      // 绑定删除事件
      container.querySelectorAll('.btn-delete-account').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          var id = this.getAttribute('data-id');
          await handleDeleteAccount(id);
        });
      });
    } catch (err) {
      container.innerHTML = '<div class="card"><div class="empty-state"><span class="empty-text">加载失败: ' + err.message + '</span></div></div>';
    }
  }

  /**
   * 显示新增账户弹窗
   */
  function showAccountModal() {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.style.display = 'flex';
    overlay.innerHTML =
      '<div class="modal">' +
        '<div class="modal-title">新增账户</div>' +
        '<form id="account-form">' +
          '<div class="form-group">' +
            '<label class="form-label">账户名称</label>' +
            '<input class="form-input" type="text" id="account-name" placeholder="如：校园卡、银行卡" />' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">账户类型</label>' +
            '<select class="form-select" id="account-type">' +
              '<option value="debit">储蓄卡</option>' +
              '<option value="credit">信用卡</option>' +
              '<option value="cash">现金</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">初始余额</label>' +
            '<input class="form-input" type="number" id="account-balance" placeholder="0.00" step="0.01" />' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button class="btn" type="button" id="account-cancel">取消</button>' +
            '<button class="btn btn-primary" type="submit">确认</button>' +
          '</div>' +
        '</form>' +
      '</div>';

    document.body.appendChild(overlay);

    document.getElementById('account-cancel').addEventListener('click', function () {
      overlay.remove();
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    document.getElementById('account-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      await handleCreateAccount(overlay);
    });
  }

  /**
   * 处理创建账户
   */
  async function handleCreateAccount(overlay) {
    var name = document.getElementById('account-name').value.trim();
    var type = document.getElementById('account-type').value;
    var balance = document.getElementById('account-balance').value || '0';

    if (!name) {
      showToast('请输入账户名称', 'error');
      return;
    }

    try {
      await post('/accounts', {
        name: name,
        type: type,
        balance: parseFloat(balance)
      });

      showToast('账户创建成功', 'success');
      overlay.remove();
      await loadAccountList();
    } catch (err) {
      showToast(err.message || '创建失败', 'error');
    }
  }

  /**
   * 显示调整余额弹窗
   * @param {number} id - 账户ID
   * @param {string} name - 账户名称
   * @param {number} currentBalance - 当前余额
   */
  function showBalanceModal(id, name, currentBalance) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.style.display = 'flex';
    overlay.innerHTML =
      '<div class="modal">' +
        '<div class="modal-title">调整余额 - ' + name + '</div>' +
        '<form id="balance-form">' +
          '<div class="form-group">' +
            '<label class="form-label">当前余额</label>' +
            '<div style="font-size:18px;font-weight:600;color:#333;">¥' + currentBalance.toFixed(2) + '</div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">新余额</label>' +
            '<input class="form-input" type="number" id="balance-new" placeholder="' + currentBalance.toFixed(2) + '" step="0.01" />' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button class="btn" type="button" id="balance-cancel">取消</button>' +
            '<button class="btn btn-primary" type="submit">确认</button>' +
          '</div>' +
        '</form>' +
      '</div>';

    document.body.appendChild(overlay);

    document.getElementById('balance-cancel').addEventListener('click', function () {
      overlay.remove();
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    document.getElementById('balance-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      await handleAdjustBalance(id, overlay);
    });
  }

  /**
   * 处理调整余额
   */
  async function handleAdjustBalance(id, overlay) {
    var newBalance = document.getElementById('balance-new').value;
    if (newBalance === '' || newBalance === undefined) {
      showToast('请输入新余额', 'error');
      return;
    }

    try {
      await put('/accounts/' + id, { balance: parseFloat(newBalance) });
      showToast('余额调整成功', 'success');
      overlay.remove();
      await loadAccountList();
    } catch (err) {
      showToast(err.message || '调整失败', 'error');
    }
  }

  /**
   * 处理删除账户
   * @param {number} id - 账户ID
   */
  async function handleDeleteAccount(id) {
    var confirmed = await confirmDialog('确定要删除这个账户吗？删除后不可恢复。');
    if (!confirmed) return;

    try {
      await del('/accounts/' + id);
      showToast('删除成功', 'success');
      await loadAccountList();
    } catch (err) {
      showToast(err.message || '删除失败', 'error');
    }
  }

  // 注册页面
  registerPage('accounts', renderAccounts);
})();