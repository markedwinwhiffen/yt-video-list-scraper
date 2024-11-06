const CACHE_DURATION = 1000 * 60 * 60 // 1 hour

const cache = new Map<string, { data: any; timestamp: number }>()

export function getCachedData(key: string) {
  const cached = cache.get(key)
  if (!cached) return null
  
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    cache.delete(key)
    return null
  }
  
  return cached.data
}

export function setCachedData(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() })
} 