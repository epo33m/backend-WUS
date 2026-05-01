# Wake Up Social — Team Job Descriptions

> Aligned to BLUEPRINT.md. Backend uses NestJS + TypeORM + Postgres. Frontend uses Kotlin + Jetpack Compose.

---

## FRONTEND TEAM (Kotlin/Android)

### Person 1 — Customer App
**Blueprint reference: Phase 7**

- Google Sign-In screen — deferred login: triggered only when user taps "Confirm Order", not on app launch. Cart is preserved via `SavedStateHandle` through the sign-in redirect
- Home/menu browsing screen — displays items from Room cache; shows "Synced at HH:MM" label; disables "Place Order" button when offline (`ConnectivityManager`). Backed by `SyncMenuWorker` (CoroutineWorker: `GET /menu` → REPLACE strategy into Room)
- Menu item detail screen
- Cart screen — `CartViewModel` backed by `SavedStateHandle` + `@Parcelize CartItem`; use `.copy()` for quantity changes (never `var`); includes coupon entry field that calls `POST /coupons/validate` for preflight and shows discounted total
- Order confirmation screen
- Order code display screen — opens SSE stream (`GET /orders/status/:orderId/stream`) via OkHttp SSE (not browser API); handles all four SSE event types: `ORDER_CONFIRMED` (play stamp sound), `ORDER_READY` (show ready UI), `REWARD_ISSUED` (Lottie celebration 2.5s auto-dismiss, coupon code visible immediately, tap to skip), `TIER_UPGRADED` (show tier upgrade UI)
- Wallet / stamp card screen — independently accessible from main navigation; calls `GET /wallet`, displays stamp count (0–9), loyalty points balance, list of available coupons
- QR code scanner — extracts `tableId`, persists to `SavedStateHandle`, calls `POST /sessions` to create or resume active session
- `SubmitOrderWorker` (CoroutineWorker): reads idempotency key from `WorkData`, retries on network error with exponential backoff, stops on HTTP 409 (server already has the order)
- FCM: suppress OS notification when app is foregrounded via `ProcessLifecycleOwner`

**Key dependencies:** Room, WorkManager, Retrofit, `okhttp-sse:4.12.x`, Firebase Auth + Messaging, Lottie Compose, Hilt

---

### Person 2 — Cashier Dashboard App
**Blueprint reference: Phase 4, Phase 2**

- Order list screen — connects to WebSocket namespace `/cashier`; receives `new_order` / `order_updated` / `order_cancelled` events in real time
- Order detail screen — shows table number (denormalized on Order), items, subtotal, discount amount, total
- Confirm payment button & status update:
  - Review button → `PATCH /orders/:id/review` (sets 2-min REVIEWING lock)
  - Confirm payment button → `POST /orders/:id/confirm` (atomic: burns coupon, awards points, issues milestone coupon if 10th purchase)
  - Mark ready button → `PATCH /orders/:id/ready` (barista done)
  - Complete button → `PATCH /orders/:id/complete`
- Table number field — read from order detail (editable display only; table assignment happens at QR scan via `POST /sessions`)
- Sold-out toggle for menu items → `PATCH /menu/:id/availability` (CASHIER role required)
- Simple in-app notification banner when `new_order` WebSocket event fires

**Key dependencies:** Retrofit, OkHttp, Socket.IO client, Hilt

---

### Person 3 — UI/UX & Integration
**Blueprint reference: Phase 7 (architecture, SSE lifecycle, FCM)**

- Design the overall color scheme, typography, and component style enforced across both Person 1 and Person 2 apps
- Make sure both Person 1 and Person 2 screens look consistent
- Connect all screens to backend API via Retrofit + OkHttp (`okhttp-sse:4.12.x` for SSE — NOT the browser SSE API)
- Integrate SSE listener into `OrderStatusViewModel`: bridge `onEvent` (OkHttp thread) → `viewModelScope.launch(Dispatchers.IO)`; always SET local state from server snapshot, never INCREMENT
- Wire FCM foreground suppression: check `ProcessLifecycleOwner`, skip OS notification if app is foregrounded (SSE already handles the UI update)
- Handle loading states, error states, and empty states for all screens
- Make sure navigation flow between screens is smooth (Compose NavHost)
- `SavedStateHandle` wiring audit: confirm cart and `tableId` survive process death during Google Sign-In redirect
- Coordinate with Backend Person 1 on SSE payload shape and WebSocket event names before either side starts implementation

---

## BACKEND TEAM (NestJS)

### Person 1 — Authentication & User Management
**Blueprint phases: Phase 1, Phase 6**

- Fix Jest/Bun compatibility: downgrade to Jest 29.7.0, patch `jest-runtime` readonly-property bug, convert `jest.config.ts` → `jest.config.js`
- `.env` schema validation (`config/env.validation.ts` — Joi): `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PORT=3030`
- `AppModule`: wire `ConfigModule.forRoot()` + `TypeOrmModule.forRootAsync()`
- Enable global `ValidationPipe` in `main.ts`
- `User` entity: id (UUID PK), googleId (unique), email (unique), displayName, fcmToken (nullable), loyaltyPoints (default 0), lifetimePoints (default 0), currentTier (ENUM BRONZE/SILVER/GOLD, default BRONZE), purchaseCount (default 0), currentStampCount (default 0), refreshToken (hashed, nullable), createdAt
- `AuthModule`:
  - Google OAuth2 strategy: `GET /auth/google` + `GET /auth/google/callback` (full redirect flow — not token-verify only)
  - JWT access token (15min) + refresh token (30d); hash refresh token before storing on `User`
  - `POST /auth/refresh` — issues new access token from a valid refresh token
  - `JwtAuthGuard` as global guard; `@Public()` decorator for unprotected routes
- `GET /user/profile` — returns user info and current points/tier (reads from `User` entity)
- Store user data on first Google login (upsert by `googleId`): name, email, profile picture (`displayName`), points balance
- SSE service (`sse/sse.service.ts`): per-order `Subject`, push full state snapshots to customer
- `CashierGateway` (`gateways/cashier.gateway.ts`): WebSocket namespace `/cashier`, JWT guard on `handleConnection`, cashier joins `cashier-room` on connect, emits `new_order` / `order_updated` / `order_cancelled`
- FCM service (`notifications/fcm.service.ts`): data-only payloads with `android.priority: high` — never notification payload
- Wire all `EventEmitter` events post-commit only: `order.submitted`, `order.confirmed`, `order.ready`, `reward.issued`, `user.tier_upgraded`

**Files owned:**
```
src/config/env.validation.ts
src/auth/
src/users/
src/sse/sse.service.ts
src/gateways/cashier.gateway.ts
src/notifications/fcm.service.ts
```

---

### Person 2 — Order & Menu Management
**Blueprint phases: Phase 2, Phase 3**

- `Table` entity: id (UUID PK), tableNumber (unique INT), qrCode (unique VARCHAR — pre-generated, embedded in printed QR)
- `MenuItem` entity: id, name, description (TEXT), price (INT IDR), category, imageUrl (nullable), isAvailable (default true), createdAt — index on `isAvailable`
- `Session` entity: id, userId FK → User, tableId FK → Table, status ENUM(ACTIVE/CLOSED), createdAt
- `Order` entity: id, idempotencyKey (UNIQUE CONSTRAINT `UQ_idempotency_key` — the core guard), userId FK, sessionId FK, tableId FK (denormalized for cashier display), status ENUM(SUBMITTED/REVIEWING/CONFIRMED/READY/COMPLETED/CANCELLED/EXPIRED), couponId FK nullable, subtotal, discountAmount (default 0), totalAmount, lockedUntil (nullable), cashierId FK nullable, createdAt, updatedAt
- `OrderItem` entity: id, orderId FK, menuItemId FK, quantity, unitPrice (INT — price snapshot at order time, never re-read from menu)
- API endpoints:
  - `GET /menu` — `@Public()`, returns all items where `isAvailable = true`
  - `PATCH /menu/:id/soldout` → maps to `PATCH /menu/:id/availability` — CASHIER role only, toggles `isAvailable`
  - `POST /sessions` — JWT, QR scan creates or returns active session for user+table
  - `POST /order` → `POST /orders` — idempotency via DB unique constraint; catch error code `23505` → return the already-created order
  - `GET /order` → `GET /orders` — returns all orders (for cashier dashboard)
  - `PATCH /order/:id/status` → maps to review (`PATCH /orders/:id/review`), ready (`PATCH /orders/:id/ready`), complete (`PATCH /orders/:id/complete`) — distinct endpoints per state transition
  - `GET /order/:id` → `GET /orders/:id` — get order detail
  - `DELETE /orders/:id/cancel` — cancel if SUBMITTED; blocked if REVIEWING; releases coupon → AVAILABLE
- `reserveCoupon` logic inside `createOrder` queryRunner: pessimistic write lock (`SELECT FOR UPDATE`), idempotent re-assert for same idempotency key, 409 Conflict for a different key

**Files owned:**
```
src/tables/
src/menu/
src/sessions/
src/orders/
```

---

### Person 3 — Loyalty & Coupon + Database
**Blueprint phases: Phase 4, Phase 5**

- Design and own all database entities and relationships (10 total): User, Table, MenuItem, Session, Order, OrderItem, Coupon, TierConfig, LoyaltyTransaction
- Database indexes: `idx_orders_status_updated (status, updated_at)`, `idx_orders_user_status (user_id, status)`, `idx_menu_available (is_available)`, `idx_loyalty_tx_user (user_id)` — idempotency key and coupon code already indexed via UNIQUE CONSTRAINT
- `Coupon` entity: id, userId FK, code (4–6 chars, charset excludes O/0/I/1/S/5), source ENUM(MANUAL/MILESTONE_AUTO/STORE_REDEMPTION), status ENUM(AVAILABLE/RESERVED/USED/EXPIRED), discountType ENUM(FIXED_AMOUNT/PERCENTAGE), discountValue (baked at issuance — price changes never affect earned rewards), maxValue (nullable cap for PERCENTAGE type), appliesTo ENUM(ORDER), reservedByIdempotencyKey (nullable), expiresAt (+30d for milestones), createdAt
- `TierConfig` entity + seed data: BRONZE=0, SILVER=1000, GOLD=5000 (adjustable from dashboard without redeployment)
- `LoyaltyTransaction` entity — **INSERT ONLY, never UPDATE or DELETE**: id, userId FK, orderId FK (nullable for admin adjustments), delta (+N earn / -N redeem), reason ENUM(PURCHASE/REDEMPTION/ADMIN_ADJUST/REFUND), createdAt — index on `userId`
- Loyalty points logic inside `confirmOrder` atomic transaction (called by cashier flow, single `queryRunner`):
  1. Pessimistic write lock on Order + User
  2. Validate order status (must be SUBMITTED or REVIEWING)
  3. Lock + burn coupon (`CouponStatus.USED`), verify `reservedByIdempotencyKey` matches
  4. Set order `CONFIRMED`, assign `cashierId`
  5. `purchaseCount += 1`; `currentStampCount = purchaseCount % 10`; `pointsEarned = floor(totalAmount / 1000)`; add to both `loyaltyPoints` and `lifetimePoints`
  6. Tier upgrade: query `TierConfig` sorted by threshold DESC, find first match against `lifetimePoints`
  7. Append `LoyaltyTransaction` row
  8. If `currentStampCount === 0`: auto-issue milestone `Coupon`, capture event
  9. Commit, emit events post-commit only
- Coupon discount calculation: FIXED_AMOUNT capped at orderTotal (never negative); PERCENTAGE with optional `maxValue` cap
- API endpoints:
  - `GET /loyalty/points` — returns customer points balance (reads from `User`)
  - `POST /coupon/validate` → `POST /coupons/validate` — preflight check, returns `{ valid, discountedTotal }`, does NOT reserve
  - `POST /coupon/apply` — reserves coupon against idempotency key via pessimistic write lock (part of `POST /orders` flow)
  - `POST /loyalty/earn` — **internal only**; points are earned inside the `confirmOrder` transaction, not via a separate HTTP call (a standalone endpoint would create a race condition)
  - `GET /wallet` — returns `{ currentStampCount, loyaltyPoints, availableCoupons[] }`
- Cron jobs (`tasks/tasks.service.ts`):
  - Every minute: release stale REVIEWING locks (`lockedUntil < NOW()`) → reset to SUBMITTED using `FOR UPDATE SKIP LOCKED`
  - Every 5 minutes: expire SUBMITTED orders older than 30min → release their coupons → set EXPIRED

**Files owned:**
```
src/cashier/
src/loyalty/
src/tasks/
```

---

## DOCUMENTATION TEAM

### Person 1 — Project Report

- Background & problem statement (POS complement, QR-based ordering)
- Objectives of the app: offline-first, process-death safe, idempotent order submission
- Scope and limitations: V1 in/out table from blueprint
- System overview & how it works: customer flow, cashier flow, real-time notification paths
- Conclusion & future recommendations (V2+: order history, rewards store, admin panel, tier-based point multipliers)
- This person should check in weekly with both teams to stay updated

### Person 2 — Technical & UI Documentation

- User flow diagrams: customer flow (QR scan → browse → deferred login → submit via WorkManager → SSE tracking), cashier flow (WebSocket → review → confirm → ready → complete)
- Wireframes or screenshots of each screen (coordinate with Frontend Persons 1 & 2)
- Database schema diagram — all 10 entities with relationships + indexes (work closely with Backend Person 3)
- API documentation — all endpoints with request/response shapes, auth requirements, error codes (especially 409 for idempotency key conflicts and coupon double-reservation)
- System architecture diagram: Android → NestJS REST + SSE + WebSocket → Postgres; FCM path for backgrounded users
- Order state machine diagram: SUBMITTED → REVIEWING → CONFIRMED → READY → COMPLETED, plus CANCELLED and EXPIRED branches with cron triggers

### Person 3 — Testing & Presentation

- Write test cases for each feature using the blueprint Verification Checklist as the baseline (10 cases):
  1. Submit order twice with same idempotency key → 1 order created, second call returns existing
  2. Two concurrent cashier confirms on same order → second throws "Order in invalid state"
  3. Apply coupon in two concurrent sessions → second gets 409 Conflict
  4. Kill Android app mid-Google-Sign-In → cart survives via `SavedStateHandle`
  5. Submit order while offline → WorkManager queues, submits when connected
  6. 10th purchase → milestone coupon auto-issued, SSE fires `REWARD_ISSUED`, Lottie plays
  7. 0 → GOLD tier jump in one transaction → Tier = GOLD (no Silver skipped)
  8. Order in REVIEWING > 2 min → cron resets to SUBMITTED
  9. Order SUBMITTED > 30 min → cron sets EXPIRED, coupon released to AVAILABLE
  10. FCM received while app is foregrounded → OS notification suppressed, SSE handles UI
- Do manual testing on the app (try to break it, find bugs, report them)
- Start testing as soon as any single feature is ready, not just at the end
- Prepare the final presentation slides
- Prepare the demo script for presenting the app
- Handle the live demo during presentation day

---

## Important Notes for the whole team

- Frontend Person 3 and Backend team need to **agree on API structure early** — this is critical so both sides don't block each other. Key contracts to lock down first: SSE payload schema (`type`, `orderId`, `status`, `currentStampCount`, `loyaltyPoints`), WebSocket event names, JWT header format, FCM data payload keys
- Documentation Person 3 should start testing **as soon as any feature is ready**, not just at the end
- Set a **mid-project checkpoint** where everyone shows their progress to avoid surprises near the deadline

---

## Cross-Team Agreements (Must be settled before sprint 1 ends)

| Agreement | Parties |
|:---|:---|
| API contract: all endpoint paths, request bodies, response shapes | Backend Person 2 + Frontend Person 1 |
| SSE payload schema (`type`, `orderId`, `status`, `currentStampCount`, `loyaltyPoints`) | Backend Person 1 + Frontend Person 3 |
| WebSocket event names and payload for cashier (`new_order`, `order_updated`, `order_cancelled`) | Backend Person 1 + Frontend Person 2 |
| JWT header format (`Authorization: Bearer <token>`) and refresh flow | Backend Person 1 + Frontend Persons 1 & 2 |
| FCM data payload keys (`type`, `orderId`) | Backend Person 1 + Frontend Person 3 |
