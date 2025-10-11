import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthProps) {
  const getStrength = (password: string): { score: number; text: string; color: string } => {
    if (!password) return { score: 0, text: "", color: "" };
    
    let score = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };
    
    score = Object.values(checks).filter(Boolean).length;
    
    if (score < 2) return { score, text: "Too weak", color: "password-strength-weak" };
    if (score < 4) return { score, text: "Fair", color: "password-strength-medium" };
    if (score < 5) return { score, text: "Good", color: "password-strength-medium" };
    return { score, text: "Strong", color: "password-strength-strong" };
  };

  const strength = getStrength(password);
  const percentage = (strength.score / 5) * 100;

  if (!password) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Password strength</span>
        {strength.text && (
          <span className={cn(
            "font-medium",
            strength.score < 2 ? "text-red-600" : 
            strength.score < 4 ? "text-yellow-600" : 
            "text-green-600"
          )}>
            {strength.text}
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300 rounded-full",
            strength.color
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}