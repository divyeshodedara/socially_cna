import express from "express";
import { authMiddleware } from "@socially/common";
import * as authController from "../controllers/authControllers.js";

const router = express.Router();

// Public routes
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/verify", authController.verifyOtp);
router.post("/resend-otp", authController.resendOtp);
router.post("/forget-password", authController.forgetPassword);
router.post("/reset-password", authController.resetPassword);

// Protected routes
router.post("/logout", authMiddleware, authController.logout);

export default router;
