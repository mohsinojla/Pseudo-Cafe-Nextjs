import { z } from 'zod'

export const inviteStaffSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(100),
  role_id: z.string().uuid(),
  outlet_id: z.string().uuid().optional().nullable(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const updateStaffSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  role_id: z.string().uuid().optional(),
  outlet_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional(),
})

export type InviteStaffInput = z.infer<typeof inviteStaffSchema>
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>
