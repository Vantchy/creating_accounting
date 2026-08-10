const { v4: uuidv4 } = require('uuid');

/**
 * 生成 UUID
 */
function generateUUID() {
  return uuidv4();
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm:ss
 */
function formatDateTime(date) {
  const d = new Date(date);
  const dateStr = formatDate(d);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}:${seconds}`;
}

/**
 * 获取当前月份的第一天
 */
function getMonthStart(year, month) {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

/**
 * 获取当前月份的最后一天
 */
function getMonthEnd(year, month) {
  const date = new Date(year, month, 0);
  return formatDate(date);
}

module.exports = {
  generateUUID,
  formatDate,
  formatDateTime,
  getMonthStart,
  getMonthEnd
};