import { z } from 'zod'

export const menuCategorySchema = z.object({
  name: z.string().min(1).max(100),
  sort_order: z.number().int().min(0).default(0),
})

export const menuItemSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  price: z.number().positive(),
  is_available: z.boolean().default(true),
  image_url: z.string().url().optional().nullable(),
})

export const menuItemModifierSchema = z.object({
  name: z.string().min(1).max(100),
  price_delta: z.number().default(0),
})

export type MenuItemInput = z.infer<typeof menuItemSchema>
export type MenuCategoryInput = z.infer<typeof menuCategorySchema>
export type MenuItemModifierInput = z.infer<typeof menuItemModifierSchema>
