import { useQuery } from "@tanstack/react-query";
import api from "../api/api";

export const usePosts = (userId) => {
  return useQuery({
    queryKey: ["posts", "user", userId],
    queryFn: async () => {
      const res = await api.get(`/posts/user-posts/${userId}`);
      if (res.data.status === "Success") return res.data.data.posts || [];
      throw new Error("Failed to fetch posts");
    },
    enabled: !!userId,
    staleTime: 60000,
  });
};
