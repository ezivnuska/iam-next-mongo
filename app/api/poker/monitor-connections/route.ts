// app/api/poker/monitor-connections/route.ts

import { NextResponse } from 'next/server';
import { monitorDisconnectedPlayers } from '@/app/poker/lib/server/connection-manager';

/**
 * Background monitor endpoint for checking disconnected players
 *
 * This endpoint should be called periodically (e.g., every 10 seconds)
 * by a cron job to check for stale connections and auto-fold when necessary.
 *
 * Recommended setup:
 * - Use Vercel Cron Jobs (see vercel.json)
 * - Or use a third-party cron service like cron-job.org
 * - Or call this from a background worker
 *
 * Authorization: This endpoint should be protected in production
 * Consider adding API key authentication or restricting to cron jobs only
 */
export async function GET(request: Request) {
  try {
    // Optional: Add authorization check here
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    await monitorDisconnectedPlayers();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Monitor connections error:', error);
    return NextResponse.json(
      { error: 'Failed to monitor connections' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for manual trigger (useful for testing)
 */
export async function POST(request: Request) {
  try {
    await monitorDisconnectedPlayers();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Manual monitoring completed'
    });
  } catch (error) {
    console.error('Monitor connections error:', error);
    return NextResponse.json(
      { error: 'Failed to monitor connections' },
      { status: 500 }
    );
  }
}
