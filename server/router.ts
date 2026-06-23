import Router from "@koa/router"
import { handleGenerate } from "./controllers/generate"
import { listBookmarks, createBookmark, deleteBookmark } from "./controllers/bookmark"
import { register, login, me } from "./controllers/auth"
import { getRule, saveRule, uploadRuleText } from "./controllers/rule"
import { authMiddleware } from "./middleware/auth"

const router = new Router()

/* 文案生成 — SSE 流式接口（不需要登录） */
router.post("/api/generate", handleGenerate)

/* 认证 — 不需要登录 */
router.post("/api/auth/register", register)
router.post("/api/auth/login", login)

/* 用户信息 — 需要登录 */
router.get("/api/auth/me", authMiddleware, me)

/* 收藏 — 全部需要登录 */
router.get("/api/bookmarks", authMiddleware, listBookmarks)
router.post("/api/bookmarks", authMiddleware, createBookmark)
router.delete("/api/bookmarks/:id", authMiddleware, deleteBookmark)

/* 规则管理 — 需要登录 */
router.get("/api/rules/:platform", authMiddleware, getRule)
router.put("/api/rules/:platform", authMiddleware, saveRule)
router.post("/api/rules/upload-text/:platform", authMiddleware, uploadRuleText)

export default router
