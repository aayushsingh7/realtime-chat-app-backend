import { RequestHandler, Request } from "express";

import multer from "multer";
import path from "path";
import { randomInt } from "crypto";
import cloudinary from "cloudinary";

interface MsgImage extends Request {
  cloudinary_file_link: string;
  msgType: string;
}

cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.diskStorage({
  destination: function (req: Request, file: Express.Multer.File, cb: any) {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req: Request, file: Express.Multer.File, cb: any) => {
    cb(
      null,
      `${Date.now()}-${randomInt(10000000000)}-${Math.floor(
        Math.random() * 100000000000
      )}${path.extname(file.originalname)}`
    );
  },
});



const fileUploadMiddleware: RequestHandler = async (req, res, next) => {
  try {
    if (req.headers["content-type"]?.includes("application/json")) {
      return next();
    } else {
      const fileUpload = multer({
        storage: storage,
        fileFilter: (req: Request, file: Express.Multer.File, cb: any) => {
          if (!file.originalname.match(/\.(mp4|MPEG-4|png|jpg|jpeg|webp)$/)) {
            return cb(new Error("Plz upload a valid file"));
          }
          cb(undefined, true);
        },
      }).single("message");

      fileUpload(req, res, async function (err: any) {
       try{
        if (!req.file) {
          return res.status(400).send({
            success: false,
            message: "Cannot Upload Image as it is undefined or not",
          });
        }

        const result = await cloudinary.v2.uploader.upload(req.file.path);
        const reqS = req as MsgImage;
        reqS.cloudinary_file_link = result.secure_url;

        return next();
       }catch(err){
        console.log(err)
       }
      });
    }
  } catch (err) {
    res.status(500).send(err);
    console.log("messageFileUpload middleware err", err);
  }
};

export default fileUploadMiddleware;
