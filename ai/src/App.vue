<script setup lang="ts">
import { ref, reactive, onMounted, type Component } from "vue"
import {
  ShoppingCart, Video, Mail, Music, BookOpen,
  LayoutGrid, BookmarkCheck, LogOut, Settings,
} from "@lucide/vue"
import type { PlatformKey } from "./composables/useCopyMatrix"
import InputPanel from "./components/InputPanel.vue"
import OutputCard from "./components/OutputCard.vue"
import BookmarksPanel from "./components/BookmarksPanel.vue"
import LoginPage from "./components/LoginPage.vue"
import SettingsPage from "./components/SettingsPage.vue"
import { useCopyMatrix } from "./composables/useCopyMatrix"
import { useBookmarks } from "./composables/useBookmarks"
import { useAuth } from "./composables/useAuth"
import { useSettings } from "./composables/useSettings"

const isExt = () => !!(window as any).__IS_EXTENSION__

const form = reactive({
  productName: "",
  features: "",
  market: "us-en",
  tone: "passion",
  platforms: ["amazon", "social", "edm"] as PlatformKey[],
})

const platformConfig: Record<PlatformKey, {
  icon: Component; title: string; subtitle: string; badgeClass: string; accentClass: string
}> = {
  amazon:      { icon: ShoppingCart, title: "Amazon Listing",  subtitle: "标题 · 五点描述 · 搜索词",      badgeClass: "bg-[#FF9900]",   accentClass: "bg-amber-50 text-amber-700" },
  social:      { icon: Video,        title: "TikTok / Instagram", subtitle: "短视频带货脚本文案",            badgeClass: "bg-slate-900",  accentClass: "bg-slate-100 text-slate-700" },
  edm:         { icon: Mail,         title: "EDM 营销邮件",       subtitle: "主题行 · 正文 · CTA",          badgeClass: "bg-blue-600",   accentClass: "bg-blue-50 text-blue-700" },
  douyin:      { icon: Music,        title: "抖音",               subtitle: "短视频带货脚本文案",            badgeClass: "bg-[#1E1E1E]", accentClass: "bg-slate-100 text-slate-700" },
  xiaohongshu: { icon: BookOpen,     title: "小红书",             subtitle: "种草笔记 · 推荐文案",          badgeClass: "bg-[#FF2442]",  accentClass: "bg-red-50 text-red-600" },
}

const { loading, hasGenerated, content, status, generate } = useCopyMatrix()
const { user, isLoggedIn, initialized, init, logout, authHeader } = useAuth()
const { bookmarks, fetchAll } = useBookmarks(authHeader)
const { apiKey, baseUrl, model, loaded: settingsLoaded, load: loadSettings } = useSettings()
const showBookmarks = ref(false)
const showSettings = ref(false)

/** 当前登录会话是否已经跳过设置弹窗 */
function hasSkippedSettings(): boolean {
  return localStorage.getItem("copy-matrix-skip-settings") === "true"
}
function markSettingsSkipped() {
  localStorage.setItem("copy-matrix-skip-settings", "true")
}
function clearSettingsSkipped() {
  localStorage.removeItem("copy-matrix-skip-settings")
}

onMounted(async () => {
  await loadSettings()

  if (isExt()) {
    if (!apiKey.value) showSettings.value = true
    return
  }

  await init()
  if (isLoggedIn.value) {
    fetchAll()
    // 只有没 Key 且本次登录没跳过才弹
    if (!apiKey.value && !hasSkippedSettings()) showSettings.value = true
  }
})

function onLoginDone() {
  fetchAll()
  clearSettingsSkipped()
  if (!apiKey.value) showSettings.value = true
}

function onLogout() {
  clearSettingsSkipped()
  logout()
}

function onGenerate() {
  generate({
    ...form,
    apiKey: apiKey.value,
    baseUrl: baseUrl.value,
    model: model.value,
  })
}
</script>

<template>
  <!-- Web 模式没登录 → 登录页 -->
  <LoginPage v-if="!isExt() && (!initialized || !isLoggedIn)" @done="onLoginDone" />

  <!-- 扩展模式没 Key → 全屏设置页 -->
  <SettingsPage v-else-if="isExt() && !apiKey" @done="showSettings = false" />

  <!-- 主应用（Web 已登录 / 扩展已配 Key） -->
  <div v-else class="flex h-screen w-full flex-col bg-slate-50 lg:flex-row">
    <!-- 弹窗：没 Key 时提示配置 -->
    <SettingsPage v-if="!isExt() && showSettings && !apiKey" modal @done="showSettings = false" @skip="markSettingsSkipped(); showSettings = false" />
    <!-- 弹窗：有 Key 时手动打开设置 -->
    <SettingsPage v-if="!isExt() && showSettings && apiKey" modal @done="showSettings = false" @skip="showSettings = false" />

    <!-- Left: Input form (≈ 1/3) -->
    <div class="w-full lg:w-1/3 lg:max-w-md xl:max-w-lg">
      <InputPanel
        v-model:product-name="form.productName"
        v-model:features="form.features"
        v-model:market="form.market"
        v-model:tone="form.tone"
        v-model:platforms="form.platforms"
        :loading="loading"
        @generate="onGenerate"
      />
    </div>

    <!-- Right: Output matrix (≈ 2/3) -->
    <main class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header
        class="flex items-center justify-between gap-4 border-b border-slate-200 bg-white/60 px-6 py-5 backdrop-blur lg:px-8"
      >
        <div class="flex items-center gap-2.5">
          <LayoutGrid class="h-5 w-5 text-slate-400" />
          <h2 class="text-lg font-semibold tracking-tight text-slate-900">
            多平台营销矩阵文案
          </h2>
        </div>
        <span class="hidden text-xs text-slate-400 sm:block">
          实时流式生成 · 支持一键复制与收藏
        </span>
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="showSettings = true"
            class="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            title="API 设置"
          >
            <Settings class="h-3.5 w-3.5" />
            设置
          </button>
          <button
            type="button"
            @click="showBookmarks = !showBookmarks"
            class="relative flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <BookmarkCheck class="h-3.5 w-3.5" />
            收藏
            <span
              v-if="bookmarks.length > 0"
              class="flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] text-white"
            >
              {{ bookmarks.length }}
            </span>
          </button>
          <span class="hidden text-xs text-slate-400 md:block">{{ user?.username }}</span>
          <button
            type="button"
            @click="onLogout"
            class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            title="退出登录"
          >
            <LogOut class="h-4 w-4" />
          </button>
        </div>
      </header>

      <BookmarksPanel
        v-if="showBookmarks"
        :bookmarks="bookmarks"
        @close="showBookmarks = false"
        @refresh="fetchAll"
      />

      <div class="min-h-0 flex-1 overflow-y-auto p-6 lg:p-8">
        <div class="grid h-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <OutputCard
            v-for="p in form.platforms"
            :key="p"
            :icon="platformConfig[p].icon"
            :title="platformConfig[p].title"
            :subtitle="platformConfig[p].subtitle"
            :platform-key="p"
            :product-name="form.productName"
            :content="content[p]"
            :status="status[p]"
            :has-generated="hasGenerated"
            :bookmarks="bookmarks"
            :badge-class="platformConfig[p].badgeClass"
            :accent-class="platformConfig[p].accentClass"
            @edit="(v: string) => content[p] = v"
            @refresh="fetchAll"
          />
        </div>
      </div>
    </main>
  </div>
</template>
