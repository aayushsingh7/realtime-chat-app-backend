import express from "express";
import messageController from "../controllers/messageController";
import userAuthentication from "../middleware/userAuthentication";
import uploadFiles from "../middleware/uploadFiles";
          
const router = express.Router();

router.post("/messages", userAuthentication, uploadFiles, messageController.addMessage);
router.get("/messages", userAuthentication, messageController.messages);
router.delete("/messages", userAuthentication, messageController.deleteMessages);
router.patch("/messages/seen", userAuthentication, messageController.messagesSeen);
router.post("/messages/alert", userAuthentication, messageController.addEventAlertMessage);
router.post("/messages/star", userAuthentication, messageController.addToStarredMessages);
router.delete("/messages/star", userAuthentication, messageController.removeFromStarredMessages);
router.post("/messages/:id/reactions", userAuthentication, messageController.addReaction);
router.delete("/messages/:id/reactions", userAuthentication, messageController.removeReaction);

router.get("/starred-messages", userAuthentication, messageController.getStarredMessages);
router.get("/starred-messages/search", userAuthentication, messageController.searchStarredMessages);


export default router;
