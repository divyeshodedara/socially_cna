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
import notificationRoutes from "./routes/notificationRoutes.js";
import UserSnapshot from "./models/userSnapshot.model.js";
import { createNotificationInternal } from "./controllers/notificationController.js";

const app = express();
const PORT = process.env.PORT || 3006;

app.set("trust proxy", true);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", service: "notification-service", timestamp: new Date() });
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

app.use("/api/v1/notifications", notificationRoutes);
app.use("/", notificationRoutes);

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on notification service!`, 404));
});

app.use(globalErrorHandler);

// Domain Event Consumer
subscribeToChannel(CHANNELS.DOMAIN_EVENTS, async (event) => {
  try {
    if (event.type === "user.profile_updated" || event.type === "user.verified") {
      const { userId, username, profilePicture } = event.data;
      await UserSnapshot.findByIdAndUpdate(
        userId,
        {
          username,
          ...(profilePicture && { profilePicture }),
        },
        { upsert: true, new: true },
      );
    } else if (event.type === "post.liked") {
      const { recipient, sender, type, post } = event.data;
      await createNotificationInternal({ recipient, sender, type, post });
    } else if (event.type === "comment.created") {
      const { recipient, sender, type, post, comment } = event.data;
      await createNotificationInternal({ recipient, sender, type, post, comment });
    } else if (event.type === "user.followed") {
      const { recipient, sender, type } = event.data;
      await createNotificationInternal({ recipient, sender, type });
    }
  } catch (err) {
    console.error("Error processing domain event in notification service:", err.message);
  }
});

const startServer = async () => {
  try {
    const dbUrl =
      process.env.NOTIFICATION_DB_URL ||
      process.env.DB_URL?.replace(/\/([^/?]+)(\?|$)/, "/socially_notifications$2") ||
      "mongodb://localhost:27017/socially_notifications";

    await mongoose.connect(dbUrl);
    console.log(`✅ Notification Service connected to DB: ${mongoose.connection.name}`);

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🔔 Notification Service is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Notification Service DB connection failed:", error.message);
    process.exit(1);
  }
};

startServer();

export default app;
