import jwt from "jsonwebtoken";
import {
  AppError,
  catchAsync,
  getRedisClient,
  publishDomainEvent,
} from "@socially/common";
import generateOTP from "../utils/generateOtp.js";
import sendOtpEmail from "../utils/email.js";
import User from "../models/user.model.js";

const redis = getRedisClient();

const signToken = (id, username, email) => {
  return jwt.sign({ id, username, email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
};

const sendToken = (user, statusCode, res, message) => {
  const token = signToken(user._id, user.username, user.email);

  const cookieOptions = {
    expires: new Date(Date.now() + Number(process.env.COOKIE_EXPIRES_IN || 86400000)),
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "development" ? "lax" : "none",
    secure: process.env.NODE_ENV === "development" ? false : true,
  };

  res.cookie("token", token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    message,
    data: { user },
  });
};

const checkDisposableEmail = async (email) => {
  try {
    const domain = email.split("@")[1];
    const response = await fetch(`https://api.mailcheck.ai/domain/${domain}`);
    const data = await response.json();
    return data.disposable;
  } catch (err) {
    return false; // Don't block signups if disposable API is unavailable
  }
};

export const signup = catchAsync(async (req, res, next) => {
  const { username, email, password, passwordConfirm } = req.body;

  const isDisposable = await checkDisposableEmail(email);
  if (isDisposable) {
    return next(new AppError("Please use a real email address", 400));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError("User already exists", 400));
  }

  const userNameExists = await User.findOne({ username });
  if (userNameExists) {
    return next(new AppError("Username already taken", 400));
  }

  const otp = generateOTP();

  try {
    await sendOtpEmail({
      user: { username, email },
      otp,
      purpose: "verify your email",
    });
  } catch (err) {
    console.error("Email error:", err.message);
    return next(new AppError("There was an error sending the email. Please try again later.", 500));
  }

  await redis.set(`otp:${email}`, otp, "EX", 10 * 60);

  const newUser = await User.create({
    username,
    email,
    password,
    passwordConfirm,
  });

  res.status(201).json({
    status: "success",
    message: "email sent to the user",
  });
});

export const verifyOtp = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(new AppError("Email and OTP are required", 400));
  }

  const storedOtp = await redis.get(`otp:${email}`);

  if (!storedOtp) {
    return next(new AppError("OTP has expired or is invalid", 400));
  }

  if (storedOtp !== otp) {
    return next(new AppError("Invalid OTP", 400));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  user.isVerified = true;
  await user.save({ validateBeforeSave: false });
  await redis.del(`otp:${email}`);

  // Publish event so user-service sets up the social profile
  await publishDomainEvent("user.verified", {
    userId: user._id.toString(),
    username: user.username,
    email: user.email,
    profilePicture: user.profilePicture,
    bio: user.bio,
    createdAt: user.createdAt,
  });

  sendToken(user, 200, res, "Email verified successfully!");
});

export const resendOtp = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError("Email is required", 400));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  if (user.isVerified) {
    return next(new AppError("User is already verified", 400));
  }

  const otp = generateOTP();
  await redis.set(`otp:${email}`, otp, "EX", 10 * 60);

  try {
    await sendOtpEmail({
      user,
      otp,
      purpose: "verify your email",
    });
    res.status(200).json({
      status: "success",
      message: "OTP resent successfully",
    });
  } catch (err) {
    console.error("Email error:", err.message);
    return next(new AppError("There was an error sending the email. Please try again later.", 500));
  }
});

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  const user = await User.findOne({ email }).select("+password +isVerified");
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  if (!user.isVerified) {
    const otp = generateOTP();
    await redis.set(`otp:${email}`, otp, "EX", 10 * 60);

    try {
      await sendOtpEmail({ user, otp, purpose: "verify your email" });
      return next(new AppError("Email not verified. A new OTP has been sent to your email.", 401));
    } catch (err) {
      console.error("Email error:", err.message);
      return next(new AppError("There was an error sending the email. Please try again later.", 500));
    }
  }

  // Cache user object in Redis
  await redis.set(`user:${user._id}`, JSON.stringify(user), "EX", 60 * 60);

  sendToken(user, 200, res, "Logged in successfully!");
});

export const logout = catchAsync(async (req, res, next) => {
  res.cookie("token", "", {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "development" ? "lax" : "none",
    secure: process.env.NODE_ENV === "development" ? false : true,
    maxAge: 0,
  });

  const userId = req.user?._id || req.headers["x-user-id"];
  if (userId) {
    await redis.del(`user:${userId}`);
  }

  res.status(200).json({
    status: "success",
    message: "Logged out successfully!",
  });
});

export const forgetPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError("Email is required", 400));
  }
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(200).json({ status: "success", message: "OTP sent to email successfully" });
  }

  const otp = generateOTP();
  await redis.set(`otp:${email}`, otp, "EX", 10 * 60);

  try {
    await sendOtpEmail({
      user,
      otp,
      purpose: "reset your password",
    });
    res.status(200).json({
      status: "success",
      message: "OTP sent to email successfully",
    });
  } catch (err) {
    console.error("Email error:", err.message);
    return next(new AppError("There was an error sending the email. Please try again later.", 500));
  }
});

export const resetPassword = catchAsync(async (req, res, next) => {
  const { email, otp, password, passwordConfirm } = req.body;
  if (!email || !otp || !password || !passwordConfirm) {
    return next(new AppError("All fields are required", 400));
  }

  const storedOtp = await redis.get(`otp:${email}`);

  if (!storedOtp || storedOtp !== otp) {
    return next(new AppError("Invalid or expired OTP", 400));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  await user.save();

  await redis.del(`otp:${email}`);

  sendToken(user, 200, res, "Password reset succeffully! Please log in with your new password.");
});
