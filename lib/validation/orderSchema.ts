import { z } from 'zod'

export const orderStatusSchema = z.enum([
  'draft', 'placed', 'in_kitchen', 'ready', 'served', 'billed', 'paid', 'closed'
])

export const createOrderSchema = z.object({
  table_id: z.string().uuid().optional(),
  order_type: z.enum(['dine_in', 'takeaway', 'delivery']).default('dine_in'),
})

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
})

export const orderItemSchema = z.object({
  menu_item_id: z.string().uuid(),
  quantity: z.number().int().min(1),
  notes: z.string().max(200).optional(),
  modifier_ids: z.array(z.string().uuid()).optional(),
})

export const addOrderItemsSchema = z.object({
  items: z.array(orderItemSchema).min(1),
})

export const updateOrderItemStatusSchema = z.object({
  status: z.enum(['queued', 'preparing', 'ready', 'served']),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type AddOrderItemsInput = z.infer<typeof addOrderItemsSchema>
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>
