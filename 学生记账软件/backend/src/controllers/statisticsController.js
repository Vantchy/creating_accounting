/**
 * 统计控制器
 */
class StatisticsController {
  constructor(statisticsService) {
    this.statisticsService = statisticsService;
  }

  /**
   * 月收入/支出/结余
   * GET /api/statistics/monthly-summary?year=2024&month=1
   */
  getMonthlySummary(req, res) {
    try {
      const year = parseInt(req.query.year) || new Date().getFullYear();
      const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
      const summary = this.statisticsService.getMonthlySummary(req.userId, year, month);
      res.json({ code: 0, data: summary });
    } catch (err) {
      res.json({ code: 1, message: err.message || '查询失败' });
    }
  }

  /**
   * 分类支出占比
   * GET /api/statistics/category-breakdown?year=2024&month=1
   */
  getCategoryBreakdown(req, res) {
    try {
      const year = parseInt(req.query.year) || new Date().getFullYear();
      const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
      const breakdown = this.statisticsService.getCategoryBreakdown(req.userId, year, month);
      res.json({ code: 0, data: breakdown });
    } catch (err) {
      res.json({ code: 1, message: err.message || '查询失败' });
    }
  }

  /**
   * 近N月趋势数据
   * GET /api/statistics/trend?months=6
   */
  getTrend(req, res) {
    try {
      const months = parseInt(req.query.months) || 6;
      const trend = this.statisticsService.getTrend(req.userId, months);
      res.json({ code: 0, data: trend });
    } catch (err) {
      res.json({ code: 1, message: err.message || '查询失败' });
    }
  }
}

module.exports = StatisticsController;