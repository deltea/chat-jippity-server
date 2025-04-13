import { Server } from "socket.io";
import express from "express";
import { createServer } from "http";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

let waitingHumans = [];
let waitingBots = [];

io.on("connection", (socket) => {
  console.log("a user connected with id: ", socket.id);

  // bot wants to find a human
  socket.on("find-match-bot", () => {
    console.log("bot wants to find a human, id:", socket.id);

    if (waitingHumans.length > 0) {
      const human = waitingHumans.pop();
      const roomId = `${human}#${socket.id}`;
      socket.join(roomId);
      io.sockets.sockets.get(human).join(roomId);

      io.to(socket.id).emit("match-found", { roomId, partnerId: human });
      io.to(human).emit("match-found", { roomId, partnerId: socket.id });
    } else {
      waitingBots.push(socket.id);
    }
  });

  // human wants to find a bot
  socket.on("find-match-human", () => {
    console.log("human wants to find a bot, id:", socket.id);

    if (waitingBots.length > 0) {
      const bot = waitingBots.pop();
      const roomId = `${bot}#${socket.id}`;
      socket.join(roomId);
      io.sockets.sockets.get(bot).join(roomId);

      io.to(socket.id).emit("match-found", { roomId, partnerId: bot });
      io.to(bot).emit("match-found", { roomId, partnerId: socket.id });
    } else {
      waitingHumans.push(socket.id);
    }
  });

  socket.on("disconnect", () => {
    console.log("user disconnected, id:", socket.id);
    waitingHumans = waitingHumans.filter((id) => id !== socket.id);
    waitingBots = waitingBots.filter((id) => id !== socket.id);

    for (const [roomId] of io.sockets.adapter.rooms) {
      if (roomId.includes(socket.id)) {
        socket.to(roomId).emit("partner-left");
        break;
      }
    }
  });
});

server.listen(3000, () => {
  console.log("server running on http://localhost:3000");
});
