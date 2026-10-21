# Socially — Architecture Documentation

This document describes the system architecture, tech stack, data flow, and design decisions behind the **Socially** full-stack social media platform.

---

## High-Level Overview

Socially follows a **decoupled full-stack architecture**: a React SPA on the frontend communicates with a Node.js/Express REST API on the backend. Real-time features (chat, notifications, live feed) are powered by Socket.IO running on the same backend server.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                                                                 │
│  React 18 + Vite  ──  TanStack Query  ──  Socket.IO Client     │
│        │                                         │              │
│   Axios (REST)                          WebSocket (WS)          │
└──────────┬──────────────────────────────────┬───────────────────┘
           │ HTTP/HTTPS                       │ WS
           ▼                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND  (Node.js / Express 5)                │
│                                                                 │
│   REST API Routes  ──  Controllers  ──  Mongoose Models         │
│                              │                                  │
│              Socket.IO Server (same HTTP server)                │
│                              │                                  │
│      Redis (caching + OTP)   │   AWS S3 (media storage)         │
│                              │                                  │
│                         MongoDB Atlas                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend

| Technology                 | Purpose                           |
| -------------------------- | --------------------------------- |
| React 18 + Vite            | UI framework & build tool         |
| React Router v6            | Client-side routing               |
| TanStack Query v5          | Server state management & caching |
| Axios                      | HTTP client                       |
| Socket.IO Client           | Real-time WebSocket communication |
| Tailwind CSS               | Utility-first styling             |
| Framer Motion              | Animations & transitions          |
| React Hot Toast            | Toast notifications               |
| Lucide React + React Icons | Icon libraries                    |
| date-fns                   | Date formatting                   |

### Backend

| Technology             | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| Node.js + Express 5    | HTTP server & REST API                     |
| MongoDB + Mongoose     | Primary database & ODM                     |
| Socket.IO              | Real-time event handling                   |
| Redis (ioredis)        | OTP storage, session caching, feed caching |
| JWT + bcryptjs         | Authentication & password hashing          |
| Multer + Sharp         | File upload & image optimization           |
| AWS S3                 | Cloud image storage & delivery             |
| Brevo + EJS            | Transactional email with HTML templates    |
| Helmet                 | HTTP security headers                      |
| express-rate-limit     | API rate limiting                          |
| express-mongo-sanitize | NoSQL injection protection                 |

---

## Project Structure

```
socially/
├── backend/
│   ├── server.js                  # Entry point — DB + Socket.IO init
│   ├── app.js                     # Express app, middleware, routes
│   ├── delete.js                  # Admin utility: deep-delete a user by email
│   ├── controllers/
│   │   ├── authControllers.js     # Signup, login, OTP, password reset
│   │   ├── userControllers.js     # Profile, follow/unfollow, search
│   │   ├── postControllers.js     # CRUD posts, likes, comments, save
│   │   ├── messageController.js   # Send/receive messages, conversations
│   │   ├── notificationController.js
│   │   └── errorController.js     # Global error handler
│   ├── models/
│   │   ├── user.model.js
│   │   ├── post.model.js
│   │   ├── comment.model.js
│   │   ├── messageModel.js
│   │   ├── conversationModel.js
│   │   └── notificationModel.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── postRoutes.js
│   │   ├── messageRoutes.js
│   │   └── notificationRoutes.js
│   ├── middleware/
│   │   ├── authMiddleware.js      # JWT verification + Redis user cache
│   │   ├── multer.js              # File upload config
│   │   └── rateLimiter.js        # Per-route rate limiters
│   ├── utils/
│   │   ├── socket.js              # Socket.IO init & event emitters
│   │   ├── s3.js                  # AWS S3 upload/delete helpers
│   │   ├── redis.js               # ioredis client
│   │   ├── email.js               # Brevo + EJS template sender
│   │   ├── generateOtp.js         # Crypto-based OTP generator
│   │   ├── appError.js            # Operational error class
│   │   ├── catchAsync.js          # Async error wrapper
│   │   └── env.js                 # dotenv loader
│   └── views/emails/
│       └── otp.ejs                # OTP email template
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── api.js             # Axios instance + 401 interceptor
    │   ├── context/
    │   │   ├── AuthContext.jsx    # Auth state, login/logout/signup
    │   │   ├── SocketContext.jsx  # Socket.IO connection + notifications + badge counts
    │   │   └── ThemeContext.jsx   # Dark/light mode persistence
    │   ├── components/
    │   │   ├── layout/            # Navbar, Sidebar, BottomNav, Layout
    │   │   ├── posts/             # Post, CreatePostModal
    │   │   ├── notifications/     # NotificationBell
    │   │   ├── messages/          # MessageIcon
    │   │   ├── common/            # ProtectedRoute, ErrorBoundary, etc.
    │   │   └── ui/                # Card
    │   ├── pages/
    │   │   ├── auth/              # Login, Signup, VerifyEmail, ForgotPassword, ResetPassword
    │   │   ├── feed/              # HomePage (infinite scroll feed)
    │   │   ├── profile/           # ProfilePage, EditProfilePage, SavedPostsPage
    │   │   ├── messages/          # MessagesPage, ChatPage
    │   │   └── users/             # SuggestedUsersPage
    │   ├── App.jsx
    │   └── main.jsx
    └── public/
```

---

## Authentication Flow

```
User fills Sign Up form
        │
        ▼
POST /auth/signup
  ├── Check disposable email (mailcheck.ai)
  ├── Check for duplicate email/username
  ├── Create user (isVerified: false)
  ├── Generate OTP → store in Redis (TTL: 10 min)
  └── Send OTP email via Brevo

        │
        ▼
POST /auth/verify  (user enters OTP)
  ├── Compare OTP from Redis
  ├── Mark user.isVerified = true
  ├── Delete OTP from Redis
  └── Sign JWT → set as HttpOnly cookie

        │
        ▼
Subsequent requests
  └── authMiddleware
        ├── Extract JWT from cookie (or Authorization header)
        ├── Verify JWT signature
        ├── Check Redis cache for user (key: user:{id})
        │     ├── Cache HIT  → attach user to req, skip DB
        │     └── Cache MISS → fetch from MongoDB → cache 1hr
        └── Attach user to req.user
```

**Password Reset:** OTP-based. OTP stored in Redis with 10-min TTL. Same Redis key pattern (`otp:{email}`) used for both signup verification and password reset.

---

## Database Schema

### User

```
username, email, password (hashed), profilePicture, bio,
followers[], following[], posts[], savedPosts[],
isVerified, createdAt
```

### Post

```
user (ref), caption, image: { url, key },
likes[], comments[], createdAt
```

Index: `{ user: 1, createdAt: -1 }`

> `image.key` stores the AWS S3 object key used for deletion via `deleteFromS3()`.

### Comment

```
user (ref), post (ref), text (max 500 chars), createdAt
```

### Message

```
sender (ref), receiver (ref), message, image: { url, key },
seen, seenAt, createdAt
```

Indexes: `{ sender, receiver, createdAt: -1 }`, `{ receiver, seen }`

### Conversation

```
participants[] (ref User), lastMessage (ref Message), updatedAt
```

Index: `{ participants: 1 }`

### Notification

```
recipient (ref), sender (ref), type (like|comment|follow),
post (ref), comment (text), read, createdAt
```

Index: `{ recipient: 1, read: 1, createdAt: -1 }`

---

## Real-Time Architecture (Socket.IO)

The Socket.IO server runs on the **same HTTP server** as Express. User socket connections are tracked in an in-memory `Map<userId, socketId>`.

### Connection Lifecycle

```
Client connects → socket.on('user-connected', userId)
               → userSockets.set(userId, socket.id)
               → Query DB for unread message + notification counts
               → socket.emit('initial-counts', { unreadMessageCount, unreadNotificationCount })

Client disconnects → iterate userSockets → delete entry
```

### Broadcast vs. Targeted Events

| Pattern | When Used | Example |
| ------- | --------- | ------- |
| `io.emit(event, data)` | Broadcast to **all** connected clients | New post, like update, new comment |
| `io.to(socketId).emit(event, data)` | Send to a **specific user** | New message, notification, follow update |

### Event Reference

| Direction       | Event               | Payload                                         | Trigger                       |
| --------------- | ------------------- | ----------------------------------------------- | ----------------------------- |
| Client → Server | `user-connected`    | `userId`                                        | On socket connect             |
| Client → Server | `typing`            | `{ senderId, receiverId }`                      | Keystroke in chat             |
| Client → Server | `stopTyping`        | `{ senderId, receiverId }`                      | Keystroke timeout / leave     |
| Client → Server | `markMessagesSeen`  | `{ senderId, receiverId }`                      | Chat opened / message viewed  |
| Server → Client | `initial-counts`    | `{ unreadMessageCount, unreadNotificationCount }` | After `user-connected`       |
| Server → Client | `new-notification`  | notification object                             | Like, comment, follow         |
| Server → Client | `follow-update`     | `{ action, followerId }`                        | Follow / unfollow             |
| Server → Client | `newPost`           | post object                                     | Post created (all users)      |
| Server → Client | `postDeleted`       | `{ postId }`                                    | Post deleted                  |
| Server → Client | `postLikeUpdated`   | `{ postId, likesCount, userId }`                | Like toggled (all users)      |
| Server → Client | `newComment`        | `{ postId, comment, commentsCount }`            | Comment added (all users)     |
| Server → Client | `postSavedUpdated`  | `{ postId, isSaved, post }`                     | Post saved/unsaved (user only)|
| Server → Client | `message`           | `{ type: 'newMessage' \| 'messagesSeen', ... }` | New message or seen receipt   |
| Server → Client | `userTyping`        | `{ userId }`                                    | Typing event forwarded        |
| Server → Client | `userStoppedTyping` | `{ userId }`                                    | Stop typing forwarded         |

### markMessagesSeen Flow

```
User opens ChatPage
        │
        ▼
socket.emit('markMessagesSeen', { senderId: otherUserId, receiverId: myId })
        │
        ▼  (server)
Message.updateMany({ sender, receiver, seen: false }, { seen: true })
io.to(senderSocket).emit('message', { type: 'messagesSeen', seenBy: myId })
        │
        ▼  (client — ChatPage)
Optimistically: queryClient.setQueryData(['conversations'], mark seen)
      ↳ Unread dot on MessagesPage disappears immediately (no HTTP round-trip)
```

---

## Media Handling Pipeline

```
Client selects image
      │
      ▼
multer (memoryStorage) → file in req.file.buffer
      │
      ▼
sharp → resize to 800×800 (fit: inside) → JPEG quality 80
      │
      ▼
uploadToS3() → stored in S3 bucket under posts/ or messages/
      │
      ▼
Store { url, key } in MongoDB document
```

On deletion, `deleteFromS3(key)` is called to clean up storage.

---

## Caching Strategy (Redis)

| Key Pattern                | TTL    | Contents                 |
| -------------------------- | ------ | ------------------------ |
| `otp:{email}`              | 10 min | 6-digit OTP string       |
| `user:{id}`                | 1 hour | Serialized user document |
| `posts:page:{n}:limit:{m}` | 1 min  | Paginated posts response |

The `user:{id}` cache is invalidated on:
- Profile update
- Logout
- Post creation / deletion (user's `posts[]` array changes)
- Save / unsave post (user's `savedPosts[]` array changes)

The `posts:page:*` cache is invalidated on:
- Post creation
- Post deletion

---

## Security

| Measure          | Implementation                                           |
| ---------------- | -------------------------------------------------------- |
| Auth tokens      | JWT in HttpOnly cookie (SameSite: lax/none based on env) |
| Password storage | bcrypt with cost factor 12                               |
| Security headers | `helmet` middleware                                      |
| NoSQL injection  | `express-mongo-sanitize`                                 |
| Rate limiting    | Per-route limits via `express-rate-limit`                |
| Email validation | `validator.isEmail` + disposable email check             |
| File validation  | MIME type whitelist + 4MB size limit in multer           |
| CORS             | Restricted to `FRONTEND_URL` env variable                |

### Rate Limit Reference

| Limiter                      | Window | Max Requests |
| ---------------------------- | ------ | ------------ |
| API (global)                 | 15 min | 500          |
| Auth (signup/login)          | 15 min | 5            |
| Email verification           | 1 hour | 3            |
| Password reset               | 1 hour | 3            |
| Post creation                | 1 hour | 10           |
| Comments                     | 1 hour | 30           |
| Interactions (likes/follows) | 1 hour | 100          |
| Messages                     | 15 min | 50           |

---

## Frontend State Management

| State Type                               | Solution                                      |
| ---------------------------------------- | --------------------------------------------- |
| Server state (posts, profiles, messages) | TanStack Query (cache + background sync)      |
| Auth state (current user)                | React Context (`AuthContext`)                 |
| Socket + notifications + badge counts    | React Context (`SocketContext`)               |
| Theme preference                         | React Context + localStorage (`ThemeContext`) |
| Local UI state (modals, forms)           | `useState`                                    |

**Optimistic updates** are used for likes, follow/unfollow, save/unsave, and marking messages as seen — so the UI responds instantly without waiting for server confirmation.

Socket.IO events drive **cache mutations** directly (e.g., `queryClient.setQueryData`) so the UI updates in real time without an extra network round-trip.

**Hover-prefetch:** Hovering over a conversation row in MessagesPage pre-fetches messages via `queryClient.prefetchQuery`, making the chat open feel instantaneous.

---

## API Rate Limit Headers

Responses include standard `RateLimit-*` headers (`standardHeaders: true`, `legacyHeaders: false`) so clients can surface limit info if needed.
