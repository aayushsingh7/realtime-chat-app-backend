import { RequestHandler, Request } from "express";
import User from "../models/userModel";

const getSanitizedUsers = (userId: string, results: any[]) => {
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
};

const blockUser: RequestHandler = async (req, res) => {
  try {
    const userId = req.body.userId;

    let blockUserId = req.body.blockUserId;

    if (!blockUserId)
      return res
        .status(400)
        .send({ success: false, message: "No UserId Provided" });

    let blockUser = await User.updateOne(
      { _id: userId },
      { $push: { blockedUsers: blockUserId } }
    );
    if (blockUser.modifiedCount === 1) {
      res
        .status(200)
        .send({ success: true, message: "User blocked successfully" });
    } else {
      res.status(400).send({
        success: false,
        message:
          "Something went wrong while blocking the user, try again later",
      });
    }
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

const unBlockUser: RequestHandler = async (req, res) => {
  try {
    const userId = req.body.userId;

    let blockUserId = req.body.blockUserId;
    if (!blockUserId)
      return res
        .status(400)
        .send({ success: false, message: "No UserId Provided" });

    let blockUser = await User.updateOne(
      { _id: userId },
      { $pull: { blockedUsers: blockUserId } }
    );
    if (blockUser.modifiedCount === 1) {
      res
        .status(200)
        .send({ success: true, message: "User blocked successfully" });
    } else {
      res.status(400).send({
        success: false,
        message:
          "Something went wrong while blocking the user, try again later",
      });
    }
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

const searchUsers: RequestHandler = async (req, res) => {
  try {
    const userId = req.body.userId;
    const query = req.query.query;

    let results = await User.find({
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

    const sanitizedUsers = getSanitizedUsers(userId, results);
    if (results.length > 0) {
      res.status(200).send({
        success: true,
        message: "User fetched successfully",
        users: sanitizedUsers,
      });
    } else {
      res
        .status(404)
        .send({ success: false, message: "No user found", users: [] });
    }
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const updateProfile: RequestHandler = async (req, res) => {
  try {
    const { file_url, name, email, slogan, userId } = req.body;
    let profileData;

    if (file_url) {
      profileData = {
        name,
        email,
        slogan,
        image: file_url,
      };
    } else {
      profileData = {
        name,
        email,
        slogan,
      };
    }

    const response = await User.updateOne(
      { _id: userId },
      { $set: profileData }
    );
    if (response.modifiedCount > 0) {
      res
        .status(200)
        .send({ success: true, message: "Changes saved successfully" });
    } else {
      res
        .status(400)
        .send({ success: false, message: "Oops! something went wrong" });
    }
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

export default {
  blockUser,
  unBlockUser,
  updateProfile,
  searchUsers
};
