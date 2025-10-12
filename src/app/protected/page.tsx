import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { InfoIcon } from "lucide-react";
import { FetchDataSteps } from "@/components/tutorial/fetch-data-steps";

// Export dynamic rendering configuration
export const dynamic = 'force-dynamic';

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/auth/login");
  }

  // Get user profile to redirect to appropriate dashboard
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role || 'user';
  
  // Redirect to appropriate dashboard based on role
  switch (role) {
    case 'admin':
      redirect('/admin');
      break;
    case 'instructor':
      redirect('/instructor');
      break;
    default:
      redirect('/dashboard');
  }

  // This return will never be reached due to redirects above
  return null;
}
