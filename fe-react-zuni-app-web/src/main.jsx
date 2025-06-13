import "@ant-design/v5-patch-for-react-19";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppProvider } from "./contexts/app.context";
import { SocketProvider } from "./contexts/socket.context";
import Layout from "./components/layout";
import HomePage from "./pages/client/home";
import LoginPage from "./pages/client/auth/login";
import RegisterPage from "./pages/client/auth/register";
import ForgotPasswordPage from "./pages/client/auth/forgot.password";
import ResetPasswordPage from "./pages/client/auth/reset.password";
import ProtectedRoute from "./components/auth";
import ErrorPage from "./pages/client/error";
import FriendsPage from "./pages/client/friends";
import CloudPage from "./pages/client/cloud";
import ChatPage from "./pages/client/chat";
import SetupAvatarPage from "./pages/client/setup.avatar";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <SocketProvider>
          <Layout />
        </SocketProvider>
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <HomePage />,
        children: [
          {
            path: "chat/:id",
            element: <ChatPage />,
          },
        ],
      },
      {
        path: "friends",
        element: <FriendsPage />,
      },
      {
        path: "cloud",
        element: <CloudPage />,
      },
    ],
  },
  {
    path: "/login",
    element: (
      <ProtectedRoute>
        <LoginPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/register",
    element: (
      <ProtectedRoute>
        <RegisterPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/setupAvatar",
    element: (
      <ProtectedRoute>
        <SetupAvatarPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/forgotPassword",
    element: (
      <ProtectedRoute>
        <ForgotPasswordPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/resetPassword/:token",
    element: (
      <ProtectedRoute>
        <ResetPasswordPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <ErrorPage />,
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  </StrictMode>
);
