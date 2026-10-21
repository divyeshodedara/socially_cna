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
import userRoutes from "./routes/userRoutes.js";
import User from "./models/user.model.js";

const app = express();
const PORT = process.env.PORT || 3003;

app.set("trust proxy", true);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", service: "user-service", timestamp: new Date() });
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

app.use("/api/v1/users", userRoutes);
app.use("/", userRoutes);

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on user service!`, 404));
});

app.use(globalErrorHandler);

// Listen to domain events (e.g. user.verified from auth-service)
subscribeToChannel(CHANNELS.DOMAIN_EVENTS, async (event) => {
  if (event.type === "user.verified") {
    try {
      const { userId, username, email, profilePicture, bio } = event.data;
      const existing = await User.findById(userId);
      if (!existing) {
        await User.create({
          _id: userId,
          username,
          email,
          profilePicture: profilePicture || undefined,
          bio: bio || "",
        });
        console.log(`👤 Created user profile for verified user: ${username}`);
      }
    } catch (err) {
      console.error("Error creating user profile from user.verified event:", err.message);
    }
  }
});

const startServer = async () => {
  try {
    const dbUrl =
      process.env.USER_DB_URL ||
      process.env.DB_URL?.replace(/\/([^/?]+)(\?|$)/, "/socially_users$2") ||
      "mongodb://localhost:27017/socially_users";

    await mongoose.connect(dbUrl);
    console.log(`✅ User Service connected to DB: ${mongoose.connection.name}`);

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`👥 User Service is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("User Service DB connection failed:", error.message);
    process.exit(1);
  }
};

startServer();

export default app;
