import express from "express";
import { authMiddleware } from "@socially/common";
import upload from "../middleware/multer.js";
import * as userController from "../controllers/userControllers.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/me", userController.getMe);
router.get("/search", userController.searchUsers);
router.get("/profile/:id", userController.getProfile);
router.get("/suggested-users", userController.suggestedUser);
router.get("/following/:id", userController.getFollowing);
router.post("/follow/:id", userController.followUser);
router.post("/unfollow/:id", userController.unfollowUser);
router.post("/edit-profile", upload.single("profilePicture"), userController.editProfile);

export default router;
