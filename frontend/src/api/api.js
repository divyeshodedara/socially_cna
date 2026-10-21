import axios from "axios";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error.response?.status;

    // 401 - Unauthorized
    if (status === 401) {
      const publicPaths = ["/login", "/signup", "/verify-email", "/forgot-password", "/reset-password"];

      const currentPath = window.location.pathname;

      if (!publicPaths.includes(currentPath)) {
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }

    // 429 - Rate Limit (FROM YOUR CLOUDFLARE WORKER)
    if (status === 429) {
      const message = error.response?.data?.message || "Too many requests. Please slow down.";

      toast.error(message);
    }

    return Promise.reject(error);
  },
);

export default api;
