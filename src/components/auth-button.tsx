import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export async function AuthButton() {
  const supabase = await createClient();

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user) {
    return (
      <div className="flex gap-2">
        <Button asChild size="sm" variant={"outline"}>
          <Link href="/auth/login">Sign in</Link>
        </Button>
        <Button asChild size="sm" variant={"default"}>
          <Link href="/auth/sign-up">Sign up</Link>
        </Button>
      </div>
    );
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.sub)
    .single();

  const userRole = profile?.role;

  return (
    <div className="flex items-center gap-4">
      Hey, {user.email}!
      
      {/* Dashboard Navigation Buttons */}
      {userRole === 'admin' && (
        <Button asChild size="sm" variant={"outline"}>
          <Link href="/admin">Admin Dashboard</Link>
        </Button>
      )}
      
      {userRole === 'instructor' && (
        <Button asChild size="sm" variant={"outline"}>
          <Link href="/instructor">Instructor Dashboard</Link>
        </Button>
      )}
      
      <LogoutButton />
    </div>
  );
}
