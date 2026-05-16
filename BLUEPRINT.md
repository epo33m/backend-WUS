# Wake Up Social — Full Implementation Blueprint

## Overview

Coffee shop ordering app that complements the existing POS. Customer scans QR → browses menu → places order → pays at cashier → receives order. Built on NestJS + Postgres (backend) and Kotlin/Compose (Android).

The backend is currently a blank NestJS starter. No ORM, no modules. Everything below is greenfield.

---

## Pre-requisite: Fix Jest/Bun Compatibility

The project has Jest 30, which breaks Bun 1.x.

```bash
bun add -d jest@29.7.0 @types/jest@^29.5.0 ts-jest@^29.2.5
bun patch jest-runtime@29.7.0  # apply readonly-property fix
```

Convert `jest.config.ts` → `jest.config.js` to avoid ts-node triggering the same bug via `@cspotcode/source-map-support`.

---

## Phase 1 — Backend Foundation

**Goal:** Postgres connected, Google Auth + JWT working, server starts clean.

### Install

```bash
bun add @nestjs/typeorm typeorm pg @nestjs/config \
        @nestjs/jwt @nestjs/passport passport passport-google-oauth20 passport-jwt \
        @nestjs/schedule @nestjs/event-emitter \
        class-validator class-transformer
bun add -d @types/passport-google-oauth20 @types/passport-jwt
```

### Steps

1. Create `.env` with `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PORT=3030`
2. Add `ConfigModule.forRoot()` + `TypeOrmModule.forRootAsync()` to `AppModule`
3. Enable `ValidationPipe` globally in `main.ts`
4. Create `User` entity:

| Column | Type | Notes |
|:---|:---|:---|
| `id` | UUID PK | auto-generated |
| `googleId` | VARCHAR unique | from Google OAuth |
| `email` | VARCHAR unique | |
| `displayName` | VARCHAR | |
| `fcmToken` | VARCHAR nullable | updated on app launch |
| `loyaltyPoints` | INT default 0 | spendable balance |
| `lifetimePoints` | INT default 0 | never decremented, drives tier |
| `currentTier` | ENUM(BRONZE/SILVER/GOLD) default BRONZE | cached for UI |
| `purchaseCount` | INT default 0 | total confirmed orders |
| `currentStampCount` | INT default 0 | `purchaseCount % 10`, 0–9 |
| `refreshToken` | VARCHAR nullable | hashed |
| `createdAt` | TIMESTAMP | |

5. `AuthModule`: Google OAuth2 strategy → issue JWT access token (15min) + refresh token (30d). Store hashed refresh token on `User`. Endpoints: `GET /auth/google`, `GET /auth/google/callback`, `POST /auth/refresh`
6. `JwtAuthGuard` as global guard. `@Public()` decorator for unprotected routes.

### File Structure

```
src/
  config/
    env.validation.ts       # Joi schema for .env
  auth/
    auth.module.ts
    auth.controller.ts
    auth.service.ts
    strategies/
      google.strategy.ts
      jwt.strategy.ts
      jwt-refresh.strategy.ts
    guards/
      jwt-auth.guard.ts
    decorators/
      public.decorator.ts
  users/
    users.module.ts
    users.service.ts
    entities/user.entity.ts
```

---

## Phase 2 — Menu & Table Session

**Goal:** QR scan creates a session. Menu is offline-cacheable by Android.

### Entities

**`Table`**
- `id` UUID PK
- `tableNumber` INT unique
- `qrCode` VARCHAR unique (pre-generated, embedded in printed QR)

**`MenuItem`**
- `id` UUID PK
- `name` VARCHAR
- `description` TEXT
- `price` INT (IDR, e.g. 32000)
- `category` VARCHAR
- `imageUrl` VARCHAR nullable
- `isAvailable` BOOL default true
- `createdAt` TIMESTAMP
- Index on `isAvailable`

**`Session`**
- `id` UUID PK
- `userId` FK → User
- `tableId` FK → Table
- `status` ENUM(ACTIVE/CLOSED) default ACTIVE
- `createdAt` TIMESTAMP

### Endpoints

| Method | Path | Auth | Description |
|:---|:---|:---|:---|
| `POST` | `/sessions` | JWT | QR scan. Creates or returns active session for user+table. Body: `{ tableId }` |
| `GET` | `/menu` | `@Public()` | Returns all items where `isAvailable = true` |
| `PATCH` | `/menu/:id/availability` | JWT + CASHIER role | Sets `isAvailable`. Cashier controls sold-out status |

### File Structure

```
src/
  tables/
    tables.module.ts
    tables.service.ts
    entities/table.entity.ts
  menu/
    menu.module.ts
    menu.controller.ts
    menu.service.ts
    entities/menu-item.entity.ts
  sessions/
    sessions.module.ts
    sessions.service.ts
    entities/session.entity.ts
```

---

## Phase 3 — Order Submission (The Fortress)

**Goal:** WorkManager-resilient order creation. Idempotency at the DB constraint level.

### Entities

**`Order`**

| Column | Type | Notes |
|:---|:---|:---|
| `id` | UUID PK | |
| `idempotencyKey` | VARCHAR | **UNIQUE CONSTRAINT** `UQ_idempotency_key` — the core guard |
| `userId` | FK → User | |
| `sessionId` | FK → Session | |
| `tableId` | FK → Table | denormalized for cashier display |
| `status` | ENUM | SUBMITTED / REVIEWING / CONFIRMED / READY / COMPLETED / CANCELLED / EXPIRED |
| `couponId` | FK → Coupon nullable | applied at submission |
| `subtotal` | INT | sum of item prices |
| `discountAmount` | INT default 0 | from coupon |
| `totalAmount` | INT | `subtotal - discountAmount` |
| `lockedUntil` | TIMESTAMP nullable | set when REVIEWING |
| `cashierId` | FK → User nullable | set on confirm |
| `createdAt` | TIMESTAMP | |
| `updatedAt` | TIMESTAMP | |

**`OrderItem`**
- `id` UUID PK
- `orderId` FK → Order
- `menuItemId` FK → MenuItem
- `quantity` INT
- `unitPrice` INT — **snapshot at order time**, never read from menu again

### `POST /orders` Service Logic

```typescript
async createOrder(dto: CreateOrderDto) {
  try {
    const newOrder = this.orderRepo.create({ ...dto, status: OrderStatus.SUBMITTED });
    return await this.orderRepo.save(newOrder);
  } catch (err) {
    if (err.code === '23505') {
      // WorkManager retry — return the already-created order
      return this.orderRepo.findOne({ where: { idempotencyKey: dto.idempotencyKey } });
    }
    throw err;
  }
}
```

### `reserveCoupon` Logic (inside same queryRunner)

```typescript
async reserveCoupon(couponId: string, idempotencyKey: string, queryRunner: QueryRunner) {
  const coupon = await queryRunner.manager.findOne(Coupon, {
    where: { id: couponId },
    lock: { mode: 'pessimistic_write' }
  });

  // Different order already holds the lock → block
  if (coupon.status === 'RESERVED' && coupon.reservedByIdempotencyKey !== idempotencyKey) {
    throw new ConflictException('Coupon is currently locked by another session.');
  }

  // Same order retrying → idempotent re-assert
  coupon.status = CouponStatus.RESERVED;
  coupon.reservedByIdempotencyKey = idempotencyKey;
  await queryRunner.manager.save(coupon);
}
```

### Other Endpoints

| Method | Path | Description |
|:---|:---|:---|
| `GET` | `/orders/:id` | Customer fetches order state |
| `DELETE` | `/orders/:id/cancel` | Cancel if status is SUBMITTED. Blocked if REVIEWING. Releases coupon → AVAILABLE |

### File Structure

```
src/
  orders/
    orders.module.ts
    orders.controller.ts
    orders.service.ts
    dto/create-order.dto.ts
    entities/
      order.entity.ts
      order-item.entity.ts
```

---

## Phase 4 — Cashier Confirmation (Atomic Transaction)

**Goal:** Single `queryRunner` block handles all state transitions. Events emitted only after commit.

### Endpoints

| Method | Path | Description |
|:---|:---|:---|
| `PATCH` | `/orders/:id/review` | Cashier opens order. Sets REVIEWING + `lockedUntil = NOW + 2min` |
| `POST` | `/orders/:id/confirm` | Full atomic confirmation (see below) |
| `PATCH` | `/orders/:id/ready` | Barista marks drink ready. Emits SSE `ORDER_READY` |
| `PATCH` | `/orders/:id/complete` | Cashier closes. Sets COMPLETED |

### `confirmOrder` Transaction

```typescript
async confirmOrder(orderId: string, cashierId: string) {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  let milestoneEvent = null;
  let tierEvent = null;

  try {
    // 1. Lock order + user
    const order = await queryRunner.manager.findOne(Order, {
      where: { id: orderId },
      lock: { mode: 'pessimistic_write' }
    });
    const user = await queryRunner.manager.findOne(User, {
      where: { id: order.userId },
      lock: { mode: 'pessimistic_write' }
    });

    if (![OrderStatus.SUBMITTED, OrderStatus.REVIEWING].includes(order.status)) {
      throw new BadRequestException('Order in invalid state');
    }

    // 2. Lock + burn coupon if present
    if (order.couponId) {
      const coupon = await queryRunner.manager.findOne(Coupon, {
        where: { id: order.couponId },
        lock: { mode: 'pessimistic_write' }
      });
      if (coupon.reservedByIdempotencyKey !== order.idempotencyKey) {
        throw new ConflictException('Coupon reservation mismatch');
      }
      coupon.status = CouponStatus.USED;
      await queryRunner.manager.save(coupon);
    }

    // 3. Confirm order
    order.status = OrderStatus.CONFIRMED;
    order.cashierId = cashierId;
    await queryRunner.manager.save(order);

    // 4. Stamp + points
    user.purchaseCount += 1;
    user.currentStampCount = user.purchaseCount % 10;
    const pointsEarned = Math.floor(order.totalAmount / 1000);
    user.loyaltyPoints += pointsEarned;
    user.lifetimePoints += pointsEarned;

    // 5. Tier upgrade (cascading, from config table)
    const tierConfigs = await queryRunner.manager.find(TierConfig, { order: { threshold: 'DESC' } });
    const targetConfig = tierConfigs.find(c => user.lifetimePoints >= c.threshold);
    const newTier = targetConfig?.tierName ?? Tier.BRONZE;
    if (newTier !== user.currentTier) {
      tierEvent = { userId: user.id, oldTier: user.currentTier, newTier };
      user.currentTier = newTier;
    }

    await queryRunner.manager.save(user);

    // 6. Append-only loyalty log
    await queryRunner.manager.insert(LoyaltyTransaction, {
      userId: user.id, orderId, delta: pointsEarned, reason: LoyaltyReason.PURCHASE
    });

    // 7. Milestone coupon (10th purchase)
    if (user.currentStampCount === 0) {
      const coupon = await this.issueMilestoneCoupon(user, queryRunner);
      milestoneEvent = { userId: user.id, couponCode: coupon.code };
    }

    await queryRunner.commitTransaction();
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }

  // ✅ Post-commit only — database is settled before any notification fires
  this.eventEmitter.emit('order.confirmed', { orderId, userId: order.userId,
    currentStampCount: user.currentStampCount });
  if (tierEvent) this.eventEmitter.emit('user.tier_upgraded', tierEvent);
  if (milestoneEvent) this.eventEmitter.emit('reward.issued', milestoneEvent);
}
```

### Cron Jobs

```typescript
// Stale REVIEWING lock — reset to SUBMITTED
@Cron(CronExpression.EVERY_MINUTE)
async releaseStaleReviewLocks() {
  await this.dataSource.query(`
    UPDATE "order"
    SET status = 'SUBMITTED', locked_until = NULL
    WHERE status = 'REVIEWING'
      AND locked_until < NOW()
    FOR UPDATE SKIP LOCKED
  `);
}

// Stale SUBMITTED orders — expire after 30 minutes
@Cron(CronExpression.EVERY_5_MINUTES)
async expireStaleOrders() {
  // Fetch expired orders to release their coupons first
  const staleOrders = await this.orderRepo.find({
    where: { status: OrderStatus.SUBMITTED,
             updatedAt: LessThan(new Date(Date.now() - 30 * 60 * 1000)) }
  });
  for (const order of staleOrders) {
    if (order.couponId) {
      await this.couponService.release(order.couponId);
    }
  }
  await this.orderRepo.update(
    { status: OrderStatus.SUBMITTED,
      updatedAt: LessThan(new Date(Date.now() - 30 * 60 * 1000)) },
    { status: OrderStatus.EXPIRED }
  );
}
```

### File Structure

```
src/
  cashier/
    cashier.module.ts
    cashier.controller.ts
    cashier.service.ts
  tasks/
    tasks.module.ts
    tasks.service.ts   # cron jobs
```

---

## Phase 5 — Loyalty & Coupon Engine

**Goal:** Dual-balance loyalty. Fixed-value coupon issuance. Full lifecycle with audit trail.

### Entities

**`Coupon`**

| Column | Type | Notes |
|:---|:---|:---|
| `id` | UUID PK | |
| `userId` | FK → User | owner |
| `code` | VARCHAR unique | 4–6 chars, charset excludes `O 0 I 1 S 5` |
| `source` | ENUM | MANUAL / MILESTONE_AUTO / STORE_REDEMPTION |
| `status` | ENUM | AVAILABLE / RESERVED / USED / EXPIRED |
| `discountType` | ENUM | FIXED_AMOUNT / PERCENTAGE |
| `discountValue` | INT | baked at issuance (e.g. 32000 IDR) |
| `maxValue` | INT nullable | cap for PERCENTAGE type |
| `appliesTo` | ENUM | ORDER (extend later) |
| `reservedByIdempotencyKey` | VARCHAR nullable | links reservation to order attempt |
| `expiresAt` | TIMESTAMP | +30 days from issuance for milestones |
| `createdAt` | TIMESTAMP | |

**`TierConfig`** (seeded, configurable from dashboard — no redeployment needed)

| Column | Type | Notes |
|:---|:---|:---|
| `id` | UUID PK | |
| `tierName` | ENUM(BRONZE/SILVER/GOLD) | |
| `threshold` | INT | lifetime points required |
| `description` | VARCHAR | e.g. "Points required for Gold Tier" |

Seed values (adjustable):

| Tier | Threshold |
|:---|:---|
| BRONZE | 0 |
| SILVER | 1000 |
| GOLD | 5000 |

**`LoyaltyTransaction`** — **INSERT ONLY. Never UPDATE or DELETE.**

| Column | Type | Notes |
|:---|:---|:---|
| `id` | UUID PK | |
| `userId` | FK → User | |
| `orderId` | FK → Order nullable | null for admin adjustments |
| `delta` | INT | +N for earn, -N for redemption |
| `reason` | ENUM | PURCHASE / REDEMPTION / ADMIN_ADJUST / REFUND |
| `createdAt` | TIMESTAMP | |

Index on `(userId)` for wallet queries.

### Coupon Discount Calculation

```typescript
function calculateDiscount(orderTotal: number, coupon: Coupon): number {
  if (coupon.discountType === 'FIXED_AMOUNT') {
    return Math.min(orderTotal, coupon.discountValue);   // never negative total
  }
  if (coupon.discountType === 'PERCENTAGE') {
    const raw = Math.floor((orderTotal * coupon.discountValue) / 100);
    return Math.min(raw, coupon.maxValue ?? raw);        // cap enforced
  }
  return 0;
}
```

$$FinalTotal = \max(0,\ Subtotal - DiscountValue)$$

### Endpoints

| Method | Path | Auth | Description |
|:---|:---|:---|:---|
| `POST` | `/coupons/validate` | JWT | Pre-flight check. Returns `{ valid, discountedTotal }`. Does NOT reserve. |
| `GET` | `/wallet` | JWT | Returns `{ currentStampCount, loyaltyPoints, availableCoupons[] }` |

### File Structure

```
src/
  loyalty/
    loyalty.module.ts
    loyalty.controller.ts
    coupon.service.ts
    tier.service.ts
    entities/
      coupon.entity.ts
      tier-config.entity.ts
      loyalty-transaction.entity.ts
```

---

## Phase 6 — Real-Time Layer (SSE + WebSocket + FCM)

**Goal:** Customer gets SSE state snapshots. Cashier gets WebSocket push. Background users get FCM.

### Install

```bash
bun add @nestjs/websockets @nestjs/platform-socket.io firebase-admin
bun add -d @types/firebase-admin
```

### SSE — Customer Order Status

```typescript
// GET /orders/status/:orderId/stream
@Sse('status/:orderId/stream')
streamOrderStatus(@Param('orderId') orderId: string): Observable<MessageEvent> {
  return this.sseService.getSubject(orderId).asObservable().pipe(
    map(data => ({ data }) as MessageEvent)
  );
}
```

Payload is always a **full state snapshot** (not a delta):

```json
{
  "type": "ORDER_CONFIRMED",
  "orderId": "...",
  "status": "CONFIRMED",
  "currentStampCount": 3,
  "loyaltyPoints": 450
}
```

The Android app does `SET`, never `INCREMENT`, on local state.

### WebSocket — Cashier Dashboard

- `CashierGateway` with `@WebSocketGateway({ namespace: '/cashier' })`
- JWT guard on the `handleConnection` hook
- Emits: `new_order`, `order_updated`, `order_cancelled`
- Cashier joins room `cashier-room` on connect

### FCM — Background Notifications

```typescript
// Always data-only payload (never notification payload)
// Android handles display logic based on foreground state
await this.firebaseAdmin.messaging().send({
  token: user.fcmToken,
  data: { type: 'ORDER_READY', orderId },
  android: { priority: 'high' }  // wakes device from doze — critical for OEM devices
});
```

### Event Wiring (post-commit)

| EventEmitter Event | SSE | WebSocket (Cashier) | FCM |
|:---|:---|:---|:---|
| `order.submitted` | — | ✅ `new_order` | — |
| `order.confirmed` | ✅ snapshot to customer | ✅ `order_updated` | ✅ if backgrounded |
| `order.ready` | ✅ `ORDER_READY` to customer | ✅ `order_updated` | ✅ if backgrounded |
| `reward.issued` | ✅ `REWARD_ISSUED` | — | ✅ if backgrounded |
| `user.tier_upgraded` | ✅ `TIER_UPGRADED` | — | — |

### File Structure

```
src/
  sse/
    sse.service.ts
  gateways/
    cashier.gateway.ts
  notifications/
    fcm.service.ts
```

---

## Phase 7 — Android App (Kotlin)

**Goal:** Offline-first customer app. Process-death safe. Lifecycle-aware real-time updates.

### Project Setup

- Kotlin, minSdk 26, Jetpack Compose
- Architecture: MVVM + Repository pattern
- DI: Hilt

### Dependencies (`build.gradle.kts`)

```kotlin
// Room
implementation("androidx.room:room-runtime:2.7.x")
implementation("androidx.room:room-ktx:2.7.x")
ksp("androidx.room:room-compiler:2.7.x")

// WorkManager
implementation("androidx.work:work-runtime-ktx:2.10.x")

// Networking
implementation("com.squareup.retrofit2:retrofit:2.11.x")
implementation("com.squareup.okhttp3:okhttp:4.12.x")
implementation("com.squareup.okhttp3:okhttp-sse:4.12.x")  // SSE — NOT the browser API

// Firebase
implementation(platform("com.google.firebase:firebase-bom:33.x"))
implementation("com.google.firebase:firebase-auth-ktx")
implementation("com.google.firebase:firebase-messaging-ktx")

// UI
implementation("com.airbnb.android:lottie-compose:6.x")

// Lifecycle
implementation("androidx.lifecycle:lifecycle-process:2.9.x")  // ProcessLifecycleOwner
```

### Key Data Classes

```kotlin
@Parcelize
data class CartItem(
    val id: String,
    val name: String,
    val price: Double,
    val quantity: Int       // val — not var. Use .copy() to update
) : Parcelable
```

### CartViewModel (Process-Death Safe)

```kotlin
class CartViewModel(private val state: SavedStateHandle) : ViewModel() {

    private val _cart = state.getLiveData<List<CartItem>>("current_cart", emptyList())
    val cart: LiveData<List<CartItem>> = _cart

    fun addItem(item: CartItem) {
        val current = _cart.value ?: emptyList()
        val idx = current.indexOfFirst { it.id == item.id }
        _cart.value = if (idx >= 0)
            current.toMutableList().also { it[idx] = it[idx].copy(quantity = it[idx].quantity + 1) }
        else
            current + item
        state["current_cart"] = _cart.value  // persist to Bundle
    }
}
```

### Auth Flow (Deferred Login)

1. QR scan → save `tableId` to `SavedStateHandle`
2. User browses menu freely (no login required)
3. On "Confirm Order" tap → check `FirebaseAuth.currentUser`
4. If null → launch Google Sign-In
5. On sign-in success → cart is still in `SavedStateHandle` → proceed to submit

### Menu Sync Worker

```kotlin
class SyncMenuWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        return try {
            val items = menuApi.getMenu()
            menuDao.replaceAll(items)   // REPLACE strategy — server is truth
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
```

UI shows "Synced at HH:MM" label. "Place Order" button is disabled when `ConnectivityManager` reports no active network.

### Order Submit Worker

```kotlin
class SubmitOrderWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        val idempotencyKey = inputData.getString("idempotency_key")!!
        val order = orderDao.getByIdempotencyKey(idempotencyKey) ?: return Result.failure()
        return try {
            val response = orderApi.submitOrder(order.toDto())
            orderDao.update(order.copy(serverId = response.id, status = "SUBMITTED"))
            Result.success()
        } catch (e: HttpException) {
            if (e.code() == 409) Result.failure()  // duplicate — server already has it
            else Result.retry()
        }
    }
}
```

Enqueue with:
```kotlin
val request = OneTimeWorkRequestBuilder<SubmitOrderWorker>()
    .setConstraints(Constraints(requiredNetworkType = NetworkType.CONNECTED))
    .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
    .setInputData(workDataOf("idempotency_key" to idempotencyKey))
    .build()
WorkManager.getInstance(context).enqueue(request)
```

### SSE Listener (Lifecycle-Aware)

```kotlin
override fun onEvent(eventSource: EventSource, id: String?, type: String?, data: String) {
    // onEvent runs on OkHttp thread — bridge to coroutine scope
    viewModelScope.launch(Dispatchers.IO) {
        val payload = gson.fromJson(data, SsePayload::class.java)
        when (type) {
            "ORDER_CONFIRMED" -> {
                // SET from server snapshot — never increment locally
                userDao.setStampCount(payload.currentStampCount)
                uiChannel.send(UiEvent.PlayStampSound)
            }
            "ORDER_READY" -> {
                uiChannel.send(UiEvent.ShowOrderReady)
            }
            "REWARD_ISSUED" -> {
                userDao.setStampCount(0)
                uiChannel.send(UiEvent.ShowRewardCelebration(payload.couponCode))
            }
            "TIER_UPGRADED" -> {
                uiChannel.send(UiEvent.ShowTierUpgrade(payload.newTier))
            }
        }
    }
}
```

### FCM Foreground Suppression

```kotlin
override fun onMessageReceived(remoteMessage: RemoteMessage) {
    val isForegrounded = ProcessLifecycleOwner.get()
        .lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)

    if (!isForegrounded) {
        // App is backgrounded — show OS notification
        showSystemNotification(remoteMessage.data)
    }
    // If foregrounded, SSE listener already handles the UI update — do nothing
}
```

### Milestone Celebration

```kotlin
UiEvent.ShowRewardCelebration(couponCode) -> {
    lottieView.playAnimation()
    couponCodeText.text = couponCode   // visible immediately — cashier is right there
    root.setOnClickListener { dismissCelebration() }
    root.postDelayed({ dismissCelebration() }, 2500)
}
```

- Duration: 2.5 seconds, auto-dismiss
- Tap anywhere to skip
- Coupon code on same screen — no navigation needed

---

## Database Indexes

```sql
CREATE INDEX idx_orders_status_updated ON "order" (status, updated_at);
CREATE INDEX idx_orders_user_status    ON "order" (user_id, status);
CREATE INDEX idx_menu_available        ON menu_item (is_available);
CREATE INDEX idx_loyalty_tx_user       ON loyalty_transaction (user_id);
-- idempotency_key and coupon.code already indexed via UNIQUE CONSTRAINT
```

---

## Order State Machine

```
SUBMITTED ──────────────────────────────────────────────► CANCELLED
    │                                                         ▲
    │  cashier opens order                                    │
    ▼                                                   (if SUBMITTED)
REVIEWING  ──── lockedUntil expires (cron) ───────────► SUBMITTED
    │
    │  cashier confirms
    ▼
CONFIRMED
    │
    │  barista done
    ▼
READY
    │
    │  cashier closes
    ▼
COMPLETED

SUBMITTED ──── updatedAt > 30min (cron) ──────────────► EXPIRED
```

---

## Key Architectural Decisions

| Decision | Choice | Reason |
|:---|:---|:---|
| Idempotency enforcement | DB unique constraint + catch `23505` | Eliminates TOCTOU race vs application-level check |
| Concurrency control | `SELECT FOR UPDATE` (pessimistic) | Prevents phantom coupon double-spend |
| Event emission timing | Post-commit only | Prevents ghost notifications on rollback |
| Milestone tracking | `purchase_count % 10` | Points jumps (bulk orders) don't skip stamps |
| Tier thresholds | `TierConfig` DB table | Adjustable without redeployment |
| Coupon value | Fixed at issuance time | Price changes don't affect earned rewards |
| Customer real-time | SSE | Unidirectional, auto-reconnect on network switch |
| Cashier real-time | WebSocket | Bidirectional, immediate new-order push |
| FCM payload | Data-only + `android.priority: high` | Required to wake OEM devices (Xiaomi, OPPO, Samsung) from doze |
| Android cart state | `SavedStateHandle` + `@Parcelize` | Survives process death during Google Sign-In |
| Local state sync | Server snapshot (SET) not client delta (INCREMENT) | Self-heals on reconnect after offline period |
| `loyalty_transactions` | Append-only | Full audit trail for V2 order history; corrections via counter-delta rows |

---

## Verification Checklist

| # | Test | Expected |
|:---|:---|:---|
| 1 | Submit order twice with same idempotency key | 1 order created, second call returns existing |
| 2 | Two concurrent cashier confirms on same order | Second throws "Order in invalid state" |
| 3 | Apply coupon in two concurrent sessions | Second gets 409 Conflict |
| 4 | Kill Android app mid-Google-Sign-In | Cart survives via `SavedStateHandle` |
| 5 | Submit order while offline | WorkManager queues, submits when connected |
| 6 | 10th purchase | Milestone coupon auto-issued, SSE fires `REWARD_ISSUED`, Lottie plays |
| 7 | 0 → GOLD tier jump in one transaction | Tier = GOLD (no Silver skipped) |
| 8 | Order in REVIEWING > 2 min | Cron resets to SUBMITTED |
| 9 | Order SUBMITTED > 30 min | Cron sets EXPIRED, coupon released to AVAILABLE |
| 10 | FCM received while app is foregrounded | OS notification suppressed, SSE handles UI |

---

## V1 Scope Boundaries

| In V1 | Out (Deferred to V2+) |
|:---|:---|
| Backend API (all phases above) | Order history tab |
| Android customer app | Rewards store (manual point spending) |
| Cashier web/Android dashboard | Multi-language support |
| Stamp card + wallet screen | Analytics dashboard |
| Google Auth + JWT | Tier-based point multipliers |
| Milestone coupons | Push notification preferences |
| | Admin panel |
