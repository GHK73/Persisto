# Persisto Backend

This document describes the backend as it exists today. Treat it as a map of
the current implementation, not as a statement that every flow is production
ready. The project is planned for a substantial overhaul.

## What it does

The backend is an Express API for an online coding judge. It provides account
signup and sign-in, OTP-based account and password flows, question management,
code execution and submissions, user statistics, S3-backed files, and AI code
reviews.

The main request path is:

1. `server.js` loads environment variables, configures Express/CORS/JSON, and
   mounts route modules.
2. Route handlers call controller functions or perform their own database and
   storage operations.
3. Mongoose models persist users, OTPs, questions, and submissions in MongoDB.
4. Middleware checks bearer JWTs and admin status where a route uses it.
5. Utility modules send email, store/retrieve S3 objects, call Gemini, and
   compile/run submitted programs.

## File map

### Application and deployment

| File | Responsibility |
| --- | --- |
| `server.js` | Creates the Express app, mounts `/users`, `/admin`, `/questions`, `/code`, and root authentication routes, starts MongoDB connection and HTTP server. Default port is `8000`. |
| `database/db.js` | Connects Mongoose to `MONGO_URI`. |
| `Dockerfile` | Builds and starts the API service. It does not install language compilers or execute submitted code. |
| `.dockerignore` | Excludes files from Docker build context. |
| `.gitignore` | Ignores local dependencies, generated code/output directories, and `.env`. |
| `package.json` | Backend package manifest and start/dev scripts. |
| `package-lock.json` | NPM dependency lockfile used for reproducible installs. |
| `AWSCLIV2.msi` | AWS CLI installer file present in the backend folder; it is not imported by the application. |

### Routes

| File | Responsibility |
| --- | --- |
| `routes/router.js` | Signup OTP, signup completion, sign-in, password-reset OTP, password reset, and authenticated `/check-auth` routes. Mounted at `/`. |
| `routes/user.js` | Profile-picture upload and user-stat endpoints. Mounted at `/users`. |
| `routes/adminRoutes.js` | Admin-only user listing and promotion endpoints. Mounted at `/admin`. |
| `routes/questionRoutes.js` | Presigned question uploads, upload completion/cancellation, question read/update/delete, and contributor question listing. Mounted at `/questions`. |
| `routes/code.js` | Code run, submission, solved-count, and AI-review endpoints. Mounted at `/code`. |

### Controllers

| File | Responsibility |
| --- | --- |
| `controller/details.js` | Signup/sign-in/password-reset workflows; hashes passwords with bcrypt and issues JWTs. |
| `controller/question.js` | Creates and validates S3 upload sessions, verifies/copies uploaded objects, and manages question metadata and S3-backed content. |
| `controller/codeController.js` | Sends code and test inputs to the isolated runner, records results, updates solved questions, and requests Gemini code reviews. |
| `controller/user.js` | Contains a user-stat handler; current routes implement their stats endpoint directly in `routes/user.js`. |
| `controller/protectedRoute.js` | Contains a basic authenticated-response handler; currently not mounted by the route table. |

### Middleware and models

| File | Responsibility |
| --- | --- |
| `middleware/authenicate.js` | Verifies a bearer JWT and attaches the matching database user to the request. The filename spelling is the existing project spelling. |
| `middleware/isAdmin.js` | Allows requests only when the authenticated user has `isAdmin: true`. |
| `models/file.js` | User schema: identity, contact details, password hash, admin flag, solved-question IDs, profile-picture S3 reference. |
| `models/otp.js` | OTP schema with purpose and expiration; MongoDB TTL index removes expired OTP records. |
| `models/questions.js` | Question metadata and stable S3 references for descriptions, sample cases, and hidden judge test cases. |
| `models/questionUpload.js` | Short-lived upload-session manifest, staged S3 keys, ownership, expected file metadata, and MongoDB TTL expiry. |
| `models/submission.js` | Stores user/question/language/code, S3 code reference, result status, pass status, failed-case identifiers, and submission time. |

### Utilities and storage

| File | Responsibility |
| --- | --- |
| `awsConfig.js` | Legacy AWS SDK v2 S3 configuration. |
| `utils/s3Client.js` | Creates the AWS SDK v3 S3 client. |
| `utils/s3Uploader.js` | Creates short-lived S3 PUT URLs, creates stable S3 references, copies/verifies/deletes objects, and reads private S3 objects. |
| `utils/streamToString.js` | Converts a readable stream (such as an S3 response) to UTF-8 text. |
| `utils/runInSandbox.js` | Validates execution limits and sends code/test inputs to the private runner service. |
| `utils/mailer.js` | Sends OTP messages through Gmail SMTP using Nodemailer. |
| `utils/geminiClient.js` | Initializes the Google Generative AI client. |
| `sandbox/runnerServer.js` | Private execution service that validates requests, enforces concurrency, starts bounded Docker jobs, and returns results. |
| `sandbox/executor.py` | Trusted in-container harness that compiles/runs C, C++, Java, or Python and enforces per-test runtime/output limits. |
| `sandbox/Dockerfile` | Builds the isolated execution image with compilers/runtimes. |
| `sandbox/runner.Dockerfile` | Builds the runner service image with the Docker CLI. |

## HTTP endpoints

The server has no common `/api` prefix. Authentication routes are mounted at
the root.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/signup/request-otp` | Send a signup OTP. |
| `POST` | `/signup/verify-otp` | Verify a signup OTP. |
| `POST` | `/signup/complete` | Create the account. |
| `POST` | `/signin` | Sign in with email or handle and password. |
| `POST` | `/forgot-password/request-otp` | Send a password-reset OTP. |
| `POST` | `/forgot-password/verify-otp` | Verify a password-reset OTP. |
| `POST` | `/forgot-password/reset` | Set a new password. |
| `GET` | `/check-auth` | Return the current authenticated user's public identity. |
| `GET` | `/questions` | List questions and the authenticated user's solved status. |
| `GET` | `/questions/:id` | Return question detail and sample cases. |
| `POST` | `/questions/uploads` | Admin-only: create an upload session and receive short-lived S3 PUT URLs. |
| `POST` | `/questions/uploads/:uploadId/complete` | Admin-only: verify staged objects, copy them to permanent keys, and save the question. |
| `DELETE` | `/questions/uploads/:uploadId` | Admin-only: cancel an unfinished upload session and remove its staged objects. |
| `PUT` | `/questions/:id` | Update question metadata and optional description text. |
| `DELETE` | `/questions/:id` | Delete a question and its S3 prefix. |
| `GET` | `/questions/my-questions` | List questions uploaded by the current user. |
| `POST` | `/code/run` | Run code with supplied input. |
| `POST` | `/code/submit` | Run code against question test cases and save the submission. |
| `GET` | `/code/unique-solved` | Count unique questions with passing submissions. |
| `POST` | `/code/review` | Ask Gemini to review code. |
| `POST` | `/users/:handle/profile-pic` | Upload a profile picture. |
| `GET` | `/users/:handle/stats` | Return solved count and a signed profile-picture URL. |
| `GET` | `/admin/all-users` | List users (admin middleware required). |
| `PUT` | `/admin/make-admin/:handle` | Promote a user (admin middleware required). |

## Current request flows

### Authentication

The client flow requests an OTP by email, verifies it, and then creates a user
with a bcrypt-hashed password. The signup-completion endpoint itself does not
enforce that an OTP was verified. Sign-in accepts an email or handle and returns a JWT
that expires after two hours. The client sends it as a bearer token. The
authentication middleware verifies the token and reloads the user from
MongoDB. The client password-reset flow similarly requests and checks an OTP;
the reset endpoint itself does not require proof of OTP verification.

### Questions and files

The admin client asks the API for an upload session containing file sizes and
content types. The API creates short-lived, content-type-bound presigned PUT
URLs. The browser uploads each file directly to S3; no question file is written
to the API server's disk or relabeled using the uploaded filename. After the
browser signals completion, the API checks each staged object's size and
content type, copies it to a permanent random object key, and saves stable
`s3://bucket/key` references in MongoDB. The original filenames are not used
for storage, display, or pairing files.

The bucket remains private. For the question screen, the API reads the
description and sample-case objects via their stored S3 references and returns
their text to the client. For submissions, the backend reads each hidden
input/expected-output object using its stored reference and compares the
program output. Hidden-test references and contents are never included in the
question-detail response.

The upload-session request includes metadata only; it does not include file
names or file contents:

```json
{
  "title": "Example",
  "difficulty": "easy",
  "tags": ["arrays"],
  "description": { "size": 2500, "contentType": "text/plain" },
  "sampleTestCases": [
    {
      "input": { "size": 12, "contentType": "text/plain" },
      "output": { "size": 3, "contentType": "text/plain" }
    }
  ],
  "testCases": []
}
```

The response contains an `uploadId` and corresponding presigned PUT URLs.
Upload each selected `File` to its URL with the returned `Content-Type`, then
call the completion endpoint with the `uploadId`. Completion validates the
objects before creating the question. The API caps presigned URLs at 10
minutes and pending upload sessions at 15 minutes.

### Code run and submission

The API process does not compile or execute user code. It reads hidden test
inputs/expected outputs from S3 and sends only source and inputs to a separate
runner service. The runner starts an ephemeral Docker container with no network,
no host filesystem mounts, a read-only root filesystem, a non-root user, dropped
Linux capabilities, a PID cap, one CPU, a memory cap, and a bounded writable
temporary filesystem. The API host's files and database credentials are not
mounted or passed into the execution container.

The trusted container harness compiles once per request and runs each input in
a separate child process. Runtime is limited independently for each test case;
compilation has a separate hard 15-second ceiling. Output is capped at 1 MB per
test case. The runner has a hard 5-second maximum per test case regardless of
question configuration.

Question documents store `timeLimitSec` (`1`, `2`, or `5`; default `2`) and
`memoryLimitMb` (`128`, `256`, `512`, or `1024`; default `256`). Time applies
per test case. The Docker memory cap applies to the submission container
including its compiler/harness. These settings are editable when an admin
creates or updates a question. Existing records use the schema defaults.

The runner returns compile errors, wrong answers, time-limit exceeded, memory
limit exceeded, runtime errors, and output-limit exceeded as distinct statuses.
The API stores the status and failed test-case numbers in MongoDB; it never
returns hidden test data. Passing submissions add the question ID to the
user's solved list.

`POST /code/run` may include `questionId` to use that question's limits. The
question screen includes its ID when requesting a custom-input run.

### Isolated runner deployment

Build the execution image on the dedicated runner host:

```sh
docker build -f sandbox/Dockerfile -t persisto-execution:latest sandbox
```

Build and start the runner service on that runner host:

```sh
docker build -f sandbox/runner.Dockerfile -t persisto-sandbox-runner:latest .
docker run -d --name persisto-sandbox-runner --restart unless-stopped \
  -p 8090:8090 \
  -e RUNNER_PORT=8090 \
  -e RUNNER_SHARED_TOKEN=<long-random-secret> \
  -e SANDBOX_IMAGE=persisto-execution:latest \
  -v /var/run/docker.sock:/var/run/docker.sock \
  persisto-sandbox-runner:latest
```

The Docker socket gives the runner service control of that host's Docker
daemon. Run it on a dedicated worker host with no application data, secrets,
or backend filesystem mounted there; allow runner API traffic only from the
backend over a private, encrypted network. Never expose port `8090` publicly.
The token is shared only between the backend and runner and must be a strong
random secret.

Set these private environment variables on the backend API:

| Variable | Required? | Used for / notes |
| --- | --- | --- |
| `RUNNER_URL` | Required for code execution | Private base URL of the runner service, such as `http://runner.internal:8090`. |
| `RUNNER_SHARED_TOKEN` | Required for code execution | Same strong random token configured on the runner service. |

The runner service also uses `RUNNER_PORT` (default `8090`) and
`SANDBOX_IMAGE` (default `persisto-execution:latest`). It accepts at most two
concurrent jobs and rejects additional jobs with HTTP 429. Each job is removed
after execution or when its hard deadline is reached.

### Profile and AI features

Profile-picture uploads use memory-backed Multer in the user route, save the
object to S3, and store its reference on the user. Statistics return a
temporary signed URL. Code review sends the code and question context to
Gemini.

## S3 setup for direct uploads

Keep the bucket private. Configure bucket CORS to allow `PUT` from each
deployed client origin and local development origin; allow the `Content-Type`
request header. Configure a lifecycle rule to expire objects under
`question-uploads/` after one day so staged objects from abandoned sessions
are cleaned up. MongoDB's TTL index removes expired session records but does
not delete S3 objects.

The backend's AWS identity needs only the S3 actions required for this flow:
presigning/`PutObject`, `HeadObject`, `GetObject`, `CopyObject`, and
`DeleteObject`/`DeleteObjects` for this bucket and its question/profile/
submission prefixes. The browser receives short-lived upload URLs only; it
does not receive AWS credentials. Signed URLs are not stored in MongoDB
because they expire. New file references are stored as `s3://bucket/key`;
the reader supports the older bare object keys already present in MongoDB.

Uploads are limited to 10 MB per file, 100 MB total, 20 hidden pairs, and 5
sample pairs. The client uploads in small batches. The API verifies declared
size and content type before finalizing the question. Configure CORS on S3
separately from the API's Express CORS policy.

## Environment configuration

Create `backend/.env` for local backend secrets. Do not commit it. Configure
the same values as protected environment variables in the deployment platform.
Never put backend credentials in the Vite client environment.

| Variable | Required? | Used for / notes |
| --- | --- | --- |
| `PORT` | Optional | HTTP port; defaults to `8000`. |
| `MONGO_URI` | Required | MongoDB connection URI for Mongoose; connection verified with a read-only ping on 2026-10-23. |
| `SECRET_KEY` | Required | Strong, private JWT signing/verifying secret. |
| `EMAIL` | Required for OTP email | Gmail account used by Nodemailer as sender and SMTP username. The backend reads `EMAIL` (not `EMAIL_USER`). |
| `EMAIL_PASSWORD` | Required for OTP email | Gmail app password (not the normal account password). |
| `AWS_ACCESS_KEY_ID` | Required for S3 | AWS access key with least-privilege permissions for the configured bucket. |
| `AWS_SECRET_ACCESS_KEY` | Required for S3 | Matching AWS secret access key. Keep private. |
| `AWS_REGION` | Required for S3 | Bucket region; the v3 client defaults to `ap-south-1`, but configure explicitly. |
| `S3_BUCKET_NAME` | Required for S3 | Bucket used for question files, profile pictures, and submitted code; access verified with a read-only `HeadBucket` check on 2026-10-23. |
| `RUNNER_URL` | Required for code execution | Private base URL for the isolated Docker runner service. |
| `RUNNER_SHARED_TOKEN` | Required for code execution | Strong shared secret used only between backend API and runner. |
| `GEMINI_API_KEY` | Required for AI review | Google Generative AI API key. |

Load these in the backend runtime only. Use a secret manager for production.
AWS access should be scoped to the required bucket/actions; prefer workload
identity/roles over long-lived access keys when the hosting platform supports
them.

## Overhaul notes

- The runner service has Docker daemon access. Keep it on a dedicated host and
  verify OS/container hardening, image updates, ingress restrictions, and
  resource capacity before production.
- Memory-limit detection relies on Linux cgroup/Docker behavior; verify OOM
  reporting on the target Docker host, especially for Java heap and native
  allocations.
- The sample Docker build/deployment commands target Linux Docker hosts. Local
  Windows development requires Docker Desktop with Linux containers and the
  execution image built locally.
- Restrict API CORS to the deployed client origin, add rate-limits, and review
  authorization consistently across protected endpoints.
- Decide whether anonymous visitors should browse questions: the client exposes
  `/all-questions`, but the API's `GET /questions` route currently requires
  authentication.
- Require server-verifiable OTP completion before account creation/password
  reset, and ensure OTP emails are sent with the intended purpose and expiry.
- Test the new presigned upload/verify/copy/finalize flow against the configured
  S3 bucket and MongoDB. In particular, verify bucket CORS, upload URL expiry,
  cancellation cleanup, and the lifecycle rule for abandoned staged objects.
- Build and test the runner image on its target Linux Docker host. Docker is
  unavailable in the current workspace, so end-to-end execution, cgroup memory
  enforcement, and container cleanup still need validation there.
- Existing MongoDB question/profile/submission records may contain bare S3
  object keys. The S3 resolver accepts both those legacy keys and new
  `s3://bucket/key` references; migrate old records only if a future schema
  removes that compatibility.
