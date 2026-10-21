import { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import api from "../api/api";

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const notificationsFetchedRef = useRef(false);
  const queryClient = useQueryClient();

  // ── 1. Create socket on login ──────────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated && !socketRef.current) {
      const socketInstance = io(import.meta.env.VITE_SOCKET_URL, {
        withCredentials: true,
      });
      socketRef.current = socketInstance;
      setSocket(socketInstance);
    }

    return () => {};
  }, [isAuthenticated]);

  // ── 2. Register user + fetch initial notifications once ───────────────────
  useEffect(() => {
    if (socket && user?._id) {
      socket.emit("user-connected", user._id);

      // Fetch full notification list once per session
      if (!notificationsFetchedRef.current) {
        notificationsFetchedRef.current = true;
        api
          .get("/notifications")
          .then((res) => {
            if (res.data.status === "success") {
              setNotifications(res.data.data.notifications);
            }
          })
          .catch(() => {});
      }
    }
  }, [socket, user?._id]);

  // ── 3. Receive initial unread counts from server ──────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleInitialCounts = ({ unreadMessageCount, unreadNotificationCount }) => {
      setUnreadMessageCount(unreadMessageCount);
      setUnreadCount(unreadNotificationCount);
    };

    socket.on("initial-counts", handleInitialCounts);
    return () => socket.off("initial-counts", handleInitialCounts);
  }, [socket]);

  // ── 4. New notification ───────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => (prev ?? 0) + 1);
    };

    socket.on("new-notification", handleNotification);
    return () => socket.off("new-notification", handleNotification);
  }, [socket]);

  // ── 5. New inbound message → increment badge ──────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (data) => {
      if (data.type === "newMessage" && data.message?.sender?._id !== user?._id) {
        setUnreadMessageCount((prev) => prev + 1);
      }
    };

    socket.on("message", handleMessage);
    return () => socket.off("message", handleMessage);
  }, [socket, user?._id]);

  // ── 6. Save / unsave post → update React Query caches directly ────────────
  useEffect(() => {
    if (!socket) return;

    const handleSavedPost = ({ postId, isSaved, post }) => {
      const filterFn = (s) => (s?._id || s)?.toString() !== postId?.toString();

      // Sync ["user", "me"] — SavedPostsPage
      queryClient.setQueryData(["user", "me"], (old) => {
        if (!old) return old;
        return {
          ...old,
          savedPosts: isSaved
            ? [post, ...(old.savedPosts || [])]
            : (old.savedPosts || []).filter(filterFn),
        };
      });

      // Sync ["user", userId] — ProfilePage saved tab
      if (user?._id) {
        queryClient.setQueryData(["user", user._id], (old) => {
          if (!old) return old;
          return {
            ...old,
            savedPosts: isSaved
              ? [post, ...(old.savedPosts || [])]
              : (old.savedPosts || []).filter(filterFn),
          };
        });
      }
    };

    socket.on("postSavedUpdated", handleSavedPost);
    return () => socket.off("postSavedUpdated", handleSavedPost);
  }, [socket, user?._id, queryClient]);

  // ── 7. Follow / unfollow → update profile cache of User B ─────────────────
  useEffect(() => {
    if (!socket || !user?._id) return;

    const handleFollowUpdate = ({ action, followerId }) => {
      // The current user (User B) just got followed/unfollowed by followerId
      queryClient.setQueryData(["user", user._id], (old) => {
        if (!old) return old;
        const followers = old.followers || [];
        if (action === "follow") {
          // Avoid duplicate
          if (followers.includes(followerId)) return old;
          return { ...old, followers: [...followers, followerId] };
        } else {
          return { ...old, followers: followers.filter((id) => id?.toString() !== followerId) };
        }
      });
    };

    socket.on("follow-update", handleFollowUpdate);
    return () => socket.off("follow-update", handleFollowUpdate);
  }, [socket, user?._id, queryClient]);

  // ── Helper methods ─────────────────────────────────────────────────────────
  const addNotification = (notification) => {
    setNotifications((prev) => [notification, ...prev]);
  };

  const markAsRead = (notificationId) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const clearUnreadMessages = () => setUnreadMessageCount(0);

  const value = {
    socket,
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    setNotifications,
    setUnreadCount,
    unreadMessageCount,
    clearUnreadMessages,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
