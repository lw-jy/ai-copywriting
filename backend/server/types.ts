/** 支持的目标平台 */
export type Platform = "amazon" | "social" | "edm" | "douyin" | "xiaohongshu"

/** 前端传入的生成请求参数 */
export interface GenerateInput {
  productName: string
  features: string
  market: string
  tone: string
  platforms?: Platform[]
  /** 用户自定义 API Key（可选，覆盖 .env 配置） */
  apiKey?: string
  /** 用户自定义 API 基础地址（可选，默认 DeepSeek） */
  baseUrl?: string
  /** 用户自定义模型名（可选，默认 deepseek-v4-flash） */
  model?: string
}

/** SSE 事件体（透传给前端） */
export type SSEEvent =
  | { type: "start"; platform: Platform }
  | { type: "delta"; platform: Platform; delta: string }
  | { type: "done"; platform: Platform }
  | { type: "error"; platform: Platform; message: string }
  | { type: "all-done" }
