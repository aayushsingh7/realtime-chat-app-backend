import Status from "../models/statusModel";
import User from "../models/userModel";
import CustomError from "../utils/customError";

class StatusService {
  async getStatus(userId: string) {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const status = await Status.find({
      postedBy: userId,
      createdAt: { $gte: twentyFourHoursAgo },
    });

    if (status.length === 0) {
      throw new CustomError("No active status found", 404);
    }

    return status;
  }

  async addStatus(data: any) {
    const { extension, fileType, url, postedBy, chatId } = data;
    const newStatus = new Status({
      extension,
      fileType,
      url,
      postedBy,
      seenBy: [],
      chatId,
    });

    await newStatus.save();
    
    await User.updateOne(
      { _id: postedBy },
      { $set: { activeStatus: true, latestStatus: newStatus } }
    );

    return newStatus;
  }

  async statusSeen(userId: string, statusId: string) {
    const updateStatus = await Status.updateOne(
      { _id: statusId },
      { $push: { seenBy: userId } }
    );

    if (!updateStatus.acknowledged) {
      throw new CustomError("Something went wrong, please try again later", 400);
    }
    return true;
  }

  async removeStatus(statusId: string) {
    const deleteOperation = await Status.deleteOne({ _id: statusId });
    if (!deleteOperation.acknowledged) {
      throw new CustomError("Something went wrong, please try again later", 400);
    }
    return true;
  }
}

export default new StatusService();
