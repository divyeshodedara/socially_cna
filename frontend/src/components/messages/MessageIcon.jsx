import { NavLink } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useSocket } from "../../context/SocketContext";

const MessageIcon = () => {
  const { unreadMessageCount } = useSocket();

  return (
    <NavLink
      to="/messages"
      className={({ isActive }) =>
        `p-2 rounded-btn hover:bg-mono-100 dark:hover:bg-mono-800 relative ${
          isActive
            ? "text-mono-black dark:text-mono-white bg-mono-100 dark:bg-mono-800"
            : "text-mono-500 dark:text-mono-400"
        }`
      }
      title="Messages"
    >
      <MessageCircle className="w-6 h-6" />
      {unreadMessageCount > 0 && (
        <span className="absolute top-0 right-0 min-w-[18px] h-[18px] flex items-center justify-center bg-blue-500 text-white text-xs font-bold rounded-full">
          {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
        </span>
      )}
    </NavLink>
  );
};

export default MessageIcon;
