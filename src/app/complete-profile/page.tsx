import ProfileCompletionForm from '@/components/profile-completion-form';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function CompleteProfilePage() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get existing profile (should exist from database trigger or manual creation)
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // If profile doesn't exist, create it first
  if (error && error.code === 'PGRST116') {
    // Profile doesn't exist, create it
    const { error: createError } = await supabase
      .from('profiles')
      .insert([{
        id: user.id,
        full_name: '',
        bio: null,
        avatar_url: null
      }]);
    
    if (createError) {
      console.error('Error creating profile:', createError);
      redirect('/auth/error?message=Failed to create profile. Please contact support.');
    }
    
    // Get the newly created profile
    const { data: newProfile, error: newError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (newError) {
      redirect('/auth/error?message=Profile creation failed. Please contact support.');
    }
    
    // Use the new profile
    const profileToUse = newProfile;
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Complete Your Profile
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please provide some additional information to complete your account setup.
            </p>
          </div>
          <ProfileCompletionForm user={user} profile={profileToUse} />
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Profile fetch error:', error);
    redirect('/auth/error?message=Unable to load profile. Please try again.');
  }

  // If profile is already complete (has full_name), redirect to home
  if (profile && profile.full_name && profile.full_name.trim()) {
    redirect('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Complete Your Profile
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please provide some additional information to complete your account setup.
          </p>
        </div>
        <ProfileCompletionForm user={user} profile={profile} />
      </div>
    </div>
  );
}
