# RetinaVision AI — Frontend

A React + Vite app for the DR Screening workflow, matching the 6 wireframe
pages from the sketch/HTML reference, with a full Originkit hero/features
landing page, subtle page-entrance animations (Framer Motion via `motion/react`),
and Tailwind CSS v4. Connected to the real `../backend` Express API, including
real login.

## Run it

```bash
npm install
npm run dev
```

Vite proxies `/api` and `/uploads` to `http://localhost:5001` (see
`vite.config.js`) — start the backend first:

```bash
cd ../backend && npm install && cp .env.example .env && npm run dev
```

### Demo login

```
Clinician ID: PHC-RAMPUR-102
Password:     password123
```

(seeded in `backend/src/models/User.js` — replace with a real user table
whenever you're ready.) You can log in either from the "Login / Register"
button in the sticky header (visible on every page except Landing), or from
the "Login" link in the Landing page's own hero nav — both open the same
modal.

## Folder structure

```
src/
  api/                      thin fetch wrappers around the backend REST API
    client.js               apiFetch() - attaches auth token, parses JSON, throws on error
    auth.js                 login(), me()
    patients.js             getPatients(), getPatientById(), createPatient()
    analysis.js             getAnalysis(), uploadAnalysis()
    specialists.js          getSpecialists(), sendReferral()

  data/                     legacy hardcoded JSON, kept only as a reference for
                             the shape of patients/analysis/specialists (mirrors
                             the seed data in backend/src/models) - not imported
                             anywhere anymore now that the app calls the API.

  context/
    AuthContext.jsx         real session state: login()/logout(), token persisted
                             in localStorage, session restored via GET /api/auth/me,
                             also owns the login modal's open/close state
    AppContext.jsx          patients/specialists/active analysis, backed by the
                             API modules above (addPatient, analyzeImage, sendReferral)

  components/
    Header.jsx               sticky nav bar (all pages except Landing), shows
                              Login/Logout depending on auth state
    ProtectedRoute.jsx        wraps a page; if not logged in, opens the login modal
    FadeIn.jsx                shared fade-and-rise entrance wrapper used by every page
    PatientTable.jsx          table + row for the Database page
    GradeBadge.jsx            colored pill for a DR grade (0-4)
    ReportTabs.jsx             the Analysis / Result-Grading / Report tab bar
    SpecialistCard.jsx         single specialist row + "Send" button
    tabs/
      AnalysisTab.jsx          upload + quality-check block
      ResultsTab.jsx           grade badge + image viewer + lesion summary
      ReportTab.jsx            executive summary + referral CTA
    modals/
      Modal.jsx                generic modal shell
      AddPatientModal.jsx      "Add New Patient" form -> POST /api/patients
      AuthModal.jsx            "Login / Register" form -> POST /api/auth/login
    originkit/                 the Landing page's hero + features sections
                                (hero-01, features-01, and their ui/ subcomponents)

  pages/
    LandingPage.jsx           Originkit hero + features + stats + 4 flow cards (public)
    DatabasePage.jsx          sidebar grade filters + search + patient table (protected)
    UserReportPage.jsx        hosts the 3 report tabs for the active patient (protected)
    GradingDetailPage.jsx     Grade / Confidence / Grad-CAM detail (protected)
    PdfReportPage.jsx         printable report layout (protected)
    SpecialistsPage.jsx       referral list with Send buttons (protected)

  App.jsx                     routes: Landing renders standalone (its own hero nav),
                               everything else renders inside the sticky-Header layout
                               via an <Outlet>. Wraps everything in
                               AuthProvider > AppProvider and renders <AuthModal />
                               globally so both the header and the hero nav can open it.
  main.jsx                    entry point
```

## Routes

| Path            | Page                        | Requires login? |
|-----------------|------------------------------|------------------|
| `/`             | Landing (own hero/nav)       | No               |
| `/database`     | Patient database/registry   | Yes              |
| `/report`       | User report (3 tabs)        | Yes              |
| `/grading`      | Diagnostic/Grad-CAM detail  | Yes              |
| `/pdf-report`   | Printable report preview    | Yes              |
| `/specialists`  | Referral network             | Yes              |

Visiting a protected route while logged out shows a short "You need to log in"
message and automatically opens the login modal.

## How auth works

1. `AuthModal` submits `{ clinicianId, password }` to `POST /api/auth/login`.
2. On success, the backend returns a JWT + user info; the token is stored in
   `localStorage` (`drscreening_token`) and every subsequent `apiFetch` call
   attaches it as `Authorization: Bearer <token>`.
3. On page reload, `AuthContext` calls `GET /api/auth/me` with the stored
   token to confirm it's still valid before treating the user as logged in.
4. `ProtectedRoute` reads `isAuthenticated` from `AuthContext` and opens the
   login modal if it's false.
5. `AuthModal` is rendered once, globally, in `App.jsx` (not inside `Header`)
   specifically so the Landing page's own hero nav - which has no `<Header>`
   - can also trigger it via `useAuth().openAuthModal()`.

## Notes for whoever builds on this

- Tailwind v4 is wired up via `@tailwindcss/vite` in `vite.config.js` (no
  separate `tailwind.config.js`/`postcss.config.js` needed) — restyle freely.
- `AppContext.jsx` and `AuthContext.jsx` are the only places holding state —
  everything else is presentational. Swap the `src/api/*.js` calls for a
  different backend/base URL without touching pages or components.
- The MATLAB pipeline result shape (`status`, `grade`, `confidence`,
  `maCount`, `hemCount`, `exudateCount`, `gradcam_url`, `enhanced_url`) flows
  straight through from `backend/src/utils/runMatlabPipeline.js` — see
  `src/data/analysisResults.json` for the reference shape.
- `FadeIn` wraps most page content for a consistent entrance animation; it
  respects `prefers-reduced-motion`.
