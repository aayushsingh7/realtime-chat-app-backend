import { RequestHandler, Request } from "express";
import User from "../models/userMode";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import Fuse from "fuse.js";

interface UserData extends Request {
  userId: string;
}


const register: RequestHandler = async (req, res) => {
   try {
    const { email, password, name } = req.body;
  const isUserExists = await User.findOne({ email: email });
  if (isUserExists) {
    return res
      .status(400)
      .send({ success: false, message: "User already exists" });
  }

  const hashPassword = await bcryptjs.hash(password, 12);

  const newUser = new User({
    name: name,
    email: email,
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
   
    res.cookie("chatbox",token,{
      httpOnly:true,
      secure:true,
      maxAge:21* 24 * 60 * 60 * 1000,
      sameSite:"none"
    })

    res
      .status(200)
      .send({ success: true, message: "User registered successfully" });
  }
   } catch (err:any) {
    res.status(500).send({ success:false , message:err.message});
   }
};

const login: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;
    let isUserExists = await User.findOne({ email: email });
    if (!isUserExists)
      return res
        .status(404)
        .send({ success: false, message: "User not exists" });

    let verifyPassword = await bcryptjs.compare(
      password,
      isUserExists.password
    );

    if (verifyPassword) {
      const token = await jwt.sign(
        { _id: isUserExists._id },
        `${process.env.SECRET_KEY}`
      );

      res.cookie("chatbox",token,{
        httpOnly:true,
        secure:true,
        maxAge:21* 24 * 60 * 60 * 1000,
        sameSite:"none"
      })

      res
        .status(200)
        .send({ success: true, message: "User loggedin successfully" });
    } else {
      res.status(400).send({ success: false, message: "Invalid Credentials" });
    }
  } catch (err:any) {
    res.status(500).send({ success:false , message:err.message});
  }
};

const blockUser: RequestHandler = async (req, res) => {
  try {
    const userData = req as UserData;
    const userId = userData.userId;

    let blockUserId = req.query.userId;
    if (!blockUserId)
      return res
        .status(400)
        .send({ success: false, message: "No UserId Provided" });

    let blockUser = await User.updateOne(
      { _id: userId },
      { $push: { blockedUsers:blockUserId } }
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
    const userData = req as UserData;
    const userId = userData.userId;

    let blockUserId = req.query.userId;
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
    const customReq = req as UserData
    const query = req.query.user;

let results = await User.find({
  $and: [
    {
      $or: [
        { name: { $regex: ".*" + query + ".*", $options: "i" } },
        { email: { $regex: ".*" + query + ".*", $options: "i" } },
      ],
    },
    { _id: { $nin:[customReq.userId , `${process.env.MSG_BOT_ID}`]} },
  ],
}).select("_id image name email description slogan createdAt");

    
    if (results.length > 0) {
      res
        .status(200)
        .send({
          success: true,
          message: "User fetched successfully",
          users: results,
        });
    } else {
      res
        .status(404)
        .send({ success: false, message: "No user found", users: [] });
    }
  } catch (err:any) {
    res.status(500).send({ success:false , message:err.message});
  }
};

const getLoggedInUser: RequestHandler = async(req,res)=> {
  try{
    const userData = req as UserData
    const getUser = await User.findOne({_id:userData.userId}).select("_id image name email discription slogan createdAt")
    res.status(200).send({success:true,message:"User logged In",user:getUser})
  }catch(err:any){
    res.status(500).send({ success:false , message:err.message});
  }
}

const logoutUser: RequestHandler = async(req,res)=> {
  try{
  res.clearCookie("chatbox")
  res.status(200).send({success:true,message:"Logout successfully"})
  }catch(err:any){
    res.status(500).send({ success:false , message:err.message});
  }
}


export default {
  blockUser,
  unBlockUser,
  register,
  login,
  searchUsers,
  getLoggedInUser,
  logoutUser
};
