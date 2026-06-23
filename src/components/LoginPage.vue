<script setup lang="ts">
import { ref } from "vue";
import { Sparkles } from "@lucide/vue";
import { useAuth } from "../composables/useAuth";

const emit = defineEmits<{ (e: "done"): void }>();

const { login, register } = useAuth();

const isRegister = ref(false);
const username = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

async function submit() {
  error.value = "";
  if (!username.value.trim() || !password.value.trim()) {
    error.value = "用户名和密码不能为空";
    return;
  }

  loading.value = true;
  const err = isRegister.value
    ? await register(username.value.trim(), password.value.trim())
    : await login(username.value.trim(), password.value.trim());

  loading.value = false;

  if (err) {
    error.value = err;
  } else {
    emit("done");
  }
}
</script>

<template>
  <div
    class="flex h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-blue-50"
  >
    <div
      class="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
    >
      <!-- Logo -->
      <div class="mb-6 flex flex-col items-center gap-2">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white"
        >
          <Sparkles class="h-5 w-5" />
        </div>
        <h1 class="text-lg font-semibold text-slate-900">电商 AI 文案生成</h1>
        <p class="text-xs text-slate-400">登录后使用文案矩阵生成与收藏</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="submit" class="flex flex-col gap-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700"
            >用户名</label
          >
          <input
            v-model="username"
            type="text"
            placeholder="输入用户名"
            class="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700"
            >密码</label
          >
          <input
            v-model="password"
            type="password"
            placeholder="输入密码"
            class="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>

        <!-- Error -->
        <p v-if="error" class="text-xs text-red-500">{{ error }}</p>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="loading"
          class="flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {{ loading ? "请稍候..." : isRegister ? "注册并登录" : "登录" }}
        </button>

        <!-- Toggle -->
        <p class="text-center text-xs text-slate-400">
          {{ isRegister ? "已有账号？" : "没有账号？" }}
          <button
            type="button"
            @click="
              isRegister = !isRegister;
              error = '';
            "
            class="text-slate-600 underline hover:text-slate-900"
          >
            {{ isRegister ? "登录" : "注册一个" }}
          </button>
        </p>
      </form>
    </div>
  </div>
</template>
