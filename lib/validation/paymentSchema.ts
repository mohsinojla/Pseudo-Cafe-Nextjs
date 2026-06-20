import { z } from 'zod'

export const paymentSchema = z.object({
  order_id: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum(['cash', 'card', 'other']),
  reference_no: z.string().max(100).optional().nullable(),
  discount: z.number().min(0).max(100).optional(),
})

export type PaymentInput = z.infer<typeof paymentSchema>
