-- =============================================
-- Pseudo Café — Initial Schema
-- =============================================

-- Core tenancy
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'starter',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outlets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  timezone TEXT DEFAULT 'Asia/Karachi'
);

-- RBAC
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  limit_value NUMERIC,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  role_id UUID REFERENCES roles(id),
  is_active BOOLEAN DEFAULT TRUE
);

-- Menu
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS menu_item_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_delta NUMERIC DEFAULT 0
);

-- Tables & Orders
CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  section TEXT,
  status TEXT DEFAULT 'free' CHECK (status IN ('free', 'seated', 'ordered', 'bill_requested'))
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
  order_type TEXT DEFAULT 'dine_in',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'placed', 'in_kitchen', 'ready', 'served', 'billed', 'paid', 'closed')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  quantity INT NOT NULL,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'preparing', 'ready', 'served')),
  notes TEXT,
  unit_price NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS order_item_modifiers (
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  modifier_id UUID NOT NULL REFERENCES menu_item_modifiers(id) ON DELETE CASCADE,
  PRIMARY KEY (order_item_id, modifier_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  method TEXT CHECK (method IN ('cash', 'card', 'other')),
  reference_no TEXT,
  marked_by UUID REFERENCES users(id),
  paid_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ
);

-- =============================================
-- Row Level Security
-- =============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's org_id from users table
CREATE OR REPLACE FUNCTION get_my_org_id() RETURNS UUID AS $$
  SELECT org_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: get current user's outlet_id
CREATE OR REPLACE FUNCTION get_my_outlet_id() RETURNS UUID AS $$
  SELECT outlet_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Roles & permissions: all authenticated users can read
CREATE POLICY "roles_read_all" ON roles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "permissions_read_all" ON permissions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "role_permissions_read_all" ON role_permissions FOR SELECT USING (auth.uid() IS NOT NULL);

-- Organizations: visible to members
CREATE POLICY "org_tenant_isolation" ON organizations FOR ALL
  USING (id = get_my_org_id());

-- Outlets: visible to org members
CREATE POLICY "outlets_tenant_isolation" ON outlets FOR ALL
  USING (org_id = get_my_org_id());

-- Users: visible within same org
CREATE POLICY "users_tenant_isolation" ON users FOR SELECT
  USING (org_id = get_my_org_id());

CREATE POLICY "users_self_update" ON users FOR UPDATE
  USING (id = auth.uid());

-- Menu categories: org-scoped
CREATE POLICY "menu_categories_tenant" ON menu_categories FOR ALL
  USING (outlet_id IN (SELECT id FROM outlets WHERE org_id = get_my_org_id()));

-- Menu items: org-scoped
CREATE POLICY "menu_items_tenant" ON menu_items FOR ALL
  USING (outlet_id IN (SELECT id FROM outlets WHERE org_id = get_my_org_id()));

-- Menu item modifiers: org-scoped via menu_items
CREATE POLICY "menu_item_modifiers_tenant" ON menu_item_modifiers FOR ALL
  USING (menu_item_id IN (
    SELECT id FROM menu_items
    WHERE outlet_id IN (SELECT id FROM outlets WHERE org_id = get_my_org_id())
  ));

-- Tables: org-scoped
CREATE POLICY "tables_tenant" ON tables FOR ALL
  USING (outlet_id IN (SELECT id FROM outlets WHERE org_id = get_my_org_id()));

-- Orders: org-scoped
CREATE POLICY "orders_tenant" ON orders FOR ALL
  USING (outlet_id IN (SELECT id FROM outlets WHERE org_id = get_my_org_id()));

-- Order items: via orders
CREATE POLICY "order_items_tenant" ON order_items FOR ALL
  USING (order_id IN (
    SELECT id FROM orders
    WHERE outlet_id IN (SELECT id FROM outlets WHERE org_id = get_my_org_id())
  ));

-- Order item modifiers: via order_items
CREATE POLICY "order_item_modifiers_tenant" ON order_item_modifiers FOR ALL
  USING (order_item_id IN (
    SELECT oi.id FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.outlet_id IN (SELECT id FROM outlets WHERE org_id = get_my_org_id())
  ));

-- Payments: org-scoped via orders
CREATE POLICY "payments_tenant" ON payments FOR ALL
  USING (order_id IN (
    SELECT id FROM orders
    WHERE outlet_id IN (SELECT id FROM outlets WHERE org_id = get_my_org_id())
  ));

-- Shifts: org-scoped
CREATE POLICY "shifts_tenant" ON shifts FOR ALL
  USING (outlet_id IN (SELECT id FROM outlets WHERE org_id = get_my_org_id()));

-- =============================================
-- Seed: Roles & Permissions
-- =============================================

INSERT INTO roles (name) VALUES
  ('owner'), ('manager'), ('cashier'), ('waiter'), ('kitchen')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (key) VALUES
  ('order.create'),
  ('order.edit'),
  ('order.send_to_kitchen'),
  ('order.bill'),
  ('order.mark_paid'),
  ('order.discount'),
  ('order_item.update_status'),
  ('menu.edit'),
  ('menu.view'),
  ('report.view'),
  ('report.view_all_outlets'),
  ('staff.manage'),
  ('table.manage')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- Role-Permission Assignments
-- =============================================

-- Owner: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'owner'
ON CONFLICT DO NOTHING;

-- Manager: everything except report.view_all_outlets
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'manager' AND p.key != 'report.view_all_outlets'
ON CONFLICT DO NOTHING;

-- Waiter: create, edit, send_to_kitchen, view menu
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'waiter' AND p.key IN ('order.create', 'order.edit', 'order.send_to_kitchen', 'menu.view')
ON CONFLICT DO NOTHING;

-- Cashier: bill, mark_paid, discount (capped at 10%)
INSERT INTO role_permissions (role_id, permission_id, limit_value)
SELECT r.id, p.id,
  CASE WHEN p.key = 'order.discount' THEN 10 ELSE NULL END
FROM roles r, permissions p
WHERE r.name = 'cashier' AND p.key IN ('order.bill', 'order.mark_paid', 'order.discount', 'menu.view')
ON CONFLICT DO NOTHING;

-- Kitchen: only update item status
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'kitchen' AND p.key = 'order_item.update_status'
ON CONFLICT DO NOTHING;

-- =============================================
-- Realtime: enable for live subscriptions
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE tables;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
