import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/api";
import toast from "react-hot-toast";

const AuthContext = createContext(null);

// Custom hook to use auth context
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Auth provider component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get("/users/me");
      if (response.data.status === "success") {
        setUser(response.data.data.user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post("/auth/login", { email, password });

      if (response.data.status === "success") {
        setUser(response.data.data.user);
        setIsAuthenticated(true);
        toast.success(response.data.message || "Login successful!");
        return { success: true };
      }
    } catch (error) {
      const message = error.response?.data?.message || "Login failed";

      if (error.response?.status === 429) {
        return { success: false, error: message };
      }

      // Check if error is due to unverified email
      if (error.response?.status === 401 && message.includes("Email not verified")) {
        toast.success("verify your email to login");
        return {
          success: false,
          error: message,
          requiresVerification: true,
          email,
        };
      }

      toast.error(message);
      return { success: false, error: message };
    }
  };

  const signup = async (userData) => {
    try {
      const response = await api.post("/auth/signup", userData);

      if (response.data.status === "success") {
        toast.success(response.data.message || "Signup successful!");
        return { success: true, email: userData.email };
      }
    } catch (error) {
      const message = error.response?.data?.message || "Signup failed";

      if (error.response?.status === 429) {
        return { success: false, error: message };
      }

      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
      setUser(null);
      setIsAuthenticated(false);
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    signup,
    logout,
    updateUser,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Export hook and provider
export { useAuth, AuthProvider };
