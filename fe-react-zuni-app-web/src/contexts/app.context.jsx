import { createContext, useContext, useEffect, useState } from "react";
import { LoadingOutlined } from "@ant-design/icons";
import { message, notification, Spin } from "antd";
import { fetchAccountApi } from "../services/api";

const CurrentAppContext = createContext();

export const AppProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();
  const [notificationApi, contextNotifiHolder] = notification.useNotification();

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const accessToken = localStorage.getItem("accessToken");

        if (!accessToken) {
          setIsAppLoading(false);
          return;
        }

        const res = await fetchAccountApi();

        if (res.data) {
          setUser(res.data.user);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("accessToken");
        }
      } catch (error) {
        console.log("error: ", error);
        localStorage.removeItem("accessToken");
      }
      setIsAppLoading(false);
    };

    fetchAccount();
  }, []);

  return (
    <>
      {contextHolder}
      {contextNotifiHolder}

      {isAppLoading ? (
        <>
          <h1 className="text-5xl text-center font-bold text-blue-600 mt-16 mb-2">
            Zuni
          </h1>
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 30 }} spin />}
            />
            <p className="text-center text-[12px] text-gray-700 mt-4">
              Đang tải dữ liệu...
            </p>
          </div>
        </>
      ) : null}

      <CurrentAppContext.Provider
        value={{
          isAppLoading,
          setIsAppLoading,
          isAuthenticated,
          setIsAuthenticated,
          user,
          setUser,
          messageApi,
          notificationApi,
        }}
      >
        {!isAppLoading && children}
      </CurrentAppContext.Provider>
    </>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCurrentApp = () => {
  const currentAppContext = useContext(CurrentAppContext);

  if (!currentAppContext) {
    throw new Error(
      "useCurrentApp must be used within <CurrentAppContext.Provider>"
    );
  }

  return currentAppContext;
};
