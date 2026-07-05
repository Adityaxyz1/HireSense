# Vite Config — `frontend/vite.config.js`

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          motion: ['framer-motion'],
          icons: ['lucide-react'],
        },
      },
    },
  },
})
```

## Manual Chunks

The build splits vendor code into separate cacheable chunks:

| Chunk | Packages |
|-------|---------|
| `react-vendor` | react, react-dom, react-router-dom |
| `supabase` | @supabase/supabase-js |
| `motion` | framer-motion |
| `icons` | lucide-react |

This means browser caches these chunks independently — updating app code doesn't bust the vendor cache.
