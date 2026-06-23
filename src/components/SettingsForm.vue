<script setup lang="ts">
defineProps<{ apiKey: string; baseUrl: string; model: string; saving: boolean }>()
const emit = defineEmits<{
  (e: "update:apiKey", v: string): void
  (e: "update:baseUrl", v: string): void
  (e: "update:model", v: string): void
  (e: "save"): void
}>()
</script>

<template>
  <div class="flex flex-col gap-3">
    <div>
      <label class="mb-1 block text-xs font-medium text-slate-600">API Key</label>
      <input :value="apiKey" @input="emit('update:apiKey', ($event.target as HTMLInputElement).value)"
        type="password" placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
    </div>
    <div>
      <label class="mb-1 block text-xs font-medium text-slate-600">API 地址 <span class="text-xs text-slate-400">（可选）</span></label>
      <input :value="baseUrl" @input="emit('update:baseUrl', ($event.target as HTMLInputElement).value)"
        type="text" placeholder="https://api.deepseek.com"
        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
    </div>
    <div>
      <label class="mb-1 block text-xs font-medium text-slate-600">模型 <span class="text-xs text-slate-400">（可选）</span></label>
      <input :value="model" @input="emit('update:model', ($event.target as HTMLInputElement).value)"
        type="text" placeholder="deepseek-v4-flash"
        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
    </div>
    <button @click="emit('save')" :disabled="saving || !apiKey.trim()"
      class="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">
      {{ saving ? '保存中...' : '保存' }}
    </button>
  </div>
</template>
