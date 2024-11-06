import { NextRequest, NextResponse } from 'next/server'
import { google, youtube_v3 } from 'googleapis'
import { rateLimit } from '@/app/lib/rate-limit'
import { Video } from '@/app/types/video'

export async function POST(request: NextRequest) {
  try {
    // ... rest of your existing code from app/api/scrape/route.ts ...
  } catch (error: unknown) {
    console.error('Error fetching videos:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch videos'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
} 