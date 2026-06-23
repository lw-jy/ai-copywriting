import mongoose, { Schema, type Document } from "mongoose";

export interface RuleDocument extends Document {
  platform: string;
  rules: string[];
  outputTitle: string;
  outputBody: string;
  updatedBy: string;
  updatedAt: Date;
}

const ruleSchema = new Schema<RuleDocument>({
  platform: { type: String, required: true, unique: true, enum: ["amazon", "social", "edm", "douyin", "xiaohongshu"] },
  rules: [{ type: String }],
  outputTitle: { type: String, default: "" },
  outputBody: { type: String, default: "" },
  updatedBy: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});

export const Rule = mongoose.model<RuleDocument>("Rule", ruleSchema);
