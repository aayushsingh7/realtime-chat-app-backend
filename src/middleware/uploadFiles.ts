import cloudinary from "cloudinary";
import { RequestHandler } from "express";

const uploadFiles: RequestHandler = async (req, res, next) => {
  const { file } = req.body;
  try {
    if (!file) return next();
    const result = await cloudinary.v2.uploader.upload(file, {
      folder: "Chat-app/Message-files",
      resource_type: "auto",
      transformation: {
        quality: 70,
      },
    });

    req.body.file_url = result.secure_url;
    next();
  } catch (err) {
    res.status(500).send({
      success: false,
      message: "Something went wrong!, please try again later",
    });
  }
};

export default uploadFiles;
