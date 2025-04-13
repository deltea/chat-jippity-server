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

  socket.on("find-match", ({ type }) => {
    console.log(type);

    if (type === "human") {
      // human wants to find a bot
      console.log("human wants to find a bot, id:", socket.id);
      if (waitingBots.length > 0) {
        console.log("human and bot matched!");

        const bot = waitingBots.pop();
        const roomId = `${bot}#${socket.id}`;
        socket.join(roomId);
        io.sockets.sockets.get(bot).join(roomId);

        io.to(socket.id).emit("match-found", { roomId, partnerId: bot });
        io.to(bot).emit("match-found", { roomId, partnerId: socket.id });
      } else {
        waitingHumans.push(socket.id);
      }
    } else if (type === "bot") {
      // bot wants to find a human
      console.log("bot wants to find a human, id:", socket.id);

      if (waitingHumans.length > 0) {
        console.log("human and bot matched!");

        const human = waitingHumans.pop();
        const roomId = `${human}#${socket.id}`;
        socket.join(roomId);
        io.sockets.sockets.get(human).join(roomId);

        io.to(socket.id).emit("match-found", { roomId, partnerId: human });
        io.to(human).emit("match-found", { roomId, partnerId: socket.id });
      } else {
        waitingBots.push(socket.id);
      }
    }
  });

  // human sends a message to chatgpt
  socket.on("send-message", ({ roomId, message }) => {
    console.log("message sent from human, roomId:", roomId);
    socket.to(roomId).emit("receive-message", message);
  });

  // chatgpt replies to the message sent by human
  socket.on("message-reply", ({ roomId, reply }) => {
    console.log(reply);

    console.log("message reply from bot, roomId:", roomId);
    socket.to(roomId).emit("receive-reply", reply);
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

  io.engine.on("connection_error", (err) => {
    console.log(err.req);      // the request object
    console.log(err.code);     // the error code, for example 1
    console.log(err.message);  // the error message, for example "Session ID unknown"
    console.log(err.context);  // some additional error context
  });
});

server.listen(3000, () => {
  console.log("server running on http://localhost:3000");
});
