import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, randomInt, randomPick, randomBool } from '@/lib/simulator/utils'

const ATTENDANCE_TYPES = [
  'REGULAR', 'REGULAR', 'REGULAR', 'REGULAR', 'REGULAR',
  'REGULAR', 'REGULAR', 'PT', 'PT', 'GX',
] as const

const CHECK_IN_METHODS = [
  'KIOSK', 'KIOSK', 'KIOSK', 'KIOSK', 'APP', 'MANUAL',
] as const

// POST /api/simulate/attendance
export async function POST(req: NextRequest) {
  const { branchId = 1 } = (await req.json()) as { branchId?: number }

  // 1. 활성 회원 조회
  const { data: members, error: membersError } = await supabaseAdmin
    .from('members')
    .select('id, name, phone')
    .eq('branchId', branchId)
    .eq('status', 'ACTIVE')
    .limit(100)

  if (membersError) {
    return NextResponse.json({ ok: false, error: membersError.message })
  }

  if (!members?.length) {
    return NextResponse.json({ ok: false, message: 'No active members' })
  }

  // 2. 오늘 이미 체크인한 회원 ID 조회
  const today = new Date().toISOString().split('T')[0]
  const { data: todayAttendance } = await supabaseAdmin
    .from('attendance')
    .select('memberId')
    .eq('branchId', branchId)
    .gte('checkInAt', today + 'T00:00:00')

  const checkedInIds = new Set(todayAttendance?.map((a: { memberId: number }) => a.memberId) ?? [])
  const available = members.filter((m: { id: number }) => !checkedInIds.has(m.id))

  if (!available.length) {
    return NextResponse.json({ ok: true, inserted: 0, message: 'All members already checked in today' })
  }

  // 3. 랜덤 3-8명 선택해서 체크인
  const count = randomInt(3, Math.min(8, available.length))
  const selected = [...available].sort(() => Math.random() - 0.5).slice(0, count)

  const records = selected.map((m: { id: number; name: string; phone: string | null }) => {
    const minutesOffset = randomInt(-30, 30)
    const checkInAt = new Date(Date.now() + minutesOffset * 60000).toISOString()
    const hasCheckout = randomBool(0.4)
    const checkOutAt = hasCheckout
      ? new Date(Date.now() + minutesOffset * 60000 + randomInt(60, 120) * 60000).toISOString()
      : null

    return {
      memberId: m.id,
      memberName: m.name,
      phone: m.phone ?? '',
      branchId,
      checkInAt,
      checkOutAt,
      type: randomPick(ATTENDANCE_TYPES),
      checkInMethod: randomPick(CHECK_IN_METHODS),
      isOtherBranch: false,
    }
  })

  const { error } = await supabaseAdmin.from('attendance').insert(records)

  return NextResponse.json({
    ok: !error,
    inserted: error ? 0 : records.length,
    members: records.map((r) => r.memberName),
    error: error?.message ?? null,
  })
}
