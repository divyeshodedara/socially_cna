import { useQuery } from "@tanstack/react-query";
import api from "../api/api";

export const useSuggestedUsers = () => {
  return useQuery({
    queryKey: ["suggested-users"],
    queryFn: async () => {
      const res = await api.get("/users/suggested-users");
      if (res.data.status === "success") return res.data.data.users || [];
      throw new Error("Failed to fetch suggestions");
    },
    staleTime: 60000,
  });
};
