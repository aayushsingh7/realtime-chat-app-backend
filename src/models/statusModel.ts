import { Schema, model } from "mongoose";

const statusSchema = new Schema(
  {
    extension: { type: String, required: true },
    fileType: { type: String, required: true },
    url: { type: String, required: true },
    postedBy: { type: Schema.Types.ObjectId, ref: "user" },
    seenBy: [{ type: Schema.Types.ObjectId, ref: "user" }],
    chatId: { type: String, required: true },
  },
  { timestamps: true }
);

const Status = model("status", statusSchema);

export default Status;
