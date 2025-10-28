import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { normalizeEgyptianPhone } from '@/lib/phone';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body || {};

    // Validate phone
    const normalized = normalizeEgyptianPhone(phone);
    if (!normalized) {
      return NextResponse.json({ error: 'Invalid phone number. Expected Egyptian mobile number starting with 010/011/012/015 and 11 digits.' }, { status: 400 });
    }

    // Get current user from session
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update profiles.phone_number using the server client (no auth.phone updates)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ phone_number: normalized, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (profileError) {
      console.error('Failed to update profile phone_number:', profileError);
      return NextResponse.json({ error: 'Failed to update profile phone' }, { status: 500 });
    }

    return NextResponse.json({ success: true, phone: normalized });
  } catch (error) {
    console.error('Error in update-phone endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
