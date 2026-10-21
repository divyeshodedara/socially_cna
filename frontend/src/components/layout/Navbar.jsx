import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, PlusSquare, User, Search, Loader2, X, Plus } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import CreatePostModal from "../posts/CreatePostModal";
import DarkModeToggle from "../common/DarkModeToggle";
import NotificationBell from "../notifications/NotificationBell";
import MessageIcon from "../messages/MessageIcon";
import api from "../../api/api";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const inputRef = useRef(null);


  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await api.get(`/users/search?query=${encodeURIComponent(searchQuery)}`);
        if (response.data.status === "success") {
          setSearchResults(response.data.data.users);
          setShowResults(true);
        }
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const handleUserClick = (userId) => {
    setSearchQuery("");
    setShowResults(false);
    setSearchFocused(false);
    navigate(`/profile/${userId}`);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setShowResults(false);
    inputRef.current?.focus();
  };

  return (
    <nav className="bg-mono-white dark:bg-mono-black border-b border-mono-200 dark:border-mono-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <NavLink to="/" className="text-2xl font-bold text-mono-black dark:text-mono-white">
            <span className="tracking-tight">
              Socially
              <span className="text-blue-500 text-[28px] ml-0.5">.</span>
              <span className="text-green-500 text-[28px]">.</span>
              <span className="text-pink-500 text-[28px]">.</span>
              <span className="text-blue-500 text-3xl drop-shadow-[0_0_6px_#3b82f6]">.</span>
            </span>
          </NavLink>
          {/* Search Bar */}
          <div className="flex flex-1 max-w-sm mx-4 lg:mx-0" ref={searchRef}>
            <div className="relative w-full">
              {/* Search icon */}
              <Search
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${
                  searchFocused ? "text-mono-black dark:text-mono-white" : "text-mono-400 dark:text-mono-500"
                }`}
              />

              <input
                ref={inputRef}
                type="text"
                placeholder="Search users…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  setSearchFocused(true);
                  if (searchQuery) setShowResults(true);
                }}
                className={`w-full pl-10 pr-9 py-2 rounded-full text-sm font-medium transition-all duration-200 outline-none
                  text-mono-black dark:text-mono-white
                  placeholder-mono-400 dark:placeholder-mono-600
                  ${
                    searchFocused
                      ? "bg-mono-100 dark:bg-mono-900 ring-2 ring-mono-300 dark:ring-mono-700 border border-transparent"
                      : "bg-mono-100 dark:bg-mono-900 border border-mono-200 dark:border-mono-800 hover:border-mono-300 dark:hover:border-mono-700"
                  }`}
              />

              {/* Clear button */}
              <AnimatePresence>
                {searchQuery && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.15 }}
                    onClick={clearSearch}
                    className="absolute right-3 top-0 bottom-0 my-auto flex items-center justify-center w-5 h-5 text-mono-400 hover:text-mono-700 dark:hover:text-mono-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Dropdown */}
              <AnimatePresence>
                {showResults && searchQuery && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 w-full bg-mono-white dark:bg-mono-900 border border-mono-200 dark:border-mono-800 rounded-2xl shadow-xl overflow-hidden z-50"
                  >
                    {isSearching ? (
                      <div className="p-5 flex justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-mono-400" />
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-5 text-center">
                        <p className="text-sm text-mono-500 dark:text-mono-400">No users found</p>
                      </div>
                    ) : (
                      <div className="py-1.5">
                        {searchResults.map((searchUser, index) => (
                          <motion.button
                            key={searchUser._id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.04 }}
                            onClick={() => handleUserClick(searchUser._id)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-mono-50 dark:hover:bg-mono-800 transition-colors duration-150 group"
                          >
                            <div className="relative shrink-0">
                              <img
                                src={searchUser.profilePicture || "https://via.placeholder.com/40"}
                                alt={searchUser.username}
                                className="w-8 h-8 rounded-full object-cover ring-1 ring-mono-200 dark:ring-mono-700"
                              />
                            </div>
                            <div className="text-left min-w-0">
                              <p className="font-semibold text-sm text-mono-900 dark:text-mono-100 truncate group-hover:text-mono-black dark:group-hover:text-mono-white">
                                {searchUser.username}
                              </p>
                              {searchUser.bio && (
                                <p className="text-xs text-mono-500 dark:text-mono-500 truncate mt-0.5">
                                  {searchUser.bio}
                                </p>
                              )}
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Action Icons */}
          <div className="hidden lg:flex items-center space-x-5">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-mono-black dark:bg-mono-white text-mono-white dark:text-mono-black hover:opacity-80 transition-all duration-200 font-semibold text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:block">Create</span>
            </button>
            <DarkModeToggle />

            <NavLink
              to="/"
              className={({ isActive }) =>
                `p-2 rounded-lg hover:bg-mono-100 dark:hover:bg-mono-800 ${
                  isActive
                    ? "text-mono-black dark:text-mono-white bg-mono-100 dark:bg-mono-800"
                    : "text-mono-500 dark:text-mono-400"
                }`
              }
            >
              <Home className="w-6 h-6" />
            </NavLink>

            <MessageIcon />
            <NotificationBell />
            <NavLink
              to={`/profile/${user?._id}`}
              className={({ isActive }) =>
                `p-2 rounded-lg hover:bg-mono-100 dark:hover:bg-mono-800 ${
                  isActive
                    ? "text-mono-black dark:text-mono-white bg-mono-100 dark:bg-mono-800"
                    : "text-mono-500 dark:text-mono-400"
                }`
              }
            >
              <img
                src={user?.profilePicture || "https://via.placeholder.com/40"}
                alt="profile"
                className="w-8 h-8 rounded-full object-cover ring-2 ring-mono-200 dark:ring-mono-700"
              />
            </NavLink>
          </div>
          <div className="flex lg:hidden items-center">
            <DarkModeToggle />
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </nav>
  );
};

export default Navbar;
