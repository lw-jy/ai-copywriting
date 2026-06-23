<script setup lang="ts">
import { ref, watch } from "vue"
import {
  Package,
  ListChecks,
  Globe,
  Palette,
  LayoutGrid,
  Sparkles,
  Loader2,
  FileText,
} from "@lucide/vue"
import type { PlatformKey } from "../composables/useCopyMatrix"
import { useAuth } from "../composables/useAuth"
import { useRules } from "../composables/useRules"
import RulesEditor from "./RulesEditor.vue"

defineProps<{
  productName: string
  features: string
  market: string
  tone: string
  platforms: PlatformKey[]
  loading: boolean
}>()

const emit = defineEmits<{
  (e: "update:productName", v: string): void
  (e: "update:features", v: string): void
  (e: "update:market", v: string): void
  (e: "update:tone", v: string): void
  (e: "update:platforms", v: PlatformKey[]): void
  (e: "generate"): void
}>()

const { authHeader } = useAuth()
const { ruleData, fetchRules, saveRules, uploadText } = useRules(authHeader)

const activeTab = ref<"generate" | "rules">("generate")
const rulePlatform = ref<PlatformKey>("amazon")
const editorRules = ref<string[]>([])
const editorTitle = ref("")
const editorBody = ref("")
const editorSaving = ref(false)

const platformList: { key: PlatformKey; label: string }[] = [
  { key: "amazon", label: "Amazon Listing" },
  { key: "social", label: "TikTok / Instagram" },
  { key: "edm", label: "EDM 营销邮件" },
  { key: "douyin", label: "抖音" },
  { key: "xiaohongshu", label: "小红书" },
]

const marketOptions = [
  { value: "us-en", label: "美区英语" },
  { value: "zh-cn", label: "中文简体" },
  { value: "jp-ja", label: "日区日语" },
  { value: "de-de", label: "德区德语" },
]

const toneOptions = [
  { value: "passion", label: "种草激情" },
  { value: "professional", label: "严谨专业" },
  { value: "humor", label: "幽默风趣" },
]

function togglePlatform(key: PlatformKey, currentPlatforms: PlatformKey[]) {
  if (currentPlatforms.includes(key)) {
    const next = currentPlatforms.filter((p) => p !== key)
    if (next.length > 0) emit("update:platforms", next)
  } else {
    emit("update:platforms", [...currentPlatforms, key])
  }
}

// 切换规则平台时加载
watch(rulePlatform, (p) => {
  fetchRules(p).then(() => {
    editorRules.value = ruleData.value?.rules || []
    editorTitle.value = ruleData.value?.outputTitle || ""
    editorBody.value = ruleData.value?.outputBody || ""
  })
})

// 进入规则 tab 时加载当前平台规则
watch(activeTab, (tab) => {
  if (tab === "rules") {
    fetchRules(rulePlatform.value).then(() => {
      editorRules.value = ruleData.value?.rules || []
      editorTitle.value = ruleData.value?.outputTitle || ""
      editorBody.value = ruleData.value?.outputBody || ""
    })
  }
})

async function handleSaveRules() {
  editorSaving.value = true
  await saveRules(rulePlatform.value, {
    rules: editorRules.value,
    outputTitle: editorTitle.value,
    outputBody: editorBody.value,
  })
  editorSaving.value = false
}

async function handleUpload(content: string) {
  const ok = await uploadText(rulePlatform.value, content)
  if (ok) {
    editorRules.value = ruleData.value?.rules || []
    editorTitle.value = ruleData.value?.outputTitle || ""
    editorBody.value = ruleData.value?.outputBody || ""
  }
}
</script>

<template>
  <aside
    class="flex h-full flex-col border-r border-slate-200 bg-white"
  >
    <!-- Tab Bar -->
    <div class="flex border-b border-slate-200">
      <button
        type="button"
        @click="activeTab = 'generate'"
        class="flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition"
        :class="activeTab === 'generate' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-400 hover:text-slate-600'"
      >
        <Sparkles class="h-4 w-4" />
        生成
      </button>
      <button
        type="button"
        @click="activeTab = 'rules'"
        class="flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition"
        :class="activeTab === 'rules' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-400 hover:text-slate-600'"
      >
        <FileText class="h-4 w-4" />
        规则
      </button>
    </div>

    <!-- Tab: 生成 -->
    <div v-show="activeTab === 'generate'" class="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
      <!-- Platform Selection -->
      <div class="flex flex-col gap-1.5">
        <label class="flex items-center gap-1.5 text-sm font-medium text-slate-700">
          <LayoutGrid class="h-4 w-4 text-slate-400" />
          生成平台
        </label>
        <div class="grid grid-cols-2 gap-2">
          <label
            v-for="p in platformList"
            :key="p.key"
            class="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition"
            :class="
              platforms.includes(p.key)
                ? 'border-slate-900 bg-slate-50 text-slate-900'
                : 'border-slate-200 text-slate-500 hover:border-slate-300'
            "
          >
            <input
              type="checkbox"
              :checked="platforms.includes(p.key)"
              class="h-3.5 w-3.5 accent-slate-900"
              @change="togglePlatform(p.key, platforms)"
            />
            {{ p.label }}
          </label>
        </div>
      </div>

      <form class="flex flex-1 flex-col gap-5" @submit.prevent="emit('generate')">
        <!-- Product Name -->
        <div class="flex flex-col gap-1.5">
          <label for="product-name" class="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <Package class="h-4 w-4 text-slate-400" />
            产品名称
          </label>
          <input
            id="product-name"
            :value="productName"
            @input="emit('update:productName', ($event.target as HTMLInputElement).value)"
            type="text"
            placeholder="例如：便携式无线蓝牙音箱"
            class="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm placeholder:text-slate-400 transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>

        <!-- Core Selling Points -->
        <div class="flex flex-col gap-1.5">
          <label for="features" class="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <ListChecks class="h-4 w-4 text-slate-400" />
            核心卖点 / 功能特性
          </label>
          <textarea
            id="features"
            :value="features"
            @input="emit('update:features', ($event.target as HTMLTextAreaElement).value)"
            rows="5"
            placeholder="例如：360° 环绕立体声、IPX7 防水、续航 24 小时、Type-C 快充……"
            class="w-full resize-y rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm leading-relaxed placeholder:text-slate-400 transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>

        <!-- Target Market -->
        <div class="flex flex-col gap-1.5">
          <label for="market" class="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <Globe class="h-4 w-4 text-slate-400" />
            目标市场 / 语言
          </label>
          <select
            id="market"
            :value="market"
            @change="emit('update:market', ($event.target as HTMLSelectElement).value)"
            class="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-9 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          >
            <option v-for="o in marketOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>

        <!-- Tone & Style -->
        <div class="flex flex-col gap-1.5">
          <label for="tone" class="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <Palette class="h-4 w-4 text-slate-400" />
            语气风格
          </label>
          <select
            id="tone"
            :value="tone"
            @change="emit('update:tone', ($event.target as HTMLSelectElement).value)"
            class="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-9 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          >
            <option v-for="o in toneOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>

        <!-- Submit -->
        <div class="mt-auto pt-2">
          <button
            type="submit"
            :disabled="loading || platforms.length === 0"
            class="group flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
            <Sparkles v-else class="h-4 w-4 transition group-hover:scale-110" />
            {{ loading ? "正在生成文案…" : `生成 ${platforms.length} 个平台文案` }}
          </button>
        </div>
      </form>
    </div>

    <!-- Tab: 规则 -->
    <div v-show="activeTab === 'rules'" class="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
      <!-- 平台选择 -->
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">选择平台</label>
        <select
          v-model="rulePlatform"
          class="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
        >
          <option v-for="p in platformList" :key="p.key" :value="p.key">{{ p.label }}</option>
        </select>
      </div>

      <p class="text-xs leading-relaxed text-slate-400">
        自定义规则会覆盖默认规则。上传 .txt 或 .md 文件可快速导入规则列表（每行一条规则）。
        支持 <code>标题：</code> 和 <code>正文：</code> 指定输出标题/正文名称。
      </p>

      <RulesEditor
        :platform="rulePlatform"
        :rules="editorRules"
        :output-title="editorTitle"
        :output-body="editorBody"
        :saving="editorSaving"
        @update:rules="editorRules = $event"
        @update:output-title="editorTitle = $event"
        @update:output-body="editorBody = $event"
        @save="handleSaveRules"
        @upload="handleUpload"
      />
    </div>
  </aside>
</template>
