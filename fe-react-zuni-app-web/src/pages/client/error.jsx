import { Link } from "react-router-dom";
import { Button, Result } from "antd";

const ErrorPage = () => {
  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#e5effa] px-4">
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <Result
            status="404"
            title="404"
            subTitle="Trang bạn đang tìm kiếm không tồn tại."
            extra={
              <Button type="primary">
                <Link to="/">Quay lại</Link>
              </Button>
            }
          />
        </div>
      </div>
    </>
  );
};

export default ErrorPage;
