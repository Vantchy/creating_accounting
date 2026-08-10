/**
 * API 请求封装模块
 * 基于 fetch 封装，自动携带 JWT token，统一错误处理
 */

// API 基础 URL
var BASE_URL = 'http://localhost:3000/api';

/**
 * 获取存储的 token
 * @returns {string|null}
 */
function getToken() {
  return localStorage.getItem('token');
}

/**
 * 设置 token
 * @param {string} token
 */
function setToken(token) {
  localStorage.setItem('token', token);
}

/**
 * 清除 token
 */
function clearToken() {
  localStorage.removeItem('token');
}

/**
 * 检查是否已登录
 * @returns {boolean}
 */
function isLoggedIn() {
  return !!getToken();
}

/**
 * 统一请求方法
 * @param {string} method - 请求方法：GET, POST, PUT, DELETE
 * @param {string} path - 接口路径，如 '/auth/login'
 * @param {object} body - 请求体（可选）
 * @returns {Promise<object>} 响应数据
 */
async function request(method, path, body) {
  var url = BASE_URL + path;
  var options = {
    method: method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  // 自动携带 token
  var token = getToken();
  if (token) {
    options.headers['Authorization'] = 'Bearer ' + token;
  }

  // 设置请求体
  if (body !== undefined && body !== null) {
    options.body = JSON.stringify(body);
  }

  try {
    var response = await fetch(url, options);

    // 处理 401 未授权 - 跳转到登录页
    if (response.status === 401) {
      clearToken();
      window.location.hash = '#/auth';
      throw new Error('登录已过期，请重新登录');
    }

    // 处理 204 No Content（如 DELETE 请求）
    if (response.status === 204) {
      return { code: 0, data: null, message: 'ok' };
    }

    var result = await response.json();

    // 业务错误处理
    if (result.code !== 0) {
      throw new Error(result.message || '请求失败');
    }

    return result;
  } catch (err) {
    // 网络错误处理
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      throw new Error('网络连接失败，请检查服务器是否运行');
    }
    throw err;
  }
}

/**
 * GET 请求
 * @param {string} path - 接口路径
 * @param {object} params - 查询参数（可选）
 * @returns {Promise<object>}
 */
async function get(path, params) {
  var queryString = '';
  if (params) {
    var parts = [];
    for (var key in params) {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
      }
    }
    if (parts.length > 0) {
      queryString = '?' + parts.join('&');
    }
  }
  return request('GET', path + queryString);
}

/**
 * POST 请求
 * @param {string} path - 接口路径
 * @param {object} body - 请求体
 * @returns {Promise<object>}
 */
function post(path, body) {
  return request('POST', path, body);
}

/**
 * PUT 请求
 * @param {string} path - 接口路径
 * @param {object} body - 请求体
 * @returns {Promise<object>}
 */
function put(path, body) {
  return request('PUT', path, body);
}

/**
 * DELETE 请求
 * @param {string} path - 接口路径
 * @returns {Promise<object>}
 */
function del(path) {
  return request('DELETE', path);
}