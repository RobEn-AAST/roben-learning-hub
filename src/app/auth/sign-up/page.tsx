
import { SignUpForm } from "@/components/sign-up-form";
import { RobenLogo } from "@/components/roben-logo";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-white">
      <div className="w-full max-w-sm shadow-lg rounded-lg p-8 bg-white border border-blue-100">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-2">
            <RobenLogo />
          </div>
          <span className="text-2xl font-bold text-blue-900">RobEn Learning Hub</span>
        </div>
        <SignUpForm />
      </div>
    </div>
  );
}
