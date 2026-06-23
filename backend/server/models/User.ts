import mongoose, { Schema, type Document } from "mongoose"
import bcrypt from "bcrypt"

export interface UserDocument extends Document {
  username: string
  password: string
  createdAt: Date
  comparePassword(candidate: string): Promise<boolean>
}

const userSchema = new Schema<UserDocument>({
  username: { type: String, required: true, unique: true, trim: true, minlength: 2 },
  password: { type: String, required: true, minlength: 6 },
  createdAt: { type: Date, default: Date.now },
})

// 保存前自动加密密码
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

// 对比密码
userSchema.methods.comparePassword = async function (candidate: string) {
  return bcrypt.compare(candidate, this.password)
}

export const User = mongoose.model<UserDocument>("User", userSchema)
