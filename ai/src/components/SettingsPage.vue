<script setup lang="ts">
import { ref, onMounted } from "vue"
import { X } from "@lucide/vue"
import { useSettings } from "../composables/useSettings"
import SettingsForm from "./SettingsForm.vue"

const props = withDefaults(defineProps<{ modal?: boolean }>(), { modal: false })

const emit = defineEmits<{
  (e: "done"): void
  (e: "skip"): void
}>()

const { apiKey, baseUrl, model, load, save } = useSettings()

const localApiKey = ref("")
const localBaseUrl = ref("")
const localModel = ref("")
const saving = ref(false)

onMounted(async () => {
  await load()
  localApiKey.value = apiKey.value
  localBaseUrl.value = baseUrl.value
  localModel.value = model.value
})

async function handleSave() {
  saving.value = true
  await save(localApiKey.value.trim(), localBaseUrl.value.trim(), localModel.value.trim())
  saving.value = false
  emit("done")
}
</script>

<template>
  <!-- 弹窗模式：覆盖在主界面上 -->
  <div v-if="modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30" @click.self="emit('skip')">
    <div class="mx-4 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-base font-semibold text-slate-900">配置 API Key</h2>
        <button @click="emit('skip')" class="text-slate-400 hover:text-slate-600"><X class="h-4 w-4" /></button>
      </div>
      <SettingsForm :api-key="localApiKey" :base-url="localBaseUrl" :model="localModel" :saving="saving"
        @update:api-key="localApiKey = $event" @update:base-url="localBaseUrl = $event" @update:model="localModel = $event"
        @save="handleSave" />
      <button @click="emit('skip')" class="mt-2 w-full py-2 text-sm text-slate-400 hover:text-slate-600">稍后配置</button>
    </div>
  </div>

  <!-- 全屏模式：首次使用 / 扩展 -->
  <div v-else class="flex h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-blue-50 p-4">
    <div class="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="mb-5 flex flex-col items-center gap-2">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
          <span class="text-lg font-bold">AI</span>
        </div>
        <h1 class="text-lg font-semibold text-slate-900">配置 API</h1>
        <p class="text-xs text-slate-400">填入你的 API Key 即可开始使用</p>
      </div>
      <SettingsForm :api-key="localApiKey" :base-url="localBaseUrl" :model="localModel" :saving="saving"
        @update:api-key="localApiKey = $event" @update:base-url="localBaseUrl = $event" @update:model="localModel = $event"
        @save="handleSave" />
    </div>
  </div>
</template>

