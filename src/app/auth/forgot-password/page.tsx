import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function Page() {
  return (
    <main className="min-h-screen flex flex-col items-center relative overflow-hidden">
      <img
        src="/assets/bg3.png"
        alt="Background"
        className="fixed inset-0 w-full h-full object-cover object-center z-0"
        style={{ pointerEvents: 'none', minWidth: '100vw', minHeight: '100vh' }}
      />
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 relative z-10">
        <div className="w-full max-w-sm bg-white/90 shadow-lg rounded-lg p-8 border border-blue-100">
          <ForgotPasswordForm />
        </div>
      </div>
    </main>
  );
}
