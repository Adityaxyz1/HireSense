# Frontend Commands — package.json

Root: `frontend/`

## npm Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start Vite dev server → http://localhost:5173 |
| `npm run build` | Production build (output: `dist/`) |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint across all source files |

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.0 | UI framework |
| react-dom | ^19.2.0 | DOM renderer |
| react-router-dom | ^7.13.1 | Client-side routing |
| @supabase/supabase-js | ^2.103.2 | Supabase auth + realtime |
| framer-motion | ^12.34.3 | Animations |
| lucide-react | ^0.575.0 | Icon set |

## Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| vite | ^7.3.1 | Build tool / dev server |
| @vitejs/plugin-react | ^5.1.1 | React fast-refresh |
| tailwindcss | ^3.4.19 | Utility CSS |
| postcss + autoprefixer | ^8.5.6 / ^10.4.27 | CSS processing |
| eslint | ^9.39.1 | Linter |
| eslint-plugin-react-hooks | ^7.0.1 | Hooks lint rules |
| eslint-plugin-react-refresh | ^0.4.24 | HMR lint rules |
