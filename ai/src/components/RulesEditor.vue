<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { Plus, Trash2, Upload, Save, Loader2, FileText } from "@lucide/vue";
import type { PlatformKey } from "../composables/useCopyMatrix";

const props = defineProps<{
  platform: PlatformKey;
  rules: string[];
  outputTitle: string;
  outputBody: string;
  saving: boolean;
}>();

const emit = defineEmits<{
  (e: "update:rules", v: string[]): void;
  (e: "update:outputTitle", v: string): void;
  (e: "update:outputBody", v: string): void;
  (e: "save"): void;
  (e: "upload", content: string): void;
}>();

const newRule = ref("");

function addRule() {
  if (!newRule.value.trim()) return;
  emit("update:rules", [...props.rules, newRule.value.trim()]);
  newRule.value = "";
}

function removeRule(index: number) {
  emit(
    "update:rules",
    props.rules.filter((_, i) => i !== index),
  );
}

function handleFileUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const content = reader.result as string;
    emit("upload", content);
  };
  reader.readAsText(file);
  // 清空 input 以便重复上传同一文件
  input.value = "";
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- 文件上传 -->
    <div
      class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4"
    >
      <label
        class="flex cursor-pointer items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700"
      >
        <Upload class="h-4 w-4" />
        上传 .txt 或 .md 文件导入规则
        <input
          type="file"
          accept=".txt,.md"
          class="hidden"
          @change="handleFileUpload"
        />
      </label>
    </div>

    <!-- 输出 Title / Body 配置 -->
    <div class="flex gap-3">
      <div class="flex-1">
        <label class="mb-1 block text-xs font-medium text-slate-500"
          >标题规则</label
        >
        <input
          :value="outputTitle"
          @input="
            emit(
              'update:outputTitle',
              ($event.target as HTMLInputElement).value,
            )
          "
          class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
          placeholder="例：笔记标题"
        />
      </div>
      <div class="flex-1">
        <label class="mb-1 block text-xs font-medium text-slate-500"
          >正文规则</label
        >
        <input
          :value="outputBody"
          @input="
            emit('update:outputBody', ($event.target as HTMLInputElement).value)
          "
          class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
          placeholder="例：完整笔记内容"
        />
      </div>
    </div>

    <!-- 规则列表 -->
    <div class="flex flex-col gap-2">
      <div
        v-for="(rule, idx) in rules"
        :key="idx"
        class="flex items-start gap-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-700"
      >
        <span class="mt-0.5 shrink-0 text-xs text-slate-400"
          >{{ idx + 1 }}.</span
        >
        <span class="flex-1">{{ rule }}</span>
        <button
          @click="removeRule(idx)"
          class="shrink-0 text-slate-300 hover:text-red-500"
        >
          <Trash2 class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <!-- 添加规则 -->
    <div class="flex gap-2">
      <input
        v-model="newRule"
        @keydown.enter="addRule"
        class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
        placeholder="输入新规则..."
      />
      <button
        @click="addRule"
        :disabled="!newRule.trim()"
        class="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
      >
        <Plus class="h-3.5 w-3.5" />
        添加
      </button>
    </div>

    <!-- 保存按钮 -->
    <button
      @click="emit('save')"
      :disabled="saving"
      class="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
    >
      <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
      <Save v-else class="h-4 w-4" />
      {{ saving ? "保存中..." : "保存规则" }}
    </button>
  </div>
</template>
