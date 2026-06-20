import { createClient } from '@/lib/supabase/server'
import type { User } from '@/types/database'

interface CanContext {
  outlet_id?: string
  value?: number
}

interface RolePermissionRow {
  limit_value: number | null
  permissions: { key: string } | { key: string }[]
}

export async function can(
  user: Pick<User, 'role_id' | 'outlet_id'>,
  permissionKey: string,
  ctx?: CanContext
): Promise<boolean> {
  if (!user.role_id) return false

  const supabase = await createClient()

  const { data } = await supabase
    .from('role_permissions')
    .select('limit_value, permissions!inner(key)')
    .eq('role_id', user.role_id)
    .eq('permissions.key', permissionKey)
    .maybeSingle() as { data: RolePermissionRow | null; error: unknown }

  if (!data) return false

  if (user.outlet_id && ctx?.outlet_id && user.outlet_id !== ctx.outlet_id) {
    return false
  }

  if (data.limit_value !== null && ctx?.value !== undefined) {
    if (ctx.value > data.limit_value) return false
  }

  return true
}

export async function getPermissions(roleId: string): Promise<string[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('role_permissions')
    .select('permissions!inner(key)')
    .eq('role_id', roleId) as { data: { permissions: { key: string } | { key: string }[] }[] | null; error: unknown }

  return (data ?? []).map((r) => {
    const p = r.permissions
    return Array.isArray(p) ? p[0].key : p.key
  })
}
