/**
 * SPA 应用主入口
 * 路由管理、全局状态、导航栏控制
 */

// ============================================
// 全局状态
// ============================================
var AppState = {
  user: null,       // 当前用户信息
  categories: [],   // 分类缓存
  accounts: []      // 账户缓存
};

// ============================================
// 路由配置
// ============================================
var routes = {
  '/auth': 'auth',
  '/home': 'home',
  '/bills': 'bills',
  '/dashboard': 'dashboard',
  '/budget': 'budget',
  '/accounts': 'accounts',
  '/profile': 'profile'
};

// 默认路由
var defaultRoute = '/home';

// ============================================
// 页面加载函数映射
// ============================================
var pageLoaders = {};

/**
 * 注册页面加载函数
 * @param {string} name - 页面名称
 * @param {function} loader - 加载函数
 */
function registerPage(name, loader) {
  pageLoaders[name] = loader;
}

// ============================================
// 导航栏控制
// ============================================

/**
 * 高亮当前导航项
 * @param {string} page - 当前页面名称
 */
function highlightNav(page) {
  var items = document.querySelectorAll('.nav-item');
  items.forEach(function (item) {
    var route = item.getAttribute('data-route');
    if (route === page) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

/**
 * 显示/隐藏导航栏
 * @param {boolean} show - 是否显示
 */
function toggleNav(show) {
  var sidebar = document.querySelector('.sidebar');
  var mainContent = document.querySelector('.main-content');
  if (show) {
    sidebar.classList.remove('hidden');
    mainContent.classList.remove('auth-page');
  } else {
    sidebar.classList.add('hidden');
    // 登录页面不显示侧边栏，内容区占满全屏
    mainContent.classList.add('auth-page');
  }
}

// ============================================
// 路由处理
// ============================================

/**
 * 获取当前路由对应的页面名称
 * @returns {string} 页面名称
 */
function getCurrentPage() {
  var hash = window.location.hash || '#/home';
  var path = hash.slice(1); // 去掉 # 号
  // 支持带参数的路由
  var basePath = path.split('?')[0];
  return routes[basePath] || null;
}

/**
 * 路由跳转
 * @param {string} path - 路由路径，如 '/home'
 */
function navigateTo(path) {
  window.location.hash = '#' + path;
}

/**
 * 处理路由变化
 */
async function handleRoute() {
  var page = getCurrentPage();

  // 未登录且不是登录页，跳转到登录页
  if (!isLoggedIn() && page !== 'auth') {
    navigateTo('/auth');
    return;
  }

  // 已登录且是登录页，跳转到首页
  if (isLoggedIn() && page === 'auth') {
    navigateTo('/home');
    return;
  }

  // 显示/隐藏导航栏
  toggleNav(page !== 'auth');

  // 获取内容区
  var content = document.getElementById('page-content');

  // 加载页面
  if (page && pageLoaders[page]) {
    try {
      highlightNav(page);
      await pageLoaders[page](content);
    } catch (err) {
      console.error('页面加载失败:', err);
      content.innerHTML =
        '<div class="empty-state">' +
          '<span class="empty-icon">!</span>' +
          '<span class="empty-text">页面加载失败: ' + err.message + '</span>' +
        '</div>';
    }
  } else {
    // 未知路由，跳转到首页
    navigateTo(defaultRoute);
  }
}

// ============================================
// 初始化
// ============================================

/**
 * 初始化应用
 */
function initApp() {
  // 监听 hash 变化
  window.addEventListener('hashchange', handleRoute);

  // 监听页面加载事件
  window.addEventListener('load', function () {
    // 设置默认路由
    if (!window.location.hash) {
      window.location.hash = '#/home';
    }
    handleRoute();
  });

  // 注册导航栏点击事件
  document.addEventListener('click', function (e) {
    var navItem = e.target.closest('.nav-item');
    if (navItem) {
      var route = navItem.getAttribute('data-route');
      if (route) {
        navigateTo('/' + route);
      }
    }
  });
}

// ============================================
// 数据加载辅助函数
// ============================================

/**
 * 加载分类数据
 */
async function loadCategories() {
  try {
    var res = await get('/categories');
    AppState.categories = res.data || [];
    return AppState.categories;
  } catch (err) {
    console.warn('加载分类失败:', err);
    return [];
  }
}

/**
 * 加载账户数据
 */
async function loadAccounts() {
  try {
    var res = await get('/accounts');
    AppState.accounts = res.data || [];
    return AppState.accounts;
  } catch (err) {
    console.warn('加载账户失败:', err);
    return [];
  }
}

/**
 * 获取分类名称
 * @param {number} categoryId - 分类 ID
 * @returns {string} 分类名称
 */
function getCategoryName(categoryId) {
  var cat = AppState.categories.find(function (c) { return c.id === categoryId; });
  return cat ? cat.name : '未分类';
}

/**
 * 获取账户名称
 * @param {number} accountId - 账户 ID
 * @returns {string} 账户名称
 */
function getAccountName(accountId) {
  var acc = AppState.accounts.find(function (a) { return a.id === accountId; });
  return acc ? acc.name : '未知账户';
}

// 应用启动时初始化
initApp();