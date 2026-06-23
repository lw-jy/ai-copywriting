import Koa from "koa"
import Router from "@koa/router"
import bodyParser from "koa-bodyparser"
import { PassThrough } from "node:stream"
import { readFileSync } from "node:fs"
import { streamText, createGateway } from "ai"

// In the v0 sandbox, project environment variables are written to
// /vercel/share/.env.project rather than injected into manually started
// processes. Load it if AI_GATEWAY_API_KEY isn't already present.
// On Vercel (or any normal host) process.env is already populated, so this is a no-op.
if (!process.env.AI_GATEWAY_API_KEY) {
  for (const file of ["/vercel/share/.env.project", `${process.cwd()}/.env.local`, `${process.cwd()}/.env`]) {
    try {
      const raw = readFileSync(file, "utf8")
      for (const line of raw.split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
        if (!m) continue
        const key = m[1]
        let val = m[2].trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        if (!process.env[key]) process.env[key] = val
      }
    } catch {
      // file not found / unreadable — ignore
    }
  }
}

console.log("[v0] AI_GATEWAY_API_KEY loaded:", process.env.AI_GATEWAY_API_KEY ? `yes (${process.env.AI_GATEWAY_API_KEY.slice(0, 6)}...)` : "NO")

// Explicitly construct the gateway provider with the API key so auth doesn't
// depend on the SDK's implicit env/OIDC resolution (which isn't available in
// this standalone Koa process).
const gateway = createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY })

const app = new Koa()
const router = new Router()

const MODEL = "openai/gpt-5-mini"

const MARKET_MAP: Record<string, { name: string; lang: string }> = {
  "us-en": { name: "美国", lang: "英语 (English)" },
  "jp-ja": { name: "日本", lang: "日语 (日本語)" },
  "de-de": { name: "德国", lang: "德语 (Deutsch)" },
}

const TONE_MAP: Record<string, string> = {
  passion: "种草激情、有感染力、善用情绪化的钩子和号召",
  professional: "严谨专业、强调参数与可信度、克制理性",
  humor: "幽默风趣、轻松俏皮、善用网络流行梗",
}

type PlatformKey = "amazon" | "social" | "edm"

const PLATFORMS: { key: PlatformKey; label: string; brief: string }[] = [
  {
    key: "amazon",
    label: "Amazon Listing",
    brief:
      "生成一份 Amazon 商品详情页文案，包含：一个不超过 200 字符的标题、5 条以「•」开头的 bullet points 卖点、以及一段简短的商品描述。突出关键词与搜索友好性。",
  },
  {
    key: "social",
    label: "TikTok / Instagram",
    brief:
      "生成一条 TikTok / Instagram 短视频带货脚本与配文，包含：开头 3 秒强钩子、口播脚本要点、以及 8-12 个相关话题标签 (hashtags)。语言口语化、适合短视频节奏。",
  },
  {
    key: "edm",
    label: "EDM 营销邮件",
    brief:
      "生成一封营销邮件 (EDM)，包含：一个高打开率的邮件主题行 (subject line)、问候开场、产品价值正文、明确的行动号召 (CTA) 按钮文案。结构清晰、利于转化。",
  },
]

function buildPrompt(
  platformBrief: string,
  input: { productName: string; features: string; market: string; tone: string },
) {
  const market = MARKET_MAP[input.market] ?? MARKET_MAP["us-en"]
  const tone = TONE_MAP[input.tone] ?? TONE_MAP["passion"]
  return `你是一名资深跨境电商营销文案专家。请基于以下产品信息撰写文案。

产品名称：${input.productName || "（未填写）"}
核心卖点：${input.features || "（未填写）"}
目标市场：${market.name}
输出语言：请全程使用「${market.lang}」撰写文案正文。
语气风格：${tone}

任务：${platformBrief}

要求：直接输出文案正文，不要解释你在做什么，不要添加多余的前言或结语。使用清晰的分段。`
}

router.post("/api/generate", async (ctx) => {
  const input = (ctx.request.body ?? {}) as {
    productName?: string
    features?: string
    market?: string
    tone?: string
  }

  const payload = {
    productName: input.productName ?? "",
    features: input.features ?? "",
    market: input.market ?? "us-en",
    tone: input.tone ?? "passion",
  }

  ctx.set("Content-Type", "text/event-stream")
  ctx.set("Cache-Control", "no-cache, no-transform")
  ctx.set("Connection", "keep-alive")
  ctx.set("X-Accel-Buffering", "no")
  ctx.status = 200

  const stream = new PassThrough()
  ctx.body = stream

  const send = (event: object) => {
    stream.write(`data: ${JSON.stringify(event)}\n\n`)
  }

  // Kick off all three platforms in parallel, streaming deltas tagged by platform.
  await Promise.all(
    PLATFORMS.map(async (platform) => {
      send({ type: "start", platform: platform.key, label: platform.label })
      try {
        const result = streamText({
          model: gateway(MODEL),
          prompt: buildPrompt(platform.brief, payload),
        })
        for await (const delta of result.textStream) {
          send({ type: "delta", platform: platform.key, delta })
        }
        send({ type: "done", platform: platform.key })
      } catch (err) {
        send({
          type: "error",
          platform: platform.key,
          message: err instanceof Error ? err.message : "生成失败",
        })
      }
    }),
  )

  send({ type: "all-done" })
  stream.end()
})

const PORT = Number(process.env.API_PORT ?? 8787)
app.use(bodyParser())
app.use(router.routes()).use(router.allowedMethods())
app.listen(PORT, () => {
  console.log(`[v0] Koa SSE 服务已启动: http://localhost:${PORT}`)
})
