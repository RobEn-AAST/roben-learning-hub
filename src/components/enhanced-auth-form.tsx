"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { PasswordStrengthIndicator } from "./password-strength-indicator";

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

interface EnhancedAuthFormProps {
  mode: 'login' | 'signup';
  onModeChange: (mode: 'login' | 'signup') => void;
  className?: string;
}

export function EnhancedAuthForm({ mode, onModeChange, className }: EnhancedAuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  
  const router = useRouter();

  // Clear form when switching modes
  useEffect(() => {
    setError(null);
    setPassword("");
    setConfirmPassword("");
    if (mode === 'login') {
      setFirstName("");
      setLastName("");
    }
  }, [mode]);

  // Password validation
  useEffect(() => {
    if (mode === 'signup') {
      setPasswordValidation({
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      });
      
      if (confirmPassword) {
        setPasswordsMatch(password === confirmPassword);
      }
    }
  }, [password, confirmPassword, mode]);

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);
  const isValidName = (name: string) => name.trim().length >= 2 && name.trim().length <= 50;
  const isFormValid = mode === 'login' 
    ? email && password 
    : email && password && confirmPassword && isValidName(firstName) && isValidName(lastName) && isPasswordValid && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (mode === 'signup') {
      if (!isPasswordValid) {
        setError("Please ensure your password meets all requirements");
        setIsLoading(false);
        return;
      }
      
      if (!passwordsMatch) {
        setError("Passwords do not match");
        setIsLoading(false);
        return;
      }
    }

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Check if user needs to complete profile
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
          
          if (!profile || !profile.full_name || profile.full_name.trim() === '') {
            router.push('/complete-profile');
          } else {
            router.push("/protected");
          }
        } else {
          router.push("/protected");
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm`,
            data: {
              first_name: firstName,
              last_name: lastName,
              full_name: `${firstName} ${lastName}`.trim(),
            },
          },
        });
        
        if (error) throw error;
        
        // If user is created and confirmed immediately (no email confirmation required)
        if (data.user && data.user.email_confirmed_at) {
          // Create/update profile with name information
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              full_name: `${firstName} ${lastName}`.trim(),
              email: email,
              updated_at: new Date().toISOString(),
            });
          
          if (profileError) {
            console.error('Profile creation error:', profileError);
          }
        }
        
        router.push("/auth/sign-up-success");
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const ValidationItem = ({ isValid, text }: { isValid: boolean; text: string }) => (
    <div className={cn(
      "flex items-center gap-2 text-sm transition-colors duration-200",
      isValid ? "text-green-600" : "text-gray-500"
    )}>
      {isValid ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <XCircle className="w-4 h-4" />
      )}
      <span>{text}</span>
    </div>
  );

  return (
    <div className={cn("w-full", className)}>
      {/* Mode Toggle */}
      <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => onModeChange('login')}
          className={cn(
            "auth-tab-transition flex-1 py-3 px-4 rounded-md font-medium text-sm",
            mode === 'login'
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          Log In
        </button>
        <button
          type="button"
          onClick={() => onModeChange('signup')}
          className={cn(
            "auth-tab-transition flex-1 py-3 px-4 rounded-md font-medium text-sm",
            mode === 'signup'
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          Sign Up
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
          </CardTitle>
          <CardDescription>
            {mode === 'login' 
              ? 'Enter your credentials to access your account' 
              : 'Fill in your information to create a new account'}
          </CardDescription>
        </CardHeader>
        <CardContent>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name Fields (Signup only) */}
        {mode === 'signup' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                First Name
              </Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Enter your first name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="auth-input h-12 px-4 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                minLength={2}
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                Last Name
              </Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Enter your last name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="auth-input h-12 px-4 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                minLength={2}
                maxLength={50}
              />
            </div>
          </div>
        )}

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input h-12 px-4 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-gray-700">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={() => setIsPasswordFocused(false)}
              className="auth-input h-12 px-4 pr-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          
          {/* Password Strength Indicator for Signup */}
          {mode === 'signup' && password && (
            <PasswordStrengthIndicator password={password} />
          )}
          
          {mode === 'login' && (
            <div className="text-right">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          )}
        </div>

        {/* Password Validation (Signup only) */}
        {mode === 'signup' && isPasswordFocused && password && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 border">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <AlertCircle className="w-4 h-4" />
              Password Requirements
            </div>
            <ValidationItem isValid={passwordValidation.minLength} text="At least 8 characters" />
            <ValidationItem isValid={passwordValidation.hasUppercase} text="At least one uppercase letter" />
            <ValidationItem isValid={passwordValidation.hasLowercase} text="At least one lowercase letter" />
            <ValidationItem isValid={passwordValidation.hasNumber} text="At least one number" />
            <ValidationItem isValid={passwordValidation.hasSpecialChar} text="At least one special character" />
          </div>
        )}

        {/* Confirm Password Field (Signup only) */}
        {mode === 'signup' && (
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={cn(
                  "auth-input h-12 px-4 pr-12",
                  confirmPassword && !passwordsMatch
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {confirmPassword && (
              <p className={cn(
                "text-sm flex items-center gap-1 transition-all duration-200",
                passwordsMatch ? "text-green-600" : "text-red-600"
              )}>
                {passwordsMatch ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                {passwordsMatch ? "Passwords match!" : "Passwords do not match"}
              </p>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-in slide-in-from-top-2 duration-300">
            <p className="text-sm text-red-700 flex items-center gap-2">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading || !isFormValid}
          className={cn(
            "w-full h-12 font-medium transition-all duration-200 relative overflow-hidden",
            isFormValid
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl"
              : "bg-gray-300 cursor-not-allowed text-gray-500",
            isLoading && "bg-blue-600"
          )}
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{mode === 'login' ? 'Signing In...' : 'Creating Account...'}</span>
            </div>
          ) : (
            <span className="flex items-center justify-center gap-2">
              {mode === 'login' ? 'Log In' : 'Create Account'}
              <svg 
                className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          )}
        </Button>



        {/* Terms and Privacy */}
        {mode === 'signup' && (
          <p className="text-xs text-gray-500 text-center leading-relaxed">
            By signing up, you agree to our{" "}
            <Link href="/terms" className="text-blue-600 hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>
          </p>
        )}
      </form>
        </CardContent>
      </Card>
    </div>
  );
}