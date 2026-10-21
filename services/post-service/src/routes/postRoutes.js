import express from "express";
import { authMiddleware } from "@socially/common";
import upload from "../middleware/multer.js";
import * as postController from "../controllers/postControllers.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/all-posts", postController.getAllPosts);
router.get("/user-posts/:id", postController.getUserPosts);
router.get("/:postId/comments", postController.getPostComments);
router.post("/create-post", upload.single("image"), postController.createPost);
router.post("/save/:postId", postController.saveOrUnsavePost);
router.post("/like-dislike/:postId", postController.likeOrDislikePost);
router.post("/comment/:postId", postController.addComment);
router.delete("/delete/:postId", postController.deletePost);

export default router;
