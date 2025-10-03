import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { Hero } from "@/components/hero";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ConnectSupabaseSteps } from "@/components/tutorial/connect-supabase-steps";
import { SignUpUserSteps } from "@/components/tutorial/sign-up-user-steps";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
// import { RobenLogo } from "@/components/roben-logo";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        {/* Header Bar */}
  <nav className="w-full flex justify-center h-16 shadow-md bg-gradient-to-r from-blue-800 via-blue-500 to-purple-600">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex items-center h-10">
              <Link href="/" className="flex items-center gap-2 group h-full">
                <span className="flex items-center gap-2 font-bold text-lg text-white bg-transparent border-none shadow-none cursor-pointer select-none focus:outline-none h-full">
                  <span className="flex items-center h-8 w-8">
                    <img src="/assets/favicon.png" alt="favicon" className="h-8 w-8 object-contain" />
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="font-extrabold text-2xl text-white tracking-wide">RobEn</span>
                    <span className="font-semibold text-base text-white tracking-wide">Learning Hub</span>
                  </span>
                </span>
              </Link>
            </div>
            {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
          </div>
        </nav>
        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
          <Hero />
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
          <p>
            Powered by{" "}
            <a
              href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
              target="_blank"
              className="font-bold hover:underline"
              rel="noreferrer"
            >
              Supabase
            </a>
          </p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
