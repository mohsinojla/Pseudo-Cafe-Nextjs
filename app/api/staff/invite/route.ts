import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { can } from '@/lib/rbac/can'
import { inviteStaffSchema } from '@/lib/validation/staffSchema'
import { sendStaffWelcomeEmail } from '@/lib/email/sendStaffWelcome'
import type { User } from '@/types/database'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single() as { data: User | null; error: unknown }
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const allowed = await can(profile, 'staff.manage')
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = inviteStaffSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const adminClient = await createAdminClient()

  // Try to create the auth user
  let userId: string

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  })

  if (createError) {
    // If user already exists in auth, look them up and reuse their ID
    if (createError.message.toLowerCase().includes('already been registered') || createError.message.toLowerCase().includes('already registered')) {
      const { data: userList } = await adminClient.auth.admin.listUsers()
      const existing = userList?.users?.find((u) => u.email === parsed.data.email)
      if (!existing) {
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }
      // Update their password to the new one
      await adminClient.auth.admin.updateUserById(existing.id, {
        password: parsed.data.password,
        email_confirm: true,
      })
      userId = existing.id
    } else {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }
  } else if (!created.user) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  } else {
    userId = created.user.id
  }

  // Upsert profile — new staff start as pending until first login
  const { error: profileError } = await adminClient.from('users').upsert({
    id: userId,
    org_id: profile.org_id,
    outlet_id: parsed.data.outlet_id ?? profile.outlet_id,
    email: parsed.data.email,
    full_name: parsed.data.full_name,
    role_id: parsed.data.role_id,
    is_active: true,
    onboarding_status: 'active',
  }, { onConflict: 'id' }) as { error: { message: string } | null }

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  // Fetch role name for the email
  const { data: roleRow } = await adminClient
    .from('roles')
    .select('name')
    .eq('id', parsed.data.role_id)
    .single() as { data: { name: string } | null; error: unknown }

  // Send branded welcome email via Resend
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  await sendStaffWelcomeEmail({
    to: parsed.data.email,
    full_name: parsed.data.full_name,
    role: roleRow?.name ?? 'Staff',
    password: parsed.data.password,
    login_url: `${baseUrl}/login`,
  })

  return NextResponse.json({ message: `Staff member ${parsed.data.full_name} created — login details sent to ${parsed.data.email}` }, { status: 201 })
}
