/**
 * 工具函数模块
 * 提供格式化金额、日期等常用工具函数
 */

/**
 * 格式化金额
 * @param {number} amount - 金额数值
 * @param {string} type - 类型：'income' 或 'expense'
 * @returns {string} 格式化后的金额字符串
 */
function formatMoney(amount, type) {
  const num = Math.abs(Number(amount) || 0);
  const formatted = num.toFixed(2);
  if (type === 'income') {
    return '+¥' + formatted;
  } else if (type === 'expense') {
    return '-¥' + formatted;
  }
  return '¥' + formatted;
}

/**
 * 格式化金额（不带正负号）
 * @param {number} amount - 金额数值
 * @returns {string} 格式化后的金额字符串
 */
function formatAmount(amount) {
  const num = Number(amount) || 0;
  return '¥' + num.toFixed(2);
}

/**
 * 格式化日期为本地字符串
 * @param {string|Date} date - 日期
 * @returns {string} 格式化后的日期字符串 YYYY-MM-DD
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

/**
 * 格式化日期为中文显示
 * @param {string|Date} date - 日期
 * @returns {string} 格式化后的日期字符串，如 2024年1月1日
 */
function formatDateCN(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return year + '年' + month + '月' + day + '日';
}

/**
 * 格式化日期为相对描述（今天/昨天/日期）
 * @param {string|Date} date - 日期
 * @returns {string} 相对描述
 */
function formatDateRelative(date) {
  if (!date) return '';
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (formatDate(d) === formatDate(today)) {
    return '今天';
  }
  if (formatDate(d) === formatDate(yesterday)) {
    return '昨天';
  }
  return formatDateCN(d);
}

/**
 * 格式化时间（包含时分）
 * @param {string|Date} date - 日期
 * @returns {string} 格式化后的时间字符串 HH:mm
 */
function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return hours + ':' + minutes;
}

/**
 * 格式化日期时间
 * @param {string|Date} date - 日期
 * @returns {string} 格式化后的日期时间字符串 YYYY-MM-DD HH:mm
 */
function formatDateTime(date) {
  if (!date) return '';
  return formatDate(date) + ' ' + formatTime(date);
}

/**
 * 获取当前月份的第一天
 * @param {number} year - 年份，默认当前年
 * @param {number} month - 月份，默认当前月
 * @returns {string} YYYY-MM-DD
 */
function getMonthStart(year, month) {
  const now = new Date();
  const y = year || now.getFullYear();
  const m = month || (now.getMonth() + 1);
  return y + '-' + String(m).padStart(2, '0') + '-01';
}

/**
 * 获取当前月份的最后一天
 * @param {number} year - 年份，默认当前年
 * @param {number} month - 月份，默认当前月
 * @returns {string} YYYY-MM-DD
 */
function getMonthEnd(year, month) {
  const now = new Date();
  const y = year || now.getFullYear();
  const m = month || (now.getMonth() + 1);
  const lastDay = new Date(y, m, 0).getDate();
  return y + '-' + String(m).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0');
}

/**
 * 获取本周的日期范围
 * @returns {{ start: string, end: string }} 本周起始和结束日期
 */
function getWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay() || 7; // 周日=7
  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek + 1);
  const end = new Date(now);
  end.setDate(start.getDate() + 6);
  return {
    start: formatDate(start),
    end: formatDate(end)
  };
}

/**
 * 获取今天的日期字符串
 * @returns {string} YYYY-MM-DD
 */
function getToday() {
  return formatDate(new Date());
}

/**
 * 获取当前月份
 * @returns {number} 当前月份（1-12）
 */
function getCurrentMonth() {
  return new Date().getMonth() + 1;
}

/**
 * 获取当前年份
 * @returns {number} 当前年份
 */
function getCurrentYear() {
  return new Date().getFullYear();
}

/**
 * 获取月份名称
 * @param {number} month - 月份（1-12）
 * @returns {string} 月份名称
 */
function getMonthName(month) {
  const names = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  return names[month - 1] || '';
}

/**
 * 显示消息提示
 * @param {string} message - 消息内容
 * @param {string} type - 类型：'success' | 'error' | 'info'
 */
function showToast(message, type) {
  // 移除已有的 toast
  const existing = document.getElementById('toast');
  if (existing) {
    existing.remove();
  }

  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.className = 'toast' + (type === 'error' ? ' error' : '') + (type === 'success' ? ' success' : '');
  toast.textContent = message;
  document.body.appendChild(toast);

  // 触发动画
  requestAnimationFrame(function () {
    toast.classList.add('show');
  });

  // 3秒后自动消失
  setTimeout(function () {
    toast.classList.remove('show');
    setTimeout(function () {
      toast.remove();
    }, 300);
  }, 3000);
}

/**
 * 显示确认对话框
 * @param {string} message - 确认消息
 * @returns {Promise<boolean>} 用户是否确认
 */
function confirmDialog(message) {
  return new Promise(function (resolve) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.style.display = 'flex';
    overlay.innerHTML =
      '<div class="modal">' +
        '<div class="modal-title">确认操作</div>' +
        '<p style="font-size:14px;color:#666;margin-bottom:20px;">' + message + '</p>' +
        '<div class="modal-footer">' +
          '<button class="btn" id="confirm-cancel">取消</button>' +
          '<button class="btn btn-primary" id="confirm-ok">确认</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    document.getElementById('confirm-cancel').addEventListener('click', function () {
      overlay.remove();
      resolve(false);
    });
    document.getElementById('confirm-ok').addEventListener('click', function () {
      overlay.remove();
      resolve(true);
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        overlay.remove();
        resolve(false);
      }
    });
  });
}

/**
 * 格式化日期为输入框默认值
 * @param {Date} date - 日期对象
 * @returns {string} YYYY-MM-DD
 */
function toDateInputValue(date) {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

/**
 * CSV 转义
 * @param {string} str - 需要转义的字符串
 * @returns {string} 转义后的字符串
 */
function escapeCSV(str) {
  if (str === null || str === undefined) return '';
  var s = String(str);
  if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * 下载文件
 * @param {string} content - 文件内容
 * @param {string} filename - 文件名
 * @param {string} mimeType - MIME 类型
 */
function downloadFile(content, filename, mimeType) {
  var blob = new Blob([content], { type: mimeType || 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}