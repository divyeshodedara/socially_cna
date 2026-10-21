import React from "react";

// Reusable card surface with consistent styling
const Card = ({ children, className = "" }) => {
  return (
    <div
      className={`bg-mono-white dark:bg-mono-900 border border-mono-200 dark:border-mono-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-5 ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
