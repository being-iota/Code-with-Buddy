const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const ACTIONS = require("./src/Actions");
require('dotenv').config();

const app = express();
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://code-with-buddy.azurewebsites.net/", "http://localhost:3000", "https://code-with-buddy-i1u9-kaap10s-projects.vercel.app/"], // Allow both production and local development
    methods: ["GET", "POST"],
  },
});

// Serve static files from the 'build' directory
app.use(express.static(path.join(__dirname, "build")));

// Catch-all route to serve the React app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

const userSocketMap = {};

// Get all clients connected to a room
function getAllConnectedClients(roomId) {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => {
    return {
      socketId,
      username: userSocketMap[socketId],
    };
  });
}

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // Handle a user joining a room
  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  // Handle WebRTC signaling
  socket.on(ACTIONS.ICE_CANDIDATE, ({ candidate, targetSocketId }) => {
    io.to(targetSocketId).emit(ACTIONS.ICE_CANDIDATE, {
      candidate,
      socketId: socket.id,
    });
  });

  socket.on(ACTIONS.OFFER, ({ offer, targetSocketId }) => {
    io.to(targetSocketId).emit(ACTIONS.OFFER, {
      offer,
      socketId: socket.id,
    });
  });

  socket.on(ACTIONS.ANSWER, ({ answer, targetSocketId }) => {
    io.to(targetSocketId).emit(ACTIONS.ANSWER, {
      answer,
      socketId: socket.id,
    });
  });

  // Handle code change
  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  // Handle syncing code to a specific user
  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  // Handle language change
  socket.on(ACTIONS.LANGUAGE_CHANGE, ({ roomId, language }) => {
    socket.in(roomId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
  });

  // Handle chat messages - updated to broadcast to all users in the room
  socket.on(ACTIONS.CHAT_MESSAGE, ({ roomId, message, sender }) => {
    // Broadcast to everyone in the room, including the sender
    io.to(roomId).emit(ACTIONS.CHAT_MESSAGE, { 
      message, 
      sender,
      timestamp: new Date().toISOString() // Add timestamp for better message ordering
    });
  });

  // Handle user disconnecting
  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });
    delete userSocketMap[socket.id];
    socket.leave();
    console.log("Socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT | 3000;
server.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));

