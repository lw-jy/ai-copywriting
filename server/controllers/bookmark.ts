import type { ParameterizedContext } from "koa"
import { Bookmark } from "../models/Bookmark"
import { getLogger } from "../utils/logger"

const log = getLogger("bookmark")

/** 从 ctx.state 取当前用户 ID */
function getUserId(ctx: ParameterizedContext): string {
  return (ctx.state as any).userId as string
}

/** GET /api/bookmarks — 获取当前用户的所有收藏 */
export async function listBookmarks(ctx: ParameterizedContext) {
  const userId = getUserId(ctx)
  try {
    const items = await Bookmark.find({ userId }).sort({ createdAt: -1 }).lean()
    ctx.body = items
  } catch (err) {
    log.error("查询收藏失败:", err)
    ctx.status = 500
    ctx.body = { error: "查询收藏失败" }
  }
}

/** POST /api/bookmarks — 添加收藏 */
export async function createBookmark(ctx: ParameterizedContext) {
  const userId = getUserId(ctx)
  const { productName, platform, title, body, rawContent } = ctx.request.body as {
    productName?: string
    platform?: string
    title?: string
    body?: string
    rawContent?: string
  }

  if (!platform) {
    ctx.status = 400
    ctx.body = { error: "缺少 platform 参数" }
    return
  }

  try {
    const item = await Bookmark.create({ userId, productName, platform, title, body, rawContent })
    ctx.status = 201
    ctx.body = item
  } catch (err) {
    log.error("添加收藏失败:", err)
    ctx.status = 500
    ctx.body = { error: "添加收藏失败" }
  }
}

/** DELETE /api/bookmarks/:id — 取消收藏（只能删自己的） */
export async function deleteBookmark(ctx: ParameterizedContext) {
  const userId = getUserId(ctx)
  const { id } = ctx.params as { id: string }

  try {
    const deleted = await Bookmark.findOneAndDelete({ _id: id, userId })
    if (!deleted) {
      ctx.status = 404
      ctx.body = { error: "收藏不存在" }
      return
    }
    ctx.status = 200
    ctx.body = { message: "已取消收藏" }
  } catch (err) {
    log.error("删除收藏失败:", err)
    ctx.status = 500
    ctx.body = { error: "删除收藏失败" }
  }
}
