import { useQuery } from "@tanstack/react-query";
import api from "../api/api";

export const useUser = (id) => {
  return useQuery({
    queryKey: ["user", id],
    queryFn: async () => {
      const res = await api.get(`/users/profile/${id}`);
      if (res.data.status === "success") return res.data.data.user;
      throw new Error("Failed to fetch user");
    },
    enabled: !!id,
    staleTime: 60000,
  });
};
