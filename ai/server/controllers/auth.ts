import type { ParameterizedContext } from "koa"
import jwt from "jsonwebtoken"
import { User } from "../models/User"
import { getLogger } from "../utils/logger"

const log = getLogger("auth")
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret"

/** POST /api/auth/register — 注册 */
export async function register(ctx: ParameterizedContext) {
  const { username, password } = ctx.request.body as {
    username?: string
    password?: string
  }

  if (!username || !password) {
    ctx.status = 400
    ctx.body = { error: "用户名和密码不能为空" }
    return
  }

  if (username.length < 2) {
    ctx.status = 400
    ctx.body = { error: "用户名至少 2 个字符" }
    return
  }

  if (password.length < 6) {
    ctx.status = 400
    ctx.body = { error: "密码至少 6 个字符" }
    return
  }

  try {
    const existing = await User.findOne({ username })
    if (existing) {
      ctx.status = 409
      ctx.body = { error: "用户名已存在" }
      return
    }

    const user = await User.create({ username, password })
    const token = jwt.sign({ userId: user._id, username }, JWT_SECRET, { expiresIn: "7d" })

    log.info(`新用户注册: ${username}`)
    ctx.status = 201
    ctx.body = { token, user: { id: user._id, username } }
  } catch (err) {
    log.error("注册失败:", err)
    ctx.status = 500
    ctx.body = { error: "注册失败" }
  }
}

/** POST /api/auth/login — 登录 */
export async function login(ctx: ParameterizedContext) {
  const { username, password } = ctx.request.body as {
    username?: string
    password?: string
  }

  if (!username || !password) {
    ctx.status = 400
    ctx.body = { error: "用户名和密码不能为空" }
    return
  }

  try {
    const user = await User.findOne({ username })
    if (!user) {
      ctx.status = 401
      ctx.body = { error: "用户名或密码错误" }
      return
    }

    const ok = await user.comparePassword(password)
    if (!ok) {
      ctx.status = 401
      ctx.body = { error: "用户名或密码错误" }
      return
    }

    const token = jwt.sign({ userId: user._id, username }, JWT_SECRET, { expiresIn: "7d" })

    log.info(`用户登录: ${username}`)
    ctx.body = { token, user: { id: user._id, username } }
  } catch (err) {
    log.error("登录失败:", err)
    ctx.status = 500
    ctx.body = { error: "登录失败" }
  }
}

/** GET /api/auth/me — 验证 token 并返回用户信息 */
export async function me(ctx: ParameterizedContext) {
  // 中间件已经验证了 token，ctx.state 里有 userId 和 username
  ctx.body = {
    user: {
      id: (ctx.state as any).userId,
      username: (ctx.state as any).username,
    },
  }
}
