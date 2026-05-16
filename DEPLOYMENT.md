# Deployment Runbook

## First Deploy — Required Manual Steps

### 1. Promote cashier accounts

New user accounts default to the `CUSTOMER` role. Cashier staff must be promoted manually after their first login.

```sql
-- Run once per cashier account, after they have logged in at least once
UPDATE users SET role = 'CASHIER' WHERE email IN ('cashier@example.com');
```

This also applies to every new cashier onboarded after initial deployment — there is no self-service promotion path.

**Note:** Role changes only take effect on the next login. The updated role is embedded in the JWT at issue time; existing tokens retain the old role until they expire (access: 15 min, refresh: 30 days).

---

### 2. Verify TierConfig seed

On first boot the `DatabaseSeederService` upserts the three tier thresholds automatically. Confirm they are present before processing any orders:

```sql
SELECT * FROM tier_configs ORDER BY threshold;
-- Expected: BRONZE (0), SILVER (1000), GOLD (5000)
```

---

### 3. Clean database migration (existing dev databases)

If running against a database that has an `orders` table with the old `PENDING/PAID/CANCELLED` status enum, TypeORM's `synchronize` will fail. Drop and recreate the database locally:

```bash
dropdb wake_up_social && createdb wake_up_social
```

Production schema changes must be handled with explicit migrations — never rely on `synchronize: true` in production.
