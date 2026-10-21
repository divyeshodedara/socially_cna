import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/api";
import { useUser } from "../../hooks/useUser";
import { useFollow } from "../../hooks/useFollow";
import toast from "react-hot-toast";

const SuggestedUsersPage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { data: currentUser } = useUser(user?._id);
  const { follow, unfollow, isLoading: followLoading } = useFollow(user?._id);

  useEffect(() => {
    fetchSuggestedUsers();
  }, []);

  const fetchSuggestedUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get("/users/suggested-users");
      if (response.data.status === "success") {
        setSuggestedUsers(response.data.data.users || []);
      }
    } catch (error) {
      console.error("Failed to fetch suggested users:", error);
      toast.error("Failed to load suggestions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-mono-100 dark:hover:bg-mono-900 text-mono-600 dark:text-mono-400 hover:text-mono-black dark:hover:text-mono-white transition-all duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-mono-black dark:text-mono-white">Suggested for You</h1>
        {!loading && (
          <button
            onClick={fetchSuggestedUsers}
            className="ml-auto p-2 rounded-lg hover:bg-mono-100 dark:hover:bg-mono-900 text-mono-600 dark:text-mono-400 hover:text-mono-black dark:hover:text-mono-white transition-all duration-300 hover:rotate-180 transform"
            title="Refresh suggestions"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Users List */}
      <div className="bg-mono-white dark:bg-mono-900 rounded-2xl border border-mono-200 dark:border-mono-800 shadow-lg">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin text-mono-black dark:text-mono-white mx-auto mb-3" />
              <p className="text-mono-600 dark:text-mono-400">Loading suggestions...</p>
            </div>
          </div>
        ) : suggestedUsers.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-mono-600 dark:text-mono-400 text-lg mb-2">No suggestions available</p>
            <p className="text-sm text-mono-500">Check back later for new recommendations</p>
          </div>
        ) : (
          <div className="divide-y divide-mono-200 dark:divide-mono-800">
            {suggestedUsers.map((suggestedUser) => {
              const isFollowing = currentUser?.following?.some(
                (id) => id?.toString() === suggestedUser._id?.toString(),
              );
              return (
                <div key={suggestedUser._id} className="flex items-center justify-between p-4">
                  <Link to={`/profile/${suggestedUser._id}`} className="flex items-center space-x-4 group">
                    <img
                      src={suggestedUser.profilePicture || "https://via.placeholder.com/40"}
                      alt={suggestedUser.username}
                      className="w-12 h-12 rounded-full object-cover border-2 border-mono-200 dark:border-mono-700 group-hover:border-mono-black dark:group-hover:border-mono-white transition-all duration-200"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-md text-mono-black dark:text-mono-white group-hover:underline">
                        {suggestedUser.name || suggestedUser.username}
                      </p>
                      <p className="text-sm text-mono-500 dark:text-mono-400">@{suggestedUser.username}</p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isFollowing) {
                        unfollow(suggestedUser._id);
                      } else {
                        follow(suggestedUser._id);
                      }
                    }}
                    className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:transform-none disabled:cursor-not-allowed ${
                      // followingUsers.has(suggestedUser._id)
                      isFollowing
                        ? "bg-mono-200 dark:bg-mono-800 text-mono-600 dark:text-mono-300 hover:bg-mono-300 dark:hover:bg-mono-700"
                        : "bg-mono-black dark:bg-mono-white text-mono-white dark:text-mono-black hover:bg-mono-800 dark:hover:bg-mono-200"
                    }`}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuggestedUsersPage;
