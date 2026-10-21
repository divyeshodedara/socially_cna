import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Search } from "lucide-react";
import api from "../../api/api";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { formatDistanceToNow } from "date-fns";

const formatShortTime = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  if (diffInSeconds < 60) return "just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d`;
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 52) return `${diffInWeeks}w`;
  return `${Math.floor(diffInWeeks / 52)}y`;
};

const MessagesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, clearUnreadMessages } = useSocket();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch conversations with React Query
  const {
    data: conversations = [],
    isLoading: loading,
    error: conversationsError,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const response = await api.get("/messages/conversations");
      if (response.data.status === "success") {
        return response.data.data.conversations || [];
      }
      throw new Error("Failed to fetch conversations");
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — socket events keep this up-to-date
    refetchOnWindowFocus: false, // socket handles real-time sync, no poll needed
    retry: (failureCount, error) => {
      if (error.response?.status === 429) return false;
      return failureCount < 2;
    },
  });

  useEffect(() => {
    clearUnreadMessages();
  }, []);

  // Listen for new messages — update conversation list directly without HTTP refetch
  useEffect(() => {
    if (socket) {
      const handleNewMessage = (data) => {
        if (data.type === "newMessage" && data.conversation) {
          // Push the updated conversation to the top of the cache — zero HTTP round-trips
          queryClient.setQueryData(["conversations"], (old = []) => {
            const filtered = old.filter((c) => c._id !== data.conversation._id);
            return [data.conversation, ...filtered];
          });
        }
        if (data.type === "messagesSeen") {
          // Mark lastMessage as seen in-memory for the relevant conversation
          queryClient.setQueryData(["conversations"], (old = []) =>
            old.map((conv) => {
              if (!conv.lastMessage) return conv;
              const isRelevantConv = conv.participants?.some(p => p?._id === data.seenBy);
              if (isRelevantConv) {
                return { ...conv, lastMessage: { ...conv.lastMessage, seen: true } };
              }
              return conv;
            }),
          );
        }
      };

      socket.on("message", handleNewMessage);

      return () => {
        socket.off("message", handleNewMessage);
      };
    }
  }, [socket, queryClient]);

  // FIX 2: Safely check user?._id to prevent crashes on hard reloads
  const getOtherParticipant = (participants) => {
    return participants?.find((p) => p?._id !== user?._id);
  };

  // FIX 1: Safely handle undefined usernames and prevent toLowerCase crashes
  const filteredConversations = conversations.filter((conv) => {
    const otherUser = getOtherParticipant(conv?.participants || []);
    if (!otherUser?.username) return false; // Skip if no valid user/username

    return otherUser.username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-mono-black dark:border-mono-white"></div>
      </div>
    );
  }

  if (conversationsError?.response?.status === 429) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-mono-white dark:bg-mono-900 rounded-card border border-mono-200 dark:border-mono-800 p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <div className="flex flex-col items-center text-center group">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-mono-400 to-mono-600 rounded-full blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-300" />
              <div className="relative text-6xl transform group-hover:scale-110 transition-transform duration-300">
                ⏱️
              </div>
            </div>
            <h2 className="text-3xl font-bold text-mono-black dark:text-mono-white mb-3">Too Many Requests</h2>
            <p className="text-lg text-mono-600 dark:text-mono-400 mb-6 max-w-md">
              {conversationsError.response?.data?.message ||
                "You've made too many attempts. Please take a break and try again later."}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-mono-black dark:bg-mono-white text-mono-white dark:text-mono-black font-semibold rounded-btn hover:scale-105 transform transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate("/")}
                className="px-6 py-3 bg-mono-200 dark:bg-mono-800 text-mono-black dark:text-mono-white font-semibold rounded-btn hover:scale-105 transform transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    // <div className="max-w-4xl mx-auto">
    <div className="max-w-4xl mx-auto pb-16 lg:pb-0">
      <div className="bg-mono-white dark:bg-mono-900 border border-mono-300 dark:border-mono-800 rounded-card shadow-mono dark:shadow-mono-md">
        {/* Header */}
        <div className="border-b border-mono-300 dark:border-mono-800 p-4">
          <h1 className="text-2xl font-bold text-mono-black dark:text-mono-white mb-4">Messages</h1>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mono-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-mono-100 dark:bg-mono-800 border border-mono-300 dark:border-mono-700 rounded-input focus:outline-none focus:ring-2 focus:ring-mono-black dark:focus:ring-mono-white text-mono-black dark:text-mono-white placeholder-mono-500"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="divide-y divide-mono-300 dark:divide-mono-800">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-mono-400 dark:text-mono-600" />
              <p className="text-mono-600 dark:text-mono-500 mb-2">
                {searchQuery ? "No conversations found" : "No messages yet"}
              </p>
              <p className="text-sm text-mono-500">Start a conversation by visiting a user's profile</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const otherUser = getOtherParticipant(conversation.participants);

              // FIX 4: Safety catch to prevent rendering corrupted conversations
              if (!otherUser) return null;

              const lastMessage = conversation.lastMessage;

              const isUnread =
                lastMessage &&
                !lastMessage.seen &&
                lastMessage.sender?._id?.toString() !== user._id?.toString() &&
                lastMessage.receiver?._id?.toString() === user._id?.toString();

              return (
                <div
                  key={conversation._id}
                  onClick={() => navigate(`/messages/${otherUser._id}`, { state: { otherUser } })}
                  onMouseEnter={() => {
                    if (!otherUser._id) return;

                    // Prefetch messages for instant chat open
                    queryClient.prefetchQuery({
                      queryKey: ["messages", otherUser._id],
                      queryFn: async () => {
                        const response = await api.get(`/messages/${otherUser._id}`);
                        if (response.data.status === "success") {
                          return response.data.data.messages || [];
                        }
                        return [];
                      },
                      staleTime: 30000,
                    });

                    // Seed profile cache directly from conversation data — no network request
                    queryClient.setQueryData(["user", otherUser._id], (old) => {
                      if (old) return old; // already fully fetched, don't overwrite
                      return otherUser; // use participant data from conversations
                    });
                  }}
                  className="p-4 hover:bg-mono-100 dark:hover:bg-mono-800 cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={otherUser?.profilePicture || "https://via.placeholder.com/50"}
                      alt={otherUser?.username || "User"}
                      className="w-12 h-12 rounded-full object-cover border-2 border-mono-300 dark:border-mono-700"
                    />
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-semibold truncate mb-1 ${
                          isUnread ? "text-mono-black dark:text-mono-white" : "text-mono-700 dark:text-mono-300"
                        }`}
                      >
                        {otherUser?.username || "Unknown User"}
                      </h3>
                      {lastMessage && (
                        <p
                          className={`text-sm truncate ${
                            isUnread
                              ? "text-mono-black dark:text-mono-white font-medium"
                              : "text-mono-600 dark:text-mono-500"
                          }`}
                        >
                          {lastMessage.image ? "📷 Photo" : lastMessage.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-1.5 min-w-[50px]">
                      {lastMessage?.createdAt && (
                        <span className="text-xs text-mono-500 font-medium whitespace-nowrap">
                          {formatShortTime(new Date(lastMessage.createdAt))}
                        </span>
                      )}
                      {isUnread && <div className="w-2.5 h-2.5 bg-mono-black dark:bg-mono-white rounded-full"></div>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
