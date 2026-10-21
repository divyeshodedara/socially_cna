import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

const Layout = () => {
  return (
    <div className="min-h-screen bg-mono-white dark:bg-mono-black transition-colors duration-200">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="hidden lg:block lg:col-span-3">
            <Sidebar />
          </aside>
          <main className="lg:col-span-9">
            <Outlet />
          </main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Layout;
