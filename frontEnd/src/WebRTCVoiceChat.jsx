import { useEffect, useState } from "react";
import io from "socket.io-client";

// WebSocket signaling server
const socket = io("wss://twodmetaverse.onrender.com", {
  transports: ["websocket"],
});

// Store WebRTC connections per player
const peerConnections = {};
const audioElements = {};

export default function WebRTCVoiceChat() {
  const [localStream, setLocalStream] = useState(null);

  useEffect(() => {
    // Get microphone access
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      setLocalStream(stream);
      socket.emit("joinVoiceChat"); // Notify server that this player wants to chat
    });

    // Handle incoming WebRTC offers
    socket.on("webrtcOffer", async ({ from, offer }) => {
      const peer = createPeerConnection(from);
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("webrtcAnswer", { to: from, answer });
    });

    // Handle incoming WebRTC answers
    socket.on("webrtcAnswer", async ({ from, answer }) => {
      if (peerConnections[from]) {
        await peerConnections[from].setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    // Handle incoming ICE candidates
    socket.on("webrtcCandidate", ({ from, candidate }) => {
      if (peerConnections[from]) {
        peerConnections[from].addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    return () => {
      socket.off("webrtcOffer");
      socket.off("webrtcAnswer");
      socket.off("webrtcCandidate");
    };
  }, []);

  // Create a WebRTC peer connection
  const createPeerConnection = (peerId) => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // Add local audio track
    if (localStream) {
      localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));
    }

    // Handle remote audio streams
    peer.ontrack = (event) => {
      if (!audioElements[peerId]) {
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.autoplay = true;
        audioElements[peerId] = audio;
      }
    };

    // Handle ICE candidates
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtcCandidate", { to: peerId, candidate: event.candidate });
      }
    };

    peerConnections[peerId] = peer;
    return peer;
  };

  // Initiate a WebRTC connection
  const connectToPeer = async (peerId) => {
    const peer = createPeerConnection(peerId);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit("webrtcOffer", { to: peerId, offer });
  };

  // Connect to all other players when a new user joins
  socket.on("newPlayer", ({ playerId }) => {
    connectToPeer(playerId);
  });

  return (
    <div>
      <h2>Voice Chat Active</h2>
      <button onClick={() => localStream.getTracks().forEach((track) => track.stop())}>
        Stop Voice Chat
      </button>
    </div>
  );
}
