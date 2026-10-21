import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const SignupPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { signup } = useAuth();
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
    if (!formData.username || !formData.email || !formData.password || !formData.passwordConfirm) {
      setError("Please fill in all fields");
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
      const result = await signup(formData);

      if (result.success) {
        // Navigate to verify email page with email in state
        navigate("/verify-email", { state: { email: formData.email } });
      } else {
        setError(result.error || "Signup failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-mono-white dark:bg-mono-black transition-colors duration-200 py-8 px-4">
      <div className="bg-mono-white dark:bg-mono-900 border-2 border-mono-300 dark:border-mono-800 rounded-card shadow-mono dark:shadow-mono-md p-8 max-w-md w-full">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-mono-black dark:text-mono-white tracking-tight">Socially</h1>
          <p className="text-mono-600 dark:text-mono-500 mt-2">Create your account and start connecting!</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-input">
            <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Field */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-mono-black dark:text-mono-white mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-mono-white dark:bg-mono-900 border-2 border-mono-300 dark:border-mono-700 rounded-lg text-mono-black dark:text-mono-white placeholder-mono-500 focus:ring-2 focus:ring-mono-black dark:focus:ring-mono-white focus:border-mono-black dark:focus:border-mono-white transition-all duration-200"
              placeholder="Choose a username"
              disabled={loading}
            />
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-mono-black dark:text-mono-white mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-mono-white dark:bg-mono-900 border-2 border-mono-300 dark:border-mono-700 rounded-lg text-mono-black dark:text-mono-white placeholder-mono-500 focus:ring-2 focus:ring-mono-black dark:focus:ring-mono-white focus:border-mono-black dark:focus:border-mono-white transition-all duration-200"
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>
          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-mono-black dark:text-mono-white mb-2">
              Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
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

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-mono-black dark:text-mono-white mb-2">
              Confirm Password
            </label>

            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="passwordConfirm"
                name="passwordConfirm"
                value={formData.passwordConfirm}
                onChange={handleChange}
                className="w-full px-4 py-2.5 pr-12 bg-mono-white dark:bg-mono-900 border-2 border-mono-300 dark:border-mono-700 rounded-lg text-mono-black dark:text-mono-white placeholder-mono-500 focus:ring-2 focus:ring-mono-black dark:focus:ring-mono-white focus:border-mono-black dark:focus:border-mono-white transition-all duration-200"
                placeholder="Confirm your password"
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

          {/* Signup Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-mono-black dark:bg-mono-white text-mono-white dark:text-mono-black hover:opacity-80 font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-mono-600 dark:text-mono-500">
            Already have an account?{" "}
            <Link to="/login" className="text-mono-black dark:text-mono-white hover:underline font-semibold">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
