const {ObjectId} = require("mongodb")

module.exports = {
  sendMessage,
};



function sendMessage(context, events, next) {
  // Build your payload here
  const payload = {
    userId: new ObjectId(),
    isReply: false,
    repliedTo: null,
    file: null,
    msgType: "new message arrived",
    chatId: new ObjectId(),
    document: null,
    fileName: null,
    fileSize: 0,
    caption: null,
  };

  context.vars.messagePayload = payload;

  return next();
}
