import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserSnapshot",
      required: true,
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [2200, "Caption cannot be more than 2,200 characters"],
    },
    image: {
      url: {
        type: String,
        required: true,
      },
      key: {
        type: String,
        required: true,
      },
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

postSchema.index({ user: 1, createdAt: -1 });

const Post = mongoose.model("Post", postSchema);

export default Post;
