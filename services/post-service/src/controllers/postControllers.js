import sharp from "sharp";
import {
  AppError,
  catchAsync,
  getRedisClient,
  uploadToS3,
  deleteFromS3,
  publishSocketBroadcast,
  publishSocketToUser,
  publishDomainEvent,
} from "@socially/common";
import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import UserSnapshot from "../models/userSnapshot.model.js";

const redis = getRedisClient();

const invalidateFeedCache = async () => {
  try {
    const keys = await redis.keys("posts:page:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.error("Error invalidating feed cache:", err.message);
  }
};

const ensureUserSnapshot = async (user) => {
  if (!user || !user._id) return null;
  let snapshot = await UserSnapshot.findById(user._id);
  if (!snapshot) {
    snapshot = await UserSnapshot.create({
      _id: user._id,
      username: user.username || "User",
      email: user.email || "",
    });
  }
  return snapshot;
};

export const createPost = catchAsync(async (req, res, next) => {
  const { caption } = req.body;
  const userId = req.user?._id || req.headers["x-user-id"];
  const image = req.file;

  if (!image) throw new AppError("Image is required for the post", 400);

  await ensureUserSnapshot(req.user);

  const optimizedImageBuffer = await sharp(image.buffer)
    .resize({ height: 800, width: 800, fit: "inside" })
    .toFormat("jpeg", { quality: 80 })
    .toBuffer();

  const file = {
    buffer: optimizedImageBuffer,
    originalname: "post.jpeg",
    mimetype: "image/jpeg",
  };

  const { url, key } = await uploadToS3(file, "posts");

  let post = await Post.create({
    caption,
    image: { url, key },
    user: userId,
  });

  await UserSnapshot.updateOne({ _id: userId }, { $push: { posts: post._id } });

  post = await post.populate({
    path: "user",
    select: "username email bio profilePicture",
  });

  // Broadcast to all connected clients in real-time
  await publishSocketBroadcast("newPost", post);

  await invalidateFeedCache();

  res.status(201).json({
    status: "Success",
    message: "Post Created",
  });
});

export const getAllPosts = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const cacheKey = `posts:page:${page}:limit:${limit}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }
  } catch (err) {}

  const [posts, total] = await Promise.all([
    Post.find()
      .populate({ path: "user", select: "username profilePicture" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Post.countDocuments(),
  ]);

  const hasMore = skip + posts.length < total;

  const responseData = {
    status: "Success",
    results: posts.length,
    data: {
      posts,
      hasMore,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
    },
  };

  try {
    await redis.set(cacheKey, JSON.stringify(responseData), "EX", 60);
  } catch (err) {}

  res.status(200).json(responseData);
});

export const getUserPosts = catchAsync(async (req, res, next) => {
  const userId = req.params.id;

  const posts = await Post.find({ user: userId })
    .populate({ path: "user", select: "username profilePicture" })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    status: "Success",
    results: posts.length,
    data: { posts },
  });
});

export const saveOrUnsavePost = catchAsync(async (req, res, next) => {
  const userId = req.user?._id || req.headers["x-user-id"];
  const postId = req.params.postId;

  let snapshot = await ensureUserSnapshot(req.user);
  if (!snapshot) throw new AppError("User not found", 404);

  const isSaved = (snapshot.savedPosts || []).some((id) => id.toString() === postId.toString());

  if (isSaved) {
    snapshot.savedPosts = (snapshot.savedPosts || []).filter(
      (id) => id.toString() !== postId.toString(),
    );
    await snapshot.save();

    await publishSocketToUser(userId, "postSavedUpdated", {
      postId,
      isSaved: false,
    });

    res.status(200).json({
      status: "Success",
      message: "Post unsaved Successfully",
    });
  } else {
    snapshot.savedPosts.push(postId);
    await snapshot.save();

    const post = await Post.findById(postId)
      .populate({ path: "user", select: "username profilePicture" })
      .lean();

    await publishSocketToUser(userId, "postSavedUpdated", {
      postId,
      isSaved: true,
      post,
    });

    res.status(200).json({
      status: "Success",
      message: "Post saved Successfully",
    });
  }
});

export const deletePost = catchAsync(async (req, res, next) => {
  const userId = req.user?._id || req.headers["x-user-id"];
  const postId = req.params.postId;

  const post = await Post.findById(postId);
  if (!post) throw new AppError("Post not found", 404);

  if (post.user.toString() !== userId.toString()) {
    throw new AppError("You are not authorized to delete this post", 403);
  }

  await UserSnapshot.updateOne({ _id: userId }, { $pull: { posts: postId } });
  await UserSnapshot.updateMany({ savedPosts: postId }, { $pull: { savedPosts: postId } });
  await Comment.deleteMany({ post: postId });

  if (post.image && post.image.key) {
    await deleteFromS3(post.image.key).catch(() => {});
  }

  await Post.findByIdAndDelete(postId);

  // Broadcast deletion to all users
  await publishSocketBroadcast("postDeleted", { postId });
  await invalidateFeedCache();

  res.status(200).json({
    status: "Success",
    message: "Post deleted Successfully",
  });
});

export const likeOrDislikePost = catchAsync(async (req, res, next) => {
  const userId = req.user?._id || req.headers["x-user-id"];
  const postId = req.params.postId;

  const post = await Post.findById(postId).select("likes user");
  if (!post) throw new AppError("Post not found", 404);

  const alreadyLiked = post.likes.some((id) => id.toString() === userId.toString());

  if (alreadyLiked) {
    post.likes = post.likes.filter((id) => id.toString() !== userId.toString());
  } else {
    post.likes.push(userId);
  }

  await post.save();

  if (!alreadyLiked) {
    await publishDomainEvent("post.liked", {
      recipient: post.user.toString(),
      sender: userId.toString(),
      type: "like",
      post: postId,
    });
  }

  // Broadcast postLikeUpdated to all connected clients
  await publishSocketBroadcast("postLikeUpdated", {
    postId,
    likesCount: post.likes.length,
    userId,
  });

  res.status(200).json({
    status: "Success",
    message: alreadyLiked ? "Post disliked" : "Post liked",
  });
});

export const addComment = catchAsync(async (req, res, next) => {
  const userId = req.user?._id || req.headers["x-user-id"];
  const postId = req.params.postId;
  const { text } = req.body;

  if (!text) throw new AppError("Comment text is required", 400);

  await ensureUserSnapshot(req.user);

  let comment = await Comment.create({
    text,
    user: userId,
    post: postId,
  });

  const post = await Post.findByIdAndUpdate(
    postId,
    { $push: { comments: comment._id } },
    { new: true },
  );

  if (!post) throw new AppError("Post not found", 404);

  comment = await comment.populate({
    path: "user",
    select: "username email bio profilePicture",
  });

  // Publish domain event for notification service
  await publishDomainEvent("comment.created", {
    recipient: post.user.toString(),
    sender: userId.toString(),
    type: "comment",
    post: postId,
    comment: text,
  });

  // Broadcast new comment to all connected clients
  await publishSocketBroadcast("newComment", {
    postId,
    comment,
    commentsCount: post.comments.length,
  });

  res.status(201).json({
    status: "Success",
    message: "Comment added successfully",
    data: { comment },
  });
});

export const getPostComments = catchAsync(async (req, res, next) => {
  const postId = req.params.postId;

  const comments = await Comment.find({ post: postId })
    .populate({
      path: "user",
      select: "username profilePicture",
    })
    .sort({ createdAt: 1 })
    .lean();

  res.status(200).json({
    status: "Success",
    results: comments.length,
    data: { comments },
  });
});
