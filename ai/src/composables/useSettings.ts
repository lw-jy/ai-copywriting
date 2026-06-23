import { ref } from "vue"

const KEYS = {
  apiKey: "copy-matrix-api-key",
  baseUrl: "copy-matrix-base-url",
  model: "copy-matrix-model",
}

const isExt = () => !!(window as any).__IS_EXTENSION__

/* ---------- 存储抽象 ---------- */

async function getVal(key: string): Promise<string> {
  if (isExt()) {
    const r = await chrome.storage.local.get(key)
    return r[key] || ""
  }
  return localStorage.getItem(key) || ""
}

async function setVal(key: string, val: string) {
  if (isExt()) {
    await chrome.storage.local.set({ [key]: val })
  } else {
    localStorage.setItem(key, val)
  }
}

/* ---------- 默认值 ---------- */

const DEFAULT_BASE_URL = "https://api.deepseek.com"
const DEFAULT_MODEL = "deepseek-v4-flash"

export function useSettings() {
  const apiKey = ref("")
  const baseUrl = ref(DEFAULT_BASE_URL)
  const model = ref(DEFAULT_MODEL)
  const loaded = ref(false)

  async function load() {
    apiKey.value = await getVal(KEYS.apiKey)
    baseUrl.value = await getVal(KEYS.baseUrl) || DEFAULT_BASE_URL
    model.value = await getVal(KEYS.model) || DEFAULT_MODEL
    loaded.value = true
  }

  async function save(key: string, url: string, mdl: string) {
    apiKey.value = key
    baseUrl.value = url || DEFAULT_BASE_URL
    model.value = mdl || DEFAULT_MODEL
    await setVal(KEYS.apiKey, apiKey.value)
    await setVal(KEYS.baseUrl, baseUrl.value)
    await setVal(KEYS.model, model.value)
  }

  return { apiKey, baseUrl, model, loaded, load, save }
}
