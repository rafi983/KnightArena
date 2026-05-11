"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

function getSocketUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (envUrl && envUrl.trim()) return envUrl;
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getSocketUrl(), {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
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
