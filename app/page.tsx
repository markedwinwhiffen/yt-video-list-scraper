'use client'

import { useState } from 'react'

// Add type for video and sort options
interface Video {
  title: string | undefined
  url: string
  duration: string | undefined
  views: number
  published_at: string | undefined
}

type SortField = 'published_at' | 'views' | 'duration'
type SortOrder = 'asc' | 'desc'

function formatDuration(duration: string | undefined): string {
  if (!duration) return ''
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
  if (!match) return duration
  
  const hours = (match[1] || '').replace('H', '')
  const minutes = (match[2] || '').replace('M', '')
  const seconds = (match[3] || '').replace('S', '')
  
  return [
    hours && `${hours}:`,
    minutes.padStart(2, '0'),
    ':',
    seconds.padStart(2, '0')
  ].join('')
}

// Add duration to seconds converter for sorting
function durationToSeconds(duration: string | undefined): number {
  if (!duration) return 0
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  
  const [_, hours, minutes, seconds] = match
  return (
    (parseInt(hours || '0') * 3600) +
    (parseInt(minutes || '0') * 60) +
    parseInt(seconds || '0')
  )
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'N/A'
  try {
    return new Date(dateString).toLocaleDateString()
  } catch {
    return 'Invalid Date'
  }
}

// Add CSV export function
function exportToCSV(videos: Video[]) {
  const headers = ['Title', 'URL', 'Duration', 'Views', 'Published Date']
  const csvContent = [
    headers.join(','),
    ...videos.map(video => [
      `"${video.title?.replace(/"/g, '""')}"`,
      video.url,
      formatDuration(video.duration),
      video.views,
      formatDate(video.published_at)
    ].join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'youtube_videos.csv'
  link.click()
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [videoLimit, setVideoLimit] = useState(100)
  const [loading, setLoading] = useState(false)
  const [videos, setVideos] = useState<Video[]>([])
  const [error, setError] = useState('')
  const [sortField, setSortField] = useState<SortField>('published_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Add sort function
  const sortVideos = (videos: Video[]): Video[] => {
    return [...videos].sort((a, b) => {
      let comparison = 0
      
      switch (sortField) {
        case 'published_at':
          comparison = (new Date(a.published_at || 0)).getTime() - (new Date(b.published_at || 0)).getTime()
          break
        case 'views':
          comparison = a.views - b.views
          break
        case 'duration':
          comparison = durationToSeconds(a.duration) - durationToSeconds(b.duration)
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setVideos([])

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, videoLimit }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch videos')
      }

      setVideos(data.videos)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unknown error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  const sortedVideos = sortVideos(videos)

  return (
    <main className="py-10">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">
          YouTube Channel Video Fetcher
        </h1>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                YouTube Channel URL
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/@ChannelName/videos"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Example: https://www.youtube.com/@ChannelName/videos
              </p>
            </div>

            <div>
              <label htmlFor="limit" className="block text-sm font-medium text-gray-700">
                Number of Videos
              </label>
              <select
                id="limit"
                value={videoLimit}
                onChange={(e) => setVideoLimit(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                {[50, 100, 200, 300, 400, 500].map(num => (
                  <option key={num} value={num}>{num} videos</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Fetching Videos...' : 'Fetch Videos'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
              {error}
            </div>
          )}

          {videos.length > 0 && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Found {videos.length} Videos</h2>
                <button
                  onClick={() => exportToCSV(sortedVideos)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Export to CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('duration')}
                      >
                        Duration {sortField === 'duration' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('views')}
                      >
                        Views {sortField === 'views' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('published_at')}
                      >
                        Published {sortField === 'published_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedVideos.map((video: Video, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <a 
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {video.title}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{formatDuration(video.duration)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {video.views.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {formatDate(video.published_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}