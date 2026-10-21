import { useQuery } from "@tanstack/react-query";
import api from "../api/api";

export const useFollowing = (id, enabled) => {
  return useQuery({
    queryKey: ["following", id],
    queryFn: async () => {
      const res = await api.get(`/users/following/${id}`);
      return res.data.data.following;
    },
    enabled,
    staleTime: 60000,
  });
};
