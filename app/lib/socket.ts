"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
      {
        autoConnect: false,
        transports: ["websocket", "polling"],
      }
    );
  }
  return socket;
}

export function connectSocket(userId: string, userName: string) {
  const s = getSocket();

  const register = () => {
    s.emit("register", { userId, userName });
  };

  if (!s.connected) {
    s.connect();
    s.once("connect", register);
  } else {
    register();
  }

  return s;
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}
