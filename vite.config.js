import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import buildGuard from './src/buildGuard.js'

export default defineConfig({
  plugins: [react(), buildGuard()],
})
