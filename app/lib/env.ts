export function validateEnv() {
  const requiredEnvs = ['YOUTUBE_API_KEY'] as const
  
  for (const env of requiredEnvs) {
    if (!process.env[env]) {
      throw new Error(`${env} is not configured`)
    }
  }
} 