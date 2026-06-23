// Chrome 扩展 Service Worker — 注册侧边栏
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => {})
