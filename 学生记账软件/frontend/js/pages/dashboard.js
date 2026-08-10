/**
 * 数据看板页面
 * 月度概览、分类支出排行、近6个月收支趋势
 */

(function () {
  // 当前查看的年份和月份
  var viewYear = getCurrentYear();
  var viewMonth = getCurrentMonth();

  /**
   * 渲染数据看板
   */
  async function renderDashboard(container) {
    container.innerHTML =
      '<h1 class="page-title">数据看板</h1>' +
      // 月份切换
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">' +
        '<button class="btn btn-sm" id="prev-month">‹ 上月</button>' +
        '<span style="font-size:16px;font-weight:500;" id="month-display">' + viewYear + '年' + viewMonth + '月</span>' +
        '<button class="btn btn-sm" id="next-month">下月 ›</button>' +
      '</div>' +
      // 月度概览
      '<div class="overview-numbers" id="monthly-overview">' +
        '<div class="overview-item">' +
          '<div class="label">月收入</div>' +
          '<div class="number income" id="month-income">¥0.00</div>' +
        '</div>' +
        '<div class="overview-item">' +
          '<div class="label">月支出</div>' +
          '<div class="number expense" id="month-expense">¥0.00</div>' +
        '</div>' +
        '<div class="overview-item">' +
          '<div class="label">月结余</div>' +
          '<div class="number" id="month-balance">¥0.00</div>' +
        '</div>' +
      '</div>' +
      // 分类支出排行
      '<div class="card">' +
        '<div class="card-title">分类支出排行</div>' +
        '<div class="chart-container" id="category-chart"></div>' +
      '</div>' +
      // 月度趋势
      '<div class="card">' +
        '<div class="card-title">月度收支趋势</div>' +
        '<div class="chart-container">' +
          '<canvas id="trend-chart" width="600" height="300"></canvas>' +
        '</div>' +
      '</div>';

    // 绑定月份切换事件
    document.getElementById('prev-month').addEventListener('click', function () {
      viewMonth--;
      if (viewMonth < 1) {
        viewMonth = 12;
        viewYear--;
      }
      updateMonthDisplay();
      loadDashboardData();
    });

    document.getElementById('next-month').addEventListener('click', function () {
      viewMonth++;
      if (viewMonth > 12) {
        viewMonth = 1;
        viewYear++;
      }
      updateMonthDisplay();
      loadDashboardData();
    });

    // 加载数据
    await loadDashboardData();
  }

  /**
   * 更新月份显示
   */
  function updateMonthDisplay() {
    var display = document.getElementById('month-display');
    if (display) {
      display.textContent = viewYear + '年' + viewMonth + '月';
    }
  }

  /**
   * 加载看板数据
   */
  async function loadDashboardData() {
    await Promise.all([
      loadMonthlyOverview(),
      loadCategoryChart(),
      loadTrendChart()
    ]);
  }

  /**
   * 加载月度概览
   */
  async function loadMonthlyOverview() {
    try {
      var res = await get('/statistics/monthly', { year: viewYear, month: viewMonth });
      var data = res.data || {};
      document.getElementById('month-income').textContent = '¥' + (data.income || 0).toFixed(2);
      document.getElementById('month-expense').textContent = '¥' + (data.expense || 0).toFixed(2);
      document.getElementById('month-balance').textContent = '¥' + ((data.income || 0) - (data.expense || 0)).toFixed(2);
    } catch (err) {
      console.warn('加载月度概览失败:', err);
    }
  }

  /**
   * 加载分类支出图表
   */
  async function loadCategoryChart() {
    var container = document.getElementById('category-chart');
    if (!container) return;

    try {
      var res = await get('/statistics/category', { year: viewYear, month: viewMonth });
      var data = res.data || [];

      if (data.length === 0) {
        container.innerHTML = '<div class="empty-state"><span class="empty-text">暂无数据</span></div>';
        return;
      }

      var maxAmount = Math.max.apply(null, data.map(function (d) { return d.amount || 0; }));

      container.innerHTML = data.map(function (item) {
        var percentage = maxAmount > 0 ? ((item.amount / maxAmount) * 100) : 0;
        return '<div class="chart-bar-row">' +
          '<div class="chart-bar-label">' + (item.category || '未分类') + '</div>' +
          '<div class="chart-bar-track">' +
            '<div class="chart-bar-fill" style="width:' + percentage + '%;"></div>' +
          '</div>' +
          '<div class="chart-bar-value">¥' + (item.amount || 0).toFixed(0) + '</div>' +
        '</div>';
      }).join('');
    } catch (err) {
      container.innerHTML = '<div class="empty-state"><span class="empty-text">加载失败</span></div>';
    }
  }

  /**
   * 加载月度趋势图（canvas 手绘折线图）
   */
  async function loadTrendChart() {
    var canvas = document.getElementById('trend-chart');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');

    // 固定画布尺寸（仅在首次设置）
    var baseWidth = 600;
    var baseHeight = 300;
    var dpr = window.devicePixelRatio || 1;
    if (canvas.width !== baseWidth * dpr) {
      canvas.width = baseWidth * dpr;
      canvas.height = baseHeight * dpr;
      canvas.style.width = baseWidth + 'px';
      canvas.style.height = baseHeight + 'px';
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 清除画布
    ctx.clearRect(0, 0, baseWidth, baseHeight);
    var width = baseWidth;
    var height = baseHeight;

    try {
      var res = await get('/statistics/trend', { months: 6 });
      var data = res.data || [];

      if (data.length === 0) {
        ctx.fillStyle = '#CCCCCC';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', width / 2, height / 2);
        return;
      }

      // 图表边距
      var padding = { top: 20, right: 20, bottom: 30, left: 50 };
      var chartWidth = width - padding.left - padding.right;
      var chartHeight = height - padding.top - padding.bottom;

      // 计算最大值
      var allValues = [];
      data.forEach(function (d) {
        allValues.push(d.income || 0);
        allValues.push(d.expense || 0);
      });
      var maxVal = Math.max.apply(null, allValues) || 1;
      // 让最大值向上取整到合适的刻度
      var scaleMax = Math.ceil(maxVal / 1000) * 1000 || 1000;

      // 绘制网格线和刻度
      ctx.strokeStyle = '#F0F0F0';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#999999';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';

      var gridLines = 4;
      for (var i = 0; i <= gridLines; i++) {
        var y = padding.top + (chartHeight / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        var val = scaleMax - (scaleMax / gridLines) * i;
        ctx.fillText('¥' + val.toFixed(0), padding.left - 5, y + 4);
      }

      // 绘制数据
      if (data.length < 2) return;

      var stepX = chartWidth / (data.length - 1);

      // 绘制收入折线
      ctx.strokeStyle = '#27AE60';
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.forEach(function (d, i) {
        var x = padding.left + stepX * i;
        var y = padding.top + chartHeight - (d.income || 0) / scaleMax * chartHeight;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // 绘制支出折线
      ctx.strokeStyle = '#E74C3C';
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.forEach(function (d, i) {
        var x = padding.left + stepX * i;
        var y = padding.top + chartHeight - (d.expense || 0) / scaleMax * chartHeight;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // 绘制数据点和标签
      data.forEach(function (d, i) {
        var x = padding.left + stepX * i;

        // 收入点
        var incomeY = padding.top + chartHeight - (d.income || 0) / scaleMax * chartHeight;
        ctx.fillStyle = '#27AE60';
        ctx.beginPath();
        ctx.arc(x, incomeY, 3, 0, Math.PI * 2);
        ctx.fill();

        // 支出点
        var expenseY = padding.top + chartHeight - (d.expense || 0) / scaleMax * chartHeight;
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.arc(x, expenseY, 3, 0, Math.PI * 2);
        ctx.fill();

        // X 轴标签
        ctx.fillStyle = '#999999';
        ctx.textAlign = 'center';
        var label = d.month || '';
        // 如果月份格式是 "2024-01"，只显示 "01月"
        if (label.indexOf('-') !== -1) {
          label = label.split('-')[1] + '月';
        }
        ctx.fillText(label, x, height - padding.bottom + 18);
      });

      // 图例
      ctx.fillStyle = '#27AE60';
      ctx.fillRect(width - 120, 5, 10, 10);
      ctx.fillStyle = '#333333';
      ctx.textAlign = 'left';
      ctx.font = '12px sans-serif';
      ctx.fillText('收入', width - 105, 14);

      ctx.fillStyle = '#E74C3C';
      ctx.fillRect(width - 60, 5, 10, 10);
      ctx.fillStyle = '#333333';
      ctx.fillText('支出', width - 45, 14);

    } catch (err) {
      ctx.fillStyle = '#CCCCCC';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('加载失败', width / 2, height / 2);
    }
  }

  // 注册页面
  registerPage('dashboard', renderDashboard);
})();