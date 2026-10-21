// src/pages/NotFoundPage.jsx
import { Link } from "react-router-dom";

const NotFoundPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-mono-white dark:bg-mono-black">
    <div className="text-center">
      <h1 className="text-8xl font-bold text-mono-black dark:text-mono-white mb-4">404</h1>
      <p className="text-mono-600 dark:text-mono-500 mb-8">This page doesn't exist.</p>
      <Link
        to="/"
        className="bg-mono-black dark:bg-mono-white text-mono-white dark:text-mono-black px-6 py-3 rounded-btn font-semibold hover:opacity-80 transition-opacity"
      >
        Go home
      </Link>
    </div>
  </div>
);

export default NotFoundPage;
