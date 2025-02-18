const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const players = {}; // Store players by their socket ID

// Handle incoming player movement
io.on("connection", (socket) => {
  console.log("New player connected");

  // Listen for player movement
  socket.on("movePlayer", (data) => {
    // Update the player’s position in the players object
    players[socket.id] = { id: socket.id, x: data.x, y: data.y };

    // Log the player's position to the console
    console.log(`Player ${socket.id} moved to (${data.x}, ${data.y})`);

    // Broadcast the new player position to other clients
    socket.broadcast.emit("playerMoved", { id: socket.id, x: data.x, y: data.y });
  });

  // When a player disconnects, remove them from the players list
  socket.on("disconnect", () => {
    console.log("Player disconnected");
    delete players[socket.id];
  });
});

server.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
});
