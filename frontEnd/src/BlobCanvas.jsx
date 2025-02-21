import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io("wss://twodmetaverse.onrender.com", {
  transports: ["websocket"], // Force WebSocket connection
});

const CANVAS_WIDTH = 1556;
const CANVAS_HEIGHT = 1197;
const BLOB_SIZE = 10;
const SPEED = 15;
const SCALE = 1.5; // Zoom Level

const RegionPopup = ({ isOpen, onClose, url }) => {
  if (!isOpen) return null;
  return (
    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-4 rounded-lg shadow-lg w-[600px] h-[400px] flex flex-col items-center">
        <h2 className="text-xl font-bold">You Entered a Region!</h2>
        <iframe src={url} width="100%" height="300px" title="Region Content" />
        <button className="mt-4 px-4 py-2 bg-red-500 text-white rounded" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default function BlobCanvas() {
  const canvasRef = useRef(null);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [players, setPlayers] = useState([]); // Store all players and their colors
  const backgroundRef = useRef(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupContent, setPopupContent] = useState("");

  // Define interactive regions
  const REGIONS = [
    { id: 1, x: 200, y: 300, width: 100, height: 100, link: "http://127.0.0.1:5000" },
    { id: 2, x: 500, y: 150, width: 150, height: 150, link: "https://www.wikipedia.org" },
  ];

  useEffect(() => {
    console.log("Connected with ID:", socket.id);

    // Handle player movement updates from other clients
    socket.on("playerMoved", (data) => {
      setPlayers((prevPlayers) => {
        const existingPlayer = prevPlayers.find((player) => player.id === data.id);
        if (existingPlayer) {
          return prevPlayers.map((player) =>
            player.id === data.id ? { ...player, x: data.x, y: data.y } : player
          );
        } else {
          const newColor = getRandomColor();
          return [...prevPlayers, { id: data.id, x: data.x, y: data.y, color: newColor }];
        }
      });
    });

    return () => {
      socket.off("playerMoved");
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      setPosition((prev) => {
        let { x, y } = prev;
        if (e.key === "ArrowUp") y = Math.max(0, y - SPEED);
        if (e.key === "ArrowDown") y = Math.min(CANVAS_HEIGHT, y + SPEED);
        if (e.key === "ArrowLeft") x = Math.max(0, x - SPEED);
        if (e.key === "ArrowRight") x = Math.min(CANVAS_WIDTH, x + SPEED);

        // SPACEBAR: Check if the player is inside any region
        if (e.key === " " || e.key === "Spacebar") {
          const region = REGIONS.find(
            (r) => x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height
          );
          if (region) {
            setPopupContent(region.link);
            setIsPopupOpen(true);
          }
        }

        socket.emit("movePlayer", { x, y });
        return { x, y };
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Load background image
    const background = new Image();
    background.src = "/mapFinal.png";
    background.onload = () => {
      backgroundRef.current = background;
      draw();
    };

    const draw = () => {
      if (!backgroundRef.current) return; // Ensure background is loaded

      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transformations
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Calculate camera position
      let cameraX = position.x * SCALE - CANVAS_WIDTH / 2;
      let cameraY = position.y * SCALE - CANVAS_HEIGHT / 2;

      // Clamp camera so it doesn’t move past the edges
      cameraX = Math.max(0, Math.min(cameraX, CANVAS_WIDTH * SCALE - CANVAS_WIDTH));
      cameraY = Math.max(0, Math.min(cameraY, CANVAS_HEIGHT * SCALE - CANVAS_HEIGHT));

      ctx.setTransform(SCALE, 0, 0, SCALE, -cameraX, -cameraY); // Apply camera transform

      // Draw background image
      ctx.drawImage(backgroundRef.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw blob (current player)
      ctx.fillStyle = "blue";
      ctx.beginPath();
      ctx.arc(position.x, position.y, BLOB_SIZE, 0, Math.PI * 2);
      ctx.fill();

      // Draw other players
      players.forEach((player) => {
        if (player.id !== socket.id) {
          ctx.fillStyle = player.color;
          ctx.beginPath();
          ctx.arc(player.x, player.y, BLOB_SIZE, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transformation after drawing
    };

    draw(); // Ensure draw is called when dependencies update
  }, [position, players]);

  return (
    <div className="relative">
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="border border-gray-500" />
      
      {/* Region Popup Component */}
      <RegionPopup isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)} url={popupContent} />
    </div>
  );
}

// Function to generate random colors for players
const getRandomColor = () => {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};
