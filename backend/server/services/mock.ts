import type { Platform, GenerateInput } from "../types"
import { getLogger } from "../utils/logger"

const log = getLogger("mock")

/* ---------- 语言工具 ---------- */

function isZh(market: string): boolean {
  return market === "zh-cn"
}

function getBenefit(feature: string, market: string): string {
  const benefits = isZh(market)
    ? ["省时省力", "效果专业", "舒适体验", "坚固耐用", "轻松上手", "新手老手都适合", "绿色环保", "融入日常", "万人好评", "物超所值"]
    : ["Saves you time and effort", "Delivers professional results", "Designed for maximum comfort",
       "Built to last with premium materials", "Makes everyday tasks easier", "Perfect for both beginners and pros",
       "Eco-friendly and sustainable", "Seamlessly integrates into your routine",
       "Backed by thousands of happy customers", "Offers exceptional value for money"]
  return benefits[Math.abs(hashCode(feature)) % benefits.length]
}

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

const FALLBACK_FEATURES_EN = ["Premium Quality", "User-Friendly Design", "Versatile Functionality", "Reliable Performance", "Great Value"]
const FALLBACK_FEATURES_ZH = ["优质材料", "操作便捷", "功能多样", "性能可靠", "物超所值"]

function getFallback(i: number, market: string): string {
  return isZh(market) ? FALLBACK_FEATURES_ZH[i] : FALLBACK_FEATURES_EN[i]
}

function ff(market: string): string[] {
  return isZh(market) ? FALLBACK_FEATURES_ZH : FALLBACK_FEATURES_EN
}

function pickFeature(featureList: string[], i: number, market: string): string {
  return featureList[i] ?? getFallback(i, market)
}

/* ---------- 翻译辅助 ---------- */

function t(market: string, en: string, zh: string): string {
  return isZh(market) ? zh : en
}

/* ---------- 各平台生成 ---------- */

function generateAmazon(input: GenerateInput, featureList: string[]): string {
  const zh = isZh(input.market)
  const m = input.market
  const title = zh
    ? `🔥 ${input.productName} – 品质生活之选`
    : `🔥 ${input.productName} – ${pickFeature(featureList, 0, m)} for Everyday Life`
  const falls = ff(m)
  const bullets = featureList.length
    ? featureList.map((f, i) => `${i + 1}. ✅ ${f} – ${getBenefit(f, m)}`).join("\n")
    : falls.map((f, i) => `${i + 1}. ✅ ${f}`).join("\n")

  const body = [
    zh ? `**📌 标题**: ${title}` : `**📌 Title**: ${title}`,
    "",
    `**${t(m, "Product Features:", "产品卖点:")}**`,
    bullets,
    "",
    `**${t(m, "Search Terms:", "搜索关键词:")}**`,
    zh
      ? `${input.productName}, ${pickFeature(featureList, 0, m)}`
      : `${input.productName.toLowerCase().replace(/\s+/g, " ")}, ` +
        `${pickFeature(featureList, 0, m).toLowerCase()}, ` +
        `best ${input.productName.toLowerCase()}`,
  ].join("\n")

  return `---TITLE---\n${title}\n---BODY---\n${body}`
}

function generateSocial(input: GenerateInput, featureList: string[]): string {
  const zh = isZh(input.market)
  const m = input.market
  const title = zh
    ? `"姐妹们都给我冲！${input.productName} 绝了！😱"`
    : `"Wait until you see what ${input.productName} can do! 🤯"`
  const falls = ff(m)
  const bodyLines = (featureList.length ? featureList : falls.slice(0, 3))
    .slice(0, 3)
    .map((f) => `• ${zh ? `快速展示：${f}` : `Quick shot: ${f}`}`)
    .join("\n")

  const body = [
    zh ? "🎬 **TikTok / Instagram 短视频脚本**" : "🎬 **TikTok / Instagram Reel Script**",
    "",
    zh ? "⏱ 时长: 30-45秒" : "⏱ Duration: 30-45 seconds",
    zh ? "🎵 音乐: 热门卡点BGM" : "🎵 Music: Trending upbeat background",
    "",
    zh ? "**🎯 钩子 (0-3s):**" : "**🎯 Hook (0-3s):**",
    title,
    "",
    zh ? "**📖 展示 (3-25s):**" : "**📖 Body (3-25s):**",
    bodyLines,
    "",
    zh ? "**💥 引导 (25-30s):**" : "**💥 CTA (25-30s):**",
    zh
      ? `"点我头像进橱窗，速抢！🛒 #${input.productName.replace(/\s+/g, "")} #好物推荐"`
      : `"Link in bio to get yours! 🛒 #${input.productName.replace(/\s+/g, "")} #MustHave"`,
    "",
    zh ? "**📝 文案:**" : "**📝 Caption:**",
    zh
      ? `姐妹们！${input.productName} 真的太好用了！${featureList[0] ? "尤其是" + featureList[0] + "，太惊喜了！" : "赶紧入手！"}`
      : `Game changer alert! 🚀 ${input.productName} is everything you've been looking for.`,
    "",
    zh
      ? `#好物推荐 #必入款 #${input.productName.replace(/\s+/g, "")} #爆款`
      : `#fyp #productreview #musthave #${input.productName.replace(/\s+/g, "")} #trending`,
  ].join("\n")

  return `---TITLE---\n${title}\n---BODY---\n${body}`
}

function generateEdm(input: GenerateInput, featureList: string[]): string {
  const zh = isZh(input.market)
  const m = input.market
  const title = zh
    ? input.tone === "humor"
      ? `${input.productName} 还没入手？看完这篇你就冲了！😄`
      : input.tone === "professional"
        ? `新品首发 | ${input.productName} – 匠心之选`
        : `🔥 万众期待！${input.productName} 终于来了！`
    : input.tone === "humor"
      ? `Is your ${input.productName} missing? Here's why you need one ASAP 😄`
      : input.tone === "professional"
        ? `Introducing ${input.productName} – Engineered for Excellence`
        : `You've been waiting for ${input.productName} – It's finally here! 🔥`

  const falls = ff(m)
  const bodyDetail = (featureList.length ? featureList : falls.slice(0, 3))
    .map((f) => `${zh ? "✅" : "✓"} ${f}`)
    .join("\n")

  const body = zh
    ? [
        "✉️ **EDM 营销邮件**",
        "",
        `**📧 主题行:** ${title}`,
        "",
        "**👋 前言:**",
        `发现大家都在聊 ${input.productName}？今天我们正式介绍给你。`,
        "",
        "**📝 正文:**",
        "",
        "你好，",
        "",
        `很高兴向你推荐 **${input.productName}** —— 一款真正值得拥有的产品。`,
        "",
        "它为什么特别：",
        bodyDetail,
        "",
        "**为什么你会喜欢：**",
        "✓ 品质保障，值得信赖",
        "✓ 精心设计，贴合需求",
        ...(featureList.length ? [`✅ ${featureList[0]} – ${getBenefit(featureList[0], m)}`] : []),
        "",
        "**🎯 限时优惠**",
        "现在下单即享首发特价！",
        "",
        "[**立即购买 →**]",
        "",
        "此致敬礼",
        "团队",
      ].join("\n")
    : [
        "✉️ **EDM Marketing Email**",
        "",
        `**📧 Subject Line:** ${title}`,
        "",
        "**👋 Preheader:**",
        `Discover why everyone is talking about ${input.productName}.`,
        "",
        "**📝 Email Body:**",
        "",
        "Hi there,",
        "",
        `We're thrilled to introduce **${input.productName}** – the product you've been waiting for.`,
        "",
        "Here's what makes it special:",
        bodyDetail,
        "",
        "**Why you'll love it:**",
        "✓ Premium quality you can trust",
        "✓ Designed with your needs in mind",
        ...(featureList.length ? [`✓ ${featureList[0]} – ${getBenefit(featureList[0], m)}`] : []),
        "",
        "**🎯 Limited Time Offer**",
        "Order now and enjoy special launch pricing!",
        "",
        "[**Shop Now →**]",
        "",
        "Best regards,",
        "The Team",
      ].join("\n")

  return `---TITLE---\n${title}\n---BODY---\n${body}`
}

function generateDouyin(input: GenerateInput, featureList: string[]): string {
  const m = input.market
  const falls = ff(m)
  const title = `${input.productName} – 还没买？看完这条你就冲了！🔥`
  const bodyLines = (featureList.length ? featureList : falls.slice(0, 3))
    .slice(0, 3)
    .map((f) => `• ${f} – 这功能绝了`)
    .join("\n")

  const body = [
    `🎵 **抖音短视频脚本**`,
    "",
    "⏱ 时长: 15-30秒",
    "🎵 音乐: 热门卡点BGM",
    "",
    "**🔥 前3秒钩子:**",
    `"千万别划走！${input.productName} 真的太香了 😱"`,
    "",
    "**📖 展示 (3-20s):**",
    bodyLines,
    "",
    "**💥 引导 (20-25s):**",
    `"左下角小黄车已安排，冲就完了！🛒"`,
    "",
    "**📝 文案:**",
    `姐妹们冲！${input.productName} 真的太绝了！${featureList[0] ? featureList[0] + "，懂的都懂！" : ""}`,
    "",
    `#好物推荐 #必入款 #${input.productName.replace(/\s+/g, "")} #抖音爆款`,
  ].join("\n")

  return `---TITLE---\n${title}\n---BODY---\n${body}`
}

function generateXiaohongshu(input: GenerateInput, featureList: string[]): string {
  const m = input.market
  const falls = ff(m)
  const title = `🔥 挖到宝了！${input.productName} 真的太绝了❗`

  const detailLines = (featureList.length ? featureList : falls.slice(0, 4))
    .map((f) => `✅ ${f}`)
    .join("\n")

  const body = [
    "📕 **小红书种草笔记**",
    "",
    `**📌 标题:** ${title}`,
    "",
    "👋 哈喽大家！今天给大家分享一个我最近挖到的宝藏～",
    "",
    `就是这个 **${input.productName}**，真的后悔没早点买！`,
    "",
    "来给你们划重点👇",
    "",
    detailLines,
    "",
    "**💡 使用感受:**",
    "真的超出预期！做工很精致，用起来也很顺手，性价比超高👍",
    "",
    "**💰 价格:** 物超所值，闭眼入不亏！",
    "",
    "**📍 哪里买:** 戳左下角链接或直接搜关键词～",
    "",
    `#好物分享 #种草 #${input.productName.replace(/\s+/g, "")} #值得买 #宝藏好物`,
  ].join("\n")

  return `---TITLE---\n${title}\n---BODY---\n${body}`
}

/* ---------- 入口 ---------- */

const generators: Record<Platform, (input: GenerateInput, features: string[]) => string> = {
  amazon: generateAmazon,
  social: generateSocial,
  edm: generateEdm,
  douyin: generateDouyin,
  xiaohongshu: generateXiaohongshu,
}

/** 根据平台和输入生成示例文案（不需 API Key） */
export function generateMockContent(platform: Platform, input: GenerateInput): string {
  const featureList = input.features
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean)

  const result = generators[platform](input, featureList)
  log.debug(`平台=${platform} | 特征数=${featureList.length} | 输出长度=${result.length}`)
  return result
}
