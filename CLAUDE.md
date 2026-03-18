# CenterBook Operations — Claude Code Rules

## Project
In-center tablet/desktop app for Kumon educational centers. Next.js 14+ App Router, TypeScript, CSS Modules.

## Design System
- Colors: Use CSS custom properties from `src/styles/tokens.css` — NEVER hardcode hex values
- Primary: `--primary` (#355caa) — headings, nav, authority
- Secondary: `--secondary` (#009AAB) — teal highlights, active states
- Accent: `--accent` (#E0712C) — primary CTA buttons, Reading subject color
- Tertiary: `--tertiary` (#4a9ac2) — secondary buttons, Math subject color
- Slate: `--slate` (#3d5a64) — sidebar/footer dark sections (NOT brand blue)
- Fonts: Montserrat (primary), Oooh Baby (script accent for H4 headers only)
- Cards: white bg, 1px solid var(--border), 10px radius, 28px padding, NO shadows
- Buttons: 6px radius, 600 weight, arrow suffix on CTAs, min-width 120px
- Math badges = tertiary blue, Reading badges = accent orange

## Architecture
- REST API: `cb/v1` namespace at thecenterbookgr.com/wp-json/cb/v1/
- Auth: WordPress Application Passwords via Basic Auth
- Rate limiting: 2 requests per batch, 2s interval (WP Engine Cloudflare WAF)
- Styling: CSS Modules + CSS custom properties (tokens.css)
- State: React Context + useReducer per module
- Data fetching: SWR hooks wrapping typed API client

## DO NOT
- Add Co-authored-by trailers to git commits
- Use Tailwind or styled-components
- Add heavy drop shadows to cards
- Use dark backgrounds for content (except sidebar/timeclock)
- Type content in ALL CAPS (use CSS text-transform)
- Use decorative fonts except Oooh Baby for script accent headers
- Hardcode API credentials — use env vars
- Skip rate limiting on API calls
