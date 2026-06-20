'use client'

import { use, useEffect, useState, useCallback, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, Clock, CheckCircle2, XCircle } from 'lucide-react'
import type { User, Role } from '@/types/database'

type StaffMember = User & { roles: Role | null; onboarding_status?: string }

export default function StaffPage({ params }: { params: Promise<{ outletId: string }> }) {
  const { outletId } = use(params)
  const supabase = createClient()

  const [staff, setStaff] = useState<StaffMember[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', full_name: '', role_id: '', password: '' })
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const fetchStaff = useCallback(async () => {
    const [staffRes, rolesRes] = await Promise.all([
      supabase.from('users').select('*, roles(*), onboarding_status').eq('outlet_id', outletId),
      supabase.from('roles').select('*').order('name'),
    ])
    if (staffRes.data) setStaff(staffRes.data as StaffMember[])
    if (rolesRes.data) setRoles(rolesRes.data)
    setLoading(false)
  }, [outletId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchStaff() }, [fetchStaff])

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault()
    setInviting(true)
    setInviteMsg(null)

    const res = await fetch('/api/staff/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...inviteForm, outlet_id: outletId }),
    })

    if (res.ok) {
      setInviteMsg({ text: `Invite sent to ${inviteForm.email} — credentials emailed`, ok: true })
      setInviteForm({ email: '', full_name: '', role_id: '', password: '' })
      setShowInvite(false)
      await fetchStaff()
    } else {
      const err = await res.json()
      setInviteMsg({ text: err.error ?? 'Invite failed', ok: false })
    }

    setInviting(false)
  }

  const toggleActive = async (member: StaffMember) => {
    await supabase.from('users').update({ is_active: !member.is_active } as any).eq('id', member.id)
    setStaff((prev) => prev.map((s) => s.id === member.id ? { ...s, is_active: !s.is_active } : s))
  }

  const ROLE_COLORS: Record<string, string> = {
    owner: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    manager: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    cashier: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    waiter: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    kitchen: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full min-h-screen text-gray-400">Loading…</div>
  }

  const pendingCount = staff.filter((s) => s.onboarding_status === 'pending').length

  return (
    <div className="p-6 pt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Staff</h1>
          <p className="text-gray-400 text-sm mt-1">
            {staff.length} team member{staff.length !== 1 ? 's' : ''}
            {pendingCount > 0 && (
              <span className="ml-2 text-amber-400 text-xs">· {pendingCount} pending first login</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-2 rounded-xl text-sm transition"
        >
          <UserPlus size={15} />
          Invite Staff
        </button>
      </div>

      {inviteMsg && (
        <div className={`mb-4 flex items-center gap-2 border rounded-xl px-4 py-3 text-sm ${
          inviteMsg.ok
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {inviteMsg.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {inviteMsg.text}
        </div>
      )}

      <div className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-white/5 text-xs uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">Name</th>
              <th className="text-left px-5 py-3 font-medium">Email</th>
              <th className="text-left px-5 py-3 font-medium">Role</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-600 py-12">
                  No staff members yet — invite your team
                </td>
              </tr>
            ) : (
              staff.map((member) => {
                const isPending = member.onboarding_status === 'pending'
                return (
                  <tr key={member.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-300 font-semibold shrink-0">
                          {(member.full_name ?? member.email ?? '?')[0].toUpperCase()}
                        </div>
                        <span className="text-white font-medium">{member.full_name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400">{member.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize border ${
                        ROLE_COLORS[member.roles?.name ?? ''] ?? 'bg-gray-700/50 text-gray-400 border-gray-700'
                      }`}>
                        {member.roles?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {isPending ? (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock size={11} />
                            Pending
                          </span>
                        ) : member.is_active ? (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 size={11} />
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-500 border border-gray-700">
                            <XCircle size={11} />
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => toggleActive(member)}
                        className="text-xs text-gray-500 hover:text-white transition"
                      >
                        {member.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <UserPlus size={18} className="text-yellow-400" />
              </div>
              <h2 className="text-white font-bold text-lg">Invite Staff Member</h2>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
              <Clock size={15} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-amber-300 text-xs leading-relaxed">
                Staff will receive login credentials by email and show as <strong>Pending</strong> until they log in for the first time.
              </p>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Full Name</label>
                <input
                  required
                  value={inviteForm.full_name}
                  onChange={(e) => setInviteForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Email</label>
                <input
                  required
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Role</label>
                <select
                  required
                  value={inviteForm.role_id}
                  onChange={(e) => setInviteForm((f) => ({ ...f, role_id: e.target.value }))}
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="">Select role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Initial Password</label>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 8 characters"
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
                <p className="text-gray-600 text-xs mt-1">This will be included in the welcome email sent to the staff member.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-black font-semibold py-2.5 rounded-xl transition"
                >
                  {inviting ? 'Sending…' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
