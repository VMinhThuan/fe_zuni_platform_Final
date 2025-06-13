import { FaMoon } from "react-icons/fa";

const SlideView = ({ slide, direction, onPrev, onNext, total, current }) => {
  return (
    <div className="w-full h-full relative overflow-hidden bg-white">
      {/* Slide nội dung có animation */}
      <div
        className={`absolute top-0 left-0 w-full h-full px-4 flex flex-col items-center justify-center
        ${
          direction === "right"
            ? "animate-slide-in-right"
            : "animate-slide-in-left"
        }`}
      >
        <h1 className="text-2xl font-semibold text-[#1f1f1f] text-center select-none">
          {slide.title}
        </h1>
        <p className="text-sm text-gray-600 max-w-lg mt-2 text-center select-none">
          {slide.description}
        </p>
        <div className="relative mt-6">
          <img
            src={slide.image}
            alt="slide preview"
            className="mx-auto w-[360px] rounded-lg shadow"
          />
          <div className="absolute top-4 right-4 bg-gray-700 text-white p-2 rounded-full shadow">
            <FaMoon />
          </div>
        </div>
        <h2 className="text-blue-600 font-semibold mt-6 text-base select-none">
          {slide.highlight}
        </h2>
        <p className="text-sm text-gray-700 mt-1 text-center select-none">
          {slide.subDescription}
        </p>
        <button className="mt-3 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded cursor-pointer">
          Thử ngay
        </button>
      </div>

      <div
        className="absolute left-4 top-1/2 -translate-y-1/2 cursor-pointer z-10"
        onClick={onPrev}
      >
        <span className="text-2xl text-blue-600">❮</span>
      </div>
      <div
        className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer z-10"
        onClick={onNext}
      >
        <span className="text-2xl text-blue-600">❯</span>
      </div>

      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex justify-center items-center gap-4 z-10">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === current ? "bg-blue-600 scale-110" : "bg-gray-300"
            }`}
          ></span>
        ))}
      </div>
    </div>
  );
};

export default SlideView;
