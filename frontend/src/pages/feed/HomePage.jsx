import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import Post from "../../components/posts/Post";
import api from "../../api/api";
import toast from "react-hot-toast";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";

const HomePage = () => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const observerRef = useRef();
  const location = useLocation();

  // Fetch posts with React Query infinite query for caching
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error } = useInfiniteQuery({
    queryKey: ["posts", "feed"],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.get(`/posts/all-posts?page=${pageParam}&limit=10`);
      if (response.data.status === "Success") {
        return response.data.data;
      }
      throw new Error("Failed to fetch posts");
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.hasMore ? pages.length + 1 : undefined;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  // Flatten all posts from all pages
  const posts = data?.pages?.flatMap((page) => page.posts) ?? [];

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 },
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Listen for new posts via Socket.IO
  useEffect(() => {
    if (socket) {
      const handleNewPost = (newPost) => {
        // Add new post to cache optimistically
        queryClient.setQueryData(["posts", "feed"], (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page, index) => {
              if (index === 0) {
                return {
                  ...page,
                  posts: [newPost, ...page.posts],
                };
              }
              return page;
            }),
          };
        });

        // Only show toast if it's not your own post
        if (newPost.user?._id !== user?._id) {
          toast.success(`New post from ${newPost.user?.username || "someone"}!`, {
            duration: 3000,
          });
        }
      };

      const handlePostDeleted = ({ postId }) => {
        queryClient.setQueryData(["posts", "feed"], (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              posts: page.posts.filter((p) => p._id !== postId),
            })),
          };
        });
      };

      socket.on("newPost", handleNewPost);
      socket.on("postDeleted", handlePostDeleted);

      // Cleanup listener on unmount
      return () => {
        socket.off("newPost", handleNewPost);
        socket.off("postDeleted", handlePostDeleted);
      };
    }
  }, [socket, user, queryClient]);

  // Scroll to specific post if postId is provided
  useEffect(() => {
    if (location.state?.postId && posts.length > 0) {
      const timer = setTimeout(() => {
        const postElement = document.getElementById(`post-${location.state.postId}`);
        if (postElement) {
          postElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [location.state?.postId, posts]);

  const handlePostUpdate = () => {
    // Invalidate posts cache to trigger refetch
    queryClient.invalidateQueries(["posts", "feed"]);
  };

  if (isLoading && posts.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-mono-black dark:border-mono-white"></div>
      </div>
    );
  }

  if (isError && posts.length === 0) {
    const message = error?.response?.data?.message || error?.message || "Failed to fetch posts";
    return (
      <div className="bg-mono-100 dark:bg-mono-900 border border-mono-300 dark:border-mono-800 rounded-card p-6 text-center">
        <p className="text-mono-black dark:text-mono-white mb-4">{message}</p>
        <button onClick={handlePostUpdate} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Main Feed */}
      {posts.length === 0 && !isLoading ? (
        <div className="bg-mono-white dark:bg-mono-900 rounded-card border border-mono-300 dark:border-mono-800 p-8 text-center">
          <p className="text-mono-black dark:text-mono-white mb-4">No posts to display yet.</p>
          <p className="text-sm text-mono-600 dark:text-mono-500">
            Follow some users or create your first post to see content here!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <div key={post._id} id={`post-${post._id}`} className="transition-all duration-300 rounded-card">
              <Post post={post} onUpdate={handlePostUpdate} />
            </div>
          ))}

          {/* Loading indicator */}
          {isFetchingNextPage && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-mono-black dark:border-mono-white"></div>
            </div>
          )}

          {/* Observer target for infinite scroll */}
          {hasNextPage && !isFetchingNextPage && <div ref={observerRef} style={{ height: "20px" }} />}

          {/* End of feed message */}
          {!hasNextPage && posts.length > 0 && (
            <div className="text-center py-8 text-mono-600 dark:text-mono-500">You've reached the end!</div>
          )}
        </div>
      )}
    </div>
  );
};

export default HomePage;
