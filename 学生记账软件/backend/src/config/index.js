const path = require('path');

// 数据库路径：项目根目录下的 database/data.db
const DB_PATH = path.join(__dirname, '..', '..', 'database', 'data.db');

const JWT_SECRET = 'campus_accounting_jwt_secret_key_2024';

const PORT = 3000;

module.exports = {
  DB_PATH,
  JWT_SECRET,
  PORT
};