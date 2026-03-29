import {Schema, model} from "mongoose";
import {IChatMember} from "../types/chatMemberType";

const chatMemberSchema = new Schema<IChatMember>(
    {
        user: {type: Schema.Types.ObjectId, ref: "user"},
        chat: {type: Schema.Types.ObjectId, ref: "chat"},
        unreadCount: {type: Number, default: 0},
        lastReadAt: {type: Date, default: Date.now},
    },
    {timestamps: true}
);

chatMemberSchema.index({chat: 1, lastSeen: 1});
const ChatMember = model<IChatMember>("chatMember", chatMemberSchema);

export default ChatMember;
