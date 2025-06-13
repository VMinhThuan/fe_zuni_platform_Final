const authRoute = require("./authRoute");
const userRoute = require("./userRoute");
const roleRoute = require("./roleRoute");
const messageRoute = require("./messageRoute");
const conversationRoute = require("./conversationRoute");
const uploadRoute = require("./uploadRoute");
const friendRoute = require("./friendRoute");
const chatRoute = require("./chatRoute");
const reactionRoute = require("./reactionRoute");

const initRoutes = (app) => {
  app.use("/v1/api/auth", authRoute);
  app.use("/v1/api/users", userRoute);
  app.use("/v1/api/roles", roleRoute);
  app.use("/v1/api/messages", messageRoute);
  app.use("/v1/api/conversations", conversationRoute);
  app.use("/v1/api/uploads", uploadRoute);
  app.use("/v1/api/friends", friendRoute);
  app.use("/v1/api/chat", chatRoute);
  app.use("/v1/api/reactions", reactionRoute);
};

module.exports = initRoutes;
