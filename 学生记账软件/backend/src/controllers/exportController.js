/**
 * 导出控制器
 */
class ExportController {
  constructor(exportService) {
    this.exportService = exportService;
  }

  /**
   * 导出 CSV
   * GET /api/export/csv?startDate=2024-01-01&endDate=2024-12-31
   */
  exportCSV(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.json({ code: 1, message: '起始日期和结束日期不能为空' });
      }

      const csv = this.exportService.exportCSV(req.userId, startDate, endDate);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=transactions_${startDate}_${endDate}.csv`);
      // 添加 BOM 以便 Excel 正确识别 UTF-8
      res.send('\ufeff' + csv);
    } catch (err) {
      res.json({ code: 1, message: err.message || '导出失败' });
    }
  }
}

module.exports = ExportController;