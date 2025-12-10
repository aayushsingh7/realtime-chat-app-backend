import { Schema, model } from "mongoose";

const chatMemberSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "user" },
  chat: { type: Schema.Types.ObjectId, ref: "chat" },
  unreadCount: { type: Number, default: 0 },
  lastSeenMessage:{type:Schema.Types.ObjectId, ref:"message"},
},{timestamps:true});

chatMemberSchema.index({chat:1, lastSeenMessage: 1})
const ChatMember = model("chatMember", chatMemberSchema);


export default ChatMember;
