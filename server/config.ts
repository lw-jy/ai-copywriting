import "dotenv/config"
import { getLogger } from "./utils/logger"

const log = getLogger("config")

/* ---------- 服务配置 ---------- */

/** API 监听端口，默认 8787（与 vite proxy 一致） */
export const PORT = parseInt(process.env.PORT || "8787", 10)

/** OpenAI / DeepSeek API Key，留空则启用 Mock 模式 */
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ""

/** 是否使用 Mock 模式（没有 API Key 时自动启用） */
export const USE_MOCK = !OPENAI_API_KEY

log.info(`运行模式: ${USE_MOCK ? "🟡 Mock（示例文案）" : "🟢 AI（真实生成）"}`)
log.info(`API Key ${USE_MOCK ? "未配置" : `已配置 (${OPENAI_API_KEY.slice(0, 8)}...)`}`)

/* ---------- 辅助转换 ---------- */

const marketMap: Record<string, string> = {
  "us-en": "US English",
  "zh-cn": "Simplified Chinese",
  "jp-ja": "Japanese",
  "de-de": "German",
}

const toneMap: Record<string, string> = {
  passion: "enthusiastic and passion-driven",
  professional: "professional and authoritative",
  humor: "funny and engaging",
}

/** market 标识 → 语言标签 */
export function getMarketLabel(market: string): string {
  return marketMap[market] || "English"
}

/** tone 标识 → 风格描述 */
export function getToneLabel(tone: string): string {
  return toneMap[tone] || "enthusiastic"
}
