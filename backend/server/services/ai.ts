import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Platform, GenerateInput } from "../types";
import { OPENAI_API_KEY, getMarketLabel, getToneLabel } from "../config";
import { Rule } from "../models/Rule";
import { getLogger } from "../utils/logger";

const log = getLogger("ai");

/* ---------- 加载默认平台规则 JSON ---------- */

interface PlatformRule {
  description: string;
  outputTitle: string;
  outputBody: string;
  rules: string[];
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const rulesPath = join(__dirname, "..", "config", "platform-rules.json");
const defaultRules: Record<string, PlatformRule> = JSON.parse(
  readFileSync(rulesPath, "utf-8"),
);

/* ---------- 规则加载：DB（用户自定义）→ JSON（默认）---------- */

async function getRulesForPlatform(platform: string): Promise<{
  outputTitle: string;
  outputBody: string;
  rules: string[];
}> {
  // 尝试从 DB 加载用户自定义规则
  try {
    const doc = await Rule.findOne({ platform }).lean();
    if (doc && doc.rules.length > 0) {
      return {
        outputTitle: doc.outputTitle || defaultRules[platform]?.outputTitle || "",
        outputBody: doc.outputBody || defaultRules[platform]?.outputBody || "",
        rules: doc.rules,
      };
    }
  } catch {
    // DB 不可用时静默降级到默认规则
  }

  // 降级到默认 JSON 规则
  const def = defaultRules[platform];
  return {
    outputTitle: def?.outputTitle || "",
    outputBody: def?.outputBody || "",
    rules: def?.rules || [],
  };
}

/* ---------- Prompt 构建 ---------- */

const SYSTEM_PROMPT =
  "You are a professional e-commerce copywriter. " +
  "You MUST output ONLY in the language specified by the user (e.g. 'Simplified Chinese' means ALL text must be Chinese). " +
  "You MUST format your output with ---TITLE--- and ---BODY--- markers.";

/** 将规则数组格式化为 bullet list */
function formatRules(rules: string[]): string {
  return rules.map((r) => `  • ${r}`).join("\n");
}

/** 每个平台的基础 prompt 结构（不含格式标记，格式标记在外部统一拼接） */
function basePrompt(
  platform: Platform,
  lang: string,
  style: string,
  productName: string,
  features: string,
): string {
  const templates: Record<Platform, string> = {
    amazon: `Generate an Amazon product listing in ${lang} with a ${style} tone. ALL output text MUST be in ${lang}.

Product: ${productName}
Key Features: ${features}

Please include:
1. A compelling product title (include main keywords)
2. 5 bullet-point features with benefits
3. Relevant search terms / backend keywords`,

    social: `Write a TikTok/Instagram video script in ${lang} with a ${style} tone. ALL output text MUST be in ${lang} for promoting:

Product: ${productName}
Key Features: ${features}

The script should include:
1. A hook (first 3 seconds)
2. Body content showcasing features
3. A clear call-to-action
4. Caption with hashtags

Make it engaging and platform-appropriate.`,

    edm: `Write an EDM marketing email in ${lang} with a ${style} tone. ALL output text MUST be in ${lang} for:

Product: ${productName}
Key Features: ${features}

Include:
1. Catchy subject line
2. Preheader text
3. Email body (personalized, benefit-focused)
4. Clear CTA button text

Keep it concise and conversion-focused.`,

    douyin: `Write a Douyin (TikTok China) short video script in ${lang} with a ${style} tone. ALL output text MUST be in ${lang} for promoting:

Product: ${productName}
Key Features: ${features}

The script should include:
1. An attention-grabbing hook (first 3 seconds)
2. Product showcase with feature highlights
3. A compelling call-to-action
4. Hashtags

Keep it fast-paced and engaging for short video format.`,

    xiaohongshu: `Write a Xiaohongshu (Little Red Book) style 种草 note in ${lang} with a ${style} tone. ALL output text MUST be in ${lang} for promoting:

Product: ${productName}
Key Features: ${features}

The note should include:
1. An eye-catching title
2. Personal experience sharing tone
3. Feature highlights with emojis
4. Hashtags

Make it authentic and relatable like a real user review.`,
  };

  return templates[platform] || templates.amazon;
}

async function buildPrompt(platform: Platform, input: GenerateInput): Promise<string> {
  const { productName, features, market, tone } = input;
  const lang = getMarketLabel(market);
  const style = getToneLabel(tone);

  // 基础 prompt 结构
  const base = basePrompt(platform, lang, style, productName, features);

  // 从 DB（优先）或 JSON（降级）加载平台规则
  const cfg = await getRulesForPlatform(platform);
  if (cfg && cfg.rules.length > 0) {
    return (
      base +
      `\n\n⚠️ 平台规则 — 必须遵守：\n${formatRules(cfg.rules)}\n\n` +
      `You MUST output using EXACTLY this format with the markers on their own lines:\n` +
      `---TITLE---\n<${cfg.outputTitle}>\n---BODY---\n<${cfg.outputBody}>`
    );
  }

  return base;
}

/**
 * 调 DeepSeek API，流式收数据，逐个 token 吐出
 *
 * async function* = 异步生成器
 *   async     → 内部可以用 await 等 DeepSeek 返回
 *   function* → 内部可以用 yield 暂停 + 向外递数据
 *   调用者用 for await...of 消费，每次拿到一个 string
 */
export async function* streamOpenAI(
  prompt: string,
  opts?: { apiKey?: string; baseUrl?: string; model?: string },
): AsyncGenerator<string> {
  const apiKey = opts?.apiKey || OPENAI_API_KEY;
  const baseUrl = (opts?.baseUrl || "https://api.deepseek.com").replace(/\/+$/, "");
  const model = opts?.model || "deepseek-v4-flash";
  const url = `${baseUrl}/chat/completions`;

  log.info(`API 请求 → ${url}`);
  log.debug(`Prompt (前 120 字): ${prompt.slice(0, 120)}...`);

  // ① 发 POST 请求，stream:true 让模型一边生成一边推
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });

  // ② 请求失败 → 按状态码区分原因
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "unknown error");
    log.error(`API 错误 ${res.status}: ${text}`);

    if (res.status === 401) {
      throw Object.assign(new Error("API Key 无效或已过期，请在 .env 中配置有效的 Key"), { code: "AUTH_ERROR" });
    }
    if (res.status === 402 || res.status === 429) {
      throw Object.assign(new Error("API 额度不足，请充值后重试"), { code: "QUOTA_EXCEEDED" });
    }
    if (res.status >= 500) {
      throw Object.assign(new Error("AI 服务暂时不可用，请稍后重试"), { code: "SERVER_ERROR" });
    }
    throw Object.assign(new Error(`AI 接口异常 (${res.status})`), { code: "UNKNOWN" });
  }

  // ③ 准备从流里读数据
  const reader = res.body.getReader(); // 读取器，每次 .read() 取一段二进制
  const decoder = new TextDecoder(); // 把二进制 (Uint8Array) 转成字符串
  let buffer = ""; // 拼合被截断的行（一个 token 可能被拆到两个包里）

  // ④ 循环读，直到 DeepSeek 把数据全发完
  while (true) {
    const { done, value } = await reader.read(); // 等 DeepSeek 发下一段
    if (done) break; // done=true → 流结束了

    // ⑤ 把拿到的二进制追加到 buffer 里
    //    { stream: true } 避免中文字被切一半时乱码
    buffer += decoder.decode(value, { stream: true });

    // ⑥ 按换行符拆行
    //    DeepSeek 的 SSE 格式：
    //      data: {"choices":[{"delta":{"content":"🔥"}}]}
    //      (空行)
    //      data: {"choices":[{"delta":{"content":"蓝"}}]}
    //    最后一行可能没结束，pop 出来留到下次拼
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    // ⑦ 逐行解析
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue; // 跳过空行等无关行
      const data = trimmed.slice(5).trim(); // 去掉 "data:" 前缀

      // ⑧ 结束标记
      if (data === "[DONE]") return;

      // ⑨ 解析 JSON，取出 content
      try {
        const parsed = JSON.parse(data);
        // choices[0].delta.content 就是 DeepSeek 这次吐的 token
        const content = parsed.choices?.[0]?.delta?.content ?? "";

        // ⑩ yield → 把 token 递出去，暂停，等调用者取走
        //    调用者（controller）通过 for await...of 接到这个 token
        //    然后 writeSSE 推给前端
        if (content) yield content;
      } catch {
        /* 非标准 JSON 行就跳过 */
      }
    }
  }
}

/* ---------- 导出 ---------- */

export { buildPrompt };
