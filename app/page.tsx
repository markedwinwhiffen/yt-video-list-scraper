'use client'

import { useState } from 'react'

// Add type for video
interface Video {
  title: string | undefined
  url: string
  duration: string | undefined
  views: number
  published_at: string | undefined
}

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

// Add a helper function to safely format dates
function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'N/A'
  try {
    return new Date(dateString).toLocaleDateString()
  } catch {
    return 'Invalid Date'
  }
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [videoLimit, setVideoLimit] = useState(100)
  const [loading, setLoading] = useState(false)
  const [videos, setVideos] = useState<Video[]>([])
  const [error, setError] = useState('')

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
              <h2 className="text-xl font-semibold mb-4">Found {videos.length} Videos</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Views
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Published
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {videos.map((video: Video, index) => (
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