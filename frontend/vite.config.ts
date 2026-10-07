import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // The page chunk is about 530 kB (162 kB gzip): the shop plus the flow
    // drawer's strip, bar and probe, which read the statechart from the first
    // step. React Flow and the path generator stay in lazy chunks. The limit
    // sits just above today's size, so real growth still warns.
    chunkSizeWarningLimit: 560,
  },
})
