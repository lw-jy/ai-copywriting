import mongoose, { Schema, type Document } from "mongoose"

export interface BookmarkDocument extends Document {
  userId: string
  productName: string
  platform: string
  title: string
  body: string
  rawContent: string
  createdAt: Date
}

const bookmarkSchema = new Schema<BookmarkDocument>({
  userId: { type: String, required: true, index: true },
  productName: { type: String, required: true },
  platform: { type: String, required: true, enum: ["amazon", "social", "edm", "douyin", "xiaohongshu"] },
  title: { type: String, default: "" },
  body: { type: String, default: "" },
  rawContent: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
})

export const Bookmark = mongoose.model<BookmarkDocument>("Bookmark", bookmarkSchema)
