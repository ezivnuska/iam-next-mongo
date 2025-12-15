// app/lib/models/user.ts

// Prevent execution on client side
if (typeof window !== 'undefined') {
  throw new Error('Server-only module');
}

import mongoose, { Schema, Model } from "mongoose";
import { UserDocument, UserRole } from "@/app/lib/definitions/user";

const UserSchema = new Schema<UserDocument>(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.User },
    bio: { type: String, default: "" },
    avatar: { type: Schema.Types.ObjectId, ref: "Image", default: null },
    password: { type: String, required: true },
    verified: { type: Boolean, default: false },
    verifyToken: String,
    verifyTokenExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  {
    timestamps: true,
    toJSON: {
    //   virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        if (ret.avatar && typeof ret.avatar === "object" && "_id" in ret.avatar) {
            ret.avatar = {
              _id: ret.avatar._id.toString(),
              variants: ret.avatar.variants,
            };
        }
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

const UserModel: Model<UserDocument> =
  mongoose.models.User || mongoose.model<UserDocument>("User", UserSchema);

export default UserModel;
