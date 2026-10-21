import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/api";
import toast from "react-hot-toast";

const VerifyEmailPage = () => {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const { checkAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  // Redirect if no email is provided
  useEffect(() => {
    if (!email) {
      toast.error("Please signup first");
      navigate("/signup");
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Basic validation
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/auth/verify", { email, otp });

      if (response.data.status === "success") {
        toast.success(response.data.message || "Email verified successfully!");
        await checkAuth(); // Refresh user data
        navigate("/");
      }
    } catch (err) {
      const message = err.response?.data?.message || "Verification failed";
      setError(message);

      if (err.response?.status === 429) {
        return;
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    setError("");

    try {
      const response = await api.post("/auth/resend-otp", {
        email,
      });

      if (response.data.status === "success") {
        toast.success(response.data.message || "OTP resent successfully!");
      }
    } catch (err) {
      const message = err.response?.data?.message || "Failed to resend OTP";
      setError(message);

      if (err.response?.status === 429) {
        return;
      }

      toast.error(message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-mono-white dark:bg-mono-black transition-colors duration-200 py-8 px-4">
      <div className="bg-mono-white dark:bg-mono-900 border-2 border-mono-300 dark:border-mono-800 rounded-card shadow-mono dark:shadow-mono-md p-8 max-w-md w-full">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-mono-black dark:text-mono-white tracking-tight">Socially</h1>
          <p className="text-mono-600 dark:text-mono-500 mt-2">We've sent a 6-digit OTP to your email address.</p>
          {email && <p className="text-sm text-mono-500 dark:text-mono-600 mt-1 font-medium">{email}</p>}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-input">
            <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* OTP Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* OTP Field */}
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-mono-black dark:text-mono-white mb-2">
              Enter OTP
            </label>
            <input
              type="text"
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full px-4 py-2.5 bg-mono-white dark:bg-mono-900 border-2 border-mono-300 dark:border-mono-700 rounded-input text-mono-black dark:text-mono-white placeholder-mono-500 focus:ring-2 focus:ring-mono-black dark:focus:ring-mono-white focus:border-mono-black dark:focus:border-mono-white transition-all duration-200 text-center text-2xl tracking-widest"
              placeholder="000000"
              maxLength={6}
              disabled={loading}
            />
            <p className="text-xs text-mono-500 dark:text-mono-600 mt-1">Please enter the 6-digit code</p>
          </div>

          {/* Verify Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-mono-black dark:bg-mono-white text-mono-white dark:text-mono-black hover:opacity-80 font-semibold py-2.5 px-4 rounded-btn transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        {/* Resend OTP */}
        <div className="mt-6 text-center">
          <p className="text-mono-600 dark:text-mono-500 text-sm">
            Didn't receive the code?{" "}
            <button
              onClick={handleResendOTP}
              disabled={resending}
              className="text-mono-black dark:text-mono-white hover:underline font-semibold disabled:opacity-50"
            >
              {resending ? "Resending..." : "Resend OTP"}
            </button>
          </p>
        </div>

        {/* Info */}
        <div className="mt-6 p-3 bg-mono-100 dark:bg-mono-800 border-2 border-mono-300 dark:border-mono-700 rounded-input">
          <p className="text-xs text-mono-600 dark:text-mono-400">
            The OTP will expire in 10 minutes. Check your spam folder if you don't see it.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
