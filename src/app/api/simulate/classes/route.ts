import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, randomInt, randomPick } from '@/lib/simulator/utils'

// POST /api/simulate/classes
// 오늘 수업 예약 추가 + 수강권 차감 시뮬레이션
export async function POST(req: NextRequest) {
  const { branchId = 1 } = (await req.json()) as { branchId?: number }

  const today = new Date().toISOString().split('T')[0]
  const details: string[] = []
  let updated = 0

  // 1. 오늘 예약 가능한 수업 조회 (booked < capacity)
  const { data: classes, error: classesError } = await supabaseAdmin
    .from('classes')
    .select('id, title, booked, capacity')
    .eq('branchId', branchId)
    .gte('startTime', today + 'T00:00:00')
    .lte('startTime', today + 'T23:59:59')

  if (classesError) {
    return NextResponse.json({ ok: false, error: classesError.message })
  }

  const available = (classes ?? []).filter(c => (c.booked ?? 0) < (c.capacity ?? 0))
  if (!available.length) {
    return NextResponse.json({ ok: true, updated: 0, details: ['오늘 예약 가능한 수업 없음'] })
  }

  // 2. 랜덤으로 1-3개 수업 선택해서 booked +1
  const count = randomInt(1, Math.min(3, available.length))
  const selected = [...available].sort(() => Math.random() - 0.5).slice(0, count)

  for (const cls of selected) {
    try {
      const { error } = await supabaseAdmin
        .from('classes')
        .update({ booked: (cls.booked ?? 0) + 1 })
        .eq('id', cls.id)

      if (error) {
        details.push(`[FAIL] ${cls.title} 예약 추가 실패: ${error.message}`)
        continue
      }

      details.push(`[OK] ${cls.title} 예약 추가 (${(cls.booked ?? 0) + 1}/${cls.capacity})`)
      updated++

      // 3. lesson_counts에서 usedCount > 0인 레코드 중 하나 차감 시뮬레이션
      const { data: lessonCounts } = await supabaseAdmin
        .from('lesson_counts')
        .select('id, productName, usedCount, totalCount')
        .eq('branchId', branchId)
        .gt('usedCount', 0)
        .limit(20)

      if (lessonCounts?.length) {
        const lc = randomPick(lessonCounts)
        const { error: lcError } = await supabaseAdmin
          .from('lesson_counts')
          .update({ usedCount: lc.usedCount + 1 })
          .eq('id', lc.id)

        if (!lcError) {
          details.push(`[OK] 수강권 차감: ${lc.productName} (${lc.usedCount + 1}/${lc.totalCount})`)
        }
      }
    } catch (err) {
      details.push(`[FAIL] 예외 발생: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({ ok: updated > 0, updated, details })
}
