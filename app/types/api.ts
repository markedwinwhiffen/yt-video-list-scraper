import { Video } from '@/types/video'

export interface ApiResponse {
  videos?: Video[]
  error?: string
} 