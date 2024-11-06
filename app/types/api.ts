import { Video } from './video'

export interface ApiResponse {
  videos?: Video[]
  error?: string
} 