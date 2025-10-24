"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";

// Roben.club logo SVG
const RobenLogo = () => (
  <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
  </svg>
);

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [isLoading, setIsLoading] = useState(false);

  const handleRobenLogin = async () => {
    setIsLoading(true);
    
    // Build SSO authorization URL
    const clientId = process.env.NEXT_PUBLIC_ROBEN_SSO_CLIENT_ID || 'qN6vr8SyZJMCb2NX';
    const redirectUri = process.env.NEXT_PUBLIC_ROBEN_SSO_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/roben-sso';
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'roben',
      response_type: 'code'
    });

    // Redirect to Roben.club SSO
    window.location.href = `https://roben.club/sso/authorize/?${params.toString()}`;
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Roben Learning Hub</CardTitle>
          <CardDescription>
            Sign in with your Roben.club account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <Button 
              onClick={handleRobenLogin} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-lg"
              disabled={isLoading}
            >
              <RobenLogo />
              {isLoading ? "Redirecting to Roben.club..." : "Sign in with Roben.club"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">
                  Secure Single Sign-On
                </span>
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>By signing in, you agree to our Terms of Service</p>
              <p className="mt-2">
                Don&apos;t have a Roben.club account?{" "}
                <a 
                  href="https://roben.club/register" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Create one here
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground">
        <p>🔒 Your credentials are securely handled by Roben.club</p>
        <p className="mt-1">We never see or store your password</p>
      </div>
    </div>
  );
}
