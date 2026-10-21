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
import postRoutes from "./routes/postRoutes.js";
import UserSnapshot from "./models/userSnapshot.model.js";

const app = express();
const PORT = process.env.PORT || 3004;

app.set("trust proxy", true);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", service: "post-service", timestamp: new Date() });
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

app.use("/api/v1/posts", postRoutes);
app.use("/", postRoutes);

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on post service!`, 404));
});

app.use(globalErrorHandler);

// Sync user snapshot when profile updates
subscribeToChannel(CHANNELS.DOMAIN_EVENTS, async (event) => {
  if (event.type === "user.profile_updated" || event.type === "user.verified") {
    try {
      const { userId, username, email, profilePicture, bio } = event.data;
      await UserSnapshot.findByIdAndUpdate(
        userId,
        {
          username,
          ...(email && { email }),
          ...(profilePicture && { profilePicture }),
          ...(bio !== undefined && { bio }),
        },
        { upsert: true, new: true },
      );
    } catch (err) {
      console.error("Error updating UserSnapshot in post-service:", err.message);
    }
  }
});

const startServer = async () => {
  try {
    const dbUrl =
      process.env.POST_DB_URL ||
      process.env.DB_URL?.replace(/\/([^/?]+)(\?|$)/, "/socially_posts$2") ||
      "mongodb://localhost:27017/socially_posts";

    await mongoose.connect(dbUrl);
    console.log(`✅ Post Service connected to DB: ${mongoose.connection.name}`);

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`📸 Post Service is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Post Service DB connection failed:", error.message);
    process.exit(1);
  }
};

startServer();

export default app;
