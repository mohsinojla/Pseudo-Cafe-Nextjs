// =============================================
// Flat row types (match actual DB columns only)
// =============================================

export type OrderStatus = 'draft' | 'placed' | 'in_kitchen' | 'ready' | 'served' | 'billed' | 'paid' | 'closed'
export type OrderItemStatus = 'queued' | 'preparing' | 'ready' | 'served'
export type TableStatus = 'free' | 'seated' | 'ordered' | 'bill_requested'
export type PaymentMethod = 'cash' | 'card' | 'other'
export type RoleName = 'owner' | 'manager' | 'cashier' | 'waiter' | 'kitchen'

// Individual row shapes
export interface Organization { id: string; name: string; plan: string; created_at: string }
export interface Outlet { id: string; org_id: string; name: string; address: string | null; timezone: string }
export interface Role { id: string; name: RoleName }
export interface Permission { id: string; key: string }
export interface RolePermission { role_id: string; permission_id: string; limit_value: number | null }

export interface User {
  id: string
  org_id: string
  outlet_id: string | null
  email: string
  full_name: string | null
  role_id: string | null
  is_active: boolean
  // join results (not in DB row — present only after .select('*, roles(*)')
  roles?: Role | null
}

export interface MenuCategory { id: string; outlet_id: string; name: string; sort_order: number }
export interface MenuItemModifier { id: string; menu_item_id: string; name: string; price_delta: number }
export interface MenuItem {
  id: string
  outlet_id: string
  category_id: string | null
  name: string
  price: number
  is_available: boolean
  image_url: string | null
  // join fields
  menu_categories?: MenuCategory | null
  menu_item_modifiers?: MenuItemModifier[]
}

export interface Table { id: string; outlet_id: string; label: string; section: string | null; status: TableStatus }

export interface Order {
  id: string
  outlet_id: string
  table_id: string | null
  order_type: string
  status: OrderStatus
  created_by: string | null
  created_at: string
  closed_at: string | null
  // join fields
  tables?: Table | null
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string | null
  quantity: number
  status: OrderItemStatus
  notes: string | null
  unit_price: number
  // join fields
  menu_items?: { id: string; name: string; price: number } | null
}

export interface Payment {
  id: string
  order_id: string
  amount: number
  method: PaymentMethod
  reference_no: string | null
  marked_by: string | null
  paid_at: string
}

export interface Shift {
  id: string
  user_id: string
  outlet_id: string
  clock_in: string
  clock_out: string | null
}

// =============================================
// Supabase Database generic (flat rows only)
// =============================================

type UserRow = {
  id: string
  org_id: string
  outlet_id: string | null
  email: string
  full_name: string | null
  role_id: string | null
  is_active: boolean
}

type MenuItemRow = {
  id: string
  outlet_id: string
  category_id: string | null
  name: string
  price: number
  is_available: boolean
  image_url: string | null
}

type OrderRow = {
  id: string
  outlet_id: string
  table_id: string | null
  order_type: string
  status: string
  created_by: string | null
  created_at: string
  closed_at: string | null
}

type OrderItemRow = {
  id: string
  order_id: string
  menu_item_id: string | null
  quantity: number
  status: string
  notes: string | null
  unit_price: number
}

type PaymentRow = {
  id: string
  order_id: string
  amount: number
  method: string
  reference_no: string | null
  marked_by: string | null
  paid_at: string
}

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: { id: string; name: string; plan: string; created_at: string }
        Insert: { id?: string; name: string; plan?: string; created_at?: string }
        Update: { id?: string; name?: string; plan?: string; created_at?: string }
      }
      outlets: {
        Row: { id: string; org_id: string; name: string; address: string | null; timezone: string }
        Insert: { id?: string; org_id: string; name: string; address?: string | null; timezone?: string }
        Update: { id?: string; org_id?: string; name?: string; address?: string | null; timezone?: string }
      }
      roles: {
        Row: { id: string; name: string }
        Insert: { id?: string; name: string }
        Update: { id?: string; name?: string }
      }
      permissions: {
        Row: { id: string; key: string }
        Insert: { id?: string; key: string }
        Update: { id?: string; key?: string }
      }
      role_permissions: {
        Row: { role_id: string; permission_id: string; limit_value: number | null }
        Insert: { role_id: string; permission_id: string; limit_value?: number | null }
        Update: { role_id?: string; permission_id?: string; limit_value?: number | null }
      }
      users: {
        Row: UserRow
        Insert: { id: string; org_id: string; outlet_id?: string | null; email: string; full_name?: string | null; role_id?: string | null; is_active?: boolean }
        Update: { id?: string; org_id?: string; outlet_id?: string | null; email?: string; full_name?: string | null; role_id?: string | null; is_active?: boolean }
      }
      menu_categories: {
        Row: { id: string; outlet_id: string; name: string; sort_order: number }
        Insert: { id?: string; outlet_id: string; name: string; sort_order?: number }
        Update: { id?: string; outlet_id?: string; name?: string; sort_order?: number }
      }
      menu_items: {
        Row: MenuItemRow
        Insert: { id?: string; outlet_id: string; category_id?: string | null; name: string; price: number; is_available?: boolean; image_url?: string | null }
        Update: { id?: string; outlet_id?: string; category_id?: string | null; name?: string; price?: number; is_available?: boolean; image_url?: string | null }
      }
      menu_item_modifiers: {
        Row: { id: string; menu_item_id: string; name: string; price_delta: number }
        Insert: { id?: string; menu_item_id: string; name: string; price_delta?: number }
        Update: { id?: string; menu_item_id?: string; name?: string; price_delta?: number }
      }
      tables: {
        Row: { id: string; outlet_id: string; label: string; section: string | null; status: string }
        Insert: { id?: string; outlet_id: string; label: string; section?: string | null; status?: string }
        Update: { id?: string; outlet_id?: string; label?: string; section?: string | null; status?: string }
      }
      orders: {
        Row: OrderRow
        Insert: { id?: string; outlet_id: string; table_id?: string | null; order_type?: string; status?: string; created_by?: string | null; created_at?: string; closed_at?: string | null }
        Update: { id?: string; outlet_id?: string; table_id?: string | null; order_type?: string; status?: string; created_by?: string | null; created_at?: string; closed_at?: string | null }
      }
      order_items: {
        Row: OrderItemRow
        Insert: { id?: string; order_id: string; menu_item_id?: string | null; quantity: number; status?: string; notes?: string | null; unit_price: number }
        Update: { id?: string; order_id?: string; menu_item_id?: string | null; quantity?: number; status?: string; notes?: string | null; unit_price?: number }
      }
      order_item_modifiers: {
        Row: { order_item_id: string; modifier_id: string }
        Insert: { order_item_id: string; modifier_id: string }
        Update: { order_item_id?: string; modifier_id?: string }
      }
      payments: {
        Row: PaymentRow
        Insert: { id?: string; order_id: string; amount: number; method: string; reference_no?: string | null; marked_by?: string | null; paid_at?: string }
        Update: { id?: string; order_id?: string; amount?: number; method?: string; reference_no?: string | null; marked_by?: string | null; paid_at?: string }
      }
      shifts: {
        Row: { id: string; user_id: string; outlet_id: string; clock_in: string; clock_out: string | null }
        Insert: { id?: string; user_id: string; outlet_id: string; clock_in?: string; clock_out?: string | null }
        Update: { id?: string; user_id?: string; outlet_id?: string; clock_in?: string; clock_out?: string | null }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
