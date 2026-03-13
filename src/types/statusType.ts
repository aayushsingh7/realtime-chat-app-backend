import { Document, Types } from "mongoose";

interface IStatus extends Document {
  _id:Types.ObjectId;
  extension: string;
  fileType: string;
  url: string;
  postedBy: Types.ObjectId;
  seenBy: Types.ObjectId[];
  chatId: Types.ObjectId;
}

export default IStatus;
