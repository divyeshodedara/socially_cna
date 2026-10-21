import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/api";
import toast from "react-hot-toast";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Basic validation
    if (!email) {
      setError("Please enter your email address");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/auth/forget-password", { email });

      if (response.data.status === "success") {
        setSuccess(true);
        toast.success(response.data.message || "OTP sent to your email!");
        // Navigate to reset password page after 2 seconds
        setTimeout(() => {
          navigate("/reset-password", { state: { email } });
        }, 2000);
      }
    } catch (err) {
      const message = err.response?.data?.message || "Failed to send OTP";
      setError(message);

      if (err.response?.status === 429) {
        return;
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-mono-white dark:bg-mono-black transition-colors duration-200 py-8 px-4">
      <div className="bg-mono-white dark:bg-mono-900 border-2 border-mono-300 dark:border-mono-800 rounded-card shadow-mono dark:shadow-mono-md p-8 max-w-md w-full">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-mono-black dark:text-mono-white tracking-tight">Forgot Password?</h1>
          <p className="text-mono-600 dark:text-mono-500 mt-2">
            No worries! Enter your email and we'll send you a reset code.
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-input">
            <p className="text-green-600 dark:text-green-400 text-sm font-medium">
              ✓ OTP sent successfully! Redirecting to reset password page...
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-input">
            <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Forgot Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-mono-black dark:text-mono-white mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-mono-white dark:bg-mono-900 border-2 border-mono-300 dark:border-mono-700 rounded-input text-mono-black dark:text-mono-white placeholder-mono-500 focus:ring-2 focus:ring-mono-black dark:focus:ring-mono-white focus:border-mono-black dark:focus:border-mono-white transition-all duration-200"
              placeholder="Enter your registered email"
              disabled={loading || success}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-mono-black dark:bg-mono-white text-mono-white dark:text-mono-black hover:opacity-80 font-semibold py-2.5 px-4 rounded-btn transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send Reset Code"}
          </button>
        </form>

        {/* Back to Login Link */}
        <div className="mt-6 text-center">
          <p className="text-mono-600 dark:text-mono-500">
            Remember your password?{" "}
            <Link to="/login" className="text-mono-black dark:text-mono-white hover:underline font-semibold">
              Back to Login
            </Link>
          </p>
        </div>

        {/* Info */}
        <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-input">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            You'll receive a 6-digit OTP code to reset your password. The code will expire in 10 minutes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
