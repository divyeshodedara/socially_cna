import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { rateLimit } from "express-rate-limit";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Microservice backend endpoints
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:3002";
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://localhost:3003";
const POST_SERVICE_URL = process.env.POST_SERVICE_URL || "http://localhost:3004";
const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || "http://localhost:3005";
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3006";
const REALTIME_SERVICE_URL = process.env.REALTIME_SERVICE_URL || "http://localhost:3001";

// Trust proxy for IP forwarding
app.set("trust proxy", true);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", service: "api-gateway", timestamp: new Date() });
});

app.get("/check", (req, res) => {
  res.status(200).json({ message: "OK" });
});

// Security & Logging
app.use(
  cors({
    origin: [FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  }),
);

app.use(helmet());
app.use(cookieParser());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Global API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "fail",
    message: "Too many requests from this IP, please try again in 15 minutes",
  },
});
app.use("/api/v1", apiLimiter);

// JWT Enrichment: extracts user info from cookie/auth header and passes via headers
const enrichUserHeaders = (proxyReq, req) => {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization && req.headers.authorization.split(" ")[1]);

    if (token && process.env.JWT_SECRET) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded && decoded.id) {
        proxyReq.setHeader("x-user-id", decoded.id);
        if (decoded.username) {
          proxyReq.setHeader("x-user-username", encodeURIComponent(decoded.username));
        }
        if (decoded.email) {
          proxyReq.setHeader("x-user-email", encodeURIComponent(decoded.email));
        }
      }
    }
  } catch (err) {
    // Invalid or expired token: headers not attached, downstream handles 401 if protected
  }
};

// Common proxy config generator
const createServiceProxy = (targetUrl, pathRewrite = {}) => {
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    ws: false,
    pathRewrite,
    on: {
      proxyReq: (proxyReq, req, res) => {
        enrichUserHeaders(proxyReq, req);
      },
      error: (err, req, res) => {
        console.error(`Proxy error connecting to ${targetUrl}:`, err.message);
        if (!res.headersSent) {
          res.status(503).json({
            status: "error",
            message: `Service unavailable at ${targetUrl}`,
          });
        }
      },
    },
  });
};

// Route Proxies
app.use("/api/v1/auth", createServiceProxy(AUTH_SERVICE_URL));
app.use("/api/v1/users", createServiceProxy(USER_SERVICE_URL));
app.use("/api/v1/posts", createServiceProxy(POST_SERVICE_URL));
app.use("/api/v1/messages", createServiceProxy(CHAT_SERVICE_URL));
app.use("/api/v1/notifications", createServiceProxy(NOTIFICATION_SERVICE_URL));

// Socket.IO Proxy (HTTP polling + WebSocket upgrades)
const socketProxy = createProxyMiddleware({
  target: REALTIME_SERVICE_URL,
  changeOrigin: true,
  ws: true,
  on: {
    error: (err, req, res) => {
      console.error("Socket proxy error:", err.message);
    },
  },
});

app.use("/socket.io", socketProxy);

// Handle manual upgrade on server for WebSockets
server.on("upgrade", (req, socket, head) => {
  if (req.url.startsWith("/socket.io")) {
    socketProxy.upgrade(req, socket, head);
  }
});

// 404 Handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on API Gateway`,
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`   - Auth Service: ${AUTH_SERVICE_URL}`);
  console.log(`   - User Service: ${USER_SERVICE_URL}`);
  console.log(`   - Post Service: ${POST_SERVICE_URL}`);
  console.log(`   - Chat Service: ${CHAT_SERVICE_URL}`);
  console.log(`   - Notification Service: ${NOTIFICATION_SERVICE_URL}`);
  console.log(`   - Real-Time Service: ${REALTIME_SERVICE_URL}`);
});

export default app;
