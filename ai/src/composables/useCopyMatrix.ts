import { reactive, ref } from "vue"
import { fetchEventSource } from "@microsoft/fetch-event-source"

/* ---------- Types ---------- */

export type PlatformKey = "amazon" | "social" | "edm" | "douyin" | "xiaohongshu"

export interface GenerateInput {
  productName: string
  features: string
  market: string
  tone: string
  platforms?: PlatformKey[]
  apiKey?: string
  baseUrl?: string
  model?: string
}

interface SSEEvent {
  type: "start" | "delta" | "done" | "error" | "all-done"
  platform?: PlatformKey
  label?: string
  delta?: string
  message?: string
}

const ALL_PLATFORMS: PlatformKey[] = ["amazon", "social", "edm", "douyin", "xiaohongshu"]

function makeEmptyContent(): Record<PlatformKey, string> {
  const obj = {} as Record<PlatformKey, string>
  for (const k of ALL_PLATFORMS) obj[k] = ""
  return obj
}

function makeEmptyStatus(): Record<PlatformKey, "idle" | "streaming" | "done" | "error"> {
  const obj = {} as Record<PlatformKey, "idle" | "streaming" | "done" | "error">
  for (const k of ALL_PLATFORMS) obj[k] = "idle"
  return obj
}

/* ---------- Composable ---------- */

/**
 * 文案矩阵生成 — SSE 流式请求 + 缓冲区批量刷新渲染
 *
 * 请求： 使用 @microsoft/fetch-event-source 的 fetchEventSource
 * 渲染： 累积 sseBuffer → 50ms 定时 flush 到响应式 content
 *        每平台 done 时立即 flush 该平台，确保末尾内容不丢失
 */
export function useCopyMatrix() {
  const loading = ref(false)
  const hasGenerated = ref(false)

  const content = reactive(makeEmptyContent())
  const status = reactive(makeEmptyStatus())
  const sseBuffers = reactive(makeEmptyContent())

  let flushTimer: ReturnType<typeof setTimeout> | null = null
  let controller: AbortController | null = null

  /** 将所有平台的缓冲区内容一次性写入响应式 content */
  function flushAllBuffers() {
    for (const key of ALL_PLATFORMS) {
      if (sseBuffers[key]) {
        content[key] += sseBuffers[key]
        sseBuffers[key] = ""
      }
    }
  }

  /** 立即刷指定平台的缓冲区 */
  function flushPlatform(key: PlatformKey) {
    if (sseBuffers[key]) {
      content[key] += sseBuffers[key]
      sseBuffers[key] = ""
    }
  }

  /** 50ms 内合并多次 delta，减少 Vue 响应式更新的频率 */
  function scheduleFlush() {
    if (flushTimer != null) return
    flushTimer = setTimeout(() => {
      flushTimer = null
      flushAllBuffers()
    }, 50)
  }

  /** 清理所有定时器 + 中止请求 */
  function cancel() {
    if (flushTimer != null) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    flushAllBuffers()
    if (controller && !controller.signal.aborted) {
      controller.abort()
    }
    controller = null
  }

  /* ---- 事件处理 ---- */

  function handleSSEEvent(event: SSEEvent) {
    const key = event.platform

    switch (event.type) {
      case "start":
        if (key) status[key] = "streaming"
        break

      case "delta":
        if (key && event.delta) {
          sseBuffers[key] += event.delta
          scheduleFlush()
        }
        break

      case "done":
        if (key) {
          flushPlatform(key)
          status[key] = "done"
        }
        break

      case "error":
        if (key) {
          sseBuffers[key] = ""           // 清掉缓冲区，防止残余内容被追加
          content[key] = event.message ?? "生成失败，请重试。"
          status[key] = "error"
        }
        break

      case "all-done":
        break
    }
  }

  /* ---- 请求入口 ---- */

  async function generate(input: GenerateInput) {
    if (loading.value) return
    loading.value = true
    hasGenerated.value = true

    // 重置状态
    for (const key of ALL_PLATFORMS) {
      content[key] = ""
      status[key] = "idle"
      sseBuffers[key] = ""
    }

    controller = new AbortController()

    try {
      await fetchEventSource("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: controller.signal,
        openWhenHidden: true,

        onopen: async (response) => {
          if (!response.ok) {
            throw new Error(`请求失败 (${response.status})`)
          }
        },

        onmessage: (event) => {
          try {
            const sseEvent: SSEEvent = JSON.parse(event.data)
            handleSSEEvent(sseEvent)
          } catch {
            // 跳过格式异常的消息
          }
        },

        onclose: () => {
          // 连接正常关闭 —— 刷掉残余缓冲区
          flushAllBuffers()
          loading.value = false
          controller = null
        },

        onerror: (error) => {
          if (controller?.signal.aborted) {
            // 手动中止，不做额外处理
            flushAllBuffers()
            loading.value = false
            controller = null
            return
          }

          console.error("[SSE error]", error)
          for (const key of ALL_PLATFORMS) {
            if (status[key] !== "done") status[key] = "error"
          }
          flushAllBuffers()
          loading.value = false
          controller = null
          // 不 throw —— 不重连；用户可点击「生成」重新发起
        },
      })
    } catch (err) {
      // fetchEventSource 内部抛出的异常（如请求失败未到 onopen）
      console.error("[fetchEventSource] 异常:", err)
      for (const key of ALL_PLATFORMS) {
        if (status[key] !== "done") status[key] = "error"
      }
      loading.value = false
      controller = null
    }
  }

  /** 手动停止当前生成 */
  function stop() {
    cancel()
    loading.value = false
  }

  return { loading, hasGenerated, content, status, generate, stop }
}

/* ---------- 工具：从原始内容中提取标题和正文 ---------- */

/**
 * 从含 ---TITLE--- / ---BODY--- 标记的原始字符串中提取标题和正文。
 * 流式生成过程中，标记可能不完整，函数能安全处理。
 *
 * @param raw 完整内容字符串（包含标记）
 * @returns   { title, body } 提取结果，找不到对应标记时返回空字符串
 */
export function parseContent(raw: string): { title: string; body: string } {
  const titleMatch = raw.match(/---TITLE---\n?([\s\S]*?)\n?---BODY---/)
  const bodyMatch = raw.match(/---BODY---\n?([\s\S]*)$/)

  return {
    title: titleMatch?.[1]?.trim() ?? "",
    body: bodyMatch?.[1]?.trim() ?? raw,
  }
}
