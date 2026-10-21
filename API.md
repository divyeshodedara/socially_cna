# API Documentation

Detailed reference for all REST API endpoints in the Socially platform.

## 📂 Base Info

**Base URL:** `http://localhost:8000/api/v1`

**Authentication:** JWT token is stored in an **HttpOnly cookie** set automatically on login. All protected routes read from this cookie — no manual `Authorization` header is needed in-browser. When using API clients (Postman, cURL), pass the cookie with each request.

**Response envelope:**
```json
{
  "status": "success" | "fail" | "error",
  "message": "Human-readable message",
  "data": { ... }
}
```

---

## 🔐 Authentication — `/auth`

### Register User

- **Method & URL:** `POST /auth/signup`
- **Auth:** Not Required
- **Request Body:**
  ```json
  {
    "username": "divyesh",
    "email": "divyesh@example.com",
    "password": "securepassword"
  }
  ```
- **Response (201):**
  ```json
  {
    "status": "success",
    "message": "OTP sent to your email. Please verify your account."
  }
  ```
- **Error — duplicate email/username (400):**
  ```json
  { "status": "fail", "message": "User with this email or username already exists." }
  ```
- **Error — disposable email (400):**
  ```json
  { "status": "fail", "message": "Disposable email addresses are not allowed." }
  ```

---

### Verify Email (OTP)

- **Method & URL:** `POST /auth/verify`
- **Auth:** Not Required
- **Request Body:**
  ```json
  {
    "email": "divyesh@example.com",
    "otp": "483920"
  }
  ```
- **Response (200):** Sets `jwt` HttpOnly cookie.
  ```json
  {
    "status": "success",
    "message": "Email verified successfully.",
    "data": { "user": { "_id": "...", "username": "divyesh", "email": "divyesh@example.com" } }
  }
  ```
- **Error — wrong/expired OTP (400):**
  ```json
  { "status": "fail", "message": "Invalid or expired OTP." }
  ```

---

### Resend OTP

- **Method & URL:** `POST /auth/resend-otp`
- **Auth:** Not Required
- **Request Body:**
  ```json
  { "email": "divyesh@example.com" }
  ```
- **Response (200):**
  ```json
  { "status": "success", "message": "New OTP sent to your email." }
  ```

---

### Login

- **Method & URL:** `POST /auth/login`
- **Auth:** Not Required
- **Request Body:**
  ```json
  {
    "email": "divyesh@example.com",
    "password": "securepassword"
  }
  ```
- **Response (200):** Sets `jwt` HttpOnly cookie.
  ```json
  {
    "status": "success",
    "message": "Logged in successfully.",
    "data": { "user": { "_id": "...", "username": "divyesh", "email": "divyesh@example.com", "profilePicture": "...", "bio": "..." } }
  }
  ```
- **Error — invalid credentials (401):**
  ```json
  { "status": "fail", "message": "Invalid email or password." }
  ```
- **Error — email not verified (401):**
  ```json
  { "status": "fail", "message": "Please verify your email before logging in." }
  ```

---

### Logout

- **Method & URL:** `POST /auth/logout`
- **Auth:** Required
- **Response (200):** Clears `jwt` cookie.
  ```json
  { "status": "success", "message": "Logged out successfully." }
  ```

---

### Forgot Password

- **Method & URL:** `POST /auth/forget-password`
- **Auth:** Not Required
- **Request Body:**
  ```json
  { "email": "divyesh@example.com" }
  ```
- **Response (200):**
  ```json
  { "status": "success", "message": "Password reset OTP sent to your email." }
  ```

---

### Reset Password

- **Method & URL:** `POST /auth/reset-password`
- **Auth:** Not Required
- **Request Body:**
  ```json
  {
    "email": "divyesh@example.com",
    "otp": "192837",
    "newPassword": "newSecurePassword"
  }
  ```
- **Response (200):**
  ```json
  { "status": "success", "message": "Password reset successfully." }
  ```

---

## 👤 Users — `/users`

All user routes require authentication.

### Get Current User

- **Method & URL:** `GET /users/me`
- **Response (200):**
  ```json
  {
    "status": "success",
    "data": {
      "user": {
        "_id": "...",
        "username": "divyesh",
        "email": "divyesh@example.com",
        "profilePicture": "https://s3.amazonaws.com/...",
        "bio": "Hello world",
        "followers": ["..."],
        "following": ["..."],
        "posts": ["..."],
        "savedPosts": [{ "_id": "...", "caption": "...", "image": { "url": "..." } }]
      }
    }
  }
  ```

---

### Get User Profile by ID

- **Method & URL:** `GET /users/profile/:id`
- **Response (200):**
  ```json
  {
    "status": "success",
    "data": {
      "user": {
        "_id": "...",
        "username": "admin",
        "profilePicture": "https://s3.amazonaws.com/...",
        "bio": "Platform admin",
        "followers": ["..."],
        "following": ["..."],
        "posts": [{ "_id": "...", "image": { "url": "..." }, "caption": "..." }]
      }
    }
  }
  ```
- **Error (404):**
  ```json
  { "status": "fail", "message": "User not found." }
  ```

---

### Suggested Users

- **Method & URL:** `GET /users/suggested-users`
- **Response (200):**
  ```json
  {
    "status": "success",
    "results": 5,
    "data": { "users": [ { "_id": "...", "username": "...", "profilePicture": "..." } ] }
  }
  ```

---

### Search Users

- **Method & URL:** `GET /users/search?query=divyesh`
- **Response (200):**
  ```json
  {
    "status": "success",
    "results": 1,
    "data": { "users": [ { "_id": "...", "username": "divyesh", "profilePicture": "...", "bio": "..." } ] }
  }
  ```

---

### Follow User

- **Method & URL:** `POST /users/follow/:id`
- **Side Effects:** Emits `new-notification` to the followed user and `follow-update` socket event.
- **Response (200):**
  ```json
  { "status": "success", "message": "User followed successfully." }
  ```
- **Error — already following (400):**
  ```json
  { "status": "fail", "message": "You are already following this user." }
  ```

---

### Unfollow User

- **Method & URL:** `POST /users/unfollow/:id`
- **Side Effects:** Emits `follow-update` socket event.
- **Response (200):**
  ```json
  { "status": "success", "message": "User unfollowed successfully." }
  ```

---

### Edit Profile

- **Method & URL:** `POST /users/edit-profile`
- **Content-Type:** `multipart/form-data`
- **Request Fields:**
  - `bio` (string, optional)
  - `profilePicture` (file, optional — resized to 400×400 JPEG, stored in S3)
- **Side Effects:** Invalidates `user:{id}` Redis cache.
- **Response (200):**
  ```json
  {
    "status": "success",
    "message": "Profile updated successfully.",
    "data": { "user": { "_id": "...", "username": "divyesh", "bio": "Updated bio", "profilePicture": "https://s3.amazonaws.com/..." } }
  }
  ```

---

## 📝 Posts — `/posts`

All post routes require authentication.

### Get Feed (All Posts — Paginated)

- **Method & URL:** `GET /posts/all-posts?page=1&limit=10`
- **Description:** Returns a globally shared, reverse-chronological feed of all posts. Results are cached in Redis for 1 minute.
- **Response (200):**
  ```json
  {
    "status": "Success",
    "results": 10,
    "data": {
      "posts": [
        {
          "_id": "...",
          "caption": "A beautiful sunset",
          "image": { "url": "https://s3.amazonaws.com/..." },
          "user": { "_id": "...", "username": "divyesh", "profilePicture": "..." },
          "likes": ["..."],
          "comments": ["..."],
          "createdAt": "2026-08-18T04:00:00.000Z"
        }
      ],
      "hasMore": true,
      "currentPage": 1,
      "totalPages": 5,
      "total": 48
    }
  }
  ```

---

### Get Posts by User

- **Method & URL:** `GET /posts/user-posts/:id`
- **Response (200):**
  ```json
  {
    "status": "Success",
    "results": 3,
    "data": { "posts": [ { "_id": "...", "caption": "...", "image": { "url": "..." } } ] }
  }
  ```

---

### Create Post

- **Method & URL:** `POST /posts/create-post`
- **Content-Type:** `multipart/form-data`
- **Request Fields:**
  - `image` (file, **required** — resized to 800×800 JPEG, uploaded to S3 under `posts/`)
  - `caption` (string, optional)
- **Side Effects:**
  - Broadcasts `newPost` socket event to **all** connected users.
  - Invalidates `posts:page:*` Redis cache.
  - Invalidates `user:{id}` Redis cache.
- **Response (201):**
  ```json
  { "status": "Success", "message": "Post Created" }
  ```

---

### Like / Unlike Post (Toggle)

- **Method & URL:** `POST /posts/like-dislike/:postId`
- **Side Effects:**
  - On like: creates a notification for the post owner and broadcasts `postLikeUpdated` to all users.
  - On unlike: broadcasts `postLikeUpdated` to all users.
- **Response (200):**
  ```json
  { "status": "Success", "message": "Post liked" }
  ```
  or
  ```json
  { "status": "Success", "message": "Post disliked" }
  ```

---

### Add Comment

- **Method & URL:** `POST /posts/comment/:postId`
- **Request Body:**
  ```json
  { "text": "Great photo!" }
  ```
- **Side Effects:**
  - Creates a notification for the post owner.
  - Broadcasts `newComment` socket event to all connected users.
- **Response (201):**
  ```json
  {
    "status": "Success",
    "message": "Comment added successfully",
    "data": {
      "comment": {
        "_id": "...",
        "text": "Great photo!",
        "user": { "_id": "...", "username": "divyesh", "profilePicture": "..." },
        "post": "...",
        "createdAt": "2026-08-18T04:00:00.000Z"
      }
    }
  }
  ```

---

### Get Comments for Post

- **Method & URL:** `GET /posts/:postId/comments`
- **Response (200):**
  ```json
  {
    "status": "Success",
    "results": 2,
    "data": {
      "comments": [
        { "_id": "...", "text": "Nice!", "user": { "_id": "...", "username": "admin", "profilePicture": "..." }, "createdAt": "..." }
      ]
    }
  }
  ```

---

### Save / Unsave Post (Toggle)

- **Method & URL:** `POST /posts/save/:postId`
- **Side Effects:**
  - Emits `postSavedUpdated` socket event to the requesting user's socket with `{ postId, isSaved, post }`.
  - Invalidates `user:{id}` Redis cache.
- **Response (200 — saved):**
  ```json
  { "status": "Success", "message": "Post saved Successfully" }
  ```
- **Response (200 — unsaved):**
  ```json
  { "status": "Success", "message": "Post unsaved Successfully" }
  ```

---

### Delete Post

- **Method & URL:** `DELETE /posts/delete/:postId`
- **Side Effects:**
  - Deletes image from AWS S3.
  - Deletes all comments on the post.
  - Removes post from all users' `savedPosts`.
  - Emits `postDeleted` socket event to the post owner and all their followers.
  - Invalidates `posts:page:*` and `user:{id}` Redis caches.
- **Response (200):**
  ```json
  { "status": "Success", "message": "Post deleted Successfully" }
  ```
- **Error — not owner (403):**
  ```json
  { "status": "fail", "message": "You are not authorized to delete this post" }
  ```

---

## 💬 Messages — `/messages`

All message routes require authentication.

### Get All Conversations

- **Method & URL:** `GET /messages/conversations`
- **Response (200):**
  ```json
  {
    "status": "success",
    "data": {
      "conversations": [
        {
          "_id": "...",
          "participants": [
            { "_id": "...", "username": "admin", "profilePicture": "..." },
            { "_id": "...", "username": "divyesh", "profilePicture": "..." }
          ],
          "lastMessage": {
            "_id": "...",
            "message": "Hey!",
            "image": null,
            "sender": { "_id": "..." },
            "receiver": { "_id": "..." },
            "seen": false,
            "createdAt": "2026-08-18T04:00:00.000Z"
          },
          "updatedAt": "2026-08-18T04:00:00.000Z"
        }
      ]
    }
  }
  ```

---

### Get Message History

- **Method & URL:** `GET /messages/:userId`
- **Response (200):**
  ```json
  {
    "status": "success",
    "data": {
      "messages": [
        {
          "_id": "...",
          "sender": { "_id": "...", "username": "admin" },
          "receiver": { "_id": "...", "username": "divyesh" },
          "message": "Hello!",
          "image": null,
          "seen": true,
          "seenAt": "2026-08-18T04:10:00.000Z",
          "createdAt": "2026-08-18T04:00:00.000Z"
        }
      ]
    }
  }
  ```

---

### Send Message

- **Method & URL:** `POST /messages/send`
- **Content-Type:** `multipart/form-data`
- **Request Fields:**
  - `receiverId` (string, **required**)
  - `message` (string, optional if `image` is provided)
  - `image` (file, optional — resized, uploaded to S3 under `messages/`)
- **Side Effects:**
  - Emits `message` socket event (`type: 'newMessage'`) to the receiver.
  - Updates or creates a `Conversation` document with the new `lastMessage`.
- **Response (201):**
  ```json
  {
    "status": "success",
    "message": "Message sent successfully.",
    "data": {
      "message": {
        "_id": "...",
        "sender": { "_id": "...", "username": "divyesh" },
        "receiver": { "_id": "..." },
        "message": "Hey!",
        "image": { "url": "https://s3.amazonaws.com/..." },
        "seen": false,
        "createdAt": "2026-08-18T04:00:00.000Z"
      }
    }
  }
  ```

---

## 🔔 Notifications — `/notifications`

All notification routes require authentication.

### Get Notifications

- **Method & URL:** `GET /notifications`
- **Description:** Returns the latest 20 notifications for the authenticated user.
- **Response (200):**
  ```json
  {
    "status": "success",
    "results": 5,
    "data": {
      "notifications": [
        {
          "_id": "...",
          "type": "like",
          "sender": { "_id": "...", "username": "admin", "profilePicture": "..." },
          "post": { "_id": "...", "image": { "url": "..." } },
          "read": false,
          "createdAt": "2026-08-18T04:00:00.000Z"
        }
      ]
    }
  }
  ```

---

### Get Unread Notification Count

- **Method & URL:** `GET /notifications/unread-count`
- **Response (200):**
  ```json
  { "status": "success", "data": { "count": 3 } }
  ```

---

### Mark All Notifications as Read

- **Method & URL:** `PATCH /notifications/mark-all-read`
- **Response (200):**
  ```json
  { "status": "success", "message": "All notifications marked as read." }
  ```

---

### Mark One Notification as Read

- **Method & URL:** `PATCH /notifications/:id/read`
- **Response (200):**
  ```json
  { "status": "success", "message": "Notification marked as read." }
  ```

---

### Delete Notification

- **Method & URL:** `DELETE /notifications/:id`
- **Response (200):**
  ```json
  { "status": "success", "message": "Notification deleted." }
  ```

---

## ⚠️ Error Responses

| HTTP Status | `status` field | When                                    |
| ----------- | -------------- | --------------------------------------- |
| 400         | `fail`         | Validation error, bad input             |
| 401         | `fail`         | Not authenticated / invalid token       |
| 403         | `fail`         | Authenticated but not authorized        |
| 404         | `fail`         | Resource not found                      |
| 429         | `fail`         | Rate limit exceeded                     |
| 500         | `error`        | Unexpected server error                 |

Rate-limited responses include `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` headers.
