import { RobenLogoSVG } from "./roben-logo";

export function Hero() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-[60vh] max-w-4xl mx-auto" style={{ minHeight: '400px' }}>
      <h1 className="text-3xl lg:text-4xl font-extrabold text-white mb-2 text-center">
        Welcome to <span className="text-yellow-200">RobEn</span> Learning Hub
      </h1>
      <div className="flex flex-col items-center">
        <span className="text-lg lg:text-xl font-semibold text-white mb-1 text-center">
          Control your future with the <span className="text-yellow-200">RobEn</span> comprehensive learning management platform
        </span>
      </div>
    </div>
  );
}
