/**
 * 数据库工具 - sql.js 轻量封装，提供类似 better-sqlite3 的 API
 * 暴露 db 对象，包含 prepare(), exec(), transaction() 方法
 */
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { DB_PATH } = require('../config');

let _db = null; // 原始 sql.js 数据库实例
let _inTransaction = false; // 事务中标记，防止 export() 干扰事务

const db = {
  /**
   * 准备 SQL 语句
   * 返回 { get, all, run } 三个方法
   */
  prepare(sql) {
    return {
      get(...params) {
        const stmt = _db.prepare(sql);
        if (params.length > 0) stmt.bind(params);
        let result = null;
        if (stmt.step()) result = stmt.getAsObject();
        stmt.free();
        return result;
      },
      all(...params) {
        const stmt = _db.prepare(sql);
        if (params.length > 0) stmt.bind(params);
        const results = [];
        while (stmt.step()) results.push(stmt.getAsObject());
        stmt.free();
        return results;
      },
      run(...params) {
        _db.run(sql, params);
        const changes = _db.getRowsModified(); // 必须在其他操作前捕获
        if (!_inTransaction) _save();
        const idResult = _db.exec('SELECT last_insert_rowid() as id');
        const lastInsertRowid = idResult.length > 0 && idResult[0].values.length > 0
          ? idResult[0].values[0][0] : 0;
        return { changes, lastInsertRowid };
      }
    };
  },

  /**
   * 直接执行 SQL（DDL，无参数）
   */
  exec(sql) {
    _db.run(sql);
    if (!_inTransaction) _save();
  },

  /**
   * 事务包装
   */
  transaction(callback) {
    _inTransaction = true;
    _db.run('BEGIN');
    try {
      callback();
      _db.run('COMMIT');
    } catch (e) {
      try { _db.run('ROLLBACK'); } catch (_) { /* 忽略回滚错误 */ }
      throw e;
    } finally {
      _inTransaction = false;
    }
    _save(); // 事务结束后统一保存
  }
};

function _save() {
  if (!_db) return;
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

/**
 * 初始化数据库（在 app.js 启动时调用）
 */
async function initDatabase() {
  const SQL = await initSqlJs();
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  if (fs.existsSync(DB_PATH)) {
    _db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    _db = new SQL.Database();
  }
  _db.run('PRAGMA foreign_keys = ON');
  return db;
}

module.exports = { initDatabase, db };