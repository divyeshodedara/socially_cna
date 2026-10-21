import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../../api/api";
import toast from "react-hot-toast";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const ResetPasswordPage = () => {
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: location.state?.email || "",
    otp: "",
    password: "",
    passwordConfirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Basic validation
    if (!formData.email || !formData.otp || !formData.password || !formData.passwordConfirm) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    if (formData.otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.passwordConfirm) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/auth/reset-password", formData);

      if (response.data.status === "success") {
        toast.success(response.data.message || "Password reset successfully!");
        // Navigate to login page
        navigate("/login");
      }
    } catch (err) {
      const message = err.response?.data?.message || "Failed to reset password";
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
          <h1 className="text-4xl font-bold text-mono-black dark:text-mono-white tracking-tight">Reset Password</h1>
          <p className="text-mono-600 dark:text-mono-500 mt-2">
            Enter the OTP sent to your email and create a new password.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-input">
            <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Reset Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-mono-black dark:text-mono-white mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-mono-white dark:bg-mono-900 border-2 border-mono-300 dark:border-mono-700 rounded-input text-mono-black dark:text-mono-white placeholder-mono-500 focus:ring-2 focus:ring-mono-black dark:focus:ring-mono-white focus:border-mono-black dark:focus:border-mono-white transition-all duration-200"
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>

          {/* OTP Field */}
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-mono-black dark:text-mono-white mb-2">
              OTP Code
            </label>
            <input
              type="text"
              id="otp"
              name="otp"
              value={formData.otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                setFormData({ ...formData, otp: value });
              }}
              className="w-full px-4 py-2.5 bg-mono-white dark:bg-mono-900 border-2 border-mono-300 dark:border-mono-700 rounded-input text-mono-black dark:text-mono-white placeholder-mono-500 focus:ring-2 focus:ring-mono-black dark:focus:ring-mono-white focus:border-mono-black dark:focus:border-mono-white transition-all duration-200 text-center text-xl tracking-widest"
              placeholder="000000"
              maxLength={6}
              disabled={loading}
            />
            <p className="text-xs text-mono-600 dark:text-mono-500 mt-1">Enter the 6-digit code from your email</p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-mono-black dark:text-mono-white mb-2">
              New Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2.5 pr-12 bg-mono-white dark:bg-mono-900 border-2 border-mono-300 dark:border-mono-700 rounded-lg text-mono-black dark:text-mono-white placeholder-mono-500 focus:ring-2 focus:ring-mono-black dark:focus:ring-mono-white focus:border-mono-black dark:focus:border-mono-white transition-all duration-200"
                placeholder="Enter new password"
                disabled={loading}
              />

              {/* Show/Hide Button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-mono-600 dark:text-mono-400"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-mono-black dark:text-mono-white mb-2">
              Confirm New Password
            </label>

            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="passwordConfirm"
                name="passwordConfirm"
                value={formData.passwordConfirm}
                onChange={handleChange}
                className="w-full px-4 py-2.5 pr-12 bg-mono-white dark:bg-mono-900 border-2 border-mono-300 dark:border-mono-700 rounded-lg text-mono-black dark:text-mono-white placeholder-mono-500 focus:ring-2 focus:ring-mono-black dark:focus:ring-mono-white focus:border-mono-black dark:focus:border-mono-white transition-all duration-200"
                placeholder="Confirm new password"
                disabled={loading}
              />

              {/* Show/Hide Button */}
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-mono-600 dark:text-mono-400"
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-mono-black dark:bg-mono-white text-mono-white dark:text-mono-black hover:opacity-80 font-semibold py-2.5 px-4 rounded-btn transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Resetting..." : "Reset Password"}
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
            Make sure to use a strong password with at least 8 characters.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
