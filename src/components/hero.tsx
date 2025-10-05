import { RobenLogoSVG } from "./roben-logo";

export function Hero() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-[60vh] max-w-4xl mx-auto" style={{ minHeight: '400px' }}>
      <h1 className="text-3xl lg:text-4xl font-extrabold text-black mb-2 text-center">
        Welcome to <span className="text-purple-600">RobEn</span> Learning Hub
      </h1>
      <div className="flex flex-col items-center">
        <span className="text-lg lg:text-xl font-semibold text-black mb-1 text-center">
          Control your future with the <span className="text-purple-600">RobEn</span> comprehensive learning management platform
        </span>
      </div>
    </div>
  );
}
