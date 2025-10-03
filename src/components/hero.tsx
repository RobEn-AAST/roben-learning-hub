import { RobenLogoSVG } from "./roben-logo";

export function Hero() {
  return (
  <div className="flex flex-col items-start gap-2 w-full max-w-3xl pt-8 pl-8">
      <h1 className="text-3xl lg:text-4xl font-extrabold text-blue-900 mb-2">Welcome to RobEn Learning Hub</h1>
      <div className="flex flex-col items-start">
        <span className="text-lg lg:text-xl font-semibold text-gray-800 mb-1">Control your future with the RobEn comprehensive learning management platform</span>
        <span className="text-lg lg:text-xl text-blue-600 font-medium"></span>
      </div>
    </div>
  );
}
