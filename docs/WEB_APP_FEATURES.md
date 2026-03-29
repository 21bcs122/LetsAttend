# MTESAttandance — Web app feature map (Flutter parity reference)

This document describes **routes**, **roles**, **screens**, and **backend APIs** as implemented in the Next.js web app. Use it to mirror behavior in Flutter.

**Stack (web):** Next.js, Firebase Auth, Firestore, Vercel Blob (selfie uploads), server APIs under `/api/*` (Bearer Firebase ID token).

**Roles:** `employee` | `admin` | `super_admin` (stored on user profile; super admin also gated by email in Firestore rules).

---

## Public & auth

| Route | Purpose |
|-------|---------|
| `/` | Marketing home: branding, hero copy, local time clock, feature cards, CTA. Signed-in users see shortcuts to Work dashboard sections. |
| `/login` | Email/password + Google sign-in (`(auth)/layout`). |
| `/signup` | Registration. |

**Auth:** Firebase Auth; all dashboard routes wrapped in `RequireAuth`. Admin-only areas may use `RequireRole`.

---

## Global dashboard shell (signed-in)

- **Layout:** `DashboardChrome` — sidebar + top bar on all `/dashboard/*` routes.
- **Sidebar:** Employee nav links (role `employee` or everyone), **Admin** section only if `admin` or `super_admin`.
- **Top bar:** Theme toggle, notifications (when signed in), account menu.
- **Bottom of sidebar:** Settings, Home (`/`).
- **Timezone:** `BrowserTimeZoneSync` posts device TZ to `/api/user/timezone` for attendance day boundaries.

---

## Employee experience

### Navigation (sidebar)

| Label | Path |
|-------|------|
| Work | `/dashboard/employee` |
| Overtime | `/dashboard/employee/overtime` |
| Friend check-in | `/dashboard/employee/friend` |
| Assigned | `/dashboard/employee/assigned` |
| Calendar | `/dashboard/employee/calendar` |

Plus **Settings** (`/dashboard/settings`) and **Home** (`/`).

**Note:** Routes `/dashboard/employee/today` and `/dashboard/employee/detailwork/[date]` exist for “today” summary and day detail; they may be linked from calendar/UI rather than always in the sidebar.

---

### `/dashboard/employee` — **Work** (main hub)

**Purpose:** Daily attendance operations.

**Sections (anchors):**

1. **Assignment banner** (`EmployeeAssignmentBanner`) — context when coming from “Go to Work” notifications / assigned sites.
2. **Check in** (`#employee-check-in` — `EmployeeCheckInPanel`)
   - Select **work site** (searchable list + **custom site** flow for first-time site creation where allowed).
   - **Three-step primary button:** (1) Get **GPS** (high-accuracy multi-sample) + open camera → (2) **Capture selfie** (WebP) → (3) **Submit** uploads image via `/api/upload`, then `POST /api/checkin` with `siteId`, lat/lng, `accuracyM`, `photoUrl`.
   - Server validates **geofence** (Haversine vs site radius). On failure: “outside radius” UI.
   - **Change site** clears GPS + selfie so user must capture again for the new location.
   - **Retake** on preview: X button clears selfie and reopens camera (same GPS).
   - Optional URL flow: `?fromAssignment=1&assignmentSites=...` filters suggested sites / resets flow.
3. **Switch work site** (`#employee-site-switch` — `EmployeeSiteSwitchPanel`)
   - Only when session is **open** (checked in, not finally checked out). Listens to Firestore `attendance` doc for today.
   - Pick **new** site (excludes current site), GPS + selfie, `POST /api/site-switch` — records segment check-out from previous site, check-in at new site; **day stays open**.
   - Rule: **minimum time on current site** before switch (enforced server-side).
   - Same retake + site-change reset behavior as check-in.
4. **Check out** (`#employee-check-out` — `EmployeeCheckOutPanel`)
   - Select site matching active session, GPS + selfie, `POST /api/checkout` — closes day.
   - No “custom site” on check-out (existing sites only).
5. **Live tracking toggle** (`LiveTrackingToggle`)
   - When enabled and user is on shift, periodic `POST /api/live-tracking` with GPS (browser geolocation).

**Quick links row:** Jump to anchors + Overtime, Friend, Assigned, Calendar.

---

### `/dashboard/employee/overtime` — **Overtime**

**Component:** `EmployeeOvertimeRequestPanel`

- Create **overtime requests** (date, site, reason, etc.) — admin approves elsewhere.
- View request status.
- For **approved** requests: **Overtime check-in** and **Overtime check-out** via `OvertimeAttendanceCapture` — GPS + selfie, `POST /api/overtime/check-in` or `POST /api/overtime/check-out` with `requestId`, `photoUrl`, coordinates.

---

### `/dashboard/employee/friend` — **Friend check-in**

**Component:** `FriendAttendancePage`

- Load **coworker directory** via `GET /api/employee/worker-directory`.
- User selects a **worker**; then embedded **Check in / Site switch / Check out** panels run with `proxyForUid` so API calls attribute attendance to the **selected worker** (server enforces shared site overlap or admin).

---

### `/dashboard/employee/assigned` — **Assigned**

**Component:** `EmployeeAssignedPage`

- Shows **admin-assigned work sites** and related info (links to Work).

---

### `/dashboard/employee/calendar` — **Attendance calendar**

**Component:** `AttendanceCalendar`

- Month grid of attendance days (worker’s calendar / time zone).
- Tap day → navigates to **day detail** (`/dashboard/employee/detailwork/[date]`).

---

### `/dashboard/employee/today` — **Today** (optional deep link)

**Component:** `EmployeeTodayActivity`

- Timeline / summary for **current calendar day** in work TZ: check-in, switches, check-out, hints.

---

### `/dashboard/employee/detailwork/[date]` — **Day detail**

- `date` = `YYYY-MM-DD`.
- Loads day payload via `GET /api/attendance/day-detail` (auth).
- **Component:** `AttendanceDayDetailView` — timeline, GPS/selfie metadata, photos.

---

## Admin & super admin experience

### Navigation (sidebar — visible if `admin` or `super_admin`)

| Label | Path |
|-------|------|
| Overview | `/dashboard/admin` |
| Live map | `/dashboard/admin/live` |
| Workers | `/dashboard/admin/workers` |
| Assignments | `/dashboard/admin/assignments` |
| Sites | `/dashboard/admin/sites` |
| Overtime | `/dashboard/admin/overtime` |
| Team | `/dashboard/admin/team` — **`super_admin` only** |

---

### `/dashboard/admin` — **Overview**

- **AdminSearchHub:** Search workers and sites; open modals (worker calendar link, site pipeline).
- **AdminAssignSitesForm:** Assign sites to workers (`/api/admin/assign-sites`).
- **AdminDashboardStats:** `GET /api/admin/dashboard-stats` — today’s metrics.
- **AdminPendingCheckoutsCard:** Workers still checked in / pending check-out.

---

### `/dashboard/admin/live` — **Live map**

**Component:** `LiveWorkersMap`

- Loads sites from `GET /api/sites`.
- Shows **live worker positions** (polls / admin live-tracking data — see `/api/admin/live-tracking`).

---

### `/dashboard/admin/workers` — **Workers**

**Component:** `AdminUsersPanel`

- User directory, **promote/demote admin** (APIs: `/api/admin/promote-admin`, `/api/admin/demote-admin` — role-gated).
- **Password reset link** (`/api/admin/password-reset-link`).
- Per-worker **attendance calendar** links → day view:
  - `/dashboard/admin/workers/[workerId]/attendance/[date]` (same `AttendanceDayDetailView`, data from `GET /api/admin/worker-day-detail`).

---

### `/dashboard/admin/assignments` — **Assignments**

**Component:** `AdminAssignmentsPanel` (`RequireRole` admin+)

- Matrix / list of **which workers are assigned to which sites** for check-in eligibility.

---

### `/dashboard/admin/sites` — **Sites**

- Tabs: **All sites** (`AdminSitesPanel`) vs **Create site** (`AdminCreateSiteForm`).
- Query `?site=` can focus a site in browse tab.
- Site pipeline: overview, edit, photos, **site insights** (`/api/admin/site-insights`), overtime context, map.
- Uses `GET/POST` admin sites APIs and geocode (`/api/geocode`) for map/search.

---

### `/dashboard/admin/overtime` — **Overtime (admin)**

- Lists overtime **requests**, **approve/deny**, filters by worker/status.
- APIs: `GET/POST/PATCH` `/api/overtime`, `/api/overtime/[id]`, etc.

---

### `/dashboard/admin/team` — **Team & roles** (`super_admin` only)

**Component:** `AdminAddAdminForm`

- Add/remove **admin** users (per product rules).

---

## Settings (`/dashboard/settings`)

- Profile editor (`SettingsProfileEditor`) — display name, etc.
- **Delete account:** type confirmation phrase → `POST /api/account/delete` (Firebase user + data cleanup per server).

---

## Notifications

- **Top bar:** `NotificationsDropdown` — `GET/PATCH /api/notifications`.
- “Go to Work” CTA links to Work with assignment query params.

---

## PWA

- **Manifest:** `app/manifest.ts` — name, icons, `standalone`, theme colors.
- **Install prompt:** `PwaInstallPrompt`.
- Service worker via `@ducanh2912/next-pwa` (build artifacts).

---

## API summary (for Flutter clients)

All authenticated routes expect:

`Authorization: Bearer <Firebase ID token>`

unless noted.

| Method | Path | Role / notes |
|--------|------|----------------|
| POST | `/api/checkin` | Employee: check-in with GPS + `photoUrl` |
| POST | `/api/checkout` | Employee: check-out |
| POST | `/api/site-switch` | Employee: switch site mid-day |
| POST | `/api/upload` | Upload selfie base64 → Blob URL |
| GET | `/api/sites` | List sites (employee/admin) |
| POST | `/api/live-tracking` | Employee ping |
| GET | `/api/attendance/today` | Today summary |
| GET | `/api/attendance/day-detail` | Day detail (query params) |
| GET | `/api/employee/worker-directory` | Coworkers for friend flow |
| GET/PATCH | `/api/notifications` | Notifications |
| POST | `/api/user/timezone` | Save device timezone |
| GET | `/api/geocode` | Geocoding (admin/site flows) |
| GET | `/api/overtime` | List requests |
| POST | `/api/overtime` | Create request |
| GET/PATCH… | `/api/overtime/[id]` | Request by id |
| POST | `/api/overtime/check-in` | Overtime attendance in |
| POST | `/api/overtime/check-out` | Overtime attendance out |
| GET | `/api/admin/dashboard-stats` | Admin metrics |
| GET | `/api/admin/users` | Admin user list |
| GET | `/api/admin/worker-attendance` | Worker calendar data |
| GET | `/api/admin/worker-day-detail` | Admin day detail |
| GET | `/api/admin/live-tracking` | Admin live positions |
| GET | `/api/admin/site-insights` | Site analytics |
| GET/POST | `/api/admin/sites` | Admin site CRUD (as implemented) |
| POST | `/api/admin/assign-sites` | Assign sites to workers |
| POST | `/api/admin/promote-admin` | Super admin |
| POST | `/api/admin/demote-admin` | Super admin |
| POST | `/api/admin/password-reset-link` | Admin |
| POST | `/api/account/delete` | Current user |
| POST | `/api/cron/auto-checkout` | Cron (server secret) |

*Exact request/response bodies: inspect `app/api/*/route.ts` in the repo.*

---

## Data model (high level)

- **Users** — Firestore `users/{uid}`: role, name, email, time zone, assignments, etc.
- **Attendance** — `attendance/{workerId}_{calendarDayKey}`: check-in/out, segments, site switches, photos, GPS.
- **Sites** — site documents with lat/lng, radius, name.
- **Overtime** — request documents + overtime check-in/out stamps.

---

## Flutter implementation tips

1. **Auth:** Firebase Auth; attach ID token to all API calls.
2. **GPS:** Use platform geolocation with **high accuracy**; optionally mirror web’s multi-sample / best-accuracy logic.
3. **Camera:** Capture still → compress → upload to `/api/upload` → use returned URL in check-in/checkout/site-switch/overtime APIs.
4. **Roles:** After login, load user profile (or claims) to show **Employee** vs **Admin** navigation.
5. **Deep links:** Support same paths or in-app routes for `#employee-check-in`, calendar day, admin worker day.

---

*Generated from the codebase structure; when behavior changes, update this file or the Flutter spec alongside it.*
