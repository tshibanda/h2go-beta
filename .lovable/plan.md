# H2GO Build Plan

A pragmatic v1 that ships every system end-to-end on TanStack Start + Lovable Cloud. We port the Figma prototype faithfully, wire real data per user, validate photos with Lovable AI vision, and gate premium with Stripe.

## 1. Design system & theme
- Port `theme.css` tokens (Fredoka + Poppins via @fontsource, OKLCH primary `#3B82F6`, secondary `#14B8A6`, bg `#F8FAFC`) into `src/styles.css`.
- Keep shadcn components, add `Splash` mascot + `WaterRing` from prototype into `src/components/h2go/`.
- Mobile-first layout shell: max-w-md centered, bottom tab bar (Home, Stats, Tree, Leaderboard, Profile).

## 2. Routes (TanStack file-based)
```
src/routes/
  __root.tsx           (providers + onAuthStateChange)
  index.tsx            (marketing landing → CTA to /auth or /home)
  auth.tsx             (email + Google)
  onboarding.tsx       (weight/age, goal, reminders setup)
  _authenticated/
    route.tsx          (managed gate)
    home.tsx           (dashboard: ring, streak, next reminder, tree, fact)
    validate.tsx       (60s countdown + live camera capture)
    stats.tsx          (recharts day/week/month)
    tree.tsx           (hydration tree stages)
    leaderboard.tsx    (mock seeded leagues)
    profile.tsx        (settings, reminders, premium upsell)
    premium.tsx        (Stripe checkout)
```

## 3. Lovable Cloud schema (single migration)
Tables with RLS scoped to `auth.uid()` + `GRANT`s:
- `profiles` (id PK = auth.users.id, name, avatar, weight_kg, age, daily_goal_ml, subscription_status)
- `reminders` (user_id, time, enabled) — 3–12, 1h apart enforced client-side + DB check
- `hydration_logs` (user_id, volume_ml, photo_url, validated, validation_score, detected_object, image_hash UNIQUE per user, created_at)
- `streaks` (user_id PK, current, best, last_log_date)
- `xp` (user_id PK, current_xp, level)
- `achievements` (catalog, seeded in migration) + `user_achievements`
- `daily_facts` (seeded ~20 facts)
- `subscriptions` (user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end)
- `leaderboard_seed` (mock users for visual leagues)

Storage bucket `hydration-photos` (private), RLS so users can only read/write their own folder.

## 4. Auth
- Email/password + Google via `lovable.auth.signInWithOAuth("google", ...)`.
- Call `supabase--configure_social_auth` for Google in same turn.
- Trigger `handle_new_user()` creates `profiles`, `streaks`, `xp` rows on signup.
- Apple OAuth: stub button with toast "Coming soon" (requires native).

## 5. AI photo validation
- `src/routes/_authenticated/validate.tsx`: `getUserMedia({ video: { facingMode: 'environment' } })`, 60s countdown, capture canvas → JPEG blob.
- Compute SHA-256 hash client-side → server function checks uniqueness in `hydration_logs.image_hash`.
- `src/lib/validate.functions.ts` (`createServerFn`, auth middleware): uploads JPEG to storage, calls Lovable AI Gateway `google/gemini-3-flash-preview` via `/v1/chat/completions` with structured tool output:
  ```
  { approved: bool, confidence: 0-1, detected_object: enum, estimated_volume_ml: int, reason: string }
  ```
  System prompt: enumerate accepted (water_glass/bottle/flask/cup) vs rejected (soda/juice/coffee/tea/alcohol/empty/screen/photo_of_photo) categories; require >= 0.8 confidence to approve.
- On approve: insert `hydration_logs` (+10 XP), update streak, check achievements & daily-goal bonus (+50 XP).
- On reject: surface `reason`, keep countdown.

## 6. Reminders
- In-app scheduled via `setTimeout` rehydrated from `reminders` table on each `/home` mount.
- Browser `Notification` API + `Notification.requestPermission()`; clicking notification deep-links `/validate?reminder_id=…`.
- Validation rules: must have ≥3, ≤12, ≥60min apart — enforced in profile UI.
- Native FCM/APNs: out of scope for web; note in profile.

## 7. Gamification
- Pure functions in `src/lib/gamification.ts` compute level from XP (curve from spec), tree stage from total logs (Seed→Legendary thresholds), streak math.
- Achievements check runs on every validated log via server fn.

## 8. Stripe (Lovable Payments)
- Run `payments--recommend_payment_provider`, then `enable_stripe_payments`.
- After enable, create products: monthly €4.99, yearly €39.99, 7-day trial via `batch_create_product`.
- `/premium` page → checkout session; webhook updates `subscriptions.status` and `profiles.subscription_status`.
- Gate AI Coach upsell, advanced stats, leaderboard "diamond" tier behind `is_premium` helper.

## 9. Stubs (per your answer)
- AI Coach: static rule-based recommendation (weight × 35ml + heat bonus).
- Daily facts: 20 seeded rows, rotated by `created_at` day-of-year.
- Leaderboards: mock seed table + current user injected; no real friend invites.
- PostHog: skipped.

## 10. Verification before handoff
- `bun add` deps, build runs clean.
- Manual smoke via preview: signup → onboarding → home → validate (camera) → see XP/streak update.

---

### Technical details
- TanStack server fns in `src/lib/*.functions.ts` (NOT under `src/server`), `requireSupabaseAuth` middleware, `attachSupabaseAuth` in `src/start.ts`.
- All admin client (`client.server`) imports inside `.handler()` via `await import(...)`.
- Image hash uniqueness via Postgres `UNIQUE (user_id, image_hash)`.
- Public storage URLs via signed URLs (private bucket).
- Sitemap + robots added at end.

Estimated: ~25 files, 1 migration, ~1500 LOC.
