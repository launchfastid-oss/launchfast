import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.email !== process.env.ADMIN_EMAIL) redirect('/dashboard')

  const adminClient = createAdminClient()

  const { data: orders } = await adminClient
    .from('orders')
    .select('*, profiles(full_name, email:id), brand_kits(id, is_preview_only)')
    .order('created_at', { ascending: false })
    .limit(50)

  const { count: totalOrders } = await adminClient
    .from('orders').select('*', { count: 'exact', head: true })

  const { count: completedOrders } = await adminClient
    .from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed')

  const { count: totalKits } = await adminClient
    .from('brand_kits').select('*', { count: 'exact', head: true }).eq('is_preview_only', false)

  const statusColor: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    generating: 'bg-yellow-100 text-yellow-700',
    paid: 'bg-blue-100 text-blue-700',
    pending: 'bg-gray-100 text-gray-600',
    failed: 'bg-red-100 text-red-700',
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="bg-white border-b border-[#E0E0E0]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="text-lg font-bold"><span className="text-[#1D9E75]">Launchfast</span>.id <span className="text-xs text-[#888888] font-normal ml-2">Admin</span></span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-6">Dashboard Admin</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card text-center">
            <p className="text-3xl font-bold text-[#1D9E75]">{totalOrders || 0}</p>
            <p className="text-sm text-[#555555] mt-1">Total Orders</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-[#1D9E75]">{completedOrders || 0}</p>
            <p className="text-sm text-[#555555] mt-1">Completed</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-[#1D9E75]">{totalKits || 0}</p>
            <p className="text-sm text-[#555555] mt-1">Brand Kits</p>
          </div>
        </div>

        {/* Orders table */}
        <div className="card overflow-hidden p-0">
          <div className="px-6 py-4 border-b border-[#E0E0E0]">
            <h2 className="font-bold text-[#1A1A1A]">Orders Terbaru</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w5full">
              <thead className="bg-[#F5F5F5]">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#888888] uppercase">Tanggal</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#888888] uppercase">User</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#888888] uppercase">Total</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#888888] uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#888888] uppercase">Brand Kit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {orders?.map((order) => {
                  const o = order as Record<string, unknown>
                  const profile = o.profiles as Record<string, string> | null
                  const kits = o.brand_kits as Array<Record<string, unknown>> | null
                  const fullKit = kits?.find(k => !k.is_preview_only)
                  return (
                    <tr key={o.id as string} className="hover:bg-[#FAFAFA]">
                      <td className="px-6 py-4 text-sm text-[#555555]">
                        {new Date(o.created_at as string).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#1A1A1A]">
                        {profile?.full_name || (o.user_id as string)?.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-[#1A1A1A]">
                        Rp {((o.total_amount as number) || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-pill font-semibold ${statusColor[o.status as string] || 'bg-gray-100 text-gray-600'}`}>
                          {o.status as string}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {fullKit ? (
                          <a href={`/brand-kit/${fullKit.id}`} className="text-[#1D9E75] hover:underline">
                            Lihat â
                          </a>
                        ) : (
                          <span className="text-[#888888]">â</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
