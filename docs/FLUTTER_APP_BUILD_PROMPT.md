# Master prompt: MTESAttandance Flutter app (iOS & Android)

Use this document as a **single specification prompt** when building or scoping a **Flutter** application that **parity-matches** the existing Next.js web app (`MTESAttandance`). It covers **all flows**, **screens**, **states**, and **UI elements** the mobile app must implement.

**Companion reference:** `docs/WEB_APP_FEATURES.md` (route/API map from the web codebase).

---

## 1. Objective

Build a **production-ready Flutter app** for **iOS** and **Android** that:

- Uses the **same backend** as the web app: **Firebase Authentication**, **Firestore**, and **HTTPS API routes** on the deployed Next.js server (`/api/*` with `Authorization: Bearer <Firebase ID token>`).
- Implements **every employee and admin workflow** described below, with **loading**, **error**, **empty**, and **success** states.
- Supports **light/dark theme**, **accessibility** (labels, contrast), and **localization-ready** strings (English first).
- Uses **native GPS** (high accuracy) and **camera** for selfie capture, then **upload** via `/api/upload` before attendance APIs.

---

## 2. Platform & project requirements

| Requirement | Detail |
|-------------|--------|
| **Flutter** | Stable channel; Dart 3.x. |
| **iOS** | Minimum iOS version per App Store policy; location & camera usage descriptions in `Info.plist`. |
| **Android** | `minSdk` / `targetSdk` per Play policy; `AndroidManifest` permissions for fine location, camera, notifications if used. |
| **State management** | Choose one (Riverpod, Bloc, Provider) — document choice in README. |
| **Navigation** | Declarative routes (e.g. `go_router`) with deep links where useful (`/check-in`, `/day/:date`). |
| **Env** | `BASE_URL` for API origin; Firebase options from `flutterfire configure` or env JSON. |

---

## 3. Authentication & session

### 3.1 Screens & elements

| Screen | Elements | States |
|--------|----------|--------|
| **Splash / bootstrap** | App logo, optional version | Loading Firebase auth state; error if Firebase init fails. |
| **Login** | Email field, password field, “Sign in”, “Continue with Google”, link to Sign up, “Forgot password” if supported | Loading on submit; inline error (wrong password, network); success → role-based home. |
| **Sign up** | Name, email, password, confirm, submit, link to Login | Validation errors; loading; success → verify email or straight to Work if allowed. |
| **Logged-out** | Any protected route redirects to Login | — |

### 3.2 Behavior

- Persist session; **refresh ID token** before API calls (handle 401 → re-auth).
- After login, load **user profile** (role: `employee` | `admin` | `super_admin`) from Firestore or your API to build **navigation**.
- **Sync device timezone** to server: `POST /api/user/timezone` (mirror web `BrowserTimeZoneSync`).

---

## 4. Global shell (all signed-in users)

### 4.1 Layout

- **App bar:** Title (contextual), actions: **Notifications** (badge if unread), **Account menu** (profile, settings, sign out), optional **theme toggle**.
- **Navigation:**
  - **Employee:** bottom nav or drawer: **Work**, **Overtime**, **Friend**, **Assigned**, **Calendar**; overflow: **Settings**, **Home** (marketing optional).
  - **Admin:** add section: **Overview**, **Live map**, **Workers**, **Assignments**, **Sites**, **Overtime**; **Team** only if `super_admin`.
- **Sign out:** Firebase `signOut` + navigate to Login.

### 4.2 Notifications

- List from `GET /api/notifications`; mark read `PATCH`.
- Parse actions (e.g. “Go to Work”) → navigate to Work with assignment context if applicable.

---

## 5. Employee flows (complete)

### 5.1 Work hub (primary)

**Purpose:** Check-in, site switch, check-out, live tracking.

**Screen sections (scrollable or tabs):**

1. **Assignment banner** (conditional)  
   - When user has assignment / notification context: short message + suggested sites.  
   - **Empty:** hidden.

2. **Check-in card**  
   - **Site picker:** searchable list; **custom site** entry if API allows (same rules as web).  
   - **Primary button (3-step):**  
     - Step A: “Start” → request **GPS** (multi-sample / best accuracy) + open **camera preview**.  
     - Step B: “Capture selfie” → still image → preview.  
     - Step C: “Submit check-in” → upload image `POST /api/upload` → `POST /api/checkin` with `siteId`, lat, lng, `accuracyM`, `photoUrl`.  
   - **Geofence error:** show distance vs radius; allow retry GPS.  
   - **Conflict:** already checked in → modal + link to Site switch / Check out.  
   - **Change site:** clearing site selection **must** clear GPS + selfie + step (fresh capture for new site).  
   - **Selfie preview:** show image + **Retake** (X) → clears selfie, reopens camera (keep GPS until site changes).  
   - **Loading** on each async step; **disabled** primary when prerequisites missing.

3. **Site switch card** (only if **open session** today — subscribe Firestore `attendance/{uid}_{day}` or poll)  
   - Hide entire card if not checked in or no open session.  
   - **New site** picker (exclude current site).  
   - Same GPS + selfie + retake + submit → `POST /api/site-switch`.  
   - **Business rule:** min time on current site → show server error if too early.  
   - Site change resets capture state like check-in.

4. **Check-out card**  
   - Site picker (**no** custom site).  
   - Same GPS + selfie + retake + submit → `POST /api/checkout`.

5. **Live tracking**  
   - Toggle; when on and **on shift**, periodic `POST /api/live-tracking` with position.  
   - **Battery:** respect platform background limits; document if background tracking is deferred or foreground-only.

**Quick actions row (optional):** shortcuts to Overtime, Friend, Assigned, Calendar.

---

### 5.2 Overtime (employee)

- List/create **overtime requests** (fields mirror web: date, site, reason, etc.).
- **Status:** pending / approved / rejected (as API returns).
- For **approved** requests: cards for **Overtime check-in** and **Overtime check-out** — each: GPS + selfie + upload + `POST /api/overtime/check-in` or `POST /api/overtime/check-out` with `requestId`.

**States:** loading list, empty (“no requests”), error, form validation errors, success toasts.

---

### 5.3 Friend check-in

- `GET /api/employee/worker-directory` → dropdown/search of coworkers.
- **Must select worker** before showing the same three panels (check-in / switch / out) in **proxy mode** (`forWorkerId` / `proxyForUid` in API bodies per web).
- Explain in UI: records go to **selected worker**; server enforces shared site or admin.

---

### 5.4 Assigned

- Show admin-assigned sites and copy/links to Work.

---

### 5.5 Calendar

- Month grid; marks days with attendance (from API or Firestore aggregation).
- Tap day → **Day detail** screen.

---

### 5.6 Day detail (`YYYY-MM-DD`)

- `GET /api/attendance/day-detail` — timeline: check-in, switches, check-out, photos, GPS metadata.
- **States:** loading, invalid date, forbidden, empty day.

---

### 5.7 Today (optional tab)

- Summary for **today** in work TZ (`/api/attendance/today` if used): timeline, hints.

---

## 6. Admin flows (complete)

**Gate:** Show admin navigation only if role is `admin` or `super_admin`. **Team** only for `super_admin`.

| Screen | What to build |
|--------|----------------|
| **Overview** | Dashboard stats (`GET /api/admin/dashboard-stats`); pending check-outs card; **Quick search** (workers + sites); **Assign sites** form (`POST /api/admin/assign-sites`). |
| **Live map** | Map with sites + live worker positions (`GET /api/admin/live-tracking`, sites from `GET /api/sites`). |
| **Workers** | Table/list: search, open user, **password reset link** (`POST /api/admin/password-reset-link`), open **calendar** / **day attendance** for worker. |
| **Worker day** | `/api/admin/worker-day-detail?workerId=&day=` — same detail components as employee admin view: timeline, photos. |
| **Assignments** | Matrix/list of worker ↔ site assignments (`AdminAssignmentsPanel` parity). |
| **Sites** | Browse all sites; create/edit; map pin; **site insights** (`GET /api/admin/site-insights`); geocode (`GET /api/geocode`) where web uses it. |
| **Overtime (admin)** | Approve/deny/filter requests; align with `/api/overtime` endpoints. |
| **Team** | Promote/demote admin (`/api/admin/promote-admin`, `/api/admin/demote-admin`) — super_admin only. |

**States:** role-denied screen if user hits admin route as employee.

---

## 7. Settings

- **Profile:** edit display name (and fields mirror `SettingsProfileEditor` web).
- **Account delete:** type `DELETE MY ACCOUNT` confirmation → `POST /api/account/delete` → sign out.
- **App version** footer optional.

---

## 8. Branding & UX

- **App name:** MTESAttandance; **MTES** wordmark color (blue / red in dark per brand); **by Constcode** line where marketing requires.
- **Icons:** Use generated app icons aligned with web `/public/branding` / `app/icon.png`.
- **Empty states:** Every list with illustration or short copy.
- **Errors:** Network toast + retry; Firebase/API message when available.

---

## 9. API client rules (Flutter)

1. Base URL from env; only HTTPS.
2. Every request: `Authorization: Bearer <idToken>`.
3. Upload selfie: send base64 or multipart per **`/api/upload`** contract in `app/api/upload/route.ts`.
4. Parse errors consistently (`{ error: string }`).
5. Throttle live-tracking pings (e.g. 45s like web) to save battery.

---

## 10. Permissions & copy (store listings)

- **Location:** “Used to verify your check-in and check-out at work sites.”
- **Camera:** “Used to capture a verification selfie at check-in and check-out.”
- **Notifications (optional):** “Alerts for assignments and attendance updates.”

---

## 11. Acceptance checklist (release)

- [ ] Login / sign-up / Google / sign-out  
- [ ] Employee: check-in, switch, check-out with geofence + retake + site-change reset  
- [ ] Live tracking toggle behavior documented  
- [ ] Overtime request + overtime in/out  
- [ ] Friend proxy flow  
- [ ] Calendar + day detail  
- [ ] Admin: overview, live, workers, assignments, sites, overtime, team (super_admin)  
- [ ] Settings + delete account  
- [ ] Notifications list + mark read  
- [ ] Timezone sync  
- [ ] Light/dark theme  
- [ ] iOS + Android release builds  

---

## 12. How to use this file as an LLM prompt

Paste sections **1–11** (or the full file) into your AI tool with:

> “Implement a Flutter 3 app for iOS and Android following this specification. Use Firebase Auth + Firestore + REST APIs as described. For each screen, output folder structure, models, repositories, and UI widgets. Match API routes and body fields to the Next.js repo in `app/api/`.”

Attach or reference **`docs/WEB_APP_FEATURES.md`** for the **exact API route list**.

---

*Product: MTESAttandance · Constcode*
