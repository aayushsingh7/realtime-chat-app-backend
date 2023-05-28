import { RequestHandler , Request } from "express";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import User from "../models/userMode";

interface CustomReq extends Request {
    userId:string
}

interface DecodedPayload {
  _id: string;
}


const userAuthentication: RequestHandler = async (req, res, next) => {
  try {
    const customReq = req as CustomReq
    const token =  req.cookies.chatbox

    if (!token) {
      return  res.status(401).json({ error: "Unauthorized" });
    }

    // Verify the session token and decode its payload
    try {
      const decoded = jwt.verify(token, `${process.env.SECRET_KEY}`) as DecodedPayload

      let getUserData = await User.findOne({_id:decoded._id})
      if(!getUserData?._id) return res.status(404).send({success:false , message:"The token is invalid"})
    

      customReq.userId  = getUserData?._id.toString()
      next()

    } catch (err) {
     res.status(401).json({ success:false , msg:"No user found" });
    }
  } catch (err) {
    res.status(500).send(err);
  }
};

export default userAuthentication