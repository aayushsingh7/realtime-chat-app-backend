import cloudinary from "cloudinary";
import {FlattenMaps, Model} from "mongoose";
import CustomError from "../utils/customError";
import {IChat} from "../types/chatType";
import UserService from "./userService";
import ChatMemberService from "./chatMemberService";
import {ObjectId} from "mongodb";

class ChatService {
    constructor(
        private readonly chatModel: Model<IChat>,
        private readonly chatMemberService: ChatMemberService,
        private readonly userService: UserService
    ) {}

    async updateLatestMessage(chatId: string, messageId: string) {
        return await this.chatModel.updateOne({_id: chatId}, {$set: {latestMessage: messageId}});
    }

    private async enrichChatsWithOldestPresence(chats: FlattenMaps<IChat[]>, userId: string) {
        return Promise.all(
            chats.map(async (chat: FlattenMaps<IChat>) => {
                const {oldestLastSeen, oldestOnline} = await this.chatMemberService.ensureChatMemberCaches(
                    chat,
                    userId
                );

                let isBlocked = false;
                if (!chat.isGroupChat && chat.users.length === 2) {
                    const otherUser = chat.users.find((u) => u._id.toString() !== userId)?._id.toString();
                    // @ts-expect-error
                    isBlocked = await this.userService.checkIfBlocked(userId, otherUser);
                }
                return {...chat, oldestLastSeen, oldestOnline, isBlocked};
            })
        );
    }

    async createOrGetChat({
        userOne,
        userTwo,
        chatId,
        isGroupChat,
        userId,
    }: {
        userOne: string;
        userTwo: string;
        chatId: string;
        isGroupChat: boolean;
        userId: string;
    }) {
        let chat;
        if (isGroupChat) {
            chat = await this.chatModel.findOne({_id: chatId}).select("-__v -removedUsers");
            if (!chat) throw new CustomError("Chat not found", 404);
        } else {
            const pair = [userOne, userTwo].sort();
            chat = await this.chatModel
            .findOneAndUpdate(
                {users: pair, isGroupChat: false},
                {$setOnInsert: {isGroupChat: false, admins: []}},
                {upsert: true, returnDocument: "after"}
            )
            .select("-__v -removedUsers");
        }

        await chat?.populate({path: "users", model: "user", select: "_id image name email"});

        const otherUser = userId == userOne ? userTwo : userOne;
        const isBlocked = await this.userService.checkIfBlocked(userId, otherUser);
        if (isBlocked && chat) {
            chat.image = "https://i.pinimg.com/474x/ec/e2/b0/ece2b0f541d47e4078aef33ffd22777e.jpg";
        }

        const participants = await this.chatMemberService.createMembers(chat?._id.toString(), [userOne, userTwo]);

        return {chat, participants};
    }

    async getUserChats(userId: string) {
        const limit = 15;
        const chats = await this.chatModel.aggregate([
            {
                $match: {
                    $or: [{users: new ObjectId(userId)}, {[`removedUsers.${userId}`]: {$exists: true}}],
                },
            },
            {
                $project: {
                    isGroupChat: 1,
                    updatedAt: 1,
                    image: 1,
                    name: 1,
                    latestMessage: 1,
                    users: {
                        $cond: {
                            if: {$eq: ["$isGroupChat", false]},
                            then: "$users",
                            else: "$$REMOVE",
                        },
                    },
                    theme: 1,
                    removedUsers: 1,
                    admins: 1,
                },
            },
            {$sort: {updatedAt: -1}},
            {$limit: limit + 1},
        ]);

        await this.chatModel.populate(chats, {
            path: "latestMessage",
            model: "message",
            populate: {path: "sender", model: "user", select: "_id username name"},
            select: "msgType message fileName document sender seenBy moderator users createdAt",
        });

        await this.chatModel.populate(
            chats.filter((c) => !c.isGroupChat),
            {
                path: "users",
                model: "user",
                select: "_id image name username blockedUsers lastSeen email",
            }
        );

        console.log(chats);
        if (chats.length === 0) {
            throw new CustomError("No Chats Found", 404);
        }

        const finalChats = await this.enrichChatsWithOldestPresence(chats, userId);
        const isMore = chats.length > limit;
        return {chats: finalChats, isMore};
    }

    async createGroupChat({
        users,
        groupName,
        description,
        image,
        userId,
    }: {
        users: string[];
        groupName: string;
        description: string;
        image: string;
        userId: string;
    }) {
        const result = await cloudinary.v2.uploader.upload(image, {
            folder: "Chat-app/Profile-pic",
            format: "webp",
            transformation: {quality: 80, fetch_format: "webp"},
        });

        const newChatId = new ObjectId();
        const newMessageId = new ObjectId();

        const newGroupChat = new this.chatModel({
            _id: newChatId,
            isGroupChat: true,
            admins: [userId],
            //@ts-expect-error
            users: JSON.parse(users),
            createdBy: userId,
            name: groupName,
            image: result.secure_url,
            description,
            latestMessage: newMessageId,
        });

        await newGroupChat.save();

        const chat = await newGroupChat.populate([
            {path: "users", model: "user", select: "_id name image username"},
            {path: "latestMessage", model: "message", select: "msgType message fileName document moderator"},
        ]);

        return {
            newChat: chat,
            groupInfo: {_id: newGroupChat._id, name: groupName},
            chatMsg: "created group",
        };
    }

    async addAdmin(chatId: string, adminId: string) {
        const findChat = await this.chatModel.findOne({_id: chatId});
        if (!findChat) throw new CustomError("No chat found", 404);

        const result = await findChat.updateOne({$push: {admins: adminId}});
        if (result.modifiedCount !== 1) throw new CustomError("Failed to add admin", 400);
    }

    async removeAdmin(chatId: string, adminId: string) {
        const findChat = await this.chatModel.findOne({_id: chatId}).select("createdBy");
        if (!findChat) throw new CustomError("No chat found", 404);

        if (findChat.createdBy?.toString() === adminId) {
            throw new CustomError("The person who created the group cannot be removed from admin", 400);
        }

        const result = await findChat.updateOne({$pull: {admins: adminId}});
        if (result.modifiedCount !== 1) throw new CustomError("User was not an admin or already removed", 400);
        return true;
    }

    async clearOrDeleteChat(chatId: string, userId: string, type: string) {
        const success = await this.userService.updateChatStatus(userId, chatId, type);
        if (!success) throw new CustomError(`Cannot ${type === "delete" ? "delete" : "clear"} chat`, 400);
        return true;
    }

    async addUser(chatId: string, newUserId: string) {
        const updateChat = await this.chatModel
        .findOneAndUpdate(
            {_id: chatId},
            {
                $push: {users: newUserId},
                $unset: {[`removedUsers.${newUserId}`]: ""},
            },
            {returnDocument: "after"}
        )
        .populate({path: "users", model: "user", select: "_id name image username"})
        .populate({
            path: "latestMessage",
            model: "message",
            populate: {path: "sender", model: "user", select: "_id image username name email"},
            select: "msgType message sender seenBy moderator createdAt",
        })
        .select("-removedUsers -__v")
        .lean();

        const newParticipant = await this.chatMemberService.addMember(chatId, newUserId);

        return {newChat: updateChat, newParticipant};
    }

    async removeUser(chatId: string, userId: string) {
        const removeUserPromise = this.chatModel.updateOne(
            {_id: chatId},
            {
                $set: {[`removedUsers.${userId}`]: new Date()},
                $pull: {admins: userId, users: userId},
            }
        );

        const [updatedResult] = await Promise.all([
            removeUserPromise,
            this.chatMemberService.removeMember(chatId, userId),
        ]);

        if (updatedResult.modifiedCount === 0) {
            throw new CustomError("Something went wrong while removing the user", 400);
        }
        return true;
    }

    async leaveChat(chatId: string, userId: string) {
        const chatUpdatePromise = this.chatModel.updateOne(
            {_id: chatId},
            {
                $set: {[`removedUsers.${userId}`]: new Date()},
                $pull: {users: userId, admins: userId},
            }
        );

        const [updateResult] = await Promise.all([
            chatUpdatePromise,
            this.chatMemberService.removeMember(chatId, userId),
        ]);

        if (updateResult.modifiedCount === 0) {
            throw new CustomError("Chat not found or user already left", 404);
        }

        return await this.userService.getUserById(userId);
    }

    async updateChatInfo(chatId: string, data: any) {
        const {discription, slogan, name, chatType, isImgUpdated, newImage} = data;
        const updatePayload: any = {name, discription};

        if (isImgUpdated) updatePayload.image = newImage;

        let updatedResult;
        if (chatType === "group") {
            updatedResult = await this.chatModel
            .findByIdAndUpdate(chatId, {$set: updatePayload}, {returnDocument: "after"})
            .populate({path: "users", model: "user", select: "_id image email name"})
            .populate({
                path: "latestMessage",
                populate: {path: "sender", model: "user", select: "_id image name"},
            });
        } else {
            updatePayload.slogan = slogan;
            await this.userService.updateUserFields(chatId, updatePayload);
            updatedResult = await this.userService.getUserById(chatId, "_id image name email discription slogan");
        }

        if (!updatedResult) throw new CustomError(`${chatType === "group" ? "Group" : "User"} not found`, 404);
        return updatedResult;
    }

    async changeChatTheme(chatId: string, data: any) {
        const {themeDetails, file_url} = data;
        const theme = file_url ? {URL: file_url, name: "custom"} : themeDetails;
        await this.chatModel.updateOne({_id: chatId}, {$set: {theme}});
        return theme;
    }

    async loadMoreChats(userId: string, offset: number) {
        const limit = 15;
        const chats = await this.chatModel
        .find({
            $or: [{users: userId}, {[`removedUsers.${userId}`]: {$exists: true}}],
        })
        .populate({path: "users", model: "user", select: "_id name image username blockedUsers"})
        .populate({
            path: "latestMessage",
            model: "message",
            populate: {path: "sender", model: "user", select: "_id image username name email"},
            select: "msgType message fileName document sender seenBy moderator",
        })
        .select("isGroupChat _id updatedAt image name latestMessage users")
        .sort({updatedAt: -1})
        .skip(offset)
        .limit(limit + 1)
        .lean();

        const finalChats = await this.enrichChatsWithOldestPresence(chats, userId);
        const isMore = chats.length > limit;

        return {chats: finalChats, isMore};
    }

    async lastSeenChat(userId: string, lastSeenPerChat: any[]) {
        return this.chatMemberService.bulkUpdateLastSeen(userId, lastSeenPerChat);
    }
}

export default ChatService;
