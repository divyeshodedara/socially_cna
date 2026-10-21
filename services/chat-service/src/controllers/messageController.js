import sharp from "sharp";
import {
  AppError,
  catchAsync,
  uploadToS3,
  publishSocketToUser,
} from "@socially/common";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";
import ChatUserSnapshot from "../models/chatUserSnapshot.model.js";

const ensureChatUser = async (userId, fallbackName = "User") => {
  if (!userId) return null;
  let user = await ChatUserSnapshot.findById(userId);
  if (!user) {
    user = await ChatUserSnapshot.create({
      _id: userId,
      username: fallbackName,
    });
  }
  return user;
};

export const sendMessage = catchAsync(async (req, res, next) => {
  const { receiverId, message } = req.body;
  const senderId = req.user?._id || req.headers["x-user-id"];
  const image = req.file;

  if (!receiverId) {
    return next(new AppError("Receiver ID is required", 400));
  }

  if (!message && !image) {
    return next(new AppError("Message or image is required", 400));
  }

  await ensureChatUser(senderId, req.user?.username || "User");
  await ensureChatUser(receiverId, "User");

  let imageData = null;

  if (image) {
    const optimizedImageBuffer = await sharp(image.buffer)
      .resize({ height: 800, width: 800, fit: "inside" })
      .toFormat("jpeg", { quality: 80 })
      .toBuffer();

    const file = {
      buffer: optimizedImageBuffer,
      originalname: "message.jpeg",
      mimetype: "image/jpeg",
    };

    const { url, key } = await uploadToS3(file, "messages");
    imageData = { url, key };
  }

  let newMessage = await Message.create({
    sender: senderId,
    receiver: receiverId,
    message: message || "",
    image: imageData,
  });

  newMessage = await newMessage.populate({
    path: "sender",
    select: "username profilePicture",
  });

  let conversation = await Conversation.findOne({
    participants: { $all: [senderId, receiverId] },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [senderId, receiverId],
      lastMessage: newMessage._id,
    });
  } else {
    conversation.lastMessage = newMessage._id;
    await conversation.save();
  }

  const populatedConversation = await Conversation.findById(conversation._id)
    .populate({ path: "participants", select: "username profilePicture" })
    .populate({
      path: "lastMessage",
      select: "message image seen createdAt sender receiver",
      populate: [
        { path: "sender", select: "_id username" },
        { path: "receiver", select: "_id username" },
      ],
    });

  // Real-time delivery to receiver via Redis Pub/Sub -> Real-Time Gateway
  await publishSocketToUser(receiverId, "message", {
    type: "newMessage",
    message: newMessage,
    conversation: populatedConversation,
  });

  res.status(201).json({
    status: "success",
    data: { message: newMessage },
  });
});

export const getMessages = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const currentUserId = req.user?._id || req.headers["x-user-id"];

  const messages = await Message.find({
    $or: [
      { sender: currentUserId, receiver: userId },
      { sender: userId, receiver: currentUserId },
    ],
  })
    .populate({
      path: "sender",
      select: "username profilePicture",
    })
    .populate({
      path: "receiver",
      select: "username profilePicture",
    })
    .sort({ createdAt: 1 })
    .lean();

  res.status(200).json({
    status: "success",
    data: {
      messages,
    },
  });
});

export const getConversations = catchAsync(async (req, res, next) => {
  const userId = req.user?._id || req.headers["x-user-id"];

  const conversations = await Conversation.find({
    participants: userId,
  })
    .populate({
      path: "participants",
      select: "username profilePicture",
    })
    .populate({
      path: "lastMessage",
      select: "message image seen createdAt sender receiver",
      populate: [
        { path: "sender", select: "_id username" },
        { path: "receiver", select: "_id username" },
      ],
    })
    .sort({ updatedAt: -1 })
    .lean();

  res.status(200).json({
    status: "success",
    data: {
      conversations,
    },
  });
});

export const getUnreadCount = catchAsync(async (req, res, next) => {
  const userId = req.user?._id || req.headers["x-user-id"];

  const unreadCount = await Message.countDocuments({
    receiver: userId,
    seen: false,
  });

  res.status(200).json({
    status: "success",
    data: {
      unreadCount,
    },
  });
});
