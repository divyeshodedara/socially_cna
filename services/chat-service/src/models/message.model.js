import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatUserSnapshot",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatUserSnapshot",
      required: true,
    },
    message: {
      type: String,
      trim: true,
    },
    image: {
      url: String,
      key: String,
    },
    seen: {
      type: Boolean,
      default: false,
    },
    seenAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, seen: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
