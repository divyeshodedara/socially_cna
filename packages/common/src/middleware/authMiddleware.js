import jwt from "jsonwebtoken";
import AppError from "../errors/AppError.js";
import catchAsync from "../errors/catchAsync.js";
import getRedisClient from "../redis/redisClient.js";

export const authMiddleware = catchAsync(async (req, res, next) => {
  // 1. Check if upstream API Gateway already verified the user
  const gatewayUserId = req.headers["x-user-id"];
  if (gatewayUserId) {
    const userRole = req.headers["x-user-role"] || "user";
    const username = req.headers["x-user-username"];
    const email = req.headers["x-user-email"];

    req.user = {
      _id: gatewayUserId,
      id: gatewayUserId,
      username: username ? decodeURIComponent(username) : undefined,
      email: email ? decodeURIComponent(email) : undefined,
      role: userRole,
    };
    return next();
  }

  // 2. Otherwise extract token from cookie or Authorization header
  const token =
    req.cookies?.token ||
    (req.headers.authorization && req.headers.authorization.split(" ")[1]);

  if (!token) {
    return next(new AppError("You are not logged in! Please log in to get access.", 401));
  }

  // 3. Verify JWT
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET is not configured");
    return next(new AppError("Internal server error", 500));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new AppError("Your token has expired! Please log in again.", 401));
    }
    return next(new AppError("Invalid token. Please log in again!", 401));
  }

  // 4. Check Redis cache for user object
  const redis = getRedisClient();
  const cacheKey = `user:${decoded.id}`;
  try {
    const cachedUser = await redis.get(cacheKey);
    if (cachedUser) {
      req.user = JSON.parse(cachedUser);
      return next();
    }
  } catch (err) {
    // Redis miss or error, continue with decoded payload
  }

  req.user = {
    _id: decoded.id,
    id: decoded.id,
    email: decoded.email,
    username: decoded.username,
  };

  next();
});

export default authMiddleware;
