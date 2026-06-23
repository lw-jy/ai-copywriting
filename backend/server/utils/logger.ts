import log4js from "log4js"

log4js.configure({
  appenders: {
    console: {
      type: "console",
      layout: {
        type: "pattern",
        // [时间] [级别] [分类] 消息
        pattern: "[%d{hh:mm:ss}] [%p] [%c] %m",
      },
    },
  },
  categories: {
    default: { appenders: ["console"], level: "debug" },
  },
})

export function getLogger(category: string) {
  return log4js.getLogger(category)
}
