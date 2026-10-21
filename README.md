<div align="center">

# Socially

**A full-stack social media platform built with the MERN stack**

[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)[![Status](https://img.shields.io/badge/status-active-success.svg)]()

[Features](#-features) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [API Reference](#-api-reference) · [Socket Events](#-socketio-events) · [Environment Variables](#-environment-variables)

</div>

---

## Features

**Authentication**

- Email + password signup with OTP email verification
- JWT authentication via HttpOnly cookies
- Forgot / reset password via OTP email
- Disposable email detection

**Social**

- Follow / unfollow users
- Suggested users list & user search
- User profiles with bio and profile picture

**Posts**

- Create posts with image upload (optimized via Sharp → AWS S3)
- Infinite-scroll feed (globally shared, not follower-only)
- Like / unlike posts
- Comment on posts
- Save / unsave posts
- Delete own posts (cleans up S3, comments, and saved references)

**Real-Time** _(Socket.IO)_

- Live feed updates — new posts broadcast to **all** connected users instantly
- Live like & comment count updates broadcast to all users viewing a post
- Real-time notifications (likes, comments, follows)
- 1-on-1 messaging with image support
- Typing indicators & message seen/delivered status
- Unread message & notification badges set on connect via `initial-counts` event
- Unread dot on MessagesPage clears immediately upon opening a conversation

**UX**

- Dark mode (system preference + manual toggle, persisted)
- Fully responsive — dedicated bottom nav on mobile
- Skeleton loaders & toast notifications
- Rate-limit-aware error pages
- Hover-prefetch of messages — zero-latency chat open from MessagesPage

---

## Tech Stack

### Frontend

|                  |                   |
| ---------------- | ----------------- |
| **Framework**    | React 18 + Vite   |
| **Routing**      | React Router v6   |
| **Server State** | TanStack Query v5 |
| **HTTP**         | Axios             |
| **Real-time**    | Socket.IO Client  |
| **Styling**      | Tailwind CSS      |
| **Animations**   | Framer Motion     |

### Backend

|                  |                                                    |
| ---------------- | -------------------------------------------------- |
| **Runtime**      | Node.js ≥ 18 (ES Modules)                          |
| **Framework**    | Express 5                                          |
| **Database**     | MongoDB + Mongoose                                 |
| **Cache / OTP**  | Redis (ioredis)                                    |
| **Auth**         | JWT + bcryptjs                                     |
| **Real-time**    | Socket.IO                                          |
| **File Uploads** | Multer + Sharp + AWS S3                            |
| **Email**        | Brevo + EJS templates                              |
| **Security**     | Helmet, express-mongo-sanitize, express-rate-limit |

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or [Atlas](https://www.mongodb.com/atlas))
- Redis (local or [Upstash](https://upstash.com))
- [AWS S3](https://aws.amazon.com/s3/) account
- Brevo API key

### 1. Clone the repository

```bash
git clone https://github.com/your-username/socially.git
cd socially
```

### 2. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 3. Configure environment variables

**Backend** — copy and fill in `backend/.env`:

```env
NODE_ENV=development
PORT=8000

# MongoDB
DB_URL=mongodb://localhost:27017/social-media

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=1d
COOKIE_EXPIRES_IN=86400000   # 1 day in ms

# Email
BREVO_API_KEY=your-brevo-api-key

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=your-aws-region
S3_BUCKET_NAME=your-bucket-name
S3_PUBLIC_URL=https://your-bucket.s3.region.amazonaws.com

# CORS
FRONTEND_URL=http://localhost:5173

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

**Frontend** — copy and fill in `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_SOCKET_URL=http://localhost:8000
```

### 4. Run the application

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

| Service      | URL                          |
| ------------ | ---------------------------- |
| Frontend     | http://localhost:5173        |
| Backend API  | http://localhost:8000/api/v1 |
| Health check | http://localhost:8000/check  |

---

## API Reference

Base path: `/api/v1`

### Auth — `/auth`

| Method | Endpoint                | Auth     | Description                |
| ------ | ----------------------- | -------- | -------------------------- |
| POST   | `/auth/signup`          | No       | Register new user          |
| POST   | `/auth/login`           | No       | Login, returns JWT cookie  |
| POST   | `/auth/verify`          | No       | Verify email with OTP      |
| POST   | `/auth/resend-otp`      | No       | Resend verification OTP    |
| POST   | `/auth/forget-password` | No       | Request password reset OTP |
| POST   | `/auth/reset-password`  | No       | Reset password with OTP    |
| POST   | `/auth/logout`          | Required | Clear JWT cookie           |

### Users — `/users`

| Method | Endpoint                 | Description                              |
| ------ | ------------------------ | ---------------------------------------- |
| GET    | `/users/me`              | Current authenticated user               |
| GET    | `/users/profile/:id`     | Get user profile by ID                   |
| GET    | `/users/suggested-users` | List of suggested users                  |
| GET    | `/users/search?query=`   | Search users by username or bio          |
| POST   | `/users/follow/:id`      | Follow a user                            |
| POST   | `/users/unfollow/:id`    | Unfollow a user                          |
| POST   | `/users/edit-profile`    | Update bio & profile picture (multipart) |

### Posts — `/posts`

| Method | Endpoint                      | Description                        |
| ------ | ----------------------------- | ---------------------------------- |
| GET    | `/posts/all-posts`            | Paginated global feed (`?page=&limit=`) |
| GET    | `/posts/user-posts/:id`       | All posts by a user                |
| GET    | `/posts/:postId/comments`     | Comments for a post                |
| POST   | `/posts/create-post`          | Create post with image (multipart) |
| POST   | `/posts/like-dislike/:postId` | Toggle like                        |
| POST   | `/posts/comment/:postId`      | Add comment                        |
| POST   | `/posts/save/:postId`         | Toggle save/unsave                 |
| DELETE | `/posts/delete/:postId`       | Delete own post                    |

### Messages — `/messages`

| Method | Endpoint                  | Description                          |
| ------ | ------------------------- | ------------------------------------ |
| GET    | `/messages/conversations` | List all conversations               |
| GET    | `/messages/:userId`       | Message history with a user          |
| POST   | `/messages/send`          | Send message (text + optional image) |

### Notifications — `/notifications`

| Method | Endpoint                       | Description                    |
| ------ | ------------------------------ | ------------------------------ |
| GET    | `/notifications`               | List notifications (latest 20) |
| GET    | `/notifications/unread-count`  | Unread count                   |
| PATCH  | `/notifications/mark-all-read` | Mark all as read               |
| PATCH  | `/notifications/:id/read`      | Mark one as read               |
| DELETE | `/notifications/:id`           | Delete a notification          |

---

## Socket.IO Events

### Client → Server

| Event               | Payload                    | Description                                  |
| ------------------- | -------------------------- | -------------------------------------------- |
| `user-connected`    | `userId`                   | Register socket; server replies with initial counts |
| `typing`            | `{ senderId, receiverId }` | User is typing in chat                       |
| `stopTyping`        | `{ senderId, receiverId }` | User stopped typing                          |
| `markMessagesSeen`  | `{ senderId, receiverId }` | Mark sender's messages as seen in DB         |

### Server → Client

| Event               | Payload                                         | Description                                  |
| ------------------- | ----------------------------------------------- | -------------------------------------------- |
| `initial-counts`    | `{ unreadMessageCount, unreadNotificationCount }` | Sent once after `user-connected`             |
| `new-notification`  | notification object                             | Like / comment / follow notification         |
| `follow-update`     | `{ action, followerId }`                        | Follower count updated on recipient's device |
| `newPost`           | post object                                     | New post broadcast to all connected users    |
| `postDeleted`       | `{ postId }`                                    | Post removed; clients filter it from feed    |
| `postLikeUpdated`   | `{ postId, likesCount, userId }`                | Like count changed, broadcast to all         |
| `newComment`        | `{ postId, comment, commentsCount }`            | New comment broadcast to all                 |
| `postSavedUpdated`  | `{ postId, isSaved, post }`                     | Post saved/unsaved (user-specific)           |
| `message`           | `{ type: 'newMessage' \| 'messagesSeen', ... }` | New message or seen receipt                  |
| `userTyping`        | `{ userId }`                                    | Remote user is typing                        |
| `userStoppedTyping` | `{ userId }`                                    | Remote user stopped typing                   |

---

## Environment Variables

### Backend (`backend/.env`)

| Variable                | Required | Description                       |
| ----------------------- | -------- | --------------------------------- |
| `NODE_ENV`              | Yes      | `development` or `production`     |
| `PORT`                  | Yes      | Server port (default: 8000)       |
| `DB_URL`                | Yes      | MongoDB connection string         |
| `JWT_SECRET`            | Yes      | Secret key for JWT signing        |
| `JWT_EXPIRES_IN`        | Yes      | Token expiry (e.g. `1d`)          |
| `COOKIE_EXPIRES_IN`     | Yes      | Cookie expiry in milliseconds     |
| `BREVO_API_KEY`         | Yes      | Brevo transactional email API key |
| `AWS_ACCESS_KEY_ID`     | Yes      | AWS Access Key ID                 |
| `AWS_SECRET_ACCESS_KEY` | Yes      | AWS Secret Access Key             |
| `AWS_REGION`            | Yes      | AWS Region                        |
| `S3_BUCKET_NAME`        | Yes      | AWS S3 Bucket Name                |
| `S3_PUBLIC_URL`         | Yes      | AWS S3 Public URL                 |
| `FRONTEND_URL`          | Yes      | Frontend origin for CORS          |
| `REDIS_HOST`            | Yes      | Redis host (default: `127.0.0.1`) |
| `REDIS_PORT`            | Yes      | Redis port (default: `6379`)      |

### Frontend (`frontend/.env`)

| Variable          | Required | Description           |
| ----------------- | -------- | --------------------- |
| `VITE_API_URL`    | Yes      | Backend API base URL  |
| `VITE_SOCKET_URL` | Yes      | Backend Socket.IO URL |

---

## Project Structure

```
socially/
├── backend/
│   ├── controllers/       # Business logic
│   ├── models/            # Mongoose schemas
│   ├── routes/            # Express routers
│   ├── middleware/        # Auth, multer, rate limiter
│   ├── utils/             # Socket.IO, AWS S3, Redis, email, helpers
│   ├── views/emails/      # EJS email templates
│   ├── delete.js          # Admin utility: deep-delete a user and all their data
│   ├── app.js             # Express setup
│   └── server.js          # Entry point
└── frontend/
    └── src/
        ├── api/           # Axios instance
        ├── context/       # Auth, Socket, Theme contexts
        ├── components/    # Reusable UI components
        └── pages/         # Route-level page components
```

---

## License

This project is licensed under the MIT License.

Copyright (c) 2026 Divyesh Odedara

Permission is granted to use, copy, modify, and distribute this software freely.

See the [LICENSE](./LICENSE) file for more details.
