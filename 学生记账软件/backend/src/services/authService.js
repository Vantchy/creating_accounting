const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

class AuthService {
  constructor(userModel) {
    this.userModel = userModel;
  }

  /**
   * 注册
   */
  async register(phone, password, nickname) {
    // 检查手机号是否已注册
    const existing = this.userModel.findByPhone(phone);
    if (existing) {
      throw new Error('该手机号已注册');
    }

    // 密码加密
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    // 创建用户
    const user = this.userModel.create({ phone, nickname, passwordHash });
    return { id: user.id, phone: user.phone, nickname: user.nickname };
  }

  /**
   * 登录
   */
  async login(phone, password) {
    const user = this.userModel.findByPhone(phone);
    if (!user) {
      throw new Error('手机号或密码错误');
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      throw new Error('手机号或密码错误');
    }

    // 生成 JWT token
    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        monthly_income: user.monthly_income,
        allowance_day: user.allowance_day
      }
    };
  }

  /**
   * 获取用户信息
   */
  getProfile(userId) {
    const user = this.userModel.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }
    return {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      monthly_income: user.monthly_income,
      allowance_day: user.allowance_day,
      created_at: user.created_at
    };
  }

  /**
   * 忘记密码（通过手机号重置）
   */
  async forgotPassword(phone, newPassword) {
    const user = this.userModel.findByPhone(phone);
    if (!user) {
      throw new Error('该手机号未注册');
    }

    if (newPassword.length < 6) {
      throw new Error('密码长度不能少于6位');
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(newPassword, salt);
    this.userModel.updatePassword(user.id, passwordHash);
    return { message: '密码重置成功' };
  }

  /**
   * 修改密码（需验证旧密码）
   */
  async changePassword(userId, oldPassword, newPassword) {
    const user = this.userModel.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    const isMatch = bcrypt.compareSync(oldPassword, user.password_hash);
    if (!isMatch) {
      throw new Error('旧密码错误');
    }

    if (newPassword.length < 6) {
      throw new Error('新密码长度不能少于6位');
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(newPassword, salt);
    this.userModel.updatePassword(userId, passwordHash);
    return { message: '密码修改成功' };
  }
}

module.exports = AuthService;