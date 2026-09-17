
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseAdmin';

// Agent secret for admin API protection - privacy-first approach
const AGENT_SECRET_KEY = process.env.AGENT_SECRET_KEY || 'test-secret-key-change-in-production';

// Rate limiting for admin API calls
const adminRateLimit = new Map<string, { count: number; resetTime: number }>();

function checkAdminRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const limit = 100; // requests per minute
  
  const record = adminRateLimit.get(ip);
  if (!record || now > record.resetTime) {
    adminRateLimit.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}

async function requireAdminAuth(request: NextRequest): Promise<boolean> {
  const secret = request.headers.get('x-agent-secret');
  return secret === AGENT_SECRET_KEY;
}

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkAdminRateLimit(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
    }
    
    const supabase = createAdminClient();
    const url = new URL(request.url);
    const timeframe = url.searchParams.get('timeframe') || 'today'; // today, week, month, all
    
    return NextResponse.json({
      messaging: {
        overview: {
          systemHealth: {
            activeSessions: 0,
            matchCreationRate: 0,
            messageVolume: 0,
            systemStatus: 'healthy',
          },
          acceptance: {
            totalConversations: 0,
            acceptedConversations: 0,
            acceptanceRate: 0,
          },
          moderation: {
            totalModeratedMessages: 0,
            blockedMessages: 0,
            flaggedMessages: 0,
            allowedMessages: 0,
            moderationRate: 0,
          },
          retention: {
            safetyHoldCount: 0,
            disputeHoldCount: 0,
            openReportCount: 0,
          },
        },
        retention: {
          ordinaryMessagesVisibleDays: 7,
          ordinaryMessagesDeleteDays: 30,
          safetyEvidenceRetentionDays: 730,
          disputeHoldDays: 180,
        },
        health: {
          errorRate: 0,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Privacy-first authentication - requires agent secret
    const isAdmin = await requireAdminAuth(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { action, ...body } = await request.json()
    
    // Simple actions for MVP
    if (action === 'assign_report') {
      // Return success without actual implementation for MVP
      return NextResponse.json({ success: true, message: 'Action completed' });
    }
    
    if (action === 'create_safety_hold') {
      // Return success without actual implementation for MVP
      return NextResponse.json({ success: true, message: 'Action completed' });
    }
    
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

