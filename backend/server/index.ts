/**
 * 电商 AI 文案矩阵生成器 — API 服务入口
 *
 * 启动方式： tsx watch server/index.ts        # 开发模式（热重载）
 *            tsx server/index.ts               # 生产模式
 *
 * 两种运行模式：
 *   Mock（默认） — 无需 API Key，生成示例文案用于预览 UI
 *   AI（需配 Key）— 设置 OPENAI_API_KEY 后调用 OpenAI 生成真实文案
 */

import Koa from "koa";
import bodyParser from "koa-bodyparser";
import serve from "koa-static";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import router from "./router";
import { PORT, USE_MOCK } from "./config";
import { connectDB } from "./db";
import { getLogger } from "./utils/logger";

const log = getLogger("server");

/* ---------- 应用组装 ---------- */

const app = new Koa();

// 生产环境：托管前端静态文件（public/ 目录）
const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "..", "public");
app.use(serve(publicDir));

app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

/* ---------- 启动（先连数据库，再监听端口） ---------- */

const MAX_RETRIES = 5;
const RETRY_DELAY = 600;

async function startServer() {
  // 先连 MongoDB（生产环境必须连上，开发环境可跳过）
  const dbOk = await connectDB();
  const isProd = process.env.NODE_ENV === "production";
  if (!dbOk && isProd) {
    log.error("MongoDB 连接失败，服务退出");
    process.exit(1);
  }

  // 再启动 HTTP
  tryStart(MAX_RETRIES);
}

function tryStart(retriesLeft: number) {
  const server = app.listen(PORT);

  server.on("listening", () => {
    log.info(`━━━ AI Copywriting API ━━━`);
    log.info(`📡  http://localhost:${PORT}`);
    if (!USE_MOCK) log.info(`🟢 AI 模式启用`);
    log.info(`按 Ctrl+C 停止服务`);
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE" && retriesLeft > 0) {
      log.warn(`端口 ${PORT} 被占用，${RETRY_DELAY}ms 后重试 (剩余 ${retriesLeft} 次)...`);
      server.close();
      setTimeout(() => tryStart(retriesLeft - 1), RETRY_DELAY);
    } else {
      log.error(`服务启动失败: ${err.message}`);
      process.exit(1);
    }
  });

  /* ---------- 优雅关闭 ---------- */

  function gracefulShutdown(signal: string) {
    log.info(`收到 ${signal}，正在关闭服务...`);
    server.close(() => {
      log.info("服务已停止，端口已释放");
      process.exit(0);
    });
    setTimeout(() => {
      log.warn("强制退出");
      process.exit(1);
    }, 5000);
  }

  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
}

startServer();
