/**
 * 分类控制器
 */
class CategoryController {
  constructor(categoryModel) {
    this.categoryModel = categoryModel;
  }

  /**
   * 获取分类列表
   * GET /api/categories?type=expense|income
   */
  list(req, res) {
    try {
      const userId = req.userId;
      const { type } = req.query;

      let categories;
      if (type) {
        categories = this.categoryModel.listByType(userId, type);
      } else {
        categories = this.categoryModel.list(userId);
      }

      res.json({ code: 0, data: categories, message: 'ok' });
    } catch (err) {
      console.error('获取分类失败:', err);
      res.status(500).json({ code: 1, message: '服务器错误' });
    }
  }
}

module.exports = CategoryController;