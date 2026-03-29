import {Model} from "mongoose";
import CustomError from "../utils/customError";
import IUser from "../types/userType";
import {ObjectId} from "mongodb";

class UserService {
    constructor(private readonly userModel: Model<IUser>) {}
    sanitizeUsers(userId: string, results: any[]) {
        return results.map((otherUser: any) => {
            const otherUserCopy = {...otherUser};

            let isBlockingMe = otherUserCopy.blockedUsers?.some((id: string) => id.toString() === userId.toString());
            if (isBlockingMe)
                otherUserCopy.image = "https://i.pinimg.com/474x/ec/e2/b0/ece2b0f541d47e4078aef33ffd22777e.jpg";

            delete otherUserCopy.blockedUsers;
            return otherUserCopy;
        });
    }

    async blockUser(userId: string, targetId: string) {
        if (!targetId) {
            throw new CustomError("No UserId Provided", 400);
        }

        const result = await this.userModel.updateOne({_id: userId}, {$push: {blockedUsers: targetId}});

        if (result.modifiedCount !== 1) {
            throw new CustomError("Something went wrong while blocking the user, try again later", 400);
        }
        return true;
    }

    async unBlockUser(userId: string, targetId: string) {
        if (!targetId) {
            throw new CustomError("No UserId Provided", 400);
        }

        const result = await this.userModel.updateOne({_id: userId}, {$pull: {blockedUsers: targetId}});

        if (result.modifiedCount !== 1) {
            throw new CustomError("Something went wrong while unblocking the user, try again later", 400);
        }
        return true;
    }

    async searchUsers(userId: string, query: string) {
        const results = await this.userModel
        .find({
            $and: [
                {
                    $or: [
                        {name: {$regex: ".*" + query + ".*", $options: "i"}},
                        {email: {$regex: ".*" + query + ".*", $options: "i"}},
                    ],
                },
                {_id: {$nin: [userId, `${process.env.MSG_BOT_ID}`]}},
            ],
        })
        .select("_id image name username email blockedUsers")
        .limit(15)
        .lean();

        if (results.length === 0) {
            throw new CustomError("No user found", 404);
        }

        return this.sanitizeUsers(userId, results);
    }

    async updateProfile(userId: string, data: any) {
        const {file_url, name, email, slogan} = data;
        let profileData: any = {
            name,
            email,
            slogan,
        };

        if (file_url) {
            profileData.image = file_url;
        }

        const result = await this.userModel.updateOne({_id: userId}, {$set: profileData});

        if (result.modifiedCount === 0) {
            throw new CustomError("Oops! something went wrong", 400);
        }
        return true;
    }

    async updateActiveStatus(userId: string, newStatus: any) {
        await this.userModel.updateOne({_id: userId}, {$set: {activeStatus: true, latestStatus: newStatus}});
    }

    async checkIfBlocked(userId: string, targetId: string) {
        return Boolean(await this.userModel.findOne({_id: targetId, blockedUsers: userId}));
    }

    async updateChatStatus(userId: string, chatId: string, type: string) {
        const updatePayload =
            type === "delete"
                ? {$set: {[`deletedChats.${chatId}`]: new Date()}}
                : {$set: {[`clearedChats.${chatId}`]: new Date()}};

        const update = await this.userModel.updateOne({_id: userId}, updatePayload);
        return update.acknowledged;
    }

    async updateUserFields(userId: string, payload: any) {
        return await this.userModel.updateOne({_id: userId}, {$set: payload});
    }

    async getUserById(userId: string, selectFields: string = "_id name") {
        return await this.userModel.findById(userId).select(selectFields);
    }

    async getStarredMessages(userId: string) {
        const response: any = await this.userModel.aggregate([
            {$match: {_id: new ObjectId(userId)}},
            {$project: {starredMessages: 1}},

            // Join messages
            {
                $lookup: {
                    from: "messages",
                    localField: "starredMessages",
                    foreignField: "_id",
                    as: "starredMessages",
                    pipeline: [
                        {$project: {_id: 1, document: 1, msgType: 1, message: 1, chat: 1}},

                        // Join chat inside message
                        {
                            $lookup: {
                                from: "chats",
                                localField: "chat",
                                foreignField: "_id",
                                as: "chat",
                                pipeline: [
                                    {$project: {_id: 1, users: 1, image: 1}},

                                    // Join users inside chat
                                    {
                                        $lookup: {
                                            from: "users",
                                            localField: "users",
                                            foreignField: "_id",
                                            as: "users",
                                            pipeline: [{$project: {_id: 1, username: 1, name: 1, image: 1}}],
                                        },
                                    },
                                ],
                            },
                        },
                        {$unwind: {path: "$chat", preserveNullAndEmptyArrays: true}},
                    ],
                },
            },
            {$unwind: {path: "$starredMessages", preserveNullAndEmptyArrays: true}}, // optional, only if you want flat array
        ]);

        if (!response || response.starredMessages.length === 0) {
            throw new CustomError("No starred messages", 404);
        }
        return response.starredMessages;
    }

    async starMessages(userId: string, messageIds: string[]) {
        const starMessages = await this.userModel.updateOne(
            {_id: userId},
            {$push: {starredMessages: {$each: messageIds}}}
        );
        if (starMessages.modifiedCount === 0) {
            throw new CustomError("User not found or message already starred", 404);
        }
        return true;
    }

    async unstarMessages(userId: string, messageIds: string[]) {
        const starMessages = await this.userModel.updateOne(
            {_id: userId},
            {$pull: {starredMessages: {$in: messageIds}}}
        );
        if (starMessages.modifiedCount === 0) {
            throw new CustomError("User not found or message not starred", 404);
        }
        return true;
    }
}

export default UserService;
