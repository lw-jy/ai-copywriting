import { ref, computed } from "vue"

const TOKEN_KEY = "copy-matrix-token"
const API_URL_KEY = "copy-matrix-api-url"

export interface UserInfo {
  id: string
  username: string
}

const token = ref("")
const user = ref<UserInfo | null>(null)
const initialized = ref(false)
export const isExt = () => !!(window as any).chrome?.storage?.local
const EXT_API_URL = "https://ai-copywriting.onrender.com"
export const apiUrl = ref(isExt() ? EXT_API_URL : "http://127.0.0.1:8787")

/** Web 用相对路径（走 Vite 代理），扩展用绝对地址 */
function apiPrefix(): string {
  return isExt() ? apiUrl.value : ""
}

/** 扩展用绝对 URL，Web 用相对路径 */
export function apiPath(path: string): string {
  return isExt() ? `${apiUrl.value}${path}` : path
}

/* ---------- 环境适配的存储 ---------- */

async function setStorage(key: string, value: string) {
  if (isExt()) {
    await chrome.storage.local.set({ [key]: value })
  } else {
    localStorage.setItem(key, value)
  }
}

async function getStorage(key: string): Promise<string> {
  if (isExt()) {
    const result = await chrome.storage.local.get(key)
    return result[key] || ""
  }
  return localStorage.getItem(key) || ""
}

async function removeStorage(key: string) {
  if (isExt()) {
    await chrome.storage.local.remove(key)
  } else {
    localStorage.removeItem(key)
  }
}

/* ---------- 认证状态 ---------- */

export function useAuth() {
  const isLoggedIn = computed(() => !!token.value && !!user.value)

  async function init() {
    token.value = await getStorage(TOKEN_KEY)
    apiUrl.value = await getStorage(API_URL_KEY) || apiUrl.value

    if (!token.value) {
      initialized.value = true
      return
    }

    if (isExt()) {
      user.value = { id: "", username: "已登录" }
      initialized.value = true
      return
    }

    try {
      const res = await fetch(`${apiPrefix()}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token.value}` },
      })
      if (res.ok) {
        const data = await res.json()
        user.value = data.user
      } else {
        token.value = ""
        user.value = null
        await removeStorage(TOKEN_KEY)
      }
    } catch {
    } finally {
      initialized.value = true
    }
  }

  async function setToken(apiUrlVal: string, tokenVal: string) {
    apiUrl.value = apiUrlVal
    token.value = tokenVal
    user.value = tokenVal ? { id: "", username: "已登录" } : null
    await setStorage(API_URL_KEY, apiUrlVal)
    await setStorage(TOKEN_KEY, tokenVal)
  }

  async function login(username: string, password: string): Promise<string | null> {
    try {
      const res = await fetch(`${apiPrefix()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) return data.error || "登录失败"
      token.value = data.token
      user.value = data.user
      await setStorage(TOKEN_KEY, data.token)
      return null
    } catch {
      return "网络错误，请重试"
    }
  }

  async function register(username: string, password: string): Promise<string | null> {
    try {
      const res = await fetch(`${apiPrefix()}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) return data.error || "注册失败"
      token.value = data.token
      user.value = data.user
      await setStorage(TOKEN_KEY, data.token)
      return null
    } catch {
      return "网络错误，请重试"
    }
  }

  function logout() {
    token.value = ""
    user.value = null
    removeStorage(TOKEN_KEY)
  }

  function authHeader(): Record<string, string> {
    return token.value ? { Authorization: `Bearer ${token.value}` } : {}
  }

  return {
    token, user, isLoggedIn, initialized, apiUrl,
    init, setToken, login, register, logout, authHeader,
  }
}
