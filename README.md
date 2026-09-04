# ProcureFlow SIH 2026

ProcureFlow is a **hackathon prototype** for a farmer-first paddy procurement journey. The existing Fields & Flow frontend remains intact; this project adds a database-backed Express REST API at `/api` so the user interface can be connected to real prototype records without rebuilding its presentation layer.

> **Prototype notice:** all seeded people, centres, credentials, queue positions, procurement records, and payments are illustrative demo data. The payment endpoint records a demo event only; it never initiates or represents a real bank transfer.

## Technology and Configuration

The project uses React and Vite on the client and Node.js, Express, Drizzle ORM, and PostgreSQL (Supabase / Render / Neon) on the server, with a local JSON store fallback (.data/procureflow_db.json) for offline development.

| Variable | Purpose | Required |
|---|---|---:|
| `DATABASE_URL` | PostgreSQL connection string (Supabase / Render URI) used by Drizzle ORM | Yes in Prod |
| `JWT_SECRET` | Signs server-issued farmer and officer bearer tokens | Yes |
| `CORS_ORIGIN` | Comma-separated allowed origins for a separately hosted frontend | No |
| `VITE_API_BASE_URL` | Client-side API base; defaults to `/api` | No |
| `SMS_PROVIDER` | Server-only SMS provider name; use `DEVELOPMENT` only for a non-production test code | No |
| `SMS_API_KEY` | Server-only credential for a future SMS provider adapter | No |
| `SMS_SENDER_ID` | Server-only sender identity for a future SMS provider adapter | No |
| `OTP_MODE` | Server-only override; set to `DEVELOPMENT` to force the logged development OTP when no SMS adapter is available | No |
| `RAZORPAY_KEY_ID` | Server-only Razorpay test/live key ID used to create hosted checkout orders; its public key is returned only from the config endpoint | No |
| `RAZORPAY_KEY_SECRET` | Server-only Razorpay secret used to create orders and verify checkout signatures | No |
| `RAZORPAY_MODE` | Razorpay mode label exposed as non-secret metadata, normally `test` or `live` | No |
| `VITE_FRONTEND_FORGE_API_URL` | Managed frontend proxy URL used by `MapView` for Google Maps JavaScript API loading | Managed |
| `VITE_FRONTEND_FORGE_API_KEY` | Managed frontend proxy credential injected by the project runtime; do not replace with a Google key in source | Managed |

For local work, create an ignored `.env` file using the following template and replace the placeholder values. **Do not commit `.env` files.** The managed project environment keeps these values in protected configuration rather than a committed `.env.example` file.

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
JWT_SECRET=replace-with-a-long-random-secret
CORS_ORIGIN=http://localhost:3000
VITE_API_BASE_URL=/api
SMS_PROVIDER=DEVELOPMENT
# SMS_API_KEY=set only in protected project configuration for a real provider
# SMS_SENDER_ID=PROCUREFLOW
# RAZORPAY_KEY_ID=set only in protected project configuration when hosted checkout is enabled
# RAZORPAY_KEY_SECRET=set only in protected project configuration; never expose it to the client
RAZORPAY_MODE=test
```

## Local Start and Database Setup

Install dependencies with `npm install` (or `pnpm install`), then start the integrated client/server development process with `npm run dev`. The schema lives in `drizzle/schema.ts`. When `DATABASE_URL` is set, the server automatically ensures the PostgreSQL schema exists on startup. You can also run `npm run db:migrate` or import existing JSON records with `npm run db:import-json`.

```bash
npm install
npm run dev
```

Run quality checks with the following commands.

```bash
pnpm check
pnpm test
```

## Prototype Credentials

| Role | Identifier | Password | Intended use |
|---|---|---|---|
| Officer | `OFF-NZM-104` | `Officer@2026` | Approve/reject registrations and update procurement stages |
| Farmer | `9876543210` | `Farmer@2026` | Approved farmer with a seeded active booking |
| Farmer | `9876543211` | `Farmer@2026` | Additional approved prototype farmer |
| Farmer | `9876543212` | `Farmer@2026` | Pending registration example |

Credentials are **prototype-only** and must be replaced before any non-demo use. Passwords are stored with a salted server-side scrypt hash; they are never returned by the API.

## REST API

All protected routes expect `Authorization: Bearer <accessToken>`. Login responses provide the temporary access token. The API validates request data with Zod, protects farmer-owned records from other farmers, requires an officer token for registration and procurement actions, and sets CORS headers only for allowed origins.

| Area | Endpoint | Access | Purpose |
|---|---|---|---|
| OTP registration | `POST /api/registration/otp/send` | Public | Validate registration details and send a 6-digit OTP without creating a farmer account |
| OTP registration | `POST /api/registration/otp/resend` | Public | Send a new OTP after the cooldown for the active registration challenge |
| OTP registration | `POST /api/registration/otp/verify` | Public | Verify an OTP and create the farmer and `PENDING` registration record |
| Auth | `POST /api/farmers/register` | Public | Retired direct-registration route; responds with OTP-verification-required guidance |
| Auth | `POST /api/farmers/login` | Public | Authenticate an approved farmer |
| Auth | `POST /api/officers/login` | Public | Authenticate a prototype officer |
| Registration | `GET /api/officers/registrations/pending` | Officer | List pending farmer applications |
| Registration | `GET /api/officers/registrations/:id` | Officer | Inspect one application |
| Registration | `PUT /api/officers/registrations/:id/approve` | Officer | Approve an application and notify the farmer |
| Registration | `PUT /api/officers/registrations/:id/reject` | Officer | Reject an application; body requires `reason` |
| Centres | `GET /api/centres` | Public | List prototype procurement centres, queue counts, and capacity |
| Centres | `GET /api/centres/:id` | Public | Read one centre |
| Slots | `GET /api/centres/:id/slots` | Public | Read active slots; optional `?date=YYYY-MM-DD` filter |
| Booking | `POST /api/bookings` | Farmer | Reserve a valid slot, generate booking ID and token, add queue entry |
| Booking | `GET /api/bookings/:id` | Owner/Officer | Read booking, token, queue, and procurement state |
| Booking | `GET /api/farmers/:id/bookings` | Owner/Officer | Read farmer booking history |
| Queue | `GET /api/queue/:bookingId` | Owner/Officer | Read current token, people ahead, and estimated wait |
| Procurement | `GET /api/procurement/:bookingId` | Owner/Officer | Read procurement stage |
| Procurement | `PUT /api/procurement/:bookingId/status` | Officer | Progress stage from `BOOKED` through `COMPLETED` |
| Payment | `GET /api/payments/:bookingId` | Owner/Officer | Read the latest payment state for a booking |
| Payment | `POST /api/payments` | Farmer | Create a `PENDING` UPI, Card, or Net Banking payment request |
| Payment | `POST /api/payments/:paymentId/process` | Owner | Move a pending payment to `PROCESSING` |
| Payment | `POST /api/payments/:paymentId/complete` | Owner | Resolve a processing payment as `SUCCESS` or `FAILED` |
| Payment | `GET /api/payments/:paymentId/receipt` | Owner/Officer | Retrieve a receipt after a successful payment |
| Payment | `GET /api/farmers/:id/payments` | Owner/Officer | Read farmer payment history and attempts |
| Payment | `GET /api/officers/payments` | Officer | Read payment status across authorised officer operations |
| Notifications | `GET /api/farmers/:id/notifications` | Owner/Officer | Read farmer notifications |
| Notifications | `PUT /api/notifications/:id/read` | Owner | Mark one notification read |
| AI | `POST /api/ai/chat` | Farmer | Return a context-aware mock response without an external AI key |

## Booking, Queue, and Notification Rules

A booking requires an **approved** farmer, active centre slot, available capacity, and no other active booking for that farmer. On success, the API creates a unique booking code, a unique queue token, a queue entry, and an initial procurement record. It also sends booking and token notifications, adding a queue-approaching notification when the new position is near the front.

The queue response calculates people ahead from the entry position and reports a lightweight estimated wait. When an officer marks a procurement `ARRIVED`, the centre current token moves to that booking and the queue entry becomes called. Marking it `COMPLETED` closes the booking and marks its entry served.

## Frontend Connection

The frontend base is centralized in `client/src/lib/api.ts`. The default stays same-origin and requires no deployment-specific change:

```ts
import { apiUrl } from "@/lib/api";

const response = await fetch(apiUrl("/centres"));
```

For a separate API host, set `VITE_API_BASE_URL=https://your-api.example/api` at build time and list the frontend origin in `CORS_ORIGIN`. Google Maps uses the managed frontend proxy through `MapView`, backed by the injected `VITE_FRONTEND_FORGE_API_URL` and `VITE_FRONTEND_FORGE_API_KEY`; no Google Maps key is requested from the user or embedded in application code. If the managed map loader is unavailable, the existing centre cards and coordinate-backed selection remain available as the graceful fallback. When the optional Razorpay variables are configured, the existing payment action opens Razorpay Checkout and posts the returned order, payment ID, and signature to the server verification endpoint. If Razorpay is not configured or its checkout script cannot load, the existing provider-neutral payment lifecycle remains available. Existing screens are intentionally not rebuilt; their presentation state is preserved while this API provides the integration boundary.

## Farmer Authentication Flow

Farmer registration first submits the existing form to `POST /api/registration/otp/send`. The server stores the registration payload as a temporary OTP challenge, with only a salted hash of the six-digit OTP. No farmer account is created at this point. The challenge expires after five minutes, limits resend requests, enforces a resend cooldown, and locks after five incorrect verification attempts. `POST /api/registration/otp/verify` is the only registration route that creates the farmer and the officer-reviewable `PENDING` record. A farmer login attempted before officer approval returns `REGISTRATION_NOT_APPROVED`; an incorrect phone number or password returns `INVALID_CREDENTIALS`. Neither path creates a browser farmer session.

After an authenticated officer approves the registration through `PUT /api/officers/registrations/:id/approve`, the farmer can login through `POST /api/farmers/login`. The frontend stores only the returned farmer bearer token and farmer profile in `sessionStorage` under `procureflow.farmer.session`, then loads that farmer’s records and redirects to the dashboard. Farmer-only screens redirect unauthenticated visitors to the login page. Logout removes the farmer session and returns the user to the public landing page.

Officer and farmer credentials use distinct backend endpoints and session-storage keys. An officer login does not create a farmer session, and the officer approval screen only uses records returned by the officer-protected pending-registration API.

## SMS Provider Boundary and Development Fallback

`server/services/otpService.ts` is the server-only delivery boundary for a future SMS provider. Configure the provider name, API key, and sender identity in protected project environment configuration; never expose them in frontend source or the API response. In non-production environments, or when `SMS_PROVIDER=DEVELOPMENT`, the server returns a separate development test code to permit hackathon validation. In production, an unavailable or unsupported SMS provider returns a delivery error and never reveals an OTP.

## Code Structure

| Path | Responsibility |
|---|---|
| `drizzle/schema.ts` | Farmers, OTP challenges, registrations, officers, centres, slots, bookings, queue, procurement, payments, and notifications tables |
| `server/routes/procurementApi.ts` | Express route contract, controller-style request handling, validation, access checks, and orchestration |
| `server/services/` | Password hashing, OTP generation/delivery boundary, bearer tokens, payment gateway boundary, idempotent seed data, and mock assistant logic |
| `server/middleware/apiAuth.ts` | Bearer-token validation and farmer/officer guards |
| `server/types/api.ts` | API principal and assistant-context types |
| `client/src/lib/api.ts` | Single frontend REST base URL helper |

## Confirmed Prototype Flow

The implementation has been exercised through the full sequence: **registration → officer approval → farmer login → centre/slot discovery → booking → token/queue → procurement update → payment initiation → processing → failed or successful completion → receipt → notifications → assistant response.** Unit tests cover password verification, the deterministic mock assistant, and the credential-free payment gateway adapter interface.

## Payment Gateway Boundary

The payment API keeps payment identifiers, transaction references, receipt metadata, status transitions, and provider-neutral gateway fields on the server. It deliberately does **not** accept or store card numbers, CVVs, UPI IDs, banking passwords, or provider secrets. `server/services/paymentGatewayService.ts` is the single adapter boundary for later integration with a real gateway. A production adapter must remain server-side, create provider payment intents, and verify signed provider webhook events before setting a payment to `SUCCESS` or `FAILED`.
