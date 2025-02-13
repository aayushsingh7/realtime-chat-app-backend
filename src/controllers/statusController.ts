import { RequestHandler } from "express";
import Status from "../models/statusModel";
import User from "../models/userMode";

const getStatus: RequestHandler = async (req, res) => {
  const { userId } = req.query;
  try {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const status = await Status.find({
      postedBy: userId,
      createdAt: { $gte: twentyFourHoursAgo },
    });

    res.status(200).send({
      success: true,
      message: "Status fetched successfully",
      data: status,
    });
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const addStatus: RequestHandler = async (req, res) => {
  const { extension, fileType, url, postedBy, chatId } = req.body;
  try {
    const newStatus = new Status({
      extension,
      fileType,
      url,
      postedBy,
      seenBy: [],
      chatId,
    });

    await newStatus.save();
    let updateUserStatus = await User.updateOne(
      { _id: postedBy },
      { $set: { activeStatus: true, latestStatus: newStatus } }
    );

    res.status(201).send({
      message: "New status added successfully",
      success: false,
      data: newStatus,
    });
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const statusSeen: RequestHandler = async (req, res) => {
  const { userId, statusId } = req.body;
  try {
    const updateStatus = await Status.updateOne(
      { _id: statusId },
      { $push: { seenBy: userId } }
    );
    if (updateStatus.acknowledged) {
      res.status(200).send({
        success: true,
        message: "Success",
      });
    } else {
      res.status(400).send({
        success: false,
        message: "Something went wrong, please try again later",
      });
    }
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const removeStatus: RequestHandler = async (req, res) => {
  const { statusId } = req.body;
  try {
    let deleteOperation = await Status.deleteOne({ _id: statusId });
    if (deleteOperation.acknowledged) {
      res
        .status(200)
        .send({ success: true, message: "Status deleted successfully" });
    } else {
      res.status(400).send({
        success: false,
        message: "Something went wrong, please try again later",
      });
    }
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

export default {
  getStatus,
  addStatus,
  removeStatus,
  statusSeen,
};
