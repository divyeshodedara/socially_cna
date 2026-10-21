import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import { globalErrorHandler, AppError } from "@socially/common";
import authRoutes from "./routes/authRoutes.js";

const app = express();
const PORT = process.env.PORT || 3002;

app.set("trust proxy", true);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", service: "auth-service", timestamp: new Date() });
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

// Mount routes on both root and /api/v1/auth for reverse-proxy compatibility
app.use("/api/v1/auth", authRoutes);
app.use("/", authRoutes);

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on auth service!`, 404));
});

app.use(globalErrorHandler);

const startServer = async () => {
  try {
    const dbUrl =
      process.env.AUTH_DB_URL ||
      process.env.DB_URL?.replace(/\/([^/?]+)(\?|$)/, "/socially_auth$2") ||
      "mongodb://localhost:27017/socially_auth";

    await mongoose.connect(dbUrl);
    console.log(`✅ Auth Service connected to DB: ${mongoose.connection.name}`);

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🔐 Auth Service is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Auth Service DB connection failed:", error.message);
    process.exit(1);
  }
};

startServer();

export default app;
