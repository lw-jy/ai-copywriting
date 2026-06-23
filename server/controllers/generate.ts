import type { ParameterizedContext } from "koa"
import type { Platform, GenerateInput } from "../types"
import { OPENAI_API_KEY } from "../config"
import { buildPrompt, streamOpenAI } from "../services/ai"
import { writeSSE } from "../middleware/sse"
import { getLogger } from "../utils/logger"

const log = getLogger("controller")

const PLATFORM_LABEL: Record<Platform, string> = {
  amazon: "Amazon Listing",
  social: "TikTok / Instagram",
  edm: "EDM 营销邮件",
  douyin: "抖音",
  xiaohongshu: "小红书",
}

/** 根据错误对象返回用户可读的中文错误消息 */
function getUserMessage(err: unknown): string {
  const e = err as Error & { code?: string }

  if (e.code === "AUTH_ERROR") {
    return "API Key 无效或已过期，请在 .env 中重新配置"
  }
  if (e.code === "QUOTA_EXCEEDED") {
    return "API 额度不足，请充值后重试"
  }
  if (e.code === "SERVER_ERROR") {
    return "AI 服务暂时不可用，请稍后重试"
  }
  if (e instanceof TypeError && e.message.includes("fetch")) {
    return "网络连接失败，请检查网络后重试"
  }
  return "生成失败，请重试"
}

/**
 * POST /api/generate
 *
 * 接收产品信息 → 按平台依次调用 DeepSeek 生成文案 → SSE 流式推送给前端。
 * AI 调用失败时不再降级 Mock，而是直接返回具体的错误原因。
 */
export async function handleGenerate(ctx: ParameterizedContext) {
  const input = ctx.request.body as GenerateInput
  const platforms: Platform[] = input.platforms?.length
    ? input.platforms
    : ["amazon", "social", "edm", "douyin", "xiaohongshu"]

  log.info(`━━━ 开始生成: "${input.productName}" ━━━`)
  log.info(`产品: ${input.productName} | 市场: ${input.market} | 语气: ${input.tone}`)
  log.info(`卖点: ${input.features.replace(/\n/g, " | ")}`)
  log.info(`平台: ${platforms.join(", ")}`)

  /* ---- SSE 响应头 ---- */
  ctx.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  })
  ctx.status = 200
  ctx.res.flushHeaders()

  /* ---- 客户端断开时标记中止 ---- */
  let aborted = false
  ctx.req.on("close", () => {
    log.info("客户端断开连接")
    aborted = true
  })

  /* ---- 检查 API Key（优先用请求体里的，其次 .env） ---- */
  if (!input.apiKey && !OPENAI_API_KEY) {
    log.warn("API Key 未配置")
    for (const platform of platforms) {
      writeSSE(ctx, { type: "start", platform })
      writeSSE(ctx, { type: "error", platform, message: "未配置 API Key，请在设置中填入或 .env 中配置" })
      writeSSE(ctx, { type: "done", platform })
    }
    writeSSE(ctx, { type: "all-done" })
    ctx.res.end()
    return
  }

  /* ---- 逐平台生成 ---- */
  try {
    for (const platform of platforms) {
      if (aborted) break

      log.info(`→ ${PLATFORM_LABEL[platform]} 开始`)
      writeSSE(ctx, { type: "start", platform })

      let aiError: unknown = null
      try {
        const prompt = await buildPrompt(platform, input)
        log.info(`  🤖 AI 请求 ${PLATFORM_LABEL[platform]} ...`)
        let tokenCount = 0
        const llmOpts = { apiKey: input.apiKey, baseUrl: input.baseUrl, model: input.model }
        for await (const token of streamOpenAI(prompt, llmOpts)) {
          if (aborted) break
          tokenCount++
          writeSSE(ctx, { type: "delta", platform, delta: token })
        }
        log.info(`  ✅ AI ${PLATFORM_LABEL[platform]} 完成 (${tokenCount} tokens)`)
      } catch (err) {
        log.error(`  ❌ AI ${PLATFORM_LABEL[platform]} 失败:`, err)
        aiError = err
      }

      if (aiError) {
        const message = getUserMessage(aiError)
        writeSSE(ctx, { type: "error", platform, message })
      }

      writeSSE(ctx, { type: "done", platform })
    }

    writeSSE(ctx, { type: "all-done" })
    log.info(`━━━ "${input.productName}" 全部完成 ━━━`)
  } catch (err) {
    log.error("[fatal] 生成过程异常:", err)
    for (const platform of platforms) {
      writeSSE(ctx, { type: "error", platform, message: getUserMessage(err) })
    }
  } finally {
    if (!aborted) ctx.res.end()
  }
}
