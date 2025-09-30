import { NextRequest, NextResponse } from 'next/server';
import { getAllUsersServerAction, getUserStatsServerAction } from '@/services/userServerActions';

// GET - List all users using server actions
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');

    if (type === 'stats') {
      const stats = await getUserStatsServerAction();
      return NextResponse.json({ stats });
    } else {
      const users = await getAllUsersServerAction();
      return NextResponse.json({ users });
    }
  } catch (error) {
    console.error('Error in users-server API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch data' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 
               error instanceof Error && error.message === 'Admin access required' ? 403 : 500 }
    );
  }
}