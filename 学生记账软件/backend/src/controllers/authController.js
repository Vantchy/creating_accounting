/**
 * 认证控制器
 */
class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  /**
   * 注册
   * POST /api/auth/register
   * Body: { phone, password, nickname }
   */
  async register(req, res) {
    try {
      const { phone, password, nickname } = req.body;

      if (!phone || !password || !nickname) {
        return res.json({ code: 1, message: '手机号、密码和昵称不能为空' });
      }

      if (!/^1\d{10}$/.test(phone)) {
        return res.json({ code: 1, message: '手机号格式不正确' });
      }

      if (password.length < 6) {
        return res.json({ code: 1, message: '密码长度不能少于6位' });
      }

      const result = await this.authService.register(phone, password, nickname);
      res.json({ code: 0, data: result, message: '注册成功' });
    } catch (err) {
      res.json({ code: 1, message: err.message || '注册失败' });
    }
  }

  /**
   * 登录
   * POST /api/auth/login
   * Body: { phone, password }
   */
  async login(req, res) {
    try {
      const { phone, password } = req.body;

      if (!phone || !password) {
        return res.json({ code: 1, message: '手机号和密码不能为空' });
      }

      const result = await this.authService.login(phone, password);
      res.json({ code: 0, data: result, message: '登录成功' });
    } catch (err) {
      res.json({ code: 1, message: err.message || '登录失败' });
    }
  }

  /**
   * 获取用户信息
   * GET /api/auth/profile
   */
  getProfile(req, res) {
    try {
      const user = this.authService.getProfile(req.userId);
      res.json({ code: 0, data: user });
    } catch (err) {
      res.json({ code: 1, message: err.message || '获取用户信息失败' });
    }
  }

  /**
   * 忘记密码
   * POST /api/auth/forgot-password
   * Body: { phone, newPassword }
   */
  async forgotPassword(req, res) {
    try {
      const { phone, newPassword } = req.body;

      if (!phone || !newPassword) {
        return res.json({ code: 1, message: '手机号和新密码不能为空' });
      }

      if (!/^1\d{10}$/.test(phone)) {
        return res.json({ code: 1, message: '手机号格式不正确' });
      }

      const result = await this.authService.forgotPassword(phone, newPassword);
      res.json({ code: 0, data: result, message: '密码重置成功' });
    } catch (err) {
      res.json({ code: 1, message: err.message || '密码重置失败' });
    }
  }

  /**
   * 修改密码
   * POST /api/auth/change-password
   * Body: { oldPassword, newPassword }
   */
  async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.json({ code: 1, message: '旧密码和新密码不能为空' });
      }

      const result = await this.authService.changePassword(req.userId, oldPassword, newPassword);
      res.json({ code: 0, data: result, message: '密码修改成功' });
    } catch (err) {
      res.json({ code: 1, message: err.message || '密码修改失败' });
    }
  }
}

module.exports = AuthController;