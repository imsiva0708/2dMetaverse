import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const BLOB_SIZE = 20;
const SPEED = 5;
const REGIONS = [
  { x: 100, y: 100, width: 100, height: 100, name: "Region 1" },
  { x: 400, y: 300, width: 150, height: 150, name: "Region 2" },
];

const socket = io("http://localhost:4000");  // Replace with your server URL if needed

export default function BlobCanvas() {
  const canvasRef = useRef(null);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [players, setPlayers] = useState([]);  // Store all players and their colors

  useEffect(() => {
    // Handle player movement updates from other clients
    socket.on("playerMoved", (data) => {
      setPlayers((prevPlayers) => {
        const existingPlayer = prevPlayers.find((player) => player.id === data.id);
        if (existingPlayer) {
          // Update player position if the player already exists
          return prevPlayers.map((player) =>
            player.id === data.id ? { ...player, x: data.x, y: data.y } : player
          );
        } else {
          // Add new player with unique color
          const newColor = getRandomColor();
          return [...prevPlayers, { id: data.id, x: data.x, y: data.y, color: newColor }];
        }
      });
    });

    // Emit player movement to the server
    const handleKeyDown = (e) => {
      setPosition((prev) => {
        let { x, y } = prev;
        if (e.key === "ArrowUp") y = Math.max(0, y - SPEED);
        if (e.key === "ArrowDown") y = Math.min(CANVAS_HEIGHT, y + SPEED);
        if (e.key === "ArrowLeft") x = Math.max(0, x - SPEED);
        if (e.key === "ArrowRight") x = Math.min(CANVAS_WIDTH, x + SPEED);
        
        if (e.key === "Enter") {
          const insideRegion = REGIONS.find(
            (region) =>
              x >= region.x &&
              x <= region.x + region.width &&
              y >= region.y &&
              y <= region.y + region.height
          );
          console.log(`Blob Position: (${x}, ${y})`);
          if (insideRegion) console.log(`Inside: ${insideRegion.name}`);
        }

        // Emit updated player position to the server
        socket.emit("movePlayer", { x, y });

        return { x, y };
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Function to generate random colors for players
  const getRandomColor = () => {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  // Draw function to update the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const draw = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Draw regions
      ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
      REGIONS.forEach((region) => {
        ctx.fillRect(region.x, region.y, region.width, region.height);
      });

      // Draw blob (current player)
      ctx.fillStyle = "blue";
      ctx.beginPath();
      ctx.arc(position.x, position.y, BLOB_SIZE, 0, Math.PI * 2);
      ctx.fill();

      // Draw other players
      players.forEach((player) => {
        if (player.id !== socket.id) { // Don't draw yourself
          ctx.fillStyle = player.color;
          ctx.beginPath();
          ctx.arc(player.x, player.y, BLOB_SIZE, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    };

    draw();
  }, [position, players]);

  return <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="border border-gray-500" />;
}
