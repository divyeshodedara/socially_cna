import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, Image as ImageIcon, X, Loader2 } from "lucide-react";
import api from "../../api/api";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { format } from "date-fns";

const ChatPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user: currentUser } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const isInitialLoad = useRef(true);

  // Fetch messages for this conversation
  const { data: messages = [], isLoading: loading } = useQuery({
    queryKey: ["messages", userId],
    queryFn: async () => {
      const response = await api.get(`/messages/${userId}`);
      if (response.data.status === "success") {
        return response.data.data.messages || [];
      }
      throw new Error("Failed to fetch messages");
    },
    staleTime: 30000, // 30s — socket events handle real-time updates; avoid unnecessary refetches
    refetchOnWindowFocus: false,
  });

  // Fetch other user's profile — uses initialData from router state or cache seed,
  // so no network request fires when navigating from MessagesPage
  const { data: otherUser } = useQuery({
    queryKey: ["user", userId],
    queryFn: async () => {
      const response = await api.get(`/users/profile/${userId}`);
      if (response.data.status === "success") {
        return response.data.data.user;
      }
      throw new Error("Failed to fetch user profile");
    },
    initialData: state?.otherUser ?? undefined, // from MessagesPage navigation state
    staleTime: 120000, // 2 minutes
  });

  useEffect(() => {
    return () => {
      setIsTyping(false);
    };
  }, []);

  // Mark messages as seen on mount
  useEffect(() => {
    if (!loading) {
      markMessagesAsSeen(); // call even if messages.length is 0, it's a no-op on the server
    }
  }, [loading]); // only depend on loading, not messages.length // ← depend on loading + messages.length, not userId

  useLayoutEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for new messages and typing indicators
  useEffect(() => {
    if (socket) {
      const handleMessage = (data) => {
        if (data.type === "newMessage" && data.message.sender._id === userId) {
          queryClient.setQueryData(["messages", userId], (old = []) => [...old, data.message]);
          markMessagesAsSeen();
        }
        if (data.type === "messagesSeen" && data.seenBy === userId) {
          queryClient.setQueryData(["messages", userId], (old = []) =>
            old.map((msg) => (msg.sender?._id === currentUser._id ? { ...msg, seen: true } : msg)),
          );
          // Conversations list is updated by MessagesPage's own socket listener
        }
      };

      const handleTyping = (data) => {
        if (data.userId === userId) {
          setIsTyping(true);
        }
      };

      const handleStoppedTyping = (data) => {
        if (data.userId === userId) {
          setIsTyping(false);
        }
      };

      socket.on("message", handleMessage);
      socket.on("userTyping", handleTyping);
      socket.on("userStoppedTyping", handleStoppedTyping);

      return () => {
        socket.off("message", handleMessage);
        socket.off("userTyping", handleTyping);
        socket.off("userStoppedTyping", handleStoppedTyping);

        // Bug 8 fix — clear typing indicator on the other user's screen when leaving
        socket.emit("stopTyping", {
          senderId: currentUser._id,
          receiverId: userId,
        });

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      };
    }
  }, [socket, userId, currentUser, queryClient]);

  const markMessagesAsSeen = () => {
    if (socket && userId && currentUser?._id) {
      socket.emit("markMessagesSeen", {
        senderId: userId,
        receiverId: currentUser._id,
      });
      
      // Optimistically update the conversations list cache so the unread dot goes away immediately
      queryClient.setQueryData(["conversations"], (old = []) =>
        old.map((conv) => {
          const isRelevantConv = conv.participants?.some(p => p?._id === userId);
          if (isRelevantConv && conv.lastMessage) {
            return { ...conv, lastMessage: { ...conv.lastMessage, seen: true } };
          }
          return conv;
        }),
      );
    }
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await api.post("/messages/send", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data.data.message;
    },
    onSuccess: (newMessageData) => {
      // Add the new message to the sender's chat cache directly
      queryClient.setQueryData(["messages", userId], (old = []) => [...old, newMessageData]);

      // The backend only emits the newMessage socket event to the RECEIVER, not the sender.
      // So we manually update the sender's conversations list cache here to move
      // this conversation to the top with the latest message.
      queryClient.setQueryData(["conversations"], (old = []) => {
        // Find the existing conversation for this chat partner
        const existingConv = old.find((c) =>
          c.participants?.some((p) => p?._id === userId)
        );

        if (existingConv) {
          // Build an updated conversation with the new lastMessage
          const updatedConv = {
            ...existingConv,
            lastMessage: {
              ...newMessageData,
              sender: { _id: currentUser._id, username: currentUser.username },
              receiver: { _id: userId },
              seen: false,
            },
          };
          // Move it to the top
          const filtered = old.filter((c) => c._id !== existingConv._id);
          return [updatedConv, ...filtered];
        }

        // No existing conversation in cache yet — let a refetch handle it
        return old;
      });

      setNewMessage("");
      handleRemoveImage();
    },
    onError: (error) => {
      const message = error.response?.data?.message || "Failed to send message";
      toast.error(message);
    },
  });

  const scrollToBottom = () => {
    if (isInitialLoad.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // After first load, mark it as done
  useEffect(() => {
    if (!loading && messages.length > 0) {
      isInitialLoad.current = false;
    }
  }, [loading]);
  const handleTyping = () => {
    if (socket) {
      socket.emit("typing", {
        senderId: currentUser._id,
        receiverId: userId,
      });

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stopTyping", {
          senderId: currentUser._id,
          receiverId: userId,
        });
      }, 1000);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() && !imageFile) {
      return;
    }

    const formData = new FormData();
    formData.append("receiverId", userId);
    if (newMessage.trim()) {
      formData.append("message", newMessage);
    }
    if (imageFile) {
      formData.append("image", imageFile);
    }

    sendMessageMutation.mutate(formData);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-mono-black dark:border-mono-white"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-120px)] flex flex-col">
      {/* <div className="max-w-4xl mx-auto h-[calc(100vh-64px)] lg:h-[calc(100vh-120px)] flex flex-col pb-16 lg:pb-0"> */}
      <div className="bg-mono-white dark:bg-mono-900 border border-mono-300 dark:border-mono-800 rounded-card shadow-mono dark:shadow-mono-md flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-mono-300 dark:border-mono-800 p-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/messages")}
            className="text-mono-black dark:text-mono-white hover:bg-mono-100 dark:hover:bg-mono-800 p-2 rounded-btn transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img
            src={otherUser?.profilePicture || "https://via.placeholder.com/40"}
            alt={otherUser?.username}
            className="w-10 h-10 rounded-full object-cover border-2 border-mono-300 dark:border-mono-700"
          />
          <div className="flex-1">
            <h2 className="font-semibold text-mono-black dark:text-mono-white">{otherUser?.username}</h2>
            {isTyping && <p className="text-sm text-mono-600 dark:text-mono-500">typing...</p>}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-mono-600 dark:text-mono-500 mt-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => {
              const isSender = message.sender._id === currentUser._id;
              return (
                <div key={message._id} className={`flex ${isSender ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[70%] ${
                      isSender
                        ? "bg-mono-black dark:bg-mono-white text-mono-white dark:text-mono-black"
                        : "bg-mono-200 dark:bg-mono-800 text-mono-black dark:text-mono-white"
                    } rounded-card p-3`}
                  >
                    {message.image && (
                      <img src={message.image.url} alt="Message attachment" className="rounded-card mb-2 max-w-full" />
                    )}
                    {message.message && <p className="break-words">{message.message}</p>}
                    <div
                      className={`text-xs mt-1 flex items-center gap-2 ${
                        isSender ? "text-mono-300 dark:text-mono-700" : "text-mono-600 dark:text-mono-500"
                      }`}
                    >
                      <span>{format(new Date(message.createdAt), "p")}</span>
                      {isSender && (
                        <span className={message.seen ? "text-blue-500" : ""}>{message.seen ? "✓✓" : "✓"}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div className="border-t border-mono-300 dark:border-mono-800 p-4">
            <div className="relative inline-block">
              <img src={imagePreview} alt="Preview" className="h-20 rounded-card" />
              <button
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 bg-mono-black dark:bg-mono-white text-mono-white dark:text-mono-black rounded-full p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={handleSendMessage}
          className="border-t border-mono-300 dark:border-mono-800 p-4 flex items-center gap-2"
        >
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-mono-black dark:text-mono-white hover:bg-mono-100 dark:hover:bg-mono-800 p-2 rounded-btn transition-all duration-200"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            autoFocus
            placeholder="Type a message..."
            className="flex-1 min-w-0 px-4 py-2 bg-mono-100 dark:bg-mono-800 border border-mono-300 dark:border-mono-700 rounded-input focus:outline-none focus:ring-2 focus:ring-mono-black dark:focus:ring-mono-white text-mono-black dark:text-mono-white placeholder-mono-500"
            disabled={sendMessageMutation.isLoading}
          />
          <button
            type="submit"
            disabled={sendMessageMutation.isLoading || (!newMessage.trim() && !imageFile)}
            className="bg-mono-black dark:bg-mono-white text-mono-white dark:text-mono-black hover:opacity-80 p-2 rounded-btn transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendMessageMutation.isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;
