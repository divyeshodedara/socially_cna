import { NavLink, useNavigate } from "react-router-dom";
import { Home, Search, Plus, MessageCircle, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";
import CreatePostModal from "../posts/CreatePostModal";

const BottomNav = () => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-mono-white dark:bg-mono-black border-t border-mono-200 dark:border-mono-800 flex items-center justify-around px-2 py-2 lg:hidden">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center p-2 rounded-lg ${isActive ? "text-mono-black dark:text-mono-white" : "text-mono-400 dark:text-mono-600"}`
          }
        >
          <Home className="w-6 h-6" />
        </NavLink>

        <NavLink
          to="/suggested-users"
          className={({ isActive }) =>
            `flex flex-col items-center p-2 rounded-lg ${isActive ? "text-mono-black dark:text-mono-white" : "text-mono-400 dark:text-mono-600"}`
          }
        >
          <Search className="w-6 h-6" />
        </NavLink>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-mono-black dark:bg-mono-white text-mono-white dark:text-mono-black"
        >
          <Plus className="w-6 h-6" />
        </button>

        <NavLink
          to="/messages"
          className={({ isActive }) =>
            `flex flex-col items-center p-2 rounded-lg ${isActive ? "text-mono-black dark:text-mono-white" : "text-mono-400 dark:text-mono-600"}`
          }
        >
          <MessageCircle className="w-6 h-6" />
        </NavLink>

        <NavLink
          to={`/profile/${user?._id}`}
          className={({ isActive }) =>
            `flex flex-col items-center p-2 rounded-lg ${isActive ? "text-mono-black dark:text-mono-white" : "text-mono-400 dark:text-mono-600"}`
          }
        >
          <img src={user?.profilePicture} alt="profile" className="w-7 h-7 rounded-full object-cover" />
        </NavLink>
      </nav>

      <CreatePostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default BottomNav;
