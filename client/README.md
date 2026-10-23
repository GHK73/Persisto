# Persisto Client

This document describes the current React/Vite client and its connection to
the backend. It is a guide to the existing project ahead of the planned
overhaul.

## What it does

The client is a single-page React application for an online judge. It provides
signup/sign-in and password recovery, question browsing and detail pages,
code editing/running/submission, an authenticated dashboard, and admin
question-management screens.

The app is mounted with React Router. `App.jsx` checks any saved token on
startup, calls the backend's `/check-auth`, and provides navigation and route
content. `service/api.js` creates the shared Axios client and attaches the
saved bearer token to non-public requests.

## File map

### Application shell and styles

| File | Responsibility |
| --- | --- |
| `index.html` | Vite HTML entry point and React mount element. |
| `vite.config.js` | Configures Vite and the React plugin. |
| `package.json` | Client dependencies and `dev`, `build`, `lint`, and `preview` scripts. |
| `package-lock.json` | NPM dependency lockfile. |
| `eslint.config.js` | ESLint rules and browser globals. |
| `.gitignore` | Ignores client-local and deployment-generated files. |
| `.env.production` | Current production `VITE_API_URL` setting. Vite variables are included in the client bundle and must not contain secrets. |
| `vercel.json` | Rewrites paths to the SPA entry so client-side routes work on Vercel. |
| `README.md` | This client guide. |
| `public/vite.svg` | Default Vite public asset; currently template artwork. |
| `src/main.jsx` | Mounts React inside `StrictMode` and `BrowserRouter`; loads global styles. |
| `src/App.jsx` | Startup auth check, application navigation, route definitions, and route-level admin/auth UI checks. |
| `src/App.css` | Application-shell and welcome-page styles. |
| `src/index.css` | Global/base styles. |

### Shared components and API

| File | Responsibility |
| --- | --- |
| `src/components/Navbar.jsx` | Main navigation; shows authentication links or user/dashboard/admin links according to client state. |
| `src/components/Navbar.css` | Navigation styles. |
| `src/service/api.js` | Axios base URL, bearer-token interceptor, and client wrappers for auth, user, questions, code execution, submissions, and AI review. |

### Pages

| File | Responsibility |
| --- | --- |
| `src/pages/signup.jsx` | Signup form and OTP/account-creation flow. |
| `src/pages/signup.css` | Signup styles. |
| `src/pages/signin.jsx` | Sign-in form and successful-auth handling. |
| `src/pages/ForgotPassword.jsx` | Password-reset OTP and new-password flow. |
| `src/pages/dashboard.jsx` | Authenticated user dashboard and stats/profile information. |
| `src/pages/dashboard.css` | Dashboard styles. |
| `src/pages/AllQuestions.jsx` | Browse the question collection. |
| `src/pages/AllQuestions.css` | Browse-list styles. |
| `src/pages/QuestionsList.jsx` | Contributor's question list/management view. |
| `src/pages/AddQuestion.jsx` | Admin-facing question creation form and file uploads. |
| `src/pages/AddQuestion.css` | Question-creation styles. |
| `src/pages/UpdateQuestion.jsx` | Question update form. |
| `src/pages/QuestionDetail.jsx` | Question detail, code editor, run/submit actions, and code-review interaction. |
| `src/pages/QuestionDetails.css` | Question-detail styles. |
| `src/pages/AccessDenied.jsx` | Access-denied page component. |

## Routes and user journeys

| Client route | Screen / purpose |
| --- | --- |
| `/` | Welcome screen. |
| `/signup` | Create an account. |
| `/signin` | Sign in. |
| `/forgot-password` | Recover an account password. |
| `/dashboard` | User dashboard; unauthenticated users are shown the sign-in screen. |
| `/all-questions` | Browse all questions. |
| `/questions` | Contributor question list. |
| `/questions/add` | Admin-only question creation UI. |
| `/questions/:id` | View a problem and use the coding tools. |

At startup, the app reads `token` and `user` from `localStorage`. If a token is
present it validates it against the server; failed validation clears the
stored session. Logging out removes both stored values.

The question detail workflow requests problem details, lets the user choose a
supported language and enter code, then calls the API to run code with input,
submit against judge tests, or request an AI review. The API wrapper defines
the matching endpoints and sends the bearer token.

Questions include a time limit per test case (1, 2, or 5 seconds) and a memory
limit per submission (128, 256, 512, or 1024 MB). The detail page displays both.
Code execution is delegated by the backend to a private Docker runner service;
the browser never connects directly to the runner.

Question creation first requests a backend upload session, then uploads the
selected files directly to S3 using short-lived presigned URLs, and finally
asks the backend to verify and save the question. The browser requires no AWS
credentials. S3 bucket CORS must allow `PUT` from the client origin and the
`Content-Type` header; backend/API CORS does not configure S3 CORS.

## Backend connection and environment

The client reads `VITE_API_URL` from the Vite environment. The tracked
`.env.production` currently sets it to `https://backend.gunuru.in`. For local
development, create `client/.env.local` with the local API origin, for example:

```dotenv
VITE_API_URL=http://localhost:8000
```

For production, set `VITE_API_URL` in the build/deployment environment to the
backend's public origin. Restart Vite after changing local environment files,
and rebuild after changing production variables.

### Production API URL check

The configured production API URL was checked once with an unauthenticated
`GET https://backend.gunuru.in/check-auth` on 2026-10-23. The request did not
return an HTTP response from the test environment, so reachability could not
be confirmed. This result does not establish whether the service is down;
retry the check from the deployment environment if needed.

Only browser-safe configuration belongs in `VITE_*` variables: Vite embeds
these values in the static JavaScript bundle. Never put MongoDB credentials,
JWT secrets, SMTP passwords, AWS credentials, or Gemini API keys in the client.
Those belong only in the backend's private environment.

## Overhaul notes

- The API base URL is required; there is no safe default in `api.js`. Ensure it
  is set for every local, preview, and production build.
- Authentication currently uses local storage for the bearer token. Revisit
  token lifetime, XSS exposure, and session handling as part of the redesign.
- UI-only access checks are not a substitute for server-side authorization.
- Confirm all links/routes and page names while restructuring; the project has
  both `/questions` and `/all-questions` views.
- Remove the unused template artwork and refresh documentation after the new
  UI and API contract are finalized.
