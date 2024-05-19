import { RequestHandler, Request } from "express";
import User from "../models/userMode";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";

const register: RequestHandler = async (req, res) => {
  try {
    const { username, email, password, name } = req.body;
    const isUserExistsOnEmail = await User.findOne({ email: email });
    const isUserExistsOnUsername = await User.findOne({ username: username });

    if (isUserExistsOnEmail || isUserExistsOnUsername) {
      return res.status(400).send({
        success: false,
        message:isUserExistsOnEmail ? "Username already taken, please choose another one." : "User already exists with the given email.",
      });
    }

    const hashPassword = await bcryptjs.hash(password, 12);

    const newUser = new User({
      name: name,
      email: email,
      username: username,
      password: hashPassword,
    });

    await newUser.save();
    if (!newUser._id) {
      return res.status(400).send({
        success: false,
        message: "Something went wrong while registering user ",
      });
    } else {
      const token = await jwt.sign(
        { _id: newUser._id },
        `${process.env.SECRET_KEY}`
      );
      res.cookie("chatverse", token, {
        httpOnly: true,
        secure: true,
        maxAge: 21 * 24 * 60 * 60 * 1000,
        sameSite: "none",
      });
      res
        .status(200)
        .send({ success: true, message: "User registered successfully" });
    }
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const login: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;
    let isUserExists = await User.findOne({ email: email });
    if (!isUserExists)
      return res.status(404).send({
        success: false,
        message: "Sorry, no registered uesr found with the given email",
      });

    let verifyPassword = await bcryptjs.compare(
      password,
      isUserExists.password
    );

    if (verifyPassword) {
      const token = await jwt.sign(
        { _id: isUserExists._id },
        `${process.env.SECRET_KEY}`
      );
      res.cookie("chatverse", token, {
        httpOnly: true,
        secure: true,
        maxAge: 21 * 24 * 60 * 60 * 1000,
        sameSite: "none",
      });
      res
        .status(200)
        .send({ success: true, msg: "User loggedin successfully" });
    } else {
      res.status(400).send({
        success: false,
        message:
          "Sorry, your password was incorrect. Please double-check your password.",
      });
    }
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
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
      .select("_id image name username email")
      .limit(15);

    if (results.length > 0) {
      res.status(200).send({
        success: true,
        message: "User fetched successfully",
        users: results,
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

const getLoggedInUser: RequestHandler = async (req, res) => {
  try {
    const userId = req.body.userId;
    const getUser = await User.findOne({ _id: userId }).select(
      "_id image name email slogan createdAt username blockedUsers lastSeen"
    );
    res
      .status(200)
      .send({ success: true, message: "User logged In", user: getUser });
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const logoutUser: RequestHandler = async (req, res) => {
  try {
    res.clearCookie("chatverse");
    res.status(200).send({ success: true, msg: "Logout successfully" });
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
  register,
  login,
  searchUsers,
  getLoggedInUser,
  logoutUser,
  updateProfile,
};
