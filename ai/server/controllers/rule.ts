import type { ParameterizedContext } from "koa";
import { Rule } from "../models/Rule";
import { getLogger } from "../utils/logger";

const log = getLogger("rule");

function getUserId(ctx: ParameterizedContext): string {
  return (ctx.state as any).userId as string;
}

/** GET /api/rules/:platform — 获取某平台规则 */
export async function getRule(ctx: ParameterizedContext) {
  const { platform } = ctx.params as { platform: string };
  try {
    const doc = await Rule.findOne({ platform }).lean();
    ctx.body = doc || null;
  } catch (err) {
    log.error(`查询规则失败 [${platform}]:`, err);
    ctx.status = 500;
    ctx.body = { error: "查询规则失败" };
  }
}

/** PUT /api/rules/:platform — 保存规则 */
export async function saveRule(ctx: ParameterizedContext) {
  const userId = getUserId(ctx);
  const { platform } = ctx.params as { platform: string };
  const { rules, outputTitle, outputBody } = ctx.request.body as {
    rules?: string[];
    outputTitle?: string;
    outputBody?: string;
  };

  try {
    const doc = await Rule.findOneAndUpdate(
      { platform },
      {
        platform,
        rules: rules || [],
        outputTitle: outputTitle || "",
        outputBody: outputBody || "",
        updatedBy: userId,
        updatedAt: new Date(),
      },
      { upsert: true, new: true },
    );
    log.info(`规则已保存 [${platform}]`);
    ctx.body = doc;
  } catch (err) {
    log.error(`保存规则失败 [${platform}]:`, err);
    ctx.status = 500;
    ctx.body = { error: "保存规则失败" };
  }
}

/** POST /api/rules/upload-text/:platform — 上传文本内容解析规则 */
export async function uploadRuleText(ctx: ParameterizedContext) {
  const userId = getUserId(ctx);
  const { platform } = ctx.params as { platform: string };
  const { content } = ctx.request.body as { content?: string };

  if (!content || !content.trim()) {
    ctx.status = 400;
    ctx.body = { error: "内容不能为空" };
    return;
  }

  try {
    const lines = content
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && !l.startsWith("---"));

    let outputTitle = "";
    let outputBody = "";
    for (const line of lines.slice(0, 5)) {
      const t = line.replace(/^(标题|Title)：/, "").trim();
      if (t !== line) outputTitle = t;
      const b = line.replace(/^(正文|Body)：/, "").trim();
      if (b !== line) outputBody = b;
    }

    const rules = lines.filter(
      (l) => !/^(标题|Title|正文|Body)：/.test(l),
    );

    const doc = await Rule.findOneAndUpdate(
      { platform },
      { platform, rules, outputTitle, outputBody, updatedBy: userId, updatedAt: new Date() },
      { upsert: true, new: true },
    );

    log.info(`文本规则已解析并保存 [${platform}]`);
    ctx.body = doc;
  } catch (err) {
    log.error(`文本解析失败 [${platform}]:`, err);
    ctx.status = 500;
    ctx.body = { error: "解析失败" };
  }
}
