# GitHub Issues Setup — Backend Team (backend-WUS)

> Complete step-by-step guide to create Labels, Milestones, Issues, and Project board for all 3 backend persons.

---

## Step 1 — Create the Custom Label

Go to `backend-WUS` repo → **Issues** → **Labels** → **New label**

| Name | Color | Description |
|---|---|---|
| `priority: blocker` | `#b91c1c` | Blocks other issues from starting |

All other labels (`enhancement`, `good first issue`, `help wanted`, `bug`, `question`) already exist by default — no action needed.

---

## Step 2 — Create Milestones

Go to **Issues** → **Milestones** → **New milestone** for each:

| Title | Description |
|---|---|
| `Phase 1 — Foundation` | Auth + DB connected, server starts clean |
| `Phase 2 — Menu & Sessions` | Table, MenuItem, Session entities + endpoints |
| `Phase 3 — Orders` | Order/OrderItem entities, POST /orders, cancel, reserveCoupon |
| `Phase 4 — Cashier Flow` | review/confirm/ready/complete + cron jobs |
| `Phase 5 — Loyalty` | Coupon/TierConfig/LoyaltyTransaction, wallet, validate |
| `Phase 6 — Real-Time` | SSE, WebSocket, FCM, EventEmitter wiring |

---

## Step 3 — Create Issues

Go to **Issues** → **New issue** for each one. Set the sidebar fields (Assignee, Labels, Milestone) as shown.

---

### Backend Person 1 — Authentication & User Management

---

**Issue BE1-1**
- **Title:** `[BE1] Fix Jest/Bun compatibility`
- **Body:**
  ```
  Downgrade to Jest 29.7.0, patch jest-runtime readonly-property bug,
  convert jest.config.ts → jest.config.js

  - bun add -d jest@29.7.0 @types/jest@^29.5.0 ts-jest@^29.2.5
  - bun patch jest-runtime@29.7.0
  - rename jest.config.ts → jest.config.js

  Must be done before any other task can be tested.
  ```
- **Labels:** `enhancement`, `priority: blocker`
- **Milestone:** `Phase 1 — Foundation`
- **Assignee:** Person 1

---

**Issue BE1-2**
- **Title:** `[BE1] .env schema validation (Joi)`
- **Body:**
  ```
  Create src/config/env.validation.ts
  Validate: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET,
  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, PORT=3030
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 1 — Foundation`
- **Assignee:** Person 1

---

**Issue BE1-3**
- **Title:** `[BE1] User entity`
- **Body:**
  ```
  Create src/users/entities/user.entity.ts
  Columns: id (UUID PK), googleId (unique), email (unique), displayName,
  fcmToken (nullable), loyaltyPoints (default 0), lifetimePoints (default 0),
  currentTier (ENUM BRONZE/SILVER/GOLD default BRONZE), purchaseCount (default 0),
  currentStampCount (default 0), refreshToken (hashed nullable), createdAt

  Blocks: AppModule wiring (BE1-4)
  ```
- **Labels:** `enhancement`, `priority: blocker`
- **Milestone:** `Phase 1 — Foundation`
- **Assignee:** Person 1

---

**Issue BE1-4**
- **Title:** `[BE1] Wire ConfigModule + TypeOrmModule in AppModule`
- **Body:**
  ```
  Add ConfigModule.forRoot() and TypeOrmModule.forRootAsync() to AppModule.
  Blocked by: BE1-3 (User entity)
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 1 — Foundation`
- **Assignee:** Person 1

---

**Issue BE1-5**
- **Title:** `[BE1] Enable global ValidationPipe in main.ts`
- **Body:**
  ```
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
  ```
- **Labels:** `good first issue`, `enhancement`
- **Milestone:** `Phase 1 — Foundation`
- **Assignee:** Person 1

---

**Issue BE1-6**
- **Title:** `[BE1] Google OAuth2 strategy + GET /auth/google + GET /auth/google/callback`
- **Body:**
  ```
  Full redirect flow — not token-verify only.
  Create src/auth/strategies/google.strategy.ts
  Upsert User by googleId on callback (store name, email, displayName).
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 1 — Foundation`
- **Assignee:** Person 1

---

**Issue BE1-7**
- **Title:** `[BE1] JWT strategy + JwtAuthGuard (global guard) + @Public() decorator`
- **Body:**
  ```
  src/auth/strategies/jwt.strategy.ts
  src/auth/guards/jwt-auth.guard.ts  ← register as global in AppModule
  src/auth/decorators/public.decorator.ts

  Blocks: all protected endpoints across all persons (BE2, BE3)
  ```
- **Labels:** `enhancement`, `priority: blocker`
- **Milestone:** `Phase 1 — Foundation`
- **Assignee:** Person 1

---

**Issue BE1-8**
- **Title:** `[BE1] JWT Refresh strategy + POST /auth/refresh`
- **Body:**
  ```
  src/auth/strategies/jwt-refresh.strategy.ts
  Hash refresh token before storing on User.
  POST /auth/refresh issues new access token from a valid refresh token.
  Refresh token expires in 30d; access token expires in 15min.
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 1 — Foundation`
- **Assignee:** Person 1

---

**Issue BE1-9**
- **Title:** `[BE1] GET /user/profile endpoint`
- **Body:**
  ```
  Returns user info + currentTier + loyaltyPoints from User entity.
  Protected by JwtAuthGuard (default — no @Public()).
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 1 — Foundation`
- **Assignee:** Person 1

---

**Issue BE1-10**
- **Title:** `[BE1] SSE service + CashierGateway + FCM service`
- **Body:**
  ```
  src/sse/sse.service.ts
  - Per-order Subject; push full state snapshots to customer
  - SSE stream: GET /orders/status/:orderId/stream

  src/gateways/cashier.gateway.ts
  - WebSocket namespace /cashier
  - JWT guard on handleConnection
  - Cashier joins cashier-room on connect
  - Emits: new_order / order_updated / order_cancelled

  src/notifications/fcm.service.ts
  - Data-only payloads with android.priority: high
  - Never use notification payload

  Wire all EventEmitter events post-commit only:
  order.submitted, order.confirmed, order.ready, reward.issued, user.tier_upgraded
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 6 — Real-Time`
- **Assignee:** Person 1

---

### Backend Person 2 — Order & Menu Management

---

**Issue BE2-1**
- **Title:** `[BE2] Table entity`
- **Body:**
  ```
  Create src/tables/entities/table.entity.ts
  Columns: id (UUID PK), tableNumber (UNIQUE INT),
  qrCode (UNIQUE VARCHAR — pre-generated, embedded in printed QR)
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 2 — Menu & Sessions`
- **Assignee:** Person 2

---

**Issue BE2-2**
- **Title:** `[BE2] MenuItem entity (isAvailable index)`
- **Body:**
  ```
  Create src/menu/entities/menu-item.entity.ts
  Columns: id, name, description (TEXT), price (INT IDR), category,
  imageUrl (nullable), isAvailable (default true), createdAt
  Note: the @Index on isAvailable is owned by BE3-4 (DB indexes task).
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 2 — Menu & Sessions`
- **Assignee:** Person 2

---

**Issue BE2-3**
- **Title:** `[BE2] Session entity`
- **Body:**
  ```
  Create src/sessions/entities/session.entity.ts
  Columns: id, userId FK → User, tableId FK → Table,
  status ENUM(ACTIVE/CLOSED), createdAt
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 2 — Menu & Sessions`
- **Assignee:** Person 2

---

**Issue BE2-4**
- **Title:** `[BE2] GET /menu endpoint (@Public)`
- **Body:**
  ```
  Returns all MenuItem where isAvailable = true.
  Mark with @Public() — no auth required.
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 2 — Menu & Sessions`
- **Assignee:** Person 2

---

**Issue BE2-5**
- **Title:** `[BE2] PATCH /menu/:id/availability (CASHIER role)`
- **Body:**
  ```
  Toggles isAvailable on the MenuItem.
  Requires CASHIER role guard — not accessible by customers.
  Used by cashier app to mark items as sold out.
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 2 — Menu & Sessions`
- **Assignee:** Person 2

---

**Issue BE2-6**
- **Title:** `[BE2] POST /sessions endpoint`
- **Body:**
  ```
  JWT required. QR scan creates or returns the active session for user+table.
  Logic: find existing ACTIVE session for (userId, tableId) → return it, else create new.
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 2 — Menu & Sessions`
- **Assignee:** Person 2

---

**Issue BE2-7**
- **Title:** `[BE2] Order entity (idempotencyKey UNIQUE CONSTRAINT)`
- **Body:**
  ```
  Create src/orders/entities/order.entity.ts
  Columns: id, idempotencyKey (UNIQUE — UQ_idempotency_key), userId FK,
  sessionId FK, tableId FK (denormalized for cashier display),
  status ENUM(SUBMITTED/REVIEWING/CONFIRMED/READY/COMPLETED/CANCELLED/EXPIRED),
  couponId FK nullable, subtotal, discountAmount (default 0), totalAmount,
  lockedUntil (nullable), cashierId FK nullable, createdAt, updatedAt

  Blocks: POST /orders (BE2-9), reserveCoupon (BE2-10), confirmOrder (BE3-6)
  ```
- **Labels:** `enhancement`, `priority: blocker`
- **Milestone:** `Phase 3 — Orders`
- **Assignee:** Person 2

---

**Issue BE2-8**
- **Title:** `[BE2] OrderItem entity (unitPrice snapshot)`
- **Body:**
  ```
  Create src/orders/entities/order-item.entity.ts
  Columns: id, orderId FK, menuItemId FK, quantity, unitPrice (INT)
  unitPrice is a price snapshot at order time — never re-read from MenuItem.
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 3 — Orders`
- **Assignee:** Person 2

---

**Issue BE2-9**
- **Title:** `[BE2] POST /orders with idempotency guard (error code 23505)`
- **Body:**
  ```
  Creates order + order items inside a queryRunner transaction.
  On PostgreSQL unique constraint violation (error code 23505 on idempotencyKey):
  catch the error and return the already-created order instead of throwing.
  Include reserveCoupon logic in same queryRunner (see BE2-10).
  Blocked by: BE2-7 (Order entity), BE1-7 (JwtAuthGuard)
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 3 — Orders`
- **Assignee:** Person 2

---

**Issue BE2-10**
- **Title:** `[BE2] reserveCoupon logic inside createOrder queryRunner`
- **Body:**
  ```
  Inside the POST /orders queryRunner (same transaction as BE2-9):
  - SELECT coupon FOR UPDATE (pessimistic write lock)
  - If already reserved for same idempotencyKey → idempotent, continue
  - If reserved for a different key → 409 Conflict
  - Set coupon status RESERVED, set reservedByIdempotencyKey
  Blocked by: BE3-1 (Coupon entity)
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 3 — Orders`
- **Assignee:** Person 2

---

**Issue BE2-11**
- **Title:** `[BE2] GET /orders/:id`
- **Body:**
  ```
  Returns full order detail including OrderItems.
  Customer sees own order only; cashier can see any order.
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 3 — Orders`
- **Assignee:** Person 2

---

**Issue BE2-12**
- **Title:** `[BE2] DELETE /orders/:id/cancel`
- **Body:**
  ```
  Cancels order if status is SUBMITTED.
  Returns 403 if status is REVIEWING.
  If a coupon was reserved: release it back to AVAILABLE, clear reservedByIdempotencyKey.
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 3 — Orders`
- **Assignee:** Person 2

---

**Issue BE2-13**
- **Title:** `[BE2] GET /orders (cashier dashboard list)`
- **Body:**
  ```
  Returns all orders for the cashier dashboard.
  Include tableId (denormalized), status, totalAmount, createdAt.
  Cashier role required.
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 3 — Orders`
- **Assignee:** Person 2

---

### Backend Person 3 — Loyalty & Coupon + Database

---

**Issue BE3-1**
- **Title:** `[BE3] Coupon entity`
- **Body:**
  ```
  Create src/loyalty/entities/coupon.entity.ts
  Columns: id, userId FK, code (4-6 chars — charset excludes O/0/I/1/S/5),
  source ENUM(MANUAL/MILESTONE_AUTO/STORE_REDEMPTION),
  status ENUM(AVAILABLE/RESERVED/USED/EXPIRED),
  discountType ENUM(FIXED_AMOUNT/PERCENTAGE),
  discountValue (INT — baked at issuance, price changes never affect earned rewards),
  maxValue (nullable — cap for PERCENTAGE type),
  appliesTo ENUM(ORDER),
  reservedByIdempotencyKey (nullable),
  expiresAt (+30d for milestones), createdAt

  Blocks: reserveCoupon (BE2-10), confirmOrder (BE3-6)
  ```
- **Labels:** `enhancement`, `priority: blocker`
- **Milestone:** `Phase 3 — Orders`
- **Assignee:** Person 3

  > Note: Even though BE3 owns the Loyalty phase, Coupon entity must be built during Phase 3
  > because BE2-10 (reserveCoupon inside POST /orders) depends on it.

---

**Issue BE3-2**
- **Title:** `[BE3] TierConfig entity + seed data`
- **Body:**
  ```
  Create src/loyalty/entities/tier-config.entity.ts
  Columns: id, tierName ENUM(BRONZE/SILVER/GOLD), threshold INT, description VARCHAR
  Note: use 'tierName' (not 'tier') — confirmOrder code references c.tierName.

  Seed data:
  - BRONZE → 0    ("Entry level")
  - SILVER → 1000 ("Regular customer")
  - GOLD   → 5000 ("VIP customer")

  Must be adjustable from dashboard without redeployment (no hardcoded values in loyalty logic).
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 5 — Loyalty`
- **Assignee:** Person 3

---

**Issue BE3-3**
- **Title:** `[BE3] LoyaltyTransaction entity (INSERT ONLY)`
- **Body:**
  ```
  Create src/loyalty/entities/loyalty-transaction.entity.ts
  Columns: id, userId FK, orderId FK (nullable — for admin adjustments),
  delta (INT — +N earn / -N redeem),
  reason ENUM(PURCHASE/REDEMPTION/ADMIN_ADJUST/REFUND), createdAt
  Add @Index() on userId.

  IMPORTANT: This table is append-only. Never UPDATE or DELETE rows.
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 5 — Loyalty`
- **Assignee:** Person 3

---

**Issue BE3-4**
- **Title:** `[BE3] All DB indexes (4 composite indexes)`
- **Body:**
  ```
  Add these indexes via TypeORM @Index decorators or migration:
  - idx_orders_status_updated  → Order(status, updatedAt)
  - idx_orders_user_status     → Order(userId, status)
  - idx_menu_available         → MenuItem(isAvailable)
  - idx_loyalty_tx_user        → LoyaltyTransaction(userId)

  Note: idempotencyKey and coupon code are already indexed via UNIQUE CONSTRAINT.
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 5 — Loyalty`
- **Assignee:** Person 3

---

**Issue BE3-5**
- **Title:** `[BE3] PATCH /orders/:id/review (REVIEWING lock)`
- **Body:**
  ```
  Sets order status to REVIEWING.
  Sets lockedUntil = NOW() + 2 minutes.
  CASHIER role only.
  Emits order_updated via CashierGateway (BE1-10).
  Blocked by: BE2-7 (Order entity), BE1-7 (JwtAuthGuard)
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 4 — Cashier Flow`
- **Assignee:** Person 3

---

**Issue BE3-6**
- **Title:** `[BE3] POST /orders/:id/confirm (full atomic transaction)`
- **Body:**
  ```
  Single queryRunner transaction:
  1. SELECT Order + User FOR UPDATE (pessimistic write lock)
  2. Validate status is SUBMITTED or REVIEWING
  3. SELECT coupon FOR UPDATE, verify reservedByIdempotencyKey matches, set USED
  4. Set order CONFIRMED, assign cashierId
  5. purchaseCount += 1
     currentStampCount = purchaseCount % 10
     pointsEarned = floor(totalAmount / 1000)
     loyaltyPoints += pointsEarned; lifetimePoints += pointsEarned
  6. Query TierConfig ORDER BY threshold DESC → find first row where lifetimePoints >= threshold → update currentTier
  7. INSERT LoyaltyTransaction row (reason: PURCHASE)
  8. If currentStampCount === 0 → auto-issue milestone Coupon (expiresAt = +30d), capture event
  9. COMMIT
  Post-commit (EventEmitter):
  - order.confirmed
  - reward.issued (if milestone coupon issued)
  - user.tier_upgraded (if tier changed)

  Blocked by: BE2-7 (Order entity), BE3-1 (Coupon entity),
              BE3-2 (TierConfig), BE3-3 (LoyaltyTransaction)
  ```
- **Labels:** `enhancement`, `priority: blocker`
- **Milestone:** `Phase 4 — Cashier Flow`
- **Assignee:** Person 3

---

**Issue BE3-7**
- **Title:** `[BE3] PATCH /orders/:id/ready`
- **Body:**
  ```
  Sets order status to READY (barista done preparing).
  CASHIER role only.
  Emits order_updated via CashierGateway + SSE snapshot to customer.
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 4 — Cashier Flow`
- **Assignee:** Person 3

---

**Issue BE3-8**
- **Title:** `[BE3] PATCH /orders/:id/complete`
- **Body:**
  ```
  Sets order status to COMPLETED (customer picked up).
  CASHIER role only.
  Final terminal state — no further transitions allowed.
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 4 — Cashier Flow`
- **Assignee:** Person 3

---

**Issue BE3-9**
- **Title:** `[BE3] Cron — release stale REVIEWING locks (every minute)`
- **Body:**
  ```
  src/tasks/tasks.service.ts
  @Cron every minute:
  Find orders WHERE status = REVIEWING AND lockedUntil < NOW()
  Use FOR UPDATE SKIP LOCKED to avoid conflicts with concurrent cashier actions.
  Reset status → SUBMITTED, clear lockedUntil.
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 4 — Cashier Flow`
- **Assignee:** Person 3

---

**Issue BE3-10**
- **Title:** `[BE3] Cron — expire stale SUBMITTED orders (every 5 min)`
- **Body:**
  ```
  src/tasks/tasks.service.ts
  @Cron every 5 minutes:
  Find orders WHERE status = SUBMITTED AND createdAt < NOW() - 30 minutes.
  For each:
  - Release reserved coupon → AVAILABLE, clear reservedByIdempotencyKey
  - Set order status → EXPIRED
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 4 — Cashier Flow`
- **Assignee:** Person 3

---

**Issue BE3-11**
- **Title:** `[BE3] POST /coupons/validate (preflight, no reserve)`
- **Body:**
  ```
  Preflight check called by frontend cart screen before order submission.
  Returns: { valid: boolean, discountedTotal: number }
  Does NOT reserve the coupon — reservation happens inside POST /orders.

  Calculation rules:
  - FIXED_AMOUNT: capped at orderTotal (result never negative)
  - PERCENTAGE: discountValue% of subtotal, capped at maxValue if set
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 5 — Loyalty`
- **Assignee:** Person 3

---

**Issue BE3-12**
- **Title:** `[BE3] GET /wallet`
- **Body:**
  ```
  Returns: { currentStampCount, loyaltyPoints, availableCoupons[] }
  Reads from User entity (stamps, points) + Coupon table (status = AVAILABLE for this user).
  JWT required — customer sees own wallet only.
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 5 — Loyalty`
- **Assignee:** Person 3

---

**Issue BE3-13**
- **Title:** `[BE3] GET /loyalty/points`
- **Body:**
  ```
  Returns customer loyalty points balance.
  Reads loyaltyPoints from User entity.
  JWT required.

  Note: POST /loyalty/earn does NOT exist as a standalone HTTP endpoint.
  Points are credited inside the confirmOrder transaction (BE3-6) to prevent race conditions.
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 5 — Loyalty`
- **Assignee:** Person 3

---

## Step 4 — Create the Project Board

1. Go to your GitHub profile/org → **Projects** → **New project**
2. Choose **Board** view → name it `Wake Up Social — Backend`
3. Link the repo: **Settings → Linked repositories** → add `backend-WUS`
4. Add columns: `Backlog` | `In Progress` | `In Review` | `Done`
5. Add a custom field: **+ New field → Single select** → name `Owner` → options: `BE1`, `BE2`, `BE3`
6. Add a custom field: **+ New field → Single select** → name `Phase` → options: `1`, `2`, `3`, `4`, `5`, `6`

All 36 issues will appear in the board. Use the **Filter** bar to focus by person:
```
assignee:@their-github-username
```

---

## Summary

| Person | Issues | Milestones |
|---|---|---|
| BE1 — Auth & User | 10 | Phase 1, Phase 6 |
| BE2 — Order & Menu | 13 | Phase 2, Phase 3 |
| BE3 — Loyalty & DB | 13 | Phase 4, Phase 5 |
| **Total** | **36** | **6 milestones** |

---

## Dependency Chain

The following issues must be completed before others can start. Note these in issue bodies using `Blocked by #N`:

```
BE1-1  Fix Jest/Bun          → unblocks: all test-related work
BE1-3  User entity           → unblocks: BE1-4 (AppModule wiring)
BE1-7  JwtAuthGuard          → unblocks: all protected endpoints (BE2, BE3)
BE3-1  Coupon entity         → unblocks: BE2-10 (reserveCoupon), BE3-6 (confirmOrder)
BE2-7  Order entity          → unblocks: BE3-5, BE3-6, BE3-7, BE3-8 (all cashier flow)
BE3-6  confirmOrder          → most complex single task; depends on BE2-7 + BE3-1/2/3
```
