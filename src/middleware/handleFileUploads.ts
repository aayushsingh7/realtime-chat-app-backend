import { RequestHandler, Request } from "express";

import multer from "multer";
import path from "path";
import { randomInt } from "crypto";
import cloudinary from "cloudinary";

interface Req extends Request {
  cloudinary_file_link: string;
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

const handleFileUpload: RequestHandler = async (req, res, next) => {
    const fileUpload = multer({
      storage: storage,
      limits: {
        fileSize: 10485760,
      },
      fileFilter: (req: Request, file: Express.Multer.File, cb: any) => {
        if (!file.originalname.match(/\.(mp4|MPEG-4|png|jpg|jpeg|webp)$/)) {
          return cb(new Error("Plz upload a valid file"));
        }
        cb(undefined, true);
      },
    }).single("image");

    fileUpload(req, res, async function (err: any) {
      if (!req.file) {
        return res.status(400).send({
          success: false,
          message: "Cannot Upload Image as it is undefined or not",
        });
      }

      // Upload the image to Cloudinary
      const result = await cloudinary.v2.uploader.upload(req.file.path);
      const customReq = req as Req;
      customReq.cloudinary_file_link = result.secure_url;

     return  next();
    })
};

export default handleFileUpload;
