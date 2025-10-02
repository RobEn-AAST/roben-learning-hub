import { createClient } from '@/lib/supabase/client';

export async function testClientSideConnection() {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Client-side error:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Client-side connection successful');
    return { success: true, data };
  } catch (err) {
    console.error('Client-side exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}