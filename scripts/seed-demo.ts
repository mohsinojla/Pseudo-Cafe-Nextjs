/**
 * Demo seed — creates a sample org, outlet, categories, menu items, and tables.
 * Run after applying the migration and creating your first owner user.
 *
 * Usage: npx tsx scripts/seed-demo.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seed() {
  console.log('Seeding demo data…')

  // 1. Create org
  const { data: org } = await supabase.from('organizations').insert({ name: 'Pseudo Café HQ' }).select().single()
  if (!org) throw new Error('Failed to create org')
  console.log('Created org:', org.id)

  // 2. Create outlet
  const { data: outlet } = await supabase.from('outlets').insert({
    org_id: org.id,
    name: 'Main Branch',
    address: 'The Pseudo Engineers Café, 1972 DHA, Lahore, Pakistan',
    timezone: 'Asia/Karachi',
  }).select().single()
  if (!outlet) throw new Error('Failed to create outlet')
  console.log('Created outlet:', outlet.id)

  // 3. Create menu categories
  const cats = ['Pizzas', 'Burgers', 'Beverages', 'Desserts']
  const { data: categories } = await supabase.from('menu_categories').insert(
    cats.map((name, i) => ({ outlet_id: outlet.id, name, sort_order: i }))
  ).select()
  if (!categories) throw new Error('Failed to create categories')
  console.log('Created categories:', categories.length)

  const catMap = Object.fromEntries(categories.map((c) => [c.name, c.id]))

  // 4. Create menu items
  const items = [
    { category: 'Pizzas', name: 'Margherita Pizza', price: 850 },
    { category: 'Pizzas', name: 'Pepperoni Pizza', price: 1050 },
    { category: 'Pizzas', name: 'BBQ Chicken Pizza', price: 1150 },
    { category: 'Pizzas', name: 'Veggie Supreme', price: 900 },
    { category: 'Burgers', name: 'Classic Beef Burger', price: 650 },
    { category: 'Burgers', name: 'Crispy Chicken Burger', price: 600 },
    { category: 'Burgers', name: 'Double Smash Burger', price: 850 },
    { category: 'Beverages', name: 'Lemonade', price: 250 },
    { category: 'Beverages', name: 'Cold Coffee', price: 350 },
    { category: 'Beverages', name: 'Milkshake', price: 450 },
    { category: 'Beverages', name: 'Sparkling Water', price: 150 },
    { category: 'Desserts', name: 'Chocolate Lava Cake', price: 500 },
    { category: 'Desserts', name: 'Cheesecake Slice', price: 450 },
  ]

  await supabase.from('menu_items').insert(
    items.map((i) => ({
      outlet_id: outlet.id,
      category_id: catMap[i.category],
      name: i.name,
      price: i.price,
      is_available: true,
    }))
  )
  console.log('Created menu items:', items.length)

  // 5. Create tables
  const tables = [
    { label: 'T1', section: 'Indoor' },
    { label: 'T2', section: 'Indoor' },
    { label: 'T3', section: 'Indoor' },
    { label: 'T4', section: 'Indoor' },
    { label: 'T5', section: 'Indoor' },
    { label: 'T6', section: 'Outdoor' },
    { label: 'T7', section: 'Outdoor' },
    { label: 'T8', section: 'Outdoor' },
    { label: 'VIP1', section: 'VIP Room' },
    { label: 'VIP2', section: 'VIP Room' },
  ]

  await supabase.from('tables').insert(tables.map((t) => ({ outlet_id: outlet.id, ...t })))
  console.log('Created tables:', tables.length)

  console.log('\n✅ Seed complete!')
  console.log(`\nOrg ID: ${org.id}`)
  console.log(`Outlet ID: ${outlet.id}`)
  console.log('\nNext steps:')
  console.log('1. Go to Supabase Auth → Users → create your first owner user')
  console.log('2. Run this query to link them:')
  console.log(`   INSERT INTO users (id, org_id, outlet_id, email, full_name, role_id, is_active)`)
  console.log(`   SELECT '<your-user-uuid>', '${org.id}', '${outlet.id}', '<your-email>', 'Your Name',`)
  console.log(`          (SELECT id FROM roles WHERE name = 'owner'), true;`)
}

seed().catch(console.error)
