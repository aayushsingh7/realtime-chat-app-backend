import {Schema, model} from "mongoose";
import {IMessage} from "../types/messageType";

const messageSchema: Schema = new Schema<IMessage>(
    {
        sender: {type: Schema.Types.ObjectId, ref: "user"},
        msgType: {type: String, default: "text"},
        message: {type: String, default: "string"},
        reactEmoji: [
            {
                user: {type: Schema.Types.ObjectId, ref: "user"},
                emoji: {type: String},
            },
        ],
        document: {type: Boolean, false: false},
        actor: {
            _id: {type: Schema.Types.ObjectId},
            name: {type: String},
        },
        target: {
            _id: {type: Schema.Types.ObjectId},
            name: {type: String},
        },
        fileName: {type: String, default: null},
        caption: {type: String, default: null},
        isReply: {type: Boolean, default: false},
        repliedTo: {
            type: Schema.Types.ObjectId,
            ref: "message",
            default: null,
        },
        fileSize: {type: Number, default: 0},
        chat: {type: Schema.Types.ObjectId, ref: "chat"},
    },
    {timestamps: true}
);

messageSchema.index({chat: 1, "reactEmoji.user": 1, createdAt: -1});

const Message = model<IMessage>("message", messageSchema);

export default Message;
