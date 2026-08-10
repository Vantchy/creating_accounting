/**
 * 登录/注册页面
 * 支持手机号+密码登录和注册
 */

(function () {
  // 当前模式：'login' 或 'register'
  var currentMode = 'login';

  /**
   * 渲染登录/注册页面
   * @param {HTMLElement} container - 内容容器
   */
  async function renderAuth(container) {
    container.innerHTML =
      '<div class="auth-container">' +
        '<h2>' + (currentMode === 'login' ? '登录' : '注册') + '</h2>' +
        '<p class="auth-subtitle">校园记账软件</p>' +
        '<form id="auth-form">' +
          '<div class="form-group" id="nickname-group"' + (currentMode === 'login' ? ' style="display:none;"' : '') + '>' +
            '<label class="form-label">昵称</label>' +
            '<input class="form-input" type="text" id="auth-nickname" placeholder="请输入昵称" />' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">手机号</label>' +
            '<input class="form-input" type="tel" id="auth-phone" placeholder="请输入手机号" />' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">密码</label>' +
            '<input class="form-input" type="password" id="auth-password" placeholder="请输入密码" />' +
          '</div>' +
          '<button class="btn btn-primary btn-block" type="submit" id="auth-submit">' +
            (currentMode === 'login' ? '登录' : '注册') +
          '</button>' +
        '</form>' +
        '<div class="auth-toggle">' +
          '<span>' + (currentMode === 'login' ? '还没有账号？' : '已有账号？') + '</span> ' +
          '<a id="auth-toggle-btn">' + (currentMode === 'login' ? '立即注册' : '去登录') + '</a>' +
        '</div>' +
        (currentMode === 'login' ? '<div class="auth-forgot"><a id="auth-forgot-btn">忘记密码？</a></div>' : '') +
      '</div>';

    // 绑定切换模式事件
    document.getElementById('auth-toggle-btn').addEventListener('click', function () {
      currentMode = currentMode === 'login' ? 'register' : 'login';
      renderAuth(container);
    });

    // 绑定表单提交事件
    document.getElementById('auth-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      await handleSubmit();
    });

    // 绑定忘记密码事件
    var forgotBtn = document.getElementById('auth-forgot-btn');
    if (forgotBtn) {
      forgotBtn.addEventListener('click', function () {
        showForgotPasswordModal(container);
      });
    }
  }

  /**
   * 处理表单提交
   */
  async function handleSubmit() {
    var phone = document.getElementById('auth-phone').value.trim();
    var password = document.getElementById('auth-password').value.trim();
    var nickname = document.getElementById('auth-nickname') ? document.getElementById('auth-nickname').value.trim() : '';

    // 表单验证
    if (!phone) {
      showToast('请输入手机号', 'error');
      return;
    }
    if (!/^1\d{10}$/.test(phone)) {
      showToast('请输入正确的手机号', 'error');
      return;
    }
    if (!password) {
      showToast('请输入密码', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('密码至少6位', 'error');
      return;
    }
    if (currentMode === 'register' && !nickname) {
      showToast('请输入昵称', 'error');
      return;
    }

    var submitBtn = document.getElementById('auth-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = '处理中...';

    try {
      var res;
      if (currentMode === 'login') {
        // 登录
        res = await post('/auth/login', { phone: phone, password: password });
      } else {
        // 注册
        res = await post('/auth/register', { phone: phone, password: password, nickname: nickname });
      }

      // 保存 token 和用户信息
      if (res.data && res.data.token) {
        setToken(res.data.token);
        AppState.user = res.data.user;
        showToast(currentMode === 'login' ? '登录成功' : '注册成功', 'success');
        // 跳转到首页
        navigateTo('/home');
      }
    } catch (err) {
      showToast(err.message || '操作失败', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = currentMode === 'login' ? '登录' : '注册';
    }
  }

  /**
   * 显示忘记密码弹窗
   */
  function showForgotPasswordModal(container) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.style.display = 'flex';
    overlay.innerHTML =
      '<div class="modal">' +
        '<div class="modal-title">重置密码</div>' +
        '<form id="forgot-form">' +
          '<div class="form-group">' +
            '<label class="form-label">手机号</label>' +
            '<input class="form-input" type="tel" id="forgot-phone" placeholder="请输入注册时的手机号" />' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">新密码</label>' +
            '<input class="form-input" type="password" id="forgot-new-password" placeholder="请输入新密码（至少6位）" />' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">确认新密码</label>' +
            '<input class="form-input" type="password" id="forgot-confirm-password" placeholder="请再次输入新密码" />' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button class="btn" type="button" id="forgot-cancel">取消</button>' +
            '<button class="btn btn-primary" type="submit">确认重置</button>' +
          '</div>' +
        '</form>' +
      '</div>';

    document.body.appendChild(overlay);

    document.getElementById('forgot-cancel').addEventListener('click', function () {
      overlay.remove();
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.remove();
    });

    document.getElementById('forgot-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var phone = document.getElementById('forgot-phone').value.trim();
      var newPassword = document.getElementById('forgot-new-password').value;
      var confirmPassword = document.getElementById('forgot-confirm-password').value;

      if (!phone) { showToast('请输入手机号', 'error'); return; }
      if (!/^1\d{10}$/.test(phone)) { showToast('请输入正确的手机号', 'error'); return; }
      if (!newPassword) { showToast('请输入新密码', 'error'); return; }
      if (newPassword.length < 6) { showToast('密码至少6位', 'error'); return; }
      if (newPassword !== confirmPassword) { showToast('两次密码输入不一致', 'error'); return; }

      try {
        var res = await post('/auth/forgot-password', { phone: phone, newPassword: newPassword });
        showToast('密码重置成功，请重新登录', 'success');
        overlay.remove();
      } catch (err) {
        showToast(err.message || '重置失败', 'error');
      }
    });
  }

  // 注册页面
  registerPage('auth', renderAuth);
})();