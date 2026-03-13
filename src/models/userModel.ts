import { Schema, model } from "mongoose";
import IUser from "../types/userType";

const userModel = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    image: {
      type: String,
      default:
        "https://res.cloudinary.com/dvk80x6fi/image/upload/v1773416425/ece2b0f541d47e4078aef33ffd22777e_gd6ski.jpg",
    },
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: "user" }],
    starredMessages: [{ type: Schema.Types.ObjectId, ref: "message" }],
    clearedChats: {
      type: Map,
      of: Date,
    },
    deletedChats: {
      type: Map,
      of: Date,
    },
    onlineStatus: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now},
    description: { type: String, default: "" },
    role: { type: String, default: "user" },
    username: { type: String, default: "" },
    slogan: { type: String, default: "Hey there! i am using ChatVerse😊." },
    activeStatus: { type: Boolean, default: false },
    status: { type: Schema.Types.ObjectId, ref: "status" },
  },
  { timestamps: true }
);

const User = model<IUser>("user", userModel);

export default User;
