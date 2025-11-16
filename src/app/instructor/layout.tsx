import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import { isUserInstructor } from "@/utils/auth";

// Export dynamic rendering configuration for instructor authentication
export const dynamic = "force-dynamic";

interface InstructorLayoutProps {
  children: React.ReactNode;
}

export default async function InstructorLayout({
  children,
}: InstructorLayoutProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check if user has instructor or admin role
  const hasInstructorAccess = await isUserInstructor(user.id);

  if (!hasInstructorAccess) {
    redirect(
      "/auth/error?message=Access denied. Instructor privileges required."
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Instructor Content */}
      <main className="">
        <div className="">{children}</div>
      </main>
    </div>
  );
}
