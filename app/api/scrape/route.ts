import { NextResponse } from 'next/server'
import { google, youtube_v3 } from 'googleapis'
import { rateLimit } from '@/app/lib/rate-limit'
import { Video } from '@/app/types/video'

const isValidYouTubeUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname === 'youtube.com' || urlObj.hostname === 'www.youtube.com'
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      )
    }

    const limiter = rateLimit({
      interval: 60 * 1000,
      uniqueTokenPerInterval: 500
    })

    await limiter.check(5, 'YOUTUBE_API')

    const { url, videoLimit = 100 } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    if (!isValidYouTubeUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      )
    }

    const channelHandle = url.split('@')[1]?.split('/')[0]
    if (!channelHandle) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL format' },
        { status: 400 }
      )
    }

    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    })

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

    const videos: Video[] = []
    let pageToken: string | undefined = undefined

    while (videos.length < videoLimit) {
      const response = await youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId: uploadsPlaylistId,
        maxResults: Math.min(50, videoLimit - videos.length),
        pageToken
      })

      const playlistResponse: youtube_v3.Schema$PlaylistItemListResponse = response.data

      const videoIds = playlistResponse.items?.map(
        (item: youtube_v3.Schema$PlaylistItem) => item.contentDetails?.videoId
      ).filter((id: string | undefined | null): id is string => id !== null && id !== undefined) || []

      if (videoIds.length) {
        const videoDetails = await youtube.videos.list({
          part: ['contentDetails', 'statistics'],
          id: videoIds
        })

        playlistResponse.items?.forEach((item: youtube_v3.Schema$PlaylistItem, index: number) => {
          const details = videoDetails.data.items?.[index]
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

  } catch (error: unknown) {
    console.error('Error fetching videos:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch videos'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
} 