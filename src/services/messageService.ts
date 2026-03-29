import CustomError from "../utils/customError";
import {Model} from "mongoose";
import {IAlertMessage, IMessage} from "../types/messageType";
import UserService from "./userService";
import {ObjectId} from "mongodb";

class MessageService {
    constructor(private readonly messageModel: Model<IMessage>) {}

    async addMessage(data: any) {
        const {message, msgType, chatId, file_url, fileName, document, fileSize, isReply, repliedTo, caption, userId} =
            data;

        const messageData = file_url || message;
        const newMessage = new this.messageModel({
            isReply,
            repliedTo: isReply ? repliedTo : null,
            sender: userId,
            msgType: file_url ? msgType : "text",
            message: messageData,
            fileName: fileName || null,
            document: document || false,
            fileSize: fileSize || 0,
            chat: chatId,
            caption,
        });

        const saved = await newMessage.save();

        await saved.populate([
            {
                path: "reactEmoji",
                populate: {path: "user", model: "user", select: "_id name image"},
            },
            {path: "sender", select: "_id username name image", model: "user"},
        ]);

        const finalMessage = isReply
            ? await saved.populate({path: "repliedTo", model: "message", select: "_id message fileName msgType sender"})
            : saved;

        return {message: finalMessage, latestMessageId: newMessage._id};
    }

    async addReaction(messageId: string, userId: string, emoji: string) {
        let update = await this.messageModel.updateOne(
            {_id: messageId, "reactEmoji.user": userId},
            {$set: {"reactEmoji.$.emoji": emoji}}
        );

        if (update.modifiedCount === 0) {
            update = await this.messageModel.updateOne({_id: messageId}, {$push: {reactEmoji: {user: userId, emoji}}});
        }

        if (update.modifiedCount !== 1) throw new CustomError("Something went wrong while adding reaction", 400);
    }

    async removeReaction(messageId: string, userId: string) {
        const reactMessage = await this.messageModel.updateOne({_id: messageId}, {$pull: {reactEmoji: {user: userId}}});

        if (reactMessage.modifiedCount !== 1)
            throw new CustomError("Something went wrong while removing reaction", 400);
    }

    async deleteMessages(messageIds: string[], chatId: string) {
        const removeMessage = await this.messageModel.deleteMany({_id: {$in: messageIds}});

        if (removeMessage.deletedCount === 0) {
            throw new CustomError("Something went wrong while deleting the message", 400);
        }

        const remaining = await this.messageModel.find({chat: chatId}).sort({createdAt: -1}).limit(1).lean();

        // Returns newLatestMessageId so the controller can call chatService.updateLatestMessage
        return {
            success: true,
            newLatestMessageId: remaining.length > 0 ? remaining[0]._id : null,
        };
    }

    async addEventAlertMessage({chatId, actor, target, message, id}: IAlertMessage) {
        const finalData: any = {
            chat: chatId,
            sender: process.env.MSG_BOT_ID,
            msgType: "alert",
            actor,
            target,
            message,
        };
        if (id) finalData._id = id;

        const newMessage = new this.messageModel(finalData);
        await newMessage.save();
        return {actor, target, msgType: "alert", message};
    }

    async getMessages(chatId: string, offset: number) {
        const messages = await this.messageModel.aggregate([
            {$match: {chat: new ObjectId(chatId)}},
            {$sort: {createdAt: -1}},
            {$skip: offset},
            {$limit: 21},

            // Populate sender
            {
                $lookup: {
                    from: "users",
                    localField: "sender",
                    foreignField: "_id",
                    as: "sender",
                    pipeline: [{$project: {_id: 1, username: 1, name: 1, image: 1}}],
                },
            },
            {$unwind: {path: "$sender", preserveNullAndEmptyArrays: true}},

            // Populate repliedTo
            {
                $lookup: {
                    from: "messages",
                    localField: "repliedTo",
                    foreignField: "_id",
                    as: "repliedTo",
                    pipeline: [
                        {$project: {_id: 1, message: 1, msgType: 1, sender: 1, fileName: 1}},
                        {
                            $lookup: {
                                from: "users",
                                localField: "sender",
                                foreignField: "_id",
                                as: "sender",
                                pipeline: [{$project: {name: 1}}],
                            },
                        },
                        {$unwind: {path: "$sender", preserveNullAndEmptyArrays: true}},
                    ],
                },
            },
            {$unwind: {path: "$repliedTo", preserveNullAndEmptyArrays: true}},

            // Populate reactEmoji with nested user
            {
                $lookup: {
                    from: "reactemojis", // your actual collection name
                    localField: "reactEmoji",
                    foreignField: "_id",
                    as: "reactEmoji",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "user",
                                foreignField: "_id",
                                as: "user",
                                pipeline: [{$project: {_id: 1, name: 1, image: 1}}],
                            },
                        },
                        {$unwind: {path: "$user", preserveNullAndEmptyArrays: true}},
                    ],
                },
            },
        ]);

        if (messages.length === 0) throw new CustomError("No messages yet", 404);

        // participants removed — controller fetches them via chatMemberService.getChatParticipants if needed
        return {messages, isMore: messages.length > 20};
    }

    async searchStarredMessages(userId: string, query: string) {
        return await this.messageModel
        .find({
            $and: [
                {
                    $or: [
                        {message: {$regex: ".*" + query + ".*", $options: "i"}},
                        {fileName: {$regex: ".*" + query + ".*", $options: "i"}},
                    ],
                },
                {"starredBy.userId": userId},
            ],
        })
        .sort({createdAt: -1})
        .populate({path: "chat", model: "chat", select: "_id image name isGroupChat"})
        .limit(15)
        .lean();
    }
}

export default MessageService;
