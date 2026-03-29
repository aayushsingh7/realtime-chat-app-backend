import {FlattenMaps, Model} from "mongoose";
import {redis} from "../config/redis";
import {IChatMember, IChatMemberPopulated} from "../types/chatMemberType";
import {IChat} from "../types/chatType";
import CustomError from "../utils/customError";

const parseZrangeResult = (result: string[] | null) => {
    if (!result || result.length === 0) return null;
    return parseFloat(result[1]);
};

class ChatMemberService {
    constructor(private readonly chatMemberModel: Model<IChatMember>) {}

    async getChatParticipants(chatId: string) {
        return (await this.chatMemberModel
        .find({chat: chatId})
        .select("user lastReadAt unreadCount")
        .populate({
            path: "user",
            select: "_id name email profile lastSeen slogan",
        })
        .lean()) as FlattenMaps<IChatMemberPopulated[]>;
    }

    async createMembers(chatId: string, userIds: string[]) {
        const participants = userIds.map((userId) => ({
            chat: chatId,
            user: userId,
            unreadCount: 0,
            lastReadAt: new Date(0),
        }));

        await this.chatMemberModel.insertMany(participants).catch(() => {
            console.log("Participants might already exist");
        });

        return participants;
    }

    async addMember(chatId: string, userId: string) {
        const memberData = {
            chat: chatId,
            user: userId,
            unreadCount: 0,
            lastReadAt: new Date(0),
        };

        return await this.chatMemberModel
        .findOneAndUpdate({chat: chatId, user: userId}, memberData, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
        })
        .lean();
    }

    async removeMember(chatId: string, userId: string) {
        return await this.chatMemberModel.deleteOne({chat: chatId, user: userId});
    }

    async getLastSeenForUser(userId: string, chatIds: string[]) {
        return this.chatMemberModel.find({
            user: userId,
            chat: {$in: chatIds},
        });
    }

    async bulkUpdateLastSeen(userId: string, lastSeenPerChat: any[]) {
        const updateMember = await this.chatMemberModel.bulkWrite(
            lastSeenPerChat.map((c: any) => ({
                updateOne: {
                    filter: {user: userId, chat: c[0]},
                    update: {
                        $set: {
                            lastReadAt: c[1].lastReadAt,
                            unreadCount: c[1].unreadCount,
                        },
                    },
                },
            }))
        );

        if (updateMember.modifiedCount === 0) {
            throw new CustomError("Chat member not found", 404);
        }
        return true;
    }

    async ensureChatMemberCaches(chat: FlattenMaps<IChat>, userId: string) {
        const pipeline = redis.pipeline();
        const chatId = chat._id.toString();

        const lastSeenKey = `chat:${chatId}:last-seen`;
        const oldestOnlineKey = `chat:${chatId}:oldest-online`;

        const [lastSeenExists, oldestOnlineExists] = await Promise.all([
            redis.exists(lastSeenKey),
            redis.exists(oldestOnlineKey),
        ]);

        if (!lastSeenExists) {
            const membersLastSeenChat = await this.chatMemberModel
            .find({chat: chatId})
            .select("user lastReadAt")
            .lean();
            membersLastSeenChat.forEach((member: FlattenMaps<IChatMember>) => {
                pipeline.zadd(lastSeenKey, member.lastReadAt.getTime(), member._id.toString());
            });
        }

        if (!oldestOnlineExists) {
            // No more circular dep — uses getChatParticipants directly
            const members = await this.getChatParticipants(chatId);
            members.forEach((member: FlattenMaps<IChatMemberPopulated>) => {
                pipeline.zadd(
                    oldestOnlineKey,
                    member._id.toString() === userId ? Number.MAX_SAFE_INTEGER : member.user.lastSeen.getTime(),
                    member._id.toString()
                );
            });
        }

        if (!lastSeenExists) pipeline.expire(lastSeenKey, 60 * 60 * 24 * 2);
        if (!oldestOnlineExists) pipeline.expire(oldestOnlineKey, 60 * 60 * 24 * 2);

        pipeline.zrange(`chat:${chatId}:oldest-online`, 0, 0, "WITHSCORES");
        pipeline.zrange(`chat:${chatId}:last-seen`, 0, 0, "WITHSCORES");

        const results: any = await pipeline.exec();

        return {
            oldestOnline: parseZrangeResult(results[results.length - 2]?.[1]),
            oldestLastSeen: parseZrangeResult(results[results.length - 1]?.[1]),
        };
    }
}

export default ChatMemberService;
