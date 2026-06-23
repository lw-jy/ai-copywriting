<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useSettings } from "../composables/useSettings"

const emit = defineEmits<{ (e: "done"): void }>()
const { apiKey, baseUrl, model, load, save } = useSettings()

const k = ref(""); const u = ref(""); const m = ref("")

onMounted(async () => {
  await load(); k.value = apiKey.value; u.value = baseUrl.value; m.value = model.value
})

async function handleSave() {
  await save(k.value.trim(), u.value.trim(), m.value.trim()); emit("done")
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <input v-model="k" type="password" placeholder="API Key"
      class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-slate-900 focus:outline-none" />
    <input v-model="u" type="text" placeholder="API 地址（可选）"
      class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-slate-900 focus:outline-none" />
    <input v-model="m" type="text" placeholder="模型（可选）"
      class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-slate-900 focus:outline-none" />
    <button @click="handleSave" :disabled="!k.trim()"
      class="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">
      保存
    </button>
  </div>
</template>
