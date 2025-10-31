import { NextRequest, NextResponse } from 'next/server';

// This endpoint has been removed. The preferred source of completed lesson ids
// is now the main course payload: GET /api/courses/:courseId (it includes
// `completedLessonIds`). Keep this lightweight route around only to return
// a clear 410 so any clients still calling it get a deterministic response.
export async function GET() {
  return NextResponse.json({ error: 'Endpoint removed - use GET /api/courses/:courseId' }, { status: 410 });
}
