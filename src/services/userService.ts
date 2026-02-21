import User from "../models/userModel";
import CustomError from "../utils/customError";

class UserService {
  private getSanitizedUsers(userId: string, results: any[]) {
    return results.map((otherUser: any) => {
      const otherUserCopy = { ...otherUser };

      let isBlockingMe = otherUserCopy.blockedUsers.some(
        (id: string) => id.toString() === userId.toString()
      );
      if (isBlockingMe)
        otherUserCopy.image =
          "https://i.pinimg.com/474x/ec/e2/b0/ece2b0f541d47e4078aef33ffd22777e.jpg";

      delete otherUserCopy.blockedUsers;
      return otherUserCopy;
    });
  }

  async blockUser(userId: string, blockUserId: string) {
    if (!blockUserId) {
      throw new CustomError("No UserId Provided", 400);
    }

    const result = await User.updateOne(
      { _id: userId },
      { $push: { blockedUsers: blockUserId } }
    );

    if (result.modifiedCount !== 1) {
      throw new CustomError("Something went wrong while blocking the user, try again later", 400);
    }
    return true;
  }

  async unBlockUser(userId: string, blockUserId: string) {
    if (!blockUserId) {
      throw new CustomError("No UserId Provided", 400);
    }

    const result = await User.updateOne(
      { _id: userId },
      { $pull: { blockedUsers: blockUserId } }
    );

    if (result.modifiedCount !== 1) {
      throw new CustomError("Something went wrong while unblocking the user, try again later", 400);
    }
    return true;
  }

  async searchUsers(userId: string, query: string) {
    const results = await User.find({
      $and: [
        {
          $or: [
            { name: { $regex: ".*" + query + ".*", $options: "i" } },
            { email: { $regex: ".*" + query + ".*", $options: "i" } },
          ],
        },
        { _id: { $nin: [userId, `${process.env.MSG_BOT_ID}`] } },
      ],
    })
      .select("_id image name username email blockedUsers")
      .limit(15)
      .lean();

    if (results.length === 0) {
      throw new CustomError("No user found", 404);
    }

    return this.getSanitizedUsers(userId, results);
  }

  async updateProfile(userId: string, data: any) {
    const { file_url, name, email, slogan } = data;
    let profileData: any = {
      name,
      email,
      slogan,
    };

    if (file_url) {
      profileData.image = file_url;
    }

    const result = await User.updateOne(
      { _id: userId },
      { $set: profileData }
    );

    if (result.modifiedCount === 0) {
      throw new CustomError("Oops! something went wrong", 400);
    }
    return true;
  }
}

export default new UserService();
