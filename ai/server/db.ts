import mongoose from "mongoose"
import { getLogger } from "./utils/logger"

const log = getLogger("db")

const MONGODB_URI = process.env.MONGODB_URI || ""

export async function connectDB() {
  if (!MONGODB_URI) {
    log.warn("MONGODB_URI 未配置，收藏功能不可用")
    return false
  }

  try {
    await mongoose.connect(MONGODB_URI)
    log.info("MongoDB 连接成功")
    return true
  } catch (err) {
    log.error("MongoDB 连接失败:", err)
    return false
  }
}
