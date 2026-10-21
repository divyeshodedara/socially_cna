import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, ArrowLeft } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/api";
import toast from "react-hot-toast";

const EditProfilePage = () => {
  const { user, checkAuth } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    bio: "",
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  // Fetch user data with React Query
  const { data: userData, isLoading: loading } = useQuery({
    queryKey: ["user", "me"],
    queryFn: async () => {
      const response = await api.get("/users/me");
      if (response.data.status === "success") {
        return response.data.data.user;
      }
      throw new Error("Failed to load profile data");
    },
    staleTime: 60000, // Cache for 1 minute
  });

  // Update form when userData is loaded
  useEffect(() => {
    if (userData) {
      setFormData({
        username: userData.username || "",
        bio: userData.bio || "",
      });
      setPreviewUrl(userData.profilePicture || "");
    }
  }, [userData]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append("bio", formData.bio);

      // Only append profile picture if a new one was selected
      if (profilePicture) {
        formDataToSend.append("profilePicture", profilePicture);
      }

      const response = await api.post("/users/edit-profile", formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.status === "success") {
        toast.success(response.data.message || "Profile updated successfully!");

        // Invalidate relevant caches
        queryClient.invalidateQueries(["user", "me"]);
        queryClient.invalidateQueries(["user", user._id]);

        await checkAuth(); // Refresh user data in context
        navigate(`/profile/${user._id}`);
      }
    } catch (error) {
      const message = error.response?.data?.message || "Failed to update profile";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-mono-black dark:border-mono-white"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-btn hover:bg-mono-100 dark:hover:bg-mono-900 text-mono-600 dark:text-mono-400 hover:text-mono-black dark:hover:text-mono-white transition-all duration-200"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-mono-black dark:text-mono-white">Edit Profile</h1>
          <p className="text-sm text-mono-600 dark:text-mono-400 mt-1">Customize your public profile</p>
        </div>
      </div>

      <div className="bg-mono-white dark:bg-mono-900 rounded-card border border-mono-200 dark:border-mono-800 shadow-lg dark:shadow-2xl overflow-hidden">
        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Profile Picture Section */}
          <div className="bg-gradient-to-br from-mono-50 to-mono-100 dark:from-mono-900 dark:to-mono-950 p-8 border-b border-mono-200 dark:border-mono-800">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-mono-400 to-mono-600 dark:from-mono-600 dark:to-mono-400 rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                <img
                  src={previewUrl || "https://via.placeholder.com/150"}
                  alt="Profile Preview"
                  className="relative w-36 h-36 rounded-full object-cover border-4 border-mono-white dark:border-mono-900 shadow-xl"
                />
                <label
                  htmlFor="profilePicture"
                  className="absolute bottom-1 right-1 bg-mono-black dark:bg-mono-white text-mono-white dark:text-mono-black p-3 rounded-full cursor-pointer hover:scale-110 shadow-lg transition-all duration-200 group"
                >
                  <Camera className="w-5 h-5" />
                  <input
                    type="file"
                    id="profilePicture"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={submitting}
                  />
                </label>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-mono-700 dark:text-mono-300">Profile Picture</p>
                <p className="text-xs text-mono-500 dark:text-mono-500 mt-1">JPG, PNG or GIF. Max size 5MB</p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="p-8 space-y-8">
            {/* Username (Read-only) */}
            <div>
              <label className="block text-sm font-semibold text-mono-900 dark:text-mono-100 mb-2">Username</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.username}
                  disabled
                  className="w-full px-4 py-3 bg-mono-50 dark:bg-mono-950 border-2 border-mono-200 dark:border-mono-800 rounded-input text-mono-500 dark:text-mono-500 cursor-not-allowed font-medium"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="text-xs bg-mono-200 dark:bg-mono-800 px-2 py-1 rounded-md text-mono-600 dark:text-mono-400">
                    Fixed
                  </span>
                </div>
              </div>
              <p className="text-xs text-mono-500 dark:text-mono-500 mt-2 flex items-center gap-1">
                <span className="w-1 h-1 bg-mono-400 rounded-full"></span>
                Username is permanent and cannot be changed
              </p>
            </div>

            {/* Bio */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="bio" className="text-sm font-semibold text-mono-900 dark:text-mono-100">
                  Bio
                </label>
                <span
                  className={`text-xs font-medium transition-colors ${
                    formData.bio.length > 140 ? "text-red-500" : "text-mono-500 dark:text-mono-500"
                  }`}
                >
                  {formData.bio.length}/150
                </span>
              </div>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={5}
                maxLength={150}
                className="w-full px-4 py-3 bg-mono-white dark:bg-mono-900 border-2 border-mono-200 dark:border-mono-700 rounded-input resize-none text-mono-900 dark:text-mono-100 placeholder-mono-400 dark:placeholder-mono-500 focus:outline-none focus:ring-2 focus:ring-mono-black dark:focus:ring-mono-white focus:border-transparent transition-all duration-200"
                placeholder="Tell the world about yourself..."
                disabled={submitting}
              />
              <p className="text-xs text-mono-500 dark:text-mono-500 mt-2">
                Share your story, interests, or anything you'd like others to know
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-mono-50 dark:bg-mono-950 px-8 py-6 border-t border-mono-200 dark:border-mono-800 flex gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-mono-white dark:bg-mono-900 text-mono-700 dark:text-mono-300 font-semibold rounded-btn border-2 border-mono-200 dark:border-mono-800 hover:bg-mono-100 dark:hover:bg-mono-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-mono-black dark:bg-mono-white text-mono-white dark:text-mono-black font-semibold rounded-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-mono-white dark:border-mono-black border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfilePage;
