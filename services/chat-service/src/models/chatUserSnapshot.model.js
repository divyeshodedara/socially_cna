import mongoose from "mongoose";

const chatUserSnapshotSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    username: {
      type: String,
      default: "User",
    },
    email: {
      type: String,
      default: "",
    },
    profilePicture: {
      type: String,
      default:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRU0a0iDtUPUzs0GFM6DSuovK0uOE4-Sc40Pg&s",
    },
  },
  { timestamps: true },
);

const ChatUserSnapshot = mongoose.model("ChatUserSnapshot", chatUserSnapshotSchema);

export default ChatUserSnapshot;
