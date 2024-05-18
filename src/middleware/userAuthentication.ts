import { RequestHandler, Request } from "express";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import User from "../models/userMode";

interface DecodedPayload {
  _id: string;
}

const userAuthentication: RequestHandler = async (req, res, next) => {
  try {
    const token = req.cookies.chatverse;

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const decoded = jwt.verify(
        token,
        `${process.env.SECRET_KEY}`
      ) as DecodedPayload;

      let getUserData = await User.findOne({ _id: decoded._id });
      if (!getUserData?._id)
        return res
          .status(404)
          .send({ success: false, message: "The token is invalid" });

      req.body.userId = getUserData?._id.toString();
      next();
    } catch (err) {
      res.status(401).json({ success: false, msg: "No user found" });
    }
  } catch (err) {
    res.status(500).send(err);
  }
};

export default userAuthentication;
