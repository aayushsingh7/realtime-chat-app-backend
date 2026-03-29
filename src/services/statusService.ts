import {Model} from "mongoose";
import CustomError from "../utils/customError";
import IStatus from "../types/statusType";
import UserService from "./userService";

class StatusService {
    private userService!: UserService;

    constructor(private readonly statusModel: Model<IStatus>) {}

    setUserService(userService: UserService) {
        this.userService = userService;
    }
    async getStatus(userId: string) {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const status = await this.statusModel.find({
            postedBy: userId,
            createdAt: {$gte: twentyFourHoursAgo},
        });

        if (status.length === 0) {
            throw new CustomError("No active status found", 404);
        }

        return status;
    }

    async addStatus(data: any) {
        const {extension, fileType, url, postedBy, chatId} = data;
        const newStatus = new this.statusModel({
            extension,
            fileType,
            url,
            postedBy,
            seenBy: [],
            chatId,
        });

        await newStatus.save();

        await this.userService.updateActiveStatus(postedBy, newStatus);

        return newStatus;
    }

    async statusSeen(userId: string, statusId: string) {
        const updateStatus = await this.statusModel.updateOne({_id: statusId}, {$push: {seenBy: userId}});

        if (!updateStatus.acknowledged) {
            throw new CustomError("Something went wrong, please try again later", 400);
        }
        return true;
    }

    async removeStatus(statusId: string) {
        const deleteOperation = await this.statusModel.deleteOne({_id: statusId});
        if (!deleteOperation.acknowledged) {
            throw new CustomError("Something went wrong, please try again later", 400);
        }
        return true;
    }
}

export default StatusService;
