'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from '@supabase/supabase-js';
import { UserProfile } from '@/utils/auth';

interface ProfileCompletionFormProps {
  user: User;
  profile: UserProfile | null;
}

export default function ProfileCompletionForm({ user, profile }: ProfileCompletionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    bio: profile?.bio || '',
    avatar_url: profile?.avatar_url || ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const supabase = createClient();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Profile completion form submitted:', formData); // Debug log
    console.log('User ID:', user.id); // Debug log
    
    if (!validateForm()) {
      console.log('Form validation failed'); // Debug log
      return;
    }

    setLoading(true);

    try {
      console.log('Updating profile for user:', user.id); // Debug log
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name.trim(),
          bio: formData.bio.trim() || null,
          avatar_url: formData.avatar_url.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select(); // Add select to see what was updated

      if (error) {
        console.error('Profile update error:', error); // Debug log
        throw error;
      }

      console.log('Profile updated successfully:', data); // Debug log
      
      // Success! Redirect to home page
      router.push('/');
      router.refresh(); // Refresh to update any cached data
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrors({ 
        submit: error instanceof Error ? error.message : 'An unexpected error occurred' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Card className="w-full bg-white">
      <CardHeader>
        <CardTitle className="text-gray-900">Complete Your Profile</CardTitle>
        <CardDescription className="text-gray-600">
          Help others get to know you by completing your profile information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email (read-only) */}
          <div>
            <Label htmlFor="email" className="text-gray-700">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={user.email || ''}
              disabled
              className="bg-gray-50 text-gray-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your email address from registration
            </p>
          </div>

          {/* Full Name */}
          <div>
            <Label htmlFor="full_name" className="text-gray-700">Full Name *</Label>
            <Input
              id="full_name"
              type="text"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              placeholder="Enter your full name"
              className={`text-gray-900 bg-white ${errors.full_name ? 'border-red-500' : ''}`}
            />
            {errors.full_name && (
              <p className="text-red-500 text-sm mt-1">{errors.full_name}</p>
            )}
          </div>

          {/* Bio */}
          <div>
            <Label htmlFor="bio" className="text-gray-700">Bio (Optional)</Label>
            <textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Tell us a little about yourself..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 bg-white placeholder-gray-400"
            />
          </div>

          {/* Avatar URL */}
          <div>
            <Label htmlFor="avatar_url" className="text-gray-700">Profile Picture URL (Optional)</Label>
            <Input
              id="avatar_url"
              type="url"
              value={formData.avatar_url}
              onChange={(e) => handleInputChange('avatar_url', e.target.value)}
              placeholder="https://example.com/your-photo.jpg"
              className="text-gray-900 bg-white"
            />
            <p className="text-xs text-gray-500 mt-1">
              Link to your profile picture
            </p>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : 'Complete Profile'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push('/')}
              disabled={loading}
            >
              Skip for now
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
