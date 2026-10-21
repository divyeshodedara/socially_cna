import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import axios from "axios";
import {
  createRedisClient,
  subscribeToChannel,
  CHANNELS,
  publishDomainEvent,
} from "@socially/common";

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || "http://localhost:3005";
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3006";

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", service: "realtime-service", timestamp: new Date() });
});

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: [FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    credentials: true,
  },
  pingTimeout: 60000,
});

// Setup Redis Adapter for multi-instance scaling if Redis is available
try {
  const pubClient = createRedisClient();
  const subClient = createRedisClient();
  io.adapter(createAdapter(pubClient, subClient));
  console.log("Socket.IO Redis adapter mounted successfully");
} catch (err) {
  console.warn("Could not attach Redis adapter, falling back to in-memory:", err.message);
}

// Subscribe to internal Redis Pub/Sub channels to broadcast/emit to clients
subscribeToChannel(CHANNELS.SOCKET_BROADCAST, ({ event, data }) => {
  if (event) {
    io.emit(event, data);
  }
});

subscribeToChannel(CHANNELS.SOCKET_USER, ({ userId, event, data }) => {
  if (userId && event) {
    io.to(`user:${userId}`).emit(event, data);
  }
});

// Client connection lifecycle
io.on("connection", (socket) => {
  // console.log("Socket client connected:", socket.id);

  // User authenticates/connects their user ID
  socket.on("user-connected", async (userId) => {
    if (!userId) return;

    socket.userId = userId.toString();
    const userRoom = `user:${userId}`;
    socket.join(userRoom);

    // Fetch initial unread counts concurrently from Chat & Notification services
    try {
      const [msgCountRes, notifCountRes] = await Promise.allSettled([
        axios.get(`${CHAT_SERVICE_URL}/api/v1/messages/unread/count`, {
          headers: { "x-user-id": userId },
          timeout: 2000,
        }),
        axios.get(`${NOTIFICATION_SERVICE_URL}/api/v1/notifications/unread-count`, {
          headers: { "x-user-id": userId },
          timeout: 2000,
        }),
      ]);

      const unreadMessageCount =
        msgCountRes.status === "fulfilled" ? msgCountRes.value.data?.data?.unreadCount || 0 : 0;
      const unreadNotificationCount =
        notifCountRes.status === "fulfilled" ? notifCountRes.value.data?.data?.count || 0 : 0;

      socket.emit("initial-counts", {
        unreadMessageCount,
        unreadNotificationCount,
      });
    } catch (err) {
      console.error("Error fetching initial counts:", err.message);
      socket.emit("initial-counts", { unreadMessageCount: 0, unreadNotificationCount: 0 });
    }
  });

  // Typing indicators
  socket.on("typing", ({ senderId, receiverId }) => {
    if (receiverId) {
      io.to(`user:${receiverId}`).emit("userTyping", { userId: senderId });
    }
  });

  socket.on("stopTyping", ({ senderId, receiverId }) => {
    if (receiverId) {
      io.to(`user:${receiverId}`).emit("userStoppedTyping", { userId: senderId });
    }
  });

  // Mark messages seen
  socket.on("markMessagesSeen", async ({ senderId, receiverId }) => {
    try {
      // Notify chat service via domain event or internal call
      publishDomainEvent("message.markSeen", { senderId, receiverId });

      // Notify the sender that receiver viewed their messages
      io.to(`user:${senderId}`).emit("message", {
        type: "messagesSeen",
        seenBy: receiverId,
      });
    } catch (err) {
      console.error("Error handling markMessagesSeen:", err.message);
    }
  });

  socket.on("disconnect", () => {
    // Socket automatically leaves rooms upon disconnection
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`📡 Real-Time Service running on port ${PORT}`);
});

export default server;
