class ExportService {
  constructor(transactionModel) {
    this.transactionModel = transactionModel;
  }

  /**
   * 导出 CSV 格式
   */
  exportCSV(userId, startDate, endDate) {
    // 使用 JOIN 查询分类名称和账户名称
    const sql = `
      SELECT t.*, c.name as category_name, a.name as account_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.user_id = ?
      AND t.date >= ? AND t.date <= ?
      ORDER BY t.date DESC, t.created_at DESC
    `;
    const rows = this.transactionModel.db.prepare(sql).all(userId, startDate, endDate);

    // CSV 头部
    const headers = ['日期', '类型', '金额', '分类', '账户', '备注'];
    const csvRows = [headers.join(',')];

    let totalIncome = 0;
    let totalExpense = 0;

    for (const row of rows) {
      const type = row.type === 'income' ? '收入' : '支出';
      const amount = parseFloat(row.amount) || 0;
      if (row.type === 'income') totalIncome += amount;
      else totalExpense += amount;

      const csvRow = [
        row.date,
        type,
        amount.toFixed(2),
        `"${row.category_name || '未分类'}"`,
        `"${row.account_name || '未知账户'}"`,
        `"${(row.note || '无').replace(/"/g, '""')}"`
      ];
      csvRows.push(csvRow.join(','));
    }

    // 汇总行
    const netAmount = totalIncome - totalExpense;
    csvRows.push('');
    csvRows.push(`"汇总",,,,,`);
    csvRows.push(`"收入总计","","${totalIncome.toFixed(2)}",,,,`);
    csvRows.push(`"支出总计","","${totalExpense.toFixed(2)}",,,,`);
    csvRows.push(`"净收入","","${netAmount.toFixed(2)}",,,,`);

    return csvRows.join('\n');
  }
}

module.exports = ExportService;