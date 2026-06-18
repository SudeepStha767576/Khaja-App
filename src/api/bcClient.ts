import axios from 'axios'

// All requests go to the local proxy server which adds BC authentication.
// In dev: Vite proxies /api/khaja → http://localhost:3001/api/khaja
// In prod: deploy the Express server alongside the built React files.
const bcClient = axios.create({
  baseURL: '/api/khaja',
  headers: { 'Content-Type': 'application/json' },
})

export default bcClient
