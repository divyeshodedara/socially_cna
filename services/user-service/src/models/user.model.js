import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    profilePicture: {
      type: String,
      default:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRU0a0iDtUPUzs0GFM6DSuovK0uOE4-Sc40Pg&s",
    },
    bio: {
      type: String,
      maxlength: [150, "Bio must be at most 150 characters long"],
      default: "",
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
    savedPosts: [
      {
        type: mongoose.Schema.Types.Mixed,
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

userSchema.index({ followers: 1 });
userSchema.index({ following: 1 });
userSchema.index({ username: 1 });

const User = mongoose.model("User", userSchema);

export default User;
