import { ref } from "vue"
import { apiPath } from "./useAuth"

export interface RuleData {
  platform: string
  rules: string[]
  outputTitle: string
  outputBody: string
  updatedAt?: string
}

export function useRules(getAuthHeader: () => Record<string, string>) {
  const loading = ref(false)
  const ruleData = ref<RuleData | null>(null)

  function headers(): Record<string, string> {
    return { "Content-Type": "application/json", ...getAuthHeader() }
  }

  async function fetchRules(platform: string) {
    loading.value = true
    try {
      const res = await fetch(apiPath(`/api/rules/${platform}`), { headers: getAuthHeader() })
      if (res.ok) {
        const data = await res.json()
        ruleData.value = data
      } else {
        ruleData.value = null
      }
    } catch {
      ruleData.value = null
    } finally {
      loading.value = false
    }
  }

  async function saveRules(platform: string, data: { rules: string[]; outputTitle: string; outputBody: string }) {
    loading.value = true
    try {
      const res = await fetch(apiPath(`/api/rules/${platform}`), {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify(data),
      })
      if (res.ok) ruleData.value = await res.json()
      return res.ok
    } catch {
      return false
    } finally {
      loading.value = false
    }
  }

  async function uploadText(platform: string, content: string) {
    loading.value = true
    try {
      const res = await fetch(apiPath(`/api/rules/upload-text/${platform}`), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ content }),
      })
      if (res.ok) ruleData.value = await res.json()
      return res.ok
    } catch {
      return false
    } finally {
      loading.value = false
    }
  }

  return { loading, ruleData, fetchRules, saveRules, uploadText }
}
