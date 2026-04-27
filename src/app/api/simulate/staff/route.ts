import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, randomInt, randomBool } from '@/lib/simulator/utils'

// POST /api/simulate/staff
// 직원 출근/퇴근 시뮬레이션
export async function POST(req: NextRequest) {
  const { branchId = 1 } = (await req.json()) as { branchId?: number }

  const today = new Date().toISOString().split('T')[0]
  const clockedIn: string[] = []
  const clockedOut: string[] = []

  // 1. 브랜치 staff 목록 조회
  const { data: staffList, error: staffError } = await supabaseAdmin
    .from('staff')
    .select('id, name')
    .eq('branchId', branchId)
    .eq('isActive', true)

  if (staffError) {
    return NextResponse.json({ ok: false, error: staffError.message })
  }

  if (!staffList?.length) {
    return NextResponse.json({ ok: false, message: 'No active staff' })
  }

  // 2. 오늘 이미 출근한 직원 ID 조회
  const { data: todayRecords } = await supabaseAdmin
    .from('staff_attendance')
    .select('staffId, clockIn, clockOut')
    .eq('branchId', branchId)
    .gte('createdAt', today + 'T00:00:00')

  const clockedInIds = new Set(todayRecords?.map((r: { staffId: number }) => r.staffId) ?? [])
  const alreadyClockedOut = new Set(
    todayRecords
      ?.filter((r: { clockOut: string | null }) => r.clockOut !== null)
      .map((r: { staffId: number }) => r.staffId) ?? []
  )

  // 3. 오늘 출근 기록 없는 직원 중 1-2명 출근 처리
  const notClockedIn = staffList.filter((s: { id: number }) => !clockedInIds.has(s.id))
  if (notClockedIn.length > 0) {
    const inCount = randomInt(1, Math.min(2, notClockedIn.length))
    const toClockIn = [...notClockedIn].sort(() => Math.random() - 0.5).slice(0, inCount)

    for (const s of toClockIn) {
      try {
        const minsBack = randomInt(0, 30)
        const clockInTime = new Date(Date.now() - minsBack * 60000)
        const clockInStr = clockInTime.toISOString()

        // 9시 이후 출근이면 'late'
        const hour = clockInTime.getHours()
        const status = hour >= 9 ? 'late' : 'normal'

        const { error } = await supabaseAdmin.from('staff_attendance').insert({
          staffId: s.id,
          staffName: s.name,
          clockIn: clockInStr,
          clockOut: null,
          status,
          workHours: null,
          notes: '시뮬레이터 자동 출근',
          branchId,
          createdAt: clockInStr,
        })

        if (!error) {
          clockedIn.push(s.name)
        }
      } catch (err) {
        // 개별 실패는 무시하고 계속 진행
        void err
      }
    }
  }

  // 4. 이미 출근한 직원 중 퇴근 안 한 직원의 40% 퇴근 처리
  const toProcessOut = staffList.filter(
    (s: { id: number }) => clockedInIds.has(s.id) && !alreadyClockedOut.has(s.id)
  )

  for (const s of toProcessOut) {
    if (!randomBool(0.4)) continue

    try {
      const record = todayRecords?.find((r: { staffId: number; clockIn: string }) => r.staffId === s.id)
      if (!record) continue

      const clockInTime = new Date(record.clockIn)
      const workHoursNum = randomInt(6, 9)
      const clockOutTime = new Date(clockInTime.getTime() + workHoursNum * 3600000)

      const { error } = await supabaseAdmin
        .from('staff_attendance')
        .update({
          clockOut: clockOutTime.toISOString(),
          workHours: workHoursNum,
        })
        .eq('staffId', s.id)
        .eq('branchId', branchId)
        .gte('createdAt', today + 'T00:00:00')
        .is('clockOut', null)

      if (!error) {
        clockedOut.push(s.name)
      }
    } catch (err) {
      void err
    }
  }

  return NextResponse.json({ ok: true, clockedIn, clockedOut })
}
