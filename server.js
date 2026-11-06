const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  });

  const io = new Server(server, {
    path: "/socket.io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Make io accessible globally across API routes
  global.io = io;

  io.on("connection", (socket) => {
    socket.on("join_event", (eventCode) => {
      if (!eventCode) return;
      const room = `event:${eventCode.toUpperCase()}`;
      socket.join(room);
      // console.log(`Socket ${socket.id} joined ${room}`);
    });

    socket.on("leave_event", (eventCode) => {
      if (!eventCode) return;
      const room = `event:${eventCode.toUpperCase()}`;
      socket.leave(room);
    });

    socket.on("disconnect", () => {
      // Client disconnected
    });
  });

  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Slido App Server ready on http://${hostname}:${port}`);
    console.log(`> Environment: ${dev ? "Development" : "Production"}`);
  });
});

