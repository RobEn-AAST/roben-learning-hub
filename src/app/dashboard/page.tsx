import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navigation } from '@/components/navigation';
import { DashboardClient } from './DashboardClient';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Export dynamic rendering configuration
export const dynamic = 'force-dynamic';

async function authCheck() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  return user;
}

export default async function DashboardPage() {
  const user = await authCheck();
  const supabase = await createClient();
  let role = 'user';
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role) role = profile.role;
  } catch {}

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top actions (no welcome text) */}
        <div className="mb-4 flex items-center justify-end gap-3">
          {role === 'admin' && (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin">Admin Console</Link>
            </Button>
          )}
          {role === 'instructor' && (
            <Button asChild variant="outline" size="sm">
              <Link href="/instructor">Instructor Console</Link>
            </Button>
          )}
        </div>
        <DashboardClient />
      </div>
    </div>
  );
}