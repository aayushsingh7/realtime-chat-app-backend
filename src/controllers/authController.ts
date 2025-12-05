import User from "../models/userModel";
import bcryptjs from "bcryptjs";
import { RequestHandler } from "express";
import jwt from "jsonwebtoken";

const register: RequestHandler = async (req, res) => {
  try {
    const { username, email, password, name } = req.body;
    const isUserExistsOnEmail = await User.findOne({ email: email });
    const isUserExistsOnUsername = await User.findOne({ username: username });

    if (isUserExistsOnEmail || isUserExistsOnUsername) {
      return res.status(400).send({
        success: false,
        message: isUserExistsOnEmail
          ? "Username already taken, please choose another one."
          : "User already exists with the given email.",
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
        path: "/",
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
        path: "/",
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

const getLoggedInUser: RequestHandler = async (req, res) => {
  try {
    const userId = req.body.userId;
    const getUser = await User.findOne({ _id: userId }).select(
      "_id image name email slogan createdAt username  lastSeen starredMessages blockedUsers"
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
    res.clearCookie("chatverse", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.status(200).send({ success: true, msg: "Logout successfully" });
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

export default {
  register,
  login,
  getLoggedInUser,
  logoutUser,
};
