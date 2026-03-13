import { Schema, model } from "mongoose";
import IStatus from "../types/statusType";

const statusSchema = new Schema<IStatus>(
  {
    extension: { type: String, required: true },
    fileType: { type: String, required: true },
    url: { type: String, required: true },
    postedBy: { type: Schema.Types.ObjectId, ref: "user" },
    seenBy: [{ type: Schema.Types.ObjectId, ref: "user" }],
    chatId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

const Status = model<IStatus>("status", statusSchema);

export default Status;
