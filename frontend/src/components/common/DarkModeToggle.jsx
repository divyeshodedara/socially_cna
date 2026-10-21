import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const DarkModeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  const handleClick = () => {
    toggleTheme();
  };

  return (
    <button
      onClick={handleClick}
      className="p-2 rounded-lg bg-mono-100 dark:bg-mono-800 hover:bg-mono-200 dark:hover:bg-mono-700 transition-all duration-200 group"
      aria-label="Toggle dark mode"
      title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDarkMode ? (
        <Sun className="w-5 h-5 text-mono-white group-hover:rotate-180 transition-transform duration-500" />
      ) : (
        <Moon className="w-5 h-5 text-mono-black group-hover:-rotate-12 transition-transform duration-300" />
      )}
    </button>
  );
};

export default DarkModeToggle;
