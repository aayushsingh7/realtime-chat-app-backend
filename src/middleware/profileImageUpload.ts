import { RequestHandler, Request } from "express";

import cloudinary from "cloudinary";

const profileImageUpload: RequestHandler = async (req, res, next) => {
  const { image } = req.body;
  try {
    const newImage = await cloudinary.v2.uploader.upload(image, {
      folder: "Chat-app/Profile-pic",
      format: "webp",
      transformation: {
        quality: 80,
        fetch_format: "webp",
      },
    });

    req.body.newImage = newImage.secure_url;
    next();
  } catch (err) {
    res.status(500).send(err);
  }
};

export default profileImageUpload;
