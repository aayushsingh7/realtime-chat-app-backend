import express from 'express'
import messageController from '../controllers/messageControllers'
import fileUploadMiddleware from '../middleware/messageFileUpload'
import userAuthentication from '../middleware/userAuthentication'

const messageRoutes = express.Router()

messageRoutes.post("/new-message",userAuthentication,messageController.addMessage)
messageRoutes.post("/add-alert-message",userAuthentication,messageController.addEventAlertMessage)
messageRoutes.delete("/delete-message",userAuthentication,messageController.deleteMessage)

export default messageRoutes