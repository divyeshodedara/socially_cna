import express from "express";
import { authMiddleware } from "@socially/common";
import upload from "../middleware/multer.js";
import * as messageController from "../controllers/messageController.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/conversations", messageController.getConversations);
router.get("/unread/count", messageController.getUnreadCount);
router.post("/send", upload.single("image"), messageController.sendMessage);
router.get("/:userId", messageController.getMessages);

export default router;
