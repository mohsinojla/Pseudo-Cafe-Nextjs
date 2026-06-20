# Restaurant Management System — Implementation Plan

A multi-outlet, real-time restaurant operations platform. Built to be sellable to a real restaurant, and built to be a resume-grade systems project.

---

## 1. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14+ (App Router), TypeScript | Server components for dashboards/reports, client components for live order screens and KDS. SSR gives you fast first loads on tablet/POS hardware in a kitchen. |
| Styling/UI | Tailwind CSS + shadcn/ui | Fast to build a clean, consistent POS-style UI without reinventing components. |
| Database | PostgreSQL via Supabase | Relational data fits multi-outlet, RBAC, and reporting far better than a document store. Row-Level Security (RLS) gives you real, enforced multi-tenancy at the database layer — a strong interview point. |
| Real-time | Supabase Realtime (Postgres logical replication) | Order/table/KDS state changes broadcast to subscribed clients with no separate infra. Falls back cleanly to polling if a connection drops. |
| Auth | Supabase Auth (or NextAuth backed by Supabase) | Email/password + magic link for staff invites. JWT carries `role` and `outlet_id` claims, which RLS policies read directly — auth and authorization share one source of truth. |
| File storage | Supabase Storage | Menu item images, logo, receipts (PDF) per tenant, isolated by bucket policy. |
| Email | Resend | Staff invitations, daily Z-report email to owner, low-stock alerts, password resets. |
| Hosting | Vercel | Next.js native, edge network, preview deployments per PR (good to show off in interviews — proper CI/CD habit). |
| Background jobs | Vercel Cron + a queue (Supabase Edge Functions or a lightweight worker) | Daily report generation, forecast model runs, stale-order auto-flagging. |
| ML serving | Python (FastAPI) microservice, or a precomputed batch job written to Postgres | Keep ML decoupled from the main app — train offline, serve either via a small API Next.js calls, or by writing predictions into a table the dashboard reads. Decoupling is itself a good architecture talking point. |
| State/data fetching | TanStack Query (React Query) + Supabase client | Realtime subscriptions feed the cache directly; avoids a sprawling global state library. |
| Validation | Zod (shared between client forms and API route handlers) | One schema, enforced both sides. |
| Testing | Vitest/Jest for units, Playwright for the order-to-kitchen-to-bill flow | An E2E test of the core lifecycle is worth more in an interview than 90% unit coverage on trivial code. |

This is a **Postgres-forward stack with Supabase as the backbone** (DB + Auth + Realtime + Storage in one), Next.js/Vercel on top, Resend for email. It gives you real-time without hand-rolling WebSocket infrastructure, while keeping the relational integrity multi-outlet RBAC and reporting actually need.

---

## 2. Multi-Tenancy Model

Every tenant (restaurant business) gets one row in `organizations`. Every other table — outlets, menu items, orders, staff — carries an `org_id`. This is **shared-database, isolated-by-RLS** multi-tenancy: one deployment serves every restaurant customer, and Postgres itself refuses to return another tenant's rows, even if your app code has a bug.

```
organizations (id, name, plan, created_at)
outlets (id, org_id, name, address, timezone)
users (id, org_id, outlet_id nullable, email, full_name, role, is_active)
```

A user's JWT (via Supabase Auth custom claims) embeds `org_id`, `outlet_id`, and `role`. Every RLS policy filters on `org_id = auth.jwt() -> 'org_id'`, and outlet-scoped roles additionally filter on `outlet_id`. This is the cleanest way to demonstrate real tenant isolation without building a separate auth system.

---

## 3. RBAC Design

Don't hardcode `if (role === 'manager')` everywhere — model it as **role → permissions**, with an **outlet scope** and, where relevant, a **limit** (e.g., max discount %). This is what makes your RBAC look like a real system rather than an if-else ladder.

```
roles (id, name)                      -- owner, manager, cashier, waiter, kitchen
permissions (id, key)                 -- 'order.create', 'order.discount', 'menu.edit', 'report.view_all_outlets', ...
role_permissions (role_id, permission_id, limit_value nullable)
users (..., role_id, outlet_id nullable)   -- outlet_id NULL = org-wide (owner)
```

A small `can(user, permission, context)` helper checks: does the role have this permission, is the action within the user's outlet scope, and is it within any numeric limit (e.g. discount ≤ 15% unless role permission says otherwise). This single helper is called both in API route handlers (server-enforced, non-negotiable) and conditionally in the UI (to hide buttons). **Never rely on the UI hiding something as your only protection** — enforce in the API and in RLS policies too. Three layers (UI, API, database RLS) is the correct depth and a great answer to "how did you implement access control."

Example role shape:

- **Owner** — `org_id` scope, all permissions, only role with `report.view_all_outlets`.
- **Manager** — `outlet_id` scope, can edit menu availability, approve refunds, manage staff for their outlet.
- **Cashier** — `outlet_id` scope, `order.bill`, `order.mark_paid`, `order.discount` capped at a limit.
- **Waiter** — `outlet_id` scope (and optionally section-level), `order.create`, `order.edit`, `order.send_to_kitchen`.
- **Kitchen** — `outlet_id` scope, `order_item.update_status` only — cannot view prices or totals at all (a nice, concrete demonstration of least-privilege).

---

## 4. Core Data Model

```
menu_categories (id, outlet_id, name, sort_order)
menu_items (id, outlet_id, category_id, name, price, is_available, image_url)
menu_item_modifiers (id, menu_item_id, name, price_delta)   -- size, add-ons, etc.

tables (id, outlet_id, label, section, status)               -- free, seated, ordered, bill_requested

orders (id, outlet_id, table_id nullable, order_type, status, created_by, created_at, closed_at)
order_items (id, order_id, menu_item_id, quantity, status, notes, unit_price)
order_item_modifiers (order_item_id, modifier_id)

payments (id, order_id, amount, method, marked_by, paid_at)  -- method: cash | card | other, no gateway
                                                                -- this is just a record, not a transaction
shifts (id, user_id, outlet_id, clock_in, clock_out)

sales_forecast (id, outlet_id, menu_item_id, date, predicted_qty)  -- written by the ML job
```

Since there's no payment gateway, `payments` is purely a **ledger entry**: cashier selects method (cash/card/other), optionally types a reference number, hits confirm. It's an insert, not an integration — simple, correct, and exactly how a real counter works.

---

## 5. Order Lifecycle (the core state machine)

```
draft → placed → in_kitchen → ready → served → billed → paid → closed
```

Each `order_item` has its own sub-status (`queued → preparing → ready → served`) so the kitchen can mark individual dishes done while others still cook — this is what makes the KDS feel real instead of a glorified to-do list.

Transitions are enforced server-side (an order can't jump from `placed` straight to `paid`), which gives you a clean, demonstrable state machine — a good thing to literally diagram in your README or interview.

**Flow:** Waiter opens a table → adds items → sends to kitchen (order becomes `in_kitchen`, items become `queued`) → kitchen updates each item's status on the KDS → when all items are `ready`, waiter marks `served` → cashier opens billing view, applies any discount (within their permission limit), generates the bill → cashier marks `paid` with method → table flips back to `free`.

---

## 6. Real-Time Implementation

Supabase Realtime listens to Postgres changes and pushes them over WebSockets to subscribed clients — you don't write your own WebSocket server.

- **Kitchen Display:** subscribes to `order_items` where `outlet_id = X AND status IN ('queued','preparing')`. New rows appear instantly; status updates from the kitchen screen reflect on the waiter's app within ~1 second.
- **Floor plan:** subscribes to `tables` for the outlet — status changes (free/seated/bill_requested) update every connected device live.
- **Owner dashboard:** subscribes to an aggregated `orders`/`payments` stream for a live running sales counter across outlets.

For resilience on flaky kitchen Wi-Fi, queue actions locally (a small IndexedDB/localStorage outbox) and replay on reconnect, rather than assuming the socket is always alive — this single feature is a strong "I thought about production reality" talking point.

---

## 7. Next.js Project Structure

```
/app
  /(auth)/login, /(auth)/invite
  /(dashboard)/owner/...        -- org-wide views, RLS + role gate
  /(dashboard)/outlet/[outletId]/menu
  /(dashboard)/outlet/[outletId]/staff
  /(dashboard)/outlet/[outletId]/reports
  /(pos)/waiter/[outletId]      -- table grid + order builder
  /(pos)/kitchen/[outletId]     -- KDS, large-format, touch-friendly
  /(pos)/cashier/[outletId]     -- billing, mark-paid
  /api/orders/...               -- route handlers, Zod-validated, RBAC-checked
  /api/menu/...
  /api/reports/...
/lib
  /supabase (client + server clients)
  /rbac (can() helper, permission map)
  /validation (zod schemas)
/components
  /pos, /kitchen, /dashboard, /shared
```

Route-group separation between `(dashboard)` and `(pos)` reflects reality: a manager's analytics screen and a waiter's order-entry screen have completely different UX needs (desktop vs touch/tablet), and structuring the app this way is worth mentioning — it shows you designed for the actual devices staff use, not one generic responsive layout.

---

## 8. ML Component (decorative but real)

Once you have order history (seed it with realistic synthetic data if needed), train a simple model — gradient boosting (XGBoost/LightGBM) or even a well-tuned regression — predicting **quantity sold per menu item per day**, using day-of-week, recent trend, and promotions as features. Run it as a scheduled batch job (Vercel Cron hits a small Python/FastAPI service, or a Supabase Edge Function), write results into `sales_forecast`, and surface "Expect to sell ~42 biryanis tomorrow — prep accordingly" on the manager dashboard. Keep it decoupled from the live order path entirely — it reads history, it never blocks or gates the order flow.

---

## 9. Phased Roadmap

**Phase 1 — MVP (this is what you demo and what could genuinely run a single outlet)**
Auth + RBAC + org/outlet setup, menu with modifiers, table/floor view, full order lifecycle, KDS, billing with mark-paid, basic single-outlet dashboard.

**Phase 2 — Multi-outlet & sellability**
Owner's consolidated cross-outlet dashboard, outlet-scoped staff management, CSV menu import, Resend-powered staff invites, simple onboarding flow (sign up → create org → create outlet → import menu).

**Phase 3 — Differentiators**
Offline-resilient order queueing, the ML forecast module, QR-based customer self-view of their order/bill, daily Z-report emailed automatically via Resend, shift/attendance tracking.

Build and finish Phase 1 completely before touching Phase 2 — a fully working single-outlet system beats three half-built modules, both for a demo and for actually selling to your first restaurant.

---

## 10. What This Gives You to Talk About in Interviews

A real RLS-enforced multi-tenant architecture, a permission system with scope and limits rather than role strings sprinkled through the code, a genuine state machine driving the order lifecycle, real-time sync via Postgres change streams rather than a naive polling loop, an offline-resilient client, and a decoupled ML service feeding a dashboard. That's a system design conversation, not a CRUD walkthrough — which is exactly the level you're aiming for.
