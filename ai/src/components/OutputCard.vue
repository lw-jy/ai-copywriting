<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import {
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  Pen,
  X,
  Loader2,
} from "@lucide/vue";
import type { Component } from "vue";
import { parseContent } from "../composables/useCopyMatrix";
import type { BookmarkItem } from "../composables/useBookmarks";
import { useAuth } from "../composables/useAuth";

const props = defineProps<{
  icon: Component;
  title: string;
  subtitle: string;
  platformKey: string;
  productName: string;
  content: string;
  status: "idle" | "streaming" | "done" | "error";
  hasGenerated: boolean;
  bookmarks: BookmarkItem[];
  badgeClass: string;
  accentClass: string;
}>();

const emit = defineEmits<{
  (e: "edit", content: string): void;
  (e: "refresh"): void;
}>();

const { authHeader } = useAuth();

const copied = ref(false);
const titleCopied = ref(false);
const saving = ref(false);

/** 当前内容是否已被收藏 */
const saved = computed(() => {
  return props.bookmarks.some((b) => b.rawContent === props.content);
});
const editing = ref(false);
const editContent = ref("");
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const viewRef = ref<HTMLParagraphElement | null>(null);
const savedScrollTop = ref(0);

const parsed = computed(() => parseContent(props.content));
const parsedTitle = computed(() => parsed.value.title);
const displayBody = computed(() => parsed.value.body || props.content);

const hasContent = computed(() => props.content.trim().length > 0);
const showCursor = computed(() => props.status === "streaming");

const statusLabel = computed(() => {
  switch (props.status) {
    case "streaming":
      return "生成中";
    case "done":
      return "已生成";
    case "error":
      return "出错";
    default:
      return "待生成";
  }
});

function startEdit() {
  // 保存查看模式的滚动位置
  savedScrollTop.value = viewRef.value?.scrollTop ?? 0;
  editContent.value = props.content;
  editing.value = true;
  // 等 DOM 切换成 textarea 后恢复滚动位置
  nextTick(() => {
    if (textareaRef.value) textareaRef.value.scrollTop = savedScrollTop.value;
  });
}

function cancelEdit() {
  savedScrollTop.value = textareaRef.value?.scrollTop ?? 0;
  editing.value = false;
  editContent.value = "";
  nextTick(() => {
    if (viewRef.value) viewRef.value.scrollTop = savedScrollTop.value;
  });
}

function saveEdit() {
  savedScrollTop.value = textareaRef.value?.scrollTop ?? 0;
  emit("edit", editContent.value);
  editing.value = false;
  nextTick(() => {
    if (viewRef.value) viewRef.value.scrollTop = savedScrollTop.value;
  });
}

async function copyTitle() {
  if (!parsedTitle.value) return;
  try {
    await navigator.clipboard.writeText(parsedTitle.value);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = parsedTitle.value;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
  titleCopied.value = true;
  setTimeout(() => (titleCopied.value = false), 1800);
}

async function copyText() {
  const text = editing.value ? editContent.value : displayBody.value;
  if (!text.trim()) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
  copied.value = true;
  setTimeout(() => (copied.value = false), 1800);
}

async function toggleSave() {
  if (!hasContent.value || saving.value) return;

  if (saved.value) {
    // 取消收藏
    saving.value = true;
    const id = props.bookmarks.find((b) => b.rawContent === props.content)?._id;
    if (id) {
      await fetch(`/api/bookmarks/${id}`, {
        method: "DELETE",
        headers: authHeader(),
      });
    }
    saving.value = false;
    emit("refresh");
  } else {
    // 添加收藏
    saving.value = true;
    const { title, body } = parseContent(props.content);
    await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({
        productName: props.productName,
        platform: props.platformKey,
        title,
        body,
        rawContent: props.content,
      }),
    });
    saving.value = false;
    emit("refresh");
  }
}
</script>

<template>
  <article
    class="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
  >
    <!-- Header -->
    <header class="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
      <div
        :class="badgeClass"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
      >
        <component :is="icon" class="h-5 w-5" />
      </div>
      <div class="min-w-0 flex-1">
        <h3 class="truncate text-sm font-semibold text-slate-900">
          {{ title }}
        </h3>
        <p class="truncate text-xs text-slate-400">{{ subtitle }}</p>
      </div>
      <span
        :class="
          status === 'error'
            ? 'bg-red-50 text-red-600'
            : status === 'streaming'
              ? 'bg-emerald-50 text-emerald-700'
              : accentClass
        "
        class="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
      >
        <Loader2 v-if="status === 'streaming'" class="h-3 w-3 animate-spin" />
        {{ statusLabel }}
      </span>
    </header>

    <!-- Body — min-h-0 + overflow-hidden 约束高度，子元素决定怎么滚动 -->
    <div class="min-h-0 flex-1 overflow-hidden py-4">
      <!-- Empty state before any generation -->
      <div
        v-if="!hasGenerated"
        class="flex min-h-32 flex-col items-center justify-center text-center"
      >
        <component :is="icon" class="mb-2 h-7 w-7 text-slate-200" />
        <p class="text-xs text-slate-400">填写左侧信息后点击生成</p>
      </div>

      <!-- View mode: title + 正文分开展示 -->
      <div
        v-else-if="!editing"
        ref="viewRef"
        class="h-full overflow-y-auto px-5 text-[13px] leading-relaxed text-slate-600"
      >
        <!-- Title 区域（如果已解析出来） -->
        <div v-if="parsedTitle" class="mb-3">
          <div class="flex items-start gap-2">
            <p class="flex-1 font-semibold text-slate-900">
              {{ parsedTitle }}
            </p>
            <button
              type="button"
              @click="copyTitle"
              class="mt-0.5 shrink-0 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              :title="titleCopied ? '已复制' : '复制标题'"
            >
              <Check
                v-if="titleCopied"
                class="h-3.5 w-3.5 text-emerald-600"
              />
              <Copy v-else class="h-3.5 w-3.5" />
            </button>
          </div>
          <hr class="mt-2 border-slate-100" />
        </div>

        <!-- 正文 -->
        <p class="whitespace-pre-line">
          {{ displayBody }}<span
            v-if="showCursor"
            class="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-slate-400 align-middle"
            aria-hidden="true"
          ></span>
        </p>
      </div>

      <!-- Edit mode: textarea 高度随内容自动撑开，由父容器滚动 -->
      <textarea
        v-else
        ref="textareaRef"
        v-model="editContent"
        class="h-full w-full resize-none overflow-y-auto border-0 bg-transparent px-5 text-[13px] leading-relaxed text-slate-600 outline-none"
        @keydown.esc="cancelEdit"
      ></textarea>
    </div>

    <!-- Footer -->
    <footer class="flex items-center gap-2 border-t border-slate-100 px-5 py-3">
      <!-- View mode footer -->
      <template v-if="!editing">
        <button
          type="button"
          @click="copyText"
          :disabled="!hasContent"
          class="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check v-if="copied" class="h-3.5 w-3.5 text-emerald-600" />
          <Copy v-else class="h-3.5 w-3.5 text-slate-400" />
          {{ copied ? "已复制" : "复制正文" }}
        </button>
        <button
          type="button"
          @click="toggleSave"
          :disabled="!hasContent || saving"
          :class="
            saved
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          "
          class="flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Loader2 v-if="saving" class="h-3.5 w-3.5 animate-spin text-slate-400" />
          <BookmarkCheck v-else-if="saved" class="h-3.5 w-3.5" />
          <Bookmark v-else class="h-3.5 w-3.5 text-slate-400" />
          {{ saving ? "保存中..." : saved ? "已收藏" : "收藏文案" }}
        </button>
        <button
          type="button"
          @click="startEdit"
          :disabled="!hasContent"
          class="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Pen class="h-3.5 w-3.5 text-slate-400" />
          编辑
        </button>
      </template>

      <!-- Edit mode footer -->
      <template v-else>
        <button
          type="button"
          @click="cancelEdit"
          class="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
        >
          <X class="h-3.5 w-3.5 text-slate-400" />
          取消
        </button>
        <button
          type="button"
          @click="saveEdit"
          class="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/30"
        >
          <Check class="h-3.5 w-3.5" />
          保存
        </button>
      </template>
    </footer>
  </article>
</template>
