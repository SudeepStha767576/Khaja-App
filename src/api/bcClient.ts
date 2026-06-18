import axios from 'axios'

// In dev: Vite proxies /api/khaja → localhost:3001 (Express)
// In prod (Vercel): /api/khaja → Vercel serverless function
const bcClient = axios.create({
  baseURL: '/api/khaja',
  headers: { 'Content-Type': 'application/json' },
})

export default bcClient
