import { NextResponse } from 'next/server'
import { google } from 'googleapis'

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
      const playlistResponse = await youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId: uploadsPlaylistId,
        maxResults: Math.min(50, videoLimit - videos.length),
        pageToken
      })

      const videoIds = playlistResponse.data.items?.map(
        item => item.contentDetails?.videoId
      ) || []

      // Get video details
      if (videoIds.length) {
        const videoDetails = await youtube.videos.list({
          part: ['contentDetails', 'statistics'],
          id: videoIds
        })

        playlistResponse.data.items?.forEach((item, index) => {
          const details = videoDetails.data.items?.[index]
          if (details) {
            videos.push({
              title: item.snippet?.title,
              url: `https://youtube.com/watch?v=${item.contentDetails?.videoId}`,
              duration: details.contentDetails?.duration,
              views: parseInt(details.statistics?.viewCount || '0'),
              published_at: item.snippet?.publishedAt
            })
          }
        })
      }

      pageToken = playlistResponse.data.nextPageToken
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