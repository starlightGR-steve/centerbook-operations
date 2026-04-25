# Frontend Codebase Audit -- centerbook-operations

**Date:** 2026-04-17
**Auditor:** Claude Code (Opus 4.7)
**Scope:** Read-only audit. No files modified. No git operations. Analysis only.
**Repo:** starlightGR-steve/centerbook-operations (main branch, clean working tree)

---

## 1. Executive Summary

### Top 10 findings by severity

| # | Severity | Area | Finding |
|---|---|---|---|
| 1 | **Critical** | Security -- dependencies | Next.js 16.1.6 has `GHSA-q4gf-8mx6-v5v3` (high, CVSS 7.5) Server Components DoS plus 5 other advisories. Fix: upgrade to `next@16.2.4` (non-major). |
| 2 | **Critical** | Auth -- route gating | Admin-only pages (`/staff`, `/settings`, `/intelligence`, `/onboarding`, `/progress`) have **no server-side or client-side role check at the route boundary**. Only the nav hides them and only API routes enforce role. A staff user can still land on and partially render the admin UI. Defence-in-depth missing. |
| 3 | **Critical** | Architecture drift vs CLAUDE.md | Audit prompt requires "Tailwind, SWR"; CLAUDE.md forbids Tailwind. The repo correctly uses CSS Modules + SWR -- the **audit-prompt language contradicts CLAUDE.md** and must be reconciled. Flag for Steve to confirm which spec is authoritative. |
| 4 | **High** | Design system | **102 hardcoded hex color literals across 17 `.tsx` files** violate CLAUDE.md "NEVER hardcode hex values" (e.g. `IntelligencePage.tsx`, `ProgressPage.tsx`, `PipelinePage.tsx`, `BottomNav.tsx`, `NotificationBanner.tsx`, `KioskPage.tsx`). Includes brand primary `#355caa` and accent values that have token equivalents. |
| 5 | **High** | Responsive compliance | **~35+ hardcoded px violations** in layout properties across CSS modules (AddStudentPicker, ClassroomOverview, ClassroomSetup, EmptyState, LinkPickerModal, NotificationBanner, SearchInput, StaffDetailModal). Bypasses token scale. |
| 6 | **High** | Accessibility | `userScalable: false, maximumScale: 1` in `layout.tsx` viewport breaks WCAG 1.4.4 (Resize text). Zoom is disabled for users who need it. |
| 7 | **Medium** | API drift | Staff CRUD (`/api/staff/*`) uses 4 bespoke proxy routes duplicating auth logic instead of flowing through the catch-all `/api/cb` client. 12 raw `fetch()` calls bypass `src/lib/api.ts`. |
| 8 | **Medium** | Error handling | Duck-typed `status === 404 \|\| message.includes('404')` checks in `useAttendance.ts:57` and `useRows.ts:104` rather than `instanceof ApiClientError`. Fragile if error shape changes. |
| 9 | **Medium** | Security -- login | No client- or server-side rate-limiting on `/login`. Bcrypt hash check runs once per request; susceptible to credential stuffing. |
| 10 | **Low** | Design system | Global `h1` in `globals.css:35` uses `1.75rem` instead of a `--text-*` token (minor drift from the token scale). No `h4` rule defined despite CLAUDE.md calling out H4 / Oooh Baby script usage. |

### Overall health
- **TypeScript:** `tsc --noEmit` passes with **zero errors**.
- **TODO/FIXME:** only 2 markers. Debt is very low.
- **Orphan components:** none detected.
- **Dangerous patterns:** no `dangerouslySetInnerHTML`, no `alert/confirm/prompt`, no class components outside the single `ErrorBoundary`.
- **Demo/mock/staging drift:** clean. No mock data, no localhost URLs, no old `centerbook/v1` namespace.
- **PWA / manifest / Apple meta:** present and correct.
- **Env var hygiene:** `WP_API_URL/USER/PASSWORD` only referenced server-side; no `NEXT_PUBLIC_` leakage.

---

## 2. Architecture Drift

### 2.1 Stack match vs CLAUDE.md
- **Next.js 16.1.6** + App Router + TypeScript 5.9.3 + React 19.2.3 -- matches CLAUDE.md ("Next.js 14+ App Router, TypeScript").
- **NextAuth 4.24.13** -- matches audit-prompt requirement.
- **SWR 2.4.1** -- matches.
- **No Tailwind**, **no styled-components**, **no emotion**, **no CSS-in-JS** in `package.json`. Matches CLAUDE.md. **The audit-prompt's call to "confirm uses Tailwind" contradicts CLAUDE.md** -- flag for Steve.

### 2.2 Other deps
- `bcryptjs@3.0.3`, `lucide-react@0.577.0`, `recharts@3.8.0`. All current.

### 2.3 Production mode / mock drift
- **Clean.** Agent search found **zero** references to `demo`, `mock`, `fake`, `stub`, `fixture`, `sample data` in `src/`.
- **Clean.** No hardcoded localhost / 127.0.0.1 / port URLs in `src/`.
- **Clean.** No references to old `centerbook/v1` namespace. All backend calls target `cb/v1`.

### 2.4 Direct WordPress URL references (drift)
- [`src/views/kiosk/KioskPage.tsx:298`](src/views/kiosk/KioskPage.tsx#L298) -- hardcodes `https://thecenterbookgr.com/wp-content/uploads/...Kumon-Grand-Rapids-North-Logo_RBG.png`. Should be a local asset in `/public/images/` or proxied. Low severity but bypasses the proxy pattern.
- [`src/app/api/cb/[...path]/route.ts:5`](src/app/api/cb/%5B...path%5D/route.ts#L5) -- server-side fallback default `https://thecenterbookgr.com/wp-json/cb/v1` when `WP_API_URL` is unset. Acceptable but risky (silent fallback to prod).

### 2.5 SWR polling (multi-tablet sync) compliance
CLAUDE.md: "5s polling only where multi-tablet sync is needed". Current use:
- [`useRows.ts:38,154`](src/hooks/useRows.ts#L38) -- 5s (correct for classroom sync)
- [`useNotifications.ts:12,18`](src/hooks/useNotifications.ts#L12) -- 5s (correct for notification banner)
- [`useAttendance.ts:19`](src/hooks/useAttendance.ts#L19) -- 5s for `useActiveAttendance` (correct for kiosk)
- [`useAttendance.ts:6`](src/hooks/useAttendance.ts#L6) -- 10s default for `useAttendance` (reasonable)
- [`useTimeclock.ts:14`](src/hooks/useTimeclock.ts#L14) -- 10s (reasonable)
All other hooks use no `refreshInterval` (stale-while-revalidate only). **Compliant.**

### 2.6 Framing / embedded mode
[`next.config.ts:11`](next.config.ts#L11) + [`vercel.json:11`](vercel.json#L11) set `frame-ancestors` allowlist to `thecenterbookgr.com`, `*.thecenterbookgr.com`, `wpenginepowered.com`. Good: CSP is tight. Bad: `next.config.ts` also sets `X-Frame-Options: ALLOWALL` which is **not a valid value** (X-Frame-Options supports only DENY/SAMEORIGIN). Most browsers ignore the invalid header and fall back to CSP, but it should be removed for correctness. -- **Medium, easy fix.**

---

## 3. Responsive Compliance

### 3.1 Root responsive scale (compliant)
- [`src/styles/globals.css:11`](src/styles/globals.css#L11) -- `html { font-size: clamp(14px, 1.2vw + 0.5rem, 20px) }` **matches spec**.
- [`src/styles/tokens.css`](src/styles/tokens.css) defines full `--text-*` scale (3xs-3xl), `--space-*` scale (0_5-20), `--touch-min: 44px`, `--panel-width-sm/md/lg`, `--content-max`. **All present.**
- iOS zoom prevention at [`globals.css:120-124`](src/styles/globals.css#L120) forces `var(--text-lg) !important` on inputs at ≤1024px. Correct.

### 3.2 Hardcoded px violations in layout properties
(Investigated by sub-agent; reproduce below. Excludes legitimate 1px borders, icon-box 16/20/24/32/48px squares, and border-radius.)

| File | Line | Violation |
|---|---|---|
| [`src/app/login/login.module.css`](src/app/login/login.module.css#L17) | 17 | `padding: clamp(24px,...)` numeric stops hardcoded (rem acceptable but inconsistent) |
| `src/app/login/login.module.css` | 23 | `margin-bottom: 32px` -> `var(--space-8)` |
| [`src/views/rows/AddStudentPicker.module.css`](src/views/rows/AddStudentPicker.module.css#L6) | 6 | `padding: 32px 16px` |
| `src/views/rows/AddStudentPicker.module.css` | 20, 43, 57 | `left: 10px`, `right: 8px`, `max-height: 320px` |
| [`src/components/ui/EmptyState.module.css`](src/components/ui/EmptyState.module.css#L5) | 5, 6, 27 | `padding: 48px 24px`, `gap: 12px`, `max-width: 320px` |
| [`src/components/LinkPickerModal.module.css`](src/components/LinkPickerModal.module.css#L13) | 13, 61 | `width: 460px`, `left: 32px` |
| [`src/components/ui/SearchInput.module.css`](src/components/ui/SearchInput.module.css#L7) | 7, 20 | `left: 14px`, `padding: 12px 16px 12px 42px` |
| [`src/views/rows/ClassroomOverview.module.css`](src/views/rows/ClassroomOverview.module.css#L106) | 106, 144, 171, 201, 218, 278, 286 | multiple `gap/padding/margin` hardcoded |
| `src/views/rows/ClassroomOverview.module.css` | 211 | hardcoded color literal `#eab308` (should be `var(--yellow)`) |
| [`src/views/rows/ClassroomSetup.module.css`](src/views/rows/ClassroomSetup.module.css#L12) | 12, 117, 120, 167, 178, 189, 201, 239, 253 | 8+ hardcoded `padding/gap/margin/height` |
| [`src/components/ui/UndoToast.module.css`](src/components/ui/UndoToast.module.css#L3) | 3, 48 | `bottom: 24px`, `height: 2px` |
| [`src/components/NotificationBanner.module.css`](src/components/NotificationBanner.module.css#L26) | 26, 68, 79, 127, 229 | `max-width: 600px`, `margin: 2px/3px`, `max-width: 480px`, `min-height: 72px` |
| [`src/views/staff/StaffDetailModal.module.css`](src/views/staff/StaffDetailModal.module.css#L113) | 113, 188 | `max-height: 250px`, `padding: 14px` |
| [`src/views/rows/SeatSlot.module.css`](src/views/rows/SeatSlot.module.css#L199) | 199, 222-225 | `#eab308` literal x4 |
| [`src/views/kiosk/CheckInPopup.module.css`](src/views/kiosk/CheckInPopup.module.css#L337) | 337 | `border-left: 4px solid #f59e0b` (no token for amber) |

Totals: **~35 hardcoded layout-px violations** and **~6 hardcoded hex-in-CSS violations**.

### 3.3 Responsive primitives in CSS
`clamp()` / `min()` / `%` / `rem` are used across most CSS modules. Violations above are exceptions. No systematic failure -- these are pockets of drift.

---

## 4. Design System Compliance

### 4.1 Typography
- [`globals.css:1`](src/styles/globals.css#L1) loads Montserrat + Oooh Baby from Google Fonts. Import URL; consider migrating to `next/font` for perf (medium).
- `h1` at [`globals.css:35`](src/styles/globals.css#L35) uses `font-size: 1.75rem` -- not a token. Every other heading uses `--text-*`. Drift.
- **No `h4` rule.** CLAUDE.md calls out "Oooh Baby (script accent for H4 headers only)". Either the rule is unused or it needs adding. Ask Nicole.
- `h5` uppercases via CSS (`text-transform: uppercase`) -- correct per CLAUDE.md "don't type content in ALL CAPS".

### 4.2 Colors
- Token set in [`tokens.css`](src/styles/tokens.css) is complete and matches CLAUDE.md brand palette (`--primary #355caa`, `--secondary #009AAB`, `--accent #E0712C`, `--tertiary #4a9ac2`, `--slate #3d5a64`).
- **102 hardcoded hex literals across 17 `.tsx` files** (count by `rg '#[0-9a-f]{3,6}'`). Top offenders:
  - [`src/views/intelligence/IntelligencePage.tsx`](src/views/intelligence/IntelligencePage.tsx#L17) -- 17 occurrences. Chart palette (gold/silver/bronze/red/green/amber/dark/muted) hardcoded. Status color map (`'#22c55e'` etc.) also hardcoded.
  - [`src/views/progress/ProgressPage.tsx`](src/views/progress/ProgressPage.tsx#L19) -- 9 occurrences (ASHR colors, above/below grade indicators).
  - [`src/views/onboarding/PipelinePage.tsx`](src/views/onboarding/PipelinePage.tsx#L20) -- 9 pipeline status colors.
  - [`src/components/NotificationBanner.tsx:74`](src/components/NotificationBanner.tsx#L74) -- 4 severity color pairs (`#dcfce7/#16a34a` etc.).
  - [`src/components/layout/BottomNav.tsx:93,106,123,143,186`](src/components/layout/BottomNav.tsx#L93) -- inline `#355caa`, `#fff`, `#e53e3e`, `#1e3a6e`.
  - [`src/views/kiosk/KioskPage.tsx:377`](src/views/kiosk/KioskPage.tsx#L377) -- `#92400e`.
  - [`src/views/settings/CenterSetupPage.tsx:273-274`](src/views/settings/CenterSetupPage.tsx#L273) -- `#1E335E`, `#fff`, `#6b7280`.
  - Plus 10 more files with 1-6 occurrences each.
- **Recommended fix:** extend `tokens.css` with status/chart palette tokens (`--status-success`, `--status-warn`, `--status-danger`, `--chart-gold/silver/bronze`) and replace literals. Or expose tokens to JS via a small helper (read computed CSS custom properties).

### 4.3 Touch targets
- `tokens.css` defines `--touch-min: 44px`.
- [`src/components/ui/Button.module.css:74,80`](src/components/ui/Button.module.css#L74) -- small/large buttons pin `min-height: var(--touch-min)`. Correct.
- No audit-found interactive element with fewer than 44px of tappable area. Sub-agent sweep did not flag a violation. Spot-checks clean.
- Note: recent commit `a5568cd` already normalized date/time picker touch targets to 44px.

### 4.4 Focus indicators
- **86 `outline: none` declarations across 48 CSS files.** All are input/button styles that **are correctly restored by** the global `*:focus-visible { outline: 2px solid var(--secondary); outline-offset: 2px }` rule at [`globals.css:76-79`](src/styles/globals.css#L76). Compliant at runtime, but many `outline: none` rules are redundant (modern browsers default to no UA outline for mouse focus) -- consider deleting the noise.

### 4.5 Cards / Buttons
- Spot-check of `Card.module.css` and `Button.module.css` shows no heavy drop shadows, 10px radius on cards, 6px radius on buttons -- matches CLAUDE.md.

### 4.6 Playful Scholar sub-system
The audit prompt references a "Playful Scholar sub-system" using Andika font + `#FAFAFA` background + 24px radius. **No references found** in `src/` to `Andika`, `Playful Scholar`, or `#FAFAFA`. Either the sub-system has not yet been implemented or it lives outside this repo. -- **Question for Nicole.**

---

## 5. Component Inventory

### Shared components (src/components/*.tsx, top level)
| Component | Purpose |
|---|---|
| [AuthProvider](src/components/AuthProvider.tsx) | NextAuth `SessionProvider` wrapper |
| [ClockDisplay](src/components/ClockDisplay.tsx) | Live digital clock (sm/md/lg) |
| [DurationBadge](src/components/DurationBadge.tsx) | Session duration based on subjects |
| [ErrorBoundary](src/components/ErrorBoundary.tsx) | Class-component error boundary |
| [LinkPickerModal](src/components/LinkPickerModal.tsx) | Assign contact to student role |
| [Logo](src/components/Logo.tsx) | SVG brand mark |
| [NoteCard](src/components/NoteCard.tsx) | Styled student note card |
| [NotificationBanner](src/components/NotificationBanner.tsx) | Top-of-page banner for pending reviews |
| [PosBadge](src/components/PosBadge.tsx) | Classroom position badge (Early/Upper/Main) |
| [SmsStatusIndicator](src/components/SmsStatusIndicator.tsx) | SMS delivery status dot |
| [StudentJournal](src/components/StudentJournal.tsx) | Large journal editor |
| [StudentRow](src/components/StudentRow.tsx) | Student list row (used by rosters) |
| [SubjectBadges](src/components/SubjectBadges.tsx) | Math/Reading subject pills |
| [VisibilityLabel](src/components/VisibilityLabel.tsx) | Note visibility indicator |
| [AttendanceEditModal](src/components/AttendanceEditModal.tsx) | Edit attendance times |
| [SessionTimeAdjust](src/components/SessionTimeAdjust.tsx) | Post-checkout duration tweak |

### Subdirectories
- `components/attendance/` -- ExcusedAbsenceModal
- `components/layout/` -- Shell, Sidebar, BottomNav
- `components/pipeline/` -- NewFamilyLeadModal, FamilyDetailModal, EnrollmentWizard
- `components/students/` -- ProgressMeetingSection, NextClassPlanning, StudentAttendanceLog
- `components/ui/` -- Badge, Button, Card, EmptyState, Modal, SearchInput, SectionHeader, Skeleton, UndoToast (design system primitives)

### Views (src/views/**)
18 view directories: attendance, contacts (+ ContactProfilePage, CreateContactPage), intelligence, kiosk (CheckInPanel/Popup, CheckOutPanel/ConfirmPopup, KioskPage), library (BookCard, BookGrid, BookDetailModal, AddBookModal), lobby-board, logistics (CapacityGrid, WeekNavigator, SlotDetailModal, SettingsModal, RescheduleFlow, WeeklyPlanGrid), me, onboarding (PipelinePage), progress, rows (ClassroomSetup, ClassroomOverview, StudentGrid/Card, StudentDetailPanel, SeatSlot, RowAssignmentModal, AddStudentPicker), settings (CenterSetupPage), staff (StaffTable, StaffDetailModal, PayPeriodNavigator, TimeclockPanel), staff-schedule, students (StudentsRosterPage, StudentProfilePage, CreateStudentPage).

### Hooks (src/hooks)
24 hooks, each one SWR-backed and single-purpose. Complete list in context above (useAbsences, useAttendance, useCapacityGrid, useCenterSettings, useClassroomConfig, useClassroomNotes, useFlagConfig, useFocusTrap, useLevelHistory, useLibrary, useNotifications, useNotes, usePayPeriod, usePipeline, usePersistentItems, useRows, useScheduleOverrides, useStaff, useStaffSlots, useStudentJournal, useStudentTasks, useStudents, useTimeclock, useVisitPlan).

### Orphans / duplicates
- **No orphan components detected.** Every top-level component resolves to at least one importer.
- No duplicate modal implementations. Single `ui/Modal` base.

---

## 6. Route Inventory

### Page routes
| Path | Role gating | Source |
|---|---|---|
| `/` | public (redirect -> `/kiosk`) | [`src/app/page.tsx`](src/app/page.tsx) |
| `/attendance` | authenticated | [`src/app/attendance/page.tsx`](src/app/attendance/page.tsx) |
| `/contacts` / `[id]` / `/new` | authenticated | `src/app/contacts/**` |
| `/intelligence` | **admin+superuser (nav-only gate -- drift)** | [`src/app/intelligence/page.tsx`](src/app/intelligence/page.tsx) |
| `/kiosk` | authenticated | `src/app/kiosk/page.tsx` |
| `/library` | authenticated | `src/app/library/page.tsx` |
| `/lobby-board` | **public** (excluded by middleware) | `src/app/lobby-board/page.tsx` |
| `/login` | public | `src/app/login/page.tsx` |
| `/logistics` | authenticated | `src/app/logistics/page.tsx` |
| `/me` | authenticated | `src/app/me/page.tsx` |
| `/onboarding` | **admin+superuser (nav-only gate -- drift)** | `src/app/onboarding/page.tsx` |
| `/progress` | **admin+superuser (nav-only gate -- drift)** | `src/app/progress/page.tsx` |
| `/rows` | authenticated | `src/app/rows/page.tsx` |
| `/settings` | **admin+superuser (nav-only gate -- drift)** | `src/app/settings/page.tsx` |
| `/staff` | **admin+superuser (nav-only gate -- drift)** | `src/app/staff/page.tsx` |
| `/staff-schedule` | authenticated | `src/app/staff-schedule/page.tsx` |
| `/students` / `[id]` / `/new` | authenticated | `src/app/students/**` |

### API routes
| Path | Methods | Purpose |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handler |
| `/api/cb/[...path]` | * | Basic-Auth proxy to WP `cb/v1` |
| `/api/attendance/missed-you` | POST | Send "missed you" SMS |
| `/api/staff/create` | POST | Create staff (admin check enforced) |
| `/api/staff/password` | POST | Self-service password change |
| `/api/staff/[id]/update` | POST | Update staff (admin check enforced) |
| `/api/staff/[id]/reset-password` | POST | Reset staff pw (admin check enforced) |

### Middleware
[`middleware.ts`](middleware.ts) -- `next-auth/middleware` with matcher excluding `/login`, `/lobby-board`, `/api/auth`, `/_next/*`, `/images`, `/favicon.ico`, `/manifest.json`. Authenticated gate is correct. **No role-based path gating at middleware level.**

---

## 7. Auth & Security

### 7.1 NextAuth
- [`src/lib/auth.ts`](src/lib/auth.ts) -- JWT session, Credentials provider, bcryptjs comparison against `password_hash` from `/staff/auth` WP endpoint. `AppRole` derived from WP `role` column (`superuser`/`admin`/`staff`).
- `toAppRole` maps `owner`, `admin`, `instruction_manager`, `center_manager` -> `admin`. Clean.
- **Issue:** `authorize()` does not sleep on failure or normalize response time, allowing timing attacks to distinguish "unknown email" (404) vs "wrong password" (bcrypt miss). Low priority but worth noting.

### 7.2 Secrets
- **No secrets found in source.** `rg '(?i)(api[_-]?key|secret|password)\s*[:=]\s*["' + "'" + ']'` returns no hardcoded credentials.
- Required env vars: `WP_API_URL`, `WP_API_USER`, `WP_API_PASSWORD`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`. All referenced server-side only.
- No `NEXT_PUBLIC_` leakage.

### 7.3 Route authorization (defence-in-depth gap)
- **Middleware** enforces authenticated-only on all non-public routes. Good.
- **Role-gated pages (`/staff`, `/settings`, `/intelligence`, `/onboarding`, `/progress`)** have **no server-side redirect and no client-side `useSession().role` check** at the page level. The nav filters links out, but a staff user who knows the URL can navigate there, load the JS, and render the UI skeleton. Subsequent API calls will 403 on the staff CRUD endpoints, but on routes that only read data through `/api/cb` (e.g. `/intelligence`, `/progress`), the API will respond 200 and information leakage is possible.
- **Fix:** add a `requireRole(['admin','superuser'])` guard in each admin page's layout or a shared `AdminGate` wrapper that calls `useSession()` and redirects staff users.
- Correct behaviour is already implemented **at API level** in:
  - [`src/app/api/staff/create/route.ts:11`](src/app/api/staff/create/route.ts#L11)
  - [`src/app/api/staff/[id]/update/route.ts:10`](src/app/api/staff/%5Bid%5D/update/route.ts#L10)
  - [`src/app/api/staff/[id]/reset-password/route.ts:11`](src/app/api/staff/%5Bid%5D/reset-password/route.ts#L11)

### 7.4 Login page
- [`src/app/login/page.tsx`](src/app/login/page.tsx) -- no rate limiting, no CAPTCHA, no lockout. Single bcrypt compare per attempt. For an internal staff tool, probably acceptable, but at minimum consider a client-side throttle + server-side attempt counter. -- **Medium.**
- Uses `<img>` instead of `next/image` for the logo. Low severity.

### 7.5 CSRF / framing
- `frame-ancestors` CSP is scoped correctly.
- `X-Frame-Options: ALLOWALL` is **invalid** -- should be removed from [`next.config.ts:14-15`](next.config.ts#L14). Not exploitable but wrong.
- `viewport.userScalable: false` + `maximumScale: 1` in [`src/app/layout.tsx:11-12`](src/app/layout.tsx#L11) blocks pinch-zoom: **WCAG 1.4.4 violation.** Tablet UX decision, but legally risky if the app is ever used by someone requiring magnification. -- **High a11y.**

### 7.6 iframe / embedded mode
[`Shell.tsx:15`](src/components/layout/Shell.tsx#L15) -- trusts `?embedded=true` query param to hide sidebar. Anyone can set that param. Low risk (only visual), but note it's not a trust boundary.

---

## 8. API Integration Map

### 8.1 Proxy
[`src/app/api/cb/[...path]/route.ts`](src/app/api/cb/%5B...path%5D/route.ts)
- Catch-all GET/POST/PUT/PATCH/DELETE.
- Forwards query params, content-type, body.
- Injects Basic Auth server-side. Credentials never sent to browser.
- **No error envelope.** Pass-through status + body.
- **No request logging.** Silent failures.

### 8.2 Endpoints consumed by frontend (grouped)
(See sub-agent report above for complete catalogue; summary by domain.)

- **Students** -- `/operations/students/all`, `/students/{id}`, `/students/search`, `/students/barcode/{code}`, `/students/{id}/contacts`, `/students/{id}/level-history`, `/students/{id}/persistent-items`, `/students/{id}/visit-plan`
- **Contacts** -- `/contacts`, `/contacts/{id}`, `/contacts/search`, `/contact` (POST/PUT), `/student-contact`
- **Attendance** -- `/attendance`, `/attendance/checkin`, `/attendance/checkout`, `/attendance/{id}`, `/attendance/summary`
- **Staff / timeclock** -- `/staff`, `/timeclock`, `/timeclock/staff/{id}`, `/timeclock/in`, `/timeclock/out`
- **Classroom** -- `/classroom/config`, `/classroom/assignments`, `/classroom/assignments/{id}/flags`, `/classroom/teachers`, `/classroom-notes`
- **Tasks/Journal** -- `/tasks`, `/journal`
- **Library** -- `/library/books`, `/library/loans`, `/library/checkout`, `/library/return`
- **Pipeline** -- `/pipeline/summary`, `/families`, `/family`
- **Absences** -- `/absences`
- **Notifications** -- `/notifications`, `/notifications/count`
- **Other** -- `/level-up`, `/schedule-overrides`, `/center/settings`

### 8.3 Cross-check vs REST API v2.44.1 (102 endpoints)
**I do not have the v2.44.1 reference doc in-repo.** The inventory above is frontend-side only. To complete this check, Steve or Nicole should diff this list against the authoritative WP plugin endpoint list. **Question for Steve.**

Candidate dead-code endpoints (to verify): any `cb/v1` endpoint not in the list above. Candidate undocumented endpoints consumed by frontend: none obvious; all endpoint strings look consistent with the naming convention.

### 8.4 Raw fetch drift (bypassing `api.ts`)
12 raw `fetch()` calls outside `src/lib/api.ts`:
- [`src/lib/auth.ts:43`](src/lib/auth.ts#L43) -- direct WP call (server-side, OK for NextAuth)
- [`src/views/attendance/AttendancePage.tsx:587`](src/views/attendance/AttendancePage.tsx#L587) -- calls `/api/attendance/missed-you`
- [`src/views/me/MePage.tsx:226`](src/views/me/MePage.tsx#L226) -- calls `/api/staff/password`
- [`src/views/staff/StaffPage.tsx:86,201,295,372`](src/views/staff/StaffPage.tsx#L86) -- staff CRUD
- 4 backend routes (`/api/staff/*`, `/api/attendance/missed-you`) calling WP directly -- server-side, OK

**Recommendation:** add `api.staffAdmin.create/update/resetPassword/changePassword` methods to `src/lib/api.ts` so all frontend fetches are uniform.

### 8.5 Error handling
- `ApiClientError` class defined in [`api.ts:116`](src/lib/api.ts#L116) carries `status` + `message`.
- Duck-typed 404 checks: [`useAttendance.ts:57`](src/hooks/useAttendance.ts#L57), [`useRows.ts:104`](src/hooks/useRows.ts#L104). Both should use `err instanceof ApiClientError && err.status === 404`. **Medium.**
- No retry/backoff logic in hooks. SWR default (`errorRetryCount: 5`) applies globally.
- [`usePersistentItems.ts:17,26`](src/hooks/usePersistentItems.ts#L17) -- silent `console.error` catch with no user-visible feedback.
- Most views display error strings but do not distinguish 403/404/500/network. Minor UX issue.

### 8.6 Turbopack chunk boundary gotcha
No sign of duck-typing on `err.message.includes('Unexpected token')` or similar. Clean.

### 8.7 Double-encoded-JSON flags gotcha
Correctly handled at [`useRows.ts:31-34`](src/hooks/useRows.ts#L31): `typeof a.flags === 'string' ? JSON.parse(...) : a.flags`. Try/catch falls back to null. Good.

---

## 9. SWR Patterns

### 9.1 Key formats
All keys are plain strings with `kebab-case-${id}` convention:
- `'students'`, `'all-students'`, `'student-${id}'`, `'student-contacts-${id}'`
- `'attendance-${date}'`, `'attendance-active'`
- `'classroom-assignments-${date}'`, `'classroom-teachers-${date}'`
- `'notifications-${staffId}'`, `'notifications-count-${staffId}'`
- `'timeclock-${date}'`, `'staff-slots-${...}'` (wildcard mutated)
- `'library-books'`, `'library-loans-outstanding'`, `'library-loans-*'`
- `'persistent-items-${studentId}'`, `'notes-${studentId}-${date}'`

No array keys. Consistent. Good.

### 9.2 Polling intervals
- 5s: `useRows`, `useNotifications`, `useActiveAttendance` (multi-tablet sync) -- correct.
- 10s: `useAttendance`, `useTimeclock` -- reasonable.
- None on read-heavy hooks -- correct (SWR focus/reconnect revalidation is enough).

### 9.3 Mutate patterns
- Optimistic updates in [`useRows.ts:71-82, 92-97, 119-126`](src/hooks/useRows.ts#L71) with `revalidate: false` followed by a real revalidate after network. Good pattern.
- Wildcard mutate with key-function predicate in [`useLibrary.ts`](src/hooks/useLibrary.ts) and [`useStaffSlots.ts`](src/hooks/useStaffSlots.ts). Fine.

---

## 10. TypeScript Health

### 10.1 Compilation
`npx tsc --noEmit` **passes with 0 errors.** Strict mode is on (`"strict": true` in [tsconfig.json:7](tsconfig.json#L7)).

### 10.2 Escape hatches
- **Zero `@ts-ignore`** in src/.
- **Zero `@ts-expect-error`** in src/.
- **Two explicit `any`s**: both in [`src/components/students/ProgressMeetingSection.tsx:136,141`](src/components/students/ProgressMeetingSection.tsx#L136) -- Recharts tooltip function signature. Recharts types are notoriously loose; acceptable.

### 10.3 Type safety notes
- [`src/hooks/useStudents.ts:26`](src/hooks/useStudents.ts#L26) strips `primary_contact`/`billing_contact` nested objects with a cast. Comment explains why ("React error #310 when embedded Contact rendered directly"). Good documentation.
- Several hooks cast errors as `unknown` then probe (`const e = err as Record<string, unknown>`). Safe but verbose; could use `instanceof ApiClientError`.

---

## 11. Build & Deploy Health

### 11.1 Vercel
- [`vercel.json`](vercel.json) only sets CSP headers. Uses default build (`next build`), default Node runtime. No `.vercelignore`.
- No `outputFileTracingIncludes` / custom build hooks. Clean.

### 11.2 Git / env hygiene
- Working tree is clean (`git status`).
- No `.env*` files tracked (`git ls-files | grep env` returns nothing; assumed clean based on clean status).
- `CLAUDE.md` bans "Hardcode API credentials" -- compliant.

### 11.3 PWA
- [`public/manifest.json`](public/manifest.json) present: name, short_name, start_url, display standalone, theme_color, 512/1024 icons.
- [`src/app/layout.tsx:15-30`](src/app/layout.tsx#L15) sets `appleWebApp.capable`, `statusBarStyle: 'black-translucent'`, `theme-color: #355caa`, apple-touch-icon.
- `viewport` configured (but see a11y gap).

### 11.4 Dependency vulnerabilities (`npm audit`)
4 vulnerabilities (1 moderate, 3 high):
- **`next@16.1.6`** -- 6 advisories including `GHSA-q4gf-8mx6-v5v3` (high, DoS via Server Components, CVSS 7.5), `GHSA-ggv3-7p47-pfv8` (HTTP request smuggling in rewrites), `GHSA-mq59-m269-xvcx` (Server Actions CSRF via null origin), others. **Fix:** `next@16.2.4` (non-major). **Critical.**
- `brace-expansion` (moderate, dev-only via eslint) -- ReDoS.
- `flatted` (high, dev-only via eslint) -- unbounded recursion / prototype pollution.
- `picomatch` (high, dev transitive) -- ReDoS + glob method injection.

All are `fixAvailable: true` via `npm audit fix`.

---

## 12. Technical Debt

### 12.1 TODO/FIXME markers
Only **two** markers in the entire codebase:
- [`src/views/students/StudentProfilePage.tsx:616`](src/views/students/StudentProfilePage.tsx#L616) -- `TODO: Starting Grade not in cb_students schema yet -- needs db column or ClickUp sync`
- [`src/components/attendance/ExcusedAbsenceModal.tsx:20`](src/components/attendance/ExcusedAbsenceModal.tsx#L20) -- `TODO: These should come from center settings in the future`

### 12.2 Console statements in production
8 `console.error` instances (all legitimate error logging):
- [`src/lib/auth.ts:38`](src/lib/auth.ts#L38) -- "Missing WP API credentials" boot warning
- [`src/hooks/usePersistentItems.ts:17,26`](src/hooks/usePersistentItems.ts#L17) -- persistence failures
- [`src/hooks/useScheduleOverrides.ts`](src/hooks/useScheduleOverrides.ts) -- schedule override errors
- [`src/views/attendance/AttendancePage.tsx`](src/views/attendance/AttendancePage.tsx) -- attendance errors (2 sites)
- [`src/views/rows/RowsPage.tsx:239,260,261,288,289`](src/views/rows/RowsPage.tsx#L239) -- flag update errors

No `console.log` or `console.warn`. No stray debug prints. Clean.

### 12.3 Deprecated React patterns
- **Class components:** 1 -- [`ErrorBoundary`](src/components/ErrorBoundary.tsx) -- required (error boundaries need class components). Uses modern `getDerivedStateFromError`. Clean.
- **UNSAFE_ lifecycles:** none.
- **findDOMNode:** none.
- **dangerouslySetInnerHTML:** none.
- **createPortal:** 1 use in [`AttendancePage.tsx:4`](src/views/attendance/AttendancePage.tsx#L4). Standard pattern.

### 12.4 Unused deps
Quick scan of `package.json`: every dep is imported somewhere. Clean.

### 12.5 Build warnings
TS compile clean. ESLint config is lightweight (`next/core-web-vitals` + `next/typescript`). No custom rules. Running `npm run lint` was not executed here (out of scope for read-only unless explicitly requested); recommend running it as part of CI.

---

## 13. Accessibility

### 13.1 Compliant items
- Skip link at [`layout.tsx:42`](src/app/layout.tsx#L42) + `.skip-link:focus` style.
- Global `*:focus-visible` ring at [`globals.css:76-79`](src/styles/globals.css#L76).
- All `<img>` have `alt` attributes.
- All form inputs have associated `<label htmlFor>` (login page) or `aria-label` (search inputs, dropdown triggers).
- No heading-hierarchy skips detected (page titles delegated to components, h1 counts per page are 0-1).
- No `alert/confirm/prompt` calls.
- `aria-current="page"` on Sidebar links ([`Sidebar.tsx:72`](src/components/layout/Sidebar.tsx#L72)).
- `aria-label` on notification badge and mobile menu toggle.
- Inputs prevented from triggering iOS zoom at ≤1024px.

### 13.2 Issues
- **Critical:** `maximumScale: 1` + `userScalable: false` in viewport ([`layout.tsx:11-12`](src/app/layout.tsx#L11)). Breaks WCAG 2.2 SC 1.4.4 Resize Text. Remove both or set `maximumScale: 5, userScalable: true`.
- **Low:** 86 `outline: none` declarations in CSS modules. All redeemed by global `:focus-visible`, but visually noisy and error-prone if a future dev removes the global rule.
- **Low:** No `aria-live` region for SWR-driven updates (attendance table mutations, notification banner). Screen reader users would miss async state changes. Consider adding a polite live region for the notification banner.

### 13.3 Mobile-specific
- BottomNav correctly uses **inline `style={{ position: 'fixed' }}`** at [`BottomNav.tsx:88`](src/components/layout/BottomNav.tsx#L88), matching the documented CSS-Modules + fixed workaround. Confirmed.
- Touch targets >=44px (verified via tokens and Button.module.css).
- No hover-triggered popups (no `onMouseEnter` -> `setState -> modal open` patterns found).
- `touch-action: none` scoped to draggable seat slots in [`SeatSlot.module.css`](src/views/rows/SeatSlot.module.css). Appropriate.

---

## 14. Severity-Ranked Action List

### Critical
1. **Upgrade Next.js** `16.1.6 -> 16.2.4`. Runs `npm audit fix` or explicit `npm i next@16.2.4`. Resolves 6 advisories incl. high-severity DoS and CSRF bypasses. Location: [`package.json:14`](package.json#L14).
2. **Add role-gated wrapper on admin pages**. Create an `<AdminGate>` client component that reads `useSession().user.role` and `redirect('/kiosk')` or renders a 403 for non-admins; wrap it around [`/staff`](src/app/staff/page.tsx), [`/settings`](src/app/settings/page.tsx), [`/intelligence`](src/app/intelligence/page.tsx), [`/onboarding`](src/app/onboarding/page.tsx), [`/progress`](src/app/progress/page.tsx).
3. **Reconcile audit-prompt vs CLAUDE.md** on styling stack (audit says Tailwind; CLAUDE.md forbids it). Ask Steve which is authoritative.
4. **Remove `userScalable: false` / `maximumScale: 1`** from [`src/app/layout.tsx:11-12`](src/app/layout.tsx#L11). WCAG 1.4.4 violation.

### High
5. **Eliminate hardcoded hex colors in TSX** (102 occurrences, 17 files). Extend `tokens.css` with status + chart palette tokens (or a JS mirror) and replace literals. Top files: IntelligencePage, ProgressPage, PipelinePage, NotificationBanner, BottomNav, KioskPage, CenterSetupPage.
6. **Fix ~35 hardcoded px in CSS modules**. Target files: AddStudentPicker, ClassroomOverview, ClassroomSetup, EmptyState, LinkPickerModal, SearchInput, NotificationBanner, StaffDetailModal, UndoToast. Replace with `var(--space-*)` or `rem`.
7. **Fix hardcoded hex in CSS modules** (`#eab308`, `#f59e0b`). Use `var(--yellow)` or add `--amber` token.
8. **Remove invalid `X-Frame-Options: ALLOWALL`** header from [`next.config.ts:14-15`](next.config.ts#L14). Rely on CSP `frame-ancestors`.
9. **Add rate-limiting to login** (e.g. Upstash Ratelimit or a simple per-IP Redis counter). Prevent credential stuffing.

### Medium
10. **Consolidate staff admin endpoints into `src/lib/api.ts`** (remove raw `fetch()` calls in [`StaffPage.tsx`](src/views/staff/StaffPage.tsx) and [`MePage.tsx`](src/views/me/MePage.tsx)).
11. **Replace duck-typed 404 checks** in [`useAttendance.ts:57`](src/hooks/useAttendance.ts#L57) and [`useRows.ts:104`](src/hooks/useRows.ts#L104) with `err instanceof ApiClientError && err.status === 404`.
12. **Centralize WP credentials module**: 6 route files duplicate `process.env.WP_API_URL/USER/PASSWORD` reads. Move to `src/lib/wp.ts` helper.
13. **Hardcoded logo URL** in [`KioskPage.tsx:298`](src/views/kiosk/KioskPage.tsx#L298) -- move asset to `/public/images/` or proxy.
14. **Migrate font loading** from Google Fonts `@import` to `next/font` for better perf and CLS.
15. **Add `aria-live` region** for NotificationBanner and attendance-table mutations.
16. **Address 2 TODOs**: add `starting_grade` column to `cb_students` schema and hook up center-settings for ExcusedAbsenceModal time slots.

### Low
17. **Remove redundant `outline: none`** from CSS modules (86 declarations) -- global `:focus-visible` already handles visible focus.
18. **Normalize h1 font-size** in [`globals.css:35`](src/styles/globals.css#L35) to a `--text-*` token.
19. **Add `h4` rule** using `var(--font-script)` per CLAUDE.md, or remove the rule from CLAUDE.md if unused.
20. **Replace `<img>` with `next/image`** on login page.
21. **Run `npm run lint`** as a CI gate (currently not part of any script beyond `lint`).

---

## Appendix A -- Open questions

**For Nicole (design / scope):**
- Is the Playful Scholar sub-system in scope for this repo? No traces of Andika font, `#FAFAFA` backgrounds, or 24px radius cards. If it is, where does it live?
- Is the Oooh Baby `h4` rule currently unused, or missing from `globals.css`?
- Status / chart colors in IntelligencePage and ProgressPage (gold/silver/bronze, red/green/amber) -- should these become new design tokens? They don't map cleanly to existing `--primary/--secondary/--accent`.

**For Steve (implementation / spec):**
- The audit prompt says "confirm uses Tailwind" but CLAUDE.md forbids it. Which spec is canonical?
- Is there a REST API v2.44.1 reference doc in the claude.ai project? Endpoint dead-code check requires it.
- Is tablet-only use case the reason `userScalable: false` was set? If so, we should still leave pinch-zoom on for WCAG compliance.
- Intentional choice to have admin pages ungated on the client, or oversight?

---

_End of report._
