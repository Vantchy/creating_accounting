const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

/**
 * JWT 鉴权中间件
 * 从 Authorization header 解析 token，将 userId 挂到 req.userId
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.json({ code: 1, message: '未提供认证令牌' });
  }

  // 支持 Bearer token 格式
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  if (!token) {
    return res.json({ code: 1, message: '未提供认证令牌' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.json({ code: 1, message: '认证令牌已过期，请重新登录' });
    }
    return res.json({ code: 1, message: '无效的认证令牌' });
  }
}

module.exports = authMiddleware;