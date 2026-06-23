import type { SSEEvent } from "../types"

/**
 * 向客户端写入一条 SSE 事件（data: ...\n\n）。
 * 使用 ctx.res.write 直接写入原始响应流，绕过 Koa 的 body 处理。
 */
export function writeSSE(ctx: { res: { write: (chunk: string) => void } }, event: SSEEvent) {
  ctx.res.write(`data: ${JSON.stringify(event)}\n\n`)
}
