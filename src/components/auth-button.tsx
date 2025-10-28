import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export async function AuthButton() {
  const supabase = await createClient();

  // Using getUser() for better reliability
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Auth error:', error);
  }

  if (!user) {
    return (
      <div className="flex gap-2">
        <Button asChild size="sm" variant={"default"}>
          <Link href="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  // Get user profile to check role

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name, last_name')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role;
  const fullName = (profile && (profile.first_name || profile.last_name)) ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') : user.email;

  return (
    <div className="flex items-center gap-4">
      Hey, {fullName}!
      {/* Dashboard Navigation Buttons */}
      {userRole === 'admin' && (
        <Button asChild size="sm" variant={"outline"} className="text-black dark:text-white bg-white dark:bg-black border-none">
          <Link href="/admin">Admin Dashboard</Link>
        </Button>
      )}
      {userRole === 'instructor' && (
        <Button asChild size="sm" variant={"outline"} className="text-black dark:text-white bg-white dark:bg-black border-none">
          <Link href="/instructor">Instructor Dashboard</Link>
        </Button>
      )}
      {userRole === 'student' && (
        <Button asChild size="sm" variant={"outline"} className="text-black dark:text-white bg-white dark:bg-black border-none">
          <Link href="/students/enrolled-courses">My Courses</Link>
        </Button>
      )}
      <LogoutButton />
    </div>
  );
}
