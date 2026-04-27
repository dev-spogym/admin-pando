import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, randomInt, randomPick, randomBool } from '@/lib/simulator/utils'

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

// POST /api/simulate/facilities
// 락커 상태 변경 시뮬레이션
export async function POST(req: NextRequest) {
  const { branchId = 1 } = (await req.json()) as { branchId?: number }

  const details: string[] = []
  let updated = 0

  // 1. AVAILABLE 락커 조회
  const { data: availableLockers, error: availErr } = await supabaseAdmin
    .from('lockers')
    .select('id, number, zone')
    .eq('branchId', branchId)
    .eq('status', 'AVAILABLE')
    .limit(50)

  if (availErr) {
    details.push(`[FAIL] AVAILABLE 락커 조회 실패: ${availErr.message}`)
  }

  // 2. OCCUPIED 락커 조회
  const { data: occupiedLockers, error: occupErr } = await supabaseAdmin
    .from('lockers')
    .select('id, number, zone')
    .eq('branchId', branchId)
    .eq('status', 'IN_USE')
    .limit(50)

  if (occupErr) {
    details.push(`[FAIL] OCCUPIED 락커 조회 실패: ${occupErr.message}`)
  }

  // 3. 활성 회원 조회 (배정용)
  const { data: members } = await supabaseAdmin
    .from('members')
    .select('id, name')
    .eq('branchId', branchId)
    .eq('status', 'ACTIVE')
    .limit(100)

  // 4. AVAILABLE → OCCUPIED: 1-2개 배정
  if (availableLockers?.length && members?.length) {
    const assignCount = Math.min(randomInt(1, 2), availableLockers.length)
    const shuffled = [...availableLockers].sort(() => Math.random() - 0.5).slice(0, assignCount)

    for (const locker of shuffled) {
      try {
        const member = randomPick(members as { id: number; name: string }[])
        const now = new Date()
        const expiresAt = addMonths(now, randomInt(1, 6))
        const password = String(randomInt(1000, 9999))

        const { error } = await supabaseAdmin
          .from('lockers')
          .update({
            status: 'IN_USE',
            memberId: member.id,
            memberName: member.name,
            assignedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            password,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', locker.id)

        if (error) {
          details.push(`[FAIL] 락커 ${locker.number} 배정 실패: ${error.message}`)
        } else {
          details.push(`[OK] 락커 ${locker.number} → OCCUPIED (${member.name}, 비번: ${password})`)
          updated++
        }
      } catch (err) {
        details.push(`[FAIL] 예외 발생: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } else if (!availableLockers?.length) {
    details.push('[INFO] AVAILABLE 락커 없음 - 배정 건너뜀')
  } else if (!members?.length) {
    details.push('[INFO] 활성 회원 없음 - 배정 건너뜀')
  }

  // 5. OCCUPIED → AVAILABLE: 30% 확률로 1개 반납
  if (occupiedLockers?.length && randomBool(0.3)) {
    try {
      const locker = randomPick(occupiedLockers as { id: number; number: string; zone: string | null }[])

      const { error } = await supabaseAdmin
        .from('lockers')
        .update({
          status: 'AVAILABLE',
          memberId: null,
          memberName: null,
          assignedAt: null,
          expiresAt: null,
          password: null,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', locker.id)

      if (error) {
        details.push(`[FAIL] 락커 ${locker.number} 반납 실패: ${error.message}`)
      } else {
        details.push(`[OK] 락커 ${locker.number} → AVAILABLE (반납)`)
        updated++
      }
    } catch (err) {
      details.push(`[FAIL] 예외 발생: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({ ok: true, updated, details })
}
