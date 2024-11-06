export function rateLimit({ interval, uniqueTokenPerInterval }: { interval: number; uniqueTokenPerInterval: number }) {
  const tokens = new Map()

  return {
    check: async (limit: number, token: string) => {
      const now = Date.now()
      const tokenCount = tokens.get(token) || 0

      if (tokenCount >= limit) {
        throw new Error('Rate limit exceeded')
      }

      tokens.set(token, tokenCount + 1)
      setTimeout(() => tokens.delete(token), interval)

      return true
    }
  }
} 