const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const config = require("./config/env");
const { connectDB } = require("./config/db");
const { initSockets } = require("./sockets");

async function start() {
  await connectDB();

  // Socket.IO needs the raw http.Server (not the Express app) so it can
  // upgrade connections to WebSockets on the same port - no separate
  // process or port to run/proxy.
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: config.clientOrigin }
  });
  initSockets(io);

  // Stashed on the app so REST controllers (discussionController.addComment)
  // can broadcast to a discussion's room right after saving, without every
  // controller needing its own reference to `io`.
  app.set("io", io);

  server.listen(config.port, () => {
    console.log(`DR Screening backend listening on http://localhost:${config.port}`);
  });
}

start();