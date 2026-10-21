import sharp from "sharp";
import {
  AppError,
  catchAsync,
  getRedisClient,
  uploadToS3,
  deleteFromS3,
  publishDomainEvent,
  publishSocketToUser,
} from "@socially/common";
import User from "../models/user.model.js";

const redis = getRedisClient();

export const getProfile = catchAsync(async (req, res, next) => {
  const userId = req.params.id;

  let user = await User.findById(userId)
    .populate({
      path: "followers",
      select: "_id username profilePicture",
    })
    .populate({
      path: "following",
      select: "_id username profilePicture",
    })
    .lean();

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: { user },
  });
});

export const editProfile = catchAsync(async (req, res, next) => {
  const userId = req.user._id || req.headers["x-user-id"];
  const { bio } = req.body;
  const profilePicture = req.file;

  let user = await User.findById(userId);
  if (!user) {
    // If user record doesn't exist yet in user-service, create it from token info
    user = await User.create({
      _id: userId,
      username: req.user.username || "User",
      email: req.user.email || `${userId}@example.com`,
    });
  }

  if (profilePicture) {
    const optimizedImageBuffer = await sharp(profilePicture.buffer)
      .resize({ height: 400, width: 400, fit: "cover" })
      .toFormat("jpeg", { quality: 80 })
      .toBuffer();

    const file = {
      buffer: optimizedImageBuffer,
      originalname: "avatar.jpeg",
      mimetype: "image/jpeg",
    };

    if (user.profilePicture && user.profilePicture.includes("amazonaws.com")) {
      const s3Url = process.env.S3_PUBLIC_URL || "";
      const oldKey = s3Url ? user.profilePicture.replace(`${s3Url}/`, "") : null;
      if (oldKey) {
        await deleteFromS3(oldKey).catch(() => {});
      }
    }

    const { url } = await uploadToS3(file, "avatars");
    user.profilePicture = url;
  }

  if (bio !== undefined) user.bio = bio;

  await user.save({ validateBeforeSave: false });
  await redis.del(`user:${userId}`);

  // Emit event to notify other services about profile update (e.g. updating cached posts author info)
  await publishDomainEvent("user.profile_updated", {
    userId: user._id.toString(),
    username: user.username,
    profilePicture: user.profilePicture,
    bio: user.bio,
  });

  res.status(200).json({
    message: "profile updated",
    status: "success",
    data: { user },
  });
});

export const suggestedUser = catchAsync(async (req, res, next) => {
  const userId = req.user._id || req.headers["x-user-id"];
  const currentUser = await User.findById(userId).select("following");
  const followingIds = currentUser?.following || [];

  const users = await User.find({
    _id: { $ne: userId, $nin: followingIds },
  })
    .select("_id username bio profilePicture followers")
    .limit(20)
    .lean();

  res.status(200).json({
    status: "success",
    data: { users },
  });
});

export const followUser = catchAsync(async (req, res, next) => {
  const idToFollow = req.params.id;
  const currentUserId = req.user?._id || req.headers["x-user-id"];

  if (idToFollow.toString() === currentUserId.toString()) {
    return next(new AppError("You cannot follow yourself", 400));
  }

  let userToFollow = await User.findById(idToFollow);
  let currentUser = await User.findById(currentUserId);

  if (!userToFollow) {
    return next(new AppError("User to follow not found", 404));
  }

  if (!currentUser) {
    currentUser = await User.create({
      _id: currentUserId,
      username: req.user.username || "User",
      email: req.user.email || `${currentUserId}@example.com`,
    });
  }

  if (currentUser.following.some((id) => id.toString() === idToFollow.toString())) {
    return next(new AppError("You are already following this user", 400));
  }

  currentUser.following.push(idToFollow);
  userToFollow.followers.push(currentUserId);

  await currentUser.save({ validateBeforeSave: false });
  await userToFollow.save({ validateBeforeSave: false });

  await redis.del(`user:${currentUserId}`);
  await redis.del(`user:${idToFollow}`);

  // Publish domain event for notification service
  await publishDomainEvent("user.followed", {
    recipient: idToFollow,
    sender: currentUserId,
    type: "follow",
  });

  // Notify target user via WebSocket in real-time
  await publishSocketToUser(idToFollow, "follow-update", {
    action: "follow",
    followerId: currentUserId.toString(),
  });

  res.status(200).json({
    status: "success",
    message: "User followed successfully",
  });
});

export const unfollowUser = catchAsync(async (req, res, next) => {
  const idToUnfollow = req.params.id;
  const currentUserId = req.user?._id || req.headers["x-user-id"];

  if (idToUnfollow.toString() === currentUserId.toString()) {
    return next(new AppError("You cannot unfollow yourself", 400));
  }

  const userToUnfollow = await User.findById(idToUnfollow);
  const currentUser = await User.findById(currentUserId);

  if (!userToUnfollow) {
    return next(new AppError("User to unfollow not found", 404));
  }

  if (!currentUser) {
    return next(new AppError("Current user not found", 404));
  }

  currentUser.following = currentUser.following.filter(
    (followId) => followId.toString() !== idToUnfollow.toString(),
  );
  userToUnfollow.followers = userToUnfollow.followers.filter(
    (followerId) => followerId.toString() !== currentUserId.toString(),
  );

  await currentUser.save({ validateBeforeSave: false });
  await userToUnfollow.save({ validateBeforeSave: false });

  await redis.del(`user:${currentUserId}`);
  await redis.del(`user:${idToUnfollow}`);

  await publishSocketToUser(idToUnfollow, "follow-update", {
    action: "unfollow",
    followerId: currentUserId.toString(),
  });

  res.status(200).json({
    status: "success",
    message: "User unfollowed successfully",
  });
});

export const getMe = catchAsync(async (req, res, next) => {
  const userId = req.user?._id || req.headers["x-user-id"];
  let user = await User.findById(userId).lean();

  if (!user) {
    user = await User.create({
      _id: userId,
      username: req.user.username || "User",
      email: req.user.email || `${userId}@example.com`,
    });
  }

  res.status(200).json({
    status: "success",
    message: "User is Authenticated",
    data: { user },
  });
});

export const searchUsers = catchAsync(async (req, res, next) => {
  const { query } = req.query;
  const currentUserId = req.user?._id || req.headers["x-user-id"];

  if (!query || query.trim().length === 0) {
    return res.status(200).json({
      status: "success",
      data: { users: [] },
    });
  }

  const users = await User.find({
    _id: { $ne: currentUserId },
    $or: [
      { username: { $regex: query, $options: "i" } },
      { bio: { $regex: query, $options: "i" } },
    ],
  })
    .select("_id username bio profilePicture")
    .limit(10)
    .lean();

  res.status(200).json({
    status: "success",
    data: { users },
  });
});

export const getFollowing = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id)
    .select("following")
    .populate("following", "_id username bio profilePicture followers")
    .lean();

  if (!user) return next(new AppError("User not found", 404));

  res.status(200).json({
    status: "success",
    data: { following: user.following },
  });
});
