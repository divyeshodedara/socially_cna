import express from "express";
import { authMiddleware } from "@socially/common";
import * as notificationController from "../controllers/notificationController.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", notificationController.getNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.patch("/mark-all-read", notificationController.markAllAsRead);
router.patch("/:id/read", notificationController.markAsRead);
router.delete("/:id", notificationController.deleteNotification);

export default router;
