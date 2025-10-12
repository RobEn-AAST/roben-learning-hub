"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useState } from "react";

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const logout = async () => {
    if (isLoading) return; // Prevent double clicks
    
    try {
      setIsLoading(true);
      const supabase = createClient();
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
        return;
      }
      
      // Force a full page reload to clear all state
      window.location.href = "/";
      
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoading(false);
    }
    // Don't set loading to false here since we're redirecting
  };

  return (
    <Button 
      onClick={logout} 
      variant="outline" 
      size="sm" 
      disabled={isLoading}
      className="bg-white text-blue-600 border-white hover:bg-blue-50 flex items-center gap-2"
    >
      <LogOut className="h-4 w-4" />
      {isLoading ? 'Signing out...' : 'Sign out'}
    </Button>
  );
}
