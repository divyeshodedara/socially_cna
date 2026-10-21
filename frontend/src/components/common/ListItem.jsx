import React from "react";
import { Link } from "react-router-dom";

// Lightweight list item used in sidebars or simple lists
const ListItem = ({ avatarSrc, title, subtitle, to, action }) => {
  return (
    <div className="flex items-center justify-between p-3 rounded-btn hover:bg-mono-50 dark:hover:bg-mono-800 transition-colors">
      <Link to={to || "#"} className="flex items-center gap-3 flex-1 min-w-0">
        <img
          src={avatarSrc || "https://via.placeholder.com/40"}
          alt={title}
          className="w-10 h-10 rounded-full object-cover border-2 border-mono-200 dark:border-mono-700"
        />
        <div className="min-w-0">
          <div className="font-semibold text-sm text-mono-black dark:text-mono-white truncate">{title}</div>
          {subtitle && <div className="text-xs text-mono-600 dark:text-mono-500 truncate">{subtitle}</div>}
        </div>
      </Link>
      {action && <div className="ml-2">{action}</div>}
    </div>
  );
};

export default ListItem;
