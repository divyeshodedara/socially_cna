import {
  AppError,
  catchAsync,
  publishSocketToUser,
} from "@socially/common";
import Notification from "../models/notification.model.js";
import UserSnapshot from "../models/userSnapshot.model.js";

export const createNotificationInternal = async ({
  recipient,
  sender,
  type,
  post,
  comment,
}) => {
  try {
    if (!recipient || !sender || recipient.toString() === sender.toString()) {
      return null;
    }

    let senderSnapshot = await UserSnapshot.findById(sender);
    if (!senderSnapshot) {
      senderSnapshot = await UserSnapshot.create({
        _id: sender,
        username: "User",
      });
    }

    const postPayload = post ? (typeof post === "object" ? post : { _id: post }) : undefined;

    let notification = await Notification.create({
      recipient,
      sender,
      type,
      post: postPayload,
      comment,
    });

    notification = await notification.populate("sender", "username profilePicture");

    // Send real-time notification to user via Real-Time Gateway
    await publishSocketToUser(recipient, "new-notification", notification);

    return notification;
  } catch (error) {
    console.error("Error creating notification in service:", error);
    return null;
  }
};

export const getNotifications = catchAsync(async (req, res, next) => {
  const userId = req.user?._id || req.headers["x-user-id"];

  const notifications = await Notification.find({ recipient: userId })
    .populate("sender", "username profilePicture")
    .sort("-createdAt")
    .limit(20)
    .lean();

  res.status(200).json({
    status: "success",
    results: notifications.length,
    data: {
      notifications,
    },
  });
});

export const getUnreadCount = catchAsync(async (req, res, next) => {
  const userId = req.user?._id || req.headers["x-user-id"];

  const count = await Notification.countDocuments({
    recipient: userId,
    read: false,
  });

  res.status(200).json({
    status: "success",
    data: {
      count,
    },
  });
});

export const markAsRead = catchAsync(async (req, res, next) => {
  const userId = req.user?._id || req.headers["x-user-id"];

  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: userId },
    { read: true },
    { new: true },
  );

  if (!notification) {
    return next(new AppError("Notification not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      notification,
    },
  });
});

export const markAllAsRead = catchAsync(async (req, res, next) => {
  const userId = req.user?._id || req.headers["x-user-id"];

  await Notification.updateMany({ recipient: userId, read: false }, { read: true });

  res.status(200).json({
    status: "success",
    message: "All notifications marked as read",
  });
});

export const deleteNotification = catchAsync(async (req, res, next) => {
  const userId = req.user?._id || req.headers["x-user-id"];

  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    recipient: userId,
  });

  if (!notification) {
    return next(new AppError("Notification not found", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});
