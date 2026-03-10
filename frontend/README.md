This is a [Next.js](https://nextjs.org) frontend with Supabase-backed login and signup screens built with shadcn/ui primitives.

## Getting Started

Create `frontend/.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-supabase-publishable-key
LANGGRAPH_API_URL=http://127.0.0.1:2024
LANGGRAPH_ASSISTANT_ID=agent
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Routes:

- `/` shows the landing page and current Supabase session state.
- `/login` signs users in with email and password.
- `/signup` creates new accounts with Supabase Auth.
- `/sessions/[sessionId]` loads a LangGraph thread, shows its current state, and streams new backend events for that session.
