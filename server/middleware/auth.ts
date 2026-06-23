import type { ParameterizedContext, Next } from "koa"
import jwt from "jsonwebtoken"
import { getLogger } from "../utils/logger"

const log = getLogger("auth")
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret"

export interface AuthState {
  userId: string
  username: string
}

/**
 * JWT 验证中间件
 * 从 Authorization header 取 token，验证后把 userId / username 写入 ctx.state
 */
export async function authMiddleware(ctx: ParameterizedContext, next: Next) {
  const header = ctx.headers.authorization
  if (!header || !header.startsWith("Bearer ")) {
    ctx.status = 401
    ctx.body = { error: "未登录，请先登录" }
    return
  }

  const token = header.slice(7)

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthState
    ctx.state.userId = payload.userId
    ctx.state.username = payload.username
    await next()
  } catch (err) {
    log.warn("Token 验证失败")
    ctx.status = 401
    ctx.body = { error: "登录已过期，请重新登录" }
  }
}
