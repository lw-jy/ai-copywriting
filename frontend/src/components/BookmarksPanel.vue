<script setup lang="ts">
import { ref } from "vue"
import {
  X,
  Copy,
  Check,
  Trash2,
  ShoppingCart,
  Video,
  Mail,
  Music,
  BookOpen,
  BookmarkCheck,
} from "@lucide/vue"
import type { BookmarkItem } from "../composables/useBookmarks"
import { parseContent } from "../composables/useCopyMatrix"
import { useAuth } from "../composables/useAuth"

const props = defineProps<{
  bookmarks: BookmarkItem[]
}>()

const emit = defineEmits<{
  (e: "close"): void
  (e: "refresh"): void
}>()

const { authHeader } = useAuth()

const copiedId = ref<string | null>(null)

const platformIcon: Record<string, any> = {
  amazon: ShoppingCart,
  social: Video,
  edm: Mail,
  douyin: Music,
  xiaohongshu: BookOpen,
}

const platformLabel: Record<string, string> = {
  amazon: "Amazon Listing",
  social: "TikTok / Instagram",
  edm: "EDM 营销邮件",
  douyin: "抖音",
  xiaohongshu: "小红书",
}

function getPlatformIcon(platform: string) {
  return platformIcon[platform] || BookmarkCheck
}

async function copyTitle(item: BookmarkItem) {
  const text = item.title || parseContent(item.rawContent).title
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copiedId.value = `title-${item._id}`
    setTimeout(() => (copiedId.value = null), 1800)
  } catch {
    // fallback
  }
}

async function copyBody(item: BookmarkItem) {
  const text = item.body || parseContent(item.rawContent).body || item.rawContent
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copiedId.value = `body-${item._id}`
    setTimeout(() => (copiedId.value = null), 1800)
  } catch {
    // fallback
  }
}

async function deleteBookmark(id: string) {
  await fetch(`/api/bookmarks/${id}`, {
    method: "DELETE",
    headers: authHeader(),
  })
  emit("refresh")
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<template>
  <div class="bookmarks-overlay" @click.self="emit('close')">
    <div class="bookmarks-panel">
      <!-- Header -->
      <header class="flex items-center justify-between px-5 py-4">
        <div class="flex items-center gap-2">
          <BookmarkCheck class="h-5 w-5 text-slate-600" />
          <h2 class="text-base font-semibold text-slate-900">收藏列表</h2>
          <span class="text-xs text-slate-400">({{ props.bookmarks.length }})</span>
        </div>
        <button
          type="button"
          @click="emit('close')"
          class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X class="h-4 w-4" />
        </button>
      </header>

      <!-- Empty state -->
      <div
        v-if="props.bookmarks.length === 0"
        class="flex flex-1 flex-col items-center justify-center px-5 text-center"
      >
        <BookmarkCheck class="mb-2 h-8 w-8 text-slate-200" />
        <p class="text-sm text-slate-400">还没有收藏的文案</p>
        <p class="mt-1 text-xs text-slate-300">生成文案后点击收藏按钮即可保存</p>
      </div>

      <!-- List -->
      <div v-else class="flex-1 overflow-y-auto px-5 pb-4">
        <div
          v-for="item in props.bookmarks"
          :key="item._id"
          class="mb-3 rounded-lg border border-slate-200 bg-white p-4 text-sm"
        >
          <!-- Platform + Product -->
          <div class="mb-2 flex items-center gap-2">
            <component
              :is="getPlatformIcon(item.platform)"
              class="h-4 w-4 text-slate-400"
            />
            <span class="text-xs font-medium text-slate-500">
              {{ platformLabel[item.platform] || item.platform }}
            </span>
            <span v-if="item.productName" class="ml-auto text-xs text-slate-400">
              {{ item.productName }}
            </span>
          </div>

          <!-- Title -->
          <p
            v-if="item.title"
            class="mb-1.5 font-medium text-slate-800"
          >
            {{ item.title }}
          </p>

          <!-- Body preview -->
          <p
            class="line-clamp-3 text-xs leading-relaxed text-slate-500"
          >
            {{ item.body || parseContent(item.rawContent).body || item.rawContent }}
          </p>

          <!-- Time + Actions -->
          <div class="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <span class="text-[11px] text-slate-400">
              {{ formatTime(item.createdAt) }}
            </span>
            <div class="flex items-center gap-1">
              <button
                type="button"
                @click="copyTitle(item)"
                class="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-slate-500 transition hover:bg-slate-100"
                :title="'复制标题'"
              >
                <Check v-if="copiedId === `title-${item._id}`" class="h-3 w-3 text-emerald-600" />
                <Copy v-else class="h-3 w-3" />
                标题
              </button>
              <button
                type="button"
                @click="copyBody(item)"
                class="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-slate-500 transition hover:bg-slate-100"
                :title="'复制正文'"
              >
                <Check v-if="copiedId === `body-${item._id}`" class="h-3 w-3 text-emerald-600" />
                <Copy v-else class="h-3 w-3" />
                正文
              </button>
              <button
                type="button"
                @click="deleteBookmark(item._id)"
                class="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-red-400 transition hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 class="h-3 w-3" />
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bookmarks-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  justify-content: flex-end;
  background: rgba(15, 23, 42, 0.2);
}

.bookmarks-panel {
  width: 420px;
  max-width: 100vw;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}
</style>
