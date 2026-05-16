# GitHub Issues Setup — Frontend Team (Android)

> Complete step-by-step guide to create Labels, Milestones, Issues, and Project board for all 3 frontend persons.

---

## Step 1 — Create the Custom Label

Go to your Android repo → **Issues** → **Labels** → **New label**

| Name | Color | Description |
|---|---|---|
| `priority: blocker` | `#b91c1c` | Blocks other issues from starting |

All other labels (`enhancement`, `good first issue`, `help wanted`, `bug`, `question`) already exist by default — no action needed.

---

## Step 2 — Create Milestones

Go to **Issues** → **Milestones** → **New milestone** for each:

| Title | Description |
|---|---|
| `Phase 1 — Foundation & Setup` | Hilt DI, Retrofit/OkHttp client, base navigation, Room DB |
| `Phase 2 — Menu & QR` | Home/menu screens, menu item detail, QR code scanner, session creation |
| `Phase 3 — Cart & Order Submission` | Cart screen, deferred Google login, SubmitOrderWorker, order confirmation |
| `Phase 4 — Cashier Dashboard` | All cashier app screens + WebSocket real-time events |
| `Phase 5 — Wallet & Loyalty` | Wallet/stamp card screen, coupon display |
| `Phase 6 — Order Tracking & SSE` | Order code display screen, SSE stream (OkHttp), all 4 event types |
| `Phase 7 — Real-Time & Polish` | UI/UX consistency, FCM suppression, loading/error/empty states, nav audit |

---

## Step 3 — Create Issues

Go to **Issues** → **New issue** for each one. Set the sidebar fields (Assignee, Labels, Milestone) as shown.

---

### Frontend Person 1 — Customer App

---

**Issue FE1-1**
- **Title:** `[FE1] Project setup: Hilt, Retrofit, OkHttp, Room, base NavHost`
- **Body:**
  ```
  Bootstrap the customer app with all core dependencies:
  - Hilt for DI (@HiltAndroidApp on Application class)
  - Retrofit + OkHttp client (base URL from BuildConfig)
  - Room database setup (AppDatabase, entities stub)
  - Compose NavHost with placeholder screens for all routes
  - Add okhttp-sse:4.12.x, firebase-messaging, Lottie Compose, WorkManager
  - Add CameraX (camera-camera2, camera-lifecycle, camera-view) + ML Kit Barcode Scanning
  - Add CameraX + ML Kit KSP processor to build.gradle.kts
  ```
- **Labels:** `enhancement`, `priority: blocker`
- **Milestone:** `Phase 1 — Foundation & Setup`
- **Assignee:** Person 1

---

**Issue FE1-2**
- **Title:** `[FE1] Google Sign-In screen (deferred login)`
- **Body:**
  ```
  Deferred login — only triggered when user taps "Confirm Order", not on app launch.
  - Use Firebase Auth Google Sign-In flow
  - Cart must be preserved through the sign-in redirect via SavedStateHandle
  - After sign-in completes, user is returned to order confirmation screen with cart intact
  - Store JWT access + refresh token (from backend callback) in EncryptedSharedPreferences

  Blocked by: FE1-1 (project setup)
  ```
- **Labels:** `enhancement`, `priority: blocker`
- **Milestone:** `Phase 3 — Cart & Order Submission`
- **Assignee:** Person 1

---

**Issue FE1-3**
- **Title:** `[FE1] Home/menu browsing screen (Room cache + offline state)`
- **Body:**
  ```
  Displays menu items from Room cache (not directly from network).
  - SyncMenuWorker (CoroutineWorker): calls GET /menu, inserts into Room with REPLACE strategy
  - Schedule SyncMenuWorker on app start (OneTimeWorkRequest) and periodically
  - Show "Synced at HH:MM" label based on last successful sync timestamp
  - Disable "Place Order" button when offline — use ConnectivityManager to observe network state
  - Tapping an item navigates to menu item detail screen

  Blocked by: FE1-1 (project setup), FE3-1 (UI component style)
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 2 — Menu & QR`
- **Assignee:** Person 1

---

**Issue FE1-4**
- **Title:** `[FE1] Menu item detail screen`
- **Body:**
  ```
  Shows full detail of a menu item (name, description, price, image).
  - Load image via Coil or Glide
  - "Add to Cart" button — adds item to CartViewModel
  - Quantity selector (+ / -)

  Blocked by: FE1-3 (home screen)
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 2 — Menu & QR`
- **Assignee:** Person 1

---

**Issue FE1-5**
- **Title:** `[FE1] Cart screen (SavedStateHandle + coupon entry + POST /coupons/validate)`
- **Body:**
  ```
  CartViewModel backed by SavedStateHandle + @Parcelize CartItem.
  - Use .copy() for quantity changes — never use var for cart state
  - List of cart items with quantity controls and remove button
  - Subtotal display
  - Coupon code entry field:
    - On "Apply" tap: call POST /coupons/validate (preflight — does NOT reserve)
    - Show discounted total if valid, show error message if invalid
  - "Place Order" button triggers deferred Google Sign-In if not authenticated

  Blocked by: FE1-2 (Google Sign-In), FE1-3 (menu screens)
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 3 — Cart & Order Submission`
- **Assignee:** Person 1

---

**Issue FE1-6**
- **Title:** `[FE1] Order confirmation screen`
- **Body:**
  ```
  Shows order summary before final submission:
  - Items, quantities, subtotal, discount (if coupon applied), total
  - Table number (from SavedStateHandle)
  - "Confirm & Pay" button → triggers SubmitOrderWorker

  Blocked by: FE1-5 (cart screen)
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 3 — Cart & Order Submission`
- **Assignee:** Person 1

---

**Issue FE1-7**
- **Title:** `[FE1] SubmitOrderWorker (WorkManager, idempotency key, exponential backoff)`
- **Body:**
  ```
  CoroutineWorker that submits the order to POST /orders:
  - Generate idempotency key (UUID) once, store in WorkData — never regenerate on retry
  - On network error: retry with exponential backoff (WorkManager built-in)
  - On HTTP 409 (server already has the order): stop retrying, treat as success
  - On HTTP 4xx (other): fail immediately, show error to user
  - On success: navigate to order code display screen with orderId

  Blocked by: FE1-6 (order confirmation screen), FE1-2 (Google Sign-In for JWT)
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 3 — Cart & Order Submission`
- **Assignee:** Person 1

---

**Issue FE1-8**
- **Title:** `[FE1] QR code scanner (tableId → SavedStateHandle → POST /sessions)`
- **Body:**
  ```
  - Scan QR code embedded in printed table QR (use CameraX + ML Kit Barcode)
  - Extract tableId from QR payload
  - Persist tableId to SavedStateHandle (survives process death)
  - Call POST /sessions with tableId → creates or resumes active session
  - Navigate to home/menu screen

  Blocked by: FE1-1 (project setup)
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 2 — Menu & QR`
- **Assignee:** Person 1

---

**Issue FE1-9**
- **Title:** `[FE1] Order code display screen (SSE stream — OkHttp, 4 event types)`
- **Body:**
  ```
  Opens SSE stream: GET /orders/status/:orderId/stream via OkHttp SSE (okhttp-sse:4.12.x).
  NOT the browser EventSource API.

  Handle all 4 SSE event types:
  - ORDER_CONFIRMED → play stamp sound + show "Order confirmed" UI
  - ORDER_READY     → show "Your order is ready!" UI
  - REWARD_ISSUED   → Lottie celebration animation (2.5s auto-dismiss); coupon code visible
                      immediately; user can tap to skip animation
  - TIER_UPGRADED   → show tier upgrade UI (e.g., "You reached Silver!")

  SSE state rule: always SET local state from server snapshot, never INCREMENT locally.
  Close SSE stream when leaving screen or on terminal state (ORDER_READY).

  Blocked by: FE1-7 (order submitted, orderId available), FE3-3 (SSE integration)
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 6 — Order Tracking & SSE`
- **Assignee:** Person 1

---

**Issue FE1-10**
- **Title:** `[FE1] Wallet / stamp card screen (GET /wallet)`
- **Body:**
  ```
  Independently accessible from main navigation (bottom nav or drawer).
  Calls GET /wallet.
  Display:
  - Stamp card: visualize 0–9 stamps (10th stamp = milestone reward)
  - Loyalty points balance
  - List of available coupons (code, discount, expiry)

  Blocked by: FE1-1 (project setup)
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 5 — Wallet & Loyalty`
- **Assignee:** Person 1

---

**Issue FE1-11**
- **Title:** `[FE1] FCM foreground suppression (ProcessLifecycleOwner)`
- **Body:**
  ```
  In FirebaseMessagingService.onMessageReceived():
  - Check ProcessLifecycleOwner.get().lifecycle.currentState
  - If app is STARTED or RESUMED (foregrounded): do NOT show OS notification.
    SSE stream is active and already handling the UI update in real time.
  - If backgrounded: show OS notification using FCM data payload keys (type, orderId)

  Note: firebase-messaging dependency is already added in FE1-1.
  Coordinate with FE3-4 — Person 3 owns the same suppression logic for the integration
  layer; Person 1 owns the FirebaseMessagingService implementation in the customer app.
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 7 — Real-Time & Polish`
- **Assignee:** Person 1

---

### Frontend Person 2 — Cashier Dashboard App

---

**Issue FE2-1**
- **Title:** `[FE2] Project setup: Hilt, Retrofit, Socket.IO client, base NavHost`
- **Body:**
  ```
  Bootstrap the cashier app with all core dependencies:
  - Hilt for DI (@HiltAndroidApp on Application class)
  - Retrofit + OkHttp client (base URL from BuildConfig)
  - Socket.IO Android client wired to WebSocket namespace /cashier
  - JWT token passed via handshake auth { token: "..." }
  - Compose NavHost with placeholder screens for all routes
  ```
- **Labels:** `enhancement`, `priority: blocker`
- **Milestone:** `Phase 1 — Foundation & Setup`
- **Assignee:** Person 2

---

**Issue FE2-2**
- **Title:** `[FE2] Order list screen (WebSocket /cashier — real-time events)`
- **Body:**
  ```
  Main cashier screen showing all active orders.
  - On screen entry: call GET /orders to load existing active orders before WebSocket connects
  - Then connect to WebSocket namespace /cashier for real-time updates
  - Listen for events: new_order / order_updated / order_cancelled
  - new_order: add order card to top of list
  - order_updated: update matching order card in-place (status change)
  - order_cancelled: remove order card from list
  - Show in-app notification banner when new_order fires (FE2-8)
  - Tap order card → navigate to order detail screen

  Blocked by: FE2-1 (project setup), FE2-10 (cashier login — JWT required for GET /orders)
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 4 — Cashier Dashboard`
- **Assignee:** Person 2

---

**Issue FE2-3**
- **Title:** `[FE2] Order detail screen (table number, items, subtotal, discount, total)`
- **Body:**
  ```
  Shows full order detail for a selected order.
  - Table number (from denormalized tableId on Order)
  - List of ordered items with quantity and unit price
  - Subtotal, discount amount (coupon applied), total
  - Action buttons: Review, Confirm Payment, Mark Ready, Complete (see FE2-4 to FE2-7)

  Blocked by: FE2-2 (order list screen)
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 4 — Cashier Dashboard`
- **Assignee:** Person 2

---

**Issue FE2-4**
- **Title:** `[FE2] Review button → PATCH /orders/:id/review`
- **Body:**
  ```
  Shown when order status is SUBMITTED.
  Calls PATCH /orders/:id/review.
  Sets a 2-minute REVIEWING lock on the order.
  Update local order state to REVIEWING after success.

  Blocked by: FE2-3 (order detail screen)
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 4 — Cashier Dashboard`
- **Assignee:** Person 2

---

**Issue FE2-5**
- **Title:** `[FE2] Confirm payment button → POST /orders/:id/confirm`
- **Body:**
  ```
  Shown when order status is REVIEWING.
  Calls POST /orders/:id/confirm (atomic backend transaction: burns coupon, awards points,
  issues milestone coupon if 10th purchase).
  Update local order state to CONFIRMED after success.

  Blocked by: FE2-3 (order detail screen)
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 4 — Cashier Dashboard`
- **Assignee:** Person 2

---

**Issue FE2-6**
- **Title:** `[FE2] Mark ready button → PATCH /orders/:id/ready`
- **Body:**
  ```
  Shown when order status is CONFIRMED (barista done preparing).
  Calls PATCH /orders/:id/ready.
  Update local order state to READY after success.

  Blocked by: FE2-3 (order detail screen)
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 4 — Cashier Dashboard`
- **Assignee:** Person 2

---

**Issue FE2-7**
- **Title:** `[FE2] Complete button → PATCH /orders/:id/complete`
- **Body:**
  ```
  Shown when order status is READY (customer picked up).
  Calls PATCH /orders/:id/complete.
  Update local order state to COMPLETED. Remove from active list.

  Blocked by: FE2-3 (order detail screen)
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 4 — Cashier Dashboard`
- **Assignee:** Person 2

---

**Issue FE2-8**
- **Title:** `[FE2] In-app notification banner for new_order WebSocket event`
- **Body:**
  ```
  When a new_order event fires on the WebSocket:
  - Show a dismissable banner/snackbar at the top of the screen
  - Banner shows: table number + short item summary
  - Auto-dismiss after 5 seconds or on tap

  Blocked by: FE2-2 (order list screen + WebSocket)
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 4 — Cashier Dashboard`
- **Assignee:** Person 2

---

**Issue FE2-9**
- **Title:** `[FE2] Sold-out toggle → PATCH /menu/:id/availability`
- **Body:**
  ```
  Accessible from order detail or a separate menu management screen.
  Toggle switch on each menu item: isAvailable true/false.
  Calls PATCH /menu/:id/availability (CASHIER role — JWT required).
  Show optimistic UI update, revert on error.

  Blocked by: FE2-1 (project setup)
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 4 — Cashier Dashboard`
- **Assignee:** Person 2

---

**Issue FE2-10**
- **Title:** `[FE2] Cashier login screen (Google Sign-In → JWT)`
- **Body:**
  ```
  The cashier app requires a valid JWT for all endpoints (GET /orders, PATCH /orders/:id/*,
  POST /orders/:id/confirm, PATCH /menu/:id/availability) and the WebSocket handshake.

  - Google Sign-In via Firebase Auth
  - After sign-in: exchange Firebase ID token for backend JWT via POST /auth/google/callback
    (or whichever flow Backend Person 1 exposes for the cashier)
  - Store JWT access + refresh token in EncryptedSharedPreferences
  - Auto-refresh token on 401 via OkHttp Authenticator (FE3-2)
  - Show login screen on app launch if no valid token is stored

  Blocks: FE2-2 (order list — JWT required for GET /orders and WebSocket handshake)
  Blocked by: FE2-1 (project setup), FE3-2 (network layer)
  ```
- **Labels:** `enhancement`, `priority: blocker`
- **Milestone:** `Phase 1 — Foundation & Setup`
- **Assignee:** Person 2

---

### Frontend Person 3 — UI/UX & Integration

---

**Issue FE3-1**
- **Title:** `[FE3] Design system: color scheme, typography, and shared component library`
- **Body:**
  ```
  Define the overall visual design applied across both Person 1 and Person 2 apps:
  - Color palette (primary, secondary, background, surface, error tokens)
  - Typography scale (MaterialTheme.typography customization)
  - Shared Composables: AppButton, AppTextField, AppCard, LoadingIndicator,
    ErrorState, EmptyState
  - Publish as a shared :ui module both apps depend on (or copy if single-repo)

  Must be done before Person 1 and Person 2 build their screens.
  ```
- **Labels:** `enhancement`, `priority: blocker`
- **Milestone:** `Phase 1 — Foundation & Setup`
- **Assignee:** Person 3

---

**Issue FE3-2**
- **Title:** `[FE3] Retrofit + OkHttp network layer (auth interceptor, token refresh)`
- **Body:**
  ```
  Shared network layer used by both apps:
  - OkHttp Authenticator: on 401 response, call POST /auth/refresh,
    retry original request with new access token
  - AuthInterceptor: attach Authorization: Bearer <token> header to all requests
  - Centralized Retrofit instance with Moshi/Gson converter
  - Handle network errors (timeout, no connection) with sealed Result type

  Coordinate with Backend Person 1 on JWT header format before implementation.
  Blocked by: FE1-1 / FE2-1 (project setup)
  ```
- **Labels:** `enhancement`, `priority: blocker`
- **Milestone:** `Phase 1 — Foundation & Setup`
- **Assignee:** Person 3

---

**Issue FE3-3**
- **Title:** `[FE3] SSE listener integration into OrderStatusViewModel (OkHttp SSE)`
- **Body:**
  ```
  Wire the SSE connection into OrderStatusViewModel:
  - Use okhttp-sse:4.12.x — NOT the browser EventSource API
  - Bridge onEvent() callback (OkHttp thread) → viewModelScope.launch(Dispatchers.IO)
  - Always SET local state from the server snapshot, never INCREMENT locally
    (e.g., set currentStampCount = event.currentStampCount, not currentStampCount++)
  - Expose a StateFlow<OrderSnapshot?> for the UI to collect
  - Close and clean up the SSE listener in onCleared()

  SSE payload shape to agree with Backend Person 1:
  { type, orderId, status, currentStampCount?, loyaltyPoints? }

  Blocked by: FE3-2 (network layer)
  ```
- **Labels:** `enhancement`, `priority: blocker`
- **Milestone:** `Phase 6 — Order Tracking & SSE`
- **Assignee:** Person 3

---

**Issue FE3-4**
- **Title:** `[FE3] FCM foreground suppression (ProcessLifecycleOwner)`
- **Body:**
  ```
  When a FCM data-only message arrives:
  - Check ProcessLifecycleOwner.get().lifecycle.currentState
  - If app is foregrounded (STARTED or RESUMED): skip OS notification entirely
    (SSE is already handling the UI update in real time)
  - If app is backgrounded: show OS notification from FCM payload data keys (type, orderId)

  FCM payload keys to agree with Backend Person 1: { type, orderId }
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 7 — Real-Time & Polish`
- **Assignee:** Person 3

---

**Issue FE3-5**
- **Title:** `[FE3] Loading, error, and empty states for all screens`
- **Body:**
  ```
  Apply consistent loading/error/empty state Composables (from FE3-1 design system)
  to every screen in both apps:

  Customer app: home/menu, cart, order code display, wallet
  Cashier app: order list, order detail

  Loading: full-screen CircularProgressIndicator centered
  Error: ErrorState composable with message + "Retry" button
  Empty: EmptyState composable with illustration + message

  Blocked by: FE3-1 (design system), each screen being built
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 7 — Real-Time & Polish`
- **Assignee:** Person 3

---

**Issue FE3-6**
- **Title:** `[FE3] Navigation flow audit (Compose NavHost + SavedStateHandle)`
- **Body:**
  ```
  Audit and finalize navigation for the customer app:
  - NavHost covers all routes: QR scanner → home → item detail → cart → confirm →
    order code display → wallet
  - Deferred Google Sign-In redirect must return user to the correct destination
    (order confirmation screen) with cart intact
  - Confirm cart (CartItem list) and tableId survive process death during Google Sign-In
    via SavedStateHandle
  - Back stack behavior: pressing back from order code display should not go back to cart
    (use popUpTo with inclusive=true)

  Blocked by: FE1-2 (Google Sign-In), FE1-5 (cart screen), FE1-8 (QR scanner)
  ```
- **Labels:** `enhancement`
- **Milestone:** `Phase 7 — Real-Time & Polish`
- **Assignee:** Person 3

---

**Issue FE3-7**
- **Title:** `[FE3] Cross-team API contract alignment (SSE payload + WebSocket event names)`
- **Body:**
  ```
  Coordinate with Backend Person 1 before sprint 1 ends. Lock down:

  1. SSE payload schema:
     { type: string, orderId: string, status: string,
       currentStampCount?: number, loyaltyPoints?: number }

  2. WebSocket event names for cashier:
     new_order, order_updated, order_cancelled

  3. JWT header format: Authorization: Bearer <access_token>
     Refresh flow: POST /auth/refresh with refresh token in Authorization header

  4. FCM data payload keys: { type: string, orderId: string }

  Create a shared API contract doc (or update README) once agreed.
  This issue blocks all network integration work.
  ```
- **Labels:** `priority: blocker`, `help wanted`
- **Milestone:** `Phase 1 — Foundation & Setup`
- **Assignee:** Person 3

---

## Step 4 — Create the Project Board

1. Go to your GitHub profile/org → **Projects** → **New project**
2. Choose **Board** view → name it `Wake Up Social — Frontend`
3. Link the Android repo: **Settings → Linked repositories** → add it
4. Add columns: `Backlog` | `In Progress` | `In Review` | `Done`
5. Add a custom field: **+ New field → Single select** → name `Owner` → options: `FE1`, `FE2`, `FE3`
6. Add a custom field: **+ New field → Single select** → name `Phase` → options: `1`, `2`, `3`, `4`, `5`, `6`, `7`

Use the **Filter** bar to focus by person:
```
assignee:@their-github-username
```

---

## Summary

| Person | Issues | Milestones |
|---|---|---|
| FE1 — Customer App | 11 | Phase 1, Phase 2, Phase 3, Phase 5, Phase 6, Phase 7 |
| FE2 — Cashier Dashboard | 10 | Phase 1, Phase 4 |
| FE3 — UI/UX & Integration | 7 | Phase 1, Phase 6, Phase 7 |
| **Total** | **28** | **7 milestones** |

---

## Dependency Chain

The following issues must be completed before others can start:

```
FE3-7  API contract           → unblocks: FE3-2, FE3-3
FE3-1  Design system          → unblocks: all screen work (Person 1 + Person 2)
FE3-2  Network layer          → unblocks: all API calls (Person 1 + Person 2)
FE1-1  Customer app setup     → unblocks: all FE1 screens
FE2-1  Cashier app setup      → unblocks: all FE2 screens
FE2-10 Cashier login          → unblocks: FE2-2 (order list needs JWT)
FE1-2  Google Sign-In         → unblocks: FE1-5 (cart), FE1-7 (SubmitOrderWorker)
FE3-3  SSE ViewModel          → unblocks: FE1-9 (order code display screen)
FE2-2  Order list + WebSocket → unblocks: FE2-3 through FE2-9 (all cashier detail/action screens)
```
