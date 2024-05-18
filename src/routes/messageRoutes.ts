import express from "express";
import messageController from "../controllers/messageControllers";
import userAuthentication from "../middleware/userAuthentication";
import uploadFiles from "../middleware/uploadFiles";

const messageRoutes = express.Router();

messageRoutes.put(
  "/new-message",
  userAuthentication,
  uploadFiles,
  messageController.addMessage
);
messageRoutes.put(
  "/group-chat/alert-message",
  userAuthentication,
  messageController.addEventAlertMessage
);
messageRoutes.delete(
  "/delete-message",
  userAuthentication,
  messageController.deleteMessage
);
messageRoutes.get("/messages", userAuthentication, messageController.messages);
messageRoutes.put(
  "/add-to-star-messages",
  userAuthentication,
  messageController.addToStarredMessages
);
messageRoutes.put(
  "/remove-from-star-messages",
  userAuthentication,
  messageController.removeFromStarredMessages
);
messageRoutes.get(
  "/starred-messages",
  userAuthentication,
  messageController.getStarredMessages
);
messageRoutes.put(
  "/message-seen",
  userAuthentication,
  messageController.messageSeen
);
messageRoutes.put(
  "/add-reaction",
  userAuthentication,
  messageController.addReaction
);
messageRoutes.put(
  "/remove-reaction",
  userAuthentication,
  messageController.removeReaction
);
messageRoutes.get(
  "/search-starred-messages",
  userAuthentication,
  messageController.searchStarredMessages
);
messageRoutes.get(
  "/more-messages",
  userAuthentication,
  messageController.messages
);
export default messageRoutes;
