import { model, Schema } from "mongoose";
import { IChat } from "../types/chatType";

const chatSchema = new Schema<IChat>(
    {
        isGroupChat: {type: Boolean, default: false},
        admins: [{type: Schema.Types.ObjectId, ref: "user", default: []}],
        users: [{type: Schema.Types.ObjectId, ref: "user", default: []}],
        latestMessage: {
            type: Schema.Types.ObjectId,
            ref: "message",
        },
        createdBy: {type: Schema.Types.ObjectId, ref: "user"},
        image: {
            type: String,
            default: "https://i.pinimg.com/474x/ec/e2/b0/ece2b0f541d47e4078aef33ffd22777e.jpg",
        },
        name: {type: String, default: "user-chat"},
        description: {type: String, default: ""},
        removedUsers: {
            type: Map,
            of: Date,
        },
        theme: {
            URL: {
                type: String,
                default: "https://i.pinimg.com/736x/ba/c8/15/bac815fbeff16270f635ad30c00d71f6.jpg",
            },
            name: {type: String, default: "Group Chat"},
        },
    },
    {timestamps: true}
);

chatSchema.index({users: 1, isGroupChat: 1});

const Chat = model<IChat>("chat", chatSchema);

export default Chat;
