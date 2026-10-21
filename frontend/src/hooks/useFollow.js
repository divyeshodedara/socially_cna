import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/api";

export const useFollow = (currentUserId) => {
  const queryClient = useQueryClient();

  const followMutation = useMutation({
    mutationFn: (targetId) => api.post(`/users/follow/${targetId}`),

    onMutate: async (targetId) => {
      await queryClient.cancelQueries(["user", targetId]);

      const prevTarget = queryClient.getQueryData(["user", targetId]);
      const prevCurrent = queryClient.getQueryData(["user", currentUserId]);

      // Update target user (followers)
      queryClient.setQueryData(["user", targetId], (old) => ({
        ...old,
        followers: [...(old?.followers || []), currentUserId],
      }));

      // Update current user (following) → IMPORTANT
      queryClient.setQueryData(["user", currentUserId], (old) => ({
        ...old,
        following: [...(old?.following || []), targetId],
      }));

      return { prevTarget, prevCurrent };
    },

    onError: (_, targetId, context) => {
      queryClient.setQueryData(["user", targetId], context.prevTarget);
      queryClient.setQueryData(["user", currentUserId], context.prevCurrent);
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (targetId) => api.post(`/users/unfollow/${targetId}`),

    onMutate: async (targetId) => {
      await queryClient.cancelQueries(["user", targetId]);

      const prevTarget = queryClient.getQueryData(["user", targetId]);
      const prevCurrent = queryClient.getQueryData(["user", currentUserId]);

      queryClient.setQueryData(["user", targetId], (old) => ({
        ...old,
        followers: old?.followers?.filter((id) => id !== currentUserId),
      }));

      queryClient.setQueryData(["user", currentUserId], (old) => ({
        ...old,
        following: old?.following?.filter((id) => id !== targetId),
      }));

      return { prevTarget, prevCurrent };
    },

    onError: (_, targetId, context) => {
      queryClient.setQueryData(["user", targetId], context.prevTarget);
      queryClient.setQueryData(["user", currentUserId], context.prevCurrent);
    },
  });

  return {
    follow: followMutation.mutate,
    unfollow: unfollowMutation.mutate,
    isLoading: followMutation.isLoading || unfollowMutation.isLoading,
  };
};
