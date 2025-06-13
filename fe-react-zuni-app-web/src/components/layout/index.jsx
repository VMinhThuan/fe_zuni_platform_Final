import { Outlet } from "react-router-dom";
import Sidebar from "../sidebar";

const Layout = () => {
  return (
    <>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 bg-white">
          <Outlet />
        </div>
      </div>
    </>
  );
};

export default Layout;
