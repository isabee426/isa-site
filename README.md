# isa-site

Personal site for Isabella Beltran Shapland. Built with Next.js and react-three-fiber.

## Before deploying

1. Save your photo as `public/isa.jpg`. A portrait crop works best, and the arch frame is 3:4.
2. Put your résumé PDF in `public/` and set `links.resume` in `lib/content.ts`.
3. Fill in `linkedin`, `github`, `trainloopPaper` (and `ftGrpoPreprint` once it's public) in `lib/content.ts`.
   Links left empty are hidden, so nothing shows up broken.

All copy lives in `lib/content.ts`. The 3D background is `components/AttentionThreads.tsx`.

## Run locally

```sh
npm install
npm run dev   # http://localhost:3000
```

## Deploy on Vercel

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project**, import the repo, and set **Root Directory** to `isa-site`.
3. The framework is detected as Next.js, so no other settings are needed. Click Deploy.
