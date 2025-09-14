import { RobenLogoSVG } from "./roben-logo";

export function Hero() {
  return (
    <div className="flex flex-col gap-16 items-center">
      <div className="flex gap-8 justify-center items-center">
        <RobenLogoSVG />
      </div>
      <h1 className="sr-only">Roben Learning Platform</h1>
      <p className="text-3xl lg:text-4xl !leading-tight mx-auto max-w-xl text-center">
        Welcome to{" "}
        <span className="font-bold text-blue-600">
          Roben Learning
        </span>
        <br />
        <span className="text-2xl lg:text-3xl text-gray-600">
          Your comprehensive learning management platform
        </span>
      </p>
      <div className="w-full p-[1px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent my-8" />
    </div>
  );
}
