import { Button, Result, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useCurrentApp } from "../../contexts/app.context";
import { Link, Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = (props) => {
  const { isAuthenticated, user, isAppLoading } = useCurrentApp();
  const location = useLocation();

  const publicPaths = ["/login", "/register", "/forgotPassword"];
  const justRegistered = localStorage.getItem("justRegistered") === "true";

  const isResetPasswordPage = location.pathname.startsWith("/resetPassword/");

  if (isAppLoading) {
    return (
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      </div>
    );
  }

  if (justRegistered && location.pathname !== "/setupAvatar") {
    return <Navigate to="/setupAvatar" replace />;
  }

  if (location.pathname === "/setupAvatar") {
    if (justRegistered) {
      return <>{props.children}</>;
    }
    return <Navigate to="/login" replace />;
  }

  if (
    !isAuthenticated &&
    !publicPaths.includes(location.pathname) &&
    !isResetPasswordPage
  ) {
    return <Navigate to="/login" replace />;
  }

  if (
    isAuthenticated &&
    (publicPaths.includes(location.pathname) || isResetPasswordPage)
  ) {
    return <Navigate to="/" replace />;
  }

  const isAdminRoute = location.pathname.includes("admin");
  if (isAuthenticated && isAdminRoute && user?.role === "USER") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#e5effa] px-4">
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <Result
            status="403"
            title="403"
            subTitle="Bạn không có quyền truy cập vào trang này."
            extra={
              <Button type="primary">
                <Link to="/">Quay lại trang chủ</Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (
    (isAuthenticated &&
      !publicPaths.includes(location.pathname) &&
      !isResetPasswordPage) ||
    (!isAuthenticated &&
      (publicPaths.includes(location.pathname) || isResetPasswordPage))
  ) {
    return <>{props.children}</>;
  }

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
      <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
    </div>
  );
};

export default ProtectedRoute;
