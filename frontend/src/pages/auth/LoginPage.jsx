import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Basic validation
    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      const result = await login(email, password);

      if (result.success) {
        navigate("/");
      } else if (result.requiresVerification) {
        // Redirect to OTP verification with email in state
        navigate("/verify-email", { state: { email } });
      } else {
        setError(result.error || "Login failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-mono-white dark:bg-mono-black transition-colors duration-200 py-8 px-4">
      <div className="bg-mono-white dark:bg-mono-900 border-2 border-mono-300 dark:border-mono-800 rounded-lg shadow-mono dark:shadow-mono-md p-8 max-w-md w-full">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-mono-black dark:text-mono-white tracking-tight">Socially</h1>
          <p className="text-mono-600 dark:text-mono-500 mt-2">Welcome back! Please login to your account.</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-mono-black dark:text-mono-white mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-mono-white dark:bg-mono-900 border-2 border-mono-300 dark:border-mono-700 rounded-lg text-mono-black dark:text-mono-white placeholder-mono-500 focus:ring-2 focus:ring-mono-black dark:focus:ring-mono-white focus:border-mono-black dark:focus:border-mono-white transition-all duration-200"
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-mono-black dark:text-mono-white mb-2">
              Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-12 bg-mono-white dark:bg-mono-900 border-2 border-mono-300 dark:border-mono-700 rounded-lg text-mono-black dark:text-mono-white placeholder-mono-500 focus:ring-2 focus:ring-mono-black dark:focus:ring-mono-white focus:border-mono-black dark:focus:border-mono-white transition-all duration-200"
                placeholder="Enter your password"
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

          {/* Forgot Password Link */}
          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-sm text-mono-black dark:text-mono-white hover:underline font-medium"
            >
              Forgot your password?
            </Link>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-mono-black dark:bg-mono-white text-mono-white dark:text-mono-black hover:opacity-80 font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Sign Up Link */}
        <div className="mt-6 text-center">
          <p className="text-mono-600 dark:text-mono-500">
            Don't have an account?{" "}
            <Link to="/signup" className="text-mono-black dark:text-mono-white hover:underline font-semibold">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
