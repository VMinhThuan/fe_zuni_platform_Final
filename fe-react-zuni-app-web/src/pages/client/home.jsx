import { useState, useEffect, useRef } from "react";
import { useParams, Outlet } from "react-router-dom";
import SlideView from "../../components/slide";
import SidebarChatList from "../../components/sidebarChatList";

const chatList = [
  {
    id: "172ecf8c-137f-41d8-8fb3-257616a78572",
    name: "Cloud của tôi",
    lastMsg: "Bạn: 📎 tailieu_cnm.docx",
    time: "2 ngày",
    avatar:
      "https://res-zalo.zadn.vn/upload/media/2021/6/4/2_1622800570007_369788.jpg",
    unreadCount: 0,
  },
  {
    id: "a1c0ed80-3dea-4cff-8905-22c56e3b4697",
    name: "Nhựt Tân",
    lastMsg: "Chỉnh sửa logic giúp tôi nhé",
    time: "2 giờ",
    avatar:
      "https://s120-ava-talk.zadn.vn/2/3/c/a/6/120/d98ec4366eef8b26c120127cfea0a7bf.jpg",
    unreadCount: 5,
  },
];

const slides = [
  {
    title: "Chào mừng đến với Zuni PC!",
    description:
      "Khám phá những tiện ích hỗ trợ làm việc và trò chuyện cùng người thân, bạn bè được tối ưu hoá cho máy tính của bạn.",
    image:
      "https://chat.zalo.me/assets/inapp-welcome-screen-06-darkmode.336078e876ae12bf42474586745397f0.png",
    highlight: "Giao diện Dark Mode",
    subDescription:
      "Thư giãn và bảo vệ mắt với chế độ giao diện tối mới trên Zuni PC",
  },
  {
    title: "Chào mừng đến với Zuni PC!",
    description:
      "Khám phá những tiện ích hỗ trợ làm việc và trò chuyện cùng người thân, bạn bè được tối ưu hoá cho máy tính của bạn.",
    image:
      "https://chat.zalo.me/assets/zbiz_onboard_vi_3x.62514921c8505730d07aff3fa8c4e9c3.png",
    highlight: "Nhắn tin nhiều hơn, soạn thảo ít hơn",
    subDescription:
      "Sử dụng Tin Nhắn Nhanh để lưu sẵn các tin nhắn thường dùng và gửi nhanh trong hội thoại bất kỳ.",
  },
  {
    title: "Chào mừng đến với Zuni PC!",
    description:
      "Khám phá những tiện ích hỗ trợ làm việc và trò chuyện cùng người thân, bạn bè được tối ưu hoá cho máy tính của bạn.",
    image:
      "https://chat.zalo.me/assets/quick-message-onboard.3950179c175f636e91e3169b65d1b3e2.png",
    highlight: "Trải nghiệm xuyên suốt",
    subDescription:
      "Kết nối và giải quyết công việc trên mọi thiết bị với dữ liệu luôn được đồng bộ",
  },
  {
    title: "Chào mừng đến với Zuni PC!",
    description:
      "Khám phá những tiện ích hỗ trợ làm việc và trò chuyện cùng người thân, bạn bè được tối ưu hoá cho máy tính của bạn.",
    image:
      "https://chat.zalo.me/assets/inapp-welcome-screen-04.1e316ea11f2bfc688dd4edadb29b9750.png",
    highlight: "Gửi File nặng?",
    subDescription: 'Đã có Zuni PC "xử" hết',
  },
  {
    title: "Chào mừng đến với Zuni PC!",
    description:
      "Khám phá những tiện ích hỗ trợ làm việc và trò chuyện cùng người thân, bạn bè được tối ưu hoá cho máy tính của bạn.",
    image:
      "https://chat.zalo.me/assets/inapp-welcome-screen-03.ba238595e7a8186393b3f47805a025eb.png",
    highlight: "Kinh doanh hiệu quả với zBusiness Pro",
    subDescription:
      "Bán hàng chuyên nghiệp với Nhãn Business và Bộ công cụ kinh doanh, mở khóa tiềm năng tiếp cận khách hàng trên Zuni",
  },
];

const HomePage = () => {
  const { id } = useParams();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideDirection, setSlideDirection] = useState("right");
  const slideIntervalRef = useRef(null);

  const startAutoSlide = () => {
    clearInterval(slideIntervalRef.current);
    slideIntervalRef.current = setInterval(() => {
      setSlideDirection("right");
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
  };

  const handleNextSlide = () => {
    setSlideDirection("right");
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    startAutoSlide();
  };

  const handlePrevSlide = () => {
    setSlideDirection("left");
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    startAutoSlide();
  };

  useEffect(() => {
    startAutoSlide();
    return () => clearInterval(slideIntervalRef.current);
  }, []);

  return (
    <div className="flex h-screen w-full">
      <SidebarChatList chatList={chatList} />

      <div className="flex-1 h-full overflow-hidden relative">
        {id ? (
          <Outlet />
        ) : (
          <SlideView
            key={currentSlide}
            slide={slides[currentSlide]}
            direction={slideDirection}
            onNext={handleNextSlide}
            onPrev={handlePrevSlide}
            total={slides.length}
            current={currentSlide}
          />
        )}
      </div>
    </div>
  );
};

export default HomePage;
