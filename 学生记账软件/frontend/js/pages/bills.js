/**
 * 账单列表页面
 * 支持筛选、按日期分组、分页加载更多
 */

(function () {
  // 筛选状态
  var filterState = {
    dateRange: 'month', // 'today' | 'week' | 'month' | 'custom'
    startDate: '',
    endDate: '',
    categoryId: '',
    type: '', // '' | 'income' | 'expense'
    page: 1,
    limit: 20
  };

  // 当前加载中的状态
  var isLoading = false;
  var hasMore = true;

  /**
   * 渲染账单列表页面
   */
  async function renderBills(container) {
    // 重置筛选状态
    filterState.page = 1;
    hasMore = true;
    isLoading = false;

    // 加载分类数据
    await loadCategories();

    container.innerHTML =
      '<h1 class="page-title">账单</h1>' +
      // 筛选栏
      '<div class="filter-bar" id="date-filter">' +
        '<button class="filter-btn" data-range="today">今天</button>' +
        '<button class="filter-btn" data-range="week">本周</button>' +
        '<button class="filter-btn active" data-range="month">本月</button>' +
      '</div>' +
      '<div class="filter-bar">' +
        '<select class="form-select" id="filter-category" style="width:auto;min-width:100px;">' +
          '<option value="">全部分类</option>' +
          (AppState.categories.length > 0
            ? AppState.categories.map(function (c) { return '<option value="' + c.id + '">' + c.name + '</option>'; }).join('')
            : ''
          ) +
        '</select>' +
        '<select class="form-select" id="filter-type" style="width:auto;min-width:100px;">' +
          '<option value="">全部类型</option>' +
          '<option value="expense">支出</option>' +
          '<option value="income">收入</option>' +
        '</select>' +
      '</div>' +
      // 账单列表
      '<div id="bills-list"></div>' +
      // 加载更多
      '<div class="load-more" id="load-more">' +
        '<button class="btn" id="load-more-btn">加载更多</button>' +
      '</div>';

    // 绑定日期筛选事件
    container.querySelectorAll('#date-filter .filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        container.querySelectorAll('#date-filter .filter-btn').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        filterState.dateRange = this.getAttribute('data-range');
        filterState.page = 1;
        hasMore = true;
        loadBillsList();
      });
    });

    // 绑定分类筛选
    document.getElementById('filter-category').addEventListener('change', function () {
      filterState.categoryId = this.value;
      filterState.page = 1;
      hasMore = true;
      loadBillsList();
    });

    // 绑定类型筛选
    document.getElementById('filter-type').addEventListener('change', function () {
      filterState.type = this.value;
      filterState.page = 1;
      hasMore = true;
      loadBillsList();
    });

    // 绑定加载更多
    document.getElementById('load-more-btn').addEventListener('click', function () {
      if (!isLoading && hasMore) {
        filterState.page++;
        loadBillsList(true);
      }
    });

    // 初始加载
    await loadBillsList();
  }

  /**
   * 获取筛选日期范围
   */
  function getDateRange() {
    switch (filterState.dateRange) {
      case 'today':
        return { startDate: getToday(), endDate: getToday() };
      case 'week':
        return getWeekRange();
      case 'month':
        return { startDate: getMonthStart(), endDate: getMonthEnd() };
      default:
        return { startDate: filterState.startDate, endDate: filterState.endDate };
    }
  }

  /**
   * 加载账单列表
   * @param {boolean} append - 是否追加模式
   */
  async function loadBillsList(append) {
    if (isLoading) return;
    isLoading = true;

    var listContainer = document.getElementById('bills-list');
    var loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.textContent = '加载中...';
      loadMoreBtn.disabled = true;
    }

    var dateRange = getDateRange();

    try {
      var res = await get('/transactions', {
        page: filterState.page,
        limit: filterState.limit,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        categoryId: filterState.categoryId || undefined,
        type: filterState.type || undefined
      });

      var data = res.data || {};
      var list = data.list || [];
      var total = data.total || 0;

      // 判断是否还有更多
      hasMore = filterState.page * filterState.limit < total;

      if (list.length === 0 && filterState.page === 1) {
        listContainer.innerHTML = '<div class="empty-state"><span class="empty-icon">-</span><span class="empty-text">暂无账单记录</span></div>';
        document.getElementById('load-more').classList.add('hidden');
        isLoading = false;
        return;
      }

      // 按日期分组
      var grouped = groupByDate(list);

      var html = '';
      if (!append) {
        html = '';
      } else {
        html = listContainer.innerHTML;
      }

      for (var dateStr in grouped) {
        var items = grouped[dateStr];
        // 检查这个日期组是否已经渲染过
        if (append && listContainer.querySelector('[data-date="' + dateStr + '"]')) {
          continue;
        }
        html += '<div class="date-group-title" data-date="' + dateStr + '">' + formatDateRelative(dateStr) + '</div>';
        html += items.map(function (t) {
          var catName = getCategoryName(t.category_id);
          var accName = getAccountName(t.account_id);
          var amountClass = t.type === 'income' ? 'amount-income' : 'amount-expense';
          var sign = t.type === 'income' ? '+' : '-';
          return '<div class="list-item" data-id="' + t.id + '">' +
            '<div class="item-left">' +
              '<div class="item-title">' + catName + '</div>' +
              '<div class="item-sub">' + (t.note || '') + ' · ' + accName + ' · ' + formatTime(t.created_at) + '</div>' +
            '</div>' +
            '<div class="item-right" style="display:flex;align-items:center;gap:8px;">' +
              '<span class="' + amountClass + '">' + sign + '¥' + Math.abs(t.amount).toFixed(2) + '</span>' +
              '<button class="btn-icon btn-delete" data-id="' + t.id + '" title="删除">×</button>' +
            '</div>' +
          '</div>';
        }).join('');
      }

      listContainer.innerHTML = html;

      // 绑定删除事件
      listContainer.querySelectorAll('.btn-delete').forEach(function (btn) {
        btn.addEventListener('click', async function (e) {
          e.stopPropagation();
          var id = this.getAttribute('data-id');
          await handleDelete(id);
        });
      });

      // 显示/隐藏加载更多按钮
      var loadMoreEl = document.getElementById('load-more');
      if (hasMore) {
        loadMoreEl.classList.remove('hidden');
      } else {
        loadMoreEl.classList.add('hidden');
      }
    } catch (err) {
      if (filterState.page === 1) {
        listContainer.innerHTML = '<div class="empty-state"><span class="empty-icon">!</span><span class="empty-text">加载失败: ' + err.message + '</span></div>';
      }
    } finally {
      isLoading = false;
      if (loadMoreBtn) {
        loadMoreBtn.textContent = '加载更多';
        loadMoreBtn.disabled = false;
      }
    }
  }

  /**
   * 按日期分组
   * @param {Array} list - 交易列表
   * @returns {object} 分组后的对象
   */
  function groupByDate(list) {
    var groups = {};
    list.forEach(function (item) {
      var dateKey = formatDate(item.date);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });
    return groups;
  }

  /**
   * 处理删除交易
   * @param {number} id - 交易ID
   */
  async function handleDelete(id) {
    var confirmed = await confirmDialog('确定要删除这笔记录吗？');
    if (!confirmed) return;

    try {
      await del('/transactions/' + id);
      showToast('删除成功', 'success');
      // 重新加载列表
      filterState.page = 1;
      hasMore = true;
      await loadBillsList();
    } catch (err) {
      showToast(err.message || '删除失败', 'error');
    }
  }

  // 注册页面
  registerPage('bills', renderBills);
})();