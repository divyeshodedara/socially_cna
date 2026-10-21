import { useEffect } from "react";
import { Bookmark } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Post from "../../components/posts/Post";
import { useSocket } from "../../context/SocketContext";
import api from "../../api/api";

const SavedPostsPage = () => {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const {
    data: savedPosts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["user", "me"],
    queryFn: async () => {
      const response = await api.get("/users/me");
      if (response.data.status === "success") {
        return response.data.data.user;
      }
      throw new Error("Failed to fetch user");
    },
    staleTime: 60000,
    select: (user) => user.savedPosts || [],
  });

  useEffect(() => {
    if (!socket) return;

    const handlePostSavedUpdate = ({ postId, isSaved, post }) => {
      queryClient.setQueryData(["user", "me"], (old) => {
        if (!old) return old;
        const currentSaved = old.savedPosts || [];
        const updatedSaved = isSaved
          ? currentSaved.some((p) => p._id === postId)
            ? currentSaved
            : [post, ...currentSaved]
          : currentSaved.filter((p) => p._id !== postId);

        return { ...old, savedPosts: updatedSaved };
      });
    };

    socket.on("postSavedUpdated", handlePostSavedUpdate);
    return () => socket.off("postSavedUpdated", handlePostSavedUpdate);
  }, [socket, queryClient]);



  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-mono-black dark:border-mono-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-mono-100 dark:bg-mono-900 border border-mono-300 dark:border-mono-800 rounded-card p-6 text-center">
        <p className="text-mono-black dark:text-mono-white mb-4">{error.message || "Failed to fetch saved posts"}</p>
        <button
          onClick={() => queryClient.invalidateQueries(["user", "me"])}
          className="bg-mono-black dark:bg-mono-white text-mono-white dark:text-mono-black px-4 py-2 rounded-btn font-medium hover:opacity-80 transition-opacity"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-mono-white dark:bg-mono-900 rounded-card border border-mono-300 dark:border-mono-800 p-4 mb-4 shadow-mono">
        <div className="flex items-center gap-2">
          <Bookmark className="w-6 h-6 text-mono-black dark:text-mono-white" />
          <h1 className="text-2xl font-bold text-mono-black dark:text-mono-white">Saved Posts</h1>
        </div>
        <p className="text-mono-600 dark:text-mono-500 text-sm mt-1">All your saved posts in one place</p>
      </div>

      {/* Saved Posts */}
      {savedPosts.length === 0 ? (
        <div className="bg-mono-white dark:bg-mono-900 rounded-card border border-mono-300 dark:border-mono-800 p-8 text-center">
          <Bookmark className="w-16 h-16 text-mono-400 dark:text-mono-700 mx-auto mb-4" />
          <p className="text-mono-black dark:text-mono-white mb-2">No saved posts yet</p>
          <p className="text-sm text-mono-600 dark:text-mono-500">Posts you save will appear here</p>
        </div>
      ) : (
        <div className="space-y-6">
          {savedPosts.map((post) => (
            <Post key={post._id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedPostsPage;
