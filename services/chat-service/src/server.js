import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import {
  globalErrorHandler,
  AppError,
  subscribeToChannel,
  CHANNELS,
} from "@socially/common";
import messageRoutes from "./routes/messageRoutes.js";
import Message from "./models/message.model.js";
import ChatUserSnapshot from "./models/chatUserSnapshot.model.js";

const app = express();
const PORT = process.env.PORT || 3005;

app.set("trust proxy", true);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", service: "chat-service", timestamp: new Date() });
});

app.use(
  cors({
    origin: [process.env.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  }),
);

app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: "10kb" }));

app.use((req, res, next) => {
  if (req.body) {
    req.body = mongoSanitize.sanitize(req.body);
  }
  next();
});

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use("/api/v1/messages", messageRoutes);
app.use("/", messageRoutes);

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on chat service!`, 404));
});

app.use(globalErrorHandler);

// Subscribe to domain events
subscribeToChannel(CHANNELS.DOMAIN_EVENTS, async (event) => {
  if (event.type === "message.markSeen") {
    try {
      const { senderId, receiverId } = event.data;
      await Message.updateMany(
        { sender: senderId, receiver: receiverId, seen: false },
        { seen: true, seenAt: new Date() },
      );
    } catch (err) {
      console.error("Error marking messages as seen:", err.message);
    }
  }

  if (event.type === "user.profile_updated" || event.type === "user.verified") {
    try {
      const { userId, username, email, profilePicture } = event.data;
      await ChatUserSnapshot.findByIdAndUpdate(
        userId,
        {
          username,
          ...(email && { email }),
          ...(profilePicture && { profilePicture }),
        },
        { upsert: true, new: true },
      );
    } catch (err) {
      console.error("Error updating ChatUserSnapshot:", err.message);
    }
  }
});

const startServer = async () => {
  try {
    const dbUrl =
      process.env.CHAT_DB_URL ||
      process.env.DB_URL?.replace(/\/([^/?]+)(\?|$)/, "/socially_chat$2") ||
      "mongodb://localhost:27017/socially_chat";

    await mongoose.connect(dbUrl);
    console.log(`✅ Chat Service connected to DB: ${mongoose.connection.name}`);

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`💬 Chat Service is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Chat Service DB connection failed:", error.message);
    process.exit(1);
  }
};

startServer();

export default app;
