import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SocketProvider } from "./context/SocketContext";

import HomePage from "./pages/feed/HomePage";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import NotFoundPage from "./pages/NotFoundPage";
import EditProfilePage from "./pages/profile/EditProfilePage";
import SavedPostsPage from "./pages/profile/SavedPostsPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ProfilePage from "./pages/profile/ProfilePage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import MessagesPage from "./pages/messages/MessagesPage";
import ChatPage from "./pages/messages/ChatPage";
import SuggestedUsersPage from "./pages/users/SuggestedUsersPage";

import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/common/ProtectedRoute";

function App() {
  const { loading } = useAuth();

  return (
    <ThemeProvider>
      <SocketProvider>
        {loading ? (
          <div className="min-h-screen flex items-center justify-center bg-mono-white dark:bg-mono-black">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-mono-black dark:border-mono-white"></div>
          </div>
        ) : (
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<HomePage />} />
              <Route path="profile/:id" element={<ProfilePage />} />
              <Route path="edit-profile" element={<EditProfilePage />} />
              <Route path="saved" element={<SavedPostsPage />} />
              <Route path="suggested-users" element={<SuggestedUsersPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="messages/:userId" element={<ChatPage />} />
            </Route>

            {/* Catch all - redirect to home */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        )}
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App;
