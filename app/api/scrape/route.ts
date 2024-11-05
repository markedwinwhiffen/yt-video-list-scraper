import { NextResponse } from 'next/server'
import { google, youtube_v3 } from 'googleapis'

// Add type checking for environment variable
if (!process.env.YOUTUBE_API_KEY) {
  throw new Error('YOUTUBE_API_KEY is not configured')
}

// Add interface for video type
interface Video {
  title: string | undefined
  url: string
  duration: string | undefined
  views: number
  published_at: string | undefined
}

// Add interfaces for YouTube API responses
interface PlaylistItem {
  snippet?: {
    title?: string
    publishedAt?: string
  }
  contentDetails?: {
    videoId?: string
  }
}

interface VideoDetails {
  contentDetails?: {
    duration?: string | null
  }
  statistics?: {
    viewCount?: string
  }
}

interface ApiResponse {
  videos: Video[]
  error?: string
}

// Update the PlaylistResponse interface to match the YouTube API response type
interface PlaylistResponse {
  data: {
    items?: youtube_v3.Schema$PlaylistItem[]
    nextPageToken?: string | null
  }
}

export async function POST(request: Request) {
  try {
    const { url, videoLimit = 100 } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Extract channel handle from URL
    const channelHandle = url.split('@')[1]?.split('/')[0]
    if (!channelHandle) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL format' },
        { status: 400 }
      )
    }

    // Initialize YouTube API
    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    })

    // Get channel ID from handle
    const channelResponse = await youtube.search.list({
      part: ['snippet'],
      q: channelHandle,
      type: ['channel'],
      maxResults: 1
    })

    if (!channelResponse.data.items?.length) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      )
    }

    const channelId = channelResponse.data.items[0].id?.channelId

    // Get uploads playlist ID
    const channelDetails = await youtube.channels.list({
      part: ['contentDetails'],
      id: [channelId!]
    })

    const uploadsPlaylistId = channelDetails.data.items?.[0].contentDetails?.relatedPlaylists?.uploads

    if (!uploadsPlaylistId) {
      return NextResponse.json(
        { error: 'Could not find uploads playlist for channel' },
        { status: 404 }
      )
    }

    // Get videos from uploads playlist
    const videos: Video[] = []
    let pageToken: string | undefined = undefined

    while (videos.length < videoLimit) {
      const playlistResponse: youtube_v3.Schema$PlaylistItemListResponse = await youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId: uploadsPlaylistId,
        maxResults: Math.min(50, videoLimit - videos.length),
        pageToken
      })

      const videoIds = playlistResponse.items?.map(
        (item) => item.contentDetails?.videoId
      ) || []

      // Get video details
      if (videoIds.length) {
        const videoDetails = await youtube.videos.list({
          part: ['contentDetails', 'statistics'],
          id: videoIds
        })

        playlistResponse.items?.forEach((item: youtube_v3.Schema$PlaylistItem, index: number) => {
          const details = videoDetails.data.items?.[index] as VideoDetails | undefined
          if (details) {
            videos.push({
              title: item.snippet?.title || undefined,
              url: `https://youtube.com/watch?v=${item.contentDetails?.videoId}`,
              duration: details.contentDetails?.duration || undefined,
              views: parseInt(details.statistics?.viewCount || '0'),
              published_at: item.snippet?.publishedAt || undefined
            })
          }
        })
      }

      pageToken = playlistResponse.nextPageToken || undefined
      if (!pageToken || videos.length >= videoLimit) break
    }

    return NextResponse.json({ videos })

  } catch (error: any) {
    console.error('Error fetching videos:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch videos' },
      { status: 500 }
    )
  }
} 