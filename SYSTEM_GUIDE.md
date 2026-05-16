# Wake Up Social — Backend System Guide

> **Audience:** Full team — backend, frontend (Android/Kotlin), and documentation.
> **Reflects codebase state as of:** 2026-05-16.
> **Backend stack:** NestJS 11 · TypeORM 0.3 · PostgreSQL · Socket.IO · Firebase Admin SDK

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [System Flow](#2-system-flow)
3. [Module Architecture](#3-module-architecture)
4. [Concerns & Risks](#4-concerns--risks)
5. [Goals & Objectives](#5-goals--objectives)
6. [API & Frontend Integration Guide](#6-api--frontend-integration-guide)
   - 6.1 [Base URL & Versioning](#61-base-url--versioning)
   - 6.2 [Authentication Flow](#62-authentication-flow)
   - 6.3 [REST Endpoints](#63-rest-endpoints)
   - 6.4 [Server-Sent Events (SSE)](#64-server-sent-events-sse)
   - 6.5 [WebSocket — Cashier Gateway](#65-websocket--cashier-gateway)
   - 6.6 [Data Models](#66-data-models)
   - 6.7 [Error Response Structure](#67-error-response-structure)
   - 6.8 [FCM Integration Notes](#68-fcm-integration-notes)

---

## 1. System Overview

Wake Up Social is a QR-based café ordering system. Customers scan a table QR code, browse the menu, and submit orders from their Android phone. Cashiers manage orders from a separate Android dashboard. The NestJS backend is the single source of truth for all state.

**What the backend handles:**
- Identity via Google Sign-In (verified through Firebase, issued as custom JWTs)
- Menu management with real-time sold-out toggling
- Session management (table binding per scan)
- Order lifecycle: SUBMITTED → REVIEWING → CONFIRMED → READY → COMPLETED (plus CANCELLED and EXPIRED branches)
- Idempotent order submission (safe to retry from WorkManager)
- Coupon reservation and burning (atomic, pessimistic-locked)
- Loyalty points, stamp cards, tier upgrades, and milestone coupon issuance (atomic inside confirm)
- Real-time order status updates to the customer via SSE
- Real-time order events to the cashier dashboard via WebSocket (Socket.IO)
- Background jobs: stale lock release every 1 min, order expiry every 5 min

---

## 2. System Flow

### Customer Flow

```
Android (Customer)
  │
  ├─ Scan QR → POST /sessions          → creates or resumes active Session for user+table
  │
  ├─ Browse → GET /menu                → returns available MenuItem[]
  │
  ├─ [optional] POST /coupons/validate → preflight coupon check (no reservation)
  │
  ├─ Submit order (WorkManager)
  │    └─ POST /orders                 → idempotent create; reserves coupon if provided
  │         ├─ EventEmitter: order.submitted
  │         └─ CashierGateway emits: new_order  ──► Cashier Android (WebSocket)
  │
  └─ Open SSE stream → GET /orders/status/:id/stream
       ├─ ORDER_CONFIRMED  ◄── cashier confirms payment
       ├─ ORDER_READY      ◄── barista marks ready
       ├─ REWARD_ISSUED    ◄── milestone coupon auto-issued (10th stamp)
       └─ TIER_UPGRADED    ◄── lifetime points cross a tier threshold
```

### Cashier Flow

```
Android (Cashier)
  │
  ├─ Connect WebSocket /cashier        → JWT-verified; joins cashier-room
  │    └─ Receives: new_order, order_updated, order_cancelled
  │
  ├─ PATCH /orders/:id/review          → sets 2-min REVIEWING lock (cron releases if expired)
  │
  ├─ POST  /orders/:id/confirm         → atomic transaction:
  │    ├─ Pessimistic lock: Order + User
  │    ├─ Burn coupon (if reserved)
  │    ├─ Earn points (floor(totalAmount / 1000))
  │    ├─ Stamp count += 1; auto-issue milestone coupon on 10th
  │    ├─ Tier upgrade check (vs TierConfig thresholds)
  │    ├─ Append LoyaltyTransaction (INSERT ONLY)
  │    └─ Post-commit: emit order.confirmed, reward.issued?, user.tier_upgraded?
  │         └─ SSE pushes snapshots ──► Customer Android
  │
  ├─ PATCH /orders/:id/ready           → barista done; SSE: ORDER_READY ──► Customer
  │
  ├─ PATCH /orders/:id/complete        → order closed
  │
  └─ PATCH /menu/:id/availability      → toggle sold-out (CASHIER role required)
```

### Background Jobs

```
Every 1 min:   REVIEWING orders where lockedUntil < NOW() → reset to SUBMITTED
               (FOR UPDATE SKIP LOCKED — safe under concurrency)

Every 5 min:   SUBMITTED orders where createdAt < NOW() - 30min → EXPIRED
               + release any RESERVED coupon → AVAILABLE
```

---

## 3. Module Architecture

```
AppModule
 ├── ConfigModule (global)             env validation via Joi
 ├── EventEmitterModule (global)       in-process event bus
 ├── ScheduleModule (global)           cron jobs
 ├── TypeOrmModule (global)            Postgres connection
 │
 ├── AuthModule
 │    ├── AuthController               POST /auth/firebase, /auth/refresh, /auth/logout
 │    ├── AuthService                  Firebase token verify, JWT issue, upsert User
 │    ├── JwtStrategy                  validates Bearer token on every guarded request
 │    └── JwtRefreshStrategy           validates refresh token for /auth/refresh
 │
 ├── UsersModule
 │    ├── UsersController              GET /user/profile, PATCH /user/fcm-token
 │    └── UsersService                 findById, updateFcmToken
 │
 ├── MenuModule
 │    ├── MenuController               GET /menu (@Public), PATCH /menu/:id/availability
 │    └── MenuService
 │
 ├── SessionsModule
 │    ├── SessionsController           POST /sessions (JWT)
 │    └── SessionsService              create-or-resume active session for user+table
 │
 ├── OrdersModule
 │    ├── OrdersController             POST/GET /orders, GET/DELETE/PATCH per order, SSE stream
 │    └── OrdersService                createOrder (idempotent + coupon reserve), state transitions
 │
 ├── CashierModule
 │    ├── CashierController            POST /orders/:id/confirm
 │    └── CashierService               atomic confirmOrder transaction
 │
 ├── LoyaltyModule
 │    ├── LoyaltyController            GET /loyalty/points, POST /coupons/validate, GET /wallet
 │    └── LoyaltyService               read-only loyalty queries + coupon validation
 │
 ├── RealtimeModule
 │    ├── SseService                   per-order RxJS Subject; push snapshots to customer
 │    ├── CashierGateway               Socket.IO /cashier namespace; JWT guard on connect
 │    └── RealtimeEventListener        @OnEvent handlers → SSE push + WebSocket emit
 │
 ├── TasksModule
 │    └── TasksService                 @Cron: stale lock release, order expiry
 │
 ├── FirebaseAdminModule               firebase-admin App singleton
 └── NotificationsModule               FCM send (used for backgrounded users)
```

**Global Guard:** `JwtAuthGuard` is registered as `APP_GUARD` — every route requires a valid JWT unless decorated with `@Public()`.

**Public routes** (no JWT required):
- `GET /menu`
- `POST /auth/firebase`
- `POST /auth/refresh`
- `POST /coupons/validate`

---

## 4. Concerns & Risks

### Known intentional deviations from spec
| Spec | Implementation | Reason |
|---|---|---|
| `GET /auth/google` + `GET /auth/google/callback` (OAuth2 redirect) | `POST /auth/firebase` (Firebase ID token) | Android handles the Google OAuth dance via Firebase SDK; redirect flow doesn't apply to mobile |
| `.env` requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Replaced with `FIREBASE_SERVICE_ACCOUNT_JSON` | Follows from auth deviation above |

### Risks to be aware of

**1. SSE subject memory leak** ✅ *Resolved*
`sseService.complete(orderId)` is now called in both `completeOrder` (after commit) and `cancelOrder` (after commit), which calls `subject.complete()` and deletes the entry from the map. No dead subjects accumulate.

**2. Post-commit event loss**
Events are emitted after `queryRunner.commitTransaction()`. If the process crashes in that window, the commit persists but no SSE/WebSocket event fires. The customer and cashier will not get a real-time update for that order. **Acceptable for V1**, but the customer can always reload the order status manually.

**3. `orders_status_enum` Postgres type on existing databases**
If any developer has an existing `orders` table with the old `PENDING/PAID/CANCELLED` enum, TypeORM's `synchronize: true` will fail to reconcile the enum type. **Fix:** `DROP DATABASE` / recreate on local. Production migrations must be handled manually.

**4. `CASHIER` role enforcement is partial** ✅ *Resolved*
All cashier state-transition endpoints (`/review`, `/ready`, `/complete`) now carry `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('CASHIER')` in `OrdersController`, and `/confirm` carries the same guards in `CashierController`. Only authenticated users with the `CASHIER` role can drive order state transitions.

**5. Milestone coupon code collision**
`generateCouponCode()` uses `Math.random()` with a 31-character charset × 6 positions = ~887 million combinations. No retry loop exists on collision. At small scale this is fine; at volume, add a retry loop catching the Postgres `23505` unique violation.

**6. `TierConfig` seed data not seeded** ✅ *Resolved*
`DatabaseSeederService` implements `OnApplicationBootstrap` and upserts the three tier records (`BRONZE=0`, `SILVER=1000`, `GOLD=5000`) on every boot via TypeORM `upsert` with conflict path `tierName`. The table is always populated before any request is served.

**7. `tableId` vs `tableNumber` on Order**
The Order entity stores `tableNumber` (INT, denormalized) for cashier display, not `tableId` (UUID FK). This is correct and intentional per spec. The `Table.qrCode` field is what the Android QR scanner reads — it maps to `Table.id` via a lookup, not the QR content itself.

---

## 5. Goals & Objectives

**Core goal:** A reliable, concurrent-safe ordering backend that:
1. Never creates a duplicate order for the same submission (idempotency via DB unique constraint)
2. Never double-applies a coupon (pessimistic write locks)
3. Never double-confirms an order (pessimistic write lock on Order + status guard)
4. Accurately tracks loyalty points and tier progression atomically with payment confirmation
5. Delivers real-time order status to the customer (SSE) and cashier (WebSocket) without polling
6. Handles offline-first Android clients gracefully (WorkManager retries → idempotency absorbs duplicates)

**V1 scope (in):** QR scan, menu browse, order submit, cashier workflow, loyalty stamps/points/tiers, milestone coupons, SSE + WebSocket real-time.

**V2 scope (out):** Order history screen, rewards store, admin panel, tier-based point multipliers, multi-outlet support.

---

## 6. API & Frontend Integration Guide

### 6.1 Base URL & Versioning

```
Base URL: http://<host>:3030
No API version prefix in V1.
```

All dates are ISO 8601 strings. All money values are **integer IDR** (e.g. `15000` = Rp 15.000). No versioning prefix; if added later it will be `/v2/`.

---

### 6.2 Authentication Flow

#### Step-by-step for Android

```
1. User taps "Sign in with Google"
2. Android: Google Sign-In via Firebase Auth SDK → obtain Firebase ID token (idToken)
3. Android → POST /auth/firebase  { idToken }
4. Backend: verifies token with firebase-admin, upserts User, issues custom JWTs
5. Backend → { accessToken, refreshToken }
6. Store both tokens securely (EncryptedSharedPreferences)
7. Every request: Authorization: Bearer <accessToken>
8. On 401: POST /auth/refresh (send refreshToken in Authorization header) → new accessToken
9. On logout: POST /auth/logout (invalidates refresh token server-side)
```

#### Token lifetimes
| Token | Expiry | Storage |
|---|---|---|
| `accessToken` | 15 minutes | Memory / EncryptedSharedPreferences |
| `refreshToken` | 30 days | EncryptedSharedPreferences |

#### Header format (all protected endpoints)
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

---

### 6.3 REST Endpoints

#### Auth

---

**`POST /auth/firebase`** — `@Public`

Exchange a Firebase ID token for backend JWTs. Called immediately after Google Sign-In.

Request:
```json
{ "idToken": "<firebase_id_token>" }
```
Response `200`:
```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>"
}
```

---

**`POST /auth/refresh`** — `@Public` (uses refresh token, not access token)

Get a new access token. Send the **refresh token** in the `Authorization` header.

```
Authorization: Bearer <refreshToken>
```
Response `200`:
```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>"
}
```
Error `401`: refresh token expired or revoked → force re-login.

---

**`POST /auth/logout`** — Protected

Invalidates the refresh token on the server. Call on sign-out.

Response `200`:
```json
{ "message": "Logged out" }
```

---

#### User

---

**`GET /user/profile`** — Protected

Returns the authenticated user's profile including loyalty state.

Response `200`:
```json
{
  "id": "uuid",
  "googleId": "string",
  "email": "string",
  "displayName": "string",
  "fcmToken": "string | null",
  "loyaltyPoints": 0,
  "lifetimePoints": 0,
  "currentTier": "BRONZE | SILVER | GOLD",
  "purchaseCount": 0,
  "currentStampCount": 0,
  "createdAt": "2026-05-16T00:00:00.000Z"
}
```
Note: `refreshToken` is **never** included in this response.

---

**`PATCH /user/fcm-token`** — Protected

Register or update the device FCM token. Call on app launch after login and whenever `FirebaseMessaging.getInstance().token` changes.

Request:
```json
{ "fcmToken": "<device_fcm_token>" }
```
Response `200`: (empty body)

---

#### Menu

---

**`GET /menu`** — `@Public`

Returns all available menu items. Cache in Room (REPLACE strategy via `SyncMenuWorker`).

Response `200`:
```json
[
  {
    "id": "uuid",
    "name": "Oat Latte",
    "description": "Smooth oat milk latte",
    "price": 32000,
    "category": "Coffee | null",
    "imageUrl": "https://... | null",
    "isAvailable": true,
    "createdAt": "2026-05-16T00:00:00.000Z"
  }
]
```

---

**`PATCH /menu/:id/availability`** — Protected · CASHIER role required

Toggle sold-out status. Cashier app only.

Request:
```json
{ "isAvailable": false }
```
Response `200`: updated `MenuItem` object (same shape as above).

---

#### Sessions

---

**`POST /sessions`** — Protected

Called immediately after QR scan. Creates a new session for this user+table, or returns the existing active one. Persist the returned `session.id` in `SavedStateHandle` — it is required for `POST /orders`.

Request:
```json
{ "tableId": "<uuid from QR code>" }
```
Response `200`:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "tableId": "uuid",
  "status": "ACTIVE",
  "createdAt": "2026-05-16T00:00:00.000Z",
  "updatedAt": "2026-05-16T00:00:00.000Z"
}
```

---

#### Orders

---

**`POST /orders`** — Protected

Submit an order. **Idempotent** — generate a UUID `idempotencyKey` once per cart and persist it in `WorkData`. The same key will always return the same order, so WorkManager can retry safely. Stop retrying on HTTP `409`.

Request:
```json
{
  "idempotencyKey": "uuid-v4",
  "sessionId": "uuid",
  "items": [
    { "menuItemId": "uuid", "quantity": 2 }
  ],
  "couponCode": "ABC123"
}
```
- `couponCode` is optional. If provided, the coupon is **reserved** (not burned) atomically inside this transaction.
- `unitPrice` is **not** sent — the server snapshots price from the menu at submission time.

Response `200` (existing order returned idempotently) or `201`:
```json
{
  "id": "uuid",
  "idempotencyKey": "uuid-v4",
  "userId": "uuid",
  "sessionId": "uuid",
  "tableNumber": 3,
  "status": "SUBMITTED",
  "couponId": 1,
  "subtotal": 64000,
  "discountAmount": 10000,
  "totalAmount": 54000,
  "lockedUntil": null,
  "cashierId": null,
  "createdAt": "...",
  "updatedAt": "..."
}
```
Error `400`: invalid session, unavailable menu item.
Error `409`: coupon already reserved by a **different** idempotency key.

---

**`GET /orders`** — Protected

All orders, newest first (max 50). Used by cashier dashboard.

Response `200`: `Order[]` (same shape as above, with `session.table` and `items` relations).

---

**`GET /orders/:id`** — Protected

Single order with full relations (items + menuItem per item).

Response `200`: `Order` with nested `items[]`.
Error `400`: order not found.

---

**`DELETE /orders/:id/cancel`** — Protected

Cancel a `SUBMITTED` order. Releases any `RESERVED` coupon back to `AVAILABLE`.

Response `200`: updated `Order`.
Error `400`: order not found, or order is not in a cancellable state.
Error `403`: order is in `REVIEWING` state — cannot cancel while cashier is reviewing.

---

**`PATCH /orders/:id/review`** — Protected (cashier)

Sets a 2-minute `REVIEWING` lock. Prevents the customer from cancelling while the cashier is confirming payment. Assigns `cashierId` to the reviewing cashier.

Response `200`: updated `Order` with `status: "REVIEWING"` and `lockedUntil` set.
Error `400`: order not in `SUBMITTED` state.

---

**`POST /orders/:id/confirm`** — Protected (cashier)

The most critical endpoint. Atomic transaction:
1. Pessimistic locks on Order + User
2. Burns the reserved coupon
3. Awards loyalty points (`floor(totalAmount / 1000)`)
4. Increments stamp count; auto-issues milestone coupon on 10th purchase
5. Upgrades tier if `lifetimePoints` crosses a `TierConfig` threshold
6. Appends a `LoyaltyTransaction` record (INSERT ONLY)
7. Commits, then emits SSE and WebSocket events

Response `200`: updated `Order` with `status: "CONFIRMED"`.
Error `400`: order not found, invalid state.
Error `409`: coupon no longer valid or reserved by a different order.

---

**`PATCH /orders/:id/ready`** — Protected (cashier)

Barista has prepared the order. Emits `ORDER_READY` SSE event to customer.

Response `200`: updated `Order` with `status: "READY"`.
Error `400`: order not in `CONFIRMED` state.

---

**`PATCH /orders/:id/complete`** — Protected (cashier)

Closes the order. Terminal state.

Response `200`: updated `Order` with `status: "COMPLETED"`.
Error `400`: order not in `READY` state.

---

#### Loyalty & Coupons

---

**`GET /loyalty/points`** — Protected

Returns the current user's points balance and tier.

Response `200`:
```json
{
  "loyaltyPoints": 1250,
  "currentTier": "SILVER"
}
```

---

**`GET /wallet`** — Protected

Full loyalty wallet for the stamp card screen.

Response `200`:
```json
{
  "currentStampCount": 7,
  "loyaltyPoints": 1250,
  "availableCoupons": [
    {
      "id": 1,
      "code": "WKUP42",
      "source": "MILESTONE_AUTO",
      "status": "AVAILABLE",
      "discountType": "FIXED_AMOUNT",
      "discountValue": 10000,
      "maxValue": null,
      "appliesTo": "ORDER",
      "expiresAt": "2026-06-15T00:00:00.000Z",
      "createdAt": "2026-05-16T00:00:00.000Z"
    }
  ]
}
```

---

**`POST /coupons/validate`** — `@Public`

Preflight coupon check. Use in the cart screen to show the discounted total before submission. Does **not** reserve the coupon.

Request:
```json
{
  "code": "WKUP42",
  "orderTotal": 64000
}
```
Response `200`:
```json
{
  "valid": true,
  "discountedTotal": 54000
}
```
If invalid or expired: `{ "valid": false, "discountedTotal": 64000 }` — always `200`, never `4xx`.

---

### 6.4 Server-Sent Events (SSE)

**`GET /orders/status/:orderId/stream`** — Protected

Open with OkHttp SSE (`okhttp-sse:4.12.x`). Do **not** use the browser `EventSource` API.

```kotlin
val request = Request.Builder()
    .url("$BASE_URL/orders/status/$orderId/stream")
    .header("Authorization", "Bearer $accessToken")
    .build()

val listener = object : EventSourceListener() {
    override fun onEvent(eventSource: EventSource, id: String?, type: String?, data: String) {
        val snapshot = gson.fromJson(data, OrderSnapshot::class.java)
        // Bridge to main thread:
        viewModelScope.launch(Dispatchers.Main) {
            _orderState.value = snapshot
        }
    }
}
OkHttpClient().newEventSource(request, listener)
```

#### SSE Payload Shape

Every event is a JSON object:

```json
{
  "type": "ORDER_CONFIRMED | ORDER_READY | REWARD_ISSUED | TIER_UPGRADED",
  "orderId": "uuid",
  "status": "CONFIRMED | READY | ...",
  "currentStampCount": 3,
  "loyaltyPoints": 1280
}
```

| `type` | When fired | Fields present |
|---|---|---|
| `ORDER_CONFIRMED` | Cashier confirms payment | `type`, `orderId`, `status`, `currentStampCount`, `loyaltyPoints` |
| `ORDER_READY` | Barista marks ready | `type`, `orderId`, `status`, `currentStampCount`, `loyaltyPoints` |
| `REWARD_ISSUED` | 10th stamp milestone coupon issued | `type`, `orderId`, `status`, `loyaltyPoints` |
| `TIER_UPGRADED` | Customer crosses tier threshold | `type`, `orderId`, `status` (new tier name) |

**Critical:** Always **SET** local UI state from the server snapshot. Never **INCREMENT** client-side counters — the server is the source of truth.

---

### 6.5 WebSocket — Cashier Gateway

**Namespace:** `/cashier`
**Protocol:** Socket.IO (not raw WebSocket)
**Auth:** Send JWT in `auth.token` handshake option. Connection is dropped immediately if the token is missing or invalid.

```kotlin
val options = IO.Options().apply {
    auth = mapOf("token" to accessToken)
}
val socket = IO.socket("$BASE_URL/cashier", options)
socket.connect()
```

#### Events received by cashier

| Event | When | Payload |
|---|---|---|
| `new_order` | Customer submits an order | `{ orderId, tableNumber, totalAmount, ... }` |
| `order_updated` | Order status changes (CONFIRMED, READY) | `{ orderId, status }` |
| `order_cancelled` | Order cancelled by customer or cron | `{ orderId }` |

Show a local notification banner when `new_order` fires.

---

### 6.6 Data Models

#### Order Status State Machine

```
SUBMITTED ──► REVIEWING ──► CONFIRMED ──► READY ──► COMPLETED
    │               │
    └──► CANCELLED  └── (cron resets to SUBMITTED if lockedUntil expired)
    │
    └──► EXPIRED  (cron: SUBMITTED older than 30 min)
```

#### Order (condensed)

```typescript
{
  id: string           // UUID
  idempotencyKey: string
  userId: string       // UUID
  sessionId: string    // UUID
  tableNumber: number  // denormalized INT for display
  status: "SUBMITTED" | "REVIEWING" | "CONFIRMED" | "READY" | "COMPLETED" | "CANCELLED" | "EXPIRED"
  couponId: number | null
  subtotal: number     // IDR integer
  discountAmount: number
  totalAmount: number  // subtotal - discountAmount
  lockedUntil: string | null  // ISO8601, set during REVIEWING
  cashierId: string | null    // UUID
  createdAt: string
  updatedAt: string
  items?: OrderItem[]
}
```

#### OrderItem

```typescript
{
  id: string
  orderId: string
  menuItemId: string
  quantity: number
  unitPrice: number    // price snapshot at submission time
}
```

#### Coupon (inside wallet response)

```typescript
{
  id: number
  code: string         // 6-char, charset excludes O/0/I/1/S/5
  source: "MANUAL" | "MILESTONE_AUTO" | "STORE_REDEMPTION"
  status: "AVAILABLE" | "RESERVED" | "USED" | "EXPIRED"
  discountType: "FIXED_AMOUNT" | "PERCENTAGE"
  discountValue: number
  maxValue: number | null   // cap for PERCENTAGE type
  appliesTo: "ORDER"
  expiresAt: string
  createdAt: string
}
```

#### Tier Thresholds (from TierConfig seed data)

| Tier | Min lifetime points |
|---|---|
| BRONZE | 0 |
| SILVER | 1 000 |
| GOLD | 5 000 |

---

### 6.7 Error Response Structure

NestJS default error shape — all `4xx`/`5xx` responses:

```json
{
  "statusCode": 400,
  "message": "Human-readable description or array of validation errors",
  "error": "Bad Request"
}
```

Validation errors from `ValidationPipe` produce an array in `message`:

```json
{
  "statusCode": 400,
  "message": ["quantity must be a positive integer", "menuItemId must be a UUID"],
  "error": "Bad Request"
}
```

#### Common status codes

| Code | Meaning |
|---|---|
| `200` / `201` | Success |
| `400` | Bad request — invalid body, invalid state transition, not found |
| `401` | Missing or expired JWT — force re-login or refresh |
| `403` | Forbidden — action not allowed in current state (e.g. cancel a REVIEWING order) |
| `409` | Conflict — idempotency key collision or coupon double-reservation |
| `500` | Unexpected server error |

**WorkManager retry rule:** retry on network errors and `5xx`. Stop retrying on `409` (server already has the order — idempotent success).

---

### 6.8 FCM Integration Notes

FCM is used as a fallback for customers whose app is **backgrounded** or **killed** when an order status changes.

**When the app is foregrounded:** the SSE stream is live. Suppress the OS notification:
```kotlin
class MyFirebaseMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        val isForegrounded = ProcessLifecycleOwner.get().lifecycle
            .currentState.isAtLeast(Lifecycle.State.STARTED)
        if (isForegrounded) return  // SSE already handles UI
        // else: show notification
    }
}
```

**FCM data payload keys** (agreed contract):
```json
{
  "type": "ORDER_CONFIRMED | ORDER_READY | REWARD_ISSUED | TIER_UPGRADED",
  "orderId": "<uuid>"
}
```

Use `data` payload (not `notification` payload) so `onMessageReceived` always fires regardless of foreground/background state.

**Register / update FCM token:** call `PATCH /user/fcm-token` on app start after login and inside `onNewToken()` override.

---

*Last updated: 2026-05-16 — reflects codebase after full backend implementation pass.*
