import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-mono-100 dark:bg-mono-950 p-4">
          <div className="bg-mono-white dark:bg-mono-900 border border-mono-300 dark:border-mono-800 rounded-lg p-8 max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-mono-black dark:text-mono-white mb-4">Oops! Something went wrong</h1>
            <p className="text-mono-600 dark:text-mono-400 mb-6">
              We're sorry for the inconvenience. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-mono-black dark:bg-mono-white text-mono-white dark:text-mono-black px-6 py-2 rounded-lg hover:opacity-80 transition-opacity"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
