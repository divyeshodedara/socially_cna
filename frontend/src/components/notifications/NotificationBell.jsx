import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { useSocket } from "../../context/SocketContext";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../api/api";
import { formatDistanceToNow } from "date-fns";

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      markAsRead(notificationId);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch("/notifications/mark-all-read");
      markAllAsRead();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const getNotificationContent = (notification) => {
    const username = notification.sender?.username || "Someone";

    switch (notification.type) {
      case "like":
        return (
          <div className="flex items-start gap-3">
            <img
              src={notification.sender?.profilePicture || "https://via.placeholder.com/40"}
              alt={username}
              className="w-11 h-11 rounded-full border-2 border-mono-200 dark:border-mono-700 shadow-md object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-semibold text-mono-black dark:text-mono-white">{username}</span>
                <span className="text-mono-600 dark:text-mono-500"> liked your post</span>
              </p>
              <p className="text-xs text-mono-500 dark:text-mono-600 mt-1">
                {formatDistanceToNow(new Date(notification.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
            {notification.post?.image?.url && (
              <img
                src={notification.post.image.url}
                alt="Post"
                className="w-12 h-12 rounded-card object-cover shadow-md flex-shrink-0"
              />
            )}
          </div>
        );

      case "comment":
        return (
          <div className="flex items-start gap-3">
            <img
              src={notification.sender?.profilePicture || "https://via.placeholder.com/40"}
              alt={username}
              className="w-11 h-11 rounded-full border-2 border-mono-200 dark:border-mono-700 shadow-md object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-semibold text-mono-black dark:text-mono-white">{username}</span>
                <span className="text-mono-600 dark:text-mono-500"> commented: </span>
                <span className="text-mono-black dark:text-mono-white">{notification.comment}</span>
              </p>
              <p className="text-xs text-mono-500 dark:text-mono-600 mt-1">
                {formatDistanceToNow(new Date(notification.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
            {notification.post?.image?.url && (
              <img
                src={notification.post.image.url}
                alt="Post"
                className="w-12 h-12 rounded-card object-cover shadow-md flex-shrink-0"
              />
            )}
          </div>
        );

      case "follow":
        return (
          <div className="flex items-start gap-3">
            <img
              src={notification.sender?.profilePicture || "https://via.placeholder.com/40"}
              alt={username}
              className="w-11 h-11 rounded-full border-2 border-mono-200 dark:border-mono-700 shadow-md object-cover"
            />
            <div className="flex-1">
              <p className="text-sm">
                <span className="font-semibold text-mono-black dark:text-mono-white">{username}</span>
                <span className="text-mono-600 dark:text-mono-500"> started following you</span>
              </p>
              <p className="text-xs text-mono-500 dark:text-mono-600 mt-1">
                {formatDistanceToNow(new Date(notification.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-btn hover:bg-mono-100 dark:hover:bg-mono-800 ${
          isOpen
            ? "text-mono-black dark:text-mono-white bg-mono-100 dark:bg-mono-800"
            : "text-mono-500 dark:text-mono-400"
        }`}
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-3 w-96 overflow-hidden bg-mono-white dark:bg-mono-900 border border-mono-200 dark:border-mono-800 rounded-card shadow-2xl z-50"
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-mono-50 to-mono-100 dark:from-mono-900 dark:to-mono-950 border-b border-mono-200 dark:border-mono-800 p-4 flex items-center justify-between z-10">
              <h3 className="font-bold text-lg text-mono-black dark:text-mono-white">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs font-semibold text-mono-600 dark:text-mono-400 hover:text-mono-black dark:hover:text-mono-white transition-colors px-3 py-1.5 rounded-lg hover:bg-mono-200 dark:hover:bg-mono-800"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[28rem] scrollbar-thin scrollbar-thumb-mono-400 dark:scrollbar-thumb-mono-600 scrollbar-track-transparent">
              {notifications.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="bg-mono-100 dark:bg-mono-800 rounded-full p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                    <Bell className="w-8 h-8 text-mono-400 dark:text-mono-600" />
                  </div>
                  <p className="text-mono-600 dark:text-mono-500 text-sm font-medium">No notifications yet</p>
                  <p className="text-xs text-mono-500 dark:text-mono-600 mt-1">
                    We'll notify you when something happens
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification._id}
                    onClick={() => !notification.read && handleMarkAsRead(notification._id)}
                    className={`p-4 hover:bg-mono-50 dark:hover:bg-mono-800 cursor-pointer transition-all duration-200 border-b border-mono-100 dark:border-mono-800 last:border-b-0 ${
                      !notification.read
                        ? "bg-gradient-to-r from-mono-100 to-mono-50 dark:from-mono-800 dark:to-mono-850 border-l-4 border-l-mono-black dark:border-l-mono-white"
                        : ""
                    }`}
                  >
                    {getNotificationContent(notification)}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
