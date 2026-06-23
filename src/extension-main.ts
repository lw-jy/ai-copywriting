// Chrome 扩展入口 — 同 Vue 应用，注入扩展标识
import { createApp } from "vue"
import App from "./App.vue"
import "./style.css"

// 告诉应用当前运行在 Chrome 扩展环境
;(window as any).__IS_EXTENSION__ = true

createApp(App).mount("#app")
