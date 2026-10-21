import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useUser } from "../../hooks/useUser";
import { useSuggestedUsers } from "../../hooks/useSuggestedUsers";
import { useFollow } from "../../hooks/useFollow";
import { usePosts } from "../../hooks/usePosts";

import { useState, useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";

const Sidebar = () => {
  const { user: authUser } = useAuth();
  const [visibleCount, setVisibleCount] = useState(2);
  const suggestedCardRef = useRef(null);

  const { data: fetchedUser } = useUser(authUser?._id);
  const { data: posts = [] } = usePosts(authUser?._id);
  const { data: suggestedUsers = [], isLoading } = useSuggestedUsers();
  const { follow, unfollow, isLoading: followLoading } = useFollow(authUser?._id);

  const user = fetchedUser || authUser;

  useEffect(() => {
    const calculateVisibleCount = () => {
      if (!suggestedCardRef.current) return;

      const cardRect = suggestedCardRef.current.getBoundingClientRect();
      const availableHeight = window.innerHeight - cardRect.top;
      // header(~40px) + padding(~40px) + see all button(~48px) + bottom margin(~20px)
      const overhead = 148;
      const userRowHeight = 56; // avatar(40px) + gap(16px)

      const fittable = Math.floor((availableHeight - overhead) / userRowHeight);
      setVisibleCount(Math.max(2, fittable));
    };

    calculateVisibleCount();
    window.addEventListener("resize", calculateVisibleCount);
    return () => window.removeEventListener("resize", calculateVisibleCount);
  }, [suggestedUsers.length]);

  return (
    <div className="sticky top-20 w-full space-y-5">
      {/* Current User Card */}
      <div className="bg-mono-white dark:bg-mono-900 border border-mono-200 dark:border-mono-800 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 group">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            <img
              src={
                user?.profilePicture ||
                "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRU0a0iDtUPUzs0GFM6DSuovK0uOE4-Sc40Pg&s"
              }
              alt={user?.username}
              className="w-24 h-24 rounded-full object-cover border-4 border-mono-200 dark:border-mono-700 shadow-lg"
            />
          </div>
          <Link to={`/profile/${user?._id}`} className="text-xl font-bold text-mono-black dark:text-mono-white">
            {user?.name || user?.username}
          </Link>
          <p className="text-sm text-mono-500 dark:text-mono-400">@{user?.username}</p>
          <p className="text-sm text-mono-600 dark:text-mono-500 mt-2 px-4">{user?.bio || "No bio yet"}</p>
        </div>

        <div className="mt-5 pt-5 border-t border-mono-200 dark:border-mono-800">
          <div className="flex justify-around text-center text-sm text-mono-600 dark:text-mono-500 mb-4">
            <div>
              <div className="font-bold text-lg text-mono-black dark:text-mono-white">
                {/* {(user?.posts?.length || 0).toLocaleString()} */}
                {(posts.length || 0).toLocaleString()}
              </div>
              <div className="text-xs font-medium">Posts</div>
            </div>
            <div>
              <div className="font-bold text-lg text-mono-black dark:text-mono-white">
                {(user?.followers?.length || 0).toLocaleString()}
              </div>
              <div className="text-xs font-medium">Followers</div>
            </div>
            <div>
              <div className="font-bold text-lg text-mono-black dark:text-mono-white">
                {(user?.following?.length || 0).toLocaleString()}
              </div>
              <div className="text-xs font-medium">Following</div>
            </div>
          </div>

          <Link
            to="/edit-profile"
            className="block w-full text-center text-sm font-semibold py-2 rounded-lg transition-all duration-200 hover:scale-105 border border-mono-300 dark:border-mono-700 hover:bg-mono-100 dark:hover:bg-mono-800 text-mono-black dark:text-mono-white"
          >
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Suggested Users Card */}
      <div
        ref={suggestedCardRef}
        className="bg-mono-white dark:bg-mono-900 rounded-2xl border border-mono-200 dark:border-mono-800 shadow-lg p-5"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-mono-500 dark:text-mono-400 text-sm tracking-widest">SUGGESTED</h3>
        </div>

        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-mono-black dark:border-mono-white mx-auto"></div>
          </div>
        ) : suggestedUsers.length === 0 ? (
          <p className="text-sm text-mono-600 dark:text-mono-500 text-center py-4">No suggestions available</p>
        ) : (
          <div className="space-y-4">
            {suggestedUsers.slice(0, visibleCount).map((suggestedUser) => {
              // ADD THIS LINE HERE
              const isFollowing = user?.following?.some((id) => id?.toString() === suggestedUser._id?.toString());

              return (
                <div key={suggestedUser._id} className="flex items-center justify-between">
                  <Link to={`/profile/${suggestedUser._id}`} className="flex items-center space-x-3 group">
                    <img
                      src={suggestedUser.profilePicture || "https://via.placeholder.com/40"}
                      alt={suggestedUser.username}
                      className="w-10 h-10 rounded-full object-cover border-2 border-mono-200 dark:border-mono-700 group-hover:border-mono-black dark:group-hover:border-mono-white transition-all duration-200"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-mono-black dark:text-mono-white group-hover:underline">
                        {suggestedUser.name || suggestedUser.username}
                      </p>
                      <p className="text-xs text-mono-500 dark:text-mono-400">@{suggestedUser.username}</p>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      isFollowing ? unfollow(suggestedUser._id) : follow(suggestedUser._id);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
                      isFollowing
                        ? "bg-mono-800 text-white border border-mono-700"
                        : "bg-white text-black border border-mono-300 hover:bg-mono-100"
                    }`}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {suggestedUsers.length > visibleCount && (
          <Link
            to="/suggested-users"
            className="block text-center mt-4 text-sm text-mono-black dark:text-mono-white hover:bg-mono-100 dark:hover:bg-mono-800 font-semibold transition-all duration-200 py-2 rounded-lg border border-mono-200 dark:border-mono-700"
          >
            See All
          </Link>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
